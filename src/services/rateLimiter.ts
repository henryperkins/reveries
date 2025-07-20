export interface RateLimitConfig {
  /** Maximum number of prompt- or completion-tokens that can be consumed per
   *  rolling one-minute window.  This normally comes from the Azure portal
   *  limits for a deployment.
   */
  maxTokensPerMinute: number;

  /** Maximum number of requests that can be sent per rolling minute. */
  maxRequestsPerMinute: number;

  /**
   * Size of the token «burst» bucket.  We allow callers to overshoot the
   * minute-rate in short bursts up to this amount so that multiple requests
   * starting at the same moment do not have to queue up for the first refill.
   */
  burstCapacity: number;

  /** Optional initial penalty in seconds applied at construction time. */
  penaltySeconds?: number;
}

/**
 * Cooperative, process-wide client-side rate limiter for the Azure OpenAI
 * service.
 *
 * The limiter implements two independent leaky-bucket regulators – one for
 * tokens and one for request count.  Both must have capacity for a call to
 * proceed.
 *
 * Because the surrounding code is fully asynchronous, **concurrent** callers
 * can enter {@link waitForCapacity} at the same time.  We guard the critical
 * sections which mutate the shared buckets with a very small async-mutex to
 * avoid double-spending capacity.
 */
export class RateLimiter {
  private static instance: RateLimiter;

  // ───── Bucket state ──────────────────────────────────────────────
  private tokenBucket: number;   // tokens available right now
  private requestBucket: number; // requests available right now
  private lastRefill: number;    // epoch-ms when we last refilled

  // If «blockedUntil» is > Date.now(), all callers must wait – used for
  // server-side Retry-After penalties.
  private blockedUntil = 0;

  private readonly config: RateLimitConfig;

  // Track recent allocations so that we can reconcile later with the exact
  // usage returned by Azure (helps with the inevitable token-estimation error).
  private requestHistory: { timestamp: number; tokensReserved: number }[] = [];

  // ───── Minimal async mutex implementation ───────────────────────
  private lockChain: Promise<void> = Promise.resolve();

  private async acquireLock(): Promise<() => void> {
    let release!: () => void;
    const p = new Promise<void>(r => (release = r));
    const prev = this.lockChain;
    // Append our promise to the chain – we will resolve only when released.
    this.lockChain = this.lockChain.then(() => p);
    // Wait until previous link resolved (i.e. lock became available).
    await prev;
    // Now we own the lock.  Return a function that resolves our link, giving
    // the lock to the next waiter.
    return release;
  }

  private constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokenBucket = config.burstCapacity;
    this.requestBucket = config.maxRequestsPerMinute;
    this.lastRefill = Date.now();

    if (config.penaltySeconds && config.penaltySeconds > 0) {
      this.blockedUntil = Date.now() + config.penaltySeconds * 1000;
    }
  }

  /**
   * Globally penalise all callers for *seconds* seconds – normally derived
   * from the "Retry-After" header returned by Azure when the service is
   * overloaded.  A larger existing penalty will not be shortened.
   */
  penalize(seconds: number): void {
    const until = Date.now() + seconds * 1000;
    this.blockedUntil = Math.max(this.blockedUntil, until);
  }

  /** Singleton accessor – uses environment variables to initialise default
   * limits when not already constructed. */
  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      // Support both Node (process.env) and Vite (import.meta.env) runtimes.
      const env: Record<string, string | undefined> = {
        ...(typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {}),
        ...(typeof import.meta !== 'undefined'
          ? ((import.meta as unknown as { env: Record<string, string | undefined> }).env)
          : {})
      };

      RateLimiter.instance = new RateLimiter({
        maxTokensPerMinute: Number(env.AZURE_OAI_MAX_TPM) || 20_000,
        maxRequestsPerMinute: Number(env.AZURE_OAI_MAX_RPM) || 300,
        burstCapacity: Number(env.AZURE_OAI_BURST_TOKENS) || 6_000,
      });
    }
    return RateLimiter.instance;
  }

  /**
   * Wait until sufficient capacity (tokens & request slot) is available.  The
   * *estimatedTokens* argument should be a reasonable upper bound of the
   * expected token usage so that we do not overshoot the real service limit.
   *
   * The method returns *after* reserving the capacity so that subsequent
   * callers see the reduced buckets.  If the caller ultimately uses a
   * different amount of tokens it should invoke {@link recordTokensUsed} to
   * reconcile.
   */
  async waitForCapacity(estimatedTokens: number): Promise<void> {
    while (true) {
      // Respect any global penalty first.
      const now = Date.now();
      if (now < this.blockedUntil) {
        const waitMs = this.blockedUntil - now;
        await new Promise(r => setTimeout(r, waitMs));
        // After sleep we must start the loop over to recalculate capacity.
        continue;
      }

      // Acquire mutex for bucket operations.
      const release = await this.acquireLock();
      try {
        const timeNow = Date.now();
        this.refillBuckets(timeNow);

        // Remove stale history (older than 60s) – purely informative.
        this.requestHistory = this.requestHistory.filter(h => timeNow - h.timestamp < 60_000);

        const hasTokens = this.tokenBucket >= estimatedTokens;
        const hasRequests = this.requestBucket >= 1;

        if (hasTokens && hasRequests) {
          this.tokenBucket -= estimatedTokens;
          this.requestBucket -= 1;
          this.requestHistory.push({ timestamp: timeNow, tokensReserved: estimatedTokens });
          return; // We are good – lock released in finally.
        }

        // Not enough capacity – calculate wait time before retrying.
        const tokensNeeded = Math.max(0, estimatedTokens - this.tokenBucket);
        const requestsNeeded = this.requestBucket < 1 ? 1 : 0;

        const tokenWaitMs = tokensNeeded / this.config.maxTokensPerMinute * 60_000;
        const requestWaitMs = requestsNeeded * (60_000 / this.config.maxRequestsPerMinute);
        // At least 1s to avoid a busy loop.
        const waitMs = Math.max(tokenWaitMs, requestWaitMs, 1_000);
        // Leave critical section *before* we wait so others may proceed.
        release();
        
        await new Promise(r => setTimeout(r, waitMs));
      } finally {
        // release already called above
      }
      // Loop again after waiting.
    }
  }

  /**
   * Reconcile the buckets with the *actual* token usage that Azure reports for
   * the last request.  This is important because our initial estimate may be
   * off by a non-trivial amount.
   */
  recordTokensUsed(actualTokens: number): void {
    if (this.requestHistory.length === 0) return;

    // Only update the **most recently** reserved entry – this assumes callers
    // unambiguously call the method in the same order they obtained capacity.
    const last = this.requestHistory[this.requestHistory.length - 1];
    const delta = actualTokens - last.tokensReserved;
    last.tokensReserved = actualTokens;

    if (delta === 0) return;

    // Adjust bucket under lock to avoid concurrent races with other requests.
    (async () => {
      const release = await this.acquireLock();
      try {
        if (delta > 0) {
          // We under-estimated – subtract the extra tokens (clamped at 0).
          this.tokenBucket = Math.max(0, this.tokenBucket - delta);
        } else {
          // We over-estimated – refund but do not exceed burst capacity.
          this.tokenBucket = Math.min(this.config.burstCapacity, this.tokenBucket - delta);
        }
      } finally {
        release();
      }
    })();
  }

  /**
   * Dynamically update the limiter’s configuration according to the latest
   * Azure rate-limit headers.  This lets the client adapt automatically when
   * subscription tiers change or the service lowers limits temporarily.
   *
   * Only the fields provided in <code>newLimits</code> are modified.  Updates are
   * applied under the internal mutex to keep bucket calculations consistent in
   * highly-concurrent situations.
   */
  updateLimits(newLimits: Partial<RateLimitConfig>): void {
    (async () => {
      const release = await this.acquireLock();
      try {
        if (typeof newLimits.maxTokensPerMinute === 'number' && newLimits.maxTokensPerMinute > 0) {
          this.config.maxTokensPerMinute = newLimits.maxTokensPerMinute;
        }
        if (typeof newLimits.maxRequestsPerMinute === 'number' && newLimits.maxRequestsPerMinute > 0) {
          this.config.maxRequestsPerMinute = newLimits.maxRequestsPerMinute;
        }
        if (typeof newLimits.burstCapacity === 'number' && newLimits.burstCapacity > 0) {
          this.config.burstCapacity = newLimits.burstCapacity;
          // Ensure the current bucket does not exceed the new burst size.
          this.tokenBucket = Math.min(this.tokenBucket, this.config.burstCapacity);
        }
      } finally {
        release();
      }
    })();
  }

  // ───── Helper methods ───────────────────────────────────────────
  private refillBuckets(now: number): void {
    const elapsedMs = now - this.lastRefill;
    if (elapsedMs <= 0) return;

    const elapsedMinutes = elapsedMs / 60_000;

    this.tokenBucket = Math.min(
      this.config.burstCapacity,
      this.tokenBucket + elapsedMinutes * this.config.maxTokensPerMinute,
    );

    this.requestBucket = Math.min(
      this.config.maxRequestsPerMinute,
      this.requestBucket + elapsedMinutes * this.config.maxRequestsPerMinute,
    );

    this.lastRefill = now;
  }

  /** Lightweight telemetry returned to UI for debugging/insight purposes. */
  getUsageStats() {
    const now = Date.now();
    const recent = this.requestHistory.filter(h => now - h.timestamp < 60_000);

    return {
      tokensUsedLastMinute: recent.reduce((sum, h) => sum + h.tokensReserved, 0),
      requestsLastMinute: recent.length,
      tokenCapacityPercent: (this.tokenBucket / this.config.burstCapacity) * 100,
    } as const;
  }
}

// ───── Misc helpers ───────────────────────────────────────────────

/**
 * Very rough token estimator: assumes 1 token ≈ 4 characters which works
 * surprisingly well for English prose.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

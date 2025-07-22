/**
 * A simple concurrency-controlled request queue.
 *
 * Purpose:
 *   1. Prevents more than `concurrencyLimit` simultaneous API requests.
 *   2. Keeps the API under token-rate limits, reducing 429 errors.
 *
 * NOTE:
 *   • Exponential back-off / retries are still handled by `withRetry` in
 *     `errorHandler.ts`.  This queue focuses on concurrency (parallel calls).
 *   • Concurrency default is 2, but can be overridden at runtime by setting
 *     VITE_AZURE_OPENAI_CONCURRENCY or AZURE_OPENAI_CONCURRENCY.
 *
 * Usage:
 *   const result = await RequestQueue.execute(() => callAzureOpenAI(...));
 */
export class RequestQueue {
  private static concurrencyLimit: number = RequestQueue.resolveConcurrency();
  private static activeCount = 0;
  private static queue: (() => void)[] = [];

  // --- Rate-limit back-off state ---
  private static pauseUntil = 0;
  private static consecutiveRateLimitErrors = 0;
  private static readonly BASE_DELAY_MS = 1000;
  private static readonly MAX_DELAY_MS = 60000;

  /**
   * Submit a promise-returning task to be executed under concurrency control.
   */
  static execute<T>(task: () => Promise<T>): Promise<T> {
    console.log(`📊 RequestQueue.execute called (active: ${RequestQueue.activeCount}/${RequestQueue.concurrencyLimit}, queued: ${RequestQueue.queue.length})`);
    return new Promise<T>((resolve, reject) => {
      const runTask = () => {
        console.log(`📊 RequestQueue running task (active: ${RequestQueue.activeCount + 1}/${RequestQueue.concurrencyLimit})`);
        RequestQueue.activeCount++;
        task()
          .then(result => {
            console.log('✅ RequestQueue task succeeded');
            // Reset back-off counters on any successful call
            RequestQueue.consecutiveRateLimitErrors = 0;
            resolve(result);
          })
          .catch(err => {
            console.log('❌ RequestQueue task failed:', err);
            // Apply exponential back-off for rate-limit errors
            if (err?.code === 'RATE_LIMIT' || err?.status === 429 || err?.statusCode === 429) {
              RequestQueue.consecutiveRateLimitErrors++;
              const delay = Math.min(
                RequestQueue.BASE_DELAY_MS *
                  2 ** (RequestQueue.consecutiveRateLimitErrors - 1),
                RequestQueue.MAX_DELAY_MS
              );
              RequestQueue.pauseUntil = Date.now() + delay;
              console.log(`⏳ RequestQueue back-off ${delay / 1000}s due to rate limit`);
              setTimeout(() => RequestQueue.dequeue(), delay + 50);
            }
            reject(err);
          })
          .finally(() => {
            RequestQueue.activeCount--;
            console.log(`📊 RequestQueue task completed (active: ${RequestQueue.activeCount}/${RequestQueue.concurrencyLimit})`);
            RequestQueue.dequeue();
          });
      };

      const now = Date.now();

      const executeOrQueue = () => {
        if (RequestQueue.activeCount < RequestQueue.concurrencyLimit) {
          runTask();
        } else {
          console.log(`⏳ RequestQueue queuing task (queue size: ${RequestQueue.queue.length + 1})`);
          RequestQueue.queue.push(runTask);
        }
      };

      if (now < RequestQueue.pauseUntil) {
        // Currently in back-off window – defer execution
        const waitTime = RequestQueue.pauseUntil - now;
        console.log(`⏳ RequestQueue in back-off, waiting ${waitTime / 1000}s`);
        RequestQueue.queue.push(runTask);
        setTimeout(() => RequestQueue.dequeue(), waitTime);
      } else {
        executeOrQueue();
      }
    });
  }

  /** Dynamically change the concurrency limit (e.g. user settings / experiments). */
  static setConcurrencyLimit(limit: number): void {
    RequestQueue.concurrencyLimit = Math.max(1, limit);
    RequestQueue.dequeue();
  }

  /** Pull next item from queue if capacity is available. */
  private static dequeue(): void {
    while (
      RequestQueue.activeCount < RequestQueue.concurrencyLimit &&
      RequestQueue.queue.length > 0
    ) {
      const next = RequestQueue.queue.shift();
      if (next) next();
    }
  }

  /** Resolve concurrency limit from environment variables or fallback. */
  private static resolveConcurrency(): number {
    const envValue =
      import.meta?.env?.VITE_AZURE_OPENAI_CONCURRENCY ??
      (typeof process !== 'undefined' && process.env.AZURE_OPENAI_CONCURRENCY);
    const parsed = Number(envValue);
    // Increase default from 2 to 3 to allow for tool calls
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 3;
  }
}

import { RequestQueue } from './requestQueue';

export interface RateLimitConfig {
  maxTokensPerMinute: number;
  maxRequestsPerMinute: number;
  burstCapacity: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private tokenBucket: number;
  private requestBucket: number;
  private lastRefill: number;
  private config: RateLimitConfig;
  private requestHistory: { timestamp: number; tokens: number }[] = [];

  private constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokenBucket = config.burstCapacity;
    this.requestBucket = config.maxRequestsPerMinute;
    this.lastRefill = Date.now();
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      // Azure S0 tier limits
      RateLimiter.instance = new RateLimiter({
        maxTokensPerMinute: 40000, // S0 tier limit
        maxRequestsPerMinute: 60,  // Conservative estimate
        burstCapacity: 10000       // Allow short bursts
      });
    }
    return RateLimiter.instance;
  }

  async waitForCapacity(estimatedTokens: number): Promise<void> {
    const now = Date.now();
    this.refillBuckets(now);

    // Clean old history
    this.requestHistory = this.requestHistory.filter(
      h => now - h.timestamp < 60000
    );

    // Check if we have capacity
    if (this.tokenBucket >= estimatedTokens && this.requestBucket > 0) {
      this.tokenBucket -= estimatedTokens;
      this.requestBucket -= 1;
      this.requestHistory.push({ timestamp: now, tokens: estimatedTokens });
      return;
    }

    // Calculate wait time
    const tokensNeeded = Math.max(0, estimatedTokens - this.tokenBucket);
    const requestsNeeded = this.requestBucket <= 0 ? 1 : 0;

    const tokenWaitMs = (tokensNeeded / this.config.maxTokensPerMinute) * 60000;
    const requestWaitMs = requestsNeeded * (60000 / this.config.maxRequestsPerMinute);
    const waitMs = Math.max(tokenWaitMs, requestWaitMs, 1000); // Min 1 second

    console.log(`Rate limit: waiting ${Math.round(waitMs / 1000)}s for capacity`);
    await new Promise(resolve => setTimeout(resolve, waitMs));

    return this.waitForCapacity(estimatedTokens); // Retry after waiting
  }

  private refillBuckets(now: number): void {
    const elapsedMs = now - this.lastRefill;
    const elapsedMinutes = elapsedMs / 60000;

    // Refill tokens
    const tokensToAdd = elapsedMinutes * this.config.maxTokensPerMinute;
    this.tokenBucket = Math.min(
      this.config.burstCapacity,
      this.tokenBucket + tokensToAdd
    );

    // Refill requests
    const requestsToAdd = elapsedMinutes * this.config.maxRequestsPerMinute;
    this.requestBucket = Math.min(
      this.config.maxRequestsPerMinute,
      this.requestBucket + requestsToAdd
    );

    this.lastRefill = now;
  }

  getUsageStats(): {
    tokensUsedLastMinute: number;
    requestsLastMinute: number;
    tokenCapacityPercent: number;
  } {
    const now = Date.now();
    const recentHistory = this.requestHistory.filter(
      h => now - h.timestamp < 60000
    );

    return {
      tokensUsedLastMinute: recentHistory.reduce((sum, h) => sum + h.tokens, 0),
      requestsLastMinute: recentHistory.length,
      tokenCapacityPercent: (this.tokenBucket / this.config.burstCapacity) * 100
    };
  }
}

// Helper to estimate tokens (rough approximation)
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

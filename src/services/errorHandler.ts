import { RequestQueue } from './requestQueue';
import { RateLimiter } from './rateLimiter';

export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ErrorBoundary {
  private static errorCount = 0;
  private static lastErrorTime = 0;
  private static readonly ERROR_THRESHOLD = 5;
  private static readonly TIME_WINDOW = 60000; // 1 minute
  private static rateLimitErrors = 0;
  private static readonly RATE_LIMIT_THRESHOLD = 3;

  static recordError(error?: Error): void {
    const now = Date.now();
    if (now - this.lastErrorTime > this.TIME_WINDOW) {
      this.errorCount = 0;
      this.rateLimitErrors = 0;
    }

    this.errorCount++;
    this.lastErrorTime = now;

    // Track rate limit errors specifically
    if (error instanceof APIError && error.statusCode === 429) {
      this.rateLimitErrors++;
    }
  }

  static shouldBlock(): boolean {
    const now = Date.now();
    if (now - this.lastErrorTime > this.TIME_WINDOW) {
      this.errorCount = 0;
      this.rateLimitErrors = 0;
      return false;
    }

    // Block if too many rate limit errors
    if (this.rateLimitErrors >= this.RATE_LIMIT_THRESHOLD) {
      return true;
    }

    return this.errorCount >= this.ERROR_THRESHOLD;
  }

  static reset(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.rateLimitErrors = 0;
  }
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterMs?: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitterMs: 500
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      console.log(`withRetry attempt ${attempt + 1}/${config.maxRetries}`);
      const result = await RequestQueue.execute(fn);
      console.log('withRetry success');
      return result;
    } catch (error) {
      console.log('withRetry error:', error);
      lastError = error instanceof Error ? error : new Error(String(error));
      ErrorBoundary.recordError(lastError);

      // Don't retry non-retryable errors
      if (error instanceof APIError && !error.isRetryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const baseDelay = Math.min(
        config.initialDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitter = config.jitterMs ? Math.random() * config.jitterMs : 0;
      const delay = baseDelay + jitter;

      // Special handling for rate limits
      if (error instanceof APIError && error.statusCode === 429) {
        // Check for Retry-After header hint
        const retryAfter = (error as any).retryAfter;
        const rateLimitDelay = retryAfter ? retryAfter * 1000 : delay * 2;
        // Inform the RateLimiter so future callers respect server hint
        if (retryAfter) {
          RateLimiter.getInstance().penalize(retryAfter);
        }

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        continue;
      }

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

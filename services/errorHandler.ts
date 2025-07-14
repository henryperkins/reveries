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

  static recordError(): void {
    const now = Date.now();
    if (now - this.lastErrorTime > this.TIME_WINDOW) {
      this.errorCount = 0;
    }
    this.errorCount++;
    this.lastErrorTime = now;
  }

  static shouldBlock(): boolean {
    const now = Date.now();
    if (now - this.lastErrorTime > this.TIME_WINDOW) {
      this.errorCount = 0;
      return false;
    }
    return this.errorCount >= this.ERROR_THRESHOLD;
  }

  static reset(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-retryable errors
      if (error instanceof APIError && !error.isRetryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt) * 1000;

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError!;
}

export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = true,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check for network errors and wrap them
      if (lastError.message === 'Failed to fetch' || lastError.name === 'TypeError') {
        lastError = new APIError(
          'Network error: Unable to reach the API. Please check your internet connection and API endpoint.',
          'NETWORK_ERROR',
          true,
          0
        );
      }

      // Don't retry if it's not retryable
      if (error instanceof APIError && !error.retryable) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export class ErrorBoundary {
  private static errorCount = 0;
  private static maxErrors = 5;
  private static resetTime = 60000; // 1 minute

  static shouldBlock(): boolean {
    return this.errorCount >= this.maxErrors;
  }

  static recordError(): void {
    this.errorCount++;

    // Reset error count after reset time
    setTimeout(() => {
      this.errorCount = Math.max(0, this.errorCount - 1);
    }, this.resetTime);
  }

  static reset(): void {
    this.errorCount = 0;
  }
}

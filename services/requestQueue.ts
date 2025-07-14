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
  private static queue: Array<() => void> = [];

  /**
   * Submit a promise-returning task to be executed under concurrency control.
   */
  static execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const runTask = () => {
        RequestQueue.activeCount++;
        task()
          .then(result => resolve(result))
          .catch(err => reject(err))
          .finally(() => {
            RequestQueue.activeCount--;
            RequestQueue.dequeue();
          });
      };

      if (RequestQueue.activeCount < RequestQueue.concurrencyLimit) {
        runTask();
      } else {
        RequestQueue.queue.push(runTask);
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
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 2;
  }
}

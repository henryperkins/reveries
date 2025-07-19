/**
 * Centralized timeout manager for preventing memory leaks and managing timeouts
 * across the application. Provides automatic cleanup on component unmount.
 */
export class TimeoutManager {
  private timeouts = new Map<string, NodeJS.Timeout>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private timer?: ReturnType<typeof setTimeout>;
  private attempts = 0;

  start(_phase: string, ms: number, onTimeout: (attempt: number) => void) {
    this.clearTimer();
    this.attempts = 0;
    this.timer = this.mkTimer(ms, onTimeout);
  }

  /** Push the timeout window forward (e.g. on new progress) */
  reset(ms: number, onTimeout: (attempt: number) => void) {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = this.mkTimer(ms, onTimeout);
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  // helper
  private mkTimer(ms: number, onTimeout: (attempt: number) => void) {
    return setTimeout(() => {
      this.attempts += 1;
      onTimeout(this.attempts);
    }, ms);
  }
  
  /**
   * Set a timeout with automatic tracking and cleanup
   * @param key Unique identifier for this timeout
   * @param callback Function to execute when timeout fires
   * @param delay Delay in milliseconds
   * @returns The timeout ID for manual cleanup if needed
   */
  set(key: string, callback: () => void, delay: number): NodeJS.Timeout {
    // Clear any existing timeout with this key
    this.clear(key);
    
    const timeoutId = setTimeout(() => {
      callback();
      this.timeouts.delete(key);
    }, delay);
    
    this.timeouts.set(key, timeoutId);
    return timeoutId;
  }
  
  /**
   * Set an interval with automatic tracking and cleanup
   * @param key Unique identifier for this interval
   * @param callback Function to execute on each interval
   * @param delay Delay in milliseconds between executions
   * @returns The interval ID for manual cleanup if needed
   */
  setInterval(key: string, callback: () => void, delay: number): NodeJS.Timeout {
    // Clear any existing interval with this key
    this.clearInterval(key);
    
    const intervalId = setInterval(callback, delay);
    this.intervals.set(key, intervalId);
    return intervalId;
  }
  
  /**
   * Clear a specific timeout by key
   * @param key The key of the timeout to clear
   */
  clear(key: string): void {
    const timeoutId = this.timeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(key);
    }
  }
  
  /**
   * Clear a specific timeout by key (alias for clear)
   * @param key The key of the timeout to clear
   */
  clearTimeout(key: string): void {
    const timeoutId = this.timeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(key);
    }
  }
  
  /**
   * Clear a specific interval by key
   * @param key The key of the interval to clear
   */
  clearInterval(key: string): void {
    const intervalId = this.intervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(key);
    }
  }
  
  /**
   * Clear all timeouts and intervals managed by this instance
   */
  clearAll(): void {
    // Clear all timeouts
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeouts.clear();
    
    // Clear all intervals
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals.clear();
  }
  
  /**
   * Check if a timeout with the given key exists
   * @param key The key to check
   * @returns True if timeout exists
   */
  has(key: string): boolean {
    return this.timeouts.has(key);
  }
  
  /**
   * Check if an interval with the given key exists
   * @param key The key to check
   * @returns True if interval exists
   */
  hasInterval(key: string): boolean {
    return this.intervals.has(key);
  }
  
  /**
   * Get the number of active timeouts
   */
  get timeoutCount(): number {
    return this.timeouts.size;
  }
  
  /**
   * Get the number of active intervals
   */
  get intervalCount(): number {
    return this.intervals.size;
  }
  
  /**
   * Get all active timeout keys
   */
  getTimeoutKeys(): string[] {
    return Array.from(this.timeouts.keys());
  }
  
  /**
   * Get all active interval keys
   */
  getIntervalKeys(): string[] {
    return Array.from(this.intervals.keys());
  }
}

/**
 * React hook for using TimeoutManager with automatic cleanup on unmount
 */
import { useEffect, useRef } from 'react';

export function useTimeoutManager(): TimeoutManager {
  const managerRef = useRef<TimeoutManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new TimeoutManager();
  }
  
  useEffect(() => {
    const manager = managerRef.current;
    
    // Cleanup function for component unmount
    return () => {
      manager?.clearAll();
    };
  }, []);
  
  return managerRef.current;
}

/**
 * Promise-based timeout utility with cancellation support
 */
export class CancellableTimeout {
  private timeoutId: NodeJS.Timeout | null = null;
  private promise: Promise<void>;
  private resolvePromise?: () => void;
  private rejectPromise?: (error: Error) => void;
  
  constructor(delay: number) {
    this.promise = new Promise<void>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
      
      this.timeoutId = setTimeout(() => {
        this.timeoutId = null;
        this.resolvePromise?.();
      }, delay);
    });
  }
  
  /**
   * Cancel the timeout
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.rejectPromise?.(new Error('Timeout cancelled'));
    }
  }
  
  /**
   * Get the promise that resolves when timeout completes
   */
  get asPromise(): Promise<void> {
    return this.promise;
  }
  
  /**
   * Check if timeout is still active
   */
  get isActive(): boolean {
    return this.timeoutId !== null;
  }
}

/**
 * Utility function to create a race between a promise and a timeout
 * @param promise The promise to race
 * @param timeoutMs Timeout in milliseconds
 * @param timeoutMessage Custom timeout error message
 * @returns Promise that resolves with original promise result or rejects with timeout
 */
export async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeout = new CancellableTimeout(timeoutMs);
  
  try {
    const result = await Promise.race([
      promise,
      timeout.asPromise.then(() => {
        throw new Error(timeoutMessage);
      })
    ]);
    
    timeout.cancel();
    return result;
  } catch (error) {
    timeout.cancel();
    throw error;
  }
}

/**
 * Debounce utility using TimeoutManager
 * @param key Unique key for this debounced function
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @param manager TimeoutManager instance
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  key: string,
  fn: T,
  delay: number,
  manager: TimeoutManager
): T {
  return ((...args: Parameters<T>) => {
    manager.clear(key);
    manager.set(key, () => fn(...args), delay);
  }) as T;
}

/**
 * Throttle utility using TimeoutManager
 * @param key Unique key for this throttled function
 * @param fn Function to throttle
 * @param delay Delay in milliseconds
 * @param manager TimeoutManager instance
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  key: string,
  fn: T,
  delay: number,
  manager: TimeoutManager
): T {
  let lastExecution = 0;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExecution >= delay) {
      lastExecution = now;
      fn(...args);
    } else {
      manager.clear(key);
      manager.set(key, () => {
        lastExecution = Date.now();
        fn(...args);
      }, delay - (now - lastExecution));
    }
  }) as T;
}
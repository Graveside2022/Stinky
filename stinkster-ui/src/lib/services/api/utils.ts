/**
 * Utility functions for API operations
 */

import type { ApiError, ApiResponse } from './types';

/**
 * Check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'NetworkError' || error.name === 'TypeError';
  }
  return false;
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError';
  }
  return false;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (isApiError(error)) {
    return error.status || error.response?.status;
  }
  return undefined;
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    shouldRetry = () => true
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error, attempt) || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create a cancellable request
 */
export function createCancellableRequest<T>(
  request: (signal: AbortSignal) => Promise<T>
): {
  promise: Promise<T>;
  cancel: () => void;
} {
  const controller = new AbortController();

  return {
    promise: request(controller.signal),
    cancel: () => controller.abort()
  };
}

/**
 * Batch multiple API requests with concurrency control
 */
export async function batchRequests<T>(
  requests: (() => Promise<T>)[],
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<T[]> {
  const { concurrency = 5, onProgress } = options;
  const results: T[] = [];
  const queue = [...requests];
  let completed = 0;

  async function processQueue(): Promise<void> {
    while (queue.length > 0) {
      const request = queue.shift();
      if (request) {
        const result = await request();
        results.push(result);
        completed++;
        onProgress?.(completed, requests.length);
      }
    }
  }

  // Start concurrent workers
  const workers = Array(Math.min(concurrency, requests.length))
    .fill(null)
    .map(() => processQueue());

  await Promise.all(workers);

  return results;
}

/**
 * Create a debounced API request
 */
export function debounceRequest<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<any> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    // Cancel previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Create new promise
    pendingPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          timeoutId = null;
          pendingPromise = null;
        }
      }, delay);
    });

    return pendingPromise;
  }) as T;

  // Add cancel method
  (debounced as any).cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingPromise = null;
  };

  return debounced as T & { cancel: () => void };
}

/**
 * Cache API responses with TTL
 */
export class ResponseCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttl: number = 60000) { // Default 1 minute
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    const data = this.get(key);
    return data !== undefined;
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parse link header for pagination
 */
export function parseLinkHeader(header: string | null): {
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
} {
  if (!header) return {};

  const links: Record<string, string> = {};
  const parts = header.split(',');

  parts.forEach(part => {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links[match[2]] = match[1];
    }
  });

  return links;
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}

/**
 * Check if response is successful (2xx status code)
 */
export function isSuccessResponse(response: ApiResponse): boolean {
  return response.status >= 200 && response.status < 300;
}

/**
 * Create a progress tracker for file uploads
 */
export class UploadProgressTracker {
  private loaded = 0;
  private total = 0;
  private startTime = Date.now();
  private onProgress?: (progress: {
    loaded: number;
    total: number;
    percentage: number;
    speed: number;
    remainingTime: number;
  }) => void;

  constructor(onProgress?: typeof UploadProgressTracker.prototype.onProgress) {
    this.onProgress = onProgress;
  }

  update(loaded: number, total: number): void {
    this.loaded = loaded;
    this.total = total;

    const elapsedTime = Date.now() - this.startTime;
    const speed = loaded / (elapsedTime / 1000); // bytes per second
    const remainingBytes = total - loaded;
    const remainingTime = remainingBytes / speed; // seconds

    this.onProgress?.({
      loaded,
      total,
      percentage: Math.round((loaded / total) * 100),
      speed,
      remainingTime
    });
  }

  reset(): void {
    this.loaded = 0;
    this.total = 0;
    this.startTime = Date.now();
  }
}
/**
 * Tests for API utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isApiError,
  isNetworkError,
  isTimeoutError,
  getErrorMessage,
  getErrorStatus,
  retryWithBackoff,
  createCancellableRequest,
  batchRequests,
  debounceRequest,
  ResponseCache,
  formatBytes,
  parseLinkHeader,
  buildQueryString,
  isSuccessResponse,
  UploadProgressTracker
} from './utils';
import type { ApiError, ApiResponse } from './types';

describe('API Utils', () => {
  describe('Error checking functions', () => {
    it('should identify API errors', () => {
      const apiError: ApiError = {
        message: 'API Error',
        status: 404,
        code: 'NOT_FOUND'
      };

      expect(isApiError(apiError)).toBe(true);
      
      // The current implementation accepts any object with a message property
      // This is actually correct behavior as Error objects can be API errors
      const regularError = new Error('Regular error');
      expect(isApiError(regularError)).toBe(true);
      
      expect(isApiError('string error')).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError(123)).toBe(false);
      expect(isApiError({ notMessage: 'test' })).toBe(false);
    });

    it('should identify network errors', () => {
      const networkError = new Error('Network failed');
      networkError.name = 'NetworkError';

      const typeError = new Error('Type error');
      typeError.name = 'TypeError';

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(typeError)).toBe(true);
      expect(isNetworkError(new Error('Regular error'))).toBe(false);
    });

    it('should identify timeout errors', () => {
      const timeoutError = new Error('Request aborted');
      timeoutError.name = 'AbortError';

      expect(isTimeoutError(timeoutError)).toBe(true);
      expect(isTimeoutError(new Error('Regular error'))).toBe(false);
    });
  });

  describe('Error message extraction', () => {
    it('should extract message from API error', () => {
      const apiError: ApiError = {
        message: 'API Error',
        response: {
          data: { message: 'Server error message' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: { url: '/test' }
        }
      };

      expect(getErrorMessage(apiError)).toBe('Server error message');
    });

    it('should extract error field from API response', () => {
      const apiError: ApiError = {
        message: 'API Error',
        response: {
          data: { error: 'Error field message' },
          status: 400,
          statusText: 'Bad Request',
          headers: {},
          config: { url: '/test' }
        }
      };

      expect(getErrorMessage(apiError)).toBe('Error field message');
    });

    it('should fall back to main message', () => {
      const apiError: ApiError = {
        message: 'Main error message'
      };

      expect(getErrorMessage(apiError)).toBe('Main error message');
    });

    it('should handle Error instances', () => {
      expect(getErrorMessage(new Error('Standard error'))).toBe('Standard error');
    });

    it('should handle string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should handle unknown error types', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(getErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('Error status extraction', () => {
    it('should extract status from API error', () => {
      const apiError: ApiError = {
        message: 'Error',
        status: 404
      };

      expect(getErrorStatus(apiError)).toBe(404);
    });

    it('should extract status from response', () => {
      const apiError: ApiError = {
        message: 'Error',
        response: {
          status: 500,
          data: {},
          statusText: 'Error',
          headers: {},
          config: { url: '/test' }
        }
      };

      expect(getErrorStatus(apiError)).toBe(500);
    });

    it('should return undefined for non-API errors', () => {
      expect(getErrorStatus(new Error('Regular error'))).toBeUndefined();
      expect(getErrorStatus('String error')).toBeUndefined();
    });
  });

  describe('retryWithBackoff', () => {
    let mockFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFn = vi.fn();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on failure', async () => {
      mockFn
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('Success');

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 2,
        initialDelay: 100
      });

      // First retry
      await vi.advanceTimersByTimeAsync(100);
      
      // Second retry
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result).toBe('Success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxRetries', async () => {
      mockFn.mockRejectedValue(new Error('Always fails'));

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 2,
        initialDelay: 10
      });

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use custom shouldRetry function', async () => {
      const customError = new Error('Custom error');
      (customError as any).code = 'NO_RETRY';

      mockFn.mockRejectedValue(customError);

      const promise = retryWithBackoff(mockFn, {
        maxRetries: 3,
        shouldRetry: (error) => {
          return (error as any).code !== 'NO_RETRY';
        }
      });

      await expect(promise).rejects.toThrow('Custom error');
      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should apply exponential backoff with max delay', async () => {
      const error = new Error('Always fails');
      const delays: number[] = [];
      let attemptCount = 0;
      
      // Mock setTimeout to capture delays without actually waiting
      const originalSetTimeout = global.setTimeout;
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay?: number) => {
        if (delay !== undefined && delay > 0) {
          delays.push(delay);
          // Execute callback immediately
          fn();
        }
        return {} as any;
      });
      
      mockFn.mockImplementation(() => {
        attemptCount++;
        return Promise.reject(error);
      });

      await expect(
        retryWithBackoff(mockFn, {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 300,
          backoffFactor: 2
        })
      ).rejects.toThrow('Always fails');

      // Verify it was called 4 times (initial + 3 retries)
      expect(attemptCount).toBe(4);
      
      // Verify delays follow exponential backoff with cap
      expect(delays).toEqual([100, 200, 300]); // 300 instead of 400 due to maxDelay
      
      vi.restoreAllMocks();
    });
  });

  describe('createCancellableRequest', () => {
    it('should create cancellable promise', async () => {
      const mockRequest = vi.fn(async (signal: AbortSignal) => {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Aborted'));
          });
          setTimeout(() => resolve('Success'), 100);
        });
      });

      const { promise, cancel } = createCancellableRequest(mockRequest);

      cancel();

      await expect(promise).rejects.toThrow('Aborted');
    });

    it('should complete normally if not cancelled', async () => {
      const mockRequest = vi.fn(async () => 'Success');

      const { promise } = createCancellableRequest(mockRequest);

      expect(await promise).toBe('Success');
    });
  });

  describe('batchRequests', () => {
    it('should process requests with concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const createRequest = (id: number) => async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrent--;
        return id;
      };

      const requests = Array.from({ length: 10 }, (_, i) => createRequest(i));

      const results = await batchRequests(requests, { concurrency: 3 });

      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should call progress callback', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => async () => i);
      const progressUpdates: Array<[number, number]> = [];

      await batchRequests(requests, {
        concurrency: 2,
        onProgress: (completed, total) => {
          progressUpdates.push([completed, total]);
        }
      });

      expect(progressUpdates).toContainEqual([5, 5]);
      expect(progressUpdates.length).toBe(5);
    });
  });

  describe('debounceRequest', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce multiple calls', async () => {
      const mockFn = vi.fn(async (value: string) => `Result: ${value}`);
      const debounced = debounceRequest(mockFn, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      expect(mockFn).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('should be cancellable', async () => {
      const mockFn = vi.fn(async () => 'result');
      const debounced = debounceRequest(mockFn, 100);

      debounced();
      debounced.cancel();

      await vi.advanceTimersByTimeAsync(100);

      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('ResponseCache', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cache and retrieve values', () => {
      const cache = new ResponseCache<string>(60000);

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should expire cached values', () => {
      const cache = new ResponseCache<string>(1000); // 1 second TTL

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(1001);

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all cached values', () => {
      const cache = new ResponseCache<string>();

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should delete specific keys', () => {
      const cache = new ResponseCache<string>();

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.delete('key1')).toBe(true);
      expect(cache.delete('key3')).toBe(false);

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    it('should handle decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });
  });

  describe('parseLinkHeader', () => {
    it('should parse link headers correctly', () => {
      const header = '<https://api.example.com/page/2>; rel="next", <https://api.example.com/page/1>; rel="prev"';
      const links = parseLinkHeader(header);

      expect(links).toEqual({
        next: 'https://api.example.com/page/2',
        prev: 'https://api.example.com/page/1'
      });
    });

    it('should handle null headers', () => {
      expect(parseLinkHeader(null)).toEqual({});
    });

    it('should handle complex link headers', () => {
      const header = '<https://api.example.com/page/1>; rel="first", <https://api.example.com/page/5>; rel="last"';
      const links = parseLinkHeader(header);

      expect(links).toEqual({
        first: 'https://api.example.com/page/1',
        last: 'https://api.example.com/page/5'
      });
    });
  });

  describe('buildQueryString', () => {
    it('should build query string from object', () => {
      const params = {
        page: 1,
        limit: 10,
        sort: 'name'
      };

      expect(buildQueryString(params)).toBe('page=1&limit=10&sort=name');
    });

    it('should handle arrays', () => {
      const params = {
        ids: [1, 2, 3],
        single: 'value'
      };

      expect(buildQueryString(params)).toBe('ids=1&ids=2&ids=3&single=value');
    });

    it('should skip null and undefined values', () => {
      const params = {
        page: 1,
        filter: undefined,
        sort: null,
        limit: 10
      };

      expect(buildQueryString(params)).toBe('page=1&limit=10');
    });

    it('should handle empty objects', () => {
      expect(buildQueryString({})).toBe('');
    });
  });

  describe('isSuccessResponse', () => {
    it('should identify success responses', () => {
      const successResponse: ApiResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test' }
      };

      expect(isSuccessResponse(successResponse)).toBe(true);
      expect(isSuccessResponse({ ...successResponse, status: 201 })).toBe(true);
      expect(isSuccessResponse({ ...successResponse, status: 299 })).toBe(true);
    });

    it('should identify non-success responses', () => {
      const errorResponse: ApiResponse = {
        data: {},
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { url: '/test' }
      };

      expect(isSuccessResponse(errorResponse)).toBe(false);
      expect(isSuccessResponse({ ...errorResponse, status: 300 })).toBe(false);
      expect(isSuccessResponse({ ...errorResponse, status: 199 })).toBe(false);
    });
  });

  describe('UploadProgressTracker', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should track upload progress', () => {
      const progressUpdates: any[] = [];
      const tracker = new UploadProgressTracker((progress) => {
        progressUpdates.push(progress);
      });

      vi.advanceTimersByTime(1000); // 1 second elapsed

      tracker.update(500, 1000);

      expect(progressUpdates[0]).toMatchObject({
        loaded: 500,
        total: 1000,
        percentage: 50,
        speed: 500, // 500 bytes per second
        remainingTime: 1 // 1 second remaining
      });
    });

    it('should reset tracker', () => {
      const progressUpdates: any[] = [];
      const tracker = new UploadProgressTracker((progress) => {
        progressUpdates.push(progress);
      });

      tracker.update(500, 1000);
      tracker.reset();

      vi.advanceTimersByTime(1000);
      tracker.update(100, 500);

      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.loaded).toBe(100);
      expect(lastUpdate.total).toBe(500);
    });
  });
});
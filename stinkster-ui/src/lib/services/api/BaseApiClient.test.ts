/**
 * Tests for BaseApiClient
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaseApiClient } from './BaseApiClient';
import type { ApiRequestConfig, RequestInterceptor, ResponseInterceptor } from './types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BaseApiClient', () => {
  let client: BaseApiClient;

  beforeEach(() => {
    client = new BaseApiClient('http://localhost:3000');
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with base URL', () => {
      expect(client).toBeDefined();
    });

    it('should remove trailing slash from base URL', async () => {
      const clientWithSlash = new BaseApiClient('http://localhost:3000/');
      // Test by making a request and checking the URL
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      await clientWithSlash.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.any(Object)
      );
    });
  });

  describe('request methods', () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ data: 'test' })
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue(mockResponse);
    });

    it('should make GET request', async () => {
      const response = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(response.data).toEqual({ data: 'test' });
      expect(response.status).toBe(200);
    });

    it('should make POST request with data', async () => {
      const data = { name: 'test' };
      await client.post('/test', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data)
        })
      );
    });

    it('should make PUT request', async () => {
      const data = { name: 'updated' };
      await client.put('/test/1', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data)
        })
      );
    });

    it('should make DELETE request', async () => {
      await client.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should make PATCH request', async () => {
      const data = { name: 'patched' };
      await client.patch('/test/1', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data)
        })
      );
    });
  });

  describe('query parameters', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });
    });

    it('should append query parameters', async () => {
      await client.get('/test', {
        params: { page: 1, limit: 10 }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should handle array parameters', async () => {
      await client.get('/test', {
        params: { ids: [1, 2, 3] }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test?ids=1&ids=2&ids=3',
        expect.any(Object)
      );
    });

    it('should skip undefined and null parameters', async () => {
      await client.get('/test', {
        params: { 
          page: 1, 
          filter: undefined,
          sort: null,
          limit: 10
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test?page=1&limit=10',
        expect.any(Object)
      );
    });
  });

  describe('authentication', () => {
    it('should apply API key authentication to header', async () => {
      const authClient = new BaseApiClient('http://localhost:3000', {
        type: 'apiKey',
        credentials: 'test-api-key',
        headerName: 'X-API-Key'
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      await authClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key'
          })
        })
      );
    });

    it('should apply API key authentication to query params', async () => {
      const authClient = new BaseApiClient('http://localhost:3000', {
        type: 'apiKey',
        credentials: 'test-api-key',
        paramName: 'apiKey'
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      await authClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/test?apiKey=test-api-key',
        expect.any(Object)
      );
    });

    it('should apply bearer token authentication', async () => {
      const authClient = new BaseApiClient('http://localhost:3000', {
        type: 'bearer',
        credentials: 'test-token'
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      await authClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should apply basic authentication', async () => {
      const authClient = new BaseApiClient('http://localhost:3000', {
        type: 'basic',
        credentials: 'dXNlcjpwYXNz' // base64 encoded user:pass
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      await authClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Basic dXNlcjpwYXNz'
          })
        })
      );
    });
  });

  describe('interceptors', () => {
    it('should apply request interceptors', async () => {
      const interceptor: RequestInterceptor = {
        onRequest: vi.fn((config) => ({
          ...config,
          headers: { ...config.headers, 'X-Custom': 'value' }
        }))
      };

      client.addRequestInterceptor(interceptor);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      await client.get('/test');

      expect(interceptor.onRequest).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value'
          })
        })
      );
    });

    it('should apply response interceptors', async () => {
      const interceptor: ResponseInterceptor = {
        onResponse: vi.fn((response) => ({
          ...response,
          data: { ...response.data, intercepted: true }
        }))
      };

      client.addResponseInterceptor(interceptor);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({ original: true })
      });

      const response = await client.get('/test');

      expect(interceptor.onResponse).toHaveBeenCalled();
      expect(response.data).toEqual({ original: true, intercepted: true });
    });

    it('should handle request interceptor errors', async () => {
      const interceptor: RequestInterceptor = {
        onRequest: vi.fn(() => {
          throw new Error('Interceptor error');
        }),
        onError: vi.fn()
      };

      client.addRequestInterceptor(interceptor);

      await expect(client.get('/test')).rejects.toThrow('Interceptor error');
      expect(interceptor.onError).toHaveBeenCalled();
    });

    it('should handle response interceptor errors', async () => {
      const interceptor: ResponseInterceptor = {
        onResponse: vi.fn(() => {
          throw new Error('Response interceptor error');
        }),
        onError: vi.fn()
      };

      client.addResponseInterceptor(interceptor);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      await expect(client.get('/test')).rejects.toThrow('Response interceptor error');
      expect(interceptor.onError).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => ({ error: 'Not found' })
      });

      await expect(client.get('/test', { retries: 0 })).rejects.toMatchObject({
        message: 'HTTP 404: Not Found',
        status: 404
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.get('/test', { retries: 0 })).rejects.toMatchObject({
        message: 'Network error'
      });
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(client.get('/test', { timeout: 1000, retries: 0 })).rejects.toMatchObject({
        message: expect.stringContaining('aborted')
      });
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests', async () => {
      vi.useFakeTimers();
      
      mockFetch
        .mockRejectedValueOnce(new Error('First attempt'))
        .mockRejectedValueOnce(new Error('Second attempt'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({ success: true })
        });

      const promise = client.get('/test', { retries: 2, retryDelay: 10 });
      
      // Wait for retries
      await vi.advanceTimersByTimeAsync(10);
      await vi.advanceTimersByTimeAsync(20);
      
      const response = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response.data).toEqual({ success: true });
      
      vi.useRealTimers();
    });

    it('should not retry on 401 errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockFetch.mockRejectedValue(error);

      await expect(client.get('/test', { retries: 3 })).rejects.toMatchObject({
        message: 'Unauthorized'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff for retries', async () => {
      vi.useFakeTimers();

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay?: number) => {
        if (delay && delay > 0) {
          delays.push(delay);
        }
        return originalSetTimeout(fn, delay);
      });

      mockFetch
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({})
        });

      const promise = client.get('/test', { retries: 2, retryDelay: 100 });

      // Let all timers run
      await vi.runAllTimersAsync();
      await promise;

      // Check delays are exponential
      expect(delays).toContain(100); // First retry
      expect(delays).toContain(200); // Second retry (exponential)

      vi.restoreAllMocks();
      vi.useRealTimers();
    });
  });

  describe('response types', () => {
    it('should handle JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({ type: 'json' })
      });

      const response = await client.get('/test', { retries: 0 });
      expect(response.data).toEqual({ type: 'json' });
    });

    it('should handle text responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: async () => 'plain text'
      });

      const response = await client.get('/test', { responseType: 'text', retries: 0 });
      expect(response.data).toBe('plain text');
    });

    it('should handle blob responses', async () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        blob: async () => blob
      });

      const response = await client.get('/test', { responseType: 'blob', retries: 0 });
      expect(response.data).toBe(blob);
    });

    it('should handle arraybuffer responses', async () => {
      const buffer = new ArrayBuffer(8);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        arrayBuffer: async () => buffer
      });

      const response = await client.get('/test', { responseType: 'arraybuffer' });
      expect(response.data).toBe(buffer);
    });
  });

  describe('FormData handling', () => {
    it('should send FormData without Content-Type header', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({ uploaded: true })
      });

      await client.post('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: formData,
          headers: expect.not.objectContaining({
            'Content-Type': expect.any(String)
          })
        })
      );
    });
  });

  describe('auth management', () => {
    it('should update auth configuration', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      await client.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );

      client.setAuth({
        type: 'bearer',
        credentials: 'new-token'
      });

      await client.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer new-token'
          })
        })
      );
    });

    it('should clear auth configuration', async () => {
      const authClient = new BaseApiClient('http://localhost:3000', {
        type: 'bearer',
        credentials: 'token'
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({})
      });

      authClient.clearAuth();

      await authClient.get('/test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });
});
/**
 * Main HTTP client for WigleToTAK API integration
 * Provides a typed, centralized client for all API communication
 */

import { BaseApiClient } from '../services/api/BaseApiClient';
import type { ApiResponse, ApiRequestConfig } from '../services/api/types';
import type { StandardApiResponse, ConnectionStatus } from './types';

// Default configuration
const DEFAULT_CONFIG = {
  baseURL: 'http://localhost:8001',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
};

export class WigleToTAKApiClient extends BaseApiClient {
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnectAttempts: 0
  };

  constructor(baseURL?: string) {
    const config = {
      ...DEFAULT_CONFIG,
      baseURL: baseURL || DEFAULT_CONFIG.baseURL
    };

    super(config.baseURL);

    // Add request interceptor for default headers and auth
    this.addRequestInterceptor({
      onRequest: async (config) => {
        // Add default headers
        config.headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client': 'WigleToTAK-UI',
          'X-Client-Version': '1.0.0',
          ...config.headers
        };

        // Add timestamp for request tracking
        config.headers['X-Request-Time'] = new Date().toISOString();

        return config;
      },
      onError: async (error) => {
        console.error('Request interceptor error:', error);
        throw error;
      }
    });

    // Add response interceptor for error handling and connection status
    this.addResponseInterceptor({
      onResponse: async (response) => {
        // Update connection status on successful response
        this.updateConnectionStatus(true);
        
        // Log response in development
        if (import.meta.env.DEV) {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            duration: this.calculateRequestDuration(response.config.headers?.['X-Request-Time'])
          });
        }

        return response;
      },
      onError: async (error) => {
        // Update connection status on error
        this.updateConnectionStatus(false);
        
        // Enhanced error logging
        console.error('[API Error]', {
          url: error.request?.url,
          method: error.request?.method,
          status: error.status,
          message: error.message,
          timestamp: new Date().toISOString()
        });

        // Rethrow the error for handling by the calling code
        throw error;
      }
    });
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(connected: boolean): void {
    const now = Date.now();
    
    if (connected) {
      this.connectionStatus = {
        ...this.connectionStatus,
        connected: true,
        lastPing: now,
        reconnectAttempts: 0
      };
    } else {
      this.connectionStatus = {
        ...this.connectionStatus,
        connected: false,
        reconnectAttempts: this.connectionStatus.reconnectAttempts + 1
      };
    }
  }

  /**
   * Calculate request duration
   */
  private calculateRequestDuration(requestTime?: string): number {
    if (!requestTime) return 0;
    return Date.now() - new Date(requestTime).getTime();
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Test connection to the API
   */
  public async testConnection(): Promise<boolean> {
    try {
      const start = Date.now();
      await this.get('/api/system/health', { timeout: 5000 });
      const latency = Date.now() - start;
      
      this.connectionStatus = {
        ...this.connectionStatus,
        connected: true,
        latency,
        lastPing: Date.now(),
        reconnectAttempts: 0
      };
      
      return true;
    } catch (error) {
      this.updateConnectionStatus(false);
      return false;
    }
  }

  /**
   * Wrapper for standard API responses
   */
  public async requestStandard<T = any>(config: ApiRequestConfig): Promise<T> {
    try {
      const response = await this.request<StandardApiResponse<T>>(config);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'API request failed');
      }
      
      return response.data.data as T;
    } catch (error) {
      // Log the error with context
      console.error(`[API] Failed ${config.method || 'GET'} ${config.url}:`, error);
      throw error;
    }
  }

  /**
   * GET request with standard response handling
   */
  public async getStandard<T = any>(
    url: string, 
    config?: Omit<ApiRequestConfig, 'url' | 'method'>
  ): Promise<T> {
    return this.requestStandard<T>({ ...config, url, method: 'GET' });
  }

  /**
   * POST request with standard response handling
   */
  public async postStandard<T = any>(
    url: string, 
    data?: any, 
    config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>
  ): Promise<T> {
    return this.requestStandard<T>({ ...config, url, method: 'POST', data });
  }

  /**
   * PUT request with standard response handling
   */
  public async putStandard<T = any>(
    url: string, 
    data?: any, 
    config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>
  ): Promise<T> {
    return this.requestStandard<T>({ ...config, url, method: 'PUT', data });
  }

  /**
   * DELETE request with standard response handling
   */
  public async deleteStandard<T = any>(
    url: string, 
    config?: Omit<ApiRequestConfig, 'url' | 'method'>
  ): Promise<T> {
    return this.requestStandard<T>({ ...config, url, method: 'DELETE' });
  }

  /**
   * PATCH request with standard response handling
   */
  public async patchStandard<T = any>(
    url: string, 
    data?: any, 
    config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>
  ): Promise<T> {
    return this.requestStandard<T>({ ...config, url, method: 'PATCH', data });
  }

  /**
   * Stream data from an endpoint (for real-time updates)
   */
  public async stream<T = any>(
    url: string,
    onData: (data: T) => void,
    onError?: (error: Error) => void,
    config?: Omit<ApiRequestConfig, 'url' | 'method'>
  ): Promise<AbortController> {
    const controller = new AbortController();
    
    try {
      const response = await fetch(this.buildURL(url), {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
          'Cache-Control': 'no-cache',
          ...config?.headers
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // Process stream
      this.processStream(reader, onData, onError);

    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        console.error('Stream error:', error);
      }
    }

    return controller;
  }

  /**
   * Process stream data
   */
  private async processStream<T>(
    reader: ReadableStreamDefaultReader,
    onData: (data: T) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line) as T;
              onData(data);
            } catch (parseError) {
              console.warn('Failed to parse stream data:', line);
            }
          }
        }
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
        console.error('Stream processing error:', error);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Build full URL (helper method)
   */
  private buildURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${DEFAULT_CONFIG.baseURL}/${url.replace(/^\//, '')}`;
  }

  /**
   * Retry a failed request with exponential backoff
   */
  public async retryRequest<T = any>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Request attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      }
    }
    
    throw lastError!;
  }

  /**
   * Batch multiple requests
   */
  public async batch<T = any>(
    requests: Array<() => Promise<T>>
  ): Promise<Array<T | Error>> {
    const results = await Promise.allSettled(
      requests.map(request => request())
    );
    
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    );
  }
}

// Create and export default client instance
export const apiClient = new WigleToTAKApiClient();

// Export client class for custom instances
export { WigleToTAKApiClient };

// Utility function to create a configured client
export function createApiClient(baseURL?: string): WigleToTAKApiClient {
  return new WigleToTAKApiClient(baseURL);
}
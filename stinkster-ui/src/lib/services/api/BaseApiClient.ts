/**
 * Base API client with interceptors, retry logic, and error handling
 */

import type {
  ApiRequestConfig,
  ApiResponse,
  ApiError,
  AuthConfig,
  RequestInterceptor,
  ResponseInterceptor
} from './types';

export class BaseApiClient {
  private baseURL: string;
  private authConfig?: AuthConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 3;
  private defaultRetryDelay = 1000; // 1 second

  constructor(baseURL: string, authConfig?: AuthConfig) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.authConfig = authConfig;
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Apply auth to request
  private applyAuth(config: ApiRequestConfig): ApiRequestConfig {
    if (!this.authConfig) return config;

    const headers = { ...config.headers };

    switch (this.authConfig.type) {
      case 'apiKey':
        if (this.authConfig.headerName && this.authConfig.credentials) {
          headers[this.authConfig.headerName] = this.authConfig.credentials;
        } else if (this.authConfig.paramName && this.authConfig.credentials) {
          config.params = {
            ...config.params,
            [this.authConfig.paramName]: this.authConfig.credentials
          };
        }
        break;
      case 'bearer':
        if (this.authConfig.credentials) {
          headers['Authorization'] = `Bearer ${this.authConfig.credentials}`;
        }
        break;
      case 'basic':
        if (this.authConfig.credentials) {
          headers['Authorization'] = `Basic ${this.authConfig.credentials}`;
        }
        break;
      case 'custom':
        // Custom auth handled by interceptors
        break;
    }

    return { ...config, headers };
  }

  // Apply request interceptors
  private async applyRequestInterceptors(config: ApiRequestConfig): Promise<ApiRequestConfig> {
    let processedConfig = config;

    for (const interceptor of this.requestInterceptors) {
      try {
        if (interceptor.onRequest) {
          processedConfig = await interceptor.onRequest(processedConfig);
        }
      } catch (error) {
        if (interceptor.onError) {
          await interceptor.onError(error as Error);
        }
        throw error;
      }
    }

    return processedConfig;
  }

  // Apply response interceptors
  private async applyResponseInterceptors<T>(response: ApiResponse<T>): Promise<ApiResponse<T>> {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      try {
        if (interceptor.onResponse) {
          processedResponse = await interceptor.onResponse(processedResponse);
        }
      } catch (error) {
        if (interceptor.onError) {
          await interceptor.onError(error as ApiError);
        }
        throw error;
      }
    }

    return processedResponse;
  }

  // Build full URL
  private buildURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.baseURL}/${url.replace(/^\//, '')}`;
  }

  // Build query string
  private buildQueryString(params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) return '';

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

  // Execute request with retry logic
  private async executeRequest<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const retries = config.retries ?? this.defaultRetries;
    const retryDelay = config.retryDelay ?? this.defaultRetryDelay;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Build full URL with query parameters
        const queryString = this.buildQueryString(config.params);
        const fullURL = this.buildURL(config.url) + (queryString ? `?${queryString}` : '');

        // Prepare fetch options
        const fetchOptions: RequestInit = {
          method: config.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          },
          signal: config.signal,
          credentials: config.withCredentials ? 'include' : 'same-origin'
        };

        // Add body for non-GET requests
        if (config.data && config.method !== 'GET') {
          if (config.data instanceof FormData) {
            delete (fetchOptions.headers as any)['Content-Type']; // Let browser set multipart boundary
            fetchOptions.body = config.data;
          } else {
            fetchOptions.body = JSON.stringify(config.data);
          }
        }

        // Set timeout
        const timeout = config.timeout ?? this.defaultTimeout;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        if (!config.signal) {
          fetchOptions.signal = controller.signal;
        }

        try {
          // Make request
          const response = await fetch(fullURL, fetchOptions);
          clearTimeout(timeoutId);

          // Parse response
          let data: T;
          const responseType = config.responseType || 'json';

          switch (responseType) {
            case 'json':
              data = await response.json();
              break;
            case 'text':
              data = await response.text() as T;
              break;
            case 'blob':
              data = await response.blob() as T;
              break;
            case 'arraybuffer':
              data = await response.arrayBuffer() as T;
              break;
            default:
              data = await response.json();
          }

          // Convert headers to object
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });

          // Create API response
          const apiResponse: ApiResponse<T> = {
            data,
            status: response.status,
            statusText: response.statusText,
            headers,
            config
          };

          // Check for HTTP errors
          if (!response.ok) {
            const error: ApiError = {
              message: `HTTP ${response.status}: ${response.statusText}`,
              status: response.status,
              response: apiResponse,
              request: config
            };
            throw error;
          }

          return apiResponse;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError' || (error as any).status === 401) {
            throw this.createApiError(error, config);
          }
        }

        // If it's the last attempt, throw the error
        if (attempt === retries) {
          throw this.createApiError(lastError, config);
        }

        // Log retry attempt
        console.warn(`Request failed, retrying (${attempt + 1}/${retries})...`, error);

        // Wait before retrying with exponential backoff
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }

    throw this.createApiError(lastError!, config);
  }

  // Create API error
  private createApiError(error: Error, config: ApiRequestConfig): ApiError {
    const apiError: ApiError = {
      message: error.message || 'Unknown error occurred',
      request: config
    };

    if ((error as any).status) {
      apiError.status = (error as any).status;
    }

    if ((error as any).response) {
      apiError.response = (error as any).response;
    }

    return apiError;
  }

  // Delay helper for retry logic
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main request method
  async request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    try {
      // Apply auth
      let processedConfig = this.applyAuth(config);

      // Apply request interceptors
      processedConfig = await this.applyRequestInterceptors(processedConfig);

      // Execute request with retries
      const response = await this.executeRequest<T>(processedConfig);

      // Apply response interceptors
      const finalResponse = await this.applyResponseInterceptors(response);

      // Log successful request
      this.logRequest(processedConfig, finalResponse);

      return finalResponse;
    } catch (error) {
      // Log failed request
      this.logError(config, error as ApiError);

      // Apply error interceptors
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onError) {
          try {
            await interceptor.onError(error as ApiError);
          } catch (interceptorError) {
            // If interceptor throws, use that error instead
            throw interceptorError;
          }
        }
      }

      throw error;
    }
  }

  // Convenience methods
  get<T = any>(url: string, config?: Omit<ApiRequestConfig, 'url' | 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  post<T = any>(url: string, data?: any, config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }

  put<T = any>(url: string, data?: any, config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', data });
  }

  delete<T = any>(url: string, config?: Omit<ApiRequestConfig, 'url' | 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  patch<T = any>(url: string, data?: any, config?: Omit<ApiRequestConfig, 'url' | 'method' | 'data'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', data });
  }

  // Logging methods
  private logRequest(config: ApiRequestConfig, response: ApiResponse): void {
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method} ${config.url}`, {
        config,
        response: {
          status: response.status,
          data: response.data
        }
      });
    }
  }

  private logError(config: ApiRequestConfig, error: ApiError): void {
    console.error(`[API Error] ${config.method} ${config.url}`, {
      config,
      error
    });
  }

  // Update auth configuration
  setAuth(authConfig: AuthConfig): void {
    this.authConfig = authConfig;
  }

  // Clear auth
  clearAuth(): void {
    this.authConfig = undefined;
  }
}
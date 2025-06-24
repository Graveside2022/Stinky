/**
 * Base types for the API service layer
 */

// Request configuration
export interface ApiRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

// Response structure
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: ApiRequestConfig;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  response?: ApiResponse;
  request?: ApiRequestConfig;
}

// Authentication types
export interface AuthConfig {
  type: 'apiKey' | 'bearer' | 'basic' | 'custom';
  credentials?: string;
  headerName?: string;
  paramName?: string;
}

// Interceptor types
export interface RequestInterceptor {
  onRequest?: (config: ApiRequestConfig) => Promise<ApiRequestConfig> | ApiRequestConfig;
  onError?: (error: Error) => Promise<never> | never;
}

export interface ResponseInterceptor {
  onResponse?: <T>(response: ApiResponse<T>) => Promise<ApiResponse<T>> | ApiResponse<T>;
  onError?: (error: ApiError) => Promise<never> | never;
}

// Service-specific API types

// HackRF API types
export interface HackRFConfig {
  frequency: number;
  sampleRate: number;
  gain: number;
  bandwidth: number;
}

export interface HackRFStatus {
  connected: boolean;
  frequency: number;
  sampleRate: number;
  gain: number;
  bandwidth: number;
  streaming: boolean;
}

export interface SpectrumData {
  frequencies: number[];
  magnitudes: number[];
  timestamp: number;
  centerFrequency: number;
  bandwidth: number;
}

// WigleToTAK API types
export interface WifiDevice {
  mac: string;
  ssid: string;
  manufacturer?: string;
  type: string;
  channel: number;
  frequency: number;
  signal: number;
  lastSeen: number;
  latitude?: number;
  longitude?: number;
}

export interface TAKMessage {
  uid: string;
  type: string;
  how: string;
  time: string;
  start: string;
  stale: string;
  point: {
    lat: number;
    lon: number;
    hae: number;
    ce: number;
    le: number;
  };
  detail: Record<string, any>;
}

export interface WigleConfig {
  takServer: string;
  takPort: number;
  callsign: string;
  team: string;
  role: string;
  antennaHeight: number;
  scanInterval: number;
}

// Kismet API types
export interface KismetDevice {
  kismet_device_base_macaddr: string;
  kismet_device_base_name: string;
  kismet_device_base_type: string;
  kismet_device_base_channel: string;
  kismet_device_base_frequency: number;
  kismet_device_base_signal: {
    kismet_common_signal_last_signal: number;
    kismet_common_signal_last_noise: number;
    kismet_common_signal_min_signal: number;
    kismet_common_signal_max_signal: number;
  };
  kismet_device_base_location: {
    kismet_common_location_lat: number;
    kismet_common_location_lon: number;
    kismet_common_location_alt: number;
  };
  kismet_device_base_first_time: number;
  kismet_device_base_last_time: number;
}

export interface KismetStatus {
  kismet_system_timestamp: number;
  kismet_system_memory: {
    kismet_system_memory_rss: number;
    kismet_system_memory_virt: number;
  };
  kismet_system_devices: number;
  kismet_system_packets: number;
}

export interface KismetAlert {
  kismet_alert_id: string;
  kismet_alert_header: string;
  kismet_alert_class: string;
  kismet_alert_severity: number;
  kismet_alert_timestamp: number;
  kismet_alert_text: string;
}

// File upload types
export interface FileUploadConfig extends ApiRequestConfig {
  file: File | Blob;
  fieldName?: string;
  onProgress?: (progress: ProgressEvent) => void;
}

// Pagination types
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}
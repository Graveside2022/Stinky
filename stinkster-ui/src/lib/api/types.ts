/**
 * API-specific types and responses for WigleToTAK UI
 * Extends the base API types with domain-specific structures
 */

import type { ApiResponse, ApiError } from '../services/api/types';

// System Status Types
export interface SystemStatus {
  timestamp: number;
  services: {
    backend: ServiceStatus | null;
    kismetOps: ServiceStatus | null;
    openwebrx: ServiceStatus | null;
    spectrumAnalyzer: ServiceStatus | null;
    kismet: ServiceStatus | null;
    gpsd: ServiceStatus | null;
  };
  system: {
    cpu: number;
    memory: MemoryInfo;
    disk: DiskInfo;
    temperature: number;
    loadAverage: number[];
    uptime: number;
  };
  processes: {
    kismet: ProcessInfo | null;
    wigletotak: ProcessInfo | null;
    mavgps: ProcessInfo | null;
    openwebrx: ProcessInfo | null;
  };
  connectivity: {
    internet: boolean;
    dns: boolean;
    services: Record<string, boolean>;
  };
}

export interface ServiceStatus {
  status: 'running' | 'stopped' | 'error' | 'unknown';
  uptime?: number;
  pid?: number;
  memory?: number;
  cpu?: number;
  version?: string;
  port?: number;
}

export interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  available: number;
  percentage: number;
}

export interface DiskInfo {
  total: string;
  used: string;
  available: string;
  percentage: number;
}

export interface ProcessInfo {
  running: boolean;
  pids: string[];
  containerIds?: string[];
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, 'running' | 'unavailable'>;
  uptime: number;
  timestamp: number;
}

// Service Control Types
export interface ServiceControlRequest {
  action: 'start' | 'stop' | 'restart';
  service: string;
}

export interface ServiceControlResponse {
  success: boolean;
  service: string;
  action: string;
  running: boolean;
  timestamp: number;
}

// Kismet API Types
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

// WebSocket Event Types
export interface WSEvent<T = any> {
  type: string;
  data: T;
  timestamp: number;
  id?: string;
}

export interface DeviceUpdateEvent {
  device: WifiDevice;
  action: 'new' | 'update' | 'remove';
  changes?: Partial<WifiDevice>;
}

export interface ScanStatusEvent {
  running: boolean;
  devicesFound: number;
  packetsProcessed: number;
  errors: number;
  lastUpdate: number;
}

export interface TAKStatusEvent {
  connected: boolean;
  server: string;
  port: number;
  messagesSent: number;
  lastMessage: number;
  errors: number;
}

// WiFi Device Types
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
  encryption?: string;
  clients?: number;
  beacons?: number;
  probes?: number;
}

// TAK Integration Types
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

export interface TAKConfig {
  server: string;
  port: number;
  callsign: string;
  team: string;
  role: string;
  antennaHeight: number;
  scanInterval: number;
  enabled: boolean;
}

// API Response Wrappers
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  timestamp: number;
}

// Device Management
export interface DeviceFilter {
  ssid?: string;
  type?: string;
  channel?: number;
  signalMin?: number;
  signalMax?: number;
  manufacturer?: string;
  encryption?: string;
  lastSeenSince?: number;
}

export interface DeviceSort {
  field: 'ssid' | 'signal' | 'channel' | 'lastSeen' | 'manufacturer';
  direction: 'asc' | 'desc';
}

export interface DeviceListRequest {
  filter?: DeviceFilter;
  sort?: DeviceSort;
  page?: number;
  limit?: number;
}

export interface DeviceListResponse {
  devices: WifiDevice[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Statistics and Analytics
export interface DeviceStats {
  total: number;
  byType: Record<string, number>;
  byChannel: Record<number, number>;
  byManufacturer: Record<string, number>;
  byEncryption: Record<string, number>;
  signalDistribution: {
    excellent: number; // > -50 dBm
    good: number;      // -50 to -70 dBm
    fair: number;      // -70 to -85 dBm
    poor: number;      // < -85 dBm
  };
}

export interface ScanStats {
  duration: number;
  devicesFound: number;
  packetsProcessed: number;
  averageSignal: number;
  channelCoverage: number[];
  errors: string[];
}

// Error Types
export interface ApiErrorDetails extends ApiError {
  endpoint?: string;
  requestId?: string;
  retryCount?: number;
  context?: Record<string, any>;
}

// Connection Status
export interface ConnectionStatus {
  connected: boolean;
  latency?: number;
  lastPing?: number;
  reconnectAttempts?: number;
  connectionTime?: number;
}

// Real-time Updates
export interface RealtimeUpdate<T = any> {
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: T;
  timestamp: number;
}

export interface StreamingResponse<T = any> {
  data: T;
  hasMore: boolean;
  cursor?: string;
  timestamp: number;
}
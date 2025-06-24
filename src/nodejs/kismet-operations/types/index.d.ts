// Main type definitions for Kismet Operations Center

// Configuration types
export interface SpectrumConfig {
  fft_size: number;
  center_freq: number;
  samp_rate: number;
  fft_compression: 'none' | 'gzip' | 'zlib';
  signal_threshold: number;
  signal_processing: SignalProcessingConfig;
}

export interface SignalProcessingConfig {
  enabled: boolean;
  algorithm: 'peak' | 'threshold' | 'adaptive';
  window_size: number;
  overlap: number;
}

// Kismet types
export interface KismetDevice {
  mac: string;
  last_seen: number;
  signal: KismetSignal | number;
  manufacturer: string;
  type: string;
  channel: number;
  frequency: number;
  packets: number;
  datasize: number;
  location?: Location | null;
  name?: string;
  gps?: Location;
}

export interface KismetSignal {
  'kismet.common.signal.last_signal': number;
  'kismet.common.signal.max_signal': number;
  'kismet.common.signal.min_signal': number;
}

export interface KismetNetwork {
  ssid: string;
  bssid: string;
  channel: number;
  frequency: number;
  encryption: string;
  last_seen: number;
  signal: KismetSignal | { 'kismet.common.signal.last_signal': number };
  clients: number;
}

export interface Location {
  lat: number;
  lon: number;
  alt?: number;
}

// Script management types
export interface ScriptInfo {
  name: string;
  path: string;
  pidFile?: string;
  running?: boolean;
  pid?: number;
}

export interface ScriptResult {
  script: string;
  pid?: number;
  stopped?: boolean;
  method?: string;
  message?: string;
  results?: Array<{
    cmd: string;
    success: boolean;
    stdout?: string;
    error?: string;
    message?: string;
  }>;
  errors?: string[];
}

export interface ScriptStatus {
  gps_kismet_wigle: { running: boolean };
  kismet: { running: boolean };
  wigle: { running: boolean };
  gps?: { running: boolean };
}

// Signal detection types
export interface Signal {
  id: string;
  frequency: number;
  strength?: string;
  power: number;
  bandwidth?: string | number;
  confidence?: number;
  type?: string;
  snr?: number;
  modulation?: string;
}

// Re-export HackRF types for convenience
export * from './hackrf';

export interface SignalDetection {
  id: string;
  source: 'kismet' | 'hackrf';
  lat: number;
  lon: number;
  signal_strength: number;
  timestamp: number;
  frequency?: number | null;
  metadata: {
    mac?: string;
    name?: string;
    type?: string;
    channel?: number;
    manufacturer?: string;
    bandwidth?: string | number;
    snr?: number;
    modulation?: string;
  };
}

// WebSocket event types
export interface FFTData {
  timestamp: number;
  frequency: number;
  sample_rate: number;
  fft_data: number[];
  fft_size: number;
}

export interface SignalStreamEvent {
  type: 'signal' | 'batch' | 'heartbeat' | 'subscribed' | 'queryResult';
  data?: SignalDetection | SignalDetection[];
  timestamp?: number;
  sources?: string[];
  count?: number;
  filters?: SignalFilters;
  activeSignals?: number;
}

export interface SignalFilters {
  source?: string;
  minStrength?: number;
  maxAge?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  timestamp?: string | number;
}

export interface KismetDataResponse {
  success: boolean;
  source: 'kismet' | 'demo';
  timestamp: number;
  data: {
    devices: KismetDevice[];
    networks: KismetNetwork[];
    timestamp: number;
  };
  stats: {
    total_devices: number;
    total_networks: number;
    kismet_connected: boolean;
  };
  warning?: string;
  error?: string;
}

export interface SystemInfo {
  ip: string;
  gps: {
    status: string;
    lat: string;
    lon: string;
    alt: string;
    time: string;
  };
}

export interface KismetFrontendData {
  devices_count: number;
  networks_count: number;
  recent_devices: Array<{
    mac: string;
    manufacturer: string;
    type: string;
    lastSeen: number;
    signal: string | number;
  }>;
  feed_items: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

// Process monitoring types
export interface ProcessInfo {
  pid: number;
  name: string;
  status: 'running' | 'stopped' | 'error';
  startTime?: Date;
  memory?: number;
}

// Webhook types
export interface WebhookConfig {
  kismetUrl: string;
  pidDir: string;
  cacheTimeout: number;
}

export interface WebhookEvent {
  type: string;
  data: any;
  timestamp: number;
  source: string;
}

// Express middleware extensions
import { Request, Response, NextFunction } from 'express';

export interface ExtendedRequest extends Request {
  kismetData?: any;
  scriptManager?: any;
}

// Configuration validation schema type
export interface ConfigValidationError {
  field: string;
  message: string;
}

// Status types
export interface SpectrumStatus {
  connected: boolean;
  buffer_size: number;
  last_update: number | null;
  config: SpectrumConfig;
  server_uptime?: number;
  connected_clients?: number;
  mode?: string;
  openwebrx_connected?: boolean;
  real_data?: boolean;
  fft_buffer_size?: number;
  last_fft_time?: number | null;
}

// Service status types
export interface ServiceStatus {
  kismet_running: boolean;
  wigle_running: boolean;
  gps_running: boolean;
  timestamp?: string;
  error?: string;
}

// Profile types for legacy endpoints
export interface ScanProfile {
  name: string;
  ranges: number[][];
  step: number;
  description?: string;
}

export interface ScanResult {
  profile: ScanProfile;
  signals: Signal[];
  scan_time: number;
  real_data: boolean;
}
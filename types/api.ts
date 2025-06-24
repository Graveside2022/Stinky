/**
 * REST API Type Definitions
 * Types for HTTP API endpoints and responses
 */

import { 
  WiFiDevice, 
  WiFiNetwork, 
  KismetDevice, 
  KismetAlert,
  WiFiScanConfig,
  AntennaConfig,
  FilterLists
} from './wifi';
import { 
  GPSPosition, 
  GPSTrack,
  GPSConfig
} from './gps';
import { 
  DetectedSignal, 
  SpectrumConfig,
  ScanProfile,
  HackRFStatus
} from './sdr';
import { 
  TAKServerConfig,
  TAKBroadcastStatus,
  TAKAnalysisMode
} from './tak';
import {
  Pagination,
  SortOptions,
  FilterOptions
} from './index';

// Base API Response
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    timestamp: number;
    version: string;
    requestId?: string;
  };
}

// API Error
export interface APIError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

// Paginated Response
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Service Status Endpoints
export interface ServiceStatusResponse extends APIResponse {
  data: {
    services: {
      kismet: ServiceInfo;
      gps: ServiceInfo;
      hackrf: ServiceInfo;
      tak: ServiceInfo;
      webapp: ServiceInfo;
    };
    system: SystemInfo;
  };
}

export interface ServiceInfo {
  name: string;
  running: boolean;
  pid?: number;
  uptime?: number;
  version?: string;
  errors?: number;
  lastError?: string;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  uptime: number;
  loadAverage: number[];
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  temperature?: number;
}

// WiFi/Kismet Endpoints
export interface WiFiDevicesRequest {
  pagination?: Pagination;
  sort?: SortOptions;
  filter?: {
    type?: 'AP' | 'Client' | 'All';
    ssid?: string;
    mac?: string;
    minRSSI?: number;
    channel?: number;
    encrypted?: boolean;
  };
}

export interface WiFiDevicesResponse extends PaginatedResponse<WiFiDevice> {
  data: WiFiDevice[];
  summary: {
    totalDevices: number;
    accessPoints: number;
    clients: number;
    lastUpdate: number;
  };
}

export interface WiFiScanRequest {
  config: WiFiScanConfig;
  duration?: number;        // seconds
  background?: boolean;
}

export interface WiFiScanResponse extends APIResponse {
  data: {
    scanId: string;
    status: 'started' | 'running' | 'completed' | 'failed';
    startTime: number;
    config: WiFiScanConfig;
  };
}

// GPS Endpoints
export interface GPSStatusResponse extends APIResponse {
  data: {
    connected: boolean;
    position?: GPSPosition;
    satellites?: number;
    fixType?: string;
    source: string;
    lastUpdate?: number;
  };
}

export interface GPSTrackRequest {
  name?: string;
  maxPoints?: number;
  minDistance?: number;    // meters between points
}

export interface GPSTracksResponse extends PaginatedResponse<GPSTrack> {
  data: GPSTrack[];
}

// HackRF/SDR Endpoints
export interface SDRStatusResponse extends APIResponse {
  data: HackRFStatus & {
    currentConfig?: SpectrumConfig;
    isScanning: boolean;
    scanProfile?: string;
  };
}

export interface SDRScanRequest {
  profile: string | ScanProfile;
  duration?: number;
  signalThreshold?: number;
}

export interface SDRSignalsResponse extends PaginatedResponse<DetectedSignal> {
  data: DetectedSignal[];
  summary: {
    totalSignals: number;
    strongestSignal?: DetectedSignal;
    frequencyRange: {
      min: number;
      max: number;
    };
  };
}

// TAK Endpoints
export interface TAKConfigRequest {
  server?: TAKServerConfig;
  conversion?: {
    analysisMode?: TAKAnalysisMode;
    antennaConfig?: AntennaConfig;
    filters?: FilterLists;
  };
}

export interface TAKStatusResponse extends APIResponse {
  data: TAKBroadcastStatus & {
    config: {
      server: TAKServerConfig;
      analysisMode: TAKAnalysisMode;
      antenna: AntennaConfig;
    };
  };
}

export interface TAKBroadcastRequest {
  action: 'start' | 'stop';
  file?: string;
  directory?: string;
}

// File Management Endpoints
export interface FileListRequest {
  directory: string;
  pattern?: string;
  recursive?: boolean;
}

export interface FileListResponse extends APIResponse {
  data: {
    directory: string;
    files: Array<{
      name: string;
      path: string;
      size: number;
      modified: number;
      type: 'wiglecsv' | 'recording' | 'log' | 'other';
    }>;
  };
}

// Configuration Endpoints
export interface ConfigResponse extends APIResponse {
  data: {
    wifi: {
      scan: WiFiScanConfig;
      antenna: AntennaConfig;
      filters: FilterLists;
    };
    gps: GPSConfig;
    sdr: {
      spectrum: SpectrumConfig;
      profiles: Record<string, ScanProfile>;
    };
    tak: {
      server: TAKServerConfig;
      analysisMode: TAKAnalysisMode;
    };
  };
}

// WebSocket Connection Info
export interface WebSocketInfoResponse extends APIResponse {
  data: {
    url: string;
    protocols: string[];
    availableChannels: string[];
    clients: number;
  };
}

// Script Execution
export interface ScriptExecuteRequest {
  script: string;
  args?: string[];
  background?: boolean;
}

export interface ScriptExecuteResponse extends APIResponse {
  data: {
    pid?: number;
    output?: string;
    exitCode?: number;
    error?: string;
  };
}

// Log Access
export interface LogRequest {
  service: string;
  lines?: number;
  level?: 'debug' | 'info' | 'warn' | 'error';
  since?: number;        // timestamp
}

export interface LogResponse extends APIResponse {
  data: {
    service: string;
    entries: Array<{
      timestamp: number;
      level: string;
      message: string;
      metadata?: any;
    }>;
  };
}

// Health Check
export interface HealthCheckResponse extends APIResponse {
  data: {
    healthy: boolean;
    checks: {
      database?: boolean;
      filesystem?: boolean;
      memory?: boolean;
      services?: Record<string, boolean>;
    };
    timestamp: number;
  };
}
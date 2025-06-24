/**
 * Comprehensive type definitions for WigleToTAK backend
 */

// WiFi Device types
export interface WifiDevice {
  mac: string;
  ssid: string;
  manufacturer?: string;
  type: 'AP' | 'Client' | 'Unknown';
  channel: number;
  frequency: number;
  signal: number;
  firstSeen: number;
  lastSeen: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
  encryption?: string;
  cipher?: string;
  authentication?: string;
  capabilities?: string[];
  beaconRate?: number;
  packets?: number;
  dataPackets?: number;
  retryPackets?: number;
  tags?: string[];
  notes?: string;
}

// TAK Message types
export interface TAKPoint {
  lat: number;
  lon: number;
  hae: number; // Height above ellipsoid
  ce: number;  // Circular error
  le: number;  // Linear error
}

export interface TAKDetail {
  contact?: {
    callsign?: string;
    [key: string]: any;
  };
  remarks?: string;
  color?: string;
  strokeColor?: string;
  strokeWeight?: number;
  fillColor?: string;
  uid?: string;
  [key: string]: any;
}

export interface TAKMessage {
  uid: string;
  type: string;
  how: string;
  time: string;
  start: string;
  stale: string;
  point: TAKPoint;
  detail: TAKDetail;
}

// Configuration types
export interface TAKServerConfig {
  host: string;
  port: number;
  multicast: boolean;
  multicastGroup?: string;
  protocol: 'TCP' | 'UDP';
  secure: boolean;
  cert?: string;
  key?: string;
  ca?: string;
}

export interface AntennaConfig {
  height: number;
  gain: number;
  pattern: 'omnidirectional' | 'directional';
  azimuth?: number;
  elevation?: number;
  sensitivity: 'standard' | 'alfa_card' | 'high_gain' | 'rpi_internal' | 'custom';
  customSensitivityFactor?: number;
}

export interface ScanSettings {
  scanInterval: number;
  signalThreshold: number;
  maxAge: number;
  channels: number[];
  ignoreBSSIDs: string[];
  analysisMode: 'realtime' | 'postcollection';
}

export interface WigleConfig {
  takServer: TAKServerConfig;
  antenna: AntennaConfig;
  scan: ScanSettings;
  callsign: string;
  team: string;
  role: string;
}

// Filter types
export interface DeviceFilter {
  type?: 'AP' | 'Client' | 'All';
  manufacturer?: string;
  minSignal?: number;
  maxSignal?: number;
  ssid?: string;
  seen?: 'active' | 'recent' | 'all';
  whitelistSSIDs?: string[];
  whitelistMACs?: string[];
  blacklistSSIDs?: string[];
  blacklistMACs?: string[];
}

// Statistics types
export interface WigleStats {
  totalDevices: number;
  activeDevices: number;
  knownDevices: number;
  unknownDevices: number;
  lastScanTime: number;
  takMessagesCount: number;
  scanStatus: 'idle' | 'scanning' | 'processing';
}

export interface ManufacturerStats {
  manufacturer: string;
  count: number;
  percentage: number;
}

export interface SignalDistribution {
  range: string;
  count: number;
  minDbm: number;
  maxDbm: number;
}

export interface ActivityTimeline {
  timestamp: number;
  newDevices: number;
  activeDevices: number;
  totalDevices: number;
}

// Alert types
export interface Alert {
  id: string;
  type: 'newDevice' | 'strongSignal' | 'movement' | 'geofence';
  device: WifiDevice;
  timestamp: number;
  read: boolean;
  severity: 'low' | 'medium' | 'high';
  message: string;
  metadata?: Record<string, any>;
}

// Geofence types
export interface Geofence {
  id: string;
  name: string;
  center: {
    lat: number;
    lon: number;
  };
  radius: number; // meters
  active: boolean;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  deviceFilter?: DeviceFilter;
  created: number;
  updated: number;
}

// Import/Export types
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: number;
  processing: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'kml' | 'xml';
  filter?: DeviceFilter;
  includeHistory?: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
}

// WebSocket event types
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
  scanning: boolean;
  devicesFound: number;
  packetsProcessed: number;
  errors: number;
  currentChannel?: number;
}

export interface TAKStatusEvent {
  connected: boolean;
  messagesSent: number;
  lastHeartbeat: number;
  errors: number;
  queueSize: number;
}

// Request/Response types
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Service status types
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastCheck: number;
  details: Record<string, any>;
}

// CSV parsing types (for Wigle CSV format)
export interface WigleCSVRow {
  MAC: string;
  SSID: string;
  AuthMode: string;
  FirstSeen: string;
  Channel: string;
  RSSI: string;
  CurrentLatitude: string;
  CurrentLongitude: string;
  AltitudeMeters: string;
  AccuracyMeters: string;
  Type: string;
}

// Sensitivity factors for antenna compensation
export const SENSITIVITY_FACTORS: Record<string, number> = {
  standard: 1.0,
  alfa_card: 1.5,
  high_gain: 2.0,
  rpi_internal: 0.7,
  custom: 1.0
};

// Device type mappings
export const DEVICE_TYPE_MAP: Record<string, 'AP' | 'Client' | 'Unknown'> = {
  'WIFI': 'AP',
  'AP': 'AP',
  'CLIENT': 'Client',
  'PROBE': 'Client',
  'UNKNOWN': 'Unknown'
};
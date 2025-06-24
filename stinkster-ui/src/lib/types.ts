// Comprehensive type definitions for the Stinkster UI application

// Base API types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// WebSocket types
export interface WebSocketMessage<T = unknown> {
  type: string
  payload: T
  timestamp: number
}

export interface WebSocketConnectionState {
  connected: boolean
  connecting: boolean
  error: string | null
  reconnectAttempts: number
  lastConnected: Date | null
}

// HackRF / SDR types
export interface SpectrumData {
  frequency: number
  amplitude: number[]
  timestamp: number
  sampleRate: number
  centerFreq: number
  gain: number
}

export interface HackRFConfig {
  centerFreq: number
  sampleRate: number
  gain: number
  enabled: boolean
}

export interface SignalInfo {
  frequency: number
  power: number
  bandwidth: number
  modulation?: string
  timestamp: number
}

export interface HackRFDeviceInfo {
  serialNumber: string
  firmwareVersion: string
  connected: boolean
}

// WigleToTAK types  
export interface WigleDevice {
  mac: string
  ssid?: string
  manufacturer?: string
  channel?: number
  frequency?: number
  signalStrength: number
  encryption?: string
  wps?: boolean
  latitude?: number
  longitude?: number
  altitude?: number
  accuracy?: number
  timestamp: Date
  lastSeen: Date
  firstSeen: Date
  packets?: number
  dataSize?: number
  type: 'wifi' | 'bluetooth' | 'cellular'
}

export interface TAKConfig {
  server: {
    host: string
    port: number
    multicast: boolean
    multicastGroup: string
    protocol: 'TCP' | 'UDP'
    secure: boolean
  }
  callsign: string
  team: string
  role: string
}

export interface BroadcastStatus {
  connected: boolean
  messagesSent: number
  lastHeartbeat: Date | null
  errors: number
  queueSize: number
}

// Kismet types
export interface KismetDevice {
  deviceKey: string
  deviceMac: string
  deviceName?: string
  deviceType: string
  basicTypeBitmask: number
  deviceSeenTime: number
  deviceLastTime: number
  location?: {
    lat: number
    lon: number
    alt?: number
    fix: number
  }
  signal?: {
    lastSignal: number
    maxSignal: number
    minSignal: number
    signalRrd?: number[]
  }
  packets?: {
    llcPackets: number
    errorPackets: number
    dataPackets: number
    cryptPackets: number
    filterHit: number
    rxBytes: number
  }
  frequency?: number[]
  channel?: string
  manuf?: string
  ssid?: string
  encryption?: string[]
  wps?: boolean
}

export interface KismetAlert {
  alertId: string
  alertTime: number
  alertClass: string  
  alertText: string
  alertSeverity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  alertSource: string
  alertDestination?: string
  alertTransmitter?: string
  alertLocation?: {
    lat: number
    lon: number
    alt?: number
  }
}

export interface KismetSession {
  sessionId: string
  sessionName: string
  startTime: number
  uptime: number
  devices: number
  packets: number
  dataPackets: number
  cryptPackets: number
  errorPackets: number
  location?: {
    lat: number
    lon: number
    alt?: number
  }
}

// GPS types
export interface GPSLocation {
  latitude: number
  longitude: number
  altitude?: number
  accuracy?: number
  timestamp: Date
  speed?: number
  heading?: number
  satellites?: number
}

export interface GPSStatus {
  connected: boolean
  fix: boolean
  satellites: number
  accuracy: number
  lastUpdate: Date | null
}

// UI Component types
export interface PanelConfig {
  id: string
  title: string
  type: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  collapsible: boolean
  closable: boolean
  settings?: Record<string, unknown>
}

export interface LayoutConfig {
  panels: PanelConfig[]
  theme: 'light' | 'dark' | 'auto'
  gridSize: number
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }[]
}

// Theme types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  primaryColor: string
  accentColor: string
  fontSize: 'sm' | 'md' | 'lg'
  density: 'compact' | 'comfortable' | 'spacious'
}

// Status and monitoring types
export interface ServiceStatus {
  name: string
  running: boolean
  pid?: number
  cpu?: number
  memory?: number
  uptime?: number
  lastCheck: Date
}

export interface SystemHealth {
  timestamp: Date
  services: Record<string, ServiceStatus>
  system: {
    cpuPercent: number
    memoryPercent: number
    diskPercent: number
    cpuTemp?: number
    loadAvg: number[]
  }
  alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical'
    service?: string
    type?: string
    message: string
    timestamp: Date
  }>
}

// Device filtering and management
export interface DeviceFilter {
  ssid?: string
  mac?: string
  manufacturer?: string
  signalMin?: number
  signalMax?: number
  encryptionType?: string
  channel?: number
  timeRange?: {
    start: Date
    end: Date
  }
  location?: {
    lat: number
    lon: number
    radius: number // in meters
  }
}

export interface DeviceStats {
  total: number
  active: number
  encrypted: number
  open: number
  hidden: number
  byChannel: Record<number, number>
  byManufacturer: Record<string, number>
  byEncryption: Record<string, number>
}

// Event types for real-time updates
export interface DeviceUpdateEvent {
  action: 'new' | 'update' | 'remove'
  device: WigleDevice | KismetDevice
  changes?: Partial<WigleDevice | KismetDevice>
}

export interface ScanStatusEvent {
  scanning: boolean
  devicesFound: number
  duration: number
  channels: number[]
  errors: string[]
}

export interface TAKStatusEvent {
  connected: boolean
  messagesSent: number
  lastHeartbeat: Date | null
  errors: number
  queueSize: number
}

export interface WSEvent {
  type: 'device_update' | 'scan_status' | 'tak_status' | 'alert'
  payload: DeviceUpdateEvent | ScanStatusEvent | TAKStatusEvent | KismetAlert
  timestamp: number
}

// File management types
export interface FileInfo {
  name: string
  path: string
  size: number
  modified: Date
  type: 'csv' | 'pcap' | 'kismet' | 'log' | 'config'
}

export interface ImportResult {
  success: boolean
  devicesImported: number
  duplicatesSkipped: number
  errors: string[]
  duration: number
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'kml' | 'tak'
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: DeviceFilter
  includeLocation: boolean
  includeSignalData: boolean
}
// System Types for Stinkster Operations Center
// Types for system status, services, alerts, and health monitoring

export interface GPSCoordinates {
  lat: number | null;
  lon: number | null;
  alt: number | null;
}

export interface GPSStatus {
  status: string;
  lat: number | null;
  lon: number | null;
  alt: number | null;
  mgrs?: string;
  lastUpdate?: string;
  fix?: boolean;
  satellites?: number;
}

export interface SystemInfo {
  ip: string;
  hostname?: string;
  gps: GPSStatus;
  timestamp: string;
  uptime?: number;
  version?: string;
}

export interface ServiceStatus {
  name: string;
  running: boolean;
  status: 'active' | 'inactive' | 'failed' | 'unknown';
  pid?: number;
  pids?: string[];
  uptime?: number;
  memory?: number;
  cpu?: number;
  details?: string;
  lastCheck?: string;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  details: string;
  lastCheck: string;
  metrics?: Record<string, number>;
}

export interface SystemStatus {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, ComponentHealth>;
  services: Record<string, ServiceStatus>;
  data_flow: Record<string, any>;
  issues: Alert[];
  recommendations: string[];
  system: {
    cpu: number;
    memory: number;
    disk: number;
    temperature?: number;
    load?: number[];
  };
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  resolved?: boolean;
  resolvedAt?: string;
  category?: 'system' | 'service' | 'network' | 'hardware' | 'data';
}

export interface HealthMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: {
    rx: number;
    tx: number;
  };
  processes: number;
  uptime: number;
  temperature?: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  details?: Record<string, any>;
}

export interface SystemConfiguration {
  version: string;
  environment: 'development' | 'production';
  features: {
    kismet: boolean;
    hackrf: boolean;
    gps: boolean;
    wigletotak: boolean;
    openwebrx: boolean;
  };
  ports: {
    kismet?: number;
    hackrf?: number;
    wigletotak?: number;
    openwebrx?: number;
    flask?: number;
  };
  paths: {
    data: string;
    logs: string;
    config: string;
  };
}

export interface NetworkInterface {
  name: string;
  status: 'up' | 'down';
  ip?: string;
  mac?: string;
  type: 'ethernet' | 'wifi' | 'loopback' | 'other';
  mode?: 'managed' | 'monitor' | 'master';
  channel?: number;
  frequency?: number;
  signal?: number;
}

export interface USBDevice {
  id: string;
  vendor: string;
  product: string;
  device: string;
  type: 'gps' | 'sdr' | 'wifi' | 'other';
  status: 'connected' | 'disconnected' | 'error';
  path?: string;
}

export interface HardwareStatus {
  interfaces: NetworkInterface[];
  usb_devices: USBDevice[];
  temperature: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  gpio_status?: Record<string, boolean>;
}
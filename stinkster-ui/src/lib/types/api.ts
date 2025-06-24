// API Types for REST Requests and Responses
// Types for all API requests and responses

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    total_count?: number;
    page?: number;
    page_size?: number;
    has_more?: boolean;
    execution_time?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  filters?: Record<string, any>;
  date_range?: {
    start: string;
    end: string;
  };
  tags?: string[];
}

// System API Types
export interface SystemInfoResponse {
  ip: string;
  hostname: string;
  gps: {
    status: string;
    lat: number | null;
    lon: number | null;
    alt: number | null;
    mgrs?: string;
    fix?: boolean;
    satellites?: number;
    last_update?: string;
  };
  timestamp: string;
  uptime: number;
  version: string;
  build?: string;
  environment: 'development' | 'production';
}

export interface SystemStatusResponse {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Record<string, {
    running: boolean;
    pid?: number;
    cpu?: number;
    memory?: number;
    status?: string;
    uptime?: number;
    last_check?: string;
  }>;
  system: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    cpu_temp?: number;
    load_avg?: number[];
  };
  data_flow: Record<string, {
    active: boolean;
    latest_file?: string;
    age_minutes?: number;
    file_count?: number;
    throughput?: number;
    error_rate?: number;
  }>;
  alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    service?: string;
    type?: string;
    message: string;
    timestamp?: string;
  }>;
  ports?: Record<string, {
    open: boolean;
    port: number;
    service?: string;
  }>;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn';
    time: string;
    output?: string;
  }>;
  version: string;
  notes?: string[];
  details?: Record<string, any>;
}

// Kismet API Types
export interface KismetDevicesRequest {
  regex?: string[];
  fields?: string[];
  len?: number;
  start_row?: number;
  draw?: number;
  search?: {
    value?: string;
    regex?: boolean;
  };
  order?: Array<{
    column: number;
    dir: 'asc' | 'desc';
  }>;
  columns?: Array<{
    data: string;
    name?: string;
    searchable?: boolean;
    orderable?: boolean;
    search?: {
      value?: string;
      regex?: boolean;
    };
  }>;
}

export interface KismetDevicesResponse {
  data: any[];
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  last_time: number;
  last_row: number;
}

export interface KismetSummaryResponse {
  kismet_version: string;
  kismet_build_revision: string;
  kismet_build_time: string;
  kismet_memory: number;
  kismet_running_time: number;
  kismet_start_time: number;
  kismet_alert_count: number;
  kismet_packet_count: number;
  kismet_dropped_packet_count: number;
  kismet_filtered_packet_count: number;
  kismet_device_count: number;
  kismet_datasource_count: number;
  kismet_channel_count: number;
  kismet_log_size: number;
  kismet_pcap_size: number;
}

export interface KismetDataSourcesResponse {
  [key: string]: {
    'kismet.datasource.uuid': string;
    'kismet.datasource.name': string;
    'kismet.datasource.interface': string;
    'kismet.datasource.type': string;
    'kismet.datasource.capture': boolean;
    'kismet.datasource.running': boolean;
    'kismet.datasource.packets': number;
    'kismet.datasource.packets_filtered': number;
    'kismet.datasource.packets_dropped': number;
    'kismet.datasource.error': boolean;
    'kismet.datasource.error_reason': string;
    'kismet.datasource.channel': string;
    'kismet.datasource.hop_rate': number;
    'kismet.datasource.hop_channels': string[];
  };
}

export interface KismetAlertsResponse {
  last_time: number;
  data: Array<{
    'kismet.alert.timestamp': number;
    'kismet.alert.hash': number;
    'kismet.alert.header': string;
    'kismet.alert.text': string;
    'kismet.alert.class': string;
    'kismet.alert.severity': number;
  }>;
}

// WigleToTAK API Types
export interface WigleToTAKSettings {
  tak_server_ip: string;
  tak_server_port: string | number;
  tak_multicast: boolean;
  analysis_mode: 'realtime' | 'postcollection';
  antenna_sensitivity: 'standard' | 'alfa_card' | 'high_gain' | 'rpi_internal' | 'custom';
  custom_sensitivity_factor?: number;
  directory?: string;
}

export interface WigleToTAKSettingsRequest {
  tak_server_ip?: string;
  tak_server_port?: string | number;
  takMulticast?: boolean;
  mode?: 'realtime' | 'postcollection';
  antenna_sensitivity?: string;
  custom_sensitivity_factor?: number;
}

export interface WigleToTAKStatusResponse {
  broadcasting: boolean;
  tak_server_ip: string;
  tak_server_port: string;
  tak_multicast_state: boolean;
  analysis_mode: string;
  antenna_sensitivity: string;
  custom_sensitivity_factor?: number;
  directory?: string;
  statistics?: {
    devices_broadcast: number;
    packets_sent: number;
    errors: number;
    uptime: number;
  };
}

export interface WigleToTAKControlRequest {
  action: 'start' | 'stop' | 'restart';
  parameters?: Record<string, any>;
}

export interface WigleDeviceListResponse {
  devices: Array<{
    mac: string;
    ssid?: string;
    channel?: number;
    signal_strength?: number;
    first_seen: string;
    last_seen: string;
    encryption?: string;
    manufacturer?: string;
    location?: {
      lat: number;
      lon: number;
      accuracy?: number;
    };
    whitelisted?: boolean;
    blacklisted?: boolean;
  }>;
  total: number;
  filtered: number;
  last_update: string;
}

// HackRF/Spectrum Analyzer API Types
export interface SpectrumScanRequest {
  start_freq: number;
  end_freq: number;
  bin_size?: number;
  integration_time?: number;
  gain?: number;
  profile?: string;
}

export interface SpectrumDataResponse {
  frequencies: number[];
  powers: number[];
  timestamp: string;
  scan_time: number;
  parameters: {
    start_freq: number;
    end_freq: number;
    bin_size: number;
    gain: number;
    sample_rate: number;
  };
  signals?: Array<{
    frequency: number;
    power: number;
    bandwidth?: number;
    modulation?: string;
    confidence?: number;
  }>;
}

export interface ScanProfileResponse {
  profiles: Record<string, {
    name: string;
    description: string;
    ranges: Array<[number, number]>;
    step: number;
    parameters?: Record<string, any>;
  }>;
}

export interface HackRFStatusResponse {
  connected: boolean;
  device_info?: {
    serial: string;
    version: string;
    part_id: string;
    board_id: string;
  };
  current_config?: {
    frequency: number;
    sample_rate: number;
    gain: number;
    amp_enable: boolean;
    antenna_enable: boolean;
  };
  status: 'idle' | 'scanning' | 'receiving' | 'error';
  error_message?: string;
}

// Configuration API Types
export interface ConfigurationResponse {
  version: string;
  environment: string;
  features: Record<string, boolean>;
  services: Record<string, {
    enabled: boolean;
    port?: number;
    endpoint?: string;
    config?: Record<string, any>;
  }>;
  paths: Record<string, string>;
  security: {
    authentication_required: boolean;
    https_enabled: boolean;
    cors_enabled: boolean;
    rate_limiting: boolean;
  };
  logging: {
    level: string;
    file_logging: boolean;
    console_logging: boolean;
    remote_logging: boolean;
  };
}

export interface ConfigurationUpdateRequest {
  section: string;
  key: string;
  value: any;
  restart_required?: boolean;
}

// Log API Types
export interface LogQueryRequest {
  level?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  source?: string;
  start_time?: string;
  end_time?: string;
  search?: string;
  limit?: number;
  offset?: number;
  format?: 'json' | 'text';
}

export interface LogQueryResponse {
  logs: Array<{
    timestamp: string;
    level: string;
    source: string;
    message: string;
    details?: Record<string, any>;
  }>;
  total: number;
  has_more: boolean;
  next_offset?: number;
}

// File API Types
export interface FileListRequest {
  path: string;
  filter?: string;
  recursive?: boolean;
  include_hidden?: boolean;
  sort_by?: 'name' | 'size' | 'modified';
  sort_order?: 'asc' | 'desc';
}

export interface FileListResponse {
  files: Array<{
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modified: string;
    permissions: string;
    owner: string;
    group: string;
  }>;
  total: number;
  directory: string;
}

export interface FileDownloadRequest {
  path: string;
  format?: 'raw' | 'base64';
  compress?: boolean;
}

export interface FileUploadRequest {
  path: string;
  content: string | File;
  overwrite?: boolean;
  create_directories?: boolean;
}

// Export API Types
export interface ExportRequest {
  type: 'devices' | 'alerts' | 'logs' | 'spectrum' | 'system_status';
  format: 'json' | 'csv' | 'xml' | 'kml' | 'tak';
  filters?: Record<string, any>;
  date_range?: {
    start: string;
    end: string;
  };
  compression?: boolean;
}

export interface ExportResponse {
  export_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  file_size?: number;
  created: string;
  expires?: string;
  error_message?: string;
}
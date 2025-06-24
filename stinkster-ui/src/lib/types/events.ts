// Event Types for WebSocket Messages and System Events
// Types for WebSocket messages and system events

export interface BaseEvent {
  type: string;
  timestamp: string;
  source: string;
  id?: string;
}

export interface SystemEvent extends BaseEvent {
  type: 'system';
  event: 'startup' | 'shutdown' | 'restart' | 'error' | 'warning' | 'status_change';
  data: {
    component?: string;
    message: string;
    details?: Record<string, any>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface GPSEvent extends BaseEvent {
  type: 'gps-update';
  data: {
    lat: number;
    lon: number;
    alt?: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    fix: boolean;
    satellites?: number;
    timestamp: string;
  };
}

export interface KismetEvent extends BaseEvent {
  type: 'kismet-data';
  data: {
    devices?: any[];
    device_count?: number;
    new_devices?: string[];
    updated_devices?: string[];
    alerts?: any[];
    status?: string;
    memory_usage?: number;
    packet_rate?: number;
    datasources?: any[];
  };
}

export interface SignalEvent extends BaseEvent {
  type: 'signal-update';
  data: {
    signals: SignalData[];
    timestamp: string;
    frequency_range: {
      start: number;
      end: number;
    };
    scan_profile?: string;
  };
}

export interface SignalData {
  frequency: number;
  power: number;
  modulation?: string;
  bandwidth?: number;
  detected_at: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface ServiceEvent extends BaseEvent {
  type: 'service-status';
  data: {
    service: string;
    status: 'started' | 'stopped' | 'failed' | 'restarted';
    pid?: number;
    message?: string;
    exit_code?: number;
    auto_restart?: boolean;
  };
}

export interface AlertEvent extends BaseEvent {
  type: 'alert';
  data: {
    level: 'info' | 'warning' | 'error' | 'critical';
    category: 'system' | 'security' | 'hardware' | 'network' | 'application';
    title: string;
    message: string;
    source: string;
    details?: Record<string, any>;
    requires_action?: boolean;
    auto_resolve?: boolean;
    tags?: string[];
  };
}

export interface HealthEvent extends BaseEvent {
  type: 'health-update';
  data: {
    overall_status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      metrics?: Record<string, number>;
      last_check: string;
    }>;
    system_metrics: {
      cpu: number;
      memory: number;
      disk: number;
      temperature?: number;
      network?: {
        rx: number;
        tx: number;
      };
    };
  };
}

export interface DataFlowEvent extends BaseEvent {
  type: 'data-flow';
  data: {
    pipeline: string;
    stage: string;
    status: 'processing' | 'completed' | 'failed' | 'queued';
    items_processed?: number;
    items_total?: number;
    throughput?: number; // items per second
    latency?: number; // milliseconds
    error_rate?: number;
    details?: Record<string, any>;
  };
}

export interface LogEvent extends BaseEvent {
  type: 'log-entry';
  data: {
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    message: string;
    component: string;
    file?: string;
    line?: number;
    function?: string;
    context?: Record<string, any>;
    stack_trace?: string;
  };
}

export interface UserEvent extends BaseEvent {
  type: 'user-action';
  data: {
    action: string;
    target?: string;
    parameters?: Record<string, any>;
    user_id?: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
    success: boolean;
    error_message?: string;
  };
}

export interface DeviceEvent extends BaseEvent {
  type: 'device-discovered' | 'device-lost' | 'device-updated';
  data: {
    device_id: string;
    device_type: 'wifi' | 'bluetooth' | 'usb' | 'serial' | 'network';
    mac_address?: string;
    name?: string;
    manufacturer?: string;
    signal_strength?: number;
    location?: {
      lat: number;
      lon: number;
      accuracy?: number;
    };
    first_seen: string;
    last_seen: string;
    properties?: Record<string, any>;
  };
}

export interface NetworkEvent extends BaseEvent {
  type: 'network-change';
  data: {
    interface: string;
    event: 'up' | 'down' | 'changed' | 'error';
    ip_address?: string;
    mac_address?: string;
    ssid?: string;
    channel?: number;
    signal_strength?: number;
    mode?: 'managed' | 'monitor' | 'master';
    carrier?: boolean;
    speed?: number; // Mbps
    duplex?: 'half' | 'full';
  };
}

export interface ConfigEvent extends BaseEvent {
  type: 'config-change';
  data: {
    component: string;
    section: string;
    key: string;
    old_value?: any;
    new_value: any;
    changed_by?: string;
    reason?: string;
    requires_restart?: boolean;
  };
}

export interface SecurityEvent extends BaseEvent {
  type: 'security-alert';
  data: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'authentication' | 'authorization' | 'intrusion' | 'malware' | 'data_breach';
    title: string;
    description: string;
    source_ip?: string;
    target_ip?: string;
    affected_systems?: string[];
    indicators?: string[];
    recommended_actions?: string[];
    references?: string[];
    mitre_tactics?: string[];
    mitre_techniques?: string[];
  };
}

export interface PerformanceEvent extends BaseEvent {
  type: 'performance-metric';
  data: {
    metric: string;
    value: number;
    unit: string;
    threshold?: {
      warning: number;
      critical: number;
    };
    trend?: 'up' | 'down' | 'stable';
    percentile?: number;
    tags?: Record<string, string>;
  };
}

export interface FileEvent extends BaseEvent {
  type: 'file-change';
  data: {
    path: string;
    event: 'created' | 'modified' | 'deleted' | 'moved';
    size?: number;
    checksum?: string;
    permissions?: string;
    owner?: string;
    group?: string;
    old_path?: string; // for move events
    watcher?: string;
  };
}

export interface ProcessEvent extends BaseEvent {
  type: 'process-change';
  data: {
    pid: number;
    name: string;
    event: 'started' | 'stopped' | 'crashed' | 'resource_usage';
    parent_pid?: number;
    user?: string;
    command?: string;
    exit_code?: number;
    signal?: string;
    resource_usage?: {
      cpu_percent: number;
      memory_mb: number;
      open_files: number;
      threads: number;
    };
  };
}

export interface StorageEvent extends BaseEvent {
  type: 'storage-alert';
  data: {
    mount_point: string;
    device: string;
    filesystem: string;
    total_space: number;
    used_space: number;
    available_space: number;
    usage_percent: number;
    inodes_total?: number;
    inodes_used?: number;
    threshold_type: 'warning' | 'critical';
    trend?: 'increasing' | 'decreasing' | 'stable';
  };
}

// Union type for all events
export type StinksterEvent = 
  | SystemEvent
  | GPSEvent
  | KismetEvent
  | SignalEvent
  | ServiceEvent
  | AlertEvent
  | HealthEvent
  | DataFlowEvent
  | LogEvent
  | UserEvent
  | DeviceEvent
  | NetworkEvent
  | ConfigEvent
  | SecurityEvent
  | PerformanceEvent
  | FileEvent
  | ProcessEvent
  | StorageEvent;

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  id?: string;
}

export interface WebSocketSubscription {
  event_types: string[];
  filters?: Record<string, any>;
  rate_limit?: number; // messages per second
  buffer_size?: number;
}

export interface WebSocketStatus {
  connected: boolean;
  reconnecting: boolean;
  last_connect?: string;
  last_disconnect?: string;
  disconnect_reason?: string;
  message_count: number;
  error_count: number;
  latency?: number; // milliseconds
  subscriptions: WebSocketSubscription[];
}

// Event handler types
export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  event_type: string;
  handler: EventHandler;
  filters?: Record<string, any>;
  once?: boolean;
  priority?: number;
  created: string;
}
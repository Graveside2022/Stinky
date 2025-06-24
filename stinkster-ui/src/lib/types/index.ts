// Main Types Export Index
// Central export point for all TypeScript types

// System Types
export type {
  GPSCoordinates,
  GPSStatus,
  SystemInfo,
  ServiceStatus,
  ComponentHealth,
  SystemStatus,
  Alert,
  HealthMetrics,
  LogEntry,
  SystemConfiguration,
  NetworkInterface,
  USBDevice,
  HardwareStatus
} from './system';

// Kismet Types
export type {
  KismetDevice,
  KismetLocation,
  KismetSignal,
  KismetPacketCounts,
  KismetWiFiDevice,
  KismetDot11Device,
  KismetBeaconInfo,
  KismetSSID,
  KismetClient,
  KismetHandshake,
  KismetDataSource,
  KismetSystemStatus,
  KismetMessageBus,
  KismetChannelDetails,
  KismetAlert,
  KismetDeviceList,
  KismetDataSummary
} from './kismet';

// UI Types
export type {
  Theme,
  ThemeConfig,
  UISettings,
  ComponentState,
  GridItem,
  DashboardLayout,
  ControlButton,
  StatusIndicator,
  NavigationItem,
  Modal,
  ModalAction,
  Toast,
  ToastAction,
  ContextMenu,
  ContextMenuItem,
  ChartConfig,
  ChartData,
  ChartDataset,
  ChartOptions,
  ChartScale,
  TableColumn,
  TableConfig,
  TableAction,
  UserPreferences,
  ViewportInfo
} from './ui';

// Event Types
export type {
  BaseEvent,
  SystemEvent,
  GPSEvent,
  KismetEvent,
  SignalEvent,
  SignalData,
  ServiceEvent,
  AlertEvent,
  HealthEvent,
  DataFlowEvent,
  LogEvent,
  UserEvent,
  DeviceEvent,
  NetworkEvent,
  ConfigEvent,
  SecurityEvent,
  PerformanceEvent,
  FileEvent,
  ProcessEvent,
  StorageEvent,
  StinksterEvent,
  WebSocketMessage,
  WebSocketSubscription,
  WebSocketStatus,
  EventHandler,
  EventSubscription
} from './events';

// API Types
export type {
  ApiResponse,
  ApiError,
  PaginationParams,
  FilterParams,
  SystemInfoResponse,
  SystemStatusResponse,
  HealthCheckResponse,
  KismetDevicesRequest,
  KismetDevicesResponse,
  KismetSummaryResponse,
  KismetDataSourcesResponse,
  KismetAlertsResponse,
  WigleToTAKSettings,
  WigleToTAKSettingsRequest,
  WigleToTAKStatusResponse,
  WigleToTAKControlRequest,
  WigleDeviceListResponse,
  SpectrumScanRequest,
  SpectrumDataResponse,
  ScanProfileResponse,
  HackRFStatusResponse,
  ConfigurationResponse,
  ConfigurationUpdateRequest,
  LogQueryRequest,
  LogQueryResponse,
  FileListRequest,
  FileListResponse,
  FileDownloadRequest,
  FileUploadRequest,
  ExportRequest,
  ExportResponse
} from './api';

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

export type Enumerate<N extends number, Acc extends number[] = []> = 
  Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>;

export type Range<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>;

// Status constants
export const SERVICE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  FAILED: 'failed',
  UNKNOWN: 'unknown'
} as const;

export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
} as const;

export const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

export const THEMES = {
  DEFAULT: 'default',
  DARK: 'dark',
  LIGHT: 'light',
  CYBER: 'cyber',
  MILITARY: 'military'
} as const;

export const DEVICE_TYPES = {
  WIFI: 'wifi',
  BLUETOOTH: 'bluetooth',
  USB: 'usb',
  SERIAL: 'serial',
  NETWORK: 'network'
} as const;

export const NETWORK_MODES = {
  MANAGED: 'managed',
  MONITOR: 'monitor',
  MASTER: 'master'
} as const;

export const ANALYSIS_MODES = {
  REALTIME: 'realtime',
  POSTCOLLECTION: 'postcollection'
} as const;

export const ANTENNA_SENSITIVITY_TYPES = {
  STANDARD: 'standard',
  ALFA_CARD: 'alfa_card',
  HIGH_GAIN: 'high_gain',
  RPI_INTERNAL: 'rpi_internal',
  CUSTOM: 'custom'
} as const;

// Event type constants
export const EVENT_TYPES = {
  SYSTEM: 'system',
  GPS_UPDATE: 'gps-update',
  KISMET_DATA: 'kismet-data',
  SIGNAL_UPDATE: 'signal-update',
  SERVICE_STATUS: 'service-status',
  ALERT: 'alert',
  HEALTH_UPDATE: 'health-update',
  DATA_FLOW: 'data-flow',
  LOG_ENTRY: 'log-entry',
  USER_ACTION: 'user-action',
  DEVICE_DISCOVERED: 'device-discovered',
  DEVICE_LOST: 'device-lost',
  DEVICE_UPDATED: 'device-updated',
  NETWORK_CHANGE: 'network-change',
  CONFIG_CHANGE: 'config-change',
  SECURITY_ALERT: 'security-alert',
  PERFORMANCE_METRIC: 'performance-metric',
  FILE_CHANGE: 'file-change',
  PROCESS_CHANGE: 'process-change',
  STORAGE_ALERT: 'storage-alert'
} as const;

// API endpoint constants
export const API_ENDPOINTS = {
  SYSTEM_INFO: '/info',
  SYSTEM_STATUS: '/api/status',
  HEALTH_CHECK: '/health',
  KISMET_DEVICES: '/kismet-data',
  KISMET_SUMMARY: '/api/kismet/summary',
  KISMET_DATASOURCES: '/api/kismet/datasources',
  KISMET_ALERTS: '/api/kismet/alerts',
  WIGLETOTAK_STATUS: '/api/wigletotak/status',
  WIGLETOTAK_SETTINGS: '/api/wigletotak/settings',
  WIGLETOTAK_CONTROL: '/api/wigletotak/control',
  WIGLE_DEVICES: '/api/wigle/devices',
  SPECTRUM_SCAN: '/api/hackrf/scan',
  SPECTRUM_STATUS: '/api/hackrf/status',
  SPECTRUM_PROFILES: '/api/hackrf/profiles',
  CONFIG: '/api/config',
  LOGS: '/api/logs',
  FILES: '/api/files',
  EXPORT: '/api/export'
} as const;

// WebSocket event constants
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  GPS_UPDATE: 'gps-update',
  KISMET_DATA: 'kismet-data',
  SIGNAL_UPDATE: 'signal-update',
  SYSTEM_STATUS: 'system-status',
  ALERT: 'alert',
  LOG_ENTRY: 'log-entry'
} as const;

// Default values
export const DEFAULT_REFRESH_INTERVAL = 5000; // 5 seconds
export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_WEBSOCKET_RECONNECT_DELAY = 1000;
export const DEFAULT_ALERT_DURATION = 5000;
export const DEFAULT_CHART_UPDATE_INTERVAL = 1000;

// Configuration defaults
export const DEFAULT_UI_SETTINGS: UISettings = {
  theme: 'default',
  layout: 'grid',
  autoRefresh: true,
  refreshInterval: 5,
  showNotifications: true,
  soundEnabled: false,
  animations: true,
  compactMode: false,
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
  sidebarCollapsed: false,
  fullscreen: false
};

export const DEFAULT_PAGINATION: PaginationParams = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE
};
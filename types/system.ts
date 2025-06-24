/**
 * System Type Definitions
 * Types for system management, monitoring, and configuration
 */

// Service Management
export interface ServiceDefinition {
  name: string;
  displayName: string;
  description: string;
  executable: string;
  args?: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  dependencies?: string[];
  startupType: 'auto' | 'manual' | 'disabled';
  restartPolicy?: {
    enabled: boolean;
    maxRestarts?: number;
    restartDelay?: number;  // ms
    backoffMultiplier?: number;
  };
}

export interface ServiceState {
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'crashed' | 'unknown';
  pid?: number;
  startTime?: number;
  exitCode?: number;
  restarts: number;
  lastError?: string;
  memory?: number;        // bytes
  cpu?: number;          // percentage
}

// Process Management
export interface ProcessManager {
  services: Map<string, ServiceState>;
  startService(name: string): Promise<void>;
  stopService(name: string): Promise<void>;
  restartService(name: string): Promise<void>;
  getServiceStatus(name: string): ServiceState;
  getAllStatuses(): Record<string, ServiceState>;
}

// System Monitoring
export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;        // percentage
    loadAverage: [number, number, number];  // 1, 5, 15 min
    cores: number;
    temperature?: number; // Celsius
  };
  memory: {
    total: number;        // bytes
    used: number;
    free: number;
    available: number;
    percentage: number;
    swap?: {
      total: number;
      used: number;
      free: number;
    };
  };
  disk: Array<{
    filesystem: string;
    mountPoint: string;
    total: number;        // bytes
    used: number;
    free: number;
    percentage: number;
  }>;
  network: Array<{
    interface: string;
    rx: {
      bytes: number;
      packets: number;
      errors: number;
      dropped: number;
    };
    tx: {
      bytes: number;
      packets: number;
      errors: number;
      dropped: number;
    };
  }>;
  uptime: number;         // seconds
}

// Configuration Management
export interface ConfigFile {
  path: string;
  format: 'json' | 'yaml' | 'ini' | 'env' | 'xml';
  schema?: any;           // JSON Schema or similar
  readonly?: boolean;
  backup?: boolean;
}

export interface ConfigManager {
  files: Map<string, ConfigFile>;
  load(file: string): Promise<any>;
  save(file: string, data: any): Promise<void>;
  validate(file: string, data: any): Promise<boolean>;
  backup(file: string): Promise<string>;
  restore(file: string, backupPath: string): Promise<void>;
}

// Logging System
export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  outputs: LogOutput[];
  format?: 'json' | 'text' | 'structured';
  maxFileSize?: number;   // bytes
  maxFiles?: number;
  compression?: boolean;
}

export interface LogOutput {
  type: 'console' | 'file' | 'syslog' | 'webhook';
  level?: string;
  // File specific
  filename?: string;
  rotate?: boolean;
  // Syslog specific
  facility?: string;
  host?: string;
  port?: number;
  // Webhook specific
  url?: string;
  headers?: Record<string, string>;
}

export interface LogEntry {
  timestamp: number;
  level: string;
  service: string;
  message: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// Backup System
export interface BackupConfig {
  enabled: boolean;
  schedule?: string;      // Cron expression
  retention: {
    days?: number;
    count?: number;
  };
  locations: Array<{
    type: 'local' | 'remote' | 's3' | 'rsync';
    path: string;
    // Remote specific
    host?: string;
    port?: number;
    username?: string;
    // S3 specific
    bucket?: string;
    region?: string;
  }>;
  include: string[];      // Paths/patterns to include
  exclude?: string[];     // Paths/patterns to exclude
}

export interface BackupJob {
  id: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  type: 'manual' | 'scheduled';
  size?: number;          // bytes
  files?: number;
  location: string;
  error?: string;
}

// Update System
export interface UpdateInfo {
  currentVersion: string;
  latestVersion?: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  releaseDate?: number;
  downloadUrl?: string;
  size?: number;          // bytes
  checksums?: {
    md5?: string;
    sha256?: string;
  };
}

export interface UpdateConfig {
  autoCheck: boolean;
  autoDownload: boolean;
  autoInstall: boolean;
  checkInterval: number;  // hours
  channel: 'stable' | 'beta' | 'dev';
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

// Security
export interface SecurityConfig {
  authentication: {
    enabled: boolean;
    method: 'basic' | 'token' | 'oauth' | 'certificate';
    sessionTimeout?: number;  // seconds
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyLength: number;
  };
  firewall: {
    enabled: boolean;
    defaultPolicy: 'allow' | 'deny';
    rules: FirewallRule[];
  };
  audit: {
    enabled: boolean;
    logLevel: string;
    events: string[];
  };
}

export interface FirewallRule {
  id: string;
  action: 'allow' | 'deny';
  direction: 'in' | 'out' | 'both';
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all';
  source?: {
    ip?: string;
    port?: number | string;
  };
  destination?: {
    ip?: string;
    port?: number | string;
  };
  interface?: string;
  enabled: boolean;
  priority?: number;
  description?: string;
}

// Plugin System
export interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config?: any;
  permissions: string[];
  dependencies?: Array<{
    name: string;
    version: string;
  }>;
  hooks?: Array<{
    event: string;
    handler: string;
  }>;
}

export interface PluginManager {
  plugins: Map<string, Plugin>;
  install(plugin: string | File): Promise<void>;
  uninstall(name: string): Promise<void>;
  enable(name: string): Promise<void>;
  disable(name: string): Promise<void>;
  configure(name: string, config: any): Promise<void>;
}
/**
 * WebSocket Message Type Definitions
 * Types for real-time communication via WebSocket connections
 */

// Base WebSocket Message
export interface WSMessage<T = any> {
  type: string;
  timestamp: number;
  data: T;
  id?: string;
  error?: WSError;
}

// WebSocket Error
export interface WSError {
  code: string;
  message: string;
  details?: any;
}

// Connection Messages
export interface WSConnectedMessage extends WSMessage {
  type: 'connected';
  data: {
    clientId: string;
    timestamp: string;
    availableChannels: string[];
    version?: string;
  };
}

export interface WSDisconnectedMessage extends WSMessage {
  type: 'disconnected';
  data: {
    reason: string;
    code?: number;
  };
}

// Subscription Messages
export interface WSSubscribeMessage extends WSMessage {
  type: 'subscribe';
  data: {
    channels: string[];
    options?: {
      throttle?: number;      // ms
      filter?: any;
      limit?: number;
    };
  };
}

export interface WSUnsubscribeMessage extends WSMessage {
  type: 'unsubscribe';
  data: {
    channels: string[];
  };
}

// Status Messages
export interface WSStatusMessage extends WSMessage {
  type: 'status';
  data: {
    services: {
      kismet: ServiceStatus;
      gps: ServiceStatus;
      hackrf: ServiceStatus;
      tak: ServiceStatus;
    };
    system: {
      uptime: number;
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
      cpu: {
        usage: number;
        temperature?: number;
      };
    };
  };
}

export interface ServiceStatus {
  running: boolean;
  pid?: number;
  startTime?: number;
  errors?: number;
  lastError?: string;
  stats?: Record<string, any>;
}

// Device Detection Messages
export interface WSDeviceMessage extends WSMessage {
  type: 'device';
  data: {
    action: 'new' | 'update' | 'remove';
    device: {
      mac: string;
      type: string;
      ssid?: string;
      rssi?: number;
      channel?: number;
      location?: {
        lat: number;
        lon: number;
        accuracy?: number;
      };
      lastSeen: number;
      vendor?: string;
    };
  };
}

// Alert Messages
export interface WSAlertMessage extends WSMessage {
  type: 'alert';
  data: {
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    category: string;
    title: string;
    message: string;
    source: string;
    device?: string;
    location?: {
      lat: number;
      lon: number;
    };
    actions?: Array<{
      label: string;
      action: string;
    }>;
  };
}

// Spectrum/FFT Messages
export interface WSSpectrumMessage extends WSMessage {
  type: 'spectrum';
  data: {
    centerFrequency: number;
    sampleRate: number;
    fftSize: number;
    fft: number[];          // Power values in dBm
    timestamp: number;
    detectedSignals?: Array<{
      frequency: number;
      power: number;
      bandwidth: number;
    }>;
  };
}

// GPS Messages
export interface WSGPSMessage extends WSMessage {
  type: 'gps';
  data: {
    lat: number;
    lon: number;
    alt?: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    satellites?: number;
    fixType?: string;
    timestamp: number;
  };
}

// TAK Messages
export interface WSTAKMessage extends WSMessage {
  type: 'tak';
  data: {
    action: 'sent' | 'received' | 'error';
    cot?: {
      uid: string;
      type: string;
      callsign?: string;
      lat: number;
      lon: number;
    };
    destination?: string;
    size?: number;
    error?: string;
  };
}

// Log Messages
export interface WSLogMessage extends WSMessage {
  type: 'log';
  data: {
    level: 'debug' | 'info' | 'warn' | 'error';
    service: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Command Messages (client to server)
export interface WSCommandMessage extends WSMessage {
  type: 'command';
  data: {
    command: string;
    args?: any;
    requestId?: string;
  };
}

// Command Response
export interface WSCommandResponse extends WSMessage {
  type: 'commandResponse';
  data: {
    requestId: string;
    success: boolean;
    result?: any;
    error?: string;
  };
}

// File Transfer Messages
export interface WSFileTransferMessage extends WSMessage {
  type: 'fileTransfer';
  data: {
    action: 'start' | 'progress' | 'complete' | 'error';
    fileId: string;
    filename?: string;
    size?: number;
    transferred?: number;
    percentage?: number;
    error?: string;
  };
}

// Scan Progress Messages
export interface WSScanProgressMessage extends WSMessage {
  type: 'scanProgress';
  data: {
    scanId: string;
    profile: string;
    currentFrequency: number;
    progress: number;        // 0-100
    devicesFound: number;
    signalsDetected: number;
    startTime: number;
    estimatedCompletion?: number;
  };
}

// Configuration Update Messages
export interface WSConfigUpdateMessage extends WSMessage {
  type: 'configUpdate';
  data: {
    service: string;
    config: Record<string, any>;
    requiresRestart?: boolean;
  };
}

// WebSocket Client State
export interface WSClientState {
  connected: boolean;
  clientId?: string;
  subscriptions: Set<string>;
  lastMessageTime?: number;
  reconnectAttempts: number;
  options: {
    reconnect: boolean;
    reconnectDelay: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
  };
}

// WebSocket Channel Types
export type WSChannel = 
  | 'status'
  | 'devices' 
  | 'alerts'
  | 'spectrum'
  | 'gps'
  | 'tak'
  | 'logs'
  | 'scan'
  | 'config';

// Message Type Map
export interface WSMessageTypeMap {
  connected: WSConnectedMessage;
  disconnected: WSDisconnectedMessage;
  subscribe: WSSubscribeMessage;
  unsubscribe: WSUnsubscribeMessage;
  status: WSStatusMessage;
  device: WSDeviceMessage;
  alert: WSAlertMessage;
  spectrum: WSSpectrumMessage;
  gps: WSGPSMessage;
  tak: WSTAKMessage;
  log: WSLogMessage;
  command: WSCommandMessage;
  commandResponse: WSCommandResponse;
  fileTransfer: WSFileTransferMessage;
  scanProgress: WSScanProgressMessage;
  configUpdate: WSConfigUpdateMessage;
}
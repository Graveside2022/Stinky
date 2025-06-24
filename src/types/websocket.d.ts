/**
 * WebSocket Type Definitions
 *
 * This file contains TypeScript type definitions for the WebSocket abstraction layer.
 * Supports both Socket.IO and native WebSocket connections.
 */

declare namespace WebSocketTypes {
  // Connection Types
  export type ConnectionType = 'socket.io' | 'websocket';

  export interface ConnectionOptions {
    url: string;
    type?: ConnectionType;
    reconnect?: boolean;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    reconnectDelayMax?: number;
    timeout?: number;
    auth?: Record<string, any>;
    query?: Record<string, string>;
    protocols?: string[];
    headers?: Record<string, string>;
  }

  export interface ConnectionState {
    connected: boolean;
    connecting: boolean;
    reconnecting: boolean;
    lastError?: Error;
    reconnectAttempts: number;
    connectionType: ConnectionType;
    url: string;
  }

  // Message Types
  export interface BaseMessage {
    type: string;
    timestamp: number;
    id?: string;
  }

  // Spectrum Analyzer Messages
  export interface FFTData extends BaseMessage {
    type: 'fftData';
    data: number[];
    center_freq: number;
    samp_rate: number;
    buffer_length: number;
  }

  export interface SignalDetection extends BaseMessage {
    type: 'signalsDetected';
    signals: Array<{
      frequency: number;
      power: number;
      bandwidth: number;
      confidence: number;
      bin?: number;
      type: string;
    }>;
    fftData?: FFTData;
  }

  export interface SpectrumStatus extends BaseMessage {
    type: 'status';
    connected: boolean;
    buffer_size: number;
    config: {
      fft_size: number;
      center_freq: number;
      samp_rate: number;
      fft_compression: string;
      signal_threshold: number;
    };
    last_update: number | null;
    last_signal_detection: {
      timestamp: number;
      signalCount: number;
      threshold: number;
    } | null;
  }

  // Kismet Messages
  export interface KismetDevice {
    mac: string;
    manufacturer?: string;
    type?: string;
    lastSeen: string;
    signal: number | string;
    channel?: number;
    frequency?: number;
    location?: {
      lat: number;
      lon: number;
    };
  }

  export interface KismetNetwork {
    ssid: string;
    bssid: string;
    channel: number;
    frequency: number;
    encryption: string;
    last_seen: number;
    signal: Record<string, number>;
    clients: number;
  }

  export interface KismetData extends BaseMessage {
    type: 'kismetData' | 'kismetDataUpdate';
    source: 'kismet' | 'demo';
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

  // Signal Stream Messages
  export interface SignalStreamData extends BaseMessage {
    type: 'signal';
    data: {
      id: string;
      lat: number;
      lon: number;
      signal_strength: number;
      timestamp: number;
      source: 'kismet' | 'hackrf';
      frequency?: number;
      metadata?: Record<string, any>;
    };
  }

  export interface SignalBatch extends BaseMessage {
    type: 'batch';
    data: SignalStreamData['data'][];
  }

  export interface SignalSubscription extends BaseMessage {
    type: 'subscribed';
    sources: string[];
  }

  export interface SignalHeartbeat extends BaseMessage {
    type: 'heartbeat';
    activeSignals: number;
  }

  // Control Messages
  export interface ConfigUpdate extends BaseMessage {
    type: 'configUpdated';
    oldConfig: Record<string, any>;
    newConfig: Record<string, any>;
  }

  export interface ConnectionStatus extends BaseMessage {
    type: 'connected' | 'disconnected' | 'openwebrxConnected' | 'openwebrxDisconnected';
    url?: string;
    code?: number;
    reason?: string;
  }

  export interface ErrorMessage extends BaseMessage {
    type: 'error' | 'openwebrxError';
    error: string;
    code?: string;
    details?: any;
  }

  // Union of all message types
  export type WebSocketMessage =
    | FFTData
    | SignalDetection
    | SpectrumStatus
    | KismetData
    | SignalStreamData
    | SignalBatch
    | SignalSubscription
    | SignalHeartbeat
    | ConfigUpdate
    | ConnectionStatus
    | ErrorMessage;

  // Event Map for type-safe event handling
  export interface WebSocketEventMap {
    // Connection events
    connect: () => void;
    disconnect: (reason?: string) => void;
    error: (error: Error) => void;
    reconnect: (attempt: number) => void;
    reconnect_attempt: (attempt: number) => void;
    reconnect_error: (error: Error) => void;
    reconnect_failed: () => void;

    // Message events
    message: (message: WebSocketMessage) => void;
    fftData: (data: FFTData) => void;
    signalsDetected: (data: SignalDetection) => void;
    status: (data: SpectrumStatus) => void;
    kismetData: (data: KismetData) => void;
    kismetDataUpdate: (data: KismetData) => void;
    signal: (data: SignalStreamData) => void;
    batch: (data: SignalBatch) => void;
    subscribed: (data: SignalSubscription) => void;
    heartbeat: (data: SignalHeartbeat) => void;
    configUpdated: (data: ConfigUpdate) => void;
    openwebrxConnected: (data: ConnectionStatus) => void;
    openwebrxDisconnected: (data: ConnectionStatus) => void;
    openwebrxError: (data: ErrorMessage) => void;
    bufferCleared: (data: { previousSize: number }) => void;
  }

  // Request/Response types for Socket.IO style communication
  export interface RequestMap {
    requestStatus: () => void;
    requestLatestFFT: () => void;
    requestSignals: (data?: { threshold?: number }) => void;
    requestKismetData: () => void;
    subscribe: (data: { sources: string[] }) => void;
    unsubscribe: () => void;
    query: (filters: {
      source?: string;
      minStrength?: number;
      maxAge?: number;
      bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
      };
    }) => void;
  }

  export interface ResponseMap {
    status: SpectrumStatus;
    latestFFT: FFTData | null;
    signals: {
      signals: SignalDetection['signals'];
      threshold: number;
      timestamp: number;
    };
    queryResult: {
      type: 'queryResult';
      filters: any;
      count: number;
      data: SignalStreamData['data'][];
    };
  }

  // WebSocket Client Interface
  export interface IWebSocketClient {
    readonly state: ConnectionState;
    readonly connected: boolean;

    connect(options?: Partial<ConnectionOptions>): Promise<void>;
    disconnect(): void;

    on<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): void;
    off<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): void;
    once<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): void;

    emit<K extends keyof RequestMap>(event: K, data?: Parameters<RequestMap[K]>[0]): void;

    request<K extends keyof RequestMap, R extends keyof ResponseMap>(
      event: K,
      data?: Parameters<RequestMap[K]>[0],
      timeout?: number,
    ): Promise<ResponseMap[R]>;

    // Native WebSocket compatibility
    send(data: string | ArrayBuffer | Blob): void;

    // Utility methods
    setReconnectOptions(options: Partial<ConnectionOptions>): void;
    getMetrics(): {
      messagesReceived: number;
      messagesSent: number;
      bytesReceived: number;
      bytesSent: number;
      connectionTime?: number;
      reconnectCount: number;
    };
  }

  // Factory function type
  export type CreateWebSocketClient = (options: ConnectionOptions) => IWebSocketClient;
}

export = WebSocketTypes;

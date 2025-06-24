/**
 * Stinkster Type Definitions
 *
 * This file contains TypeScript type definitions for the Stinkster project.
 * These types are used throughout the application for SDR, WiFi, GPS, and TAK operations.
 */

declare namespace Stinkster {
  // SDR Types
  export interface ISDRConfig {
    device: 'hackrf' | 'rtlsdr' | 'soapy';
    frequency: number;
    sampleRate: number;
    gain: {
      vga?: number;
      lna?: number;
      amp?: number;
    };
    bandwidth?: number;
    ppm?: number;
  }

  export interface ISpectrumData {
    timestamp: number;
    frequency: number;
    power: number[];
    bandwidth: number;
  }

  // WiFi Types
  export interface IWiFiDevice {
    macAddress: string;
    ssid?: string;
    manufacturer?: string;
    signalStrength: number;
    channel: number;
    frequency: number;
    lastSeen: Date;
    location?: ILocation;
    encryption?: string[];
  }

  export interface IKismetConfig {
    interface: string;
    channels: number[];
    hopRate: number;
    logDirectory: string;
    alertsEnabled: boolean;
  }

  // GPS Types
  export interface ILocation {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp: Date;
  }

  export interface IGPSConfig {
    device: string;
    baudRate: number;
    protocol: 'NMEA' | 'UBX' | 'MAVLINK';
    updateRate: number;
  }

  // TAK Types
  export interface ITAKMessage {
    uuid: string;
    type: 'a-f-G-U-C' | 'a-f-G-E-S' | string;
    callsign: string;
    location: ILocation;
    detail?: Record<string, unknown>;
    timestamp: Date;
    stale: Date;
  }

  export interface ITAKConfig {
    serverUrl: string;
    serverPort: number;
    callsign: string;
    team: string;
    role: string;
    broadcastPort?: number;
    ssl?: boolean;
    cert?: string;
  }

  // Service Status Types
  export interface IServiceStatus {
    name: string;
    status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
    pid?: number;
    uptime?: number;
    lastError?: string;
    metrics?: {
      cpu?: number;
      memory?: number;
      messagesProcessed?: number;
    };
  }

  // API Types
  export interface IAPIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: unknown;
    };
    timestamp: Date;
  }

  export interface IWebSocketMessage {
    type: 'spectrum' | 'wifi' | 'gps' | 'tak' | 'status' | 'error';
    data: unknown;
    timestamp: Date;
  }

  // Configuration Types
  export interface IStinksterConfig {
    sdr?: ISDRConfig;
    wifi?: IKismetConfig;
    gps?: IGPSConfig;
    tak?: ITAKConfig;
    logging: {
      level: 'debug' | 'info' | 'warn' | 'error';
      directory: string;
      maxFiles: number;
      maxSize: string;
    };
    api: {
      port: number;
      host: string;
      cors: boolean;
      rateLimit?: {
        windowMs: number;
        max: number;
      };
    };
  }

  // Event Types
  export type StinksterEvent =
    | { type: 'sdr:spectrum'; data: ISpectrumData }
    | { type: 'wifi:device'; data: IWiFiDevice }
    | { type: 'gps:location'; data: ILocation }
    | { type: 'tak:message'; data: ITAKMessage }
    | { type: 'service:status'; data: IServiceStatus }
    | { type: 'error'; data: { service: string; error: Error } };

  // Utility Types
  export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };

  export type AsyncResult<T, E = Error> = Promise<
    { success: true; data: T } | { success: false; error: E }
  >;
}

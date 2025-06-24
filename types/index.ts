/**
 * Stinkster Project Type Definitions
 * Main export file for all TypeScript types
 */

// Re-export all types
export * from './sdr';
export * from './wifi';
export * from './gps';
export * from './tak';
export * from './websocket';
export * from './api';
export * from './system';

// Common types used across modules
export interface Timestamp {
  unix: number;           // Unix timestamp (seconds)
  iso: string;           // ISO 8601 string
  readable?: string;     // Human readable format
}

export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  source?: 'gps' | 'wifi' | 'manual' | 'calculated';
}

export interface DateRange {
  start: Date | string | number;
  end: Date | string | number;
}

export interface Pagination {
  page: number;
  limit: number;
  total?: number;
  hasMore?: boolean;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: any;
}

// Service Configuration
export interface ServiceConfig {
  enabled: boolean;
  autoStart: boolean;
  restartOnFailure: boolean;
  restartDelay?: number;
  maxRestarts?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  [key: string]: any;
}

// Error types
export interface StinksterError {
  code: string;
  message: string;
  service?: string;
  timestamp: number;
  details?: any;
  stack?: string;
}

// Event types
export interface StinksterEvent {
  id: string;
  type: string;
  source: string;
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

// Measurement units
export interface Signal {
  value: number;
  unit: 'dBm' | 'dB' | 'mW';
}

export interface Frequency {
  value: number;
  unit: 'Hz' | 'kHz' | 'MHz' | 'GHz';
}

export interface Distance {
  value: number;
  unit: 'm' | 'km' | 'ft' | 'mi' | 'nmi';
}

export interface Speed {
  value: number;
  unit: 'm/s' | 'km/h' | 'mph' | 'knots';
}

// Color definitions
export interface Color {
  hex?: string;          // #RRGGBB
  argb?: string;         // AARRGGBB
  rgba?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

// File types
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  created: number;
  modified: number;
  type: string;
  permissions?: string;
}

// Process information
export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  startTime: number;
  cpuUsage?: number;
  memoryUsage?: number;
  status: 'running' | 'stopped' | 'crashed' | 'unknown';
}

// Network interface
export interface NetworkInterface {
  name: string;
  type: 'wifi' | 'ethernet' | 'virtual' | 'other';
  mac?: string;
  ip?: string;
  state: 'up' | 'down' | 'unknown';
  mode?: 'managed' | 'monitor' | 'master' | 'ad-hoc';
  channel?: number;
  frequency?: number;
}
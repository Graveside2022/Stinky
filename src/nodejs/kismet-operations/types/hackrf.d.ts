/**
 * HackRF Backend Integration Type Definitions
 * Provides comprehensive TypeScript types for the Python HackRF backend
 * running on port 8092
 */

// Configuration Types
export interface HackRFConfig {
  device_index: number;
  center_freq: number;
  sample_rate: number;
  gain: {
    lna: number;    // 0-40 dB in 8 dB steps
    vga: number;    // 0-62 dB in 2 dB steps
    amp: number;    // 0 or 14 dB
  };
  bandwidth: number;
  antenna_power?: boolean;
  bias_tee?: boolean;
}

export interface HackRFStatus {
  connected: boolean;
  device_info: {
    serial: string;
    board_id: string;
    firmware_version: string;
    api_version: string;
  } | null;
  current_config: HackRFConfig;
  uptime: number;
  error?: string;
}

// FFT Data Types
export interface HackRFFFTData {
  timestamp: number;          // Unix timestamp in milliseconds
  center_freq: number;        // Center frequency in Hz
  sample_rate: number;        // Sample rate in Hz
  bandwidth: number;          // Bandwidth in Hz
  fft_size: number;          // Number of FFT bins
  fft_data: Float32Array | number[];  // FFT magnitude data in dB
  peak_power?: number;        // Peak power level in dB
  noise_floor?: number;       // Estimated noise floor in dB
  compression?: 'none' | 'gzip' | 'zlib';
}

export interface HackRFFFTBatch {
  batch_id: string;
  timestamp: number;
  count: number;
  frames: HackRFFFTData[];
}

// Binary Data Types for efficient transfer
export interface HackRFBinaryHeader {
  magic: number;              // 0x48524654 ('HRFT')
  version: number;            // Protocol version
  timestamp: number;          // Unix timestamp
  center_freq: number;        // Center frequency in Hz
  sample_rate: number;        // Sample rate in Hz
  fft_size: number;          // Number of FFT bins
  data_type: number;          // 0: float32, 1: int16, 2: int8
  compression: number;        // 0: none, 1: gzip, 2: zlib
  reserved: number[];         // Reserved for future use
}

// Signal Detection Types
export interface HackRFSignal {
  id: string;
  frequency: number;          // Frequency in Hz
  power: number;             // Power in dBm
  bandwidth: number;          // Estimated bandwidth in Hz
  snr: number;               // Signal-to-noise ratio in dB
  modulation?: string;        // Detected modulation type
  confidence: number;         // Detection confidence (0-1)
  timestamp: number;
  duration?: number;          // Signal duration in ms
  metadata?: {
    [key: string]: any;
  };
}

export interface HackRFSignalBatch {
  batch_id: string;
  timestamp: number;
  signals: HackRFSignal[];
  detection_params: {
    threshold: number;
    min_snr: number;
    algorithm: string;
  };
}

// WebSocket Message Types
export interface HackRFWebSocketMessage {
  type: 'fft' | 'signal' | 'status' | 'config' | 'error' | 'control';
  timestamp: number;
  data: any;
  id?: string;               // Message ID for request/response tracking
}

export interface HackRFFFTMessage extends HackRFWebSocketMessage {
  type: 'fft';
  data: HackRFFFTData;
}

export interface HackRFSignalMessage extends HackRFWebSocketMessage {
  type: 'signal';
  data: HackRFSignalBatch;
}

export interface HackRFStatusMessage extends HackRFWebSocketMessage {
  type: 'status';
  data: HackRFStatus;
}

export interface HackRFConfigMessage extends HackRFWebSocketMessage {
  type: 'config';
  data: HackRFConfig;
}

export interface HackRFErrorMessage extends HackRFWebSocketMessage {
  type: 'error';
  data: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface HackRFControlMessage extends HackRFWebSocketMessage {
  type: 'control';
  data: {
    command: 'start' | 'stop' | 'restart' | 'update_config' | 'reset';
    params?: any;
  };
}

// API Endpoint Types
export interface HackRFApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface HackRFFrequencyScanRequest {
  start_freq: number;        // Start frequency in Hz
  stop_freq: number;         // Stop frequency in Hz
  step_size: number;         // Step size in Hz
  dwell_time: number;        // Dwell time per step in ms
  gain?: {
    lna?: number;
    vga?: number;
    amp?: number;
  };
}

export interface HackRFFrequencyScanResult {
  scan_id: string;
  start_time: number;
  end_time: number;
  start_freq: number;
  stop_freq: number;
  step_size: number;
  frequencies: number[];
  power_levels: number[][];   // 2D array: [frequency_index][time_samples]
  detected_signals: HackRFSignal[];
}

export interface HackRFRecordingRequest {
  duration: number;          // Recording duration in seconds
  format: 'iq' | 'fft' | 'both';
  filename?: string;
  compression?: boolean;
}

export interface HackRFRecordingStatus {
  recording: boolean;
  start_time?: number;
  duration?: number;
  filename?: string;
  size?: number;            // File size in bytes
  samples_recorded?: number;
}

// Spectrum Sweep Types
export interface HackRFSweepConfig {
  frequency_ranges: Array<{
    start: number;
    stop: number;
    step: number;
  }>;
  bin_width: number;
  averaging: number;
  window_function: 'hann' | 'hamming' | 'blackman' | 'rectangular';
}

export interface HackRFSweepResult {
  sweep_id: string;
  timestamp: number;
  ranges: Array<{
    start_freq: number;
    stop_freq: number;
    bin_width: number;
    power_spectrum: number[];
  }>;
  peak_signals: HackRFSignal[];
}

// Calibration Types
export interface HackRFCalibration {
  frequency_offset: number;   // Frequency offset in Hz
  gain_correction: {
    lna: number;
    vga: number;
  };
  temperature_compensation?: number;
  last_calibration: number;
}

// Event Types
export interface HackRFEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onFFTData?: (data: HackRFFFTData) => void;
  onSignalDetected?: (signals: HackRFSignal[]) => void;
  onStatusUpdate?: (status: HackRFStatus) => void;
  onError?: (error: HackRFErrorMessage['data']) => void;
  onConfigUpdate?: (config: HackRFConfig) => void;
}

// Data Transform Types
export interface HackRFDataTransform {
  applyWindow(data: Float32Array, window: 'hann' | 'hamming' | 'blackman'): Float32Array;
  convertToDBm(magnitude: number, reference: number): number;
  estimateNoise(spectrum: number[]): number;
  detectPeaks(spectrum: number[], threshold: number): number[];
}

// Integration Types with existing system
export interface HackRFToSignalDetection {
  hackrfSignal: HackRFSignal;
  toSignalDetection(location: { lat: number; lon: number }): SignalDetection;
}

export interface HackRFIntegrationConfig {
  backendUrl: string;        // HackRF backend URL (e.g., http://localhost:8092)
  reconnectInterval: number;  // WebSocket reconnect interval in ms
  bufferSize: number;        // FFT buffer size
  enableBinaryMode: boolean; // Use binary protocol for efficiency
  compressionLevel?: number; // 0-9 for gzip compression
}

// Type Guards
export function isHackRFFFTMessage(msg: HackRFWebSocketMessage): msg is HackRFFFTMessage {
  return msg.type === 'fft';
}

export function isHackRFSignalMessage(msg: HackRFWebSocketMessage): msg is HackRFSignalMessage {
  return msg.type === 'signal';
}

export function isHackRFStatusMessage(msg: HackRFWebSocketMessage): msg is HackRFStatusMessage {
  return msg.type === 'status';
}

export function isHackRFErrorMessage(msg: HackRFWebSocketMessage): msg is HackRFErrorMessage {
  return msg.type === 'error';
}

// Re-export SignalDetection for convenience
export type { SignalDetection } from './index';
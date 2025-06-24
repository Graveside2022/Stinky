/**
 * SDR/HackRF Type Definitions
 * Types for Software Defined Radio operations and spectrum analysis
 */

// FFT Data Types
export interface FFTData {
  timestamp: number;
  centerFrequency: number;
  sampleRate: number;
  fftSize: number;
  data: Float32Array | number[];
  compression?: 'none' | 'gzip' | 'lz4';
}

// Spectrum Configuration
export interface SpectrumConfig {
  centerFreq: number;
  sampleRate: number;
  fftSize: number;
  gain: {
    lna?: number;    // Low Noise Amplifier (0-40 dB)
    vga?: number;    // Variable Gain Amplifier (0-62 dB)
    amp?: number;    // Amplifier (0 or 1)
  };
  averageCount?: number;
  windowType?: 'hamming' | 'hanning' | 'blackman' | 'rectangular';
}

// Signal Detection
export interface DetectedSignal {
  id: string;
  frequency: number;
  bandwidth: number;
  power: number;       // dBm
  snr: number;         // Signal-to-Noise Ratio
  modulation?: string;
  timestamp: number;
  duration?: number;
  confidence?: number;
}

// Frequency Band Definition
export interface FrequencyBand {
  name: string;
  startFreq: number;  // Hz
  endFreq: number;    // Hz
  description?: string;
  regulations?: string;
  commonUses?: string[];
}

// Scan Profile
export interface ScanProfile {
  name: string;
  ranges: Array<[number, number]>;  // MHz pairs
  step: number;                     // kHz
  description: string;
  dwellTime?: number;               // ms per frequency
}

// OpenWebRX Integration
export interface OpenWebRXConfig {
  fftSize: number;
  centerFreq: number;
  sampleRate: number;
  fftCompression: 'none' | 'gzip' | 'lz4';
  outputRate?: number;
  hdOutputRate?: number;
}

// OpenWebRX Message Types
export interface OpenWebRXMessage {
  type: 'fft' | 'audio' | 'meta' | 'config' | 'error';
  data: any;
}

export interface OpenWebRXFFTMessage extends OpenWebRXMessage {
  type: 'fft';
  data: {
    fft: ArrayBuffer | Float32Array;
    timestamp: number;
  };
}

export interface OpenWebRXMetaMessage extends OpenWebRXMessage {
  type: 'meta';
  data: {
    frequency?: number;
    sampleRate?: number;
    fftSize?: number;
    compression?: string;
  };
}

// HackRF Device Status
export interface HackRFStatus {
  connected: boolean;
  serialNumber?: string;
  firmwareVersion?: string;
  boardId?: string;
  partId?: string;
  apiVersion?: string;
  temperature?: number;
}

// Spectrum Analyzer State
export interface SpectrumAnalyzerState {
  isScanning: boolean;
  currentFrequency: number;
  scanProfile?: ScanProfile;
  detectedSignals: DetectedSignal[];
  fftBuffer: FFTData[];
  bufferSize: number;
  signalThreshold: number;  // dBm
}

// Waterfall Display Data
export interface WaterfallData {
  width: number;
  height: number;
  minPower: number;  // dBm
  maxPower: number;  // dBm
  colorMap: 'viridis' | 'plasma' | 'hot' | 'cool' | 'gray';
  data: Uint8Array;  // Pixel data
}

// Recording Configuration
export interface RecordingConfig {
  format: 'iq' | 'wav' | 'raw';
  centerFrequency: number;
  sampleRate: number;
  duration?: number;  // seconds
  filename?: string;
}

// SDR Error Types
export interface SDRError {
  code: string;
  message: string;
  device?: string;
  operation?: string;
  timestamp: number;
}
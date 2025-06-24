// HackRF type definitions

export interface HackRFGain {
  lna: number;
  vga: number;
  amp: number;
}

export interface HackRFConfig {
  device_index: number;
  center_freq: number;
  sample_rate: number;
  gain: HackRFGain;
  bandwidth: number;
  fft_size?: number;
}

export interface HackRFStatus {
  connected: boolean;
  device_info: any;
  current_config: HackRFConfig;
  uptime: number;
}

export interface HackRFFFTData {
  timestamp: number;
  center_freq: number;
  sample_rate: number;
  fft_size: number;
  fft_data: number[];
  db_min: number;
  db_max: number;
}

export interface HackRFSignal {
  frequency: number;
  power: number;
  bandwidth: number;
  timestamp: number;
  type?: string;
}

// WebSocket message types
export type HackRFWebSocketMessage = 
  | HackRFFFTMessage
  | HackRFSignalMessage
  | HackRFStatusMessage
  | HackRFConfigMessage
  | HackRFErrorMessage;

export interface HackRFFFTMessage {
  type: 'fft_data';
  data: HackRFFFTData;
}

export interface HackRFSignalMessage {
  type: 'signal_detected';
  data: HackRFSignal;
}

export interface HackRFStatusMessage {
  type: 'status';
  data: HackRFStatus;
}

export interface HackRFConfigMessage {
  type: 'config';
  data: HackRFConfig;
}

export interface HackRFErrorMessage {
  type: 'error';
  message: string;
}
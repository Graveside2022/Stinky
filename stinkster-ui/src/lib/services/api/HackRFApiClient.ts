/**
 * HackRF API client for spectrum analyzer and SDR control
 */

import { BaseApiClient } from './BaseApiClient';
import type {
  ApiResponse,
  HackRFConfig,
  HackRFStatus,
  SpectrumData,
  FileUploadConfig
} from './types';

export interface FrequencyRange {
  start: number;
  stop: number;
  step: number;
}

export interface RecordingConfig {
  frequency: number;
  sampleRate: number;
  duration: number;
  filename?: string;
}

export interface RecordingStatus {
  recording: boolean;
  filename?: string;
  startTime?: number;
  duration?: number;
  size?: number;
}

export interface SignalDetection {
  frequency: number;
  power: number;
  bandwidth: number;
  modulation?: string;
  confidence: number;
  timestamp: number;
}

export class HackRFApiClient extends BaseApiClient {
  constructor(baseURL = 'http://localhost:8092') {
    super(baseURL);

    // Add request logging interceptor
    this.addRequestInterceptor({
      onRequest: (config) => {
        console.log('[HackRF API] Request:', config.method, config.url);
        return config;
      }
    });

    // Add response timing interceptor
    this.addResponseInterceptor({
      onResponse: (response) => {
        console.log('[HackRF API] Response:', response.status, response.config.url);
        return response;
      }
    });
  }

  // Device control endpoints
  async getStatus(): Promise<ApiResponse<HackRFStatus>> {
    return this.get<HackRFStatus>('/api/status');
  }

  async getConfig(): Promise<ApiResponse<HackRFConfig>> {
    return this.get<HackRFConfig>('/api/config');
  }

  async updateConfig(config: Partial<HackRFConfig>): Promise<ApiResponse<HackRFConfig>> {
    return this.post<HackRFConfig>('/api/config', config);
  }

  async setFrequency(frequency: number): Promise<ApiResponse<{ frequency: number }>> {
    return this.post<{ frequency: number }>('/api/frequency', { frequency });
  }

  async setSampleRate(sampleRate: number): Promise<ApiResponse<{ sampleRate: number }>> {
    return this.post<{ sampleRate: number }>('/api/sample-rate', { sampleRate });
  }

  async setGain(gain: number): Promise<ApiResponse<{ gain: number }>> {
    return this.post<{ gain: number }>('/api/gain', { gain });
  }

  async setBandwidth(bandwidth: number): Promise<ApiResponse<{ bandwidth: number }>> {
    return this.post<{ bandwidth: number }>('/api/bandwidth', { bandwidth });
  }

  // Spectrum data endpoints
  async getSpectrum(): Promise<ApiResponse<SpectrumData>> {
    return this.get<SpectrumData>('/api/spectrum');
  }

  async getSpectrumHistory(duration: number = 60): Promise<ApiResponse<SpectrumData[]>> {
    return this.get<SpectrumData[]>('/api/spectrum/history', {
      params: { duration }
    });
  }

  async startStreaming(): Promise<ApiResponse<{ streaming: boolean }>> {
    return this.post<{ streaming: boolean }>('/api/streaming/start');
  }

  async stopStreaming(): Promise<ApiResponse<{ streaming: boolean }>> {
    return this.post<{ streaming: boolean }>('/api/streaming/stop');
  }

  // Scanning endpoints
  async startFrequencyScan(range: FrequencyRange): Promise<ApiResponse<{ scanning: boolean }>> {
    return this.post<{ scanning: boolean }>('/api/scan/start', range);
  }

  async stopFrequencyScan(): Promise<ApiResponse<{ scanning: boolean }>> {
    return this.post<{ scanning: boolean }>('/api/scan/stop');
  }

  async getScanResults(): Promise<ApiResponse<SignalDetection[]>> {
    return this.get<SignalDetection[]>('/api/scan/results');
  }

  // Recording endpoints
  async startRecording(config: RecordingConfig): Promise<ApiResponse<RecordingStatus>> {
    return this.post<RecordingStatus>('/api/recording/start', config);
  }

  async stopRecording(): Promise<ApiResponse<RecordingStatus>> {
    return this.post<RecordingStatus>('/api/recording/stop');
  }

  async getRecordingStatus(): Promise<ApiResponse<RecordingStatus>> {
    return this.get<RecordingStatus>('/api/recording/status');
  }

  async listRecordings(): Promise<ApiResponse<string[]>> {
    return this.get<string[]>('/api/recordings');
  }

  async downloadRecording(filename: string): Promise<ApiResponse<Blob>> {
    return this.get<Blob>(`/api/recordings/${filename}`, {
      responseType: 'blob'
    });
  }

  async deleteRecording(filename: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.delete<{ deleted: boolean }>(`/api/recordings/${filename}`);
  }

  // Signal analysis endpoints
  async analyzeSignal(frequency: number, bandwidth: number = 1000000): Promise<ApiResponse<SignalDetection>> {
    return this.post<SignalDetection>('/api/analyze', { frequency, bandwidth });
  }

  async detectSignals(threshold: number = -60): Promise<ApiResponse<SignalDetection[]>> {
    return this.get<SignalDetection[]>('/api/detect', {
      params: { threshold }
    });
  }

  // Preset management
  async getPresets(): Promise<ApiResponse<Record<string, HackRFConfig>>> {
    return this.get<Record<string, HackRFConfig>>('/api/presets');
  }

  async savePreset(name: string, config: HackRFConfig): Promise<ApiResponse<{ saved: boolean }>> {
    return this.post<{ saved: boolean }>('/api/presets', { name, config });
  }

  async loadPreset(name: string): Promise<ApiResponse<HackRFConfig>> {
    return this.post<HackRFConfig>(`/api/presets/${name}/load`);
  }

  async deletePreset(name: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.delete<{ deleted: boolean }>(`/api/presets/${name}`);
  }

  // Calibration endpoints
  async calibrate(): Promise<ApiResponse<{ calibrated: boolean }>> {
    return this.post<{ calibrated: boolean }>('/api/calibrate');
  }

  async getCalibrationStatus(): Promise<ApiResponse<{ calibrated: boolean; offset: number }>> {
    return this.get<{ calibrated: boolean; offset: number }>('/api/calibration');
  }

  // File upload for replay
  async uploadReplayFile(file: File, onProgress?: (progress: ProgressEvent) => void): Promise<ApiResponse<{ filename: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.post<{ filename: string }>('/api/replay/upload', formData, {
      headers: {}, // Let browser set Content-Type with boundary
      timeout: 300000 // 5 minutes for large files
    });
  }

  async startReplay(filename: string, config?: Partial<HackRFConfig>): Promise<ApiResponse<{ playing: boolean }>> {
    return this.post<{ playing: boolean }>('/api/replay/start', { filename, ...config });
  }

  async stopReplay(): Promise<ApiResponse<{ playing: boolean }>> {
    return this.post<{ playing: boolean }>('/api/replay/stop');
  }

  // System information
  async getDeviceInfo(): Promise<ApiResponse<{
    serial: string;
    firmwareVersion: string;
    hardwareVersion: string;
    temperature?: number;
  }>> {
    return this.get('/api/device/info');
  }

  async getSystemStats(): Promise<ApiResponse<{
    cpuUsage: number;
    memoryUsage: number;
    bufferUsage: number;
    droppedSamples: number;
  }>> {
    return this.get('/api/system/stats');
  }

  // Waterfall data endpoint
  async getWaterfallData(duration: number = 10): Promise<ApiResponse<{
    data: number[][];
    frequencies: number[];
    timestamps: number[];
  }>> {
    return this.get('/api/waterfall', {
      params: { duration }
    });
  }
}
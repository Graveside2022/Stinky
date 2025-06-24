/**
 * HackRF API Client
 * Handles REST API communication with the Python HackRF backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import winston from 'winston';
import FormData from 'form-data';
import {
  HackRFApiResponse,
  HackRFConfig,
  HackRFStatus,
  HackRFFrequencyScanRequest,
  HackRFFrequencyScanResult,
  HackRFRecordingRequest,
  HackRFRecordingStatus,
  HackRFSweepConfig,
  HackRFSweepResult,
  HackRFCalibration,
  HackRFSignal
} from '../../types/hackrf';

export interface HackRFApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class HackRFApiClient {
  private client: AxiosInstance;
  private config: Required<HackRFApiClientConfig>;
  private logger: winston.Logger;

  constructor(config: Partial<HackRFApiClientConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:8092',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'nodejs-integration'
      }
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug('API Request', {
          method: config.method,
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        this.logger.error('API Request Error', { error });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('API Response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        this.logger.error('API Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: 'HackRFAPI' }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Make API request with retry logic
   */
  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any,
    options?: any
  ): Promise<HackRFApiResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await this.client.request<HackRFApiResponse<T>>({
          method,
          url,
          data,
          ...options
        });
        return response.data;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          this.logger.warn(`Retry attempt ${attempt + 1}`, { url, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get HackRF device status
   */
  async getStatus(): Promise<HackRFStatus> {
    const response = await this.request<HackRFStatus>('get', '/api/status');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get status');
    }
    return response.data;
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<HackRFConfig> {
    const response = await this.request<HackRFConfig>('get', '/api/config');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get config');
    }
    return response.data;
  }

  /**
   * Update HackRF configuration
   */
  async updateConfig(config: Partial<HackRFConfig>): Promise<HackRFConfig> {
    const response = await this.request<HackRFConfig>('post', '/api/config', config);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update config');
    }
    return response.data;
  }

  /**
   * Start device
   */
  async start(): Promise<void> {
    const response = await this.request('post', '/api/control/start');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to start device');
    }
  }

  /**
   * Stop device
   */
  async stop(): Promise<void> {
    const response = await this.request('post', '/api/control/stop');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to stop device');
    }
  }

  /**
   * Restart device
   */
  async restart(): Promise<void> {
    const response = await this.request('post', '/api/control/restart');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to restart device');
    }
  }

  /**
   * Start frequency scan
   */
  async startFrequencyScan(request: HackRFFrequencyScanRequest): Promise<string> {
    const response = await this.request<{ scan_id: string }>(
      'post', 
      '/api/scan/start', 
      request
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to start scan');
    }
    return response.data.scan_id;
  }

  /**
   * Get scan results
   */
  async getScanResults(scanId: string): Promise<HackRFFrequencyScanResult> {
    const response = await this.request<HackRFFrequencyScanResult>(
      'get', 
      `/api/scan/${scanId}/results`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get scan results');
    }
    return response.data;
  }

  /**
   * Stop frequency scan
   */
  async stopScan(scanId: string): Promise<void> {
    const response = await this.request('post', `/api/scan/${scanId}/stop`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to stop scan');
    }
  }

  /**
   * Start recording
   */
  async startRecording(request: HackRFRecordingRequest): Promise<string> {
    const response = await this.request<{ recording_id: string }>(
      'post', 
      '/api/recording/start', 
      request
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to start recording');
    }
    return response.data.recording_id;
  }

  /**
   * Get recording status
   */
  async getRecordingStatus(): Promise<HackRFRecordingStatus> {
    const response = await this.request<HackRFRecordingStatus>(
      'get', 
      '/api/recording/status'
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get recording status');
    }
    return response.data;
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    const response = await this.request('post', '/api/recording/stop');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to stop recording');
    }
  }

  /**
   * Download recording
   */
  async downloadRecording(filename: string): Promise<Buffer> {
    try {
      const response = await this.client.get(`/api/recording/download/${filename}`, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error('Failed to download recording');
    }
  }

  /**
   * Perform spectrum sweep
   */
  async performSweep(config: HackRFSweepConfig): Promise<HackRFSweepResult> {
    const response = await this.request<HackRFSweepResult>(
      'post', 
      '/api/sweep', 
      config
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to perform sweep');
    }
    return response.data;
  }

  /**
   * Get detected signals
   */
  async getDetectedSignals(
    minPower?: number,
    maxAge?: number
  ): Promise<HackRFSignal[]> {
    const response = await this.request<HackRFSignal[]>(
      'get', 
      '/api/signals',
      null,
      {
        params: {
          min_power: minPower,
          max_age: maxAge
        }
      }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get signals');
    }
    return response.data;
  }

  /**
   * Get calibration data
   */
  async getCalibration(): Promise<HackRFCalibration> {
    const response = await this.request<HackRFCalibration>('get', '/api/calibration');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get calibration');
    }
    return response.data;
  }

  /**
   * Update calibration
   */
  async updateCalibration(calibration: Partial<HackRFCalibration>): Promise<HackRFCalibration> {
    const response = await this.request<HackRFCalibration>(
      'post', 
      '/api/calibration', 
      calibration
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update calibration');
    }
    return response.data;
  }

  /**
   * Run auto-calibration
   */
  async runAutoCalibration(): Promise<HackRFCalibration> {
    const response = await this.request<HackRFCalibration>(
      'post', 
      '/api/calibration/auto'
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to run auto-calibration');
    }
    return response.data;
  }

  /**
   * Upload IQ data for analysis
   */
  async uploadIQData(data: Buffer, metadata: any): Promise<{ analysis_id: string }> {
    const formData = new FormData();
    formData.append('file', data, 'iq_data.bin');
    formData.append('metadata', JSON.stringify(metadata));

    const response = await this.request<{ analysis_id: string }>(
      'post',
      '/api/analysis/upload',
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to upload IQ data');
    }
    return response.data;
  }

  /**
   * Get analysis results
   */
  async getAnalysisResults(analysisId: string): Promise<any> {
    const response = await this.request<any>(
      'get',
      `/api/analysis/${analysisId}/results`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get analysis results');
    }
    return response.data;
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    version: string;
    uptime: number;
  }> {
    try {
      const response = await this.request<any>('get', '/health');
      return {
        status: response.success ? 'healthy' : 'unhealthy',
        version: response.data?.version || 'unknown',
        uptime: response.data?.uptime || 0
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        version: 'unknown',
        uptime: 0
      };
    }
  }

  /**
   * Get backend metrics
   */
  async getMetrics(): Promise<{
    fft_rate: number;
    signal_detections: number;
    buffer_usage: number;
    cpu_usage: number;
    memory_usage: number;
  }> {
    const response = await this.request<any>('get', '/api/metrics');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get metrics');
    }
    return response.data;
  }
}
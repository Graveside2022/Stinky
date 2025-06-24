/**
 * HackRF Backend Integration
 * Main module that coordinates WebSocket and API communication with Python backend
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { HackRFWebSocketClient } from './websocket-client';
import { HackRFApiClient } from './api-client';
import {
  hackrfSignalToDetection,
  hackrfFFTToSystem,
  estimateNoiseFloor,
  detectPeaks,
  binToFrequency,
  smoothSpectrum,
  decimateSpectrum
} from './data-transform';
import {
  HackRFConfig,
  HackRFStatus,
  HackRFFFTData,
  HackRFSignal,
  HackRFIntegrationConfig,
  HackRFEventHandlers
} from '../../types/hackrf';
import { SignalDetection, FFTData, Location } from '../../types';

export interface HackRFIntegrationOptions extends Partial<HackRFIntegrationConfig> {
  enableAutoReconnect?: boolean;
  fftBufferSize?: number;
  signalHistorySize?: number;
  gpsProvider?: () => Promise<Location | null>;
}

export class HackRFIntegration extends EventEmitter {
  private wsClient: HackRFWebSocketClient;
  private apiClient: HackRFApiClient;
  private config: HackRFIntegrationOptions;
  private logger: winston.Logger;
  private fftBuffer: HackRFFFTData[] = [];
  private signalHistory: SignalDetection[] = [];
  private isInitialized = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  private currentLocation: Location | null = null;

  constructor(options: HackRFIntegrationOptions = {}) {
    super();

    this.config = {
      backendUrl: 'http://localhost:8092',
      reconnectInterval: 5000,
      bufferSize: 1000,
      enableBinaryMode: true,
      enableAutoReconnect: true,
      fftBufferSize: 100,
      signalHistorySize: 1000,
      ...options
    };

    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: 'HackRFIntegration' }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    // Initialize clients
    const wsUrl = this.config.backendUrl.replace(/^http/, 'ws') + '/ws';
    this.wsClient = new HackRFWebSocketClient({
      backendUrl: wsUrl,
      reconnectInterval: this.config.reconnectInterval,
      bufferSize: this.config.bufferSize,
      enableBinaryMode: this.config.enableBinaryMode
    });

    this.apiClient = new HackRFApiClient({
      baseUrl: this.config.backendUrl
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Initialize HackRF integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing HackRF integration');

      // Check backend health
      const health = await this.apiClient.checkHealth();
      if (health.status !== 'healthy') {
        throw new Error('HackRF backend is not healthy');
      }

      // Get initial status
      const status = await this.apiClient.getStatus();
      this.emit('status', status);

      // Connect WebSocket
      await this.wsClient.connect();

      // Start metrics collection
      this.startMetricsCollection();

      // Update GPS location if provider is available
      if (this.config.gpsProvider) {
        this.startLocationUpdates();
      }

      this.isInitialized = true;
      this.emit('initialized', { status, health });
      this.logger.info('HackRF integration initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize HackRF integration', { error });
      throw error;
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    // WebSocket events
    this.wsClient.on('connect', () => {
      this.logger.info('WebSocket connected');
      this.emit('connected');
    });

    this.wsClient.on('disconnect', (reason: string) => {
      this.logger.warn('WebSocket disconnected', { reason });
      this.emit('disconnected', reason);
      
      if (this.config.enableAutoReconnect && this.isInitialized) {
        this.scheduleReconnect();
      }
    });

    this.wsClient.on('fftData', (data: HackRFFFTData) => {
      this.handleFFTData(data);
    });

    this.wsClient.on('signals', (signals: SignalDetection[]) => {
      this.handleSignals(signals);
    });

    this.wsClient.on('status', (status: HackRFStatus) => {
      this.emit('status', status);
    });

    this.wsClient.on('error', (error: Error) => {
      this.logger.error('WebSocket error', { error });
      this.emit('error', error);
    });

    this.wsClient.on('backendError', (error: any) => {
      this.logger.error('Backend error', { error });
      this.emit('backendError', error);
    });
  }

  /**
   * Handle incoming FFT data
   */
  private handleFFTData(data: HackRFFFTData): void {
    // Add to buffer
    this.fftBuffer.push(data);
    if (this.fftBuffer.length > this.config.fftBufferSize!) {
      this.fftBuffer = this.fftBuffer.slice(-this.config.fftBufferSize!);
    }

    // Convert to system format
    const systemFFT = hackrfFFTToSystem(data);
    this.emit('fft', systemFFT);

    // Perform signal detection
    this.performSignalDetection(data);

    // Emit raw data for advanced processing
    this.emit('rawFFT', data);
  }

  /**
   * Perform signal detection on FFT data
   */
  private performSignalDetection(fftData: HackRFFFTData): void {
    try {
      const spectrum = Array.from(fftData.fft_data);
      const noiseFloor = fftData.noise_floor || estimateNoiseFloor(spectrum);
      const threshold = noiseFloor + 10; // 10 dB above noise floor

      const peakIndices = detectPeaks(spectrum, threshold);
      const signals: HackRFSignal[] = [];

      for (const peakIndex of peakIndices) {
        const frequency = binToFrequency(
          peakIndex,
          fftData.fft_size,
          fftData.sample_rate,
          fftData.center_freq
        );

        const signal: HackRFSignal = {
          id: `sig_${Date.now()}_${peakIndex}`,
          frequency,
          power: spectrum[peakIndex],
          bandwidth: this.estimateSignalBandwidth(spectrum, peakIndex, fftData),
          snr: spectrum[peakIndex] - noiseFloor,
          confidence: Math.min((spectrum[peakIndex] - threshold) / 20, 1),
          timestamp: fftData.timestamp
        };

        signals.push(signal);
      }

      if (signals.length > 0) {
        // Convert to SignalDetection format
        const detections = signals.map(sig => 
          hackrfSignalToDetection(sig, this.currentLocation || { lat: 0, lon: 0 })
        );
        
        this.handleSignals(detections);
      }

    } catch (error) {
      this.logger.error('Error in signal detection', { error });
    }
  }

  /**
   * Estimate signal bandwidth
   */
  private estimateSignalBandwidth(
    spectrum: number[],
    peakIndex: number,
    fftData: HackRFFFTData
  ): number {
    const peakPower = spectrum[peakIndex];
    const threshold = peakPower - 3; // 3dB down
    
    let leftIndex = peakIndex;
    let rightIndex = peakIndex;
    
    while (leftIndex > 0 && spectrum[leftIndex] > threshold) {
      leftIndex--;
    }
    
    while (rightIndex < spectrum.length - 1 && spectrum[rightIndex] > threshold) {
      rightIndex++;
    }
    
    const binWidth = fftData.sample_rate / fftData.fft_size;
    return (rightIndex - leftIndex) * binWidth;
  }

  /**
   * Handle detected signals
   */
  private handleSignals(signals: SignalDetection[]): void {
    // Add to history
    this.signalHistory.push(...signals);
    if (this.signalHistory.length > this.config.signalHistorySize!) {
      this.signalHistory = this.signalHistory.slice(-this.config.signalHistorySize!);
    }

    // Emit individual signals
    for (const signal of signals) {
      this.emit('signal', signal);
    }

    // Emit batch
    if (signals.length > 0) {
      this.emit('signalBatch', signals);
    }
  }

  /**
   * Start location updates
   */
  private async startLocationUpdates(): Promise<void> {
    if (!this.config.gpsProvider) return;

    const updateLocation = async () => {
      try {
        const location = await this.config.gpsProvider!();
        if (location) {
          this.currentLocation = location;
          this.emit('locationUpdate', location);
        }
      } catch (error) {
        this.logger.error('Failed to update location', { error });
      }
    };

    // Initial update
    await updateLocation();

    // Update every 5 seconds
    setInterval(updateLocation, 5000);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(async () => {
      try {
        const metrics = await this.apiClient.getMetrics();
        this.emit('metrics', metrics);
      } catch (error) {
        this.logger.error('Failed to get metrics', { error });
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.wsClient.connect();
      } catch (error) {
        this.logger.error('Reconnection failed', { error });
        this.scheduleReconnect();
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<HackRFStatus> {
    return this.apiClient.getStatus();
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<HackRFConfig> {
    return this.apiClient.getConfig();
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<HackRFConfig>): Promise<HackRFConfig> {
    const updated = await this.apiClient.updateConfig(config);
    this.wsClient.updateConfig(config);
    this.emit('configUpdated', updated);
    return updated;
  }

  /**
   * Start frequency scan
   */
  async startFrequencyScan(
    startFreq: number,
    stopFreq: number,
    stepSize: number = 1e6
  ): Promise<string> {
    return this.apiClient.startFrequencyScan({
      start_freq: startFreq,
      stop_freq: stopFreq,
      step_size: stepSize,
      dwell_time: 100
    });
  }

  /**
   * Get scan results
   */
  async getScanResults(scanId: string): Promise<any> {
    return this.apiClient.getScanResults(scanId);
  }

  /**
   * Get FFT buffer
   */
  getFFTBuffer(): FFTData[] {
    return this.fftBuffer.map(hackrfFFTToSystem);
  }

  /**
   * Get signal history
   */
  getSignalHistory(): SignalDetection[] {
    return [...this.signalHistory];
  }

  /**
   * Clear buffers
   */
  clearBuffers(): void {
    this.fftBuffer = [];
    this.signalHistory = [];
    this.wsClient.clearBuffer();
    this.emit('buffersCleared');
  }

  /**
   * Process spectrum for display
   */
  processSpectrumForDisplay(
    fftData: HackRFFFTData,
    targetSize: number = 1024,
    smoothing: boolean = true
  ): { frequencies: number[]; powers: number[] } {
    let spectrum = Array.from(fftData.fft_data);
    
    // Apply smoothing if requested
    if (smoothing) {
      spectrum = smoothSpectrum(spectrum, 3);
    }

    // Decimate if needed
    if (spectrum.length > targetSize) {
      spectrum = decimateSpectrum(spectrum, targetSize);
    }

    // Calculate frequencies
    const frequencies: number[] = [];
    const binWidth = fftData.sample_rate / spectrum.length;
    const startFreq = fftData.center_freq - fftData.sample_rate / 2;

    for (let i = 0; i < spectrum.length; i++) {
      frequencies.push(startFreq + i * binWidth);
    }

    return {
      frequencies,
      powers: spectrum
    };
  }

  /**
   * Register event handlers
   */
  registerHandlers(handlers: HackRFEventHandlers): void {
    if (handlers.onConnect) this.on('connected', handlers.onConnect);
    if (handlers.onDisconnect) this.on('disconnected', handlers.onDisconnect);
    if (handlers.onFFTData) this.on('fft', handlers.onFFTData);
    if (handlers.onSignalDetected) this.on('signal', handlers.onSignalDetected);
    if (handlers.onStatusUpdate) this.on('status', handlers.onStatusUpdate);
    if (handlers.onError) this.on('error', handlers.onError);
    if (handlers.onConfigUpdate) this.on('configUpdated', handlers.onConfigUpdate);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.wsClient.isConnectedToBackend();
  }

  /**
   * Shutdown integration
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down HackRF integration');
    
    this.isInitialized = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    this.wsClient.disconnect();
    this.removeAllListeners();
    
    this.logger.info('HackRF integration shutdown complete');
  }
}

// Export all types and utilities
export * from './websocket-client';
export * from './api-client';
export * from './data-transform';
export * from '../../types/hackrf';
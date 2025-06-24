/**
 * HackRF WebSocket Client
 * Handles real-time communication with the Python HackRF backend
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import winston from 'winston';
import pako from 'pako';
import {
  HackRFWebSocketMessage,
  HackRFFFTData,
  HackRFSignal,
  HackRFStatus,
  HackRFConfig,
  HackRFEventHandlers,
  HackRFIntegrationConfig,
  isHackRFFFTMessage,
  isHackRFSignalMessage,
  isHackRFStatusMessage,
  isHackRFErrorMessage,
  HackRFBinaryHeader
} from '../../types/hackrf';
import { SignalDetection } from '../../types';

// Binary protocol constants
const HACKRF_MAGIC = 0x48524654; // 'HRFT'
const PROTOCOL_VERSION = 1;
const HEADER_SIZE = 64; // bytes

export class HackRFWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: HackRFIntegrationConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private messageQueue: HackRFWebSocketMessage[] = [];
  private fftBuffer: HackRFFFTData[] = [];
  private logger: winston.Logger;

  constructor(config: Partial<HackRFIntegrationConfig> = {}) {
    super();
    
    this.config = {
      backendUrl: 'ws://localhost:8092/ws',
      reconnectInterval: 5000,
      bufferSize: 1000,
      enableBinaryMode: true,
      compressionLevel: 6,
      ...config
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: 'HackRFClient' }),
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
   * Connect to HackRF backend WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.isConnected) {
        resolve();
        return;
      }

      try {
        this.logger.info('Connecting to HackRF backend', { url: this.config.backendUrl });
        
        this.ws = new WebSocket(this.config.backendUrl, {
          perMessageDeflate: this.config.compressionLevel > 0,
          headers: {
            'X-Client-Type': 'nodejs-integration',
            'X-Binary-Mode': this.config.enableBinaryMode ? '1' : '0'
          }
        });

        this.ws.binaryType = 'arraybuffer';

        this.ws.on('open', () => {
          this.logger.info('Connected to HackRF backend');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.flushMessageQueue();
          this.emit('connect');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code: number, reason: string) => {
          this.logger.warn('Disconnected from HackRF backend', { code, reason });
          this.isConnected = false;
          this.emit('disconnect', reason);
          this.scheduleReconnect();
        });

        this.ws.on('error', (error: Error) => {
          this.logger.error('WebSocket error', { error: error.message });
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('ping', () => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.pong();
          }
        });

      } catch (error) {
        this.logger.error('Failed to connect', { error });
        reject(error);
      }
    });
  }

  /**
   * Disconnect from HackRF backend
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }

    this.isConnected = false;
    this.messageQueue = [];
    this.fftBuffer = [];
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      if (data instanceof ArrayBuffer && this.config.enableBinaryMode) {
        this.handleBinaryMessage(data);
      } else {
        const message = JSON.parse(data.toString()) as HackRFWebSocketMessage;
        this.handleJSONMessage(message);
      }
    } catch (error) {
      this.logger.error('Error handling message', { error });
      this.emit('error', error);
    }
  }

  /**
   * Handle binary protocol messages for efficiency
   */
  private handleBinaryMessage(buffer: ArrayBuffer): void {
    const view = new DataView(buffer);
    
    // Read header
    const magic = view.getUint32(0, true);
    if (magic !== HACKRF_MAGIC) {
      this.logger.error('Invalid binary message magic number', { magic });
      return;
    }

    const version = view.getUint32(4, true);
    if (version !== PROTOCOL_VERSION) {
      this.logger.error('Unsupported protocol version', { version });
      return;
    }

    const messageType = view.getUint32(8, true);
    const timestamp = Number(view.getBigUint64(12, true));
    const compression = view.getUint32(20, true);
    
    // Extract payload
    const payloadStart = HEADER_SIZE;
    let payload = new Uint8Array(buffer, payloadStart);

    // Decompress if needed
    if (compression > 0) {
      try {
        payload = pako.inflate(payload);
      } catch (error) {
        this.logger.error('Failed to decompress payload', { error });
        return;
      }
    }

    // Handle based on message type
    switch (messageType) {
      case 0: // FFT data
        this.handleBinaryFFTData(payload, timestamp);
        break;
      case 1: // Signal detection
        this.handleBinarySignalData(payload, timestamp);
        break;
      default:
        this.logger.warn('Unknown binary message type', { messageType });
    }
  }

  /**
   * Handle binary FFT data
   */
  private handleBinaryFFTData(payload: Uint8Array, timestamp: number): void {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    
    const centerFreq = view.getFloat64(0, true);
    const sampleRate = view.getFloat64(8, true);
    const bandwidth = view.getFloat64(16, true);
    const fftSize = view.getUint32(24, true);
    const peakPower = view.getFloat32(28, true);
    const noiseFloor = view.getFloat32(32, true);
    
    // Read FFT data
    const fftData = new Float32Array(fftSize);
    const fftStart = 36;
    for (let i = 0; i < fftSize; i++) {
      fftData[i] = view.getFloat32(fftStart + i * 4, true);
    }

    const fftMessage: HackRFFFTData = {
      timestamp,
      center_freq: centerFreq,
      sample_rate: sampleRate,
      bandwidth,
      fft_size: fftSize,
      fft_data: fftData,
      peak_power: peakPower,
      noise_floor: noiseFloor
    };

    this.handleFFTData(fftMessage);
  }

  /**
   * Handle binary signal detection data
   */
  private handleBinarySignalData(payload: Uint8Array, timestamp: number): void {
    try {
      // Parse binary signal data format
      const textDecoder = new TextDecoder();
      const jsonStr = textDecoder.decode(payload);
      const signals: HackRFSignal[] = JSON.parse(jsonStr);
      
      this.handleSignalBatch({
        batch_id: `batch_${timestamp}`,
        timestamp,
        signals,
        detection_params: {
          threshold: -70,
          min_snr: 10,
          algorithm: 'peak'
        }
      });
    } catch (error) {
      this.logger.error('Failed to parse binary signal data', { error });
    }
  }

  /**
   * Handle JSON protocol messages
   */
  private handleJSONMessage(message: HackRFWebSocketMessage): void {
    if (isHackRFFFTMessage(message)) {
      this.handleFFTData(message.data);
    } else if (isHackRFSignalMessage(message)) {
      this.handleSignalBatch(message.data);
    } else if (isHackRFStatusMessage(message)) {
      this.emit('status', message.data);
    } else if (isHackRFErrorMessage(message)) {
      this.logger.error('HackRF backend error', message.data);
      this.emit('backendError', message.data);
    }
  }

  /**
   * Handle FFT data
   */
  private handleFFTData(data: HackRFFFTData): void {
    // Add to buffer
    this.fftBuffer.push(data);
    
    // Maintain buffer size
    if (this.fftBuffer.length > this.config.bufferSize) {
      this.fftBuffer = this.fftBuffer.slice(-this.config.bufferSize);
    }

    // Emit for real-time processing
    this.emit('fftData', data);
  }

  /**
   * Handle signal detection batch
   */
  private handleSignalBatch(batch: any): void {
    // Convert to SignalDetection format for compatibility
    const location = { lat: 0, lon: 0 }; // Would be obtained from GPS
    
    const detections: SignalDetection[] = batch.signals.map((signal: HackRFSignal) => ({
      id: signal.id,
      source: 'hackrf' as const,
      lat: location.lat,
      lon: location.lon,
      signal_strength: signal.power,
      timestamp: signal.timestamp,
      frequency: signal.frequency,
      metadata: {
        bandwidth: signal.bandwidth,
        snr: signal.snr,
        modulation: signal.modulation,
        confidence: signal.confidence,
        ...signal.metadata
      }
    }));

    this.emit('signals', detections);
  }

  /**
   * Send message to HackRF backend
   */
  send(message: HackRFWebSocketMessage): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      this.logger.error('Failed to send message', { error });
      this.messageQueue.push(message);
    }
  }

  /**
   * Send control command
   */
  sendControl(command: string, params?: any): void {
    this.send({
      type: 'control',
      timestamp: Date.now(),
      data: { command, params }
    });
  }

  /**
   * Update HackRF configuration
   */
  updateConfig(config: Partial<HackRFConfig>): void {
    this.sendControl('update_config', config);
  }

  /**
   * Start frequency scan
   */
  startScan(startFreq: number, stopFreq: number, stepSize: number): void {
    this.sendControl('start_scan', {
      start_freq: startFreq,
      stop_freq: stopFreq,
      step_size: stepSize
    });
  }

  /**
   * Get current status
   */
  getStatus(): Promise<HackRFStatus> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Status request timeout'));
      }, 5000);

      const handler = (status: HackRFStatus) => {
        clearTimeout(timeout);
        resolve(status);
      };

      this.once('status', handler);
      this.sendControl('get_status');
    });
  }

  /**
   * Get latest FFT data
   */
  getLatestFFT(): HackRFFFTData | null {
    return this.fftBuffer.length > 0 
      ? this.fftBuffer[this.fftBuffer.length - 1] 
      : null;
  }

  /**
   * Get FFT buffer
   */
  getFFTBuffer(): HackRFFFTData[] {
    return [...this.fftBuffer];
  }

  /**
   * Clear FFT buffer
   */
  clearBuffer(): void {
    this.fftBuffer = [];
    this.emit('bufferCleared');
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    this.logger.info('Scheduling reconnect', { 
      attempt: this.reconnectAttempts, 
      delay 
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(error => {
        this.logger.error('Reconnect failed', { error });
      });
    }, delay);
  }

  /**
   * Flush message queue
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Check if connected
   */
  isConnectedToBackend(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Register event handlers
   */
  registerHandlers(handlers: HackRFEventHandlers): void {
    if (handlers.onConnect) this.on('connect', handlers.onConnect);
    if (handlers.onDisconnect) this.on('disconnect', handlers.onDisconnect);
    if (handlers.onFFTData) this.on('fftData', handlers.onFFTData);
    if (handlers.onSignalDetected) this.on('signals', handlers.onSignalDetected);
    if (handlers.onStatusUpdate) this.on('status', handlers.onStatusUpdate);
    if (handlers.onError) this.on('backendError', handlers.onError);
    if (handlers.onConfigUpdate) this.on('configUpdate', handlers.onConfigUpdate);
  }
}
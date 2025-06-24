/**
 * OpenWebRX WebSocket Connector
 * Handles connection and data streaming from OpenWebRX
 */

import WebSocket from 'ws';
import { logger } from './logger';
import { HackRFFFTData } from '../kismet-operations/types/hackrf';

export interface OpenWebRXConfig {
  fft_size: number;
  center_freq: number;
  samp_rate: number;
  fft_compression: string;
}

export interface OpenWebRXCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onFFTData?: (data: HackRFFFTData) => void;
  onConfig?: (config: OpenWebRXConfig) => void;
  onError?: (error: string) => void;
}

export class OpenWebRXConnector {
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private configReceived: boolean = false;
  private config: OpenWebRXConfig = {
    fft_size: 0,
    center_freq: 0,
    samp_rate: 0,
    fft_compression: 'none'
  };
  
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly reconnectInterval = 5000;
  
  constructor(
    private readonly url: string,
    private readonly callbacks: OpenWebRXCallbacks
  ) {}
  
  async connect(): Promise<void> {
    try {
      logger.info(`Connecting to OpenWebRX at ${this.url}`);
      
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', () => {
        this.connected = true;
        logger.info('Connected to OpenWebRX WebSocket');
        this.sendHandshake();
        this.callbacks.onConnect?.();
      });
      
      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });
      
      this.ws.on('close', () => {
        this.connected = false;
        this.callbacks.onDisconnect?.();
        logger.info('Disconnected from OpenWebRX');
        this.scheduleReconnect();
      });
      
      this.ws.on('error', (error) => {
        logger.error('OpenWebRX WebSocket error:', error);
        this.callbacks.onError?.(error.message);
      });
      
    } catch (error) {
      logger.error('Failed to connect to OpenWebRX:', error);
      this.callbacks.onError?.(error.message);
      this.scheduleReconnect();
    }
  }
  
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
  }
  
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
  
  getConfig(): OpenWebRXConfig {
    return { ...this.config };
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      logger.info('Attempting to reconnect to OpenWebRX...');
      this.connect();
    }, this.reconnectInterval);
  }
  
  private async sendHandshake(): Promise<void> {
    if (!this.ws) return;
    
    // Step 1: Client hello
    this.ws.send("SERVER DE CLIENT client=hackrf-nodejs type=receiver");
    logger.info('Sent client hello');
    
    // Step 2: Connection properties
    await this.delay(100);
    this.ws.send(JSON.stringify({
      type: "connectionproperties",
      params: {
        output_rate: 12000,
        hd_output_rate: 48000
      }
    }));
    logger.info('Sent connection properties');
    
    // Step 3: Start DSP
    await this.delay(100);
    this.ws.send(JSON.stringify({
      type: "dspcontrol",
      action: "start"
    }));
    logger.info('Started DSP control');
    
    // Step 4: Configure for wideband scanning
    await this.delay(100);
    this.ws.send(JSON.stringify({
      type: "dspcontrol",
      params: {
        low_cut: -4000,
        high_cut: 4000,
        offset_freq: 0,
        mod: "nfm",
        squelch_level: -150,
        secondary_mod: false
      }
    }));
    logger.info('Configured demodulator - waiting for FFT data...');
  }
  
  private handleMessage(data: WebSocket.Data): void {
    try {
      if (typeof data === 'string') {
        this.handleTextMessage(data);
      } else if (data instanceof Buffer) {
        this.handleBinaryMessage(data);
      }
    } catch (error) {
      logger.error('Error processing message:', error);
      this.callbacks.onError?.(error.message);
    }
  }
  
  private handleTextMessage(message: string): void {
    if (message.startsWith("CLIENT DE SERVER")) {
      logger.info(`Server handshake: ${message}`);
      return;
    }
    
    try {
      const data = JSON.parse(message);
      if (data.type === 'config') {
        const config = data.value;
        this.config = {
          fft_size: config.fft_size || 0,
          center_freq: config.center_freq || 0,
          samp_rate: config.samp_rate || 0,
          fft_compression: config.fft_compression || 'none'
        };
        
        logger.info('OpenWebRX Config received:', {
          center_freq: `${this.config.center_freq / 1e6} MHz`,
          sample_rate: `${this.config.samp_rate / 1e6} MHz`,
          fft_size: this.config.fft_size,
          compression: this.config.fft_compression
        });
        
        this.configReceived = true;
        this.callbacks.onConfig?.(this.config);
      }
    } catch (e) {
      // Not JSON, ignore
    }
  }
  
  private handleBinaryMessage(buffer: Buffer): void {
    if (buffer.length < 1) return;
    
    const messageType = buffer[0];
    const payload = buffer.slice(1);
    
    if (messageType === 1) { // FFT waterfall data
      logger.debug(`FFT Data received: ${payload.length} bytes`);
      const fftData = this.parseFFTData(payload);
      
      if (fftData && fftData.length > 0) {
        const hackrfFFTData: HackRFFFTData = {
          timestamp: Date.now(),
          center_freq: this.config.center_freq,
          sample_rate: this.config.samp_rate,
          bandwidth: this.config.samp_rate,
          fft_size: fftData.length,
          fft_data: fftData,
          compression: 'none'
        };
        
        this.callbacks.onFFTData?.(hackrfFFTData);
        
        logger.debug(`FFT processed: ${fftData.length} bins, range: ${fftData[0].toFixed(1)} to ${fftData[fftData.length - 1].toFixed(1)} dB`);
      }
    }
  }
  
  private parseFFTData(payload: Buffer): number[] | null {
    try {
      const dataLen = payload.length;
      logger.debug(`Parsing FFT payload: ${dataLen} bytes`);
      
      // Method 1: Try as Float32 if divisible by 4
      if (dataLen % 4 === 0) {
        try {
          const floatArray = new Float32Array(payload.buffer, payload.byteOffset, dataLen / 4);
          if (floatArray.length > 0) {
            logger.debug(`Parsed as Float32: ${floatArray.length} bins`);
            return Array.from(floatArray);
          }
        } catch (e) {
          // Continue to next method
        }
      }
      
      // Method 2: Try as 8-bit unsigned (common for waterfall)
      try {
        const uint8Array = new Uint8Array(payload);
        // Convert to dB scale (rough approximation)
        const dbArray = Array.from(uint8Array).map(val => (val - 127) * 0.5 - 60);
        logger.debug(`Parsed as UInt8 to dB: ${dbArray.length} bins`);
        return dbArray;
      } catch (e) {
        // Continue to next method
      }
      
      // Method 3: Try as 16-bit integers
      if (dataLen % 2 === 0) {
        try {
          const int16Array = new Int16Array(payload.buffer, payload.byteOffset, dataLen / 2);
          // Convert to dB scale
          const dbArray = Array.from(int16Array).map(val => (val / 327.68) - 100);
          logger.debug(`Parsed as Int16 to dB: ${dbArray.length} bins`);
          return dbArray;
        } catch (e) {
          // Continue
        }
      }
      
      logger.warn(`Could not parse FFT data: ${dataLen} bytes`);
      return null;
      
    } catch (error) {
      logger.error('FFT parsing error:', error);
      return null;
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
/**
 * FFT Data Processor
 * Handles FFT data processing, windowing, and optimization
 */

import { HackRFFFTData } from '../kismet-operations/types/hackrf';
import { logger } from './logger';

export class FFTDataProcessor {
  private windowCache: Map<string, Float32Array> = new Map();
  
  constructor(private config: {
    enableWindowing?: boolean;
    windowType?: 'hann' | 'hamming' | 'blackman' | 'rectangular';
    enableSmoothing?: boolean;
    smoothingFactor?: number;
  } = {}) {
    this.config.enableWindowing = config.enableWindowing ?? true;
    this.config.windowType = config.windowType ?? 'hann';
    this.config.enableSmoothing = config.enableSmoothing ?? false;
    this.config.smoothingFactor = config.smoothingFactor ?? 0.3;
  }
  
  process(fftData: HackRFFFTData): HackRFFFTData {
    let processedData = { ...fftData };
    
    // Convert to Float32Array if needed
    if (Array.isArray(fftData.fft_data)) {
      processedData.fft_data = new Float32Array(fftData.fft_data);
    }
    
    // Apply window function if enabled
    if (this.config.enableWindowing && this.config.windowType !== 'rectangular') {
      processedData.fft_data = this.applyWindow(
        processedData.fft_data as Float32Array,
        this.config.windowType!
      );
    }
    
    // Apply smoothing if enabled
    if (this.config.enableSmoothing) {
      processedData.fft_data = this.applySmoothing(
        processedData.fft_data as Float32Array,
        this.config.smoothingFactor!
      );
    }
    
    // Calculate additional metrics
    const stats = this.calculateStats(processedData.fft_data as Float32Array);
    processedData.peak_power = stats.peak;
    processedData.noise_floor = stats.noiseFloor;
    
    return processedData;
  }
  
  applyWindow(data: Float32Array, windowType: 'hann' | 'hamming' | 'blackman'): Float32Array {
    const n = data.length;
    const cacheKey = `${windowType}-${n}`;
    
    // Get or create window coefficients
    let window = this.windowCache.get(cacheKey);
    if (!window) {
      window = this.generateWindow(n, windowType);
      this.windowCache.set(cacheKey, window);
    }
    
    // Apply window
    const windowed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      windowed[i] = data[i] * window[i];
    }
    
    return windowed;
  }
  
  private generateWindow(n: number, type: 'hann' | 'hamming' | 'blackman'): Float32Array {
    const window = new Float32Array(n);
    
    switch (type) {
      case 'hann':
        for (let i = 0; i < n; i++) {
          window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
        }
        break;
        
      case 'hamming':
        for (let i = 0; i < n; i++) {
          window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (n - 1));
        }
        break;
        
      case 'blackman':
        for (let i = 0; i < n; i++) {
          const a0 = 0.42;
          const a1 = 0.5;
          const a2 = 0.08;
          window[i] = a0 - a1 * Math.cos(2 * Math.PI * i / (n - 1)) + 
                      a2 * Math.cos(4 * Math.PI * i / (n - 1));
        }
        break;
    }
    
    return window;
  }
  
  private applySmoothing(data: Float32Array, factor: number): Float32Array {
    const smoothed = new Float32Array(data.length);
    
    // Simple exponential smoothing
    smoothed[0] = data[0];
    for (let i = 1; i < data.length; i++) {
      smoothed[i] = factor * data[i] + (1 - factor) * smoothed[i - 1];
    }
    
    return smoothed;
  }
  
  private calculateStats(data: Float32Array): {
    peak: number;
    noiseFloor: number;
    mean: number;
    variance: number;
  } {
    let peak = -Infinity;
    let sum = 0;
    
    // Find peak and calculate mean
    for (let i = 0; i < data.length; i++) {
      if (data[i] > peak) peak = data[i];
      sum += data[i];
    }
    
    const mean = sum / data.length;
    
    // Calculate variance
    let variance = 0;
    for (let i = 0; i < data.length; i++) {
      variance += Math.pow(data[i] - mean, 2);
    }
    variance /= data.length;
    
    // Estimate noise floor using sorted percentile
    const sorted = Array.from(data).sort((a, b) => a - b);
    const noiseFloor = sorted[Math.floor(sorted.length * 0.25)];
    
    return { peak, noiseFloor, mean, variance };
  }
  
  // Convert linear magnitude to dBm
  magnitudeToDBm(magnitude: number, reference: number = 1.0): number {
    return 20 * Math.log10(magnitude / reference);
  }
  
  // Convert dBm to linear magnitude
  dBmToMagnitude(dBm: number, reference: number = 1.0): number {
    return reference * Math.pow(10, dBm / 20);
  }
  
  // Binary data packing for efficient transfer
  packFFTData(fftData: HackRFFFTData): Buffer {
    const fftArray = Array.isArray(fftData.fft_data) 
      ? fftData.fft_data 
      : Array.from(fftData.fft_data);
    
    // Header: 32 bytes
    const header = Buffer.alloc(32);
    header.writeUInt32BE(0x48524654, 0); // Magic: 'HRFT'
    header.writeUInt32BE(1, 4); // Version
    header.writeFloatBE(fftData.timestamp, 8);
    header.writeFloatBE(fftData.center_freq, 12);
    header.writeFloatBE(fftData.sample_rate, 16);
    header.writeUInt32BE(fftArray.length, 20);
    header.writeUInt8(0, 24); // Data type: 0 = float32
    header.writeUInt8(0, 25); // Compression: 0 = none
    
    // Data
    const dataBuffer = Buffer.allocUnsafe(fftArray.length * 4);
    for (let i = 0; i < fftArray.length; i++) {
      dataBuffer.writeFloatBE(fftArray[i], i * 4);
    }
    
    return Buffer.concat([header, dataBuffer]);
  }
  
  // Unpack binary FFT data
  unpackFFTData(buffer: Buffer): HackRFFFTData | null {
    if (buffer.length < 32) {
      logger.error('Buffer too small for FFT header');
      return null;
    }
    
    // Read header
    const magic = buffer.readUInt32BE(0);
    if (magic !== 0x48524654) {
      logger.error('Invalid magic number in FFT data');
      return null;
    }
    
    const version = buffer.readUInt32BE(4);
    const timestamp = buffer.readFloatBE(8);
    const centerFreq = buffer.readFloatBE(12);
    const sampleRate = buffer.readFloatBE(16);
    const fftSize = buffer.readUInt32BE(20);
    const dataType = buffer.readUInt8(24);
    const compression = buffer.readUInt8(25);
    
    // Read data
    const dataStart = 32;
    const fftData = new Float32Array(fftSize);
    
    if (dataType === 0) { // float32
      for (let i = 0; i < fftSize; i++) {
        fftData[i] = buffer.readFloatBE(dataStart + i * 4);
      }
    }
    
    return {
      timestamp,
      center_freq: centerFreq,
      sample_rate: sampleRate,
      bandwidth: sampleRate,
      fft_size: fftSize,
      fft_data: fftData,
      compression: compression === 0 ? 'none' : compression === 1 ? 'gzip' : 'zlib'
    };
  }
}
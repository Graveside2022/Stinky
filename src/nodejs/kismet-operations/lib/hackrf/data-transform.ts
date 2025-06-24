/**
 * HackRF Data Transformation Utilities
 * Handles conversion between HackRF data formats and system types
 */

import {
  HackRFSignal,
  HackRFFFTData,
  HackRFDataTransform,
  HackRFBinaryHeader
} from '../../types/hackrf';
import { SignalDetection, Signal, FFTData } from '../../types';

/**
 * Window functions for FFT processing
 */
const windowFunctions = {
  hann: (n: number, N: number) => 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))),
  hamming: (n: number, N: number) => 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)),
  blackman: (n: number, N: number) => 
    0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) + 
    0.08 * Math.cos(4 * Math.PI * n / (N - 1)),
  rectangular: () => 1.0
};

/**
 * Apply window function to FFT data
 */
export function applyWindow(
  data: Float32Array | number[], 
  windowType: keyof typeof windowFunctions = 'hann'
): Float32Array {
  const result = new Float32Array(data.length);
  const windowFn = windowFunctions[windowType];
  
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] * windowFn(i, data.length);
  }
  
  return result;
}

/**
 * Convert linear magnitude to dBm
 */
export function convertToDBm(magnitude: number, impedance: number = 50): number {
  if (magnitude <= 0) return -120; // Floor value
  
  // Convert to power (assuming magnitude is voltage)
  const power = (magnitude * magnitude) / impedance;
  
  // Convert to dBm (dB relative to 1 milliwatt)
  return 10 * Math.log10(power * 1000);
}

/**
 * Convert dBm to linear magnitude
 */
export function convertFromDBm(dbm: number, impedance: number = 50): number {
  // Convert from dBm to watts
  const watts = Math.pow(10, dbm / 10) / 1000;
  
  // Convert to voltage magnitude
  return Math.sqrt(watts * impedance);
}

/**
 * Estimate noise floor from spectrum data
 */
export function estimateNoiseFloor(spectrum: number[], percentile: number = 20): number {
  const sorted = [...spectrum].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * percentile / 100);
  return sorted[index];
}

/**
 * Detect peaks in spectrum data
 */
export function detectPeaks(
  spectrum: number[], 
  threshold: number,
  minDistance: number = 5
): number[] {
  const peaks: number[] = [];
  
  for (let i = 1; i < spectrum.length - 1; i++) {
    const current = spectrum[i];
    const prev = spectrum[i - 1];
    const next = spectrum[i + 1];
    
    // Check if it's a local maximum above threshold
    if (current > threshold && current > prev && current > next) {
      // Check minimum distance from last peak
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      }
    }
  }
  
  return peaks;
}

/**
 * Convert HackRF signal to system SignalDetection format
 */
export function hackrfSignalToDetection(
  signal: HackRFSignal,
  location: { lat: number; lon: number }
): SignalDetection {
  return {
    id: signal.id,
    source: 'hackrf',
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
      duration: signal.duration,
      ...signal.metadata
    }
  };
}

/**
 * Convert HackRF signal to simple Signal format
 */
export function hackrfSignalToSimple(signal: HackRFSignal): Signal {
  return {
    id: signal.id,
    frequency: signal.frequency,
    power: signal.power,
    bandwidth: signal.bandwidth,
    confidence: signal.confidence,
    type: signal.modulation,
    snr: signal.snr,
    modulation: signal.modulation
  };
}

/**
 * Convert HackRF FFT data to system FFT format
 */
export function hackrfFFTToSystem(hackrfFFT: HackRFFFTData): FFTData {
  return {
    timestamp: hackrfFFT.timestamp,
    frequency: hackrfFFT.center_freq,
    sample_rate: hackrfFFT.sample_rate,
    fft_data: Array.from(hackrfFFT.fft_data),
    fft_size: hackrfFFT.fft_size
  };
}

/**
 * Calculate Signal-to-Noise Ratio (SNR)
 */
export function calculateSNR(
  signalPower: number,
  noiseFloor: number
): number {
  return signalPower - noiseFloor;
}

/**
 * Estimate signal bandwidth using 3dB down method
 */
export function estimateBandwidth(
  spectrum: number[],
  peakIndex: number,
  binWidth: number
): number {
  const peakPower = spectrum[peakIndex];
  const threshold = peakPower - 3; // 3dB down
  
  let leftIndex = peakIndex;
  let rightIndex = peakIndex;
  
  // Find left edge
  while (leftIndex > 0 && spectrum[leftIndex] > threshold) {
    leftIndex--;
  }
  
  // Find right edge
  while (rightIndex < spectrum.length - 1 && spectrum[rightIndex] > threshold) {
    rightIndex++;
  }
  
  return (rightIndex - leftIndex) * binWidth;
}

/**
 * Calculate frequency for FFT bin
 */
export function binToFrequency(
  bin: number,
  fftSize: number,
  sampleRate: number,
  centerFreq: number
): number {
  const binWidth = sampleRate / fftSize;
  return centerFreq + (bin - fftSize / 2) * binWidth;
}

/**
 * Calculate FFT bin for frequency
 */
export function frequencyToBin(
  frequency: number,
  fftSize: number,
  sampleRate: number,
  centerFreq: number
): number {
  const binWidth = sampleRate / fftSize;
  const offset = frequency - centerFreq;
  return Math.round(fftSize / 2 + offset / binWidth);
}

/**
 * Smooth spectrum data using moving average
 */
export function smoothSpectrum(
  spectrum: number[],
  windowSize: number = 3
): number[] {
  const result = new number[spectrum.length];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < spectrum.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - halfWindow); 
         j <= Math.min(spectrum.length - 1, i + halfWindow); 
         j++) {
      sum += spectrum[j];
      count++;
    }
    
    result[i] = sum / count;
  }
  
  return result;
}

/**
 * Decimate spectrum data for display
 */
export function decimateSpectrum(
  spectrum: number[],
  targetSize: number
): number[] {
  if (spectrum.length <= targetSize) {
    return [...spectrum];
  }
  
  const decimationFactor = spectrum.length / targetSize;
  const result = new Array(targetSize);
  
  for (let i = 0; i < targetSize; i++) {
    const startIdx = Math.floor(i * decimationFactor);
    const endIdx = Math.floor((i + 1) * decimationFactor);
    
    // Take maximum value in each bin (peak-hold decimation)
    let maxVal = spectrum[startIdx];
    for (let j = startIdx + 1; j < endIdx && j < spectrum.length; j++) {
      if (spectrum[j] > maxVal) {
        maxVal = spectrum[j];
      }
    }
    
    result[i] = maxVal;
  }
  
  return result;
}

/**
 * Create binary header for efficient data transfer
 */
export function createBinaryHeader(
  messageType: number,
  timestamp: number,
  dataSize: number,
  compression: number = 0
): ArrayBuffer {
  const buffer = new ArrayBuffer(64);
  const view = new DataView(buffer);
  
  view.setUint32(0, 0x48524654, true); // Magic 'HRFT'
  view.setUint32(4, 1, true); // Version
  view.setUint32(8, messageType, true);
  view.setBigUint64(12, BigInt(timestamp), true);
  view.setUint32(20, compression, true);
  view.setUint32(24, dataSize, true);
  
  // Rest is reserved for future use
  
  return buffer;
}

/**
 * Pack FFT data into binary format
 */
export function packFFTData(fftData: HackRFFFTData): ArrayBuffer {
  const fftArray = Array.isArray(fftData.fft_data) 
    ? new Float32Array(fftData.fft_data)
    : fftData.fft_data;
    
  const dataSize = 36 + fftArray.length * 4;
  const buffer = new ArrayBuffer(dataSize);
  const view = new DataView(buffer);
  
  view.setFloat64(0, fftData.center_freq, true);
  view.setFloat64(8, fftData.sample_rate, true);
  view.setFloat64(16, fftData.bandwidth || fftData.sample_rate, true);
  view.setUint32(24, fftData.fft_size, true);
  view.setFloat32(28, fftData.peak_power || -100, true);
  view.setFloat32(32, fftData.noise_floor || -100, true);
  
  // Copy FFT data
  for (let i = 0; i < fftArray.length; i++) {
    view.setFloat32(36 + i * 4, fftArray[i], true);
  }
  
  return buffer;
}

/**
 * Unpack binary FFT data
 */
export function unpackFFTData(buffer: ArrayBuffer, timestamp: number): HackRFFFTData {
  const view = new DataView(buffer);
  
  const centerFreq = view.getFloat64(0, true);
  const sampleRate = view.getFloat64(8, true);
  const bandwidth = view.getFloat64(16, true);
  const fftSize = view.getUint32(24, true);
  const peakPower = view.getFloat32(28, true);
  const noiseFloor = view.getFloat32(32, true);
  
  const fftData = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    fftData[i] = view.getFloat32(36 + i * 4, true);
  }
  
  return {
    timestamp,
    center_freq: centerFreq,
    sample_rate: sampleRate,
    bandwidth,
    fft_size: fftSize,
    fft_data: fftData,
    peak_power: peakPower,
    noise_floor: noiseFloor
  };
}

/**
 * Data transform implementation
 */
export const dataTransform: HackRFDataTransform = {
  applyWindow,
  convertToDBm,
  estimateNoise: estimateNoiseFloor,
  detectPeaks
};

/**
 * Calculate waterfall color from power level
 */
export function powerToColor(
  power: number,
  minPower: number = -120,
  maxPower: number = -30
): { r: number; g: number; b: number } {
  // Normalize to 0-1
  const normalized = Math.max(0, Math.min(1, 
    (power - minPower) / (maxPower - minPower)
  ));
  
  // Use a color gradient (blue -> green -> yellow -> red)
  let r, g, b;
  
  if (normalized < 0.25) {
    // Blue to cyan
    r = 0;
    g = normalized * 4;
    b = 1;
  } else if (normalized < 0.5) {
    // Cyan to green
    r = 0;
    g = 1;
    b = 1 - (normalized - 0.25) * 4;
  } else if (normalized < 0.75) {
    // Green to yellow
    r = (normalized - 0.5) * 4;
    g = 1;
    b = 0;
  } else {
    // Yellow to red
    r = 1;
    g = 1 - (normalized - 0.75) * 4;
    b = 0;
  }
  
  return {
    r: Math.floor(r * 255),
    g: Math.floor(g * 255),
    b: Math.floor(b * 255)
  };
}
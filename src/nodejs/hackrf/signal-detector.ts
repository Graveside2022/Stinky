/**
 * Signal Detection Module
 * Detects signals in FFT data and estimates their properties
 */

import { HackRFFFTData, HackRFSignal } from '../kismet-operations/types/hackrf';
import { logger } from './logger';

export interface ScanProfile {
  name: string;
  ranges: Array<[number, number]>; // Frequency ranges in MHz
  step: number; // Step size in kHz
  description: string;
}

export class SignalDetector {
  private signalThreshold: number = -70; // dBm threshold for signal detection
  private minSNR: number = 6; // Minimum SNR in dB
  
  constructor(config?: {
    signalThreshold?: number;
    minSNR?: number;
  }) {
    if (config?.signalThreshold) this.signalThreshold = config.signalThreshold;
    if (config?.minSNR) this.minSNR = config.minSNR;
  }
  
  detectSignals(fftData: HackRFFFTData, profile?: ScanProfile): HackRFSignal[] {
    const signals: HackRFSignal[] = [];
    
    if (!fftData || !fftData.fft_data || fftData.fft_data.length === 0) {
      return signals;
    }
    
    const powers = Array.isArray(fftData.fft_data) ? fftData.fft_data : Array.from(fftData.fft_data);
    const centerFreq = fftData.center_freq;
    const sampleRate = fftData.sample_rate;
    const numBins = powers.length;
    const freqBinWidth = sampleRate / numBins; // Hz per bin
    const freqStart = centerFreq - (sampleRate / 2); // Start frequency
    
    // Estimate noise floor
    const noiseFloor = this.estimateNoiseFloor(powers);
    
    logger.debug(`Peak detection: ${numBins} bins, ${(freqBinWidth / 1000).toFixed(1)} kHz/bin, noise floor: ${noiseFloor.toFixed(1)} dB`);
    
    // Find peaks above threshold
    for (let i = 2; i < powers.length - 2; i++) {
      const currentPower = powers[i];
      
      // Enhanced peak detection - check if it's a local maximum
      if (this.isPeak(powers, i) && 
          currentPower > this.signalThreshold &&
          currentPower > noiseFloor + this.minSNR) {
        
        // Calculate actual frequency
        const frequency = freqStart + (i * freqBinWidth); // Hz
        
        // Check if in profile range (if profile provided)
        if (profile) {
          const frequencyMHz = frequency / 1e6;
          const inRange = profile.ranges.some(([start, end]) => 
            frequencyMHz >= start && frequencyMHz <= end
          );
          if (!inRange) continue;
        }
        
        const bandwidth = this.estimateBandwidth(powers, i, freqBinWidth);
        const snr = currentPower - noiseFloor;
        const confidence = this.calculateConfidence(currentPower, snr);
        
        signals.push({
          id: `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          frequency,
          power: currentPower,
          bandwidth,
          snr,
          confidence,
          timestamp: fftData.timestamp
        });
      }
    }
    
    logger.info(`Found ${signals.length} signal peaks${profile ? ` for ${profile.name}` : ''}`);
    
    // Sort by power (strongest first)
    signals.sort((a, b) => b.power - a.power);
    
    return signals;
  }
  
  private isPeak(powers: number[], index: number): boolean {
    // Check if current bin is higher than surrounding bins
    return powers[index] > powers[index - 1] &&
           powers[index] > powers[index + 1] &&
           powers[index] > powers[index - 2] &&
           powers[index] > powers[index + 2];
  }
  
  private estimateNoiseFloor(powers: number[]): number {
    // Use median as a robust estimate of noise floor
    const sorted = [...powers].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Alternative: use lower percentile
    const percentile25 = sorted[Math.floor(sorted.length * 0.25)];
    
    // Return the higher of the two (more conservative)
    return Math.max(median, percentile25);
  }
  
  private estimateBandwidth(powers: number[], peakIndex: number, freqBinWidth: number): number {
    const peakPower = powers[peakIndex];
    const threshold = peakPower - 3; // -3dB point
    
    // Find left edge
    let leftEdge = peakIndex;
    for (let i = peakIndex - 1; i >= 0; i--) {
      if (powers[i] < threshold) break;
      leftEdge = i;
    }
    
    // Find right edge
    let rightEdge = peakIndex;
    for (let i = peakIndex + 1; i < powers.length; i++) {
      if (powers[i] < threshold) break;
      rightEdge = i;
    }
    
    // Calculate bandwidth in Hz
    const bandwidthBins = rightEdge - leftEdge + 1;
    return bandwidthBins * freqBinWidth;
  }
  
  private calculateConfidence(power: number, snr: number): number {
    // Simple confidence calculation based on power and SNR
    const powerFactor = Math.min(1, Math.max(0, (power - this.signalThreshold) / 30));
    const snrFactor = Math.min(1, Math.max(0, (snr - this.minSNR) / 20));
    
    return (powerFactor + snrFactor) / 2;
  }
  
  // Update detection parameters
  setThreshold(threshold: number): void {
    this.signalThreshold = threshold;
  }
  
  setMinSNR(snr: number): void {
    this.minSNR = snr;
  }
}
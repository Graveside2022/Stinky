/**
 * Scan Profile Manager
 * Manages frequency scanning profiles and demo signal generation
 */

import { ScanProfile } from './signal-detector';

export const SCAN_PROFILES: { [key: string]: ScanProfile } = {
  vhf: {
    name: 'VHF Amateur (144-148 MHz)',
    ranges: [[144.0, 148.0]],
    step: 25, // kHz
    description: 'VHF Amateur Radio Band'
  },
  uhf: {
    name: 'UHF Amateur (420-450 MHz)',
    ranges: [[420.0, 450.0]],
    step: 25,
    description: 'UHF Amateur Radio Band'
  },
  ism: {
    name: 'ISM Band (2.4 GHz)',
    ranges: [[2400.0, 2485.0]],
    step: 1000, // MHz for ISM
    description: 'Industrial, Scientific, Medical Band'
  },
  airband: {
    name: 'Airband (118-137 MHz)',
    ranges: [[118.0, 137.0]],
    step: 25,
    description: 'Aviation Communication Band'
  },
  marine: {
    name: 'Marine VHF (156-162 MHz)',
    ranges: [[156.0, 162.0]],
    step: 25,
    description: 'Marine VHF Radio Band'
  },
  gsm900: {
    name: 'GSM 900 (880-960 MHz)',
    ranges: [[880.0, 915.0], [925.0, 960.0]],
    step: 200,
    description: 'GSM 900 MHz Band'
  },
  gsm1800: {
    name: 'GSM 1800 (1710-1880 MHz)',
    ranges: [[1710.0, 1785.0], [1805.0, 1880.0]],
    step: 200,
    description: 'GSM 1800 MHz Band'
  },
  wifi5: {
    name: 'WiFi 5 GHz (5150-5850 MHz)',
    ranges: [[5150.0, 5350.0], [5470.0, 5850.0]],
    step: 20000,
    description: '5 GHz WiFi Bands'
  }
};

export class ScanProfileManager {
  constructor() {}
  
  getProfile(profileId: string): ScanProfile | null {
    return SCAN_PROFILES[profileId] || null;
  }
  
  getAllProfiles(): { [key: string]: ScanProfile } {
    return { ...SCAN_PROFILES };
  }
  
  // Generate demo signals for testing
  generateDemoSignals(profile: ScanProfile): any[] {
    const signals: any[] = [];
    
    for (const [start, end] of profile.ranges) {
      const numSignals = Math.floor(Math.random() * 5) + 3; // 3-8 signals per range
      
      for (let i = 0; i < numSignals; i++) {
        // Random frequency within range
        const freq = start + Math.random() * (end - start);
        
        // Random signal parameters
        const strength = -80 + Math.random() * 40; // -80 to -40 dBm
        const bandwidth = 5 + Math.random() * 45; // 5 to 50 kHz
        const confidence = 0.3 + Math.random() * 0.6; // 0.3 to 0.9
        
        signals.push({
          id: `demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          frequency: freq.toFixed(3),
          strength: strength.toFixed(1),
          bandwidth: bandwidth.toFixed(1),
          confidence,
          type: 'demo'
        });
      }
    }
    
    return signals;
  }
  
  // Check if a frequency is within a profile's ranges
  isFrequencyInProfile(frequency: number, profileId: string): boolean {
    const profile = this.getProfile(profileId);
    if (!profile) return false;
    
    const freqMHz = frequency / 1e6;
    return profile.ranges.some(([start, end]) => 
      freqMHz >= start && freqMHz <= end
    );
  }
  
  // Get the appropriate profile for a given frequency
  getProfileForFrequency(frequency: number): string | null {
    const freqMHz = frequency / 1e6;
    
    for (const [id, profile] of Object.entries(SCAN_PROFILES)) {
      const inRange = profile.ranges.some(([start, end]) => 
        freqMHz >= start && freqMHz <= end
      );
      if (inRange) return id;
    }
    
    return null;
  }
  
  // Create a custom profile
  createCustomProfile(
    name: string,
    ranges: Array<[number, number]>,
    step: number,
    description?: string
  ): ScanProfile {
    return {
      name,
      ranges,
      step,
      description: description || `Custom profile: ${name}`
    };
  }
  
  // Validate profile ranges
  validateProfile(profile: ScanProfile): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!profile.name || profile.name.trim() === '') {
      errors.push('Profile name is required');
    }
    
    if (!profile.ranges || profile.ranges.length === 0) {
      errors.push('At least one frequency range is required');
    }
    
    for (const [start, end] of profile.ranges) {
      if (start >= end) {
        errors.push(`Invalid range: ${start}-${end} MHz (start must be less than end)`);
      }
      if (start < 0 || end < 0) {
        errors.push(`Invalid range: ${start}-${end} MHz (frequencies must be positive)`);
      }
    }
    
    if (profile.step <= 0) {
      errors.push('Step size must be positive');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
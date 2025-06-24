// HackRF API Service
import { buildApiUrl } from '../../config';
import type { SpectrumData, HackRFConfig, SignalInfo } from '../../types.js';

export class HackRFAPI {
  // Get current HackRF status
  async getStatus(): Promise<{ connected: boolean; config: HackRFConfig }> {
    const response = await fetch(buildApiUrl('hackrf', '/api/status'));
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }
    return response.json();
  }

  // Get current configuration
  async getConfig(): Promise<HackRFConfig> {
    const response = await fetch(buildApiUrl('hackrf', '/api/config'));
    if (!response.ok) {
      throw new Error(`Failed to get config: ${response.statusText}`);
    }
    return response.json();
  }

  // Update configuration
  async updateConfig(config: Partial<HackRFConfig>): Promise<HackRFConfig> {
    const response = await fetch(buildApiUrl('hackrf', '/api/config'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error(`Failed to update config: ${response.statusText}`);
    }
    return response.json();
  }

  // Get current spectrum data
  async getSpectrumData(): Promise<SpectrumData> {
    const response = await fetch(buildApiUrl('hackrf', '/api/spectrum'));
    if (!response.ok) {
      throw new Error(`Failed to get spectrum data: ${response.statusText}`);
    }
    return response.json();
  }

  // Get detected signals
  async getSignals(): Promise<SignalInfo[]> {
    const response = await fetch(buildApiUrl('hackrf', '/api/signals'));
    if (!response.ok) {
      throw new Error(`Failed to get signals: ${response.statusText}`);
    }
    return response.json();
  }

  // Start spectrum analyzer
  async start(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(buildApiUrl('hackrf', '/api/control/start'), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to start: ${response.statusText}`);
    }
    return response.json();
  }

  // Stop spectrum analyzer
  async stop(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(buildApiUrl('hackrf', '/api/control/stop'), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to stop: ${response.statusText}`);
    }
    return response.json();
  }

  // Get OpenWebRX integration status
  async getOpenWebRXStatus(): Promise<{ 
    connected: boolean; 
    url: string; 
    lastUpdate: string;
  }> {
    const response = await fetch(buildApiUrl('hackrf', '/api/openwebrx/status'));
    if (!response.ok) {
      throw new Error(`Failed to get OpenWebRX status: ${response.statusText}`);
    }
    return response.json();
  }
}

// Export singleton instance
export const hackrfAPI = new HackRFAPI();
// WigleToTAK API Service
import { buildApiUrl } from '../../config';
import type { WigleDevice, TAKConfig, BroadcastStatus } from '../../types.js';

export class WigleAPI {
  // Get current status
  async getStatus(): Promise<{
    processing: boolean;
    filesProcessed: number;
    devicesFound: number;
    takSettings: TAKConfig;
    multicastEnabled: boolean;
  }> {
    const response = await fetch(buildApiUrl('wigle', '/api/status'));
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }
    return response.json();
  }

  // Get list of devices
  async getDevices(): Promise<WigleDevice[]> {
    const response = await fetch(buildApiUrl('wigle', '/api/devices'));
    if (!response.ok) {
      throw new Error(`Failed to get devices: ${response.statusText}`);
    }
    return response.json();
  }

  // Get filtered devices
  async getFilteredDevices(filters: {
    whitelist?: string[];
    blacklist?: string[];
  }): Promise<WigleDevice[]> {
    const params = new URLSearchParams();
    if (filters.whitelist) {
      params.append('whitelist', filters.whitelist.join(','));
    }
    if (filters.blacklist) {
      params.append('blacklist', filters.blacklist.join(','));
    }
    
    const response = await fetch(buildApiUrl('wigle', `/api/devices?${params}`));
    if (!response.ok) {
      throw new Error(`Failed to get filtered devices: ${response.statusText}`);
    }
    return response.json();
  }

  // Update TAK settings
  async updateTAKSettings(settings: Partial<TAKConfig>): Promise<{
    message: string;
    settings: TAKConfig;
  }> {
    const response = await fetch(buildApiUrl('wigle', '/update_tak_settings'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error(`Failed to update TAK settings: ${response.statusText}`);
    }
    return response.json();
  }

  // Toggle multicast
  async setMulticastState(enabled: boolean): Promise<{
    message: string;
    enabled: boolean;
  }> {
    const response = await fetch(buildApiUrl('wigle', '/update_multicast_state'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ takMulticast: enabled }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update multicast state: ${response.statusText}`);
    }
    return response.json();
  }

  // Get broadcast status
  async getBroadcastStatus(): Promise<BroadcastStatus> {
    const response = await fetch(buildApiUrl('wigle', '/api/broadcast/status'));
    if (!response.ok) {
      throw new Error(`Failed to get broadcast status: ${response.statusText}`);
    }
    return response.json();
  }

  // Start broadcasting
  async startBroadcast(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(buildApiUrl('wigle', '/api/broadcast/start'), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to start broadcast: ${response.statusText}`);
    }
    return response.json();
  }

  // Stop broadcasting
  async stopBroadcast(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(buildApiUrl('wigle', '/api/broadcast/stop'), {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to stop broadcast: ${response.statusText}`);
    }
    return response.json();
  }

  // Update antenna sensitivity
  async updateAntennaSensitivity(sensitivity: string): Promise<{
    message: string;
    sensitivity: string;
  }> {
    const response = await fetch(buildApiUrl('wigle', '/api/antenna/sensitivity'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sensitivity }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update antenna sensitivity: ${response.statusText}`);
    }
    return response.json();
  }

  // Update filters
  async updateFilters(filters: {
    whitelist?: string[];
    blacklist?: string[];
  }): Promise<{ message: string; filters: typeof filters }> {
    const response = await fetch(buildApiUrl('wigle', '/api/filters'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });
    if (!response.ok) {
      throw new Error(`Failed to update filters: ${response.statusText}`);
    }
    return response.json();
  }
}

// Export singleton instance
export const wigleAPI = new WigleAPI();
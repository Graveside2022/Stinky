// This file contains the remaining parts of server.ts
// It will be merged into the main server.ts file

// Import required types and modules
import type { Request, Response } from 'express';
import type {
  Signal,
  SignalDetection,
  SignalFilters,
  KismetDataResponse,
  ScanProfile,
  ScanResult,
  KismetDevice,
  KismetNetwork
} from './types';

// Demo signal generation for backward compatibility
export function generateDemoSignals(profile: ScanProfile): Signal[] {
  const signals: Signal[] = [];
  
  for (const range of profile.ranges) {
    const [start, end] = range;
    for (let freq = start; freq < end; freq += profile.step / 1000) {
      if (Math.random() < 0.3) { // 30% chance
        signals.push({
          id: `demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          frequency: (freq * 1000000), // Convert to Hz
          strength: (Math.random() * 40 - 80).toFixed(1), // -80 to -40 dBm
          power: (Math.random() * 40 - 80), // Same as strength for compatibility
          bandwidth: (Math.random() * 20 + 5).toFixed(1), // 5-25 kHz
          confidence: Math.random() * 0.6 + 0.3, // 0.3-0.9
          type: 'demo'
        });
      }
    }
  }
  
  return signals;
}

// Check if Kismet is available and responding
export async function checkKismetConnection(config: any): Promise<boolean> {
  try {
    const axios = require('axios');
    const response = await axios.get(`${config.baseUrl}/system/status`, {
      timeout: config.timeout,
      headers: {
        'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
      }
    });
    
    return response.status === 200;
  } catch (error) {
    const logger = require('winston');
    logger.debug('Kismet connection check failed', { error: (error as Error).message });
    return false;
  }
}

// Fetch data from Kismet API
export async function fetchKismetData(config: any): Promise<any> {
  const axios = require('axios');
  
  try {
    // Fetch both devices and networks from Kismet
    const [devicesResponse, networksResponse] = await Promise.all([
      axios.get(`${config.baseUrl}/devices/all_devices`, {
        timeout: config.timeout,
        headers: {
          'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
        }
      }),
      axios.get(`${config.baseUrl}/devices/all_ssids`, {
        timeout: config.timeout,
        headers: {
          'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
        }
      })
    ]);
    
    return {
      devices: devicesResponse.data || [],
      networks: networksResponse.data || []
    };
  } catch (error) {
    const logger = require('winston');
    logger.error('Failed to fetch Kismet data', { error: (error as Error).message });
    throw error;
  }
}

// Transform Kismet data to frontend-expected format
export function transformKismetData(kismetData: any): {
  devices: KismetDevice[];
  networks: KismetNetwork[];
  timestamp: number;
} {
  const transformedDevices = (kismetData.devices || []).map((device: any) => ({
    mac: device['kismet.device.base.macaddr'] || 'unknown',
    last_seen: device['kismet.device.base.last_time'] || Date.now() / 1000,
    signal: device['kismet.device.base.signal'] || {
      'kismet.common.signal.last_signal': -80,
      'kismet.common.signal.max_signal': -70,
      'kismet.common.signal.min_signal': -90
    },
    manufacturer: device['kismet.device.base.manuf'] || 'Unknown',
    type: device['kismet.device.base.type'] || 'Unknown',
    channel: device['kismet.device.base.channel'] || 0,
    frequency: device['kismet.device.base.frequency'] || 0,
    packets: device['kismet.device.base.packets.total'] || 0,
    datasize: device['kismet.device.base.datasize'] || 0,
    location: device['kismet.device.base.location'] || null
  }));
  
  const transformedNetworks = (kismetData.networks || []).map((network: any) => ({
    ssid: network['kismet.device.base.name'] || 'Hidden',
    bssid: network['kismet.device.base.macaddr'] || 'unknown',
    channel: network['kismet.device.base.channel'] || 0,
    frequency: network['kismet.device.base.frequency'] || 0,
    encryption: network['kismet.device.base.crypt'] || 'Unknown',
    last_seen: network['kismet.device.base.last_time'] || Date.now() / 1000,
    signal: network['kismet.device.base.signal'] || {
      'kismet.common.signal.last_signal': -80
    },
    clients: network['kismet.device.base.num_clients'] || 0
  }));
  
  return {
    devices: transformedDevices,
    networks: transformedNetworks,
    timestamp: Date.now()
  };
}

// Generate demo Kismet data for testing/development
export function generateDemoKismetData(): {
  devices: KismetDevice[];
  networks: KismetNetwork[];
  timestamp: number;
} {
  const demoDevices: KismetDevice[] = [];
  const demoNetworks: KismetNetwork[] = [];
  
  // Generate demo devices
  for (let i = 0; i < 10; i++) {
    demoDevices.push({
      mac: `AA:BB:CC:DD:EE:${i.toString(16).padStart(2, '0').toUpperCase()}`,
      last_seen: Date.now() / 1000 - Math.random() * 3600,
      signal: {
        'kismet.common.signal.last_signal': -60 - Math.random() * 30,
        'kismet.common.signal.max_signal': -50 - Math.random() * 20,
        'kismet.common.signal.min_signal': -80 - Math.random() * 10
      },
      manufacturer: ['Apple', 'Samsung', 'Intel', 'Broadcom', 'Realtek'][Math.floor(Math.random() * 5)],
      type: ['WiFi Client', 'WiFi AP', 'Bluetooth', 'Unknown'][Math.floor(Math.random() * 4)],
      channel: Math.floor(Math.random() * 14) + 1,
      frequency: 2412 + (Math.floor(Math.random() * 14) * 5),
      packets: Math.floor(Math.random() * 10000),
      datasize: Math.floor(Math.random() * 1000000),
      location: Math.random() > 0.5 ? {
        lat: 37.7749 + (Math.random() - 0.5) * 0.01,
        lon: -122.4194 + (Math.random() - 0.5) * 0.01
      } : null
    });
  }
  
  // Generate demo networks
  const ssidNames = ['Home-WiFi', 'Guest-Network', 'Office-5G', 'Coffee-Shop', 'Mobile-Hotspot', 
                     'IoT-Network', 'Security-Cam', 'Printer-Direct', 'Hidden-Network', 'Test-AP'];
  
  for (let i = 0; i < 8; i++) {
    demoNetworks.push({
      ssid: ssidNames[i] || `Network-${i}`,
      bssid: `11:22:33:44:55:${i.toString(16).padStart(2, '0').toUpperCase()}`,
      channel: Math.floor(Math.random() * 14) + 1,
      frequency: 2412 + (Math.floor(Math.random() * 14) * 5),
      encryption: ['Open', 'WEP', 'WPA', 'WPA2', 'WPA3'][Math.floor(Math.random() * 5)],
      last_seen: Date.now() / 1000 - Math.random() * 1800,
      signal: {
        'kismet.common.signal.last_signal': -50 - Math.random() * 40
      },
      clients: Math.floor(Math.random() * 20)
    });
  }
  
  return {
    devices: demoDevices,
    networks: demoNetworks,
    timestamp: Date.now()
  };
}

// Function to get current GPS position
export async function getCurrentGPSPosition(): Promise<{ lat: number; lon: number }> {
  try {
    // TODO: Implement actual GPS fetching from GPSD or Kismet
    // For now, return the hardcoded position from /info
    return {
      lat: 37.7749,
      lon: -122.4194
    };
  } catch (error) {
    const logger = require('winston');
    logger.error('Error getting GPS position', { error: (error as Error).message });
    return { lat: 0, lon: 0 };
  }
}

// Extract signals from Kismet data
export function extractSignalsFromKismetData(kismetData: any, broadcastFunction: (signal: any) => void): void {
  if (!kismetData || !kismetData.devices) return;
  
  kismetData.devices.forEach((device: KismetDevice) => {
    if (device.gps && device.gps.lat && device.gps.lon) {
      broadcastFunction({
        source: 'kismet',
        lat: device.gps.lat,
        lon: device.gps.lon,
        signal_strength: typeof device.signal === 'number' ? device.signal : (device.signal as any)?.['kismet.common.signal.last_signal'] || -100,
        metadata: {
          mac: device.mac,
          name: device.name,
          type: device.type,
          channel: device.channel,
          manufacturer: device.manufacturer
        }
      });
    }
  });
}
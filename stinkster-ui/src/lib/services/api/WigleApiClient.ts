/**
 * WigleToTAK API client for WiFi device tracking and TAK integration
 */

import { BaseApiClient } from './BaseApiClient';
import { getApiUrl } from '$lib/config/api';
import type {
  ApiResponse,
  WifiDevice,
  TAKMessage,
  WigleConfig,
  PaginatedRequest,
  PaginatedResponse
} from './types';

export interface WigleStats {
  totalDevices: number;
  activeDevices: number;
  knownDevices: number;
  unknownDevices: number;
  lastScanTime: number;
  takMessagesCount: number;
}

export interface ScanSettings {
  scanInterval: number;
  signalThreshold: number;
  maxAge: number;
  channels: number[];
  ignoreBSSIDs: string[];
}

export interface DeviceFilter {
  type?: 'AP' | 'Client' | 'All';
  manufacturer?: string;
  minSignal?: number;
  maxSignal?: number;
  ssid?: string;
  seen?: 'active' | 'recent' | 'all';
}

export interface TAKServerStatus {
  connected: boolean;
  server: string;
  port: number;
  lastHeartbeat?: number;
  messagesSent: number;
  errors: number;
}

export interface AntennaConfig {
  height: number;
  gain: number;
  pattern: 'omnidirectional' | 'directional';
  azimuth?: number;
  elevation?: number;
}

export class WigleApiClient extends BaseApiClient {
  constructor(baseURL?: string) {
    const apiUrl = baseURL || getApiUrl('wigle');
    super(apiUrl);

    // Add request logging interceptor
    this.addRequestInterceptor({
      onRequest: (config) => {
        console.log('[Wigle API] Request:', config.method, config.url);
        return config;
      }
    });
  }

  // Device endpoints
  async getDevices(
    filter?: DeviceFilter & PaginatedRequest
  ): Promise<ApiResponse<PaginatedResponse<WifiDevice>>> {
    return this.get<PaginatedResponse<WifiDevice>>('/api/devices', {
      params: filter
    });
  }

  async getDevice(mac: string): Promise<ApiResponse<WifiDevice>> {
    return this.get<WifiDevice>(`/api/devices/${mac}`);
  }

  async getDeviceHistory(mac: string, hours: number = 24): Promise<ApiResponse<{
    device: WifiDevice;
    history: Array<{
      timestamp: number;
      signal: number;
      latitude?: number;
      longitude?: number;
    }>;
  }>> {
    return this.get(`/api/devices/${mac}/history`, {
      params: { hours }
    });
  }

  async updateDevice(mac: string, data: Partial<WifiDevice>): Promise<ApiResponse<WifiDevice>> {
    return this.patch<WifiDevice>(`/api/devices/${mac}`, data);
  }

  async deleteDevice(mac: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.delete<{ deleted: boolean }>(`/api/devices/${mac}`);
  }

  async clearDevices(filter?: DeviceFilter): Promise<ApiResponse<{ deleted: number }>> {
    return this.post<{ deleted: number }>('/api/devices/clear', filter);
  }

  // Scanning endpoints
  async startScan(settings?: Partial<ScanSettings>): Promise<ApiResponse<{ scanning: boolean }>> {
    return this.post<{ scanning: boolean }>('/api/scan/start', settings);
  }

  async stopScan(): Promise<ApiResponse<{ scanning: boolean }>> {
    return this.post<{ scanning: boolean }>('/api/scan/stop');
  }

  async getScanStatus(): Promise<ApiResponse<{
    scanning: boolean;
    settings: ScanSettings;
    lastScan?: number;
    devicesFound: number;
  }>> {
    return this.get('/api/scan/status');
  }

  async getScanSettings(): Promise<ApiResponse<ScanSettings>> {
    return this.get<ScanSettings>('/api/scan/settings');
  }

  async updateScanSettings(settings: Partial<ScanSettings>): Promise<ApiResponse<ScanSettings>> {
    return this.post<ScanSettings>('/api/scan/settings', settings);
  }

  // TAK integration endpoints
  async getTAKConfig(): Promise<ApiResponse<WigleConfig>> {
    return this.get<WigleConfig>('/api/tak/config');
  }

  async updateTAKConfig(config: Partial<WigleConfig>): Promise<ApiResponse<WigleConfig>> {
    return this.post<WigleConfig>('/api/tak/config', config);
  }

  async getTAKStatus(): Promise<ApiResponse<TAKServerStatus>> {
    return this.get<TAKServerStatus>('/api/tak/status');
  }

  async connectTAK(): Promise<ApiResponse<{ connected: boolean }>> {
    return this.post<{ connected: boolean }>('/api/tak/connect');
  }

  async disconnectTAK(): Promise<ApiResponse<{ connected: boolean }>> {
    return this.post<{ connected: boolean }>('/api/tak/disconnect');
  }

  async sendTAKMessage(message: TAKMessage): Promise<ApiResponse<{ sent: boolean }>> {
    return this.post<{ sent: boolean }>('/api/tak/send', message);
  }

  async getTAKMessages(limit: number = 100): Promise<ApiResponse<TAKMessage[]>> {
    return this.get<TAKMessage[]>('/api/tak/messages', {
      params: { limit }
    });
  }

  // Statistics endpoints
  async getStats(): Promise<ApiResponse<WigleStats>> {
    return this.get<WigleStats>('/api/stats');
  }

  async getManufacturerStats(): Promise<ApiResponse<Array<{
    manufacturer: string;
    count: number;
    percentage: number;
  }>>> {
    return this.get('/api/stats/manufacturers');
  }

  async getSignalDistribution(): Promise<ApiResponse<Array<{
    range: string;
    count: number;
  }>>> {
    return this.get('/api/stats/signals');
  }

  async getActivityTimeline(hours: number = 24): Promise<ApiResponse<Array<{
    timestamp: number;
    newDevices: number;
    activeDevices: number;
  }>>> {
    return this.get('/api/stats/timeline', {
      params: { hours }
    });
  }

  // Import/Export endpoints
  async importWigleCSV(file: File): Promise<ApiResponse<{
    imported: number;
    skipped: number;
    errors: string[];
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.post('/api/import/wigle', formData, {
      headers: {},
      timeout: 120000 // 2 minutes for large files
    });
  }

  async exportDevices(format: 'csv' | 'json' | 'kml' = 'csv'): Promise<ApiResponse<Blob>> {
    return this.get('/api/export/devices', {
      params: { format },
      responseType: 'blob'
    });
  }

  async exportTAKMessages(format: 'xml' | 'json' = 'xml'): Promise<ApiResponse<Blob>> {
    return this.get('/api/export/tak', {
      params: { format },
      responseType: 'blob'
    });
  }

  // Antenna configuration
  async getAntennaConfig(): Promise<ApiResponse<AntennaConfig>> {
    return this.get<AntennaConfig>('/api/antenna/config');
  }

  async updateAntennaConfig(config: Partial<AntennaConfig>): Promise<ApiResponse<AntennaConfig>> {
    return this.post<AntennaConfig>('/api/antenna/config', config);
  }

  async calibrateAntenna(): Promise<ApiResponse<{
    calibrated: boolean;
    offset: number;
  }>> {
    return this.post('/api/antenna/calibrate');
  }

  // Alert management
  async getAlerts(): Promise<ApiResponse<Array<{
    id: string;
    type: 'newDevice' | 'strongSignal' | 'movement';
    device: WifiDevice;
    timestamp: number;
    read: boolean;
  }>>> {
    return this.get('/api/alerts');
  }

  async markAlertRead(id: string): Promise<ApiResponse<{ read: boolean }>> {
    return this.post<{ read: boolean }>(`/api/alerts/${id}/read`);
  }

  async clearAlerts(): Promise<ApiResponse<{ cleared: number }>> {
    return this.post<{ cleared: number }>('/api/alerts/clear');
  }

  // Geofencing
  async getGeofences(): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    center: { lat: number; lon: number };
    radius: number;
    active: boolean;
  }>>> {
    return this.get('/api/geofences');
  }

  async createGeofence(geofence: {
    name: string;
    center: { lat: number; lon: number };
    radius: number;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.post('/api/geofences', geofence);
  }

  async updateGeofence(id: string, updates: any): Promise<ApiResponse<{ updated: boolean }>> {
    return this.patch<{ updated: boolean }>(`/api/geofences/${id}`, updates);
  }

  async deleteGeofence(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.delete<{ deleted: boolean }>(`/api/geofences/${id}`);
  }

  // Heat map data
  async getHeatMapData(bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<ApiResponse<Array<{
    lat: number;
    lon: number;
    intensity: number;
  }>>> {
    return this.get('/api/heatmap', {
      params: bounds
    });
  }
}
/**
 * Kismet API Integration
 * Handles communication with Kismet wireless monitoring system
 */

import { apiClient } from './client';
import type {
  KismetDevice,
  KismetStatus,
  KismetAlert,
  WifiDevice,
  DeviceFilter,
  DeviceSort,
  DeviceListRequest,
  DeviceListResponse,
  DeviceStats,
  ScanStats
} from './types';

export class KismetApi {
  private client = apiClient;
  private deviceCache = new Map<string, WifiDevice>();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Get Kismet system status
   */
  public async getStatus(): Promise<KismetStatus> {
    return this.client.getStandard<KismetStatus>('/api/kismet/status');
  }

  /**
   * Get all detected devices
   */
  public async getDevices(
    request: DeviceListRequest = {}
  ): Promise<DeviceListResponse> {
    const params = this.buildDeviceQueryParams(request);
    
    return this.client.getStandard<DeviceListResponse>(
      '/api/kismet/devices',
      { params }
    );
  }

  /**
   * Get a specific device by MAC address
   */
  public async getDevice(mac: string): Promise<WifiDevice | null> {
    try {
      return await this.client.getStandard<WifiDevice>(`/api/kismet/devices/${mac}`);
    } catch (error) {
      console.warn(`Device ${mac} not found:`, error);
      return null;
    }
  }

  /**
   * Get device statistics
   */
  public async getDeviceStats(): Promise<DeviceStats> {
    return this.client.getStandard<DeviceStats>('/api/kismet/devices/stats');
  }

  /**
   * Get scan statistics
   */
  public async getScanStats(): Promise<ScanStats> {
    return this.client.getStandard<ScanStats>('/api/kismet/scan/stats');
  }

  /**
   * Get Kismet alerts
   */
  public async getAlerts(limit = 100): Promise<KismetAlert[]> {
    return this.client.getStandard<KismetAlert[]>(
      '/api/kismet/alerts',
      { params: { limit } }
    );
  }

  /**
   * Get recent alerts
   */
  public async getRecentAlerts(since?: number): Promise<KismetAlert[]> {
    const params = since ? { since } : {};
    return this.client.getStandard<KismetAlert[]>(
      '/api/kismet/alerts/recent',
      { params }
    );
  }

  /**
   * Start a new scan
   */
  public async startScan(options?: {
    channels?: number[];
    duration?: number;
    source?: string;
  }): Promise<{ success: boolean; scanId: string }> {
    return this.client.postStandard('/api/kismet/scan/start', options);
  }

  /**
   * Stop current scan
   */
  public async stopScan(): Promise<{ success: boolean }> {
    return this.client.postStandard('/api/kismet/scan/stop');
  }

  /**
   * Get scan status
   */
  public async getScanStatus(): Promise<{
    running: boolean;
    scanId?: string;
    startTime?: number;
    devicesFound: number;
    packetsProcessed: number;
    channels: number[];
    currentChannel?: number;
  }> {
    return this.client.getStandard('/api/kismet/scan/status');
  }

  /**
   * Get channel usage statistics
   */
  public async getChannelStats(): Promise<Array<{
    channel: number;
    frequency: number;
    devices: number;
    packets: number;
    utilization: number;
  }>> {
    return this.client.getStandard('/api/kismet/channels/stats');
  }

  /**
   * Get device activity over time
   */
  public async getDeviceActivity(
    timeRange: '1h' | '6h' | '24h' = '1h'
  ): Promise<Array<{
    timestamp: number;
    devicesFound: number;
    packetsProcessed: number;
    newDevices: number;
  }>> {
    return this.client.getStandard(
      '/api/kismet/activity',
      { params: { timeRange } }
    );
  }

  /**
   * Get device location history
   */
  public async getDeviceLocationHistory(
    mac: string,
    limit = 100
  ): Promise<Array<{
    timestamp: number;
    latitude: number;
    longitude: number;
    accuracy: number;
    signal: number;
  }>> {
    return this.client.getStandard(
      `/api/kismet/devices/${mac}/location/history`,
      { params: { limit } }
    );
  }

  /**
   * Get nearby devices (within specified distance)
   */
  public async getNearbyDevices(
    latitude: number,
    longitude: number,
    radiusMeters = 1000
  ): Promise<WifiDevice[]> {
    return this.client.getStandard('/api/kismet/devices/nearby', {
      params: { lat: latitude, lon: longitude, radius: radiusMeters }
    });
  }

  /**
   * Export device data
   */
  public async exportDevices(
    format: 'csv' | 'json' | 'kml' = 'csv',
    filter?: DeviceFilter
  ): Promise<Blob> {
    const params = {
      format,
      ...this.buildDeviceFilterParams(filter)
    };

    const response = await this.client.get('/api/kismet/devices/export', {
      params,
      responseType: 'blob'
    });

    return response.data;
  }

  /**
   * Get Kismet configuration
   */
  public async getConfig(): Promise<Record<string, any>> {
    return this.client.getStandard('/api/kismet/config');
  }

  /**
   * Update Kismet configuration
   */
  public async updateConfig(config: Record<string, any>): Promise<{ success: boolean }> {
    return this.client.postStandard('/api/kismet/config', config);
  }

  /**
   * Get data sources (interfaces)
   */
  public async getDataSources(): Promise<Array<{
    uuid: string;
    name: string;
    interface: string;
    type: string;
    channel: string;
    running: boolean;
    packets: number;
    errors: number;
  }>> {
    return this.client.getStandard('/api/kismet/datasources');
  }

  /**
   * Enable/disable a data source
   */
  public async setDataSourceEnabled(
    uuid: string,
    enabled: boolean
  ): Promise<{ success: boolean }> {
    return this.client.postStandard(`/api/kismet/datasources/${uuid}/${enabled ? 'enable' : 'disable'}`);
  }

  /**
   * Set data source channel
   */
  public async setDataSourceChannel(
    uuid: string,
    channel: number
  ): Promise<{ success: boolean }> {
    return this.client.postStandard(`/api/kismet/datasources/${uuid}/channel`, { channel });
  }

  /**
   * Get device summary for dashboard
   */
  public async getDeviceSummary(): Promise<{
    total: number;
    new: number;
    active: number;
    types: Record<string, number>;
    topChannels: Array<{ channel: number; count: number }>;
    topManufacturers: Array<{ manufacturer: string; count: number }>;
    signalStats: {
      average: number;
      min: number;
      max: number;
      distribution: Record<string, number>;
    };
  }> {
    return this.client.getStandard('/api/kismet/devices/summary');
  }

  /**
   * Search devices by SSID or MAC
   */
  public async searchDevices(
    query: string,
    limit = 50
  ): Promise<WifiDevice[]> {
    return this.client.getStandard('/api/kismet/devices/search', {
      params: { q: query, limit }
    });
  }

  /**
   * Get device relationships (associated clients, etc.)
   */
  public async getDeviceRelationships(mac: string): Promise<{
    clients: WifiDevice[];
    accessPoint?: WifiDevice;
    associatedDevices: WifiDevice[];
  }> {
    return this.client.getStandard(`/api/kismet/devices/${mac}/relationships`);
  }

  /**
   * Stream real-time device updates
   */
  public async streamDeviceUpdates(
    onUpdate: (device: WifiDevice, action: 'new' | 'update' | 'remove') => void,
    onError?: (error: Error) => void
  ): Promise<AbortController> {
    return this.client.stream(
      '/api/kismet/devices/stream',
      (data: { device: WifiDevice; action: 'new' | 'update' | 'remove' }) => {
        // Update local cache
        if (data.action === 'remove') {
          this.deviceCache.delete(data.device.mac);
        } else {
          this.deviceCache.set(data.device.mac, data.device);
        }
        
        onUpdate(data.device, data.action);
      },
      onError
    );
  }

  /**
   * Get cached devices
   */
  public getCachedDevices(): WifiDevice[] {
    return Array.from(this.deviceCache.values());
  }

  /**
   * Clear device cache
   */
  public clearCache(): void {
    this.deviceCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Build query parameters for device requests
   */
  private buildDeviceQueryParams(request: DeviceListRequest): Record<string, any> {
    const params: Record<string, any> = {};

    if (request.page) params.page = request.page;
    if (request.limit) params.limit = request.limit;
    
    if (request.sort) {
      params.sortField = request.sort.field;
      params.sortDirection = request.sort.direction;
    }

    if (request.filter) {
      Object.assign(params, this.buildDeviceFilterParams(request.filter));
    }

    return params;
  }

  /**
   * Build filter parameters
   */
  private buildDeviceFilterParams(filter?: DeviceFilter): Record<string, any> {
    const params: Record<string, any> = {};

    if (!filter) return params;

    if (filter.ssid) params.ssid = filter.ssid;
    if (filter.type) params.type = filter.type;
    if (filter.channel) params.channel = filter.channel;
    if (filter.manufacturer) params.manufacturer = filter.manufacturer;
    if (filter.encryption) params.encryption = filter.encryption;
    if (filter.signalMin) params.signalMin = filter.signalMin;
    if (filter.signalMax) params.signalMax = filter.signalMax;
    if (filter.lastSeenSince) params.lastSeenSince = filter.lastSeenSince;

    return params;
  }

  /**
   * Convert Kismet device format to internal format
   */
  private convertKismetDevice(kismetDevice: KismetDevice): WifiDevice {
    return {
      mac: kismetDevice.kismet_device_base_macaddr,
      ssid: kismetDevice.kismet_device_base_name || 'Hidden',
      type: kismetDevice.kismet_device_base_type,
      channel: parseInt(kismetDevice.kismet_device_base_channel) || 0,
      frequency: kismetDevice.kismet_device_base_frequency,
      signal: kismetDevice.kismet_device_base_signal.kismet_common_signal_last_signal,
      lastSeen: kismetDevice.kismet_device_base_last_time * 1000, // Convert to milliseconds
      latitude: kismetDevice.kismet_device_base_location.kismet_common_location_lat,
      longitude: kismetDevice.kismet_device_base_location.kismet_common_location_lon
    };
  }

  /**
   * Analyze signal strength
   */
  public analyzeSignalStrength(signal: number): {
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    percentage: number;
    description: string;
  } {
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    let percentage: number;
    let description: string;

    if (signal >= -30) {
      quality = 'excellent';
      percentage = 100;
      description = 'Excellent signal strength';
    } else if (signal >= -50) {
      quality = 'excellent';
      percentage = 80 + ((signal + 50) / 20) * 20;
      description = 'Excellent signal strength';
    } else if (signal >= -70) {
      quality = 'good';
      percentage = 60 + ((signal + 70) / 20) * 20;
      description = 'Good signal strength';
    } else if (signal >= -85) {
      quality = 'fair';
      percentage = 30 + ((signal + 85) / 15) * 30;
      description = 'Fair signal strength';
    } else {
      quality = 'poor';
      percentage = Math.max(0, 30 + ((signal + 100) / 15) * 30);
      description = 'Poor signal strength';
    }

    return {
      quality,
      percentage: Math.round(percentage),
      description
    };
  }
}

// Create and export default instance
export const kismetApi = new KismetApi();

// Export class for custom instances
export { KismetApi };
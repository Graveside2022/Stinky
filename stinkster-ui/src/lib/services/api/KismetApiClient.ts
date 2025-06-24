/**
 * Kismet API client for WiFi monitoring and packet capture
 */

import { BaseApiClient } from './BaseApiClient';
import type {
  ApiResponse,
  KismetDevice,
  KismetStatus,
  KismetAlert,
  AuthConfig,
  PaginatedRequest
} from './types';

export interface KismetDataSource {
  uuid: string;
  name: string;
  interface: string;
  type: string;
  capturing: boolean;
  channel: number;
  channels: number[];
  packets: number;
  error: boolean;
  warning?: string;
}

export interface KismetChannel {
  channel: number;
  frequency: number;
  packets: number;
  data_packets: number;
  devices: number;
}

export interface PacketFilter {
  types?: string[];
  sources?: string[];
  destinations?: string[];
  minSignal?: number;
  maxSignal?: number;
}

export interface CaptureFile {
  filename: string;
  size: number;
  created: number;
  packets: number;
  devices: number;
}

export interface KismetSSID {
  ssid: string;
  ssid_len: number;
  crypt_set: string[];
  first_seen: number;
  last_seen: number;
  beacon_rate: number;
  response_rate: number;
  channel: number;
}

export class KismetApiClient extends BaseApiClient {
  constructor(baseURL = 'http://localhost:2501', apiKey?: string) {
    const authConfig: AuthConfig | undefined = apiKey ? {
      type: 'apiKey',
      credentials: apiKey,
      paramName: 'KISMET'
    } : undefined;

    super(baseURL, authConfig);

    // Add CORS headers for Kismet
    this.addRequestInterceptor({
      onRequest: (config) => {
        config.headers = {
          ...config.headers,
          'Accept': 'application/json'
        };
        console.log('[Kismet API] Request:', config.method, config.url);
        return config;
      }
    });
  }

  // System status endpoints
  async getSystemStatus(): Promise<ApiResponse<KismetStatus>> {
    return this.get<KismetStatus>('/system/status.json');
  }

  async getTimestamp(): Promise<ApiResponse<{ kismet_server_timestamp: number }>> {
    return this.get('/system/timestamp.json');
  }

  async getChannels(): Promise<ApiResponse<KismetChannel[]>> {
    return this.get<KismetChannel[]>('/channels/channels.json');
  }

  // Data source management
  async getDataSources(): Promise<ApiResponse<KismetDataSource[]>> {
    return this.get<KismetDataSource[]>('/datasource/all_sources.json');
  }

  async getDataSource(uuid: string): Promise<ApiResponse<KismetDataSource>> {
    return this.get<KismetDataSource>(`/datasource/by-uuid/${uuid}/source.json`);
  }

  async addDataSource(definition: string): Promise<ApiResponse<{ success: boolean; uuid?: string }>> {
    return this.post('/datasource/add_source.cmd', {
      definition
    });
  }

  async pauseDataSource(uuid: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/datasource/by-uuid/${uuid}/pause.cmd`);
  }

  async resumeDataSource(uuid: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/datasource/by-uuid/${uuid}/resume.cmd`);
  }

  async closeDataSource(uuid: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/datasource/by-uuid/${uuid}/close.cmd`);
  }

  async hopChannels(uuid: string, channels: number[]): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/datasource/by-uuid/${uuid}/hop.cmd`, {
      channels: channels.join(',')
    });
  }

  async lockChannel(uuid: string, channel: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/datasource/by-uuid/${uuid}/lock.cmd`, {
      channel
    });
  }

  // Device endpoints
  async getDevices(filter?: PaginatedRequest & {
    fields?: string[];
    regex?: string;
  }): Promise<ApiResponse<KismetDevice[]>> {
    const fields = filter?.fields || [
      'kismet.device.base.macaddr',
      'kismet.device.base.name',
      'kismet.device.base.type',
      'kismet.device.base.channel',
      'kismet.device.base.frequency',
      'kismet.device.base.signal',
      'kismet.device.base.location',
      'kismet.device.base.first_time',
      'kismet.device.base.last_time'
    ];

    return this.post<KismetDevice[]>('/devices/summary/devices.json', {
      fields,
      regex: filter?.regex
    });
  }

  async getDevice(macaddr: string): Promise<ApiResponse<KismetDevice>> {
    return this.get<KismetDevice>(`/devices/by-key/${macaddr}/device.json`);
  }

  async getDevicesByTime(start: number, end?: number): Promise<ApiResponse<KismetDevice[]>> {
    const url = end 
      ? `/devices/views/seenby-time/${start}/${end}/devices.json`
      : `/devices/views/last-time/${start}/devices.json`;
    
    return this.get<KismetDevice[]>(url);
  }

  async getSSIDs(device?: string): Promise<ApiResponse<KismetSSID[]>> {
    if (device) {
      return this.get<KismetSSID[]>(`/devices/by-key/${device}/ssids.json`);
    }
    return this.get<KismetSSID[]>('/ssids/ssids.json');
  }

  // Alert management
  async getAlerts(since?: number): Promise<ApiResponse<KismetAlert[]>> {
    const url = since 
      ? `/alerts/last-time/${since}/alerts.json`
      : '/alerts/all_alerts.json';
    
    return this.get<KismetAlert[]>(url);
  }

  async getAlertDefinitions(): Promise<ApiResponse<Array<{
    header: string;
    description: string;
    severity: number;
    type: string;
  }>>> {
    return this.get('/alerts/definitions.json');
  }

  async acknowledgeAlert(alertId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/alerts/by-id/${alertId}/acknowledge.cmd`);
  }

  // Packet capture
  async startPacketCapture(
    filename: string,
    filter?: PacketFilter
  ): Promise<ApiResponse<{ success: boolean; filename: string }>> {
    return this.post('/pcap/start.cmd', {
      filename,
      ...filter
    });
  }

  async stopPacketCapture(): Promise<ApiResponse<{ success: boolean }>> {
    return this.post('/pcap/stop.cmd');
  }

  async getCaptureFiles(): Promise<ApiResponse<CaptureFile[]>> {
    return this.get<CaptureFile[]>('/pcap/list.json');
  }

  async downloadCapture(filename: string): Promise<ApiResponse<Blob>> {
    return this.get<Blob>(`/pcap/download/${filename}`, {
      responseType: 'blob'
    });
  }

  // GPS data
  async getGPSLocation(): Promise<ApiResponse<{
    lat: number;
    lon: number;
    alt: number;
    speed: number;
    heading: number;
    fix: number;
    time: number;
  }>> {
    return this.get('/gps/location.json');
  }

  // Message bus / events
  async getMessages(since?: number): Promise<ApiResponse<Array<{
    timestamp: number;
    type: string;
    message: string;
  }>>> {
    const url = since
      ? `/messagebus/last-time/${since}/messages.json`
      : '/messagebus/all_messages.json';
    
    return this.get(url);
  }

  // Statistics
  async getPacketStats(): Promise<ApiResponse<{
    packets_total: number;
    packets_data: number;
    packets_error: number;
    packets_filtered: number;
    packets_rate: number;
  }>> {
    return this.get('/packetstats/stats.json');
  }

  async getMemoryStats(): Promise<ApiResponse<{
    rss: number;
    virt: number;
    devices: number;
    packets: number;
    alerts: number;
  }>> {
    return this.get('/system/memory.json');
  }

  // PHY handlers (physical layer)
  async getPhyHandlers(): Promise<ApiResponse<Array<{
    phy_name: string;
    phy_id: number;
    packets: number;
    devices: number;
  }>>> {
    return this.get('/phy/all_phys.json');
  }

  async getPhyDetails(phyId: number): Promise<ApiResponse<{
    phy_name: string;
    phy_id: number;
    packets: number;
    devices: number;
    channels: number[];
  }>> {
    return this.get(`/phy/by-id/${phyId}/phy.json`);
  }

  // Session management
  async checkSession(): Promise<ApiResponse<{
    valid: boolean;
    user: string;
    level: number;
  }>> {
    return this.get('/session/check_session.json');
  }

  async login(username: string, password: string): Promise<ApiResponse<{
    success: boolean;
    session_id?: string;
  }>> {
    return this.post('/session/login.cmd', {
      username,
      password
    });
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    return this.post('/session/logout.cmd');
  }

  // Configuration
  async getConfig(): Promise<ApiResponse<Record<string, any>>> {
    return this.get('/config/all.json');
  }

  async updateConfig(key: string, value: any): Promise<ApiResponse<{ success: boolean }>> {
    return this.post('/config/set.cmd', {
      key,
      value
    });
  }

  // Snapshot endpoints
  async createSnapshot(): Promise<ApiResponse<{
    success: boolean;
    filename: string;
  }>> {
    return this.post('/snapshot/create.cmd');
  }

  async listSnapshots(): Promise<ApiResponse<Array<{
    filename: string;
    size: number;
    timestamp: number;
  }>>> {
    return this.get('/snapshot/list.json');
  }

  async downloadSnapshot(filename: string): Promise<ApiResponse<Blob>> {
    return this.get<Blob>(`/snapshot/download/${filename}`, {
      responseType: 'blob'
    });
  }
}
/**
 * Kismet WebSocket Service
 * Handles real-time Kismet data streaming and event management
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import { WebSocketHandler } from './websocketHandler.js';
import type {
  WifiDevice,
  WSEvent,
  DeviceUpdateEvent,
  ScanStatusEvent
} from '../types/index.js';

// Kismet-specific types
export interface KismetDevice {
  'kismet.device.base.key': string;
  'kismet.device.base.macaddr': string;
  'kismet.device.base.name': string;
  'kismet.device.base.type': string;
  'kismet.device.base.phyname': string;
  'kismet.device.base.frequency': number;
  'kismet.device.base.channel': string;
  'kismet.device.base.signal': number;
  'kismet.device.base.first_time': number;
  'kismet.device.base.last_time': number;
  'kismet.device.base.packets.total': number;
  'kismet.device.base.packets.data': number;
  'kismet.device.base.packets.retry': number;
  'kismet.device.base.location': {
    'kismet.common.location.lat': number;
    'kismet.common.location.lon': number;
    'kismet.common.location.alt': number;
    'kismet.common.location.fix': number;
  };
  'dot11.device': {
    'dot11.device.ssid_len': number;
    'dot11.device.ssid': string;
    'dot11.device.bssid': string;
    'dot11.device.client_map': Record<string, any>;
    'dot11.device.responded_ssid_map': Record<string, any>;
    'dot11.device.beacon_info': string;
  };
}

export interface KismetAlert {
  'kismet.alert.timestamp': number;
  'kismet.alert.header': string;
  'kismet.alert.class': string;
  'kismet.alert.severity': number;
  'kismet.alert.text': string;
  'kismet.alert.device_key': string;
}

export interface KismetSystemStatus {
  'kismet.system.battery.percentage': number;
  'kismet.system.battery.charging': string;
  'kismet.system.battery.ac': number;
  'kismet.system.timestamp.start_sec': number;
  'kismet.system.timestamp.start_usec': number;
  'kismet.system.devices.count': number;
  'kismet.system.packets.rate': number;
  'kismet.system.memory.rss': number;
  'kismet.system.memory.virt': number;
  'kismet.system.channels.channels': string[];
}

interface KismetWebSocketConfig {
  apiUrl: string;
  apiKey?: string;
  pollInterval: number;
  heartbeatInterval: number;
  maxRetries: number;
  retryDelay: number;
}

export class KismetWebSocketService extends EventEmitter {
  private wsHandler: WebSocketHandler;
  private logger: winston.Logger;
  private axios: AxiosInstance;
  private config: KismetWebSocketConfig;
  private pollTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private deviceCache: Map<string, KismetDevice> = new Map();
  private lastEventId: number = 0;
  private connectionRetries: number = 0;
  private isConnected: boolean = false;
  private subscribedTopics: Set<string> = new Set();
  
  // Event subscription tracking
  private eventSubscriptions: Map<string, Set<(data: any) => void>> = new Map();
  
  // Throttling
  private throttledEvents: Map<string, { timer?: NodeJS.Timeout; lastData?: any }> = new Map();
  private readonly THROTTLE_INTERVALS: Record<string, number> = {
    'device:update': 500,      // 500ms throttle for device updates
    'system:status': 2000,     // 2s throttle for system status
    'scan:status': 1000,       // 1s throttle for scan status
    'signal:update': 250       // 250ms throttle for signal updates
  };

  constructor(
    wsHandler: WebSocketHandler,
    logger: winston.Logger,
    config?: Partial<KismetWebSocketConfig>
  ) {
    super();
    this.wsHandler = wsHandler;
    this.logger = logger.child({ service: 'KismetWebSocket' });
    
    this.config = {
      apiUrl: process.env.KISMET_API_URL || 'http://localhost:2501',
      apiKey: process.env.KISMET_API_KEY,
      pollInterval: 2000,        // Poll every 2 seconds
      heartbeatInterval: 30000,  // Heartbeat every 30 seconds
      maxRetries: 5,
      retryDelay: 5000,
      ...config
    };

    // Setup axios instance
    this.axios = axios.create({
      baseURL: this.config.apiUrl,
      headers: this.config.apiKey ? { 'KISMET': this.config.apiKey } : {},
      timeout: 10000
    });
  }

  /**
   * Start the Kismet WebSocket service
   */
  async start(): Promise<void> {
    this.logger.info('Starting Kismet WebSocket service');
    
    try {
      // Test connection
      await this.testConnection();
      this.isConnected = true;
      this.connectionRetries = 0;
      
      // Start polling for data
      this.startPolling();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Subscribe to default topics
      this.subscribeToDefaultTopics();
      
      this.logger.info('Kismet WebSocket service started successfully');
    } catch (error) {
      this.logger.error('Failed to start Kismet WebSocket service:', error);
      throw error;
    }
  }

  /**
   * Stop the Kismet WebSocket service
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Kismet WebSocket service');
    
    this.isConnected = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    // Clear all throttled events
    this.throttledEvents.forEach(({ timer }) => {
      if (timer) clearTimeout(timer);
    });
    this.throttledEvents.clear();
    
    this.deviceCache.clear();
    this.eventSubscriptions.clear();
    
    this.logger.info('Kismet WebSocket service stopped');
  }

  /**
   * Test connection to Kismet
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.axios.get('/system/status.json');
      this.logger.info('Connected to Kismet API');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to connect to Kismet API:', error);
      throw new Error('Cannot connect to Kismet API');
    }
  }

  /**
   * Start polling for Kismet data
   */
  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      try {
        await Promise.all([
          this.pollDevices(),
          this.pollAlerts(),
          this.pollSystemStatus()
        ]);
      } catch (error) {
        this.logger.error('Polling error:', error);
        this.handleConnectionError();
      }
    }, this.config.pollInterval);
    
    // Initial poll
    this.pollDevices();
    this.pollSystemStatus();
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.testConnection();
        this.emit('heartbeat', { timestamp: Date.now(), connected: true });
      } catch (error) {
        this.emit('heartbeat', { timestamp: Date.now(), connected: false });
        this.handleConnectionError();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Poll for device updates
   */
  private async pollDevices(): Promise<void> {
    try {
      // Get timestamp for recent devices (last 5 minutes)
      const timestamp = Math.floor(Date.now() / 1000) - 300;
      
      const response = await this.axios.post('/devices/views/all/devices.json', {
        fields: [
          'kismet.device.base.key',
          'kismet.device.base.macaddr',
          'kismet.device.base.name',
          'kismet.device.base.type',
          'kismet.device.base.phyname',
          'kismet.device.base.frequency',
          'kismet.device.base.channel',
          'kismet.device.base.signal',
          'kismet.device.base.first_time',
          'kismet.device.base.last_time',
          'kismet.device.base.packets.total',
          'kismet.device.base.packets.data',
          'kismet.device.base.packets.retry',
          'kismet.device.base.location',
          'dot11.device'
        ],
        regex: [{
          field: 'kismet.device.base.phyname',
          regex: 'IEEE802.11'
        }],
        last_time: timestamp
      });

      const devices: KismetDevice[] = response.data;
      
      // Process device updates
      devices.forEach(device => {
        const existingDevice = this.deviceCache.get(device['kismet.device.base.key']);
        
        if (!existingDevice) {
          // New device
          this.deviceCache.set(device['kismet.device.base.key'], device);
          this.emitDeviceEvent(device, 'new');
        } else if (this.hasDeviceChanged(existingDevice, device)) {
          // Updated device
          const changes = this.getDeviceChanges(existingDevice, device);
          this.deviceCache.set(device['kismet.device.base.key'], device);
          this.emitDeviceEvent(device, 'update', changes);
        }
      });
      
      // Check for removed devices
      const currentKeys = new Set(devices.map(d => d['kismet.device.base.key']));
      Array.from(this.deviceCache.keys()).forEach(key => {
        if (!currentKeys.has(key)) {
          const device = this.deviceCache.get(key)!;
          this.deviceCache.delete(key);
          this.emitDeviceEvent(device, 'remove');
        }
      });
      
    } catch (error) {
      this.logger.error('Failed to poll devices:', error);
    }
  }

  /**
   * Poll for alerts
   */
  private async pollAlerts(): Promise<void> {
    try {
      const response = await this.axios.get('/alerts/last/10.json');
      const alerts: KismetAlert[] = response.data;
      
      alerts.forEach(alert => {
        if (alert['kismet.alert.timestamp'] > this.lastEventId) {
          this.lastEventId = alert['kismet.alert.timestamp'];
          this.emitAlertEvent(alert);
        }
      });
    } catch (error) {
      this.logger.error('Failed to poll alerts:', error);
    }
  }

  /**
   * Poll for system status
   */
  private async pollSystemStatus(): Promise<void> {
    try {
      const response = await this.axios.get('/system/status.json');
      const status: KismetSystemStatus = response.data;
      
      this.emitSystemStatusEvent(status);
    } catch (error) {
      this.logger.error('Failed to poll system status:', error);
    }
  }

  /**
   * Convert Kismet device to WifiDevice
   */
  private convertToWifiDevice(kismetDevice: KismetDevice): WifiDevice {
    const dot11 = kismetDevice['dot11.device'] || {};
    const location = kismetDevice['kismet.device.base.location'] || {};
    
    return {
      mac: kismetDevice['kismet.device.base.macaddr'],
      ssid: dot11['dot11.device.ssid'] || '',
      type: this.detectDeviceType(kismetDevice),
      channel: parseInt(kismetDevice['kismet.device.base.channel']) || 0,
      frequency: kismetDevice['kismet.device.base.frequency'] || 0,
      signal: kismetDevice['kismet.device.base.signal'] || -100,
      firstSeen: kismetDevice['kismet.device.base.first_time'] * 1000,
      lastSeen: kismetDevice['kismet.device.base.last_time'] * 1000,
      latitude: location['kismet.common.location.lat'],
      longitude: location['kismet.common.location.lon'],
      altitude: location['kismet.common.location.alt'],
      accuracy: location['kismet.common.location.fix'],
      packets: kismetDevice['kismet.device.base.packets.total'],
      dataPackets: kismetDevice['kismet.device.base.packets.data'],
      retryPackets: kismetDevice['kismet.device.base.packets.retry'],
      encryption: dot11['dot11.device.beacon_info']
    };
  }

  /**
   * Detect device type from Kismet data
   */
  private detectDeviceType(device: KismetDevice): 'AP' | 'Client' | 'Unknown' {
    const type = device['kismet.device.base.type'];
    const dot11 = device['dot11.device'];
    
    if (type === 'Wi-Fi AP' || (dot11 && dot11['dot11.device.ssid_len'] > 0)) {
      return 'AP';
    } else if (type === 'Wi-Fi Client' || (dot11 && Object.keys(dot11['dot11.device.client_map'] || {}).length > 0)) {
      return 'Client';
    }
    
    return 'Unknown';
  }

  /**
   * Check if device has changed
   */
  private hasDeviceChanged(oldDevice: KismetDevice, newDevice: KismetDevice): boolean {
    return (
      oldDevice['kismet.device.base.signal'] !== newDevice['kismet.device.base.signal'] ||
      oldDevice['kismet.device.base.channel'] !== newDevice['kismet.device.base.channel'] ||
      oldDevice['kismet.device.base.packets.total'] !== newDevice['kismet.device.base.packets.total'] ||
      oldDevice['kismet.device.base.location']?.['kismet.common.location.lat'] !== 
        newDevice['kismet.device.base.location']?.['kismet.common.location.lat'] ||
      oldDevice['kismet.device.base.location']?.['kismet.common.location.lon'] !== 
        newDevice['kismet.device.base.location']?.['kismet.common.location.lon']
    );
  }

  /**
   * Get device changes
   */
  private getDeviceChanges(oldDevice: KismetDevice, newDevice: KismetDevice): Partial<WifiDevice> {
    const changes: Partial<WifiDevice> = {};
    
    if (oldDevice['kismet.device.base.signal'] !== newDevice['kismet.device.base.signal']) {
      changes.signal = newDevice['kismet.device.base.signal'];
    }
    
    if (oldDevice['kismet.device.base.channel'] !== newDevice['kismet.device.base.channel']) {
      changes.channel = parseInt(newDevice['kismet.device.base.channel']) || 0;
    }
    
    if (oldDevice['kismet.device.base.packets.total'] !== newDevice['kismet.device.base.packets.total']) {
      changes.packets = newDevice['kismet.device.base.packets.total'];
    }
    
    const oldLoc = oldDevice['kismet.device.base.location'];
    const newLoc = newDevice['kismet.device.base.location'];
    
    if (oldLoc?.['kismet.common.location.lat'] !== newLoc?.['kismet.common.location.lat']) {
      changes.latitude = newLoc?.['kismet.common.location.lat'];
    }
    
    if (oldLoc?.['kismet.common.location.lon'] !== newLoc?.['kismet.common.location.lon']) {
      changes.longitude = newLoc?.['kismet.common.location.lon'];
    }
    
    changes.lastSeen = newDevice['kismet.device.base.last_time'] * 1000;
    
    return changes;
  }

  /**
   * Emit device event with throttling
   */
  private emitDeviceEvent(
    kismetDevice: KismetDevice, 
    action: 'new' | 'update' | 'remove',
    changes?: Partial<WifiDevice>
  ): void {
    const wifiDevice = this.convertToWifiDevice(kismetDevice);
    
    if (action === 'update') {
      // Throttle update events
      this.emitThrottled('device:update', () => {
        this.wsHandler.emitDeviceUpdate(wifiDevice, action, changes);
      }, { device: wifiDevice, action, changes });
    } else {
      // Emit new/remove events immediately
      this.wsHandler.emitDeviceUpdate(wifiDevice, action, changes);
    }
    
    // Emit internal event
    this.emit('device', { device: wifiDevice, action, changes });
  }

  /**
   * Emit alert event
   */
  private emitAlertEvent(alert: KismetAlert): void {
    const alertData = {
      id: `kismet-${alert['kismet.alert.timestamp']}`,
      type: 'kismet' as const,
      timestamp: alert['kismet.alert.timestamp'] * 1000,
      severity: this.mapAlertSeverity(alert['kismet.alert.severity']),
      message: alert['kismet.alert.text'],
      header: alert['kismet.alert.header'],
      class: alert['kismet.alert.class'],
      deviceKey: alert['kismet.alert.device_key'],
      read: false
    };
    
    this.wsHandler.emitAlert(alertData);
    this.emit('alert', alertData);
  }

  /**
   * Map Kismet alert severity
   */
  private mapAlertSeverity(severity: number): 'low' | 'medium' | 'high' {
    if (severity >= 15) return 'high';
    if (severity >= 10) return 'medium';
    return 'low';
  }

  /**
   * Emit system status event with throttling
   */
  private emitSystemStatusEvent(status: KismetSystemStatus): void {
    const scanStatus: ScanStatusEvent = {
      scanning: true,
      devicesFound: status['kismet.system.devices.count'] || 0,
      packetsProcessed: status['kismet.system.packets.rate'] || 0,
      errors: 0,
      currentChannel: status['kismet.system.channels.channels']?.[0] ? 
        parseInt(status['kismet.system.channels.channels'][0]) : undefined
    };
    
    // Throttle system status updates
    this.emitThrottled('system:status', () => {
      this.wsHandler.emitScanStatus(scanStatus);
    }, scanStatus);
    
    // Emit internal event
    this.emit('systemStatus', {
      ...status,
      scanStatus
    });
  }

  /**
   * Emit event with throttling
   */
  private emitThrottled(
    eventType: string, 
    emitFn: () => void, 
    data?: any
  ): void {
    const throttleInterval = this.THROTTLE_INTERVALS[eventType] || 1000;
    const throttleEntry = this.throttledEvents.get(eventType) || {};
    
    // Store latest data
    throttleEntry.lastData = data;
    
    if (!throttleEntry.timer) {
      // Emit immediately if not throttled
      emitFn();
      
      // Set up throttle timer
      throttleEntry.timer = setTimeout(() => {
        const entry = this.throttledEvents.get(eventType);
        if (entry) {
          entry.timer = undefined;
        }
      }, throttleInterval);
      
      this.throttledEvents.set(eventType, throttleEntry);
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    this.connectionRetries++;
    
    if (this.connectionRetries >= this.config.maxRetries) {
      this.logger.error('Max connection retries reached. Stopping service.');
      this.stop();
      this.emit('connectionFailed', { retries: this.connectionRetries });
      return;
    }
    
    this.logger.warn(`Connection error. Retry ${this.connectionRetries}/${this.config.maxRetries}`);
    
    // Exponential backoff
    const delay = this.config.retryDelay * Math.pow(2, this.connectionRetries - 1);
    
    setTimeout(async () => {
      try {
        await this.testConnection();
        this.connectionRetries = 0;
        this.logger.info('Reconnected to Kismet');
      } catch (error) {
        this.handleConnectionError();
      }
    }, delay);
  }

  /**
   * Subscribe to default topics
   */
  private subscribeToDefaultTopics(): void {
    const defaultTopics = ['devices', 'alerts', 'system', 'scan'];
    defaultTopics.forEach(topic => this.subscribedTopics.add(topic));
  }

  /**
   * Subscribe to events
   */
  public subscribe(event: string, callback: (data: any) => void): void {
    if (!this.eventSubscriptions.has(event)) {
      this.eventSubscriptions.set(event, new Set());
    }
    this.eventSubscriptions.get(event)!.add(callback);
    this.on(event, callback);
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(event: string, callback: (data: any) => void): void {
    const subscribers = this.eventSubscriptions.get(event);
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.eventSubscriptions.delete(event);
      }
    }
    this.off(event, callback);
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): {
    connected: boolean;
    retries: number;
    deviceCount: number;
    lastPoll?: number;
  } {
    return {
      connected: this.isConnected,
      retries: this.connectionRetries,
      deviceCount: this.deviceCache.size,
      lastPoll: this.lastEventId
    };
  }

  /**
   * Force refresh all data
   */
  public async forceRefresh(): Promise<void> {
    this.logger.info('Forcing data refresh');
    await Promise.all([
      this.pollDevices(),
      this.pollAlerts(),
      this.pollSystemStatus()
    ]);
  }
}
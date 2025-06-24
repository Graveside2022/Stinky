/**
 * Device Manager Service
 * Manages WiFi device data storage and retrieval
 */

import { EventEmitter } from 'events';
import type {
  WifiDevice,
  DeviceFilter,
  PaginatedRequest,
  PaginatedResponse,
  ManufacturerStats,
  SignalDistribution,
  ActivityTimeline
} from '../types/index.js';
import winston from 'winston';

export interface DeviceManagerEvents {
  deviceAdded: (device: WifiDevice) => void;
  deviceUpdated: (device: WifiDevice, changes: Partial<WifiDevice>) => void;
  deviceRemoved: (mac: string) => void;
  devicesCleared: (count: number) => void;
}

export class DeviceManager extends EventEmitter {
  private devices: Map<string, WifiDevice> = new Map();
  private deviceHistory: Map<string, Array<{
    timestamp: number;
    signal: number;
    latitude?: number;
    longitude?: number;
  }>> = new Map();
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
  }

  /**
   * Add or update a device
   */
  public addDevice(device: WifiDevice): void {
    const existingDevice = this.devices.get(device.mac);
    
    if (existingDevice) {
      // Update existing device
      const updatedDevice = {
        ...existingDevice,
        ...device,
        lastSeen: Date.now()
      };
      
      this.devices.set(device.mac, updatedDevice);
      this.addToHistory(device.mac, device);
      this.emit('deviceUpdated', updatedDevice, device);
      
      this.logger.debug(`Updated device: ${device.mac}`);
    } else {
      // Add new device
      const newDevice = {
        ...device,
        firstSeen: device.firstSeen || Date.now(),
        lastSeen: Date.now()
      };
      
      this.devices.set(device.mac, newDevice);
      this.addToHistory(device.mac, device);
      this.emit('deviceAdded', newDevice);
      
      this.logger.info(`Added new device: ${device.mac} (${device.ssid || 'Hidden'})`);
    }
  }

  /**
   * Add device data to history
   */
  private addToHistory(mac: string, device: WifiDevice): void {
    if (!this.deviceHistory.has(mac)) {
      this.deviceHistory.set(mac, []);
    }

    const history = this.deviceHistory.get(mac)!;
    history.push({
      timestamp: Date.now(),
      signal: device.signal,
      latitude: device.latitude,
      longitude: device.longitude
    });

    // Keep only last 1000 entries per device
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Get a device by MAC address
   */
  public getDevice(mac: string): WifiDevice | undefined {
    return this.devices.get(mac);
  }

  /**
   * Get device history
   */
  public getDeviceHistory(mac: string, hours: number = 24): {
    device?: WifiDevice;
    history: Array<{
      timestamp: number;
      signal: number;
      latitude?: number;
      longitude?: number;
    }>;
  } {
    const device = this.devices.get(mac);
    const history = this.deviceHistory.get(mac) || [];
    
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const filteredHistory = history.filter(h => h.timestamp >= cutoffTime);

    return { device, history: filteredHistory };
  }

  /**
   * Get devices with filtering and pagination
   */
  public getDevices(
    filter?: DeviceFilter,
    pagination?: PaginatedRequest
  ): PaginatedResponse<WifiDevice> {
    let filteredDevices = Array.from(this.devices.values());

    // Apply filters
    if (filter) {
      filteredDevices = this.applyFilter(filteredDevices, filter);
    }

    // Sort
    if (pagination?.sort) {
      filteredDevices = this.sortDevices(filteredDevices, pagination.sort, pagination.order);
    }

    // Paginate
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    const paginatedDevices = filteredDevices.slice(offset, offset + limit);

    return {
      data: paginatedDevices,
      total: filteredDevices.length,
      page,
      limit,
      hasNext: offset + limit < filteredDevices.length,
      hasPrev: page > 1
    };
  }

  /**
   * Apply device filter
   */
  private applyFilter(devices: WifiDevice[], filter: DeviceFilter): WifiDevice[] {
    return devices.filter(device => {
      // Type filter
      if (filter.type && filter.type !== 'All' && device.type !== filter.type) {
        return false;
      }

      // Manufacturer filter
      if (filter.manufacturer && device.manufacturer !== filter.manufacturer) {
        return false;
      }

      // Signal strength filter
      if (filter.minSignal !== undefined && device.signal < filter.minSignal) {
        return false;
      }
      if (filter.maxSignal !== undefined && device.signal > filter.maxSignal) {
        return false;
      }

      // SSID filter
      if (filter.ssid && !device.ssid?.toLowerCase().includes(filter.ssid.toLowerCase())) {
        return false;
      }

      // Seen filter
      if (filter.seen) {
        const now = Date.now();
        const lastSeen = device.lastSeen;
        
        switch (filter.seen) {
          case 'active':
            if (now - lastSeen > 5 * 60 * 1000) return false; // 5 minutes
            break;
          case 'recent':
            if (now - lastSeen > 60 * 60 * 1000) return false; // 1 hour
            break;
        }
      }

      // Whitelist/Blacklist
      if (filter.whitelistSSIDs?.length && device.ssid) {
        if (!filter.whitelistSSIDs.includes(device.ssid)) return false;
      }
      if (filter.whitelistMACs?.length) {
        if (!filter.whitelistMACs.includes(device.mac)) return false;
      }
      if (filter.blacklistSSIDs?.length && device.ssid) {
        if (filter.blacklistSSIDs.includes(device.ssid)) return false;
      }
      if (filter.blacklistMACs?.length) {
        if (filter.blacklistMACs.includes(device.mac)) return false;
      }

      return true;
    });
  }

  /**
   * Sort devices
   */
  private sortDevices(
    devices: WifiDevice[],
    sort: string,
    order: 'asc' | 'desc' = 'desc'
  ): WifiDevice[] {
    const sorted = [...devices].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sort) {
        case 'signal':
          aVal = a.signal;
          bVal = b.signal;
          break;
        case 'lastSeen':
          aVal = a.lastSeen;
          bVal = b.lastSeen;
          break;
        case 'firstSeen':
          aVal = a.firstSeen;
          bVal = b.firstSeen;
          break;
        case 'ssid':
          aVal = a.ssid || '';
          bVal = b.ssid || '';
          break;
        case 'mac':
          aVal = a.mac;
          bVal = b.mac;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Update a device
   */
  public updateDevice(mac: string, updates: Partial<WifiDevice>): WifiDevice | undefined {
    const device = this.devices.get(mac);
    if (!device) return undefined;

    const updatedDevice = {
      ...device,
      ...updates,
      mac: device.mac // Ensure MAC doesn't change
    };

    this.devices.set(mac, updatedDevice);
    this.emit('deviceUpdated', updatedDevice, updates);
    
    return updatedDevice;
  }

  /**
   * Delete a device
   */
  public deleteDevice(mac: string): boolean {
    const deleted = this.devices.delete(mac);
    this.deviceHistory.delete(mac);
    
    if (deleted) {
      this.emit('deviceRemoved', mac);
      this.logger.info(`Deleted device: ${mac}`);
    }
    
    return deleted;
  }

  /**
   * Clear devices
   */
  public clearDevices(filter?: DeviceFilter): number {
    if (!filter) {
      const count = this.devices.size;
      this.devices.clear();
      this.deviceHistory.clear();
      this.emit('devicesCleared', count);
      this.logger.info(`Cleared all ${count} devices`);
      return count;
    }

    // Clear with filter
    const toDelete = this.applyFilter(Array.from(this.devices.values()), filter);
    toDelete.forEach(device => {
      this.devices.delete(device.mac);
      this.deviceHistory.delete(device.mac);
    });

    this.emit('devicesCleared', toDelete.length);
    this.logger.info(`Cleared ${toDelete.length} devices`);
    
    return toDelete.length;
  }

  /**
   * Get statistics
   */
  public getStats(): {
    totalDevices: number;
    activeDevices: number;
    knownDevices: number;
    unknownDevices: number;
    lastScanTime: number;
  } {
    const now = Date.now();
    const devices = Array.from(this.devices.values());
    
    return {
      totalDevices: devices.length,
      activeDevices: devices.filter(d => now - d.lastSeen < 5 * 60 * 1000).length,
      knownDevices: devices.filter(d => d.ssid && d.ssid !== '').length,
      unknownDevices: devices.filter(d => !d.ssid || d.ssid === '').length,
      lastScanTime: Math.max(...devices.map(d => d.lastSeen), 0)
    };
  }

  /**
   * Get manufacturer statistics
   */
  public getManufacturerStats(): ManufacturerStats[] {
    const counts = new Map<string, number>();
    const devices = Array.from(this.devices.values());
    
    devices.forEach(device => {
      const manufacturer = device.manufacturer || 'Unknown';
      counts.set(manufacturer, (counts.get(manufacturer) || 0) + 1);
    });

    const total = devices.length;
    const stats: ManufacturerStats[] = [];

    counts.forEach((count, manufacturer) => {
      stats.push({
        manufacturer,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      });
    });

    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Get signal distribution
   */
  public getSignalDistribution(): SignalDistribution[] {
    const ranges = [
      { range: 'Very Strong (> -50 dBm)', minDbm: -50, maxDbm: 0 },
      { range: 'Strong (-70 to -50 dBm)', minDbm: -70, maxDbm: -50 },
      { range: 'Medium (-85 to -70 dBm)', minDbm: -85, maxDbm: -70 },
      { range: 'Weak (< -85 dBm)', minDbm: -100, maxDbm: -85 }
    ];

    const devices = Array.from(this.devices.values());

    return ranges.map(range => ({
      ...range,
      count: devices.filter(d => 
        d.signal >= range.minDbm && d.signal < range.maxDbm
      ).length
    }));
  }

  /**
   * Get activity timeline
   */
  public getActivityTimeline(hours: number = 24): ActivityTimeline[] {
    const now = Date.now();
    const interval = 60 * 60 * 1000; // 1 hour intervals
    const timeline: ActivityTimeline[] = [];

    for (let i = hours - 1; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const endTime = timestamp + interval;

      const devices = Array.from(this.devices.values());
      const newDevices = devices.filter(d => 
        d.firstSeen >= timestamp && d.firstSeen < endTime
      ).length;
      
      const activeDevices = devices.filter(d =>
        d.lastSeen >= timestamp && d.lastSeen < endTime
      ).length;

      const totalDevices = devices.filter(d =>
        d.firstSeen < endTime
      ).length;

      timeline.push({
        timestamp,
        newDevices,
        activeDevices,
        totalDevices
      });
    }

    return timeline;
  }

  /**
   * Import devices from array
   */
  public importDevices(devices: WifiDevice[]): {
    imported: number;
    updated: number;
  } {
    let imported = 0;
    let updated = 0;

    devices.forEach(device => {
      const existing = this.devices.has(device.mac);
      this.addDevice(device);
      
      if (existing) {
        updated++;
      } else {
        imported++;
      }
    });

    return { imported, updated };
  }

  /**
   * Export devices
   */
  public exportDevices(filter?: DeviceFilter): WifiDevice[] {
    const devices = Array.from(this.devices.values());
    return filter ? this.applyFilter(devices, filter) : devices;
  }
}
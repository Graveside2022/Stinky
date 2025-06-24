// Kismet Operations Center Stores
// Real-time state management for Kismet interface components

import { writable, derived } from 'svelte/store';
import type { SystemStatus, ServiceStatus, Alert, GPSStatus } from '../types/system.js';

// Interface specific types
export interface KismetDevice {
  mac: string;
  ssid?: string;
  manufacturer?: string;
  signal: number;
  channel?: number;
  encryption?: string;
  type: 'device' | 'access_point';
  firstSeen: string;
  lastSeen: string;
}

export interface WiFiActivity {
  timestamp: string;
  type: 'device_detected' | 'network_discovered' | 'signal_change';
  device: string;
  details: string;
}

export interface HackRFStatus {
  frequency: number;
  power: number;
  status: 'online' | 'offline' | 'scanning';
  spectrumData?: number[];
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  temperature: number;
  loadAvg: number[];
}

// Core state stores
export const systemStatus = writable<SystemStatus | null>(null);
export const services = writable<Record<string, ServiceStatus>>({});
export const alerts = writable<Alert[]>([]);
export const gpsStatus = writable<GPSStatus | null>(null);
export const systemMetrics = writable<SystemMetrics | null>(null);

// Kismet specific stores
export const kismetDevices = writable<KismetDevice[]>([]);
export const wifiActivity = writable<WiFiActivity[]>([]);
export const hackrfStatus = writable<HackRFStatus>({
  frequency: 145.0,
  power: 0,
  status: 'offline'
});

// Connection state
export const socketConnected = writable<boolean>(false);
export const lastUpdate = writable<string>('');

// Derived stores for computed values
export const devicesCount = derived(kismetDevices, ($devices) => $devices.length);
export const networksCount = derived(kismetDevices, ($devices) => 
  $devices.filter(d => d.type === 'access_point').length
);

export const serviceStatusSummary = derived(services, ($services) => {
  const statuses = Object.values($services);
  return {
    running: statuses.filter(s => s.running).length,
    total: statuses.length,
    unhealthy: statuses.filter(s => !s.running || s.status === 'failed').length
  };
});

export const systemHealth = derived([systemMetrics, alerts], ([$metrics, $alerts]) => {
  if (!$metrics) return 'unknown';
  
  const criticalAlerts = $alerts.filter(a => a.level === 'critical' || a.level === 'error');
  if (criticalAlerts.length > 0) return 'critical';
  
  if ($metrics.cpu > 90 || $metrics.temperature > 85) return 'warning';
  if ($metrics.cpu > 70 || $metrics.temperature > 75) return 'degraded';
  
  return 'healthy';
});

// Update functions for real-time data
export function updateSystemStatus(data: any) {
  if (data.services) {
    services.set(data.services);
  }
  
  if (data.alerts) {
    alerts.set(data.alerts);
  }
  
  if (data.system) {
    systemMetrics.set({
      cpu: data.system.cpu_percent || 0,
      memory: data.system.memory_percent || 0,
      disk: data.system.disk_percent || 0,
      temperature: data.system.cpu_temp || 0,
      loadAvg: data.system.load_avg || [0, 0, 0]
    });
  }
  
  lastUpdate.set(new Date().toISOString());
}

export function updateGPS(data: GPSStatus) {
  gpsStatus.set(data);
}

export function addWiFiActivity(activity: WiFiActivity) {
  wifiActivity.update(activities => {
    const newActivities = [activity, ...activities];
    // Keep only last 100 activities
    return newActivities.slice(0, 100);
  });
}

export function updateKismetDevices(devices: KismetDevice[]) {
  kismetDevices.set(devices);
}

export function updateHackRFStatus(status: Partial<HackRFStatus>) {
  hackrfStatus.update(current => ({ ...current, ...status }));
}

// Socket connection management
export function setSocketConnected(connected: boolean) {
  socketConnected.set(connected);
}
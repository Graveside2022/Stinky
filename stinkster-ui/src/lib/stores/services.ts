import { writable, derived } from 'svelte/store';
import type { ServiceStatus, BroadcastStatus, GPSStatus } from '../types';

// Service status store
export const serviceStatuses = writable<Record<string, ServiceStatus>>({
  kismet: {
    name: 'Kismet',
    running: false,
    pid: undefined,
    cpu: 0,
    memory: 0,
    uptime: 0,
    lastCheck: new Date()
  },
  wigletotak: {
    name: 'WigleToTAK',
    running: false,
    pid: undefined,
    cpu: 0,
    memory: 0,
    uptime: 0,
    lastCheck: new Date()
  },
  gpsd: {
    name: 'GPSD',
    running: false,
    pid: undefined,
    cpu: 0,
    memory: 0,
    uptime: 0,
    lastCheck: new Date()
  },
  mavproxy: {
    name: 'MAVProxy GPS Bridge',
    running: false,
    pid: undefined,
    cpu: 0,
    memory: 0,
    uptime: 0,
    lastCheck: new Date()
  },
  hackrf: {
    name: 'HackRF Spectrum Analyzer',
    running: false,
    pid: undefined,
    cpu: 0,
    memory: 0,
    uptime: 0,
    lastCheck: new Date()
  },
  openwebrx: {
    name: 'OpenWebRX SDR',
    running: false,
    pid: undefined,
    cpu: 0,
    memory: 0,
    uptime: 0,
    lastCheck: new Date()
  }
});

// TAK broadcast status
export const takBroadcastStatus = writable<BroadcastStatus>({
  connected: false,
  messagesSent: 0,
  lastHeartbeat: null,
  errors: 0,
  queueSize: 0
});

// GPS status
export const gpsStatus = writable<GPSStatus>({
  connected: false,
  fix: false,
  satellites: 0,
  accuracy: 0,
  lastUpdate: null
});

// Derived stores for easier consumption
export const allServices = derived(serviceStatuses, ($statuses) => Object.values($statuses));

export const runningServices = derived(allServices, ($services) => 
  $services.filter(service => service.running)
);

export const stoppedServices = derived(allServices, ($services) => 
  $services.filter(service => !service.running)
);

export const serviceCount = derived(allServices, ($services) => $services.length);
export const runningServiceCount = derived(runningServices, ($running) => $running.length);
export const stoppedServiceCount = derived(stoppedServices, ($stopped) => $stopped.length);

// Individual service status
export const kismetStatus = derived(serviceStatuses, ($statuses) => $statuses.kismet);
export const wigleToTakStatus = derived(serviceStatuses, ($statuses) => $statuses.wigletotak);
export const gpsdStatus = derived(serviceStatuses, ($statuses) => $statuses.gpsd);
export const mavproxyStatus = derived(serviceStatuses, ($statuses) => $statuses.mavproxy);
export const hackrfStatus = derived(serviceStatuses, ($statuses) => $statuses.hackrf);
export const openwebrxStatus = derived(serviceStatuses, ($statuses) => $statuses.openwebrx);

// Critical services (core functionality)
export const criticalServices = derived(allServices, ($services) => 
  $services.filter(service => ['Kismet', 'WigleToTAK', 'GPSD'].includes(service.name))
);

export const criticalServicesRunning = derived(criticalServices, ($critical) => 
  $critical.every(service => service.running)
);

// System readiness
export const systemReady = derived(
  [criticalServicesRunning, gpsStatus], 
  ([$criticalRunning, $gps]) => $criticalRunning && $gps.connected
);

// Service health status
export const serviceHealthStatus = derived(
  [runningServiceCount, stoppedServiceCount],
  ([$running, $stopped]) => {
    if ($stopped === 0) return 'excellent';
    if ($stopped === 1) return 'good';
    if ($stopped <= 2) return 'warning';
    return 'critical';
  }
);

// Update functions
export function updateServiceStatus(serviceName: string, status: Partial<ServiceStatus>) {
  serviceStatuses.update(current => ({
    ...current,
    [serviceName]: {
      ...current[serviceName],
      ...status,
      lastCheck: new Date()
    }
  }));
}

export function updateTakBroadcastStatus(status: Partial<BroadcastStatus>) {
  takBroadcastStatus.update(current => ({
    ...current,
    ...status
  }));
}

export function updateGpsStatus(status: Partial<GPSStatus>) {
  gpsStatus.update(current => ({
    ...current,
    ...status
  }));
}

// Bulk update all service statuses
export function updateAllServiceStatuses(statuses: Record<string, Partial<ServiceStatus>>) {
  serviceStatuses.update(current => {
    const updated = { ...current };
    for (const [serviceName, status] of Object.entries(statuses)) {
      if (updated[serviceName]) {
        updated[serviceName] = {
          ...updated[serviceName],
          ...status,
          lastCheck: new Date()
        };
      }
    }
    return updated;
  });
}

// Service control actions (these would trigger API calls)
export function startService(serviceName: string) {
  // This would make an API call to start the service
  console.log(`Starting service: ${serviceName}`);
  updateServiceStatus(serviceName, { running: true });
}

export function stopService(serviceName: string) {
  // This would make an API call to stop the service
  console.log(`Stopping service: ${serviceName}`);
  updateServiceStatus(serviceName, { running: false, pid: undefined });
}

export function restartService(serviceName: string) {
  // This would make an API call to restart the service
  console.log(`Restarting service: ${serviceName}`);
  updateServiceStatus(serviceName, { running: false, pid: undefined });
  setTimeout(() => {
    updateServiceStatus(serviceName, { running: true });
  }, 2000);
}

// Reset all service statuses
export function resetServiceStatuses() {
  serviceStatuses.update(current => {
    const reset = { ...current };
    for (const serviceName of Object.keys(reset)) {
      reset[serviceName] = {
        ...reset[serviceName],
        running: false,
        pid: undefined,
        cpu: 0,
        memory: 0,
        uptime: 0,
        lastCheck: new Date()
      };
    }
    return reset;
  });
}
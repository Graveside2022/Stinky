import { writable, derived, readable, get } from 'svelte/store';
import type { SystemHealthResponse, ServiceStatus, SystemMetrics, SystemAlert } from '../types/api';

// System health store using API types
export const systemHealth = writable<SystemHealthResponse>({
  timestamp: new Date().toISOString(),
  services: {},
  system: {
    cpu_percent: 0,
    memory_percent: 0,
    disk_percent: 0,
    cpu_temp: 0,
    load_avg: [0, 0, 0]
  },
  alerts: []
});

// Individual system metrics for easier consumption
export const cpuUsage = derived(systemHealth, ($health) => $health.system.cpu_percent);
export const memoryUsage = derived(systemHealth, ($health) => $health.system.memory_percent);
export const diskUsage = derived(systemHealth, ($health) => $health.system.disk_percent);
export const cpuTemperature = derived(systemHealth, ($health) => $health.system.cpu_temp);
export const loadAverage = derived(systemHealth, ($health) => $health.system.load_avg);

// Service status aggregation
export const allServices = derived(systemHealth, ($health) => Object.values($health.services));
export const serviceCount = derived(allServices, ($services) => $services.length);
export const runningServices = derived(allServices, ($services) => 
  $services.filter(service => service.running)
);
export const stoppedServices = derived(allServices, ($services) => 
  $services.filter(service => !service.running)
);

// System alerts
export const systemAlerts = derived(systemHealth, ($health) => $health.alerts);
export const criticalAlerts = derived(systemAlerts, ($alerts) => 
  $alerts.filter(alert => alert.level === 'critical')
);
export const errorAlerts = derived(systemAlerts, ($alerts) => 
  $alerts.filter(alert => alert.level === 'error')
);
export const warningAlerts = derived(systemAlerts, ($alerts) => 
  $alerts.filter(alert => alert.level === 'warning')
);

// System health status
export const systemStatus = derived(
  [cpuUsage, memoryUsage, diskUsage, criticalAlerts, errorAlerts],
  ([$cpu, $memory, $disk, $critical, $error]) => {
    if ($critical.length > 0) return 'critical';
    if ($error.length > 0) return 'error';
    if ($cpu > 90 || $memory > 90 || $disk > 95) return 'warning';
    if ($cpu > 70 || $memory > 70 || $disk > 80) return 'caution';
    return 'good';
  }
);

// Update system health data
export function updateSystemHealth(health: Partial<SystemHealthResponse>) {
  systemHealth.update(current => ({
    ...current,
    ...health,
    timestamp: new Date().toISOString()
  }));
}

// Update individual service status
export function updateServiceStatus(serviceName: string, status: ServiceStatus) {
  systemHealth.update(current => ({
    ...current,
    services: {
      ...current.services,
      [serviceName]: {
        ...status,
        lastCheck: new Date().toISOString()
      }
    },
    timestamp: new Date().toISOString()
  }));
}

// Add system alert
export function addSystemAlert(alert: Omit<SystemAlert, 'timestamp'>) {
  systemHealth.update(current => ({
    ...current,
    alerts: [...current.alerts, { ...alert, timestamp: new Date().toISOString() }],
    timestamp: new Date().toISOString()
  }));
}

// Clear alerts by level or service
export function clearSystemAlerts(level?: string, service?: string) {
  systemHealth.update(current => ({
    ...current,
    alerts: current.alerts.filter(alert => {
      if (level && alert.level !== level) return true;
      if (service && alert.service !== service) return true;
      return false;
    }),
    timestamp: new Date().toISOString()
  }));
}

// Reset system health data
export function resetSystemHealth() {
  systemHealth.set({
    timestamp: new Date().toISOString(),
    services: {},
    system: {
      cpu_percent: 0,
      memory_percent: 0,
      disk_percent: 0,
      cpu_temp: 0,
      load_avg: [0, 0, 0]
    },
    alerts: []
  });
}

// WebSocket connection for real-time updates
export const systemWebSocket = writable<WebSocket | null>(null);
export const connectionStatus = writable<'connected' | 'disconnected' | 'error'>('disconnected');

// Initialize WebSocket connection for system monitoring
export function initializeSystemWebSocket(url?: string) {
  if (typeof window === 'undefined') return;
  
  const wsUrl = url || `ws://${window.location.hostname}:8005/ws/system`;
  
  try {
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('System WebSocket connected');
      connectionStatus.set('connected');
      systemWebSocket.set(ws);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update system health with real-time data
        if (data.type === 'system_health') {
          updateSystemHealth(data.payload);
        } else if (data.type === 'service_status') {
          updateServiceStatus(data.serviceName, data.payload);
        } else if (data.type === 'alert') {
          addSystemAlert(data.payload);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('System WebSocket error:', error);
      connectionStatus.set('error');
    };
    
    ws.onclose = () => {
      console.log('System WebSocket disconnected');
      connectionStatus.set('disconnected');
      systemWebSocket.set(null);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (get(connectionStatus) === 'disconnected') {
          initializeSystemWebSocket(url);
        }
      }, 5000);
    };
    
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
    connectionStatus.set('error');
  }
}

// Close WebSocket connection
export function closeSystemWebSocket() {
  const ws = get(systemWebSocket);
  if (ws) {
    ws.close();
  }
}

// Fetch system health from REST API
export async function fetchSystemHealth(apiUrl?: string): Promise<SystemHealthResponse | null> {
  try {
    const url = apiUrl || `http://${window.location.hostname}:8005/api/system/health`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const healthData = await response.json();
    updateSystemHealth(healthData);
    return healthData;
  } catch (error) {
    console.error('Failed to fetch system health:', error);
    addSystemAlert({
      level: 'error',
      type: 'system',
      message: 'Failed to fetch system health data'
    });
    return null;
  }
}

// Service status store specifically for individual services
export const serviceStatus = writable<Record<string, ServiceStatus>>({});

// Update individual service status (alternative to updateServiceStatus for direct service management)
export function setServiceStatus(serviceName: string, status: ServiceStatus) {
  serviceStatus.update(services => ({
    ...services,
    [serviceName]: {
      ...status,
      lastCheck: new Date().toISOString()
    }
  }));
}
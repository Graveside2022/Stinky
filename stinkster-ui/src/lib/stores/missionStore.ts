import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

export interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  glowColor: string;
  port: number;
  path: string;
  shortcut: string;
  status: 'online' | 'offline' | 'warning';
}

export interface ServiceStatus {
  running: boolean;
  pid?: number;
  cpu?: number;
  memory?: number;
}

export interface SystemHealth {
  timestamp: string;
  services: Record<string, ServiceStatus>;
  endpoints: Record<string, { open: boolean; port: number }>;
  system: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    cpu_temp: number;
    load_avg: number[];
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    service?: string;
    type?: string;
    message: string;
  }>;
}

// Create mission data store
export const missions: Writable<Mission[]> = writable([
  {
    id: 'kismet',
    title: 'Kismet WiFi',
    description: 'Wireless Network Discovery & Analysis',
    icon: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
    color: '#00d2ff',
    glowColor: 'rgba(0, 210, 255, 0.3)',
    port: 8005,
    path: '/kismet-operations',
    shortcut: '1',
    status: 'online'
  },
  {
    id: 'hackrf',
    title: 'HackRF Sweep',
    description: 'Software Defined Radio Operations',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    color: '#fb923c',
    glowColor: 'rgba(251, 146, 60, 0.3)',
    port: 3002,
    path: '',
    shortcut: '2',
    status: 'online'
  },
  {
    id: 'map',
    title: 'Tactical Map',
    description: 'Real-time Geospatial Intelligence',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    port: 8005,
    path: '/map',
    shortcut: '3',
    status: 'warning'
  },
  {
    id: 'wigle',
    title: 'WigletoTAK',
    description: 'Team Awareness Kit Integration',
    icon: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.3)',
    port: 8000,
    path: '',
    shortcut: '4',
    status: 'offline'
  },
  {
    id: 'docs',
    title: 'Documentation',
    description: 'System Operations Manual',
    icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.3)',
    port: 8005,
    path: '/navigation',
    shortcut: '5',
    status: 'online'
  }
]);

// System health store
export const systemHealth: Writable<SystemHealth | null> = writable(null);

// Derived store for mission status updates based on system health
export const missionsWithStatus: Readable<Mission[]> = derived(
  [missions, systemHealth],
  ([$missions, $health]) => {
    if (!$health) return $missions;
    
    return $missions.map(mission => {
      let status: Mission['status'] = 'offline';
      
      // Check service status based on mission type
      switch (mission.id) {
        case 'kismet':
          status = $health.services.kismet?.running ? 'online' : 'offline';
          break;
        case 'hackrf':
          status = $health.services.spectrum_analyzer?.running ? 'online' : 'warning';
          break;
        case 'wigle':
          status = $health.services.wigletotak?.running || $health.services.wigletotak_enhanced?.running ? 'online' : 'offline';
          break;
        case 'map':
          status = $health.services.gpsd?.running ? 'warning' : 'offline';
          break;
        case 'docs':
          status = 'online'; // Documentation is always available
          break;
      }
      
      return { ...mission, status };
    });
  }
);

// Function to launch a mission
export function launchMission(missionId: string): void {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  missions.subscribe(missionList => {
    const mission = missionList.find(m => m.id === missionId);
    if (!mission) {
      console.error('Unknown mission:', missionId);
      return;
    }
    
    const url = `http://${hostname}:${mission.port}${mission.path}`;
    console.log(`Launching ${missionId} at: ${url}`);
    
    if (typeof window !== 'undefined') {
      try {
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          console.error('Failed to open window - popup blocked?');
          alert(`Please allow popups or manually navigate to: ${url}`);
        }
      } catch (error) {
        console.error('Error opening window:', error);
        alert(`Error opening mission. Please manually navigate to: ${url}`);
      }
    }
  })();
}

// Function to update system health
export async function updateSystemHealth(): Promise<void> {
  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const response = await fetch(`http://${hostname}/api/health`);
    if (response.ok) {
      const health: SystemHealth = await response.json();
      systemHealth.set(health);
    }
  } catch (error) {
    console.error('Failed to fetch system health:', error);
  }
}

// Auto-update system health every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(updateSystemHealth, 30000);
  updateSystemHealth(); // Initial load
}
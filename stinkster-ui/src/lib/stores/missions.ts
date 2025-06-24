import { writable, derived, get } from 'svelte/store';
import type { MissionCard, MissionConfig, NavigationEvent } from '../types/missions.js';

// Mission data store - matches working HTML dashboard exactly
export const missions = writable<MissionCard[]>([
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
		status: 'online',
		enabled: true
	},
	{
		id: 'hackrf',
		title: 'HackRF Sweep',
		description: 'Software Defined Radio Operations',
		icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
		color: '#fb923c',
		glowColor: 'rgba(251, 146, 60, 0.3)',
		port: 3002,
		shortcut: '2',
		status: 'online',
		enabled: true
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
		status: 'warning',
		enabled: true
	},
	{
		id: 'wigle',
		title: 'WigletoTAK',
		description: 'Team Awareness Kit Integration',
		icon: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
		color: '#a855f7',
		glowColor: 'rgba(168, 85, 247, 0.3)',
		port: 8000,
		shortcut: '4',
		status: 'offline',
		enabled: true
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
		status: 'online',
		enabled: true
	}
]);

// Current hostname store
export const hostname = writable<string>('');

// Navigation history store
export const navigationHistory = writable<NavigationEvent[]>([]);

// Mission configuration store
export const missionConfig = writable<MissionConfig>({
	hostname: '',
	basePort: 8005,
	services: {}
});

// Derived store for building URLs
export const buildMissionUrl = derived(
	[missions, hostname],
	([$missions, $hostname]) => {
		return (missionId: string): string => {
			const mission = $missions.find(m => m.id === missionId);
			if (!mission || !$hostname) return '';
			
			const protocol = 'http';
			const port = mission.port;
			const path = mission.path || '';
			
			return `${protocol}://${$hostname}:${port}${path}`;
		};
	}
);

// Actions for mission store
export const missionActions = {
	updateMissionStatus: (missionId: string, status: 'online' | 'offline' | 'warning') => {
		missions.update(missionList => 
			missionList.map(mission => 
				mission.id === missionId ? { ...mission, status } : mission
			)
		);
	},
	
	addNavigationEvent: (mission: MissionCard, url: string, triggeredByKeyboard = false) => {
		navigationHistory.update(history => [
			...history,
			{ mission, url, timestamp: Date.now(), triggeredByKeyboard }
		]);
	},
	
	setHostname: (newHostname: string) => {
		hostname.set(newHostname);
	},

	// Launch mission matching the working HTML dashboard functionality
	launchMission: (missionId: string, currentHostname?: string) => {
		// Get current missions store value
		const missionList = get(missions);
		const mission = missionList.find(m => m.id === missionId);
		
		if (!mission) {
			console.error('Unknown mission:', missionId);
			return false;
		}

		// Use current hostname or fallback to window.location.hostname
		const host = currentHostname || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
		
		// Build URL exactly like the working HTML dashboard
		const url = `http://${host}:${mission.port}${mission.path || ''}`;
		
		console.log(`Launching ${missionId} at: ${url}`);
		
		try {
			if (typeof window !== 'undefined') {
				const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
				if (!newWindow) {
					console.error('Failed to open window - popup blocked?');
					alert(`Please allow popups or manually navigate to: ${url}`);
					return false;
				}
			}
			
			// Add to navigation history
			missionActions.addNavigationEvent(mission, url);
			return true;
		} catch (error) {
			console.error('Error opening window:', error);
			if (typeof window !== 'undefined') {
				alert(`Error opening mission. Please manually navigate to: ${url}`);
			}
			return false;
		}
	},

	// Initialize keyboard shortcuts matching the working HTML dashboard
	initializeKeyboardShortcuts: () => {
		if (typeof window === 'undefined') return;
		
		const shortcuts: Record<string, string> = {
			'1': 'kismet',
			'2': 'hackrf',
			'3': 'map',
			'4': 'wigle',
			'5': 'docs'
		};
		
		const handleKeydown = (event: KeyboardEvent) => {
			if (shortcuts[event.key]) {
				event.preventDefault();
				missionActions.launchMission(shortcuts[event.key]);
			}
		};
		
		document.addEventListener('keydown', handleKeydown);
		
		// Return cleanup function
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	},

	// Enable/disable mission
	setMissionEnabled: (missionId: string, enabled: boolean) => {
		missions.update(missionList => 
			missionList.map(mission => 
				mission.id === missionId ? { ...mission, enabled } : mission
			)
		);
	}
};
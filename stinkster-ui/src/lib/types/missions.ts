/**
 * Mission Card and Navigation Types
 * Based on the working HTML dashboard structure
 */

export interface MissionCard {
	id: string;
	title: string;
	description: string;
	/** SVG path or icon identifier */
	icon: string;
	/** CSS color value (e.g., '#00d2ff', 'var(--mission-color-1)') */
	color: string;
	/** CSS color value for glow effects */
	glowColor: string;
	/** Service port number */
	port?: number;
	/** URL path */
	path?: string;
	/** Keyboard shortcut key */
	shortcut: string;
	/** Service status indicator */
	status: 'online' | 'offline' | 'warning';
	/** Whether this mission is currently available */
	enabled: boolean;
}

export interface MissionConfig {
	hostname: string;
	basePort: number;
	/** Map of service names to their configurations */
	services: Record<string, ServiceConfig>;
	/** Default protocol to use */
	defaultProtocol: 'http' | 'https';
}

export interface ServiceConfig {
	port: number;
	path?: string;
	protocol: 'http' | 'https';
	status: 'online' | 'offline' | 'warning';
	/** Service health check endpoint */
	healthEndpoint?: string;
	/** Whether service supports WebSockets */
	supportsWebSocket?: boolean;
	/** Service display name */
	displayName?: string;
	/** Service description */
	description?: string;
}

export interface NavigationEvent {
	mission: MissionCard;
	url: string;
	timestamp: number;
	/** Whether navigation was triggered by keyboard shortcut */
	triggeredByKeyboard?: boolean;
	/** Target window/tab behavior */
	target?: '_self' | '_blank';
}

/** Available mission IDs based on working dashboard */
export type MissionId = 'kismet' | 'hackrf' | 'map' | 'wigle' | 'docs';

/** Mission card color themes from CSS variables */
export interface MissionTheme {
	primary: string;
	glow: string;
	accent?: string;
}

/** Predefined mission themes matching CSS variables */
export const MISSION_THEMES: Record<string, MissionTheme> = {
	blue: {
		primary: '#00d2ff',
		glow: 'rgba(0, 210, 255, 0.3)',
	},
	orange: {
		primary: '#fb923c', 
		glow: 'rgba(251, 146, 60, 0.3)',
	},
	green: {
		primary: '#10b981',
		glow: 'rgba(16, 185, 129, 0.3)',
	},
	purple: {
		primary: '#a855f7',
		glow: 'rgba(168, 85, 247, 0.3)',
	},
	yellow: {
		primary: '#fbbf24',
		glow: 'rgba(251, 191, 36, 0.3)',
	},
};

/** Mission status with additional metadata */
export interface MissionStatus {
	id: MissionId;
	status: 'online' | 'offline' | 'warning';
	lastCheck: Date;
	responseTime?: number;
	errorMessage?: string;
	/** Service-specific health data */
	healthData?: Record<string, unknown>;
}
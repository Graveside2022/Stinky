// Configuration for Stinkster Frontend
// Supports both development and production environments

interface ServiceConfig {
  apiUrl: string;
  wsUrl: string;
  healthEndpoint: string;
}

interface Config {
  hackrf: ServiceConfig;
  wigle: ServiceConfig;
  kismet: ServiceConfig;
  global: {
    healthCheckInterval: number;
    reconnectDelay: number;
    maxReconnectAttempts: number;
  };
}

// Get configuration from environment or use defaults
const isDev = import.meta.env.DEV;
const baseUrl = import.meta.env.VITE_BASE_URL || (isDev ? 'http://localhost' : window.location.origin);

export const config: Config = {
  hackrf: {
    apiUrl: import.meta.env.VITE_API_URL_HACKRF || `${baseUrl}:8092`,
    wsUrl: import.meta.env.VITE_WS_URL_HACKRF || `${baseUrl.replace('http', 'ws')}:8092`,
    healthEndpoint: '/api/status'
  },
  wigle: {
    apiUrl: import.meta.env.VITE_API_URL_WIGLE || `${baseUrl}:8000`,
    wsUrl: import.meta.env.VITE_WS_URL_WIGLE || `${baseUrl.replace('http', 'ws')}:8000/ws`,
    healthEndpoint: '/api/status'
  },
  kismet: {
    apiUrl: import.meta.env.VITE_API_URL_KISMET || `${baseUrl}:8003`,
    wsUrl: import.meta.env.VITE_WS_URL_KISMET || `${baseUrl.replace('http', 'ws')}:8003`,
    healthEndpoint: '/api/system/status'
  },
  global: {
    healthCheckInterval: parseInt(import.meta.env.VITE_HEALTH_CHECK_INTERVAL || '30000'),
    reconnectDelay: parseInt(import.meta.env.VITE_RECONNECT_DELAY || '5000'),
    maxReconnectAttempts: parseInt(import.meta.env.VITE_MAX_RECONNECT_ATTEMPTS || '5')
  }
};

// Helper function to build API URLs
export function buildApiUrl(service: keyof Config, path: string): string {
  if (typeof service === 'string' && service in config) {
    const serviceConfig = config[service as keyof Config];
    if (typeof serviceConfig === 'object' && 'apiUrl' in serviceConfig) {
      return `${serviceConfig.apiUrl}${path}`;
    }
  }
  throw new Error(`Invalid service: ${service}`);
}

// Helper function to get WebSocket URL
export function getWsUrl(service: keyof Config): string {
  if (typeof service === 'string' && service in config) {
    const serviceConfig = config[service as keyof Config];
    if (typeof serviceConfig === 'object' && 'wsUrl' in serviceConfig) {
      return serviceConfig.wsUrl;
    }
  }
  throw new Error(`Invalid service: ${service}`);
}

// Export for debugging
if (isDev) {
  console.log('Frontend Configuration:', config);
}
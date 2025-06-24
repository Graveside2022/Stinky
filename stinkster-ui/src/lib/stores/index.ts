// Main store exports for the Stinkster UI application
// This file provides a centralized export point for all stores

// System monitoring stores
export * from './system';

// Service management stores  
export * from './services';

// Theme management stores
export * from './theme';

// WebSocket connection stores
export * from './websocket';

// Notification stores
export * from './notifications';

// UI state stores
export * from './ui';

// Re-export existing WebSocket stores for compatibility
export * from './websocket/index';

// Store initialization function
export function initializeStores() {
  // Any initialization logic needed for stores
  console.log('Initializing Stinkster UI stores...');
  
  // Initialize responsive detection for UI store
  if (typeof window !== 'undefined') {
    // This is already handled in ui.ts, but we could add more initialization here
  }
}

// Store reset function for development/testing
export function resetAllStores() {
  // This could be used to reset all stores to initial state
  console.log('Resetting all stores to initial state...');
  
  // Import and call reset functions from each store
  // Note: This would need to be implemented in each store
}

// Store types for easier imports
export type {
  SystemHealth,
  ServiceStatus,
  BroadcastStatus,
  GPSStatus,
  ThemeConfig,
  WebSocketConnectionState,
  WebSocketMessage
} from '../types';

export type {
  Notification,
  NotificationAction
} from './notifications';

export type {
  UIState
} from './ui';
import { writable, derived, get } from 'svelte/store';
import type { WebSocketConnectionState, WebSocketMessage } from '../types';

// WebSocket connection states for different services
export const hackrfConnection = writable<WebSocketConnectionState>({
  connected: false,
  connecting: false,
  error: null,
  reconnectAttempts: 0,
  lastConnected: null
});

export const wigleConnection = writable<WebSocketConnectionState>({
  connected: false,
  connecting: false,
  error: null,
  reconnectAttempts: 0,
  lastConnected: null
});

export const kismetConnection = writable<WebSocketConnectionState>({
  connected: false,
  connecting: false,
  error: null,
  reconnectAttempts: 0,
  lastConnected: null
});

// Global WebSocket connection status
export const anyConnected = derived(
  [hackrfConnection, wigleConnection, kismetConnection],
  ([$hackrf, $wigle, $kismet]) => $hackrf.connected || $wigle.connected || $kismet.connected
);

export const allConnected = derived(
  [hackrfConnection, wigleConnection, kismetConnection],
  ([$hackrf, $wigle, $kismet]) => $hackrf.connected && $wigle.connected && $kismet.connected
);

export const anyConnecting = derived(
  [hackrfConnection, wigleConnection, kismetConnection],
  ([$hackrf, $wigle, $kismet]) => $hackrf.connecting || $wigle.connecting || $kismet.connecting
);

export const connectionErrors = derived(
  [hackrfConnection, wigleConnection, kismetConnection],
  ([$hackrf, $wigle, $kismet]) => [
    $hackrf.error && { service: 'hackrf', error: $hackrf.error },
    $wigle.error && { service: 'wigle', error: $wigle.error },
    $kismet.error && { service: 'kismet', error: $kismet.error }
  ].filter(Boolean)
);

// Message queues for each service
export const hackrfMessages = writable<WebSocketMessage[]>([]);
export const wigleMessages = writable<WebSocketMessage[]>([]);
export const kismetMessages = writable<WebSocketMessage[]>([]);

// Connection management
export function updateConnectionState(
  service: 'hackrf' | 'wigle' | 'kismet',
  state: Partial<WebSocketConnectionState>
) {
  const store = service === 'hackrf' ? hackrfConnection : 
                service === 'wigle' ? wigleConnection : kismetConnection;
  
  store.update(current => ({
    ...current,
    ...state,
    lastConnected: state.connected ? new Date() : current.lastConnected
  }));
}

export function setConnecting(service: 'hackrf' | 'wigle' | 'kismet') {
  updateConnectionState(service, {
    connecting: true,
    connected: false,
    error: null
  });
}

export function setConnected(service: 'hackrf' | 'wigle' | 'kismet') {
  updateConnectionState(service, {
    connecting: false,
    connected: true,
    error: null,
    reconnectAttempts: 0
  });
}

export function setConnectionError(service: 'hackrf' | 'wigle' | 'kismet', error: string) {
  const currentState = get(
    service === 'hackrf' ? hackrfConnection : 
    service === 'wigle' ? wigleConnection : kismetConnection
  );
  
  updateConnectionState(service, {
    connecting: false,
    connected: false,
    error,
    reconnectAttempts: currentState.reconnectAttempts + 1
  });
}

export function setDisconnected(service: 'hackrf' | 'wigle' | 'kismet') {
  updateConnectionState(service, {
    connecting: false,
    connected: false,
    error: null
  });
}

// Message management
export function addMessage(service: 'hackrf' | 'wigle' | 'kismet', message: WebSocketMessage) {
  const store = service === 'hackrf' ? hackrfMessages :
                service === 'wigle' ? wigleMessages : kismetMessages;
  
  store.update(messages => {
    const newMessages = [...messages, message];
    // Keep only the last 1000 messages to prevent memory issues
    return newMessages.length > 1000 ? newMessages.slice(-1000) : newMessages;
  });
}

export function clearMessages(service: 'hackrf' | 'wigle' | 'kismet') {
  const store = service === 'hackrf' ? hackrfMessages :
                service === 'wigle' ? wigleMessages : kismetMessages;
  
  store.set([]);
}

export function clearAllMessages() {
  hackrfMessages.set([]);
  wigleMessages.set([]);
  kismetMessages.set([]);
}

// Reset connection states
export function resetConnectionState(service: 'hackrf' | 'wigle' | 'kismet') {
  updateConnectionState(service, {
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
    lastConnected: null
  });
}

export function resetAllConnectionStates() {
  resetConnectionState('hackrf');
  resetConnectionState('wigle');
  resetConnectionState('kismet');
}

// Utility functions for WebSocket message creation
export function createWebSocketMessage<T>(type: string, payload: T): WebSocketMessage<T> {
  return {
    type,
    payload,
    timestamp: Date.now()
  };
}

// Connection statistics
export const connectionStats = derived(
  [hackrfConnection, wigleConnection, kismetConnection],
  ([$hackrf, $wigle, $kismet]) => {
    const connections = [$hackrf, $wigle, $kismet];
    const connected = connections.filter(c => c.connected).length;
    const connecting = connections.filter(c => c.connecting).length;
    const errors = connections.filter(c => c.error).length;
    const totalReconnectAttempts = connections.reduce((sum, c) => sum + c.reconnectAttempts, 0);
    
    return {
      total: 3,
      connected,
      connecting,
      errors,
      totalReconnectAttempts,
      lastConnected: connections
        .filter(c => c.lastConnected)
        .sort((a, b) => (b.lastConnected?.getTime() || 0) - (a.lastConnected?.getTime() || 0))[0]?.lastConnected || null
    };
  }
);

// Auto-reconnection logic (can be enabled/disabled)
export const autoReconnectEnabled = writable(true);
export const reconnectInterval = writable(5000); // 5 seconds

let reconnectTimeouts: Record<string, number> = {};

export function scheduleReconnect(service: 'hackrf' | 'wigle' | 'kismet', callback: () => void) {
  if (!get(autoReconnectEnabled)) return;
  
  const currentState = get(
    service === 'hackrf' ? hackrfConnection : 
    service === 'wigle' ? wigleConnection : kismetConnection
  );
  
  if (currentState.reconnectAttempts >= 10) {
    console.warn(`Max reconnect attempts reached for ${service}`);
    return;
  }
  
  // Clear existing timeout if any
  if (reconnectTimeouts[service]) {
    clearTimeout(reconnectTimeouts[service]);
  }
  
  const delay = get(reconnectInterval) * Math.pow(1.5, currentState.reconnectAttempts); // Exponential backoff
  
  reconnectTimeouts[service] = window.setTimeout(() => {
    callback();
    delete reconnectTimeouts[service];
  }, delay);
}

export function cancelReconnect(service: 'hackrf' | 'wigle' | 'kismet') {
  if (reconnectTimeouts[service]) {
    clearTimeout(reconnectTimeouts[service]);
    delete reconnectTimeouts[service];
  }
}

export function cancelAllReconnects() {
  Object.values(reconnectTimeouts).forEach(timeout => clearTimeout(timeout));
  reconnectTimeouts = {};
}
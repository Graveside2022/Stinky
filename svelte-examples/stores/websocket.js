import { writable, derived, get } from 'svelte/store';

// WebSocket connection state
export const wsConnection = writable(null);
export const wsStatus = writable('disconnected');
export const wsReconnectAttempts = writable(0);
export const wsLastError = writable(null);

// Configuration
const WS_RECONNECT_DELAY = 1000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;

// WebSocket manager class
export class WebSocketManager {
    constructor(url, options = {}) {
        this.url = url;
        this.options = options;
        this.ws = null;
        this.handlers = new Map();
        this.reconnectTimer = null;
        this.messageQueue = [];
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                // Support both Socket.IO and native WebSocket
                if (this.options.useSocketIO) {
                    // For Socket.IO connections
                    this.ws = window.io(this.url, this.options.socketIOOptions || {});
                    
                    this.ws.on('connect', () => {
                        wsStatus.set('connected');
                        wsReconnectAttempts.set(0);
                        this.flushMessageQueue();
                        resolve();
                    });

                    this.ws.on('disconnect', () => {
                        wsStatus.set('disconnected');
                        this.attemptReconnect();
                    });

                    this.ws.on('error', (error) => {
                        wsLastError.set(error);
                        reject(error);
                    });

                    // Register Socket.IO event handlers
                    this.handlers.forEach((callbacks, event) => {
                        callbacks.forEach(callback => {
                            this.ws.on(event, callback);
                        });
                    });
                } else {
                    // Native WebSocket
                    this.ws = new WebSocket(this.url);
                    
                    this.ws.onopen = () => {
                        wsStatus.set('connected');
                        wsReconnectAttempts.set(0);
                        this.flushMessageQueue();
                        resolve();
                    };

                    this.ws.onclose = () => {
                        wsStatus.set('disconnected');
                        this.attemptReconnect();
                    };

                    this.ws.onerror = (error) => {
                        wsLastError.set(error);
                        reject(error);
                    };

                    this.ws.onmessage = (event) => {
                        this.handleMessage(event.data);
                    };
                }

                wsConnection.set(this.ws);
            } catch (error) {
                wsLastError.set(error);
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            if (this.options.useSocketIO) {
                this.ws.disconnect();
            } else {
                this.ws.close();
            }
            this.ws = null;
        }

        wsStatus.set('disconnected');
        wsConnection.set(null);
    }

    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event).push(handler);

        // If already connected and using Socket.IO, register immediately
        if (this.ws && this.options.useSocketIO && this.ws.connected) {
            this.ws.on(event, handler);
        }

        // Return unsubscribe function
        return () => {
            const handlers = this.handlers.get(event);
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
            if (this.ws && this.options.useSocketIO) {
                this.ws.off(event, handler);
            }
        };
    }

    emit(event, data) {
        const message = { event, data, timestamp: Date.now() };
        
        if (this.ws?.readyState === WebSocket.OPEN || (this.options.useSocketIO && this.ws?.connected)) {
            this.sendMessage(message);
        } else {
            // Queue message for later
            this.messageQueue.push(message);
        }
    }

    sendMessage(message) {
        if (this.options.useSocketIO) {
            this.ws.emit(message.event, message.data);
        } else {
            this.ws.send(JSON.stringify(message));
        }
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const handlers = this.handlers.get(message.event) || [];
            handlers.forEach(handler => handler(message.data));
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            wsLastError.set(error);
        }
    }

    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }

    attemptReconnect() {
        const attempts = get(wsReconnectAttempts);
        
        if (attempts >= WS_MAX_RECONNECT_ATTEMPTS) {
            wsStatus.set('failed');
            return;
        }

        wsStatus.set('reconnecting');
        wsReconnectAttempts.update(n => n + 1);

        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(error => {
                console.error('Reconnection failed:', error);
            });
        }, WS_RECONNECT_DELAY * Math.pow(2, attempts));
    }
}

// Factory function for creating WebSocket connections
export function createWebSocket(url, options) {
    return new WebSocketManager(url, options);
}

// Derived store for connection health
export const wsHealthy = derived(
    [wsStatus, wsReconnectAttempts],
    ([$status, $attempts]) => {
        return $status === 'connected' && $attempts === 0;
    }
);
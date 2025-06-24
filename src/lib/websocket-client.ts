/**
 * WebSocket Abstraction Layer
 *
 * Provides a unified interface for both Socket.IO and native WebSocket connections
 * with automatic reconnection, TypeScript types, and event handling.
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import type * as WSTypes from '../types/websocket';

// Type guard functions
function isSocketIO(connection: Socket | WebSocket | null): connection is Socket {
  return connection !== null && 'emit' in connection && 'io' in connection;
}

function isWebSocket(connection: Socket | WebSocket | null): connection is WebSocket {
  return connection !== null && 'readyState' in connection && 'send' in connection;
}

/**
 * WebSocket Client Implementation
 * Handles both Socket.IO and native WebSocket connections
 */
export class WebSocketClient extends EventEmitter implements WSTypes.IWebSocketClient {
  private connection: Socket | WebSocket | null = null;
  private options: WSTypes.ConnectionOptions;
  private _state: WSTypes.ConnectionState;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private metrics = {
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0,
    connectionTime: 0,
    reconnectCount: 0,
  };
  private connectionStartTime: number | null = null;
  private messageHandlers = new Map<string, Set<Function>>();
  private pendingRequests = new Map<
    string,
    {
      resolve: Function;
      reject: Function;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor(options: WSTypes.ConnectionOptions) {
    super();
    this.options = {
      type: 'socket.io',
      reconnect: true,
      reconnectAttempts: Infinity,
      reconnectDelay: 1000,
      reconnectDelayMax: 5000,
      timeout: 20000,
      ...options,
    };

    this._state = {
      connected: false,
      connecting: false,
      reconnecting: false,
      reconnectAttempts: 0,
      connectionType: this.options.type || 'socket.io',
      url: this.options.url,
    };
  }

  get state(): WSTypes.ConnectionState {
    return { ...this._state };
  }

  get connected(): boolean {
    return this._state.connected;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(options?: Partial<WSTypes.ConnectionOptions>): Promise<void> {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    if (this._state.connected || this._state.connecting) {
      return;
    }

    this._state.connecting = true;
    this._state.lastError = undefined;

    try {
      if (this.options.type === 'socket.io') {
        await this.connectSocketIO();
      } else {
        await this.connectWebSocket();
      }
    } catch (error) {
      this._state.connecting = false;
      this._state.lastError = error as Error;
      this.emit('error', error);

      if (this.options.reconnect) {
        this.scheduleReconnect();
      }

      throw error;
    }
  }

  /**
   * Connect using Socket.IO
   */
  private async connectSocketIO(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = io(this.options.url, {
        reconnection: false, // We handle reconnection ourselves
        timeout: this.options.timeout,
        auth: this.options.auth,
        query: this.options.query,
        transports: ['websocket', 'polling'],
        ...(this.options.headers && { extraHeaders: this.options.headers }),
      });

      const connectTimeout = setTimeout(() => {
        socket.close();
        reject(new Error('Connection timeout'));
      }, this.options.timeout || 20000);

      socket.once('connect', () => {
        clearTimeout(connectTimeout);
        this.connection = socket;
        this.setupSocketIOHandlers(socket);
        this._state.connected = true;
        this._state.connecting = false;
        this._state.reconnecting = false;
        this._state.reconnectAttempts = 0;
        this.connectionStartTime = Date.now();
        this.emit('connect');
        this.startHeartbeat();
        resolve();
      });

      socket.once('connect_error', (error) => {
        clearTimeout(connectTimeout);
        socket.close();
        reject(error);
      });

      this.connection = socket;
    });
  }

  /**
   * Connect using native WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.options.url, this.options.protocols);

        const connectTimeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, this.options.timeout || 20000);

        ws.onopen = () => {
          clearTimeout(connectTimeout);
          this.connection = ws;
          this.setupWebSocketHandlers(ws);
          this._state.connected = true;
          this._state.connecting = false;
          this._state.reconnecting = false;
          this._state.reconnectAttempts = 0;
          this.connectionStartTime = Date.now();
          this.emit('connect');
          this.startHeartbeat();
          resolve();
        };

        ws.onerror = (event) => {
          clearTimeout(connectTimeout);
          const error = new Error('WebSocket connection error');
          this._state.lastError = error;
          if (!this._state.connected) {
            reject(error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          if (!this._state.connected && !event.wasClean) {
            reject(new Error(`WebSocket closed: ${event.reason || 'Unknown reason'}`));
          }
        };

        this.connection = ws;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketIOHandlers(socket: Socket): void {
    // Disconnect handling
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(reason);
    });

    // Error handling
    socket.on('error', (error) => {
      this._state.lastError = error;
      this.emit('error', error);
    });

    // Message handling - proxy all events
    const messageTypes = [
      'fftData',
      'signalsDetected',
      'status',
      'kismetData',
      'kismetDataUpdate',
      'signal',
      'batch',
      'subscribed',
      'heartbeat',
      'configUpdated',
      'openwebrxConnected',
      'openwebrxDisconnected',
      'openwebrxError',
      'bufferCleared',
      'latestFFT',
      'signals',
      'queryResult',
    ];

    messageTypes.forEach((type) => {
      socket.on(type, (data) => {
        this.metrics.messagesReceived++;
        this.metrics.bytesReceived += JSON.stringify(data).length;

        // Emit as specific event
        this.emit(type, data);

        // Also emit as generic message
        const message: WSTypes.WebSocketMessage = {
          type: type as any,
          timestamp: Date.now(),
          ...data,
        };
        this.emit('message', message);

        // Handle pending requests
        const requestKey = `response:${type}`;
        const pending = this.pendingRequests.get(requestKey);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(data);
          this.pendingRequests.delete(requestKey);
        }
      });
    });
  }

  /**
   * Setup native WebSocket event handlers
   */
  private setupWebSocketHandlers(ws: WebSocket): void {
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.metrics.messagesReceived++;
        this.metrics.bytesReceived += event.data.length;

        if (data.type) {
          // Emit as specific event
          this.emit(data.type, data);

          // Also emit as generic message
          this.emit('message', data);

          // Handle pending requests
          const requestKey = `response:${data.type}`;
          const pending = this.pendingRequests.get(requestKey);
          if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(data);
            this.pendingRequests.delete(requestKey);
          }
        }
      } catch (error) {
        this.emit('error', new Error(`Failed to parse message: ${error}`));
      }
    };

    ws.onerror = (event) => {
      const error = new Error('WebSocket error');
      this._state.lastError = error;
      this.emit('error', error);
    };

    ws.onclose = (event) => {
      this.handleDisconnect(event.reason || 'Connection closed');
    };
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    this._state.connected = false;
    this.stopHeartbeat();

    if (this.connectionStartTime) {
      this.metrics.connectionTime += Date.now() - this.connectionStartTime;
      this.connectionStartTime = null;
    }

    this.emit('disconnect', reason);

    // Clear pending requests
    this.pendingRequests.forEach((pending, key) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
    });
    this.pendingRequests.clear();

    if (this.options.reconnect && !this._state.reconnecting) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this._state.reconnecting || this._state.connected) {
      return;
    }

    if (
      this.options.reconnectAttempts !== undefined &&
      this._state.reconnectAttempts >= this.options.reconnectAttempts
    ) {
      this.emit('reconnect_failed');
      return;
    }

    this._state.reconnecting = true;
    this._state.reconnectAttempts++;
    this.metrics.reconnectCount++;

    const delay = Math.min(
      this.options.reconnectDelay! * Math.pow(1.5, this._state.reconnectAttempts - 1),
      this.options.reconnectDelayMax!,
    );

    this.emit('reconnect_attempt', this._state.reconnectAttempts);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.emit('reconnect', this._state.reconnectAttempts);
      } catch (error) {
        this.emit('reconnect_error', error);
        if (this.options.reconnect) {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this._state.reconnecting = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.connection) {
      if (isSocketIO(this.connection)) {
        this.connection.close();
      } else if (isWebSocket(this.connection)) {
        this.connection.close(1000, 'Client disconnect');
      }
      this.connection = null;
    }

    this._state.connected = false;
    this._state.connecting = false;
  }

  /**
   * Emit an event (Socket.IO style)
   */
  emit<K extends keyof WSTypes.RequestMap>(
    event: K,
    data?: Parameters<WSTypes.RequestMap[K]>[0],
  ): void {
    if (!this._state.connected || !this.connection) {
      throw new Error('Not connected');
    }

    const message = {
      type: event,
      data,
      timestamp: Date.now(),
    };

    this.metrics.messagesSent++;

    if (isSocketIO(this.connection)) {
      this.connection.emit(event as string, data);
      this.metrics.bytesSent += JSON.stringify(data).length;
    } else if (isWebSocket(this.connection)) {
      const payload = JSON.stringify(message);
      this.connection.send(payload);
      this.metrics.bytesSent += payload.length;
    }
  }

  /**
   * Send raw data (native WebSocket style)
   */
  send(data: string | ArrayBuffer | Blob): void {
    if (!this._state.connected || !this.connection) {
      throw new Error('Not connected');
    }

    this.metrics.messagesSent++;

    if (isSocketIO(this.connection)) {
      // For Socket.IO, wrap in a message event
      this.connection.emit('message', data);
      this.metrics.bytesSent += typeof data === 'string' ? data.length : 0;
    } else if (isWebSocket(this.connection)) {
      this.connection.send(data);
      this.metrics.bytesSent += typeof data === 'string' ? data.length : 0;
    }
  }

  /**
   * Request with timeout (Socket.IO style request/response)
   */
  async request<K extends keyof WSTypes.RequestMap, R extends keyof WSTypes.ResponseMap>(
    event: K,
    data?: Parameters<WSTypes.RequestMap[K]>[0],
    timeout?: number,
  ): Promise<WSTypes.ResponseMap[R]> {
    if (!this._state.connected) {
      throw new Error('Not connected');
    }

    const timeoutMs = timeout || this.options.timeout || 10000;
    const requestKey = `response:${String(event)}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestKey);
        reject(new Error(`Request timeout: ${String(event)}`));
      }, timeoutMs);

      this.pendingRequests.set(requestKey, { resolve, reject, timeout: timer });

      try {
        this.emit(event, data);
      } catch (error) {
        this.pendingRequests.delete(requestKey);
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Add event listener with TypeScript support
   */
  on<K extends keyof WSTypes.WebSocketEventMap>(
    event: K,
    handler: WSTypes.WebSocketEventMap[K],
  ): void {
    super.on(event, handler as any);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof WSTypes.WebSocketEventMap>(
    event: K,
    handler: WSTypes.WebSocketEventMap[K],
  ): void {
    super.off(event, handler as any);
  }

  /**
   * Add one-time event listener
   */
  once<K extends keyof WSTypes.WebSocketEventMap>(
    event: K,
    handler: WSTypes.WebSocketEventMap[K],
  ): void {
    super.once(event, handler as any);
  }

  /**
   * Update reconnection options
   */
  setReconnectOptions(options: Partial<WSTypes.ConnectionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get connection metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      connectionTime: this.connectionStartTime
        ? this.metrics.connectionTime + (Date.now() - this.connectionStartTime)
        : this.metrics.connectionTime,
    };
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Only for native WebSocket connections
    if (this.options.type === 'websocket') {
      this.heartbeatTimer = setInterval(() => {
        if (this.connection && isWebSocket(this.connection)) {
          if (this.connection.readyState === WebSocket.OPEN) {
            this.connection.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }
      }, 30000); // 30 seconds
    }
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * Factory function to create WebSocket clients
 */
export function createWebSocketClient(
  options: WSTypes.ConnectionOptions,
): WSTypes.IWebSocketClient {
  return new WebSocketClient(options);
}

// For backward compatibility with vanilla JS
if (typeof window !== 'undefined') {
  (window as any).WebSocketClient = WebSocketClient;
  (window as any).createWebSocketClient = createWebSocketClient;
}

/**
 * WebSocket Connection Management
 * Handles real-time communication with the backend via Socket.IO
 */

import { io, Socket } from 'socket.io-client';
import type {
  WSEvent,
  DeviceUpdateEvent,
  ScanStatusEvent,
  TAKStatusEvent,
  WifiDevice,
  TAKMessage,
  ConnectionStatus
} from './types';

// Event handlers type definitions
interface EventHandlers {
  'device:update': (event: WSEvent<DeviceUpdateEvent>) => void;
  'scan:status': (event: WSEvent<ScanStatusEvent>) => void;
  'tak:status': (event: WSEvent<TAKStatusEvent>) => void;
  'tak:message': (event: WSEvent<{ message: TAKMessage }>) => void;
  'alert:new': (event: WSEvent<{ alert: any }>) => void;
  'server:shutdown': (event: WSEvent<{ message: string }>) => void;
  'error': (error: { message: string; code?: string }) => void;
  'connected': () => void;
  'disconnected': (reason: string) => void;
  'reconnect': (attemptNumber: number) => void;
  'reconnect_error': (error: Error) => void;
}

export class WebSocketClient {
  private socket: Socket | null = null;
  private eventHandlers = new Map<keyof EventHandlers, Set<Function>>();
  private subscriptions = new Set<string>();
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnectAttempts: 0
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime = 0;

  constructor(
    private url: string = 'http://localhost:8001',
    private options: {
      autoConnect?: boolean;
      reconnection?: boolean;
      reconnectionAttempts?: number;
      reconnectionDelay?: number;
      timeout?: number;
    } = {}
  ) {
    this.setupDefaultOptions();
  }

  /**
   * Setup default connection options
   */
  private setupDefaultOptions(): void {
    this.options = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      ...this.options
    };
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      try {
        this.socket = io(this.url, {
          autoConnect: this.options.autoConnect,
          reconnection: this.options.reconnection,
          reconnectionAttempts: this.options.reconnectionAttempts,
          reconnectionDelay: this.options.reconnectionDelay,
          timeout: this.options.timeout,
          transports: ['websocket', 'polling']
        });

        this.setupSocketEventHandlers();

        // Connection success
        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.updateConnectionStatus(true);
          this.startPingInterval();
          
          // Resubscribe to topics after reconnection
          if (this.subscriptions.size > 0) {
            this.socket?.emit('subscribe', Array.from(this.subscriptions));
          }
          
          resolve();
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.updateConnectionStatus(false);
          reject(error);
        });

        // Manual connect if not auto-connecting
        if (!this.options.autoConnect) {
          this.socket.connect();
        }

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('WebSocket disconnected:', reason);
      this.updateConnectionStatus(false);
      this.stopPingInterval();
      this.emit('disconnected', reason);
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      this.connectionStatus.reconnectAttempts = 0;
      this.emit('reconnect', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
      this.connectionStatus.reconnectAttempts++;
      this.emit('reconnect_error', error);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Main event handler
    this.socket.on('event', (event: WSEvent) => {
      this.handleEvent(event);
    });

    // Server messages
    this.socket.on('connected', () => {
      console.log('Server acknowledged connection');
    });
  }

  /**
   * Handle incoming events
   */
  private handleEvent(event: WSEvent): void {
    const handlers = this.eventHandlers.get(event.type as keyof EventHandlers);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error handling event ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Emit event to handlers
   */
  private emit<K extends keyof EventHandlers>(
    event: K,
    ...args: Parameters<EventHandlers[K]>
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as any)(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to event types
   */
  public on<K extends keyof EventHandlers>(
    event: K,
    handler: EventHandlers[K]
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    };
  }

  /**
   * Remove event handler
   */
  public off<K extends keyof EventHandlers>(
    event: K,
    handler?: EventHandlers[K]
  ): void {
    if (handler) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Subscribe to server topics
   */
  public subscribe(topics: string[]): void {
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    topics.forEach(topic => this.subscriptions.add(topic));
    this.socket.emit('subscribe', topics);
  }

  /**
   * Unsubscribe from server topics
   */
  public unsubscribe(topics: string[]): void {
    if (!this.socket?.connected) {
      console.warn('Cannot unsubscribe: WebSocket not connected');
      return;
    }

    topics.forEach(topic => this.subscriptions.delete(topic));
    this.socket.emit('unsubscribe', topics);
  }

  /**
   * Get current subscriptions
   */
  public getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Disconnect from the server
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.stopPingInterval();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateConnectionStatus(false);
    this.subscriptions.clear();
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(connected: boolean): void {
    const now = Date.now();
    
    this.connectionStatus = {
      ...this.connectionStatus,
      connected,
      lastPing: connected ? now : this.connectionStatus.lastPing,
      connectionTime: connected && !this.connectionStatus.connected ? now : this.connectionStatus.connectionTime
    };
  }

  /**
   * Start ping interval for latency measurement
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping', (timestamp: number) => {
          const latency = Date.now() - this.lastPingTime;
          this.connectionStatus.latency = latency;
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Manual ping for latency test
   */
  public ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const startTime = Date.now();
      this.socket.emit('ping', (timestamp: number) => {
        const latency = Date.now() - startTime;
        resolve(latency);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
    });
  }

  /**
   * Convenience methods for specific subscriptions
   */
  public subscribeToDevices(): void {
    this.subscribe(['devices']);
  }

  public subscribeToScan(): void {
    this.subscribe(['scan']);
  }

  public subscribeToTAK(): void {
    this.subscribe(['tak']);
  }

  public subscribeToAlerts(): void {
    this.subscribe(['alerts']);
  }

  public subscribeToAll(): void {
    this.subscribe(['devices', 'scan', 'tak', 'alerts']);
  }

  /**
   * Device update handler helper
   */
  public onDeviceUpdate(
    handler: (device: WifiDevice, action: 'new' | 'update' | 'remove', changes?: Partial<WifiDevice>) => void
  ): () => void {
    return this.on('device:update', (event) => {
      handler(event.data.device, event.data.action, event.data.changes);
    });
  }

  /**
   * Scan status handler helper
   */
  public onScanStatus(handler: (status: ScanStatusEvent) => void): () => void {
    return this.on('scan:status', (event) => {
      handler(event.data);
    });
  }

  /**
   * TAK status handler helper
   */
  public onTAKStatus(handler: (status: TAKStatusEvent) => void): () => void {
    return this.on('tak:status', (event) => {
      handler(event.data);
    });
  }

  /**
   * TAK message handler helper
   */
  public onTAKMessage(handler: (message: TAKMessage) => void): () => void {
    return this.on('tak:message', (event) => {
      handler(event.data.message);
    });
  }

  /**
   * Alert handler helper
   */
  public onAlert(handler: (alert: any) => void): () => void {
    return this.on('alert:new', (event) => {
      handler(event.data.alert);
    });
  }

  /**
   * Connection status change handler
   */
  public onConnectionStatusChange(
    handler: (status: ConnectionStatus) => void
  ): () => void {
    const connectedHandler = this.on('connected', () => {
      handler(this.getConnectionStatus());
    });

    const disconnectedHandler = this.on('disconnected', () => {
      handler(this.getConnectionStatus());
    });

    // Return function to remove both handlers
    return () => {
      connectedHandler();
      disconnectedHandler();
    };
  }

  /**
   * Auto-reconnect with exponential backoff
   */
  public enableAutoReconnect(
    maxAttempts = 10,
    initialDelay = 1000,
    maxDelay = 30000
  ): void {
    this.on('disconnected', () => {
      if (this.connectionStatus.reconnectAttempts < maxAttempts) {
        const delay = Math.min(
          initialDelay * Math.pow(2, this.connectionStatus.reconnectAttempts),
          maxDelay
        );

        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.connectionStatus.reconnectAttempts + 1}/${maxAttempts})`);

        this.reconnectTimer = setTimeout(() => {
          this.connect().catch(error => {
            console.error('Reconnection attempt failed:', error);
          });
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    });
  }

  /**
   * Disable auto-reconnect
   */
  public disableAutoReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Create and export default instance
export const wsClient = new WebSocketClient();

// Export class for custom instances
export { WebSocketClient };
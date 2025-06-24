/**
 * WebSocket Handler with Socket.IO
 * Manages real-time communication for WigleToTAK
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import winston from 'winston';
import type {
  WSEvent,
  DeviceUpdateEvent,
  ScanStatusEvent,
  TAKStatusEvent,
  WifiDevice,
  TAKMessage
} from '../types/index.js';

// Socket.IO event types
interface ServerToClientEvents {
  event: (event: WSEvent) => void;
  connected: () => void;
  error: (error: { message: string; code?: string }) => void;
}

interface ClientToServerEvents {
  subscribe: (topics: string[]) => void;
  unsubscribe: (topics: string[]) => void;
  ping: (callback: (timestamp: number) => void) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  clientId: string;
  subscribedTopics: Set<string>;
  connectedAt: number;
}

export class WebSocketHandler {
  private io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  private logger: winston.Logger;
  private clients: Map<string, Socket> = new Map();

  constructor(server: HTTPServer, logger: winston.Logger, corsOrigin: string = '*') {
    this.logger = logger;
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    this.setupHandlers();
  }

  /**
   * Setup socket handlers
   */
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Middleware for authentication if needed
    this.io.use((socket, next) => {
      // Add authentication logic here if needed
      // const token = socket.handshake.auth.token;
      // if (!isValidToken(token)) {
      //   return next(new Error('Authentication failed'));
      // }
      socket.data.clientId = socket.id;
      socket.data.subscribedTopics = new Set();
      socket.data.connectedAt = Date.now();
      next();
    });
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void {
    this.logger.info(`WebSocket client connected: ${socket.id}`);
    this.clients.set(socket.id, socket);

    // Send connection confirmation
    socket.emit('connected');

    // Handle subscriptions
    socket.on('subscribe', (topics: string[]) => {
      topics.forEach(topic => {
        socket.join(topic);
        socket.data.subscribedTopics.add(topic);
        this.logger.debug(`Client ${socket.id} subscribed to ${topic}`);
      });
    });

    // Handle unsubscriptions
    socket.on('unsubscribe', (topics: string[]) => {
      topics.forEach(topic => {
        socket.leave(topic);
        socket.data.subscribedTopics.delete(topic);
        this.logger.debug(`Client ${socket.id} unsubscribed from ${topic}`);
      });
    });

    // Handle ping for latency measurement
    socket.on('ping', (callback) => {
      callback(Date.now());
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.logger.info(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
      this.clients.delete(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
      this.logger.error(`WebSocket error for client ${socket.id}:`, error);
    });
  }

  /**
   * Emit device update event
   */
  public emitDeviceUpdate(device: WifiDevice, action: 'new' | 'update' | 'remove', changes?: Partial<WifiDevice>): void {
    const event: WSEvent<DeviceUpdateEvent> = {
      type: 'device:update',
      data: {
        device,
        action,
        changes
      },
      timestamp: Date.now(),
      id: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.io.to('devices').emit('event', event);
  }

  /**
   * Emit scan status update
   */
  public emitScanStatus(status: ScanStatusEvent): void {
    const event: WSEvent<ScanStatusEvent> = {
      type: 'scan:status',
      data: status,
      timestamp: Date.now(),
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.io.to('scan').emit('event', event);
  }

  /**
   * Emit TAK status update
   */
  public emitTAKStatus(status: TAKStatusEvent): void {
    const event: WSEvent<TAKStatusEvent> = {
      type: 'tak:status',
      data: status,
      timestamp: Date.now(),
      id: `tak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.io.to('tak').emit('event', event);
  }

  /**
   * Emit TAK message sent
   */
  public emitTAKMessage(message: TAKMessage): void {
    const event: WSEvent<{ message: TAKMessage }> = {
      type: 'tak:message',
      data: { message },
      timestamp: Date.now(),
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.io.to('tak').emit('event', event);
  }

  /**
   * Emit alert
   */
  public emitAlert(alert: any): void {
    const event: WSEvent<{ alert: any }> = {
      type: 'alert:new',
      data: { alert },
      timestamp: Date.now(),
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.io.to('alerts').emit('event', event);
  }

  /**
   * Emit error to specific client
   */
  public emitError(clientId: string, message: string, code?: string): void {
    const socket = this.clients.get(clientId);
    if (socket) {
      socket.emit('error', { message, code });
    }
  }

  /**
   * Broadcast event to all clients in a room
   */
  public broadcast(room: string, event: WSEvent): void {
    this.io.to(room).emit('event', event);
  }

  /**
   * Get connected clients info
   */
  public getClients(): Array<{
    id: string;
    connectedAt: number;
    subscribedTopics: string[];
  }> {
    const clientInfo: Array<{
      id: string;
      connectedAt: number;
      subscribedTopics: string[];
    }> = [];

    this.clients.forEach((socket, id) => {
      clientInfo.push({
        id,
        connectedAt: socket.data.connectedAt,
        subscribedTopics: Array.from(socket.data.subscribedTopics)
      });
    });

    return clientInfo;
  }

  /**
   * Get room statistics
   */
  public getRoomStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    const rooms = this.io.sockets.adapter.rooms;

    rooms.forEach((sockets, room) => {
      // Skip individual socket rooms
      if (!this.clients.has(room)) {
        stats[room] = sockets.size;
      }
    });

    return stats;
  }

  /**
   * Disconnect a specific client
   */
  public disconnectClient(clientId: string, reason: string = 'Server initiated disconnect'): void {
    const socket = this.clients.get(clientId);
    if (socket) {
      socket.disconnect(true);
      this.logger.info(`Forcefully disconnected client ${clientId}: ${reason}`);
    }
  }

  /**
   * Shutdown WebSocket server
   */
  public shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.info('Shutting down WebSocket server...');
      
      // Notify all clients
      const shutdownEvent: WSEvent<{ message: string }> = {
        type: 'server:shutdown',
        data: { message: 'Server is shutting down' },
        timestamp: Date.now()
      };
      
      this.io.emit('event', shutdownEvent);

      // Close all connections
      this.io.close(() => {
        this.logger.info('WebSocket server shut down');
        resolve();
      });
    });
  }

  /**
   * Get Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}
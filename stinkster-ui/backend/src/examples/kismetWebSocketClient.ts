/**
 * Example Kismet WebSocket Client
 * Demonstrates how to connect and subscribe to Kismet real-time data
 */

import { io, Socket } from 'socket.io-client';
import type { WSEvent } from '../types/index.js';

// Configuration
const WEBSOCKET_URL = process.env.WS_URL || 'http://localhost:8001';

class KismetWebSocketClient {
  private socket: Socket;
  private connected: boolean = false;

  constructor(url: string = WEBSOCKET_URL) {
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      this.connected = true;
      
      // Subscribe to Kismet topics
      this.subscribeToTopics(['devices', 'alerts', 'system', 'scan', 'tak']);
    });

    this.socket.on('connected', () => {
      console.log('✅ Server acknowledged connection');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    // Handle incoming events
    this.socket.on('event', (event: WSEvent) => {
      this.handleEvent(event);
    });

    // Handle errors
    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  /**
   * Subscribe to topics
   */
  private subscribeToTopics(topics: string[]): void {
    console.log('📡 Subscribing to topics:', topics);
    this.socket.emit('subscribe', topics);
  }

  /**
   * Handle incoming events
   */
  private handleEvent(event: WSEvent): void {
    switch (event.type) {
      case 'device:update':
        this.handleDeviceUpdate(event);
        break;
      
      case 'device:remove':
        this.handleDeviceRemove(event);
        break;
      
      case 'alert:new':
        this.handleAlert(event);
        break;
      
      case 'scan:status':
        this.handleScanStatus(event);
        break;
      
      case 'tak:status':
        this.handleTAKStatus(event);
        break;
      
      case 'tak:message':
        this.handleTAKMessage(event);
        break;
      
      case 'server:shutdown':
        console.log('⚠️  Server shutting down:', event.data);
        break;
      
      default:
        console.log('📨 Unknown event:', event.type, event.data);
    }
  }

  /**
   * Handle device update events
   */
  private handleDeviceUpdate(event: WSEvent): void {
    const { device, action, changes } = event.data;
    
    switch (action) {
      case 'new':
        console.log(`🆕 New device: ${device.ssid || 'Hidden'} (${device.mac})`);
        console.log(`   Signal: ${device.signal} dBm, Channel: ${device.channel}`);
        break;
      
      case 'update':
        console.log(`🔄 Device updated: ${device.ssid || 'Hidden'} (${device.mac})`);
        if (changes) {
          console.log('   Changes:', changes);
        }
        break;
    }
  }

  /**
   * Handle device remove events
   */
  private handleDeviceRemove(event: WSEvent): void {
    const { device } = event.data;
    console.log(`🗑️  Device removed: ${device.ssid || 'Hidden'} (${device.mac})`);
  }

  /**
   * Handle alert events
   */
  private handleAlert(event: WSEvent): void {
    const { alert } = event.data;
    const severityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    };
    
    console.log(`${severityEmoji[alert.severity]} Alert: ${alert.message}`);
    console.log(`   Type: ${alert.type}, Device: ${alert.deviceKey || 'N/A'}`);
  }

  /**
   * Handle scan status events
   */
  private handleScanStatus(event: WSEvent): void {
    const status = event.data;
    console.log(`📡 Scan Status: ${status.scanning ? 'Active' : 'Idle'}`);
    console.log(`   Devices: ${status.devicesFound}, Packets: ${status.packetsProcessed}`);
    if (status.currentChannel) {
      console.log(`   Channel: ${status.currentChannel}`);
    }
  }

  /**
   * Handle TAK status events
   */
  private handleTAKStatus(event: WSEvent): void {
    const status = event.data;
    console.log(`🗺️  TAK Status: ${status.connected ? 'Connected' : 'Disconnected'}`);
    console.log(`   Messages sent: ${status.messagesSent}, Queue: ${status.queueSize}`);
  }

  /**
   * Handle TAK message events
   */
  private handleTAKMessage(event: WSEvent): void {
    const { message } = event.data;
    console.log(`📤 TAK Message sent: ${message.detail?.contact?.callsign || message.uid}`);
  }

  /**
   * Send ping to measure latency
   */
  public ping(): void {
    const start = Date.now();
    this.socket.emit('ping', (timestamp: number) => {
      const latency = Date.now() - start;
      console.log(`🏓 Pong! Latency: ${latency}ms`);
    });
  }

  /**
   * Unsubscribe from topics
   */
  public unsubscribe(topics: string[]): void {
    console.log('🔕 Unsubscribing from topics:', topics);
    this.socket.emit('unsubscribe', topics);
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    console.log('👋 Disconnecting...');
    this.socket.disconnect();
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connected && this.socket.connected;
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Kismet WebSocket client example...');
  
  const client = new KismetWebSocketClient();
  
  // Ping every 10 seconds
  setInterval(() => {
    if (client.isConnected()) {
      client.ping();
    }
  }, 10000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    client.disconnect();
    process.exit(0);
  });

  // Keep the process alive
  process.stdin.resume();
}

export { KismetWebSocketClient };
/**
 * TAK Broadcaster Service
 * Handles sending TAK messages via TCP/UDP
 */

import { createSocket, Socket } from 'dgram';
import { createConnection, Socket as TCPSocket } from 'net';
import { EventEmitter } from 'events';
import type { TAKMessage, TAKServerConfig } from '../types/index.js';
import { WigleToTakCore } from './wigleToTakCore.js';
import winston from 'winston';

export interface BroadcasterEvents {
  connected: () => void;
  disconnected: (error?: Error) => void;
  messageSent: (message: TAKMessage) => void;
  error: (error: Error) => void;
}

export class TAKBroadcaster extends EventEmitter {
  private config: TAKServerConfig;
  private udpSocket?: Socket;
  private tcpSocket?: TCPSocket;
  private connected: boolean = false;
  private messageQueue: TAKMessage[] = [];
  private processing: boolean = false;
  private messagesSent: number = 0;
  private errors: number = 0;
  private logger: winston.Logger;

  constructor(config: TAKServerConfig, logger: winston.Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  /**
   * Connect to TAK server
   */
  public async connect(): Promise<void> {
    try {
      if (this.config.protocol === 'UDP') {
        await this.connectUDP();
      } else {
        await this.connectTCP();
      }
      this.connected = true;
      this.emit('connected');
      this.processQueue();
    } catch (error) {
      this.logger.error('Failed to connect to TAK server:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Connect via UDP
   */
  private async connectUDP(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.udpSocket = createSocket('udp4');

      this.udpSocket.on('error', (error) => {
        this.logger.error('UDP socket error:', error);
        this.handleError(error);
      });

      this.udpSocket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      // Bind to any available port
      this.udpSocket.bind(() => {
        if (this.config.multicast && this.config.multicastGroup) {
          // Enable multicast
          this.udpSocket!.setBroadcast(true);
          this.udpSocket!.setMulticastTTL(128);
          this.logger.info(`UDP socket connected for multicast to ${this.config.multicastGroup}:${this.config.port}`);
        } else {
          this.logger.info(`UDP socket connected to ${this.config.host}:${this.config.port}`);
        }
        resolve();
      });
    });
  }

  /**
   * Connect via TCP
   */
  private async connectTCP(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tcpSocket = createConnection({
        host: this.config.host,
        port: this.config.port
      });

      this.tcpSocket.on('connect', () => {
        this.logger.info(`TCP connected to ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.tcpSocket.on('error', (error) => {
        this.logger.error('TCP socket error:', error);
        this.handleError(error);
        reject(error);
      });

      this.tcpSocket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      // Set timeout
      this.tcpSocket.setTimeout(30000);
      this.tcpSocket.on('timeout', () => {
        this.logger.warn('TCP socket timeout');
        this.disconnect();
      });
    });
  }

  /**
   * Disconnect from TAK server
   */
  public disconnect(): void {
    this.connected = false;

    if (this.udpSocket) {
      this.udpSocket.close();
      this.udpSocket = undefined;
    }

    if (this.tcpSocket) {
      this.tcpSocket.destroy();
      this.tcpSocket = undefined;
    }

    this.emit('disconnected');
    this.logger.info('Disconnected from TAK server');
  }

  /**
   * Send TAK message
   */
  public async sendMessage(message: TAKMessage, core: WigleToTakCore): Promise<void> {
    if (!this.connected) {
      this.messageQueue.push(message);
      throw new Error('Not connected to TAK server');
    }

    try {
      const xml = core.takMessageToXML(message);
      const buffer = Buffer.from(xml, 'utf-8');

      if (this.config.protocol === 'UDP') {
        await this.sendUDP(buffer);
      } else {
        await this.sendTCP(buffer);
      }

      this.messagesSent++;
      this.emit('messageSent', message);
      this.logger.debug(`Sent TAK message: ${message.uid}`);
    } catch (error) {
      this.errors++;
      this.logger.error('Failed to send TAK message:', error);
      throw error;
    }
  }

  /**
   * Send via UDP
   */
  private async sendUDP(buffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.udpSocket) {
        reject(new Error('UDP socket not initialized'));
        return;
      }

      const host = this.config.multicast && this.config.multicastGroup 
        ? this.config.multicastGroup 
        : this.config.host;

      this.udpSocket.send(buffer, 0, buffer.length, this.config.port, host, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Send via TCP
   */
  private async sendTCP(buffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.tcpSocket) {
        reject(new Error('TCP socket not initialized'));
        return;
      }

      this.tcpSocket.write(buffer, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Queue a message for sending
   */
  public queueMessage(message: TAKMessage): void {
    this.messageQueue.push(message);
    if (this.connected && !this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process message queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.messageQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.messageQueue.length > 0 && this.connected) {
      const message = this.messageQueue.shift();
      if (message) {
        try {
          // Note: We'll need the core instance here
          // This is a design consideration - we might want to pass it differently
          // await this.sendMessage(message, core);
          this.logger.warn('Message queued but core instance not available');
        } catch (error) {
          this.logger.error('Failed to send queued message:', error);
          // Re-queue the message
          this.messageQueue.unshift(message);
          break;
        }
      }
    }

    this.processing = false;
  }

  /**
   * Handle socket errors
   */
  private handleError(error: Error): void {
    this.errors++;
    this.emit('error', error);
    
    // Attempt reconnection after delay
    if (this.connected) {
      this.disconnect();
      setTimeout(() => {
        this.connect().catch(err => {
          this.logger.error('Reconnection failed:', err);
        });
      }, 5000);
    }
  }

  /**
   * Get broadcaster status
   */
  public getStatus(): {
    connected: boolean;
    protocol: string;
    server: string;
    port: number;
    messagesSent: number;
    errors: number;
    queueSize: number;
  } {
    return {
      connected: this.connected,
      protocol: this.config.protocol,
      server: this.config.host,
      port: this.config.port,
      messagesSent: this.messagesSent,
      errors: this.errors,
      queueSize: this.messageQueue.length
    };
  }

  /**
   * Update configuration
   */
  public async updateConfig(config: TAKServerConfig): Promise<void> {
    const wasConnected = this.connected;
    
    if (wasConnected) {
      this.disconnect();
    }

    this.config = config;

    if (wasConnected) {
      await this.connect();
    }
  }
}
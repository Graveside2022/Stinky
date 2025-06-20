/**
 * GPS Bridge Service - Main Entry Point
 * 
 * Node.js implementation of the GPS Bridge service
 * Bridges MAVLink GPS data to GPSD protocol
 */

const net = require('net');
const { createServiceLogger } = require('../shared/logger');
const config = require('../config');
const { ServiceError, ConnectionError } = require('../shared/errors');

class GPSBridgeService {
    constructor(options = {}) {
        this.config = {
            ...config.getServiceConfig('gpsBridge'),
            ...options
        };
        
        this.logger = createServiceLogger('gps-bridge');
        
        // Service state
        this.isRunning = false;
        this.tcpServer = null;
        this.connectedClients = new Map();
        this.mavlinkClient = null;
        
        // GPS data state
        this.currentGPSData = {
            lat: 0,
            lon: 0,
            alt: 0,
            speed: 0,
            track: 0,
            time: new Date().toISOString(),
            mode: 0,
            satellites_visible: 0,
            hdop: 0,
            vdop: 0
        };
        
        this.setupTcpServer();
    }

    setupTcpServer() {
        this.tcpServer = net.createServer((socket) => {
            this.handleClientConnection(socket);
        });

        this.tcpServer.on('error', (error) => {
            this.logger.error('TCP server error:', error);
        });

        this.tcpServer.on('close', () => {
            this.logger.info('TCP server closed');
        });
    }

    handleClientConnection(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        
        this.logger.info(`GPSD client connected: ${clientId}`);
        
        this.connectedClients.set(clientId, {
            socket: socket,
            connectedAt: Date.now(),
            watchEnabled: false
        });

        // Send initial GPSD handshake
        this.sendGPSDHandshake(socket);

        socket.on('data', (data) => {
            this.handleClientData(clientId, data);
        });

        socket.on('close', () => {
            this.logger.info(`GPSD client disconnected: ${clientId}`);
            this.connectedClients.delete(clientId);
        });

        socket.on('error', (error) => {
            this.logger.error(`GPSD client error ${clientId}:`, error);
            this.connectedClients.delete(clientId);
        });
    }

    sendGPSDHandshake(socket) {
        // Send GPSD version information
        const versionMessage = {
            class: "VERSION",
            release: this.config.gpsd?.release_version || "3.17",
            rev: "1.0",
            proto_major: 3,
            proto_minor: 11
        };
        
        this.sendMessage(socket, versionMessage);

        // Send device information
        const deviceMessage = {
            class: "DEVICES",
            devices: [{
                path: this.config.gpsd?.device_path || "mavlink",
                driver: this.config.gpsd?.driver_name || "MAVLink",
                subtype: "GPS",
                activated: new Date().toISOString(),
                flags: 1,
                native: 0,
                bps: 4800,
                parity: "N",
                stopbits: 1,
                cycle: 1.00
            }]
        };
        
        this.sendMessage(socket, deviceMessage);
    }

    handleClientData(clientId, data) {
        const client = this.connectedClients.get(clientId);
        if (!client) return;

        const command = data.toString().trim();
        this.logger.debug(`GPSD command from ${clientId}: ${command}`);

        if (command.startsWith('?WATCH=')) {
            this.handleWatchCommand(clientId, command);
        } else if (command === '?DEVICES;') {
            this.handleDevicesCommand(clientId);
        } else if (command === '?VERSION;') {
            this.handleVersionCommand(clientId);
        } else {
            this.logger.debug(`Unknown GPSD command: ${command}`);
        }
    }

    handleWatchCommand(clientId, command) {
        const client = this.connectedClients.get(clientId);
        if (!client) return;

        // Parse watch command (simplified)
        const watchEnabled = command.includes('"enable":true');
        client.watchEnabled = watchEnabled;

        const watchResponse = {
            class: "WATCH",
            enable: watchEnabled,
            json: true,
            nmea: false,
            raw: 0,
            scaled: false,
            timing: false,
            split24: false,
            pps: false
        };

        this.sendMessage(client.socket, watchResponse);

        if (watchEnabled) {
            // Send current GPS data
            this.sendCurrentGPSData(client.socket);
        }

        this.logger.debug(`Watch ${watchEnabled ? 'enabled' : 'disabled'} for client ${clientId}`);
    }

    handleDevicesCommand(clientId) {
        const client = this.connectedClients.get(clientId);
        if (!client) return;

        const deviceMessage = {
            class: "DEVICES",
            devices: [{
                path: this.config.gpsd?.device_path || "mavlink",
                driver: this.config.gpsd?.driver_name || "MAVLink",
                subtype: "GPS"
            }]
        };

        this.sendMessage(client.socket, deviceMessage);
    }

    handleVersionCommand(clientId) {
        const client = this.connectedClients.get(clientId);
        if (!client) return;

        const versionMessage = {
            class: "VERSION",
            release: this.config.gpsd?.release_version || "3.17",
            rev: "1.0",
            proto_major: 3,
            proto_minor: 11
        };

        this.sendMessage(client.socket, versionMessage);
    }

    sendMessage(socket, message) {
        try {
            const jsonMessage = JSON.stringify(message) + '\n';
            socket.write(jsonMessage);
        } catch (error) {
            this.logger.error('Error sending message to client:', error);
        }
    }

    sendCurrentGPSData(socket) {
        // Send TPV (Time-Position-Velocity) message
        const tpvMessage = {
            class: "TPV",
            device: this.config.gpsd?.device_path || "mavlink",
            mode: this.currentGPSData.mode,
            time: this.currentGPSData.time,
            lat: this.currentGPSData.lat,
            lon: this.currentGPSData.lon,
            alt: this.currentGPSData.alt,
            track: this.currentGPSData.track,
            speed: this.currentGPSData.speed
        };

        this.sendMessage(socket, tpvMessage);

        // Send SKY (satellite info) message
        const skyMessage = {
            class: "SKY",
            device: this.config.gpsd?.device_path || "mavlink",
            satellites: Array(this.currentGPSData.satellites_visible).fill({
                PRN: 1,
                el: 45,
                az: 180,
                ss: 35,
                used: true
            }),
            hdop: this.currentGPSData.hdop,
            vdop: this.currentGPSData.vdop
        };

        this.sendMessage(socket, skyMessage);
    }

    broadcastGPSData() {
        for (const [clientId, client] of this.connectedClients) {
            if (client.watchEnabled) {
                this.sendCurrentGPSData(client.socket);
            }
        }
    }

    updateGPSData(mavlinkData) {
        // Convert MAVLink GPS data to GPSD format
        this.currentGPSData = {
            lat: mavlinkData.lat / 1e7, // MAVLink uses 1e7 scaling
            lon: mavlinkData.lon / 1e7,
            alt: mavlinkData.alt / 1000.0, // MAVLink uses mm, GPSD uses m
            speed: Math.sqrt(mavlinkData.vx * mavlinkData.vx + mavlinkData.vy * mavlinkData.vy) / 100.0,
            track: mavlinkData.hdg !== 65535 ? mavlinkData.hdg / 100.0 : 0,
            time: new Date().toISOString(),
            mode: mavlinkData.fix_type || 0,
            satellites_visible: mavlinkData.satellites_visible || 0,
            hdop: mavlinkData.eph ? mavlinkData.eph / 100.0 : 0,
            vdop: mavlinkData.epv ? mavlinkData.epv / 100.0 : 0
        };

        this.logger.debug('GPS data updated', {
            lat: this.currentGPSData.lat,
            lon: this.currentGPSData.lon,
            alt: this.currentGPSData.alt,
            fix_type: this.currentGPSData.mode
        });

        // Broadcast to all watching clients
        this.broadcastGPSData();
    }

    async initializeMAVLinkClient() {
        try {
            this.logger.info('Initializing MAVLink client...');
            
            // TODO: Implement actual MAVLink client initialization
            // const MAVLinkClient = require('./mavlink-client');
            // this.mavlinkClient = new MAVLinkClient(this.config.mavlink);
            // await this.mavlinkClient.connect();
            
            // For now, simulate GPS data
            this.startGPSSimulation();
            
            this.logger.info('MAVLink client initialization completed');
            
        } catch (error) {
            this.logger.warn('MAVLink client initialization failed:', error);
            // Continue with simulated data
            this.startGPSSimulation();
        }
    }

    startGPSSimulation() {
        // Generate simulated GPS data for testing
        setInterval(() => {
            const simulatedData = {
                lat: 37.7749 * 1e7 + (Math.random() - 0.5) * 1000, // San Francisco area
                lon: -122.4194 * 1e7 + (Math.random() - 0.5) * 1000,
                alt: 100000 + Math.random() * 50000, // 100-150m
                vx: (Math.random() - 0.5) * 1000, // m/s * 100
                vy: (Math.random() - 0.5) * 1000,
                hdg: Math.random() * 36000, // degrees * 100
                fix_type: 3, // 3D fix
                satellites_visible: 8 + Math.floor(Math.random() * 4),
                eph: 100 + Math.random() * 50, // cm
                epv: 150 + Math.random() * 100
            };
            
            this.updateGPSData(simulatedData);
        }, 1000); // Update every second

        this.logger.info('GPS simulation started');
    }

    async start() {
        try {
            this.startTime = Date.now();
            
            // Initialize MAVLink client
            await this.initializeMAVLinkClient();
            
            // Start TCP server
            await new Promise((resolve, reject) => {
                this.tcpServer.listen(this.config.port, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            this.isRunning = true;
            
            this.logger.info(`GPS Bridge service started`, {
                port: this.config.port,
                environment: this.config.environment || 'production',
                mavlink_connection: this.config.mavlink?.connection
            });

        } catch (error) {
            this.logger.error('Failed to start GPS Bridge service:', error);
            throw new ServiceError('Failed to start service', { originalError: error });
        }
    }

    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.logger.info('Stopping GPS Bridge service...');

        try {
            // Close all client connections
            for (const [clientId, client] of this.connectedClients) {
                client.socket.end();
            }
            this.connectedClients.clear();
            
            // Disconnect MAVLink client
            if (this.mavlinkClient) {
                await this.mavlinkClient.disconnect();
            }
            
            // Close TCP server
            await new Promise((resolve) => {
                this.tcpServer.close(resolve);
            });

            this.isRunning = false;
            this.logger.info('GPS Bridge service stopped successfully');

        } catch (error) {
            this.logger.error('Error stopping GPS Bridge service:', error);
            throw new ServiceError('Failed to stop service gracefully', { originalError: error });
        }
    }

    getServiceInfo() {
        return {
            name: 'gps-bridge',
            version: '2.0.0',
            description: 'MAVLink to GPSD Protocol Bridge',
            port: this.config.port,
            status: this.isRunning ? 'running' : 'stopped',
            uptime: this.isRunning ? Date.now() - this.startTime : 0,
            connected_clients: this.connectedClients.size,
            current_gps: {
                lat: this.currentGPSData.lat,
                lon: this.currentGPSData.lon,
                fix_type: this.currentGPSData.mode
            }
        };
    }

    // Health check method
    getStatus() {
        return {
            service: 'gps-bridge',
            status: this.isRunning ? 'running' : 'stopped',
            clients_connected: this.connectedClients.size,
            mavlink_connected: this.mavlinkClient?.isConnected() || false,
            last_gps_update: this.currentGPSData.time,
            current_position: {
                lat: this.currentGPSData.lat,
                lon: this.currentGPSData.lon,
                alt: this.currentGPSData.alt
            },
            uptime: this.isRunning ? Date.now() - this.startTime : 0
        };
    }
}

// Export for use as a module
module.exports = GPSBridgeService;

// Allow running as standalone service
if (require.main === module) {
    const service = new GPSBridgeService();
    
    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await service.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await service.stop();
        process.exit(0);
    });
    
    // Start the service
    service.start().catch(error => {
        console.error('Failed to start GPS Bridge service:', error);
        process.exit(1);
    });
}
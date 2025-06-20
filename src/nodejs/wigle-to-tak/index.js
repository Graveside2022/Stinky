/**
 * WigleToTAK Service - Main Entry Point
 * 
 * Node.js implementation of the WigleToTAK service
 * Converts WiFi scan data (Wigle CSV) to TAK format and broadcasts via UDP
 */

const express = require('express');
const path = require('path');
const dgram = require('dgram');

const { createServiceLogger } = require('../shared/logger');
const config = require('../config');
const { ValidationError, ServiceError, asyncHandler, createErrorHandler } = require('../shared/errors');
const validator = require('../shared/validator');

class WigleToTAKService {
    constructor(options = {}) {
        this.config = {
            ...config.getServiceConfig('wigleToTak'),
            ...options
        };
        
        this.logger = createServiceLogger('wigle-to-tak');
        this.app = express();
        
        // Service state
        this.isRunning = false;
        this.broadcasting = false;
        this.takServerIP = this.config.tak?.default_server_ip || '0.0.0.0';
        this.takServerPort = this.config.tak?.default_server_port || 6969;
        this.takMulticastState = true;
        this.analysisMode = 'realtime';
        
        // Filtering lists
        this.whitelistedSSIDs = new Set();
        this.whitelistedMACs = new Set();
        this.blacklistedSSIDs = new Map();
        this.blacklistedMACs = new Map();
        
        // Antenna sensitivity settings
        this.antennaSensitivity = this.config.antenna?.default_sensitivity || 'standard';
        this.customAntenneFactor = this.config.antenna?.sensitivity_factors?.custom || 1.0;
        
        // Processing state
        this.processedMACs = new Set();
        this.csvMonitor = null;
        this.udpSocket = null;
        
        this.setupUDPSocket();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupUDPSocket() {
        this.udpSocket = dgram.createSocket('udp4');
        
        this.udpSocket.on('error', (error) => {
            this.logger.error('UDP socket error:', error);
        });
        
        this.udpSocket.bind(() => {
            this.udpSocket.setBroadcast(true);
            this.udpSocket.setMulticastTTL(this.config.tak?.multicast_ttl || 1);
            this.logger.debug('UDP socket initialized');
        });
    }

    setupMiddleware() {
        // Security and parsing middleware
        this.app.use(require('helmet')());
        this.app.use(require('cors')());
        this.app.use(require('compression')());
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
        
        // Logging middleware
        this.app.use(require('../shared/logger').getExpressMiddleware());
        
        // Static files
        this.app.use(express.static(path.join(__dirname, '../public/wigle-to-tak')));
        
        // Make service instance available to routes
        this.app.locals.service = this;
    }

    setupRoutes() {
        // Main HTML interface
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/wigle-to-tak/index.html'));
        });

        // TAK settings endpoint
        this.app.post('/update_tak_settings', asyncHandler(async (req, res) => {
            const validated = validator.validateTAKSettings(req.body);
            
            this.takServerIP = validated.tak_server_ip;
            this.takServerPort = parseInt(validated.tak_server_port, 10);
            
            this.logger.info('TAK settings updated', {
                server_ip: this.takServerIP,
                server_port: this.takServerPort
            });
            
            res.json({ message: `TAK server updated to ${this.takServerIP}:${this.takServerPort}` });
        }));

        // Multicast state endpoint
        this.app.post('/update_multicast_state', asyncHandler(async (req, res) => {
            const validated = validator.validateMulticastSettings(req.body);
            
            this.takMulticastState = validated.takMulticast;
            
            this.logger.info('Multicast state updated', {
                multicast_enabled: this.takMulticastState
            });
            
            res.json({ 
                message: `Multicast ${this.takMulticastState ? 'enabled' : 'disabled'}` 
            });
        }));

        // Analysis mode endpoint
        this.app.post('/update_analysis_mode', asyncHandler(async (req, res) => {
            const validated = validator.validateAnalysisMode(req.body);
            
            this.analysisMode = validated.mode;
            
            this.logger.info('Analysis mode updated', {
                mode: this.analysisMode
            });
            
            res.json({ message: `Analysis mode set to ${this.analysisMode}` });
        }));

        // List Wigle files endpoint
        this.app.get('/list_wigle_files', asyncHandler(async (req, res) => {
            const directory = req.query.directory || this.config.data?.wigle_directory || './data';
            const files = await this.listWigleFiles(directory);
            res.json({ files });
        }));

        // Start broadcast endpoint
        this.app.post('/start_broadcast', asyncHandler(async (req, res) => {
            const validated = validator.validateWigleFile(req.body);
            
            await this.startBroadcast(validated.directory, validated.filename);
            
            res.json({ 
                message: `Broadcasting started for ${validated.filename} in ${this.analysisMode} mode` 
            });
        }));

        // Stop broadcast endpoint
        this.app.post('/stop_broadcast', asyncHandler(async (req, res) => {
            this.stopBroadcast();
            res.json({ message: 'Broadcasting stopped' });
        }));

        // Whitelist management
        this.app.post('/add_to_whitelist', asyncHandler(async (req, res) => {
            const validated = validator.validateWhitelistEntry(req.body);
            
            if (validated.ssid) {
                this.whitelistedSSIDs.add(validated.ssid);
                this.logger.info('Added SSID to whitelist', { ssid: validated.ssid });
                res.json({ message: `SSID "${validated.ssid}" added to whitelist` });
            } else if (validated.mac) {
                this.whitelistedMACs.add(validated.mac);
                this.logger.info('Added MAC to whitelist', { mac: validated.mac });
                res.json({ message: `MAC "${validated.mac}" added to whitelist` });
            }
        }));

        this.app.post('/remove_from_whitelist', asyncHandler(async (req, res) => {
            const validated = validator.validateWhitelistEntry(req.body);
            
            if (validated.ssid) {
                this.whitelistedSSIDs.delete(validated.ssid);
                this.logger.info('Removed SSID from whitelist', { ssid: validated.ssid });
                res.json({ message: `SSID "${validated.ssid}" removed from whitelist` });
            } else if (validated.mac) {
                this.whitelistedMACs.delete(validated.mac);
                this.logger.info('Removed MAC from whitelist', { mac: validated.mac });
                res.json({ message: `MAC "${validated.mac}" removed from whitelist` });
            }
        }));

        // Blacklist management
        this.app.post('/add_to_blacklist', asyncHandler(async (req, res) => {
            const validated = validator.validateBlacklistEntry(req.body);
            
            if (validated.ssid) {
                this.blacklistedSSIDs.set(validated.ssid, validated.argb_value);
                this.logger.info('Added SSID to blacklist', { 
                    ssid: validated.ssid, 
                    color: validated.argb_value 
                });
                res.json({ message: `SSID "${validated.ssid}" added to blacklist` });
            } else if (validated.mac) {
                this.blacklistedMACs.set(validated.mac, validated.argb_value);
                this.logger.info('Added MAC to blacklist', { 
                    mac: validated.mac, 
                    color: validated.argb_value 
                });
                res.json({ message: `MAC "${validated.mac}" added to blacklist` });
            }
        }));

        this.app.post('/remove_from_blacklist', asyncHandler(async (req, res) => {
            const validated = validator.validateBlacklistEntry(req.body);
            
            if (validated.ssid) {
                this.blacklistedSSIDs.delete(validated.ssid);
                this.logger.info('Removed SSID from blacklist', { ssid: validated.ssid });
                res.json({ message: `SSID "${validated.ssid}" removed from blacklist` });
            } else if (validated.mac) {
                this.blacklistedMACs.delete(validated.mac);
                this.logger.info('Removed MAC from blacklist', { mac: validated.mac });
                res.json({ message: `MAC "${validated.mac}" removed from blacklist` });
            }
        }));

        // Antenna sensitivity endpoint
        this.app.post('/update_antenna_sensitivity', asyncHandler(async (req, res) => {
            const validated = validator.validateAntennaSensitivity(req.body);
            
            this.antennaSensitivity = validated.antenna_sensitivity;
            if (validated.custom_factor !== undefined) {
                this.customAntenneFactor = validated.custom_factor;
            }
            
            this.logger.info('Antenna sensitivity updated', {
                sensitivity: this.antennaSensitivity,
                custom_factor: this.customAntenneFactor
            });
            
            res.json({ 
                message: `Antenna sensitivity set to ${this.antennaSensitivity}` 
            });
        }));

        this.app.get('/get_antenna_settings', asyncHandler(async (req, res) => {
            const availableTypes = Object.keys(this.config.antenna?.sensitivity_factors || {});
            
            res.json({
                current_sensitivity: this.antennaSensitivity,
                available_types: availableTypes,
                custom_factor: this.customAntenneFactor
            });
        }));

        // Health check endpoint
        this.app.get('/health', asyncHandler(async (req, res) => {
            const health = {
                status: this.isRunning ? 'healthy' : 'unhealthy',
                service: 'wigle-to-tak',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                broadcasting: this.broadcasting,
                tak_server: `${this.takServerIP}:${this.takServerPort}`,
                multicast_enabled: this.takMulticastState,
                analysis_mode: this.analysisMode,
                processed_macs: this.processedMACs.size
            };
            
            res.json(health);
        }));

        // Error handling middleware
        this.app.use(createErrorHandler(this.logger));
    }

    async listWigleFiles(directory) {
        try {
            const fs = require('fs').promises;
            const files = await fs.readdir(directory);
            return files.filter(file => file.endsWith('.wiglecsv'));
        } catch (error) {
            this.logger.error('Error listing Wigle files:', error);
            return [];
        }
    }

    async startBroadcast(directory, filename) {
        if (this.broadcasting) {
            throw new ValidationError('Already broadcasting');
        }

        const filePath = path.join(directory, filename);
        this.broadcasting = true;
        this.processedMACs.clear();

        this.logger.info('Starting broadcast', {
            file: filePath,
            mode: this.analysisMode
        });

        if (this.analysisMode === 'realtime') {
            await this.startRealTimeMonitoring(filePath);
        } else {
            await this.startPostCollectionProcessing(filePath);
        }
    }

    stopBroadcast() {
        this.broadcasting = false;
        
        if (this.csvMonitor) {
            this.csvMonitor.stop();
            this.csvMonitor = null;
        }
        
        this.logger.info('Broadcasting stopped');
    }

    async startRealTimeMonitoring(filePath) {
        // TODO: Implement CSV file monitoring for real-time processing
        // This would use chokidar or similar to watch file changes
        this.logger.info('Real-time monitoring started', { file: filePath });
    }

    async startPostCollectionProcessing(filePath) {
        // TODO: Implement post-collection CSV processing
        // This would read the entire file and process it in chunks
        this.logger.info('Post-collection processing started', { file: filePath });
    }

    shouldSkipEntry(csvData) {
        const { mac, ssid } = csvData;
        
        // Check whitelist (skip if whitelisted)
        if (this.whitelistedSSIDs.has(ssid) || this.whitelistedMACs.has(mac)) {
            return true;
        }
        
        return false;
    }

    generateCOTXML(csvData) {
        const { mac, ssid, firstseen, channel, rssi, currentlatitude, 
                currentlongitude, altitudemeters, accuracymeters, authmode, device_type } = csvData;
        
        const now = new Date();
        const staleTime = new Date(now.getTime() + (this.config.tak?.stale_time_hours || 24) * 60 * 60 * 1000);
        
        const remarks = `Channel: ${channel}, RSSI: ${rssi}, AltitudeMeters: ${altitudemeters}, ` +
                       `AccuracyMeters: ${accuracymeters}, Authentication: ${authmode}, ` +
                       `Device: ${device_type}, MAC: ${mac}`;
        
        const colorARGB = this.blacklistedSSIDs.get(ssid) || 
                         this.blacklistedMACs.get(mac) || 
                         this.config.tak?.default_color_argb || '-65281';

        return `<?xml version="1.0"?>
<event version="2.0" uid="${mac}-${firstseen}" type="b-m-p-s-m"
    time="${now.toISOString()}"
    start="${now.toISOString()}"
    stale="${staleTime.toISOString()}"
    how="m-g">
    <point lat="${currentlatitude}" lon="${currentlongitude}" hae="999999" ce="35.0" le="999999" />
    <detail>
        <contact endpoint="" phone="" callsign="${ssid}" />
        <precisionlocation geopointsrc="gps" altsrc="gps" />
        <remarks>${remarks}</remarks>
        <color argb="${colorARGB}"/>
    </detail>
</event>`;
    }

    broadcastCOT(cotXML) {
        const buffer = Buffer.from(cotXML, 'utf8');
        
        // Multicast broadcast
        if (this.takMulticastState) {
            const multicastGroup = this.config.tak?.multicast_group || '239.2.3.1';
            const multicastPort = this.config.tak?.multicast_port || 6969;
            
            this.udpSocket.send(buffer, multicastPort, multicastGroup, (error) => {
                if (error) {
                    this.logger.error('Multicast send error:', error);
                } else {
                    this.logger.debug('Sent multicast CoT', {
                        group: multicastGroup,
                        port: multicastPort
                    });
                }
            });
        }
        
        // Unicast broadcast
        if (this.takServerIP && this.takServerPort && this.takServerIP !== '0.0.0.0') {
            this.udpSocket.send(buffer, this.takServerPort, this.takServerIP, (error) => {
                if (error) {
                    this.logger.error('Unicast send error:', error);
                } else {
                    this.logger.debug('Sent unicast CoT', {
                        host: this.takServerIP,
                        port: this.takServerPort
                    });
                }
            });
        }
    }

    async start() {
        try {
            this.startTime = Date.now();
            
            // Start HTTP server
            await new Promise((resolve, reject) => {
                this.app.listen(this.config.port, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            this.isRunning = true;
            
            this.logger.info(`WigleToTAK service started`, {
                port: this.config.port,
                environment: this.config.environment || 'production',
                multicast_group: this.config.tak?.multicast_group,
                data_directory: this.config.data?.wigle_directory
            });

        } catch (error) {
            this.logger.error('Failed to start WigleToTAK service:', error);
            throw new ServiceError('Failed to start service', { originalError: error });
        }
    }

    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.logger.info('Stopping WigleToTAK service...');

        try {
            // Stop broadcasting if active
            this.stopBroadcast();
            
            // Close UDP socket
            if (this.udpSocket) {
                this.udpSocket.close();
            }
            
            // Close HTTP server
            await new Promise((resolve) => {
                this.app.listen().close(resolve);
            });

            this.isRunning = false;
            this.logger.info('WigleToTAK service stopped successfully');

        } catch (error) {
            this.logger.error('Error stopping WigleToTAK service:', error);
            throw new ServiceError('Failed to stop service gracefully', { originalError: error });
        }
    }

    getServiceInfo() {
        return {
            name: 'wigle-to-tak',
            version: '2.0.0',
            description: 'WiFi Intelligence to TAK Conversion Service',
            port: this.config.port,
            status: this.isRunning ? 'running' : 'stopped',
            uptime: this.isRunning ? Date.now() - this.startTime : 0
        };
    }
}

// Export for use as a module
module.exports = WigleToTAKService;

// Allow running as standalone service
if (require.main === module) {
    const service = new WigleToTAKService();
    
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
        console.error('Failed to start WigleToTAK service:', error);
        process.exit(1);
    });
}
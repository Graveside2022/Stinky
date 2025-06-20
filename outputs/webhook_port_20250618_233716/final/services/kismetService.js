/**
 * Kismet Service
 * 
 * Handles Kismet API interactions and CSV data parsing
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const { parse } = require('csv-parse/sync');

class KismetService {
    constructor(logger) {
        this.logger = logger;
        
        // Configuration
        this.apiUrl = process.env.KISMET_API_URL || 'http://10.42.0.1:2501';
        this.auth = {
            username: process.env.KISMET_AUTH_USER || 'admin',
            password: process.env.KISMET_AUTH_PASS || 'admin'
        };
        this.kismetOpsPath = process.env.KISMET_OPS_PATH || '/home/pi/kismet_ops/';
        
        // API endpoints to try
        this.apiEndpoints = [
            'http://localhost:2501',
            'http://127.0.0.1:2501',
            'http://10.42.0.1:2501'
        ];
        
        // Create axios instance with defaults
        this.axios = axios.create({
            timeout: 5000,
            auth: this.auth
        });
    }
    
    /**
     * Check if Kismet API is responding
     */
    async isApiResponding() {
        for (const endpoint of this.apiEndpoints) {
            try {
                const response = await this.axios.get(`${endpoint}/system/status.json`);
                return response.status === 200;
            } catch (error) {
                // Try next endpoint
                continue;
            }
        }
        return false;
    }
    
    /**
     * Get Kismet data from CSV files
     */
    async getDataFromCsv() {
        try {
            // Find the latest CSV file
            const csvFiles = glob.sync(path.join(this.kismetOpsPath, '*.wiglecsv'));
            
            if (csvFiles.length === 0) {
                this.logger.debug('No CSV files found');
                return null;
            }
            
            // Sort by modification time, newest first
            const sortedFiles = await this.sortFilesByMtime(csvFiles);
            const latestFile = sortedFiles[0];
            
            // Check if file is recent (less than 1 hour old)
            const stats = await fs.stat(latestFile);
            const fileAge = Date.now() - stats.mtime.getTime();
            if (fileAge > 3600000) { // 1 hour
                this.logger.debug('CSV file is too old');
                return null;
            }
            
            // Read and parse CSV
            const content = await fs.readFile(latestFile, 'utf8');
            const devices = this.parseCsvContent(content);
            
            // Format response
            return this.formatDeviceData(devices);
            
        } catch (error) {
            this.logger.error('Failed to read CSV data:', error);
            return null;
        }
    }
    
    /**
     * Get Kismet data from API
     */
    async getDataFromApi() {
        try {
            // Try each endpoint
            for (const endpoint of this.apiEndpoints) {
                try {
                    const response = await this.axios.get(`${endpoint}/devices/views/all/devices.json`);
                    
                    if (response.data && Array.isArray(response.data)) {
                        return this.formatApiDeviceData(response.data);
                    }
                } catch (error) {
                    // Try next endpoint
                    continue;
                }
            }
            
            throw new Error('All Kismet API endpoints failed');
            
        } catch (error) {
            this.logger.error('Failed to get data from Kismet API:', error);
            return this.getDefaultResponse();
        }
    }
    
    /**
     * Sort files by modification time
     */
    async sortFilesByMtime(files) {
        const fileStats = await Promise.all(
            files.map(async (file) => ({
                file,
                mtime: (await fs.stat(file)).mtime.getTime()
            }))
        );
        
        fileStats.sort((a, b) => b.mtime - a.mtime);
        return fileStats.map(stat => stat.file);
    }
    
    /**
     * Parse CSV content
     */
    parseCsvContent(content) {
        try {
            const lines = content.split('\n');
            const devices = [];
            
            // Skip header lines until we find the actual CSV header
            let headerIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('MAC,')) {
                    headerIndex = i;
                    break;
                }
            }
            
            if (headerIndex === -1) {
                this.logger.error('CSV header not found');
                return devices;
            }
            
            // Parse CSV data
            const csvData = lines.slice(headerIndex).join('\n');
            const records = parse(csvData, {
                columns: true,
                skip_empty_lines: true
            });
            
            // Process records
            for (const record of records) {
                if (record.MAC && record.MAC !== '00:00:00:00:00:00') {
                    devices.push({
                        mac: record.MAC,
                        name: record.SSID || record.Name || 'Unknown',
                        type: record.Type || 'Unknown',
                        channel: record.Channel || '0',
                        rssi: parseInt(record.RSSI) || 0,
                        firstSeen: record.FirstTime || new Date().toISOString(),
                        lastSeen: record.LastTime || new Date().toISOString()
                    });
                }
            }
            
            return devices;
            
        } catch (error) {
            this.logger.error('Failed to parse CSV:', error);
            return [];
        }
    }
    
    /**
     * Format device data for response
     */
    formatDeviceData(devices) {
        // Sort by last seen
        devices.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
        
        // Get recent devices (last 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        const recentDevices = devices.filter(device => 
            new Date(device.lastSeen).getTime() > fiveMinutesAgo
        );
        
        // Count device types
        const networks = devices.filter(d => d.type === 'AP' || d.type === 'Infrastructure').length;
        
        // Format feed items
        const feedItems = devices.slice(0, 20).map(device => ({
            type: 'Device',
            message: `${device.type}: ${device.name} (${device.mac}) - Channel ${device.channel}, RSSI: ${device.rssi}`
        }));
        
        return {
            devices_count: devices.length,
            networks_count: networks,
            recent_devices: recentDevices.slice(0, 10).map(d => ({
                name: d.name,
                type: d.type,
                channel: d.channel
            })),
            feed_items: feedItems,
            last_update: new Date().toLocaleTimeString()
        };
    }
    
    /**
     * Format API device data
     */
    formatApiDeviceData(apiDevices) {
        const devices = apiDevices.map(device => ({
            mac: device['kismet.device.base.macaddr'] || 'Unknown',
            name: device['kismet.device.base.name'] || 'Unknown',
            type: device['kismet.device.base.type'] || 'Unknown',
            channel: device['kismet.device.base.channel'] || '0',
            rssi: device['kismet.device.base.signal.last_signal'] || 0,
            firstSeen: new Date(device['kismet.device.base.first_time'] * 1000).toISOString(),
            lastSeen: new Date(device['kismet.device.base.last_time'] * 1000).toISOString()
        }));
        
        return this.formatDeviceData(devices);
    }
    
    /**
     * Get default response
     */
    getDefaultResponse() {
        return {
            devices_count: 0,
            networks_count: 0,
            recent_devices: [],
            feed_items: [],
            last_update: new Date().toLocaleTimeString()
        };
    }
}

module.exports = KismetService;
/**
 * Kismet Client - Interface to Kismet REST API
 * 
 * Handles communication with Kismet server for retrieving device,
 * network, and alert data with caching and error handling
 */

const axios = require('axios');
const { ConnectionError, ServiceTimeoutError, ServiceError } = require('../../../shared/errors');

class KismetClient {
    constructor(config, logger) {
        this.config = {
            baseUrl: 'http://localhost:2501',
            apiKey: null,
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
            ...config
        };
        
        this.logger = logger;
        
        // Create axios instance with defaults
        const axiosConfig = {
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        // Add basic auth if provided
        if (this.config.auth && this.config.auth.username && this.config.auth.password) {
            axiosConfig.auth = {
                username: this.config.auth.username,
                password: this.config.auth.password
            };
        }

        this.client = axios.create(axiosConfig);

        // Add auth header if API key provided
        if (this.config.apiKey) {
            this.client.defaults.headers.common['KISMET-API-KEY'] = this.config.apiKey;
        }

        // Setup interceptors
        this.setupInterceptors();
        
        this.logger.info('KismetClient initialized', {
            baseUrl: this.config.baseUrl,
            hasApiKey: !!this.config.apiKey
        });
    }

    setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                this.logger.debug('Kismet API request', {
                    method: config.method,
                    url: config.url,
                    params: config.params
                });
                return config;
            },
            (error) => {
                this.logger.error('Kismet API request error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                this.logger.debug('Kismet API response', {
                    status: response.status,
                    url: response.config.url
                });
                return response;
            },
            async (error) => {
                if (error.code === 'ECONNREFUSED') {
                    throw new ConnectionError('Cannot connect to Kismet service', {
                        url: error.config?.url,
                        baseURL: this.config.baseUrl
                    });
                }

                if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                    throw new ServiceTimeoutError('Kismet API request timed out', {
                        url: error.config?.url,
                        timeout: this.config.timeout
                    });
                }

                if (error.response) {
                    this.logger.error('Kismet API error response', {
                        status: error.response.status,
                        data: error.response.data
                    });
                }

                throw error;
            }
        );
    }

    async getData(options = {}) {
        const { type = 'all', limit = 100, since = null } = options;
        const data = {};

        try {
            if (type === 'all' || type === 'devices') {
                data.devices = await this.getDevices({ limit, since });
            }

            if (type === 'all' || type === 'networks') {
                data.networks = await this.getNetworks({ limit, since });
            }

            if (type === 'all' || type === 'alerts') {
                data.alerts = await this.getAlerts({ since });
            }

            // Add summary
            data.summary = {
                totalDevices: data.devices?.length || 0,
                totalNetworks: data.networks?.length || 0,
                activeAlerts: data.alerts?.length || 0,
                dataRange: {
                    start: since?.toISOString() || new Date(Date.now() - 3600000).toISOString(),
                    end: new Date().toISOString()
                }
            };

            return data;

        } catch (error) {
            this.logger.error('Failed to get Kismet data', { type, error: error.message });
            throw error;
        }
    }

    async getDevices(options = {}) {
        const { limit = 100, since = null } = options;
        
        try {
            // Build query parameters
            const params = {
                'json': JSON.stringify({
                    'fields': [
                        'kismet.device.base.macaddr',
                        'kismet.device.base.first_time',
                        'kismet.device.base.last_time',
                        'kismet.device.base.manuf',
                        'kismet.device.base.type',
                        'kismet.device.base.packets.total',
                        'kismet.device.base.bytes.data',
                        'kismet.device.base.signal.last_signal',
                        'kismet.device.base.signal.min_signal',
                        'kismet.device.base.signal.max_signal',
                        'kismet.device.base.location.last'
                    ]
                })
            };

            const response = await this.client.get('/devices/views/all/devices.json', { params });
            let devices = response.data || [];

            // Filter by time if specified
            if (since) {
                const sinceTime = since.getTime() / 1000; // Convert to Unix timestamp
                devices = devices.filter(device => 
                    device['kismet.device.base.last_time'] >= sinceTime
                );
            }

            // Limit results
            devices = devices.slice(0, limit);

            // Transform to our format
            return devices.map(device => ({
                mac: device['kismet.device.base.macaddr'],
                firstSeen: new Date(device['kismet.device.base.first_time'] * 1000).toISOString(),
                lastSeen: new Date(device['kismet.device.base.last_time'] * 1000).toISOString(),
                manufacturer: device['kismet.device.base.manuf'] || 'Unknown',
                type: this.mapDeviceType(device['kismet.device.base.type']),
                packets: device['kismet.device.base.packets.total'] || 0,
                dataBytes: device['kismet.device.base.bytes.data'] || 0,
                signal: {
                    last: device['kismet.device.base.signal.last_signal'] || null,
                    min: device['kismet.device.base.signal.min_signal'] || null,
                    max: device['kismet.device.base.signal.max_signal'] || null
                },
                location: this.extractLocation(device['kismet.device.base.location.last'])
            }));

        } catch (error) {
            this.logger.error('Failed to get devices from Kismet', { error: error.message });
            throw new ServiceError('Failed to retrieve devices from Kismet', { originalError: error });
        }
    }

    async getNetworks(options = {}) {
        const { limit = 100, since = null } = options;
        
        try {
            // Get WiFi APs (networks)
            const params = {
                'json': JSON.stringify({
                    'fields': [
                        'kismet.device.base.macaddr',
                        'kismet.device.base.name',
                        'kismet.device.base.channel',
                        'kismet.device.base.frequency',
                        'kismet.device.base.crypt',
                        'kismet.device.base.first_time',
                        'kismet.device.base.last_time',
                        'kismet.device.base.packets.total',
                        'kismet.device.base.signal.last_signal',
                        'kismet.device.base.signal.min_signal',
                        'kismet.device.base.signal.max_signal',
                        'dot11.device.num_associated_clients'
                    ]
                })
            };

            const response = await this.client.get('/devices/views/phydot11_accesspoints/devices.json', { params });
            let networks = response.data || [];

            // Filter by time if specified
            if (since) {
                const sinceTime = since.getTime() / 1000;
                networks = networks.filter(network => 
                    network['kismet.device.base.last_time'] >= sinceTime
                );
            }

            // Limit results
            networks = networks.slice(0, limit);

            // Transform to our format
            return networks.map(network => ({
                ssid: network['kismet.device.base.name'] || '<Hidden>',
                bssid: network['kismet.device.base.macaddr'],
                channel: network['kismet.device.base.channel'] || 0,
                frequency: network['kismet.device.base.frequency'] || 0,
                encryption: this.mapEncryption(network['kismet.device.base.crypt']),
                firstSeen: new Date(network['kismet.device.base.first_time'] * 1000).toISOString(),
                lastSeen: new Date(network['kismet.device.base.last_time'] * 1000).toISOString(),
                clients: network['dot11.device.num_associated_clients'] || 0,
                packets: network['kismet.device.base.packets.total'] || 0,
                signal: {
                    last: network['kismet.device.base.signal.last_signal'] || null,
                    min: network['kismet.device.base.signal.min_signal'] || null,
                    max: network['kismet.device.base.signal.max_signal'] || null
                }
            }));

        } catch (error) {
            this.logger.error('Failed to get networks from Kismet', { error: error.message });
            throw new ServiceError('Failed to retrieve networks from Kismet', { originalError: error });
        }
    }

    async getAlerts(options = {}) {
        const { since = null } = options;
        
        try {
            const response = await this.client.get('/alerts/all_alerts.json');
            let alerts = response.data || [];

            // Filter by time if specified
            if (since) {
                const sinceTime = since.getTime() / 1000;
                alerts = alerts.filter(alert => 
                    alert['kismet.alert.timestamp'] >= sinceTime
                );
            }

            // Transform to our format
            return alerts.map(alert => ({
                id: alert['kismet.alert.hash'],
                type: alert['kismet.alert.class'],
                severity: this.mapAlertSeverity(alert['kismet.alert.severity']),
                timestamp: new Date(alert['kismet.alert.timestamp'] * 1000).toISOString(),
                message: alert['kismet.alert.text'],
                details: {
                    source: alert['kismet.alert.source_mac'],
                    dest: alert['kismet.alert.dest_mac'],
                    channel: alert['kismet.alert.channel'],
                    additional: alert['kismet.alert.other_text']
                }
            }));

        } catch (error) {
            this.logger.error('Failed to get alerts from Kismet', { error: error.message });
            throw new ServiceError('Failed to retrieve alerts from Kismet', { originalError: error });
        }
    }

    convertToCSV(data) {
        const csvLines = [];
        
        // Add headers
        if (data.devices && data.devices.length > 0) {
            csvLines.push('=== DEVICES ===');
            csvLines.push('MAC,Manufacturer,Type,First Seen,Last Seen,Packets,Data Bytes,Last Signal');
            
            data.devices.forEach(device => {
                csvLines.push([
                    device.mac,
                    device.manufacturer,
                    device.type,
                    device.firstSeen,
                    device.lastSeen,
                    device.packets,
                    device.dataBytes,
                    device.signal.last || 'N/A'
                ].join(','));
            });
            
            csvLines.push('');
        }
        
        if (data.networks && data.networks.length > 0) {
            csvLines.push('=== NETWORKS ===');
            csvLines.push('SSID,BSSID,Channel,Frequency,Encryption,First Seen,Last Seen,Clients,Packets,Last Signal');
            
            data.networks.forEach(network => {
                csvLines.push([
                    `"${network.ssid}"`,
                    network.bssid,
                    network.channel,
                    network.frequency,
                    network.encryption,
                    network.firstSeen,
                    network.lastSeen,
                    network.clients,
                    network.packets,
                    network.signal.last || 'N/A'
                ].join(','));
            });
            
            csvLines.push('');
        }
        
        if (data.alerts && data.alerts.length > 0) {
            csvLines.push('=== ALERTS ===');
            csvLines.push('ID,Type,Severity,Timestamp,Message');
            
            data.alerts.forEach(alert => {
                csvLines.push([
                    alert.id,
                    alert.type,
                    alert.severity,
                    alert.timestamp,
                    `"${alert.message}"`
                ].join(','));
            });
        }
        
        return csvLines.join('\n');
    }

    async streamData(callback) {
        // This could be implemented to use Kismet's eventbus API
        // For now, we'll use polling
        const pollInterval = 5000; // 5 seconds
        
        const poll = async () => {
            try {
                const data = await this.getData({ 
                    type: 'all', 
                    since: new Date(Date.now() - pollInterval) 
                });
                
                if (callback) {
                    callback(null, data);
                }
            } catch (error) {
                if (callback) {
                    callback(error, null);
                }
            }
        };
        
        const intervalId = setInterval(poll, pollInterval);
        
        // Return stop function
        return () => {
            clearInterval(intervalId);
        };
    }

    async isHealthy() {
        try {
            const response = await this.client.get('/system/status.json', {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    // Helper methods

    mapDeviceType(kismetType) {
        const typeMap = {
            'Wi-Fi AP': 'Access Point',
            'Wi-Fi Client': 'Wi-Fi Client',
            'Wi-Fi Ad-Hoc': 'Ad-Hoc Device',
            'Wi-Fi Device': 'Wi-Fi Device',
            'Bluetooth': 'Bluetooth Device',
            'BLE': 'Bluetooth LE',
            'UAV': 'Drone/UAV'
        };
        
        return typeMap[kismetType] || kismetType || 'Unknown';
    }

    mapEncryption(cryptSet) {
        if (!cryptSet) return 'Open';
        
        // Kismet uses bit flags for encryption
        const cryptTypes = [];
        
        if (cryptSet & (1 << 0)) cryptTypes.push('WEP');
        if (cryptSet & (1 << 2)) cryptTypes.push('WPA');
        if (cryptSet & (1 << 6)) cryptTypes.push('WPA2');
        if (cryptSet & (1 << 10)) cryptTypes.push('WPA3');
        if (cryptSet & (1 << 4)) cryptTypes.push('WPS');
        
        return cryptTypes.length > 0 ? cryptTypes.join('/') : 'Open';
    }

    mapAlertSeverity(kismetSeverity) {
        const severityMap = {
            0: 'info',
            5: 'low',
            10: 'medium',
            15: 'high',
            20: 'critical'
        };
        
        // Find closest severity level
        const levels = Object.keys(severityMap).map(Number).sort((a, b) => a - b);
        const closest = levels.reduce((prev, curr) => 
            Math.abs(curr - kismetSeverity) < Math.abs(prev - kismetSeverity) ? curr : prev
        );
        
        return severityMap[closest];
    }

    extractLocation(locationData) {
        if (!locationData) return null;
        
        return {
            lat: locationData.lat || null,
            lon: locationData.lon || null,
            accuracy: locationData.accuracy || null,
            alt: locationData.alt || null
        };
    }
}

module.exports = KismetClient;
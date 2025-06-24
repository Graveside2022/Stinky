/**
 * Test Fixtures and Mock Data
 * Provides consistent test data across all test suites
 */

module.exports = {
    // Sample Kismet device response
    kismetDeviceResponse: {
        'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
        'kismet.device.base.first_time': 1640000000,
        'kismet.device.base.last_time': 1640001000,
        'kismet.device.base.manuf': 'Apple, Inc.',
        'kismet.device.base.type': 'Wi-Fi Client',
        'kismet.device.base.packets.total': 1250,
        'kismet.device.base.bytes.data': 524288,
        'kismet.device.base.signal.last_signal': -65,
        'kismet.device.base.signal.min_signal': -80,
        'kismet.device.base.signal.max_signal': -45,
        'kismet.device.base.location.last': {
            lat: 40.7128,
            lon: -74.0060,
            accuracy: 10,
            alt: 30
        }
    },

    // Sample Kismet network response
    kismetNetworkResponse: {
        'kismet.device.base.macaddr': '00:11:22:33:44:55',
        'kismet.device.base.name': 'TestNetwork_5G',
        'kismet.device.base.channel': 36,
        'kismet.device.base.frequency': 5180000000,
        'kismet.device.base.crypt': 64, // WPA2
        'kismet.device.base.first_time': 1640000000,
        'kismet.device.base.last_time': 1640003600,
        'kismet.device.base.packets.total': 15000,
        'kismet.device.base.signal.last_signal': -70,
        'kismet.device.base.signal.min_signal': -85,
        'kismet.device.base.signal.max_signal': -55,
        'dot11.device.num_associated_clients': 12
    },

    // Sample Kismet alert response
    kismetAlertResponse: {
        'kismet.alert.hash': 'a1b2c3d4e5f6',
        'kismet.alert.class': 'DEAUTHFLOOD',
        'kismet.alert.severity': 15,
        'kismet.alert.timestamp': 1640002000,
        'kismet.alert.text': 'Deauthentication flood detected: 50+ deauth packets in 10 seconds',
        'kismet.alert.source_mac': 'AA:BB:CC:DD:EE:FF',
        'kismet.alert.dest_mac': '00:11:22:33:44:55',
        'kismet.alert.channel': 6,
        'kismet.alert.other_text': 'Possible denial of service attack'
    },

    // Large dataset for performance testing
    generateLargeDataset: (count = 1000) => {
        const devices = [];
        const networks = [];
        const manufacturers = ['Apple', 'Samsung', 'Google', 'Microsoft', 'Intel', 'Broadcom', 'Qualcomm'];
        const ssids = ['HomeNetwork', 'OfficeWiFi', 'Guest', 'Public', 'Secure', 'IoT', 'Mobile'];
        
        for (let i = 0; i < count; i++) {
            // Generate devices
            devices.push({
                'kismet.device.base.macaddr': `AA:BB:${Math.floor(i/255).toString(16).padStart(2, '0')}:${(i%255).toString(16).padStart(2, '0')}:EE:FF`.toUpperCase(),
                'kismet.device.base.first_time': 1640000000 + i * 10,
                'kismet.device.base.last_time': 1640000000 + i * 10 + Math.floor(Math.random() * 3600),
                'kismet.device.base.manuf': manufacturers[i % manufacturers.length],
                'kismet.device.base.type': i % 3 === 0 ? 'Wi-Fi AP' : 'Wi-Fi Client',
                'kismet.device.base.packets.total': Math.floor(Math.random() * 10000),
                'kismet.device.base.bytes.data': Math.floor(Math.random() * 10000000),
                'kismet.device.base.signal.last_signal': -40 - Math.floor(Math.random() * 50),
                'kismet.device.base.signal.min_signal': -90,
                'kismet.device.base.signal.max_signal': -40,
                'kismet.device.base.location.last': Math.random() > 0.7 ? {
                    lat: 40 + (Math.random() - 0.5) * 10,
                    lon: -74 + (Math.random() - 0.5) * 10,
                    accuracy: Math.floor(Math.random() * 50)
                } : null
            });

            // Generate networks (every 3rd device is an AP)
            if (i % 3 === 0) {
                networks.push({
                    'kismet.device.base.macaddr': `00:11:${Math.floor(i/255).toString(16).padStart(2, '0')}:${(i%255).toString(16).padStart(2, '0')}:44:55`.toUpperCase(),
                    'kismet.device.base.name': `${ssids[i % ssids.length]}_${i}`,
                    'kismet.device.base.channel': (i % 11) + 1,
                    'kismet.device.base.frequency': 2412000000 + ((i % 11) * 5000000),
                    'kismet.device.base.crypt': [0, 1, 4, 64, 1024][i % 5],
                    'kismet.device.base.first_time': 1640000000 + i * 10,
                    'kismet.device.base.last_time': 1640000000 + i * 10 + Math.floor(Math.random() * 7200),
                    'kismet.device.base.packets.total': Math.floor(Math.random() * 50000),
                    'kismet.device.base.signal.last_signal': -50 - Math.floor(Math.random() * 35),
                    'kismet.device.base.signal.min_signal': -85,
                    'kismet.device.base.signal.max_signal': -50,
                    'dot11.device.num_associated_clients': Math.floor(Math.random() * 30)
                });
            }
        }

        return { devices, networks };
    },

    // WebSocket test messages
    websocketMessages: {
        clientHandshake: 'SERVER DE CLIENT client=test_suite type=receiver',
        serverHandshake: 'CLIENT DE SERVER kismet_server_v2023.05',
        
        subscribeKismet: {
            event: 'subscribe',
            data: { channels: ['kismet'] }
        },
        
        subscribeStatus: {
            event: 'subscribe',
            data: { channels: ['status'] }
        },
        
        kismetData: {
            type: 'kismetData',
            data: {
                devices: [
                    {
                        mac: 'AA:BB:CC:DD:EE:FF',
                        manufacturer: 'Apple',
                        type: 'Wi-Fi Client',
                        signal: { last: -65 },
                        location: { lat: 40.7128, lon: -74.0060 }
                    }
                ],
                networks: [
                    {
                        ssid: 'TestNetwork',
                        bssid: '00:11:22:33:44:55',
                        encryption: 'WPA2',
                        channel: 6
                    }
                ],
                timestamp: new Date().toISOString()
            }
        },
        
        statusUpdate: {
            type: 'statusUpdate',
            status: {
                kismet: { running: true, pid: 12345 },
                gps: { running: true, pid: 12346 },
                scripts: {
                    both: { running: true, startTime: new Date().toISOString() }
                }
            },
            timestamp: new Date().toISOString()
        }
    },

    // 3D Globe test data
    globeTestData: {
        // Markers distributed around the world
        worldwideMarkers: [
            { lat: 40.7128, lon: -74.0060, name: 'New York' },
            { lat: 51.5074, lon: -0.1278, name: 'London' },
            { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
            { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
            { lat: -23.5505, lon: -46.6333, name: 'São Paulo' },
            { lat: 55.7558, lon: 37.6173, name: 'Moscow' },
            { lat: 19.4326, lon: -99.1332, name: 'Mexico City' },
            { lat: 1.3521, lon: 103.8198, name: 'Singapore' },
            { lat: -26.2041, lon: 28.0473, name: 'Johannesburg' },
            { lat: 50.1109, lon: 8.6821, name: 'Frankfurt' }
        ],

        // Dense cluster for performance testing
        generateDenseCluster: (centerLat, centerLon, count, radius = 0.1) => {
            const markers = [];
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * 2 * Math.PI;
                const distance = Math.random() * radius;
                markers.push({
                    lat: centerLat + distance * Math.cos(angle),
                    lon: centerLon + distance * Math.sin(angle),
                    id: `cluster_${i}`
                });
            }
            return markers;
        }
    },

    // Error scenarios
    errorScenarios: {
        connectionRefused: {
            code: 'ECONNREFUSED',
            message: 'connect ECONNREFUSED 127.0.0.1:2501',
            errno: -111,
            syscall: 'connect',
            address: '127.0.0.1',
            port: 2501
        },
        
        timeout: {
            code: 'ETIMEDOUT',
            message: 'Request timeout',
            timeout: 10000
        },
        
        unauthorized: {
            status: 401,
            data: {
                error: 'Unauthorized',
                message: 'Invalid API key'
            }
        },
        
        rateLimit: {
            status: 429,
            data: {
                error: 'Too Many Requests',
                message: 'Rate limit exceeded',
                retryAfter: 60
            }
        }
    }
};
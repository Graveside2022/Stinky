/**
 * Unit Tests for KismetClient
 * Tests all methods and error handling scenarios
 */

const axios = require('axios');
const KismetClient = require('../../lib/webhook/kismetClient');
const { ConnectionError, ServiceTimeoutError, ServiceError } = require('../../../shared/errors');

// Mock axios
jest.mock('axios');

// Mock logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

describe('KismetClient Unit Tests', () => {
    let kismetClient;
    let mockAxiosInstance;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup axios mock
        mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
            defaults: { headers: { common: {} } },
            interceptors: {
                request: { use: jest.fn() },
                response: { use: jest.fn() }
            }
        };
        
        axios.create.mockReturnValue(mockAxiosInstance);
        
        // Create client instance
        kismetClient = new KismetClient({
            baseUrl: 'http://localhost:2501',
            apiKey: 'test-api-key'
        }, mockLogger);
    });

    describe('Constructor and Configuration', () => {
        test('should initialize with default config', () => {
            const client = new KismetClient({}, mockLogger);
            
            expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
                baseURL: 'http://localhost:2501',
                timeout: 10000,
                headers: expect.objectContaining({
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                })
            }));
        });

        test('should set API key header when provided', () => {
            expect(mockAxiosInstance.defaults.headers.common['KISMET-API-KEY']).toBe('test-api-key');
        });

        test('should configure basic auth when provided', () => {
            axios.create.mockReturnValue(mockAxiosInstance);
            
            new KismetClient({
                auth: {
                    username: 'testuser',
                    password: 'testpass'
                }
            }, mockLogger);

            expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
                auth: {
                    username: 'testuser',
                    password: 'testpass'
                }
            }));
        });
    });

    describe('getDevices()', () => {
        const mockDeviceData = [{
            'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
            'kismet.device.base.first_time': 1640000000,
            'kismet.device.base.last_time': 1640001000,
            'kismet.device.base.manuf': 'Apple',
            'kismet.device.base.type': 'Wi-Fi Client',
            'kismet.device.base.packets.total': 150,
            'kismet.device.base.bytes.data': 50000,
            'kismet.device.base.signal.last_signal': -65,
            'kismet.device.base.signal.min_signal': -80,
            'kismet.device.base.signal.max_signal': -50,
            'kismet.device.base.location.last': { lat: 40.7128, lon: -74.0060, accuracy: 10 }
        }];

        test('should retrieve and transform device data', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockDeviceData });

            const devices = await kismetClient.getDevices();

            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                '/devices/views/all/devices.json',
                expect.objectContaining({
                    params: expect.objectContaining({
                        json: expect.any(String)
                    })
                })
            );

            expect(devices).toHaveLength(1);
            expect(devices[0]).toMatchObject({
                mac: 'AA:BB:CC:DD:EE:FF',
                manufacturer: 'Apple',
                type: 'Wi-Fi Client',
                packets: 150,
                dataBytes: 50000,
                signal: {
                    last: -65,
                    min: -80,
                    max: -50
                },
                location: {
                    lat: 40.7128,
                    lon: -74.0060,
                    accuracy: 10
                }
            });
        });

        test('should filter devices by time when since is provided', async () => {
            const twoDevices = [
                { ...mockDeviceData[0], 'kismet.device.base.last_time': 1640000500 },
                { ...mockDeviceData[0], 'kismet.device.base.last_time': 1640001500 }
            ];
            mockAxiosInstance.get.mockResolvedValue({ data: twoDevices });

            const since = new Date(1640001000 * 1000); // Only second device should be included
            const devices = await kismetClient.getDevices({ since });

            expect(devices).toHaveLength(1);
            expect(devices[0].lastSeen).toContain('2021-12-20T17:05:00'); // 1640001500
        });

        test('should limit results', async () => {
            const manyDevices = Array(10).fill(mockDeviceData[0]);
            mockAxiosInstance.get.mockResolvedValue({ data: manyDevices });

            const devices = await kismetClient.getDevices({ limit: 5 });

            expect(devices).toHaveLength(5);
        });

        test('should handle API errors gracefully', async () => {
            mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

            await expect(kismetClient.getDevices()).rejects.toThrow(ServiceError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to get devices from Kismet',
                expect.any(Object)
            );
        });

        test('should handle missing manufacturer gracefully', async () => {
            const deviceWithoutManuf = [{
                ...mockDeviceData[0],
                'kismet.device.base.manuf': null
            }];
            mockAxiosInstance.get.mockResolvedValue({ data: deviceWithoutManuf });

            const devices = await kismetClient.getDevices();

            expect(devices[0].manufacturer).toBe('Unknown');
        });
    });

    describe('getNetworks()', () => {
        const mockNetworkData = [{
            'kismet.device.base.macaddr': '00:11:22:33:44:55',
            'kismet.device.base.name': 'TestNetwork',
            'kismet.device.base.channel': 6,
            'kismet.device.base.frequency': 2437000000,
            'kismet.device.base.crypt': 72, // WPA2/WPS
            'kismet.device.base.first_time': 1640000000,
            'kismet.device.base.last_time': 1640001000,
            'kismet.device.base.packets.total': 1000,
            'kismet.device.base.signal.last_signal': -70,
            'kismet.device.base.signal.min_signal': -85,
            'kismet.device.base.signal.max_signal': -60,
            'dot11.device.num_associated_clients': 5
        }];

        test('should retrieve and transform network data', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockNetworkData });

            const networks = await kismetClient.getNetworks();

            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                '/devices/views/phydot11_accesspoints/devices.json',
                expect.any(Object)
            );

            expect(networks).toHaveLength(1);
            expect(networks[0]).toMatchObject({
                ssid: 'TestNetwork',
                bssid: '00:11:22:33:44:55',
                channel: 6,
                frequency: 2437000000,
                encryption: 'WPA2/WPS',
                clients: 5,
                packets: 1000,
                signal: {
                    last: -70,
                    min: -85,
                    max: -60
                }
            });
        });

        test('should handle hidden SSID', async () => {
            const hiddenNetwork = [{
                ...mockNetworkData[0],
                'kismet.device.base.name': null
            }];
            mockAxiosInstance.get.mockResolvedValue({ data: hiddenNetwork });

            const networks = await kismetClient.getNetworks();

            expect(networks[0].ssid).toBe('<Hidden>');
        });

        test('should correctly map encryption types', async () => {
            const testCases = [
                { crypt: 0, expected: 'Open' },
                { crypt: 1, expected: 'WEP' },
                { crypt: 4, expected: 'WPA' },
                { crypt: 64, expected: 'WPA2' },
                { crypt: 1024, expected: 'WPA3' },
                { crypt: 68, expected: 'WPA/WPA2' } // 4 + 64
            ];

            for (const testCase of testCases) {
                const network = [{
                    ...mockNetworkData[0],
                    'kismet.device.base.crypt': testCase.crypt
                }];
                mockAxiosInstance.get.mockResolvedValue({ data: network });

                const networks = await kismetClient.getNetworks();
                expect(networks[0].encryption).toBe(testCase.expected);
            }
        });
    });

    describe('getAlerts()', () => {
        const mockAlertData = [{
            'kismet.alert.hash': 'alert123',
            'kismet.alert.class': 'DEAUTHFLOOD',
            'kismet.alert.severity': 15,
            'kismet.alert.timestamp': 1640001000,
            'kismet.alert.text': 'Deauthentication flood detected',
            'kismet.alert.source_mac': 'AA:BB:CC:DD:EE:FF',
            'kismet.alert.dest_mac': '00:11:22:33:44:55',
            'kismet.alert.channel': 6,
            'kismet.alert.other_text': 'Additional details'
        }];

        test('should retrieve and transform alert data', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockAlertData });

            const alerts = await kismetClient.getAlerts();

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/alerts/all_alerts.json');

            expect(alerts).toHaveLength(1);
            expect(alerts[0]).toMatchObject({
                id: 'alert123',
                type: 'DEAUTHFLOOD',
                severity: 'high',
                message: 'Deauthentication flood detected',
                details: {
                    source: 'AA:BB:CC:DD:EE:FF',
                    dest: '00:11:22:33:44:55',
                    channel: 6,
                    additional: 'Additional details'
                }
            });
        });

        test('should correctly map alert severity levels', async () => {
            const severityTests = [
                { severity: 0, expected: 'info' },
                { severity: 5, expected: 'low' },
                { severity: 10, expected: 'medium' },
                { severity: 15, expected: 'high' },
                { severity: 20, expected: 'critical' },
                { severity: 7, expected: 'low' }, // Should round to nearest
                { severity: 13, expected: 'high' } // Should round to nearest
            ];

            for (const test of severityTests) {
                const alert = [{
                    ...mockAlertData[0],
                    'kismet.alert.severity': test.severity
                }];
                mockAxiosInstance.get.mockResolvedValue({ data: alert });

                const alerts = await kismetClient.getAlerts();
                expect(alerts[0].severity).toBe(test.expected);
            }
        });
    });

    describe('getData()', () => {
        test('should retrieve all data types by default', async () => {
            mockAxiosInstance.get.mockImplementation((url) => {
                if (url.includes('devices.json')) {
                    return Promise.resolve({ data: [] });
                } else if (url.includes('accesspoints')) {
                    return Promise.resolve({ data: [] });
                } else if (url.includes('alerts')) {
                    return Promise.resolve({ data: [] });
                }
                return Promise.reject(new Error('Unknown URL'));
            });

            const data = await kismetClient.getData();

            expect(data).toMatchObject({
                devices: expect.any(Array),
                networks: expect.any(Array),
                alerts: expect.any(Array),
                summary: expect.objectContaining({
                    totalDevices: 0,
                    totalNetworks: 0,
                    activeAlerts: 0,
                    dataRange: expect.any(Object)
                })
            });
        });

        test('should retrieve only specified data type', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: [] });

            const data = await kismetClient.getData({ type: 'devices' });

            expect(data).toHaveProperty('devices');
            expect(data).not.toHaveProperty('networks');
            expect(data).not.toHaveProperty('alerts');
        });
    });

    describe('convertToCSV()', () => {
        test('should convert data to CSV format', () => {
            const data = {
                devices: [{
                    mac: 'AA:BB:CC:DD:EE:FF',
                    manufacturer: 'Apple',
                    type: 'Wi-Fi Client',
                    firstSeen: '2021-12-20T16:40:00.000Z',
                    lastSeen: '2021-12-20T16:56:40.000Z',
                    packets: 150,
                    dataBytes: 50000,
                    signal: { last: -65 }
                }],
                networks: [{
                    ssid: 'TestNetwork',
                    bssid: '00:11:22:33:44:55',
                    channel: 6,
                    frequency: 2437000000,
                    encryption: 'WPA2',
                    firstSeen: '2021-12-20T16:40:00.000Z',
                    lastSeen: '2021-12-20T16:56:40.000Z',
                    clients: 5,
                    packets: 1000,
                    signal: { last: -70 }
                }],
                alerts: [{
                    id: 'alert123',
                    type: 'DEAUTHFLOOD',
                    severity: 'high',
                    timestamp: '2021-12-20T16:56:40.000Z',
                    message: 'Deauthentication flood detected'
                }]
            };

            const csv = kismetClient.convertToCSV(data);

            expect(csv).toContain('=== DEVICES ===');
            expect(csv).toContain('MAC,Manufacturer,Type,First Seen,Last Seen,Packets,Data Bytes,Last Signal');
            expect(csv).toContain('AA:BB:CC:DD:EE:FF,Apple,Wi-Fi Client');

            expect(csv).toContain('=== NETWORKS ===');
            expect(csv).toContain('SSID,BSSID,Channel,Frequency,Encryption');
            expect(csv).toContain('"TestNetwork",00:11:22:33:44:55,6');

            expect(csv).toContain('=== ALERTS ===');
            expect(csv).toContain('ID,Type,Severity,Timestamp,Message');
            expect(csv).toContain('alert123,DEAUTHFLOOD,high');
        });

        test('should handle empty data gracefully', () => {
            const csv = kismetClient.convertToCSV({});
            expect(csv).toBe('');
        });
    });

    describe('isHealthy()', () => {
        test('should return true when Kismet is responsive', async () => {
            mockAxiosInstance.get.mockResolvedValue({ status: 200 });

            const isHealthy = await kismetClient.isHealthy();

            expect(isHealthy).toBe(true);
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/system/status.json', {
                timeout: 5000
            });
        });

        test('should return false when Kismet is not responsive', async () => {
            mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

            const isHealthy = await kismetClient.isHealthy();

            expect(isHealthy).toBe(false);
        });
    });

    describe('streamData()', () => {
        jest.useFakeTimers();

        test('should poll for data at regular intervals', async () => {
            mockAxiosInstance.get.mockImplementation(() => Promise.resolve({ data: [] }));

            const callback = jest.fn();
            const stopStreaming = await kismetClient.streamData(callback);

            // Fast forward time
            jest.advanceTimersByTime(5000);
            await Promise.resolve(); // Let promises resolve

            expect(callback).toHaveBeenCalledWith(null, expect.any(Object));

            // Stop streaming
            stopStreaming();
            jest.clearAllTimers();
        });

        test('should handle errors during streaming', async () => {
            mockAxiosInstance.get.mockRejectedValue(new Error('Stream error'));

            const callback = jest.fn();
            await kismetClient.streamData(callback);

            jest.advanceTimersByTime(5000);
            await Promise.resolve();

            expect(callback).toHaveBeenCalledWith(expect.any(Error), null);
        });

        afterEach(() => {
            jest.useRealTimers();
        });
    });

    describe('Error Handling', () => {
        test('should handle connection refused errors', async () => {
            const error = new Error('Connection refused');
            error.code = 'ECONNREFUSED';
            error.config = { url: '/test' };

            // Setup interceptor to throw error
            mockAxiosInstance.interceptors.response.use.mockImplementation((success, error) => {
                const errorHandler = error;
                return errorHandler(error);
            });

            mockAxiosInstance.get.mockRejectedValue(error);

            await expect(kismetClient.getDevices()).rejects.toThrow(ConnectionError);
        });

        test('should handle timeout errors', async () => {
            const error = new Error('Timeout');
            error.code = 'ETIMEDOUT';
            error.config = { url: '/test' };

            mockAxiosInstance.get.mockRejectedValue(error);

            await expect(kismetClient.getDevices()).rejects.toThrow(ServiceTimeoutError);
        });
    });
});
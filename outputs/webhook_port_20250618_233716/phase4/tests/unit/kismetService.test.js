/**
 * Unit Tests for Kismet Service
 * Tests Kismet API interactions and CSV data parsing
 */

const KismetService = require('../../../phase3/webhook_implementation/services/kismetService');
const axios = require('axios');
const fs = require('fs').promises;
const glob = require('glob');
const { parse } = require('csv-parse/sync');

// Mock dependencies
jest.mock('axios');
jest.mock('fs').promises;
jest.mock('glob');
jest.mock('csv-parse/sync');

describe('KismetService', () => {
    let kismetService;
    let mockLogger;
    let mockAxiosInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        // Create mock axios instance
        mockAxiosInstance = {
            get: jest.fn()
        };
        axios.create.mockReturnValue(mockAxiosInstance);

        kismetService = new KismetService(mockLogger);
    });

    describe('constructor', () => {
        it('should initialize with default configuration', () => {
            expect(axios.create).toHaveBeenCalledWith({
                timeout: 5000,
                auth: {
                    username: 'admin',
                    password: 'admin'
                }
            });
            expect(kismetService.apiUrl).toBe('http://10.42.0.1:2501');
            expect(kismetService.kismetOpsPath).toBe('/home/pi/kismet_ops/');
        });

        it('should use environment variables when available', () => {
            process.env.KISMET_API_URL = 'http://custom:3000';
            process.env.KISMET_AUTH_USER = 'testuser';
            process.env.KISMET_AUTH_PASS = 'testpass';
            process.env.KISMET_OPS_PATH = '/custom/path/';

            const customService = new KismetService(mockLogger);

            expect(customService.apiUrl).toBe('http://custom:3000');
            expect(customService.auth.username).toBe('testuser');
            expect(customService.auth.password).toBe('testpass');
            expect(customService.kismetOpsPath).toBe('/custom/path/');

            // Clean up
            delete process.env.KISMET_API_URL;
            delete process.env.KISMET_AUTH_USER;
            delete process.env.KISMET_AUTH_PASS;
            delete process.env.KISMET_OPS_PATH;
        });
    });

    describe('isApiResponding', () => {
        it('should return true when any endpoint responds', async () => {
            mockAxiosInstance.get.mockRejectedValueOnce(new Error('Connection refused'))
                .mockResolvedValueOnce({ status: 200 });

            const result = await kismetService.isApiResponding();

            expect(result).toBe(true);
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('http://localhost:2501/system/status.json');
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('http://127.0.0.1:2501/system/status.json');
        });

        it('should return false when all endpoints fail', async () => {
            mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

            const result = await kismetService.isApiResponding();

            expect(result).toBe(false);
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
        });

        it('should handle non-200 status codes', async () => {
            mockAxiosInstance.get.mockResolvedValue({ status: 401 });

            const result = await kismetService.isApiResponding();

            expect(result).toBe(false);
        });
    });

    describe('getDataFromCsv', () => {
        const mockCsvContent = `WigleWifi-1.4,appRelease=2.26,model=HackRF,release=fake,device=FAKE,display=Fake Device,board=FAKE,brand=N/A
        MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
        AA:BB:CC:DD:EE:FF,TestNetwork,[WPA2-PSK-CCMP][ESS],2024-06-18 10:00:00,6,-65,40.7128,-74.0060,100,5,Infrastructure
        11:22:33:44:55:66,,[Open][ESS],2024-06-18 10:01:00,11,-70,40.7130,-74.0062,100,5,Infrastructure
        `;

        beforeEach(() => {
            glob.sync.mockReturnValue([
                '/home/pi/kismet_ops/Kismet-20240618-10-00-00.wiglecsv'
            ]);
            fs.stat.mockResolvedValue({
                mtime: new Date(Date.now() - 300000) // 5 minutes ago
            });
            fs.readFile.mockResolvedValue(mockCsvContent);
        });

        it('should successfully parse CSV data', async () => {
            parse.mockReturnValue([
                {
                    MAC: 'AA:BB:CC:DD:EE:FF',
                    SSID: 'TestNetwork',
                    Type: 'Infrastructure',
                    Channel: '6',
                    RSSI: '-65',
                    FirstTime: '2024-06-18 10:00:00',
                    LastTime: '2024-06-18 10:05:00'
                },
                {
                    MAC: '11:22:33:44:55:66',
                    SSID: '',
                    Type: 'Infrastructure',
                    Channel: '11',
                    RSSI: '-70',
                    FirstTime: '2024-06-18 10:01:00',
                    LastTime: '2024-06-18 10:06:00'
                }
            ]);

            const result = await kismetService.getDataFromCsv();

            expect(result).toMatchObject({
                devices_count: 2,
                networks_count: 2,
                recent_devices: expect.any(Array),
                feed_items: expect.any(Array),
                last_update: expect.any(String)
            });
            expect(result.recent_devices).toHaveLength(2);
            expect(result.feed_items).toHaveLength(2);
        });

        it('should return null when no CSV files exist', async () => {
            glob.sync.mockReturnValue([]);

            const result = await kismetService.getDataFromCsv();

            expect(result).toBeNull();
            expect(mockLogger.debug).toHaveBeenCalledWith('No CSV files found');
        });

        it('should return null when CSV file is too old', async () => {
            fs.stat.mockResolvedValue({
                mtime: new Date(Date.now() - 7200000) // 2 hours ago
            });

            const result = await kismetService.getDataFromCsv();

            expect(result).toBeNull();
            expect(mockLogger.debug).toHaveBeenCalledWith('CSV file is too old');
        });

        it('should handle CSV parsing errors', async () => {
            fs.readFile.mockRejectedValue(new Error('File read error'));

            const result = await kismetService.getDataFromCsv();

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to read CSV data:', expect.any(Error));
        });

        it('should sort files by modification time', async () => {
            const files = [
                '/home/pi/kismet_ops/file1.wiglecsv',
                '/home/pi/kismet_ops/file2.wiglecsv',
                '/home/pi/kismet_ops/file3.wiglecsv'
            ];
            glob.sync.mockReturnValue(files);
            
            fs.stat.mockImplementation((file) => {
                const mtimes = {
                    '/home/pi/kismet_ops/file1.wiglecsv': new Date('2024-06-18T10:00:00'),
                    '/home/pi/kismet_ops/file2.wiglecsv': new Date('2024-06-18T11:00:00'),
                    '/home/pi/kismet_ops/file3.wiglecsv': new Date('2024-06-18T09:00:00')
                };
                return Promise.resolve({ mtime: mtimes[file] });
            });

            await kismetService.getDataFromCsv();

            // Should read the newest file (file2)
            expect(fs.readFile).toHaveBeenCalledWith('/home/pi/kismet_ops/file2.wiglecsv', 'utf8');
        });
    });

    describe('getDataFromApi', () => {
        const mockApiDevices = [
            {
                'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
                'kismet.device.base.name': 'TestDevice',
                'kismet.device.base.type': 'Wi-Fi AP',
                'kismet.device.base.channel': '6',
                'kismet.device.base.signal.last_signal': -65,
                'kismet.device.base.first_time': 1718707200,
                'kismet.device.base.last_time': 1718710800
            }
        ];

        it('should successfully get data from API', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: mockApiDevices });

            const result = await kismetService.getDataFromApi();

            expect(result).toMatchObject({
                devices_count: 1,
                networks_count: expect.any(Number),
                recent_devices: expect.any(Array),
                feed_items: expect.any(Array),
                last_update: expect.any(String)
            });
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('http://localhost:2501/devices/views/all/devices.json');
        });

        it('should try multiple endpoints on failure', async () => {
            mockAxiosInstance.get
                .mockRejectedValueOnce(new Error('Connection refused'))
                .mockRejectedValueOnce(new Error('Connection refused'))
                .mockResolvedValueOnce({ data: mockApiDevices });

            const result = await kismetService.getDataFromApi();

            expect(result.devices_count).toBe(1);
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
        });

        it('should return default response when all endpoints fail', async () => {
            mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

            const result = await kismetService.getDataFromApi();

            expect(result).toEqual({
                devices_count: 0,
                networks_count: 0,
                recent_devices: [],
                feed_items: [],
                last_update: expect.any(String)
            });
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get data from Kismet API:', expect.any(Error));
        });

        it('should handle invalid API response', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: 'not an array' });

            const result = await kismetService.getDataFromApi();

            expect(result).toEqual(kismetService.getDefaultResponse());
        });
    });

    describe('parseCsvContent', () => {
        it('should parse valid CSV content', () => {
            const content = `Random header line
            Another header line
            MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
            AA:BB:CC:DD:EE:FF,TestNetwork,[WPA2-PSK-CCMP][ESS],2024-06-18 10:00:00,6,-65,40.7128,-74.0060,100,5,Infrastructure`;

            parse.mockReturnValue([{
                MAC: 'AA:BB:CC:DD:EE:FF',
                SSID: 'TestNetwork',
                Type: 'Infrastructure',
                Channel: '6',
                RSSI: '-65',
                FirstTime: '2024-06-18 10:00:00',
                LastTime: '2024-06-18 10:05:00'
            }]);

            const result = kismetService.parseCsvContent(content);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                mac: 'AA:BB:CC:DD:EE:FF',
                name: 'TestNetwork',
                type: 'Infrastructure',
                channel: '6',
                rssi: -65
            });
        });

        it('should skip null MAC addresses', () => {
            parse.mockReturnValue([
                { MAC: '00:00:00:00:00:00', SSID: 'Invalid' },
                { MAC: 'AA:BB:CC:DD:EE:FF', SSID: 'Valid' }
            ]);

            const result = kismetService.parseCsvContent('MAC,SSID\n...');

            expect(result).toHaveLength(1);
            expect(result[0].mac).toBe('AA:BB:CC:DD:EE:FF');
        });

        it('should handle missing CSV header', () => {
            const content = 'No MAC header here';

            const result = kismetService.parseCsvContent(content);

            expect(result).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith('CSV header not found');
        });

        it('should handle parsing errors gracefully', () => {
            parse.mockImplementation(() => {
                throw new Error('Parse error');
            });

            const result = kismetService.parseCsvContent('MAC,SSID\n...');

            expect(result).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to parse CSV:', expect.any(Error));
        });
    });

    describe('formatDeviceData', () => {
        const devices = [
            {
                mac: 'AA:BB:CC:DD:EE:FF',
                name: 'Network1',
                type: 'AP',
                channel: '6',
                rssi: -65,
                lastSeen: new Date(Date.now() - 60000).toISOString() // 1 minute ago
            },
            {
                mac: '11:22:33:44:55:66',
                name: 'Network2',
                type: 'Infrastructure',
                channel: '11',
                rssi: -70,
                lastSeen: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
            }
        ];

        it('should format device data correctly', () => {
            const result = kismetService.formatDeviceData(devices);

            expect(result).toMatchObject({
                devices_count: 2,
                networks_count: 2,
                recent_devices: expect.any(Array),
                feed_items: expect.any(Array),
                last_update: expect.any(String)
            });
            expect(result.recent_devices).toHaveLength(1); // Only 1 device in last 5 minutes
            expect(result.feed_items).toHaveLength(2);
        });

        it('should sort devices by last seen time', () => {
            const result = kismetService.formatDeviceData([...devices].reverse());

            // First device should be the most recent
            expect(result.feed_items[0].message).toContain('Network1');
        });

        it('should limit feed items to 20', () => {
            const manyDevices = Array(30).fill(null).map((_, i) => ({
                mac: `AA:BB:CC:DD:EE:${i.toString(16).padStart(2, '0')}`,
                name: `Network${i}`,
                type: 'AP',
                channel: '6',
                rssi: -65,
                lastSeen: new Date().toISOString()
            }));

            const result = kismetService.formatDeviceData(manyDevices);

            expect(result.feed_items).toHaveLength(20);
        });
    });

    describe('formatApiDeviceData', () => {
        it('should convert API format to internal format', () => {
            const apiDevices = [{
                'kismet.device.base.macaddr': 'AA:BB:CC:DD:EE:FF',
                'kismet.device.base.name': 'TestDevice',
                'kismet.device.base.type': 'Wi-Fi AP',
                'kismet.device.base.channel': '6',
                'kismet.device.base.signal.last_signal': -65,
                'kismet.device.base.first_time': 1718707200,
                'kismet.device.base.last_time': 1718710800
            }];

            const result = kismetService.formatApiDeviceData(apiDevices);

            expect(result.devices_count).toBe(1);
            expect(result.feed_items[0].message).toContain('TestDevice');
        });

        it('should handle missing fields with defaults', () => {
            const apiDevices = [{ }];

            const result = kismetService.formatApiDeviceData(apiDevices);

            expect(result.devices_count).toBe(1);
            expect(result.feed_items[0].message).toContain('Unknown');
        });
    });

    describe('getDefaultResponse', () => {
        it('should return correct default structure', () => {
            const result = kismetService.getDefaultResponse();

            expect(result).toEqual({
                devices_count: 0,
                networks_count: 0,
                recent_devices: [],
                feed_items: [],
                last_update: expect.any(String)
            });
        });
    });
});
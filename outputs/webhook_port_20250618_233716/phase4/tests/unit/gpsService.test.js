/**
 * Unit Tests for GPS Service
 * Tests GPS data retrieval from GPSD
 */

const GpsService = require('../../../phase3/webhook_implementation/services/gpsService');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');

// Mock child_process
jest.mock('child_process');

describe('GpsService', () => {
    let gpsService;
    let mockLogger;
    let mockGpspipe;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        // Create mock gpspipe process
        mockGpspipe = new EventEmitter();
        mockGpspipe.stdout = new EventEmitter();
        mockGpspipe.stderr = new EventEmitter();
        mockGpspipe.kill = jest.fn();

        gpsService = new GpsService(mockLogger);
    });

    describe('getGpsData', () => {
        it('should return GPS data when GPSD is running and has fix', async () => {
            // Mock GPSD is running
            exec.mockImplementation((cmd, cb) => {
                if (cmd === 'systemctl is-active gpsd') {
                    cb(null, 'active\n', '');
                }
            });

            // Mock gpspipe spawn
            spawn.mockReturnValue(mockGpspipe);

            const gpsPromise = gpsService.getGpsData();

            // Simulate GPS data from gpspipe
            const tpvData = JSON.stringify({
                class: 'TPV',
                mode: 3,
                lat: 40.7128,
                lon: -74.0060,
                alt: 100.5,
                speed: 5.2,
                track: 180.0,
                time: '2024-06-18T10:30:00.000Z'
            });

            mockGpspipe.stdout.emit('data', Buffer.from(tpvData + '\n'));
            mockGpspipe.emit('close', 0);

            const result = await gpsPromise;

            expect(result).toEqual({
                lat: 40.7128,
                lon: -74.0060,
                alt: 100.5,
                mode: 3,
                time: '2024-06-18T10:30:00.000Z',
                speed: 5.2,
                track: 180.0,
                status: '3D Fix'
            });
        });

        it('should handle 2D fix correctly', async () => {
            exec.mockImplementation((cmd, cb) => cb(null, 'active\n', ''));
            spawn.mockReturnValue(mockGpspipe);

            const gpsPromise = gpsService.getGpsData();

            const tpvData = JSON.stringify({
                class: 'TPV',
                mode: 2,
                lat: 40.7128,
                lon: -74.0060
            });

            mockGpspipe.stdout.emit('data', Buffer.from(tpvData + '\n'));
            mockGpspipe.emit('close', 0);

            const result = await gpsPromise;

            expect(result.status).toBe('2D Fix');
            expect(result.mode).toBe(2);
            expect(result.lat).toBe(40.7128);
            expect(result.lon).toBe(-74.0060);
            expect(result.alt).toBeNull();
        });

        it('should return default data when GPSD is not running', async () => {
            exec.mockImplementation((cmd, cb) => cb(null, 'inactive\n', ''));

            const result = await gpsService.getGpsData();

            expect(result).toEqual({
                lat: null,
                lon: null,
                alt: null,
                mode: 0,
                time: null,
                speed: null,
                track: null,
                status: 'No Fix'
            });
            expect(spawn).not.toHaveBeenCalled();
        });

        it('should handle gpspipe timeout', async () => {
            exec.mockImplementation((cmd, cb) => cb(null, 'active\n', ''));
            spawn.mockReturnValue(mockGpspipe);

            jest.useFakeTimers();

            const gpsPromise = gpsService.getGpsData();

            // Fast-forward time to trigger timeout
            jest.advanceTimersByTime(5000);

            const result = await gpsPromise;

            expect(mockGpspipe.kill).toHaveBeenCalled();
            expect(result).toEqual(gpsService.getDefaultGpsData());

            jest.useRealTimers();
        });

        it('should handle gpspipe errors', async () => {
            exec.mockImplementation((cmd, cb) => cb(null, 'active\n', ''));
            spawn.mockReturnValue(mockGpspipe);

            const gpsPromise = gpsService.getGpsData();

            mockGpspipe.stderr.emit('data', Buffer.from('Error connecting to GPSD'));
            mockGpspipe.emit('close', 1);

            const result = await gpsPromise;

            expect(result).toEqual(gpsService.getDefaultGpsData());
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get GPS data:', expect.any(Error));
        });

        it('should skip malformed JSON lines', async () => {
            exec.mockImplementation((cmd, cb) => cb(null, 'active\n', ''));
            spawn.mockReturnValue(mockGpspipe);

            const gpsPromise = gpsService.getGpsData();

            // Send malformed JSON followed by valid JSON
            mockGpspipe.stdout.emit('data', Buffer.from('not-json\n'));
            mockGpspipe.stdout.emit('data', Buffer.from(JSON.stringify({
                class: 'TPV',
                mode: 3,
                lat: 40.7128,
                lon: -74.0060
            }) + '\n'));
            mockGpspipe.emit('close', 0);

            const result = await gpsPromise;

            expect(result.lat).toBe(40.7128);
            expect(result.lon).toBe(-74.0060);
            expect(mockLogger.debug).toHaveBeenCalledWith('Failed to parse GPS line:', 'not-json');
        });

        it('should handle multiple TPV objects and use the first good fix', async () => {
            exec.mockImplementation((cmd, cb) => cb(null, 'active\n', ''));
            spawn.mockReturnValue(mockGpspipe);

            const gpsPromise = gpsService.getGpsData();

            // Send multiple TPV objects
            const tpvData1 = JSON.stringify({ class: 'TPV', mode: 1 }); // No fix
            const tpvData2 = JSON.stringify({ class: 'TPV', mode: 3, lat: 40.7128, lon: -74.0060 }); // Good fix
            const tpvData3 = JSON.stringify({ class: 'TPV', mode: 3, lat: 41.0, lon: -75.0 }); // Another fix

            mockGpspipe.stdout.emit('data', Buffer.from(`${tpvData1}\n${tpvData2}\n${tpvData3}\n`));
            mockGpspipe.emit('close', 0);

            const result = await gpsPromise;

            // Should use the first good fix
            expect(result.lat).toBe(40.7128);
            expect(result.lon).toBe(-74.0060);
        });
    });

    describe('isGpsdRunning', () => {
        it('should return true when GPSD is active', async () => {
            exec.mockImplementation((cmd, cb) => cb(null, 'active\n', ''));

            const result = await gpsService.isGpsdRunning();

            expect(result).toBe(true);
            expect(exec).toHaveBeenCalledWith('systemctl is-active gpsd', expect.any(Function));
        });

        it('should return false when GPSD is inactive', async () => {
            exec.mockImplementation((cmd, cb) => cb(null, 'inactive\n', ''));

            const result = await gpsService.isGpsdRunning();

            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            exec.mockImplementation((cmd, cb) => cb(new Error('Command failed'), '', ''));

            const result = await gpsService.isGpsdRunning();

            expect(result).toBe(false);
        });
    });

    describe('executeGpspipe', () => {
        it('should execute gpspipe with correct arguments', async () => {
            spawn.mockReturnValue(mockGpspipe);

            const promise = gpsService.executeGpspipe();

            mockGpspipe.stdout.emit('data', Buffer.from('test output'));
            mockGpspipe.emit('close', 0);

            const result = await promise;

            expect(spawn).toHaveBeenCalledWith('gpspipe', ['-w', '-n', '10']);
            expect(result).toBe('test output');
        });

        it('should accumulate stdout data', async () => {
            spawn.mockReturnValue(mockGpspipe);

            const promise = gpsService.executeGpspipe();

            mockGpspipe.stdout.emit('data', Buffer.from('part1'));
            mockGpspipe.stdout.emit('data', Buffer.from('part2'));
            mockGpspipe.emit('close', 0);

            const result = await promise;

            expect(result).toBe('part1part2');
        });

        it('should reject on non-zero exit code', async () => {
            spawn.mockReturnValue(mockGpspipe);

            const promise = gpsService.executeGpspipe();

            mockGpspipe.stderr.emit('data', Buffer.from('Connection refused'));
            mockGpspipe.emit('close', 1);

            await expect(promise).rejects.toThrow('gpspipe exited with code 1: Connection refused');
        });
    });

    describe('parseGpsData', () => {
        it('should parse valid TPV data correctly', () => {
            const output = JSON.stringify({
                class: 'TPV',
                mode: 3,
                lat: 40.7128,
                lon: -74.0060,
                alt: 100.5,
                speed: 5.2,
                track: 180.0,
                time: '2024-06-18T10:30:00.000Z'
            });

            const result = gpsService.parseGpsData(output);

            expect(result).toEqual({
                lat: 40.7128,
                lon: -74.0060,
                alt: 100.5,
                mode: 3,
                time: '2024-06-18T10:30:00.000Z',
                speed: 5.2,
                track: 180.0,
                status: '3D Fix'
            });
        });

        it('should handle empty output', () => {
            const result = gpsService.parseGpsData('');

            expect(result).toEqual(gpsService.getDefaultGpsData());
        });

        it('should handle non-TPV objects', () => {
            const output = JSON.stringify({ class: 'VERSION', version: '3.24' }) + '\n' +
                           JSON.stringify({ class: 'DEVICES', devices: [] });

            const result = gpsService.parseGpsData(output);

            expect(result).toEqual(gpsService.getDefaultGpsData());
        });

        it('should map mode values to status correctly', () => {
            const testCases = [
                { mode: 0, expectedStatus: 'No Fix' },
                { mode: 1, expectedStatus: 'No Fix' },
                { mode: 2, expectedStatus: '2D Fix' },
                { mode: 3, expectedStatus: '3D Fix' }
            ];

            testCases.forEach(({ mode, expectedStatus }) => {
                const output = JSON.stringify({ class: 'TPV', mode });
                const result = gpsService.parseGpsData(output);
                expect(result.status).toBe(expectedStatus);
            });
        });
    });

    describe('getDefaultGpsData', () => {
        it('should return correct default structure', () => {
            const result = gpsService.getDefaultGpsData();

            expect(result).toEqual({
                lat: null,
                lon: null,
                alt: null,
                mode: 0,
                time: null,
                speed: null,
                track: null,
                status: 'No Fix'
            });
        });
    });

    describe('hasValidFix', () => {
        it('should return true when mode is 2 or higher', async () => {
            gpsService.getGpsData = jest.fn().mockResolvedValue({ mode: 2 });

            const result = await gpsService.hasValidFix();

            expect(result).toBe(true);
        });

        it('should return false when mode is less than 2', async () => {
            gpsService.getGpsData = jest.fn().mockResolvedValue({ mode: 1 });

            const result = await gpsService.hasValidFix();

            expect(result).toBe(false);
        });
    });
});
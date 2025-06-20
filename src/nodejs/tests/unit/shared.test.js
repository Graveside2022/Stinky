/**
 * Unit Tests for Shared Utilities
 */

const StinksterUtils = require('../../shared/utils');
const validator = require('../../shared/validator');
const { StinksterError, ValidationError } = require('../../shared/errors');

describe('Shared Utilities', () => {
    describe('StinksterUtils.math', () => {
        test('dbToLinear conversion', () => {
            expect(StinksterUtils.math.dbToLinear(0)).toBe(1);
            expect(StinksterUtils.math.dbToLinear(10)).toBeCloseTo(10);
            expect(StinksterUtils.math.dbToLinear(-10)).toBeCloseTo(0.1);
        });

        test('linearToDb conversion', () => {
            expect(StinksterUtils.math.linearToDb(1)).toBe(0);
            expect(StinksterUtils.math.linearToDb(10)).toBeCloseTo(10);
            expect(StinksterUtils.math.linearToDb(0.1)).toBeCloseTo(-10);
        });

        test('findPeaks detection', () => {
            const data = [-80, -60, -40, -60, -80, -50, -30, -50, -80];
            const peaks = StinksterUtils.math.findPeaks(data, -50);
            
            expect(peaks).toHaveLength(2);
            expect(peaks[0].index).toBe(6); // -30 is the highest peak
            expect(peaks[0].value).toBe(-30);
            expect(peaks[1].index).toBe(2); // -40 is the second peak
            expect(peaks[1].value).toBe(-40);
        });

        test('calculateBandwidth estimation', () => {
            const data = [-80, -70, -50, -40, -50, -70, -80];
            const bandwidth = StinksterUtils.math.calculateBandwidth(data, 3, 1000);
            expect(bandwidth).toBe(3000); // 3 bins * 1000 Hz/bin
        });

        test('statistical functions', () => {
            const data = [1, 2, 3, 4, 5];
            expect(StinksterUtils.math.mean(data)).toBe(3);
            expect(StinksterUtils.math.standardDeviation(data)).toBeCloseTo(1.414, 2);
            expect(StinksterUtils.math.percentile(data, 50)).toBe(3);
        });
    });

    describe('File utilities', () => {
        test('formatBytes formatting', () => {
            expect(StinksterUtils.formatBytes(0)).toBe('0 Bytes');
            expect(StinksterUtils.formatBytes(1024)).toBe('1 KB');
            expect(StinksterUtils.formatBytes(1048576)).toBe('1 MB');
            expect(StinksterUtils.formatBytes(1073741824)).toBe('1 GB');
        });

        test('formatFrequency formatting', () => {
            expect(StinksterUtils.formatFrequency(1000)).toBe('1.000 kHz');
            expect(StinksterUtils.formatFrequency(1000000)).toBe('1.000 MHz');
            expect(StinksterUtils.formatFrequency(1000000000)).toBe('1.000 GHz');
        });

        test('sanitizeFilename', () => {
            expect(StinksterUtils.sanitizeFilename('test file!@#.txt')).toBe('test_file___.txt');
            expect(StinksterUtils.sanitizeFilename('normal-file_123.csv')).toBe('normal-file_123.csv');
        });
    });

    describe('Network utilities', () => {
        test('isValidIP validation', () => {
            expect(StinksterUtils.isValidIP('192.168.1.1')).toBe(true);
            expect(StinksterUtils.isValidIP('0.0.0.0')).toBe(true);
            expect(StinksterUtils.isValidIP('255.255.255.255')).toBe(true);
            expect(StinksterUtils.isValidIP('256.1.1.1')).toBe(false);
            expect(StinksterUtils.isValidIP('not.an.ip')).toBe(false);
        });

        test('isValidPort validation', () => {
            expect(StinksterUtils.isValidPort(80)).toBe(true);
            expect(StinksterUtils.isValidPort(8080)).toBe(true);
            expect(StinksterUtils.isValidPort(0)).toBe(false);
            expect(StinksterUtils.isValidPort(65536)).toBe(false);
            expect(StinksterUtils.isValidPort('abc')).toBe(false);
        });

        test('parseHostPort parsing', () => {
            expect(StinksterUtils.parseHostPort('localhost:8080')).toEqual({
                host: 'localhost',
                port: 8080
            });
            expect(StinksterUtils.parseHostPort('192.168.1.1')).toEqual({
                host: '192.168.1.1',
                port: 80
            });
        });
    });

    describe('Array utilities', () => {
        test('chunkArray', () => {
            const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            const chunks = StinksterUtils.chunkArray(array, 3);
            
            expect(chunks).toHaveLength(3);
            expect(chunks[0]).toEqual([1, 2, 3]);
            expect(chunks[1]).toEqual([4, 5, 6]);
            expect(chunks[2]).toEqual([7, 8, 9]);
        });

        test('uniqueArray', () => {
            const array = [1, 2, 2, 3, 3, 3, 4];
            const unique = StinksterUtils.uniqueArray(array);
            expect(unique).toEqual([1, 2, 3, 4]);
        });

        test('groupBy', () => {
            const array = [
                { type: 'a', value: 1 },
                { type: 'b', value: 2 },
                { type: 'a', value: 3 }
            ];
            const grouped = StinksterUtils.groupBy(array, item => item.type);
            
            expect(grouped.a).toHaveLength(2);
            expect(grouped.b).toHaveLength(1);
        });
    });
});

describe('Validator', () => {
    describe('Network validation', () => {
        test('validateTAKSettings', () => {
            const validData = {
                tak_server_ip: '192.168.1.100',
                tak_server_port: '6969'
            };
            
            expect(() => validator.validateTAKSettings(validData)).not.toThrow();
            
            const invalidData = {
                tak_server_ip: 'invalid-ip',
                tak_server_port: 'invalid-port'
            };
            
            expect(() => validator.validateTAKSettings(invalidData)).toThrow();
        });

        test('validateMulticastSettings', () => {
            const validData = { takMulticast: true };
            expect(() => validator.validateMulticastSettings(validData)).not.toThrow();
            
            const invalidData = { takMulticast: 'yes' };
            expect(() => validator.validateMulticastSettings(invalidData)).toThrow();
        });
    });

    describe('WiFi validation', () => {
        test('isValidMAC', () => {
            expect(validator.isValidMAC('00:11:22:33:44:55')).toBe(true);
            expect(validator.isValidMAC('00-11-22-33-44-55')).toBe(true);
            expect(validator.isValidMAC('invalid-mac')).toBe(false);
        });

        test('isValidSSID', () => {
            expect(validator.isValidSSID('MyNetwork')).toBe(true);
            expect(validator.isValidSSID('')).toBe(true); // Hidden networks
            expect(validator.isValidSSID('a'.repeat(32))).toBe(true);
            expect(validator.isValidSSID('a'.repeat(33))).toBe(false);
        });

        test('isValidRSSI', () => {
            expect(validator.isValidRSSI(-30)).toBe(true);
            expect(validator.isValidRSSI(-120)).toBe(true);
            expect(validator.isValidRSSI(0)).toBe(true);
            expect(validator.isValidRSSI(-121)).toBe(false);
            expect(validator.isValidRSSI(1)).toBe(false);
        });
    });

    describe('GPS validation', () => {
        test('isValidCoordinate', () => {
            expect(validator.isValidCoordinate(37.7749, 'latitude')).toBe(true);
            expect(validator.isValidCoordinate(-122.4194, 'longitude')).toBe(true);
            expect(validator.isValidCoordinate(91, 'latitude')).toBe(false);
            expect(validator.isValidCoordinate(-181, 'longitude')).toBe(false);
        });

        test('validateCoordinates', () => {
            expect(() => validator.validateCoordinates(37.7749, -122.4194)).not.toThrow();
            expect(() => validator.validateCoordinates(91, -181)).toThrow();
        });
    });

    describe('Sanitization', () => {
        test('sanitizeFilename', () => {
            expect(validator.sanitizeFilename('test file!@#.txt')).toBe('test_file___.txt');
            expect(validator.sanitizeFilename('normal-file_123.csv')).toBe('normal-file_123.csv');
        });

        test('sanitizeMAC', () => {
            expect(validator.sanitizeMAC('00:11:22:33:44:55')).toBe('00:11:22:33:44:55');
            expect(validator.sanitizeMAC('00-11-22-33-44-55')).toBe('00-11-22-33-44-55');
            expect(validator.sanitizeMAC('invalid@mac')).toBe('INVALIDMAC');
        });
    });
});

describe('Error Classes', () => {
    test('StinksterError creation', () => {
        const error = new StinksterError('Test error', 'TEST_CODE', 500, { context: 'test' });
        
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_CODE');
        expect(error.statusCode).toBe(500);
        expect(error.context.context).toBe('test');
        expect(error.timestamp).toBeDefined();
    });

    test('ValidationError creation', () => {
        const error = new ValidationError('Invalid input');
        
        expect(error.message).toBe('Invalid input');
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.statusCode).toBe(400);
    });

    test('Error JSON serialization', () => {
        const error = new StinksterError('Test error', 'TEST_CODE', 500);
        const json = error.toJSON();
        
        expect(json.name).toBe('StinksterError');
        expect(json.message).toBe('Test error');
        expect(json.code).toBe('TEST_CODE');
        expect(json.statusCode).toBe(500);
        expect(json.timestamp).toBeDefined();
    });

    test('Error user response', () => {
        const error = new ValidationError('Invalid input');
        const response = error.toUserResponse();
        
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.message).toBe('Invalid input');
        expect(response.error.timestamp).toBeDefined();
    });
});
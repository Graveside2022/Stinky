/**
 * Jest Setup File
 * Global test configuration and utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Global test utilities
global.testUtils = {
    // Wait for condition to be true
    waitFor: async (condition, timeout = 5000, interval = 100) => {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        throw new Error('Timeout waiting for condition');
    },

    // Generate mock device data
    generateMockDevice: (overrides = {}) => {
        const mac = overrides.mac || `AA:BB:CC:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}:FF`.toUpperCase();
        
        return {
            mac,
            manufacturer: 'TestManufacturer',
            type: 'Wi-Fi Client',
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            packets: Math.floor(Math.random() * 1000),
            dataBytes: Math.floor(Math.random() * 1000000),
            signal: {
                last: -50 - Math.floor(Math.random() * 40),
                min: -90,
                max: -40
            },
            location: {
                lat: 40.7128 + (Math.random() - 0.5) * 0.1,
                lon: -74.0060 + (Math.random() - 0.5) * 0.1,
                accuracy: 10
            },
            ...overrides
        };
    },

    // Generate mock network data
    generateMockNetwork: (overrides = {}) => {
        const bssid = overrides.bssid || `00:11:22:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}:66`.toUpperCase();
        
        return {
            ssid: `TestNetwork_${Math.random().toString(36).substr(2, 5)}`,
            bssid,
            channel: Math.floor(Math.random() * 11) + 1,
            frequency: 2412000000 + (Math.floor(Math.random() * 11) * 5000000),
            encryption: ['Open', 'WEP', 'WPA', 'WPA2', 'WPA3'][Math.floor(Math.random() * 5)],
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            clients: Math.floor(Math.random() * 20),
            packets: Math.floor(Math.random() * 5000),
            signal: {
                last: -60 - Math.floor(Math.random() * 30),
                min: -85,
                max: -50
            },
            ...overrides
        };
    },

    // Generate mock alert data
    generateMockAlert: (overrides = {}) => {
        const alertTypes = ['DEAUTHFLOOD', 'APSPOOF', 'CHANCHANGE', 'BCASTDISCON', 'AIRJACKSSID'];
        const severities = ['info', 'low', 'medium', 'high', 'critical'];
        
        return {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
            severity: severities[Math.floor(Math.random() * severities.length)],
            timestamp: new Date().toISOString(),
            message: 'Test alert message',
            details: {
                source: `AA:BB:CC:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}:FF`.toUpperCase(),
                dest: `00:11:22:${Math.random().toString(16).substr(2, 2)}:${Math.random().toString(16).substr(2, 2)}:66`.toUpperCase(),
                channel: Math.floor(Math.random() * 11) + 1,
                additional: 'Additional test information'
            },
            ...overrides
        };
    },

    // Mock WebSocket for testing
    createMockWebSocket: () => {
        const events = {};
        const mockWs = {
            readyState: 1, // OPEN
            OPEN: 1,
            CLOSED: 3,
            send: jest.fn(),
            close: jest.fn(() => {
                mockWs.readyState = 3;
                if (events.close) events.close();
            }),
            on: (event, handler) => {
                events[event] = handler;
            },
            emit: (event, data) => {
                if (events[event]) events[event](data);
            }
        };
        
        // Simulate connection
        setTimeout(() => {
            if (events.open) events.open();
        }, 0);
        
        return mockWs;
    },

    // Performance measurement utility
    measurePerformance: async (fn, iterations = 100) => {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = process.hrtime.bigint();
            await fn();
            const end = process.hrtime.bigint();
            times.push(Number(end - start) / 1000000); // Convert to milliseconds
        }
        
        times.sort((a, b) => a - b);
        
        return {
            min: times[0],
            max: times[times.length - 1],
            mean: times.reduce((a, b) => a + b, 0) / times.length,
            median: times[Math.floor(times.length / 2)],
            p95: times[Math.floor(times.length * 0.95)],
            p99: times[Math.floor(times.length * 0.99)]
        };
    }
};

// Mock timers for consistent testing
global.mockTimers = {
    enable: () => {
        jest.useFakeTimers();
    },
    disable: () => {
        jest.useRealTimers();
    },
    advance: (ms) => {
        jest.advanceTimersByTime(ms);
    },
    runAll: () => {
        jest.runAllTimers();
    }
};

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
});

// Increase timeout for integration tests
if (process.env.TEST_TYPE === 'integration') {
    jest.setTimeout(60000);
}

// Suppress console output during tests unless explicitly needed
if (process.env.SHOW_LOGS !== 'true') {
    global.console = {
        ...console,
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    };
}
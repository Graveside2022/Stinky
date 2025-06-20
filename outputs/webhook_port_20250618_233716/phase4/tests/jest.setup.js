/**
 * Jest Test Setup
 * Global configuration and utilities for all tests
 */

// Increase timeout for slower operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Restore console for important messages
const originalLog = console.log;
const originalError = console.error;

// Allow specific console outputs
global.testLog = (...args) => {
    originalLog.apply(console, args);
};

global.testError = (...args) => {
    originalError.apply(console, args);
};

// Global test utilities
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Clean up after each test
afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
});

// Ensure all handles are closed
afterAll(async () => {
    await global.delay(100); // Give time for connections to close
});
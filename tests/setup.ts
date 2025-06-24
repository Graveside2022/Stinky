// Jest setup file for global test configuration
// This file runs before each test suite

// Extend Jest matchers if needed
// import '@testing-library/jest-dom';

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Keep important logs but suppress noisy ones
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep warnings and errors visible
  warn: console.warn,
  error: console.error,
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.resetAllMocks();
});
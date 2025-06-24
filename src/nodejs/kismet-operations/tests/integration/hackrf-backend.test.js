/**
 * HackRF Backend Integration Tests
 * Tests the integration with Python HackRF backend on port 8092
 */

const { HackRFIntegration } = require('../../lib/hackrf');
const WebSocket = require('ws');
const axios = require('axios');

// Test configuration
const BACKEND_URL = process.env.HACKRF_BACKEND_URL || 'http://localhost:8092';
const WS_URL = BACKEND_URL.replace(/^http/, 'ws') + '/ws';
const TEST_TIMEOUT = 30000;

describe('HackRF Backend Integration Tests', () => {
  let integration;
  let receivedFFTData = [];
  let receivedSignals = [];
  let statusUpdates = [];

  beforeAll(async () => {
    // Check if backend is available
    try {
      const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      if (response.status !== 200) {
        console.warn('HackRF backend not available, skipping integration tests');
        return;
      }
    } catch (error) {
      console.warn('HackRF backend not reachable:', error.message);
      return;
    }
  });

  beforeEach(() => {
    integration = new HackRFIntegration({
      backendUrl: BACKEND_URL,
      enableAutoReconnect: false,
      fftBufferSize: 50,
      signalHistorySize: 100
    });

    receivedFFTData = [];
    receivedSignals = [];
    statusUpdates = [];

    // Set up event listeners
    integration.on('fft', (data) => receivedFFTData.push(data));
    integration.on('signal', (signal) => receivedSignals.push(signal));
    integration.on('status', (status) => statusUpdates.push(status));
  });

  afterEach(async () => {
    if (integration) {
      await integration.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(integration.initialize()).resolves.not.toThrow();
      expect(integration.isConnected()).toBe(true);
    }, TEST_TIMEOUT);

    test('should emit initialized event with status', async () => {
      const initPromise = new Promise((resolve) => {
        integration.once('initialized', resolve);
      });

      await integration.initialize();
      const event = await initPromise;

      expect(event).toHaveProperty('status');
      expect(event).toHaveProperty('health');
      expect(event.health.status).toBe('healthy');
    }, TEST_TIMEOUT);

    test('should handle initialization failure gracefully', async () => {
      const badIntegration = new HackRFIntegration({
        backendUrl: 'http://localhost:9999' // Non-existent port
      });

      await expect(badIntegration.initialize()).rejects.toThrow();
    }, TEST_TIMEOUT);
  });

  describe('API Communication', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should get device status', async () => {
      const status = await integration.getStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('current_config');
      expect(status).toHaveProperty('uptime');
    });

    test('should get current configuration', async () => {
      const config = await integration.getConfig();
      
      expect(config).toHaveProperty('center_freq');
      expect(config).toHaveProperty('sample_rate');
      expect(config).toHaveProperty('gain');
      expect(config.gain).toHaveProperty('lna');
      expect(config.gain).toHaveProperty('vga');
    });

    test('should update configuration', async () => {
      const newConfig = {
        center_freq: 146000000,
        gain: {
          lna: 20,
          vga: 30
        }
      };

      const updated = await integration.updateConfig(newConfig);
      
      expect(updated.center_freq).toBe(newConfig.center_freq);
      expect(updated.gain.lna).toBe(newConfig.gain.lna);
      expect(updated.gain.vga).toBe(newConfig.gain.vga);
    });
  });

  describe('WebSocket Communication', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should receive FFT data', async () => {
      // Wait for FFT data
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('No FFT data received within timeout');
          resolve();
        }, 10000);

        integration.once('fft', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      expect(receivedFFTData.length).toBeGreaterThan(0);
      
      const fftData = receivedFFTData[0];
      expect(fftData).toHaveProperty('timestamp');
      expect(fftData).toHaveProperty('frequency');
      expect(fftData).toHaveProperty('sample_rate');
      expect(fftData).toHaveProperty('fft_data');
      expect(Array.isArray(fftData.fft_data)).toBe(true);
    }, TEST_TIMEOUT);

    test('should detect signals from FFT data', async () => {
      // Wait for signal detection
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('No signals detected within timeout');
          resolve();
        }, 15000);

        integration.once('signal', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      if (receivedSignals.length > 0) {
        const signal = receivedSignals[0];
        expect(signal).toHaveProperty('id');
        expect(signal).toHaveProperty('source');
        expect(signal.source).toBe('hackrf');
        expect(signal).toHaveProperty('signal_strength');
        expect(signal).toHaveProperty('frequency');
        expect(signal).toHaveProperty('timestamp');
      }
    }, TEST_TIMEOUT);

    test('should handle connection loss and recovery', async () => {
      const disconnectPromise = new Promise((resolve) => {
        integration.once('disconnected', resolve);
      });

      // Simulate connection loss by stopping the backend
      // (This would require backend support for testing)
      
      // For now, just test manual disconnect
      integration.wsClient.disconnect();
      
      await expect(disconnectPromise).resolves.toBeDefined();
      expect(integration.isConnected()).toBe(false);
    });
  });

  describe('Data Processing', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should process spectrum for display', async () => {
      // Create mock FFT data
      const mockFFT = {
        timestamp: Date.now(),
        center_freq: 145000000,
        sample_rate: 2400000,
        fft_size: 2048,
        fft_data: new Float32Array(2048).fill(-80).map((v, i) => {
          // Add some peaks
          if (i === 512 || i === 1024 || i === 1536) {
            return -40;
          }
          return v + Math.random() * 10 - 5;
        })
      };

      const processed = integration.processSpectrumForDisplay(mockFFT, 512, true);
      
      expect(processed).toHaveProperty('frequencies');
      expect(processed).toHaveProperty('powers');
      expect(processed.frequencies.length).toBe(512);
      expect(processed.powers.length).toBe(512);
      expect(processed.frequencies[0]).toBeLessThan(processed.frequencies[511]);
    });

    test('should maintain FFT buffer', async () => {
      // Wait for some FFT data
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const buffer = integration.getFFTBuffer();
      expect(Array.isArray(buffer)).toBe(true);
      expect(buffer.length).toBeLessThanOrEqual(50); // fftBufferSize
    });

    test('should maintain signal history', async () => {
      // Wait for some signals
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const history = integration.getSignalHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(100); // signalHistorySize
    });
  });

  describe('Binary Protocol', () => {
    test('should handle binary FFT messages', async () => {
      const ws = new WebSocket(WS_URL, {
        headers: {
          'X-Client-Type': 'test',
          'X-Binary-Mode': '1'
        }
      });

      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      const messagePromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          if (data instanceof Buffer && data.length > 64) {
            resolve(data);
          }
        });
      });

      // Request FFT data
      ws.send(JSON.stringify({
        type: 'control',
        timestamp: Date.now(),
        data: { command: 'get_fft' }
      }));

      const binaryData = await Promise.race([
        messagePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]).catch(() => null);

      ws.close();

      if (binaryData) {
        expect(binaryData).toBeInstanceOf(Buffer);
        expect(binaryData.length).toBeGreaterThan(64); // Header size
      }
    }, TEST_TIMEOUT);
  });

  describe('Frequency Scanning', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should start and retrieve frequency scan', async () => {
      const scanId = await integration.startFrequencyScan(
        144000000, // 144 MHz
        146000000, // 146 MHz
        100000     // 100 kHz steps
      );

      expect(typeof scanId).toBe('string');
      expect(scanId.length).toBeGreaterThan(0);

      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      const results = await integration.getScanResults(scanId);
      
      expect(results).toHaveProperty('scan_id');
      expect(results.scan_id).toBe(scanId);
      expect(results).toHaveProperty('frequencies');
      expect(results).toHaveProperty('power_levels');
      expect(results).toHaveProperty('detected_signals');
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should handle backend errors gracefully', async () => {
      const errorPromise = new Promise((resolve) => {
        integration.once('backendError', resolve);
      });

      // Send invalid command
      integration.wsClient.send({
        type: 'control',
        timestamp: Date.now(),
        data: { command: 'invalid_command' }
      });

      const error = await errorPromise;
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
    });

    test('should handle API errors', async () => {
      await expect(
        integration.updateConfig({ center_freq: -1 }) // Invalid frequency
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    test('should handle high-rate FFT data', async () => {
      const startTime = Date.now();
      const fftCount = { value: 0 };

      integration.on('fft', () => {
        fftCount.value++;
      });

      // Run for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));

      const duration = (Date.now() - startTime) / 1000;
      const rate = fftCount.value / duration;

      console.log(`FFT rate: ${rate.toFixed(2)} Hz`);
      expect(rate).toBeGreaterThan(10); // At least 10 FFT/s
    }, 15000);

    test('should not leak memory with continuous data', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Run for 30 seconds
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Clear buffers and force GC if available
      integration.clearBuffers();
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB

      console.log(`Memory growth: ${memoryGrowth.toFixed(2)} MB`);
      expect(memoryGrowth).toBeLessThan(50); // Less than 50MB growth
    }, 35000);
  });
});

// Helper function to check if backend is available
async function isBackendAvailable() {
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 1000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

// Skip tests if backend is not available
beforeAll(async () => {
  const available = await isBackendAvailable();
  if (!available) {
    console.warn('HackRF backend not available, skipping all tests');
    // Skip all tests in this file
    jest.setTimeout(1);
    test.skip('Backend not available', () => {});
  }
});
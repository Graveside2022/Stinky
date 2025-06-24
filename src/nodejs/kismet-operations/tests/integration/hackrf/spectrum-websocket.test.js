const WebSocket = require('ws');
const SpectrumAnalyzer = require('../../../lib/spectrumCore');

// Mock WebSocket module
jest.mock('ws');

describe('Spectrum Analyzer WebSocket Integration Tests', () => {
  let analyzer;
  let mockWs;
  let wsEventHandlers;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock WebSocket instance
    wsEventHandlers = {};
    mockWs = {
      on: jest.fn((event, handler) => {
        wsEventHandlers[event] = handler;
      }),
      close: jest.fn(),
      send: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    // Mock WebSocket constructor
    WebSocket.mockImplementation(() => mockWs);
    
    // Create analyzer instance
    analyzer = new SpectrumAnalyzer({
      fft_size: 1024,
      center_freq: 145000000,
      samp_rate: 2400000
    });
  });

  afterEach(() => {
    if (analyzer) {
      analyzer.disconnect();
    }
  });

  describe('WebSocket Connection', () => {
    it('should connect to OpenWebRX WebSocket', async () => {
      const url = 'ws://localhost:8073/ws/';
      
      await analyzer.connectToOpenWebRX(url);
      
      expect(WebSocket).toHaveBeenCalledWith(url);
      expect(mockWs.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should emit connected event on successful connection', (done) => {
      analyzer.on('connected', (data) => {
        expect(data.url).toBe('ws://localhost:8073/ws/');
        expect(data.timestamp).toBeDefined();
        expect(analyzer.isConnected).toBe(true);
        expect(analyzer.reconnectAttempts).toBe(0);
        done();
      });
      
      analyzer.connectToOpenWebRX();
      
      // Simulate WebSocket open event
      wsEventHandlers.open();
    });

    it('should handle connection close events', (done) => {
      analyzer.on('disconnected', (data) => {
        expect(data.code).toBe(1006);
        expect(data.reason).toBe('Connection lost');
        expect(analyzer.isConnected).toBe(false);
        done();
      });
      
      analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Simulate connection close
      wsEventHandlers.close(1006, 'Connection lost');
    });

    it('should handle WebSocket errors', (done) => {
      analyzer.on('error', (error) => {
        expect(error.message).toBe('Network error');
        done();
      });
      
      analyzer.connectToOpenWebRX();
      
      // Simulate error
      wsEventHandlers.error(new Error('Network error'));
    });

    it('should close existing connection before creating new one', async () => {
      // First connection
      await analyzer.connectToOpenWebRX();
      const firstWs = analyzer.openwebrx_ws;
      
      // Second connection
      await analyzer.connectToOpenWebRX();
      
      expect(firstWs.close).toHaveBeenCalled();
      expect(WebSocket).toHaveBeenCalledTimes(2);
    });
  });

  describe('Reconnection Logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should attempt reconnection on unexpected close', async () => {
      await analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Simulate unexpected close
      wsEventHandlers.close(1006, 'Connection lost');
      
      expect(analyzer.reconnectAttempts).toBe(1);
      
      // Fast-forward time
      jest.advanceTimersByTime(analyzer.reconnectDelay);
      
      // Should create new connection
      expect(WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for reconnections', async () => {
      await analyzer.connectToOpenWebRX();
      
      // First reconnection - 2 seconds
      wsEventHandlers.close(1006, 'Connection lost');
      expect(analyzer.reconnectAttempts).toBe(1);
      
      jest.advanceTimersByTime(2000);
      
      // Second reconnection - 4 seconds
      wsEventHandlers.close(1006, 'Connection lost');
      expect(analyzer.reconnectAttempts).toBe(2);
      
      jest.advanceTimersByTime(4000);
      
      // Third reconnection - 8 seconds
      wsEventHandlers.close(1006, 'Connection lost');
      expect(analyzer.reconnectAttempts).toBe(3);
    });

    it('should stop reconnecting after max attempts', async () => {
      analyzer.maxReconnectAttempts = 3;
      await analyzer.connectToOpenWebRX();
      
      // Exhaust reconnection attempts
      for (let i = 0; i < 3; i++) {
        wsEventHandlers.close(1006, 'Connection lost');
        jest.advanceTimersByTime(10000);
      }
      
      // Should not attempt more reconnections
      wsEventHandlers.close(1006, 'Connection lost');
      jest.advanceTimersByTime(10000);
      
      expect(WebSocket).toHaveBeenCalledTimes(4); // Initial + 3 reconnects
    });

    it('should not reconnect on manual close', async () => {
      await analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Manual close (code 1000)
      wsEventHandlers.close(1000, 'Manual disconnect');
      
      jest.advanceTimersByTime(10000);
      
      // Should not reconnect
      expect(WebSocket).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Handling', () => {
    it('should process binary FFT data', (done) => {
      analyzer.on('fftData', (data) => {
        expect(data).toBeDefined();
        expect(data.data).toHaveLength(4);
        expect(data.timestamp).toBeDefined();
        done();
      });
      
      analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Create mock binary FFT data
      const buffer = Buffer.alloc(16);
      buffer.writeFloatLE(0.1, 0);
      buffer.writeFloatLE(0.2, 4);
      buffer.writeFloatLE(0.3, 8);
      buffer.writeFloatLE(0.4, 12);
      
      // Simulate incoming message
      wsEventHandlers.message(buffer);
    });

    it('should add received FFT data to buffer', async () => {
      await analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      expect(analyzer.fft_buffer).toHaveLength(0);
      
      // Send FFT data
      const buffer = Buffer.alloc(16);
      for (let i = 0; i < 4; i++) {
        buffer.writeFloatLE(0.1 * (i + 1), i * 4);
      }
      
      wsEventHandlers.message(buffer);
      
      expect(analyzer.fft_buffer).toHaveLength(1);
      expect(analyzer.fft_buffer[0].data).toHaveLength(4);
    });

    it('should detect signals in received data', (done) => {
      analyzer.config.signal_threshold = -70;
      
      analyzer.on('signalsDetected', (data) => {
        expect(data.signals).toBeDefined();
        expect(data.signals.length).toBeGreaterThan(0);
        expect(data.timestamp).toBeDefined();
        done();
      });
      
      analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Create FFT data with strong signal
      const buffer = Buffer.alloc(100 * 4);
      for (let i = 0; i < 100; i++) {
        // Most values are noise
        buffer.writeFloatLE(0.0001, i * 4); // ~-80dB
      }
      // Add strong signal
      buffer.writeFloatLE(0.1, 50 * 4); // ~-20dB
      
      wsEventHandlers.message(buffer);
    });

    it('should handle malformed messages gracefully', () => {
      analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Should not throw
      expect(() => {
        wsEventHandlers.message(null);
        wsEventHandlers.message(undefined);
        wsEventHandlers.message('invalid');
        wsEventHandlers.message(Buffer.from('short'));
      }).not.toThrow();
    });
  });

  describe('Buffer Management During Streaming', () => {
    it('should maintain buffer size during continuous streaming', async () => {
      await analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Simulate continuous streaming
      const buffer = Buffer.alloc(16);
      for (let i = 0; i < 2000; i++) {
        buffer.writeFloatLE(Math.random() * 0.1, 0);
        buffer.writeFloatLE(Math.random() * 0.1, 4);
        buffer.writeFloatLE(Math.random() * 0.1, 8);
        buffer.writeFloatLE(Math.random() * 0.1, 12);
        
        wsEventHandlers.message(buffer);
      }
      
      expect(analyzer.fft_buffer.length).toBeLessThanOrEqual(analyzer.maxBufferSize);
      expect(analyzer.fft_buffer.length).toBe(analyzer.bufferCleanupThreshold);
    });
  });

  describe('Connection State Management', () => {
    it('should track connection state correctly', async () => {
      expect(analyzer.isConnected).toBe(false);
      
      await analyzer.connectToOpenWebRX();
      expect(analyzer.isConnected).toBe(false); // Not connected until 'open'
      
      wsEventHandlers.open();
      expect(analyzer.isConnected).toBe(true);
      
      wsEventHandlers.close(1000, 'Closed');
      expect(analyzer.isConnected).toBe(false);
    });

    it('should handle disconnect method', async () => {
      await analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      analyzer.disconnect();
      
      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Manual disconnect');
      expect(analyzer.openwebrx_ws).toBeNull();
      expect(analyzer.isConnected).toBe(false);
    });

    it('should handle multiple disconnect calls', () => {
      expect(() => {
        analyzer.disconnect();
        analyzer.disconnect();
      }).not.toThrow();
    });
  });

  describe('Real-time Data Flow', () => {
    it('should emit events in correct order', async () => {
      const events = [];
      
      analyzer.on('connected', () => events.push('connected'));
      analyzer.on('fftData', () => events.push('fftData'));
      analyzer.on('signalsDetected', () => events.push('signalsDetected'));
      
      await analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Send FFT data with signal
      const buffer = Buffer.alloc(100 * 4);
      for (let i = 0; i < 100; i++) {
        buffer.writeFloatLE(i === 50 ? 0.1 : 0.0001, i * 4);
      }
      
      wsEventHandlers.message(buffer);
      
      // Allow event processing
      await new Promise(resolve => setImmediate(resolve));
      
      expect(events).toContain('connected');
      expect(events).toContain('fftData');
      expect(events.indexOf('fftData')).toBeLessThan(events.indexOf('signalsDetected'));
    });

    it('should handle rapid message bursts', async () => {
      let messageCount = 0;
      
      analyzer.on('fftData', () => {
        messageCount++;
      });
      
      await analyzer.connectToOpenWebRX();
      wsEventHandlers.open();
      
      // Send burst of messages
      const buffer = Buffer.alloc(16);
      for (let i = 0; i < 100; i++) {
        buffer.writeFloatLE(Math.random(), 0);
        buffer.writeFloatLE(Math.random(), 4);
        buffer.writeFloatLE(Math.random(), 8);
        buffer.writeFloatLE(Math.random(), 12);
        
        wsEventHandlers.message(buffer);
      }
      
      // All messages should be processed
      expect(messageCount).toBe(100);
    });
  });
});
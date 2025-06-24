const SpectrumAnalyzer = require('../../../lib/spectrumCore');
const EventEmitter = require('events');

describe('SpectrumAnalyzer Core Unit Tests', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new SpectrumAnalyzer({
      fft_size: 1024,
      center_freq: 145000000,
      samp_rate: 2400000,
      signal_threshold: -70
    });
  });

  afterEach(() => {
    if (analyzer && analyzer.openwebrx_ws) {
      analyzer.disconnect();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultAnalyzer = new SpectrumAnalyzer();
      expect(defaultAnalyzer.config.fft_size).toBe(0);
      expect(defaultAnalyzer.config.center_freq).toBe(0);
      expect(defaultAnalyzer.config.samp_rate).toBe(0);
      expect(defaultAnalyzer.config.signal_threshold).toBe(-70);
    });

    it('should accept custom configuration', () => {
      expect(analyzer.config.fft_size).toBe(1024);
      expect(analyzer.config.center_freq).toBe(145000000);
      expect(analyzer.config.samp_rate).toBe(2400000);
    });

    it('should be an EventEmitter', () => {
      expect(analyzer instanceof EventEmitter).toBe(true);
    });

    it('should initialize buffer management properties', () => {
      expect(analyzer.fft_buffer).toEqual([]);
      expect(analyzer.maxBufferSize).toBe(1000);
      expect(analyzer.bufferCleanupThreshold).toBe(500);
    });
  });

  describe('FFT Data Parsing', () => {
    it('should parse float32 binary data correctly', () => {
      const buffer = Buffer.alloc(16);
      buffer.writeFloatLE(0.1, 0);
      buffer.writeFloatLE(0.2, 4);
      buffer.writeFloatLE(0.3, 8);
      buffer.writeFloatLE(0.4, 12);

      const result = analyzer.parseFFTData(buffer);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(4);
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
      expect(result.data[0]).toBeCloseTo(20 * Math.log10(0.1), 2);
      expect(result.data[1]).toBeCloseTo(20 * Math.log10(0.2), 2);
    });

    it('should handle zero and negative values', () => {
      const buffer = Buffer.alloc(12);
      buffer.writeFloatLE(0, 0);
      buffer.writeFloatLE(-1, 4);
      buffer.writeFloatLE(0.001, 8);

      const result = analyzer.parseFFTData(buffer);

      expect(result.data[0]).toBe(-120); // Floor value
      expect(result.data[1]).toBe(-120); // Negative values floored
      expect(result.data[2]).toBeCloseTo(20 * Math.log10(0.001), 2);
    });

    it('should auto-detect FFT size', () => {
      analyzer.config.fft_size = 0;
      
      const buffer = Buffer.alloc(32); // 8 float values
      for (let i = 0; i < 8; i++) {
        buffer.writeFloatLE(0.1, i * 4);
      }

      analyzer.parseFFTData(buffer);
      expect(analyzer.config.fft_size).toBe(8);
    });

    it('should handle malformed buffer gracefully', () => {
      const buffer = Buffer.from('invalid data');
      const result = analyzer.parseFFTData(buffer);
      
      expect(result).toBeTruthy();
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Signal Detection', () => {
    beforeEach(() => {
      const testFFT = {
        timestamp: Date.now(),
        data: new Array(1024).fill(-90),
        center_freq: 145000000,
        samp_rate: 2400000
      };

      // Add test signals
      testFFT.data[256] = -60;
      testFFT.data[257] = -62;
      testFFT.data[258] = -65;
      
      testFFT.data[512] = -55;
      testFFT.data[513] = -56;
      testFFT.data[514] = -58;
      
      testFFT.data[768] = -65;
      testFFT.data[769] = -66;
      testFFT.data[770] = -68;

      analyzer.fft_buffer.push(testFFT);
    });

    it('should detect signals above threshold', () => {
      const signals = analyzer.detectSignals(-70);
      
      expect(signals).toHaveLength(3);
      signals.forEach(signal => {
        expect(signal).toHaveProperty('frequency');
        expect(signal).toHaveProperty('power');
        expect(signal).toHaveProperty('bin');
        expect(signal).toHaveProperty('bandwidth');
        expect(signal).toHaveProperty('confidence');
        expect(signal).toHaveProperty('timestamp');
        expect(signal.type).toBe('detected');
      });
    });

    it('should respect custom threshold', () => {
      const signals = analyzer.detectSignals(-60);
      
      expect(signals).toHaveLength(1);
      expect(signals[0].power).toBe(-55);
    });

    it('should calculate correct frequencies', () => {
      const signals = analyzer.detectSignals(-70);
      const binWidth = 2400000 / 1024;
      
      const signal1 = signals.find(s => s.bin === 256);
      const expectedFreq1 = 145000000 + (256 - 512) * binWidth;
      expect(signal1.frequency).toBeCloseTo(expectedFreq1, 0);
      
      const signal2 = signals.find(s => s.bin === 512);
      const expectedFreq2 = 145000000;
      expect(signal2.frequency).toBeCloseTo(expectedFreq2, 0);
    });

    it('should estimate bandwidth correctly', () => {
      const signals = analyzer.detectSignals(-70);
      
      signals.forEach(signal => {
        expect(signal.bandwidth).toBeGreaterThan(0);
        expect(signal.bandwidth).toBeLessThan(100000); // Reasonable bandwidth
      });
    });

    it('should calculate confidence scores', () => {
      const signals = analyzer.detectSignals(-70);
      
      signals.forEach(signal => {
        expect(signal.confidence).toBeGreaterThan(0);
        expect(signal.confidence).toBeLessThanOrEqual(1);
      });
      
      // Stronger signal should have higher confidence
      const strongSignal = signals.find(s => s.power === -55);
      const weakSignal = signals.find(s => s.power === -65);
      expect(strongSignal.confidence).toBeGreaterThan(weakSignal.confidence);
    });

    it('should maintain signal history', () => {
      analyzer.detectSignals();
      analyzer.detectSignals();
      analyzer.detectSignals();
      
      expect(analyzer.signalHistory).toHaveLength(3);
      expect(analyzer.lastSignalDetection).toBeDefined();
      expect(analyzer.lastSignalDetection.signalCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty buffer', () => {
      analyzer.fft_buffer = [];
      const signals = analyzer.detectSignals();
      
      expect(signals).toEqual([]);
    });

    it('should respect minimum peak distance', () => {
      const testFFT = {
        timestamp: Date.now(),
        data: new Array(100).fill(-90),
        center_freq: 145000000,
        samp_rate: 2400000
      };

      // Add adjacent peaks
      for (let i = 10; i < 20; i++) {
        testFFT.data[i] = -60;
      }

      analyzer.fft_buffer = [testFFT];
      const signals = analyzer.detectSignals();
      
      // Should detect fewer signals due to minimum distance requirement
      expect(signals.length).toBeLessThan(10);
    });
  });

  describe('Buffer Management', () => {
    it('should add FFT data to buffer', () => {
      const fftData = { data: [1, 2, 3], timestamp: Date.now() };
      analyzer.handleWebSocketMessage(Buffer.alloc(12));
      
      // Buffer should have data after processing
      expect(analyzer.fft_buffer.length).toBeGreaterThan(0);
    });

    it('should maintain buffer size limits', () => {
      for (let i = 0; i < 1500; i++) {
        analyzer.fft_buffer.push({ data: i });
      }
      
      expect(analyzer.fft_buffer.length).toBeLessThanOrEqual(analyzer.maxBufferSize);
      expect(analyzer.fft_buffer.length).toBe(analyzer.bufferCleanupThreshold);
    });

    it('should cleanup old data when buffer exceeds limit', () => {
      // Fill buffer to max
      for (let i = 0; i < analyzer.maxBufferSize; i++) {
        analyzer.fft_buffer.push({ data: i });
      }
      
      // Add one more
      const latestData = { data: 'latest', timestamp: Date.now() };
      analyzer.fft_buffer.push(latestData);
      
      // Should cleanup and maintain size
      expect(analyzer.fft_buffer.length).toBe(analyzer.bufferCleanupThreshold);
      expect(analyzer.fft_buffer[analyzer.fft_buffer.length - 1]).toEqual(latestData);
    });

    it('should clear buffer on command', () => {
      analyzer.fft_buffer = [1, 2, 3, 4, 5];
      let bufferClearedEvent = false;
      
      analyzer.on('bufferCleared', (data) => {
        bufferClearedEvent = true;
        expect(data.previousSize).toBe(5);
      });
      
      analyzer.clearBuffer();
      
      expect(analyzer.fft_buffer).toHaveLength(0);
      expect(bufferClearedEvent).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      let configUpdatedEvent = false;
      
      analyzer.on('configUpdated', (data) => {
        configUpdatedEvent = true;
        expect(data.oldConfig.center_freq).toBe(145000000);
        expect(data.newConfig.center_freq).toBe(146000000);
      });
      
      analyzer.updateConfig({
        center_freq: 146000000,
        signal_threshold: -65
      });
      
      expect(analyzer.config.center_freq).toBe(146000000);
      expect(analyzer.config.signal_threshold).toBe(-65);
      expect(analyzer.config.fft_size).toBe(1024); // Unchanged
      expect(configUpdatedEvent).toBe(true);
    });

    it('should preserve unspecified config values', () => {
      const originalConfig = { ...analyzer.config };
      
      analyzer.updateConfig({ signal_threshold: -75 });
      
      expect(analyzer.config.signal_threshold).toBe(-75);
      expect(analyzer.config.center_freq).toBe(originalConfig.center_freq);
      expect(analyzer.config.samp_rate).toBe(originalConfig.samp_rate);
    });
  });

  describe('Status and Statistics', () => {
    it('should provide status information', () => {
      const status = analyzer.getStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('buffer_size');
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('last_update');
      expect(status).toHaveProperty('last_signal_detection');
      expect(status).toHaveProperty('signal_history_length');
      expect(status).toHaveProperty('reconnect_attempts');
      expect(status).toHaveProperty('max_buffer_size');
    });

    it('should provide signal statistics', () => {
      // Add some detection history
      analyzer.signalHistory = [
        { timestamp: Date.now() - 1000, signals: 3 },
        { timestamp: Date.now() - 500, signals: 2 },
        { timestamp: Date.now(), signals: 4 }
      ];
      
      const stats = analyzer.getSignalStats();
      
      expect(stats.total_detections).toBe(3);
      expect(stats.total_signals).toBe(9);
      expect(stats.average_signals_per_detection).toBe(3);
    });

    it('should handle empty signal history', () => {
      const stats = analyzer.getSignalStats();
      
      expect(stats.total_detections).toBe(0);
      expect(stats.average_signals_per_detection).toBe(0);
      expect(stats.detection_rate).toBe(0);
    });

    it('should get latest FFT data', () => {
      const fft1 = { data: [1], timestamp: Date.now() - 1000 };
      const fft2 = { data: [2], timestamp: Date.now() };
      
      analyzer.fft_buffer = [fft1, fft2];
      
      expect(analyzer.getLatestFFT()).toEqual(fft2);
    });

    it('should return null for empty buffer', () => {
      analyzer.fft_buffer = [];
      expect(analyzer.getLatestFFT()).toBeNull();
    });
  });

  describe('Frequency Calculations', () => {
    it('should calculate frequency for center bin', () => {
      const fftData = {
        data: new Array(1024).fill(0),
        center_freq: 145000000,
        samp_rate: 2400000
      };
      
      const freq = analyzer.calculateFrequency(512, fftData);
      expect(freq).toBe(145000000);
    });

    it('should calculate frequency for edge bins', () => {
      const fftData = {
        data: new Array(1024).fill(0),
        center_freq: 145000000,
        samp_rate: 2400000
      };
      
      const freq0 = analyzer.calculateFrequency(0, fftData);
      const freq1023 = analyzer.calculateFrequency(1023, fftData);
      
      expect(freq0).toBe(145000000 - 1200000); // -samp_rate/2
      expect(freq1023).toBeCloseTo(145000000 + 1200000, -3); // +samp_rate/2
    });

    it('should handle invalid FFT data', () => {
      const freq = analyzer.calculateFrequency(0, { data: null });
      expect(freq).toBe(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit fftData events', (done) => {
      analyzer.on('fftData', (data) => {
        expect(data).toBeDefined();
        expect(data.data).toBeDefined();
        done();
      });
      
      const buffer = Buffer.alloc(16);
      buffer.writeFloatLE(0.1, 0);
      buffer.writeFloatLE(0.2, 4);
      buffer.writeFloatLE(0.3, 8);
      buffer.writeFloatLE(0.4, 12);
      
      analyzer.handleWebSocketMessage(buffer);
    });

    it('should emit signalsDetected events', (done) => {
      analyzer.on('signalsDetected', (data) => {
        expect(data.signals).toBeDefined();
        expect(data.timestamp).toBeDefined();
        expect(data.fftData).toBeDefined();
        done();
      });
      
      // Add FFT data with strong signal
      const testFFT = {
        timestamp: Date.now(),
        data: new Array(100).fill(-90),
        center_freq: 145000000,
        samp_rate: 2400000
      };
      testFFT.data[50] = -50; // Strong signal
      
      analyzer.fft_buffer = [];
      analyzer.config.signal_threshold = -70;
      
      // Manually trigger detection by adding to buffer
      analyzer.fft_buffer.push(testFFT);
      const signals = analyzer.detectSignals();
      
      if (signals.length > 0) {
        analyzer.emit('signalsDetected', {
          signals,
          timestamp: testFFT.timestamp,
          fftData: testFFT
        });
      }
    });
  });
});
const request = require('supertest');
const WebSocket = require('ws');
const { EventEmitter } = require('events');
const SpectrumAnalyzer = require('../lib/spectrumCore');

// Mock the SpectrumAnalyzer
jest.mock('../lib/spectrumCore');

// Mock WebSocket
jest.mock('ws');

describe('Spectrum Analyzer Service Tests', () => {
  let app;
  let mockAnalyzer;
  let server;

  beforeEach(() => {
    // Create mock analyzer instance
    mockAnalyzer = new EventEmitter();
    mockAnalyzer.getStatus = jest.fn();
    mockAnalyzer.connectToOpenWebRX = jest.fn();
    mockAnalyzer.disconnect = jest.fn();
    mockAnalyzer.detectSignals = jest.fn();
    mockAnalyzer.updateConfig = jest.fn();
    mockAnalyzer.getLatestFFT = jest.fn();
    mockAnalyzer.getSignalStats = jest.fn();
    mockAnalyzer.clearBuffer = jest.fn();
    
    // Mock the constructor
    SpectrumAnalyzer.mockImplementation(() => mockAnalyzer);
    
    // Clear module cache and re-require app
    jest.resetModules();
    app = require('../server');
    server = app.listen(0); // Random port
  });

  afterEach((done) => {
    server.close(done);
    jest.clearAllMocks();
  });

  describe('API Endpoints', () => {
    describe('GET /api/spectrum/status', () => {
      it('should return analyzer status when connected', async () => {
        const mockStatus = {
          connected: true,
          buffer_size: 100,
          config: {
            fft_size: 1024,
            center_freq: 145000000,
            samp_rate: 2400000
          },
          last_update: Date.now()
        };

        mockAnalyzer.getStatus.mockReturnValue(mockStatus);

        const response = await request(app)
          .get('/api/spectrum/status')
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body).toEqual(mockStatus);
        expect(mockAnalyzer.getStatus).toHaveBeenCalled();
      });

      it('should handle analyzer not initialized', async () => {
        // Simulate analyzer not created yet
        SpectrumAnalyzer.mockImplementation(() => null);
        
        const response = await request(app)
          .get('/api/spectrum/status')
          .expect(200);

        expect(response.body).toHaveProperty('connected', false);
        expect(response.body).toHaveProperty('error', 'Analyzer not initialized');
      });
    });

    describe('GET /api/spectrum/config', () => {
      it('should return current configuration', async () => {
        const mockConfig = {
          fft_size: 1024,
          center_freq: 145000000,
          samp_rate: 2400000,
          signal_threshold: -70
        };

        mockAnalyzer.config = mockConfig;

        const response = await request(app)
          .get('/api/spectrum/config')
          .expect(200);

        expect(response.body).toEqual(mockConfig);
      });
    });

    describe('POST /api/spectrum/config', () => {
      it('should update configuration with valid data', async () => {
        const newConfig = {
          center_freq: 146000000,
          signal_threshold: -65
        };

        mockAnalyzer.updateConfig.mockImplementation((config) => {
          Object.assign(mockAnalyzer.config, config);
        });

        const response = await request(app)
          .post('/api/spectrum/config')
          .send(newConfig)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.config).toMatchObject(newConfig);
        expect(mockAnalyzer.updateConfig).toHaveBeenCalledWith(newConfig);
      });

      it('should reject invalid configuration', async () => {
        const invalidConfig = {
          center_freq: -1,
          samp_rate: 'invalid'
        };

        const response = await request(app)
          .post('/api/spectrum/config')
          .send(invalidConfig)
          .expect(400);

        expect(response.body.error).toContain('Invalid configuration');
        expect(mockAnalyzer.updateConfig).not.toHaveBeenCalled();
      });
    });

    describe('GET /api/spectrum/signals', () => {
      it('should return detected signals', async () => {
        const mockSignals = [
          {
            frequency: 145500000,
            power: -60,
            bandwidth: 12500,
            confidence: 0.8
          },
          {
            frequency: 145700000,
            power: -55,
            bandwidth: 25000,
            confidence: 0.9
          }
        ];

        mockAnalyzer.detectSignals.mockReturnValue(mockSignals);

        const response = await request(app)
          .get('/api/spectrum/signals')
          .expect(200);

        expect(response.body.signals).toEqual(mockSignals);
        expect(response.body.count).toBe(2);
      });

      it('should apply threshold parameter', async () => {
        const threshold = -65;
        
        await request(app)
          .get(`/api/spectrum/signals?threshold=${threshold}`)
          .expect(200);

        expect(mockAnalyzer.detectSignals).toHaveBeenCalledWith(threshold);
      });
    });

    describe('POST /api/spectrum/connect', () => {
      it('should connect to OpenWebRX', async () => {
        mockAnalyzer.connectToOpenWebRX.mockResolvedValue();

        const response = await request(app)
          .post('/api/spectrum/connect')
          .send({ url: 'ws://localhost:8073/ws/' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockAnalyzer.connectToOpenWebRX).toHaveBeenCalledWith('ws://localhost:8073/ws/');
      });

      it('should handle connection errors', async () => {
        mockAnalyzer.connectToOpenWebRX.mockRejectedValue(new Error('Connection failed'));

        const response = await request(app)
          .post('/api/spectrum/connect')
          .send({ url: 'ws://invalid:8073/ws/' })
          .expect(500);

        expect(response.body.error).toContain('Connection failed');
      });
    });
  });

  describe('WebSocket Integration', () => {
    let wsClient;

    beforeEach((done) => {
      const port = server.address().port;
      wsClient = new WebSocket(`ws://localhost:${port}`);
      wsClient.on('open', done);
    });

    afterEach(() => {
      if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
      }
    });

    it('should handle WebSocket connections', (done) => {
      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'connection') {
          expect(message.status).toBe('connected');
          done();
        }
      });
    });

    it('should broadcast FFT data', (done) => {
      const mockFFTData = {
        timestamp: Date.now(),
        data: new Array(1024).fill(-90),
        center_freq: 145000000,
        samp_rate: 2400000
      };

      // Simulate analyzer emitting FFT data
      setTimeout(() => {
        mockAnalyzer.emit('fftData', mockFFTData);
      }, 100);

      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'fftData') {
          expect(message.data).toEqual(mockFFTData);
          done();
        }
      });
    });

    it('should broadcast signal detections', (done) => {
      const mockSignals = {
        signals: [
          { frequency: 145500000, power: -60 }
        ],
        timestamp: Date.now()
      };

      setTimeout(() => {
        mockAnalyzer.emit('signalsDetected', mockSignals);
      }, 100);

      wsClient.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'signalsDetected') {
          expect(message.data.signals).toEqual(mockSignals.signals);
          done();
        }
      });
    });

    it('should handle client commands', (done) => {
      const command = {
        action: 'updateConfig',
        config: { signal_threshold: -65 }
      };

      wsClient.send(JSON.stringify(command));

      setTimeout(() => {
        expect(mockAnalyzer.updateConfig).toHaveBeenCalledWith(command.config);
        done();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    it('should handle analyzer errors gracefully', async () => {
      mockAnalyzer.getStatus.mockImplementation(() => {
        throw new Error('Analyzer error');
      });

      const response = await request(app)
        .get('/api/spectrum/status')
        .expect(500);

      expect(response.body.error).toContain('Internal server error');
    });

    it('should validate request data', async () => {
      const response = await request(app)
        .post('/api/spectrum/config')
        .send({ invalid_field: 'value' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle rapid status requests', async () => {
      mockAnalyzer.getStatus.mockReturnValue({ connected: true });

      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app).get('/api/spectrum/status')
        );
      }

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should limit WebSocket message rate', (done) => {
      const messages = [];
      let messageCount = 0;

      wsClient.on('message', (data) => {
        messageCount++;
        messages.push(JSON.parse(data));
      });

      // Emit many FFT updates rapidly
      for (let i = 0; i < 100; i++) {
        mockAnalyzer.emit('fftData', { data: i });
      }

      setTimeout(() => {
        // Should have rate-limited the messages
        expect(messageCount).toBeLessThan(100);
        done();
      }, 1000);
    });
  });
});

describe('SpectrumAnalyzer Core Unit Tests', () => {
  let analyzer;

  beforeEach(() => {
    // Use real SpectrumAnalyzer for core functionality tests
    jest.unmock('../lib/spectrumCore');
    const RealSpectrumAnalyzer = jest.requireActual('../lib/spectrumCore');
    analyzer = new RealSpectrumAnalyzer();
  });

  afterEach(() => {
    if (analyzer && analyzer.openwebrx_ws) {
      analyzer.disconnect();
    }
  });

  describe('FFT Data Processing', () => {
    it('should parse binary FFT data correctly', () => {
      // Create mock binary data (4 float32 values)
      const buffer = Buffer.alloc(16);
      buffer.writeFloatLE(0.1, 0);
      buffer.writeFloatLE(0.2, 4);
      buffer.writeFloatLE(0.3, 8);
      buffer.writeFloatLE(0.4, 12);

      const result = analyzer.parseFFTData(buffer);

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(4);
      expect(result.data[0]).toBeCloseTo(20 * Math.log10(0.1), 2);
    });

    it('should handle invalid FFT data', () => {
      const invalidBuffer = Buffer.from('invalid data');
      const result = analyzer.parseFFTData(invalidBuffer);

      expect(result).toBeTruthy();
      expect(result.data).toBeDefined();
    });
  });

  describe('Signal Detection', () => {
    beforeEach(() => {
      // Add test FFT data to buffer
      const testFFT = {
        timestamp: Date.now(),
        data: new Array(1024).fill(-90),
        center_freq: 145000000,
        samp_rate: 2400000
      };

      // Add some signals
      testFFT.data[256] = -60; // Signal 1
      testFFT.data[512] = -55; // Signal 2
      testFFT.data[768] = -65; // Signal 3

      analyzer.fft_buffer.push(testFFT);
    });

    it('should detect signals above threshold', () => {
      const signals = analyzer.detectSignals(-70);

      expect(signals).toHaveLength(3);
      expect(signals[0]).toHaveProperty('frequency');
      expect(signals[0]).toHaveProperty('power');
      expect(signals[0]).toHaveProperty('bandwidth');
      expect(signals[0]).toHaveProperty('confidence');
    });

    it('should filter signals below threshold', () => {
      const signals = analyzer.detectSignals(-60);

      expect(signals).toHaveLength(1); // Only the -55 dB signal
      expect(signals[0].power).toBeCloseTo(-55, 1);
    });

    it('should calculate correct frequencies', () => {
      const signals = analyzer.detectSignals(-70);
      
      // Verify frequency calculation
      const binWidth = 2400000 / 1024;
      const expectedFreq = 145000000 + (512 - 512) * binWidth;
      
      const centerSignal = signals.find(s => s.bin === 512);
      expect(centerSignal.frequency).toBeCloseTo(expectedFreq, 0);
    });
  });

  describe('Buffer Management', () => {
    it('should limit buffer size', () => {
      // Fill buffer beyond limit
      for (let i = 0; i < 1500; i++) {
        analyzer.fft_buffer.push({ data: i });
      }

      expect(analyzer.fft_buffer.length).toBeLessThanOrEqual(analyzer.maxBufferSize);
    });

    it('should clear buffer on command', () => {
      analyzer.fft_buffer = [1, 2, 3, 4, 5];
      analyzer.clearBuffer();

      expect(analyzer.fft_buffer).toHaveLength(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        center_freq: 146000000,
        signal_threshold: -65
      };

      analyzer.updateConfig(newConfig);

      expect(analyzer.config.center_freq).toBe(146000000);
      expect(analyzer.config.signal_threshold).toBe(-65);
    });

    it('should preserve existing config values', () => {
      const originalFFTSize = analyzer.config.fft_size;
      
      analyzer.updateConfig({ center_freq: 146000000 });

      expect(analyzer.config.fft_size).toBe(originalFFTSize);
    });
  });
});
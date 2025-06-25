const WebSocket = require('ws');
const EventEmitter = require('events');
const winston = require('winston');

// Configure logging for SpectrumAnalyzer
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'SpectrumAnalyzer' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'spectrum-analyzer.log',
      format: winston.format.json()
    })
  ]
});

class SpectrumAnalyzer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.logger = logger;
    
    // Configuration matching Python version
    this.config = {
      fft_size: 0,
      center_freq: 0,
      samp_rate: 0,
      fft_compression: 'none',
      signal_threshold: -70,
      ...config
    };
    
    // WebSocket connection to OpenWebRX
    this.openwebrx_ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 seconds
    
    // Buffer management for real-time FFT data
    this.fft_buffer = [];
    this.maxBufferSize = 1000;
    this.bufferCleanupThreshold = 500;
    
    // Signal detection state
    this.lastSignalDetection = null;
    this.signalHistory = [];
    
    this.logger.info('SpectrumAnalyzer instance created', {
      config: this.config,
      maxBufferSize: this.maxBufferSize
    });
  }

  /**
   * Connect to OpenWebRX WebSocket
   * @param {string} url - WebSocket URL (e.g., ws://localhost:8073/ws/)
   */
  async connectToOpenWebRX(url = 'ws://localhost:8073/ws/') {
    try {
      this.logger.info('Attempting to connect to OpenWebRX', { url });
      
      // Close existing connection if any
      if (this.openwebrx_ws) {
        this.openwebrx_ws.close();
      }
      
      this.openwebrx_ws = new WebSocket(url);
      
      // Connection opened
      this.openwebrx_ws.on('open', () => {
        this.logger.info('Connected to OpenWebRX WebSocket successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', {
          url,
          timestamp: Date.now()
        });
      });

      // Handle incoming messages (FFT data)
      this.openwebrx_ws.on('message', (data) => {
        this.handleWebSocketMessage(data);
      });

      // Connection closed
      this.openwebrx_ws.on('close', (code, reason) => {
        this.logger.warn('Disconnected from OpenWebRX', { 
          code, 
          reason: reason.toString(),
          reconnectAttempts: this.reconnectAttempts
        });
        this.isConnected = false;
        this.emit('disconnected', {
          code,
          reason: reason.toString(),
          timestamp: Date.now()
        });
        
        // Attempt reconnection if not manual close
        if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(url);
        }
      });

      // Handle WebSocket errors
      this.openwebrx_ws.on('error', (error) => {
        this.logger.error('WebSocket error occurred', { 
          error: error.message,
          stack: error.stack
        });
        this.emit('error', error);
      });

    } catch (error) {
      this.logger.error('Failed to connect to OpenWebRX', { 
        error: error.message,
        url
      });
      throw error;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(url) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    this.logger.info('Scheduling reconnection attempt', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay
    });
    
    setTimeout(() => {
      this.connectToOpenWebRX(url);
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages (FFT data from OpenWebRX)
   * @param {Buffer} data - Binary WebSocket message
   */
  handleWebSocketMessage(data) {
    try {
      const buffer = Buffer.from(data);
      
      // Parse FFT data from binary message
      const fftData = this.parseFFTData(buffer);
      
      if (fftData && fftData.data && fftData.data.length > 0) {
        // Add to buffer with cleanup management
        this.fft_buffer.push(fftData);
        
        // Keep buffer size manageable
        if (this.fft_buffer.length > this.maxBufferSize) {
          this.fft_buffer = this.fft_buffer.slice(-this.bufferCleanupThreshold);
          this.logger.debug('FFT buffer cleaned up', {
            oldSize: this.maxBufferSize,
            newSize: this.fft_buffer.length
          });
        }

        // Emit real-time FFT data to connected clients
        this.emit('fftData', fftData);
        
        // Perform signal detection
        const signals = this.detectSignals();
        if (signals.length > 0) {
          this.emit('signalsDetected', {
            signals,
            timestamp: fftData.timestamp,
            fftData
          });
        }
      }
    } catch (error) {
      this.logger.error('Error processing WebSocket message', { 
        error: error.message,
        dataLength: data ? data.length : 0
      });
    }
  }

  /**
   * Parse binary FFT data from OpenWebRX
   * @param {Buffer} buffer - Binary FFT data
   * @returns {Object} Parsed FFT data
   */
  parseFFTData(buffer) {
    try {
      const fftData = {
        timestamp: Date.now(),
        data: [],
        center_freq: this.config.center_freq,
        samp_rate: this.config.samp_rate,
        buffer_length: buffer.length
      };

      // Parse binary FFT data (assuming float32 little-endian)
      // OpenWebRX typically sends FFT data as 32-bit floats
      for (let i = 0; i < buffer.length; i += 4) {
        if (i + 3 < buffer.length) {
          const value = buffer.readFloatLE(i);
          // Convert to dB if needed (OpenWebRX may send linear values)
          const dbValue = isFinite(value) && value > 0 ? 
            20 * Math.log10(value) : -120; // Floor at -120dB
          fftData.data.push(dbValue);
        }
      }

      // Update configuration from received data if needed
      if (fftData.data.length > 0 && this.config.fft_size === 0) {
        this.config.fft_size = fftData.data.length;
        this.logger.info('Auto-detected FFT size', { fft_size: this.config.fft_size });
      }

      return fftData;
    } catch (error) {
      this.logger.error('Error parsing FFT data', { 
        error: error.message,
        bufferLength: buffer.length
      });
      return null;
    }
  }

  /**
   * Detect signals above threshold using peak detection algorithm
   * @param {number} threshold - Signal threshold in dB (optional)
   * @returns {Array} Array of detected signals
   */
  detectSignals(threshold = null) {
    const signalThreshold = threshold || this.config.signal_threshold;
    const signals = [];

    if (this.fft_buffer.length === 0) {
      return signals;
    }

    const latestFFT = this.fft_buffer[this.fft_buffer.length - 1];
    
    if (!latestFFT.data || latestFFT.data.length === 0) {
      return signals;
    }

    // Threshold-based peak detection algorithm
    const data = latestFFT.data;
    const minPeakDistance = 5; // Minimum bins between peaks
    let lastPeakIndex = -minPeakDistance;

    for (let i = 1; i < data.length - 1; i++) {
      const current = data[i];
      const prev = data[i - 1];
      const next = data[i + 1];

      // Peak detection: current value is higher than neighbors and above threshold
      if (current > signalThreshold && 
          current > prev && 
          current > next &&
          (i - lastPeakIndex) >= minPeakDistance) {
        
        const frequency = this.calculateFrequency(i, latestFFT);
        const signal = {
          frequency: frequency,
          power: current,
          bin: i,
          bandwidth: this.estimateBandwidth(i, data),
          confidence: this.calculateConfidence(current, signalThreshold),
          timestamp: latestFFT.timestamp,
          type: 'detected'
        };

        signals.push(signal);
        lastPeakIndex = i;
      }
    }

    // Store signal detection results
    this.lastSignalDetection = {
      timestamp: Date.now(),
      signalCount: signals.length,
      threshold: signalThreshold
    };

    // Maintain signal history
    this.signalHistory.push({
      timestamp: Date.now(),
      signals: signals.length
    });

    // Keep history manageable
    if (this.signalHistory.length > 100) {
      this.signalHistory = this.signalHistory.slice(-50);
    }

    this.logger.debug('Signal detection completed', {
      signalsFound: signals.length,
      threshold: signalThreshold,
      fftSize: data.length
    });

    return signals;
  }

  /**
   * Calculate frequency for a given FFT bin
   * @param {number} bin - FFT bin index
   * @param {Object} fftData - FFT data object
   * @returns {number} Frequency in Hz
   */
  calculateFrequency(bin, fftData) {
    if (!fftData.data || fftData.data.length === 0) {
      return 0;
    }

    const binWidth = fftData.samp_rate / fftData.data.length;
    const frequency = fftData.center_freq + (bin - fftData.data.length / 2) * binWidth;
    return Math.round(frequency);
  }

  /**
   * Estimate signal bandwidth
   * @param {number} peakBin - Peak bin index
   * @param {Array} data - FFT data array
   * @returns {number} Estimated bandwidth in Hz
   */
  estimateBandwidth(peakBin, data) {
    const peakValue = data[peakBin];
    const halfPowerThreshold = peakValue - 3; // 3dB down from peak
    
    // Find bandwidth by searching left and right from peak
    let leftBin = peakBin;
    let rightBin = peakBin;
    
    // Search left
    while (leftBin > 0 && data[leftBin] > halfPowerThreshold) {
      leftBin--;
    }
    
    // Search right
    while (rightBin < data.length - 1 && data[rightBin] > halfPowerThreshold) {
      rightBin++;
    }
    
    // Calculate bandwidth (approximate)
    const binWidth = this.config.samp_rate / data.length;
    const bandwidth = (rightBin - leftBin) * binWidth;
    
    return Math.round(bandwidth);
  }

  /**
   * Calculate confidence score for detected signal
   * @param {number} signalPower - Signal power in dB
   * @param {number} threshold - Detection threshold
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(signalPower, threshold) {
    const margin = signalPower - threshold;
    const maxMargin = 40; // Maximum expected margin in dB
    return Math.min(margin / maxMargin, 1.0);
  }

  /**
   * Disconnect from OpenWebRX
   */
  disconnect() {
    if (this.openwebrx_ws) {
      this.logger.info('Manually disconnecting from OpenWebRX');
      this.openwebrx_ws.close(1000, 'Manual disconnect');
      this.openwebrx_ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Get current status of the spectrum analyzer
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      connected: this.isConnected,
      buffer_size: this.fft_buffer.length,
      config: this.config,
      last_update: this.fft_buffer.length > 0 ? 
        this.fft_buffer[this.fft_buffer.length - 1].timestamp : null,
      last_signal_detection: this.lastSignalDetection,
      signal_history_length: this.signalHistory.length,
      reconnect_attempts: this.reconnectAttempts,
      max_buffer_size: this.maxBufferSize
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('Configuration updated', {
      oldConfig,
      newConfig: this.config
    });
    
    this.emit('configUpdated', {
      oldConfig,
      newConfig: this.config
    });
  }

  /**
   * Clear FFT buffer
   */
  clearBuffer() {
    const bufferSize = this.fft_buffer.length;
    this.fft_buffer = [];
    this.logger.info('FFT buffer cleared', { previousSize: bufferSize });
    this.emit('bufferCleared', { previousSize: bufferSize });
  }

  /**
   * Get latest FFT data
   * @returns {Object|null} Latest FFT data or null if no data available
   */
  getLatestFFT() {
    return this.fft_buffer.length > 0 ? 
      this.fft_buffer[this.fft_buffer.length - 1] : null;
  }

  /**
   * Get signal detection statistics
   * @returns {Object} Signal detection statistics
   */
  getSignalStats() {
    if (this.signalHistory.length === 0) {
      return {
        total_detections: 0,
        average_signals_per_detection: 0,
        detection_rate: 0
      };
    }

    const totalSignals = this.signalHistory.reduce((sum, entry) => sum + entry.signals, 0);
    const detectionCount = this.signalHistory.length;
    
    return {
      total_detections: detectionCount,
      total_signals: totalSignals,
      average_signals_per_detection: totalSignals / detectionCount,
      detection_rate: detectionCount / (this.signalHistory.length || 1),
      latest_detection: this.lastSignalDetection
    };
  }
}

module.exports = SpectrumAnalyzer;
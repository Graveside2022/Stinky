#!/usr/bin/env node
/**
 * Spectrum Analyzer WebSocket Client for OpenWebRX Integration
 * Node.js version of the Python spectrum analyzer WebSocket client
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class SpectrumWebSocketClient extends EventEmitter {
  constructor(openWebRXUrl = 'ws://localhost:8073/ws/') {
    super();
    this.url = openWebRXUrl;
    this.ws = null;
    this.connected = false;
    this.configReceived = false;
    this.config = {
      fft_size: 0,
      center_freq: 0,
      samp_rate: 0,
      fft_compression: 'none'
    };
    this.fftBuffer = [];
    this.signalThreshold = -70; // dBm
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔗 Connecting to OpenWebRX: ${this.url}`);
      
      this.ws = new WebSocket(this.url);
      
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
      
      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.connected = true;
        console.log('✅ Connected to OpenWebRX WebSocket');
        this.sendHandshake();
        resolve();
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });
      
      this.ws.on('close', () => {
        this.connected = false;
        console.log('❌ WebSocket connection closed');
        this.emit('disconnected');
      });
      
      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ WebSocket error:', error.message);
        this.emit('error', error);
        reject(error);
      });
    });
  }
  
  sendHandshake() {
    console.log('🤝 Sending OpenWebRX handshake sequence...');
    
    // Step 1: Client hello
    this.ws.send('SERVER DE CLIENT client=spectrum_analyzer_node.js type=receiver');
    console.log('📤 Sent client hello');
    
    // Step 2: Connection properties
    setTimeout(() => {
      this.ws.send(JSON.stringify({
        type: 'connectionproperties',
        params: {
          output_rate: 12000,
          hd_output_rate: 48000
        }
      }));
      console.log('📤 Sent connection properties');
    }, 100);
    
    // Step 3: Start DSP
    setTimeout(() => {
      this.ws.send(JSON.stringify({
        type: 'dspcontrol',
        action: 'start'
      }));
      console.log('📤 Started DSP control');
    }, 200);
    
    // Step 4: Configure demodulator
    setTimeout(() => {
      this.ws.send(JSON.stringify({
        type: 'dspcontrol',
        params: {
          low_cut: -4000,
          high_cut: 4000,
          offset_freq: 0,
          mod: 'nfm',
          squelch_level: -150,
          secondary_mod: false
        }
      }));
      console.log('📤 Configured demodulator');
      console.log('🎯 Handshake complete - waiting for FFT data...');
    }, 300);
  }
  
  handleMessage(data) {
    if (typeof data === 'string') {
      this.handleTextMessage(data);
    } else {
      this.handleBinaryMessage(data);
    }
  }
  
  handleTextMessage(message) {
    if (message.startsWith('CLIENT DE SERVER')) {
      console.log(`🤝 Server handshake: ${message}`);
      return;
    }
    
    try {
      const data = JSON.parse(message);
      if (data.type === 'config') {
        this.config = {
          fft_size: data.value.fft_size || 0,
          center_freq: data.value.center_freq || 0,
          samp_rate: data.value.samp_rate || 0,
          fft_compression: data.value.fft_compression || 'none'
        };
        
        console.log('📡 OpenWebRX Configuration received:');
        console.log(`   - Center Freq: ${(this.config.center_freq / 1e6).toFixed(3)} MHz`);
        console.log(`   - Sample Rate: ${(this.config.samp_rate / 1e6).toFixed(3)} MHz`);
        console.log(`   - FFT Size: ${this.config.fft_size}`);
        console.log(`   - FFT Compression: ${this.config.fft_compression}`);
        
        this.configReceived = true;
        this.emit('config', this.config);
      }
    } catch (error) {
      // Not JSON, ignore
    }
  }
  
  handleBinaryMessage(data) {
    if (data.length < 1) return;
    
    const buffer = Buffer.from(data);
    const messageType = buffer[0];
    const payload = buffer.slice(1);
    
    if (messageType === 1) { // FFT waterfall data
      console.log(`🎯 FFT Data received: ${payload.length} bytes`);
      
      const fftData = this.parseFFTData(payload);
      if (fftData && fftData.length > 0) {
        const fftEntry = {
          data: fftData,
          timestamp: Date.now(),
          center_freq: this.config.center_freq,
          samp_rate: this.config.samp_rate
        };
        
        this.fftBuffer.push(fftEntry);
        
        // Keep only recent data
        if (this.fftBuffer.length > 10) {
          this.fftBuffer.shift();
        }
        
        console.log(`✅ FFT processed: ${fftData.length} bins, ` +
                   `range: ${fftData[0].toFixed(1)} to ${fftData[fftData.length-1].toFixed(1)} dB`);
        
        this.emit('fft_data', fftEntry);
        
        // Analyze for signals
        const signals = this.findSignalPeaks(fftEntry);
        if (signals.length > 0) {
          console.log(`📡 Detected ${signals.length} signal peaks`);
          this.emit('signals', signals);
        }
      }
    }
  }
  
  parseFFTData(payload) {
    try {
      console.log(`🔍 Parsing FFT payload: ${payload.length} bytes`);
      
      // Method 1: Try as Float32 if divisible by 4
      if (payload.length % 4 === 0) {
        try {
          const float32Array = new Float32Array(payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.length));
          if (float32Array.length > 0) {
            console.log(`✅ Parsed as Float32: ${float32Array.length} bins`);
            return Array.from(float32Array);
          }
        } catch (e) {
          // Continue to next method
        }
      }
      
      // Method 2: Try as 8-bit unsigned (common for waterfall)
      try {
        const uint8Array = new Uint8Array(payload);
        // Convert to dB scale (rough approximation)
        const dbArray = Array.from(uint8Array).map(val => (val - 127) * 0.5 - 60);
        console.log(`✅ Parsed as UInt8 to dB: ${dbArray.length} bins`);
        return dbArray;
      } catch (e) {
        // Continue to next method
      }
      
      // Method 3: Try as 16-bit integers
      if (payload.length % 2 === 0) {
        try {
          const int16Array = new Int16Array(payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.length));
          // Convert to dB scale
          const dbArray = Array.from(int16Array).map(val => (val / 327.68) - 100);
          console.log(`✅ Parsed as Int16 to dB: ${dbArray.length} bins`);
          return dbArray;
        } catch (e) {
          // Failed
        }
      }
      
      console.log(`⚠️ Could not parse FFT data: ${payload.length} bytes`);
      return null;
      
    } catch (error) {
      console.error(`❌ FFT parsing error: ${error.message}`);
      return null;
    }
  }
  
  findSignalPeaks(fftEntry) {
    const signals = [];
    const powers = fftEntry.data;
    const centerFreq = fftEntry.center_freq;
    const sampRate = fftEntry.samp_rate;
    
    if (!powers || !centerFreq || !sampRate) {
      return signals;
    }
    
    const numBins = powers.length;
    const freqBinWidth = sampRate / numBins; // Hz per bin
    const freqStart = centerFreq - (sampRate / 2); // Start frequency
    
    console.log(`🔍 Peak detection: ${numBins} bins, ${(freqBinWidth/1000).toFixed(1)} kHz/bin`);
    
    // Find peaks above threshold
    for (let i = 2; i < powers.length - 2; i++) {
      const currentPower = powers[i];
      
      // Enhanced peak detection
      if (currentPower > powers[i-1] && 
          currentPower > powers[i+1] &&
          currentPower > this.signalThreshold &&
          currentPower > powers[i-2] && 
          currentPower > powers[i+2]) {
        
        // Calculate actual frequency
        const frequency = (freqStart + (i * freqBinWidth)) / 1e6; // MHz
        
        const bandwidth = this.estimateBandwidth(powers, i, freqBinWidth);
        const confidence = Math.min(0.5 + Math.max(0, currentPower - this.signalThreshold) / 40, 1.0);
        
        signals.push({
          frequency: frequency,
          power: currentPower,
          bandwidth: bandwidth / 1000, // kHz
          confidence: confidence,
          bin_index: i
        });
        
        if (signals.length <= 3) { // Log first few peaks
          console.log(`📡 Peak ${signals.length}: ${frequency.toFixed(3)} MHz, ` +
                     `${currentPower.toFixed(1)} dB, ${(bandwidth/1000).toFixed(1)} kHz`);
        }
      }
    }
    
    return signals;
  }
  
  estimateBandwidth(powers, peakIndex, freqBinWidth) {
    const peakPower = powers[peakIndex];
    const threshold = peakPower - 3; // -3dB point
    
    // Find left edge
    let leftEdge = peakIndex;
    for (let i = peakIndex - 1; i >= 0; i--) {
      if (powers[i] < threshold) {
        break;
      }
      leftEdge = i;
    }
    
    // Find right edge
    let rightEdge = peakIndex;
    for (let i = peakIndex + 1; i < powers.length; i++) {
      if (powers[i] < threshold) {
        break;
      }
      rightEdge = i;
    }
    
    // Calculate bandwidth in Hz
    const bandwidthBins = rightEdge - leftEdge + 1;
    return bandwidthBins * freqBinWidth;
  }
  
  getLatestFFT() {
    return this.fftBuffer.length > 0 ? this.fftBuffer[this.fftBuffer.length - 1] : null;
  }
  
  getStatus() {
    return {
      connected: this.connected,
      configReceived: this.configReceived,
      fftBufferSize: this.fftBuffer.length,
      config: this.config,
      lastFFTTime: this.fftBuffer.length > 0 ? this.fftBuffer[this.fftBuffer.length - 1].timestamp : null
    };
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Test function for the client
async function testSpectrumClient() {
  console.log('🧪 Testing Spectrum WebSocket Client\n');
  
  const client = new SpectrumWebSocketClient();
  
  // Set up event listeners
  client.on('config', (config) => {
    console.log('📡 Configuration event received');
  });
  
  client.on('fft_data', (fftEntry) => {
    console.log(`📊 FFT data event: ${fftEntry.data.length} bins at ${new Date(fftEntry.timestamp).toISOString()}`);
  });
  
  client.on('signals', (signals) => {
    console.log(`🎯 Signals detected: ${signals.length}`);
    signals.forEach((signal, index) => {
      console.log(`   ${index + 1}. ${signal.frequency.toFixed(3)} MHz, ` +
                 `${signal.power.toFixed(1)} dB, ${signal.bandwidth.toFixed(1)} kHz`);
    });
  });
  
  client.on('error', (error) => {
    console.error('❌ Client error:', error.message);
  });
  
  client.on('disconnected', () => {
    console.log('🔌 Client disconnected');
  });
  
  try {
    await client.connect();
    
    // Monitor for 30 seconds
    console.log('⏱️ Monitoring for 30 seconds...\n');
    
    const statusInterval = setInterval(() => {
      const status = client.getStatus();
      console.log(`📊 Status: Connected=${status.connected}, ` +
                 `Config=${status.configReceived}, ` +
                 `Buffer=${status.fftBufferSize}`);
    }, 5000);
    
    setTimeout(() => {
      clearInterval(statusInterval);
      client.disconnect();
      console.log('\n✅ Test completed');
    }, 30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

module.exports = { SpectrumWebSocketClient, testSpectrumClient };

// Run test if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    testSpectrumClient().catch(console.error);
  } else {
    console.log('Spectrum WebSocket Client for OpenWebRX Integration');
    console.log('Usage: node spectrum-websocket-client.js --test');
  }
}
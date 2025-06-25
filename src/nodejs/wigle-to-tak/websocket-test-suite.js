#!/usr/bin/env node
/**
 * OpenWebRX WebSocket Integration Test Suite
 * Comprehensive testing of WebSocket connectivity and FFT data handling
 */

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const { EventEmitter } = require('events');

class OpenWebRXMockServer extends EventEmitter {
  constructor(port = 8073) {
    super();
    this.port = port;
    this.server = null;
    this.wss = null;
    this.httpServer = null;
    this.clients = new Set();
    
    // Mock configuration
    this.config = {
      fft_size: 1024,
      center_freq: 145000000, // 145 MHz
      samp_rate: 2400000,     // 2.4 MHz
      fft_compression: 'none'
    };
    
    // FFT data simulation
    this.fftTimer = null;
    this.running = false;
  }
  
  async start() {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server for basic health check
        const app = express();
        app.get('/', (req, res) => {
          res.send(`
            <html>
              <head><title>Mock OpenWebRX</title></head>
              <body>
                <h1>Mock OpenWebRX Server</h1>
                <p>WebSocket endpoint: ws://localhost:${this.port}/ws/</p>
                <p>Status: Running</p>
              </body>
            </html>
          `);
        });
        
        this.httpServer = http.createServer(app);
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ 
          server: this.httpServer,
          path: '/ws/' 
        });
        
        this.wss.on('connection', (ws, req) => {
          console.log('🔗 Mock OpenWebRX: Client connected from', req.socket.remoteAddress);
          this.clients.add(ws);
          
          // Handle client messages
          ws.on('message', (message) => {
            this.handleClientMessage(ws, message);
          });
          
          ws.on('close', () => {
            console.log('❌ Mock OpenWebRX: Client disconnected');
            this.clients.delete(ws);
          });
          
          ws.on('error', (error) => {
            console.error('⚠️ Mock OpenWebRX: WebSocket error:', error);
            this.clients.delete(ws);
          });
          
          // Send initial server handshake
          setTimeout(() => {
            ws.send('CLIENT DE SERVER mock_openwebrx_v1.0');
          }, 100);
        });
        
        this.httpServer.listen(this.port, () => {
          console.log(`🚀 Mock OpenWebRX server running on port ${this.port}`);
          console.log(`📡 WebSocket endpoint: ws://localhost:${this.port}/ws/`);
          this.running = true;
          this.startFFTSimulation();
          resolve();
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  handleClientMessage(ws, message) {
    const msgStr = message.toString();
    console.log('📥 Mock OpenWebRX: Received:', msgStr);
    
    if (msgStr.includes('SERVER DE CLIENT')) {
      // Client handshake
      console.log('🤝 Mock OpenWebRX: Client handshake received');
      
      // Send configuration after handshake
      setTimeout(() => {
        const configMsg = JSON.stringify({
          type: 'config',
          value: this.config
        });
        ws.send(configMsg);
        console.log('📤 Mock OpenWebRX: Sent configuration');
      }, 200);
      
    } else if (msgStr.includes('connectionproperties')) {
      console.log('⚙️ Mock OpenWebRX: Connection properties received');
      
    } else if (msgStr.includes('dspcontrol')) {
      try {
        const data = JSON.parse(msgStr);
        if (data.action === 'start') {
          console.log('▶️ Mock OpenWebRX: DSP started');
        } else if (data.params) {
          console.log('🔧 Mock OpenWebRX: DSP parameters updated');
        }
      } catch (e) {
        console.log('⚙️ Mock OpenWebRX: DSP control received');
      }
    }
  }
  
  startFFTSimulation() {
    if (this.fftTimer) {
      clearInterval(this.fftTimer);
    }
    
    // Send FFT data every 100ms
    this.fftTimer = setInterval(() => {
      if (this.clients.size > 0) {
        const fftData = this.generateMockFFTData();
        this.broadcast(fftData);
      }
    }, 100);
    
    console.log('📊 Mock OpenWebRX: Started FFT data simulation');
  }
  
  generateMockFFTData() {
    const fftSize = this.config.fft_size;
    const buffer = Buffer.alloc(1 + fftSize); // 1 byte type + FFT data
    
    // Message type 1 = FFT waterfall data
    buffer[0] = 1;
    
    // Generate realistic FFT data (uint8 format)
    for (let i = 0; i < fftSize; i++) {
      // Base noise floor around 80-100
      let value = Math.floor(Math.random() * 20) + 80;
      
      // Add some signal peaks
      if (Math.random() < 0.05) { // 5% chance of signal
        value += Math.floor(Math.random() * 40) + 20; // Signal boost
      }
      
      // Add frequency-dependent characteristics
      const freqPos = i / fftSize;
      if (freqPos > 0.3 && freqPos < 0.7) {
        value += 5; // Slight boost in mid-band
      }
      
      buffer[i + 1] = Math.min(255, Math.max(0, value));
    }
    
    return buffer;
  }
  
  broadcast(data) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
  
  stop() {
    if (this.fftTimer) {
      clearInterval(this.fftTimer);
      this.fftTimer = null;
    }
    
    if (this.wss) {
      this.wss.close();
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    this.running = false;
    console.log('🛑 Mock OpenWebRX server stopped');
  }
}

class WebSocketTester extends EventEmitter {
  constructor() {
    super();
    this.tests = [];
    this.results = [];
  }
  
  addTest(name, testFunction) {
    this.tests.push({ name, testFunction });
  }
  
  async runAllTests() {
    console.log(`\n🧪 Running ${this.tests.length} WebSocket integration tests...\n`);
    
    for (const test of this.tests) {
      const result = await this.runSingleTest(test);
      this.results.push(result);
    }
    
    this.printSummary();
    return this.results;
  }
  
  async runSingleTest(test) {
    const startTime = Date.now();
    console.log(`🔍 Running: ${test.name}`);
    
    try {
      await test.testFunction();
      const duration = Date.now() - startTime;
      console.log(`✅ PASS: ${test.name} (${duration}ms)\n`);
      return { name: test.name, status: 'PASS', duration, error: null };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAIL: ${test.name} (${duration}ms)`);
      console.log(`   Error: ${error.message}\n`);
      return { name: test.name, status: 'FAIL', duration, error: error.message };
    }
  }
  
  printSummary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('📋 TEST SUMMARY');
    console.log('==================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   - ${result.name}: ${result.error}`);
      });
    }
  }
}

// Test implementations
async function testBasicConnection() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8073/ws/');
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('   🔗 WebSocket connection established');
      ws.close();
      resolve();
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function testHandshakeSequence() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8073/ws/');
    let handshakeReceived = false;
    let configReceived = false;
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Handshake timeout'));
    }, 10000);
    
    ws.on('open', () => {
      console.log('   📤 Sending client handshake');
      ws.send('SERVER DE CLIENT client=test_suite type=receiver');
    });
    
    ws.on('message', (data) => {
      const message = data.toString();
      
      if (message.includes('CLIENT DE SERVER')) {
        handshakeReceived = true;
        console.log('   🤝 Server handshake received');
        
        // Send connection properties
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'connectionproperties',
            params: { output_rate: 12000, hd_output_rate: 48000 }
          }));
        }, 100);
        
      } else if (message.includes('config')) {
        try {
          const config = JSON.parse(message);
          if (config.type === 'config') {
            configReceived = true;
            console.log('   ⚙️ Configuration received');
            console.log(`      Center freq: ${config.value.center_freq / 1e6} MHz`);
            console.log(`      Sample rate: ${config.value.samp_rate / 1e6} MHz`);
            console.log(`      FFT size: ${config.value.fft_size}`);
          }
        } catch (e) {
          // Not JSON config
        }
      }
      
      if (handshakeReceived && configReceived) {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function testFFTDataReception() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8073/ws/');
    let fftDataReceived = false;
    let messageCount = 0;
    
    const timeout = setTimeout(() => {
      ws.close();
      if (!fftDataReceived) {
        reject(new Error('No FFT data received'));
      }
    }, 15000);
    
    ws.on('open', () => {
      // Complete handshake sequence
      ws.send('SERVER DE CLIENT client=test_suite type=receiver');
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'connectionproperties',
          params: { output_rate: 12000, hd_output_rate: 48000 }
        }));
      }, 200);
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'dspcontrol',
          action: 'start'
        }));
      }, 400);
    });
    
    ws.on('message', (data) => {
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        messageCount++;
        
        if (!fftDataReceived) {
          fftDataReceived = true;
          console.log(`   📊 FFT binary data received: ${data.length} bytes`);
          
          // Parse the data
          const buffer = Buffer.from(data);
          if (buffer.length > 0) {
            const messageType = buffer[0];
            console.log(`      Message type: ${messageType}`);
            console.log(`      Payload size: ${buffer.length - 1} bytes`);
            
            if (messageType === 1) {
              console.log('      ✅ FFT waterfall data confirmed');
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          }
        }
        
        // Test multiple messages
        if (messageCount >= 3) {
          console.log(`   📈 Received ${messageCount} FFT messages`);
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function testBinaryMessageParsing() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8073/ws/');
    let parsedSuccessfully = false;
    
    const timeout = setTimeout(() => {
      ws.close();
      if (!parsedSuccessfully) {
        reject(new Error('Failed to parse binary messages'));
      }
    }, 12000);
    
    ws.on('open', () => {
      ws.send('SERVER DE CLIENT client=test_suite type=receiver');
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'dspcontrol', action: 'start' }));
      }, 300);
    });
    
    ws.on('message', (data) => {
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        try {
          const buffer = Buffer.from(data);
          const messageType = buffer[0];
          const payload = buffer.slice(1);
          
          if (messageType === 1 && payload.length > 0) {
            // Test different parsing methods
            console.log('   🔍 Testing FFT data parsing methods...');
            
            // Method 1: UInt8 to dB conversion
            const uint8Array = new Uint8Array(payload);
            const dbArray = Array.from(uint8Array).map(val => (val - 127) * 0.5 - 60);
            
            if (dbArray.length > 0) {
              const avgPower = dbArray.reduce((sum, val) => sum + val, 0) / dbArray.length;
              const maxPower = Math.max(...dbArray);
              const minPower = Math.min(...dbArray);
              
              console.log(`      📊 Parsed ${dbArray.length} bins`);
              console.log(`      📈 Power range: ${minPower.toFixed(1)} to ${maxPower.toFixed(1)} dB`);
              console.log(`      📊 Average power: ${avgPower.toFixed(1)} dB`);
              
              if (maxPower > minPower && dbArray.length > 100) {
                parsedSuccessfully = true;
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Parsing error: ${error.message}`);
        }
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function testProtocolCompatibility() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8073/ws/');
    const protocolSteps = [];
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Protocol compatibility test timeout'));
    }, 15000);
    
    ws.on('open', () => {
      protocolSteps.push('Connection opened');
      
      // Test complete OpenWebRX protocol sequence
      ws.send('SERVER DE CLIENT client=spectrum_analyzer.py type=receiver');
      protocolSteps.push('Client handshake sent');
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'connectionproperties',
          params: { output_rate: 12000, hd_output_rate: 48000 }
        }));
        protocolSteps.push('Connection properties sent');
      }, 200);
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'dspcontrol',
          action: 'start'
        }));
        protocolSteps.push('DSP control start sent');
      }, 400);
      
      setTimeout(() => {
        ws.send(JSON.stringify({
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
        protocolSteps.push('DSP parameters sent');
      }, 600);
    });
    
    ws.on('message', (data) => {
      const message = data.toString();
      
      if (message.includes('CLIENT DE SERVER')) {
        protocolSteps.push('Server handshake received');
      } else if (message.includes('config')) {
        protocolSteps.push('Configuration received');
      } else if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        protocolSteps.push('Binary FFT data received');
        
        // Protocol test complete
        console.log('   📋 Protocol steps completed:');
        protocolSteps.forEach((step, index) => {
          console.log(`      ${index + 1}. ${step}`);
        });
        
        if (protocolSteps.length >= 6) {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Main test runner
async function main() {
  console.log('🚀 OpenWebRX WebSocket Integration Test Suite');
  console.log('=============================================\n');
  
  // Start mock server
  const mockServer = new OpenWebRXMockServer(8073);
  
  try {
    await mockServer.start();
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create test suite
    const tester = new WebSocketTester();
    
    // Add tests
    tester.addTest('Basic WebSocket Connection', testBasicConnection);
    tester.addTest('OpenWebRX Handshake Sequence', testHandshakeSequence);
    tester.addTest('FFT Data Reception', testFFTDataReception);
    tester.addTest('Binary Message Parsing', testBinaryMessageParsing);
    tester.addTest('Protocol Compatibility', testProtocolCompatibility);
    
    // Run tests
    const results = await tester.runAllTests();
    
    // Generate test report
    const reportFile = `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/wigle-to-tak/websocket-test-report.json`;
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'PASS').length,
        failed: results.filter(r => r.status === 'FAIL').length,
        totalTime: results.reduce((sum, r) => sum + r.duration, 0)
      },
      results: results,
      mockServerConfig: mockServer.config
    };
    
    require('fs').writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Test report saved: ${reportFile}`);
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    mockServer.stop();
  }
}

// Export for use as module
module.exports = {
  OpenWebRXMockServer,
  WebSocketTester,
  main
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
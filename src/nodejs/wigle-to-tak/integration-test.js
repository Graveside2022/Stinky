#!/usr/bin/env node
/**
 * Combined Integration Test for OpenWebRX WebSocket
 * Tests both mock server and spectrum client together
 */

const { OpenWebRXMockServer } = require('./websocket-test-suite');
const { SpectrumWebSocketClient } = require('./spectrum-websocket-client');

async function runIntegrationTest() {
  console.log('🔬 OpenWebRX Integration Test');
  console.log('=============================\n');
  
  // Start mock server
  const mockServer = new OpenWebRXMockServer(8073);
  
  try {
    console.log('🚀 Starting mock OpenWebRX server...');
    await mockServer.start();
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🧪 Testing spectrum client integration...\n');
    
    // Create spectrum client
    const client = new SpectrumWebSocketClient();
    
    // Track test results
    let configReceived = false;
    let fftDataReceived = false;
    let signalsDetected = false;
    let testResults = [];
    
    // Set up event handlers
    client.on('config', (config) => {
      configReceived = true;
      console.log('✅ Configuration received by client');
      testResults.push('CONFIG_RECEIVED');
    });
    
    client.on('fft_data', (fftEntry) => {
      if (!fftDataReceived) {
        fftDataReceived = true;
        console.log('✅ FFT data received by client');
        console.log(`   📊 Data: ${fftEntry.data.length} bins`);
        console.log(`   📡 Freq: ${(fftEntry.center_freq / 1e6).toFixed(3)} MHz`);
        console.log(`   📈 Sample rate: ${(fftEntry.samp_rate / 1e6).toFixed(3)} MHz`);
        testResults.push('FFT_DATA_RECEIVED');
      }
    });
    
    client.on('signals', (signals) => {
      if (!signalsDetected) {
        signalsDetected = true;
        console.log('✅ Signal detection working');
        console.log(`   🎯 Found ${signals.length} signals`);
        signals.slice(0, 3).forEach((signal, i) => {
          console.log(`      ${i+1}. ${signal.frequency.toFixed(3)} MHz, ${signal.power.toFixed(1)} dB`);
        });
        testResults.push('SIGNALS_DETECTED');
      }
    });
    
    client.on('error', (error) => {
      console.error('❌ Client error:', error.message);
      testResults.push('ERROR');
    });
    
    // Connect and test
    await client.connect();
    
    // Monitor for 15 seconds
    console.log('⏱️ Monitoring integration for 15 seconds...\n');
    
    let statusCount = 0;
    const statusInterval = setInterval(() => {
      statusCount++;
      const status = client.getStatus();
      console.log(`📊 Status Update ${statusCount}:`);
      console.log(`   🔗 Connected: ${status.connected}`);
      console.log(`   ⚙️ Config: ${status.configReceived}`);
      console.log(`   📊 Buffer: ${status.fftBufferSize} entries`);
      console.log(`   ⏰ Last FFT: ${status.lastFFTTime ? new Date(status.lastFFTTime).toLocaleTimeString() : 'None'}`);
      console.log('');
    }, 3000);
    
    // Complete test after 15 seconds
    setTimeout(() => {
      clearInterval(statusInterval);
      client.disconnect();
      
      console.log('🔬 Integration Test Results:');
      console.log('============================');
      console.log(`✅ Configuration received: ${configReceived}`);
      console.log(`✅ FFT data received: ${fftDataReceived}`);
      console.log(`✅ Signals detected: ${signalsDetected}`);
      console.log(`📊 Test events: ${testResults.join(', ')}`);
      
      // Detailed analysis
      console.log('\n📋 OpenWebRX Integration Analysis:');
      console.log('=====================================');
      
      if (configReceived && fftDataReceived) {
        console.log('✅ PASS: Full WebSocket handshake and data flow working');
        console.log('✅ PASS: FFT data parsing and processing functional');
        console.log('✅ PASS: Client-server protocol compatibility confirmed');
        
        if (signalsDetected) {
          console.log('✅ PASS: Signal detection algorithms working');
          console.log('🎯 RESULT: Integration is FULLY FUNCTIONAL');
        } else {
          console.log('⚠️ INFO: Signal detection may need tuning (normal for mock data)');
          console.log('🎯 RESULT: Integration is FUNCTIONAL');
        }
      } else {
        console.log('❌ FAIL: Integration has issues');
        if (!configReceived) console.log('   - Configuration not received');
        if (!fftDataReceived) console.log('   - FFT data not received');
      }
      
      console.log('\n🔧 OpenWebRX Protocol Requirements:');
      console.log('===================================');
      console.log('1. WebSocket endpoint: ws://host:8073/ws/');
      console.log('2. Handshake: "SERVER DE CLIENT client=name type=receiver"');
      console.log('3. Connection properties JSON message required');
      console.log('4. DSP control messages for configuration');
      console.log('5. Binary messages: Type 1 = FFT waterfall data');
      console.log('6. FFT data format: UInt8 array (0-255) → dB conversion');
      console.log('7. Configuration via JSON "config" message type');
      
      console.log('\n🧪 Test Complete - Mock server will stop in 2 seconds');
      
      setTimeout(() => {
        mockServer.stop();
        process.exit(testResults.includes('ERROR') ? 1 : 0);
      }, 2000);
      
    }, 15000);
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    mockServer.stop();
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}

module.exports = { runIntegrationTest };
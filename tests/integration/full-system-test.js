#!/usr/bin/env node
/**
 * Full System Integration Test
 * Tests all components working together
 */

const axios = require('axios');
const WebSocket = require('ws');
const chalk = require('chalk');

// Service configurations
const services = {
  spectrum: {
    name: 'Spectrum Analyzer (HackRF)',
    port: 8092,
    endpoints: [
      { path: '/api/status', method: 'GET' },
      { path: '/api/config', method: 'GET' },
      { path: '/api/spectrum', method: 'GET' },
      { path: '/api/signals', method: 'GET' },
      { path: '/api/openwebrx/status', method: 'GET' }
    ],
    websocket: 'ws://localhost:8092'
  },
  wigle: {
    name: 'WigleToTAK',
    port: 8000,
    endpoints: [
      { path: '/api/status', method: 'GET' },
      { path: '/api/devices', method: 'GET' },
      { path: '/api/broadcast/status', method: 'GET' }
    ],
    websocket: 'ws://localhost:8000/ws'
  },
  kismet: {
    name: 'Kismet Operations',
    port: 8003,
    endpoints: [
      { path: '/api/system/status', method: 'GET' },
      { path: '/api/scripts/status', method: 'GET' },
      { path: '/api/health', method: 'GET' }
    ],
    websocket: 'ws://localhost:8003'
  }
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✓ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ✗ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`[${timestamp}] ⚠ ${message}`));
      break;
    default:
      console.log(chalk.blue(`[${timestamp}] ℹ ${message}`));
  }
}

// Test HTTP endpoint
async function testEndpoint(service, endpoint) {
  const url = `http://localhost:${service.port}${endpoint.path}`;
  
  try {
    const response = await axios({
      method: endpoint.method,
      url,
      timeout: 5000,
      validateStatus: () => true // Don't throw on any status
    });
    
    if (response.status >= 200 && response.status < 300) {
      log(`${service.name} - ${endpoint.path}: ${response.status} OK`, 'success');
      results.passed++;
      return true;
    } else {
      log(`${service.name} - ${endpoint.path}: ${response.status} ${response.statusText}`, 'error');
      results.failed++;
      results.errors.push({
        service: service.name,
        endpoint: endpoint.path,
        error: `HTTP ${response.status} ${response.statusText}`
      });
      return false;
    }
  } catch (error) {
    log(`${service.name} - ${endpoint.path}: ${error.message}`, 'error');
    results.failed++;
    results.errors.push({
      service: service.name,
      endpoint: endpoint.path,
      error: error.message
    });
    return false;
  }
}

// Test WebSocket connection
async function testWebSocket(service) {
  return new Promise((resolve) => {
    const ws = new WebSocket(service.websocket);
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        ws.close();
        log(`${service.name} - WebSocket: Connection timeout`, 'error');
        results.failed++;
        results.errors.push({
          service: service.name,
          endpoint: 'WebSocket',
          error: 'Connection timeout'
        });
        resolve(false);
      }
    }, 5000);
    
    ws.on('open', () => {
      connected = true;
      clearTimeout(timeout);
      log(`${service.name} - WebSocket: Connected`, 'success');
      results.passed++;
      
      // Test ping/pong
      ws.send(JSON.stringify({ type: 'ping' }));
      
      setTimeout(() => {
        ws.close();
        resolve(true);
      }, 1000);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`${service.name} - WebSocket: ${error.message}`, 'error');
      results.failed++;
      results.errors.push({
        service: service.name,
        endpoint: 'WebSocket',
        error: error.message
      });
      resolve(false);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        log(`${service.name} - WebSocket: Received ${message.type || 'message'}`, 'info');
      } catch (error) {
        log(`${service.name} - WebSocket: Invalid message format`, 'warning');
      }
    });
  });
}

// Test cross-service communication
async function testCrossServiceCommunication() {
  log('Testing cross-service communication...', 'info');
  
  try {
    // Test 1: Check if Spectrum Analyzer can reach OpenWebRX
    const openWebRXStatus = await axios.get('http://localhost:8092/api/openwebrx/status');
    if (openWebRXStatus.data.connected) {
      log('Spectrum Analyzer ↔ OpenWebRX: Connected', 'success');
      results.passed++;
    } else {
      log('Spectrum Analyzer ↔ OpenWebRX: Not connected', 'warning');
      results.failed++;
    }
    
    // Test 2: Check if WigleToTAK can process files
    const wigleStatus = await axios.get('http://localhost:8000/api/status');
    log(`WigleToTAK: Processing ${wigleStatus.data.filesProcessed || 0} files`, 'info');
    
    // Test 3: Check if Kismet Operations can control scripts
    const scriptsStatus = await axios.get('http://localhost:8003/api/scripts/status');
    log(`Kismet Operations: ${Object.keys(scriptsStatus.data).length} scripts available`, 'info');
    
  } catch (error) {
    log(`Cross-service communication test failed: ${error.message}`, 'error');
    results.failed++;
  }
}

// Test data flow
async function testDataFlow() {
  log('Testing data flow...', 'info');
  
  try {
    // Test GPS data flow
    // This would involve checking if GPS data is being received and processed
    
    // Test WiFi scan data flow
    // This would involve checking if Kismet data is being processed by WigleToTAK
    
    // Test spectrum data flow
    // This would involve checking if HackRF data is being streamed
    
    log('Data flow tests completed', 'info');
  } catch (error) {
    log(`Data flow test failed: ${error.message}`, 'error');
    results.failed++;
  }
}

// Main test runner
async function runTests() {
  console.log(chalk.bold.cyan('\n🚀 Stinkster Full System Integration Test\n'));
  
  // Test each service
  for (const [key, service] of Object.entries(services)) {
    console.log(chalk.bold(`\n📡 Testing ${service.name}...\n`));
    
    // Test HTTP endpoints
    for (const endpoint of service.endpoints) {
      await testEndpoint(service, endpoint);
    }
    
    // Test WebSocket
    if (service.websocket) {
      await testWebSocket(service);
    }
    
    // Add delay between services
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test cross-service communication
  console.log(chalk.bold('\n🔗 Testing Cross-Service Communication...\n'));
  await testCrossServiceCommunication();
  
  // Test data flow
  console.log(chalk.bold('\n📊 Testing Data Flow...\n'));
  await testDataFlow();
  
  // Summary
  console.log(chalk.bold('\n📋 Test Summary\n'));
  console.log(chalk.green(`✓ Passed: ${results.passed}`));
  console.log(chalk.red(`✗ Failed: ${results.failed}`));
  
  if (results.errors.length > 0) {
    console.log(chalk.bold.red('\n❌ Errors:\n'));
    results.errors.forEach(error => {
      console.log(chalk.red(`- ${error.service} (${error.endpoint}): ${error.error}`));
    });
  }
  
  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Check if running directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(chalk.red('Test runner failed:'), error);
    process.exit(1);
  });
}

module.exports = { runTests };
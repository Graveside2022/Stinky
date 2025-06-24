#!/usr/bin/env node

/**
 * HackRF Migration Test Script
 * Tests API compatibility between Python and Node.js implementations
 */

const http = require('http');
const io = require('socket.io-client');

const PORT = process.env.HACKRF_PORT || 8092;
const BASE_URL = `http://localhost:${PORT}`;

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function testEndpoint(path, method = 'GET', expectedStatus = 200) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === expectedStatus;
        
        if (success) {
          tests.passed++;
          log(`${method} ${path} - Status: ${res.statusCode}`, 'success');
        } else {
          tests.failed++;
          log(`${method} ${path} - Expected: ${expectedStatus}, Got: ${res.statusCode}`, 'error');
        }
        
        tests.results.push({
          endpoint: `${method} ${path}`,
          expected: expectedStatus,
          actual: res.statusCode,
          success: success,
          response: data
        });
        
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      tests.failed++;
      log(`${method} ${path} - Error: ${error.message}`, 'error');
      tests.results.push({
        endpoint: `${method} ${path}`,
        error: error.message,
        success: false
      });
      resolve({ error });
    });
    
    req.end();
  });
}

async function testWebSocket() {
  return new Promise((resolve) => {
    log('Testing WebSocket connection...');
    
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      timeout: 5000
    });
    
    let connected = false;
    
    socket.on('connect', () => {
      connected = true;
      tests.passed++;
      log('WebSocket connected successfully', 'success');
      
      // Test sending control message
      socket.emit('control', {
        type: 'control',
        data: { command: 'status' }
      });
    });
    
    socket.on('status', (data) => {
      tests.passed++;
      log('Received status event via WebSocket', 'success');
    });
    
    socket.on('error', (error) => {
      tests.failed++;
      log(`WebSocket error: ${error}`, 'error');
    });
    
    setTimeout(() => {
      if (!connected) {
        tests.failed++;
        log('WebSocket connection timeout', 'error');
      }
      socket.close();
      resolve();
    }, 3000);
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('HackRF Migration Test Suite');
  console.log('='.repeat(60));
  
  // Test if server is running
  log('Checking if HackRF server is running...');
  const serverCheck = await testEndpoint('/', 'GET', 200);
  
  if (serverCheck.error) {
    log('Server is not running! Please start the HackRF server first.', 'error');
    log('Run: cd /home/pi/projects/stinkster_christian/stinkster/src/nodejs/hackrf && ./start.sh');
    return;
  }
  
  // Test API endpoints
  log('Testing API endpoints...');
  await testEndpoint('/api/status');
  await testEndpoint('/api/profiles');
  await testEndpoint('/api/scan/vhf');
  await testEndpoint('/api/scan/uhf');
  await testEndpoint('/api/scan/invalid', 'GET', 400);
  
  // Test WebSocket
  await testWebSocket();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${tests.passed + tests.failed}`);
  console.log(`Passed: ${tests.passed}`);
  console.log(`Failed: ${tests.failed}`);
  
  if (tests.failed > 0) {
    console.log('\nFailed Tests:');
    tests.results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.endpoint}: ${r.error || `Expected ${r.expected}, got ${r.actual}`}`);
    });
  }
  
  // Exit with appropriate code
  process.exit(tests.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`Test suite error: ${error.message}`, 'error');
  process.exit(1);
});
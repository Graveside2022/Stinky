#!/usr/bin/env node

/**
 * Test script for Kismet integration
 * Tests both REST API and WebSocket functionality
 */

const axios = require('axios');
const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8092';

console.log('Testing Kismet Integration...');
console.log(`Server URL: ${SERVER_URL}`);
console.log('');

// Test REST API
async function testRestAPI() {
  console.log('1. Testing REST API endpoint...');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/kismet-data`);
    const data = response.data;
    
    console.log('✅ REST API Response received');
    console.log(`   - Success: ${data.success}`);
    console.log(`   - Source: ${data.source}`);
    console.log(`   - Devices: ${data.stats.total_devices}`);
    console.log(`   - Networks: ${data.stats.total_networks}`);
    console.log(`   - Kismet Connected: ${data.stats.kismet_connected}`);
    
    if (data.warning) {
      console.log(`   ⚠️  Warning: ${data.warning}`);
    }
    
    if (data.error) {
      console.log(`   ❌ Error: ${data.error}`);
    }
    
    // Display sample data
    if (data.data.devices && data.data.devices.length > 0) {
      console.log('\n   Sample Device:');
      const device = data.data.devices[0];
      console.log(`   - MAC: ${device.mac}`);
      console.log(`   - Manufacturer: ${device.manufacturer}`);
      console.log(`   - Signal: ${device.signal['kismet.common.signal.last_signal']} dBm`);
    }
    
    if (data.data.networks && data.data.networks.length > 0) {
      console.log('\n   Sample Network:');
      const network = data.data.networks[0];
      console.log(`   - SSID: ${network.ssid}`);
      console.log(`   - BSSID: ${network.bssid}`);
      console.log(`   - Encryption: ${network.encryption}`);
      console.log(`   - Channel: ${network.channel}`);
    }
    
  } catch (error) {
    console.log('❌ REST API Test failed');
    console.log(`   Error: ${error.message}`);
  }
}

// Test WebSocket
async function testWebSocket() {
  console.log('\n2. Testing WebSocket connection...');
  
  return new Promise((resolve) => {
    const socket = io(SERVER_URL);
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      console.log(`   - Socket ID: ${socket.id}`);
      
      // Request Kismet data
      console.log('\n3. Requesting Kismet data via WebSocket...');
      socket.emit('requestKismetData');
    });
    
    socket.on('kismetData', (data) => {
      console.log('✅ Kismet data received via WebSocket');
      console.log(`   - Success: ${data.success}`);
      console.log(`   - Source: ${data.source}`);
      console.log(`   - Devices: ${data.stats?.total_devices || 0}`);
      console.log(`   - Networks: ${data.stats?.total_networks || 0}`);
      
      if (data.warning) {
        console.log(`   ⚠️  Warning: ${data.warning}`);
      }
      
      // Wait for potential automatic update
      console.log('\n4. Waiting for automatic update (if polling enabled)...');
      
      setTimeout(() => {
        socket.disconnect();
      }, 3000);
    });
    
    socket.on('kismetDataUpdate', (data) => {
      console.log('\n✅ Automatic Kismet update received!');
      console.log(`   - Devices: ${data.stats?.total_devices || 0}`);
      console.log(`   - Networks: ${data.stats?.total_networks || 0}`);
    });
    
    socket.on('disconnect', () => {
      console.log('\n✅ WebSocket disconnected');
      resolve();
    });
    
    socket.on('error', (error) => {
      console.log('\n❌ WebSocket error:', error);
      socket.disconnect();
      resolve();
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('\n⏱️  Test timeout - disconnecting');
      socket.disconnect();
      resolve();
    }, 10000);
  });
}

// Run tests
async function runTests() {
  try {
    await testRestAPI();
    await testWebSocket();
    
    console.log('\n✅ All tests completed!');
    console.log('\nTo test with real Kismet data:');
    console.log('1. Start Kismet: sudo kismet');
    console.log('2. Set environment: export KISMET_URL=http://localhost:2501');
    console.log('3. Enable polling: export KISMET_AUTO_POLLING=true');
    console.log('4. Start server: node server.js');
    console.log('5. Run this test again');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
  
  process.exit(0);
}

// Check if server is running
axios.get(`${SERVER_URL}/health`)
  .then(() => {
    console.log('✅ Server is running\n');
    runTests();
  })
  .catch(() => {
    console.log('❌ Server is not running!');
    console.log('Please start the server with: node server.js');
    process.exit(1);
  });
#!/usr/bin/env node
/**
 * Test WebSocket connections for both Kismet Operations Center and WigleToTAK
 */

const io = require('socket.io-client');

console.log('Testing WebSocket connections...\n');

// Test Kismet Operations Center on port 8003
console.log('1. Testing Kismet Operations Center (port 8003)...');
const kismetSocket = io('http://localhost:8003', {
    transports: ['websocket', 'polling'],
    timeout: 5000
});

kismetSocket.on('connect', () => {
    console.log('✓ Connected to Kismet Operations Center');
    console.log('  Socket ID:', kismetSocket.id);
    
    // Test main namespace
    kismetSocket.emit('requestStatus');
});

kismetSocket.on('status', (data) => {
    console.log('✓ Received status from Kismet:', data);
});

kismetSocket.on('connect_error', (error) => {
    console.log('✗ Kismet connection error:', error.message);
});

// Test signal stream namespace
const signalSocket = io('http://localhost:8003/signal-stream', {
    transports: ['websocket', 'polling'],
    timeout: 5000
});

signalSocket.on('connect', () => {
    console.log('✓ Connected to Kismet signal stream');
    console.log('  Socket ID:', signalSocket.id);
    
    // Subscribe to signals
    signalSocket.emit('subscribe', { sources: ['kismet', 'hackrf'] });
});

signalSocket.on('subscribed', (data) => {
    console.log('✓ Subscribed to signal sources:', data);
});

signalSocket.on('connect_error', (error) => {
    console.log('✗ Signal stream connection error:', error.message);
});

// Test WigleToTAK on port 8002
console.log('\n2. Testing WigleToTAK (port 8002)...');
const wigleSocket = io('http://localhost:8002', {
    transports: ['websocket', 'polling'],
    timeout: 5000
});

wigleSocket.on('connect', () => {
    console.log('✓ Connected to WigleToTAK');
    console.log('  Socket ID:', wigleSocket.id);
    
    // Request status
    wigleSocket.emit('requestStatus');
});

wigleSocket.on('status', (data) => {
    console.log('✓ Received status from WigleToTAK:', data);
});

wigleSocket.on('connect_error', (error) => {
    console.log('✗ WigleToTAK connection error:', error.message);
});

// Exit after 10 seconds
setTimeout(() => {
    console.log('\nClosing connections...');
    kismetSocket.close();
    signalSocket.close();
    wigleSocket.close();
    process.exit(0);
}, 10000);

console.log('\nTest will run for 10 seconds...');
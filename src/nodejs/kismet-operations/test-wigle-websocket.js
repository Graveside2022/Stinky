#!/usr/bin/env node
/**
 * Test WigleToTAK WebSocket connection
 */

const io = require('socket.io-client');

console.log('Testing WigleToTAK WebSocket connection...\n');

// Test WigleToTAK on port 8002
const wigleSocket = io('http://localhost:8002', {
    transports: ['websocket', 'polling'],
    timeout: 5000
});

let statusReceived = false;

wigleSocket.on('connect', () => {
    console.log('✓ Connected to WigleToTAK');
    console.log('  Socket ID:', wigleSocket.id);
    console.log('  Transport:', wigleSocket.io.engine.transport.name);
    
    // Request status
    console.log('\nRequesting status...');
    wigleSocket.emit('requestStatus');
});

wigleSocket.on('status', (data) => {
    console.log('\n✓ Received status from WigleToTAK:');
    console.log(JSON.stringify(data, null, 2));
    statusReceived = true;
    
    // Test configuration update
    console.log('\nTesting configuration update...');
    wigleSocket.emit('updateConfig', {
        analysisMode: 'postcollection',
        antennaSensitivity: 'high'
    });
});

wigleSocket.on('configUpdated', (data) => {
    console.log('\n✓ Configuration updated:', data);
    
    // Request status again to verify
    wigleSocket.emit('requestStatus');
});

wigleSocket.on('configError', (data) => {
    console.log('\n✗ Configuration error:', data);
});

wigleSocket.on('broadcastStarted', (data) => {
    console.log('\n✓ Broadcast started:', data);
});

wigleSocket.on('broadcastStopped', (data) => {
    console.log('\n✓ Broadcast stopped:', data);
});

wigleSocket.on('messageSent', (data) => {
    console.log('\n✓ TAK message sent:', data);
});

wigleSocket.on('error', (error) => {
    console.log('\n✗ WigleToTAK error:', error);
});

wigleSocket.on('connect_error', (error) => {
    console.log('\n✗ WigleToTAK connection error:', error.message);
    process.exit(1);
});

wigleSocket.on('disconnect', () => {
    console.log('\n✗ Disconnected from WigleToTAK');
});

// Exit after 5 seconds
setTimeout(() => {
    if (!statusReceived) {
        console.log('\n✗ No status received within 5 seconds');
    }
    console.log('\nClosing connection...');
    wigleSocket.close();
    process.exit(statusReceived ? 0 : 1);
}, 5000);

console.log('Test will run for 5 seconds...');
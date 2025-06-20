#!/usr/bin/env node

/**
 * Focused TAK Integration Test
 * 
 * This script specifically tests the UDP broadcasting functionality
 * that failed in the main integration test.
 */

const axios = require('axios');
const dgram = require('dgram');
const fs = require('fs');

async function testTAKBroadcasting() {
    console.log('🛡️ Focused TAK Integration Test');
    console.log('Testing UDP broadcasting with actual data...\n');
    
    // Create a test CSV file
    const testData = `WigleWifi-1.4,appRelease=2.26,model=SM-G973F,release=9.0.0,device=beyond1qlte,display=PPR1.180610.011.G973FXXU3ASJB,board=msmnile,brand=samsung
MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
AA:BB:CC:DD:EE:FF,TestNetwork,[WPA2-PSK-CCMP][ESS],2025-06-15 21:45:00,6,-45,52.520008,13.404954,100.0,5.0,WIFI`;
    
    fs.writeFileSync('./test-integration.wiglecsv', testData);
    console.log('✅ Created test CSV file');
    
    // Set up UDP listener
    const server = dgram.createSocket('udp4');
    let messageReceived = false;
    let receivedMessage = '';
    
    return new Promise((resolve) => {
        server.bind(6969, () => {
            console.log('📡 UDP listener ready on port 6969');
            
            // Configure WigleToTAK for testing
            setTimeout(async () => {
                try {
                    // Set TAK server settings
                    await axios.post('http://localhost:8000/update_tak_settings', {
                        tak_server_ip: '127.0.0.1',
                        tak_server_port: '6969'
                    }, { headers: { 'Content-Type': 'application/json' } });
                    console.log('⚙️ TAK settings configured');
                    
                    // Enable multicast
                    await axios.post('http://localhost:8000/update_multicast_state', {
                        takMulticast: true
                    }, { headers: { 'Content-Type': 'application/json' } });
                    console.log('📶 Multicast enabled');
                    
                    // Set to post-collection mode for immediate processing
                    await axios.post('http://localhost:8000/update_analysis_mode', {
                        mode: 'postcollection'
                    }, { headers: { 'Content-Type': 'application/json' } });
                    console.log('🔄 Set to post-collection mode');
                    
                    // Start broadcasting the test file
                    const broadcastResponse = await axios.post('http://localhost:8000/start_broadcast', {
                        directory: './',
                        filename: 'test-integration.wiglecsv'
                    }, { headers: { 'Content-Type': 'application/json' } });
                    console.log('🚀 Broadcasting started:', broadcastResponse.data.message);
                    
                } catch (error) {
                    console.error('❌ Configuration error:', error.message);
                    server.close();
                    resolve({
                        success: false,
                        error: 'Configuration failed: ' + error.message
                    });
                }
            }, 500);
        });
        
        server.on('message', (msg, rinfo) => {
            messageReceived = true;
            receivedMessage = msg.toString();
            console.log(`📨 Received UDP message from ${rinfo.address}:${rinfo.port}`);
            console.log(`📋 Message length: ${msg.length} bytes`);
            
            // Check if it's valid CoT XML
            const isValidCoT = receivedMessage.includes('<?xml') && 
                              receivedMessage.includes('<event') &&
                              receivedMessage.includes('TestNetwork');
            
            console.log(`✅ Valid CoT XML: ${isValidCoT}`);
            
            if (isValidCoT) {
                console.log('📜 CoT XML preview:');
                console.log(receivedMessage.substring(0, 200) + '...');
            }
            
            server.close();
            
            // Clean up test file
            fs.unlinkSync('./test-integration.wiglecsv');
            
            resolve({
                success: isValidCoT,
                messageReceived: true,
                messageLength: msg.length,
                validCoT: isValidCoT,
                preview: receivedMessage.substring(0, 200)
            });
        });
        
        server.on('error', (error) => {
            console.error('❌ UDP server error:', error.message);
            server.close();
            resolve({
                success: false,
                error: 'UDP server error: ' + error.message
            });
        });
        
        // Timeout after 15 seconds
        setTimeout(() => {
            server.close();
            
            // Try to stop broadcasting
            axios.post('http://localhost:8000/stop_broadcast', {}, { 
                headers: { 'Content-Type': 'application/json' } 
            }).catch(() => {}); // Ignore errors
            
            // Clean up test file
            try {
                fs.unlinkSync('./test-integration.wiglecsv');
            } catch (e) {}
            
            resolve({
                success: false,
                messageReceived: false,
                error: 'Timeout - no UDP message received within 15 seconds'
            });
        }, 15000);
    });
}

// Run the test
testTAKBroadcasting().then(result => {
    console.log('\n🎯 TAK Integration Test Results:');
    console.log('================================');
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Message Received: ${result.messageReceived ? '✅' : '❌'}`);
    
    if (result.success) {
        console.log(`Message Length: ${result.messageLength} bytes`);
        console.log(`Valid CoT XML: ${result.validCoT ? '✅' : '❌'}`);
        console.log('\n🏆 TAK UDP broadcasting is working correctly!');
    } else {
        console.log(`Error: ${result.error}`);
        console.log('\n⚠️  TAK UDP broadcasting needs investigation');
    }
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
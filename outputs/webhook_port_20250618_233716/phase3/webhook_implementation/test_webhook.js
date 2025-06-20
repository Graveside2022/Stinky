/**
 * Test script for webhook service
 * 
 * Run with: node test_webhook.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8002';

// Test functions
async function testHealth() {
    console.log('\n=== Testing Health Check ===');
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', response.data);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
    }
}

async function testInfo() {
    console.log('\n=== Testing Info Endpoint ===');
    try {
        const response = await axios.get(`${BASE_URL}/webhook/info`);
        console.log('✅ Info endpoint passed:', response.data);
    } catch (error) {
        console.error('❌ Info endpoint failed:', error.message);
    }
}

async function testScriptStatus() {
    console.log('\n=== Testing Script Status ===');
    try {
        const response = await axios.get(`${BASE_URL}/webhook/script-status`);
        console.log('✅ Script status passed:', response.data);
    } catch (error) {
        console.error('❌ Script status failed:', error.message);
    }
}

async function testKismetData() {
    console.log('\n=== Testing Kismet Data ===');
    try {
        const response = await axios.get(`${BASE_URL}/webhook/kismet-data`);
        console.log('✅ Kismet data passed:', {
            devices: response.data.devices_count,
            networks: response.data.networks_count,
            recent: response.data.recent_devices.length
        });
    } catch (error) {
        console.error('❌ Kismet data failed:', error.message);
    }
}

async function testStartScript() {
    console.log('\n=== Testing Start Script ===');
    try {
        const response = await axios.post(`${BASE_URL}/webhook/run-script`, {
            script: 'both'
        });
        console.log('✅ Start script passed:', response.data);
    } catch (error) {
        console.error('❌ Start script failed:', error.response?.data || error.message);
    }
}

async function testStopScript() {
    console.log('\n=== Testing Stop Script ===');
    try {
        const response = await axios.post(`${BASE_URL}/webhook/stop-script`);
        console.log('✅ Stop script passed:', response.data);
    } catch (error) {
        console.error('❌ Stop script failed:', error.response?.data || error.message);
    }
}

// WebSocket test
async function testWebSocket() {
    console.log('\n=== Testing WebSocket Connection ===');
    try {
        const io = require('socket.io-client');
        const socket = io(BASE_URL);
        
        socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            
            // Subscribe to events
            socket.emit('subscribe:output');
            socket.emit('subscribe:status');
            
            setTimeout(() => {
                socket.disconnect();
                console.log('✅ WebSocket test completed');
            }, 2000);
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection failed:', error.message);
        });
        
    } catch (error) {
        console.error('❌ WebSocket test failed:', error.message);
    }
}

// Main test runner
async function runTests() {
    console.log('Starting webhook service tests...');
    console.log(`Testing against: ${BASE_URL}`);
    
    // Run tests in sequence
    await testHealth();
    await testInfo();
    await testScriptStatus();
    await testKismetData();
    
    // Interactive prompt for destructive tests
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    readline.question('\nRun start/stop tests? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
            await testStopScript();  // Stop first to clean state
            await testStartScript();
            
            // Wait for services to start
            console.log('\nWaiting 5 seconds for services to start...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            await testScriptStatus();
        }
        
        await testWebSocket();
        
        readline.close();
        process.exit(0);
    });
}

// Check if service is running
axios.get(`${BASE_URL}/health`)
    .then(() => {
        console.log('✅ Webhook service is running');
        runTests();
    })
    .catch(() => {
        console.error('❌ Webhook service is not running on port 8002');
        console.error('Start it with: npm start');
        process.exit(1);
    });
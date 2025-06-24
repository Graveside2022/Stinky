#!/usr/bin/env node

/**
 * Test script for system monitoring endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8092';

async function testEndpoints() {
    console.log('Testing system monitoring endpoints...\n');

    try {
        // Test /info endpoint
        console.log('1. Testing /info endpoint...');
        const infoResponse = await axios.get(`${BASE_URL}/info`);
        console.log('✅ /info endpoint responded');
        console.log('System info:');
        console.log(`- Hostname: ${infoResponse.data.system.hostname}`);
        console.log(`- Platform: ${infoResponse.data.system.platform} ${infoResponse.data.system.arch}`);
        console.log(`- Memory: ${(infoResponse.data.system.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(infoResponse.data.system.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB (${infoResponse.data.system.memory.percent_used}% used)`);
        console.log(`- CPUs: ${infoResponse.data.system.cpus.count}x ${infoResponse.data.system.cpus.model}`);
        console.log(`- Load Average: ${infoResponse.data.system.load_average['1min']} / ${infoResponse.data.system.load_average['5min']} / ${infoResponse.data.system.load_average['15min']}`);
        if (infoResponse.data.system.disk) {
            console.log(`- Disk: ${infoResponse.data.system.disk.used} / ${infoResponse.data.system.disk.size} (${infoResponse.data.system.disk.use_percent} used)`);
        }
        console.log('\n');

        // Test /script-status endpoint
        console.log('2. Testing /script-status endpoint...');
        const statusResponse = await axios.get(`${BASE_URL}/script-status`);
        console.log('✅ /script-status endpoint responded');
        console.log('Script statuses:');
        for (const [script, status] of Object.entries(statusResponse.data.scripts)) {
            console.log(`- ${script}: ${status.status}`);
            if (status.status === 'running') {
                console.log(`  PID: ${status.pid}, CPU: ${status.cpu}, Memory: ${status.memory}`);
            }
        }
        console.log('\nService statuses:');
        for (const [service, status] of Object.entries(statusResponse.data.services)) {
            console.log(`- ${service}: ${status}`);
        }
        console.log('\nNode.js services:');
        for (const [service, info] of Object.entries(statusResponse.data.node_services)) {
            console.log(`- ${service}: ${info.status} (port ${info.port})`);
        }
        console.log('\n');

        // Test /health endpoint
        console.log('3. Testing /health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ /health endpoint responded');
        console.log(`Service health: ${healthResponse.data.status}`);
        console.log(`Uptime: ${Math.floor(healthResponse.data.uptime)} seconds`);
        console.log(`Connected clients: ${healthResponse.data.connected_clients}`);
        console.log(`OpenWebRX connected: ${healthResponse.data.openwebrx_connected}`);
        console.log('\n');

        // Test /api/status endpoint
        console.log('4. Testing /api/status endpoint...');
        const apiStatusResponse = await axios.get(`${BASE_URL}/api/status`);
        console.log('✅ /api/status endpoint responded');
        console.log(`Mode: ${apiStatusResponse.data.mode}`);
        console.log(`Real data: ${apiStatusResponse.data.real_data}`);
        console.log(`Service uptime: ${Math.floor(apiStatusResponse.data.service_uptime / 1000)} seconds`);

        console.log('\n✅ All endpoints are working correctly!');

    } catch (error) {
        console.error('❌ Error testing endpoints:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the tests
testEndpoints();
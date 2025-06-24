#!/usr/bin/env node
/**
 * Test script for the script management endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8092';

async function testScriptEndpoints() {
    console.log('Testing Script Management Endpoints\n');
    
    try {
        // Test 1: Get script status
        console.log('1. Testing GET /script-status');
        const statusResponse = await axios.get(`${BASE_URL}/script-status`);
        console.log('Script Status:', JSON.stringify(statusResponse.data, null, 2));
        console.log('✓ Script status endpoint working\n');
        
        // Test 2: Run a script
        console.log('2. Testing POST /run-script');
        try {
            const runResponse = await axios.post(`${BASE_URL}/run-script`, {
                script_name: 'start_kismet',
                args: []
            });
            console.log('Run Script Response:', JSON.stringify(runResponse.data, null, 2));
            console.log('✓ Script started successfully\n');
            
            // Wait a moment for the script to start
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Test 3: Check status again
            console.log('3. Checking script status after starting');
            const statusAfterStart = await axios.get(`${BASE_URL}/script-status`);
            console.log('Updated Status:', JSON.stringify(statusAfterStart.data, null, 2));
            console.log('✓ Script status updated\n');
            
            // Test 4: Stop the script
            console.log('4. Testing POST /stop-script');
            const stopResponse = await axios.post(`${BASE_URL}/stop-script`, {
                script_name: 'start_kismet'
            });
            console.log('Stop Script Response:', JSON.stringify(stopResponse.data, null, 2));
            console.log('✓ Script stopped successfully\n');
            
        } catch (error) {
            if (error.response) {
                console.log('Error Response:', error.response.data);
            } else {
                console.log('Error:', error.message);
            }
        }
        
        // Test 5: Test with invalid script
        console.log('5. Testing with invalid script name');
        try {
            await axios.post(`${BASE_URL}/run-script`, {
                script_name: 'invalid_script'
            });
        } catch (error) {
            if (error.response && error.response.status === 500) {
                console.log('✓ Correctly rejected invalid script\n');
            } else {
                console.log('✗ Unexpected error:', error.message);
            }
        }
        
        // Test 6: Test missing parameters
        console.log('6. Testing missing parameters');
        try {
            await axios.post(`${BASE_URL}/run-script`, {});
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✓ Correctly rejected missing parameters\n');
            } else {
                console.log('✗ Unexpected error:', error.message);
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run tests
console.log('Starting script endpoint tests...');
console.log(`Target: ${BASE_URL}\n`);

testScriptEndpoints().then(() => {
    console.log('Tests completed!');
    process.exit(0);
}).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
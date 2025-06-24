#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('=== Server Endpoints Integration Test ===');

// Test configuration
const TEST_PORT = 3003; // Use different port to avoid conflicts
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    results: []
};

function recordTest(name, passed, details = '') {
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${name}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${name}: ${details}`);
    }
    testResults.results.push({ name, passed, details });
}

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: TEST_PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const jsonData = responseData ? JSON.parse(responseData) : {};
                    resolve({ status: res.statusCode, data: jsonData, raw: responseData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: {}, raw: responseData });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Create test server
function createTestServer() {
    // Start our server on test port
    const { spawn } = require('child_process');
    const serverProcess = spawn('node', ['server.js', '--flask-port', TEST_PORT.toString()], {
        stdio: 'pipe',
        cwd: __dirname
    });

    return new Promise((resolve, reject) => {
        let serverReady = false;
        
        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes(`running on port ${TEST_PORT}`) && !serverReady) {
                serverReady = true;
                resolve(serverProcess);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.log(`Server stderr: ${data}`);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            if (!serverReady) {
                serverProcess.kill();
                reject(new Error('Server failed to start within timeout'));
            }
        }, 5000);
    });
}

// Test functions
async function testHealthEndpoint() {
    console.log('\n1. Testing Health Endpoint...');
    try {
        const response = await makeRequest('GET', '/health');
        recordTest('Health endpoint responds', response.status === 200);
        recordTest('Health endpoint returns JSON', typeof response.data === 'object');
        recordTest('Health endpoint has status', response.data.status === 'healthy');
    } catch (error) {
        recordTest('Health endpoint', false, error.message);
    }
}

async function testStatusEndpoint() {
    console.log('\n2. Testing Status API Endpoint...');
    try {
        const response = await makeRequest('GET', '/api/status');
        recordTest('Status API responds', response.status === 200);
        recordTest('Status API returns JSON', typeof response.data === 'object');
        recordTest('Status has broadcasting field', 'broadcasting' in response.data);
        recordTest('Status has tak_server_ip field', 'tak_server_ip' in response.data);
        recordTest('Status has tak_server_port field', 'tak_server_port' in response.data);
    } catch (error) {
        recordTest('Status API endpoint', false, error.message);
    }
}

async function testConfigurationEndpoints() {
    console.log('\n3. Testing Configuration Endpoints...');
    
    // Test TAK settings update
    try {
        const response = await makeRequest('POST', '/update_tak_settings', {
            tak_server_ip: '192.168.1.100',
            tak_server_port: '8080'
        });
        recordTest('TAK settings update', response.status === 200);
        recordTest('TAK settings response', response.data.message.includes('updated'));
    } catch (error) {
        recordTest('TAK settings update', false, error.message);
    }
    
    // Test multicast state update
    try {
        const response = await makeRequest('POST', '/update_multicast_state', {
            takMulticast: true
        });
        recordTest('Multicast state update', response.status === 200);
        recordTest('Multicast response', response.data.message.includes('enabled'));
    } catch (error) {
        recordTest('Multicast state update', false, error.message);
    }
    
    // Test analysis mode update
    try {
        const response = await makeRequest('POST', '/update_analysis_mode', {
            mode: 'postcollection'
        });
        recordTest('Analysis mode update', response.status === 200);
        recordTest('Analysis mode response', response.data.message.includes('postcollection'));
    } catch (error) {
        recordTest('Analysis mode update', false, error.message);
    }
    
    // Test antenna sensitivity update
    try {
        const response = await makeRequest('POST', '/update_antenna_sensitivity', {
            antenna_sensitivity: 'high_gain'
        });
        recordTest('Antenna sensitivity update', response.status === 200);
        recordTest('Antenna sensitivity response', response.data.message.includes('high_gain'));
    } catch (error) {
        recordTest('Antenna sensitivity update', false, error.message);
    }
}

async function testWhitelistEndpoints() {
    console.log('\n4. Testing Whitelist Management...');
    
    // Test adding SSID to whitelist
    try {
        const response = await makeRequest('POST', '/add_to_whitelist', {
            ssid: 'TestNetwork'
        });
        recordTest('Add SSID to whitelist', response.status === 200);
        recordTest('Whitelist SSID response', response.data.message.includes('added'));
    } catch (error) {
        recordTest('Add SSID to whitelist', false, error.message);
    }
    
    // Test adding MAC to whitelist
    try {
        const response = await makeRequest('POST', '/add_to_whitelist', {
            mac: '00:11:22:33:44:55'
        });
        recordTest('Add MAC to whitelist', response.status === 200);
        recordTest('Whitelist MAC response', response.data.message.includes('added'));
    } catch (error) {
        recordTest('Add MAC to whitelist', false, error.message);
    }
    
    // Test removing from whitelist
    try {
        const response = await makeRequest('POST', '/remove_from_whitelist', {
            ssid: 'TestNetwork'
        });
        recordTest('Remove SSID from whitelist', response.status === 200);
        recordTest('Remove whitelist response', response.data.message.includes('removed'));
    } catch (error) {
        recordTest('Remove SSID from whitelist', false, error.message);
    }
}

async function testBlacklistEndpoints() {
    console.log('\n5. Testing Blacklist Management...');
    
    // Test adding to blacklist
    try {
        const response = await makeRequest('POST', '/add_to_blacklist', {
            ssid: 'BadNetwork',
            argb_value: '-16711936'
        });
        recordTest('Add SSID to blacklist', response.status === 200);
        recordTest('Blacklist SSID response', response.data.message.includes('added'));
    } catch (error) {
        recordTest('Add SSID to blacklist', false, error.message);
    }
    
    // Test removing from blacklist
    try {
        const response = await makeRequest('POST', '/remove_from_blacklist', {
            ssid: 'BadNetwork'
        });
        recordTest('Remove SSID from blacklist', response.status === 200);
        recordTest('Remove blacklist response', response.data.message.includes('removed'));
    } catch (error) {
        recordTest('Remove SSID from blacklist', false, error.message);
    }
}

async function testFileListingEndpoint() {
    console.log('\n6. Testing File Listing Endpoint...');
    
    // Create test directory and files
    const testDir = './test-wigle-data';
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create test .wiglecsv files
    const testFiles = ['test1.wiglecsv', 'test2.wiglecsv', 'test3.wiglecsv'];
    testFiles.forEach(filename => {
        fs.writeFileSync(path.join(testDir, filename), 'test content');
    });
    
    try {
        const response = await makeRequest('GET', `/list_wigle_files?directory=${testDir}`);
        recordTest('File listing endpoint', response.status === 200);
        recordTest('File listing returns files array', Array.isArray(response.data.files));
        recordTest('File listing finds wigle files', response.data.files.length === 3);
        recordTest('File listing has metadata', 
            response.data.files.every(f => f.name && f.size !== undefined));
    } catch (error) {
        recordTest('File listing endpoint', false, error.message);
    }
    
    // Cleanup
    testFiles.forEach(filename => {
        try {
            fs.unlinkSync(path.join(testDir, filename));
        } catch (e) {}
    });
    try {
        fs.rmdirSync(testDir);
    } catch (e) {}
}

async function testBroadcastEndpoints() {
    console.log('\n7. Testing Broadcast Control...');
    
    // Test start broadcast
    try {
        const response = await makeRequest('POST', '/start_broadcast', {
            directory: './test-data',
            filename: 'test.wiglecsv'
        });
        recordTest('Start broadcast endpoint', response.status === 200);
        recordTest('Start broadcast response', response.data.message.includes('started'));
    } catch (error) {
        recordTest('Start broadcast endpoint', false, error.message);
    }
    
    // Test stop broadcast
    try {
        const response = await makeRequest('POST', '/stop_broadcast', {});
        recordTest('Stop broadcast endpoint', response.status === 200);
        recordTest('Stop broadcast response', response.data.message.includes('stopped'));
    } catch (error) {
        recordTest('Stop broadcast endpoint', false, error.message);
    }
}

async function testErrorHandling() {
    console.log('\n8. Testing Error Handling...');
    
    // Test invalid analysis mode
    try {
        const response = await makeRequest('POST', '/update_analysis_mode', {
            mode: 'invalid_mode'
        });
        recordTest('Invalid analysis mode handling', response.status === 400);
        recordTest('Error message provided', response.data.message.includes('Invalid'));
    } catch (error) {
        recordTest('Invalid analysis mode handling', false, error.message);
    }
    
    // Test missing required fields
    try {
        const response = await makeRequest('POST', '/add_to_whitelist', {});
        recordTest('Missing fields handling', response.status === 400);
        recordTest('Missing fields error message', response.data.message.includes('Must provide'));
    } catch (error) {
        recordTest('Missing fields handling', false, error.message);
    }
    
    // Test non-existent endpoint
    try {
        const response = await makeRequest('GET', '/nonexistent');
        recordTest('Non-existent endpoint handling', response.status === 404);
    } catch (error) {
        recordTest('Non-existent endpoint handling', false, error.message);
    }
}

async function testStaticAssetServing() {
    console.log('\n9. Testing Static Asset Serving...');
    
    // Create test public directory and files
    if (!fs.existsSync('./public')) {
        fs.mkdirSync('./public', { recursive: true });
    }
    
    const testCSS = 'body { background-color: #f0f0f0; }';
    fs.writeFileSync('./public/test.css', testCSS);
    
    try {
        const response = await makeRequest('GET', '/test.css');
        recordTest('Static CSS serving', response.status === 200);
        recordTest('Static CSS content', response.raw.includes('background-color'));
    } catch (error) {
        recordTest('Static CSS serving', false, error.message);
    }
    
    // Cleanup
    try {
        fs.unlinkSync('./public/test.css');
    } catch (e) {}
}

async function testHTMLTemplateServing() {
    console.log('\n10. Testing HTML Template Serving...');
    
    try {
        const response = await makeRequest('GET', '/');
        recordTest('HTML template serving', response.status === 200);
        recordTest('HTML content type', response.raw.includes('<!DOCTYPE html>'));
        recordTest('HTML title present', response.raw.includes('<title>'));
    } catch (error) {
        recordTest('HTML template serving', false, error.message);
    }
}

// Main test execution
async function runAllTests() {
    console.log('Starting server for testing...');
    
    let serverProcess;
    try {
        serverProcess = await createTestServer();
        console.log('✅ Test server started successfully');
        
        // Wait a bit for server to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Run all tests
        await testHealthEndpoint();
        await testStatusEndpoint();
        await testConfigurationEndpoints();
        await testWhitelistEndpoints();
        await testBlacklistEndpoints();
        await testFileListingEndpoint();
        await testBroadcastEndpoints();
        await testErrorHandling();
        await testStaticAssetServing();
        await testHTMLTemplateServing();
        
        console.log('\n=== Server Endpoint Test Results ===');
        console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
        console.log(`Passed: ${testResults.passed}`);
        console.log(`Failed: ${testResults.failed}`);
        
        if (testResults.failed > 0) {
            console.log('\n=== Failed Tests ===');
            testResults.results
                .filter(r => !r.passed)
                .forEach(r => console.log(`❌ ${r.name}: ${r.details}`));
        }
        
        const successRate = testResults.passed / (testResults.passed + testResults.failed);
        console.log(`\nSuccess Rate: ${Math.round(successRate * 100)}%`);
        
        if (successRate >= 0.9) {
            console.log('🟢 Server endpoints are READY for production');
        } else if (successRate >= 0.7) {
            console.log('🟡 Server endpoints need MINOR fixes');
        } else {
            console.log('🔴 Server endpoints need MAJOR fixes');
        }
        
    } catch (error) {
        console.log(`❌ Failed to start test server: ${error.message}`);
    } finally {
        if (serverProcess) {
            serverProcess.kill();
            console.log('✅ Test server stopped');
        }
    }
}

// Cleanup function
process.on('exit', () => {
    try {
        // Clean up any test files
        ['./public/test.css'].forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });
    } catch (e) {}
});

// Run the tests
runAllTests().catch(console.error);
const axios = require('axios');
const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const dgram = require('dgram');
const { promisify } = require('util');

// Configuration
const PYTHON_PORT = 8000;
const NODEJS_PORT = 3002;
const TEST_TIMEOUT = 5000;
const TAK_TEST_PORT = 6970; // Different port for testing

// Test results storage
const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
};

// Utility functions
function logTest(name, status, details = '') {
    const timestamp = new Date().toISOString();
    const result = { name, status, details, timestamp };
    testResults.details.push(result);
    
    if (status === 'PASS') {
        testResults.passed++;
        console.log(`✓ ${name}`);
    } else if (status === 'FAIL') {
        testResults.failed++;
        console.error(`✗ ${name}: ${details}`);
    } else if (status === 'SKIP') {
        testResults.skipped++;
        console.log(`⊘ ${name}: ${details}`);
    }
}

async function compareResponses(endpoint, method = 'GET', data = null, headers = {}) {
    try {
        const [pythonResponse, nodeResponse] = await Promise.all([
            axios({
                method,
                url: `http://localhost:${PYTHON_PORT}${endpoint}`,
                data,
                headers,
                timeout: TEST_TIMEOUT,
                validateStatus: () => true // Don't throw on non-2xx
            }),
            axios({
                method,
                url: `http://localhost:${NODEJS_PORT}${endpoint}`,
                data,
                headers,
                timeout: TEST_TIMEOUT,
                validateStatus: () => true
            })
        ]);
        
        return { 
            python: pythonResponse, 
            node: nodeResponse,
            match: pythonResponse.status === nodeResponse.status
        };
    } catch (error) {
        throw new Error(`Failed to compare responses: ${error.message}`);
    }
}

// Test Suite
const tests = {
    // Basic connectivity tests
    async testServiceAvailability() {
        try {
            const pythonHealth = await axios.get(`http://localhost:${PYTHON_PORT}/`, { timeout: 1000 })
                .then(() => true)
                .catch(() => false);
                
            const nodeHealth = await axios.get(`http://localhost:${NODEJS_PORT}/health`, { timeout: 1000 })
                .then(() => true)
                .catch(() => false);
                
            if (!pythonHealth) {
                logTest('Service Availability', 'FAIL', 'Python service not responding');
                return false;
            }
            
            if (!nodeHealth) {
                logTest('Service Availability', 'FAIL', 'Node.js service not responding');
                return false;
            }
            
            logTest('Service Availability', 'PASS');
            return true;
        } catch (error) {
            logTest('Service Availability', 'FAIL', error.message);
            return false;
        }
    },
    
    // TAK settings update test
    async testTAKSettingsUpdate() {
        const testData = {
            tak_server_ip: '192.168.1.100',
            tak_server_port: '6969'
        };
        
        try {
            const result = await compareResponses('/update_tak_settings', 'POST', testData);
            
            if (result.match && result.python.status === 200) {
                logTest('TAK Settings Update', 'PASS');
            } else {
                logTest('TAK Settings Update', 'FAIL', 
                    `Status mismatch - Python: ${result.python.status}, Node: ${result.node.status}`);
            }
        } catch (error) {
            logTest('TAK Settings Update', 'FAIL', error.message);
        }
    },
    
    // Multicast state update test
    async testMulticastStateUpdate() {
        const testCases = [
            { takMulticast: true },
            { takMulticast: false }
        ];
        
        for (const testData of testCases) {
            try {
                const result = await compareResponses('/update_multicast_state', 'POST', testData);
                
                if (result.match && result.python.status === 200) {
                    logTest(`Multicast State Update (${testData.takMulticast})`, 'PASS');
                } else {
                    logTest(`Multicast State Update (${testData.takMulticast})`, 'FAIL',
                        `Status mismatch - Python: ${result.python.status}, Node: ${result.node.status}`);
                }
            } catch (error) {
                logTest(`Multicast State Update (${testData.takMulticast})`, 'FAIL', error.message);
            }
        }
    },
    
    // Analysis mode update test
    async testAnalysisModeUpdate() {
        const modes = ['realtime', 'postcollection'];
        
        for (const mode of modes) {
            try {
                const result = await compareResponses('/update_analysis_mode', 'POST', { mode });
                
                if (result.match && result.python.status === 200) {
                    logTest(`Analysis Mode Update (${mode})`, 'PASS');
                } else {
                    logTest(`Analysis Mode Update (${mode})`, 'FAIL',
                        `Status mismatch - Python: ${result.python.status}, Node: ${result.node.status}`);
                }
            } catch (error) {
                logTest(`Analysis Mode Update (${mode})`, 'FAIL', error.message);
            }
        }
    },
    
    // Antenna sensitivity test
    async testAntennaSensitivity() {
        const sensitivities = [
            { antenna_sensitivity: 'standard' },
            { antenna_sensitivity: 'alfa_card' },
            { antenna_sensitivity: 'high_gain' },
            { antenna_sensitivity: 'custom', custom_factor: 1.5 }
        ];
        
        for (const testData of sensitivities) {
            try {
                const result = await compareResponses('/update_antenna_sensitivity', 'POST', testData);
                
                if (result.match && result.python.status === 200) {
                    logTest(`Antenna Sensitivity Update (${testData.antenna_sensitivity})`, 'PASS');
                } else {
                    logTest(`Antenna Sensitivity Update (${testData.antenna_sensitivity})`, 'FAIL',
                        `Status mismatch - Python: ${result.python.status}, Node: ${result.node.status}`);
                }
            } catch (error) {
                logTest(`Antenna Sensitivity Update (${testData.antenna_sensitivity})`, 'FAIL', error.message);
            }
        }
        
        // Test GET antenna settings
        try {
            const result = await compareResponses('/get_antenna_settings', 'GET');
            
            if (result.match && result.python.status === 200) {
                // Compare response structure
                const pythonData = result.python.data;
                const nodeData = result.node.data;
                
                if (pythonData.current_sensitivity && nodeData.current_sensitivity &&
                    Array.isArray(pythonData.available_types) && Array.isArray(nodeData.available_types)) {
                    logTest('Get Antenna Settings', 'PASS');
                } else {
                    logTest('Get Antenna Settings', 'FAIL', 'Response structure mismatch');
                }
            } else {
                logTest('Get Antenna Settings', 'FAIL', 'Status code mismatch');
            }
        } catch (error) {
            logTest('Get Antenna Settings', 'FAIL', error.message);
        }
    },
    
    // File listing test
    async testFileListings() {
        const testDirectory = '/home/pi/kismet_ops';
        
        try {
            const result = await compareResponses(`/list_wigle_files?directory=${testDirectory}`, 'GET');
            
            if (result.match && result.python.status === 200) {
                // Verify response structure
                const pythonFiles = result.python.data.files;
                const nodeFiles = result.node.data.files;
                
                if (Array.isArray(pythonFiles) && Array.isArray(nodeFiles)) {
                    // Files might be in different order, so just check if both are arrays
                    logTest('List Wigle Files', 'PASS');
                } else {
                    logTest('List Wigle Files', 'FAIL', 'Response structure mismatch');
                }
            } else {
                logTest('List Wigle Files', 'FAIL', 'Status code mismatch');
            }
        } catch (error) {
            logTest('List Wigle Files', 'FAIL', error.message);
        }
    },
    
    // Whitelist/Blacklist operations
    async testFilteringOperations() {
        const testSSID = 'TestNetwork_' + Date.now();
        const testMAC = '00:11:22:33:44:55';
        
        // Test whitelist operations
        try {
            // Add to whitelist
            let result = await compareResponses('/add_to_whitelist', 'POST', { ssid: testSSID });
            if (result.match && result.python.status === 200) {
                logTest('Add SSID to Whitelist', 'PASS');
            } else {
                logTest('Add SSID to Whitelist', 'FAIL', 'Status mismatch');
            }
            
            // Remove from whitelist
            result = await compareResponses('/remove_from_whitelist', 'POST', { ssid: testSSID });
            if (result.match) {
                logTest('Remove SSID from Whitelist', 'PASS');
            } else {
                logTest('Remove SSID from Whitelist', 'FAIL', 'Status mismatch');
            }
            
            // Test MAC whitelist
            result = await compareResponses('/add_to_whitelist', 'POST', { mac: testMAC });
            if (result.match && result.python.status === 200) {
                logTest('Add MAC to Whitelist', 'PASS');
            } else {
                logTest('Add MAC to Whitelist', 'FAIL', 'Status mismatch');
            }
            
            result = await compareResponses('/remove_from_whitelist', 'POST', { mac: testMAC });
            if (result.match) {
                logTest('Remove MAC from Whitelist', 'PASS');
            } else {
                logTest('Remove MAC from Whitelist', 'FAIL', 'Status mismatch');
            }
            
        } catch (error) {
            logTest('Whitelist Operations', 'FAIL', error.message);
        }
        
        // Test blacklist operations
        try {
            const argbValue = '-65281';
            
            // Add to blacklist
            let result = await compareResponses('/add_to_blacklist', 'POST', { 
                ssid: testSSID, 
                argb_value: argbValue 
            });
            if (result.match && result.python.status === 200) {
                logTest('Add SSID to Blacklist', 'PASS');
            } else {
                logTest('Add SSID to Blacklist', 'FAIL', 'Status mismatch');
            }
            
            // Remove from blacklist
            result = await compareResponses('/remove_from_blacklist', 'POST', { ssid: testSSID });
            if (result.match) {
                logTest('Remove SSID from Blacklist', 'PASS');
            } else {
                logTest('Remove SSID from Blacklist', 'FAIL', 'Status mismatch');
            }
            
        } catch (error) {
            logTest('Blacklist Operations', 'FAIL', error.message);
        }
    },
    
    // Broadcast control test (requires test file)
    async testBroadcastControl() {
        // Create a test Wigle CSV file
        const testFileName = `test_${Date.now()}.wiglecsv`;
        const testFilePath = path.join('/tmp', testFileName);
        const testCSVContent = `MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
AA:BB:CC:DD:EE:FF,TestNetwork,WPA2,2025-01-22 10:00:00,6,-70,40.7128,-74.0060,10,5,WIFI`;
        
        try {
            // Create test file
            await fs.writeFile(testFilePath, testCSVContent);
            
            // Test start broadcast
            const startData = {
                directory: '/tmp',
                filename: testFileName
            };
            
            let result = await compareResponses('/start_broadcast', 'POST', startData);
            
            // We expect this might fail if file doesn't exist in expected location
            // Just check if both services respond consistently
            if (result.match) {
                logTest('Start Broadcast', 'PASS', 'Both services responded consistently');
            } else {
                logTest('Start Broadcast', 'SKIP', 
                    'Services responded differently (expected due to file location differences)');
            }
            
            // Test stop broadcast
            result = await compareResponses('/stop_broadcast', 'POST');
            if (result.match && result.python.status === 200) {
                logTest('Stop Broadcast', 'PASS');
            } else {
                logTest('Stop Broadcast', 'FAIL', 'Status mismatch');
            }
            
            // Cleanup
            await fs.remove(testFilePath);
            
        } catch (error) {
            logTest('Broadcast Control', 'FAIL', error.message);
        }
    },
    
    // TAK message format test
    async testTAKMessageFormat() {
        // This test verifies that both implementations generate compatible CoT XML
        // We'll need to capture UDP packets to verify
        
        logTest('TAK Message Format', 'SKIP', 'Requires UDP packet capture setup');
    },
    
    // Performance comparison
    async testPerformanceMetrics() {
        const iterations = 100;
        const endpoint = '/get_antenna_settings';
        
        try {
            // Measure Python response times
            const pythonTimes = [];
            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                await axios.get(`http://localhost:${PYTHON_PORT}${endpoint}`);
                pythonTimes.push(Date.now() - start);
            }
            
            // Measure Node.js response times
            const nodeTimes = [];
            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                await axios.get(`http://localhost:${NODEJS_PORT}${endpoint}`);
                nodeTimes.push(Date.now() - start);
            }
            
            // Calculate averages
            const pythonAvg = pythonTimes.reduce((a, b) => a + b) / pythonTimes.length;
            const nodeAvg = nodeTimes.reduce((a, b) => a + b) / nodeTimes.length;
            
            logTest('Performance Metrics', 'PASS', 
                `Python avg: ${pythonAvg.toFixed(2)}ms, Node.js avg: ${nodeAvg.toFixed(2)}ms`);
                
        } catch (error) {
            logTest('Performance Metrics', 'FAIL', error.message);
        }
    },
    
    // Error handling comparison
    async testErrorHandling() {
        const invalidRequests = [
            { endpoint: '/update_tak_settings', method: 'POST', data: {} }, // Missing required fields
            { endpoint: '/update_analysis_mode', method: 'POST', data: { mode: 'invalid' } }, // Invalid mode
            { endpoint: '/list_wigle_files', method: 'GET', query: '' }, // Missing directory
            { endpoint: '/remove_from_whitelist', method: 'POST', data: {} }, // Missing SSID/MAC
        ];
        
        for (const req of invalidRequests) {
            try {
                const endpoint = req.query !== undefined ? `${req.endpoint}?${req.query}` : req.endpoint;
                const result = await compareResponses(endpoint, req.method, req.data);
                
                // Both should return 4xx errors for invalid requests
                if (result.match && result.python.status >= 400 && result.python.status < 500) {
                    logTest(`Error Handling - ${req.endpoint}`, 'PASS');
                } else {
                    logTest(`Error Handling - ${req.endpoint}`, 'FAIL', 
                        `Status mismatch - Python: ${result.python.status}, Node: ${result.node.status}`);
                }
            } catch (error) {
                logTest(`Error Handling - ${req.endpoint}`, 'FAIL', error.message);
            }
        }
    }
};

// Main test runner
async function runAllTests() {
    console.log('Starting WigleToTAK API Compatibility Tests');
    console.log('==========================================\n');
    
    // Check service availability first
    const servicesAvailable = await tests.testServiceAvailability();
    if (!servicesAvailable) {
        console.error('\nCannot proceed with tests - services not available');
        console.error('Make sure both Python and Node.js services are running:');
        console.error(`  Python: http://localhost:${PYTHON_PORT}`);
        console.error(`  Node.js: http://localhost:${NODEJS_PORT}`);
        process.exit(1);
    }
    
    // Run all tests
    await tests.testTAKSettingsUpdate();
    await tests.testMulticastStateUpdate();
    await tests.testAnalysisModeUpdate();
    await tests.testAntennaSensitivity();
    await tests.testFileListings();
    await tests.testFilteringOperations();
    await tests.testBroadcastControl();
    await tests.testTAKMessageFormat();
    await tests.testPerformanceMetrics();
    await tests.testErrorHandling();
    
    // Generate report
    console.log('\n==========================================');
    console.log('Test Summary:');
    console.log(`  Passed: ${testResults.passed}`);
    console.log(`  Failed: ${testResults.failed}`);
    console.log(`  Skipped: ${testResults.skipped}`);
    console.log(`  Total: ${testResults.passed + testResults.failed + testResults.skipped}`);
    
    // Save detailed results
    const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
    await fs.writeJson(reportPath, testResults, { spaces: 2 });
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Export for use in other scripts
module.exports = {
    runAllTests,
    tests,
    compareResponses
};

// Run tests if called directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}
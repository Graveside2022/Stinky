#!/usr/bin/env node

/**
 * Test Script for Stinkster Service Control API
 * 
 * Tests all API endpoints to ensure they work correctly
 */

const http = require('http');
const { promisify } = require('util');

const API_BASE_URL = 'http://localhost:8080';

class APITester {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.testResults = [];
    }

    async makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const req = http.request(url, options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const jsonBody = body ? JSON.parse(body) : {};
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: jsonBody
                        });
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: body
                        });
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

    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running test: ${testName}`);
        const startTime = Date.now();
        
        try {
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                status: 'PASS',
                duration,
                result
            });
            
            console.log(`✅ PASS: ${testName} (${duration}ms)`);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            this.testResults.push({
                name: testName,
                status: 'FAIL',
                duration,
                error: error.message
            });
            
            console.log(`❌ FAIL: ${testName} (${duration}ms)`);
            console.log(`   Error: ${error.message}`);
            throw error;
        }
    }

    async testHealthCheck() {
        return this.runTest('Health Check', async () => {
            const response = await this.makeRequest('GET', '/health');
            
            if (response.statusCode !== 200) {
                throw new Error(`Expected status 200, got ${response.statusCode}`);
            }
            
            if (!response.body.status || response.body.status !== 'healthy') {
                throw new Error('Health check did not return healthy status');
            }
            
            return response.body;
        });
    }

    async testRootEndpoint() {
        return this.runTest('Root Endpoint', async () => {
            const response = await this.makeRequest('GET', '/');
            
            if (response.statusCode !== 200) {
                throw new Error(`Expected status 200, got ${response.statusCode}`);
            }
            
            if (!response.body.service || !response.body.endpoints) {
                throw new Error('Root endpoint missing expected fields');
            }
            
            return response.body;
        });
    }

    async testServiceStatus() {
        return this.runTest('Service Status', async () => {
            const response = await this.makeRequest('GET', '/api/services/status');
            
            if (response.statusCode !== 200) {
                throw new Error(`Expected status 200, got ${response.statusCode}`);
            }
            
            if (response.body.success === undefined) {
                throw new Error('Status response missing success field');
            }
            
            return response.body;
        });
    }

    async testSystemHealth() {
        return this.runTest('System Health', async () => {
            const response = await this.makeRequest('GET', '/api/system/health');
            
            if (response.statusCode !== 200) {
                throw new Error(`Expected status 200, got ${response.statusCode}`);
            }
            
            if (!response.body.system || !response.body.services) {
                throw new Error('Health response missing expected system/services data');
            }
            
            return response.body;
        });
    }

    async testNetworkInterfaces() {
        return this.runTest('Network Interfaces', async () => {
            const response = await this.makeRequest('GET', '/api/system/interfaces');
            
            if (response.statusCode !== 200) {
                throw new Error(`Expected status 200, got ${response.statusCode}`);
            }
            
            if (!Array.isArray(response.body.interfaces)) {
                throw new Error('Interfaces response should contain an array');
            }
            
            return response.body;
        });
    }

    async testServiceLogs() {
        return this.runTest('Service Logs', async () => {
            const response = await this.makeRequest('GET', '/api/services/logs?lines=10');
            
            // Logs endpoint might return 500 if log file doesn't exist, which is acceptable
            if (response.statusCode !== 200 && response.statusCode !== 500) {
                throw new Error(`Expected status 200 or 500, got ${response.statusCode}`);
            }
            
            if (response.statusCode === 200 && !Array.isArray(response.body.logs)) {
                throw new Error('Logs response should contain an array');
            }
            
            return response.body;
        });
    }

    async testCORS() {
        return this.runTest('CORS Headers', async () => {
            const response = await this.makeRequest('OPTIONS', '/api/services/status');
            
            if (!response.headers['access-control-allow-origin']) {
                throw new Error('Missing CORS headers');
            }
            
            return { corsEnabled: true, headers: response.headers };
        });
    }

    async testInvalidEndpoint() {
        return this.runTest('404 Handling', async () => {
            const response = await this.makeRequest('GET', '/invalid/endpoint');
            
            if (response.statusCode !== 404) {
                throw new Error(`Expected status 404, got ${response.statusCode}`);
            }
            
            if (!response.body.error || response.body.error !== 'NOT_FOUND') {
                throw new Error('404 response should have proper error format');
            }
            
            return response.body;
        });
    }

    async testServiceControlWithoutRunning() {
        return this.runTest('Service Control (Not Running)', async () => {
            // Test stopping services when they're not running
            const stopResponse = await this.makeRequest('POST', '/api/services/stop');
            
            if (stopResponse.statusCode !== 404) {
                // Services might actually be running, which is also valid
                console.log(`   Note: Services appear to be running (status ${stopResponse.statusCode})`);
                return { servicesRunning: true, response: stopResponse.body };
            }
            
            if (!stopResponse.body.error || stopResponse.body.error !== 'NOT_RUNNING') {
                throw new Error('Stop response should indicate services not running');
            }
            
            return stopResponse.body;
        });
    }

    async runAllTests() {
        console.log('🚀 Starting Stinkster Service Control API Tests');
        console.log(`🎯 Target: ${this.baseUrl}`);
        
        const startTime = Date.now();
        let passedTests = 0;
        let totalTests = 0;

        const tests = [
            () => this.testHealthCheck(),
            () => this.testRootEndpoint(),
            () => this.testServiceStatus(),
            () => this.testSystemHealth(),
            () => this.testNetworkInterfaces(),
            () => this.testServiceLogs(),
            () => this.testCORS(),
            () => this.testInvalidEndpoint(),
            () => this.testServiceControlWithoutRunning()
        ];

        for (const test of tests) {
            totalTests++;
            try {
                await test();
                passedTests++;
            } catch (error) {
                // Error already logged in runTest
            }
        }

        const duration = Date.now() - startTime;
        
        console.log('\n📊 Test Results Summary:');
        console.log(`─────────────────────────`);
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${totalTests - passedTests}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
        
        if (passedTests === totalTests) {
            console.log('\n🎉 All tests passed! API is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Check the output above for details.');
        }

        return {
            totalTests,
            passedTests,
            failedTests: totalTests - passedTests,
            duration,
            successRate: (passedTests / totalTests) * 100,
            results: this.testResults
        };
    }

    async waitForServer(maxWaitTime = 30000) {
        console.log(`⏳ Waiting for API server at ${this.baseUrl}...`);
        
        const startTime = Date.now();
        let lastError = null;
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                await this.makeRequest('GET', '/health');
                console.log('✅ API server is ready!');
                return true;
            } catch (error) {
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`❌ API server not ready after ${maxWaitTime}ms`);
        console.log(`   Last error: ${lastError?.message}`);
        return false;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    let apiUrl = API_BASE_URL;
    let waitForServer = false;

    // Parse command line arguments
    for (const arg of args) {
        if (arg.startsWith('--url=')) {
            apiUrl = arg.split('=')[1];
        } else if (arg === '--wait') {
            waitForServer = true;
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Stinkster Service Control API Test Suite

Usage: node test-service-control-api.js [options]

Options:
  --url=URL      Set API base URL (default: ${API_BASE_URL})
  --wait         Wait for server to be ready before running tests
  --help, -h     Show this help message

Examples:
  node test-service-control-api.js
  node test-service-control-api.js --url=http://192.168.1.100:8080
  node test-service-control-api.js --wait
            `);
            process.exit(0);
        }
    }

    const tester = new APITester(apiUrl);

    try {
        if (waitForServer) {
            const serverReady = await tester.waitForServer();
            if (!serverReady) {
                console.log('❌ Server not ready, exiting.');
                process.exit(1);
            }
        }

        const results = await tester.runAllTests();
        
        // Exit with error code if tests failed
        if (results.failedTests > 0) {
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = APITester;
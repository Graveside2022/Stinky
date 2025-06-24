/**
 * Webhook Integration Test
 * 
 * Tests all webhook endpoints and validates production readiness
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

class WebhookIntegrationTest {
    constructor(baseUrl = 'http://localhost:8092') {
        this.baseUrl = baseUrl;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Webhook Integration Tests...\n');
        console.log(`Base URL: ${this.baseUrl}`);
        console.log('=' .repeat(60));

        // Check service is running
        if (!await this.checkServiceRunning()) {
            console.error('❌ Service is not running at', this.baseUrl);
            return false;
        }

        // Run test suites
        await this.testHealthEndpoint();
        await this.testScriptManagement();
        await this.testSystemInfo();
        await this.testKismetData();
        await this.testWebSocketEvents();
        await this.testErrorHandling();
        await this.testRateLimiting();
        await this.testCaching();
        await this.testSecurity();

        // Print summary
        this.printSummary();
        
        return this.results.failed === 0;
    }

    async checkServiceRunning() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/webhook/health`);
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async testHealthEndpoint() {
        console.log('\n📋 Testing Health Endpoint...');
        
        await this.test('GET /api/webhook/health', async () => {
            const response = await axios.get(`${this.baseUrl}/api/webhook/health`);
            
            this.assert(response.status === 200, 'Status should be 200');
            this.assert(response.data.success === true, 'Success should be true');
            this.assert(response.data.service === 'webhook', 'Service should be webhook');
            this.assert(response.data.checks !== undefined, 'Should have health checks');
            
            return response.data;
        });
    }

    async testScriptManagement() {
        console.log('\n🔧 Testing Script Management...');
        
        // Test script status
        await this.test('GET /api/webhook/script-status', async () => {
            const response = await axios.get(`${this.baseUrl}/api/webhook/script-status`);
            
            this.assert(response.status === 200, 'Status should be 200');
            this.assert(response.data.success === true, 'Success should be true');
            this.assert(response.data.status !== undefined, 'Should have status object');
            
            return response.data;
        });

        // Test starting a script
        await this.test('POST /api/webhook/run-script', async () => {
            const response = await axios.post(`${this.baseUrl}/api/webhook/run-script`, {
                script: 'kismet',
                options: {
                    interface: 'wlan0'
                }
            });
            
            if (response.status === 409) {
                // Already running
                this.assert(response.data.error === 'ALREADY_RUNNING', 'Should indicate already running');
                return response.data;
            }
            
            this.assert(response.status === 200, 'Status should be 200');
            this.assert(response.data.success === true, 'Success should be true');
            this.assert(response.data.pid !== undefined, 'Should have PID');
            
            // Store PID for cleanup
            this.kismetPid = response.data.pid;
            
            return response.data;
        });

        // Test invalid script name
        await this.test('POST /api/webhook/run-script (invalid)', async () => {
            try {
                await axios.post(`${this.baseUrl}/api/webhook/run-script`, {
                    script: 'invalid_script'
                });
                throw new Error('Should have failed');
            } catch (error) {
                this.assert(error.response.status === 400, 'Status should be 400');
                this.assert(error.response.data.error.code === 'VALIDATION_ERROR', 'Should be validation error');
                return error.response.data;
            }
        });

        // Test stopping a script
        if (this.kismetPid) {
            await this.test('POST /api/webhook/stop-script', async () => {
                const response = await axios.post(`${this.baseUrl}/api/webhook/stop-script`, {
                    script: 'kismet'
                });
                
                this.assert(response.status === 200, 'Status should be 200');
                this.assert(response.data.success === true, 'Success should be true');
                
                return response.data;
            });
        }
    }

    async testSystemInfo() {
        console.log('\n💻 Testing System Info...');
        
        await this.test('GET /api/webhook/info', async () => {
            const response = await axios.get(`${this.baseUrl}/api/webhook/info`);
            
            this.assert(response.status === 200, 'Status should be 200');
            this.assert(response.data.success === true, 'Success should be true');
            this.assert(response.data.system !== undefined, 'Should have system info');
            this.assert(response.data.services !== undefined, 'Should have services info');
            this.assert(response.data.network !== undefined, 'Should have network info');
            
            // Validate system info
            const system = response.data.system;
            this.assert(system.hostname !== undefined, 'Should have hostname');
            this.assert(system.platform !== undefined, 'Should have platform');
            this.assert(system.uptime > 0, 'Uptime should be positive');
            this.assert(Array.isArray(system.loadAverage), 'Load average should be array');
            
            return response.data;
        });
    }

    async testKismetData() {
        console.log('\n📡 Testing Kismet Data...');
        
        await this.test('GET /api/webhook/kismet-data', async () => {
            try {
                const response = await axios.get(`${this.baseUrl}/api/webhook/kismet-data`);
                
                if (response.status === 503) {
                    // Kismet not running
                    this.assert(response.data.error === 'KISMET_UNAVAILABLE', 'Should indicate Kismet unavailable');
                    return response.data;
                }
                
                this.assert(response.status === 200, 'Status should be 200');
                this.assert(response.data.success === true, 'Success should be true');
                this.assert(response.data.data !== undefined, 'Should have data object');
                
                return response.data;
            } catch (error) {
                if (error.response?.status === 503) {
                    this.assert(error.response.data.error === 'KISMET_UNAVAILABLE', 'Should indicate Kismet unavailable');
                    return error.response.data;
                }
                throw error;
            }
        });

        // Test with parameters
        await this.test('GET /api/webhook/kismet-data?type=devices&limit=10', async () => {
            try {
                const response = await axios.get(`${this.baseUrl}/api/webhook/kismet-data`, {
                    params: {
                        type: 'devices',
                        limit: 10
                    }
                });
                
                if (response.status === 200) {
                    this.assert(response.data.success === true, 'Success should be true');
                }
                
                return response.data;
            } catch (error) {
                if (error.response?.status === 503) {
                    return error.response.data;
                }
                throw error;
            }
        });
    }

    async testWebSocketEvents() {
        console.log('\n🔌 Testing WebSocket Events...');
        
        await this.test('WebSocket Connection', async () => {
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(`ws://localhost:8092/webhook`);
                
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket connection timeout'));
                }, 5000);
                
                ws.on('open', () => {
                    clearTimeout(timeout);
                    this.assert(true, 'WebSocket connected');
                });
                
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'connected') {
                        this.assert(message.clientId !== undefined, 'Should have client ID');
                        this.assert(Array.isArray(message.availableChannels), 'Should have available channels');
                        ws.close();
                        resolve(message);
                    }
                });
                
                ws.on('error', reject);
            });
        });

        await this.test('WebSocket Subscription', async () => {
            return new Promise((resolve, reject) => {
                const ws = new WebSocket(`ws://localhost:8092/webhook`);
                
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket subscription timeout'));
                }, 5000);
                
                ws.on('open', () => {
                    ws.send(JSON.stringify({
                        event: 'subscribe',
                        data: { channels: ['status'] }
                    }));
                });
                
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'subscribed') {
                        clearTimeout(timeout);
                        this.assert(message.channels.includes('status'), 'Should be subscribed to status');
                        ws.close();
                        resolve(message);
                    }
                });
                
                ws.on('error', reject);
            });
        });
    }

    async testErrorHandling() {
        console.log('\n⚠️ Testing Error Handling...');
        
        // Test missing required fields
        await this.test('POST /api/webhook/run-script (missing fields)', async () => {
            try {
                await axios.post(`${this.baseUrl}/api/webhook/run-script`, {});
                throw new Error('Should have failed');
            } catch (error) {
                this.assert(error.response.status === 400, 'Status should be 400');
                this.assert(error.response.data.error !== undefined, 'Should have error object');
                return error.response.data;
            }
        });

        // Test invalid JSON
        await this.test('POST with invalid JSON', async () => {
            try {
                await axios.post(`${this.baseUrl}/api/webhook/run-script`, 
                    '{"invalid json',
                    { headers: { 'Content-Type': 'application/json' } }
                );
                throw new Error('Should have failed');
            } catch (error) {
                this.assert(error.response.status === 400, 'Status should be 400');
                return error.response.data;
            }
        });
    }

    async testRateLimiting() {
        console.log('\n🚦 Testing Rate Limiting...');
        
        await this.test('Rate limiting (100 requests)', async () => {
            const promises = [];
            for (let i = 0; i < 110; i++) {
                promises.push(
                    axios.get(`${this.baseUrl}/api/webhook/script-status`)
                        .catch(err => err.response)
                );
            }
            
            const responses = await Promise.all(promises);
            const rateLimited = responses.filter(r => r.status === 429);
            
            this.assert(rateLimited.length > 0, 'Should have rate limited responses');
            this.assert(rateLimited[0].data.error === 'RATE_LIMIT_EXCEEDED', 'Should indicate rate limit');
            
            return {
                total: responses.length,
                rateLimited: rateLimited.length
            };
        });
    }

    async testCaching() {
        console.log('\n💾 Testing Caching...');
        
        await this.test('Response caching', async () => {
            // First request
            const start1 = Date.now();
            const response1 = await axios.get(`${this.baseUrl}/api/webhook/info`);
            const duration1 = Date.now() - start1;
            
            // Second request (should be cached)
            const start2 = Date.now();
            const response2 = await axios.get(`${this.baseUrl}/api/webhook/info`);
            const duration2 = Date.now() - start2;
            
            this.assert(response1.status === 200, 'First request should succeed');
            this.assert(response2.status === 200, 'Second request should succeed');
            this.assert(duration2 < duration1, 'Cached request should be faster');
            
            return {
                firstDuration: duration1,
                cachedDuration: duration2,
                speedup: Math.round((duration1 / duration2) * 100) / 100
            };
        });
    }

    async testSecurity() {
        console.log('\n🔒 Testing Security...');
        
        // Test path traversal protection
        await this.test('Path traversal protection', async () => {
            try {
                await axios.post(`${this.baseUrl}/api/webhook/run-script`, {
                    script: '../../../etc/passwd'
                });
                throw new Error('Should have failed');
            } catch (error) {
                this.assert(error.response.status === 400, 'Status should be 400');
                return error.response.data;
            }
        });

        // Test large payload rejection
        await this.test('Large payload rejection', async () => {
            try {
                const largePayload = {
                    script: 'kismet',
                    options: {
                        data: 'x'.repeat(2 * 1024 * 1024) // 2MB
                    }
                };
                
                await axios.post(`${this.baseUrl}/api/webhook/run-script`, largePayload);
                throw new Error('Should have failed');
            } catch (error) {
                this.assert(
                    error.response.status === 413 || error.code === 'ECONNRESET',
                    'Should reject large payload'
                );
                return { rejected: true };
            }
        });
    }

    // Helper methods

    async test(name, fn) {
        process.stdout.write(`  ${name}... `);
        
        try {
            const result = await fn();
            console.log('✅');
            this.results.passed++;
            this.results.tests.push({
                name,
                passed: true,
                result
            });
        } catch (error) {
            console.log('❌');
            console.error(`    Error: ${error.message}`);
            this.results.failed++;
            this.results.tests.push({
                name,
                passed: false,
                error: error.message
            });
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    printSummary() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 Test Summary:');
        console.log('=' .repeat(60));
        console.log(`Total Tests: ${this.results.passed + this.results.failed}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
        
        if (this.results.failed > 0) {
            console.log('\nFailed Tests:');
            this.results.tests.filter(t => !t.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.error}`);
            });
        }
        
        console.log('\n' + (this.results.failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed'));
    }
}

// Run tests if executed directly
if (require.main === module) {
    const baseUrl = process.argv[2] || 'http://localhost:8092';
    const tester = new WebhookIntegrationTest(baseUrl);
    
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}

module.exports = WebhookIntegrationTest;
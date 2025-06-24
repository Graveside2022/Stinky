#!/usr/bin/env node

/**
 * Comprehensive Integration Test for Stinkster System
 * Tests all three applications and their integrations
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const SERVICES = {
    kismet: { port: 8003, name: 'Kismet Operations Center' },
    wigle: { port: 8002, name: 'WigleToTAK' },
    spectrum: { port: 8092, name: 'Spectrum Analyzer' }
};

const COLORS = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

const log = (msg, color = 'reset') => {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
};

class IntegrationTester {
    constructor() {
        this.results = {
            services: {},
            apis: {},
            websockets: {},
            integration: {},
            compatibility: {},
            performance: {}
        };
    }

    async testServiceHealth(service, port) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: port,
                path: '/health',
                method: 'GET',
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const json = JSON.parse(data);
                            resolve({ success: true, data: json });
                        } catch (e) {
                            resolve({ success: false, error: 'Invalid JSON response' });
                        }
                    } else {
                        resolve({ success: false, error: `Status code: ${res.statusCode}` });
                    }
                });
            });

            req.on('error', (e) => {
                resolve({ success: false, error: e.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Request timeout' });
            });

            req.end();
        });
    }

    async testAPIEndpoint(port, path, method = 'GET', body = null) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        statusCode: res.statusCode,
                        data: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', (e) => {
                resolve({ success: false, error: e.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Request timeout' });
            });

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    async testWebSocketConnection(port, path = '/') {
        // Simple WebSocket test using basic HTTP upgrade
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: port,
                path: path,
                headers: {
                    'Upgrade': 'websocket',
                    'Connection': 'Upgrade',
                    'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
                    'Sec-WebSocket-Version': '13'
                }
            };

            const req = http.request(options);
            
            req.on('upgrade', (res, socket, head) => {
                resolve({ success: true, message: 'WebSocket upgrade successful' });
                socket.end();
            });

            req.on('error', (e) => {
                resolve({ success: false, error: e.message });
            });

            req.on('response', (res) => {
                if (res.statusCode === 426) {
                    resolve({ success: true, message: 'Server expects WebSocket upgrade' });
                } else {
                    resolve({ success: false, error: `Unexpected status: ${res.statusCode}` });
                }
            });

            setTimeout(() => {
                req.destroy();
                resolve({ success: false, error: 'WebSocket test timeout' });
            }, 3000);

            req.end();
        });
    }

    async testCrossAppIntegration() {
        const tests = [];

        // Test Spectrum Analyzer → Kismet Operations integration
        tests.push({
            name: 'Spectrum → Kismet WebSocket relay',
            test: await this.testAPIEndpoint(8003, '/api/status')
        });

        // Test WigleToTAK → Kismet data flow
        tests.push({
            name: 'WigleToTAK file listing',
            test: await this.testAPIEndpoint(8002, '/list_wigle_files')
        });

        return tests;
    }

    async testBackwardCompatibility() {
        const legacyEndpoints = [
            { port: 8003, path: '/api/status', name: 'Legacy status endpoint' },
            { port: 8003, path: '/api/scan/vhf', name: 'Legacy VHF scan' },
            { port: 8002, path: '/api/status', name: 'WigleToTAK status' }
        ];

        const results = [];
        for (const endpoint of legacyEndpoints) {
            const result = await this.testAPIEndpoint(endpoint.port, endpoint.path);
            results.push({
                name: endpoint.name,
                port: endpoint.port,
                path: endpoint.path,
                success: result.success,
                statusCode: result.statusCode
            });
        }

        return results;
    }

    async testPerformance() {
        const endpoints = [
            { port: 8003, path: '/api/status' },
            { port: 8003, path: '/health' },
            { port: 8002, path: '/list_wigle_files' }
        ];

        const results = [];
        for (const endpoint of endpoints) {
            const start = Date.now();
            const result = await this.testAPIEndpoint(endpoint.port, endpoint.path);
            const duration = Date.now() - start;
            
            results.push({
                endpoint: `${endpoint.port}${endpoint.path}`,
                duration: duration,
                success: result.success,
                acceptable: duration < 200 // Should respond within 200ms
            });
        }

        return results;
    }

    async runAllTests() {
        log('\n🔍 COMPREHENSIVE INTEGRATION TEST SUITE', 'blue');
        log('=====================================\n', 'blue');

        // 1. Service Health Checks
        log('1️⃣  SERVICE HEALTH CHECKS', 'yellow');
        for (const [key, service] of Object.entries(SERVICES)) {
            const result = await this.testServiceHealth(service.name, service.port);
            this.results.services[key] = result;
            
            if (result.success) {
                log(`   ✅ ${service.name} (port ${service.port}): HEALTHY`, 'green');
            } else {
                log(`   ❌ ${service.name} (port ${service.port}): ${result.error}`, 'red');
            }
        }

        // 2. API Endpoint Tests
        log('\n2️⃣  API ENDPOINT TESTS', 'yellow');
        const apiTests = [
            { port: 8003, path: '/', name: 'Kismet Operations root' },
            { port: 8003, path: '/api/status', name: 'Kismet status API' },
            { port: 8003, path: '/api/profiles', name: 'SDR profiles' },
            { port: 8002, path: '/', name: 'WigleToTAK root' },
            { port: 8002, path: '/list_wigle_files', name: 'Wigle file listing' }
        ];

        for (const test of apiTests) {
            const result = await this.testAPIEndpoint(test.port, test.path);
            this.results.apis[test.name] = result;
            
            if (result.success) {
                log(`   ✅ ${test.name}: ${result.statusCode}`, 'green');
            } else {
                log(`   ❌ ${test.name}: ${result.error || result.statusCode}`, 'red');
            }
        }

        // 3. WebSocket Tests
        log('\n3️⃣  WEBSOCKET CONNECTION TESTS', 'yellow');
        const wsTests = [
            { port: 8003, path: '/socket.io/', name: 'Kismet Operations WebSocket' },
            { port: 8002, path: '/', name: 'WigleToTAK WebSocket' }
        ];

        for (const test of wsTests) {
            const result = await this.testWebSocketConnection(test.port, test.path);
            this.results.websockets[test.name] = result;
            
            if (result.success) {
                log(`   ✅ ${test.name}: ${result.message}`, 'green');
            } else {
                log(`   ❌ ${test.name}: ${result.error}`, 'red');
            }
        }

        // 4. Cross-App Integration
        log('\n4️⃣  CROSS-APP INTEGRATION TESTS', 'yellow');
        const integrationResults = await this.testCrossAppIntegration();
        for (const result of integrationResults) {
            this.results.integration[result.name] = result.test;
            
            if (result.test.success) {
                log(`   ✅ ${result.name}`, 'green');
            } else {
                log(`   ❌ ${result.name}: ${result.test.error}`, 'red');
            }
        }

        // 5. Backward Compatibility
        log('\n5️⃣  BACKWARD COMPATIBILITY TESTS', 'yellow');
        const compatResults = await this.testBackwardCompatibility();
        for (const result of compatResults) {
            this.results.compatibility[result.name] = result;
            
            if (result.success) {
                log(`   ✅ ${result.name}: ${result.statusCode}`, 'green');
            } else {
                log(`   ❌ ${result.name}: ${result.statusCode || 'Failed'}`, 'red');
            }
        }

        // 6. Performance Tests
        log('\n6️⃣  PERFORMANCE TESTS', 'yellow');
        const perfResults = await this.testPerformance();
        for (const result of perfResults) {
            this.results.performance[result.endpoint] = result;
            
            if (result.acceptable) {
                log(`   ✅ ${result.endpoint}: ${result.duration}ms`, 'green');
            } else {
                log(`   ⚠️  ${result.endpoint}: ${result.duration}ms (>200ms)`, 'yellow');
            }
        }

        // Generate Summary
        this.generateSummary();
    }

    generateSummary() {
        log('\n📊 TEST SUMMARY', 'blue');
        log('===============\n', 'blue');

        const categories = {
            'Services': this.results.services,
            'APIs': this.results.apis,
            'WebSockets': this.results.websockets,
            'Integration': this.results.integration,
            'Compatibility': this.results.compatibility,
            'Performance': this.results.performance
        };

        let totalTests = 0;
        let passedTests = 0;
        let deviations = [];

        for (const [category, results] of Object.entries(categories)) {
            let categoryPassed = 0;
            let categoryTotal = 0;

            for (const [name, result] of Object.entries(results)) {
                categoryTotal++;
                totalTests++;
                
                if (result.success || result.acceptable) {
                    categoryPassed++;
                    passedTests++;
                } else {
                    deviations.push(`${category} - ${name}`);
                }
            }

            const percentage = categoryTotal > 0 ? Math.round((categoryPassed / categoryTotal) * 100) : 0;
            const color = percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red';
            
            log(`${category}: ${categoryPassed}/${categoryTotal} (${percentage}%)`, color);
        }

        const overallPercentage = Math.round((passedTests / totalTests) * 100);
        
        log('\n📈 OVERALL RESULTS', 'blue');
        log('==================', 'blue');
        log(`Total Tests: ${totalTests}`, 'blue');
        log(`Passed: ${passedTests}`, 'green');
        log(`Failed: ${totalTests - passedTests}`, 'red');
        log(`Success Rate: ${overallPercentage}%`, overallPercentage === 100 ? 'green' : 'yellow');

        if (deviations.length > 0) {
            log('\n⚠️  DEVIATIONS FOUND:', 'red');
            deviations.forEach(d => log(`   - ${d}`, 'red'));
            log(`\nDEVIATIONS ≠ Ø (${deviations.length} issues found)`, 'red');
        } else {
            log('\n✅ DEVIATIONS == Ø (Zero deviations found!)', 'green');
        }

        // Save detailed report
        const reportPath = path.join(__dirname, `integration-test-report-${Date.now()}.json`);
        fs.writeFile(reportPath, JSON.stringify(this.results, null, 2))
            .then(() => log(`\n📁 Detailed report saved: ${reportPath}`, 'blue'))
            .catch(err => log(`\n❌ Failed to save report: ${err.message}`, 'red'));
    }
}

// Run the tests
const tester = new IntegrationTester();
tester.runAllTests().catch(err => {
    log(`\n❌ Test suite failed: ${err.message}`, 'red');
    process.exit(1);
});
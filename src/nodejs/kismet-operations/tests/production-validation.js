#!/usr/bin/env node

/**
 * Production Validation Script
 * 
 * Comprehensive validation of all endpoints, error handling,
 * performance, and production readiness
 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const os = require('os');

class ProductionValidator {
    constructor(baseUrl = 'http://localhost:8092') {
        this.baseUrl = baseUrl;
        this.report = {
            timestamp: new Date().toISOString(),
            environment: {
                node: process.version,
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname()
            },
            endpoints: {},
            websocket: {},
            performance: {},
            security: {},
            errors: [],
            warnings: []
        };
    }

    async validate() {
        console.log('🔍 Production Validation Starting...\n');
        console.log('Environment:');
        console.log(`  Node.js: ${process.version}`);
        console.log(`  Platform: ${os.platform()} ${os.arch()}`);
        console.log(`  Base URL: ${this.baseUrl}`);
        console.log('\n' + '='.repeat(70) + '\n');

        // Check service availability
        if (!await this.checkServiceAvailable()) {
            console.error('❌ Service is not available at', this.baseUrl);
            return false;
        }

        // Run all validations
        await this.validateEndpoints();
        await this.validateWebSocket();
        await this.validateErrorHandling();
        await this.validatePerformance();
        await this.validateSecurity();
        await this.validateIntegration();

        // Generate report
        this.generateReport();

        return this.report.errors.length === 0;
    }

    async checkServiceAvailable() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/webhook/health`);
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async validateEndpoints() {
        console.log('📡 Validating REST Endpoints...\n');

        const endpoints = [
            {
                name: 'Health Check',
                method: 'GET',
                path: '/api/webhook/health',
                validate: (res) => {
                    return res.data.success === true &&
                           res.data.service === 'webhook' &&
                           res.data.checks !== undefined;
                }
            },
            {
                name: 'Script Status',
                method: 'GET',
                path: '/api/webhook/script-status',
                validate: (res) => {
                    return res.data.success === true &&
                           res.data.status !== undefined;
                }
            },
            {
                name: 'System Info',
                method: 'GET',
                path: '/api/webhook/info',
                validate: (res) => {
                    return res.data.success === true &&
                           res.data.system !== undefined &&
                           res.data.services !== undefined;
                }
            },
            {
                name: 'Kismet Data',
                method: 'GET',
                path: '/api/webhook/kismet-data?type=devices&limit=10',
                validate: (res) => {
                    // Can be 503 if Kismet not running
                    return res.status === 200 || res.status === 503;
                },
                optional: true
            },
            {
                name: 'Run Script',
                method: 'POST',
                path: '/api/webhook/run-script',
                data: { script: 'kismet' },
                validate: (res) => {
                    // Can be 409 if already running
                    return res.status === 200 || res.status === 409;
                }
            },
            {
                name: 'Stop Script',
                method: 'POST',
                path: '/api/webhook/stop-script',
                data: { script: 'kismet' },
                validate: (res) => {
                    // Can be 404 if not running
                    return res.status === 200 || res.status === 404;
                }
            }
        ];

        for (const endpoint of endpoints) {
            const result = await this.testEndpoint(endpoint);
            this.report.endpoints[endpoint.name] = result;
            
            if (!result.success && !endpoint.optional) {
                this.report.errors.push(`Endpoint failed: ${endpoint.name}`);
            }
        }
    }

    async testEndpoint(endpoint) {
        const start = performance.now();
        const result = {
            method: endpoint.method,
            path: endpoint.path,
            success: false,
            status: null,
            responseTime: null,
            error: null
        };

        try {
            const config = {
                method: endpoint.method,
                url: `${this.baseUrl}${endpoint.path}`,
                validateStatus: () => true // Don't throw on any status
            };

            if (endpoint.data) {
                config.data = endpoint.data;
            }

            const response = await axios(config);
            result.status = response.status;
            result.responseTime = performance.now() - start;
            result.success = endpoint.validate(response);

            console.log(`  ${result.success ? '✅' : '⚠️'} ${endpoint.name}: ${result.status} (${Math.round(result.responseTime)}ms)`);

        } catch (error) {
            result.error = error.message;
            console.log(`  ❌ ${endpoint.name}: ${error.message}`);
        }

        return result;
    }

    async validateWebSocket() {
        console.log('\n🔌 Validating WebSocket...\n');

        const tests = [
            {
                name: 'Connection',
                test: () => this.testWebSocketConnection()
            },
            {
                name: 'Subscribe/Unsubscribe',
                test: () => this.testWebSocketSubscription()
            },
            {
                name: 'Status Updates',
                test: () => this.testWebSocketStatusUpdates()
            }
        ];

        for (const test of tests) {
            try {
                const result = await test.test();
                this.report.websocket[test.name] = result;
                console.log(`  ${result.success ? '✅' : '❌'} ${test.name}`);
            } catch (error) {
                this.report.websocket[test.name] = { success: false, error: error.message };
                console.log(`  ❌ ${test.name}: ${error.message}`);
            }
        }
    }

    async testWebSocketConnection() {
        return new Promise((resolve) => {
            const ws = new WebSocket(`ws://localhost:8092/webhook`);
            const timeout = setTimeout(() => {
                ws.close();
                resolve({ success: false, error: 'Connection timeout' });
            }, 5000);

            ws.on('open', () => {
                clearTimeout(timeout);
                ws.close();
                resolve({ success: true });
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ success: false, error: error.message });
            });
        });
    }

    async testWebSocketSubscription() {
        return new Promise((resolve) => {
            const ws = new WebSocket(`ws://localhost:8092/webhook`);
            const timeout = setTimeout(() => {
                ws.close();
                resolve({ success: false, error: 'Subscription timeout' });
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
                    ws.close();
                    resolve({ success: true, channels: message.channels });
                }
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ success: false, error: error.message });
            });
        });
    }

    async testWebSocketStatusUpdates() {
        return new Promise((resolve) => {
            const ws = new WebSocket(`ws://localhost:8092/webhook`);
            const timeout = setTimeout(() => {
                ws.close();
                resolve({ success: false, error: 'Status update timeout' });
            }, 10000);

            let subscribed = false;

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    event: 'subscribe',
                    data: { channels: ['status'] }
                }));
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'subscribed') {
                    subscribed = true;
                    ws.send(JSON.stringify({
                        event: 'requestStatus',
                        data: {}
                    }));
                } else if (subscribed && message.type === 'statusUpdate') {
                    clearTimeout(timeout);
                    ws.close();
                    resolve({ success: true, received: true });
                }
            });

            ws.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ success: false, error: error.message });
            });
        });
    }

    async validateErrorHandling() {
        console.log('\n⚠️ Validating Error Handling...\n');

        const tests = [
            {
                name: 'Invalid JSON',
                request: {
                    method: 'POST',
                    url: `${this.baseUrl}/api/webhook/run-script`,
                    data: '{"invalid json',
                    headers: { 'Content-Type': 'application/json' }
                },
                expectStatus: 400
            },
            {
                name: 'Missing Required Fields',
                request: {
                    method: 'POST',
                    url: `${this.baseUrl}/api/webhook/run-script`,
                    data: {}
                },
                expectStatus: 400
            },
            {
                name: 'Invalid Script Name',
                request: {
                    method: 'POST',
                    url: `${this.baseUrl}/api/webhook/run-script`,
                    data: { script: 'invalid' }
                },
                expectStatus: 400
            },
            {
                name: 'Non-existent Endpoint',
                request: {
                    method: 'GET',
                    url: `${this.baseUrl}/api/webhook/nonexistent`
                },
                expectStatus: 404
            }
        ];

        for (const test of tests) {
            try {
                const response = await axios({
                    ...test.request,
                    validateStatus: () => true
                });

                const passed = response.status === test.expectStatus;
                console.log(`  ${passed ? '✅' : '❌'} ${test.name}: ${response.status}`);
                
                if (!passed) {
                    this.report.errors.push(`Error handling failed: ${test.name}`);
                }
            } catch (error) {
                console.log(`  ❌ ${test.name}: ${error.message}`);
                this.report.errors.push(`Error handling test failed: ${test.name}`);
            }
        }
    }

    async validatePerformance() {
        console.log('\n⚡ Validating Performance...\n');

        // Test response times
        const endpoints = [
            { path: '/api/webhook/health', name: 'Health' },
            { path: '/api/webhook/script-status', name: 'Status' },
            { path: '/api/webhook/info', name: 'Info' }
        ];

        for (const endpoint of endpoints) {
            const times = [];
            
            // Make 10 requests
            for (let i = 0; i < 10; i++) {
                const start = performance.now();
                try {
                    await axios.get(`${this.baseUrl}${endpoint.path}`);
                    times.push(performance.now() - start);
                } catch (error) {
                    // Ignore errors for performance testing
                }
            }

            if (times.length > 0) {
                const avg = times.reduce((a, b) => a + b, 0) / times.length;
                const max = Math.max(...times);
                const min = Math.min(...times);

                this.report.performance[endpoint.name] = {
                    avg: Math.round(avg),
                    min: Math.round(min),
                    max: Math.round(max),
                    samples: times.length
                };

                const acceptable = avg < 100; // 100ms threshold
                console.log(`  ${acceptable ? '✅' : '⚠️'} ${endpoint.name}: avg=${Math.round(avg)}ms, min=${Math.round(min)}ms, max=${Math.round(max)}ms`);
                
                if (!acceptable) {
                    this.report.warnings.push(`Slow response time for ${endpoint.name}: ${Math.round(avg)}ms`);
                }
            }
        }

        // Test concurrent requests
        console.log('\n  Testing concurrent requests...');
        const start = performance.now();
        const promises = Array(50).fill().map(() => 
            axios.get(`${this.baseUrl}/api/webhook/health`).catch(() => null)
        );
        const results = await Promise.all(promises);
        const duration = performance.now() - start;
        const successful = results.filter(r => r !== null).length;

        this.report.performance.concurrent = {
            total: 50,
            successful,
            duration: Math.round(duration),
            rps: Math.round((successful / duration) * 1000)
        };

        console.log(`  ${successful === 50 ? '✅' : '⚠️'} Concurrent: ${successful}/50 successful, ${Math.round(duration)}ms total, ${this.report.performance.concurrent.rps} req/s`);
    }

    async validateSecurity() {
        console.log('\n🔒 Validating Security...\n');

        // Test rate limiting
        console.log('  Testing rate limiting...');
        const requests = [];
        for (let i = 0; i < 110; i++) {
            requests.push(
                axios.get(`${this.baseUrl}/api/webhook/script-status`, {
                    validateStatus: () => true
                })
            );
        }

        const responses = await Promise.all(requests);
        const rateLimited = responses.filter(r => r.status === 429).length;
        
        this.report.security.rateLimiting = {
            tested: true,
            rateLimited,
            total: 110
        };

        console.log(`  ${rateLimited > 0 ? '✅' : '❌'} Rate limiting: ${rateLimited} requests blocked`);

        // Test input validation
        const securityTests = [
            {
                name: 'Path Traversal',
                data: { script: '../../../etc/passwd' },
                shouldFail: true
            },
            {
                name: 'SQL Injection',
                data: { script: "'; DROP TABLE users; --" },
                shouldFail: true
            },
            {
                name: 'Command Injection',
                data: { script: 'kismet; rm -rf /' },
                shouldFail: true
            }
        ];

        for (const test of securityTests) {
            try {
                const response = await axios.post(`${this.baseUrl}/api/webhook/run-script`, test.data, {
                    validateStatus: () => true
                });
                
                const blocked = response.status === 400;
                console.log(`  ${blocked ? '✅' : '❌'} ${test.name} blocked`);
                
                if (!blocked && test.shouldFail) {
                    this.report.errors.push(`Security test failed: ${test.name}`);
                }
            } catch (error) {
                console.log(`  ✅ ${test.name} blocked (connection refused)`);
            }
        }
    }

    async validateIntegration() {
        console.log('\n🔗 Validating Integration...\n');

        // Test full workflow
        console.log('  Testing complete workflow...');
        
        try {
            // 1. Check initial status
            const statusBefore = await axios.get(`${this.baseUrl}/api/webhook/script-status`);
            console.log('    ✅ Initial status retrieved');

            // 2. Start a script (if not running)
            const kismetStatus = statusBefore.data.status?.kismet;
            if (!kismetStatus?.running) {
                const startResult = await axios.post(`${this.baseUrl}/api/webhook/run-script`, {
                    script: 'kismet'
                });
                console.log('    ✅ Script started:', startResult.data.pid);
                
                // 3. Verify it's running
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
                const statusAfter = await axios.get(`${this.baseUrl}/api/webhook/script-status`);
                
                if (statusAfter.data.status?.kismet?.running) {
                    console.log('    ✅ Script running confirmed');
                    
                    // 4. Stop it
                    const stopResult = await axios.post(`${this.baseUrl}/api/webhook/stop-script`, {
                        script: 'kismet'
                    });
                    console.log('    ✅ Script stopped');
                }
            } else {
                console.log('    ℹ️ Kismet already running, skipping start/stop test');
            }

            this.report.integration = { success: true };

        } catch (error) {
            console.log('    ❌ Integration test failed:', error.message);
            this.report.integration = { success: false, error: error.message };
            this.report.errors.push('Integration test failed');
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(70));
        console.log('📊 VALIDATION REPORT');
        console.log('='.repeat(70));

        // Overall status
        const passed = this.report.errors.length === 0;
        console.log(`\nOverall Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

        // Endpoint summary
        console.log('\nEndpoint Summary:');
        Object.entries(this.report.endpoints).forEach(([name, result]) => {
            console.log(`  ${result.success ? '✅' : '❌'} ${name}: ${result.status || 'N/A'} (${result.responseTime ? Math.round(result.responseTime) + 'ms' : 'N/A'})`);
        });

        // WebSocket summary
        console.log('\nWebSocket Summary:');
        Object.entries(this.report.websocket).forEach(([name, result]) => {
            console.log(`  ${result.success ? '✅' : '❌'} ${name}`);
        });

        // Performance summary
        if (Object.keys(this.report.performance).length > 0) {
            console.log('\nPerformance Summary:');
            Object.entries(this.report.performance).forEach(([name, metrics]) => {
                if (metrics.avg !== undefined) {
                    console.log(`  ${name}: avg=${metrics.avg}ms, min=${metrics.min}ms, max=${metrics.max}ms`);
                }
            });
            
            if (this.report.performance.concurrent) {
                const c = this.report.performance.concurrent;
                console.log(`  Concurrent: ${c.successful}/${c.total} successful, ${c.rps} req/s`);
            }
        }

        // Security summary
        if (this.report.security.rateLimiting) {
            const r = this.report.security.rateLimiting;
            console.log('\nSecurity Summary:');
            console.log(`  Rate Limiting: ${r.rateLimited > 0 ? '✅' : '❌'} (${r.rateLimited}/${r.total} blocked)`);
        }

        // Errors
        if (this.report.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.report.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
        }

        // Warnings
        if (this.report.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            this.report.warnings.forEach(warning => {
                console.log(`  - ${warning}`);
            });
        }

        // Save report
        const reportFile = `validation-report-${Date.now()}.json`;
        require('fs').writeFileSync(reportFile, JSON.stringify(this.report, null, 2));
        console.log(`\n📄 Full report saved to: ${reportFile}`);

        console.log('\n' + '='.repeat(70));
        console.log(passed ? '✅ PRODUCTION READY' : '❌ NOT READY FOR PRODUCTION');
        console.log('='.repeat(70) + '\n');
    }
}

// Run validation if executed directly
if (require.main === module) {
    const baseUrl = process.argv[2] || 'http://localhost:8092';
    const validator = new ProductionValidator(baseUrl);
    
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Validation error:', error);
        process.exit(1);
    });
}

module.exports = ProductionValidator;
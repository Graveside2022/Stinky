#!/usr/bin/env node

/**
 * API Compatibility Testing Framework
 * Validates 100% API endpoint preservation between Flask and Node.js
 * 
 * This framework tests:
 * - All API endpoints respond with correct status codes
 * - Response data structure compatibility
 * - Request/response format preservation  
 * - Error handling consistency
 * - Performance comparison between implementations
 * - WebSocket event compatibility
 * 
 * Usage: node tests/api-compatibility-test.js [--flask-port 8092] [--nodejs-port 3001]
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

class APICompatibilityTester extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            flaskBaseURL: options.flaskURL || 'http://localhost:8092',
            nodejsBaseURL: options.nodejsURL || 'http://localhost:3001',
            flaskWigleURL: options.flaskWigleURL || 'http://localhost:8000',
            nodejsWigleURL: options.nodejsWigleURL || 'http://localhost:3002',
            timeout: options.timeout || 10000,
            retries: options.retries || 3,
            ...options
        };
        
        this.results = {
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                startTime: 0,
                endTime: 0
            },
            endpoints: [],
            webSocket: [],
            performance: {},
            compatibility: {},
            errors: []
        };
        
        this.testSuites = [
            {
                name: 'Spectrum Analyzer API',
                flask: this.config.flaskBaseURL,
                nodejs: this.config.nodejsBaseURL,
                endpoints: [
                    { method: 'GET', path: '/api/status', description: 'Service status' },
                    { method: 'GET', path: '/api/config', description: 'Configuration data' },
                    { method: 'GET', path: '/api/profiles', description: 'Scan profiles' },
                    { method: 'GET', path: '/api/signals', description: 'Detected signals' },
                    { method: 'GET', path: '/api/scan/vhf', description: 'VHF scan' },
                    { method: 'GET', path: '/api/scan/uhf', description: 'UHF scan' },
                    { method: 'GET', path: '/api/scan/ism', description: 'ISM scan' },
                    { method: 'POST', path: '/api/connect', description: 'Connect to OpenWebRX',
                      body: { url: 'ws://localhost:8073/ws/' } },
                    { method: 'POST', path: '/api/config', description: 'Update configuration',
                      body: { signal_threshold: -70 } }
                ]
            },
            {
                name: 'WigleToTAK API',
                flask: this.config.flaskWigleURL,
                nodejs: this.config.nodejsWigleURL,
                endpoints: [
                    { method: 'GET', path: '/api/status', description: 'Service status' },
                    { method: 'GET', path: '/list_wigle_files', description: 'List CSV files' },
                    { method: 'GET', path: '/get_antenna_settings', description: 'Antenna settings' },
                    { method: 'POST', path: '/update_tak_settings', description: 'Update TAK settings',
                      body: { tak_server_ip: '192.168.1.100', tak_server_port: '6969' } },
                    { method: 'POST', path: '/update_multicast_state', description: 'Toggle multicast',
                      body: { takMulticast: true } },
                    { method: 'POST', path: '/update_analysis_mode', description: 'Set analysis mode',
                      body: { mode: 'realtime' } },
                    { method: 'POST', path: '/update_antenna_sensitivity', description: 'Set antenna sensitivity',
                      body: { antenna_sensitivity: 'standard' } },
                    { method: 'POST', path: '/add_to_whitelist', description: 'Add to whitelist',
                      body: { ssid: 'TestSSID' } },
                    { method: 'POST', path: '/remove_from_whitelist', description: 'Remove from whitelist',
                      body: { ssid: 'TestSSID' } },
                    { method: 'POST', path: '/add_to_blacklist', description: 'Add to blacklist',
                      body: { ssid: 'TestSSID', argb_value: '-65536' } },
                    { method: 'POST', path: '/remove_from_blacklist', description: 'Remove from blacklist',
                      body: { ssid: 'TestSSID' } }
                ]
            }
        ];
        
        this.resultFile = path.join(__dirname, `api-compatibility-${Date.now()}.json`);
    }
    
    async start() {
        console.log('🧪 API COMPATIBILITY TESTING FRAMEWORK');
        console.log('=====================================');
        console.log(`Flask Spectrum Analyzer: ${this.config.flaskBaseURL}`);
        console.log(`Node.js Spectrum Analyzer: ${this.config.nodejsBaseURL}`);
        console.log(`Flask WigleToTAK: ${this.config.flaskWigleURL}`);
        console.log(`Node.js WigleToTAK: ${this.config.nodejsWigleURL}`);
        console.log('');
        
        this.results.summary.startTime = Date.now();
        
        // Test service availability
        await this.testServiceAvailability();
        
        // Run endpoint compatibility tests
        await this.runEndpointTests();
        
        // Test WebSocket compatibility
        await this.testWebSocketCompatibility();
        
        // Performance comparison
        await this.runPerformanceComparison();
        
        // Generate final report
        const report = await this.generateReport();
        
        return report;
    }
    
    async testServiceAvailability() {
        console.log('🔍 Testing service availability...');
        
        const services = [
            { name: 'Flask Spectrum Analyzer', url: this.config.flaskBaseURL },
            { name: 'Node.js Spectrum Analyzer', url: this.config.nodejsBaseURL },
            { name: 'Flask WigleToTAK', url: this.config.flaskWigleURL },
            { name: 'Node.js WigleToTAK', url: this.config.nodejsWigleURL }
        ];
        
        for (const service of services) {
            try {
                const response = await axios.get(`${service.url}/api/status`, { 
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status === 200) {
                    console.log(`  ✅ ${service.name}: Available`);
                } else {
                    console.log(`  ⚠️  ${service.name}: Available but returned ${response.status}`);
                }
            } catch (error) {
                console.log(`  ❌ ${service.name}: Not available - ${error.message}`);
                this.results.errors.push({
                    service: service.name,
                    error: `Service unavailable: ${error.message}`
                });
            }
        }
        
        console.log('');
    }
    
    async runEndpointTests() {
        console.log('🚀 Running endpoint compatibility tests...');
        
        for (const suite of this.testSuites) {
            console.log(`\n📡 Testing ${suite.name}:`);
            
            for (const endpoint of suite.endpoints) {
                await this.testEndpointCompatibility(suite, endpoint);
            }
        }
    }
    
    async testEndpointCompatibility(suite, endpoint) {
        this.results.summary.totalTests++;
        
        const testName = `${suite.name} - ${endpoint.method} ${endpoint.path}`;
        console.log(`  Testing: ${endpoint.description}...`);
        
        try {
            // Test Flask implementation
            const flaskResult = await this.makeRequest(
                suite.flask, 
                endpoint.method, 
                endpoint.path, 
                endpoint.body
            );
            
            // Test Node.js implementation
            const nodejsResult = await this.makeRequest(
                suite.nodejs, 
                endpoint.method, 
                endpoint.path, 
                endpoint.body
            );
            
            // Compare results
            const compatibility = this.compareResponses(flaskResult, nodejsResult);
            
            const testResult = {
                testName,
                endpoint: `${endpoint.method} ${endpoint.path}`,
                description: endpoint.description,
                flask: flaskResult,
                nodejs: nodejsResult,
                compatibility,
                passed: compatibility.compatible,
                timestamp: Date.now()
            };
            
            this.results.endpoints.push(testResult);
            
            if (compatibility.compatible) {
                this.results.summary.passedTests++;
                console.log(`    ✅ Compatible`);
            } else {
                this.results.summary.failedTests++;
                console.log(`    ❌ Incompatible: ${compatibility.reason}`);
            }
            
            // Log performance difference if both succeeded
            if (flaskResult.success && nodejsResult.success) {
                const improvement = ((flaskResult.responseTime - nodejsResult.responseTime) / flaskResult.responseTime * 100).toFixed(1);
                if (improvement > 0) {
                    console.log(`    ⚡ ${improvement}% faster in Node.js`);
                } else if (improvement < 0) {
                    console.log(`    ⚠️  ${Math.abs(improvement)}% slower in Node.js`);
                }
            }
            
        } catch (error) {
            this.results.summary.failedTests++;
            console.log(`    ❌ Test failed: ${error.message}`);
            
            this.results.endpoints.push({
                testName,
                endpoint: `${endpoint.method} ${endpoint.path}`,
                description: endpoint.description,
                error: error.message,
                passed: false,
                timestamp: Date.now()
            });
        }
    }
    
    async makeRequest(baseURL, method, path, body = null) {
        const startTime = Date.now();
        
        try {
            const config = {
                method,
                url: `${baseURL}${path}`,
                timeout: this.config.timeout,
                validateStatus: () => true, // Accept all status codes
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (body && (method === 'POST' || method === 'PUT')) {
                config.data = body;
            }
            
            const response = await axios(config);
            const responseTime = Date.now() - startTime;
            
            return {
                success: true,
                status: response.status,
                statusText: response.statusText,
                data: response.data,
                responseTime,
                headers: response.headers
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            if (error.response) {
                // Server responded with error status
                return {
                    success: false,
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    responseTime,
                    error: `HTTP ${error.response.status}: ${error.response.statusText}`
                };
            } else {
                // Network error or timeout
                return {
                    success: false,
                    responseTime,
                    error: error.message
                };
            }
        }
    }
    
    compareResponses(flaskResult, nodejsResult) {
        // Both should have same success/failure status
        if (flaskResult.success !== nodejsResult.success) {
            return {
                compatible: false,
                reason: `Success status mismatch: Flask=${flaskResult.success}, Node.js=${nodejsResult.success}`
            };
        }
        
        // If both failed, they should fail with similar status codes
        if (!flaskResult.success && !nodejsResult.success) {
            if (Math.abs(flaskResult.status - nodejsResult.status) > 100) {
                return {
                    compatible: false,
                    reason: `Different error status codes: Flask=${flaskResult.status}, Node.js=${nodejsResult.status}`
                };
            }
            return { compatible: true, reason: 'Both failed with similar status codes' };
        }
        
        // If both succeeded, compare status codes
        if (flaskResult.status !== nodejsResult.status) {
            return {
                compatible: false,
                reason: `Status code mismatch: Flask=${flaskResult.status}, Node.js=${nodejsResult.status}`
            };
        }
        
        // Compare response data structure
        const dataCompatibility = this.compareDataStructures(flaskResult.data, nodejsResult.data);
        if (!dataCompatibility.compatible) {
            return dataCompatibility;
        }
        
        return { compatible: true, reason: 'Responses are compatible' };
    }
    
    compareDataStructures(flaskData, nodejsData) {
        try {
            // Compare data types
            if (typeof flaskData !== typeof nodejsData) {
                return {
                    compatible: false,
                    reason: `Data type mismatch: Flask=${typeof flaskData}, Node.js=${typeof nodejsData}`
                };
            }
            
            // For objects, compare key structure
            if (typeof flaskData === 'object' && flaskData !== null && nodejsData !== null) {
                const flaskKeys = Object.keys(flaskData).sort();
                const nodejsKeys = Object.keys(nodejsData).sort();
                
                // Check for missing keys
                const missingInNodejs = flaskKeys.filter(key => !nodejsKeys.includes(key));
                const extraInNodejs = nodejsKeys.filter(key => !flaskKeys.includes(key));
                
                if (missingInNodejs.length > 0) {
                    return {
                        compatible: false,
                        reason: `Node.js missing keys: ${missingInNodejs.join(', ')}`
                    };
                }
                
                if (extraInNodejs.length > 0) {
                    // Extra keys are acceptable as long as all Flask keys are present
                    return {
                        compatible: true,
                        reason: `Compatible with additional Node.js keys: ${extraInNodejs.join(', ')}`
                    };
                }
                
                // Check value types for common keys
                for (const key of flaskKeys) {
                    if (typeof flaskData[key] !== typeof nodejsData[key]) {
                        return {
                            compatible: false,
                            reason: `Value type mismatch for '${key}': Flask=${typeof flaskData[key]}, Node.js=${typeof nodejsData[key]}`
                        };
                    }
                }
            }
            
            return { compatible: true, reason: 'Data structures are compatible' };
            
        } catch (error) {
            return {
                compatible: false,
                reason: `Error comparing data structures: ${error.message}`
            };
        }
    }
    
    async testWebSocketCompatibility() {
        console.log('\n🌐 Testing WebSocket compatibility...');
        
        try {
            // Test Flask WebSocket
            const flaskWsResult = await this.testWebSocket(
                'ws://localhost:8092/socket.io/?EIO=4&transport=websocket',
                'Flask Spectrum Analyzer'
            );
            
            // Test Node.js WebSocket
            const nodejsWsResult = await this.testWebSocket(
                'ws://localhost:3001/socket.io/?EIO=4&transport=websocket',
                'Node.js Spectrum Analyzer'
            );
            
            const wsCompatibility = {
                flask: flaskWsResult,
                nodejs: nodejsWsResult,
                compatible: flaskWsResult.connected && nodejsWsResult.connected,
                eventCompatibility: this.compareWebSocketEvents(flaskWsResult.events, nodejsWsResult.events)
            };
            
            this.results.webSocket.push(wsCompatibility);
            
            if (wsCompatibility.compatible) {
                console.log('  ✅ WebSocket compatibility verified');
            } else {
                console.log('  ❌ WebSocket compatibility issues detected');
            }
            
        } catch (error) {
            console.log(`  ❌ WebSocket testing failed: ${error.message}`);
            this.results.errors.push({
                test: 'WebSocket Compatibility',
                error: error.message
            });
        }
    }
    
    async testWebSocket(url, serviceName) {
        return new Promise((resolve) => {
            const result = {
                serviceName,
                url,
                connected: false,
                events: [],
                errors: [],
                connectionTime: 0
            };
            
            const startTime = Date.now();
            const ws = new WebSocket(url);
            
            const timeout = setTimeout(() => {
                ws.close();
                result.errors.push('Connection timeout');
                resolve(result);
            }, 10000);
            
            ws.on('open', () => {
                result.connected = true;
                result.connectionTime = Date.now() - startTime;
                console.log(`    ✅ ${serviceName} WebSocket connected (${result.connectionTime}ms)`);
            });
            
            ws.on('message', (data) => {
                try {
                    const message = data.toString();
                    result.events.push({
                        timestamp: Date.now(),
                        type: 'message',
                        data: message.length > 100 ? message.substring(0, 100) + '...' : message
                    });
                } catch (error) {
                    result.errors.push(`Message parse error: ${error.message}`);
                }
            });
            
            ws.on('error', (error) => {
                result.errors.push(error.message);
                console.log(`    ❌ ${serviceName} WebSocket error: ${error.message}`);
            });
            
            ws.on('close', () => {
                clearTimeout(timeout);
                setTimeout(() => resolve(result), 100); // Small delay to collect final events
            });
            
            // Send test message after connection
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, 1000);
            
            // Close connection after collecting data
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, 5000);
        });
    }
    
    compareWebSocketEvents(flaskEvents, nodejsEvents) {
        if (flaskEvents.length === 0 && nodejsEvents.length === 0) {
            return { compatible: true, reason: 'No events from either service' };
        }
        
        if (flaskEvents.length === 0 || nodejsEvents.length === 0) {
            return { 
                compatible: false, 
                reason: `Event count mismatch: Flask=${flaskEvents.length}, Node.js=${nodejsEvents.length}` 
            };
        }
        
        // Basic compatibility check - both should receive events
        return { compatible: true, reason: 'Both services receive WebSocket events' };
    }
    
    async runPerformanceComparison() {
        console.log('\n⚡ Running performance comparison...');
        
        const testEndpoints = [
            { service: 'Spectrum Analyzer', flask: this.config.flaskBaseURL, nodejs: this.config.nodejsBaseURL, path: '/api/status' },
            { service: 'WigleToTAK', flask: this.config.flaskWigleURL, nodejs: this.config.nodejsWigleURL, path: '/api/status' }
        ];
        
        for (const test of testEndpoints) {
            console.log(`  Testing ${test.service} performance...`);
            
            // Run multiple requests to get average
            const iterations = 10;
            const flaskTimes = [];
            const nodejsTimes = [];
            
            for (let i = 0; i < iterations; i++) {
                try {
                    const flaskResult = await this.makeRequest(test.flask, 'GET', test.path);
                    const nodejsResult = await this.makeRequest(test.nodejs, 'GET', test.path);
                    
                    if (flaskResult.success) flaskTimes.push(flaskResult.responseTime);
                    if (nodejsResult.success) nodejsTimes.push(nodejsResult.responseTime);
                    
                } catch (error) {
                    // Skip failed requests
                }
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (flaskTimes.length > 0 && nodejsTimes.length > 0) {
                const flaskAvg = flaskTimes.reduce((a, b) => a + b, 0) / flaskTimes.length;
                const nodejsAvg = nodejsTimes.reduce((a, b) => a + b, 0) / nodejsTimes.length;
                const improvement = ((flaskAvg - nodejsAvg) / flaskAvg * 100).toFixed(1);
                
                this.results.performance[test.service] = {
                    flask: {
                        average: Math.round(flaskAvg),
                        min: Math.min(...flaskTimes),
                        max: Math.max(...flaskTimes)
                    },
                    nodejs: {
                        average: Math.round(nodejsAvg),
                        min: Math.min(...nodejsTimes),
                        max: Math.max(...nodejsTimes)
                    },
                    improvement: `${improvement}%`
                };
                
                console.log(`    Flask avg: ${Math.round(flaskAvg)}ms, Node.js avg: ${Math.round(nodejsAvg)}ms`);
                if (improvement > 0) {
                    console.log(`    ✅ ${improvement}% performance improvement`);
                } else {
                    console.log(`    ⚠️  ${Math.abs(improvement)}% performance regression`);
                }
            }
        }
    }
    
    async generateReport() {
        this.results.summary.endTime = Date.now();
        const duration = this.results.summary.endTime - this.results.summary.startTime;
        
        const report = {
            summary: {
                ...this.results.summary,
                duration: `${Math.round(duration / 1000)} seconds`,
                successRate: this.results.summary.totalTests > 0 
                    ? `${(this.results.summary.passedTests / this.results.summary.totalTests * 100).toFixed(1)}%`
                    : '0%'
            },
            compatibility: {
                endpointCompatibility: this.calculateEndpointCompatibility(),
                webSocketCompatibility: this.results.webSocket.length > 0 && this.results.webSocket[0].compatible,
                performanceComparison: this.results.performance
            },
            detailedResults: {
                endpoints: this.results.endpoints,
                webSocket: this.results.webSocket,
                errors: this.results.errors
            },
            recommendations: this.generateRecommendations()
        };
        
        // Save detailed results
        await fs.writeJSON(this.resultFile, {
            config: this.config,
            results: this.results,
            report
        }, { spaces: 2 });
        
        // Display summary
        this.displaySummary(report);
        
        return report;
    }
    
    calculateEndpointCompatibility() {
        const totalEndpoints = this.results.endpoints.length;
        const compatibleEndpoints = this.results.endpoints.filter(e => e.passed).length;
        
        return {
            total: totalEndpoints,
            compatible: compatibleEndpoints,
            incompatible: totalEndpoints - compatibleEndpoints,
            rate: totalEndpoints > 0 ? `${(compatibleEndpoints / totalEndpoints * 100).toFixed(1)}%` : '0%'
        };
    }
    
    generateRecommendations() {
        const recommendations = [];
        const compatibility = this.calculateEndpointCompatibility();
        
        if (parseFloat(compatibility.rate) === 100) {
            recommendations.push('🎉 Perfect API compatibility! All endpoints are fully compatible.');
        } else if (parseFloat(compatibility.rate) >= 95) {
            recommendations.push('✅ Excellent API compatibility with minor issues to address.');
        } else if (parseFloat(compatibility.rate) >= 80) {
            recommendations.push('⚠️ Good API compatibility but several issues need attention.');
        } else {
            recommendations.push('❌ Significant API compatibility issues require immediate attention.');
        }
        
        // Performance recommendations
        Object.entries(this.results.performance).forEach(([service, perf]) => {
            const improvement = parseFloat(perf.improvement);
            if (improvement > 5) {
                recommendations.push(`⚡ ${service}: Excellent ${perf.improvement} performance improvement achieved.`);
            } else if (improvement < -5) {
                recommendations.push(`🐌 ${service}: Performance regression of ${Math.abs(perf.improvement)} requires optimization.`);
            }
        });
        
        // WebSocket recommendations
        if (this.results.webSocket.length > 0) {
            const wsCompatible = this.results.webSocket[0].compatible;
            if (wsCompatible) {
                recommendations.push('🌐 WebSocket compatibility verified successfully.');
            } else {
                recommendations.push('🔌 WebSocket compatibility issues detected - investigate connection handling.');
            }
        }
        
        // Error-based recommendations
        if (this.results.errors.length > 0) {
            recommendations.push(`🔧 ${this.results.errors.length} errors encountered during testing - review error logs.`);
        }
        
        return recommendations;
    }
    
    displaySummary(report) {
        console.log('\n' + '='.repeat(60));
        console.log('🏁 API COMPATIBILITY TEST RESULTS');
        console.log('='.repeat(60));
        
        console.log('\n📊 SUMMARY:');
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passedTests}`);
        console.log(`Failed: ${report.summary.failedTests}`);
        console.log(`Success Rate: ${report.summary.successRate}`);
        console.log(`Duration: ${report.summary.duration}`);
        
        console.log('\n🔗 ENDPOINT COMPATIBILITY:');
        console.log(`Compatible Endpoints: ${report.compatibility.endpointCompatibility.compatible}/${report.compatibility.endpointCompatibility.total}`);
        console.log(`Compatibility Rate: ${report.compatibility.endpointCompatibility.rate}`);
        
        if (Object.keys(report.compatibility.performanceComparison).length > 0) {
            console.log('\n⚡ PERFORMANCE COMPARISON:');
            Object.entries(report.compatibility.performanceComparison).forEach(([service, perf]) => {
                console.log(`${service}:`);
                console.log(`  Flask: ${perf.flask.average}ms avg (${perf.flask.min}-${perf.flask.max}ms)`);
                console.log(`  Node.js: ${perf.nodejs.average}ms avg (${perf.nodejs.min}-${perf.nodejs.max}ms)`);
                console.log(`  Improvement: ${perf.improvement}`);
            });
        }
        
        console.log('\n🌐 WEBSOCKET COMPATIBILITY:');
        console.log(`Status: ${report.compatibility.webSocketCompatibility ? '✅ Compatible' : '❌ Issues detected'}`);
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            report.recommendations.forEach(rec => console.log(`  ${rec}`));
        }
        
        console.log(`\n📄 Detailed results saved to: ${this.resultFile}`);
        console.log('='.repeat(60));
    }
}

// CLI interface
if (require.main === module) {
    const { Command } = require('commander');
    const program = new Command();
    
    program
        .name('api-compatibility-test')
        .description('API Compatibility Testing Framework for Flask to Node.js Migration')
        .option('--flask-spectrum <url>', 'Flask Spectrum Analyzer URL', 'http://localhost:8092')
        .option('--nodejs-spectrum <url>', 'Node.js Spectrum Analyzer URL', 'http://localhost:3001')
        .option('--flask-wigle <url>', 'Flask WigleToTAK URL', 'http://localhost:8000')
        .option('--nodejs-wigle <url>', 'Node.js WigleToTAK URL', 'http://localhost:3002')
        .option('--timeout <ms>', 'Request timeout in milliseconds', '10000')
        .parse();
    
    const options = program.opts();
    
    const tester = new APICompatibilityTester({
        flaskURL: options.flaskSpectrum,
        nodejsURL: options.nodejsSpectrum,
        flaskWigleURL: options.flaskWigle,
        nodejsWigleURL: options.nodejsWigle,
        timeout: parseInt(options.timeout)
    });
    
    tester.start().then(report => {
        const successRate = parseFloat(report.summary.successRate);
        process.exit(successRate >= 95 ? 0 : 1);
    }).catch(error => {
        console.error('API compatibility testing failed:', error);
        process.exit(1);
    });
}

module.exports = APICompatibilityTester;
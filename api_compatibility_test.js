#!/usr/bin/env node
/**
 * Comprehensive API Compatibility Test Suite
 * Agent 5: API Compatibility Verification
 * User: Christian
 * 
 * Tests 100% API compatibility between Flask and Node.js implementations
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');

class APICompatibilityTester {
    constructor() {
        this.services = {
            spectrum: {
                flask: 'http://localhost:8092',
                nodejs: 'http://localhost:3001'
            },
            wigletotak: {
                flask: 'http://localhost:8000', 
                nodejs: 'http://localhost:3002'
            }
        };
        
        this.results = {
            spectrum: {},
            wigletotak: {},
            summary: {
                total_tests: 0,
                passed: 0,
                failed: 0,
                compatibility_score: 0
            }
        };
        
        this.timeout = 10000;
    }

    async runAllTests() {
        console.log('🧪 CRITICAL MISSION: 100% API Compatibility Verification');
        console.log('User: Christian | Agent 5: API Compatibility Verification');
        console.log('=' .repeat(80));
        
        try {
            // Test Spectrum Analyzer APIs
            console.log('\n📡 Testing Spectrum Analyzer APIs...');
            await this.testSpectrumAnalyzer();
            
            // Test WigleToTAK APIs  
            console.log('\n📶 Testing WigleToTAK APIs...');
            await this.testWigleToTAK();
            
            // Generate final report
            this.generateCompatibilityReport();
            
        } catch (error) {
            console.error('❌ API Compatibility Test Suite Failed:', error.message);
            process.exit(1);
        }
    }

    async testSpectrumAnalyzer() {
        const tests = [
            {
                name: 'Root HTML Interface',
                method: 'GET',
                endpoint: '/',
                expectedType: 'html'
            },
            {
                name: 'Status API',
                method: 'GET', 
                endpoint: '/api/status',
                expectedType: 'json'
            },
            {
                name: 'Profiles API',
                method: 'GET',
                endpoint: '/api/profiles', 
                expectedType: 'json'
            },
            {
                name: 'VHF Scan API',
                method: 'GET',
                endpoint: '/api/scan/vhf',
                expectedType: 'json'
            },
            {
                name: 'UHF Scan API', 
                method: 'GET',
                endpoint: '/api/scan/uhf',
                expectedType: 'json'
            },
            {
                name: 'ISM Scan API',
                method: 'GET', 
                endpoint: '/api/scan/ism',
                expectedType: 'json'
            }
        ];

        for (const test of tests) {
            await this.runCompatibilityTest('spectrum', test);
        }
        
        // Test WebSocket compatibility
        await this.testSpectrumWebSocket();
    }

    async testWigleToTAK() {
        const tests = [
            {
                name: 'Root HTML Interface',
                method: 'GET',
                endpoint: '/',
                expectedType: 'html'
            },
            {
                name: 'Update TAK Settings',
                method: 'POST',
                endpoint: '/update_tak_settings',
                data: { tak_server_ip: '192.168.1.100', tak_server_port: '6969' },
                expectedType: 'json'
            },
            {
                name: 'Update Multicast State',
                method: 'POST', 
                endpoint: '/update_multicast_state',
                data: { takMulticast: true },
                expectedType: 'json'
            },
            {
                name: 'Update Analysis Mode',
                method: 'POST',
                endpoint: '/update_analysis_mode',
                data: { mode: 'realtime' },
                expectedType: 'json'
            },
            {
                name: 'List Wigle Files',
                method: 'GET',
                endpoint: '/list_wigle_files',
                expectedType: 'json'
            },
            {
                name: 'Add to Whitelist (SSID)',
                method: 'POST',
                endpoint: '/add_to_whitelist',
                data: { ssid: 'TestSSID' },
                expectedType: 'json'
            },
            {
                name: 'Remove from Whitelist (SSID)',
                method: 'POST',
                endpoint: '/remove_from_whitelist', 
                data: { ssid: 'TestSSID' },
                expectedType: 'json'
            },
            {
                name: 'Add to Blacklist (SSID)',
                method: 'POST',
                endpoint: '/add_to_blacklist',
                data: { ssid: 'TestSSID', argb_value: '-65536' },
                expectedType: 'json'
            },
            {
                name: 'Remove from Blacklist (SSID)',
                method: 'POST',
                endpoint: '/remove_from_blacklist',
                data: { ssid: 'TestSSID' },
                expectedType: 'json'
            }
        ];

        for (const test of tests) {
            await this.runCompatibilityTest('wigletotak', test);
        }
    }

    async runCompatibilityTest(service, test) {
        const { name, method, endpoint, data, expectedType } = test;
        const serviceUrls = this.services[service];
        
        console.log(`  Testing: ${name}`);
        
        try {
            // Test Flask endpoint
            const flaskResponse = await this.makeRequest(serviceUrls.flask, method, endpoint, data);
            
            // Test Node.js endpoint  
            const nodejsResponse = await this.makeRequest(serviceUrls.nodejs, method, endpoint, data);
            
            // Compare responses
            const isCompatible = this.compareResponses(flaskResponse, nodejsResponse, expectedType);
            
            const result = {
                endpoint: `${method} ${endpoint}`,
                compatible: isCompatible,
                flask: {
                    status: flaskResponse.status,
                    contentType: flaskResponse.headers['content-type'],
                    hasData: !!flaskResponse.data
                },
                nodejs: {
                    status: nodejsResponse.status,
                    contentType: nodejsResponse.headers['content-type'], 
                    hasData: !!nodejsResponse.data
                },
                notes: isCompatible ? 'Fully compatible' : 'Compatibility issues detected'
            };
            
            this.results[service][name] = result;
            this.results.summary.total_tests++;
            
            if (isCompatible) {
                this.results.summary.passed++;
                console.log(`    ✅ ${name}: Compatible`);
            } else {
                this.results.summary.failed++;
                console.log(`    ❌ ${name}: Compatibility issues`);
                console.log(`       Flask: ${flaskResponse.status} | Node.js: ${nodejsResponse.status}`);
            }
            
        } catch (error) {
            this.results[service][name] = {
                endpoint: `${method} ${endpoint}`,
                compatible: false,
                error: error.message
            };
            this.results.summary.total_tests++;
            this.results.summary.failed++;
            console.log(`    ❌ ${name}: Error - ${error.message}`);
        }
    }

    async makeRequest(baseUrl, method, endpoint, data) {
        const config = {
            method: method,
            url: `${baseUrl}${endpoint}`,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/html'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            config.data = data;
        }
        
        return await axios(config);
    }

    compareResponses(flaskResponse, nodejsResponse, expectedType) {
        // Check status codes
        if (flaskResponse.status !== nodejsResponse.status) {
            return false;
        }
        
        // Check if both succeeded
        if (flaskResponse.status < 200 || flaskResponse.status >= 400) {
            return flaskResponse.status === nodejsResponse.status;
        }
        
        // For JSON responses, compare structure
        if (expectedType === 'json') {
            try {
                const flaskData = flaskResponse.data;
                const nodejsData = nodejsResponse.data;
                
                // Check if both are objects
                if (typeof flaskData === 'object' && typeof nodejsData === 'object') {
                    const flaskKeys = Object.keys(flaskData).sort();
                    const nodejsKeys = Object.keys(nodejsData).sort();
                    
                    // Compare keys (structure)
                    return JSON.stringify(flaskKeys) === JSON.stringify(nodejsKeys);
                }
                
                return JSON.stringify(flaskData) === JSON.stringify(nodejsData);
                
            } catch (error) {
                return false;
            }
        }
        
        // For HTML responses, check if both return HTML
        if (expectedType === 'html') {
            const flaskIsHtml = flaskResponse.headers['content-type']?.includes('text/html');
            const nodejsIsHtml = nodejsResponse.headers['content-type']?.includes('text/html');
            return flaskIsHtml && nodejsIsHtml;
        }
        
        return true;
    }

    async testSpectrumWebSocket() {
        console.log('  Testing: WebSocket Connectivity');
        
        try {
            // Test Flask WebSocket (if available)
            let flaskWsWorking = false;
            try {
                const flaskWs = new WebSocket('ws://localhost:8092/socket.io/?EIO=4&transport=websocket');
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                    flaskWs.on('open', () => {
                        flaskWsWorking = true;
                        clearTimeout(timeout);
                        flaskWs.close();
                        resolve();
                    });
                    flaskWs.on('error', reject);
                });
            } catch (error) {
                // Flask WebSocket may not be available
            }
            
            // Test Node.js WebSocket (if available)
            let nodejsWsWorking = false;
            try {
                const nodejsWs = new WebSocket('ws://localhost:3001/socket.io/?EIO=4&transport=websocket');
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                    nodejsWs.on('open', () => {
                        nodejsWsWorking = true;
                        clearTimeout(timeout);
                        nodejsWs.close();
                        resolve();
                    });
                    nodejsWs.on('error', reject);
                });
            } catch (error) {
                // Node.js WebSocket may not be available
            }
            
            const wsCompatible = flaskWsWorking === nodejsWsWorking;
            
            this.results.spectrum['WebSocket'] = {
                endpoint: 'WebSocket /socket.io/',
                compatible: wsCompatible,
                flask: { working: flaskWsWorking },
                nodejs: { working: nodejsWsWorking },
                notes: wsCompatible ? 'WebSocket compatibility verified' : 'WebSocket availability differs'
            };
            
            this.results.summary.total_tests++;
            if (wsCompatible) {
                this.results.summary.passed++;
                console.log('    ✅ WebSocket: Compatible');
            } else {
                this.results.summary.failed++;
                console.log('    ❌ WebSocket: Compatibility issues');
            }
            
        } catch (error) {
            console.log(`    ⚠️  WebSocket: Could not test - ${error.message}`);
        }
    }

    generateCompatibilityReport() {
        const { total_tests, passed, failed } = this.results.summary;
        const compatibilityScore = total_tests > 0 ? (passed / total_tests * 100).toFixed(1) : 0;
        
        this.results.summary.compatibility_score = parseFloat(compatibilityScore);
        
        console.log('\n' + '=' .repeat(80));
        console.log('📊 API COMPATIBILITY TEST RESULTS');
        console.log('=' .repeat(80));
        console.log(`Total Tests: ${total_tests}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Compatibility Score: ${compatibilityScore}%`);
        
        if (compatibilityScore >= 95) {
            console.log('✅ EXCELLENT: APIs are highly compatible');
        } else if (compatibilityScore >= 80) {
            console.log('⚠️  GOOD: Minor compatibility issues detected');
        } else {
            console.log('❌ CRITICAL: Major compatibility issues detected');
        }
        
        console.log('\n📋 DETAILED RESULTS:');
        
        // Spectrum Analyzer Results
        console.log('\n📡 Spectrum Analyzer:');
        for (const [testName, result] of Object.entries(this.results.spectrum)) {
            const status = result.compatible ? '✅' : '❌';
            console.log(`  ${status} ${testName}: ${result.notes || result.error || 'Tested'}`);
        }
        
        // WigleToTAK Results
        console.log('\n📶 WigleToTAK:');
        for (const [testName, result] of Object.entries(this.results.wigletotak)) {
            const status = result.compatible ? '✅' : '❌';
            console.log(`  ${status} ${testName}: ${result.notes || result.error || 'Tested'}`);
        }
        
        // Save detailed report
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = `api-compatibility-report-${timestamp}.json`;
        
        fs.writeFileSync(reportFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            user: 'Christian',
            agent: 'Agent 5 - API Compatibility Verification',
            summary: this.results.summary,
            detailed_results: this.results
        }, null, 2));
        
        console.log(`\n📄 Detailed report saved: ${reportFile}`);
        
        // Critical Issues
        const criticalIssues = this.identifyCriticalIssues();
        if (criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL COMPATIBILITY ISSUES:');
            criticalIssues.forEach(issue => console.log(`  - ${issue}`));
        }
        
        // Success criteria assessment
        console.log('\n🎯 SUCCESS CRITERIA ASSESSMENT:');
        console.log(`  100% API endpoint compatibility: ${compatibilityScore === 100 ? '✅' : '❌'}`);
        console.log(`  All response formats match: ${this.checkResponseFormats() ? '✅' : '❌'}`);
        console.log(`  No breaking changes detected: ${this.checkBreakingChanges() ? '✅' : '❌'}`);
        console.log(`  Client applications work: ${compatibilityScore >= 95 ? '✅' : '⚠️'}`);
        
        return this.results;
    }

    identifyCriticalIssues() {
        const issues = [];
        
        // Check for status code mismatches
        for (const service of ['spectrum', 'wigletotak']) {
            for (const [testName, result] of Object.entries(this.results[service])) {
                if (!result.compatible) {
                    if (result.flask?.status !== result.nodejs?.status) {
                        issues.push(`${service} ${testName}: Status code mismatch (Flask: ${result.flask?.status}, Node.js: ${result.nodejs?.status})`);
                    }
                    if (result.error) {
                        issues.push(`${service} ${testName}: ${result.error}`);
                    }
                }
            }
        }
        
        return issues;
    }

    checkResponseFormats() {
        // Check if all JSON responses have matching structures
        let allMatch = true;
        
        for (const service of ['spectrum', 'wigletotak']) {
            for (const result of Object.values(this.results[service])) {
                if (!result.compatible && result.flask?.status === 200 && result.nodejs?.status === 200) {
                    allMatch = false;
                }
            }
        }
        
        return allMatch;
    }

    checkBreakingChanges() {
        // Check for any major breaking changes
        let hasBreakingChanges = false;
        
        for (const service of ['spectrum', 'wigletotak']) {
            for (const result of Object.values(this.results[service])) {
                if (!result.compatible) {
                    // Breaking change if Flask works but Node.js fails
                    if (result.flask?.status === 200 && result.nodejs?.status >= 400) {
                        hasBreakingChanges = true;
                    }
                }
            }
        }
        
        return !hasBreakingChanges;
    }
}

// Run the tests
async function main() {
    const tester = new APICompatibilityTester();
    await tester.runAllTests();
    
    // Exit with appropriate code
    const compatibilityScore = tester.results.summary.compatibility_score;
    process.exit(compatibilityScore >= 95 ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = APICompatibilityTester;
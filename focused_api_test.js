#!/usr/bin/env node
/**
 * Focused API Compatibility Test
 * Agent 5: API Compatibility Verification
 * User: Christian
 * 
 * Tests API compatibility for currently running services
 */

const axios = require('axios');

class FocusedAPITester {
    constructor() {
        this.results = {
            wigletotak: {},
            spectrum: {},
            summary: {
                total_tests: 0,
                passed: 0,
                failed: 0
            }
        };
    }

    async runTests() {
        console.log('🧪 FOCUSED API COMPATIBILITY VERIFICATION');
        console.log('User: Christian | Agent 5: API Compatibility Verification');
        console.log('Testing available services only...');
        console.log('=' .repeat(80));

        // Test WigleToTAK (Flask vs Node.js)
        await this.testWigleToTAKComparison();
        
        // Test Node.js Spectrum Analyzer (standalone)
        await this.testNodeSpectrumAnalyzer();
        
        this.generateReport();
    }

    async testWigleToTAKComparison() {
        console.log('\n📶 Testing WigleToTAK API Compatibility (Flask vs Node.js)...');
        
        const tests = [
            {
                name: 'Root HTML Interface',
                method: 'GET',
                endpoint: '/',
                checkType: 'html'
            },
            {
                name: 'Update TAK Settings',
                method: 'POST',
                endpoint: '/update_tak_settings',
                data: { tak_server_ip: '192.168.1.100', tak_server_port: '6969' }
            },
            {
                name: 'Update Multicast State',
                method: 'POST',
                endpoint: '/update_multicast_state',
                data: { takMulticast: true }
            },
            {
                name: 'Update Analysis Mode',
                method: 'POST',
                endpoint: '/update_analysis_mode',
                data: { mode: 'realtime' }
            },
            {
                name: 'List Wigle Files',
                method: 'GET',
                endpoint: '/list_wigle_files?directory=./'
            },
            {
                name: 'Add to Whitelist (SSID)',
                method: 'POST',
                endpoint: '/add_to_whitelist',
                data: { ssid: 'TestSSID' }
            },
            {
                name: 'Remove from Whitelist (SSID)',
                method: 'POST',
                endpoint: '/remove_from_whitelist',
                data: { ssid: 'TestSSID' }
            },
            {
                name: 'Add to Blacklist (SSID)',
                method: 'POST',
                endpoint: '/add_to_blacklist',
                data: { ssid: 'TestSSID', argb_value: '-65536' }
            },
            {
                name: 'Remove from Blacklist (SSID)',
                method: 'POST',
                endpoint: '/remove_from_blacklist',
                data: { ssid: 'TestSSID' }
            }
        ];

        for (const test of tests) {
            await this.compareWigleToTAK(test);
        }

        // Test Node.js specific endpoints
        await this.testNodeJSOnlyEndpoints();
    }

    async testNodeJSOnlyEndpoints() {
        console.log('\n📊 Testing Node.js Enhanced APIs...');
        
        const tests = [
            {
                name: 'Status API (Node.js only)',
                method: 'GET',
                endpoint: '/api/status',
                service: 'nodejs'
            },
            {
                name: 'Antenna Settings (Node.js enhanced)',
                method: 'GET',
                endpoint: '/get_antenna_settings',
                service: 'nodejs'
            }
        ];

        for (const test of tests) {
            await this.testSingleEndpoint('wigletotak', 'http://localhost:3002', test);
        }
    }

    async testNodeSpectrumAnalyzer() {
        console.log('\n📡 Testing Node.js Spectrum Analyzer APIs...');
        
        const tests = [
            {
                name: 'Root HTML Interface',
                method: 'GET',
                endpoint: '/'
            },
            {
                name: 'Status API',
                method: 'GET',
                endpoint: '/api/status'
            },
            {
                name: 'Profiles API',
                method: 'GET',
                endpoint: '/api/profiles'
            },
            {
                name: 'VHF Scan',
                method: 'GET',
                endpoint: '/api/scan/vhf'
            },
            {
                name: 'UHF Scan',
                method: 'GET',
                endpoint: '/api/scan/uhf'
            },
            {
                name: 'ISM Scan',
                method: 'GET',
                endpoint: '/api/scan/ism'
            }
        ];

        for (const test of tests) {
            await this.testSingleEndpoint('spectrum', 'http://localhost:3001', test);
        }
    }

    async compareWigleToTAK(test) {
        const { name, method, endpoint, data, checkType } = test;
        console.log(`  Comparing: ${name}`);

        try {
            // Test Flask
            const flaskResponse = await this.makeRequest('http://localhost:8000', method, endpoint, data);
            
            // Test Node.js
            const nodejsResponse = await this.makeRequest('http://localhost:3002', method, endpoint, data);

            // Compare responses
            const comparison = this.compareResponses(flaskResponse, nodejsResponse, checkType);
            
            this.results.wigletotak[name] = {
                endpoint: `${method} ${endpoint}`,
                compatible: comparison.compatible,
                flask: comparison.flask,
                nodejs: comparison.nodejs,
                differences: comparison.differences,
                notes: comparison.notes
            };

            this.results.summary.total_tests++;

            if (comparison.compatible) {
                this.results.summary.passed++;
                console.log(`    ✅ Compatible: ${comparison.notes}`);
            } else {
                this.results.summary.failed++;
                console.log(`    ❌ Issues: ${comparison.notes}`);
                if (comparison.differences.length > 0) {
                    comparison.differences.forEach(diff => {
                        console.log(`       - ${diff}`);
                    });
                }
            }

        } catch (error) {
            this.results.wigletotak[name] = {
                endpoint: `${method} ${endpoint}`,
                compatible: false,
                error: error.message
            };
            this.results.summary.total_tests++;
            this.results.summary.failed++;
            console.log(`    ❌ Error: ${error.message}`);
        }
    }

    async testSingleEndpoint(service, baseUrl, test) {
        const { name, method, endpoint, data } = test;
        console.log(`  Testing: ${name}`);

        try {
            const response = await this.makeRequest(baseUrl, method, endpoint, data);
            
            this.results[service][name] = {
                endpoint: `${method} ${endpoint}`,
                available: true,
                status: response.status,
                contentType: response.headers['content-type'],
                hasData: !!response.data,
                notes: `Working (${response.status})`
            };

            this.results.summary.total_tests++;
            this.results.summary.passed++;
            console.log(`    ✅ Available: Status ${response.status}`);

        } catch (error) {
            this.results[service][name] = {
                endpoint: `${method} ${endpoint}`,
                available: false,
                error: error.message
            };
            this.results.summary.total_tests++;
            this.results.summary.failed++;
            console.log(`    ❌ Error: ${error.message}`);
        }
    }

    async makeRequest(baseUrl, method, endpoint, data) {
        const config = {
            method: method,
            url: `${baseUrl}${endpoint}`,
            timeout: 10000,
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

    compareResponses(flaskResponse, nodejsResponse, checkType) {
        const differences = [];
        let compatible = true;
        let notes = '';

        // Check status codes
        if (flaskResponse.status !== nodejsResponse.status) {
            differences.push(`Status code: Flask ${flaskResponse.status} vs Node.js ${nodejsResponse.status}`);
            compatible = false;
        }

        // Check content types
        const flaskContentType = flaskResponse.headers['content-type'];
        const nodejsContentType = nodejsResponse.headers['content-type'];
        
        if (checkType === 'html') {
            const flaskIsHtml = flaskContentType?.includes('text/html');
            const nodejsIsHtml = nodejsContentType?.includes('text/html');
            
            if (flaskIsHtml !== nodejsIsHtml) {
                differences.push(`Content type: Flask ${flaskContentType} vs Node.js ${nodejsContentType}`);
                compatible = false;
            }
        }

        // For JSON responses, compare structure
        if (flaskResponse.status === 200 && nodejsResponse.status === 200) {
            try {
                if (typeof flaskResponse.data === 'object' && typeof nodejsResponse.data === 'object') {
                    // Compare JSON structure
                    const flaskKeys = Object.keys(flaskResponse.data).sort();
                    const nodejsKeys = Object.keys(nodejsResponse.data).sort();
                    
                    if (JSON.stringify(flaskKeys) !== JSON.stringify(nodejsKeys)) {
                        differences.push(`JSON structure differs: Flask keys [${flaskKeys.join(', ')}] vs Node.js keys [${nodejsKeys.join(', ')}]`);
                        compatible = false;
                    }

                    // Compare message content for simple responses
                    if (flaskResponse.data.message && nodejsResponse.data.message) {
                        if (flaskResponse.data.message !== nodejsResponse.data.message) {
                            differences.push(`Message text: "${flaskResponse.data.message}" vs "${nodejsResponse.data.message}"`);
                        }
                    }
                }
            } catch (error) {
                differences.push(`JSON parsing error: ${error.message}`);
                compatible = false;
            }
        }

        if (compatible) {
            notes = differences.length === 0 ? 'Identical responses' : 'Compatible with minor differences';
        } else {
            notes = 'Incompatible responses detected';
        }

        return {
            compatible,
            differences,
            notes,
            flask: {
                status: flaskResponse.status,
                contentType: flaskContentType,
                dataType: typeof flaskResponse.data
            },
            nodejs: {
                status: nodejsResponse.status,
                contentType: nodejsContentType,
                dataType: typeof nodejsResponse.data
            }
        };
    }

    generateReport() {
        const { total_tests, passed, failed } = this.results.summary;
        const compatibilityScore = total_tests > 0 ? (passed / total_tests * 100).toFixed(1) : 0;

        console.log('\n' + '=' .repeat(80));
        console.log('📊 FOCUSED API COMPATIBILITY RESULTS');
        console.log('=' .repeat(80));
        console.log(`Total Tests: ${total_tests}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Compatibility Score: ${compatibilityScore}%`);

        // Detailed WigleToTAK Analysis
        console.log('\n📶 WigleToTAK Compatibility Analysis:');
        let wigleCompatibleCount = 0;
        let wigleTestCount = 0;

        for (const [testName, result] of Object.entries(this.results.wigletotak)) {
            wigleTestCount++;
            const status = result.compatible ? '✅' : '❌';
            console.log(`  ${status} ${testName}: ${result.notes || result.error || 'Tested'}`);
            if (result.compatible) wigleCompatibleCount++;
        }

        const wigleCompatibility = wigleTestCount > 0 ? (wigleCompatibleCount / wigleTestCount * 100).toFixed(1) : 0;
        console.log(`\n  WigleToTAK Compatibility: ${wigleCompatibility}%`);

        // Spectrum Analyzer Analysis
        console.log('\n📡 Spectrum Analyzer (Node.js only):');
        let spectrumWorkingCount = 0;
        let spectrumTestCount = 0;

        for (const [testName, result] of Object.entries(this.results.spectrum)) {
            spectrumTestCount++;
            const status = result.available ? '✅' : '❌';
            console.log(`  ${status} ${testName}: ${result.notes || result.error || 'Tested'}`);
            if (result.available) spectrumWorkingCount++;
        }

        const spectrumAvailability = spectrumTestCount > 0 ? (spectrumWorkingCount / spectrumTestCount * 100).toFixed(1) : 0;
        console.log(`\n  Spectrum Analyzer Availability: ${spectrumAvailability}%`);

        // Critical Assessment
        console.log('\n🎯 CRITICAL COMPATIBILITY ASSESSMENT:');
        console.log(`  WigleToTAK Flask-Node.js compatibility: ${wigleCompatibility >= 90 ? '✅' : '❌'} ${wigleCompatibility}%`);
        console.log(`  Node.js Spectrum Analyzer functionality: ${spectrumAvailability >= 90 ? '✅' : '❌'} ${spectrumAvailability}%`);
        console.log(`  Overall readiness for cutover: ${compatibilityScore >= 85 ? '✅ READY' : '❌ NOT READY'}`);

        // Save report
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportData = {
            timestamp: new Date().toISOString(),
            user: 'Christian',
            agent: 'Agent 5 - API Compatibility Verification',
            summary: {
                ...this.results.summary,
                compatibility_score: parseFloat(compatibilityScore),
                wigle_compatibility: parseFloat(wigleCompatibility),
                spectrum_availability: parseFloat(spectrumAvailability)
            },
            detailed_results: this.results,
            assessment: {
                ready_for_cutover: compatibilityScore >= 85,
                critical_issues: this.identifyCriticalIssues(),
                recommendations: this.generateRecommendations()
            }
        };

        require('fs').writeFileSync(`focused-api-compatibility-${timestamp}.json`, JSON.stringify(reportData, null, 2));
        console.log(`\n📄 Detailed report saved: focused-api-compatibility-${timestamp}.json`);

        return reportData;
    }

    identifyCriticalIssues() {
        const issues = [];

        // Check WigleToTAK compatibility issues
        for (const [testName, result] of Object.entries(this.results.wigletotak)) {
            if (!result.compatible && result.differences) {
                result.differences.forEach(diff => {
                    issues.push(`WigleToTAK ${testName}: ${diff}`);
                });
            }
        }

        // Check Spectrum Analyzer issues
        for (const [testName, result] of Object.entries(this.results.spectrum)) {
            if (!result.available) {
                issues.push(`Spectrum Analyzer ${testName}: ${result.error || 'Not available'}`);
            }
        }

        return issues;
    }

    generateRecommendations() {
        const recommendations = [];

        // WigleToTAK recommendations
        const wigleIssues = Object.values(this.results.wigletotak).filter(r => !r.compatible);
        if (wigleIssues.length > 0) {
            recommendations.push('Fix WigleToTAK API compatibility issues before cutover');
            recommendations.push('Standardize JSON response messages between Flask and Node.js');
        }

        // Spectrum Analyzer recommendations
        const spectrumIssues = Object.values(this.results.spectrum).filter(r => !r.available);
        if (spectrumIssues.length > 0) {
            recommendations.push('Ensure all Spectrum Analyzer endpoints are fully functional');
            recommendations.push('Test OpenWebRX integration for real-time data');
        }

        // General recommendations
        recommendations.push('Perform load testing on Node.js services before production cutover');
        recommendations.push('Set up monitoring for API response times and error rates');
        recommendations.push('Create rollback procedure in case of issues during cutover');

        return recommendations;
    }
}

// Run the tests
async function main() {
    const tester = new FocusedAPITester();
    const results = await tester.runTests();
    
    // Exit with appropriate code
    const compatibilityScore = results.summary.compatibility_score;
    process.exit(compatibilityScore >= 85 ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FocusedAPITester;
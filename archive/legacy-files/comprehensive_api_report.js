#!/usr/bin/env node
/**
 * Comprehensive API Compatibility Report
 * Agent 5: API Compatibility Verification  
 * User: Christian
 * 
 * FINAL ASSESSMENT FOR PHASE 4 MIGRATION CUTOVER
 */

const axios = require('axios');

class ComprehensiveAPIReport {
    constructor() {
        this.findings = {
            wigletotak: {
                compatibility_score: 0,
                tested_endpoints: 0,
                working_endpoints: 0,
                critical_issues: [],
                details: {}
            },
            spectrum: {
                nodejs_availability: 0,
                tested_endpoints: 0,
                working_endpoints: 0,
                critical_issues: [],
                details: {}
            },
            overall: {
                ready_for_cutover: false,
                confidence_level: 0,
                critical_blockers: [],
                recommendations: []
            }
        };
    }

    async generateReport() {
        console.log('🔍 COMPREHENSIVE API COMPATIBILITY VERIFICATION');
        console.log('Agent 5: API Compatibility Verification | User: Christian');
        console.log('PHASE 4 MIGRATION CUTOVER READINESS ASSESSMENT');
        console.log('=' .repeat(80));

        // 1. Test WigleToTAK Full Compatibility
        await this.assessWigleToTAKCompatibility();

        // 2. Test Node.js Services Availability
        await this.assessNodeJSServices();

        // 3. Generate Executive Summary
        this.generateExecutiveSummary();

        // 4. Save comprehensive report
        this.saveComprehensiveReport();

        return this.findings;
    }

    async assessWigleToTAKCompatibility() {
        console.log('\n📶 WIGLE-TO-TAK COMPATIBILITY ASSESSMENT');
        console.log('-'.repeat(50));

        const endpoints = [
            { name: 'Root Interface', method: 'GET', path: '/', type: 'html' },
            { name: 'TAK Settings Update', method: 'POST', path: '/update_tak_settings', 
              data: { tak_server_ip: '192.168.1.100', tak_server_port: '6969' } },
            { name: 'Multicast Toggle', method: 'POST', path: '/update_multicast_state', 
              data: { takMulticast: true } },
            { name: 'Analysis Mode Switch', method: 'POST', path: '/update_analysis_mode', 
              data: { mode: 'realtime' } },
            { name: 'File Listing', method: 'GET', path: '/list_wigle_files?directory=./' },
            { name: 'SSID Whitelist Add', method: 'POST', path: '/add_to_whitelist', 
              data: { ssid: 'TestNetwork' } },
            { name: 'SSID Whitelist Remove', method: 'POST', path: '/remove_from_whitelist', 
              data: { ssid: 'TestNetwork' } },
            { name: 'SSID Blacklist Add', method: 'POST', path: '/add_to_blacklist', 
              data: { ssid: 'TestNetwork', argb_value: '-65536' } },
            { name: 'SSID Blacklist Remove', method: 'POST', path: '/remove_from_blacklist', 
              data: { ssid: 'TestNetwork' } },
            { name: 'MAC Whitelist Add', method: 'POST', path: '/add_to_whitelist', 
              data: { mac: '00:11:22:33:44:55' } },
            { name: 'MAC Blacklist Add', method: 'POST', path: '/add_to_blacklist', 
              data: { mac: '00:11:22:33:44:55', argb_value: '-16776961' } }
        ];

        let compatible_count = 0;
        
        for (const endpoint of endpoints) {
            const result = await this.testEndpointCompatibility(endpoint);
            this.findings.wigletotak.details[endpoint.name] = result;
            this.findings.wigletotak.tested_endpoints++;
            
            if (result.compatible) {
                compatible_count++;
                console.log(`  ✅ ${endpoint.name}: 100% Compatible`);
            } else {
                console.log(`  ❌ ${endpoint.name}: Issues detected`);
                this.findings.wigletotak.critical_issues.push(result.issue);
            }
        }

        // Test Node.js Enhanced Endpoints
        const nodeEnhanced = [
            { name: 'Status API (Enhanced)', method: 'GET', path: '/api/status', nodeOnly: true },
            { name: 'Antenna Settings', method: 'GET', path: '/get_antenna_settings', nodeOnly: true }
        ];

        for (const endpoint of nodeEnhanced) {
            const result = await this.testNodeOnlyEndpoint(endpoint);
            this.findings.wigletotak.details[endpoint.name] = result;
            this.findings.wigletotak.tested_endpoints++;
            
            if (result.working) {
                compatible_count++;
                console.log(`  ✅ ${endpoint.name}: Working (Node.js Enhancement)`);
            } else {
                console.log(`  ❌ ${endpoint.name}: Not working`);
                this.findings.wigletotak.critical_issues.push(result.issue);
            }
        }

        this.findings.wigletotak.working_endpoints = compatible_count;
        this.findings.wigletotak.compatibility_score = 
            (compatible_count / this.findings.wigletotak.tested_endpoints * 100).toFixed(1);

        console.log(`\n📊 WigleToTAK Compatibility: ${this.findings.wigletotak.compatibility_score}%`);
    }

    async testEndpointCompatibility(endpoint) {
        try {
            // Test Flask version
            const flaskResponse = await this.makeRequest('http://localhost:8000', endpoint);
            
            // Test Node.js version
            const nodejsResponse = await this.makeRequest('http://localhost:3002', endpoint);

            // Compare responses
            const statusMatch = flaskResponse.status === nodejsResponse.status;
            const typeMatch = this.compareContentTypes(flaskResponse, nodejsResponse, endpoint.type);
            
            let structureMatch = true;
            if (endpoint.type !== 'html' && flaskResponse.status === 200) {
                structureMatch = this.compareJSONStructure(flaskResponse.data, nodejsResponse.data);
            }

            const compatible = statusMatch && typeMatch && structureMatch;

            return {
                compatible,
                flask_status: flaskResponse.status,
                nodejs_status: nodejsResponse.status,
                flask_type: flaskResponse.headers['content-type'],
                nodejs_type: nodejsResponse.headers['content-type'],
                structure_match: structureMatch,
                issue: compatible ? null : 'Response format or structure mismatch'
            };

        } catch (error) {
            return {
                compatible: false,
                error: error.message,
                issue: `Connection or request error: ${error.message}`
            };
        }
    }

    async testNodeOnlyEndpoint(endpoint) {
        try {
            const response = await this.makeRequest('http://localhost:3002', endpoint);
            
            return {
                working: response.status >= 200 && response.status < 400,
                status: response.status,
                has_data: !!response.data,
                issue: response.status >= 400 ? `HTTP ${response.status} error` : null
            };

        } catch (error) {
            return {
                working: false,
                error: error.message,
                issue: `Node.js endpoint error: ${error.message}`
            };
        }
    }

    async assessNodeJSServices() {
        console.log('\n📡 NODE.JS SERVICES AVAILABILITY ASSESSMENT');
        console.log('-'.repeat(50));

        const services = [
            { name: 'WigleToTAK', port: 3002, url: 'http://localhost:3002' },
            { name: 'Spectrum Analyzer', port: 3001, url: 'http://localhost:3001' },
            { name: 'GPS Bridge', port: 2948, url: 'http://localhost:2948' }
        ];

        for (const service of services) {
            const result = await this.testServiceAvailability(service);
            console.log(`  ${result.available ? '✅' : '❌'} ${service.name}: ${result.status}`);
            
            if (!result.available && service.name !== 'GPS Bridge') {
                this.findings.overall.critical_blockers.push(
                    `${service.name} not available on port ${service.port}`
                );
            }
        }

        // Test specific Spectrum Analyzer endpoints if available
        await this.testSpectrumAnalyzerEndpoints();
    }

    async testServiceAvailability(service) {
        try {
            const response = await axios.get(`${service.url}/api/status`, { timeout: 5000 });
            return {
                available: true,
                status: `Available (HTTP ${response.status})`,
                response_time: response.headers['x-response-time'] || 'N/A'
            };
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                return {
                    available: false,
                    status: 'Service not running'
                };
            } else if (error.response?.status === 404) {
                return {
                    available: true,
                    status: 'Running but no status endpoint'
                };
            } else {
                return {
                    available: false,
                    status: `Error: ${error.message}`
                };
            }
        }
    }

    async testSpectrumAnalyzerEndpoints() {
        console.log('\n📊 Testing Spectrum Analyzer APIs...');
        
        const endpoints = [
            { name: 'Status', path: '/api/status' },
            { name: 'Profiles', path: '/api/profiles' },
            { name: 'VHF Scan', path: '/api/scan/vhf' },
            { name: 'Root Interface', path: '/' }
        ];

        let working_count = 0;
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`http://localhost:3001${endpoint.path}`, { timeout: 5000 });
                working_count++;
                console.log(`  ✅ ${endpoint.name}: Working (${response.status})`);
                
                this.findings.spectrum.details[endpoint.name] = {
                    working: true,
                    status: response.status,
                    has_data: !!response.data
                };
                
            } catch (error) {
                console.log(`  ❌ ${endpoint.name}: ${error.code === 'ECONNREFUSED' ? 'Service not running' : error.message}`);
                
                this.findings.spectrum.details[endpoint.name] = {
                    working: false,
                    error: error.message
                };
                
                if (error.code === 'ECONNREFUSED') {
                    this.findings.spectrum.critical_issues.push('Spectrum Analyzer service not running');
                }
            }
        }

        this.findings.spectrum.tested_endpoints = endpoints.length;
        this.findings.spectrum.working_endpoints = working_count;
        this.findings.spectrum.nodejs_availability = (working_count / endpoints.length * 100).toFixed(1);
    }

    async makeRequest(baseUrl, endpoint) {
        const config = {
            method: endpoint.method,
            url: `${baseUrl}${endpoint.path}`,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/html'
            }
        };

        if (endpoint.data && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
            config.data = endpoint.data;
        }

        return await axios(config);
    }

    compareContentTypes(flaskResponse, nodejsResponse, expectedType) {
        if (expectedType === 'html') {
            const flaskIsHtml = flaskResponse.headers['content-type']?.includes('text/html');
            const nodejsIsHtml = nodejsResponse.headers['content-type']?.includes('text/html');
            return flaskIsHtml && nodejsIsHtml;
        }
        return true; // For JSON, we'll check structure separately
    }

    compareJSONStructure(flaskData, nodejsData) {
        if (typeof flaskData !== 'object' || typeof nodejsData !== 'object') {
            return JSON.stringify(flaskData) === JSON.stringify(nodejsData);
        }

        const flaskKeys = Object.keys(flaskData).sort();
        const nodejsKeys = Object.keys(nodejsData).sort();
        
        return JSON.stringify(flaskKeys) === JSON.stringify(nodejsKeys);
    }

    generateExecutiveSummary() {
        console.log('\n' + '=' .repeat(80));
        console.log('📋 EXECUTIVE SUMMARY - MIGRATION CUTOVER READINESS');
        console.log('=' .repeat(80));

        // Calculate overall readiness
        const wigleCompatibility = parseFloat(this.findings.wigletotak.compatibility_score);
        const spectrumAvailability = parseFloat(this.findings.spectrum.nodejs_availability);
        
        // Weight: WigleToTAK is more critical for immediate cutover
        const overall_score = (wigleCompatibility * 0.7) + (spectrumAvailability * 0.3);
        this.findings.overall.confidence_level = overall_score.toFixed(1);

        console.log(`\n🎯 OVERALL READINESS SCORE: ${overall_score.toFixed(1)}%`);

        // Critical Assessment
        console.log('\n📊 COMPONENT ASSESSMENT:');
        console.log(`  WigleToTAK Flask-Node.js Compatibility: ${wigleCompatibility}%`);
        console.log(`  Node.js Spectrum Analyzer Availability: ${spectrumAvailability}%`);

        // Readiness Determination
        if (wigleCompatibility >= 90 && spectrumAvailability >= 50) {
            this.findings.overall.ready_for_cutover = true;
            console.log('\n✅ READY FOR CUTOVER: High compatibility achieved');
        } else if (wigleCompatibility >= 80) {
            console.log('\n⚠️  CONDITIONALLY READY: WigleToTAK compatible, Spectrum needs attention');
        } else {
            console.log('\n❌ NOT READY: Critical compatibility issues detected');
        }

        // Critical Issues
        if (this.findings.wigletotak.critical_issues.length > 0) {
            console.log('\n🚨 CRITICAL WIGLE-TO-TAK ISSUES:');
            this.findings.wigletotak.critical_issues.forEach(issue => {
                console.log(`  - ${issue}`);
            });
        }

        if (this.findings.spectrum.critical_issues.length > 0) {
            console.log('\n🚨 CRITICAL SPECTRUM ANALYZER ISSUES:');
            this.findings.spectrum.critical_issues.forEach(issue => {
                console.log(`  - ${issue}`);
            });
        }

        // Recommendations
        this.generateRecommendations();
        
        console.log('\n💡 MIGRATION RECOMMENDATIONS:');
        this.findings.overall.recommendations.forEach(rec => {
            console.log(`  • ${rec}`);
        });

        // Final Verdict
        console.log('\n' + '=' .repeat(80));
        if (this.findings.overall.ready_for_cutover) {
            console.log('🚀 VERDICT: PROCEED WITH PHASE 4 MIGRATION CUTOVER');
            console.log('   WigleToTAK shows excellent compatibility for production use');
        } else {
            console.log('⚠️  VERDICT: RESOLVE ISSUES BEFORE CUTOVER');
            console.log('   Address critical compatibility issues first');
        }
        console.log('=' .repeat(80));
    }

    generateRecommendations() {
        const recs = this.findings.overall.recommendations;

        // WigleToTAK recommendations
        if (parseFloat(this.findings.wigletotak.compatibility_score) >= 90) {
            recs.push('WigleToTAK ready for immediate production cutover');
            recs.push('Consider using Node.js enhanced features (status API, antenna settings)');
        } else {
            recs.push('Fix WigleToTAK compatibility issues before cutover');
        }

        // Spectrum Analyzer recommendations  
        if (parseFloat(this.findings.spectrum.nodejs_availability) < 50) {
            recs.push('Spectrum Analyzer needs debugging - service not responding');
            recs.push('Investigate Node.js Spectrum Analyzer startup issues');
            recs.push('Consider keeping Flask Spectrum Analyzer during initial cutover');
        } else {
            recs.push('Spectrum Analyzer shows good availability for cutover');
        }

        // General recommendations
        recs.push('Implement comprehensive monitoring during cutover');
        recs.push('Prepare rollback procedure for rapid recovery if needed');
        recs.push('Schedule cutover during low-usage period');
        recs.push('Test with real data flows before full production deployment');
    }

    saveComprehensiveReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportData = {
            timestamp: new Date().toISOString(),
            user: 'Christian',
            agent: 'Agent 5 - API Compatibility Verification',
            mission: 'Phase 4 Migration Cutover Readiness Assessment',
            findings: this.findings,
            conclusion: {
                ready_for_cutover: this.findings.overall.ready_for_cutover,
                confidence_level: this.findings.overall.confidence_level,
                primary_recommendation: this.findings.overall.ready_for_cutover ? 
                    'Proceed with cutover' : 'Resolve critical issues first'
            }
        };

        const filename = `phase4-cutover-assessment-${timestamp}.json`;
        require('fs').writeFileSync(filename, JSON.stringify(reportData, null, 2));
        console.log(`\n📄 Comprehensive assessment saved: ${filename}`);
    }
}

// Execute Assessment
async function main() {
    const reporter = new ComprehensiveAPIReport();
    const results = await reporter.generateReport();
    
    // Exit with appropriate code for automation
    process.exit(results.overall.ready_for_cutover ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ComprehensiveAPIReport;
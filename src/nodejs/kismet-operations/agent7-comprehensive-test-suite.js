#!/usr/bin/env node

/**
 * Agent 7 - Comprehensive Testing Framework
 * Testing and validation for Node.js migration completion
 * 
 * This script performs comprehensive testing of:
 * 1. Endpoint Testing: All available endpoints on ports 8092, 8000
 * 2. Root Route Testing: Specifically test "/" route fixes  
 * 3. Frontend Functionality: Web interface validation
 * 4. Cross-Service Testing: Compare behavior with other services
 * 5. Integration Testing: End-to-end spectrum analyzer validation
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class Agent7ComprehensiveTestSuite {
    constructor() {
        this.services = {
            spectrum: { 
                url: 'http://localhost:8092', 
                name: 'Spectrum Analyzer',
                websocket: 'ws://localhost:8092/socket.io/?EIO=4&transport=websocket'
            },
            wigleToTak: { 
                url: 'http://localhost:8000', 
                name: 'WigleToTAK',
                websocket: null 
            },
            comparison: { 
                url: 'http://localhost:3007', 
                name: 'Comparison Service',
                websocket: null 
            }
        };
        
        this.testResults = {
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            },
            tests: [],
            performance: {},
            integrationStatus: 'PENDING'
        };
        
        this.startTime = Date.now();
        console.log('🔬 Agent 7 - Comprehensive Testing Framework Initialized');
        console.log('⏰ Test Suite Started:', new Date().toISOString());
    }

    async runComprehensiveTests() {
        console.log('\n🚀 Starting Comprehensive Test Suite...\n');
        
        try {
            // Phase 1: Service Discovery and Health Checks
            await this.discoverServices();
            
            // Phase 2: Endpoint Testing (Primary Mission)
            await this.testAllEndpoints();
            
            // Phase 3: Root Route Testing (Critical Fix Validation)
            await this.testRootRoutes();
            
            // Phase 4: Frontend Functionality Testing
            await this.testFrontendFunctionality();
            
            // Phase 5: Cross-Service Comparison Testing
            await this.performCrossServiceTesting();
            
            // Phase 6: Integration Testing (End-to-End)
            await this.performIntegrationTesting();
            
            // Phase 7: Performance Validation
            await this.performanceValidation();
            
            // Phase 8: WebSocket Testing
            await this.testWebSocketConnections();
            
            // Generate Final Report
            await this.generateComprehensiveReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.testResults.integrationStatus = 'FAILED';
            await this.generateFailureReport(error);
        }
    }

    async discoverServices() {
        console.log('🔍 Phase 1: Service Discovery and Health Checks');
        
        for (const [serviceName, service] of Object.entries(this.services)) {
            try {
                const start = performance.now();
                const response = await axios.get(service.url, { 
                    timeout: 5000,
                    validateStatus: () => true // Accept all status codes
                });
                const responseTime = performance.now() - start;
                
                const healthStatus = {
                    service: serviceName,
                    url: service.url,
                    status: response.status,
                    responseTime: Math.round(responseTime),
                    healthy: response.status >= 200 && response.status < 400,
                    headers: response.headers,
                    timestamp: new Date().toISOString()
                };
                
                this.recordTest({
                    phase: 'Discovery',
                    test: `${service.name} Health Check`,
                    status: healthStatus.healthy ? 'PASS' : 'FAIL',
                    details: healthStatus,
                    critical: true
                });
                
                console.log(`  ${healthStatus.healthy ? '✅' : '❌'} ${service.name}: ${response.status} (${Math.round(responseTime)}ms)`);
                
            } catch (error) {
                this.recordTest({
                    phase: 'Discovery',
                    test: `${service.name} Health Check`,
                    status: 'FAIL',
                    error: error.message,
                    critical: true
                });
                console.log(`  ❌ ${service.name}: Connection failed - ${error.message}`);
            }
        }
        console.log('');
    }

    async testAllEndpoints() {
        console.log('🎯 Phase 2: Comprehensive Endpoint Testing');
        
        // Test Spectrum Analyzer Endpoints
        await this.testSpectrumAnalyzerEndpoints();
        
        // Test WigleToTAK Endpoints  
        await this.testWigleToTakEndpoints();
        
        console.log('');
    }

    async testSpectrumAnalyzerEndpoints() {
        console.log('  📡 Testing Spectrum Analyzer Endpoints...');
        
        const endpoints = [
            { method: 'GET', path: '/', description: 'Root route (HTML interface)' },
            { method: 'GET', path: '/api/status', description: 'System status' },
            { method: 'GET', path: '/api/profiles', description: 'Scan profiles' },
            { method: 'GET', path: '/api/scan/vhf', description: 'VHF scan' },
            { method: 'GET', path: '/api/scan/uhf', description: 'UHF scan' },
            { method: 'GET', path: '/api/scan/ism', description: 'ISM scan' },
            { method: 'GET', path: '/api/config', description: 'Configuration' },
            { method: 'GET', path: '/health', description: 'Health check' }
        ];
        
        for (const endpoint of endpoints) {
            await this.testEndpoint('spectrum', endpoint);
        }
    }

    async testWigleToTakEndpoints() {
        console.log('  📶 Testing WigleToTAK Endpoints...');
        
        const endpoints = [
            { method: 'GET', path: '/', description: 'Root route (HTML interface)' },
            { method: 'GET', path: '/api/status', description: 'Service status' },
            { method: 'GET', path: '/list_wigle_files', description: 'List CSV files' },
            { method: 'POST', path: '/update_tak_settings', description: 'Update TAK settings', 
              data: { tak_server_ip: '192.168.1.100', tak_server_port: '6969' }},
            { method: 'POST', path: '/update_multicast_state', description: 'Toggle multicast',
              data: { takMulticast: true }},
            { method: 'POST', path: '/update_analysis_mode', description: 'Set analysis mode',
              data: { mode: 'realtime' }},
            { method: 'GET', path: '/health', description: 'Health check' }
        ];
        
        for (const endpoint of endpoints) {
            await this.testEndpoint('wigleToTak', endpoint);
        }
    }

    async testEndpoint(serviceName, endpoint) {
        const service = this.services[serviceName];
        const url = `${service.url}${endpoint.path}`;
        
        try {
            const start = performance.now();
            const config = {
                method: endpoint.method,
                url: url,
                timeout: 10000,
                validateStatus: () => true,
                headers: {
                    'User-Agent': 'Agent7-TestSuite/1.0',
                    'Accept': '*/*'
                }
            };
            
            if (endpoint.data) {
                config.data = endpoint.data;
                config.headers['Content-Type'] = 'application/json';
            }
            
            const response = await axios(config);
            const responseTime = performance.now() - start;
            
            const success = response.status >= 200 && response.status < 400;
            const testResult = {
                phase: 'Endpoints',
                test: `${endpoint.method} ${endpoint.path}`,
                service: serviceName,
                status: success ? 'PASS' : 'FAIL',
                details: {
                    url: url,
                    method: endpoint.method,
                    status: response.status,
                    responseTime: Math.round(responseTime),
                    contentType: response.headers['content-type'],
                    contentLength: response.headers['content-length'],
                    hasData: !!response.data,
                    description: endpoint.description
                }
            };
            
            // Special validation for root routes
            if (endpoint.path === '/') {
                testResult.details.isHTML = (response.headers['content-type'] || '').includes('text/html');
                testResult.details.hasBody = response.data && response.data.length > 0;
                testResult.critical = true; // Root route is critical
            }
            
            this.recordTest(testResult);
            
            const statusIcon = success ? '✅' : '❌';
            console.log(`    ${statusIcon} ${endpoint.method} ${endpoint.path} - ${response.status} (${Math.round(responseTime)}ms)`);
            
        } catch (error) {
            this.recordTest({
                phase: 'Endpoints',
                test: `${endpoint.method} ${endpoint.path}`,
                service: serviceName,
                status: 'FAIL',
                error: error.message,
                critical: endpoint.path === '/'
            });
            console.log(`    ❌ ${endpoint.method} ${endpoint.path} - Error: ${error.message}`);
        }
    }

    async testRootRoutes() {
        console.log('🏠 Phase 3: Root Route Testing (Critical Fix Validation)');
        
        for (const [serviceName, service] of Object.entries(this.services)) {
            if (serviceName === 'comparison') continue; // Skip comparison service for root route tests
            
            console.log(`  Testing ${service.name} root route...`);
            
            try {
                const response = await axios.get(service.url, {
                    timeout: 10000,
                    validateStatus: () => true
                });
                
                const isHTML = (response.headers['content-type'] || '').includes('text/html');
                const hasContent = response.data && response.data.length > 0;
                const validStatus = response.status === 200;
                
                const rootRouteTest = {
                    phase: 'RootRoute',
                    test: `${service.name} Root Route Fix`,
                    service: serviceName,
                    status: (validStatus && isHTML && hasContent) ? 'PASS' : 'FAIL',
                    details: {
                        status: response.status,
                        isHTML: isHTML,
                        hasContent: hasContent,
                        contentLength: response.data ? response.data.length : 0,
                        contentType: response.headers['content-type']
                    },
                    critical: true
                };
                
                this.recordTest(rootRouteTest);
                
                const status = (validStatus && isHTML && hasContent) ? '✅' : '❌';
                console.log(`    ${status} Root route: Status ${response.status}, HTML: ${isHTML}, Content: ${hasContent}`);
                
                // Additional validation for spectrum analyzer
                if (serviceName === 'spectrum' && response.data) {
                    const hasSpectrumTitle = response.data.includes('Spectrum') || response.data.includes('spectrum');
                    const hasWebSocketCode = response.data.includes('socket.io') || response.data.includes('WebSocket');
                    
                    console.log(`    📊 Spectrum-specific checks: Title: ${hasSpectrumTitle}, WebSocket: ${hasWebSocketCode}`);
                }
                
            } catch (error) {
                this.recordTest({
                    phase: 'RootRoute',
                    test: `${service.name} Root Route Fix`,
                    service: serviceName,
                    status: 'FAIL',
                    error: error.message,
                    critical: true
                });
                console.log(`    ❌ Root route test failed: ${error.message}`);
            }
        }
        console.log('');
    }

    async testFrontendFunctionality() {
        console.log('🖥️  Phase 4: Frontend Functionality Testing');
        
        // Test static assets
        await this.testStaticAssets();
        
        // Test HTML content validity
        await this.testHTMLContent();
        
        console.log('');
    }

    async testStaticAssets() {
        console.log('  🎨 Testing Static Assets...');
        
        const assetTests = [
            { service: 'spectrum', path: '/css/spectrum.css', type: 'CSS' },
            { service: 'spectrum', path: '/js/spectrum.js', type: 'JavaScript' },
            { service: 'wigleToTak', path: '/css/wigle-to-tak.css', type: 'CSS' },
            { service: 'wigleToTak', path: '/js/wigle-to-tak.js', type: 'JavaScript' }
        ];
        
        for (const asset of assetTests) {
            const service = this.services[asset.service];
            try {
                const response = await axios.get(`${service.url}${asset.path}`, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                const success = response.status === 200;
                this.recordTest({
                    phase: 'Frontend',
                    test: `${asset.type} Asset`,
                    service: asset.service,
                    status: success ? 'PASS' : 'FAIL',
                    details: {
                        path: asset.path,
                        status: response.status,
                        contentType: response.headers['content-type'],
                        size: response.data ? response.data.length : 0
                    }
                });
                
                const statusIcon = success ? '✅' : '❌';
                console.log(`    ${statusIcon} ${asset.type}: ${asset.path} - ${response.status}`);
                
            } catch (error) {
                this.recordTest({
                    phase: 'Frontend',
                    test: `${asset.type} Asset`,
                    service: asset.service,
                    status: 'FAIL',
                    error: error.message
                });
                console.log(`    ❌ ${asset.type}: ${asset.path} - Error: ${error.message}`);
            }
        }
    }

    async testHTMLContent() {
        console.log('  📄 Testing HTML Content Validity...');
        
        for (const [serviceName, service] of Object.entries(this.services)) {
            if (serviceName === 'comparison') continue;
            
            try {
                const response = await axios.get(service.url);
                const html = response.data;
                
                const validations = {
                    hasDoctype: html.includes('<!DOCTYPE'),
                    hasHtmlTag: html.includes('<html'),
                    hasHead: html.includes('<head>'),
                    hasBody: html.includes('<body>'),
                    hasTitle: html.includes('<title>'),
                    hasMetaTags: html.includes('<meta'),
                    hasScripts: html.includes('<script'),
                    hasStyles: html.includes('<style') || html.includes('.css')
                };
                
                const validCount = Object.values(validations).filter(Boolean).length;
                const totalChecks = Object.keys(validations).length;
                const validityScore = (validCount / totalChecks) * 100;
                
                this.recordTest({
                    phase: 'Frontend',
                    test: `${service.name} HTML Validity`,
                    service: serviceName,
                    status: validityScore >= 75 ? 'PASS' : (validityScore >= 50 ? 'WARN' : 'FAIL'),
                    details: {
                        validityScore: Math.round(validityScore),
                        validations: validations,
                        contentLength: html.length
                    }
                });
                
                const statusIcon = validityScore >= 75 ? '✅' : (validityScore >= 50 ? '⚠️' : '❌');
                console.log(`    ${statusIcon} ${service.name} HTML validity: ${Math.round(validityScore)}%`);
                
            } catch (error) {
                this.recordTest({
                    phase: 'Frontend',
                    test: `${service.name} HTML Validity`,
                    service: serviceName,
                    status: 'FAIL',
                    error: error.message
                });
                console.log(`    ❌ ${service.name} HTML validity test failed: ${error.message}`);
            }
        }
    }

    async performCrossServiceTesting() {
        console.log('🔄 Phase 5: Cross-Service Comparison Testing');
        
        // Compare response formats between services
        await this.compareServiceResponses();
        
        // Test service interdependencies
        await this.testServiceInterdependencies();
        
        console.log('');
    }

    async compareServiceResponses() {
        console.log('  ⚖️  Comparing Service Response Formats...');
        
        const commonEndpoints = ['/api/status', '/health'];
        
        for (const endpoint of commonEndpoints) {
            const responses = {};
            
            for (const [serviceName, service] of Object.entries(this.services)) {
                try {
                    const response = await axios.get(`${service.url}${endpoint}`, {
                        timeout: 5000,
                        validateStatus: () => true
                    });
                    
                    responses[serviceName] = {
                        status: response.status,
                        data: response.data,
                        headers: response.headers
                    };
                } catch (error) {
                    responses[serviceName] = { error: error.message };
                }
            }
            
            // Analyze response consistency
            const statuses = Object.values(responses).map(r => r.status).filter(Boolean);
            const consistentStatus = statuses.length > 0 && statuses.every(s => s === statuses[0]);
            
            this.recordTest({
                phase: 'CrossService',
                test: `Response Consistency ${endpoint}`,
                status: consistentStatus ? 'PASS' : 'WARN',
                details: {
                    endpoint: endpoint,
                    responses: responses,
                    consistentStatus: consistentStatus
                }
            });
            
            const statusIcon = consistentStatus ? '✅' : '⚠️';
            console.log(`    ${statusIcon} ${endpoint} response consistency: ${consistentStatus}`);
        }
    }

    async testServiceInterdependencies() {
        console.log('  🔗 Testing Service Interdependencies...');
        
        // Test if spectrum analyzer can connect to external dependencies
        try {
            const spectrumStatus = await axios.get(`${this.services.spectrum.url}/api/status`);
            
            if (spectrumStatus.data) {
                const dependencies = {
                    openwebrx_connected: spectrumStatus.data.openwebrx_connected,
                    real_data: spectrumStatus.data.real_data,
                    config_loaded: !!spectrumStatus.data.config
                };
                
                this.recordTest({
                    phase: 'CrossService',
                    test: 'Spectrum Analyzer Dependencies',
                    status: dependencies.openwebrx_connected ? 'PASS' : 'WARN',
                    details: dependencies
                });
                
                const statusIcon = dependencies.openwebrx_connected ? '✅' : '⚠️';
                console.log(`    ${statusIcon} OpenWebRX connection: ${dependencies.openwebrx_connected}`);
                console.log(`    📡 Real data mode: ${dependencies.real_data}`);
                console.log(`    ⚙️  Config loaded: ${dependencies.config_loaded}`);
            }
        } catch (error) {
            this.recordTest({
                phase: 'CrossService',
                test: 'Spectrum Analyzer Dependencies',
                status: 'FAIL',
                error: error.message
            });
            console.log(`    ❌ Dependency test failed: ${error.message}`);
        }
    }

    async performIntegrationTesting() {
        console.log('🔧 Phase 6: End-to-End Integration Testing');
        
        // Test complete spectrum analysis workflow
        await this.testSpectrumAnalysisWorkflow();
        
        // Test WigleToTAK processing workflow
        await this.testWigleToTakWorkflow();
        
        console.log('');
    }

    async testSpectrumAnalysisWorkflow() {
        console.log('  📊 Testing Spectrum Analysis Workflow...');
        
        try {
            // Step 1: Get available profiles
            const profilesResponse = await axios.get(`${this.services.spectrum.url}/api/profiles`);
            const profiles = profilesResponse.data;
            
            console.log(`    ✅ Profiles loaded: ${Object.keys(profiles).length} available`);
            
            // Step 2: Test each profile scan
            for (const profileId of Object.keys(profiles)) {
                try {
                    const scanResponse = await axios.get(`${this.services.spectrum.url}/api/scan/${profileId}`, {
                        timeout: 15000 // Longer timeout for scan operations
                    });
                    
                    const scanData = scanResponse.data;
                    const hasSignals = scanData.signals && Array.isArray(scanData.signals);
                    
                    this.recordTest({
                        phase: 'Integration',
                        test: `Spectrum Scan ${profileId.toUpperCase()}`,
                        status: hasSignals ? 'PASS' : 'WARN',
                        details: {
                            profile: profileId,
                            signalCount: hasSignals ? scanData.signals.length : 0,
                            realData: scanData.real_data,
                            scanTime: scanData.scan_time
                        }
                    });
                    
                    const statusIcon = hasSignals ? '✅' : '⚠️';
                    console.log(`    ${statusIcon} ${profileId.toUpperCase()} scan: ${hasSignals ? scanData.signals.length : 0} signals`);
                    
                } catch (error) {
                    this.recordTest({
                        phase: 'Integration',
                        test: `Spectrum Scan ${profileId.toUpperCase()}`,
                        status: 'FAIL',
                        error: error.message
                    });
                    console.log(`    ❌ ${profileId.toUpperCase()} scan failed: ${error.message}`);
                }
            }
            
        } catch (error) {
            this.recordTest({
                phase: 'Integration',
                test: 'Spectrum Analysis Workflow',
                status: 'FAIL',
                error: error.message
            });
            console.log(`    ❌ Spectrum workflow test failed: ${error.message}`);
        }
    }

    async testWigleToTakWorkflow() {
        console.log('  📶 Testing WigleToTAK Processing Workflow...');
        
        try {
            // Test TAK settings update
            const takSettings = {
                tak_server_ip: '192.168.1.100',
                tak_server_port: '6969'
            };
            
            const settingsResponse = await axios.post(
                `${this.services.wigleToTak.url}/update_tak_settings`,
                takSettings,
                { headers: { 'Content-Type': 'application/json' } }
            );
            
            console.log(`    ✅ TAK settings update: ${settingsResponse.status}`);
            
            // Test multicast state toggle
            const multicastResponse = await axios.post(
                `${this.services.wigleToTak.url}/update_multicast_state`,
                { takMulticast: true },
                { headers: { 'Content-Type': 'application/json' } }
            );
            
            console.log(`    ✅ Multicast toggle: ${multicastResponse.status}`);
            
            // Test file listing
            const filesResponse = await axios.get(`${this.services.wigleToTak.url}/list_wigle_files`);
            
            this.recordTest({
                phase: 'Integration',
                test: 'WigleToTAK Configuration Workflow',
                status: 'PASS',
                details: {
                    takSettingsStatus: settingsResponse.status,
                    multicastStatus: multicastResponse.status,
                    fileListStatus: filesResponse.status,
                    availableFiles: filesResponse.data ? filesResponse.data.files : []
                }
            });
            
            console.log(`    ✅ Configuration workflow completed successfully`);
            
        } catch (error) {
            this.recordTest({
                phase: 'Integration',
                test: 'WigleToTAK Configuration Workflow',
                status: 'FAIL',
                error: error.message
            });
            console.log(`    ❌ WigleToTAK workflow test failed: ${error.message}`);
        }
    }

    async performanceValidation() {
        console.log('⚡ Phase 7: Performance Validation');
        
        await this.measureResponseTimes();
        await this.testConcurrentRequests();
        
        console.log('');
    }

    async measureResponseTimes() {
        console.log('  ⏱️  Measuring Response Times...');
        
        const endpoints = [
            { service: 'spectrum', path: '/api/status' },
            { service: 'spectrum', path: '/api/profiles' },
            { service: 'wigleToTak', path: '/api/status' },
            { service: 'wigleToTak', path: '/list_wigle_files' }
        ];
        
        for (const endpoint of endpoints) {
            const service = this.services[endpoint.service];
            const measurements = [];
            
            // Take 5 measurements
            for (let i = 0; i < 5; i++) {
                try {
                    const start = performance.now();
                    await axios.get(`${service.url}${endpoint.path}`, { timeout: 5000 });
                    const responseTime = performance.now() - start;
                    measurements.push(responseTime);
                    
                    // Small delay between requests
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.log(`    ❌ Performance test failed for ${endpoint.path}: ${error.message}`);
                }
            }
            
            if (measurements.length > 0) {
                const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                const minTime = Math.min(...measurements);
                const maxTime = Math.max(...measurements);
                
                this.recordTest({
                    phase: 'Performance',
                    test: `Response Time ${endpoint.path}`,
                    service: endpoint.service,
                    status: avgTime < 100 ? 'PASS' : (avgTime < 500 ? 'WARN' : 'FAIL'),
                    details: {
                        averageMs: Math.round(avgTime),
                        minMs: Math.round(minTime),
                        maxMs: Math.round(maxTime),
                        measurements: measurements.map(m => Math.round(m))
                    }
                });
                
                const statusIcon = avgTime < 100 ? '✅' : (avgTime < 500 ? '⚠️' : '❌');
                console.log(`    ${statusIcon} ${endpoint.path}: avg ${Math.round(avgTime)}ms (${Math.round(minTime)}-${Math.round(maxTime)}ms)`);
            }
        }
    }

    async testConcurrentRequests() {
        console.log('  🔄 Testing Concurrent Request Handling...');
        
        const concurrentCount = 10;
        const testUrl = `${this.services.spectrum.url}/api/status`;
        
        try {
            const start = performance.now();
            const promises = Array(concurrentCount).fill().map(() =>
                axios.get(testUrl, { timeout: 10000 })
            );
            
            const results = await Promise.allSettled(promises);
            const responseTime = performance.now() - start;
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            this.recordTest({
                phase: 'Performance',
                test: 'Concurrent Request Handling',
                status: successful >= concurrentCount * 0.8 ? 'PASS' : 'FAIL',
                details: {
                    concurrent: concurrentCount,
                    successful: successful,
                    failed: failed,
                    totalTimeMs: Math.round(responseTime),
                    averageTimeMs: Math.round(responseTime / concurrentCount)
                }
            });
            
            const statusIcon = successful >= concurrentCount * 0.8 ? '✅' : '❌';
            console.log(`    ${statusIcon} Concurrent requests: ${successful}/${concurrentCount} successful in ${Math.round(responseTime)}ms`);
            
        } catch (error) {
            this.recordTest({
                phase: 'Performance',
                test: 'Concurrent Request Handling',
                status: 'FAIL',
                error: error.message
            });
            console.log(`    ❌ Concurrent request test failed: ${error.message}`);
        }
    }

    async testWebSocketConnections() {
        console.log('🔌 Phase 8: WebSocket Connection Testing');
        
        // Test spectrum analyzer WebSocket
        await this.testSpectrumWebSocket();
        
        console.log('');
    }

    async testSpectrumWebSocket() {
        console.log('  📡 Testing Spectrum Analyzer WebSocket...');
        
        return new Promise((resolve) => {
            const ws = new WebSocket(this.services.spectrum.websocket);
            const timeout = setTimeout(() => {
                ws.close();
                this.recordTest({
                    phase: 'WebSocket',
                    test: 'Spectrum Analyzer WebSocket',
                    status: 'FAIL',
                    error: 'Connection timeout'
                });
                console.log('    ❌ WebSocket connection timeout');
                resolve();
            }, 10000);
            
            let messagesReceived = 0;
            
            ws.on('open', () => {
                console.log('    ✅ WebSocket connected');
                
                // Send test message
                ws.send('40'); // Socket.IO handshake
            });
            
            ws.on('message', (data) => {
                messagesReceived++;
                console.log(`    📨 Message ${messagesReceived}: ${data.toString().substring(0, 50)}...`);
                
                if (messagesReceived >= 2) {
                    clearTimeout(timeout);
                    ws.close();
                    
                    this.recordTest({
                        phase: 'WebSocket',
                        test: 'Spectrum Analyzer WebSocket',
                        status: 'PASS',
                        details: {
                            messagesReceived: messagesReceived,
                            connectionSuccessful: true
                        }
                    });
                    
                    console.log('    ✅ WebSocket test completed successfully');
                    resolve();
                }
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                this.recordTest({
                    phase: 'WebSocket',
                    test: 'Spectrum Analyzer WebSocket',
                    status: 'FAIL',
                    error: error.message
                });
                console.log(`    ❌ WebSocket error: ${error.message}`);
                resolve();
            });
            
            ws.on('close', () => {
                console.log('    🔌 WebSocket connection closed');
                if (messagesReceived === 0) {
                    clearTimeout(timeout);
                    this.recordTest({
                        phase: 'WebSocket',
                        test: 'Spectrum Analyzer WebSocket',
                        status: 'FAIL',
                        error: 'No messages received'
                    });
                    resolve();
                }
            });
        });
    }

    recordTest(testResult) {
        this.testResults.tests.push({
            ...testResult,
            timestamp: new Date().toISOString()
        });
        
        this.testResults.summary.total++;
        
        switch (testResult.status) {
            case 'PASS':
                this.testResults.summary.passed++;
                break;
            case 'FAIL':
                this.testResults.summary.failed++;
                break;
            case 'WARN':
                this.testResults.summary.warnings++;
                break;
        }
    }

    async generateComprehensiveReport() {
        console.log('📋 Generating Comprehensive Test Report...\n');
        
        const duration = Date.now() - this.startTime;
        const successRate = (this.testResults.summary.passed / this.testResults.summary.total) * 100;
        
        // Determine overall status
        const criticalFailures = this.testResults.tests.filter(t => t.status === 'FAIL' && t.critical).length;
        let overallStatus = 'PASS';
        
        if (criticalFailures > 0) {
            overallStatus = 'CRITICAL_FAIL';
        } else if (this.testResults.summary.failed > 0) {
            overallStatus = 'FAIL';
        } else if (this.testResults.summary.warnings > 0) {
            overallStatus = 'PASS_WITH_WARNINGS';
        }
        
        this.testResults.integrationStatus = overallStatus;
        this.testResults.performance.duration = duration;
        this.testResults.performance.successRate = Math.round(successRate);
        
        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                agent: 'Agent 7 - Comprehensive Test Suite',
                version: '1.0.0',
                duration: `${Math.round(duration / 1000)}s`,
                services_tested: Object.keys(this.services).length
            },
            summary: {
                ...this.testResults.summary,
                successRate: `${Math.round(successRate)}%`,
                overallStatus: overallStatus,
                criticalFailures: criticalFailures
            },
            results: this.testResults.tests,
            recommendations: this.generateRecommendations()
        };
        
        // Save detailed report
        const reportPath = path.join(__dirname, `agent7-test-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Display summary
        console.log('='.repeat(80));
        console.log('🔬 AGENT 7 - COMPREHENSIVE TEST RESULTS');
        console.log('='.repeat(80));
        console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
        console.log(`📊 Tests: ${this.testResults.summary.total} total`);
        console.log(`✅ Passed: ${this.testResults.summary.passed}`);
        console.log(`❌ Failed: ${this.testResults.summary.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.summary.warnings}`);
        console.log(`📈 Success Rate: ${Math.round(successRate)}%`);
        console.log(`🎯 Overall Status: ${overallStatus}`);
        
        if (criticalFailures > 0) {
            console.log(`🚨 Critical Failures: ${criticalFailures}`);
        }
        
        console.log(`\n📁 Detailed report saved: ${reportPath}`);
        
        // Display phase summary
        const phases = [...new Set(this.testResults.tests.map(t => t.phase))];
        console.log('\n📋 Phase Summary:');
        for (const phase of phases) {
            const phaseTests = this.testResults.tests.filter(t => t.phase === phase);
            const phasePass = phaseTests.filter(t => t.status === 'PASS').length;
            const phaseFail = phaseTests.filter(t => t.status === 'FAIL').length;
            const phaseWarn = phaseTests.filter(t => t.status === 'WARN').length;
            
            console.log(`  ${phase}: ${phasePass}✅ ${phaseFail}❌ ${phaseWarn}⚠️`);
        }
        
        // Display critical issues
        const criticalIssues = this.testResults.tests.filter(t => t.status === 'FAIL' && t.critical);
        if (criticalIssues.length > 0) {
            console.log('\n🚨 Critical Issues:');
            for (const issue of criticalIssues) {
                console.log(`  ❌ ${issue.test}: ${issue.error || 'Failed validation'}`);
            }
        }
        
        console.log('\n' + '='.repeat(80));
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check for critical failures
        const criticalFailures = this.testResults.tests.filter(t => t.status === 'FAIL' && t.critical);
        if (criticalFailures.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Critical',
                issue: 'Critical system failures detected',
                action: 'Investigate and fix critical failures immediately before proceeding'
            });
        }
        
        // Check performance issues
        const slowResponses = this.testResults.tests.filter(t => 
            t.phase === 'Performance' && t.details && t.details.averageMs > 500
        );
        if (slowResponses.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Performance',
                issue: 'Slow response times detected',
                action: 'Optimize slow endpoints for better performance'
            });
        }
        
        // Check WebSocket issues
        const websocketFailures = this.testResults.tests.filter(t => 
            t.phase === 'WebSocket' && t.status === 'FAIL'
        );
        if (websocketFailures.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'WebSocket',
                issue: 'WebSocket connection failures',
                action: 'Check WebSocket configuration and network connectivity'
            });
        }
        
        // Check dependency issues
        const dependencyIssues = this.testResults.tests.filter(t => 
            t.test.includes('Dependencies') && t.status !== 'PASS'
        );
        if (dependencyIssues.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Dependencies',
                issue: 'External dependency issues detected',
                action: 'Verify OpenWebRX and other external services are running correctly'
            });
        }
        
        return recommendations;
    }

    async generateFailureReport(error) {
        const failureReport = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            partialResults: this.testResults,
            status: 'SUITE_FAILURE'
        };
        
        const reportPath = path.join(__dirname, `agent7-failure-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(failureReport, null, 2));
        
        console.log('\n' + '='.repeat(80));
        console.log('❌ AGENT 7 - TEST SUITE FAILURE');
        console.log('='.repeat(80));
        console.log(`Error: ${error.message}`);
        console.log(`Failure report saved: ${reportPath}`);
        console.log('='.repeat(80));
    }
}

// Run the comprehensive test suite
if (require.main === module) {
    const testSuite = new Agent7ComprehensiveTestSuite();
    testSuite.runComprehensiveTests()
        .then(() => {
            console.log('\n🎉 Agent 7 Test Suite completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Agent 7 Test Suite failed:', error.message);
            process.exit(1);
        });
}

module.exports = Agent7ComprehensiveTestSuite;
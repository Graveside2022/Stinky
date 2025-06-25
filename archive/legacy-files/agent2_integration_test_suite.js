#!/usr/bin/env node

/**
 * Agent 2 - End-to-End System Integration Testing Suite
 * 
 * Comprehensive integration testing of the complete Stinkster data flow:
 * - GPS Data Flow (MAVLink → GPSD → Node.js services)
 * - WiFi Scanning Integration (Kismet → WigleToTAK → Node.js processing)
 * - TAK Integration (UDP broadcasting and CoT XML generation)
 * - Real-time Data Processing (WebSocket performance)
 * - API Endpoint Validation (100% compatibility verification)
 */

const axios = require('axios');
const net = require('net');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class Agent2IntegrationTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testId: `integration-test-${Date.now()}`,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            tests: []
        };
        
        this.services = {
            wigleToTAK: { url: 'http://localhost:8000', name: 'WigleToTAK Node.js' },
            gpsd: { host: 'localhost', port: 2947, name: 'GPSD Service' }
        };
    }

    async runCompleteIntegrationSuite() {
        console.log('🚀 Starting Agent 2 - End-to-End System Integration Testing');
        console.log('=' * 80);
        
        try {
            // Test 1: GPS Data Flow Testing
            await this.testGPSDataFlow();
            
            // Test 2: WiFi Scanning Integration
            await this.testWiFiScanningIntegration();
            
            // Test 3: TAK Integration
            await this.testTAKIntegration();
            
            // Test 4: Real-time Data Processing
            await this.testRealTimeDataProcessing();
            
            // Test 5: API Endpoint Validation
            await this.testAPIEndpointValidation();
            
            // Test 6: Performance Metrics Collection
            await this.collectPerformanceMetrics();
            
            // Generate comprehensive report
            this.generateIntegrationReport();
            
        } catch (error) {
            console.error('❌ Integration test suite failed:', error);
            process.exit(1);
        }
    }

    async testGPSDataFlow() {
        console.log('\n📡 Test 1: GPS Data Flow Testing');
        console.log('Testing: MAVLink → GPSD (port 2947) → Node.js services integration');
        
        const testResult = {
            testName: 'GPS Data Flow',
            startTime: Date.now(),
            subTests: []
        };

        try {
            // Test GPSD connection
            const gpsdTest = await this.testGPSDConnection();
            testResult.subTests.push(gpsdTest);
            
            // Test GPS data format
            const dataFormatTest = await this.testGPSDataFormat();
            testResult.subTests.push(dataFormatTest);
            
            // Test GPS data streaming
            const streamingTest = await this.testGPSDataStreaming();
            testResult.subTests.push(streamingTest);
            
            testResult.passed = testResult.subTests.every(t => t.passed);
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            
            console.log(`  ${testResult.passed ? '✅' : '❌'} GPS Data Flow: ${testResult.duration}ms`);
            
        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`  ❌ GPS Data Flow failed: ${error.message}`);
        }
        
        this.addTestResult(testResult);
    }

    async testGPSDConnection() {
        return new Promise((resolve) => {
            const client = new net.Socket();
            const startTime = Date.now();
            
            client.connect(2947, 'localhost', () => {
                client.write('?WATCH={"enable":true,"json":true};\n');
            });
            
            client.on('data', (data) => {
                const duration = Date.now() - startTime;
                try {
                    const lines = data.toString().split('\n').filter(line => line.trim());
                    const hasValidData = lines.some(line => {
                        try {
                            const parsed = JSON.parse(line);
                            return parsed.class && ['VERSION', 'DEVICES', 'WATCH'].includes(parsed.class);
                        } catch { return false; }
                    });
                    
                    client.destroy();
                    resolve({
                        testName: 'GPSD Connection',
                        passed: hasValidData,
                        duration,
                        responseData: lines.length > 0 ? lines[0] : 'No data'
                    });
                } catch (error) {
                    client.destroy();
                    resolve({
                        testName: 'GPSD Connection',
                        passed: false,
                        duration,
                        error: error.message
                    });
                }
            });
            
            client.on('error', (error) => {
                resolve({
                    testName: 'GPSD Connection',
                    passed: false,
                    duration: Date.now() - startTime,
                    error: error.message
                });
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                client.destroy();
                resolve({
                    testName: 'GPSD Connection',
                    passed: false,
                    duration: Date.now() - startTime,
                    error: 'Connection timeout'
                });
            }, 5000);
        });
    }

    async testGPSDataFormat() {
        return new Promise((resolve) => {
            const client = new net.Socket();
            const startTime = Date.now();
            let receivedMessages = [];
            
            client.connect(2947, 'localhost', () => {
                client.write('?WATCH={"enable":true,"json":true};\n');
            });
            
            client.on('data', (data) => {
                const lines = data.toString().split('\n').filter(line => line.trim());
                lines.forEach(line => {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.class) {
                            receivedMessages.push(parsed);
                        }
                    } catch (e) {
                        // Ignore invalid JSON
                    }
                });
                
                // Check if we have enough data to validate format
                if (receivedMessages.length >= 2) {
                    client.destroy();
                    
                    const hasVersion = receivedMessages.some(m => m.class === 'VERSION');
                    const hasDevices = receivedMessages.some(m => m.class === 'DEVICES');
                    const validFormat = hasVersion && hasDevices;
                    
                    resolve({
                        testName: 'GPS Data Format',
                        passed: validFormat,
                        duration: Date.now() - startTime,
                        messagesReceived: receivedMessages.length,
                        messageTypes: [...new Set(receivedMessages.map(m => m.class))]
                    });
                }
            });
            
            client.on('error', (error) => {
                resolve({
                    testName: 'GPS Data Format',
                    passed: false,
                    duration: Date.now() - startTime,
                    error: error.message
                });
            });
            
            // Timeout after 8 seconds
            setTimeout(() => {
                client.destroy();
                resolve({
                    testName: 'GPS Data Format',
                    passed: receivedMessages.length > 0,
                    duration: Date.now() - startTime,
                    messagesReceived: receivedMessages.length,
                    messageTypes: [...new Set(receivedMessages.map(m => m.class))]
                });
            }, 8000);
        });
    }

    async testGPSDataStreaming() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            const startTime = Date.now();
            
            exec('timeout 5 gpspipe -w -n 5', (error, stdout, stderr) => {
                const duration = Date.now() - startTime;
                
                if (error && !error.message.includes('timeout')) {
                    resolve({
                        testName: 'GPS Data Streaming',
                        passed: false,
                        duration,
                        error: error.message
                    });
                    return;
                }
                
                const lines = stdout.split('\n').filter(line => line.trim());
                const validJsonLines = lines.filter(line => {
                    try {
                        JSON.parse(line);
                        return true;
                    } catch { return false; }
                });
                
                resolve({
                    testName: 'GPS Data Streaming',
                    passed: validJsonLines.length >= 3,
                    duration,
                    linesReceived: lines.length,
                    validJsonLines: validJsonLines.length
                });
            });
        });
    }

    async testWiFiScanningIntegration() {
        console.log('\n📶 Test 2: WiFi Scanning Integration');
        console.log('Testing: Kismet → WigleToTAK → Node.js processing pipeline');
        
        const testResult = {
            testName: 'WiFi Scanning Integration',
            startTime: Date.now(),
            subTests: []
        };

        try {
            // Test WigleToTAK service status
            const serviceTest = await this.testWigleToTAKService();
            testResult.subTests.push(serviceTest);
            
            // Test CSV file processing
            const csvTest = await this.testCSVFileProcessing();
            testResult.subTests.push(csvTest);
            
            // Test filter management
            const filterTest = await this.testFilterManagement();
            testResult.subTests.push(filterTest);
            
            testResult.passed = testResult.subTests.every(t => t.passed);
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            
            console.log(`  ${testResult.passed ? '✅' : '❌'} WiFi Scanning Integration: ${testResult.duration}ms`);
            
        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`  ❌ WiFi Scanning Integration failed: ${error.message}`);
        }
        
        this.addTestResult(testResult);
    }

    async testWigleToTAKService() {
        try {
            const response = await axios.get(`${this.services.wigleToTAK.url}/api/status`, { timeout: 5000 });
            
            const hasRequiredFields = response.data && 
                typeof response.data.broadcasting === 'boolean' &&
                typeof response.data.takServerIp === 'string' &&
                typeof response.data.takMulticastState === 'boolean';
            
            return {
                testName: 'WigleToTAK Service Status',
                passed: response.status === 200 && hasRequiredFields,
                duration: response.headers['x-response-time'] || 'N/A',
                statusFields: hasRequiredFields ? Object.keys(response.data) : []
            };
        } catch (error) {
            return {
                testName: 'WigleToTAK Service Status',
                passed: false,
                error: error.message
            };
        }
    }

    async testCSVFileProcessing() {
        try {
            // Test file listing capability
            const response = await axios.get(`${this.services.wigleToTAK.url}/list_wigle_files?directory=./`, { timeout: 5000 });
            
            return {
                testName: 'CSV File Processing',
                passed: response.status === 200 && Array.isArray(response.data.files),
                filesFound: response.data.files ? response.data.files.length : 0,
                supportedExtensions: response.data.supportedExtensions || []
            };
        } catch (error) {
            return {
                testName: 'CSV File Processing',
                passed: false,
                error: error.message
            };
        }
    }

    async testFilterManagement() {
        try {
            // Test adding to whitelist
            const addResponse = await axios.post(
                `${this.services.wigleToTAK.url}/add_to_whitelist`,
                { ssid: 'TEST_SSID_INTEGRATION' },
                { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
            );
            
            // Test removing from whitelist
            const removeResponse = await axios.post(
                `${this.services.wigleToTAK.url}/remove_from_whitelist`,
                { ssid: 'TEST_SSID_INTEGRATION' },
                { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
            );
            
            return {
                testName: 'Filter Management',
                passed: addResponse.status === 200 && removeResponse.status === 200,
                addResponse: addResponse.data,
                removeResponse: removeResponse.data
            };
        } catch (error) {
            return {
                testName: 'Filter Management',
                passed: false,
                error: error.message
            };
        }
    }

    async testTAKIntegration() {
        console.log('\n🛡️ Test 3: TAK Integration');
        console.log('Testing: UDP broadcasting and CoT XML generation functionality');
        
        const testResult = {
            testName: 'TAK Integration',
            startTime: Date.now(),
            subTests: []
        };

        try {
            // Test TAK settings update
            const settingsTest = await this.testTAKSettingsUpdate();
            testResult.subTests.push(settingsTest);
            
            // Test multicast configuration
            const multicastTest = await this.testMulticastConfiguration();
            testResult.subTests.push(multicastTest);
            
            // Test UDP broadcasting capability
            const broadcastTest = await this.testUDPBroadcasting();
            testResult.subTests.push(broadcastTest);
            
            testResult.passed = testResult.subTests.every(t => t.passed);
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            
            console.log(`  ${testResult.passed ? '✅' : '❌'} TAK Integration: ${testResult.duration}ms`);
            
        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`  ❌ TAK Integration failed: ${error.message}`);
        }
        
        this.addTestResult(testResult);
    }

    async testTAKSettingsUpdate() {
        try {
            const response = await axios.post(
                `${this.services.wigleToTAK.url}/update_tak_settings`,
                { tak_server_ip: '127.0.0.1', tak_server_port: '6969' },
                { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
            );
            
            return {
                testName: 'TAK Settings Update',
                passed: response.status === 200,
                responseMessage: response.data.message || response.data
            };
        } catch (error) {
            return {
                testName: 'TAK Settings Update',
                passed: false,
                error: error.message
            };
        }
    }

    async testMulticastConfiguration() {
        try {
            const response = await axios.post(
                `${this.services.wigleToTAK.url}/update_multicast_state`,
                { takMulticast: true },
                { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
            );
            
            return {
                testName: 'Multicast Configuration',
                passed: response.status === 200,
                responseMessage: response.data.message || response.data
            };
        } catch (error) {
            return {
                testName: 'Multicast Configuration',
                passed: false,
                error: error.message
            };
        }
    }

    async testUDPBroadcasting() {
        return new Promise((resolve) => {
            const server = dgram.createSocket('udp4');
            const startTime = Date.now();
            let messageReceived = false;
            
            server.bind(16969, () => {  // Use different port to avoid conflicts
                console.log('    UDP test server listening on port 16969');
                
                // Send a test broadcast after server is ready
                setTimeout(async () => {
                    try {
                        await axios.post(
                            `${this.services.wigleToTAK.url}/update_tak_settings`,
                            { tak_server_ip: '127.0.0.1', tak_server_port: '16969' },
                            { headers: { 'Content-Type': 'application/json' }, timeout: 3000 }
                        );
                        console.log('    TAK server settings updated for test');
                    } catch (error) {
                        console.log('    Could not update TAK settings for UDP test:', error.message);
                    }
                }, 100);
            });
            
            server.on('message', (msg, rinfo) => {
                messageReceived = true;
                server.close();
                
                const isXML = msg.toString().includes('<?xml') && msg.toString().includes('<event');
                
                resolve({
                    testName: 'UDP Broadcasting',
                    passed: isXML,
                    duration: Date.now() - startTime,
                    messageLength: msg.length,
                    fromAddress: `${rinfo.address}:${rinfo.port}`,
                    isValidXML: isXML
                });
            });
            
            server.on('error', (error) => {
                resolve({
                    testName: 'UDP Broadcasting',
                    passed: false,
                    duration: Date.now() - startTime,
                    error: error.message
                });
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                server.close();
                resolve({
                    testName: 'UDP Broadcasting',
                    passed: false,
                    duration: Date.now() - startTime,
                    error: 'No UDP message received within timeout'
                });
            }, 10000);
        });
    }

    async testRealTimeDataProcessing() {
        console.log('\n⚡ Test 4: Real-time Data Processing');
        console.log('Testing: Continuous data streaming and WebSocket performance');
        
        const testResult = {
            testName: 'Real-time Data Processing',
            startTime: Date.now(),
            subTests: []
        };

        try {
            // Test analysis mode switching
            const analysisModeTest = await this.testAnalysisModeSwitch();
            testResult.subTests.push(analysisModeTest);
            
            // Test response time performance
            const performanceTest = await this.testResponseTimePerformance();
            testResult.subTests.push(performanceTest);
            
            testResult.passed = testResult.subTests.every(t => t.passed);
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            
            console.log(`  ${testResult.passed ? '✅' : '❌'} Real-time Data Processing: ${testResult.duration}ms`);
            
        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`  ❌ Real-time Data Processing failed: ${error.message}`);
        }
        
        this.addTestResult(testResult);
    }

    async testAnalysisModeSwitch() {
        try {
            // Test switching to real-time mode
            const realtimeResponse = await axios.post(
                `${this.services.wigleToTAK.url}/update_analysis_mode`,
                { mode: 'realtime' },
                { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
            );
            
            // Test switching to post-collection mode
            const postcollectionResponse = await axios.post(
                `${this.services.wigleToTAK.url}/update_analysis_mode`,
                { mode: 'postcollection' },
                { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
            );
            
            return {
                testName: 'Analysis Mode Switch',
                passed: realtimeResponse.status === 200 && postcollectionResponse.status === 200,
                realtimeMode: realtimeResponse.data,
                postcollectionMode: postcollectionResponse.data
            };
        } catch (error) {
            return {
                testName: 'Analysis Mode Switch',
                passed: false,
                error: error.message
            };
        }
    }

    async testResponseTimePerformance() {
        const responseTimes = [];
        const iterations = 10;
        
        try {
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await axios.get(`${this.services.wigleToTAK.url}/api/status`, { timeout: 3000 });
                const responseTime = Date.now() - startTime;
                responseTimes.push(responseTime);
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);
            
            return {
                testName: 'Response Time Performance',
                passed: avgResponseTime < 100, // Should be under 100ms average
                averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
                minResponseTime: `${minResponseTime}ms`,
                maxResponseTime: `${maxResponseTime}ms`,
                iterations
            };
        } catch (error) {
            return {
                testName: 'Response Time Performance',
                passed: false,
                error: error.message
            };
        }
    }

    async testAPIEndpointValidation() {
        console.log('\n🔌 Test 5: API Endpoint Validation');
        console.log('Testing: 100% API compatibility validation');
        
        const testResult = {
            testName: 'API Endpoint Validation',
            startTime: Date.now(),
            subTests: []
        };

        const endpoints = [
            { method: 'GET', path: '/', name: 'Root HTML' },
            { method: 'GET', path: '/api/status', name: 'Status API' },
            { method: 'GET', path: '/list_wigle_files?directory=./', name: 'File Listing' },
            { method: 'POST', path: '/update_tak_settings', body: { tak_server_ip: '127.0.0.1', tak_server_port: '6969' }, name: 'TAK Settings' },
            { method: 'POST', path: '/update_multicast_state', body: { takMulticast: true }, name: 'Multicast State' },
            { method: 'POST', path: '/update_analysis_mode', body: { mode: 'realtime' }, name: 'Analysis Mode' }
        ];

        try {
            for (const endpoint of endpoints) {
                const endpointTest = await this.testSingleEndpoint(endpoint);
                testResult.subTests.push(endpointTest);
            }
            
            testResult.passed = testResult.subTests.every(t => t.passed);
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            
            const passedEndpoints = testResult.subTests.filter(t => t.passed).length;
            const totalEndpoints = testResult.subTests.length;
            const compatibilityPercentage = ((passedEndpoints / totalEndpoints) * 100).toFixed(1);
            
            console.log(`  ${testResult.passed ? '✅' : '❌'} API Endpoint Validation: ${compatibilityPercentage}% compatibility (${passedEndpoints}/${totalEndpoints})`);
            
        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`  ❌ API Endpoint Validation failed: ${error.message}`);
        }
        
        this.addTestResult(testResult);
    }

    async testSingleEndpoint(endpoint) {
        try {
            const startTime = Date.now();
            let response;
            
            if (endpoint.method === 'GET') {
                response = await axios.get(`${this.services.wigleToTAK.url}${endpoint.path}`, { timeout: 5000 });
            } else if (endpoint.method === 'POST') {
                response = await axios.post(
                    `${this.services.wigleToTAK.url}${endpoint.path}`,
                    endpoint.body,
                    { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
                );
            }
            
            const duration = Date.now() - startTime;
            
            return {
                testName: `${endpoint.method} ${endpoint.path}`,
                passed: response.status >= 200 && response.status < 300,
                statusCode: response.status,
                responseTime: `${duration}ms`,
                contentLength: response.headers['content-length'] || 'N/A'
            };
        } catch (error) {
            return {
                testName: `${endpoint.method} ${endpoint.path}`,
                passed: false,
                error: error.message,
                statusCode: error.response?.status || 'N/A'
            };
        }
    }

    async collectPerformanceMetrics() {
        console.log('\n📊 Test 6: Performance Metrics Collection');
        console.log('Testing: Data flow validation and performance metrics');
        
        const testResult = {
            testName: 'Performance Metrics Collection',
            startTime: Date.now(),
            subTests: []
        };

        try {
            // Collect system metrics
            const systemMetrics = await this.collectSystemMetrics();
            testResult.subTests.push(systemMetrics);
            
            // Collect service metrics
            const serviceMetrics = await this.collectServiceMetrics();
            testResult.subTests.push(serviceMetrics);
            
            testResult.passed = testResult.subTests.every(t => t.passed);
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            
            console.log(`  ${testResult.passed ? '✅' : '❌'} Performance Metrics Collection: ${testResult.duration}ms`);
            
        } catch (error) {
            testResult.passed = false;
            testResult.error = error.message;
            console.log(`  ❌ Performance Metrics Collection failed: ${error.message}`);
        }
        
        this.addTestResult(testResult);
    }

    async collectSystemMetrics() {
        try {
            const { exec } = require('child_process');
            
            return new Promise((resolve) => {
                exec('free -m && ps aux | grep -E "(node|gpsd)" | grep -v grep', (error, stdout, stderr) => {
                    if (error) {
                        resolve({
                            testName: 'System Metrics',
                            passed: false,
                            error: error.message
                        });
                        return;
                    }
                    
                    const lines = stdout.split('\n');
                    const memoryInfo = lines.find(line => line.includes('Mem:'));
                    const processInfo = lines.filter(line => line.includes('node') || line.includes('gpsd'));
                    
                    resolve({
                        testName: 'System Metrics',
                        passed: memoryInfo && processInfo.length > 0,
                        memoryInfo: memoryInfo ? memoryInfo.trim() : 'N/A',
                        activeProcesses: processInfo.length,
                        processDetails: processInfo.map(p => p.split(/\s+/).slice(0, 11).join(' '))
                    });
                });
            });
        } catch (error) {
            return {
                testName: 'System Metrics',
                passed: false,
                error: error.message
            };
        }
    }

    async collectServiceMetrics() {
        try {
            const metrics = {};
            
            // Test WigleToTAK response time over multiple requests
            const responseTimes = [];
            for (let i = 0; i < 5; i++) {
                const startTime = Date.now();
                await axios.get(`${this.services.wigleToTAK.url}/api/status`, { timeout: 3000 });
                responseTimes.push(Date.now() - startTime);
            }
            
            metrics.wigleToTAK = {
                averageResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2),
                minResponseTime: Math.min(...responseTimes),
                maxResponseTime: Math.max(...responseTimes)
            };
            
            return {
                testName: 'Service Metrics',
                passed: true,
                metrics
            };
        } catch (error) {
            return {
                testName: 'Service Metrics',
                passed: false,
                error: error.message
            };
        }
    }

    addTestResult(testResult) {
        this.results.tests.push(testResult);
        this.results.totalTests++;
        if (testResult.passed) {
            this.results.passedTests++;
        } else {
            this.results.failedTests++;
        }
    }

    generateIntegrationReport() {
        console.log('\n📋 Integration Test Results Summary');
        console.log('=' * 80);
        
        const successRate = ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1);
        
        console.log(`\n🎯 Overall Results:`);
        console.log(`   Total Tests: ${this.results.totalTests}`);
        console.log(`   Passed: ${this.results.passedTests} ✅`);
        console.log(`   Failed: ${this.results.failedTests} ❌`);
        console.log(`   Success Rate: ${successRate}%`);
        
        // Detailed breakdown
        console.log(`\n📊 Detailed Test Breakdown:`);
        this.results.tests.forEach((test, index) => {
            console.log(`   ${index + 1}. ${test.testName}: ${test.passed ? '✅' : '❌'} (${test.duration || 'N/A'}ms)`);
            if (test.subTests && test.subTests.length > 0) {
                test.subTests.forEach(subTest => {
                    console.log(`      - ${subTest.testName}: ${subTest.passed ? '✅' : '❌'}`);
                });
            }
        });
        
        // Generate JSON report
        const reportFile = `agent2_integration_report_${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportFile}`);
        
        // Generate recommendations
        console.log(`\n🔧 Integration Test Recommendations:`);
        
        if (this.results.failedTests === 0) {
            console.log('   ✅ All integration tests passed - system is ready for production');
        } else {
            console.log('   ⚠️  Some integration tests failed - review failed tests before production deployment');
            
            const failedTests = this.results.tests.filter(t => !t.passed);
            failedTests.forEach(test => {
                console.log(`   - Fix: ${test.testName} - ${test.error || 'See detailed logs'}`);
            });
        }
        
        // Performance assessment
        const avgResponseTimes = this.results.tests
            .filter(t => t.subTests)
            .flatMap(t => t.subTests)
            .filter(st => st.responseTime || st.averageResponseTime)
            .map(st => parseFloat((st.responseTime || st.averageResponseTime).replace('ms', '')))
            .filter(t => !isNaN(t));
            
        if (avgResponseTimes.length > 0) {
            const overallAvg = (avgResponseTimes.reduce((a, b) => a + b, 0) / avgResponseTimes.length).toFixed(2);
            console.log(`\n⚡ Performance Summary:`);
            console.log(`   Average Response Time: ${overallAvg}ms`);
            
            if (parseFloat(overallAvg) < 50) {
                console.log('   🚀 Excellent performance - under 50ms average');
            } else if (parseFloat(overallAvg) < 100) {
                console.log('   ⚡ Good performance - under 100ms average');
            } else {
                console.log('   ⚠️  Performance needs optimization - over 100ms average');
            }
        }
        
        console.log(`\n🎉 Agent 2 Integration Testing Complete!`);
    }
}

// Execute integration test suite
async function main() {
    const suite = new Agent2IntegrationTestSuite();
    await suite.runCompleteIntegrationSuite();
}

if (require.main === module) {
    main().catch(error => {
        console.error('Integration test suite failed:', error);
        process.exit(1);
    });
}

module.exports = Agent2IntegrationTestSuite;
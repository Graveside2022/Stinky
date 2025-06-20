#!/usr/bin/env node
/**
 * Performance Baseline Measurement Tool
 * 
 * This script establishes performance baselines for the Flask services
 * before migration to Node.js, providing comparison metrics.
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const os = require('os');

class PerformanceBaseline {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            system_info: {
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                total_memory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
                free_memory: Math.round(os.freemem() / 1024 / 1024) + ' MB',
                node_version: process.version
            },
            services: {},
            summary: {}
        };
        
        this.services = [
            {
                name: 'spectrum_analyzer_flask',
                type: 'flask',
                baseUrl: 'http://localhost:8092',
                port: 8092,
                websocket: 'ws://localhost:8092/socket.io/?EIO=4&transport=websocket'
            },
            {
                name: 'wigle_to_tak_flask',
                type: 'flask', 
                baseUrl: 'http://localhost:8000',
                port: 8000,
                websocket: null
            }
        ];
    }

    async measureAll() {
        console.log('🔬 Starting Performance Baseline Measurement');
        console.log('================================================');
        
        for (const service of this.services) {
            console.log(`\n📊 Measuring ${service.name}...`);
            
            try {
                const serviceResults = await this.measureService(service);
                this.results.services[service.name] = serviceResults;
                
                console.log(`✅ ${service.name} measurement complete`);
                this.printServiceSummary(service.name, serviceResults);
                
            } catch (error) {
                console.error(`❌ Failed to measure ${service.name}:`, error.message);
                this.results.services[service.name] = {
                    error: error.message,
                    available: false
                };
            }
        }
        
        await this.generateSummary();
        await this.saveResults();
        
        console.log('\n🎯 Baseline measurement complete!');
        console.log(`Results saved to: ${await this.getResultsPath()}`);
    }

    async measureService(service) {
        const results = {
            available: false,
            response_times: {},
            websocket_performance: null,
            load_test: null,
            memory_usage: null,
            error_rate: 0
        };

        // Check if service is available
        try {
            const healthCheck = await axios.get(`${service.baseUrl}/api/status`, { timeout: 5000 });
            results.available = true;
            console.log(`  ✓ Service available (status: ${healthCheck.status})`);
        } catch (error) {
            throw new Error(`Service not available: ${error.message}`);
        }

        // Measure API endpoint response times
        results.response_times = await this.measureApiEndpoints(service);
        
        // Measure WebSocket performance if applicable
        if (service.websocket) {
            results.websocket_performance = await this.measureWebSocketPerformance(service);
        }
        
        // Run load test
        results.load_test = await this.runLoadTest(service);
        
        return results;
    }

    async measureApiEndpoints(service) {
        const endpoints = this.getServiceEndpoints(service.name);
        const results = {};
        
        console.log(`  📈 Testing ${endpoints.length} API endpoints...`);
        
        for (const endpoint of endpoints) {
            try {
                const measurements = [];
                
                // Take 10 measurements for each endpoint
                for (let i = 0; i < 10; i++) {
                    const start = performance.now();
                    const response = await axios({
                        method: endpoint.method,
                        url: `${service.baseUrl}${endpoint.path}`,
                        data: endpoint.data || {},
                        timeout: 10000
                    });
                    const duration = performance.now() - start;
                    
                    measurements.push({
                        duration: Math.round(duration * 100) / 100,
                        status: response.status,
                        size: JSON.stringify(response.data).length
                    });
                    
                    // Small delay between requests
                    await this.delay(100);
                }
                
                results[`${endpoint.method} ${endpoint.path}`] = {
                    avg_response_time: Math.round(measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length * 100) / 100,
                    min_response_time: Math.min(...measurements.map(m => m.duration)),
                    max_response_time: Math.max(...measurements.map(m => m.duration)),
                    success_rate: measurements.filter(m => m.status < 400).length / measurements.length * 100,
                    avg_response_size: Math.round(measurements.reduce((sum, m) => sum + m.size, 0) / measurements.length)
                };
                
            } catch (error) {
                results[`${endpoint.method} ${endpoint.path}`] = {
                    error: error.message,
                    success_rate: 0
                };
            }
        }
        
        return results;
    }

    async measureWebSocketPerformance(service) {
        return new Promise((resolve) => {
            console.log('  🔌 Testing WebSocket performance...');
            
            const measurements = {
                connection_time: null,
                message_count: 0,
                message_rate: 0,
                latency_samples: [],
                errors: 0
            };
            
            const startTime = performance.now();
            const ws = new WebSocket(service.websocket);
            let messageStartTime = null;
            
            ws.on('open', () => {
                measurements.connection_time = Math.round((performance.now() - startTime) * 100) / 100;
                messageStartTime = performance.now();
                console.log(`    ✓ WebSocket connected in ${measurements.connection_time}ms`);
            });
            
            ws.on('message', (data) => {
                measurements.message_count++;
                
                // Sample latency every 10th message
                if (measurements.message_count % 10 === 0) {
                    const latency = performance.now() - messageStartTime;
                    measurements.latency_samples.push(latency);
                }
            });
            
            ws.on('error', (error) => {
                measurements.errors++;
            });
            
            // Measure for 10 seconds
            setTimeout(() => {
                const duration = (performance.now() - messageStartTime) / 1000;
                measurements.message_rate = Math.round(measurements.message_count / duration * 100) / 100;
                
                if (measurements.latency_samples.length > 0) {
                    measurements.avg_latency = Math.round(
                        measurements.latency_samples.reduce((sum, l) => sum + l, 0) / 
                        measurements.latency_samples.length * 100
                    ) / 100;
                }
                
                ws.close();
                resolve(measurements);
            }, 10000);
        });
    }

    async runLoadTest(service) {
        console.log('  🚀 Running load test...');
        
        const concurrentUsers = 10;
        const testDuration = 30000; // 30 seconds
        const results = {
            concurrent_users: concurrentUsers,
            test_duration_ms: testDuration,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            avg_response_time: 0,
            requests_per_second: 0
        };
        
        const workers = [];
        const allResults = [];
        
        // Spawn concurrent workers
        for (let i = 0; i < concurrentUsers; i++) {
            workers.push(this.loadTestWorker(service, testDuration, allResults));
        }
        
        await Promise.all(workers);
        
        // Calculate results
        results.total_requests = allResults.length;
        results.successful_requests = allResults.filter(r => r.success).length;
        results.failed_requests = results.total_requests - results.successful_requests;
        
        if (results.successful_requests > 0) {
            const successfulTimes = allResults.filter(r => r.success).map(r => r.duration);
            results.avg_response_time = Math.round(
                successfulTimes.reduce((sum, t) => sum + t, 0) / successfulTimes.length * 100
            ) / 100;
        }
        
        results.requests_per_second = Math.round(results.total_requests / (testDuration / 1000) * 100) / 100;
        
        return results;
    }

    async loadTestWorker(service, duration, results) {
        const startTime = Date.now();
        const endpoints = this.getServiceEndpoints(service.name);
        
        while (Date.now() - startTime < duration) {
            const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
            const requestStart = performance.now();
            
            try {
                await axios({
                    method: endpoint.method,
                    url: `${service.baseUrl}${endpoint.path}`,
                    data: endpoint.data || {},
                    timeout: 5000
                });
                
                results.push({
                    success: true,
                    duration: performance.now() - requestStart
                });
                
            } catch (error) {
                results.push({
                    success: false,
                    duration: performance.now() - requestStart,
                    error: error.message
                });
            }
            
            // Small delay to prevent overwhelming
            await this.delay(50);
        }
    }

    getServiceEndpoints(serviceName) {
        const endpoints = {
            'spectrum_analyzer_flask': [
                { method: 'GET', path: '/api/status' },
                { method: 'GET', path: '/api/profiles' },
                { method: 'GET', path: '/api/scan/vhf' },
                { method: 'GET', path: '/api/scan/uhf' }
            ],
            'wigle_to_tak_flask': [
                { method: 'GET', path: '/list_wigle_files?directory=.' },
                { method: 'POST', path: '/update_tak_settings', data: { tak_server_ip: '192.168.1.100', tak_server_port: '6969' } },
                { method: 'POST', path: '/update_multicast_state', data: { takMulticast: true } },
                { method: 'POST', path: '/update_analysis_mode', data: { mode: 'realtime' } }
            ]
        };
        
        return endpoints[serviceName] || [];
    }

    async generateSummary() {
        const services = Object.keys(this.results.services);
        this.results.summary = {
            total_services_tested: services.length,
            services_available: services.filter(s => this.results.services[s].available).length,
            overall_health: 'healthy'
        };
        
        // Calculate overall performance metrics
        const availableServices = services.filter(s => this.results.services[s].available);
        
        if (availableServices.length > 0) {
            const allResponseTimes = [];
            
            availableServices.forEach(serviceName => {
                const service = this.results.services[serviceName];
                if (service.response_times) {
                    Object.values(service.response_times).forEach(endpoint => {
                        if (endpoint.avg_response_time) {
                            allResponseTimes.push(endpoint.avg_response_time);
                        }
                    });
                }
            });
            
            if (allResponseTimes.length > 0) {
                this.results.summary.avg_response_time = Math.round(
                    allResponseTimes.reduce((sum, t) => sum + t, 0) / allResponseTimes.length * 100
                ) / 100;
            }
        }
        
        // Determine overall health
        if (this.results.summary.services_available < services.length) {
            this.results.summary.overall_health = 'degraded';
        }
    }

    printServiceSummary(serviceName, results) {
        if (!results.available) {
            console.log(`    ❌ Service unavailable`);
            return;
        }
        
        console.log(`    📊 Response Times:`);
        Object.entries(results.response_times).forEach(([endpoint, metrics]) => {
            if (metrics.avg_response_time) {
                console.log(`      ${endpoint}: ${metrics.avg_response_time}ms avg (${metrics.success_rate}% success)`);
            }
        });
        
        if (results.websocket_performance) {
            const ws = results.websocket_performance;
            console.log(`    🔌 WebSocket: ${ws.connection_time}ms connect, ${ws.message_rate} msg/s`);
        }
        
        if (results.load_test) {
            const load = results.load_test;
            console.log(`    🚀 Load Test: ${load.requests_per_second} req/s, ${load.avg_response_time}ms avg`);
        }
    }

    async saveResults() {
        const resultsPath = await this.getResultsPath();
        await fs.writeFile(resultsPath, JSON.stringify(this.results, null, 2));
        
        // Also save a summary file
        const summaryPath = resultsPath.replace('.json', '_summary.txt');
        const summaryText = this.generateTextSummary();
        await fs.writeFile(summaryPath, summaryText);
    }

    async getResultsPath() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `performance_baseline_${timestamp}.json`;
        return path.join(__dirname, 'benchmarks', filename);
    }

    generateTextSummary() {
        const summary = this.results.summary;
        const services = Object.keys(this.results.services);
        
        let text = 'PERFORMANCE BASELINE MEASUREMENT SUMMARY\n';
        text += '=======================================\n\n';
        text += `Timestamp: ${this.results.timestamp}\n`;
        text += `Services Tested: ${summary.total_services_tested}\n`;
        text += `Services Available: ${summary.services_available}\n`;
        text += `Overall Health: ${summary.overall_health}\n`;
        
        if (summary.avg_response_time) {
            text += `Average Response Time: ${summary.avg_response_time}ms\n`;
        }
        
        text += '\nDETAILED RESULTS:\n';
        text += '-----------------\n';
        
        services.forEach(serviceName => {
            const service = this.results.services[serviceName];
            text += `\n${serviceName}:\n`;
            
            if (!service.available) {
                text += `  Status: UNAVAILABLE\n`;
                if (service.error) {
                    text += `  Error: ${service.error}\n`;
                }
                return;
            }
            
            text += `  Status: AVAILABLE\n`;
            
            if (service.response_times) {
                text += `  API Endpoints:\n`;
                Object.entries(service.response_times).forEach(([endpoint, metrics]) => {
                    if (metrics.avg_response_time) {
                        text += `    ${endpoint}: ${metrics.avg_response_time}ms (${metrics.success_rate}% success)\n`;
                    }
                });
            }
            
            if (service.websocket_performance) {
                const ws = service.websocket_performance;
                text += `  WebSocket Performance:\n`;
                text += `    Connection Time: ${ws.connection_time}ms\n`;
                text += `    Message Rate: ${ws.message_rate} messages/second\n`;
                text += `    Messages Received: ${ws.message_count}\n`;
                if (ws.avg_latency) {
                    text += `    Average Latency: ${ws.avg_latency}ms\n`;
                }
            }
            
            if (service.load_test) {
                const load = service.load_test;
                text += `  Load Test Results:\n`;
                text += `    Concurrent Users: ${load.concurrent_users}\n`;
                text += `    Test Duration: ${load.test_duration_ms}ms\n`;
                text += `    Total Requests: ${load.total_requests}\n`;
                text += `    Success Rate: ${Math.round(load.successful_requests / load.total_requests * 100)}%\n`;
                text += `    Requests/Second: ${load.requests_per_second}\n`;
                text += `    Average Response Time: ${load.avg_response_time}ms\n`;
            }
        });
        
        return text;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run baseline measurement if called directly
if (require.main === module) {
    const baseline = new PerformanceBaseline();
    baseline.measureAll().catch(error => {
        console.error('Baseline measurement failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceBaseline;
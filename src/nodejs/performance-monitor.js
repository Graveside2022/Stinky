#!/usr/bin/env node

/**
 * PHASE 4 MIGRATION CUTOVER - PERFORMANCE VERIFICATION AGENT
 * 
 * Mission: Comprehensive performance verification and 24-hour monitoring
 * Context: Node.js services proven 8% faster than Flask (12ms vs 13ms)
 * Target: Maintain/exceed performance gains in production environment
 */

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');

class PerformanceMonitor {
    constructor() {
        this.results = {
            timestamp: Date.now(),
            baseline: {},
            current: {},
            trending: [],
            alerts: []
        };
        
        this.config = {
            monitoringDuration: 24 * 60 * 60 * 1000, // 24 hours
            sampleInterval: 30000, // 30 seconds
            alertThresholds: {
                responseTime: 15, // ms (vs 12ms target)
                memoryUsage: 40, // MB (vs <35MB target) 
                cpuUsage: 15, // % (vs <10% target)
                errorRate: 5 // %
            },
            services: {
                flask: {
                    spectrum: 'http://localhost:8092',
                    wigle: 'http://localhost:8000'
                },
                nodejs: {
                    spectrum: 'http://localhost:3001',
                    wigle: 'http://localhost:3002'
                }
            }
        };
        
        this.startTime = Date.now();
        this.monitoring = false;
        this.monitoringInterval = null;
        this.performanceLog = [];
    }

    /**
     * TASK 1: Response Time Verification
     * Measure API endpoint response times for both services
     */
    async measureResponseTimes(serviceUrl, endpoints = ['/api/status', '/api/config']) {
        const measurements = {};
        
        for (const endpoint of endpoints) {
            const results = [];
            
            // Take 10 measurements for statistical accuracy
            for (let i = 0; i < 10; i++) {
                const start = process.hrtime.bigint();
                
                try {
                    await axios.get(`${serviceUrl}${endpoint}`, { timeout: 5000 });
                    const end = process.hrtime.bigint();
                    const responseTime = Number(end - start) / 1000000; // Convert to milliseconds
                    results.push(responseTime);
                } catch (error) {
                    console.error(`Error measuring ${serviceUrl}${endpoint}:`, error.message);
                    results.push(null);
                }
                
                // Small delay between measurements
                await this.delay(100);
            }
            
            const validResults = results.filter(r => r !== null);
            measurements[endpoint] = {
                avg: validResults.length > 0 ? validResults.reduce((a, b) => a + b, 0) / validResults.length : null,
                min: validResults.length > 0 ? Math.min(...validResults) : null,
                max: validResults.length > 0 ? Math.max(...validResults) : null,
                samples: validResults.length,
                errorRate: ((10 - validResults.length) / 10) * 100
            };
        }
        
        return measurements;
    }

    /**
     * TASK 2: Memory Usage Analysis
     * Monitor memory consumption and compare against baseline
     */
    async analyzeMemoryUsage() {
        const memoryStats = {
            system: {
                total: os.totalmem() / 1024 / 1024, // MB
                free: os.freemem() / 1024 / 1024, // MB
                used: (os.totalmem() - os.freemem()) / 1024 / 1024 // MB
            },
            processes: {}
        };

        // Get Node.js process memory usage
        if (process.pid) {
            const nodeMemory = process.memoryUsage();
            memoryStats.processes.nodejs = {
                rss: nodeMemory.rss / 1024 / 1024, // MB
                heapUsed: nodeMemory.heapUsed / 1024 / 1024, // MB
                heapTotal: nodeMemory.heapTotal / 1024 / 1024, // MB
                external: nodeMemory.external / 1024 / 1024 // MB
            };
        }

        // Get Flask process memory usage via ps
        try {
            const flaskMemory = await this.getProcessMemory('python3.*spectrum_analyzer');
            if (flaskMemory) {
                memoryStats.processes.flask_spectrum = flaskMemory;
            }

            const wigleMemory = await this.getProcessMemory('python3.*WigleToTak');
            if (wigleMemory) {
                memoryStats.processes.flask_wigle = wigleMemory;
            }
        } catch (error) {
            console.error('Error getting Flask memory usage:', error.message);
        }

        return memoryStats;
    }

    async getProcessMemory(processPattern) {
        return new Promise((resolve) => {
            exec(`ps aux | grep -E "${processPattern}" | grep -v grep | awk '{print $6}'`, (error, stdout) => {
                if (error || !stdout.trim()) {
                    resolve(null);
                    return;
                }
                
                const memoryKB = parseInt(stdout.trim());
                resolve({
                    rss: memoryKB / 1024, // Convert KB to MB
                    processPattern
                });
            });
        });
    }

    /**
     * TASK 3: CPU Utilization Testing  
     * Monitor CPU usage under various conditions
     */
    async measureCPUUtilization() {
        const cpuStats = {
            system: os.loadavg(),
            processes: {}
        };

        // Get system CPU info
        const cpus = os.cpus();
        cpuStats.system = {
            cores: cpus.length,
            model: cpus[0].model,
            loadAverage: os.loadavg(),
            uptime: os.uptime()
        };

        // Get process-specific CPU usage
        try {
            const nodeCPU = await this.getProcessCPU('node');
            if (nodeCPU) {
                cpuStats.processes.nodejs = nodeCPU;
            }

            const flaskCPU = await this.getProcessCPU('python3.*spectrum_analyzer');
            if (flaskCPU) {
                cpuStats.processes.flask = flaskCPU;
            }
        } catch (error) {
            console.error('Error measuring CPU usage:', error.message);
        }

        return cpuStats;
    }

    async getProcessCPU(processPattern) {
        return new Promise((resolve) => {
            exec(`ps aux | grep -E "${processPattern}" | grep -v grep | awk '{print $3}'`, (error, stdout) => {
                if (error || !stdout.trim()) {
                    resolve(null);
                    return;
                }
                
                const cpuPercent = parseFloat(stdout.trim());
                resolve({
                    cpuPercent,
                    processPattern
                });
            });
        });
    }

    /**
     * TASK 4: WebSocket Performance Testing
     * Measure WebSocket connection latency and data streaming
     */
    async testWebSocketPerformance(url = 'ws://localhost:8092/socket.io/?EIO=4&transport=websocket') {
        return new Promise((resolve) => {
            const connectionStart = Date.now();
            const measurements = {
                connectionTime: null,
                messageLatency: [],
                messagesReceived: 0,
                connectionFailed: false,
                testDuration: 30000 // 30 seconds
            };

            try {
                const ws = new WebSocket(url);

                ws.on('open', () => {
                    measurements.connectionTime = Date.now() - connectionStart;
                    console.log(`🔌 WebSocket connected in ${measurements.connectionTime}ms`);

                    // Test message latency
                    const latencyTest = setInterval(() => {
                        const msgStart = Date.now();
                        ws.send(JSON.stringify({ type: 'ping', timestamp: msgStart }));
                    }, 1000);

                    setTimeout(() => {
                        clearInterval(latencyTest);
                        ws.close();
                        resolve(measurements);
                    }, measurements.testDuration);
                });

                ws.on('message', (data) => {
                    measurements.messagesReceived++;
                    
                    try {
                        const message = JSON.parse(data);
                        if (message.type === 'pong' && message.timestamp) {
                            const latency = Date.now() - message.timestamp;
                            measurements.messageLatency.push(latency);
                        }
                    } catch (e) {
                        // Message parsing failed - normal for some message types
                    }
                });

                ws.on('error', (error) => {
                    console.error('WebSocket error:', error.message);
                    measurements.connectionFailed = true;
                    resolve(measurements);
                });

                ws.on('close', () => {
                    if (!measurements.connectionFailed) {
                        console.log('🔌 WebSocket connection closed normally');
                    }
                });

            } catch (error) {
                console.error('Failed to create WebSocket connection:', error.message);
                measurements.connectionFailed = true;
                resolve(measurements);
            }
        });
    }

    /**
     * TASK 5: Concurrent Connection Testing
     * Test multiple client connections and service stability
     */
    async testConcurrentConnections(serviceUrl, concurrentCount = 10) {
        const results = {
            totalRequests: concurrentCount,
            successfulConnections: 0,
            failedConnections: 0,
            averageResponseTime: 0,
            errors: []
        };

        const promises = [];

        for (let i = 0; i < concurrentCount; i++) {
            promises.push(this.makeConcurrentRequest(serviceUrl, i));
        }

        try {
            const responses = await Promise.allSettled(promises);
            
            responses.forEach((response, index) => {
                if (response.status === 'fulfilled') {
                    results.successfulConnections++;
                    if (response.value.responseTime) {
                        results.averageResponseTime += response.value.responseTime;
                    }
                } else {
                    results.failedConnections++;
                    results.errors.push({
                        requestIndex: index,
                        error: response.reason.message
                    });
                }
            });

            if (results.successfulConnections > 0) {
                results.averageResponseTime /= results.successfulConnections;
            }

        } catch (error) {
            console.error('Concurrent connection test failed:', error.message);
        }

        return results;
    }

    async makeConcurrentRequest(serviceUrl, requestId) {
        const start = Date.now();
        
        try {
            const response = await axios.get(`${serviceUrl}/api/status`, { 
                timeout: 5000,
                headers: { 'X-Request-ID': requestId }
            });
            
            return {
                requestId,
                status: response.status,
                responseTime: Date.now() - start
            };
        } catch (error) {
            throw new Error(`Request ${requestId} failed: ${error.message}`);
        }
    }

    /**
     * TASK 6: Resource Monitoring Setup
     * Implement 24-hour monitoring with alerting
     */
    async startContinuousMonitoring() {
        console.log('🎯 Starting 24-hour performance monitoring...');
        console.log(`📊 Monitoring duration: ${this.config.monitoringDuration / 1000 / 60 / 60} hours`);
        console.log(`⏱️  Sample interval: ${this.config.sampleInterval / 1000} seconds`);
        
        this.monitoring = true;
        
        this.monitoringInterval = setInterval(async () => {
            await this.collectPerformanceMetrics();
        }, this.config.sampleInterval);

        // Set monitoring end time
        setTimeout(() => {
            this.stopMonitoring();
        }, this.config.monitoringDuration);

        // Initial baseline measurement
        await this.establishBaseline();
    }

    async establishBaseline() {
        console.log('📊 Establishing performance baseline...');
        
        // Flask measurements (current production)
        console.log('🐍 Measuring Flask performance...');
        const flaskSpectrum = await this.measureResponseTimes(this.config.services.flask.spectrum);
        const flaskWigle = await this.measureResponseTimes(this.config.services.flask.wigle);
        
        // Memory and CPU baseline
        const memoryBaseline = await this.analyzeMemoryUsage();
        const cpuBaseline = await this.measureCPUUtilization();
        
        // WebSocket baseline
        console.log('🔌 Testing WebSocket performance...');
        const websocketBaseline = await this.testWebSocketPerformance();
        
        this.results.baseline = {
            timestamp: Date.now(),
            flask: {
                spectrum: flaskSpectrum,
                wigle: flaskWigle
            },
            memory: memoryBaseline,
            cpu: cpuBaseline,
            websocket: websocketBaseline
        };

        console.log('✅ Baseline established');
        this.saveResults('baseline');
    }

    async collectPerformanceMetrics() {
        const metrics = {
            timestamp: Date.now(),
            memory: await this.analyzeMemoryUsage(),
            cpu: await this.measureCPUUtilization()
        };

        // Test service availability
        try {
            const flaskSpectrum = await this.measureResponseTimes(this.config.services.flask.spectrum, ['/api/status']);
            metrics.flask_spectrum = flaskSpectrum;
        } catch (error) {
            console.warn('Flask spectrum analyzer not available:', error.message);
        }

        try {
            const flaskWigle = await this.measureResponseTimes(this.config.services.flask.wigle, ['/api/status']);
            metrics.flask_wigle = flaskWigle;
        } catch (error) {
            console.warn('Flask WigleToTAK not available:', error.message);
        }

        // Check for performance alerts
        this.checkAlerts(metrics);
        
        // Store trending data
        this.performanceLog.push(metrics);
        
        // Keep only last 1000 measurements to prevent memory issues
        if (this.performanceLog.length > 1000) {
            this.performanceLog = this.performanceLog.slice(-500);
        }

        // Log progress
        const elapsed = Date.now() - this.startTime;
        const remaining = this.config.monitoringDuration - elapsed;
        const progress = (elapsed / this.config.monitoringDuration) * 100;
        
        console.log(`📈 Monitoring progress: ${progress.toFixed(1)}% (${Math.ceil(remaining / 1000 / 60)} minutes remaining)`);
        
        // Save periodic results
        if (this.performanceLog.length % 10 === 0) {
            this.saveResults('monitoring');
        }
    }

    checkAlerts(metrics) {
        const alerts = [];

        // Check response time alerts
        if (metrics.flask_spectrum && metrics.flask_spectrum['/api/status']) {
            const avgResponseTime = metrics.flask_spectrum['/api/status'].avg;
            if (avgResponseTime > this.config.alertThresholds.responseTime) {
                alerts.push({
                    type: 'response_time',
                    service: 'flask_spectrum',
                    value: avgResponseTime,
                    threshold: this.config.alertThresholds.responseTime,
                    severity: 'warning'
                });
            }
        }

        // Check memory usage alerts
        if (metrics.memory.processes.flask_spectrum) {
            const memUsage = metrics.memory.processes.flask_spectrum.rss;
            if (memUsage > this.config.alertThresholds.memoryUsage) {
                alerts.push({
                    type: 'memory_usage',
                    service: 'flask_spectrum',
                    value: memUsage,
                    threshold: this.config.alertThresholds.memoryUsage,
                    severity: 'warning'
                });
            }
        }

        // Check CPU usage alerts
        if (metrics.cpu.processes.flask) {
            const cpuUsage = metrics.cpu.processes.flask.cpuPercent;
            if (cpuUsage > this.config.alertThresholds.cpuUsage) {
                alerts.push({
                    type: 'cpu_usage',
                    service: 'flask',
                    value: cpuUsage,
                    threshold: this.config.alertThresholds.cpuUsage,
                    severity: 'warning'
                });
            }
        }

        if (alerts.length > 0) {
            console.log(`⚠️  Performance alerts detected: ${alerts.length}`);
            alerts.forEach(alert => {
                console.log(`   ${alert.type}: ${alert.service} = ${alert.value} (threshold: ${alert.threshold})`);
            });
            
            this.results.alerts.push(...alerts);
        }
    }

    stopMonitoring() {
        console.log('🔚 Stopping performance monitoring...');
        this.monitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.generateFinalReport();
    }

    async generateFinalReport() {
        console.log('📊 Generating final performance report...');
        
        const finalMetrics = {
            monitoringDuration: Date.now() - this.startTime,
            totalSamples: this.performanceLog.length,
            alerts: this.results.alerts,
            summary: this.calculateSummaryMetrics()
        };

        this.results.final = finalMetrics;
        this.saveResults('final');

        console.log('✅ Performance monitoring complete');
        console.log(`📈 Total monitoring time: ${finalMetrics.monitoringDuration / 1000 / 60} minutes`);
        console.log(`📊 Samples collected: ${finalMetrics.totalSamples}`);
        console.log(`⚠️  Alerts generated: ${finalMetrics.alerts.length}`);
    }

    calculateSummaryMetrics() {
        if (this.performanceLog.length === 0) return {};

        const summary = {
            response_times: {},
            memory_usage: {},
            cpu_usage: {},
            availability: {}
        };

        // Calculate response time statistics
        const responseTimes = this.performanceLog
            .filter(log => log.flask_spectrum && log.flask_spectrum['/api/status'])
            .map(log => log.flask_spectrum['/api/status'].avg);

        if (responseTimes.length > 0) {
            summary.response_times = {
                avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
                min: Math.min(...responseTimes),
                max: Math.max(...responseTimes),
                samples: responseTimes.length
            };
        }

        // Calculate memory usage statistics
        const memoryUsages = this.performanceLog
            .filter(log => log.memory.processes.flask_spectrum)
            .map(log => log.memory.processes.flask_spectrum.rss);

        if (memoryUsages.length > 0) {
            summary.memory_usage = {
                avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
                min: Math.min(...memoryUsages),
                max: Math.max(...memoryUsages),
                samples: memoryUsages.length
            };
        }

        return summary;
    }

    saveResults(type = 'monitoring') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `performance-${type}-${timestamp}.json`;
        const filepath = path.join(__dirname, 'logs', filename);

        try {
            fs.mkdirSync(path.dirname(filepath), { recursive: true });
            
            const reportData = {
                type,
                timestamp: Date.now(),
                config: this.config,
                baseline: this.results.baseline,
                performanceLog: type === 'final' ? this.performanceLog : this.performanceLog.slice(-10),
                alerts: this.results.alerts,
                summary: type === 'final' ? this.calculateSummaryMetrics() : null
            };

            fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));
            console.log(`💾 Performance data saved: ${filename}`);
        } catch (error) {
            console.error('Failed to save performance data:', error.message);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public interface for running specific tests
    async runPerformanceVerification() {
        console.log('🎯 PHASE 4 MIGRATION CUTOVER - PERFORMANCE VERIFICATION');
        console.log('=' .repeat(70));
        
        console.log('📊 Task 1: Response Time Verification');
        const flaskSpectrum = await this.measureResponseTimes(this.config.services.flask.spectrum);
        console.log('Flask Spectrum Analyzer Response Times:');
        console.log(JSON.stringify(flaskSpectrum, null, 2));

        console.log('\n🧠 Task 2: Memory Usage Analysis');
        const memoryStats = await this.analyzeMemoryUsage();
        console.log('Memory Usage Analysis:');
        console.log(JSON.stringify(memoryStats, null, 2));

        console.log('\n⚡ Task 3: CPU Utilization Testing');
        const cpuStats = await this.measureCPUUtilization();
        console.log('CPU Utilization Analysis:');
        console.log(JSON.stringify(cpuStats, null, 2));

        console.log('\n🔌 Task 4: WebSocket Performance Testing');
        const websocketStats = await this.testWebSocketPerformance();
        console.log('WebSocket Performance:');
        console.log(JSON.stringify(websocketStats, null, 2));

        console.log('\n👥 Task 5: Concurrent Connection Testing');
        const concurrentStats = await this.testConcurrentConnections(this.config.services.flask.spectrum, 5);
        console.log('Concurrent Connection Test:');
        console.log(JSON.stringify(concurrentStats, null, 2));

        console.log('\n✅ Performance verification complete');
        
        // Save immediate results
        this.results.verification = {
            flask_spectrum: flaskSpectrum,
            memory: memoryStats,
            cpu: cpuStats,
            websocket: websocketStats,
            concurrent: concurrentStats
        };
        
        this.saveResults('verification');
        
        return this.results.verification;
    }
}

// Main execution
async function main() {
    const monitor = new PerformanceMonitor();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--continuous') || args.includes('-c')) {
        // Start 24-hour continuous monitoring
        await monitor.startContinuousMonitoring();
    } else if (args.includes('--quick') || args.includes('-q')) {
        // Run quick performance verification
        await monitor.runPerformanceVerification();
    } else {
        // Default: Run verification then start monitoring
        console.log('🚀 Running performance verification followed by continuous monitoring...\n');
        await monitor.runPerformanceVerification();
        
        console.log('\n🔄 Starting 24-hour monitoring...');
        await monitor.startContinuousMonitoring();
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔚 Received SIGINT - shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔚 Received SIGTERM - shutting down gracefully...');
    process.exit(0);
});

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Performance monitoring failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceMonitor;
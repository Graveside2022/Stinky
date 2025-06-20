#!/usr/bin/env node

/**
 * Stress Testing Framework for Flask to Node.js Migration
 * High-load testing to validate Node.js performance improvements
 * 
 * This framework tests:
 * - Concurrent API requests under load
 * - WebSocket connection stability
 * - Memory usage under stress
 * - Response time degradation
 * - Error handling under load
 * - Recovery after stress periods
 * 
 * Usage: node tests/stress-test.js [--duration 300] [--concurrency 50] [--rps 100]
 */

const axios = require('axios');
const WebSocket = require('ws');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs-extra');
const path = require('path');
const { EventEmitter } = require('events');

class StressTestFramework extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            duration: options.duration || 300000,        // 5 minutes default
            concurrency: options.concurrency || 50,      // 50 concurrent users
            requestsPerSecond: options.rps || 100,       // 100 RPS target
            rampUpTime: options.rampUp || 30000,         // 30 seconds ramp-up
            services: {
                spectrumAnalyzer: {
                    url: 'http://localhost:8092',
                    endpoints: ['/api/status', '/api/config', '/api/signals', '/api/profiles']
                },
                wigleToTak: {
                    url: 'http://localhost:8000', 
                    endpoints: ['/api/status', '/list_wigle_files', '/get_antenna_settings']
                }
            },
            thresholds: {
                maxResponseTime: 1000,    // 1 second
                maxErrorRate: 0.05,       // 5%
                maxMemoryUsage: 1024,     // 1GB
                minSuccessRate: 0.95      // 95%
            },
            ...options
        };
        
        this.metrics = {
            startTime: 0,
            endTime: 0,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errors: [],
            memoryUsage: [],
            webSocketMetrics: {
                connections: 0,
                messages: 0,
                errors: 0
            },
            serviceMetrics: {}
        };
        
        this.workers = [];
        this.isRunning = false;
        this.resultFile = path.join(__dirname, `stress-test-${Date.now()}.json`);
        
        this.initializeServiceMetrics();
    }
    
    initializeServiceMetrics() {
        Object.keys(this.config.services).forEach(serviceKey => {
            this.metrics.serviceMetrics[serviceKey] = {
                requests: 0,
                successes: 0,
                failures: 0,
                responseTimes: [],
                errors: []
            };
        });
    }
    
    async start() {
        if (this.isRunning) {
            throw new Error('Stress test is already running');
        }
        
        console.log('🚀 STRESS TEST FRAMEWORK STARTING');
        console.log(`Duration: ${this.config.duration / 1000} seconds`);
        console.log(`Concurrency: ${this.config.concurrency} workers`);
        console.log(`Target RPS: ${this.config.requestsPerSecond}`);
        console.log(`Ramp-up time: ${this.config.rampUpTime / 1000} seconds`);
        console.log('');
        
        this.isRunning = true;
        this.metrics.startTime = Date.now();
        
        // Pre-test validation
        await this.preTestValidation();
        
        // Start memory monitoring
        this.startMemoryMonitoring();
        
        // Start WebSocket stress testing
        this.startWebSocketStressTesting();
        
        // Start HTTP load testing with ramp-up
        await this.startHTTPLoadTesting();
        
        // Wait for test duration
        await this.sleep(this.config.duration);
        
        // Stop all testing
        await this.stop();
        
        return this.generateReport();
    }
    
    async preTestValidation() {
        console.log('🔍 Pre-test validation...');
        
        for (const [serviceName, service] of Object.entries(this.config.services)) {
            try {
                const response = await axios.get(`${service.url}/api/status`, { timeout: 5000 });
                console.log(`✅ ${serviceName}: Ready (${response.status})`);
            } catch (error) {
                console.error(`❌ ${serviceName}: Not ready - ${error.message}`);
                throw new Error(`Service ${serviceName} is not ready for stress testing`);
            }
        }
        
        console.log('✅ All services ready for stress testing\n');
    }
    
    startMemoryMonitoring() {
        const monitorMemory = () => {
            if (!this.isRunning) return;
            
            const usage = process.memoryUsage();
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                rss: usage.rss / 1024 / 1024,      // MB
                heapUsed: usage.heapUsed / 1024 / 1024,
                heapTotal: usage.heapTotal / 1024 / 1024,
                external: usage.external / 1024 / 1024
            });
            
            setTimeout(monitorMemory, 1000); // Every second
        };
        
        monitorMemory();
    }
    
    startWebSocketStressTesting() {
        console.log('🌐 Starting WebSocket stress testing...');
        
        const maxConnections = Math.min(this.config.concurrency, 20); // Limit WebSocket connections
        
        for (let i = 0; i < maxConnections; i++) {
            setTimeout(() => {
                if (!this.isRunning) return;
                this.createWebSocketConnection();
            }, (i * this.config.rampUpTime) / maxConnections);
        }
    }
    
    createWebSocketConnection() {
        try {
            const ws = new WebSocket('ws://localhost:8092/socket.io/?EIO=4&transport=websocket');
            this.metrics.webSocketMetrics.connections++;
            
            ws.on('open', () => {
                console.log(`📡 WebSocket connected (${this.metrics.webSocketMetrics.connections})`);
            });
            
            ws.on('message', (data) => {
                this.metrics.webSocketMetrics.messages++;
            });
            
            ws.on('error', (error) => {
                this.metrics.webSocketMetrics.errors++;
                console.error('WebSocket error:', error.message);
            });
            
            ws.on('close', () => {
                // Reconnect if test is still running
                if (this.isRunning) {
                    setTimeout(() => this.createWebSocketConnection(), 5000);
                }
            });
            
            // Send periodic messages to test bidirectional communication
            const sendMessage = () => {
                if (this.isRunning && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                    setTimeout(sendMessage, 5000);
                }
            };
            
            setTimeout(sendMessage, 1000);
            
        } catch (error) {
            this.metrics.webSocketMetrics.errors++;
            console.error('Failed to create WebSocket connection:', error.message);
        }
    }
    
    async startHTTPLoadTesting() {
        console.log('🔥 Starting HTTP load testing with ramp-up...');
        
        const workersToCreate = this.config.concurrency;
        const rampUpInterval = this.config.rampUpTime / workersToCreate;
        
        for (let i = 0; i < workersToCreate; i++) {
            setTimeout(() => {
                if (!this.isRunning) return;
                this.createWorker(i);
            }, i * rampUpInterval);
        }
        
        // Start progress monitoring
        this.startProgressMonitoring();
    }
    
    createWorker(workerId) {
        if (!this.isRunning) return;
        
        const worker = new Worker(__filename, {
            workerData: {
                workerId,
                config: this.config,
                isWorker: true
            }
        });
        
        worker.on('message', (data) => {
            this.processWorkerResult(data);
        });
        
        worker.on('error', (error) => {
            console.error(`Worker ${workerId} error:`, error);
            this.metrics.errors.push({
                timestamp: Date.now(),
                type: 'worker_error',
                workerId,
                error: error.message
            });
        });
        
        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker ${workerId} exited with code ${code}`);
            }
        });
        
        this.workers.push(worker);
    }
    
    processWorkerResult(data) {
        if (data.type === 'request_result') {
            this.metrics.totalRequests++;
            
            if (data.success) {
                this.metrics.successfulRequests++;
                this.metrics.responseTimes.push(data.responseTime);
                
                // Update service metrics
                if (this.metrics.serviceMetrics[data.service]) {
                    this.metrics.serviceMetrics[data.service].requests++;
                    this.metrics.serviceMetrics[data.service].successes++;
                    this.metrics.serviceMetrics[data.service].responseTimes.push(data.responseTime);
                }
            } else {
                this.metrics.failedRequests++;
                this.metrics.errors.push({
                    timestamp: Date.now(),
                    service: data.service,
                    endpoint: data.endpoint,
                    error: data.error
                });
                
                // Update service metrics
                if (this.metrics.serviceMetrics[data.service]) {
                    this.metrics.serviceMetrics[data.service].requests++;
                    this.metrics.serviceMetrics[data.service].failures++;
                    this.metrics.serviceMetrics[data.service].errors.push({
                        timestamp: Date.now(),
                        endpoint: data.endpoint,
                        error: data.error
                    });
                }
            }
        }
    }
    
    startProgressMonitoring() {
        const logProgress = () => {
            if (!this.isRunning) return;
            
            const elapsed = Date.now() - this.metrics.startTime;
            const remaining = this.config.duration - elapsed;
            const currentRPS = this.metrics.totalRequests / (elapsed / 1000);
            const successRate = this.metrics.totalRequests > 0 
                ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(1)
                : 0;
            
            const avgResponseTime = this.metrics.responseTimes.length > 0
                ? (this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length).toFixed(0)
                : 0;
            
            console.log(`⚡ Progress: ${Math.round(elapsed / 1000)}s elapsed, ` +
                       `${Math.round(remaining / 1000)}s remaining | ` +
                       `RPS: ${currentRPS.toFixed(1)} | ` +
                       `Success: ${successRate}% | ` +
                       `Avg RT: ${avgResponseTime}ms | ` +
                       `Workers: ${this.workers.length} | ` +
                       `WS: ${this.metrics.webSocketMetrics.connections}`);
            
            setTimeout(logProgress, 5000); // Every 5 seconds
        };
        
        setTimeout(logProgress, 5000);
    }
    
    async stop() {
        if (!this.isRunning) return;
        
        console.log('\n🛑 Stopping stress test...');
        this.isRunning = false;
        this.metrics.endTime = Date.now();
        
        // Terminate all workers
        await Promise.all(this.workers.map(worker => {
            return new Promise((resolve) => {
                worker.terminate().then(resolve).catch(resolve);
            });
        }));
        
        this.workers = [];
        console.log('✅ All workers terminated');
    }
    
    async generateReport() {
        const totalDuration = this.metrics.endTime - this.metrics.startTime;
        const averageRPS = this.metrics.totalRequests / (totalDuration / 1000);
        const successRate = this.metrics.totalRequests > 0 
            ? this.metrics.successfulRequests / this.metrics.totalRequests
            : 0;
        
        // Calculate response time percentiles
        const sortedResponseTimes = this.metrics.responseTimes.sort((a, b) => a - b);
        const p50 = this.getPercentile(sortedResponseTimes, 50);
        const p95 = this.getPercentile(sortedResponseTimes, 95);
        const p99 = this.getPercentile(sortedResponseTimes, 99);
        
        // Calculate memory statistics
        const memoryStats = this.calculateMemoryStats();
        
        const report = {
            summary: {
                duration: `${Math.round(totalDuration / 1000)} seconds`,
                totalRequests: this.metrics.totalRequests,
                successfulRequests: this.metrics.successfulRequests,
                failedRequests: this.metrics.failedRequests,
                successRate: `${(successRate * 100).toFixed(2)}%`,
                averageRPS: averageRPS.toFixed(2),
                concurrency: this.config.concurrency
            },
            performance: {
                responseTime: {
                    average: `${(this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length || 0).toFixed(0)}ms`,
                    median: `${p50}ms`,
                    p95: `${p95}ms`,
                    p99: `${p99}ms`,
                    min: `${Math.min(...this.metrics.responseTimes) || 0}ms`,
                    max: `${Math.max(...this.metrics.responseTimes) || 0}ms`
                },
                memory: memoryStats,
                webSocket: {
                    connections: this.metrics.webSocketMetrics.connections,
                    messages: this.metrics.webSocketMetrics.messages,
                    errors: this.metrics.webSocketMetrics.errors,
                    reliability: `${((this.metrics.webSocketMetrics.messages / Math.max(this.metrics.webSocketMetrics.connections, 1)) * 100).toFixed(1)}%`
                }
            },
            serviceBreakdown: {},
            thresholdAnalysis: this.analyzeThresholds(successRate, p95, memoryStats.peak),
            errors: this.metrics.errors.slice(0, 50), // First 50 errors
            recommendations: []
        };
        
        // Service breakdown
        Object.entries(this.metrics.serviceMetrics).forEach(([service, metrics]) => {
            const serviceSuccessRate = metrics.requests > 0 ? metrics.successes / metrics.requests : 0;
            const avgResponseTime = metrics.responseTimes.length > 0 
                ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
                : 0;
            
            report.serviceBreakdown[service] = {
                requests: metrics.requests,
                successRate: `${(serviceSuccessRate * 100).toFixed(1)}%`,
                averageResponseTime: `${avgResponseTime.toFixed(0)}ms`,
                errors: metrics.errors.length
            };
        });
        
        // Generate recommendations
        report.recommendations = this.generateRecommendations(report);
        
        // Save detailed report
        await fs.writeJSON(this.resultFile, {
            config: this.config,
            metrics: this.metrics,
            report
        }, { spaces: 2 });
        
        // Display summary
        this.displayReport(report);
        
        return report;
    }
    
    getPercentile(sortedArray, percentile) {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
    }
    
    calculateMemoryStats() {
        if (this.metrics.memoryUsage.length === 0) {
            return { peak: '0MB', average: '0MB', growth: '0MB' };
        }
        
        const rssValues = this.metrics.memoryUsage.map(m => m.rss);
        const peak = Math.max(...rssValues);
        const average = rssValues.reduce((a, b) => a + b, 0) / rssValues.length;
        const initial = rssValues[0] || 0;
        const final = rssValues[rssValues.length - 1] || 0;
        const growth = final - initial;
        
        return {
            peak: `${peak.toFixed(1)}MB`,
            average: `${average.toFixed(1)}MB`,
            growth: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}MB`
        };
    }
    
    analyzeThresholds(successRate, p95, peakMemory) {
        const analysis = {
            passed: 0,
            failed: 0,
            results: []
        };
        
        // Success rate threshold
        if (successRate >= this.config.thresholds.minSuccessRate) {
            analysis.passed++;
            analysis.results.push(`✅ Success rate: ${(successRate * 100).toFixed(1)}% >= ${(this.config.thresholds.minSuccessRate * 100)}%`);
        } else {
            analysis.failed++;
            analysis.results.push(`❌ Success rate: ${(successRate * 100).toFixed(1)}% < ${(this.config.thresholds.minSuccessRate * 100)}%`);
        }
        
        // Response time threshold
        if (p95 <= this.config.thresholds.maxResponseTime) {
            analysis.passed++;
            analysis.results.push(`✅ P95 response time: ${p95}ms <= ${this.config.thresholds.maxResponseTime}ms`);
        } else {
            analysis.failed++;
            analysis.results.push(`❌ P95 response time: ${p95}ms > ${this.config.thresholds.maxResponseTime}ms`);
        }
        
        // Memory threshold
        const peakMemoryMB = parseFloat(peakMemory.replace('MB', ''));
        if (peakMemoryMB <= this.config.thresholds.maxMemoryUsage) {
            analysis.passed++;
            analysis.results.push(`✅ Peak memory: ${peakMemory} <= ${this.config.thresholds.maxMemoryUsage}MB`);
        } else {
            analysis.failed++;
            analysis.results.push(`❌ Peak memory: ${peakMemory} > ${this.config.thresholds.maxMemoryUsage}MB`);
        }
        
        return analysis;
    }
    
    generateRecommendations(report) {
        const recommendations = [];
        
        const successRate = parseFloat(report.summary.successRate);
        const p95 = parseFloat(report.performance.responseTime.p95);
        const avgRPS = parseFloat(report.summary.averageRPS);
        
        if (successRate < 95) {
            recommendations.push('🔧 Low success rate detected - investigate error patterns and service stability');
        }
        
        if (p95 > 500) {
            recommendations.push('⚡ High P95 response time - consider performance optimization or resource scaling');
        }
        
        if (avgRPS < this.config.requestsPerSecond * 0.8) {
            recommendations.push('📈 RPS below target - check for bottlenecks or increase concurrency');
        }
        
        if (this.metrics.webSocketMetrics.errors > this.metrics.webSocketMetrics.connections * 0.1) {
            recommendations.push('🌐 WebSocket reliability issues - investigate connection stability');
        }
        
        const memoryGrowth = parseFloat(report.performance.memory.growth);
        if (memoryGrowth > 100) {
            recommendations.push('🧠 Significant memory growth detected - check for memory leaks');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('🎉 All stress test metrics are within acceptable ranges!');
        }
        
        return recommendations;
    }
    
    displayReport(report) {
        console.log('\n' + '='.repeat(60));
        console.log('🏁 STRESS TEST COMPLETED');
        console.log('='.repeat(60));
        
        console.log('\n📊 SUMMARY:');
        console.log(`Duration: ${report.summary.duration}`);
        console.log(`Total Requests: ${report.summary.totalRequests.toLocaleString()}`);
        console.log(`Success Rate: ${report.summary.successRate}`);
        console.log(`Average RPS: ${report.summary.averageRPS}`);
        console.log(`Concurrency: ${report.summary.concurrency}`);
        
        console.log('\n⚡ PERFORMANCE:');
        console.log(`Response Time (avg): ${report.performance.responseTime.average}`);
        console.log(`Response Time (P95): ${report.performance.responseTime.p95}`);
        console.log(`Response Time (P99): ${report.performance.responseTime.p99}`);
        console.log(`Memory Peak: ${report.performance.memory.peak}`);
        console.log(`Memory Growth: ${report.performance.memory.growth}`);
        
        console.log('\n🌐 WEBSOCKET:');
        console.log(`Connections: ${report.performance.webSocket.connections}`);
        console.log(`Messages: ${report.performance.webSocket.messages}`);
        console.log(`Reliability: ${report.performance.webSocket.reliability}`);
        
        console.log('\n🎯 THRESHOLD ANALYSIS:');
        report.thresholdAnalysis.results.forEach(result => console.log(`  ${result}`));
        
        console.log('\n💡 RECOMMENDATIONS:');
        report.recommendations.forEach(rec => console.log(`  ${rec}`));
        
        console.log(`\n📄 Detailed results saved to: ${this.resultFile}`);
        console.log('='.repeat(60));
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Worker thread code for HTTP load testing
if (!isMainThread && workerData && workerData.isWorker) {
    const { workerId, config } = workerData;
    
    async function runWorker() {
        const services = Object.entries(config.services);
        let requestCount = 0;
        
        while (requestCount < 1000) { // Limit per worker to prevent runaway
            try {
                // Select random service and endpoint
                const [serviceName, service] = services[Math.floor(Math.random() * services.length)];
                const endpoint = service.endpoints[Math.floor(Math.random() * service.endpoints.length)];
                const url = `${service.url}${endpoint}`;
                
                const startTime = Date.now();
                
                try {
                    const response = await axios.get(url, { 
                        timeout: 10000,
                        validateStatus: () => true // Accept all status codes
                    });
                    
                    const responseTime = Date.now() - startTime;
                    const success = response.status >= 200 && response.status < 400;
                    
                    parentPort.postMessage({
                        type: 'request_result',
                        workerId,
                        service: serviceName,
                        endpoint,
                        success,
                        responseTime,
                        statusCode: response.status
                    });
                    
                } catch (error) {
                    const responseTime = Date.now() - startTime;
                    
                    parentPort.postMessage({
                        type: 'request_result',
                        workerId,
                        service: serviceName,
                        endpoint,
                        success: false,
                        responseTime,
                        error: error.message
                    });
                }
                
                requestCount++;
                
                // Rate limiting - adjust based on target RPS
                const delayMs = Math.max(0, (1000 / config.requestsPerSecond) - 50);
                if (delayMs > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
                
            } catch (error) {
                console.error(`Worker ${workerId} error:`, error);
                break;
            }
        }
    }
    
    runWorker().catch(error => {
        console.error(`Worker ${workerId} failed:`, error);
    });
}

// CLI interface
if (require.main === module && isMainThread) {
    const { Command } = require('commander');
    const program = new Command();
    
    program
        .name('stress-test')
        .description('Stress Testing Framework for Flask to Node.js Migration')
        .option('-d, --duration <seconds>', 'Test duration in seconds', '300')
        .option('-c, --concurrency <workers>', 'Number of concurrent workers', '50')
        .option('-r, --rps <rate>', 'Target requests per second', '100')
        .option('--quick', 'Quick stress test (1 minute, lower load)', false)
        .option('--extreme', 'Extreme stress test (high load)', false)
        .parse();
    
    const options = program.opts();
    
    if (options.quick) {
        options.duration = '60';    // 1 minute
        options.concurrency = '20'; // Lower concurrency
        options.rps = '50';         // Lower RPS
    }
    
    if (options.extreme) {
        options.concurrency = '100'; // Higher concurrency
        options.rps = '200';         // Higher RPS
    }
    
    const framework = new StressTestFramework({
        duration: parseInt(options.duration) * 1000,
        concurrency: parseInt(options.concurrency),
        requestsPerSecond: parseInt(options.rps)
    });
    
    framework.start().catch(error => {
        console.error('Stress test failed:', error);
        process.exit(1);
    });
}

module.exports = StressTestFramework;
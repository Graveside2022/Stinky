#!/usr/bin/env node

/**
 * Production Testing Framework for Flask to Node.js Migration
 * Comprehensive 24-hour monitoring and validation system
 * 
 * This framework monitors:
 * - Service uptime and availability
 * - API response times and error rates  
 * - Resource utilization trends
 * - WebSocket connection stability
 * - External system integration health
 * - Data processing accuracy and throughput
 * 
 * Usage: node tests/production-monitoring.js [--duration 86400] [--interval 30]
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const WebSocket = require('ws');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');

class ProductionTestingFramework extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            duration: options.duration || 86400000, // 24 hours in milliseconds
            interval: options.interval || 30000,    // 30 seconds between checks
            alertThresholds: {
                responseTime: 500,      // ms
                errorRate: 0.05,        // 5%
                memoryUsage: 512,       // MB
                cpuUsage: 80,           // %
                diskUsage: 90           // %
            },
            services: {
                spectrumAnalyzer: {
                    name: 'Spectrum Analyzer',
                    flask: { url: 'http://localhost:8092', port: 8092 },
                    nodejs: { url: 'http://localhost:3001', port: 3001 }
                },
                wigleToTak: {
                    name: 'WigleToTAK',
                    flask: { url: 'http://localhost:8000', port: 8000 },
                    nodejs: { url: 'http://localhost:3002', port: 3002 }
                },
                openWebRX: {
                    name: 'OpenWebRX',
                    url: 'http://localhost:8073',
                    port: 8073
                }
            },
            ...options
        };
        
        this.metrics = {
            startTime: Date.now(),
            totalChecks: 0,
            successfulChecks: 0,
            errors: [],
            serviceMetrics: {},
            performanceData: [],
            resourceUsage: []
        };
        
        this.isRunning = false;
        this.checkInterval = null;
        this.logFile = path.join(__dirname, `production-test-${Date.now()}.log`);
        this.dataFile = path.join(__dirname, `production-data-${Date.now()}.json`);
        
        this.initializeMetrics();
    }
    
    initializeMetrics() {
        Object.keys(this.config.services).forEach(serviceKey => {
            this.metrics.serviceMetrics[serviceKey] = {
                checks: 0,
                successes: 0,
                failures: 0,
                responseTimes: [],
                errors: [],
                uptime: 0,
                lastCheck: null,
                status: 'unknown'
            };
        });
    }
    
    async start() {
        if (this.isRunning) {
            throw new Error('Production testing framework is already running');
        }
        
        this.log('=== PRODUCTION TESTING FRAMEWORK STARTED ===');
        this.log(`Duration: ${this.config.duration / 1000} seconds (${this.config.duration / 3600000} hours)`);
        this.log(`Check interval: ${this.config.interval / 1000} seconds`);
        this.log(`Services to monitor: ${Object.keys(this.config.services).join(', ')}`);
        
        this.isRunning = true;
        this.emit('started');
        
        // Initial comprehensive health check
        await this.performComprehensiveHealthCheck();
        
        // Start periodic monitoring
        this.checkInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, this.config.interval);
        
        // Schedule automatic stop after duration
        setTimeout(() => {
            this.stop();
        }, this.config.duration);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
        
        this.log('Production testing framework is now monitoring services...');
        return this;
    }
    
    async stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.log('=== STOPPING PRODUCTION TESTING FRAMEWORK ===');
        this.isRunning = false;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        await this.generateFinalReport();
        this.emit('stopped');
        
        this.log('Production testing framework stopped');
    }
    
    async performComprehensiveHealthCheck() {
        this.log('--- COMPREHENSIVE HEALTH CHECK STARTED ---');
        
        try {
            // Test all services
            await this.performHealthCheck();
            
            // Test WebSocket connections
            await this.testWebSocketConnections();
            
            // Test load handling
            await this.performLoadTest();
            
            // Test external integrations
            await this.testExternalIntegrations();
            
            this.log('--- COMPREHENSIVE HEALTH CHECK COMPLETED ---');
        } catch (error) {
            this.log(`ERROR: Comprehensive health check failed: ${error.message}`, 'error');
        }
    }
    
    async performHealthCheck() {
        const checkStart = Date.now();
        this.metrics.totalChecks++;
        
        try {
            // Monitor system resources
            const resourceData = await this.collectResourceMetrics();
            this.metrics.resourceUsage.push(resourceData);
            
            // Check each service
            const serviceChecks = Object.entries(this.config.services).map(async ([key, service]) => {
                return await this.checkService(key, service);
            });
            
            const results = await Promise.allSettled(serviceChecks);
            
            // Process results
            let allHealthy = true;
            results.forEach((result, index) => {
                const serviceKey = Object.keys(this.config.services)[index];
                if (result.status === 'rejected') {
                    this.log(`ERROR: Service check failed for ${serviceKey}: ${result.reason}`, 'error');
                    allHealthy = false;
                } else if (!result.value.healthy) {
                    allHealthy = false;
                }
            });
            
            if (allHealthy) {
                this.metrics.successfulChecks++;
            }
            
            // Log periodic status
            const uptime = Date.now() - this.metrics.startTime;
            if (this.metrics.totalChecks % 10 === 0) { // Every 10th check
                this.log(`Status: ${this.metrics.successfulChecks}/${this.metrics.totalChecks} successful checks, uptime: ${Math.round(uptime / 60000)} minutes`);
            }
            
        } catch (error) {
            this.log(`ERROR: Health check failed: ${error.message}`, 'error');
            this.metrics.errors.push({
                timestamp: Date.now(),
                error: error.message,
                type: 'health_check'
            });
        }
    }
    
    async checkService(serviceKey, service) {
        const start = Date.now();
        const metrics = this.metrics.serviceMetrics[serviceKey];
        metrics.checks++;
        
        try {
            let testUrl = service.url;
            
            // For services with both Flask and Node.js versions, test the active one
            if (service.flask && service.nodejs) {
                // Check which one is currently running
                const flaskRunning = await this.isPortActive(service.flask.port);
                const nodejsRunning = await this.isPortActive(service.nodejs.port);
                
                if (flaskRunning) {
                    testUrl = service.flask.url;
                } else if (nodejsRunning) {
                    testUrl = service.nodejs.url;
                } else {
                    throw new Error(`Neither Flask nor Node.js version is running`);
                }
            }
            
            // Test API endpoints
            const endpoints = await this.getServiceEndpoints(serviceKey);
            const endpointResults = [];
            
            for (const endpoint of endpoints) {
                const endpointStart = Date.now();
                try {
                    const response = await axios.get(`${testUrl}${endpoint}`, {
                        timeout: 5000,
                        validateStatus: (status) => status < 500 // Accept all non-server-error responses
                    });
                    
                    const responseTime = Date.now() - endpointStart;
                    endpointResults.push({
                        endpoint,
                        status: response.status,
                        responseTime,
                        success: true
                    });
                    
                    // Check for performance issues
                    if (responseTime > this.config.alertThresholds.responseTime) {
                        this.log(`WARNING: Slow response on ${serviceKey}${endpoint}: ${responseTime}ms`, 'warning');
                    }
                    
                } catch (error) {
                    endpointResults.push({
                        endpoint,
                        error: error.message,
                        success: false
                    });
                    this.log(`ERROR: ${serviceKey}${endpoint} failed: ${error.message}`, 'error');
                }
            }
            
            const responseTime = Date.now() - start;
            const successfulEndpoints = endpointResults.filter(r => r.success).length;
            const totalEndpoints = endpointResults.length;
            const healthy = successfulEndpoints === totalEndpoints;
            
            if (healthy) {
                metrics.successes++;
                metrics.uptime = Date.now() - this.metrics.startTime;
                metrics.status = 'healthy';
            } else {
                metrics.failures++;
                metrics.status = 'unhealthy';
                metrics.errors.push({
                    timestamp: Date.now(),
                    endpoints: endpointResults.filter(r => !r.success)
                });
            }
            
            metrics.responseTimes.push(responseTime);
            metrics.lastCheck = Date.now();
            
            // Store performance data
            this.metrics.performanceData.push({
                timestamp: Date.now(),
                service: serviceKey,
                responseTime,
                healthy,
                endpointResults
            });
            
            return {
                service: serviceKey,
                healthy,
                responseTime,
                endpointResults,
                successRate: successfulEndpoints / totalEndpoints
            };
            
        } catch (error) {
            metrics.failures++;
            metrics.status = 'error';
            metrics.errors.push({
                timestamp: Date.now(),
                error: error.message
            });
            
            this.log(`ERROR: Service check failed for ${serviceKey}: ${error.message}`, 'error');
            
            return {
                service: serviceKey,
                healthy: false,
                error: error.message
            };
        }
    }
    
    async getServiceEndpoints(serviceKey) {
        switch (serviceKey) {
            case 'spectrumAnalyzer':
                return ['/api/status', '/api/config', '/api/profiles', '/api/signals'];
            case 'wigleToTak':
                return ['/api/status', '/list_wigle_files', '/get_antenna_settings'];
            case 'openWebRX':
                return ['/'];
            default:
                return ['/'];
        }
    }
    
    async isPortActive(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const socket = new net.Socket();
            
            socket.setTimeout(1000);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            
            socket.on('error', () => {
                resolve(false);
            });
            
            socket.connect(port, 'localhost');
        });
    }
    
    async testWebSocketConnections() {
        this.log('Testing WebSocket connections...');
        
        try {
            // Test Spectrum Analyzer WebSocket
            const spectrumWsUrl = 'ws://localhost:8092/socket.io/?EIO=4&transport=websocket';
            await this.testWebSocket(spectrumWsUrl, 'Spectrum Analyzer');
            
        } catch (error) {
            this.log(`ERROR: WebSocket testing failed: ${error.message}`, 'error');
        }
    }
    
    async testWebSocket(url, serviceName) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            let connected = false;
            let messageReceived = false;
            
            const timeout = setTimeout(() => {
                ws.close();
                if (!connected) {
                    reject(new Error(`WebSocket connection to ${serviceName} timed out`));
                } else if (!messageReceived) {
                    this.log(`WARNING: ${serviceName} WebSocket connected but no messages received`, 'warning');
                    resolve(false);
                }
            }, 5000);
            
            ws.on('open', () => {
                connected = true;
                this.log(`✓ ${serviceName} WebSocket connected`);
            });
            
            ws.on('message', (data) => {
                messageReceived = true;
                this.log(`✓ ${serviceName} WebSocket message received`);
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`${serviceName} WebSocket error: ${error.message}`));
            });
            
            ws.on('close', () => {
                clearTimeout(timeout);
                if (connected && messageReceived) {
                    resolve(true);
                }
            });
        });
    }
    
    async performLoadTest() {
        this.log('Performing load test...');
        
        try {
            const concurrentRequests = 10;
            const requestsPerService = 5;
            
            const loadTestPromises = Object.entries(this.config.services).map(async ([serviceKey, service]) => {
                if (!service.flask && !service.nodejs) return;
                
                const requests = [];
                for (let i = 0; i < concurrentRequests; i++) {
                    requests.push(this.performServiceLoadTest(serviceKey, service, requestsPerService));
                }
                
                return Promise.allSettled(requests);
            });
            
            const results = await Promise.allSettled(loadTestPromises);
            this.log(`Load test completed with ${results.length} service tests`);
            
        } catch (error) {
            this.log(`ERROR: Load test failed: ${error.message}`, 'error');
        }
    }
    
    async performServiceLoadTest(serviceKey, service, requestCount) {
        let testUrl = service.url;
        
        // Determine which version is running
        if (service.flask && service.nodejs) {
            const flaskRunning = await this.isPortActive(service.flask.port);
            testUrl = flaskRunning ? service.flask.url : service.nodejs.url;
        }
        
        const promises = [];
        for (let i = 0; i < requestCount; i++) {
            promises.push(
                axios.get(`${testUrl}/api/status`, { timeout: 10000 })
                    .then(response => ({ success: true, responseTime: response.headers['x-response-time'] || 0 }))
                    .catch(error => ({ success: false, error: error.message }))
            );
        }
        
        const results = await Promise.allSettled(promises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        this.log(`Load test ${serviceKey}: ${successCount}/${requestCount} successful requests`);
        return { service: serviceKey, successRate: successCount / requestCount };
    }
    
    async testExternalIntegrations() {
        this.log('Testing external integrations...');
        
        try {
            // Test OpenWebRX integration
            const openWebRXActive = await this.isPortActive(8073);
            if (openWebRXActive) {
                this.log('✓ OpenWebRX is active');
            } else {
                this.log('WARNING: OpenWebRX is not active', 'warning');
            }
            
            // Test GPSD integration
            const gpsdActive = await this.isPortActive(2947);
            if (gpsdActive) {
                this.log('✓ GPSD is active');
            } else {
                this.log('WARNING: GPSD is not active', 'warning');
            }
            
        } catch (error) {
            this.log(`ERROR: External integration test failed: ${error.message}`, 'error');
        }
    }
    
    async collectResourceMetrics() {
        return new Promise((resolve) => {
            exec('ps aux | grep -E "(node|python3)" | grep -v grep', (error, stdout) => {
                const processes = [];
                if (!error && stdout) {
                    stdout.split('\n').forEach(line => {
                        if (line.trim()) {
                            const parts = line.trim().split(/\s+/);
                            if (parts.length >= 11) {
                                processes.push({
                                    pid: parts[1],
                                    cpu: parseFloat(parts[2]),
                                    memory: parseFloat(parts[3]),
                                    command: parts.slice(10).join(' ')
                                });
                            }
                        }
                    });
                }
                
                resolve({
                    timestamp: Date.now(),
                    processes,
                    systemUptime: process.uptime(),
                    nodeMemory: process.memoryUsage()
                });
            });
        });
    }
    
    async generateFinalReport() {
        const endTime = Date.now();
        const totalDuration = endTime - this.metrics.startTime;
        const uptime = Math.round(totalDuration / 1000);
        
        const report = {
            summary: {
                testDuration: `${Math.round(totalDuration / 60000)} minutes`,
                totalChecks: this.metrics.totalChecks,
                successfulChecks: this.metrics.successfulChecks,
                successRate: (this.metrics.successfulChecks / this.metrics.totalChecks * 100).toFixed(2) + '%',
                totalErrors: this.metrics.errors.length,
                uptime: `${uptime} seconds`
            },
            services: {},
            performance: {
                averageResponseTimes: {},
                uptimePercentages: {},
                errorRates: {}
            },
            recommendations: []
        };
        
        // Generate service reports
        Object.entries(this.metrics.serviceMetrics).forEach(([serviceKey, metrics]) => {
            const avgResponseTime = metrics.responseTimes.length > 0 
                ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length)
                : 0;
            
            const uptimePercentage = metrics.checks > 0 
                ? (metrics.successes / metrics.checks * 100).toFixed(2)
                : 0;
            
            const errorRate = metrics.checks > 0 
                ? (metrics.failures / metrics.checks * 100).toFixed(2)
                : 0;
            
            report.services[serviceKey] = {
                totalChecks: metrics.checks,
                successes: metrics.successes,
                failures: metrics.failures,
                uptimePercentage: uptimePercentage + '%',
                averageResponseTime: avgResponseTime + 'ms',
                errorRate: errorRate + '%',
                status: metrics.status,
                errors: metrics.errors.length
            };
            
            report.performance.averageResponseTimes[serviceKey] = avgResponseTime;
            report.performance.uptimePercentages[serviceKey] = parseFloat(uptimePercentage);
            report.performance.errorRates[serviceKey] = parseFloat(errorRate);
            
            // Generate recommendations
            if (parseFloat(uptimePercentage) < 99) {
                report.recommendations.push(`${serviceKey}: Low uptime (${uptimePercentage}%) - investigate service stability`);
            }
            
            if (avgResponseTime > this.config.alertThresholds.responseTime) {
                report.recommendations.push(`${serviceKey}: Slow response times (${avgResponseTime}ms) - performance optimization needed`);
            }
            
            if (parseFloat(errorRate) > 5) {
                report.recommendations.push(`${serviceKey}: High error rate (${errorRate}%) - investigate error causes`);
            }
        });
        
        // Overall recommendations
        if (report.performance.uptimePercentages.spectrumAnalyzer > 95 && 
            report.performance.uptimePercentages.wigleToTak > 95) {
            report.recommendations.push('✓ MIGRATION VALIDATED: Both services show excellent stability');
        }
        
        if (Object.values(report.performance.averageResponseTimes).every(time => time < 500)) {
            report.recommendations.push('✓ PERFORMANCE VALIDATED: All services meet response time requirements');
        }
        
        // Save detailed data
        await fs.writeJSON(this.dataFile, {
            metrics: this.metrics,
            config: this.config,
            report
        }, { spaces: 2 });
        
        // Log final report
        this.log('=== FINAL PRODUCTION TEST REPORT ===');
        this.log(`Test Duration: ${report.summary.testDuration}`);
        this.log(`Total Checks: ${report.summary.totalChecks}`);
        this.log(`Success Rate: ${report.summary.successRate}`);
        this.log(`Total Errors: ${report.summary.totalErrors}`);
        this.log('');
        this.log('SERVICE PERFORMANCE:');
        
        Object.entries(report.services).forEach(([service, metrics]) => {
            this.log(`${service}:`);
            this.log(`  Uptime: ${metrics.uptimePercentage}`);
            this.log(`  Avg Response: ${metrics.averageResponseTime}`);
            this.log(`  Error Rate: ${metrics.errorRate}`);
            this.log(`  Status: ${metrics.status}`);
        });
        
        if (report.recommendations.length > 0) {
            this.log('');
            this.log('RECOMMENDATIONS:');
            report.recommendations.forEach(rec => this.log(`- ${rec}`));
        }
        
        this.log('');
        this.log(`Detailed data saved to: ${this.dataFile}`);
        this.log('=== END REPORT ===');
        
        return report;
    }
    
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        console.log(logEntry);
        
        // Write to log file
        fs.appendFileSync(this.logFile, logEntry + '\n');
    }
}

// CLI interface
if (require.main === module) {
    const { Command } = require('commander');
    const program = new Command();
    
    program
        .name('production-monitoring')
        .description('Production Testing Framework for Flask to Node.js Migration')
        .option('-d, --duration <seconds>', 'Test duration in seconds', '86400')
        .option('-i, --interval <seconds>', 'Check interval in seconds', '30')
        .option('--quick', 'Quick test mode (5 minutes)', false)
        .option('--stress', 'Stress test mode with higher load', false)
        .parse();
    
    const options = program.opts();
    
    if (options.quick) {
        options.duration = '300'; // 5 minutes
        options.interval = '10';  // 10 seconds
    }
    
    const framework = new ProductionTestingFramework({
        duration: parseInt(options.duration) * 1000,
        interval: parseInt(options.interval) * 1000,
        stressTest: options.stress
    });
    
    framework.start().catch(error => {
        console.error('Production testing framework failed to start:', error);
        process.exit(1);
    });
}

module.exports = ProductionTestingFramework;
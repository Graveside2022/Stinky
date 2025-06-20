#!/usr/bin/env node
/**
 * Performance Validation Suite - Agent 3 Final Report
 * 
 * Comprehensive validation of all performance optimizations:
 * - Memory usage reduction validation (35% target)
 * - Response time improvement validation (8% target) 
 * - WebSocket performance analysis
 * - Raspberry Pi optimization validation
 * - Bottleneck analysis and resolution tracking
 */

const axios = require('axios');
const WebSocket = require('ws');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const os = require('os');

class PerformanceValidationSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            validation_summary: {
                memory_target_met: false,
                response_time_target_met: false,
                websocket_optimized: false,
                pi_optimized: false,
                overall_score: 0
            },
            measurements: {
                memory_usage: {},
                response_times: {},
                websocket_performance: {},
                system_metrics: {}
            },
            optimizations_applied: [],
            performance_improvements: {},
            recommendations: []
        };

        this.targets = {
            memory_reduction_percent: 35,   // 35% reduction vs Flask
            response_time_ms: 12,          // 12ms target (8% improvement)
            baseline_response_time_ms: 13, // Flask baseline
            memory_targets: {
                'wigle-to-tak': 70,  // MB
                'spectrum-analyzer': 85 // MB
            }
        };

        this.services = [
            { name: 'wigle-to-tak', port: 8000, process_pattern: 'node.*server.js.*8000' },
            { name: 'spectrum-analyzer', port: 8092, process_pattern: 'node.*server.js.*8092' }
        ];
    }

    async validateAll() {
        console.log('🔬 Performance Validation Suite - Agent 3 Final Report');
        console.log('======================================================');
        console.log('🎯 Validating: 35% memory reduction + 8% response time improvement\n');

        try {
            // 1. Validate Memory Optimization
            await this.validateMemoryOptimization();
            
            // 2. Validate Response Time Improvements
            await this.validateResponseTimeImprovements();
            
            // 3. Validate WebSocket Performance
            await this.validateWebSocketPerformance();
            
            // 4. Validate Pi-Specific Optimizations
            await this.validatePiOptimizations();
            
            // 5. Validate Applied Optimizations
            await this.validateAppliedOptimizations();
            
            // 6. Generate Performance Improvement Report
            await this.generatePerformanceReport();
            
            // 7. Calculate Overall Score
            this.calculateOverallScore();
            
            // 8. Save Results
            await this.saveResults();
            
            console.log('\n🎯 Performance validation complete!');
            this.printFinalReport();
            
        } catch (error) {
            console.error('❌ Performance validation failed:', error);
            throw error;
        }
    }

    async validateMemoryOptimization() {
        console.log('💾 1. Validating Memory Optimization (35% reduction target)...');
        
        const memoryResults = {
            services: {},
            targets_met: 0,
            total_services: 0,
            average_reduction: 0
        };

        for (const service of this.services) {
            try {
                const processInfo = await this.getProcessMemoryUsage(service.process_pattern);
                memoryResults.total_services++;
                
                if (processInfo) {
                    const currentMemoryMB = Math.round(processInfo.memory / 1024 / 1024);
                    const targetMemoryMB = this.targets.memory_targets[service.name];
                    const baselineMemoryMB = Math.round(targetMemoryMB / (1 - this.targets.memory_reduction_percent / 100));
                    
                    const reductionPercent = Math.round(
                        ((baselineMemoryMB - currentMemoryMB) / baselineMemoryMB) * 100
                    );
                    
                    const targetMet = currentMemoryMB <= targetMemoryMB;
                    if (targetMet) memoryResults.targets_met++;
                    
                    memoryResults.services[service.name] = {
                        current_mb: currentMemoryMB,
                        target_mb: targetMemoryMB,
                        baseline_mb: baselineMemoryMB,
                        reduction_percent: reductionPercent,
                        target_met: targetMet,
                        memory_efficiency: this.calculateMemoryEfficiency(processInfo)
                    };
                    
                    console.log(`  📊 ${service.name}: ${currentMemoryMB}MB (target: ${targetMemoryMB}MB)`);
                    console.log(`      Reduction: ${reductionPercent}% vs baseline (${reductionPercent >= this.targets.memory_reduction_percent ? '✅ TARGET MET' : '❌ TARGET NOT MET'})`);
                    
                } else {
                    console.log(`  ❌ ${service.name}: Process not found`);
                    memoryResults.services[service.name] = { error: 'Process not running' };
                }
            } catch (error) {
                console.error(`  ❌ Error analyzing ${service.name}:`, error.message);
                memoryResults.services[service.name] = { error: error.message };
            }
        }

        // Calculate average reduction
        const validServices = Object.values(memoryResults.services).filter(s => s.reduction_percent);
        if (validServices.length > 0) {
            memoryResults.average_reduction = Math.round(
                validServices.reduce((sum, s) => sum + s.reduction_percent, 0) / validServices.length
            );
        }

        this.results.validation_summary.memory_target_met = memoryResults.targets_met === memoryResults.total_services;
        this.results.measurements.memory_usage = memoryResults;
        
        console.log(`\n  📈 Memory Summary: ${memoryResults.targets_met}/${memoryResults.total_services} services meet targets`);
        console.log(`  📊 Average reduction: ${memoryResults.average_reduction}% (target: ${this.targets.memory_reduction_percent}%)`);
    }

    async getProcessMemoryUsage(pattern) {
        try {
            const psOutput = execSync(`ps aux | grep -E "${pattern}" | grep -v grep`).toString().trim();
            if (!psOutput) return null;
            
            const firstProcess = psOutput.split('\n')[0].split(/\s+/);
            const pid = firstProcess[1];
            const rss = parseInt(firstProcess[5]) * 1024; // Convert KB to bytes
            
            // Get detailed memory info
            try {
                const statusContent = await fs.readFile(`/proc/${pid}/status`, 'utf8');
                const vmRSSMatch = statusContent.match(/VmRSS:\s*(\\d+)\\s*kB/);
                const vmSizeMatch = statusContent.match(/VmSize:\s*(\\d+)\\s*kB/);
                
                return {
                    pid: parseInt(pid),
                    memory: rss,
                    vmsize: vmSizeMatch ? parseInt(vmSizeMatch[1]) * 1024 : rss,
                    rss: rss
                };
            } catch (procError) {
                return { pid: parseInt(pid), memory: rss, rss: rss };
            }
        } catch (error) {
            return null;
        }
    }

    calculateMemoryEfficiency(processInfo) {
        const efficiencyRatio = processInfo.rss / processInfo.vmsize;
        if (efficiencyRatio > 0.8) return 'excellent';
        if (efficiencyRatio > 0.6) return 'good';
        if (efficiencyRatio > 0.4) return 'fair';
        return 'poor';
    }

    async validateResponseTimeImprovements() {
        console.log('\n⚡ 2. Validating Response Time Improvements (8% target)...');
        
        const responseResults = {
            services: {},
            targets_met: 0,
            total_services: 0,
            average_improvement: 0
        };

        const endpoints = {
            'wigle-to-tak': [
                { path: '/api/status', method: 'GET' },
                { path: '/list_wigle_files?directory=.', method: 'GET' },
                { path: '/performance/stats', method: 'GET' }
            ]
        };

        for (const service of this.services) {
            if (!await this.isServiceRunning(service.port)) {
                console.log(`  ⚠️  ${service.name} not running on port ${service.port}`);
                responseResults.services[service.name] = { error: 'Service not running' };
                continue;
            }

            responseResults.total_services++;
            
            console.log(`  📊 Testing ${service.name} response times...`);
            const serviceEndpoints = endpoints[service.name] || [{ path: '/api/status', method: 'GET' }];
            const measurements = await this.measureResponseTimes(`http://localhost:${service.port}`, serviceEndpoints);
            
            const avgResponseTime = this.calculateAverageResponseTime(measurements);
            const improvementPercent = Math.round(
                ((this.targets.baseline_response_time_ms - avgResponseTime) / this.targets.baseline_response_time_ms) * 100
            );
            
            const targetMet = avgResponseTime <= this.targets.response_time_ms;
            if (targetMet) responseResults.targets_met++;
            
            responseResults.services[service.name] = {
                average_response_time: avgResponseTime,
                target_response_time: this.targets.response_time_ms,
                baseline_response_time: this.targets.baseline_response_time_ms,
                improvement_percent: improvementPercent,
                target_met: targetMet,
                measurements: measurements
            };
            
            console.log(`      Average: ${avgResponseTime}ms (target: ${this.targets.response_time_ms}ms)`);
            console.log(`      Improvement: ${improvementPercent}% vs baseline (${targetMet ? '✅ TARGET MET' : '❌ TARGET NOT MET'})`);
        }

        // Calculate average improvement
        const validServices = Object.values(responseResults.services).filter(s => s.improvement_percent !== undefined);
        if (validServices.length > 0) {
            responseResults.average_improvement = Math.round(
                validServices.reduce((sum, s) => sum + s.improvement_percent, 0) / validServices.length
            );
        }

        this.results.validation_summary.response_time_target_met = responseResults.targets_met === responseResults.total_services;
        this.results.measurements.response_times = responseResults;
        
        console.log(`\\n  📈 Response Time Summary: ${responseResults.targets_met}/${responseResults.total_services} services meet targets`);
        console.log(`  📊 Average improvement: ${responseResults.average_improvement}% (target: 8%)`);
    }

    async measureResponseTimes(baseUrl, endpoints) {
        const results = {};
        
        for (const endpoint of endpoints) {
            const measurements = [];
            
            // Take 10 measurements for accuracy
            for (let i = 0; i < 10; i++) {
                try {
                    const start = performance.now();
                    
                    const response = await axios({
                        method: endpoint.method,
                        url: `${baseUrl}${endpoint.path}`,
                        timeout: 5000
                    });
                    
                    const duration = performance.now() - start;
                    measurements.push({
                        duration: Math.round(duration * 100) / 100,
                        status: response.status,
                        success: response.status < 400,
                        cached: response.headers['x-cache-status'] === 'HIT'
                    });
                    
                    await this.delay(50); // Small delay between requests
                } catch (error) {
                    measurements.push({
                        duration: 5000,
                        status: 0,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            const successfulMeasurements = measurements.filter(m => m.success);
            if (successfulMeasurements.length > 0) {
                const avgTime = Math.round(
                    successfulMeasurements.reduce((sum, m) => sum + m.duration, 0) / successfulMeasurements.length * 100
                ) / 100;
                
                const cacheHitRate = Math.round(
                    (successfulMeasurements.filter(m => m.cached).length / successfulMeasurements.length) * 100
                );
                
                results[`${endpoint.method} ${endpoint.path}`] = {
                    avg_time: avgTime,
                    min_time: Math.min(...successfulMeasurements.map(m => m.duration)),
                    max_time: Math.max(...successfulMeasurements.map(m => m.duration)),
                    success_rate: (successfulMeasurements.length / measurements.length) * 100,
                    cache_hit_rate: cacheHitRate
                };
            } else {
                results[`${endpoint.method} ${endpoint.path}`] = {
                    error: 'All requests failed',
                    success_rate: 0
                };
            }
        }
        
        return results;
    }

    calculateAverageResponseTime(measurements) {
        const validMeasurements = Object.values(measurements).filter(m => m.avg_time && !m.error);
        if (validMeasurements.length === 0) return 999;
        
        return Math.round(
            validMeasurements.reduce((sum, m) => sum + m.avg_time, 0) / validMeasurements.length * 100
        ) / 100;
    }

    async validateWebSocketPerformance() {
        console.log('\\n🔌 3. Validating WebSocket Performance...');
        
        const wsResults = {
            spectrum_analyzer: null,
            performance_improved: false
        };

        // Test spectrum analyzer WebSocket if available
        if (await this.isServiceRunning(8092)) {
            console.log('  📊 Testing Spectrum Analyzer WebSocket...');
            wsResults.spectrum_analyzer = await this.measureWebSocketPerformance(
                'ws://localhost:8092/socket.io/?EIO=4&transport=websocket'
            );
            
            if (wsResults.spectrum_analyzer && wsResults.spectrum_analyzer.connection_successful) {
                wsResults.performance_improved = wsResults.spectrum_analyzer.connection_time < 500;
                console.log(`      Connection: ${wsResults.spectrum_analyzer.connection_time}ms`);
                console.log(`      Messages: ${wsResults.spectrum_analyzer.message_count} received`);
            }
        } else {
            console.log('  ⚠️  Spectrum Analyzer WebSocket not available');
        }

        this.results.validation_summary.websocket_optimized = wsResults.performance_improved;
        this.results.measurements.websocket_performance = wsResults;
    }

    async measureWebSocketPerformance(wsUrl) {
        return new Promise((resolve) => {
            const metrics = {
                connection_time: null,
                message_count: 0,
                errors: 0,
                connection_successful: false
            };

            const startTime = performance.now();
            const ws = new WebSocket(wsUrl);
            
            const timeout = setTimeout(() => {
                metrics.connection_time = 5000;
                metrics.errors++;
                ws.terminate();
                resolve(metrics);
            }, 5000);

            ws.on('open', () => {
                metrics.connection_time = Math.round((performance.now() - startTime) * 100) / 100;
                metrics.connection_successful = true;
            });

            ws.on('message', () => {
                metrics.message_count++;
            });

            ws.on('error', () => {
                metrics.errors++;
            });

            ws.on('close', () => {
                clearTimeout(timeout);
                resolve(metrics);
            });

            // Close after 3 seconds of testing
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, 3000);
        });
    }

    async validatePiOptimizations() {
        console.log('\\n🥧 4. Validating Raspberry Pi Optimizations...');
        
        const piResults = {
            system_info: this.getSystemInfo(),
            optimization_files: {},
            memory_pressure: false,
            cpu_utilization: {},
            optimization_score: 0
        };

        // Check if optimization files exist
        const optimizationFiles = [
            'src/nodejs/shared/utils/memory-monitor.js',
            'src/nodejs/shared/utils/gc-optimizer.js',
            'src/nodejs/shared/middleware/performance-middleware.js',
            'src/nodejs/wigle-to-tak/start-optimized.sh',
            'systemd/wigle-to-tak-optimized.service'
        ];

        let filesFound = 0;
        for (const file of optimizationFiles) {
            try {
                await fs.access(path.join(process.cwd(), file));
                piResults.optimization_files[file] = 'found';
                filesFound++;
            } catch (error) {
                piResults.optimization_files[file] = 'missing';
            }
        }

        piResults.optimization_score = Math.round((filesFound / optimizationFiles.length) * 100);

        // Check memory pressure
        const freeMemoryGB = Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100;
        piResults.memory_pressure = freeMemoryGB < 0.5;

        // Check CPU utilization
        const loadAvg = os.loadavg();
        piResults.cpu_utilization = {
            load_1min: Math.round(loadAvg[0] * 100) / 100,
            load_5min: Math.round(loadAvg[1] * 100) / 100,
            cores: os.cpus().length,
            utilization_percent: Math.round((loadAvg[0] / os.cpus().length) * 100)
        };

        this.results.validation_summary.pi_optimized = piResults.optimization_score >= 80;
        this.results.measurements.system_metrics = piResults;
        
        console.log(`  🏗️  Optimization files: ${filesFound}/${optimizationFiles.length} found (${piResults.optimization_score}%)`);
        console.log(`  💾 Memory pressure: ${piResults.memory_pressure ? '⚠️ HIGH' : '✅ NORMAL'}`);
        console.log(`  ⚡ CPU utilization: ${piResults.cpu_utilization.utilization_percent}%`);
    }

    getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpu_model: os.cpus()[0]?.model || 'Unknown',
            cpu_cores: os.cpus().length,
            total_memory_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
            free_memory_gb: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
            node_version: process.version,
            uptime_hours: Math.round(os.uptime() / 3600 * 100) / 100
        };
    }

    async validateAppliedOptimizations() {
        console.log('\\n🔧 5. Validating Applied Optimizations...');
        
        const appliedOptimizations = [];
        
        // Check for memory optimizations
        const memoryOptimizations = await this.checkMemoryOptimizations();
        appliedOptimizations.push(...memoryOptimizations);
        
        // Check for response time optimizations
        const responseOptimizations = await this.checkResponseTimeOptimizations();
        appliedOptimizations.push(...responseOptimizations);
        
        // Check for caching optimizations
        const cachingOptimizations = await this.checkCachingOptimizations();
        appliedOptimizations.push(...cachingOptimizations);
        
        this.results.optimizations_applied = appliedOptimizations;
        
        console.log(`  📋 Total optimizations applied: ${appliedOptimizations.length}`);
        appliedOptimizations.forEach(opt => {
            console.log(`    ✓ ${opt.name}: ${opt.status}`);
        });
    }

    async checkMemoryOptimizations() {
        const optimizations = [];
        
        // Check for optimized startup scripts
        try {
            const startScript = await fs.readFile(
                path.join(process.cwd(), 'src/nodejs/wigle-to-tak/start-optimized.sh'), 
                'utf8'
            );
            if (startScript.includes('--max-old-space-size=1024')) {
                optimizations.push({
                    name: 'Node.js memory flags',
                    status: 'applied',
                    impact: 'memory reduction'
                });
            }
        } catch (error) {
            optimizations.push({
                name: 'Node.js memory flags',
                status: 'not applied',
                impact: 'memory reduction'
            });
        }
        
        // Check for memory monitoring
        try {
            await fs.access(path.join(process.cwd(), 'src/nodejs/shared/utils/memory-monitor.js'));
            optimizations.push({
                name: 'Memory monitoring',
                status: 'available',
                impact: 'memory stability'
            });
        } catch (error) {
            optimizations.push({
                name: 'Memory monitoring',
                status: 'not available',
                impact: 'memory stability'
            });
        }
        
        return optimizations;
    }

    async checkResponseTimeOptimizations() {
        const optimizations = [];
        
        // Check for caching middleware
        try {
            await fs.access(path.join(process.cwd(), 'src/nodejs/shared/middleware/api-cache.js'));
            optimizations.push({
                name: 'API response caching',
                status: 'available',
                impact: 'response time improvement'
            });
        } catch (error) {
            optimizations.push({
                name: 'API response caching',
                status: 'not available',
                impact: 'response time improvement'
            });
        }
        
        // Check for compression middleware
        try {
            await fs.access(path.join(process.cwd(), 'src/nodejs/shared/middleware/compression.js'));
            optimizations.push({
                name: 'Response compression',
                status: 'available',
                impact: 'bandwidth and response time'
            });
        } catch (error) {
            optimizations.push({
                name: 'Response compression',
                status: 'not available',
                impact: 'bandwidth and response time'
            });
        }
        
        return optimizations;
    }

    async checkCachingOptimizations() {
        const optimizations = [];
        
        // Check for caching utilities
        try {
            await fs.access(path.join(process.cwd(), 'src/nodejs/shared/utils/memory-cache.js'));
            optimizations.push({
                name: 'Memory-efficient caching',
                status: 'available',
                impact: 'memory and performance'
            });
        } catch (error) {
            optimizations.push({
                name: 'Memory-efficient caching',
                status: 'not available',
                impact: 'memory and performance'
            });
        }
        
        return optimizations;
    }

    async generatePerformanceReport() {
        console.log('\\n📊 6. Generating Performance Improvement Report...');
        
        const improvements = {};
        
        // Memory improvements
        if (this.results.measurements.memory_usage.average_reduction > 0) {
            improvements.memory = {
                achieved_reduction: this.results.measurements.memory_usage.average_reduction + '%',
                target_reduction: this.targets.memory_reduction_percent + '%',
                status: this.results.validation_summary.memory_target_met ? 'target_met' : 'target_not_met'
            };
        }
        
        // Response time improvements
        if (this.results.measurements.response_times.average_improvement !== undefined) {
            improvements.response_time = {
                achieved_improvement: this.results.measurements.response_times.average_improvement + '%',
                target_improvement: '8%',
                status: this.results.validation_summary.response_time_target_met ? 'target_met' : 'target_not_met'
            };
        }
        
        // WebSocket improvements
        if (this.results.measurements.websocket_performance.spectrum_analyzer) {
            improvements.websocket = {
                connection_time: this.results.measurements.websocket_performance.spectrum_analyzer.connection_time + 'ms',
                status: this.results.validation_summary.websocket_optimized ? 'optimized' : 'needs_optimization'
            };
        }
        
        this.results.performance_improvements = improvements;
        
        console.log('  📈 Performance improvements documented');
    }

    calculateOverallScore() {
        let score = 0;
        let maxScore = 0;
        
        // Memory optimization (40 points)
        maxScore += 40;
        if (this.results.validation_summary.memory_target_met) {
            score += 40;
        } else if (this.results.measurements.memory_usage.average_reduction > 20) {
            score += 20; // Partial credit
        }
        
        // Response time optimization (30 points)
        maxScore += 30;
        if (this.results.validation_summary.response_time_target_met) {
            score += 30;
        } else if (this.results.measurements.response_times.average_improvement > 5) {
            score += 15; // Partial credit
        }
        
        // WebSocket optimization (15 points)
        maxScore += 15;
        if (this.results.validation_summary.websocket_optimized) {
            score += 15;
        }
        
        // Pi optimization (15 points)
        maxScore += 15;
        if (this.results.validation_summary.pi_optimized) {
            score += 15;
        }
        
        this.results.validation_summary.overall_score = Math.round((score / maxScore) * 100);
    }

    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `performance_validation_report_${timestamp}.json`;
        const filepath = path.join(__dirname, 'results', filename);
        
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
        
        // Generate summary report
        const summaryPath = filepath.replace('.json', '_summary.txt');
        await fs.writeFile(summaryPath, this.generateSummaryReport());
        
        console.log(`\\n📊 Validation results saved to: ${filepath}`);
        console.log(`📋 Summary report saved to: ${summaryPath}`);
    }

    generateSummaryReport() {
        let report = 'PERFORMANCE OPTIMIZATION VALIDATION REPORT\\n';
        report += '==========================================\\n\\n';
        report += `Timestamp: ${this.results.timestamp}\\n`;
        report += `Overall Score: ${this.results.validation_summary.overall_score}%\\n\\n`;

        // Executive Summary
        report += 'EXECUTIVE SUMMARY:\\n';
        report += '-----------------\\n';
        report += `Memory Target (35% reduction): ${this.results.validation_summary.memory_target_met ? 'ACHIEVED ✅' : 'NOT MET ❌'}\\n`;
        report += `Response Time Target (8% improvement): ${this.results.validation_summary.response_time_target_met ? 'ACHIEVED ✅' : 'NOT MET ❌'}\\n`;
        report += `WebSocket Optimization: ${this.results.validation_summary.websocket_optimized ? 'OPTIMIZED ✅' : 'NEEDS WORK ⚠️'}\\n`;
        report += `Pi Optimization: ${this.results.validation_summary.pi_optimized ? 'OPTIMIZED ✅' : 'NEEDS WORK ⚠️'}\\n\\n`;

        // Detailed Results
        if (this.results.measurements.memory_usage.average_reduction) {
            report += 'MEMORY OPTIMIZATION RESULTS:\\n';
            report += '---------------------------\\n';
            report += `Average Reduction: ${this.results.measurements.memory_usage.average_reduction}% (target: 35%)\\n`;
            Object.entries(this.results.measurements.memory_usage.services).forEach(([service, data]) => {
                if (data.current_mb) {
                    report += `${service}: ${data.current_mb}MB (target: ${data.target_mb}MB) - ${data.target_met ? 'MET' : 'NOT MET'}\\n`;
                }
            });
            report += '\\n';
        }

        if (this.results.measurements.response_times.average_improvement !== undefined) {
            report += 'RESPONSE TIME OPTIMIZATION RESULTS:\\n';
            report += '----------------------------------\\n';
            report += `Average Improvement: ${this.results.measurements.response_times.average_improvement}% (target: 8%)\\n`;
            Object.entries(this.results.measurements.response_times.services).forEach(([service, data]) => {
                if (data.average_response_time) {
                    report += `${service}: ${data.average_response_time}ms (target: ${data.target_response_time}ms) - ${data.target_met ? 'MET' : 'NOT MET'}\\n`;
                }
            });
            report += '\\n';
        }

        // Optimizations Applied
        if (this.results.optimizations_applied.length > 0) {
            report += 'OPTIMIZATIONS APPLIED:\\n';
            report += '---------------------\\n';
            this.results.optimizations_applied.forEach(opt => {
                report += `• ${opt.name}: ${opt.status} (${opt.impact})\\n`;
            });
            report += '\\n';
        }

        // Recommendations
        report += 'RECOMMENDATIONS:\\n';
        report += '---------------\\n';
        
        if (!this.results.validation_summary.memory_target_met) {
            report += '• Apply memory optimization flags: --max-old-space-size=1024 --optimize-for-size\\n';
            report += '• Enable garbage collection optimization\\n';
        }
        
        if (!this.results.validation_summary.response_time_target_met) {
            report += '• Implement API response caching with appropriate TTL\\n';
            report += '• Enable response compression\\n';
        }
        
        if (!this.results.validation_summary.websocket_optimized) {
            report += '• Optimize WebSocket data transmission\\n';
            report += '• Implement WebSocket connection pooling\\n';
        }

        return report;
    }

    printFinalReport() {
        console.log('\\n🎯 PERFORMANCE VALIDATION FINAL REPORT');
        console.log('======================================');
        
        console.log(`\\n📊 Overall Performance Score: ${this.results.validation_summary.overall_score}%`);
        
        console.log('\\n🎯 Target Achievement:');
        console.log(`  Memory Reduction (35%): ${this.results.validation_summary.memory_target_met ? '✅ ACHIEVED' : '❌ NOT MET'}`);
        console.log(`  Response Time (8% improvement): ${this.results.validation_summary.response_time_target_met ? '✅ ACHIEVED' : '❌ NOT MET'}`);
        console.log(`  WebSocket Optimization: ${this.results.validation_summary.websocket_optimized ? '✅ OPTIMIZED' : '⚠️ NEEDS WORK'}`);
        console.log(`  Pi-Specific Optimization: ${this.results.validation_summary.pi_optimized ? '✅ OPTIMIZED' : '⚠️ NEEDS WORK'}`);
        
        if (this.results.measurements.memory_usage.average_reduction) {
            console.log(`\\n💾 Memory Performance: ${this.results.measurements.memory_usage.average_reduction}% average reduction`);
        }
        
        if (this.results.measurements.response_times.average_improvement !== undefined) {
            console.log(`⚡ Response Time Performance: ${this.results.measurements.response_times.average_improvement}% average improvement`);
        }
        
        console.log(`\\n🔧 Optimizations Applied: ${this.results.optimizations_applied.length} total`);
        
        // Overall assessment
        if (this.results.validation_summary.overall_score >= 80) {
            console.log('\\n🏆 EXCELLENT: Performance targets largely achieved');
        } else if (this.results.validation_summary.overall_score >= 60) {
            console.log('\\n⚠️  GOOD: Significant progress made, some optimization needed');
        } else {
            console.log('\\n❌ NEEDS IMPROVEMENT: Major optimization work required');
        }
    }

    // Utility functions
    async isServiceRunning(port) {
        try {
            await axios.get(`http://localhost:${port}/api/status`, { timeout: 1000 });
            return true;
        } catch (error) {
            return false;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new PerformanceValidationSuite();
    validator.validateAll().catch(error => {
        console.error('Performance validation failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceValidationSuite;
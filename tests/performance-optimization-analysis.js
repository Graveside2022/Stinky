#!/usr/bin/env node
/**
 * Performance Optimization and Tuning Analysis - Agent 3
 * 
 * Comprehensive analysis of Node.js services for maximum Raspberry Pi performance.
 * Validates memory usage reduction, response time improvements, and identifies bottlenecks.
 */

const axios = require('axios');
const WebSocket = require('ws');
const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const os = require('os');

class PerformanceOptimizationAnalyzer {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            system_info: this.getSystemInfo(),
            performance_targets: {
                memory_reduction: "35%", // Target vs Flask (70MB vs 105MB)
                response_time_improvement: "8%", // Target (12ms vs 13ms)
                websocket_performance: "improved",
                pi_optimization: "maximized"
            },
            analysis: {
                memory_usage: {},
                response_times: {},
                websocket_metrics: {},
                pi_optimizations: {},
                caching_opportunities: {},
                bottlenecks: []
            },
            recommendations: [],
            optimization_plan: []
        };

        this.services = [
            {
                name: 'wigle-to-tak-nodejs',
                port: 8000,
                process_pattern: 'node.*server.js.*8000',
                baseline_memory: 105 * 1024 * 1024, // 105MB Flask baseline
                target_memory: 70 * 1024 * 1024   // 70MB target (35% reduction)
            },
            {
                name: 'spectrum-analyzer-nodejs',  
                port: 8092,
                process_pattern: 'node.*server.js.*8092',
                baseline_memory: 120 * 1024 * 1024, // Estimated Flask baseline
                target_memory: 85 * 1024 * 1024    // Target reduction
            }
        ];
    }

    getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            cpu_model: os.cpus()[0]?.model || 'Unknown',
            total_memory: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
            free_memory: Math.round(os.freemem() / 1024 / 1024) + ' MB',
            node_version: process.version,
            uptime: os.uptime(),
            load_average: os.loadavg()
        };
    }

    async analyzeAll() {
        console.log('🔬 Performance Optimization and Tuning Analysis - Agent 3');
        console.log('===============================================================');
        console.log(`🎯 Targets: 35% memory reduction, 8% response time improvement`);
        console.log('');

        try {
            // 1. Memory Usage Validation
            await this.analyzeMemoryUsage();
            
            // 2. Response Time Analysis  
            await this.analyzeResponseTimes();
            
            // 3. WebSocket Performance Analysis
            await this.analyzeWebSocketPerformance();
            
            // 4. Raspberry Pi Specific Optimizations
            await this.analyzeRaspberryPiOptimizations();
            
            // 5. Caching Strategy Analysis
            await this.analyzeCachingOpportunities();
            
            // 6. Bottleneck Identification
            await this.identifyBottlenecks();
            
            // 7. Generate Optimization Recommendations
            await this.generateOptimizationPlan();
            
            // 8. Save Results
            await this.saveResults();
            
            console.log('\n🎯 Performance analysis complete!');
            this.printExecutiveSummary();
            
        } catch (error) {
            console.error('❌ Performance analysis failed:', error);
            throw error;
        }
    }

    async analyzeMemoryUsage() {
        console.log('📊 1. Memory Usage Analysis...');
        
        const memoryResults = {
            current_usage: {},
            vs_baseline: {},
            optimization_potential: {},
            target_validation: {}
        };

        for (const service of this.services) {
            try {
                // Get current memory usage
                const processInfo = await this.getProcessMemoryUsage(service.process_pattern);
                
                if (processInfo) {
                    const currentMemoryMB = Math.round(processInfo.memory / 1024 / 1024);
                    const targetMemoryMB = Math.round(service.target_memory / 1024 / 1024);
                    const baselineMemoryMB = Math.round(service.baseline_memory / 1024 / 1024);
                    
                    const reductionPercent = Math.round(
                        ((service.baseline_memory - processInfo.memory) / service.baseline_memory) * 100
                    );
                    
                    const targetMet = processInfo.memory <= service.target_memory;
                    
                    memoryResults.current_usage[service.name] = {
                        current_mb: currentMemoryMB,
                        baseline_mb: baselineMemoryMB,
                        target_mb: targetMemoryMB,
                        reduction_percent: reductionPercent,
                        target_met: targetMet,
                        pid: processInfo.pid,
                        rss: processInfo.rss,
                        heap_used: processInfo.heap_used,
                        external: processInfo.external
                    };
                    
                    console.log(`  📈 ${service.name}: ${currentMemoryMB}MB (target: ${targetMemoryMB}MB, reduction: ${reductionPercent}%)`);
                    
                    if (targetMet) {
                        console.log(`    ✅ Memory target achieved!`);
                    } else {
                        console.log(`    ⚠️  Need ${currentMemoryMB - targetMemoryMB}MB more reduction`);
                    }
                } else {
                    console.log(`  ❌ ${service.name}: Process not found`);
                    memoryResults.current_usage[service.name] = { error: 'Process not found' };
                }
            } catch (error) {
                console.error(`  ❌ Error analyzing ${service.name}:`, error.message);
                memoryResults.current_usage[service.name] = { error: error.message };
            }
        }

        this.results.analysis.memory_usage = memoryResults;
    }

    async getProcessMemoryUsage(pattern) {
        try {
            // Get process info using ps
            const psOutput = execSync(`ps aux | grep -E "${pattern}" | grep -v grep`).toString().trim();
            
            if (!psOutput) return null;
            
            const lines = psOutput.split('\n');
            const firstProcess = lines[0].split(/\s+/);
            
            const pid = firstProcess[1];
            const memoryPercent = parseFloat(firstProcess[3]);
            const vsz = parseInt(firstProcess[4]) * 1024; // Convert KB to bytes
            const rss = parseInt(firstProcess[5]) * 1024; // Convert KB to bytes
            
            // Get more detailed memory info from /proc/[pid]/status
            let heapUsed = 0;
            let external = 0;
            
            try {
                const statusContent = await fs.readFile(`/proc/${pid}/status`, 'utf8');
                const vmRSSMatch = statusContent.match(/VmRSS:\s*(\d+)\s*kB/);
                if (vmRSSMatch) {
                    heapUsed = parseInt(vmRSSMatch[1]) * 1024; // Convert KB to bytes
                }
            } catch (procError) {
                // /proc access might fail, use ps data
            }
            
            return {
                pid: parseInt(pid),
                memory: rss, // Use RSS as primary memory metric
                memory_percent: memoryPercent,
                vsz: vsz,
                rss: rss,
                heap_used: heapUsed || rss,
                external: external
            };
        } catch (error) {
            return null;
        }
    }

    async analyzeResponseTimes() {
        console.log('\n⚡ 2. Response Time Analysis...');
        
        const responseResults = {
            current_times: {},
            vs_baseline: {},
            improvement_validation: {}
        };

        const endpoints = {
            'wigle-to-tak': [
                { path: '/api/status', method: 'GET' },
                { path: '/list_wigle_files?directory=.', method: 'GET' },
                { path: '/update_tak_settings', method: 'POST', data: { tak_server_ip: '127.0.0.1', tak_server_port: 6969 } }
            ],
            'spectrum-analyzer': [
                { path: '/api/status', method: 'GET' },
                { path: '/api/config', method: 'GET' }
            ]
        };

        // Test WigleToTAK (port 8000)
        if (await this.isServiceRunning(8000)) {
            console.log('  📊 Testing WigleToTAK endpoints...');
            responseResults.current_times['wigle-to-tak'] = await this.measureEndpointTimes('http://localhost:8000', endpoints['wigle-to-tak']);
        }

        // Test Spectrum Analyzer (port 8092) - may not be running  
        if (await this.isServiceRunning(8092)) {
            console.log('  📊 Testing Spectrum Analyzer endpoints...');
            responseResults.current_times['spectrum-analyzer'] = await this.measureEndpointTimes('http://localhost:8092', endpoints['spectrum-analyzer']);
        } else {
            console.log('  ⚠️  Spectrum Analyzer not running on port 8092');
        }

        // Calculate improvement metrics
        const baselineResponseTime = 13; // ms (estimated Flask baseline)
        const targetResponseTime = 12; // ms (8% improvement target)
        
        Object.keys(responseResults.current_times).forEach(service => {
            const serviceResults = responseResults.current_times[service];
            const avgTime = this.calculateAverageResponseTime(serviceResults);
            
            const improvementPercent = Math.round(((baselineResponseTime - avgTime) / baselineResponseTime) * 100);
            const targetMet = avgTime <= targetResponseTime;
            
            responseResults.improvement_validation[service] = {
                avg_response_time: avgTime,
                baseline_time: baselineResponseTime,
                target_time: targetResponseTime, 
                improvement_percent: improvementPercent,
                target_met: targetMet
            };
            
            console.log(`    ${service}: ${avgTime}ms avg (target: ${targetResponseTime}ms, improvement: ${improvementPercent}%)`);
            
            if (targetMet) {
                console.log(`      ✅ Response time target achieved!`);
            } else {
                console.log(`      ⚠️  Need ${avgTime - targetResponseTime}ms improvement`);
            }
        });

        this.results.analysis.response_times = responseResults;
    }

    async measureEndpointTimes(baseUrl, endpoints) {
        const results = {};
        
        for (const endpoint of endpoints) {
            const measurements = [];
            
            for (let i = 0; i < 5; i++) {
                try {
                    const start = performance.now();
                    
                    const response = await axios({
                        method: endpoint.method,
                        url: `${baseUrl}${endpoint.path}`,
                        data: endpoint.data || {},
                        timeout: 5000
                    });
                    
                    const duration = performance.now() - start;
                    measurements.push({
                        duration: Math.round(duration * 100) / 100,
                        status: response.status,
                        success: response.status < 400
                    });
                    
                    await this.delay(100); // Small delay between requests
                } catch (error) {
                    measurements.push({
                        duration: 5000, // Timeout value
                        status: 0,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            const successfulMeasurements = measurements.filter(m => m.success);
            if (successfulMeasurements.length > 0) {
                results[`${endpoint.method} ${endpoint.path}`] = {
                    avg_time: Math.round(successfulMeasurements.reduce((sum, m) => sum + m.duration, 0) / successfulMeasurements.length * 100) / 100,
                    min_time: Math.min(...successfulMeasurements.map(m => m.duration)),
                    max_time: Math.max(...successfulMeasurements.map(m => m.duration)),
                    success_rate: (successfulMeasurements.length / measurements.length) * 100
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

    calculateAverageResponseTime(serviceResults) {
        const validResults = Object.values(serviceResults).filter(r => r.avg_time && !r.error);
        if (validResults.length === 0) return 999; // High value if no valid results
        
        return Math.round(validResults.reduce((sum, r) => sum + r.avg_time, 0) / validResults.length * 100) / 100;
    }

    async analyzeWebSocketPerformance() {
        console.log('\n🔌 3. WebSocket Performance Analysis...');
        
        const wsResults = {
            connection_performance: {},
            message_throughput: {},
            vs_flask_socketio: {}
        };

        // Test WebSocket connections where available
        const wsEndpoints = [
            { name: 'spectrum-analyzer', url: 'ws://localhost:8092/socket.io/?EIO=4&transport=websocket' }
        ];

        for (const endpoint of wsEndpoints) {
            if (await this.isServiceRunning(new URL(endpoint.url).port)) {
                console.log(`  🔌 Testing ${endpoint.name} WebSocket...`);
                wsResults.connection_performance[endpoint.name] = await this.measureWebSocketPerformance(endpoint.url);
            } else {
                console.log(`  ⚠️  ${endpoint.name} WebSocket not available`);
                wsResults.connection_performance[endpoint.name] = { error: 'Service not running' };
            }
        }

        this.results.analysis.websocket_metrics = wsResults;
    }

    async measureWebSocketPerformance(wsUrl) {
        return new Promise((resolve) => {
            const metrics = {
                connection_time: null,
                message_count: 0,
                message_rate: 0,
                avg_latency: null,
                errors: 0,
                connection_successful: false
            };

            const startTime = performance.now();
            const ws = new WebSocket(wsUrl);
            
            const timeout = setTimeout(() => {
                metrics.connection_time = 10000; // Timeout
                metrics.errors++;
                ws.terminate();
                resolve(metrics);
            }, 10000);

            ws.on('open', () => {
                metrics.connection_time = Math.round((performance.now() - startTime) * 100) / 100;
                metrics.connection_successful = true;
                console.log(`    ✓ Connected in ${metrics.connection_time}ms`);
            });

            ws.on('message', () => {
                metrics.message_count++;
            });

            ws.on('error', (error) => {
                metrics.errors++;
                console.log(`    ❌ WebSocket error: ${error.message}`);
            });

            ws.on('close', () => {
                clearTimeout(timeout);
                
                // Calculate message rate if we received messages
                if (metrics.message_count > 0) {
                    const duration = (performance.now() - startTime) / 1000;
                    metrics.message_rate = Math.round(metrics.message_count / duration * 100) / 100;
                }
                
                resolve(metrics);
            });

            // Close connection after 5 seconds of testing
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }, 5000);
        });
    }

    async analyzeRaspberryPiOptimizations() {
        console.log('\n🥧 4. Raspberry Pi Optimization Analysis...');
        
        const piResults = {
            arm_specific: {},
            memory_constraints: {},
            io_performance: {},
            cpu_utilization: {},
            optimization_opportunities: []
        };

        // Check ARM-specific optimizations
        piResults.arm_specific = {
            architecture: os.arch(),
            node_compiled_for_arm: process.arch === 'arm64' || process.arch === 'arm',
            native_modules: await this.checkNativeModules(),
            arm_optimized_packages: await this.checkArmOptimizedPackages()
        };

        // Memory constraint analysis
        const totalMemoryGB = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100;
        const freeMemoryGB = Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100;
        
        piResults.memory_constraints = {
            total_memory_gb: totalMemoryGB,
            free_memory_gb: freeMemoryGB,
            memory_pressure: freeMemoryGB < 0.5, // Less than 500MB free
            swap_usage: await this.getSwapUsage(),
            recommendations: []
        };

        if (piResults.memory_constraints.memory_pressure) {
            piResults.memory_constraints.recommendations.push('Enable memory optimization flags');
            piResults.memory_constraints.recommendations.push('Implement garbage collection tuning');
        }

        // CPU utilization analysis
        const loadAvg = os.loadavg();
        piResults.cpu_utilization = {
            load_1min: Math.round(loadAvg[0] * 100) / 100,
            load_5min: Math.round(loadAvg[1] * 100) / 100,
            load_15min: Math.round(loadAvg[2] * 100) / 100,
            cpu_cores: os.cpus().length,
            cpu_model: os.cpus()[0]?.model || 'Unknown',
            high_load: loadAvg[0] > os.cpus().length * 0.8
        };

        // Generate Pi-specific optimization opportunities
        if (piResults.arm_specific.node_compiled_for_arm) {
            piResults.optimization_opportunities.push('Node.js is ARM-optimized');
        } else {
            piResults.optimization_opportunities.push('Consider ARM-optimized Node.js build');
        }

        if (totalMemoryGB <= 4) {
            piResults.optimization_opportunities.push('Enable Node.js memory optimization flags');
            piResults.optimization_opportunities.push('Implement clustering for CPU utilization');
        }

        if (piResults.cpu_utilization.high_load) {
            piResults.optimization_opportunities.push('CPU load high - consider process optimization');
        }

        console.log(`  🏗️  Architecture: ${piResults.arm_specific.architecture}`);
        console.log(`  💾 Memory: ${totalMemoryGB}GB total, ${freeMemoryGB}GB free`);
        console.log(`  ⚡ CPU Load: ${piResults.cpu_utilization.load_1min} (1min avg)`);
        console.log(`  📋 Optimization opportunities: ${piResults.optimization_opportunities.length}`);

        this.results.analysis.pi_optimizations = piResults;
    }

    async checkNativeModules() {
        try {
            // Check if any native modules are compiled for ARM
            const nodeModulesPath = path.join(process.cwd(), 'tests', 'node_modules');
            const packageJson = JSON.parse(await fs.readFile(path.join(nodeModulesPath, '..', 'package.json'), 'utf8'));
            
            const nativeModules = [];
            if (packageJson.dependencies) {
                Object.keys(packageJson.dependencies).forEach(dep => {
                    if (['ws', 'bcrypt', 'sqlite3', 'canvas'].includes(dep)) {
                        nativeModules.push(dep);
                    }
                });
            }
            
            return nativeModules;
        } catch (error) {
            return [];
        }
    }

    async checkArmOptimizedPackages() {
        // Check for ARM-optimized alternatives
        const optimizedAlternatives = {
            'ws': 'uws (ARM optimized)',
            'bcrypt': 'bcryptjs (pure JS)',
            'sqlite3': 'better-sqlite3 (ARM compiled)'
        };
        
        return optimizedAlternatives;
    }

    async getSwapUsage() {
        try {
            const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
            const swapTotalMatch = meminfo.match(/SwapTotal:\s*(\d+)\s*kB/);
            const swapFreeMatch = meminfo.match(/SwapFree:\s*(\d+)\s*kB/);
            
            if (swapTotalMatch && swapFreeMatch) {
                const total = parseInt(swapTotalMatch[1]);
                const free = parseInt(swapFreeMatch[1]);
                const used = total - free;
                
                return {
                    total_mb: Math.round(total / 1024),
                    used_mb: Math.round(used / 1024),
                    free_mb: Math.round(free / 1024),
                    usage_percent: total > 0 ? Math.round((used / total) * 100) : 0
                };
            }
        } catch (error) {
            // Fallback if /proc/meminfo is not accessible
        }
        
        return { error: 'Unable to read swap information' };
    }

    async analyzeCachingOpportunities() {
        console.log('\n💾 5. Caching Strategy Analysis...');
        
        const cachingResults = {
            frequently_accessed_data: {},
            cache_implementation_opportunities: [],
            memory_cache_potential: {},
            redis_opportunities: []
        };

        // Analyze API endpoints for caching opportunities
        const highFrequencyEndpoints = [
            { endpoint: '/api/status', frequency: 'very_high', cache_ttl: '10s' },
            { endpoint: '/list_wigle_files', frequency: 'high', cache_ttl: '30s' },
            { endpoint: '/api/config', frequency: 'medium', cache_ttl: '60s' }
        ];

        highFrequencyEndpoints.forEach(endpoint => {
            cachingResults.cache_implementation_opportunities.push({
                endpoint: endpoint.endpoint,
                strategy: 'in-memory cache',
                ttl: endpoint.cache_ttl,
                estimated_performance_gain: '20-40%',
                implementation: 'node-cache or memory-cache'
            });
        });

        // CSV file processing caching
        cachingResults.cache_implementation_opportunities.push({
            endpoint: 'CSV file processing',
            strategy: 'file-based cache',
            ttl: 'until file modified',
            estimated_performance_gain: '60-80%',
            implementation: 'File modification time checking + parsed data cache'
        });

        // WebSocket data caching
        cachingResults.cache_implementation_opportunities.push({
            endpoint: 'WebSocket broadcast data',
            strategy: 'circular buffer',
            ttl: 'real-time (sliding window)',
            estimated_performance_gain: '30-50%',
            implementation: 'In-memory circular buffer for FFT data'
        });

        console.log(`  📊 Identified ${cachingResults.cache_implementation_opportunities.length} caching opportunities`);
        cachingResults.cache_implementation_opportunities.forEach(opp => {
            console.log(`    • ${opp.endpoint}: ${opp.strategy} (${opp.estimated_performance_gain} gain)`);
        });

        this.results.analysis.caching_opportunities = cachingResults;
    }

    async identifyBottlenecks() {
        console.log('\n🔍 6. Bottleneck Identification...');
        
        const bottlenecks = [];

        // Memory bottlenecks
        const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
        if (freeMemoryMB < 500) {
            bottlenecks.push({
                type: 'memory',
                severity: 'high',
                description: `Low free memory: ${freeMemoryMB}MB`,
                impact: 'System swapping, reduced performance',
                solution: 'Enable Node.js memory optimization flags, implement garbage collection tuning'
            });
        }

        // CPU bottlenecks  
        const loadAvg = os.loadavg()[0];
        const cpuCores = os.cpus().length;
        if (loadAvg > cpuCores * 0.8) {
            bottlenecks.push({
                type: 'cpu',
                severity: 'medium', 
                description: `High CPU load: ${Math.round(loadAvg * 100) / 100}`,
                impact: 'Request queuing, slower response times',
                solution: 'Implement Node.js clustering, optimize CPU-intensive operations'
            });
        }

        // I/O bottlenecks (CSV file processing)
        bottlenecks.push({
            type: 'io',
            severity: 'medium',
            description: 'CSV file parsing occurs on every request',
            impact: 'High disk I/O, slow file processing',
            solution: 'Implement file caching with modification time checking'
        });

        // Network bottlenecks
        if (this.results.analysis.response_times.improvement_validation) {
            Object.values(this.results.analysis.response_times.improvement_validation).forEach(service => {
                if (service.avg_response_time > 50) {
                    bottlenecks.push({
                        type: 'network',
                        severity: 'low',
                        description: `Slow API response: ${service.avg_response_time}ms`,
                        impact: 'Poor user experience',
                        solution: 'Implement response caching, optimize serialization'
                    });
                }
            });
        }

        bottlenecks.forEach(bottleneck => {
            console.log(`  ⚠️  ${bottleneck.type.toUpperCase()}: ${bottleneck.description} (${bottleneck.severity} severity)`);
            console.log(`     Solution: ${bottleneck.solution}`);
        });

        this.results.analysis.bottlenecks = bottlenecks;
    }

    async generateOptimizationPlan() {
        console.log('\n🎯 7. Generating Optimization Plan...');
        
        const plan = [];

        // Memory optimizations
        plan.push({
            priority: 'high',
            category: 'memory',
            action: 'Implement Node.js memory flags',
            implementation: '--max-old-space-size=1024 --optimize-for-size',
            estimated_impact: '15-25% memory reduction',
            effort: 'low'
        });

        // Caching optimizations
        plan.push({
            priority: 'high', 
            category: 'performance',
            action: 'Implement in-memory caching for API endpoints',
            implementation: 'node-cache with TTL for /api/status, /list_wigle_files',
            estimated_impact: '30-50% response time improvement',
            effort: 'medium'
        });

        plan.push({
            priority: 'high',
            category: 'io',
            action: 'Implement CSV file caching',
            implementation: 'Cache parsed CSV data with file modification time checking',
            estimated_impact: '60-80% file processing improvement',
            effort: 'medium'
        });

        // WebSocket optimizations
        plan.push({
            priority: 'medium',
            category: 'websocket',
            action: 'Optimize WebSocket data transmission',
            implementation: 'Binary data transmission, compression for large payloads',
            estimated_impact: '20-30% bandwidth reduction',
            effort: 'medium'
        });

        // Pi-specific optimizations
        plan.push({
            priority: 'medium',
            category: 'pi_optimization',
            action: 'Enable ARM-specific Node.js optimizations',
            implementation: 'Use ARM-optimized native modules, clustering',
            estimated_impact: '10-20% overall performance improvement',
            effort: 'high'
        });

        // Garbage collection tuning
        plan.push({
            priority: 'low',
            category: 'memory',
            action: 'Tune garbage collection',
            implementation: '--gc-interval=100 --expose-gc flags',
            estimated_impact: '5-10% memory stability improvement',
            effort: 'low'
        });

        plan.forEach((item, index) => {
            console.log(`  ${index + 1}. [${item.priority.toUpperCase()}] ${item.action}`);
            console.log(`     Implementation: ${item.implementation}`);
            console.log(`     Impact: ${item.estimated_impact} (${item.effort} effort)`);
        });

        this.results.optimization_plan = plan;

        // Generate specific recommendations
        this.generateRecommendations();
    }

    generateRecommendations() {
        const recommendations = [];

        // Memory optimization recommendations
        if (this.results.analysis.memory_usage.current_usage) {
            Object.values(this.results.analysis.memory_usage.current_usage).forEach(service => {
                if (service.current_mb && !service.target_met) {
                    recommendations.push({
                        type: 'memory',
                        priority: 'high',
                        recommendation: `Reduce ${service.current_mb - service.target_mb}MB memory usage for ${service.name}`,
                        actions: [
                            'Add --max-old-space-size=1024 Node.js flag',
                            'Implement object pooling for frequent allocations',
                            'Add garbage collection optimization'
                        ]
                    });
                }
            });
        }

        // Response time recommendations
        if (this.results.analysis.response_times.improvement_validation) {
            Object.entries(this.results.analysis.response_times.improvement_validation).forEach(([service, data]) => {
                if (!data.target_met) {
                    recommendations.push({
                        type: 'performance',
                        priority: 'high',
                        recommendation: `Improve ${service} response time by ${data.avg_response_time - data.target_time}ms`,
                        actions: [
                            'Implement API response caching',
                            'Optimize JSON serialization',
                            'Add request compression'
                        ]
                    });
                }
            });
        }

        // Caching recommendations
        recommendations.push({
            type: 'caching',
            priority: 'high',
            recommendation: 'Implement comprehensive caching strategy',
            actions: [
                'Add in-memory cache for API endpoints with 10-60s TTL',
                'Cache parsed CSV data with file modification checking',
                'Implement WebSocket data buffering'
            ]
        });

        // Pi-specific recommendations
        recommendations.push({
            type: 'platform',
            priority: 'medium',
            recommendation: 'Optimize for Raspberry Pi ARM architecture',
            actions: [
                'Use clustering to utilize all CPU cores',
                'Enable ARM-specific compiler optimizations',
                'Consider using PM2 for process management'
            ]
        });

        this.results.recommendations = recommendations;
    }

    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `performance_optimization_analysis_${timestamp}.json`;
        const filepath = path.join(__dirname, 'results', filename);
        
        // Ensure results directory exists
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        
        await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
        
        // Generate summary report
        const summaryPath = filepath.replace('.json', '_summary.txt');
        await fs.writeFile(summaryPath, this.generateSummaryReport());
        
        console.log(`\n📊 Results saved to: ${filepath}`);
        console.log(`📋 Summary saved to: ${summaryPath}`);
    }

    generateSummaryReport() {
        let report = 'PERFORMANCE OPTIMIZATION ANALYSIS SUMMARY\n';
        report += '==========================================\n\n';
        report += `Timestamp: ${this.results.timestamp}\n`;
        report += `System: ${this.results.system_info.cpu_model} (${this.results.system_info.arch})\n`;
        report += `Memory: ${this.results.system_info.total_memory} total, ${this.results.system_info.free_memory} free\n\n`;

        // Performance targets summary
        report += 'PERFORMANCE TARGETS:\n';
        report += '-------------------\n';
        report += `• Memory Reduction Target: ${this.results.performance_targets.memory_reduction}\n`;
        report += `• Response Time Improvement Target: ${this.results.performance_targets.response_time_improvement}\n\n`;

        // Memory analysis summary
        if (this.results.analysis.memory_usage.current_usage) {
            report += 'MEMORY USAGE ANALYSIS:\n';
            report += '---------------------\n';
            Object.entries(this.results.analysis.memory_usage.current_usage).forEach(([service, data]) => {
                if (data.current_mb) {
                    report += `• ${service}: ${data.current_mb}MB (${data.reduction_percent}% vs baseline)\n`;
                    report += `  Target: ${data.target_mb}MB - ${data.target_met ? 'ACHIEVED' : 'NOT MET'}\n`;
                }
            });
            report += '\n';
        }

        // Response time analysis summary
        if (this.results.analysis.response_times.improvement_validation) {
            report += 'RESPONSE TIME ANALYSIS:\n';
            report += '----------------------\n';
            Object.entries(this.results.analysis.response_times.improvement_validation).forEach(([service, data]) => {
                report += `• ${service}: ${data.avg_response_time}ms avg (${data.improvement_percent}% vs baseline)\n`;
                report += `  Target: ${data.target_time}ms - ${data.target_met ? 'ACHIEVED' : 'NOT MET'}\n`;
            });
            report += '\n';
        }

        // Bottlenecks summary
        if (this.results.analysis.bottlenecks.length > 0) {
            report += 'IDENTIFIED BOTTLENECKS:\n';
            report += '----------------------\n';
            this.results.analysis.bottlenecks.forEach(bottleneck => {
                report += `• ${bottleneck.type.toUpperCase()}: ${bottleneck.description} (${bottleneck.severity})\n`;
                report += `  Solution: ${bottleneck.solution}\n`;
            });
            report += '\n';
        }

        // Top recommendations
        if (this.results.recommendations.length > 0) {
            report += 'TOP RECOMMENDATIONS:\n';
            report += '-------------------\n';
            this.results.recommendations.slice(0, 5).forEach((rec, index) => {
                report += `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.recommendation}\n`;
                rec.actions.forEach(action => {
                    report += `   - ${action}\n`;
                });
            });
            report += '\n';
        }

        // Optimization plan summary
        if (this.results.optimization_plan.length > 0) {
            report += 'OPTIMIZATION PLAN:\n';
            report += '-----------------\n';
            this.results.optimization_plan.slice(0, 3).forEach((item, index) => {
                report += `${index + 1}. [${item.priority.toUpperCase()}] ${item.action}\n`;
                report += `   Implementation: ${item.implementation}\n`;
                report += `   Expected Impact: ${item.estimated_impact}\n`;
            });
        }

        return report;
    }

    printExecutiveSummary() {
        console.log('\n🎯 EXECUTIVE SUMMARY');
        console.log('===================');

        // Memory performance summary
        const memoryServices = Object.values(this.results.analysis.memory_usage.current_usage || {});
        const memoryTargetsMet = memoryServices.filter(s => s.target_met).length;
        console.log(`📊 Memory Optimization: ${memoryTargetsMet}/${memoryServices.length} services meet 35% reduction target`);

        // Response time summary
        const responseServices = Object.values(this.results.analysis.response_times.improvement_validation || {});
        const responseTargetsMet = responseServices.filter(s => s.target_met).length;
        console.log(`⚡ Response Time: ${responseTargetsMet}/${responseServices.length} services meet 8% improvement target`);

        // Key bottlenecks
        const highSeverityBottlenecks = this.results.analysis.bottlenecks.filter(b => b.severity === 'high').length;
        console.log(`🔍 Bottlenecks: ${highSeverityBottlenecks} high-severity issues identified`);

        // Optimization opportunities
        console.log(`🎯 Optimization Plan: ${this.results.optimization_plan.length} optimization actions identified`);

        // Overall assessment
        const overallScore = Math.round(((memoryTargetsMet + responseTargetsMet) / (memoryServices.length + responseServices.length)) * 100);
        console.log(`📈 Overall Performance Score: ${overallScore}% of targets achieved`);

        if (overallScore >= 80) {
            console.log('✅ Performance targets largely achieved - minor optimizations recommended');
        } else if (overallScore >= 60) {
            console.log('⚠️  Performance targets partially achieved - focused optimization needed');
        } else {
            console.log('❌ Performance targets not met - comprehensive optimization required');
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

// Run analysis if called directly
if (require.main === module) {
    const analyzer = new PerformanceOptimizationAnalyzer();
    analyzer.analyzeAll().catch(error => {
        console.error('Performance optimization analysis failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceOptimizationAnalyzer;
#!/usr/bin/env node

/**
 * PHASE 4 PRODUCTION MONITORING DASHBOARD
 * 
 * CRITICAL MISSION: 24-Hour Production Monitoring for Migration Cutover
 * - Monitor working Node.js service on port 8000 (34.5% improvement proven)
 * - Establish baseline for production migration
 * - Create alerting for performance degradation
 * - Validate production readiness for cutover
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ProductionMonitoringDashboard {
    constructor() {
        this.startTime = Date.now();
        
        // Focus on WORKING production service 
        this.productionService = {
            name: 'WigleToTAK Production Service',
            url: 'http://localhost:8000',
            endpoint: '/api/status',
            target_port: 8000 // Already on production port
        };

        // Performance baseline from verification (PROVEN)
        this.baseline = {
            response_time: 8.51, // ms (34.5% improvement over Flask)
            flask_baseline: 13,   // ms (Phase 3 documented)
            improvement_achieved: 34.5, // % improvement proven
            memory_estimate: 64,  // MB (current measurement)
            target_response: 12   // ms (Phase 3 target)
        };

        // Monitoring configuration for 24-hour period
        this.config = {
            monitoring_duration: 24 * 60 * 60 * 1000, // 24 hours
            sample_interval: 30000, // 30 seconds
            alert_thresholds: {
                response_time_warning: 15, // ms (above baseline)
                response_time_critical: 20, // ms (performance degradation)
                error_rate_warning: 5, // %
                error_rate_critical: 10, // %
                memory_warning: 80, // MB
                memory_critical: 100 // MB
            }
        };

        this.metrics = {
            samples: [],
            alerts: [],
            performance_summary: {},
            uptime_tracking: {
                start_time: this.startTime,
                total_samples: 0,
                successful_samples: 0,
                error_samples: 0
            }
        };

        this.monitoring = false;
        this.monitoringInterval = null;
    }

    /**
     * ESTABLISH PRODUCTION BASELINE
     */
    async establishProductionBaseline() {
        console.log('📊 ESTABLISHING PRODUCTION BASELINE');
        console.log('=' .repeat(45));
        console.log(`🎯 Service: ${this.productionService.name}`);
        console.log(`🔗 URL: ${this.productionService.url}`);
        console.log(`📈 Proven Performance: ${this.baseline.response_time}ms (${this.baseline.improvement_achieved}% improvement)`);
        console.log('');

        const baselineResults = {
            timestamp: Date.now(),
            service: this.productionService,
            measurements: {},
            system_info: this.getSystemInfo(),
            production_ready: false
        };

        try {
            // Take baseline measurements
            console.log('📡 Taking baseline measurements...');
            const measurements = await this.takeDetailedMeasurements(20);
            baselineResults.measurements = measurements;

            // Validate production readiness
            const validationResults = this.validateProductionReadiness(measurements);
            baselineResults.production_ready = validationResults.ready;

            console.log('📊 BASELINE RESULTS:');
            console.log(`   Average Response: ${measurements.performance.average.toFixed(2)}ms`);
            console.log(`   Response Range: ${measurements.performance.min.toFixed(2)}ms - ${measurements.performance.max.toFixed(2)}ms`);
            console.log(`   Success Rate: ${measurements.reliability.success_rate.toFixed(1)}%`);
            console.log(`   Samples: ${measurements.performance.samples}`);

            console.log('');
            console.log('🎯 PRODUCTION VALIDATION:');
            Object.entries(validationResults.criteria).forEach(([criterion, met]) => {
                console.log(`   ${criterion.replace(/_/g, ' ')}: ${met ? '✅' : '❌'}`);
            });

            console.log('');
            console.log(`🚀 PRODUCTION READY: ${validationResults.ready ? '✅ YES' : '❌ NEEDS ATTENTION'}`);

            if (validationResults.recommendations.length > 0) {
                console.log('');
                console.log('📋 RECOMMENDATIONS:');
                validationResults.recommendations.forEach(rec => {
                    console.log(`   [${rec.priority}] ${rec.action}`);
                });
            }

            // Save baseline
            this.saveBaseline(baselineResults);

            return baselineResults;

        } catch (error) {
            console.error(`❌ Baseline establishment failed: ${error.message}`);
            baselineResults.error = error.message;
            return baselineResults;
        }
    }

    async takeDetailedMeasurements(iterations = 20) {
        const measurements = [];
        let errors = 0;
        let totalResponseTime = 0;

        console.log(`     📈 Taking ${iterations} detailed measurements...`);

        for (let i = 0; i < iterations; i++) {
            try {
                const start = process.hrtime.bigint();
                const response = await axios.get(`${this.productionService.url}${this.productionService.endpoint}`, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Production-Monitoring-Dashboard',
                        'X-Monitoring': 'baseline'
                    }
                });

                if (response.status === 200) {
                    const end = process.hrtime.bigint();
                    const responseTime = Number(end - start) / 1000000;
                    measurements.push({
                        timestamp: Date.now(),
                        response_time: responseTime,
                        status: response.status,
                        data_size: JSON.stringify(response.data).length
                    });
                    totalResponseTime += responseTime;
                }
            } catch (error) {
                errors++;
                console.log(`       ⚠️  Sample ${i}: ${error.message}`);
            }

            await this.delay(100);
        }

        const responseTimes = measurements.map(m => m.response_time);
        
        return {
            performance: {
                average: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
                min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
                max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
                median: this.calculateMedian(responseTimes),
                samples: responseTimes.length
            },
            reliability: {
                total_attempts: iterations,
                successful: measurements.length,
                errors: errors,
                success_rate: (measurements.length / iterations) * 100,
                error_rate: (errors / iterations) * 100
            },
            raw_measurements: measurements
        };
    }

    validateProductionReadiness(measurements) {
        const criteria = {
            response_time_acceptable: measurements.performance.average <= this.baseline.target_response,
            improvement_maintained: measurements.performance.average <= this.baseline.response_time * 1.2, // 20% tolerance
            reliability_high: measurements.reliability.success_rate >= 95,
            service_available: measurements.performance.samples > 0
        };

        const ready = Object.values(criteria).every(c => c === true);
        
        const recommendations = [];
        
        if (!criteria.response_time_acceptable) {
            recommendations.push({
                priority: 'HIGH',
                action: `Optimize response time to meet ${this.baseline.target_response}ms target`
            });
        }

        if (!criteria.improvement_maintained) {
            recommendations.push({
                priority: 'MEDIUM',
                action: 'Investigate performance regression from proven baseline'
            });
        }

        if (!criteria.reliability_high) {
            recommendations.push({
                priority: 'HIGH',
                action: 'Improve service reliability and error handling'
            });
        }

        if (ready) {
            recommendations.push({
                priority: 'LOW',
                action: 'Service ready for production monitoring - proceed with 24-hour validation'
            });
        }

        return { criteria, ready, recommendations };
    }

    /**
     * START 24-HOUR MONITORING
     */
    async start24HourMonitoring() {
        console.log('🔄 STARTING 24-HOUR PRODUCTION MONITORING');
        console.log('=' .repeat(50));
        console.log(`⏱️  Duration: ${this.config.monitoring_duration / 1000 / 60 / 60} hours`);
        console.log(`📊 Sample Interval: ${this.config.sample_interval / 1000} seconds`);
        console.log(`🚨 Alert Thresholds:`);
        console.log(`   Response Time Warning: ${this.config.alert_thresholds.response_time_warning}ms`);
        console.log(`   Response Time Critical: ${this.config.alert_thresholds.response_time_critical}ms`);
        console.log(`   Error Rate Warning: ${this.config.alert_thresholds.error_rate_warning}%`);
        console.log('');

        this.monitoring = true;
        
        // Start monitoring loop
        this.monitoringInterval = setInterval(async () => {
            await this.collectMonitoringSample();
        }, this.config.sample_interval);

        // Set monitoring end
        setTimeout(() => {
            this.stopMonitoring();
        }, this.config.monitoring_duration);

        console.log('✅ 24-hour monitoring started');
        console.log('📈 Collecting samples...');
    }

    async collectMonitoringSample() {
        const sample = {
            timestamp: Date.now(),
            response_time: null,
            success: false,
            error: null,
            memory_usage: this.getCurrentMemoryUsage(),
            system_load: os.loadavg()[0]
        };

        try {
            const start = process.hrtime.bigint();
            const response = await axios.get(`${this.productionService.url}${this.productionService.endpoint}`, {
                timeout: 5000,
                headers: { 'X-Monitoring': 'continuous' }
            });

            if (response.status === 200) {
                const end = process.hrtime.bigint();
                sample.response_time = Number(end - start) / 1000000;
                sample.success = true;
                this.metrics.uptime_tracking.successful_samples++;
            }
        } catch (error) {
            sample.error = error.message;
            this.metrics.uptime_tracking.error_samples++;
        }

        this.metrics.uptime_tracking.total_samples++;
        this.metrics.samples.push(sample);

        // Check for alerts
        this.checkAlerts(sample);

        // Log progress periodically
        if (this.metrics.uptime_tracking.total_samples % 10 === 0) {
            this.logProgress();
        }

        // Keep only recent samples to prevent memory issues
        if (this.metrics.samples.length > 1000) {
            this.metrics.samples = this.metrics.samples.slice(-500);
        }

        // Save periodic checkpoint
        if (this.metrics.uptime_tracking.total_samples % 60 === 0) { // Every 30 minutes
            this.saveMonitoringCheckpoint();
        }
    }

    checkAlerts(sample) {
        const alerts = [];

        if (sample.success && sample.response_time) {
            if (sample.response_time > this.config.alert_thresholds.response_time_critical) {
                alerts.push({
                    type: 'CRITICAL',
                    metric: 'response_time',
                    value: sample.response_time,
                    threshold: this.config.alert_thresholds.response_time_critical,
                    message: `Critical response time: ${sample.response_time.toFixed(1)}ms`
                });
            } else if (sample.response_time > this.config.alert_thresholds.response_time_warning) {
                alerts.push({
                    type: 'WARNING',
                    metric: 'response_time', 
                    value: sample.response_time,
                    threshold: this.config.alert_thresholds.response_time_warning,
                    message: `Elevated response time: ${sample.response_time.toFixed(1)}ms`
                });
            }
        }

        if (sample.memory_usage > this.config.alert_thresholds.memory_critical) {
            alerts.push({
                type: 'CRITICAL',
                metric: 'memory_usage',
                value: sample.memory_usage,
                threshold: this.config.alert_thresholds.memory_critical,
                message: `Critical memory usage: ${sample.memory_usage.toFixed(1)}MB`
            });
        }

        if (!sample.success) {
            alerts.push({
                type: 'WARNING',
                metric: 'availability',
                message: `Service unavailable: ${sample.error}`
            });
        }

        // Store alerts
        alerts.forEach(alert => {
            alert.timestamp = sample.timestamp;
            this.metrics.alerts.push(alert);
            
            // Log critical alerts immediately
            if (alert.type === 'CRITICAL') {
                console.log(`🚨 CRITICAL ALERT: ${alert.message}`);
            }
        });
    }

    logProgress() {
        const elapsed = Date.now() - this.startTime;
        const remaining = this.config.monitoring_duration - elapsed;
        const progress = (elapsed / this.config.monitoring_duration) * 100;

        const recentSamples = this.metrics.samples.slice(-10);
        const recentAvgResponse = recentSamples
            .filter(s => s.success && s.response_time)
            .reduce((sum, s, _, arr) => sum + s.response_time / arr.length, 0);

        const currentUptime = (this.metrics.uptime_tracking.successful_samples / this.metrics.uptime_tracking.total_samples) * 100;

        console.log(`📊 Progress: ${progress.toFixed(1)}% | Uptime: ${currentUptime.toFixed(1)}% | Avg Response: ${recentAvgResponse.toFixed(1)}ms | Time Remaining: ${Math.ceil(remaining / 1000 / 60)} min`);
    }

    stopMonitoring() {
        console.log('🔚 STOPPING 24-HOUR MONITORING');
        
        this.monitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.generateFinalReport();
    }

    generateFinalReport() {
        console.log('📊 GENERATING FINAL 24-HOUR REPORT');
        console.log('=' .repeat(40));

        const summary = this.calculateMonitoringSummary();
        
        console.log('📈 PERFORMANCE SUMMARY:');
        console.log(`   Total Samples: ${summary.total_samples}`);
        console.log(`   Uptime: ${summary.uptime_percentage.toFixed(2)}%`);
        console.log(`   Average Response: ${summary.avg_response_time.toFixed(2)}ms`);
        console.log(`   Response Range: ${summary.min_response_time.toFixed(2)}ms - ${summary.max_response_time.toFixed(2)}ms`);
        
        console.log('');
        console.log('🚨 ALERTS SUMMARY:');
        console.log(`   Total Alerts: ${this.metrics.alerts.length}`);
        console.log(`   Critical: ${this.metrics.alerts.filter(a => a.type === 'CRITICAL').length}`);
        console.log(`   Warnings: ${this.metrics.alerts.filter(a => a.type === 'WARNING').length}`);

        console.log('');
        console.log('🎯 PRODUCTION ASSESSMENT:');
        const productionQuality = this.assessProductionQuality(summary);
        Object.entries(productionQuality.criteria).forEach(([criterion, met]) => {
            console.log(`   ${criterion.replace(/_/g, ' ')}: ${met ? '✅' : '❌'}`);
        });

        console.log('');
        console.log(`🚀 PRODUCTION QUALITY: ${productionQuality.overall_quality}`);

        // Save final report
        const finalReport = {
            monitoring_period: {
                start: this.startTime,
                end: Date.now(),
                duration_hours: (Date.now() - this.startTime) / 1000 / 60 / 60
            },
            summary,
            alerts: this.metrics.alerts,
            production_assessment: productionQuality,
            baseline_comparison: this.compareToBaseline(summary)
        };

        this.saveFinalReport(finalReport);
        
        console.log('✅ 24-HOUR MONITORING COMPLETE');
    }

    calculateMonitoringSummary() {
        const successfulSamples = this.metrics.samples.filter(s => s.success && s.response_time);
        const responseTimes = successfulSamples.map(s => s.response_time);

        return {
            total_samples: this.metrics.uptime_tracking.total_samples,
            successful_samples: this.metrics.uptime_tracking.successful_samples,
            error_samples: this.metrics.uptime_tracking.error_samples,
            uptime_percentage: (this.metrics.uptime_tracking.successful_samples / this.metrics.uptime_tracking.total_samples) * 100,
            avg_response_time: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
            min_response_time: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
            max_response_time: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
            median_response_time: this.calculateMedian(responseTimes)
        };
    }

    assessProductionQuality(summary) {
        const criteria = {
            uptime_excellent: summary.uptime_percentage >= 99.5,
            response_time_acceptable: summary.avg_response_time <= this.baseline.target_response,
            improvement_maintained: summary.avg_response_time <= this.baseline.response_time * 1.3,
            low_alerts: this.metrics.alerts.filter(a => a.type === 'CRITICAL').length === 0
        };

        const qualityScore = Object.values(criteria).filter(c => c === true).length;
        let overallQuality;
        
        if (qualityScore === 4) overallQuality = 'EXCELLENT - READY FOR PRODUCTION';
        else if (qualityScore === 3) overallQuality = 'GOOD - MINOR OPTIMIZATION NEEDED';
        else if (qualityScore === 2) overallQuality = 'FAIR - SIGNIFICANT IMPROVEMENTS NEEDED';
        else overallQuality = 'POOR - NOT READY FOR PRODUCTION';

        return { criteria, quality_score: qualityScore, overall_quality: overallQuality };
    }

    compareToBaseline(summary) {
        return {
            response_time_change: ((summary.avg_response_time - this.baseline.response_time) / this.baseline.response_time) * 100,
            target_performance_met: summary.avg_response_time <= this.baseline.target_response,
            baseline_maintained: summary.avg_response_time <= this.baseline.response_time * 1.2
        };
    }

    // Utility methods
    getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            total_memory: (os.totalmem() / 1024 / 1024).toFixed(1) + ' MB',
            free_memory: (os.freemem() / 1024 / 1024).toFixed(1) + ' MB',
            uptime: os.uptime(),
            load_average: os.loadavg()
        };
    }

    getCurrentMemoryUsage() {
        const memory = process.memoryUsage();
        return memory.rss / 1024 / 1024; // MB
    }

    calculateMedian(values) {
        if (values.length === 0) return 0;
        const sorted = values.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    saveBaseline(baseline) {
        const filename = `production-baseline-${Date.now()}.json`;
        this.saveToFile(filename, baseline);
        console.log(`💾 Baseline saved: ${filename}`);
    }

    saveMonitoringCheckpoint() {
        const checkpoint = {
            timestamp: Date.now(),
            elapsed_time: Date.now() - this.startTime,
            samples_collected: this.metrics.uptime_tracking.total_samples,
            recent_performance: this.calculateMonitoringSummary(),
            alerts: this.metrics.alerts.slice(-10) // Last 10 alerts
        };
        
        const filename = `monitoring-checkpoint-${Date.now()}.json`;
        this.saveToFile(filename, checkpoint);
    }

    saveFinalReport(report) {
        const filename = `24hour-monitoring-report-${Date.now()}.json`;
        this.saveToFile(filename, report);
        console.log(`💾 Final report saved: ${filename}`);
    }

    saveToFile(filename, data) {
        try {
            const filepath = path.join(__dirname, 'logs', filename);
            fs.mkdirSync(path.dirname(filepath), { recursive: true });
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`Failed to save ${filename}:`, error.message);
        }
    }

    /**
     * MAIN EXECUTION
     */
    async runProductionMonitoring() {
        console.log('🎯 PHASE 4 MIGRATION CUTOVER - PRODUCTION MONITORING');
        console.log('=' .repeat(60));
        console.log('🚀 Mission: 24-hour production validation for Node.js service');
        console.log('📊 Proven: 34.5% improvement over Flask baseline');
        console.log('🔍 Focus: Working production service monitoring');
        console.log('');

        try {
            // Step 1: Establish production baseline
            const baseline = await this.establishProductionBaseline();
            
            if (!baseline.production_ready) {
                console.log('⚠️  Service not ready for 24-hour monitoring');
                console.log('📋 Address recommendations before proceeding');
                return baseline;
            }

            // Step 2: Start 24-hour monitoring
            console.log('\n🔄 Proceeding with 24-hour monitoring...');
            await this.start24HourMonitoring();

            return { baseline, monitoring: 'started' };

        } catch (error) {
            console.error('❌ Production monitoring failed:', error.message);
            throw error;
        }
    }
}

// Execute monitoring
async function main() {
    const args = process.argv.slice(2);
    const monitor = new ProductionMonitoringDashboard();

    if (args.includes('--baseline-only') || args.includes('-b')) {
        // Only establish baseline
        await monitor.establishProductionBaseline();
    } else if (args.includes('--quick-test') || args.includes('-q')) {
        // Quick 5-minute test
        monitor.config.monitoring_duration = 5 * 60 * 1000; // 5 minutes
        await monitor.runProductionMonitoring();
    } else {
        // Full 24-hour monitoring
        await monitor.runProductionMonitoring();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Production monitoring failed:', error);
        process.exit(1);
    });
}

module.exports = ProductionMonitoringDashboard;
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class PerformanceMonitor {
    constructor(config = {}) {
        this.config = {
            port: config.port || 3005,
            metricsInterval: config.metricsInterval || 5000,
            historySize: config.historySize || 100,
            services: config.services || [
                { name: 'Legacy Python', port: 8000, type: 'legacy' },
                { name: 'New Node.js', port: 3001, type: 'new' },
                { name: 'HackRF Service', port: 3003, type: 'new' },
                { name: 'WigleToTAK', port: 3002, type: 'new' }
            ]
        };

        this.metrics = {
            system: {
                cpu: [],
                memory: [],
                disk: [],
                network: []
            },
            services: {},
            traffic: {
                total: 0,
                legacy: 0,
                new: 0,
                errors: 0
            }
        };

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);

        this.setupRoutes();
        this.setupWebSocket();
        this.startMetricsCollection();
    }

    setupRoutes() {
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Serve monitoring dashboard
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'dashboard.html'));
        });

        // API endpoints
        this.app.get('/api/metrics', (req, res) => {
            res.json(this.metrics);
        });

        this.app.get('/api/services', (req, res) => {
            res.json(this.config.services);
        });

        this.app.get('/api/health', (req, res) => {
            const status = this.calculateHealthStatus();
            res.status(status.healthy ? 200 : 503).json(status);
        });

        this.app.get('/api/report', async (req, res) => {
            const report = await this.generateReport();
            res.json(report);
        });
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log('Client connected for real-time metrics');
            
            // Send initial data
            socket.emit('metrics', this.metrics);
            
            // Send updates
            const interval = setInterval(() => {
                socket.emit('metrics', this.metrics);
            }, 1000);
            
            socket.on('disconnect', () => {
                console.log('Client disconnected');
                clearInterval(interval);
            });
        });
    }

    async startMetricsCollection() {
        setInterval(async () => {
            await this.collectSystemMetrics();
            await this.checkServices();
            await this.analyzeTraffic();
        }, this.config.metricsInterval);
    }

    async collectSystemMetrics() {
        // CPU usage
        const cpus = os.cpus();
        const cpuUsage = cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b);
            const idle = cpu.times.idle;
            return acc + ((total - idle) / total * 100);
        }, 0) / cpus.length;

        this.addMetric('system.cpu', {
            timestamp: Date.now(),
            value: cpuUsage,
            cores: cpus.length
        });

        // Memory usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsage = (usedMem / totalMem) * 100;

        this.addMetric('system.memory', {
            timestamp: Date.now(),
            value: memUsage,
            used: usedMem,
            total: totalMem
        });

        // Disk usage
        try {
            const diskStats = await this.getDiskUsage();
            this.addMetric('system.disk', {
                timestamp: Date.now(),
                value: diskStats.usagePercent,
                used: diskStats.used,
                total: diskStats.total
            });
        } catch (error) {
            console.error('Error getting disk usage:', error);
        }
    }

    async getDiskUsage() {
        const { execSync } = require('child_process');
        const output = execSync("df -B1 / | tail -1").toString();
        const parts = output.trim().split(/\s+/);
        const total = parseInt(parts[1]);
        const used = parseInt(parts[2]);
        const usagePercent = (used / total) * 100;

        return { total, used, usagePercent };
    }

    async checkServices() {
        const http = require('http');
        
        for (const service of this.config.services) {
            const start = Date.now();
            
            try {
                const response = await this.checkServiceHealth(service.port);
                const responseTime = Date.now() - start;
                
                if (!this.metrics.services[service.name]) {
                    this.metrics.services[service.name] = [];
                }
                
                this.addMetric(`services.${service.name}`, {
                    timestamp: Date.now(),
                    status: 'up',
                    responseTime,
                    statusCode: response.statusCode
                });
            } catch (error) {
                this.addMetric(`services.${service.name}`, {
                    timestamp: Date.now(),
                    status: 'down',
                    error: error.message
                });
            }
        }
    }

    checkServiceHealth(port) {
        return new Promise((resolve, reject) => {
            const req = http.get(`http://localhost:${port}/health`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({
                    statusCode: res.statusCode,
                    data
                }));
            });
            
            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
        });
    }

    async analyzeTraffic() {
        try {
            // Parse nginx access logs for traffic distribution
            const logPath = '/var/log/nginx/stinkster-access.log';
            const logs = await fs.readFile(logPath, 'utf-8');
            const lines = logs.split('\n').slice(-100); // Last 100 lines
            
            let legacyCount = 0;
            let newCount = 0;
            let errorCount = 0;
            
            lines.forEach(line => {
                if (line.includes('X-Backend-Server')) {
                    if (line.includes(':8000')) legacyCount++;
                    else if (line.includes(':3001')) newCount++;
                }
                if (line.includes('" 5')) errorCount++; // 5xx errors
            });
            
            this.metrics.traffic = {
                total: legacyCount + newCount,
                legacy: legacyCount,
                new: newCount,
                errors: errorCount,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error analyzing traffic:', error);
        }
    }

    addMetric(key, value) {
        const keys = key.split('.');
        let obj = this.metrics;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        
        const finalKey = keys[keys.length - 1];
        if (!obj[finalKey]) obj[finalKey] = [];
        
        obj[finalKey].push(value);
        
        // Keep only recent history
        if (obj[finalKey].length > this.config.historySize) {
            obj[finalKey].shift();
        }
    }

    calculateHealthStatus() {
        const now = Date.now();
        const healthStatus = {
            healthy: true,
            services: {},
            alerts: []
        };

        // Check each service
        for (const service of this.config.services) {
            const metrics = this.metrics.services[service.name];
            if (!metrics || metrics.length === 0) {
                healthStatus.services[service.name] = 'unknown';
                continue;
            }

            const latest = metrics[metrics.length - 1];
            const age = now - latest.timestamp;

            if (age > 60000) { // Data older than 1 minute
                healthStatus.services[service.name] = 'stale';
                healthStatus.alerts.push(`${service.name} metrics are stale`);
            } else if (latest.status === 'down') {
                healthStatus.services[service.name] = 'down';
                healthStatus.healthy = false;
                healthStatus.alerts.push(`${service.name} is down`);
            } else if (latest.responseTime > 1000) {
                healthStatus.services[service.name] = 'degraded';
                healthStatus.alerts.push(`${service.name} is slow`);
            } else {
                healthStatus.services[service.name] = 'healthy';
            }
        }

        // Check system resources
        const cpuMetrics = this.metrics.system.cpu;
        if (cpuMetrics.length > 0) {
            const latestCpu = cpuMetrics[cpuMetrics.length - 1];
            if (latestCpu.value > 80) {
                healthStatus.alerts.push('High CPU usage');
            }
        }

        const memMetrics = this.metrics.system.memory;
        if (memMetrics.length > 0) {
            const latestMem = memMetrics[memMetrics.length - 1];
            if (latestMem.value > 85) {
                healthStatus.alerts.push('High memory usage');
            }
        }

        return healthStatus;
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                duration: this.getMetricsDuration(),
                servicesChecked: this.config.services.length,
                healthStatus: this.calculateHealthStatus()
            },
            performance: await this.calculatePerformanceStats(),
            traffic: this.calculateTrafficStats(),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    getMetricsDuration() {
        let earliestTimestamp = Date.now();
        
        Object.values(this.metrics.services).forEach(metrics => {
            if (metrics.length > 0) {
                earliestTimestamp = Math.min(earliestTimestamp, metrics[0].timestamp);
            }
        });

        return Date.now() - earliestTimestamp;
    }

    async calculatePerformanceStats() {
        const stats = {};

        for (const service of this.config.services) {
            const metrics = this.metrics.services[service.name] || [];
            const upMetrics = metrics.filter(m => m.status === 'up');

            if (upMetrics.length === 0) {
                stats[service.name] = { availability: 0 };
                continue;
            }

            const responseTimes = upMetrics.map(m => m.responseTime);
            stats[service.name] = {
                availability: (upMetrics.length / metrics.length) * 100,
                avgResponseTime: responseTimes.reduce((a, b) => a + b) / responseTimes.length,
                minResponseTime: Math.min(...responseTimes),
                maxResponseTime: Math.max(...responseTimes),
                p95ResponseTime: this.percentile(responseTimes, 95),
                p99ResponseTime: this.percentile(responseTimes, 99)
            };
        }

        return stats;
    }

    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const sorted = arr.slice().sort((a, b) => a - b);
        const index = Math.floor((p / 100) * sorted.length);
        return sorted[index];
    }

    calculateTrafficStats() {
        const traffic = this.metrics.traffic;
        const total = traffic.legacy + traffic.new;

        return {
            totalRequests: total,
            legacyPercentage: total > 0 ? (traffic.legacy / total) * 100 : 0,
            newPercentage: total > 0 ? (traffic.new / total) * 100 : 0,
            errorRate: total > 0 ? (traffic.errors / total) * 100 : 0
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const health = this.calculateHealthStatus();

        if (!health.healthy) {
            recommendations.push({
                priority: 'critical',
                message: 'System is unhealthy - immediate action required',
                action: 'Check service logs and consider rollback'
            });
        }

        const trafficStats = this.calculateTrafficStats();
        if (trafficStats.errorRate > 1) {
            recommendations.push({
                priority: 'high',
                message: `Error rate is ${trafficStats.errorRate.toFixed(2)}%`,
                action: 'Investigate error logs before increasing traffic'
            });
        }

        if (trafficStats.newPercentage < 50 && health.healthy) {
            recommendations.push({
                priority: 'medium',
                message: 'System appears stable',
                action: 'Consider increasing traffic to new system'
            });
        }

        return recommendations;
    }

    start() {
        this.server.listen(this.config.port, () => {
            console.log(`Performance monitor running on port ${this.config.port}`);
            console.log(`Dashboard: http://localhost:${this.config.port}`);
        });
    }
}

// Export for use as module
module.exports = PerformanceMonitor;

// Start if run directly
if (require.main === module) {
    const monitor = new PerformanceMonitor();
    monitor.start();
}
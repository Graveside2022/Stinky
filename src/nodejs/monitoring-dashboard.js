/**
 * Production Monitoring Dashboard for Stinkster Node.js Services
 * 
 * Provides real-time monitoring, metrics collection, and alerting
 * for production deployment
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class MonitoringDashboard {
    constructor(config = {}) {
        this.config = {
            port: config.port || 9001,
            updateInterval: config.updateInterval || 5000,
            services: config.services || [
                { name: 'Spectrum Analyzer', url: 'http://localhost:8092/health', port: 8092 },
                { name: 'WigleToTAK', url: 'http://localhost:8000/health', port: 8000 },
                { name: 'GPS Bridge', url: 'http://localhost:2947/health', port: 2947 },
                { name: 'OpenWebRX', url: 'http://localhost:8073', port: 8073 }
            ],
            alerts: {
                cpuThreshold: 80,
                memoryThreshold: 80,
                diskThreshold: 90,
                responseTimeThreshold: 5000
            },
            ...config
        };

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);
        
        this.metrics = {
            system: {},
            services: {},
            alerts: [],
            uptime: Date.now()
        };

        this.setupRoutes();
        this.setupWebSocket();
        this.startMonitoring();
    }

    setupRoutes() {
        // Serve static dashboard
        this.app.get('/', (req, res) => {
            res.send(this.getDashboardHTML());
        });

        // API endpoints
        this.app.get('/api/metrics', (req, res) => {
            res.json(this.metrics);
        });

        this.app.get('/api/services', (req, res) => {
            res.json(this.metrics.services);
        });

        this.app.get('/api/system', (req, res) => {
            res.json(this.metrics.system);
        });

        this.app.get('/api/alerts', (req, res) => {
            res.json(this.metrics.alerts);
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'monitoring-dashboard',
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.metrics.uptime
            });
        });
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log('Dashboard client connected');
            
            // Send initial data
            socket.emit('metrics', this.metrics);
            
            socket.on('disconnect', () => {
                console.log('Dashboard client disconnected');
            });
        });
    }

    async startMonitoring() {
        console.log('Starting monitoring dashboard...');
        
        // Initial metrics collection
        await this.collectMetrics();
        
        // Set up periodic monitoring
        setInterval(async () => {
            await this.collectMetrics();
            this.io.emit('metrics', this.metrics);
        }, this.config.updateInterval);
    }

    async collectMetrics() {
        try {
            // Collect system metrics
            this.metrics.system = await this.getSystemMetrics();
            
            // Collect service metrics
            this.metrics.services = await this.getServiceMetrics();
            
            // Check for alerts
            this.checkAlerts();
            
            this.metrics.lastUpdate = new Date().toISOString();
            
        } catch (error) {
            console.error('Error collecting metrics:', error);
        }
    }

    async getSystemMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            uptime: os.uptime(),
            loadavg: os.loadavg(),
            cpu: await this.getCPUUsage(),
            memory: this.getMemoryUsage(),
            disk: await this.getDiskUsage(),
            network: await this.getNetworkStats(),
            processes: await this.getProcessStats()
        };

        return metrics;
    }

    async getCPUUsage() {
        try {
            const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | sed 's/%us,//'");
            const usage = parseFloat(stdout.trim()) || 0;
            
            return {
                usage: usage,
                cores: os.cpus().length,
                model: os.cpus()[0]?.model || 'Unknown',
                loadAverage: os.loadavg()
            };
        } catch (error) {
            return {
                usage: 0,
                cores: os.cpus().length,
                model: os.cpus()[0]?.model || 'Unknown',
                loadAverage: os.loadavg(),
                error: error.message
            };
        }
    }

    getMemoryUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const usage = (used / total) * 100;

        return {
            total: Math.round(total / 1024 / 1024), // MB
            free: Math.round(free / 1024 / 1024), // MB
            used: Math.round(used / 1024 / 1024), // MB
            usage: Math.round(usage * 100) / 100
        };
    }

    async getDiskUsage() {
        try {
            const { stdout } = await execAsync("df -h /");
            const lines = stdout.trim().split('\n');
            const data = lines[1].split(/\s+/);
            
            return {
                total: data[1],
                used: data[2],
                available: data[3],
                usage: parseInt(data[4].replace('%', '')),
                mountpoint: data[5]
            };
        } catch (error) {
            return {
                error: error.message
            };
        }
    }

    async getNetworkStats() {
        try {
            const { stdout } = await execAsync("cat /proc/net/dev | grep -E '(eth0|wlan0):'");
            const lines = stdout.trim().split('\n');
            const interfaces = {};

            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                const name = parts[0].replace(':', '');
                interfaces[name] = {
                    rxBytes: parseInt(parts[1]),
                    txBytes: parseInt(parts[9]),
                    rxPackets: parseInt(parts[2]),
                    txPackets: parseInt(parts[10])
                };
            });

            return interfaces;
        } catch (error) {
            return { error: error.message };
        }
    }

    async getProcessStats() {
        try {
            const { stdout } = await execAsync("ps aux | grep 'node.*stinkster' | grep -v grep");
            const lines = stdout.trim().split('\n').filter(line => line.length > 0);
            const processes = [];

            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 11) {
                    processes.push({
                        pid: parseInt(parts[1]),
                        cpu: parseFloat(parts[2]),
                        memory: parseFloat(parts[3]),
                        vsz: parseInt(parts[4]),
                        rss: parseInt(parts[5]),
                        command: parts.slice(10).join(' ')
                    });
                }
            });

            return processes;
        } catch (error) {
            return { error: error.message };
        }
    }

    async getServiceMetrics() {
        const services = {};
        
        for (const service of this.config.services) {
            try {
                const startTime = Date.now();
                const response = await fetch(service.url, { 
                    timeout: 5000,
                    signal: AbortSignal.timeout(5000)
                });
                const responseTime = Date.now() - startTime;
                
                const data = await response.json();
                
                services[service.name] = {
                    status: response.ok ? 'healthy' : 'unhealthy',
                    responseTime,
                    statusCode: response.status,
                    port: service.port,
                    lastCheck: new Date().toISOString(),
                    data
                };
                
            } catch (error) {
                services[service.name] = {
                    status: 'unhealthy',
                    error: error.message,
                    port: service.port,
                    lastCheck: new Date().toISOString()
                };
            }
        }

        return services;
    }

    checkAlerts() {
        const alerts = [];
        const { system, services } = this.metrics;
        const { alerts: thresholds } = this.config;

        // System alerts
        if (system.cpu?.usage > thresholds.cpuThreshold) {
            alerts.push({
                level: 'warning',
                type: 'system',
                message: `High CPU usage: ${system.cpu.usage}%`,
                timestamp: new Date().toISOString(),
                value: system.cpu.usage,
                threshold: thresholds.cpuThreshold
            });
        }

        if (system.memory?.usage > thresholds.memoryThreshold) {
            alerts.push({
                level: 'warning',
                type: 'system',
                message: `High memory usage: ${system.memory.usage}%`,
                timestamp: new Date().toISOString(),
                value: system.memory.usage,
                threshold: thresholds.memoryThreshold
            });
        }

        if (system.disk?.usage > thresholds.diskThreshold) {
            alerts.push({
                level: 'critical',
                type: 'system',
                message: `High disk usage: ${system.disk.usage}%`,
                timestamp: new Date().toISOString(),
                value: system.disk.usage,
                threshold: thresholds.diskThreshold
            });
        }

        // Service alerts
        Object.entries(services).forEach(([name, service]) => {
            if (service.status !== 'healthy') {
                alerts.push({
                    level: 'critical',
                    type: 'service',
                    message: `Service ${name} is unhealthy`,
                    timestamp: new Date().toISOString(),
                    service: name,
                    error: service.error
                });
            }

            if (service.responseTime > thresholds.responseTimeThreshold) {
                alerts.push({
                    level: 'warning',
                    type: 'performance',
                    message: `Slow response from ${name}: ${service.responseTime}ms`,
                    timestamp: new Date().toISOString(),
                    service: name,
                    value: service.responseTime,
                    threshold: thresholds.responseTimeThreshold
                });
            }
        });

        // Keep only last 100 alerts
        this.metrics.alerts = [...alerts, ...this.metrics.alerts].slice(0, 100);
    }

    getDashboardHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stinkster Monitoring Dashboard</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: #f5f5f5; 
            color: #333;
        }
        .header { 
            background: #2c3e50; 
            color: white; 
            padding: 1rem; 
            text-align: center;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 2rem; 
        }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 2rem; 
        }
        .card { 
            background: white; 
            border-radius: 8px; 
            padding: 1.5rem; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .card h3 { 
            margin-bottom: 1rem; 
            color: #2c3e50; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 0.5rem;
        }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            margin: 0.5rem 0; 
            padding: 0.5rem;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .status-healthy { color: #27ae60; font-weight: bold; }
        .status-unhealthy { color: #e74c3c; font-weight: bold; }
        .alert { 
            padding: 1rem; 
            margin: 0.5rem 0; 
            border-radius: 4px; 
            border-left: 4px solid;
        }
        .alert-warning { 
            background: #fff3cd; 
            border-color: #ffc107; 
            color: #856404;
        }
        .alert-critical { 
            background: #f8d7da; 
            border-color: #dc3545; 
            color: #721c24;
        }
        .progress-bar { 
            width: 100%; 
            height: 20px; 
            background: #ecf0f1; 
            border-radius: 10px; 
            overflow: hidden;
        }
        .progress-fill { 
            height: 100%; 
            background: linear-gradient(90deg, #27ae60, #f39c12, #e74c3c); 
            transition: width 0.3s ease;
        }
        .timestamp { 
            font-size: 0.9em; 
            color: #7f8c8d; 
            text-align: center; 
            margin-top: 1rem;
        }
        .service-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 1rem; 
        }
        .service-card { 
            padding: 1rem; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Stinkster Production Monitoring Dashboard</h1>
        <p>Real-time monitoring for Node.js services</p>
    </div>

    <div class="container">
        <div class="grid">
            <!-- System Metrics -->
            <div class="card">
                <h3>📊 System Metrics</h3>
                <div class="metric">
                    <span>CPU Usage:</span>
                    <span id="cpu-usage">-</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="cpu-bar" style="width: 0%"></div>
                </div>
                
                <div class="metric">
                    <span>Memory Usage:</span>
                    <span id="memory-usage">-</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="memory-bar" style="width: 0%"></div>
                </div>
                
                <div class="metric">
                    <span>Disk Usage:</span>
                    <span id="disk-usage">-</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="disk-bar" style="width: 0%"></div>
                </div>
                
                <div class="metric">
                    <span>Load Average:</span>
                    <span id="load-avg">-</span>
                </div>
                
                <div class="metric">
                    <span>Uptime:</span>
                    <span id="uptime">-</span>
                </div>
            </div>

            <!-- Services Status -->
            <div class="card">
                <h3>🔌 Services Status</h3>
                <div class="service-grid" id="services-container">
                    <!-- Services will be populated here -->
                </div>
            </div>

            <!-- Alerts -->
            <div class="card">
                <h3>🚨 Active Alerts</h3>
                <div id="alerts-container">
                    <p>No active alerts</p>
                </div>
            </div>

            <!-- Process Information -->
            <div class="card">
                <h3>⚡ Node.js Processes</h3>
                <div id="processes-container">
                    <!-- Processes will be populated here -->
                </div>
            </div>
        </div>

        <div class="timestamp" id="last-update">
            Last updated: -
        </div>
    </div>

    <script>
        const socket = io();
        
        socket.on('metrics', (metrics) => {
            updateDashboard(metrics);
        });

        function updateDashboard(metrics) {
            const { system, services, alerts } = metrics;
            
            // Update system metrics
            if (system.cpu) {
                document.getElementById('cpu-usage').textContent = system.cpu.usage + '%';
                document.getElementById('cpu-bar').style.width = system.cpu.usage + '%';
            }
            
            if (system.memory) {
                document.getElementById('memory-usage').textContent = 
                    system.memory.usage + '% (' + system.memory.used + '/' + system.memory.total + ' MB)';
                document.getElementById('memory-bar').style.width = system.memory.usage + '%';
            }
            
            if (system.disk) {
                document.getElementById('disk-usage').textContent = 
                    system.disk.usage + '% (' + system.disk.used + '/' + system.disk.total + ')';
                document.getElementById('disk-bar').style.width = system.disk.usage + '%';
            }
            
            if (system.loadavg) {
                document.getElementById('load-avg').textContent = 
                    system.loadavg.map(l => l.toFixed(2)).join(', ');
            }
            
            if (system.uptime) {
                const hours = Math.floor(system.uptime / 3600);
                const days = Math.floor(hours / 24);
                document.getElementById('uptime').textContent = 
                    days + 'd ' + (hours % 24) + 'h';
            }

            // Update services
            updateServices(services);
            
            // Update alerts
            updateAlerts(alerts);
            
            // Update processes
            updateProcesses(system.processes);
            
            // Update timestamp
            document.getElementById('last-update').textContent = 
                'Last updated: ' + new Date().toLocaleString();
        }

        function updateServices(services) {
            const container = document.getElementById('services-container');
            container.innerHTML = '';
            
            Object.entries(services).forEach(([name, service]) => {
                const serviceDiv = document.createElement('div');
                serviceDiv.className = 'service-card';
                serviceDiv.innerHTML = \`
                    <div style="font-weight: bold; margin-bottom: 0.5rem;">\${name}</div>
                    <div>Status: <span class="status-\${service.status}">\${service.status.toUpperCase()}</span></div>
                    <div>Port: \${service.port}</div>
                    \${service.responseTime ? \`<div>Response: \${service.responseTime}ms</div>\` : ''}
                    \${service.error ? \`<div style="color: red; font-size: 0.9em;">\${service.error}</div>\` : ''}
                \`;
                container.appendChild(serviceDiv);
            });
        }

        function updateAlerts(alerts) {
            const container = document.getElementById('alerts-container');
            
            if (!alerts || alerts.length === 0) {
                container.innerHTML = '<p>No active alerts</p>';
                return;
            }
            
            container.innerHTML = alerts.slice(0, 5).map(alert => \`
                <div class="alert alert-\${alert.level}">
                    <strong>\${alert.level.toUpperCase()}:</strong> \${alert.message}
                    <div style="font-size: 0.9em; margin-top: 0.5rem;">
                        \${new Date(alert.timestamp).toLocaleString()}
                    </div>
                </div>
            \`).join('');
        }

        function updateProcesses(processes) {
            const container = document.getElementById('processes-container');
            
            if (!processes || processes.length === 0) {
                container.innerHTML = '<p>No Node.js processes found</p>';
                return;
            }
            
            container.innerHTML = processes.map(proc => \`
                <div class="metric">
                    <span>PID \${proc.pid}</span>
                    <span>CPU: \${proc.cpu}% | RAM: \${proc.memory}%</span>
                </div>
            \`).join('');
        }

        // Request initial data
        fetch('/api/metrics')
            .then(response => response.json())
            .then(metrics => updateDashboard(metrics))
            .catch(console.error);
    </script>
</body>
</html>
        `;
    }

    start() {
        this.server.listen(this.config.port, () => {
            console.log(`Monitoring dashboard running on port ${this.config.port}`);
            console.log(`Dashboard URL: http://localhost:${this.config.port}`);
        });
    }

    stop() {
        this.server.close();
    }
}

// Export for use as module
module.exports = MonitoringDashboard;

// Allow running as standalone service
if (require.main === module) {
    const dashboard = new MonitoringDashboard();
    
    // Graceful shutdown handlers
    process.on('SIGINT', () => {
        console.log('Shutting down monitoring dashboard...');
        dashboard.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('Shutting down monitoring dashboard...');
        dashboard.stop();
        process.exit(0);
    });
    
    dashboard.start();
}
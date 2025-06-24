#!/usr/bin/env node

/**
 * Stinkster Service Control API Server
 * 
 * Provides REST API endpoints for controlling the main Stinkster services
 * and monitoring system health. This is a dedicated server for the web UI.
 * 
 * Usage:
 *   node service-control-api.js [--port=8080] [--debug]
 */

const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const DEFAULT_PORT = 8080;
const MAIN_SCRIPT_PATH = '/home/pi/projects/stinkster_christian/stinkster/src/orchestration/gps_kismet_wigle.sh';
const PID_FILE = '/home/pi/tmp/gps_kismet_wigle.pids';
const LOG_FILE = '/home/pi/tmp/gps_kismet_wigle.log';
const STATUS_CHECK_TIMEOUT = 5000; // 5 seconds

class ServiceControlAPI {
    constructor(port = DEFAULT_PORT) {
        this.port = port;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Enable CORS for frontend integration
        this.app.use(cors({
            origin: [
                'http://localhost:3000',    // Svelte dev server
                'http://localhost:5173',    // Vite dev server
                'http://localhost:8000',    // WigleToTAK
                'http://localhost:8001',    // Main UI
                'http://localhost:8002',    // Alternative UI port
                /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network
                /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,  // Private network
                process.env.FRONTEND_URL   // Production frontend
            ].filter(Boolean),
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
        }));

        // JSON parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Request logging middleware
        this.app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'stinkster-service-control-api',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                pid: process.pid
            });
        });

        // Start main services
        this.app.post('/api/services/start', async (req, res) => {
            try {
                console.log('Start services request received');

                // Check if already running
                const status = await this.getServiceStatus();
                if (status.running) {
                    return res.status(409).json({
                        success: false,
                        error: 'ALREADY_RUNNING',
                        message: 'Services are already running',
                        details: status,
                        timestamp: new Date().toISOString()
                    });
                }

                // Check if script exists and is executable
                try {
                    await fs.access(MAIN_SCRIPT_PATH, fs.constants.X_OK);
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        error: 'SCRIPT_NOT_FOUND',
                        message: 'Main orchestration script not found or not executable',
                        details: MAIN_SCRIPT_PATH,
                        timestamp: new Date().toISOString()
                    });
                }

                // Start the main script
                const result = await this.startMainScript();

                res.json({
                    success: true,
                    message: 'Services start initiated successfully',
                    details: result,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Failed to start services:', error);
                res.status(500).json({
                    success: false,
                    error: 'START_FAILED',
                    message: 'Failed to start services',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Stop main services
        this.app.post('/api/services/stop', async (req, res) => {
            try {
                console.log('Stop services request received');
                const { force = false } = req.body;

                // Check if running
                const status = await this.getServiceStatus();
                if (!status.running) {
                    return res.status(404).json({
                        success: false,
                        error: 'NOT_RUNNING',
                        message: 'Services are not running',
                        details: 'No active processes found',
                        timestamp: new Date().toISOString()
                    });
                }

                // Stop the services
                const result = await this.stopMainScript(force);

                res.json({
                    success: true,
                    message: 'Services stopped successfully',
                    details: result,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Failed to stop services:', error);
                res.status(500).json({
                    success: false,
                    error: 'STOP_FAILED',
                    message: 'Failed to stop services',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Restart services
        this.app.post('/api/services/restart', async (req, res) => {
            try {
                console.log('Restart services request received');
                const { force = false } = req.body;

                // Stop if running
                const status = await this.getServiceStatus();
                if (status.running) {
                    await this.stopMainScript(force);
                    // Wait a moment for cleanup
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Start services
                const result = await this.startMainScript();

                res.json({
                    success: true,
                    message: 'Services restarted successfully',
                    details: result,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Failed to restart services:', error);
                res.status(500).json({
                    success: false,
                    error: 'RESTART_FAILED',
                    message: 'Failed to restart services',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get service status
        this.app.get('/api/services/status', async (req, res) => {
            try {
                const status = await this.getDetailedServiceStatus();
                res.json({
                    success: true,
                    ...status,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Failed to get service status:', error);
                res.status(500).json({
                    success: false,
                    error: 'STATUS_FAILED',
                    message: 'Failed to get service status',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get system health
        this.app.get('/api/system/health', async (req, res) => {
            try {
                const health = await this.getSystemHealth();
                res.json({
                    success: true,
                    ...health,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Failed to get system health:', error);
                res.status(500).json({
                    success: false,
                    error: 'HEALTH_CHECK_FAILED',
                    message: 'Failed to get system health',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get service logs
        this.app.get('/api/services/logs', async (req, res) => {
            try {
                const { lines = 100, follow = false } = req.query;
                
                if (follow === 'true') {
                    // For real-time log following, we'd need WebSocket or SSE
                    return res.status(501).json({
                        success: false,
                        error: 'NOT_IMPLEMENTED',
                        message: 'Real-time log following not implemented yet',
                        suggestion: 'Use WebSocket endpoint for real-time logs'
                    });
                }

                const logs = await this.getServiceLogs(parseInt(lines));
                res.json({
                    success: true,
                    logs,
                    lineCount: logs.length,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Failed to get service logs:', error);
                res.status(500).json({
                    success: false,
                    error: 'LOGS_FAILED',
                    message: 'Failed to retrieve service logs',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Get available network interfaces
        this.app.get('/api/system/interfaces', async (req, res) => {
            try {
                const interfaces = await this.getNetworkInterfaces();
                res.json({
                    success: true,
                    interfaces,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Failed to get network interfaces:', error);
                res.status(500).json({
                    success: false,
                    error: 'INTERFACES_FAILED',
                    message: 'Failed to get network interfaces',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Stinkster Service Control API',
                version: '1.0.0',
                description: 'API for controlling Stinkster backend services',
                endpoints: {
                    health: 'GET /health',
                    services: {
                        start: 'POST /api/services/start',
                        stop: 'POST /api/services/stop',
                        restart: 'POST /api/services/restart',
                        status: 'GET /api/services/status',
                        logs: 'GET /api/services/logs'
                    },
                    system: {
                        health: 'GET /api/system/health',
                        interfaces: 'GET /api/system/interfaces'
                    }
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: 'Endpoint not found',
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('API Error:', error);
            res.status(500).json({
                success: false,
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        });
    }

    async startMainScript() {
        return new Promise((resolve, reject) => {
            console.log('Starting main orchestration script...');
            
            const child = spawn(MAIN_SCRIPT_PATH, [], {
                detached: true,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: { ...process.env, LOG_DIR: '/home/pi/tmp' }
            });

            child.unref();

            // Set up timeout for initial response
            const timeout = setTimeout(() => {
                reject(new Error('Script start timeout - no response within 10 seconds'));
            }, 10000);

            // Monitor initial output
            let hasStarted = false;
            const outputBuffer = [];

            child.stdout.on('data', (data) => {
                const output = data.toString();
                outputBuffer.push(output);
                console.log(`[Main Script] stdout: ${output.trim()}`);
                
                if (output.includes('All services started') || output.includes('started successfully')) {
                    if (!hasStarted) {
                        hasStarted = true;
                        clearTimeout(timeout);
                        resolve({
                            pid: child.pid,
                            message: 'Services starting',
                            output: outputBuffer.join('')
                        });
                    }
                }
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                console.error(`[Main Script] stderr: ${output.trim()}`);
                outputBuffer.push(`ERROR: ${output}`);
            });

            child.on('exit', (code, signal) => {
                clearTimeout(timeout);
                console.log(`Main script exited with code ${code}, signal ${signal}`);
                
                if (!hasStarted) {
                    reject(new Error(`Script exited immediately with code ${code}`));
                }
            });

            child.on('error', (error) => {
                clearTimeout(timeout);
                console.error('Failed to start main script:', error);
                reject(error);
            });

            // Give a chance for immediate errors, then assume success
            setTimeout(() => {
                if (!hasStarted) {
                    hasStarted = true;
                    clearTimeout(timeout);
                    resolve({
                        pid: child.pid,
                        message: 'Services start initiated',
                        output: outputBuffer.join('')
                    });
                }
            }, 3000);
        });
    }

    async stopMainScript(force = false) {
        try {
            // Read PIDs from file
            const pids = await this.getActivePids();
            
            if (pids.length === 0) {
                throw new Error('No active processes found');
            }

            console.log(`Stopping ${pids.length} processes (force: ${force})`);
            
            const signal = force ? 'SIGKILL' : 'SIGTERM';
            const results = [];

            for (const pid of pids) {
                try {
                    if (await this.isProcessRunning(pid)) {
                        process.kill(pid, signal);
                        results.push({ pid, signal, status: 'sent' });
                        console.log(`Sent ${signal} to PID ${pid}`);
                    } else {
                        results.push({ pid, signal, status: 'already_dead' });
                    }
                } catch (error) {
                    results.push({ pid, signal, status: 'error', error: error.message });
                }
            }

            // Wait for processes to terminate
            if (!force) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Check if any processes are still running
                for (const pid of pids) {
                    if (await this.isProcessRunning(pid)) {
                        console.log(`Process ${pid} still running, sending SIGKILL`);
                        try {
                            process.kill(pid, 'SIGKILL');
                        } catch (error) {
                            console.error(`Failed to kill PID ${pid}:`, error.message);
                        }
                    }
                }
            }

            // Clean up PID file
            try {
                await fs.unlink(PID_FILE);
            } catch (error) {
                // Ignore if file doesn't exist
            }

            return {
                processesKilled: results.length,
                signal,
                results
            };

        } catch (error) {
            console.error('Error stopping main script:', error);
            throw error;
        }
    }

    async getServiceStatus() {
        try {
            const pids = await this.getActivePids();
            const runningPids = [];

            for (const pid of pids) {
                if (await this.isProcessRunning(pid)) {
                    runningPids.push(pid);
                }
            }

            return {
                running: runningPids.length > 0,
                totalPids: pids.length,
                runningPids: runningPids.length,
                pids: runningPids
            };
        } catch (error) {
            return {
                running: false,
                totalPids: 0,
                runningPids: 0,
                pids: [],
                error: error.message
            };
        }
    }

    async getDetailedServiceStatus() {
        const basicStatus = await this.getServiceStatus();
        
        if (!basicStatus.running) {
            return {
                ...basicStatus,
                services: {
                    gps: { running: false },
                    kismet: { running: false },
                    wigletotak: { running: false }
                }
            };
        }

        // Check individual services
        const services = {
            gps: await this.checkServiceByName('cgps'),
            kismet: await this.checkServiceByName('kismet'),
            wigletotak: await this.checkServiceByName('WigleToTak2'),
            gpsd: await this.checkServiceByName('gpsd')
        };

        return {
            ...basicStatus,
            services
        };
    }

    async checkServiceByName(serviceName) {
        try {
            const { stdout } = await execAsync(`pgrep -f "${serviceName}"`);
            const pids = stdout.trim().split('\n').filter(Boolean).map(Number);
            
            if (pids.length > 0) {
                const resourceInfo = await this.getProcessResources(pids[0]);
                return {
                    running: true,
                    pids,
                    ...resourceInfo
                };
            }
            
            return { running: false };
        } catch (error) {
            return { running: false, error: error.message };
        }
    }

    async getProcessResources(pid) {
        try {
            const { stdout } = await execAsync(`ps -p ${pid} -o %cpu,%mem,rss,vsz,etime --no-headers`);
            const [cpu, mem, rss, vsz, etime] = stdout.trim().split(/\s+/);
            
            return {
                pid,
                cpu: parseFloat(cpu),
                memory: {
                    percentage: parseFloat(mem),
                    rss: parseInt(rss) * 1024, // Convert KB to bytes
                    vms: parseInt(vsz) * 1024
                },
                uptime: etime
            };
        } catch (error) {
            return { pid, error: error.message };
        }
    }

    async getSystemHealth() {
        try {
            const [loadAvg, memInfo, diskInfo, cpuTemp] = await Promise.all([
                this.getLoadAverage(),
                this.getMemoryInfo(),
                this.getDiskInfo(),
                this.getCPUTemperature()
            ]);

            const services = await this.getDetailedServiceStatus();

            return {
                system: {
                    hostname: os.hostname(),
                    uptime: os.uptime(),
                    loadAverage: loadAvg,
                    memory: memInfo,
                    disk: diskInfo,
                    temperature: cpuTemp
                },
                services: services.services,
                overall: {
                    healthy: services.running && loadAvg[0] < 4.0 && memInfo.percentage < 90
                }
            };
        } catch (error) {
            throw new Error(`Failed to get system health: ${error.message}`);
        }
    }

    async getLoadAverage() {
        return os.loadavg();
    }

    async getMemoryInfo() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        
        return {
            total,
            free,
            used,
            percentage: Math.round((used / total) * 100)
        };
    }

    async getDiskInfo() {
        try {
            const { stdout } = await execAsync("df -B1 / | tail -1 | awk '{print $2,$3,$4}'");
            const [total, used, available] = stdout.trim().split(' ').map(Number);
            
            return {
                total,
                used,
                available,
                percentage: Math.round((used / total) * 100)
            };
        } catch (error) {
            return { total: 0, used: 0, available: 0, percentage: 0, error: error.message };
        }
    }

    async getCPUTemperature() {
        try {
            const { stdout } = await execAsync('cat /sys/class/thermal/thermal_zone0/temp');
            const temp = parseInt(stdout.trim()) / 1000; // Convert millidegrees to degrees
            return {
                celsius: temp,
                fahrenheit: (temp * 9/5) + 32
            };
        } catch (error) {
            return { celsius: null, fahrenheit: null, error: error.message };
        }
    }

    async getNetworkInterfaces() {
        const interfaces = [];
        const nets = os.networkInterfaces();
        
        for (const [name, addrs] of Object.entries(nets)) {
            for (const addr of addrs) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    const monitoring = await this.isInterfaceInMonitorMode(name);
                    interfaces.push({
                        name,
                        address: addr.address,
                        mac: addr.mac,
                        type: name.startsWith('wlan') ? 'wireless' : 'ethernet',
                        monitoring
                    });
                }
            }
        }
        
        return interfaces;
    }

    async isInterfaceInMonitorMode(interfaceName) {
        try {
            const { stdout } = await execAsync(`iw dev ${interfaceName} info 2>/dev/null | grep type`);
            return stdout.includes('monitor');
        } catch (error) {
            return false;
        }
    }

    async getServiceLogs(lines = 100) {
        try {
            const { stdout } = await execAsync(`tail -n ${lines} ${LOG_FILE}`);
            return stdout.split('\n').filter(Boolean);
        } catch (error) {
            throw new Error(`Failed to read log file: ${error.message}`);
        }
    }

    async getActivePids() {
        try {
            const content = await fs.readFile(PID_FILE, 'utf8');
            return content.trim().split('\n')
                .map(line => parseInt(line.trim()))
                .filter(pid => !isNaN(pid));
        } catch (error) {
            return [];
        }
    }

    async isProcessRunning(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }

    start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    console.log(`[${new Date().toISOString()}] Stinkster Service Control API started on port ${this.port}`);
                    console.log(`Available endpoints:`);
                    console.log(`  - Health check: http://localhost:${this.port}/health`);
                    console.log(`  - Service status: http://localhost:${this.port}/api/services/status`);
                    console.log(`  - Start services: POST http://localhost:${this.port}/api/services/start`);
                    console.log(`  - Stop services: POST http://localhost:${this.port}/api/services/stop`);
                    console.log(`  - System health: http://localhost:${this.port}/api/system/health`);
                    resolve();
                }
            });
        });
    }

    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('Service Control API server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// Signal handlers for graceful shutdown
function setupSignalHandlers(api) {
    const shutdown = async (signal) => {
        console.log(`\nReceived ${signal}, shutting down gracefully...`);
        try {
            await api.stop();
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Main execution
if (require.main === module) {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let port = DEFAULT_PORT;
    let debug = false;

    for (const arg of args) {
        if (arg.startsWith('--port=')) {
            port = parseInt(arg.split('=')[1]) || DEFAULT_PORT;
        } else if (arg === '--debug') {
            debug = true;
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Stinkster Service Control API

Usage: node service-control-api.js [options]

Options:
  --port=PORT    Set the API server port (default: ${DEFAULT_PORT})
  --debug        Enable debug logging
  --help, -h     Show this help message

Environment Variables:
  FRONTEND_URL   Set allowed frontend URL for CORS

API Endpoints:
  GET  /health                   - Health check
  GET  /api/services/status      - Get service status
  POST /api/services/start       - Start all services
  POST /api/services/stop        - Stop all services
  POST /api/services/restart     - Restart all services
  GET  /api/services/logs        - Get service logs
  GET  /api/system/health        - Get system health
  GET  /api/system/interfaces    - Get network interfaces
            `);
            process.exit(0);
        }
    }

    if (debug) {
        console.log('Debug mode enabled');
    }

    // Start the API server
    const api = new ServiceControlAPI(port);
    setupSignalHandlers(api);

    api.start().catch(error => {
        console.error('Failed to start Service Control API:', error);
        process.exit(1);
    });
}

module.exports = ServiceControlAPI;
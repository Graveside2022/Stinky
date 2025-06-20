/**
 * Spectrum Analyzer Service - Main Entry Point
 * 
 * Node.js implementation of the HackRF Spectrum Analyzer service
 * Provides real-time FFT data processing and WebSocket communication
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const pidusage = require('pidusage');

const { createServiceLogger } = require('../shared/logger');
const config = require('../config');
const { ValidationError, ServiceError, asyncHandler, createErrorHandler } = require('../shared/errors');
const WebhookService = require('./lib/webhook');

const execAsync = promisify(exec);

class SpectrumAnalyzerService {
    constructor(options = {}) {
        this.config = {
            ...config.getServiceConfig('spectrum'),
            ...options
        };
        
        this.logger = createServiceLogger('spectrum-analyzer');
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: this.config.websocket?.cors_origin || '*',
                methods: ['GET', 'POST']
            },
            pingInterval: this.config.websocket?.ping_interval || 25000,
            pingTimeout: this.config.websocket?.ping_timeout || 5000
        });
        
        this.isRunning = false;
        this.connectedClients = new Map();
        this.fftBuffer = [];
        this.openWebRXClient = null;
        
        // Script management
        this.runningScripts = new Map(); // Map of script_name -> process info
        this.scriptPaths = {
            'start_kismet': path.join(__dirname, '../../scripts/start_kismet.sh'),
            'gps_kismet_wigle': path.join(__dirname, '../../orchestration/gps_kismet_wigle.sh'),
            'stop_restart_services': path.join(__dirname, '../../orchestration/stop_and_restart_services.sh'),
            'smart_restart': path.join(__dirname, '../../orchestration/smart_restart.sh'),
            'start_mediamtx': path.join(__dirname, '../../scripts/start_mediamtx.sh'),
            'mavgps': path.join(__dirname, '../../gpsmav/mavgps.py'),
            'spectrum_analyzer': path.join(__dirname, '../../hackrf/spectrum_analyzer.py')
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        
        // Initialize webhook service
        this.webhookService = null;
    }

    setupMiddleware() {
        // Security and parsing middleware
        this.app.use(require('helmet')());
        this.app.use(require('cors')());
        this.app.use(require('compression')());
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
        
        // Logging middleware
        this.app.use(require('../shared/logger').getExpressMiddleware());
        
        // Static files
        this.app.use(express.static(path.join(__dirname, '../public/spectrum')));
    }

    setupRoutes() {
        // Main HTML interface
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/spectrum/index.html'));
        });

        // API status endpoint
        this.app.get('/api/status', asyncHandler(async (req, res) => {
            const status = this.getStatus();
            res.json(status);
        }));

        // Scan profiles endpoint
        this.app.get('/api/profiles', asyncHandler(async (req, res) => {
            const profiles = this.getScanProfiles();
            res.json(profiles);
        }));

        // Scan endpoint
        this.app.get('/api/scan/:profileId', asyncHandler(async (req, res) => {
            const { profileId } = req.params;
            const result = await this.performScan(profileId);
            res.json(result);
        }));

        // Health check endpoint
        this.app.get('/health', asyncHandler(async (req, res) => {
            const health = {
                status: this.isRunning ? 'healthy' : 'unhealthy',
                service: 'spectrum-analyzer',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                openwebrx_connected: this.openWebRXClient?.isConnected() || false,
                fft_buffer_size: this.fftBuffer.length,
                connected_clients: this.connectedClients.size
            };
            
            res.json(health);
        }));

        // System info endpoint
        this.app.get('/info', asyncHandler(async (req, res) => {
            const info = await this.getSystemInfo();
            res.json(info);
        }));

        // Script status endpoint
        this.app.get('/script-status', asyncHandler(async (req, res) => {
            const status = await this.getScriptStatus();
            res.json(status);
        }));

        // Script management endpoints
        this.app.post('/run-script', asyncHandler(async (req, res) => {
            const { script_name, args = [] } = req.body;
            
            if (!script_name) {
                throw new ValidationError('script_name is required');
            }
            
            this.logger.info(`Running script: ${script_name}`, { args });
            
            try {
                const processId = await this.runScript(script_name, args);
                res.json({
                    status: 'success',
                    message: `Script ${script_name} started`,
                    process_id: processId
                });
            } catch (error) {
                this.logger.error(`Failed to run script ${script_name}:`, error);
                res.status(500).json({
                    status: 'error',
                    message: error.message
                });
            }
        }));

        this.app.post('/stop-script', asyncHandler(async (req, res) => {
            const { script_name, process_id } = req.body;
            
            if (!script_name && !process_id) {
                throw new ValidationError('Either script_name or process_id is required');
            }
            
            this.logger.info(`Stopping script: ${script_name || 'by process_id'}`, { process_id });
            
            try {
                const stopped = await this.stopScript(script_name, process_id);
                res.json({
                    status: 'success',
                    message: stopped ? 'Script stopped' : 'Script not found or already stopped',
                    stopped
                });
            } catch (error) {
                this.logger.error(`Failed to stop script:`, error);
                res.status(500).json({
                    status: 'error',
                    message: error.message
                });
            }
        }));

        // Error handling middleware
        this.app.use(createErrorHandler(this.logger));
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            const clientId = socket.id;
            this.logger.info(`Client connected: ${clientId}`);
            
            this.connectedClients.set(clientId, {
                id: clientId,
                connectedAt: Date.now(),
                socket: socket
            });

            // Send initial status
            socket.emit('status', {
                connected: true,
                openwebrx_status: this.openWebRXClient?.isConnected() || false,
                service: 'spectrum-analyzer',
                timestamp: Date.now()
            });

            // Handle client disconnect
            socket.on('disconnect', () => {
                this.logger.info(`Client disconnected: ${clientId}`);
                this.connectedClients.delete(clientId);
            });

            // Handle client errors
            socket.on('error', (error) => {
                this.logger.error(`WebSocket error from client ${clientId}:`, error);
            });
        });
    }

    getStatus() {
        const hasRealData = this.fftBuffer.length > 0;
        
        return {
            openwebrx_connected: this.openWebRXClient?.isConnected() || false,
            real_data: hasRealData,
            fft_buffer_size: this.fftBuffer.length,
            config: this.openWebRXClient?.getConfig() || {},
            last_fft_time: hasRealData ? this.fftBuffer[this.fftBuffer.length - 1].timestamp : null,
            mode: hasRealData ? 'REAL DATA MODE' : 'DEMO MODE',
            connected_clients: this.connectedClients.size,
            service_uptime: this.isRunning ? Date.now() - this.startTime : 0
        };
    }

    getScanProfiles() {
        return {
            'vhf': {
                'name': 'VHF Amateur (144-148 MHz)',
                'ranges': [[144.0, 148.0]],
                'step': 25,
                'description': 'VHF Amateur Radio Band'
            },
            'uhf': {
                'name': 'UHF Amateur (420-450 MHz)', 
                'ranges': [[420.0, 450.0]],
                'step': 25,
                'description': 'UHF Amateur Radio Band'
            },
            'ism': {
                'name': 'ISM Band (2.4 GHz)',
                'ranges': [[2400.0, 2485.0]],
                'step': 1000,
                'description': 'Industrial, Scientific, Medical Band'
            }
        };
    }

    async performScan(profileId) {
        const profiles = this.getScanProfiles();
        
        if (!profiles[profileId]) {
            throw new ValidationError(`Invalid profile: ${profileId}`);
        }

        const profile = profiles[profileId];
        let signals = [];

        if (this.fftBuffer.length > 0) {
            // Use real FFT data
            const latestFFT = this.fftBuffer[this.fftBuffer.length - 1];
            signals = this.detectSignalsInFFT(latestFFT, profile);
        } else {
            // Demo mode - generate fake signals
            signals = this.generateDemoSignals(profile);
        }

        // Sort by strength
        signals.sort((a, b) => parseFloat(b.strength) - parseFloat(a.strength));

        return {
            profile,
            signals,
            scan_time: Date.now(),
            real_data: this.fftBuffer.length > 0
        };
    }

    detectSignalsInFFT(fftData, profile) {
        // Placeholder implementation - to be enhanced with actual signal processing
        const signals = [];
        
        // This would contain actual FFT peak detection algorithms
        // For now, return a simple demo response
        
        return signals;
    }

    generateDemoSignals(profile) {
        const signals = [];
        
        for (const range of profile.ranges) {
            const [start, end] = range;
            for (let freq = start; freq < end; freq += profile.step / 1000) {
                if (Math.random() < 0.3) { // 30% chance
                    signals.push({
                        id: `demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        frequency: freq.toFixed(3),
                        strength: (Math.random() * 40 - 80).toFixed(1), // -80 to -40 dBm
                        bandwidth: (Math.random() * 20 + 5).toFixed(1), // 5-25 kHz
                        confidence: Math.random() * 0.6 + 0.3, // 0.3-0.9
                        type: 'demo'
                    });
                }
            }
        }
        
        return signals;
    }

    async getSystemInfo() {
        try {
            // Get system information
            const cpus = os.cpus();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const loadAvg = os.loadavg();
            const uptime = os.uptime();
            const platform = os.platform();
            const release = os.release();
            const arch = os.arch();
            const hostname = os.hostname();
            
            // Get Node.js process info
            const processMemory = process.memoryUsage();
            const processUptime = process.uptime();
            
            // Get disk usage
            let diskUsage = null;
            try {
                const { stdout } = await execAsync('df -h /');
                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    diskUsage = {
                        filesystem: parts[0],
                        size: parts[1],
                        used: parts[2],
                        available: parts[3],
                        use_percent: parts[4]
                    };
                }
            } catch (error) {
                this.logger.warn('Failed to get disk usage:', error);
            }
            
            // Get network interfaces
            const networkInterfaces = os.networkInterfaces();
            const interfaces = {};
            for (const [name, ifaces] of Object.entries(networkInterfaces)) {
                interfaces[name] = ifaces.filter(iface => !iface.internal).map(iface => ({
                    family: iface.family,
                    address: iface.address,
                    netmask: iface.netmask
                }));
            }
            
            return {
                system: {
                    hostname,
                    platform,
                    release,
                    arch,
                    uptime: Math.floor(uptime),
                    cpus: {
                        count: cpus.length,
                        model: cpus[0]?.model || 'Unknown',
                        speed: cpus[0]?.speed || 0
                    },
                    memory: {
                        total: totalMemory,
                        free: freeMemory,
                        used: totalMemory - freeMemory,
                        percent_used: ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2)
                    },
                    load_average: {
                        '1min': loadAvg[0].toFixed(2),
                        '5min': loadAvg[1].toFixed(2),
                        '15min': loadAvg[2].toFixed(2)
                    },
                    disk: diskUsage,
                    network_interfaces: interfaces
                },
                process: {
                    pid: process.pid,
                    version: process.version,
                    uptime: Math.floor(processUptime),
                    memory: {
                        rss: processMemory.rss,
                        heap_total: processMemory.heapTotal,
                        heap_used: processMemory.heapUsed,
                        external: processMemory.external
                    }
                },
                service: {
                    name: 'spectrum-analyzer',
                    version: '2.0.0',
                    port: this.config.port,
                    environment: this.config.environment || 'production',
                    status: this.isRunning ? 'running' : 'stopped',
                    connected_clients: this.connectedClients.size,
                    openwebrx_connected: this.openWebRXClient?.isConnected() || false
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('Error getting system info:', error);
            throw new ServiceError('Failed to get system information', { originalError: error });
        }
    }

    async getScriptStatus() {
        try {
            const scripts = {};
            
            // Get status of managed scripts
            const managedScripts = this.getRunningScripts();
            for (const script of managedScripts) {
                scripts[script.name] = {
                    status: script.running ? 'running' : 'stopped',
                    pid: script.pid,
                    elapsed_time: Math.floor(script.uptime / 1000) + ' seconds',
                    managed: true,
                    exitCode: script.exitCode,
                    error: script.error
                };
                
                // Get CPU and memory info for running processes
                if (script.running && script.pid) {
                    try {
                        const stats = await pidusage(script.pid);
                        scripts[script.name].cpu = stats.cpu.toFixed(2) + '%';
                        scripts[script.name].memory = (stats.memory / 1024 / 1024).toFixed(2) + ' MB';
                    } catch (e) {
                        // Process might have just exited
                    }
                }
            }
            
            // Also check for system-wide scripts that might be running outside our management
            const scriptNames = [
                'gps_kismet_wigle.sh',
                'start_kismet.sh',
                'mavgps.py',
                'WigleToTak2.py',
                'spectrum_analyzer.py'
            ];
            
            for (const scriptName of scriptNames) {
                // Skip if already tracked as managed
                if (!scripts[scriptName]) {
                    try {
                        // Try to find the process
                        const { stdout } = await execAsync(`pgrep -f "${scriptName}" | head -1`);
                        const pid = stdout.trim();
                        
                        if (pid) {
                            // Get process details
                            const stats = await pidusage(parseInt(pid));
                            
                            // Get process command line
                            let cmdline = '';
                            try {
                                const { stdout: cmd } = await execAsync(`ps -p ${pid} -o command --no-headers`);
                                cmdline = cmd.trim();
                            } catch (err) {
                                cmdline = 'Unknown';
                            }
                            
                            scripts[scriptName] = {
                                status: 'running',
                                pid: parseInt(pid),
                                cpu: stats.cpu.toFixed(2) + '%',
                                memory: (stats.memory / 1024 / 1024).toFixed(2) + ' MB',
                                elapsed_time: Math.floor(stats.elapsed / 1000) + ' seconds',
                                command: cmdline,
                                managed: false
                            };
                    } else {
                        scripts[scriptName] = {
                            status: 'stopped',
                            pid: null,
                            cpu: '0%',
                            memory: '0 MB',
                            elapsed_time: '0 seconds',
                            command: null
                        };
                    }
                } catch (error) {
                    scripts[scriptName] = {
                        status: 'stopped',
                        pid: null,
                        cpu: '0%',
                        memory: '0 MB',
                        elapsed_time: '0 seconds',
                        command: null,
                        error: error.message
                    };
                }
            }
            
            // Check specific services
            const services = {};
            
            // Check Kismet
            try {
                const { stdout } = await execAsync('pgrep -f "kismet" | head -1');
                services.kismet = stdout.trim() ? 'running' : 'stopped';
            } catch (error) {
                services.kismet = 'stopped';
            }
            
            // Check GPSD
            try {
                const { stdout } = await execAsync('systemctl is-active gpsd');
                services.gpsd = stdout.trim() === 'active' ? 'running' : 'stopped';
            } catch (error) {
                services.gpsd = 'stopped';
            }
            
            // Check OpenWebRX Docker container
            try {
                const { stdout } = await execAsync('docker ps --filter "name=openwebrx" --format "{{.Status}}"');
                services.openwebrx = stdout.trim() ? 'running' : 'stopped';
            } catch (error) {
                services.openwebrx = 'stopped';
            }
            
            // Get PID file status
            const pidFiles = {};
            const pidFileLocations = [
                '/home/pi/tmp/gps_kismet_wigle.pids',
                '/home/pi/tmp/kismet.pid',
                '/home/pi/tmp/wigletotak.pid'
            ];
            
            for (const pidFile of pidFileLocations) {
                try {
                    const { stdout } = await execAsync(`[ -f "${pidFile}" ] && cat "${pidFile}" || echo ""`);
                    const content = stdout.trim();
                    pidFiles[path.basename(pidFile)] = content || 'not found';
                } catch (error) {
                    pidFiles[path.basename(pidFile)] = 'error reading';
                }
            }
            
            return {
                scripts,
                services,
                pid_files: pidFiles,
                timestamp: new Date().toISOString(),
                node_services: {
                    spectrum_analyzer: {
                        status: this.isRunning ? 'running' : 'stopped',
                        port: this.config.port,
                        uptime: this.isRunning ? Date.now() - this.startTime : 0,
                        connected_clients: this.connectedClients.size
                    },
                    wigle_to_tak: {
                        status: 'unknown', // Would need to check the actual service
                        port: 8000
                    },
                    gps_bridge: {
                        status: 'unknown', // Would need to check the actual service
                        port: 2947
                    }
                }
            };
        } catch (error) {
            this.logger.error('Error getting script status:', error);
            throw new ServiceError('Failed to get script status', { originalError: error });
        }
    }

    broadcastFFTData(fftData) {
        // Add to buffer with size limit
        this.fftBuffer.push(fftData);
        while (this.fftBuffer.length > (this.config.fft?.buffer_size || 10)) {
            this.fftBuffer.shift();
        }

        // Broadcast to all connected clients
        this.io.emit('fft_data', fftData);
        
        this.logger.debug('FFT data broadcasted', {
            data_points: fftData.data?.length || 0,
            center_freq: fftData.center_freq,
            clients: this.connectedClients.size
        });
    }

    async start() {
        try {
            this.startTime = Date.now();
            
            // Initialize OpenWebRX client
            await this.initializeOpenWebRXClient();
            
            // Start HTTP server
            await new Promise((resolve, reject) => {
                this.server.listen(this.config.port, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            this.isRunning = true;
            
            // Initialize webhook service
            this.webhookService = new WebhookService(this.app, this.io, {
                kismetUrl: this.config.kismet?.url || 'http://localhost:2501',
                pidDir: '/tmp/kismet-operations',
                spectrumPort: this.config.port
            });
            
            this.logger.info(`Spectrum Analyzer service started`, {
                port: this.config.port,
                environment: this.config.environment || 'production',
                openwebrx_url: this.config.openwebrx?.url,
                webhook_enabled: true
            });

        } catch (error) {
            this.logger.error('Failed to start Spectrum Analyzer service:', error);
            throw new ServiceError('Failed to start service', { originalError: error });
        }
    }

    async initializeOpenWebRXClient() {
        try {
            // This would initialize the OpenWebRX WebSocket client
            // For now, we'll create a placeholder
            this.logger.info('Initializing OpenWebRX client...');
            
            // TODO: Implement actual OpenWebRX client initialization
            // const OpenWebRXClient = require('./openwebrx-client');
            // this.openWebRXClient = new OpenWebRXClient(this.config.openwebrx);
            // await this.openWebRXClient.connect();
            
            this.logger.info('OpenWebRX client initialization completed');
            
        } catch (error) {
            this.logger.warn('OpenWebRX client initialization failed:', error);
            // Continue without OpenWebRX connection (demo mode)
        }
    }

    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.logger.info('Stopping Spectrum Analyzer service...');

        try {
            // Shutdown webhook service
            if (this.webhookService) {
                await this.webhookService.shutdown();
            }
            
            // Close WebSocket connections
            this.io.close();
            
            // Disconnect OpenWebRX client
            if (this.openWebRXClient) {
                await this.openWebRXClient.disconnect();
            }
            
            // Close HTTP server
            await new Promise((resolve) => {
                this.server.close(resolve);
            });

            this.isRunning = false;
            this.logger.info('Spectrum Analyzer service stopped successfully');

        } catch (error) {
            this.logger.error('Error stopping Spectrum Analyzer service:', error);
            throw new ServiceError('Failed to stop service gracefully', { originalError: error });
        }
    }

    getServiceInfo() {
        return {
            name: 'spectrum-analyzer',
            version: '2.0.0',
            description: 'HackRF Spectrum Analyzer Service',
            port: this.config.port,
            status: this.isRunning ? 'running' : 'stopped',
            uptime: this.isRunning ? Date.now() - this.startTime : 0
        };
    }

    // Script Management Methods
    async runScript(scriptName, args = []) {
        const scriptPath = this.scriptPaths[scriptName];
        
        if (!scriptPath) {
            throw new ValidationError(`Unknown script: ${scriptName}`);
        }
        
        // Check if script is already running (skip for restart scripts)
        const restartScripts = ['stop_restart_services', 'smart_restart'];
        if (!restartScripts.includes(scriptName) && this.runningScripts.has(scriptName)) {
            const existingProcess = this.runningScripts.get(scriptName);
            if (existingProcess && !existingProcess.killed) {
                throw new ServiceError(`Script ${scriptName} is already running with PID ${existingProcess.pid}`);
            }
        }
        
        // For restart scripts, clear any existing tracking
        if (restartScripts.includes(scriptName)) {
            this.runningScripts.delete(scriptName);
        }
        
        this.logger.info(`Starting script: ${scriptPath}`, { args });
        
        // Determine how to run the script
        let command, commandArgs;
        
        if (scriptPath.endsWith('.py')) {
            // Python script - check for virtual environment
            const venvPath = path.dirname(scriptPath);
            const possibleVenvs = ['venv', '../venv', '../../venv'];
            let pythonCmd = 'python3';
            
            for (const venv of possibleVenvs) {
                const venvPython = path.join(venvPath, venv, 'bin', 'python');
                try {
                    await fs.access(venvPython);
                    pythonCmd = venvPython;
                    break;
                } catch (e) {
                    // Continue searching
                }
            }
            
            command = pythonCmd;
            commandArgs = [scriptPath, ...args];
        } else {
            // Shell script or executable
            command = scriptPath;
            commandArgs = args;
        }
        
        // Spawn the process
        const child = spawn(command, commandArgs, {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONUNBUFFERED: '1' }
        });
        
        // Store process info
        const processInfo = {
            pid: child.pid,
            script: scriptName,
            path: scriptPath,
            args: args,
            startTime: Date.now(),
            process: child,
            killed: false
        };
        
        this.runningScripts.set(scriptName, processInfo);
        
        // Handle process output
        child.stdout.on('data', (data) => {
            this.logger.info(`[${scriptName}] stdout:`, data.toString());
            this.io.emit('script_output', {
                script: scriptName,
                type: 'stdout',
                data: data.toString(),
                timestamp: Date.now()
            });
        });
        
        child.stderr.on('data', (data) => {
            this.logger.error(`[${scriptName}] stderr:`, data.toString());
            this.io.emit('script_output', {
                script: scriptName,
                type: 'stderr',
                data: data.toString(),
                timestamp: Date.now()
            });
        });
        
        // Handle process exit
        child.on('exit', (code, signal) => {
            this.logger.info(`Script ${scriptName} exited`, { code, signal });
            const processInfo = this.runningScripts.get(scriptName);
            if (processInfo) {
                processInfo.killed = true;
                processInfo.exitCode = code;
                processInfo.exitSignal = signal;
                processInfo.endTime = Date.now();
            }
            
            this.io.emit('script_exit', {
                script: scriptName,
                code,
                signal,
                timestamp: Date.now()
            });
        });
        
        child.on('error', (error) => {
            this.logger.error(`Script ${scriptName} error:`, error);
            const processInfo = this.runningScripts.get(scriptName);
            if (processInfo) {
                processInfo.killed = true;
                processInfo.error = error.message;
            }
        });
        
        // Unref the child to allow parent to exit independently
        child.unref();
        
        return child.pid;
    }
    
    async stopScript(scriptName, processId) {
        let processInfo;
        
        if (scriptName) {
            processInfo = this.runningScripts.get(scriptName);
        } else if (processId) {
            // Find by process ID
            for (const [name, info] of this.runningScripts.entries()) {
                if (info.pid === processId) {
                    processInfo = info;
                    scriptName = name;
                    break;
                }
            }
        }
        
        if (!processInfo || processInfo.killed) {
            return false;
        }
        
        this.logger.info(`Stopping script ${scriptName} (PID: ${processInfo.pid})`);
        
        try {
            // Try graceful shutdown first
            process.kill(processInfo.pid, 'SIGTERM');
            
            // Give it 5 seconds to terminate gracefully
            let terminated = false;
            const checkInterval = setInterval(() => {
                try {
                    process.kill(processInfo.pid, 0); // Check if process exists
                } catch (e) {
                    // Process no longer exists
                    terminated = true;
                    clearInterval(checkInterval);
                }
            }, 100);
            
            await new Promise((resolve) => {
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 5000);
            });
            
            if (!terminated) {
                // Force kill if still running
                this.logger.warn(`Force killing script ${scriptName} (PID: ${processInfo.pid})`);
                process.kill(processInfo.pid, 'SIGKILL');
            }
            
            processInfo.killed = true;
            processInfo.endTime = Date.now();
            
            return true;
        } catch (error) {
            this.logger.error(`Error stopping script ${scriptName}:`, error);
            // Process might have already exited
            processInfo.killed = true;
            processInfo.error = error.message;
            return false;
        }
    }
    
    getRunningScripts() {
        const scripts = [];
        
        for (const [name, info] of this.runningScripts.entries()) {
            scripts.push({
                name,
                pid: info.pid,
                path: info.path,
                args: info.args,
                running: !info.killed,
                startTime: info.startTime,
                endTime: info.endTime,
                exitCode: info.exitCode,
                exitSignal: info.exitSignal,
                error: info.error,
                uptime: info.killed ? 
                    (info.endTime - info.startTime) : 
                    (Date.now() - info.startTime)
            });
        }
        
        return scripts;
    }
}

// Export for use as a module
module.exports = SpectrumAnalyzerService;

// Allow running as standalone service
if (require.main === module) {
    const service = new SpectrumAnalyzerService();
    
    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await service.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await service.stop();
        process.exit(0);
    });
    
    // Start the service
    service.start().catch(error => {
        console.error('Failed to start Spectrum Analyzer service:', error);
        process.exit(1);
    });
}
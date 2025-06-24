/**
 * Script Manager - Process Management for Kismet and GPS Services
 * 
 * Handles starting, stopping, and monitoring of external scripts
 * with comprehensive error handling and process lifecycle management
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const execAsync = promisify(exec);

const { ServiceError, FileNotFoundError, ValidationError } = require('../../../shared/errors');

class ScriptManager {
    constructor(config, logger) {
        this.config = {
            pidDir: '/tmp/kismet-operations',
            scriptsDir: '/home/pi/stinky',
            restoreNetworkScript: '/home/pi/projects/stinkster_malone/stinkster/src/scripts/restore_network.sh',
            maxConcurrentScripts: 5,
            processCheckInterval: 5000,
            ...config
        };
        
        this.logger = logger;
        this.runningScripts = new Map();
        this.scriptPaths = {
            kismet: path.join(this.config.scriptsDir, 'start_kismet.sh'),
            gps: path.join(this.config.scriptsDir, 'start_gps.sh'),
            both: path.join(this.config.scriptsDir, 'gps_kismet_wigle.sh')
        };
        
        // Ensure PID directory exists
        this.initializePidDirectory();
        
        // Start monitoring running processes
        this.startProcessMonitoring();
        
        this.logger.info('ScriptManager initialized', {
            pidDir: this.config.pidDir,
            scriptsDir: this.config.scriptsDir
        });
    }

    async initializePidDirectory() {
        try {
            await fs.mkdir(this.config.pidDir, { recursive: true });
            this.logger.debug('PID directory ensured', { dir: this.config.pidDir });
        } catch (error) {
            this.logger.error('Failed to create PID directory', { error: error.message });
        }
    }

    async startScript(scriptName, options = {}) {
        // Validate script name
        if (!this.scriptPaths[scriptName]) {
            throw new ValidationError(`Invalid script name: ${scriptName}`, {
                validScripts: Object.keys(this.scriptPaths)
            });
        }

        // Check concurrent script limit
        if (this.runningScripts.size >= this.config.maxConcurrentScripts) {
            throw new ServiceError('Maximum concurrent scripts limit reached', {
                limit: this.config.maxConcurrentScripts,
                running: this.runningScripts.size
            });
        }

        const scriptPath = this.scriptPaths[scriptName];
        
        // Check if script exists
        try {
            await fs.access(scriptPath, fs.constants.X_OK);
        } catch (error) {
            throw new FileNotFoundError(`Script not found or not executable: ${scriptPath}`);
        }

        // Check if already running
        const existingPid = await this.getPidFromFile(scriptName);
        if (existingPid && await this.isProcessRunning(existingPid)) {
            throw new ServiceError(`Script ${scriptName} is already running`, { pid: existingPid });
        }

        // Prepare environment and arguments
        const env = { ...process.env };
        const args = [];

        if (options.interface) {
            env.KISMET_INTERFACE = options.interface;
        }
        if (options.config) {
            args.push('--config', options.config);
        }

        // Start the script
        const child = spawn(scriptPath, args, {
            env,
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        child.unref();

        // Store process info
        const processInfo = {
            pid: child.pid,
            name: scriptName,
            startTime: Date.now(),
            options,
            process: child
        };

        this.runningScripts.set(scriptName, processInfo);

        // Write PID file
        await this.writePidFile(scriptName, child.pid);

        // Setup output logging
        child.stdout.on('data', (data) => {
            this.logger.info(`[${scriptName}] stdout:`, data.toString().trim());
        });

        child.stderr.on('data', (data) => {
            this.logger.error(`[${scriptName}] stderr:`, data.toString().trim());
        });

        child.on('exit', (code, signal) => {
            this.logger.info(`Script ${scriptName} exited`, { code, signal });
            this.runningScripts.delete(scriptName);
            this.removePidFile(scriptName).catch(err => 
                this.logger.error('Failed to remove PID file', { script: scriptName, error: err.message })
            );
        });

        this.logger.info('Script started successfully', {
            script: scriptName,
            pid: child.pid,
            options
        });

        return {
            pid: child.pid,
            script: scriptName,
            startTime: processInfo.startTime
        };
    }

    async stopScript(scriptName, force = false) {
        // Check running scripts map first
        const processInfo = this.runningScripts.get(scriptName);
        let pid;

        if (processInfo) {
            pid = processInfo.pid;
        } else {
            // Try to get PID from file
            pid = await this.getPidFromFile(scriptName);
            if (!pid) {
                throw new ServiceError(`Script ${scriptName} is not running`);
            }
        }

        // Verify process is actually running
        if (!await this.isProcessRunning(pid)) {
            this.runningScripts.delete(scriptName);
            await this.removePidFile(scriptName);
            throw new ServiceError(`Process ${pid} is not running`);
        }

        try {
            // Send termination signal
            const signal = force ? 'SIGKILL' : 'SIGTERM';
            process.kill(pid, signal);
            
            this.logger.info(`Sent ${signal} to process`, { script: scriptName, pid });

            // Wait for process to terminate
            let terminated = false;
            const maxWaitTime = force ? 5000 : 15000; // 5s for force, 15s for graceful
            const checkInterval = 100;
            let waited = 0;

            while (waited < maxWaitTime) {
                if (!await this.isProcessRunning(pid)) {
                    terminated = true;
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waited += checkInterval;
            }

            if (!terminated && !force) {
                // Try force kill
                this.logger.warn('Graceful shutdown failed, forcing kill', { script: scriptName, pid });
                return this.stopScript(scriptName, true);
            }

            if (!terminated) {
                throw new ServiceError('Failed to terminate process', { script: scriptName, pid });
            }

            // Cleanup
            this.runningScripts.delete(scriptName);
            await this.removePidFile(scriptName);

            this.logger.info('Script stopped successfully', { script: scriptName, pid });

            // If we stopped Kismet, restore network connectivity
            if (scriptName === 'kismet' || scriptName === 'both') {
                this.logger.info('Restoring network connectivity after Kismet stop...');
                try {
                    const restoreScript = this.config.restoreNetworkScript;
                    await fs.access(restoreScript, fs.constants.X_OK);
                    
                    // Run network restoration in background
                    exec(restoreScript, (error, stdout, stderr) => {
                        if (error) {
                            this.logger.error('Network restoration failed', { error: error.message, stderr });
                        } else {
                            this.logger.info('Network restoration completed', { stdout });
                        }
                    });
                    
                    this.logger.info('Network restoration script started');
                } catch (error) {
                    this.logger.warn('Network restoration script not found or not executable', { error: error.message });
                }
            }

            return {
                pid,
                script: scriptName,
                method: force ? 'force' : 'graceful'
            };

        } catch (error) {
            if (error.code === 'ESRCH') {
                // Process doesn't exist
                this.runningScripts.delete(scriptName);
                await this.removePidFile(scriptName);
                throw new ServiceError(`Process ${pid} does not exist`);
            }
            throw new ServiceError(`Failed to stop script: ${error.message}`, { 
                script: scriptName, 
                pid,
                originalError: error 
            });
        }
    }

    async stopAll() {
        const results = [];
        const scripts = ['kismet', 'gps', 'both'];

        for (const script of scripts) {
            try {
                const status = await this.getStatus(script);
                if (status && status.running) {
                    const result = await this.stopScript(script);
                    results.push(result);
                }
            } catch (error) {
                this.logger.error(`Failed to stop ${script}:`, error);
            }
        }

        return results;
    }

    async getStatus(scriptName = null) {
        if (scriptName && scriptName !== 'both') {
            return this.getScriptStatus(scriptName);
        }

        // Get status for all scripts
        const status = {};
        for (const script of ['kismet', 'gps']) {
            status[script] = await this.getScriptStatus(script);
        }

        return status;
    }

    async getScriptStatus(scriptName) {
        try {
            // Check running scripts map
            const processInfo = this.runningScripts.get(scriptName);
            if (processInfo) {
                const resourceUsage = await this.getProcessResourceUsage(processInfo.pid);
                return {
                    running: true,
                    pid: processInfo.pid,
                    uptime: Math.floor((Date.now() - processInfo.startTime) / 1000),
                    startTime: new Date(processInfo.startTime).toISOString(),
                    ...resourceUsage
                };
            }

            // Check PID file
            const pid = await this.getPidFromFile(scriptName);
            if (pid && await this.isProcessRunning(pid)) {
                const resourceUsage = await this.getProcessResourceUsage(pid);
                return {
                    running: true,
                    pid,
                    uptime: null, // Unknown from PID file alone
                    startTime: null,
                    ...resourceUsage
                };
            }

            // Not running
            const lastRunInfo = await this.getLastRunInfo(scriptName);
            return {
                running: false,
                pid: null,
                ...lastRunInfo
            };

        } catch (error) {
            this.logger.error('Failed to get script status', { script: scriptName, error: error.message });
            return {
                running: false,
                pid: null,
                error: error.message
            };
        }
    }

    async getSystemInfo() {
        try {
            const [loadAvg, memInfo, diskInfo, networkInterfaces] = await Promise.all([
                this.getLoadAverage(),
                this.getMemoryInfo(),
                this.getDiskInfo(),
                this.getNetworkInterfaces()
            ]);

            const services = {
                kismet: await this.getKismetInfo(),
                gps: await this.getGPSInfo(),
                spectrum: {
                    version: '2.0.0',
                    port: this.config.spectrumPort || 8092,
                    openwebrxConnected: await this.checkOpenWebRXConnection()
                }
            };

            return {
                system: {
                    hostname: os.hostname(),
                    platform: os.platform(),
                    arch: os.arch(),
                    uptime: os.uptime(),
                    loadAverage: loadAvg,
                    memory: memInfo,
                    disk: diskInfo
                },
                services,
                network: {
                    interfaces: networkInterfaces
                }
            };

        } catch (error) {
            this.logger.error('Failed to get system info', { error: error.message });
            throw new ServiceError('Failed to retrieve system information', { originalError: error });
        }
    }

    // Helper methods

    async getPidFromFile(scriptName) {
        const pidFile = path.join(this.config.pidDir, `${scriptName}.pid`);
        try {
            const pidStr = await fs.readFile(pidFile, 'utf8');
            return parseInt(pidStr.trim());
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.logger.error('Failed to read PID file', { script: scriptName, error: error.message });
            }
            return null;
        }
    }

    async writePidFile(scriptName, pid) {
        const pidFile = path.join(this.config.pidDir, `${scriptName}.pid`);
        try {
            await fs.writeFile(pidFile, pid.toString());
            this.logger.debug('PID file written', { script: scriptName, pid, file: pidFile });
        } catch (error) {
            this.logger.error('Failed to write PID file', { script: scriptName, error: error.message });
            throw new ServiceError('Failed to write PID file', { originalError: error });
        }
    }

    async removePidFile(scriptName) {
        const pidFile = path.join(this.config.pidDir, `${scriptName}.pid`);
        try {
            await fs.unlink(pidFile);
            this.logger.debug('PID file removed', { script: scriptName, file: pidFile });
        } catch (error) {
            if (error.code !== 'ENOENT') {
                this.logger.error('Failed to remove PID file', { script: scriptName, error: error.message });
            }
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

    async getProcessResourceUsage(pid) {
        try {
            const { stdout } = await execAsync(`ps -p ${pid} -o %cpu,%mem,rss,vsz --no-headers`);
            const [cpu, mem, rss, vsz] = stdout.trim().split(/\s+/).map(parseFloat);
            
            return {
                memory: {
                    rss: rss * 1024, // Convert KB to bytes
                    vms: vsz * 1024,
                    percentage: mem
                },
                cpu
            };
        } catch (error) {
            return {
                memory: { rss: 0, vms: 0, percentage: 0 },
                cpu: 0
            };
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
            const [total, used, free] = stdout.trim().split(' ').map(Number);
            
            return {
                total,
                used,
                free,
                percentage: Math.round((used / total) * 100)
            };
        } catch (error) {
            this.logger.error('Failed to get disk info', { error: error.message });
            return { total: 0, used: 0, free: 0, percentage: 0 };
        }
    }

    async getNetworkInterfaces() {
        const interfaces = [];
        const nets = os.networkInterfaces();
        
        for (const [name, addrs] of Object.entries(nets)) {
            for (const addr of addrs) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    interfaces.push({
                        name,
                        address: addr.address,
                        mac: addr.mac,
                        type: name.startsWith('wlan') ? 'wireless' : 'ethernet',
                        monitoring: await this.isInterfaceInMonitorMode(name)
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

    async getKismetInfo() {
        try {
            // Try to get Kismet version
            const { stdout: version } = await execAsync('kismet --version 2>/dev/null | head -1');
            
            return {
                version: version.trim(),
                configPath: '/etc/kismet/kismet.conf',
                dataPath: '/home/pi/kismet_data',
                interfaces: await this.getKismetInterfaces()
            };
        } catch (error) {
            return {
                version: 'Not installed',
                configPath: null,
                dataPath: null,
                interfaces: []
            };
        }
    }

    async getKismetInterfaces() {
        try {
            const { stdout } = await execAsync('grep "^source=" /etc/kismet/kismet.conf 2>/dev/null');
            const interfaces = stdout.trim().split('\n')
                .map(line => line.replace('source=', '').split(':')[0])
                .filter(Boolean);
            return interfaces;
        } catch (error) {
            return [];
        }
    }

    async getGPSInfo() {
        return {
            device: '/dev/ttyUSB0',
            baudRate: 9600,
            protocol: 'NMEA'
        };
    }

    async checkOpenWebRXConnection() {
        try {
            const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8073 || echo "000"');
            return stdout.trim() === '200';
        } catch (error) {
            return false;
        }
    }

    async getLastRunInfo(scriptName) {
        // This could be enhanced to read from log files or a database
        return {
            lastRunTime: null,
            lastExitCode: null
        };
    }

    startProcessMonitoring() {
        // Periodically check running processes
        setInterval(() => {
            for (const [scriptName, processInfo] of this.runningScripts.entries()) {
                this.isProcessRunning(processInfo.pid).then(running => {
                    if (!running) {
                        this.logger.info('Process no longer running', { script: scriptName, pid: processInfo.pid });
                        this.runningScripts.delete(scriptName);
                        this.removePidFile(scriptName).catch(err => 
                            this.logger.error('Failed to remove PID file', { script: scriptName, error: err.message })
                        );
                    }
                });
            }
        }, this.config.processCheckInterval);
    }

    isHealthy() {
        return true; // Can be enhanced with more health checks
    }
}

module.exports = ScriptManager;
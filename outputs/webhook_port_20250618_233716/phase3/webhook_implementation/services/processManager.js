/**
 * Process Manager Service
 * 
 * Handles all process orchestration, PID management, and service lifecycle
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const treeKill = require('tree-kill');

class ProcessManager extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        
        // PID file paths
        this.pidFiles = {
            main: process.env.SCRIPT_PID_FILE || '/tmp/kismet_script.pid',
            kismet: process.env.PID_FILE || '/tmp/kismet_pids.txt',
            wigletotak: process.env.WIGLETOTAK_PID_FILE || '/home/pi/tmp/wigletotak.specific.pid'
        };
        
        // Script paths
        this.mainScript = process.env.MAIN_SCRIPT || '/home/pi/stinky/gps_kismet_wigle.sh';
        
        // Running processes map
        this.runningProcesses = new Map();
    }
    
    /**
     * Start the main orchestration script
     */
    async startMainScript() {
        this.logger.info('Starting main orchestration script');
        
        return new Promise((resolve, reject) => {
            // Use sudo to run as pi user
            const proc = spawn('sudo', ['-u', 'pi', this.mainScript], {
                detached: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            // Store process reference
            this.runningProcesses.set('main', proc);
            
            // Handle output
            proc.stdout.on('data', (data) => {
                const output = data.toString();
                this.logger.debug('Main script stdout:', output);
                this.emit('output', {
                    script: 'main',
                    type: 'stdout',
                    data: output,
                    timestamp: Date.now()
                });
            });
            
            proc.stderr.on('data', (data) => {
                const output = data.toString();
                this.logger.debug('Main script stderr:', output);
                this.emit('output', {
                    script: 'main',
                    type: 'stderr',
                    data: output,
                    timestamp: Date.now()
                });
            });
            
            proc.on('error', (error) => {
                this.logger.error('Main script error:', error);
                reject(error);
            });
            
            proc.on('close', (code) => {
                this.logger.info(`Main script exited with code ${code}`);
                this.runningProcesses.delete('main');
                this.emit('status_changed', {
                    script: 'main',
                    status: 'stopped',
                    code
                });
            });
            
            // Unref to allow parent to exit
            proc.unref();
            
            // Give it a moment to start
            setTimeout(() => {
                resolve({ success: true, pid: proc.pid });
            }, 1000);
        });
    }
    
    /**
     * Stop all running services
     */
    async stopAll() {
        this.logger.info('Stopping all services');
        
        let message = '';
        
        try {
            // Read main script PID
            const mainPid = await this.readPidFile(this.pidFiles.main);
            if (mainPid) {
                await this.killProcessTree(mainPid);
                message += 'Main script stopped. ';
            } else {
                message += 'Main script PID not found. ';
            }
        } catch (error) {
            this.logger.error('Error stopping main script:', error);
            message += 'Error stopping main script. ';
        }
        
        // Kill processes by name
        const processesToKill = ['kismet', 'cgps', 'WigleToTak', 'gps_kismet_wigle'];
        for (const processName of processesToKill) {
            try {
                await this.killProcessByName(processName);
                message += `${processName} processes killed. `;
            } catch (error) {
                this.logger.debug(`No ${processName} processes found`);
            }
        }
        
        // Remove PID files
        for (const [name, file] of Object.entries(this.pidFiles)) {
            try {
                await fs.unlink(file);
                this.logger.debug(`Removed PID file: ${file}`);
            } catch (error) {
                // File might not exist
                this.logger.debug(`PID file not found: ${file}`);
            }
        }
        
        // Restart gpsd
        try {
            await this.executeCommand('sudo systemctl restart gpsd');
            message += 'GPSD restarted. ';
        } catch (error) {
            this.logger.error('Error restarting GPSD:', error);
            message += 'Error restarting GPSD. ';
        }
        
        // Restore wlan2 to managed mode
        try {
            await this.restoreWlan2();
            message += 'wlan2 restored to managed mode. ';
        } catch (error) {
            this.logger.error('Error restoring wlan2:', error);
            message += 'Error restoring wlan2. ';
        }
        
        return {
            success: true,
            message: message.trim()
        };
    }
    
    /**
     * Get comprehensive status of all services
     */
    async getStatus() {
        const status = {
            main_running: await this.isMainScriptRunning(),
            kismet_running: await this.isKismetRunning(),
            wigle_running: await this.isWigleToTakRunning(),
            has_unhealthy: false
        };
        
        // Check for unhealthy processes
        if (status.main_running && !status.kismet_running) {
            status.has_unhealthy = true;
        }
        
        return status;
    }
    
    /**
     * Clean up unhealthy processes
     */
    async cleanup() {
        this.logger.info('Cleaning up unhealthy processes');
        
        // Kill any orphaned processes
        const processesToClean = ['kismet', 'WigleToTak'];
        for (const processName of processesToClean) {
            try {
                await this.killProcessByName(processName);
            } catch (error) {
                // Process might not exist
            }
        }
        
        // Remove stale PID files
        for (const [name, file] of Object.entries(this.pidFiles)) {
            try {
                const pid = await this.readPidFile(file);
                if (pid && !await this.isProcessRunning(pid)) {
                    await fs.unlink(file);
                    this.logger.debug(`Removed stale PID file: ${file}`);
                }
            } catch (error) {
                // File might not exist
            }
        }
    }
    
    /**
     * Check if main script is running
     */
    async isMainScriptRunning() {
        try {
            const pid = await this.readPidFile(this.pidFiles.main);
            return pid ? await this.isProcessRunning(pid) : false;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Check if Kismet is running
     */
    async isKismetRunning() {
        try {
            const result = await this.executeCommand('pgrep -f "kismet"');
            return result.trim().length > 0;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Check if WigleToTAK is running
     */
    async isWigleToTakRunning() {
        try {
            const pid = await this.readPidFile(this.pidFiles.wigletotak);
            return pid ? await this.isProcessRunning(pid) : false;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Read PID from file
     */
    async readPidFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const pid = parseInt(content.trim());
            return isNaN(pid) ? null : pid;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Check if a process is running
     */
    async isProcessRunning(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Kill a process tree
     */
    async killProcessTree(pid) {
        return new Promise((resolve, reject) => {
            treeKill(pid, 'SIGTERM', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
    
    /**
     * Kill processes by name
     */
    async killProcessByName(name) {
        const cmd = `pkill -f "${name}"`;
        return this.executeCommand(cmd);
    }
    
    /**
     * Execute a shell command
     */
    async executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
    
    /**
     * Restore wlan2 to managed mode
     */
    async restoreWlan2() {
        const commands = [
            'sudo ip link set wlan2 down',
            'sudo iw dev wlan2 set type managed',
            'sudo ip link set wlan2 up'
        ];
        
        for (const cmd of commands) {
            try {
                await this.executeCommand(cmd);
                this.logger.debug(`Executed: ${cmd}`);
            } catch (error) {
                this.logger.error(`Failed to execute: ${cmd}`, error);
                throw error;
            }
        }
    }
}

module.exports = ProcessManager;
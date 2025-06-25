# Webhook Implementation Blueprint for Node.js Migration

## Executive Summary

This blueprint provides the exact implementation plan for restoring webhook.py functionality within the existing Node.js spectrum analyzer service running on port 8092. This document serves as the guide for Agents 4-7 to implement the missing backend processes.

## Architecture Overview

### Integration Strategy
- **Merge Into Existing Service**: Add webhook functionality as new routes in existing server.js
- **Preserve Spectrum Routes**: Keep all /api/* spectrum endpoints intact
- **Add Webhook Routes**: Add /api/webhook/* endpoints for process management
- **Shared Infrastructure**: Leverage existing Express, logging, and Socket.IO setup
- **Single Port**: All services on port 8092

## Directory Structure

```
src/nodejs/kismet-operations/
├── server.js                    # Enhanced with webhook routes
├── routes/                      # NEW directory
│   ├── webhook.js              # Webhook endpoints
│   ├── spectrum.js             # Move existing spectrum routes here
│   └── index.js                # Route aggregator
├── lib/
│   ├── spectrumCore.js         # Existing
│   ├── processManager.js       # NEW - Process lifecycle management
│   ├── gpsClient.js            # NEW - GPSD communication
│   ├── kismetClient.js         # NEW - Kismet API wrapper
│   └── systemControl.js        # NEW - System command wrapper
├── utils/
│   ├── pidManager.js           # NEW - PID file operations
│   ├── commandExecutor.js      # NEW - Safe command execution
│   └── fileMonitor.js          # NEW - CSV file monitoring
└── services/
    ├── webhookService.js       # NEW - Business logic layer
    └── integrationService.js   # NEW - Service orchestration
```

## Exact Endpoint Mapping

### Flask → Node.js Route Translation

| Flask Route | Method | Node.js Route | Handler Function |
|------------|--------|---------------|------------------|
| `/run-script` | POST | `/api/webhook/run-script` | `startOrchestrationScript()` |
| `/stop-script` | POST | `/api/webhook/stop-script` | `stopAllProcesses()` |
| `/info` | GET | `/api/webhook/info` | `getSystemInfo()` |
| `/script-status` | GET | `/api/webhook/script-status` | `getScriptStatus()` |
| `/kismet-data` | GET | `/api/webhook/kismet-data` | `getKismetData()` |

## Detailed Implementation Plans

### 1. Process Manager Module (`lib/processManager.js`)

```javascript
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const treeKill = require('tree-kill');
const psList = require('ps-list');
const pidusage = require('pidusage');

class ProcessManager {
  constructor(logger) {
    this.logger = logger;
    this.processes = new Map();
    this.pidFiles = {
      main: '/tmp/kismet_script.pid',
      kismet: '/home/pi/kismet_ops/kismet.pid',
      wigletotak: '/home/pi/tmp/wigletotak.specific.pid',
      general: '/tmp/kismet_pids.txt',
      orchestration: '/home/pi/tmp/gps_kismet_wigle.pids'
    };
    this.mainScript = '/home/pi/stinky/gps_kismet_wigle.sh';
  }

  async startOrchestrationScript() {
    // Check if already running
    const isRunning = await this.isScriptRunning();
    if (isRunning) {
      throw new Error('Script is already running');
    }

    // Spawn the main orchestration script
    const proc = spawn('sudo', ['-u', 'pi', this.mainScript], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Store process reference
    this.processes.set('main', proc);
    
    // Write PID files
    await this.writePID('main', proc.pid);
    
    // Monitor output
    proc.stdout.on('data', (data) => {
      this.logger.info(`Script output: ${data}`);
    });

    proc.stderr.on('data', (data) => {
      this.logger.error(`Script error: ${data}`);
    });

    return {
      pid: proc.pid,
      status: 'started'
    };
  }

  async stopAllProcesses() {
    const results = {
      processes_killed: 0,
      errors: []
    };

    // Kill main script and all children
    try {
      const mainPid = await this.readPID('main');
      if (mainPid) {
        await treeKill(mainPid, 'SIGTERM');
        results.processes_killed++;
      }
    } catch (error) {
      results.errors.push(`Failed to kill main process: ${error.message}`);
    }

    // Kill specific services
    const services = ['kismet', 'WigleToTak2', 'mavgps.py'];
    for (const service of services) {
      try {
        await this.killByPattern(service);
        results.processes_killed++;
      } catch (error) {
        results.errors.push(`Failed to kill ${service}: ${error.message}`);
      }
    }

    // Reset network interface
    await this.resetNetworkInterface();

    // Restart GPSD
    await this.restartGPSD();

    // Clean up PID files
    await this.cleanupPIDs();

    return results;
  }

  async isScriptRunning() {
    try {
      const mainPid = await this.readPID('main');
      if (!mainPid) return false;
      
      const processes = await psList();
      return processes.some(p => p.pid === mainPid);
    } catch {
      return false;
    }
  }

  async getProcessStats() {
    const stats = {};
    
    for (const [name, pidFile] of Object.entries(this.pidFiles)) {
      try {
        const pid = await this.readPID(name);
        if (pid) {
          const usage = await pidusage(pid);
          stats[name] = {
            pid,
            cpu: usage.cpu,
            memory: usage.memory,
            uptime: usage.elapsed
          };
        }
      } catch (error) {
        stats[name] = { status: 'not running' };
      }
    }
    
    return stats;
  }

  // Helper methods
  async writePID(type, pid) {
    const pidFile = this.pidFiles[type];
    await fs.mkdir(path.dirname(pidFile), { recursive: true });
    await fs.writeFile(pidFile, pid.toString());
  }

  async readPID(type) {
    try {
      const content = await fs.readFile(this.pidFiles[type], 'utf8');
      return parseInt(content.trim());
    } catch {
      return null;
    }
  }

  async killByPattern(pattern) {
    return new Promise((resolve, reject) => {
      exec(`pkill -f "${pattern}"`, (error) => {
        if (error && error.code !== 1) { // Exit code 1 means no processes found
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async resetNetworkInterface() {
    const commands = [
      'sudo ip link set wlan2 down',
      'sudo iw dev wlan2 set type managed',
      'sudo ip link set wlan2 up'
    ];
    
    for (const cmd of commands) {
      await this.executeCommand(cmd);
    }
  }

  async restartGPSD() {
    await this.executeCommand('sudo systemctl restart gpsd');
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Command failed: ${command}`, error);
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async cleanupPIDs() {
    for (const pidFile of Object.values(this.pidFiles)) {
      try {
        await fs.unlink(pidFile);
      } catch {
        // Ignore errors - file might not exist
      }
    }
  }
}

module.exports = ProcessManager;
```

### 2. GPS Client Module (`lib/gpsClient.js`)

```javascript
const gpsd = require('node-gpsd');

class GPSClient {
  constructor(logger, config = {}) {
    this.logger = logger;
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 2947,
      reconnectInterval: config.reconnectInterval || 5000
    };
    this.daemon = null;
    this.listener = null;
    this.lastFix = null;
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.daemon = new gpsd.Daemon({
          port: this.config.port,
          hostname: this.config.host
        });

        this.listener = new gpsd.Listener();

        this.listener.on('TPV', (data) => {
          this.lastFix = {
            lat: data.lat,
            lon: data.lon,
            alt: data.alt,
            mode: data.mode,
            time: data.time,
            speed: data.speed,
            track: data.track,
            status: this.getModeString(data.mode)
          };
        });

        this.listener.on('connected', () => {
          this.connected = true;
          this.logger.info('Connected to GPSD');
          resolve();
        });

        this.listener.on('error', (error) => {
          this.logger.error('GPSD error:', error);
          this.connected = false;
        });

        this.listener.connect();

      } catch (error) {
        reject(error);
      }
    });
  }

  async getCurrentPosition() {
    if (!this.connected) {
      await this.connect();
    }
    
    return this.lastFix || {
      lat: null,
      lon: null,
      alt: null,
      mode: 0,
      time: null,
      speed: null,
      track: null,
      status: 'No Fix'
    };
  }

  getModeString(mode) {
    switch (mode) {
      case 0: return 'No Fix';
      case 1: return 'No Fix';
      case 2: return '2D Fix';
      case 3: return '3D Fix';
      default: return 'Unknown';
    }
  }

  disconnect() {
    if (this.listener) {
      this.listener.disconnect();
    }
    this.connected = false;
  }
}

module.exports = GPSClient;
```

### 3. Kismet Client Module (`lib/kismetClient.js`)

```javascript
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const glob = require('glob');

class KismetClient {
  constructor(logger, config = {}) {
    this.logger = logger;
    this.config = {
      baseUrl: config.baseUrl || 'http://10.42.0.1:2501',
      auth: config.auth || { username: 'admin', password: 'admin' },
      csvPath: config.csvPath || '/home/pi/kismet_ops',
      timeout: config.timeout || 5000
    };
    
    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      auth: this.config.auth,
      timeout: this.config.timeout
    });
  }

  async checkStatus() {
    try {
      const response = await this.axios.get('/system/status.json');
      return {
        running: true,
        uptime: response.data.kismet.uptime,
        devices: response.data.kismet.devices,
        memory: response.data.kismet.memory
      };
    } catch (error) {
      return {
        running: false,
        error: error.message
      };
    }
  }

  async getDevices() {
    try {
      const response = await this.axios.get('/devices/views/all_devices.json');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get Kismet devices:', error);
      return [];
    }
  }

  async getLatestCSVData() {
    try {
      // Find the most recent CSV file
      const files = await new Promise((resolve, reject) => {
        glob(path.join(this.config.csvPath, '*.csv'), (err, files) => {
          if (err) reject(err);
          else resolve(files);
        });
      });

      if (files.length === 0) {
        return { devices: [], networks: [] };
      }

      // Sort by modification time
      const sortedFiles = await Promise.all(
        files.map(async (file) => {
          const stats = await fs.stat(file);
          return { file, mtime: stats.mtime };
        })
      );

      sortedFiles.sort((a, b) => b.mtime - a.mtime);
      const latestFile = sortedFiles[0].file;

      // Parse CSV
      const data = await this.parseCSV(latestFile);
      return data;
    } catch (error) {
      this.logger.error('Failed to read CSV data:', error);
      return { devices: [], networks: [] };
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const devices = [];
      const networks = [];

      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          if (row.Type === 'Wi-Fi Device') {
            devices.push({
              name: row.Name || row.MAC,
              mac: row.MAC,
              manufacturer: row.Manufacturer,
              channel: row.Channel,
              signal: row.Signal,
              firstSeen: row['First Seen'],
              lastSeen: row['Last Seen']
            });
          } else if (row.Type === 'Wi-Fi Network') {
            networks.push({
              ssid: row.SSID,
              bssid: row.BSSID,
              channel: row.Channel,
              encryption: row.Encryption,
              signal: row.Signal
            });
          }
        })
        .on('end', () => {
          resolve({ devices, networks });
        })
        .on('error', reject);
    });
  }

  formatDevicesForUI(devices, networks) {
    const formattedDevices = devices.slice(0, 10).map(device => ({
      name: device.name,
      type: 'Wi-Fi Client',
      channel: device.channel
    }));

    const feedItems = [
      ...devices.slice(0, 5).map(device => ({
        type: 'Device',
        message: `${device.name} (Wi-Fi Client) - Channel ${device.channel}`
      })),
      ...networks.slice(0, 5).map(network => ({
        type: 'Network',
        message: `${network.ssid} - Channel ${network.channel}`
      }))
    ];

    return {
      devices_count: devices.length,
      networks_count: networks.length,
      recent_devices: formattedDevices,
      feed_items: feedItems,
      last_update: new Date().toLocaleTimeString()
    };
  }
}

module.exports = KismetClient;
```

### 4. Webhook Routes (`routes/webhook.js`)

```javascript
const express = require('express');
const router = express.Router();
const os = require('os');

module.exports = (processManager, gpsClient, kismetClient, logger) => {
  // POST /api/webhook/run-script
  router.post('/run-script', async (req, res) => {
    try {
      logger.info('Starting orchestration script');
      const result = await processManager.startOrchestrationScript();
      
      // Wait a bit for services to initialize
      setTimeout(async () => {
        const stats = await processManager.getProcessStats();
        res.json({
          status: 'success',
          message: 'Script started successfully',
          details: {
            main_pid: result.pid,
            services: {
              kismet: stats.kismet ? 'running' : 'stopped',
              gps: stats.orchestration ? 'running' : 'stopped',
              wigletotak: stats.wigletotak ? 'running' : 'stopped'
            }
          }
        });
      }, 2000);
    } catch (error) {
      logger.error('Failed to start script:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // POST /api/webhook/stop-script
  router.post('/stop-script', async (req, res) => {
    try {
      logger.info('Stopping all processes');
      const result = await processManager.stopAllProcesses();
      
      res.json({
        status: 'success',
        message: 'All services stopped',
        details: {
          processes_killed: result.processes_killed,
          interfaces_reset: true,
          gpsd_restarted: true,
          errors: result.errors
        }
      });
    } catch (error) {
      logger.error('Failed to stop processes:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // GET /api/webhook/info
  router.get('/info', async (req, res) => {
    try {
      const [gpsData, scriptRunning, kismetStatus] = await Promise.all([
        gpsClient.getCurrentPosition(),
        processManager.isScriptRunning(),
        kismetClient.checkStatus()
      ]);

      // Get local IP address
      const interfaces = os.networkInterfaces();
      let ip = '127.0.0.1';
      for (const iface of Object.values(interfaces)) {
        for (const addr of iface) {
          if (addr.family === 'IPv4' && !addr.internal) {
            ip = addr.address;
            break;
          }
        }
      }

      res.json({
        gps: gpsData,
        kismet: kismetStatus.running ? 'Running' : 'Stopped',
        wigle: scriptRunning ? 'Running' : 'Stopped',
        ip: ip
      });
    } catch (error) {
      logger.error('Failed to get info:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // GET /api/webhook/script-status
  router.get('/script-status', async (req, res) => {
    try {
      const [scriptRunning, kismetStatus, processStats] = await Promise.all([
        processManager.isScriptRunning(),
        kismetClient.checkStatus(),
        processManager.getProcessStats()
      ]);

      res.json({
        running: scriptRunning,
        message: scriptRunning ? 'Script is running' : 'Script is not running',
        kismet_running: kismetStatus.running,
        kismet_api_responding: kismetStatus.running,
        wigle_running: processStats.wigletotak && processStats.wigletotak.pid ? true : false,
        uptime_seconds: processStats.main ? processStats.main.uptime / 1000 : 0
      });
    } catch (error) {
      logger.error('Failed to get script status:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // GET /api/webhook/kismet-data
  router.get('/kismet-data', async (req, res) => {
    try {
      const csvData = await kismetClient.getLatestCSVData();
      const formattedData = kismetClient.formatDevicesForUI(
        csvData.devices,
        csvData.networks
      );
      
      res.json(formattedData);
    } catch (error) {
      logger.error('Failed to get Kismet data:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  });

  return router;
};
```

### 5. Server.js Integration

```javascript
// Add to imports section
const ProcessManager = require('./lib/processManager');
const GPSClient = require('./lib/gpsClient');
const KismetClient = require('./lib/kismetClient');

// Initialize webhook components (after spectrum initialization)
const processManager = new ProcessManager(logger);
const gpsClient = new GPSClient(logger);
const kismetClient = new KismetClient(logger);

// Connect GPS client on startup
gpsClient.connect().catch(error => {
  logger.warn('Failed to connect to GPSD on startup:', error.message);
});

// Add webhook routes (after existing routes)
const webhookRoutes = require('./routes/webhook')(
  processManager,
  gpsClient,
  kismetClient,
  logger
);
app.use('/api/webhook', webhookRoutes);

// Add to graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  spectrum.disconnect();
  gpsClient.disconnect();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
```

## Required NPM Dependencies

```json
{
  "dependencies": {
    "node-gpsd": "^0.3.0",
    "ps-list": "^8.1.1",
    "tree-kill": "^1.2.2",
    "glob": "^10.3.10"
  }
}
```

Install command:
```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations
npm install node-gpsd ps-list tree-kill glob
```

## Implementation Sequence for Agents 4-7

### Agent 4: Core Infrastructure
1. Create directory structure (routes/, utils/, services/)
2. Implement ProcessManager class
3. Implement PIDManager utility
4. Implement CommandExecutor utility

### Agent 5: External Service Integration
1. Implement GPSClient class
2. Implement KismetClient class
3. Implement SystemControl class
4. Create CSV file monitoring utility

### Agent 6: Route Implementation
1. Create webhook.js routes file
2. Integrate routes into server.js
3. Test each endpoint
4. Ensure backward compatibility

### Agent 7: Testing & Validation
1. Create test suite for webhook endpoints
2. Test process lifecycle management
3. Verify GPS data flow
4. Validate Kismet integration
5. Confirm UI compatibility

## Critical Implementation Notes

1. **Preserve All Existing Routes**: Do not modify any /api/* spectrum routes
2. **Use Existing Infrastructure**: Leverage winston logger, existing middleware
3. **Maintain API Compatibility**: Response formats must match webhook.py exactly
4. **Handle Sudo Commands**: Ensure Node.js can execute sudo commands
5. **PID File Locations**: Use exact same paths as Python version
6. **Error Handling**: Comprehensive try-catch blocks with proper logging
7. **Process Cleanup**: Ensure all child processes are properly terminated
8. **Network Interface**: Reset wlan2 to managed mode on stop

## Validation Checklist

- [ ] All 5 webhook endpoints implemented
- [ ] Process start/stop working correctly
- [ ] GPS data being retrieved
- [ ] Kismet status and data accessible
- [ ] PID files created/cleaned up properly
- [ ] Network interface reset on stop
- [ ] GPSD restarted on stop
- [ ] Existing spectrum routes still functional
- [ ] UI (hi.html) working without modifications
- [ ] Port 8092 serving all endpoints

## Success Criteria

1. Start button in hi.html successfully launches all services
2. Stop button cleanly terminates all processes
3. GPS coordinates display in UI
4. Kismet data appears in UI
5. No errors in browser console
6. No modifications required to frontend HTML
7. Single Node.js process on port 8092 handles everything
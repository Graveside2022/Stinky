# Webhook Service Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the webhook service endpoints in Express.js, maintaining 100% compatibility with the Flask version while leveraging Node.js advantages.

## Implementation Structure

```
lib/webhook/
├── index.js          # Main webhook service class
├── routes.js         # Express route definitions
├── scriptManager.js  # Process management logic
├── kismetClient.js   # Kismet REST API client
├── websocket.js      # WebSocket event handlers
└── validators.js     # Input validation schemas
```

## 1. Main Webhook Service (lib/webhook/index.js)

```javascript
const EventEmitter = require('events');
const ScriptManager = require('./scriptManager');
const KismetClient = require('./kismetClient');
const setupRoutes = require('./routes');
const setupWebSocket = require('./websocket');

class WebhookService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      pidDir: '/tmp/kismet-operations',
      kismetUrl: 'http://localhost:2501',
      kismetApiKey: null,
      scriptPaths: {
        kismet: '/home/pi/scripts/start_kismet.sh',
        gps: '/home/pi/scripts/start_gps.sh'
      },
      ...config
    };
    
    this.scriptManager = new ScriptManager(this.config);
    this.kismetClient = new KismetClient({
      baseUrl: this.config.kismetUrl,
      apiKey: this.config.kismetApiKey
    });
    
    this.cache = new Map();
    this.cacheTimers = new Map();
  }
  
  setupRoutes(app) {
    return setupRoutes(app, this);
  }
  
  setupWebSocket(io) {
    return setupWebSocket(io, this);
  }
  
  // Cache management
  getCached(key, ttl = 5000) {
    const cached = this.cache.get(key);
    if (cached && cached.timestamp + ttl > Date.now()) {
      return cached.data;
    }
    return null;
  }
  
  setCached(key, data, ttl = 5000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Auto-cleanup
    if (this.cacheTimers.has(key)) {
      clearTimeout(this.cacheTimers.get(key));
    }
    
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.cacheTimers.delete(key);
    }, ttl);
    
    this.cacheTimers.set(key, timer);
  }
  
  cleanup() {
    // Clear all timers
    for (const timer of this.cacheTimers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.cacheTimers.clear();
  }
}

module.exports = WebhookService;
```

## 2. Express Routes (lib/webhook/routes.js)

```javascript
const express = require('express');
const asyncHandler = require('express-async-handler');
const { validateRunScript, validateStopScript } = require('./validators');

function setupRoutes(app, webhookService) {
  const router = express.Router();
  
  // POST /api/webhook/run-script
  router.post('/run-script', validateRunScript, asyncHandler(async (req, res) => {
    const { script, options = {} } = req.body;
    
    try {
      const result = await webhookService.scriptManager.startScript(script, options);
      
      res.json({
        success: true,
        message: 'Script started successfully',
        script,
        pid: result.pid,
        timestamp: new Date().toISOString()
      });
      
      // Emit WebSocket event
      webhookService.emit('scriptStarted', { script, pid: result.pid });
      
    } catch (error) {
      if (error.code === 'ALREADY_RUNNING') {
        res.status(409).json({
          success: false,
          error: 'ALREADY_RUNNING',
          message: 'Script is already running',
          details: `PID: ${error.pid}`
        });
      } else if (error.code === 'INVALID_SCRIPT') {
        res.status(400).json({
          success: false,
          error: 'INVALID_SCRIPT',
          message: 'Invalid script type specified',
          details: 'Valid options are: kismet, gps, both'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'EXECUTION_FAILED',
          message: 'Failed to start script',
          details: error.message
        });
      }
    }
  }));
  
  // POST /api/webhook/stop-script
  router.post('/stop-script', validateStopScript, asyncHandler(async (req, res) => {
    const { script, force = false } = req.body;
    
    try {
      const result = await webhookService.scriptManager.stopScript(script, force);
      
      res.json({
        success: true,
        message: 'Script stopped successfully',
        script,
        pid: result.pid,
        timestamp: new Date().toISOString()
      });
      
      // Emit WebSocket event
      webhookService.emit('scriptStopped', { script, pid: result.pid });
      
    } catch (error) {
      if (error.code === 'NOT_RUNNING') {
        res.status(404).json({
          success: false,
          error: 'NOT_RUNNING',
          message: 'Script is not running',
          details: 'No PID file found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'STOP_FAILED',
          message: 'Failed to stop script',
          details: error.message
        });
      }
    }
  }));
  
  // GET /api/webhook/script-status
  router.get('/script-status', asyncHandler(async (req, res) => {
    const { script } = req.query;
    
    // Check cache first
    const cacheKey = `status:${script || 'all'}`;
    const cached = webhookService.getCached(cacheKey, 5000);
    if (cached) {
      return res.json(cached);
    }
    
    const status = await webhookService.scriptManager.getStatus(script);
    
    const response = {
      success: true,
      status,
      timestamp: new Date().toISOString()
    };
    
    // Cache the response
    webhookService.setCached(cacheKey, response, 5000);
    
    res.json(response);
  }));
  
  // GET /api/webhook/info
  router.get('/info', asyncHandler(async (req, res) => {
    // Check cache
    const cached = webhookService.getCached('systemInfo', 60000);
    if (cached) {
      return res.json(cached);
    }
    
    const os = require('os');
    const disk = require('diskusage');
    
    // Get system info
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      }
    };
    
    // Get disk info
    const diskInfo = await disk.check('/');
    systemInfo.disk = {
      total: diskInfo.total,
      free: diskInfo.free,
      used: diskInfo.total - diskInfo.free,
      percentage: ((diskInfo.total - diskInfo.free) / diskInfo.total * 100).toFixed(2)
    };
    
    // Get service info
    const services = {
      kismet: await webhookService.scriptManager.getKismetInfo(),
      gps: await webhookService.scriptManager.getGPSInfo(),
      spectrum: {
        version: '2.0.0',
        port: 8092,
        openwebrxConnected: true // Get from spectrum service
      }
    };
    
    // Get network interfaces
    const networkInterfaces = [];
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          networkInterfaces.push({
            name,
            address: net.address,
            mac: net.mac,
            type: name.startsWith('wlan') ? 'wireless' : 'ethernet',
            monitoring: await webhookService.scriptManager.isMonitorMode(name)
          });
        }
      }
    }
    
    const response = {
      success: true,
      system: systemInfo,
      services,
      network: { interfaces: networkInterfaces },
      timestamp: new Date().toISOString()
    };
    
    // Cache for 60 seconds
    webhookService.setCached('systemInfo', response, 60000);
    
    res.json(response);
  }));
  
  // GET /api/webhook/kismet-data
  router.get('/kismet-data', asyncHandler(async (req, res) => {
    const { 
      type = 'all', 
      limit = 100, 
      since = null, 
      format = 'json' 
    } = req.query;
    
    // Validate parameters
    const validTypes = ['devices', 'networks', 'alerts', 'all'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TYPE',
        message: 'Invalid data type specified',
        details: `Valid types: ${validTypes.join(', ')}`
      });
    }
    
    const maxLimit = Math.min(parseInt(limit) || 100, 1000);
    
    try {
      // Check if Kismet is running
      const kismetStatus = await webhookService.scriptManager.getStatus('kismet');
      if (!kismetStatus.kismet || !kismetStatus.kismet.running) {
        return res.status(503).json({
          success: false,
          error: 'KISMET_UNAVAILABLE',
          message: 'Kismet service is not running or not responding',
          details: 'Start Kismet using /api/webhook/run-script'
        });
      }
      
      // Check cache for recent requests
      const cacheKey = `kismet:${type}:${maxLimit}:${since || 'all'}`;
      const cached = webhookService.getCached(cacheKey, 10000);
      if (cached && format === 'json') {
        return res.json(cached);
      }
      
      // Fetch data from Kismet
      const data = {};
      
      if (type === 'all' || type === 'devices') {
        data.devices = await webhookService.kismetClient.getDevices({
          limit: maxLimit,
          since
        });
      }
      
      if (type === 'all' || type === 'networks') {
        data.networks = await webhookService.kismetClient.getNetworks({
          limit: maxLimit,
          since
        });
      }
      
      if (type === 'all' || type === 'alerts') {
        data.alerts = await webhookService.kismetClient.getAlerts(since);
      }
      
      // Calculate summary
      const summary = {
        totalDevices: data.devices ? data.devices.length : 0,
        totalNetworks: data.networks ? data.networks.length : 0,
        activeAlerts: data.alerts ? data.alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length : 0,
        dataRange: {
          start: since || new Date(Date.now() - 3600000).toISOString(),
          end: new Date().toISOString()
        }
      };
      
      const response = {
        success: true,
        data: { ...data, summary },
        timestamp: new Date().toISOString()
      };
      
      // Cache JSON responses
      if (format === 'json') {
        webhookService.setCached(cacheKey, response, 10000);
        res.json(response);
      } else if (format === 'csv') {
        // Convert to CSV
        const csv = await webhookService.kismetClient.convertToCSV(data, type);
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', `attachment; filename="kismet-${type}-${Date.now()}.csv"`);
        res.send(csv);
      }
      
    } catch (error) {
      console.error('Kismet data error:', error);
      res.status(500).json({
        success: false,
        error: 'DATA_FETCH_FAILED',
        message: 'Failed to retrieve Kismet data',
        details: error.message
      });
    }
  }));
  
  // Mount router
  app.use('/api/webhook', router);
  
  return router;
}

module.exports = setupRoutes;
```

## 3. Script Manager (lib/webhook/scriptManager.js)

```javascript
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const pidusage = require('pidusage');

class ScriptManager {
  constructor(config) {
    this.config = config;
    this.scripts = new Map();
    this.pidDir = config.pidDir || '/tmp/kismet-operations';
    this.scriptPaths = config.scriptPaths || {};
  }
  
  async init() {
    // Ensure PID directory exists
    try {
      await fs.mkdir(this.pidDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create PID directory:', error);
    }
  }
  
  async startScript(scriptName, options = {}) {
    // Validate script name
    const validScripts = ['kismet', 'gps', 'both'];
    if (!validScripts.includes(scriptName)) {
      const error = new Error('Invalid script type');
      error.code = 'INVALID_SCRIPT';
      throw error;
    }
    
    // Handle 'both' option
    if (scriptName === 'both') {
      const results = {};
      results.gps = await this.startScript('gps', options);
      results.kismet = await this.startScript('kismet', options);
      return results;
    }
    
    // Check if already running
    const pidFile = path.join(this.pidDir, `${scriptName}.pid`);
    const existingPid = await this.readPidFile(pidFile);
    
    if (existingPid && await this.isProcessRunning(existingPid)) {
      const error = new Error('Script already running');
      error.code = 'ALREADY_RUNNING';
      error.pid = existingPid;
      throw error;
    }
    
    // Get script path
    const scriptPath = this.scriptPaths[scriptName];
    if (!scriptPath) {
      throw new Error(`Script path not configured for ${scriptName}`);
    }
    
    // Prepare arguments
    const args = [];
    if (scriptName === 'kismet' && options.interface) {
      args.push('--interface', options.interface);
    }
    if (options.config) {
      args.push('--config', options.config);
    }
    
    // Spawn the process
    const child = spawn(scriptPath, args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Write PID file
    await fs.writeFile(pidFile, child.pid.toString());
    
    // Store process reference
    this.scripts.set(scriptName, {
      process: child,
      pid: child.pid,
      startTime: new Date(),
      options
    });
    
    // Log output
    child.stdout.on('data', (data) => {
      console.log(`[${scriptName}] ${data.toString().trim()}`);
    });
    
    child.stderr.on('data', (data) => {
      console.error(`[${scriptName}] ERROR: ${data.toString().trim()}`);
    });
    
    // Handle process exit
    child.on('exit', (code, signal) => {
      console.log(`[${scriptName}] Process exited with code ${code}, signal ${signal}`);
      this.scripts.delete(scriptName);
      this.removePidFile(pidFile).catch(console.error);
    });
    
    // Unref to allow parent to exit
    child.unref();
    
    return {
      pid: child.pid,
      startTime: new Date().toISOString()
    };
  }
  
  async stopScript(scriptName, force = false) {
    // Validate script name
    const validScripts = ['kismet', 'gps', 'both'];
    if (!validScripts.includes(scriptName)) {
      const error = new Error('Invalid script type');
      error.code = 'INVALID_SCRIPT';
      throw error;
    }
    
    // Handle 'both' option
    if (scriptName === 'both') {
      const results = {};
      results.kismet = await this.stopScript('kismet', force);
      results.gps = await this.stopScript('gps', force);
      return results;
    }
    
    // Check PID file
    const pidFile = path.join(this.pidDir, `${scriptName}.pid`);
    const pid = await this.readPidFile(pidFile);
    
    if (!pid) {
      const error = new Error('Script not running');
      error.code = 'NOT_RUNNING';
      throw error;
    }
    
    // Check if process is actually running
    if (!await this.isProcessRunning(pid)) {
      // Clean up stale PID file
      await this.removePidFile(pidFile);
      const error = new Error('Script not running');
      error.code = 'NOT_RUNNING';
      throw error;
    }
    
    // Stop the process
    try {
      if (force) {
        process.kill(pid, 'SIGKILL');
      } else {
        process.kill(pid, 'SIGTERM');
        
        // Wait for graceful shutdown (max 10 seconds)
        const maxWait = 10000;
        const checkInterval = 100;
        let waited = 0;
        
        while (waited < maxWait && await this.isProcessRunning(pid)) {
          await this.delay(checkInterval);
          waited += checkInterval;
        }
        
        // Force kill if still running
        if (await this.isProcessRunning(pid)) {
          process.kill(pid, 'SIGKILL');
        }
      }
      
      // Clean up
      await this.removePidFile(pidFile);
      this.scripts.delete(scriptName);
      
      return {
        pid,
        stopped: true
      };
      
    } catch (error) {
      if (error.code === 'ESRCH') {
        // Process not found, clean up PID file
        await this.removePidFile(pidFile);
        const notRunning = new Error('Script not running');
        notRunning.code = 'NOT_RUNNING';
        throw notRunning;
      }
      throw error;
    }
  }
  
  async getStatus(scriptName = null) {
    const status = {};
    const scriptsToCheck = scriptName ? [scriptName] : ['kismet', 'gps'];
    
    for (const script of scriptsToCheck) {
      const pidFile = path.join(this.pidDir, `${script}.pid`);
      const pid = await this.readPidFile(pidFile);
      
      if (pid && await this.isProcessRunning(pid)) {
        // Get process stats
        let stats = {};
        try {
          stats = await pidusage(pid);
        } catch (error) {
          console.error(`Failed to get stats for ${script}:`, error);
        }
        
        const scriptInfo = this.scripts.get(script);
        
        status[script] = {
          running: true,
          pid,
          uptime: scriptInfo ? Math.floor((Date.now() - scriptInfo.startTime) / 1000) : null,
          startTime: scriptInfo ? scriptInfo.startTime.toISOString() : null,
          memory: {
            rss: stats.memory || 0,
            vms: stats.memory || 0  // pidusage doesn't separate these
          },
          cpu: stats.cpu || 0
        };
      } else {
        // Not running, check for last run info
        const lastRunFile = path.join(this.pidDir, `${script}.last`);
        let lastRunInfo = null;
        
        try {
          const data = await fs.readFile(lastRunFile, 'utf8');
          lastRunInfo = JSON.parse(data);
        } catch (error) {
          // No last run info
        }
        
        status[script] = {
          running: false,
          pid: null,
          lastRunTime: lastRunInfo ? lastRunInfo.timestamp : null,
          lastExitCode: lastRunInfo ? lastRunInfo.exitCode : null
        };
      }
    }
    
    return scriptName ? status : status;
  }
  
  async getKismetInfo() {
    try {
      // Read Kismet config
      const configPath = '/etc/kismet/kismet.conf';
      const config = await fs.readFile(configPath, 'utf8');
      
      // Extract version (simplified)
      const versionMatch = config.match(/version=([^\n]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      
      // Get configured interfaces
      const interfaces = [];
      const interfaceMatches = config.matchAll(/source=([^\n]+)/g);
      for (const match of interfaceMatches) {
        const iface = match[1].split(':')[0];
        if (iface) interfaces.push(iface);
      }
      
      return {
        version,
        configPath,
        dataPath: '/home/pi/kismet_data',
        interfaces
      };
    } catch (error) {
      console.error('Failed to get Kismet info:', error);
      return {
        version: 'unknown',
        configPath: '/etc/kismet/kismet.conf',
        dataPath: '/home/pi/kismet_data',
        interfaces: []
      };
    }
  }
  
  async getGPSInfo() {
    return {
      device: '/dev/ttyUSB0',
      baudRate: 9600,
      protocol: 'NMEA'
    };
  }
  
  async isMonitorMode(interface) {
    try {
      const { exec } = require('child_process').promises;
      const { stdout } = await exec(`iw dev ${interface} info`);
      return stdout.includes('type monitor');
    } catch (error) {
      return false;
    }
  }
  
  // Helper methods
  async readPidFile(pidFile) {
    try {
      const data = await fs.readFile(pidFile, 'utf8');
      return parseInt(data.trim());
    } catch (error) {
      return null;
    }
  }
  
  async removePidFile(pidFile) {
    try {
      await fs.unlink(pidFile);
    } catch (error) {
      // Ignore if doesn't exist
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
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ScriptManager;
```

## 4. Kismet Client (lib/webhook/kismetClient.js)

```javascript
const axios = require('axios');
const { Parser } = require('json2csv');

class KismetClient {
  constructor(config) {
    this.baseUrl = config.baseUrl || 'http://localhost:2501';
    this.apiKey = config.apiKey;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Add auth if configured
    if (this.apiKey) {
      this.client.defaults.headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
  }
  
  async getDevices({ limit = 100, since = null }) {
    try {
      const params = {
        json: JSON.stringify({
          fields: [
            'kismet.device.base.macaddr',
            'kismet.device.base.first_time',
            'kismet.device.base.last_time',
            'kismet.device.base.manuf',
            'kismet.device.base.type',
            'kismet.device.base.packets.total',
            'kismet.device.base.bytes.total',
            'kismet.device.base.signal',
            'kismet.device.base.location'
          ]
        })
      };
      
      if (since) {
        params.timestamp = new Date(since).getTime() / 1000;
      }
      
      const response = await this.client.get('/devices/views/all_devices.json', { params });
      
      // Transform to our format
      return response.data.slice(0, limit).map(device => ({
        mac: device['kismet.device.base.macaddr'],
        firstSeen: new Date(device['kismet.device.base.first_time'] * 1000).toISOString(),
        lastSeen: new Date(device['kismet.device.base.last_time'] * 1000).toISOString(),
        manufacturer: device['kismet.device.base.manuf'] || 'Unknown',
        type: device['kismet.device.base.type'] || 'Unknown',
        packets: device['kismet.device.base.packets.total'] || 0,
        dataBytes: device['kismet.device.base.bytes.total'] || 0,
        signal: {
          last: device['kismet.device.base.signal']?.['kismet.common.signal.last_signal'] || 0,
          min: device['kismet.device.base.signal']?.['kismet.common.signal.min_signal'] || 0,
          max: device['kismet.device.base.signal']?.['kismet.common.signal.max_signal'] || 0
        },
        location: device['kismet.device.base.location'] ? {
          lat: device['kismet.device.base.location']['kismet.common.location.lat'],
          lon: device['kismet.device.base.location']['kismet.common.location.lon'],
          accuracy: device['kismet.device.base.location']['kismet.common.location.accuracy']
        } : null
      }));
      
    } catch (error) {
      console.error('Kismet devices error:', error);
      throw new Error('Failed to fetch devices from Kismet');
    }
  }
  
  async getNetworks({ limit = 100, since = null }) {
    try {
      const params = {
        json: JSON.stringify({
          fields: [
            'kismet.device.base.macaddr',
            'kismet.device.base.name',
            'kismet.device.base.channel',
            'kismet.device.base.frequency',
            'kismet.device.base.crypt',
            'kismet.device.base.first_time',
            'kismet.device.base.last_time',
            'kismet.device.base.num_clients',
            'kismet.device.base.packets.total',
            'kismet.device.base.signal'
          ]
        })
      };
      
      if (since) {
        params.timestamp = new Date(since).getTime() / 1000;
      }
      
      // Filter for APs only
      const response = await this.client.get('/devices/views/phydot11_accesspoints.json', { params });
      
      return response.data.slice(0, limit).map(network => ({
        ssid: network['kismet.device.base.name'] || '<Hidden>',
        bssid: network['kismet.device.base.macaddr'],
        channel: network['kismet.device.base.channel'] || 0,
        frequency: network['kismet.device.base.frequency'] || 0,
        encryption: this.parseEncryption(network['kismet.device.base.crypt']),
        firstSeen: new Date(network['kismet.device.base.first_time'] * 1000).toISOString(),
        lastSeen: new Date(network['kismet.device.base.last_time'] * 1000).toISOString(),
        clients: network['kismet.device.base.num_clients'] || 0,
        packets: network['kismet.device.base.packets.total'] || 0,
        signal: {
          last: network['kismet.device.base.signal']?.['kismet.common.signal.last_signal'] || 0,
          min: network['kismet.device.base.signal']?.['kismet.common.signal.min_signal'] || 0,
          max: network['kismet.device.base.signal']?.['kismet.common.signal.max_signal'] || 0
        }
      }));
      
    } catch (error) {
      console.error('Kismet networks error:', error);
      throw new Error('Failed to fetch networks from Kismet');
    }
  }
  
  async getAlerts(since = null) {
    try {
      const params = {};
      if (since) {
        params.timestamp = new Date(since).getTime() / 1000;
      }
      
      const response = await this.client.get('/alerts/alerts.json', { params });
      
      return response.data.map(alert => ({
        id: alert['kismet.alert.id'],
        type: alert['kismet.alert.class'],
        severity: this.mapSeverity(alert['kismet.alert.severity']),
        timestamp: new Date(alert['kismet.alert.timestamp'] * 1000).toISOString(),
        message: alert['kismet.alert.text'],
        details: {
          source: alert['kismet.alert.source_mac'],
          dest: alert['kismet.alert.dest_mac'],
          channel: alert['kismet.alert.channel']
        }
      }));
      
    } catch (error) {
      console.error('Kismet alerts error:', error);
      throw new Error('Failed to fetch alerts from Kismet');
    }
  }
  
  parseEncryption(crypt) {
    if (!crypt) return 'Open';
    
    const cryptSet = new Set(crypt.split(','));
    
    if (cryptSet.has('WPA3')) return 'WPA3';
    if (cryptSet.has('WPA2')) return 'WPA2';
    if (cryptSet.has('WPA')) return 'WPA';
    if (cryptSet.has('WEP')) return 'WEP';
    
    return 'Unknown';
  }
  
  mapSeverity(kismetSeverity) {
    const severityMap = {
      0: 'low',
      5: 'medium',
      10: 'high',
      15: 'critical'
    };
    
    return severityMap[kismetSeverity] || 'medium';
  }
  
  async convertToCSV(data, type) {
    try {
      let records = [];
      
      if (type === 'devices' || type === 'all') {
        records = records.concat(data.devices || []);
      }
      
      if (type === 'networks' || type === 'all') {
        records = records.concat(data.networks || []);
      }
      
      if (type === 'alerts' || type === 'all') {
        records = records.concat(data.alerts || []);
      }
      
      if (records.length === 0) {
        return '';
      }
      
      const parser = new Parser();
      return parser.parse(records);
      
    } catch (error) {
      console.error('CSV conversion error:', error);
      throw new Error('Failed to convert data to CSV');
    }
  }
  
  async streamData(callback) {
    // Implement EventSource or WebSocket connection to Kismet
    // for real-time streaming
    console.log('Streaming not yet implemented');
  }
}

module.exports = KismetClient;
```

## 5. Input Validators (lib/webhook/validators.js)

```javascript
const Joi = require('joi');

const runScriptSchema = Joi.object({
  script: Joi.string()
    .valid('kismet', 'gps', 'both')
    .required()
    .messages({
      'any.only': 'Script must be one of: kismet, gps, both',
      'any.required': 'Script parameter is required'
    }),
  options: Joi.object({
    interface: Joi.string()
      .pattern(/^[a-zA-Z0-9]+$/)
      .default('wlan0')
      .messages({
        'string.pattern.base': 'Interface name must be alphanumeric'
      }),
    config: Joi.string()
      .max(255)
      .messages({
        'string.max': 'Config path too long'
      })
  }).optional()
});

const stopScriptSchema = Joi.object({
  script: Joi.string()
    .valid('kismet', 'gps', 'both')
    .required()
    .messages({
      'any.only': 'Script must be one of: kismet, gps, both',
      'any.required': 'Script parameter is required'
    }),
  force: Joi.boolean()
    .default(false)
});

function validateRunScript(req, res, next) {
  const { error, value } = runScriptSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.details[0].message,
      details: error.details
    });
  }
  
  req.body = value;
  next();
}

function validateStopScript(req, res, next) {
  const { error, value } = stopScriptSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.details[0].message,
      details: error.details
    });
  }
  
  req.body = value;
  next();
}

module.exports = {
  validateRunScript,
  validateStopScript
};
```

## 6. WebSocket Handler (lib/webhook/websocket.js)

```javascript
function setupWebSocket(io, webhookService) {
  const webhookNamespace = io.of('/webhook');
  
  webhookNamespace.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);
    
    // Send initial status
    webhookService.scriptManager.getStatus()
      .then(status => {
        socket.emit('statusUpdate', {
          event: 'statusUpdate',
          data: status
        });
      })
      .catch(console.error);
    
    // Handle subscriptions
    socket.on('subscribe', (data) => {
      const { channels = [] } = data.data || {};
      
      channels.forEach(channel => {
        socket.join(channel);
        console.log(`Client ${socket.id} subscribed to ${channel}`);
      });
    });
    
    // Handle status requests
    socket.on('requestStatus', async (data) => {
      const { script } = data.data || {};
      
      try {
        const status = await webhookService.scriptManager.getStatus(script);
        socket.emit('statusUpdate', {
          event: 'statusUpdate',
          data: {
            script,
            status: script ? status[script] : status
          }
        });
      } catch (error) {
        socket.emit('error', {
          event: 'error',
          data: {
            message: 'Failed to get status',
            error: error.message
          }
        });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });
  
  // Listen for webhook service events
  webhookService.on('scriptStarted', (data) => {
    webhookNamespace.to('status').emit('statusUpdate', {
      event: 'statusUpdate',
      data: {
        script: data.script,
        status: 'running',
        pid: data.pid
      }
    });
  });
  
  webhookService.on('scriptStopped', (data) => {
    webhookNamespace.to('status').emit('statusUpdate', {
      event: 'statusUpdate',
      data: {
        script: data.script,
        status: 'stopped',
        pid: null
      }
    });
  });
  
  // Set up Kismet data streaming
  let kismetInterval = null;
  
  function startKismetStreaming() {
    if (kismetInterval) return;
    
    kismetInterval = setInterval(async () => {
      try {
        // Check if anyone is listening
        const sockets = await webhookNamespace.in('devices').fetchSockets();
        if (sockets.length === 0) {
          stopKismetStreaming();
          return;
        }
        
        // Get recent devices
        const devices = await webhookService.kismetClient.getDevices({
          limit: 10,
          since: new Date(Date.now() - 10000).toISOString()
        });
        
        devices.forEach(device => {
          webhookNamespace.to('devices').emit('newDevice', {
            event: 'newDevice',
            data: device
          });
        });
        
        // Get recent alerts
        const alerts = await webhookService.kismetClient.getAlerts(
          new Date(Date.now() - 10000).toISOString()
        );
        
        alerts.forEach(alert => {
          webhookNamespace.to('alerts').emit('alert', {
            event: 'alert',
            data: alert
          });
        });
        
      } catch (error) {
        console.error('Kismet streaming error:', error);
      }
    }, 5000); // Every 5 seconds
  }
  
  function stopKismetStreaming() {
    if (kismetInterval) {
      clearInterval(kismetInterval);
      kismetInterval = null;
    }
  }
  
  // Start streaming when clients subscribe
  webhookNamespace.on('connection', (socket) => {
    socket.on('subscribe', (data) => {
      const { channels = [] } = data.data || {};
      if (channels.includes('devices') || channels.includes('alerts')) {
        startKismetStreaming();
      }
    });
  });
  
  return webhookNamespace;
}

module.exports = setupWebSocket;
```

## 7. Integration with Main Server

Update the main server.js to include the webhook service:

```javascript
// In server.js
const WebhookService = require('./lib/webhook');

// Create webhook service instance
const webhookService = new WebhookService({
  pidDir: '/tmp/kismet-operations',
  kismetUrl: config.kismet?.url || 'http://localhost:2501',
  kismetApiKey: config.kismet?.apiKey,
  scriptPaths: {
    kismet: config.scripts?.kismet || '/home/pi/scripts/start_kismet.sh',
    gps: config.scripts?.gps || '/home/pi/scripts/start_gps.sh'
  }
});

// Initialize webhook service
await webhookService.init();

// Setup routes
webhookService.setupRoutes(app);

// Setup WebSocket
webhookService.setupWebSocket(io);

// Cleanup on shutdown
process.on('SIGTERM', () => {
  webhookService.cleanup();
});
```

## 8. Frontend Integration

Update the frontend to use the new webhook endpoints:

```javascript
// Frontend API client
class WebhookAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }
  
  async runScript(script, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/webhook/run-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ script, options })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start script');
    }
    
    return response.json();
  }
  
  async stopScript(script, force = false) {
    const response = await fetch(`${this.baseUrl}/api/webhook/stop-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ script, force })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to stop script');
    }
    
    return response.json();
  }
  
  async getStatus(script = null) {
    const params = script ? `?script=${script}` : '';
    const response = await fetch(`${this.baseUrl}/api/webhook/script-status${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to get status');
    }
    
    return response.json();
  }
  
  async getSystemInfo() {
    const response = await fetch(`${this.baseUrl}/api/webhook/info`);
    
    if (!response.ok) {
      throw new Error('Failed to get system info');
    }
    
    return response.json();
  }
  
  async getKismetData(type = 'all', options = {}) {
    const params = new URLSearchParams({
      type,
      ...options
    });
    
    const response = await fetch(`${this.baseUrl}/api/webhook/kismet-data?${params}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get Kismet data');
    }
    
    return response.json();
  }
  
  connectWebSocket() {
    const socket = io(`${this.baseUrl}/webhook`);
    
    socket.on('connect', () => {
      console.log('WebSocket connected');
      
      // Subscribe to updates
      socket.emit('subscribe', {
        event: 'subscribe',
        data: {
          channels: ['status', 'devices', 'alerts']
        }
      });
    });
    
    return socket;
  }
}

// Usage example
const api = new WebhookAPI();
const socket = api.connectWebSocket();

// Listen for updates
socket.on('statusUpdate', (data) => {
  console.log('Status update:', data);
  updateUI(data.data);
});

socket.on('newDevice', (data) => {
  console.log('New device:', data);
  addDeviceToList(data.data);
});

socket.on('alert', (data) => {
  console.log('Alert:', data);
  showAlert(data.data);
});
```

## Testing the Implementation

### Unit Tests

Create tests/webhook.test.js:

```javascript
const request = require('supertest');
const WebhookService = require('../lib/webhook');

describe('Webhook API', () => {
  let app, webhookService;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    webhookService = new WebhookService({
      pidDir: '/tmp/test-kismet-ops',
      scriptPaths: {
        kismet: '/usr/bin/true',  // Mock script
        gps: '/usr/bin/true'
      }
    });
    
    webhookService.setupRoutes(app);
  });
  
  afterEach(() => {
    webhookService.cleanup();
  });
  
  describe('POST /api/webhook/run-script', () => {
    it('should start a valid script', async () => {
      const response = await request(app)
        .post('/api/webhook/run-script')
        .send({ script: 'kismet' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pid');
    });
    
    it('should reject invalid script', async () => {
      const response = await request(app)
        .post('/api/webhook/run-script')
        .send({ script: 'invalid' })
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'INVALID_SCRIPT');
    });
  });
  
  // Add more tests...
});
```

## Migration Checklist

- [x] Create webhook service structure
- [x] Implement script management with process control
- [x] Add Kismet API client
- [x] Implement all REST endpoints
- [x] Add WebSocket support for real-time updates
- [x] Create input validation
- [x] Add comprehensive error handling
- [x] Provide frontend integration examples
- [ ] Write comprehensive unit tests
- [ ] Perform integration testing
- [ ] Update frontend to use new endpoints
- [ ] Deploy and monitor

This implementation maintains 100% API compatibility with the Flask version while providing improved performance and real-time capabilities through Node.js.
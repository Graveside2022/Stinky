# Webhook Service Data Flow Mapping

## Overview

This document maps the complete data flow between the webhook service and other system components, identifying integration points, data transformations, and communication protocols.

## 1. GPS Data Flow

### Source to Service Flow
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ MAVLink Device  │────▶│   mavgps.py  │────▶│    GPSD     │────▶│   Webhook    │
│  (Serial/USB)   │     │ (Port 14550) │     │ (Port 2947) │     │   Service    │
└─────────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                              │                      │                     │
                              ▼                      ▼                     ▼
                        MAVLink Protocol       JSON Protocol         HTTP Response
```

### Data Transformation Pipeline
1. **MAVLink Input** (Binary Protocol)
   ```python
   # mavgps.py receives
   {
     'type': 'GLOBAL_POSITION_INT',
     'lat': 401234567,  # degrees * 1e7
     'lon': -741234567, # degrees * 1e7
     'alt': 10500       # mm above MSL
   }
   ```

2. **GPSD Output** (JSON)
   ```json
   {
     "class": "TPV",
     "mode": 3,
     "lat": 40.1234567,
     "lon": -74.1234567,
     "alt": 10.5,
     "time": "2025-06-16T10:30:00.000Z",
     "speed": 0.5,
     "track": 180.0
   }
   ```

3. **Webhook Response** (HTTP JSON)
   ```json
   {
     "gps": {
       "lat": 40.1234567,
       "lon": -74.1234567,
       "alt": 10.5,
       "mode": 3,
       "time": "2025-06-16T10:30:00.000Z",
       "speed": 0.5,
       "track": 180.0,
       "status": "3D Fix"
     }
   }
   ```

### Node.js Implementation
```javascript
class GPSDataFlow {
  constructor() {
    this.gpsdClient = new GPSDClient();
    this.cache = new Map();
    this.cacheTimeout = 1000; // 1 second
  }

  async getGPSData() {
    // Check cache first
    const cached = this.cache.get('gps');
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Fetch from GPSD
    const tpvData = await this.gpsdClient.getTPV();
    
    // Transform data
    const gpsData = {
      lat: tpvData.lat || null,
      lon: tpvData.lon || null,
      alt: tpvData.alt || null,
      mode: tpvData.mode || 0,
      time: tpvData.time || null,
      speed: tpvData.speed || null,
      track: tpvData.track || null,
      status: this.getFixStatus(tpvData.mode)
    };

    // Update cache
    this.cache.set('gps', { data: gpsData, timestamp: Date.now() });
    
    return gpsData;
  }

  getFixStatus(mode) {
    switch(mode) {
      case 3: return '3D Fix';
      case 2: return '2D Fix';
      default: return 'No Fix';
    }
  }
}
```

## 2. Kismet WiFi Scanning Data Flow

### Primary Data Flow (CSV Files)
```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   wlan2     │────▶│    Kismet   │────▶│  CSV Files   │────▶│   Webhook    │
│ (Monitor)   │     │  (Process)  │     │ (/kismet_ops)│     │   Service    │
└─────────────┘     └─────────────┘     └──────────────┘     └──────────────┘
                           │                                           │
                           ▼                                           ▼
                    Kismet REST API                              Parse & Transform
                    (Port 2501)
```

### Secondary Data Flow (REST API)
```
┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│   Webhook    │────▶│  Kismet API    │────▶│   Webhook    │
│   Service    │     │  (Port 2501)   │     │   Response   │
└──────────────┘     └────────────────┘     └──────────────┘
        │                    │                       │
        ▼                    ▼                       ▼
   HTTP Request         JSON Response          Transformed Data
```

### Data Transformation
1. **CSV Input Format**
   ```csv
   type,mac,name,channel,signal,first_seen,last_seen
   Wi-Fi AP,AA:BB:CC:DD:EE:FF,MyRouter,6,-45,2025-06-16 10:00:00,2025-06-16 10:30:00
   Wi-Fi Client,11:22:33:44:55:66,MyPhone,6,-60,2025-06-16 10:15:00,2025-06-16 10:30:00
   ```

2. **Kismet API Format**
   ```json
   {
     "devices": [{
       "kismet": {
         "device": {
           "base": {
             "type": "Wi-Fi AP",
             "mac": "AA:BB:CC:DD:EE:FF",
             "name": "MyRouter",
             "channel": "6",
             "signal": -45
           }
         }
       }
     }]
   }
   ```

3. **Webhook Response Format**
   ```json
   {
     "devices_count": 42,
     "networks_count": 15,
     "recent_devices": [
       {
         "name": "MyRouter",
         "type": "Wi-Fi AP",
         "channel": "6"
       }
     ],
     "feed_items": [
       {
         "type": "Device",
         "message": "MyRouter (Wi-Fi AP) - Channel 6"
       }
     ],
     "last_update": "10:30:45"
   }
   ```

### Node.js Implementation
```javascript
class KismetDataFlow {
  constructor(logger) {
    this.logger = logger;
    this.csvPath = '/home/pi/kismet_ops';
    this.apiUrl = 'http://10.42.0.1:2501';
    this.auth = { username: 'admin', password: 'admin' };
  }

  async getKismetData() {
    // Try CSV first (faster, less resource intensive)
    try {
      const csvData = await this.parseLatestCSV();
      if (csvData) return csvData;
    } catch (error) {
      this.logger.warn('CSV parsing failed, falling back to API', error);
    }

    // Fall back to REST API
    try {
      return await this.fetchFromAPI();
    } catch (error) {
      this.logger.error('Kismet API failed', error);
      throw error;
    }
  }

  async parseLatestCSV() {
    const files = await glob(`${this.csvPath}/*.csv`);
    if (!files.length) return null;

    const latestFile = files.sort((a, b) => {
      return fs.statSync(b).mtime - fs.statSync(a).mtime;
    })[0];

    const devices = [];
    const networks = new Set();

    return new Promise((resolve, reject) => {
      fs.createReadStream(latestFile)
        .pipe(csv())
        .on('data', (row) => {
          devices.push(this.transformCSVRow(row));
          if (row.type.includes('Wi-Fi')) {
            networks.add(row.mac);
          }
        })
        .on('end', () => {
          resolve(this.formatResponse(devices, networks));
        })
        .on('error', reject);
    });
  }

  transformCSVRow(row) {
    return {
      name: row.name || row.mac,
      type: row.type,
      mac: row.mac,
      channel: row.channel,
      signal: parseInt(row.signal) || 0,
      first_seen: row.first_seen,
      last_seen: row.last_seen
    };
  }

  formatResponse(devices, networks) {
    const recentDevices = devices.slice(-5).map(d => ({
      name: d.name,
      type: d.type,
      channel: d.channel
    }));

    return {
      devices_count: devices.length,
      networks_count: networks.size,
      recent_devices: recentDevices,
      feed_items: recentDevices.map(d => ({
        type: 'Device',
        message: `${d.name} (${d.type}) - Channel ${d.channel}`
      })),
      last_update: new Date().toTimeString().split(' ')[0]
    };
  }
}
```

## 3. Process Management Data Flow

### Script Execution Flow
```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Webhook    │────▶│ gps_kismet_     │────▶│   Child      │
│   Service    │     │ wigle.sh        │     │  Processes   │
└──────────────┘     └─────────────────┘     └──────────────┘
        │                     │                      │
        ▼                     ▼                      ▼
   POST /run-script      Spawn Process          PID Files
```

### Process State Management
```javascript
class ProcessStateFlow {
  constructor() {
    this.states = new Map();
    this.transitions = {
      'stopped': ['starting'],
      'starting': ['running', 'error'],
      'running': ['stopping', 'error'],
      'stopping': ['stopped', 'error'],
      'error': ['starting', 'stopped']
    };
  }

  async transitionTo(processName, newState) {
    const currentState = this.states.get(processName) || 'stopped';
    
    if (!this.transitions[currentState].includes(newState)) {
      throw new Error(`Invalid transition from ${currentState} to ${newState}`);
    }

    this.states.set(processName, newState);
    await this.persistState(processName, newState);
    this.emit('stateChange', { processName, oldState: currentState, newState });
  }

  async persistState(processName, state) {
    const stateFile = `/tmp/${processName}.state`;
    await fs.promises.writeFile(stateFile, JSON.stringify({
      state,
      timestamp: Date.now(),
      pid: this.getPID(processName)
    }));
  }
}
```

### PID File Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Process    │────▶│  PID Files   │────▶│   Webhook    │
│   Spawned    │     │  (Written)   │     │  (Monitor)   │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                     │
        ▼                    ▼                     ▼
    Process ID          File System            Health Check
```

## 4. System Command Data Flow

### Command Execution Pipeline
```javascript
class SystemCommandFlow {
  constructor() {
    this.commandQueue = [];
    this.executing = false;
    this.results = new Map();
  }

  async executeCommand(command, args = []) {
    const commandId = uuid();
    
    // Add to queue
    this.commandQueue.push({
      id: commandId,
      command,
      args,
      timestamp: Date.now()
    });

    // Process queue
    await this.processQueue();
    
    // Return result
    return this.results.get(commandId);
  }

  async processQueue() {
    if (this.executing || this.commandQueue.length === 0) return;
    
    this.executing = true;
    
    while (this.commandQueue.length > 0) {
      const cmd = this.commandQueue.shift();
      const result = await this.runCommand(cmd);
      this.results.set(cmd.id, result);
      
      // Clean old results
      this.cleanResults();
    }
    
    this.executing = false;
  }

  async runCommand(cmd) {
    return new Promise((resolve) => {
      const child = spawn(cmd.command, cmd.args);
      const result = {
        stdout: '',
        stderr: '',
        exitCode: null,
        duration: 0
      };
      
      const startTime = Date.now();
      
      child.stdout.on('data', (data) => {
        result.stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        result.stderr += data.toString();
      });
      
      child.on('exit', (code) => {
        result.exitCode = code;
        result.duration = Date.now() - startTime;
        resolve(result);
      });
    });
  }
}
```

## 5. Network Interface Control Flow

### Interface State Management
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Webhook    │────▶│    System    │────▶│    wlan2     │
│   Request    │     │   Commands   │     │  Interface   │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                     │
        ▼                    ▼                     ▼
   State Change         ip/iw cmds          Monitor/Managed
```

### State Transitions
```javascript
class NetworkInterfaceFlow {
  constructor() {
    this.interface = 'wlan2';
    this.currentState = 'unknown';
    this.stateHistory = [];
  }

  async setMonitorMode() {
    await this.recordStateChange('monitor_requested');
    
    // Bring interface down
    await this.executeCommand('sudo', ['ip', 'link', 'set', this.interface, 'down']);
    
    // Set monitor mode
    await this.executeCommand('sudo', ['iw', 'dev', this.interface, 'set', 'monitor', 'none']);
    
    // Bring interface up
    await this.executeCommand('sudo', ['ip', 'link', 'set', this.interface, 'up']);
    
    await this.recordStateChange('monitor_active');
    
    return { success: true, interface: this.interface, mode: 'monitor' };
  }

  async setManagedMode() {
    await this.recordStateChange('managed_requested');
    
    // Bring interface down
    await this.executeCommand('sudo', ['ip', 'link', 'set', this.interface, 'down']);
    
    // Set managed mode
    await this.executeCommand('sudo', ['iw', 'dev', this.interface, 'set', 'type', 'managed']);
    
    // Bring interface up
    await this.executeCommand('sudo', ['ip', 'link', 'set', this.interface, 'up']);
    
    await this.recordStateChange('managed_active');
    
    return { success: true, interface: this.interface, mode: 'managed' };
  }

  async recordStateChange(newState) {
    const change = {
      from: this.currentState,
      to: newState,
      timestamp: Date.now()
    };
    
    this.stateHistory.push(change);
    this.currentState = newState;
    
    // Keep only last 100 state changes
    if (this.stateHistory.length > 100) {
      this.stateHistory = this.stateHistory.slice(-100);
    }
  }
}
```

## 6. Error Flow and Recovery

### Error Propagation Chain
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   External   │────▶│   Service    │────▶│    Error     │────▶│   Client     │
│   Service    │     │   Layer      │     │   Handler    │     │   Response   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
        │                    │                     │                     │
        ▼                    ▼                     ▼                     ▼
   GPSD/Kismet          Catch Error           Log & Transform      HTTP 200/500
```

### Error Recovery Strategies
```javascript
class ErrorRecoveryFlow {
  constructor() {
    this.retryPolicies = {
      'gpsd_connection': { maxRetries: 5, backoff: 1000 },
      'kismet_api': { maxRetries: 3, backoff: 2000 },
      'process_start': { maxRetries: 2, backoff: 5000 }
    };
  }

  async withRetry(operation, policyName) {
    const policy = this.retryPolicies[policyName];
    let lastError;
    
    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < policy.maxRetries) {
          const delay = policy.backoff * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Operation failed after ${policy.maxRetries} retries: ${lastError.message}`);
  }

  async recoverFromError(error, context) {
    switch (error.code) {
      case 'GPSD_CONNECTION_FAILED':
        return await this.recoverGPSD();
        
      case 'KISMET_NOT_RESPONDING':
        return await this.recoverKismet();
        
      case 'PROCESS_CRASHED':
        return await this.recoverProcess(context.processName);
        
      default:
        throw error;
    }
  }

  async recoverGPSD() {
    // Restart GPSD service
    await this.executeCommand('sudo', ['systemctl', 'restart', 'gpsd']);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify recovery
    const recovered = await this.checkGPSDHealth();
    if (!recovered) {
      throw new Error('GPSD recovery failed');
    }
    
    return { recovered: true, service: 'gpsd' };
  }
}
```

## 7. WebSocket Event Flow

### Real-time Update Flow
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Service    │────▶│   Event      │────▶│  WebSocket   │────▶│   Client     │
│   Change     │     │   Emitter    │     │   Server     │     │   Browser    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
        │                    │                     │                     │
        ▼                    ▼                     ▼                     ▼
   State Update         Emit Event           Broadcast            Update UI
```

### Event Types and Payloads
```javascript
class WebSocketEventFlow {
  constructor(io) {
    this.io = io;
    this.eventTypes = {
      'process.started': { room: 'process_updates' },
      'process.stopped': { room: 'process_updates' },
      'gps.update': { room: 'gps_updates', throttle: 1000 },
      'kismet.device': { room: 'kismet_updates', batch: true },
      'error.occurred': { room: 'error_updates' }
    };
  }

  emit(eventType, payload) {
    const config = this.eventTypes[eventType];
    
    if (config.throttle) {
      this.throttledEmit(eventType, payload, config);
    } else if (config.batch) {
      this.batchedEmit(eventType, payload, config);
    } else {
      this.io.to(config.room).emit(eventType, {
        timestamp: Date.now(),
        ...payload
      });
    }
  }

  throttledEmit(eventType, payload, config) {
    if (!this.throttleTimers) this.throttleTimers = {};
    
    if (this.throttleTimers[eventType]) {
      clearTimeout(this.throttleTimers[eventType]);
    }
    
    this.throttleTimers[eventType] = setTimeout(() => {
      this.io.to(config.room).emit(eventType, {
        timestamp: Date.now(),
        ...payload
      });
      delete this.throttleTimers[eventType];
    }, config.throttle);
  }

  batchedEmit(eventType, payload, config) {
    if (!this.batches) this.batches = {};
    if (!this.batches[eventType]) this.batches[eventType] = [];
    
    this.batches[eventType].push(payload);
    
    if (!this.batchTimers) this.batchTimers = {};
    
    if (!this.batchTimers[eventType]) {
      this.batchTimers[eventType] = setTimeout(() => {
        this.io.to(config.room).emit(eventType, {
          timestamp: Date.now(),
          batch: this.batches[eventType]
        });
        delete this.batches[eventType];
        delete this.batchTimers[eventType];
      }, 100);
    }
  }
}
```

## Summary

The webhook service acts as a central orchestrator for multiple data flows:

1. **GPS Data**: Real-time location data from GPSD
2. **Kismet Data**: WiFi scanning results via CSV and API
3. **Process Management**: Lifecycle control of system services
4. **System Commands**: Execution of privileged operations
5. **Network Interface**: Control of wireless adapter modes
6. **Error Recovery**: Automated recovery from service failures
7. **WebSocket Events**: Real-time updates to connected clients

Each flow has specific transformation requirements, error handling, and performance considerations that must be maintained during the Node.js migration.
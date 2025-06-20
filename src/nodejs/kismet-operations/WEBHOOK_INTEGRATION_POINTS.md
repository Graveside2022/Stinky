# Webhook Service Integration Points

## Overview

This document identifies all integration points between the webhook service and other system components, including potential conflicts, shared resources, and coordination requirements.

## 1. Service Port Integration

### Current Port Allocation
```
┌─────────────────┬──────────┬────────────────────────┐
│    Service      │   Port   │       Status           │
├─────────────────┼──────────┼────────────────────────┤
│ GPSD            │   2947   │ System service         │
│ Kismet API      │   2501   │ Process-managed        │
│ Webhook (Python)│   5000   │ To be migrated         │
│ WigleToTAK      │   8000   │ Process-managed        │
│ OpenWebRX       │   8073   │ Docker container       │
│ Spectrum (Node) │   8092   │ PRIMARY - Keep this    │
│ MAVProxy        │  14550   │ Process-managed        │
└─────────────────┴──────────┴────────────────────────┘
```

### Integration Strategy
- **Consolidate webhook into spectrum analyzer on port 8092**
- No port conflicts as webhook functionality moves to existing Node.js service
- All webhook endpoints will be prefixed with `/api/webhook/`

## 2. File System Integration Points

### Shared Directories
```bash
/home/pi/
├── tmp/                          # Shared temporary files
│   ├── *.pid                    # PID files (multiple writers)
│   ├── *.log                    # Log files (multiple writers)
│   └── *.lock                   # Lock files (coordination)
├── kismet_ops/                  # Kismet data directory
│   ├── *.csv                    # Kismet output (single writer, multiple readers)
│   ├── *.pid                    # Kismet PID (single writer)
│   └── *.log                    # Kismet logs (single writer)
└── .kismet/                     # Kismet configuration
    └── kismet_site.conf         # Config file (rarely modified)
```

### File Access Patterns
```javascript
// File coordination strategy
class FileCoordinator {
  constructor() {
    this.locks = new Map();
    this.watchers = new Map();
  }

  async acquireWriteLock(filepath) {
    const lockfile = `${filepath}.lock`;
    const lockId = Date.now().toString();
    
    // Atomic write attempt
    try {
      await fs.promises.writeFile(lockfile, lockId, { flag: 'wx' });
      this.locks.set(filepath, { lockfile, lockId });
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        // Lock exists, check if stale
        const existingLock = await fs.promises.readFile(lockfile, 'utf8');
        const lockAge = Date.now() - parseInt(existingLock);
        
        if (lockAge > 30000) { // 30 seconds
          // Stale lock, remove and retry
          await fs.promises.unlink(lockfile);
          return this.acquireWriteLock(filepath);
        }
      }
      return false;
    }
  }

  async releaseLock(filepath) {
    const lock = this.locks.get(filepath);
    if (lock) {
      await fs.promises.unlink(lock.lockfile);
      this.locks.delete(filepath);
    }
  }
}
```

### Critical File Conflicts

1. **PID Files**
   - Multiple processes may write to same PID file
   - Solution: Use atomic writes with process verification

2. **Log Files**
   - Concurrent append operations
   - Solution: Use write streams with proper buffering

3. **CSV Files**
   - Kismet writes, webhook reads
   - Solution: Read-only access, handle incomplete writes

## 3. Process Management Integration

### Process Hierarchy
```
systemd
└── node server.js (8092)
    └── webhook routes
        └── gps_kismet_wigle.sh
            ├── mavgps.py (GPS bridge)
            ├── start_kismet.sh
            │   └── kismet (WiFi scanning)
            └── WigleToTak2.py (TAK integration)
```

### Process Coordination
```javascript
class ProcessCoordinator {
  constructor() {
    this.processes = new Map();
    this.dependencies = {
      'kismet': ['gpsd'],
      'wigletotak': ['kismet'],
      'mavgps': ['gpsd']
    };
  }

  async startProcess(name, startFunction) {
    // Check dependencies first
    const deps = this.dependencies[name] || [];
    for (const dep of deps) {
      if (!this.isProcessRunning(dep)) {
        throw new Error(`Dependency ${dep} not running for ${name}`);
      }
    }

    // Start with mutual exclusion
    const lockAcquired = await this.acquireProcessLock(name);
    if (!lockAcquired) {
      throw new Error(`Process ${name} already starting`);
    }

    try {
      const pid = await startFunction();
      this.processes.set(name, { pid, startTime: Date.now() });
      return pid;
    } finally {
      await this.releaseProcessLock(name);
    }
  }

  async stopProcess(name) {
    const process = this.processes.get(name);
    if (!process) return;

    // Stop dependent processes first
    for (const [depName, deps] of Object.entries(this.dependencies)) {
      if (deps.includes(name)) {
        await this.stopProcess(depName);
      }
    }

    // Then stop the process
    await treeKill(process.pid);
    this.processes.delete(name);
  }
}
```

### Signal Handling Coordination
```javascript
// Graceful shutdown coordination
class SignalCoordinator {
  constructor() {
    this.handlers = new Map();
    this.shutdownOrder = ['wigletotak', 'kismet', 'mavgps', 'webhook'];
    
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
  }

  async handleShutdown(signal) {
    console.log(`Received ${signal}, coordinating shutdown...`);
    
    for (const service of this.shutdownOrder) {
      const handler = this.handlers.get(service);
      if (handler) {
        try {
          await handler(signal);
          console.log(`${service} shutdown complete`);
        } catch (error) {
          console.error(`${service} shutdown error:`, error);
        }
      }
    }
    
    process.exit(0);
  }

  register(service, handler) {
    this.handlers.set(service, handler);
  }
}
```

## 4. Network Interface Integration

### Interface State Management
```javascript
class NetworkInterfaceCoordinator {
  constructor() {
    this.interface = 'wlan2';
    this.currentOwner = null;
    this.stateFile = '/tmp/wlan2.state';
  }

  async acquireInterface(owner, mode) {
    // Check current state
    const state = await this.readState();
    
    if (state.owner && state.owner !== owner) {
      throw new Error(`Interface owned by ${state.owner}`);
    }

    // Acquire exclusive access
    await this.writeState({
      owner,
      mode,
      timestamp: Date.now()
    });

    this.currentOwner = owner;
    
    // Configure interface
    if (mode === 'monitor') {
      await this.setMonitorMode();
    } else {
      await this.setManagedMode();
    }
  }

  async releaseInterface(owner) {
    const state = await this.readState();
    
    if (state.owner !== owner) {
      throw new Error(`Cannot release: owned by ${state.owner}`);
    }

    // Reset to managed mode
    await this.setManagedMode();
    
    // Clear state
    await fs.promises.unlink(this.stateFile);
    this.currentOwner = null;
  }

  async readState() {
    try {
      const content = await fs.promises.readFile(this.stateFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return { owner: null, mode: 'managed' };
    }
  }

  async writeState(state) {
    await fs.promises.writeFile(
      this.stateFile,
      JSON.stringify(state),
      { flag: 'w' }
    );
  }
}
```

## 5. Service Communication Integration

### GPSD Integration
```javascript
class GPSDIntegration {
  constructor() {
    this.connection = null;
    this.listeners = new Set();
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = 10;
  }

  async connect() {
    if (this.connection && this.connection.connected) {
      return this.connection;
    }

    // Ensure GPSD is running
    const gpsdRunning = await this.checkGPSDService();
    if (!gpsdRunning) {
      await this.startGPSDService();
    }

    // Connect with retry logic
    for (let attempt = 0; attempt < this.maxReconnectAttempts; attempt++) {
      try {
        this.connection = new gpsd.Daemon({
          port: 2947,
          hostname: 'localhost'
        });
        
        await this.connection.connect();
        this.setupReconnection();
        return this.connection;
      } catch (error) {
        console.error(`GPSD connection attempt ${attempt + 1} failed:`, error);
        await new Promise(resolve => setTimeout(resolve, this.reconnectInterval));
      }
    }
    
    throw new Error('Failed to connect to GPSD after maximum attempts');
  }

  setupReconnection() {
    this.connection.on('disconnect', () => {
      console.log('GPSD disconnected, attempting reconnection...');
      setTimeout(() => this.connect(), this.reconnectInterval);
    });
  }

  async checkGPSDService() {
    try {
      const { stdout } = await execa('systemctl', ['is-active', 'gpsd']);
      return stdout.trim() === 'active';
    } catch {
      return false;
    }
  }

  async startGPSDService() {
    await execa('sudo', ['systemctl', 'start', 'gpsd']);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

### Kismet API Integration
```javascript
class KismetAPIIntegration {
  constructor() {
    this.baseURL = 'http://10.42.0.1:2501';
    this.auth = { username: 'admin', password: 'admin' };
    this.client = null;
    this.healthCheckInterval = 30000;
  }

  async initialize() {
    this.client = axios.create({
      baseURL: this.baseURL,
      auth: this.auth,
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add request/response interceptors
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.code === 'ECONNREFUSED') {
          // Kismet not running, attempt to check process
          const running = await this.checkKismetProcess();
          if (!running) {
            throw new Error('Kismet service not running');
          }
        }
        throw error;
      }
    );

    // Start health monitoring
    this.startHealthMonitoring();
  }

  startHealthMonitoring() {
    setInterval(async () => {
      try {
        await this.client.get('/system/status.json');
      } catch (error) {
        console.error('Kismet health check failed:', error.message);
        this.emit('unhealthy', error);
      }
    }, this.healthCheckInterval);
  }

  async checkKismetProcess() {
    const processes = await psList();
    return processes.some(p => p.name.toLowerCase().includes('kismet'));
  }
}
```

## 6. Data Synchronization Points

### CSV File Synchronization
```javascript
class CSVSynchronizer {
  constructor() {
    this.csvDirectory = '/home/pi/kismet_ops';
    this.lastProcessedFile = null;
    this.lastProcessedSize = 0;
  }

  async getLatestData() {
    const files = await glob(`${this.csvDirectory}/*.csv`);
    if (!files.length) return null;

    // Sort by modification time
    const sortedFiles = await Promise.all(
      files.map(async file => ({
        path: file,
        stats: await fs.promises.stat(file)
      }))
    );
    
    sortedFiles.sort((a, b) => b.stats.mtime - a.stats.mtime);
    const latestFile = sortedFiles[0];

    // Check if file has new data
    if (latestFile.path === this.lastProcessedFile && 
        latestFile.stats.size === this.lastProcessedSize) {
      return null; // No new data
    }

    // Process new data
    const newData = await this.processCSVFile(
      latestFile.path,
      this.lastProcessedFile === latestFile.path ? this.lastProcessedSize : 0
    );

    this.lastProcessedFile = latestFile.path;
    this.lastProcessedSize = latestFile.stats.size;

    return newData;
  }

  async processCSVFile(filepath, skipBytes = 0) {
    return new Promise((resolve, reject) => {
      const devices = [];
      const stream = fs.createReadStream(filepath, { start: skipBytes });
      
      stream
        .pipe(csv())
        .on('data', (row) => devices.push(row))
        .on('end', () => resolve(devices))
        .on('error', reject);
    });
  }
}
```

### State Synchronization
```javascript
class StateSynchronizer {
  constructor() {
    this.stateFile = '/tmp/webhook-state.json';
    this.syncInterval = 5000;
    this.state = {
      processes: {},
      interfaces: {},
      services: {},
      lastUpdate: null
    };
  }

  async loadState() {
    try {
      const content = await fs.promises.readFile(this.stateFile, 'utf8');
      this.state = JSON.parse(content);
    } catch (error) {
      // State file doesn't exist, use defaults
    }
  }

  async saveState() {
    this.state.lastUpdate = Date.now();
    await fs.promises.writeFile(
      this.stateFile,
      JSON.stringify(this.state, null, 2),
      { flag: 'w' }
    );
  }

  async syncProcessStates() {
    // Get actual process states
    const processes = await psList();
    
    // Update our state
    for (const [name, info] of Object.entries(this.state.processes)) {
      const running = processes.some(p => p.pid === info.pid);
      this.state.processes[name].running = running;
      this.state.processes[name].lastCheck = Date.now();
    }

    await this.saveState();
  }

  startAutoSync() {
    setInterval(() => this.syncProcessStates(), this.syncInterval);
  }
}
```

## 7. Error Recovery Integration

### Coordinated Error Recovery
```javascript
class ErrorRecoveryCoordinator {
  constructor() {
    this.recoveryStrategies = new Map();
    this.recoveryInProgress = new Set();
  }

  registerStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
  }

  async handleError(error, context) {
    const errorType = this.classifyError(error);
    
    // Prevent duplicate recovery attempts
    if (this.recoveryInProgress.has(errorType)) {
      console.log(`Recovery already in progress for ${errorType}`);
      return;
    }

    this.recoveryInProgress.add(errorType);

    try {
      const strategy = this.recoveryStrategies.get(errorType);
      if (strategy) {
        await strategy(error, context);
        console.log(`Recovery successful for ${errorType}`);
      }
    } finally {
      this.recoveryInProgress.delete(errorType);
    }
  }

  classifyError(error) {
    if (error.code === 'ECONNREFUSED' && error.address === '127.0.0.1') {
      if (error.port === 2947) return 'GPSD_DOWN';
      if (error.port === 2501) return 'KISMET_DOWN';
    }
    if (error.code === 'ESRCH') return 'PROCESS_NOT_FOUND';
    if (error.code === 'EACCES') return 'PERMISSION_DENIED';
    return 'UNKNOWN';
  }
}

// Register recovery strategies
const recovery = new ErrorRecoveryCoordinator();

recovery.registerStrategy('GPSD_DOWN', async () => {
  await execa('sudo', ['systemctl', 'restart', 'gpsd']);
  await new Promise(resolve => setTimeout(resolve, 2000));
});

recovery.registerStrategy('KISMET_DOWN', async () => {
  await execa('/home/pi/Scripts/start_kismet.sh');
  await new Promise(resolve => setTimeout(resolve, 5000));
});
```

## 8. Resource Conflict Resolution

### Mutex Implementation for Shared Resources
```javascript
class ResourceMutex {
  constructor() {
    this.mutexes = new Map();
    this.waitQueues = new Map();
  }

  async acquire(resource, timeout = 30000) {
    if (!this.mutexes.has(resource)) {
      this.mutexes.set(resource, { locked: false, owner: null });
      this.waitQueues.set(resource, []);
    }

    const mutex = this.mutexes.get(resource);
    const queue = this.waitQueues.get(resource);

    if (!mutex.locked) {
      mutex.locked = true;
      mutex.owner = process.pid;
      mutex.acquiredAt = Date.now();
      return true;
    }

    // Add to wait queue
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = queue.indexOf(waiter);
        if (index > -1) queue.splice(index, 1);
        reject(new Error(`Timeout acquiring mutex for ${resource}`));
      }, timeout);

      const waiter = { resolve, reject, timer };
      queue.push(waiter);
    });
  }

  release(resource) {
    const mutex = this.mutexes.get(resource);
    const queue = this.waitQueues.get(resource);

    if (!mutex || !mutex.locked) return;

    mutex.locked = false;
    mutex.owner = null;

    // Process wait queue
    if (queue && queue.length > 0) {
      const waiter = queue.shift();
      clearTimeout(waiter.timer);
      mutex.locked = true;
      mutex.owner = process.pid;
      mutex.acquiredAt = Date.now();
      waiter.resolve(true);
    }
  }
}

// Usage example
const resourceMutex = new ResourceMutex();

async function accessKismetCSV() {
  await resourceMutex.acquire('kismet-csv');
  try {
    // Exclusive access to Kismet CSV files
    const data = await readKismetData();
    return data;
  } finally {
    resourceMutex.release('kismet-csv');
  }
}
```

## Summary of Integration Requirements

1. **Port Integration**: Consolidate webhook into spectrum analyzer on port 8092
2. **File Locking**: Implement atomic operations for PID and state files
3. **Process Coordination**: Manage dependencies and mutual exclusion
4. **Network Interface**: Exclusive access control for wlan2
5. **Service Communication**: Robust reconnection and health monitoring
6. **Data Synchronization**: Handle concurrent file access and state updates
7. **Error Recovery**: Coordinated recovery strategies for all services
8. **Resource Conflicts**: Mutex-based resource access control

All integration points must be carefully managed to ensure reliable operation of the consolidated Node.js service.
# Webhook Service Dependency Analysis

## Python to Node.js Dependency Mapping

### 1. Process Management Dependencies

#### Python: `psutil`
**Purpose**: Process and system utilities for managing processes, checking PIDs, killing process trees

**Node.js Equivalents**:
```json
{
  "pidusage": "^3.0.2",      // ✅ Already installed - CPU/memory usage
  "ps-list": "^8.1.1",       // ❌ Need to install - List running processes
  "tree-kill": "^1.2.2",     // ❌ Need to install - Kill process trees
  "process-exists": "^5.0.0" // ❌ Optional - Check if process exists
}
```

**Key Functions to Migrate**:
- `psutil.Process(pid)` → `pidusage(pid)` + `ps-list`
- `psutil.pid_exists(pid)` → `process-exists` or custom implementation
- `process.children(recursive=True)` → `tree-kill` handles this
- `process.kill()` → `tree-kill(pid)`

### 2. GPS Communication

#### Python: `gps` (python3-gps)
**Purpose**: Communication with GPSD daemon for GPS data

**Node.js Equivalents**:
```json
{
  "node-gpsd": "^0.3.0",     // ❌ Need to install - GPSD client
  "gpsd-client": "^1.3.0"    // ❌ Alternative option
}
```

**Implementation Strategy**:
```javascript
// Using node-gpsd
const gpsd = require('node-gpsd');
const daemon = new gpsd.Daemon({
  port: 2947,
  hostname: 'localhost'
});

const listener = new gpsd.Listener();
listener.on('TPV', (data) => {
  // Handle position data
});
```

### 3. HTTP Client

#### Python: `requests`
**Purpose**: HTTP requests to Kismet API

**Node.js Equivalent**:
```json
{
  "axios": "^1.6.0"  // ✅ Already installed
}
```

**Migration is straightforward**:
```python
# Python
response = requests.get(url, auth=('admin', 'admin'), timeout=5)
```

```javascript
// Node.js
const response = await axios.get(url, {
  auth: { username: 'admin', password: 'admin' },
  timeout: 5000
});
```

### 4. File System Operations

#### Python: `os`, `glob`
**Purpose**: File operations, pattern matching

**Node.js Equivalents**:
```json
{
  "glob": "^10.3.10",        // ❌ Need to install - File pattern matching
  "fs": "built-in",          // ✅ Native Node.js
  "path": "built-in",        // ✅ Native Node.js
  "fs-extra": "^11.2.0"      // ❌ Optional - Enhanced fs operations
}
```

### 5. CSV Processing

#### Python: `csv`
**Purpose**: Parse Kismet CSV output files

**Node.js Equivalent**:
```json
{
  "csv-parser": "^3.0.0"  // ✅ Already installed
}
```

**Stream-based processing**:
```javascript
const csv = require('csv-parser');
const fs = require('fs');

fs.createReadStream(csvFile)
  .pipe(csv())
  .on('data', (row) => {
    // Process each row
  });
```

### 6. Process Spawning

#### Python: `subprocess`
**Purpose**: Execute shell commands and scripts

**Node.js Equivalent**:
```javascript
// Built-in child_process module
const { spawn, exec, execFile } = require('child_process');
```

**Key Migrations**:
```python
# Python
proc = subprocess.Popen(['sudo', '-u', 'pi', script], 
                       stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE,
                       start_new_session=True)
```

```javascript
// Node.js
const proc = spawn('sudo', ['-u', 'pi', script], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});
```

### 7. Signal Handling

#### Python: `signal`
**Purpose**: Handle process signals

**Node.js Equivalent**:
```javascript
// Built-in process events
process.on('SIGINT', () => {
  // Handle interrupt
});

process.on('SIGTERM', () => {
  // Handle termination
});
```

## File System Dependencies

### Directory Structure Required
```bash
/home/pi/
├── tmp/                          # Temporary files
│   ├── gps_kismet_wigle.pids   # Main script PIDs
│   ├── wigletotak.specific.pid  # WigleToTAK PID
│   ├── gps_kismet_wigle.log    # Main script log
│   ├── kismet.log              # Kismet output
│   ├── wigletotak.log          # WigleToTAK log
│   └── cgps.log                # GPS display log
├── kismet_ops/                  # Kismet operations
│   ├── *.csv                    # Kismet scan results
│   ├── kismet.pid              # Kismet process PID
│   └── kismet_debug.log        # Kismet debug log
├── web/                         # Web interface files
│   ├── hi.html                 # Control panel UI
│   └── homepage.html           # Landing page
├── stinky/                      # Orchestration scripts
│   └── gps_kismet_wigle.sh     # Main orchestration script
└── Scripts/                     # Utility scripts
    └── start_kismet.sh         # Kismet startup script
```

### PID File Management
```javascript
class PIDManager {
  constructor() {
    this.pidFiles = {
      main: '/tmp/kismet_script.pid',
      general: '/tmp/kismet_pids.txt',
      wigletotak: '/home/pi/tmp/wigletotak.specific.pid',
      kismet: '/home/pi/kismet_ops/kismet.pid'
    };
  }

  async writePID(type, pid) {
    await fs.promises.writeFile(this.pidFiles[type], pid.toString());
  }

  async readPID(type) {
    try {
      const content = await fs.promises.readFile(this.pidFiles[type], 'utf8');
      return parseInt(content.trim());
    } catch (error) {
      return null;
    }
  }

  async cleanupPIDs() {
    for (const [type, path] of Object.entries(this.pidFiles)) {
      try {
        await fs.promises.unlink(path);
      } catch (error) {
        // File doesn't exist, ignore
      }
    }
  }
}
```

## Network Dependencies

### External Service Connections

1. **GPSD Service**
   - Host: `localhost`
   - Port: `2947`
   - Protocol: JSON over TCP
   - Authentication: None

2. **Kismet API**
   - URL: `http://10.42.0.1:2501`
   - Authentication: Basic Auth (`admin:admin`)
   - Key Endpoints:
     - `/system/status.json`
     - `/devices/views/all_devices.json`

3. **Network Interface**
   - Interface: `wlan2`
   - Capabilities: Monitor mode support
   - Monitor interface: `wlan2mon` (when active)

## System Command Dependencies

### Required System Commands
```javascript
const SYSTEM_COMMANDS = {
  // GPS management
  restartGPSD: ['sudo', 'systemctl', 'restart', 'gpsd'],
  testGPS: ['gpspipe', '-w', '-n', '10'],
  
  // Network interface management
  interfaceDown: ['sudo', 'ip', 'link', 'set', 'wlan2', 'down'],
  interfaceUp: ['sudo', 'ip', 'link', 'set', 'wlan2', 'up'],
  setManaged: ['sudo', 'iw', 'dev', 'wlan2', 'set', 'type', 'managed'],
  setMonitor: ['sudo', 'iw', 'dev', 'wlan2', 'set', 'monitor', 'none'],
  
  // Process management
  killPattern: (pattern) => ['pkill', '-f', pattern],
  checkProcess: (name) => ['pgrep', '-f', name]
};
```

### Sudo Requirements
The Node.js process must be able to execute sudo commands without password for:
- `systemctl` (for service management)
- `ip` (for network interface control)
- `iw` (for wireless configuration)

## Integration Points

### 1. GPS Integration Flow
```
MAVLink Device → mavgps.py → GPSD (2947) → Node.js webhook → Client
```

### 2. WiFi Scanning Flow
```
wlan2 (monitor) → Kismet → CSV files → Node.js webhook → Client
                      ↓
                  Kismet API → Node.js webhook → Client
```

### 3. Process Orchestration
```
Node.js webhook → gps_kismet_wigle.sh → [gpsmav, kismet, wigletotak]
       ↓                    ↓
    PID files         Log files
```

## Shared Resource Management

### Potential Conflicts

1. **Port Conflicts**
   - Webhook: 5000 (Python) → Need to integrate into 8092 (Node.js)
   - Avoid conflicts with:
     - GPSD: 2947
     - Kismet: 2501
     - WigleToTAK: 8000

2. **File Access Conflicts**
   - Multiple processes writing to same PID files
   - Solution: Use file locking or atomic writes

3. **Network Interface Conflicts**
   - Multiple processes trying to control wlan2
   - Solution: Implement mutex/semaphore pattern

### Resource Locking Strategy
```javascript
class ResourceLock {
  constructor() {
    this.locks = new Map();
  }

  async acquire(resource, timeout = 5000) {
    const lockFile = `/tmp/${resource}.lock`;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await fs.promises.writeFile(lockFile, process.pid.toString(), { flag: 'wx' });
        this.locks.set(resource, lockFile);
        return true;
      } catch (error) {
        if (error.code === 'EEXIST') {
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Failed to acquire lock for ${resource}`);
  }

  async release(resource) {
    const lockFile = this.locks.get(resource);
    if (lockFile) {
      await fs.promises.unlink(lockFile);
      this.locks.delete(resource);
    }
  }
}
```

## Performance Considerations

### Memory Usage
- Python webhook.py: ~50-100MB
- Node.js estimate: ~30-80MB (more efficient)
- Shared with spectrum analyzer: Minimal overhead

### CPU Usage
- Process polling: Use event-based instead of polling
- CSV parsing: Use streams for large files
- GPS updates: Cache for 1 second minimum

### I/O Optimization
- Batch file operations
- Use async/await for all I/O
- Implement connection pooling for external services

## Summary of Required Actions

1. **Install Missing Dependencies**:
   ```bash
   npm install node-gpsd glob ps-list tree-kill
   ```

2. **Create Directory Structure**:
   ```bash
   mkdir -p /home/pi/tmp /home/pi/kismet_ops
   ```

3. **Implement Core Modules**:
   - ProcessManager (with tree-kill)
   - GPSClient (with node-gpsd)
   - KismetClient (with axios)
   - SystemControl (with child_process)
   - PIDManager (with fs)

4. **Migrate Endpoints**:
   - /run-script
   - /stop-script
   - /info
   - /script-status
   - /kismet-data

5. **Test Integration**:
   - GPS communication
   - Process management
   - Kismet API access
   - System commands
   - File operations
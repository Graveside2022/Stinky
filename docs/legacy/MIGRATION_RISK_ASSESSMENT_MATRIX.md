# MIGRATION RISK ASSESSMENT MATRIX
**Stinkster Platform - Flask to Node.js Migration Risk Analysis**

---

## Executive Summary

This document provides a comprehensive risk assessment for the Flask to Node.js migration of the Stinkster platform. Each risk is categorized by likelihood, impact, and includes detailed mitigation strategies and rollback procedures.

**Overall Migration Risk Level**: **MEDIUM-LOW** (Mitigated)

---

## Risk Assessment Matrix

### Risk Severity Legend:
- **Critical** 🔴: Immediate action required, blocks migration
- **High** 🟠: Must be addressed before production deployment
- **Medium** 🟡: Should be addressed within first week
- **Low** 🟢: Monitor and address as needed

### Risk Likelihood Scale:
- **Very Likely** (>75% chance)
- **Likely** (50-75% chance)
- **Possible** (25-50% chance)
- **Unlikely** (<25% chance)

---

## 1. TECHNICAL RISKS

### 1.1 Breaking Existing Functionality

**Risk Level**: 🟠 **HIGH**  
**Likelihood**: Possible (35%)  
**Impact**: Service outages, loss of critical functionality  

**Potential Issues**:
- API endpoint behavior changes
- WebSocket protocol incompatibilities
- File path handling differences between Python and Node.js
- Async/await timing differences

**Mitigation Strategies**:
```bash
# 1. Comprehensive API compatibility testing
cd /home/pi/projects/stinkster_malone/stinkster/tests
npm run test:api-compatibility

# 2. Maintain parallel deployment
# Keep Flask services running on alternate ports during transition
python3 spectrum_analyzer.py --port 8093  # Flask backup
node spectrum-analyzer/index.js          # Node.js primary

# 3. Feature flag implementation
const FEATURE_FLAGS = {
    useNodeGPS: process.env.USE_NODE_GPS === 'true',
    useNodeSpectrum: process.env.USE_NODE_SPECTRUM === 'true',
    useNodeWigle: process.env.USE_NODE_WIGLE === 'true'
};

# 4. Gradual rollout with canary deployment
# Route 10% traffic to Node.js, 90% to Flask initially
```

**Rollback Procedure**:
```bash
# Immediate rollback script
#!/bin/bash
# rollback-to-flask.sh

# Stop Node.js services
pm2 delete all

# Restore Flask services
systemctl start hackrf-scanner
systemctl start wigle-to-tak
systemctl start gps-bridge

# Verify Flask services
curl http://localhost:8092/api/status
curl http://localhost:8000/api/status
```

### 1.2 Performance Degradation

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Unlikely (20%)  
**Impact**: Slower response times, poor user experience  

**Potential Issues**:
- Memory leaks in Node.js services
- Inefficient WebSocket handling
- CPU spikes during FFT processing
- Garbage collection pauses

**Mitigation Strategies**:
```javascript
// 1. Memory leak prevention
class SpectrumAnalyzer {
    constructor() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldBuffers();
            this.reportMemoryUsage();
        }, 60000); // Every minute
    }
    
    cleanupOldBuffers() {
        const threshold = Date.now() - 300000; // 5 minutes
        this.buffers = this.buffers.filter(b => b.timestamp > threshold);
    }
    
    shutdown() {
        clearInterval(this.cleanupInterval);
        this.buffers = [];
    }
}

// 2. Performance monitoring
const performanceMiddleware = (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const duration = Number(process.hrtime.bigint() - start) / 1000000;
        if (duration > 50) { // Log slow requests
            logger.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
        }
    });
    next();
};

// 3. Resource limits
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    for (let i = 0; i < Math.min(numCPUs, 4); i++) {
        cluster.fork();
    }
}
```

**Monitoring Script**:
```bash
#!/bin/bash
# monitor-performance.sh

while true; do
    # Check response times
    RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:8092/api/status)
    
    # Check memory usage
    MEMORY=$(pm2 jlist | jq '.[0].monit.memory' 2>/dev/null || echo "0")
    
    # Alert if degraded
    if (( $(echo "$RESPONSE_TIME > 0.05" | bc -l) )); then
        echo "ALERT: Slow response time: ${RESPONSE_TIME}s"
    fi
    
    if (( MEMORY > 100000000 )); then  # 100MB
        echo "ALERT: High memory usage: ${MEMORY} bytes"
    fi
    
    sleep 30
done
```

### 1.3 Memory Leaks

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Possible (30%)  
**Impact**: Service crashes, system instability  

**Potential Issues**:
- Unclosed WebSocket connections
- Growing event listener arrays
- Circular references in closures
- Buffer accumulation

**Mitigation Strategies**:
```javascript
// 1. WebSocket connection management
class WebSocketManager {
    constructor() {
        this.connections = new Map();
        this.maxConnections = 100;
    }
    
    addConnection(id, socket) {
        // Prevent unlimited growth
        if (this.connections.size >= this.maxConnections) {
            const oldest = this.connections.keys().next().value;
            this.removeConnection(oldest);
        }
        
        this.connections.set(id, {
            socket,
            created: Date.now(),
            lastActivity: Date.now()
        });
        
        // Auto-cleanup inactive connections
        socket.on('disconnect', () => this.removeConnection(id));
    }
    
    removeConnection(id) {
        const conn = this.connections.get(id);
        if (conn) {
            conn.socket.removeAllListeners();
            conn.socket.disconnect(true);
            this.connections.delete(id);
        }
    }
    
    cleanupStale() {
        const staleTime = Date.now() - 300000; // 5 minutes
        for (const [id, conn] of this.connections) {
            if (conn.lastActivity < staleTime) {
                this.removeConnection(id);
            }
        }
    }
}

// 2. Memory monitoring with auto-restart
const memoryMonitor = setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 200) { // 200MB threshold
        logger.error('Memory limit exceeded, requesting graceful restart');
        process.send?.('shutdown'); // PM2 will restart
    }
}, 60000);

// 3. Proper cleanup on shutdown
process.on('SIGINT', async () => {
    clearInterval(memoryMonitor);
    await cleanup();
    process.exit(0);
});
```

**Memory Leak Detection**:
```bash
# Use Node.js built-in profiler
node --inspect=0.0.0.0:9229 spectrum-analyzer/index.js

# Connect Chrome DevTools for heap snapshots
# chrome://inspect

# Or use clinic.js for automated detection
npm install -g clinic
clinic doctor -- node spectrum-analyzer/index.js
```

### 1.4 Process Management Issues

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Possible (25%)  
**Impact**: Service unavailability, zombie processes  

**Potential Issues**:
- PM2 cluster mode conflicts
- Graceful shutdown failures
- PID file corruption
- Resource cleanup failures

**Mitigation Strategies**:
```javascript
// 1. PM2 ecosystem configuration
module.exports = {
    apps: [{
        name: 'spectrum-analyzer',
        script: './spectrum-analyzer/index.js',
        instances: 2,
        exec_mode: 'cluster',
        max_memory_restart: '300M',
        error_file: './logs/spectrum-error.log',
        out_file: './logs/spectrum-out.log',
        merge_logs: true,
        time: true,
        
        // Graceful shutdown
        kill_timeout: 5000,
        listen_timeout: 5000,
        
        // Auto-restart on failure
        autorestart: true,
        max_restarts: 10,
        min_uptime: '10s',
        
        // Environment
        env: {
            NODE_ENV: 'production',
            PORT: 8092
        },
        
        // Health check
        cron_restart: '0 0 * * *', // Daily restart
    }]
};

// 2. Proper signal handling
class ServiceManager {
    constructor() {
        this.isShuttingDown = false;
        this.activeRequests = new Set();
        
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    }
    
    trackRequest(id) {
        this.activeRequests.add(id);
    }
    
    completeRequest(id) {
        this.activeRequests.delete(id);
    }
    
    async gracefulShutdown(signal) {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        
        logger.info(`Received ${signal}, starting graceful shutdown`);
        
        // Stop accepting new connections
        this.server.close();
        
        // Wait for active requests
        const timeout = setTimeout(() => {
            logger.error('Graceful shutdown timeout, forcing exit');
            process.exit(1);
        }, 30000);
        
        while (this.activeRequests.size > 0) {
            logger.info(`Waiting for ${this.activeRequests.size} active requests`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        clearTimeout(timeout);
        logger.info('Graceful shutdown complete');
        process.exit(0);
    }
}
```

**Process Monitoring**:
```bash
#!/bin/bash
# process-health-check.sh

check_service() {
    local service=$1
    local port=$2
    
    # Check if process is running
    if ! pm2 show $service > /dev/null 2>&1; then
        echo "ERROR: $service not in PM2"
        return 1
    fi
    
    # Check if port is listening
    if ! netstat -tln | grep -q ":$port"; then
        echo "ERROR: $service not listening on port $port"
        return 1
    fi
    
    # Check HTTP health
    if ! curl -f -s http://localhost:$port/health > /dev/null; then
        echo "ERROR: $service health check failed"
        return 1
    fi
    
    echo "OK: $service healthy"
    return 0
}

check_service "spectrum-analyzer" 8092
check_service "wigle-to-tak" 8000
check_service "gps-bridge" 2947
```

---

## 2. INTEGRATION RISKS

### 2.1 GPSD Connection Failures

**Risk Level**: 🟠 **HIGH**  
**Likelihood**: Likely (60%)  
**Impact**: Loss of GPS functionality  

**Potential Issues**:
- GPSD protocol version mismatches
- Connection timeout handling
- GPS device reconnection logic
- Coordinate format differences

**Mitigation Strategies**:
```javascript
// 1. Robust GPSD client with retry logic
class GPSDClient {
    constructor(config) {
        this.config = config;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.isConnected = false;
    }
    
    async connect() {
        try {
            this.socket = net.createConnection(this.config.port, this.config.host);
            
            this.socket.on('connect', () => {
                logger.info('Connected to GPSD');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.sendCommand('?WATCH={"enable":true,"json":true}');
            });
            
            this.socket.on('error', (err) => {
                logger.error('GPSD connection error:', err);
                this.handleDisconnect();
            });
            
            this.socket.on('close', () => {
                logger.warn('GPSD connection closed');
                this.handleDisconnect();
            });
            
            this.socket.on('data', (data) => {
                this.handleGPSData(data);
            });
            
        } catch (error) {
            logger.error('Failed to connect to GPSD:', error);
            this.scheduleReconnect();
        }
    }
    
    handleDisconnect() {
        this.isConnected = false;
        this.socket?.removeAllListeners();
        this.socket?.destroy();
        this.scheduleReconnect();
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max GPSD reconnection attempts reached');
            this.emit('fatal_error');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);
        
        logger.info(`Scheduling GPSD reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
    }
    
    handleGPSData(buffer) {
        const lines = buffer.toString().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                const data = JSON.parse(line);
                if (data.class === 'TPV') {
                    this.emit('position', {
                        lat: data.lat,
                        lon: data.lon,
                        alt: data.alt,
                        speed: data.speed,
                        time: data.time
                    });
                }
            } catch (err) {
                logger.debug('Invalid GPS data:', line);
            }
        }
    }
}

// 2. Fallback GPS source
class GPSManager {
    constructor() {
        this.sources = [
            new GPSDClient({ host: 'localhost', port: 2947 }),
            new SerialGPS({ device: '/dev/ttyUSB0', baud: 4800 }),
            new NetworkGPS({ url: 'http://backup-gps:8080' })
        ];
        
        this.activeSource = null;
    }
    
    async initialize() {
        for (const source of this.sources) {
            try {
                await source.connect();
                this.activeSource = source;
                logger.info(`GPS initialized with ${source.constructor.name}`);
                break;
            } catch (err) {
                logger.warn(`Failed to initialize ${source.constructor.name}:`, err);
            }
        }
        
        if (!this.activeSource) {
            throw new Error('No GPS source available');
        }
    }
}
```

**Testing GPS Integration**:
```bash
#!/bin/bash
# test-gps-integration.sh

# Test GPSD connection
echo "Testing GPSD connection..."
timeout 5 gpspipe -w -n 5 || echo "GPSD connection failed"

# Test Node.js GPS bridge
echo "Testing Node.js GPS bridge..."
node -e "
const net = require('net');
const client = net.createConnection(2947, 'localhost');
client.on('connect', () => {
    console.log('Connected to GPS bridge');
    client.write('?WATCH={\"enable\":true,\"json\":true}\n');
});
client.on('data', (data) => {
    console.log('GPS data:', data.toString());
    client.end();
});
client.on('error', (err) => {
    console.error('GPS bridge error:', err.message);
    process.exit(1);
});
"
```

### 2.2 Kismet API Changes

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Possible (40%)  
**Impact**: WiFi scanning data loss  

**Potential Issues**:
- Kismet REST API version changes
- Authentication token expiration
- WebSocket protocol changes
- Data format modifications

**Mitigation Strategies**:
```javascript
// 1. Version-aware Kismet client
class KismetClient {
    constructor(config) {
        this.config = config;
        this.apiVersion = null;
        this.sessionKey = null;
    }
    
    async connect() {
        // Detect Kismet version
        try {
            const versionResponse = await fetch(`${this.config.baseUrl}/system/status.json`);
            const status = await versionResponse.json();
            this.apiVersion = status.kismet.version;
            logger.info(`Connected to Kismet ${this.apiVersion}`);
            
            // Version-specific initialization
            if (this.apiVersion.startsWith('2020')) {
                await this.initializeV2020();
            } else if (this.apiVersion.startsWith('2021')) {
                await this.initializeV2021();
            } else {
                logger.warn(`Unknown Kismet version: ${this.apiVersion}`);
            }
            
        } catch (error) {
            logger.error('Failed to connect to Kismet:', error);
            throw error;
        }
    }
    
    async initializeV2021() {
        // Handle newer API format
        const authResponse = await fetch(`${this.config.baseUrl}/session/check_session`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
            }
        });
        
        if (authResponse.ok) {
            const session = await authResponse.json();
            this.sessionKey = session.session;
        }
    }
    
    async getDevices() {
        const endpoint = this.apiVersion?.startsWith('2020') 
            ? '/devices/all_devices.json'
            : '/devices/views/all/devices.json';
            
        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
            headers: this.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Kismet API error: ${response.status}`);
        }
        
        return this.normalizeDeviceData(await response.json());
    }
    
    normalizeDeviceData(data) {
        // Normalize data format across versions
        return data.map(device => ({
            mac: device['kismet.device.base.macaddr'],
            firstSeen: device['kismet.device.base.first_time'],
            lastSeen: device['kismet.device.base.last_time'],
            ssid: device['kismet.device.base.name'],
            signal: device['kismet.device.base.signal']?.['kismet.common.signal.last_signal'],
            channel: device['kismet.device.base.channel'],
            manufacturer: device['kismet.device.base.manuf']
        }));
    }
}

// 2. File-based fallback
class KismetDataSource {
    constructor() {
        this.sources = [
            new KismetAPISource(),
            new KismetFileSource('/home/pi/kismet_logs'),
            new KismetWebSocketSource()
        ];
    }
    
    async getDevices() {
        for (const source of this.sources) {
            try {
                return await source.getDevices();
            } catch (err) {
                logger.warn(`${source.constructor.name} failed:`, err.message);
            }
        }
        throw new Error('All Kismet data sources failed');
    }
}
```

**Kismet Integration Test**:
```bash
#!/bin/bash
# test-kismet-integration.sh

# Check Kismet status
if pgrep kismet > /dev/null; then
    echo "✓ Kismet is running"
    
    # Test API endpoint
    curl -s http://localhost:2501/system/status.json | jq '.kismet.version' || echo "✗ Kismet API error"
    
    # Check for data files
    find /home/pi/kismet_logs -name "*.wiglecsv" -mmin -5 | head -5
else
    echo "✗ Kismet is not running"
fi
```

### 2.3 Script Execution Permissions

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Likely (50%)  
**Impact**: Automation failures  

**Potential Issues**:
- File permission differences
- PATH environment variables
- Shell interpreter availability
- Working directory context

**Mitigation Strategies**:
```javascript
// 1. Safe script execution wrapper
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ScriptExecutor {
    constructor(config) {
        this.scriptsDir = config.scriptsDir;
        this.allowedScripts = new Set(config.allowedScripts);
        this.timeout = config.timeout || 60000;
    }
    
    async execute(scriptName, args = []) {
        // Validate script name
        if (!this.allowedScripts.has(scriptName)) {
            throw new Error(`Script not allowed: ${scriptName}`);
        }
        
        const scriptPath = path.join(this.scriptsDir, scriptName);
        
        // Check script exists and is executable
        try {
            const stats = await fs.stat(scriptPath);
            if (!stats.isFile()) {
                throw new Error(`Not a file: ${scriptPath}`);
            }
            
            // Check execute permission
            await fs.access(scriptPath, fs.constants.X_OK);
            
        } catch (error) {
            if (error.code === 'EACCES') {
                // Try to make executable
                await fs.chmod(scriptPath, '755');
            } else {
                throw error;
            }
        }
        
        // Execute with timeout
        return new Promise((resolve, reject) => {
            const child = spawn(scriptPath, args, {
                cwd: this.scriptsDir,
                env: {
                    ...process.env,
                    PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`
                },
                timeout: this.timeout
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr, code });
                } else {
                    reject(new Error(`Script exited with code ${code}: ${stderr}`));
                }
            });
            
            child.on('error', (error) => {
                reject(error);
            });
        });
    }
}

// 2. Permission verification on startup
async function verifyScriptPermissions() {
    const requiredScripts = [
        '/home/pi/Scripts/start_kismet.sh',
        '/home/pi/stinky/gps_kismet_wigle.sh',
        '/home/pi/Scripts/start_mediamtx.sh'
    ];
    
    for (const script of requiredScripts) {
        try {
            await fs.access(script, fs.constants.X_OK);
            logger.info(`✓ Script executable: ${script}`);
        } catch (error) {
            logger.warn(`✗ Script not executable: ${script}, attempting to fix...`);
            try {
                await fs.chmod(script, '755');
                logger.info(`✓ Fixed permissions for: ${script}`);
            } catch (fixError) {
                logger.error(`✗ Cannot fix permissions for: ${script}`, fixError);
            }
        }
    }
}
```

**Permission Fix Script**:
```bash
#!/bin/bash
# fix-permissions.sh

echo "Fixing script permissions..."

# Fix orchestration scripts
chmod +x /home/pi/stinky/*.sh
chmod +x /home/pi/Scripts/*.sh

# Fix service scripts
chmod +x /home/pi/projects/stinkster_malone/stinkster/src/nodejs/*/start-*.sh

# Fix Python scripts that might be called
chmod +x /home/pi/gpsmav/GPSmav/mavgps.py
chmod +x /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/WigleToTak2.py

# Verify
echo "Verifying permissions..."
ls -la /home/pi/stinky/*.sh
ls -la /home/pi/Scripts/*.sh
```

---

## 3. DEPLOYMENT RISKS

### 3.1 Service Conflicts

**Risk Level**: 🟠 **HIGH**  
**Likelihood**: Very Likely (80%)  
**Impact**: Service startup failures  

**Potential Issues**:
- Port binding conflicts
- Systemd service conflicts
- PM2 vs systemd management
- Shared resource locks

**Mitigation Strategies**:
```javascript
// 1. Port availability checker
const net = require('net');

class PortManager {
    static async isPortAvailable(port, host = 'localhost') {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                } else {
                    resolve(false);
                }
            });
            
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            
            server.listen(port, host);
        });
    }
    
    static async findAvailablePort(preferredPort, maxAttempts = 10) {
        let port = preferredPort;
        
        for (let i = 0; i < maxAttempts; i++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
            port++;
        }
        
        throw new Error(`No available port found starting from ${preferredPort}`);
    }
    
    static async killProcessOnPort(port) {
        return new Promise((resolve, reject) => {
            exec(`lsof -ti:${port} | xargs kill -9`, (error) => {
                if (error && error.code !== 1) { // Code 1 means no process found
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}

// 2. Service startup with conflict resolution
class ServiceStarter {
    async start(config) {
        const { name, port, fallbackPorts } = config;
        
        // Check for systemd conflicts
        await this.stopSystemdService(name);
        
        // Find available port
        let availablePort = port;
        if (!await PortManager.isPortAvailable(port)) {
            logger.warn(`Port ${port} is in use, checking alternatives...`);
            
            // Try fallback ports
            for (const fallback of fallbackPorts || []) {
                if (await PortManager.isPortAvailable(fallback)) {
                    availablePort = fallback;
                    break;
                }
            }
            
            if (availablePort === port) {
                // Force kill existing process
                logger.warn(`Killing process on port ${port}`);
                await PortManager.killProcessOnPort(port);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Start service
        logger.info(`Starting ${name} on port ${availablePort}`);
        return availablePort;
    }
    
    async stopSystemdService(name) {
        const serviceMap = {
            'spectrum-analyzer': 'hackrf-scanner',
            'wigle-to-tak': 'wigle-to-tak',
            'gps-bridge': 'gpsd'
        };
        
        const systemdService = serviceMap[name];
        if (systemdService) {
            try {
                await exec(`sudo systemctl stop ${systemdService} 2>/dev/null`);
                logger.info(`Stopped systemd service: ${systemdService}`);
            } catch (error) {
                // Service might not exist or already stopped
            }
        }
    }
}
```

**Conflict Resolution Script**:
```bash
#!/bin/bash
# resolve-conflicts.sh

echo "Resolving service conflicts..."

# Stop all Flask services
sudo systemctl stop hackrf-scanner 2>/dev/null || true
sudo systemctl stop wigle-to-tak 2>/dev/null || true

# Kill any Python processes on our ports
lsof -ti:8092 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Stop any orphaned PM2 processes
pm2 delete all 2>/dev/null || true

# Wait for ports to be released
sleep 2

# Verify ports are free
for port in 8092 8000 2947; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "WARNING: Port $port still in use"
    else
        echo "✓ Port $port is free"
    fi
done
```

### 3.2 Port Conflicts

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Likely (60%)  
**Impact**: Service unavailability  

**Potential Issues**:
- Multiple services on same port
- Docker container port mappings
- Firewall blocking
- IPv4 vs IPv6 binding

**Mitigation Strategies**:
```javascript
// 1. Intelligent port binding
class SmartServer {
    constructor(app, config) {
        this.app = app;
        this.config = config;
        this.server = null;
    }
    
    async listen() {
        const { port, host, fallbackPorts } = this.config;
        
        // Try primary port first
        try {
            await this.tryListen(port, host);
            return { port, host };
        } catch (error) {
            logger.warn(`Failed to bind to ${host}:${port}`, error.message);
        }
        
        // Try fallback ports
        for (const fallbackPort of fallbackPorts || []) {
            try {
                await this.tryListen(fallbackPort, host);
                logger.info(`Using fallback port ${fallbackPort}`);
                return { port: fallbackPort, host };
            } catch (error) {
                logger.warn(`Fallback port ${fallbackPort} also failed`);
            }
        }
        
        // Try any available port
        try {
            await this.tryListen(0, host); // OS assigns port
            const actualPort = this.server.address().port;
            logger.warn(`Using OS-assigned port ${actualPort}`);
            return { port: actualPort, host };
        } catch (error) {
            throw new Error('Cannot bind to any port');
        }
    }
    
    tryListen(port, host) {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, host, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
            
            this.server.once('error', reject);
        });
    }
}

// 2. Port configuration with environment override
const portConfig = {
    'spectrum-analyzer': {
        port: process.env.SPECTRUM_PORT || 8092,
        fallbackPorts: [8093, 8094, 8095],
        host: process.env.SPECTRUM_HOST || '127.0.0.1'
    },
    'wigle-to-tak': {
        port: process.env.WIGLE_PORT || 8000,
        fallbackPorts: [8001, 8002, 8003],
        host: process.env.WIGLE_HOST || '127.0.0.1'
    },
    'gps-bridge': {
        port: process.env.GPS_PORT || 2947,
        fallbackPorts: [2948, 2949],
        host: process.env.GPS_HOST || '127.0.0.1'
    }
};
```

**Port Verification Script**:
```bash
#!/bin/bash
# verify-ports.sh

check_port() {
    local port=$1
    local service=$2
    
    echo -n "Checking port $port for $service... "
    
    # Check if port is in use
    if lsof -ti:$port > /dev/null 2>&1; then
        local pid=$(lsof -ti:$port)
        local process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        echo "✗ IN USE by $process (PID: $pid)"
        return 1
    else
        echo "✓ AVAILABLE"
        return 0
    fi
}

# Check all service ports
check_port 8092 "Spectrum Analyzer"
check_port 8000 "WigleToTAK"
check_port 2947 "GPS Bridge"
check_port 8073 "OpenWebRX"

# Check for port forwarding rules
echo -e "\nIPTables rules:"
sudo iptables -t nat -L PREROUTING -n | grep -E "(8092|8000|2947|8073)" || echo "No port forwarding rules found"
```

### 3.3 Environment Differences

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Possible (40%)  
**Impact**: Configuration errors, service failures  

**Potential Issues**:
- Node.js version differences
- Missing environment variables
- File path differences
- User permission variations

**Mitigation Strategies**:
```javascript
// 1. Environment validation
class EnvironmentValidator {
    static validate() {
        const errors = [];
        const warnings = [];
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
        
        if (majorVersion < 16) {
            errors.push(`Node.js version ${nodeVersion} is too old. Required: v16.0.0 or higher`);
        } else if (majorVersion < 18) {
            warnings.push(`Node.js version ${nodeVersion} is supported but v18+ is recommended`);
        }
        
        // Check required environment variables
        const requiredEnvVars = [
            'NODE_ENV',
            'HOME',
            'USER'
        ];
        
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                errors.push(`Missing required environment variable: ${envVar}`);
            }
        }
        
        // Check file paths
        const requiredPaths = [
            '/home/pi/projects/stinkster_malone/stinkster',
            '/home/pi/kismet_logs',
            '/home/pi/Scripts'
        ];
        
        const fs = require('fs');
        for (const path of requiredPaths) {
            if (!fs.existsSync(path)) {
                warnings.push(`Expected path not found: ${path}`);
            }
        }
        
        // Check user permissions
        if (process.getuid && process.getuid() === 0) {
            warnings.push('Running as root is not recommended');
        }
        
        return { errors, warnings };
    }
}

// 2. Environment setup script
const setupEnvironment = () => {
    // Set default environment variables
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    process.env.TZ = process.env.TZ || 'UTC';
    
    // Ensure required directories exist
    const dirs = [
        './logs',
        './uploads',
        './temp',
        './config'
    ];
    
    const fs = require('fs');
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logger.info(`Created directory: ${dir}`);
        }
    }
    
    // Set process title for easier identification
    process.title = `node-${require('./package.json').name}`;
};

// 3. Configuration with defaults
class ConfigManager {
    static getConfig() {
        return {
            // Path resolution
            projectRoot: process.env.PROJECT_ROOT || '/home/pi/projects/stinkster_malone/stinkster',
            dataDir: process.env.DATA_DIR || '/home/pi/projects/stinkster_malone/stinkster/data',
            logsDir: process.env.LOGS_DIR || './logs',
            
            // Service configuration
            services: {
                spectrum: {
                    enabled: process.env.ENABLE_SPECTRUM !== 'false',
                    port: parseInt(process.env.SPECTRUM_PORT) || 8092
                },
                wigle: {
                    enabled: process.env.ENABLE_WIGLE !== 'false',
                    port: parseInt(process.env.WIGLE_PORT) || 8000
                },
                gps: {
                    enabled: process.env.ENABLE_GPS !== 'false',
                    port: parseInt(process.env.GPS_PORT) || 2947
                }
            },
            
            // Feature flags
            features: {
                demoMode: process.env.DEMO_MODE === 'true',
                debugLogging: process.env.DEBUG === 'true',
                performanceMonitoring: process.env.PERF_MONITORING !== 'false'
            }
        };
    }
}
```

**Environment Setup Script**:
```bash
#!/bin/bash
# setup-environment.sh

echo "Setting up Node.js environment..."

# Check Node.js version
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Create required directories
mkdir -p /home/pi/projects/stinkster_malone/stinkster/src/nodejs/logs
mkdir -p /home/pi/projects/stinkster_malone/stinkster/src/nodejs/uploads
mkdir -p /home/pi/projects/stinkster_malone/stinkster/src/nodejs/temp

# Set environment variables
cat > /home/pi/projects/stinkster_malone/stinkster/src/nodejs/.env << EOF
NODE_ENV=production
PROJECT_ROOT=/home/pi/projects/stinkster_malone/stinkster
DATA_DIR=/home/pi/projects/stinkster_malone/stinkster/data
LOGS_DIR=/home/pi/projects/stinkster_malone/stinkster/src/nodejs/logs

# Service ports
SPECTRUM_PORT=8092
WIGLE_PORT=8000
GPS_PORT=2947

# External services
OPENWEBRX_URL=http://localhost:8073
KISMET_URL=http://localhost:2501
TAK_SERVER=localhost
TAK_PORT=6969

# Feature flags
DEMO_MODE=false
DEBUG=false
PERF_MONITORING=true
EOF

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

echo "Environment setup complete!"
```

---

## 4. DATA RISKS

### 4.1 PID File Corruption

**Risk Level**: 🟢 **LOW**  
**Likelihood**: Unlikely (20%)  
**Impact**: Process tracking failures  

**Potential Issues**:
- Concurrent write access
- Stale PID files
- Permission issues
- Filesystem errors

**Mitigation Strategies**:
```javascript
// 1. Robust PID file management
const fs = require('fs').promises;
const path = require('path');

class PIDManager {
    constructor(serviceName, pidDir = '/var/run') {
        this.serviceName = serviceName;
        this.pidFile = path.join(pidDir, `${serviceName}.pid`);
        this.lockFile = `${this.pidFile}.lock`;
    }
    
    async writePID() {
        const pid = process.pid;
        
        try {
            // Atomic write with temp file
            const tempFile = `${this.pidFile}.tmp`;
            await fs.writeFile(tempFile, pid.toString(), { mode: 0o644 });
            await fs.rename(tempFile, this.pidFile);
            
            logger.info(`PID ${pid} written to ${this.pidFile}`);
            
            // Clean up on exit
            process.on('exit', () => {
                this.removePID();
            });
            
        } catch (error) {
            logger.error('Failed to write PID file:', error);
            // Continue anyway - PID file is not critical
        }
    }
    
    async readPID() {
        try {
            const content = await fs.readFile(this.pidFile, 'utf-8');
            return parseInt(content.trim());
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Error reading PID file:', error);
            }
            return null;
        }
    }
    
    async checkRunning(pid) {
        try {
            // Send signal 0 to check if process exists
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    async removePID() {
        try {
            const currentPID = await this.readPID();
            if (currentPID === process.pid) {
                await fs.unlink(this.pidFile);
                logger.info(`Removed PID file ${this.pidFile}`);
            }
        } catch (error) {
            // Ignore errors during cleanup
        }
    }
    
    async cleanup() {
        // Remove stale PID files
        const pid = await this.readPID();
        if (pid && !await this.checkRunning(pid)) {
            logger.warn(`Removing stale PID file for ${this.serviceName} (PID ${pid} not running)`);
            await fs.unlink(this.pidFile).catch(() => {});
        }
    }
}

// 2. PM2 alternative to PID files
module.exports = {
    apps: [{
        name: 'spectrum-analyzer',
        script: './index.js',
        pid_file: '/home/pi/tmp/spectrum-analyzer.pid',
        
        // PM2 handles PID management
        instance_var: 'INSTANCE_ID',
        merge_logs: true,
        
        // Automatic PID cleanup
        kill_timeout: 3000,
        
        // Process monitoring
        min_uptime: '10s',
        max_restarts: 10
    }]
};
```

**PID File Health Check**:
```bash
#!/bin/bash
# check-pid-files.sh

PID_DIR="/home/pi/tmp"

check_pid_file() {
    local pidfile=$1
    local service=$2
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo "✓ $service (PID $pid) is running"
        else
            echo "✗ $service has stale PID file (PID $pid not found)"
            rm -f "$pidfile"
        fi
    else
        echo "- $service PID file not found"
    fi
}

# Check service PID files
check_pid_file "$PID_DIR/spectrum-analyzer.pid" "Spectrum Analyzer"
check_pid_file "$PID_DIR/wigle-to-tak.pid" "WigleToTAK"
check_pid_file "$PID_DIR/gps-bridge.pid" "GPS Bridge"

# Check PM2 processes
echo -e "\nPM2 Process Status:"
pm2 list
```

### 4.2 Log File Growth

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Likely (70%)  
**Impact**: Disk space exhaustion  

**Potential Issues**:
- Unlimited log growth
- No rotation configured
- Verbose debug logging
- Error log spam

**Mitigation Strategies**:
```javascript
// 1. Winston with rotation
const winston = require('winston');
require('winston-daily-rotate-file');

const createLogger = (serviceName) => {
    // File rotation transport
    const fileRotateTransport = new winston.transports.DailyRotateFile({
        filename: `logs/${serviceName}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        )
    });
    
    // Error file with size limit
    const errorFileTransport = new winston.transports.File({
        filename: `logs/${serviceName}-error.log`,
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true
    });
    
    // Console transport for development
    const consoleTransport = new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    });
    
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        transports: [
            fileRotateTransport,
            errorFileTransport,
            ...(process.env.NODE_ENV === 'development' ? [consoleTransport] : [])
        ],
        
        // Prevent exit on error
        exitOnError: false,
        
        // Handle uncaught exceptions
        exceptionHandlers: [
            new winston.transports.File({ 
                filename: `logs/${serviceName}-exceptions.log`,
                maxsize: 5242880, // 5MB
                maxFiles: 3
            })
        ]
    });
};

// 2. Log monitoring and cleanup
class LogManager {
    constructor(logDir = './logs') {
        this.logDir = logDir;
        this.maxTotalSize = 1073741824; // 1GB total
        
        // Schedule periodic cleanup
        setInterval(() => this.cleanup(), 3600000); // Every hour
    }
    
    async cleanup() {
        try {
            const files = await fs.readdir(this.logDir);
            let totalSize = 0;
            const fileStats = [];
            
            // Get file sizes and dates
            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const stats = await fs.stat(filePath);
                
                fileStats.push({
                    path: filePath,
                    size: stats.size,
                    mtime: stats.mtime
                });
                
                totalSize += stats.size;
            }
            
            // If over limit, remove oldest files
            if (totalSize > this.maxTotalSize) {
                logger.warn(`Log directory size (${totalSize} bytes) exceeds limit`);
                
                // Sort by modification time (oldest first)
                fileStats.sort((a, b) => a.mtime - b.mtime);
                
                // Remove oldest files until under limit
                for (const file of fileStats) {
                    if (totalSize <= this.maxTotalSize) break;
                    
                    // Don't remove today's logs
                    const age = Date.now() - file.mtime.getTime();
                    if (age > 86400000) { // 24 hours
                        await fs.unlink(file.path);
                        totalSize -= file.size;
                        logger.info(`Removed old log file: ${file.path}`);
                    }
                }
            }
        } catch (error) {
            logger.error('Log cleanup error:', error);
        }
    }
    
    async getLogStats() {
        const stats = {
            totalSize: 0,
            fileCount: 0,
            oldestFile: null,
            largestFile: null
        };
        
        try {
            const files = await fs.readdir(this.logDir);
            
            for (const file of files) {
                const filePath = path.join(this.logDir, file);
                const fileStat = await fs.stat(filePath);
                
                stats.totalSize += fileStat.size;
                stats.fileCount++;
                
                if (!stats.oldestFile || fileStat.mtime < stats.oldestFile.mtime) {
                    stats.oldestFile = { name: file, mtime: fileStat.mtime };
                }
                
                if (!stats.largestFile || fileStat.size > stats.largestFile.size) {
                    stats.largestFile = { name: file, size: fileStat.size };
                }
            }
        } catch (error) {
            logger.error('Error getting log stats:', error);
        }
        
        return stats;
    }
}

// 3. Rate-limited logging
class RateLimitedLogger {
    constructor(logger, windowMs = 60000) {
        this.logger = logger;
        this.windowMs = windowMs;
        this.messageCount = new Map();
        
        // Cleanup old entries periodically
        setInterval(() => this.cleanup(), windowMs);
    }
    
    log(level, message, ...args) {
        const key = `${level}:${message}`;
        const now = Date.now();
        
        const entry = this.messageCount.get(key) || { count: 0, firstSeen: now };
        entry.count++;
        
        // Log first occurrence and then every 10th
        if (entry.count === 1 || entry.count % 10 === 0) {
            this.logger[level](message, ...args, { 
                occurrences: entry.count,
                timePeriod: now - entry.firstSeen
            });
        }
        
        this.messageCount.set(key, entry);
    }
    
    cleanup() {
        const cutoff = Date.now() - this.windowMs;
        for (const [key, entry] of this.messageCount.entries()) {
            if (entry.firstSeen < cutoff) {
                this.messageCount.delete(key);
            }
        }
    }
}
```

**Log Management Script**:
```bash
#!/bin/bash
# manage-logs.sh

LOG_DIR="/home/pi/projects/stinkster_malone/stinkster/src/nodejs/logs"
MAX_SIZE_MB=1000  # 1GB total
ARCHIVE_DIR="$LOG_DIR/archive"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

# Get current log size
CURRENT_SIZE=$(du -sm "$LOG_DIR" | cut -f1)
echo "Current log directory size: ${CURRENT_SIZE}MB (limit: ${MAX_SIZE_MB}MB)"

# Archive old logs if needed
if [ "$CURRENT_SIZE" -gt "$MAX_SIZE_MB" ]; then
    echo "Log size exceeds limit, archiving old logs..."
    
    # Find logs older than 7 days
    find "$LOG_DIR" -name "*.log" -mtime +7 -print0 | while IFS= read -r -d '' file; do
        # Compress and move to archive
        gzip "$file"
        mv "$file.gz" "$ARCHIVE_DIR/"
        echo "Archived: $(basename "$file")"
    done
    
    # Remove archives older than 30 days
    find "$ARCHIVE_DIR" -name "*.gz" -mtime +30 -delete
fi

# Show log statistics
echo -e "\nLog Statistics:"
echo "Active logs:"
ls -lh "$LOG_DIR"/*.log 2>/dev/null | tail -5

echo -e "\nLargest logs:"
du -sh "$LOG_DIR"/*.log 2>/dev/null | sort -hr | head -5

# Check for errors in recent logs
echo -e "\nRecent errors (last 10):"
grep -i error "$LOG_DIR"/*-$(date +%Y-%m-%d).log 2>/dev/null | tail -10
```

### 4.3 CSV Parsing Errors

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Possible (40%)  
**Impact**: Data processing failures  

**Potential Issues**:
- Malformed CSV files
- Character encoding issues
- Large file handling
- Concurrent file access

**Mitigation Strategies**:
```javascript
// 1. Robust CSV parser
const csv = require('csv-parse');
const fs = require('fs');
const { pipeline } = require('stream');

class CSVProcessor {
    constructor(options = {}) {
        this.options = {
            maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
            encoding: options.encoding || 'utf-8',
            delimiter: options.delimiter || ',',
            columns: options.columns || true,
            skip_empty_lines: true,
            skip_records_with_error: true,
            maxRecordSize: 1024 * 1024 // 1MB per record
        };
        
        this.stats = {
            processed: 0,
            errors: 0,
            skipped: 0
        };
    }
    
    async processFile(filePath) {
        // Check file size
        const stats = await fs.promises.stat(filePath);
        if (stats.size > this.options.maxFileSize) {
            throw new Error(`File too large: ${stats.size} bytes (max: ${this.options.maxFileSize})`);
        }
        
        // Create backup before processing
        const backupPath = `${filePath}.backup`;
        await fs.promises.copyFile(filePath, backupPath);
        
        return new Promise((resolve, reject) => {
            const results = [];
            const errors = [];
            
            const parser = csv.parse({
                ...this.options,
                on_record: (record, context) => {
                    // Validate record
                    try {
                        const validated = this.validateRecord(record);
                        if (validated) {
                            results.push(validated);
                            this.stats.processed++;
                        } else {
                            this.stats.skipped++;
                        }
                    } catch (err) {
                        errors.push({ line: context.lines, error: err.message });
                        this.stats.errors++;
                    }
                }
            });
            
            parser.on('error', (err) => {
                logger.error('CSV parse error:', err);
                errors.push({ error: err.message });
            });
            
            parser.on('end', () => {
                if (errors.length > 0) {
                    logger.warn(`CSV processing completed with ${errors.length} errors`);
                }
                
                resolve({
                    data: results,
                    errors: errors,
                    stats: { ...this.stats }
                });
            });
            
            // Use stream to handle large files
            const stream = fs.createReadStream(filePath, {
                encoding: this.options.encoding,
                highWaterMark: 64 * 1024 // 64KB chunks
            });
            
            stream.pipe(parser);
        });
    }
    
    validateRecord(record) {
        // Example validation for Wigle CSV
        if (!record.MAC || !record.SSID) {
            return null; // Skip invalid records
        }
        
        // Sanitize data
        return {
            mac: this.sanitizeMAC(record.MAC),
            ssid: this.sanitizeSSID(record.SSID),
            firstSeen: this.parseTimestamp(record.FirstSeen),
            lastSeen: this.parseTimestamp(record.LastSeen),
            channel: parseInt(record.Channel) || 0,
            rssi: parseInt(record.RSSI) || -100,
            latitude: parseFloat(record.CurrentLatitude) || 0,
            longitude: parseFloat(record.CurrentLongitude) || 0,
            altitude: parseFloat(record.AltitudeMeters) || 0
        };
    }
    
    sanitizeMAC(mac) {
        // Remove non-hex characters and format
        return mac.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
            .match(/.{2}/g)?.join(':') || '';
    }
    
    sanitizeSSID(ssid) {
        // Limit length and remove control characters
        return ssid.substring(0, 32)
            .replace(/[\x00-\x1F\x7F]/g, '');
    }
    
    parseTimestamp(timestamp) {
        try {
            return new Date(timestamp).toISOString();
        } catch (err) {
            return new Date().toISOString();
        }
    }
}

// 2. File watcher with debouncing
class CSVWatcher {
    constructor(watchDir, processor) {
        this.watchDir = watchDir;
        this.processor = processor;
        this.processing = new Set();
        this.debounceTimers = new Map();
    }
    
    start() {
        fs.watch(this.watchDir, (eventType, filename) => {
            if (!filename || !filename.endsWith('.wiglecsv')) return;
            
            const filePath = path.join(this.watchDir, filename);
            
            // Debounce file changes
            if (this.debounceTimers.has(filePath)) {
                clearTimeout(this.debounceTimers.get(filePath));
            }
            
            this.debounceTimers.set(filePath, setTimeout(() => {
                this.processFile(filePath);
                this.debounceTimers.delete(filePath);
            }, 1000)); // Wait 1 second for file to stabilize
        });
        
        logger.info(`Watching directory: ${this.watchDir}`);
    }
    
    async processFile(filePath) {
        // Skip if already processing
        if (this.processing.has(filePath)) {
            logger.debug(`Already processing: ${filePath}`);
            return;
        }
        
        this.processing.add(filePath);
        
        try {
            // Wait for file to be fully written
            await this.waitForFileReady(filePath);
            
            logger.info(`Processing CSV file: ${filePath}`);
            const result = await this.processor.processFile(filePath);
            
            logger.info(`Processed ${result.stats.processed} records from ${filePath}`);
            
            if (result.errors.length > 0) {
                logger.warn(`Encountered ${result.errors.length} errors`);
            }
            
        } catch (error) {
            logger.error(`Failed to process ${filePath}:`, error);
        } finally {
            this.processing.delete(filePath);
        }
    }
    
    async waitForFileReady(filePath, maxWait = 5000) {
        const startTime = Date.now();
        let lastSize = 0;
        
        while (Date.now() - startTime < maxWait) {
            try {
                const stats = await fs.promises.stat(filePath);
                
                if (stats.size === lastSize && stats.size > 0) {
                    // File size stable and non-empty
                    return;
                }
                
                lastSize = stats.size;
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                if (error.code === 'ENOENT') {
                    throw new Error('File disappeared');
                }
                throw error;
            }
        }
        
        throw new Error('File not ready within timeout');
    }
}
```

**CSV Testing Script**:
```bash
#!/bin/bash
# test-csv-processing.sh

TEST_DIR="/tmp/csv-test"
mkdir -p "$TEST_DIR"

# Create test CSV with various edge cases
cat > "$TEST_DIR/test.wiglecsv" << 'EOF'
MAC,SSID,FirstSeen,LastSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters
00:11:22:33:44:55,Normal Network,2024-01-01 10:00:00,2024-01-01 10:05:00,6,-70,40.7128,-74.0060,10
AA:BB:CC:DD:EE:FF,"Network, with comma",2024-01-01 10:00:00,2024-01-01 10:05:00,11,-65,40.7128,-74.0060,10
invalid-mac,Invalid MAC,2024-01-01 10:00:00,2024-01-01 10:05:00,1,-80,40.7128,-74.0060,10
11:22:33:44:55:66,Very long SSID that exceeds the maximum allowed length and should be truncated,2024-01-01 10:00:00,2024-01-01 10:05:00,6,-75,40.7128,-74.0060,10
22:33:44:55:66:77,,2024-01-01 10:00:00,2024-01-01 10:05:00,0,0,0,0,0
EOF

# Test Node.js CSV processor
node -e "
const { CSVProcessor } = require('./src/nodejs/shared/utils/csv-processor');
const processor = new CSVProcessor();

processor.processFile('$TEST_DIR/test.wiglecsv')
    .then(result => {
        console.log('Processed:', result.stats.processed);
        console.log('Errors:', result.stats.errors);
        console.log('Skipped:', result.stats.skipped);
        console.log('Sample data:', result.data[0]);
    })
    .catch(err => console.error('Test failed:', err));
"

# Test with malformed CSV
echo "Testing malformed CSV..."
echo "This is not valid CSV data" > "$TEST_DIR/malformed.wiglecsv"
echo "!!!@#$%^&*()" >> "$TEST_DIR/malformed.wiglecsv"

# Test with large file
echo "Testing large file handling..."
for i in {1..10000}; do
    echo "00:11:22:33:44:55,Network$i,2024-01-01 10:00:00,2024-01-01 10:05:00,6,-70,40.7128,-74.0060,10"
done > "$TEST_DIR/large.wiglecsv"

ls -lh "$TEST_DIR/"
```

---

## 5. SECURITY RISKS

### 5.1 Command Injection

**Risk Level**: 🟠 **HIGH**  
**Likelihood**: Unlikely (15%)  
**Impact**: System compromise  

**Potential Issues**:
- Unsanitized shell command execution
- User input in system calls
- Environment variable injection
- Script parameter injection

**Mitigation Strategies**:
```javascript
// 1. Safe command execution
const { spawn } = require('child_process');
const path = require('path');

class SafeExecutor {
    constructor() {
        // Whitelist of allowed commands
        this.allowedCommands = new Map([
            ['kismet', '/usr/bin/kismet'],
            ['gpspipe', '/usr/bin/gpspipe'],
            ['systemctl', '/bin/systemctl']
        ]);
        
        // Allowed script paths
        this.allowedScripts = new Set([
            '/home/pi/Scripts/start_kismet.sh',
            '/home/pi/stinky/gps_kismet_wigle.sh'
        ]);
    }
    
    async executeCommand(command, args = []) {
        // Validate command
        if (!this.allowedCommands.has(command)) {
            throw new Error(`Command not allowed: ${command}`);
        }
        
        const commandPath = this.allowedCommands.get(command);
        
        // Validate arguments (no shell metacharacters)
        for (const arg of args) {
            if (this.containsShellMetacharacters(arg)) {
                throw new Error(`Invalid argument: ${arg}`);
            }
        }
        
        // Execute with spawn (no shell)
        return new Promise((resolve, reject) => {
            const child = spawn(commandPath, args, {
                shell: false, // Critical: no shell interpretation
                env: this.getSafeEnvironment()
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });
        });
    }
    
    executeScript(scriptPath, args = []) {
        // Validate script path
        const normalizedPath = path.normalize(scriptPath);
        
        if (!this.allowedScripts.has(normalizedPath)) {
            throw new Error(`Script not allowed: ${scriptPath}`);
        }
        
        // Validate script exists and is executable
        if (!fs.existsSync(normalizedPath)) {
            throw new Error(`Script not found: ${scriptPath}`);
        }
        
        return this.executeCommand('bash', [normalizedPath, ...args]);
    }
    
    containsShellMetacharacters(str) {
        // Check for shell metacharacters
        const dangerous = /[;&|`$()<>\\'"{}[\]*?~]/;
        return dangerous.test(str);
    }
    
    getSafeEnvironment() {
        // Return minimal safe environment
        return {
            PATH: '/usr/local/bin:/usr/bin:/bin',
            HOME: process.env.HOME,
            USER: process.env.USER,
            // Don't include sensitive vars
        };
    }
}

// 2. Input validation for API endpoints
const validator = require('joi');

const commandSchema = validator.object({
    action: validator.string().valid('start', 'stop', 'restart').required(),
    service: validator.string().valid('kismet', 'gps', 'spectrum').required(),
    options: validator.object().pattern(
        validator.string().alphanum(),
        validator.string().alphanum()
    ).optional()
});

app.post('/api/control', async (req, res) => {
    try {
        // Validate input
        const { error, value } = commandSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        
        // Map to safe commands
        const executor = new SafeExecutor();
        const result = await executor.executeCommand('systemctl', [
            value.action,
            `${value.service}.service`
        ]);
        
        res.json({ success: true, output: result.stdout });
        
    } catch (error) {
        logger.error('Command execution error:', error);
        res.status(500).json({ error: 'Command execution failed' });
    }
});
```

**Security Testing Script**:
```bash
#!/bin/bash
# test-command-injection.sh

API_URL="http://localhost:8000/api"

echo "Testing command injection vulnerabilities..."

# Test 1: Shell metacharacters
echo "Test 1: Shell metacharacters"
curl -X POST "$API_URL/control" \
    -H "Content-Type: application/json" \
    -d '{"action":"start","service":"kismet; cat /etc/passwd"}'

# Test 2: Command substitution
echo -e "\nTest 2: Command substitution"
curl -X POST "$API_URL/control" \
    -H "Content-Type: application/json" \
    -d '{"action":"start","service":"$(whoami)"}'

# Test 3: Path traversal
echo -e "\nTest 3: Path traversal"
curl -X POST "$API_URL/execute-script" \
    -H "Content-Type: application/json" \
    -d '{"script":"../../../etc/passwd"}'

# Test 4: Environment variable injection
echo -e "\nTest 4: Environment injection"
curl -X POST "$API_URL/control" \
    -H "Content-Type: application/json" \
    -d '{"action":"start","service":"kismet","options":{"PATH":"/tmp:$PATH"}}'

# Valid request for comparison
echo -e "\nValid request:"
curl -X POST "$API_URL/control" \
    -H "Content-Type: application/json" \
    -d '{"action":"start","service":"kismet"}'
```

### 5.2 Path Traversal

**Risk Level**: 🟠 **HIGH**  
**Likelihood**: Possible (30%)  
**Impact**: Unauthorized file access  

**Potential Issues**:
- User-controlled file paths
- Directory traversal sequences
- Symlink following
- Absolute path access

**Mitigation Strategies**:
```javascript
// 1. Safe file path handling
const path = require('path');
const fs = require('fs').promises;

class SafeFileHandler {
    constructor(baseDir) {
        this.baseDir = path.resolve(baseDir);
    }
    
    async readFile(userPath) {
        const safePath = this.sanitizePath(userPath);
        
        // Additional validation
        await this.validatePath(safePath);
        
        return fs.readFile(safePath, 'utf-8');
    }
    
    sanitizePath(userPath) {
        // Remove any null bytes
        userPath = userPath.replace(/\0/g, '');
        
        // Resolve to absolute path
        const resolved = path.resolve(this.baseDir, userPath);
        
        // Ensure it's within base directory
        if (!resolved.startsWith(this.baseDir)) {
            throw new Error('Path traversal attempt detected');
        }
        
        return resolved;
    }
    
    async validatePath(filePath) {
        try {
            // Check if path exists
            const stats = await fs.stat(filePath);
            
            // Don't follow symlinks
            if (stats.isSymbolicLink()) {
                throw new Error('Symbolic links not allowed');
            }
            
            // Check if it's a file (not directory)
            if (!stats.isFile()) {
                throw new Error('Not a regular file');
            }
            
            // Check file size (prevent DoS)
            if (stats.size > 10 * 1024 * 1024) { // 10MB
                throw new Error('File too large');
            }
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('File not found');
            }
            throw error;
        }
    }
}

// 2. Upload handling with validation
const multer = require('multer');
const crypto = require('crypto');

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    
    filename: (req, file, cb) => {
        // Generate safe filename
        const ext = path.extname(file.originalname);
        const name = crypto.randomBytes(16).toString('hex');
        cb(null, `${name}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        // Whitelist allowed extensions
        const allowedExts = ['.csv', '.wiglecsv', '.json', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (!allowedExts.includes(ext)) {
            return cb(new Error('File type not allowed'));
        }
        
        // Check MIME type
        const allowedMimes = ['text/csv', 'text/plain', 'application/json'];
        if (!allowedMimes.includes(file.mimetype)) {
            return cb(new Error('MIME type not allowed'));
        }
        
        cb(null, true);
    }
});

// 3. Directory listing protection
app.get('/api/files/:filename', async (req, res) => {
    try {
        const fileHandler = new SafeFileHandler('./data');
        const content = await fileHandler.readFile(req.params.filename);
        
        res.type('text/plain').send(content);
        
    } catch (error) {
        logger.error('File access error:', error);
        res.status(404).json({ error: 'File not found' });
    }
});
```

**Path Traversal Test**:
```bash
#!/bin/bash
# test-path-traversal.sh

API_URL="http://localhost:8000/api"

echo "Testing path traversal vulnerabilities..."

# Test various traversal attempts
PAYLOADS=(
    "../../../../etc/passwd"
    "..\\..\\..\\..\\windows\\system32\\config\\sam"
    "..//..//..//..//etc/passwd"
    "....//....//....//etc/passwd"
    "%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%65%74%63%2f%70%61%73%73%77%64"
    "..%252f..%252f..%252fetc%252fpasswd"
    "..%c0%af..%c0%af..%c0%afetc%c0%afpasswd"
    "/var/www/../../../../etc/passwd"
    "C:\\..\\..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
    "data/../../../../../../etc/passwd"
)

for payload in "${PAYLOADS[@]}"; do
    echo -e "\nTesting: $payload"
    curl -s "$API_URL/files/$payload" | head -n 3
done

# Test symlink
ln -s /etc/passwd /tmp/test-symlink
curl -s "$API_URL/files/test-symlink"

# Test absolute path
curl -s "$API_URL/files//etc/passwd"
```

### 5.3 CORS Vulnerabilities

**Risk Level**: 🟡 **MEDIUM**  
**Likelihood**: Likely (60%)  
**Impact**: Cross-origin attacks  

**Potential Issues**:
- Wildcard origin allowed
- Credentials with wildcard
- Improper origin validation
- Missing CORS headers

**Mitigation Strategies**:
```javascript
// 1. Secure CORS configuration
const cors = require('cors');

// Development vs Production CORS
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        // Whitelist of allowed origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:8080',
            'https://example.com',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        // Check exact match
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Check pattern match for subdomains
            const allowedPatterns = [
                /^https:\/\/.*\.example\.com$/,
                /^http:\/\/localhost:\d+$/
            ];
            
            const allowed = allowedPatterns.some(pattern => pattern.test(origin));
            
            if (allowed) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    
    credentials: true, // Allow cookies
    
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token'
    ],
    
    exposedHeaders: [
        'X-Total-Count',
        'X-Page-Number'
    ],
    
    maxAge: 86400, // 24 hours
    
    preflightContinue: false,
    
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// 2. Per-route CORS configuration
const strictCORS = cors({
    origin: 'https://trusted-domain.com',
    credentials: true
});

const publicCORS = cors({
    origin: '*',
    credentials: false
});

// Strict CORS for sensitive endpoints
app.post('/api/admin/*', strictCORS, (req, res) => {
    // Admin endpoints
});

// Public CORS for read-only data
app.get('/api/public/*', publicCORS, (req, res) => {
    // Public endpoints
});

// 3. WebSocket CORS
io.on('connection', (socket) => {
    const origin = socket.handshake.headers.origin;
    
    if (!isAllowedOrigin(origin)) {
        socket.disconnect();
        return;
    }
    
    // Handle WebSocket connection
});

function isAllowedOrigin(origin) {
    const allowed = [
        'http://localhost:3000',
        'https://example.com'
    ];
    
    return allowed.includes(origin);
}

// 4. CSRF protection
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.use(csrfProtection);

app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
```

**CORS Security Test**:
```bash
#!/bin/bash
# test-cors-security.sh

API_URL="http://localhost:8000"

echo "Testing CORS configuration..."

# Test 1: Different origins
ORIGINS=(
    "http://evil.com"
    "http://localhost:3000"
    "https://example.com"
    "null"
    "file://"
)

for origin in "${ORIGINS[@]}"; do
    echo -e "\nTesting origin: $origin"
    curl -s -I -X OPTIONS "$API_URL/api/status" \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: GET" | grep -E "(Access-Control-Allow-Origin|HTTP)"
done

# Test 2: Credentials with wildcard
echo -e "\nTesting credentials with wildcard:"
curl -s -I "$API_URL/api/status" \
    -H "Origin: http://evil.com" \
    -H "Cookie: session=test" | grep -E "Access-Control"

# Test 3: Preflight request
echo -e "\nTesting preflight:"
curl -s -I -X OPTIONS "$API_URL/api/admin/users" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: DELETE" \
    -H "Access-Control-Request-Headers: Authorization"
```

---

## 6. ROLLBACK PROCEDURES

### 6.1 Emergency Rollback Script

```bash
#!/bin/bash
# emergency-rollback.sh

set -e

echo "=== EMERGENCY ROLLBACK TO FLASK ==="
echo "Starting at: $(date)"

# 1. Stop all Node.js services
echo "Stopping Node.js services..."
pm2 delete all 2>/dev/null || true
pkill -f "node.*spectrum" || true
pkill -f "node.*wigle" || true
pkill -f "node.*gps" || true

# 2. Clear Node.js ports
echo "Clearing ports..."
for port in 8092 8000 2947; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

# 3. Restore Flask services
echo "Starting Flask services..."
sudo systemctl start hackrf-scanner
sudo systemctl start wigle-to-tak
sudo systemctl start gpsd

# 4. Verify Flask services
echo "Verifying Flask services..."
sleep 5

if curl -f http://localhost:8092/api/status > /dev/null 2>&1; then
    echo "✓ Spectrum Analyzer (Flask) is running"
else
    echo "✗ Spectrum Analyzer (Flask) FAILED TO START"
fi

if curl -f http://localhost:8000/api/status > /dev/null 2>&1; then
    echo "✓ WigleToTAK (Flask) is running"
else
    echo "✗ WigleToTAK (Flask) FAILED TO START"
fi

if pgrep gpsd > /dev/null; then
    echo "✓ GPSD is running"
else
    echo "✗ GPSD FAILED TO START"
fi

# 5. Restore configuration
echo "Restoring Flask configuration..."
cp /home/pi/backups/flask-config/* /home/pi/projects/stinkster_malone/stinkster/config/ 2>/dev/null || true

echo "=== ROLLBACK COMPLETE ==="
echo "Completed at: $(date)"
```

### 6.2 Gradual Rollback

```bash
#!/bin/bash
# gradual-rollback.sh

# Roll back one service at a time
rollback_service() {
    local service=$1
    local flask_service=$2
    local port=$3
    
    echo "Rolling back $service..."
    
    # Stop Node.js version
    pm2 stop $service
    pm2 delete $service
    
    # Start Flask version
    sudo systemctl start $flask_service
    
    # Verify
    sleep 3
    if curl -f http://localhost:$port/api/status > /dev/null 2>&1; then
        echo "✓ $service rolled back successfully"
    else
        echo "✗ $service rollback FAILED"
        return 1
    fi
}

# Roll back in order of importance
rollback_service "spectrum-analyzer" "hackrf-scanner" 8092
rollback_service "wigle-to-tak" "wigle-to-tak" 8000
rollback_service "gps-bridge" "gpsd" 2947
```

### 6.3 Data Preservation

```bash
#!/bin/bash
# preserve-data-rollback.sh

BACKUP_DIR="/home/pi/rollback-backup-$(date +%Y%m%d-%H%M%S)"

echo "Creating rollback backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Backup Node.js data
cp -r /home/pi/projects/stinkster_malone/stinkster/src/nodejs/logs "$BACKUP_DIR/"
cp -r /home/pi/projects/stinkster_malone/stinkster/src/nodejs/uploads "$BACKUP_DIR/"
cp -r /home/pi/projects/stinkster_malone/stinkster/src/nodejs/config "$BACKUP_DIR/"

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 "$BACKUP_DIR/"

# Export metrics
pm2 jlist > "$BACKUP_DIR/pm2-metrics.json"

# Create rollback report
cat > "$BACKUP_DIR/rollback-report.md" << EOF
# Rollback Report
Date: $(date)
Reason: [Fill in reason]

## Services Status Before Rollback
$(pm2 status)

## Performance Metrics
$(pm2 monit --lines 0)

## Recent Errors
$(grep ERROR /home/pi/projects/stinkster_malone/stinkster/src/nodejs/logs/*.log | tail -20)

## Actions Taken
1. Stopped Node.js services
2. Restored Flask services
3. Backed up data to $BACKUP_DIR
EOF

echo "Backup complete. Proceeding with rollback..."
./emergency-rollback.sh
```

---

## Risk Summary and Recommendations

### High Priority Actions (Before Production):

1. **Implement Rate Limiting**
   ```javascript
   npm install express-rate-limit
   // Add to all API endpoints
   ```

2. **Configure CORS Properly**
   ```javascript
   // Replace wildcard with specific origins
   cors({ origin: ['http://localhost:3000'] })
   ```

3. **Add Authentication**
   ```javascript
   npm install express-basic-auth
   // Protect admin endpoints
   ```

4. **Set Up Monitoring**
   ```bash
   # Install monitoring dashboard
   pm2 install pm2-logrotate
   pm2 web
   ```

### Continuous Monitoring:

1. **Performance Metrics**
   - Response time < 15ms
   - Memory usage < 100MB per service
   - CPU usage < 20%

2. **Error Rates**
   - API errors < 0.1%
   - WebSocket disconnections < 1%
   - Service restarts < 1/day

3. **Security Events**
   - Failed auth attempts
   - Invalid input attempts
   - CORS violations

### Emergency Contacts:

- **Primary**: System Administrator
- **Secondary**: DevOps Lead
- **Escalation**: Security Team

---

**Document Version**: 1.0.0  
**Created**: 2025-06-16  
**Last Updated**: 2025-06-16  
**Next Review**: 2025-06-23  
**Risk Assessment Status**: COMPLETE ✅
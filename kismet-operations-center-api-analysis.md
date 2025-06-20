# Kismet Operations Center API Compatibility Report

**Date:** 2025-06-16  
**Analysis Target:** HTML Kismet Operations Center Interface  
**Existing Server:** Node.js Spectrum Analyzer (port 8092)  
**Analyst:** Claude Code for Christian  

---

## Executive Summary

After comprehensive analysis of the codebase, **no existing HTML Kismet Operations Center interface was found**. The current system consists of:

1. **Spectrum Analyzer Interface** (port 8092) - HackRF/OpenWebRX integration
2. **WigleToTAK Interface** (port 8000) - WiFi scanning to TAK conversion  

This report outlines the required API endpoints to create a comprehensive Kismet Operations Center for service management.

---

## Current Node.js Server Analysis

### Existing API Endpoints (port 8092)

The spectrum analyzer server at `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/spectrum-analyzer/server.js` provides:

#### Configuration Endpoints
```javascript
GET  /api/config          // Get current spectrum analyzer configuration
POST /api/config          // Update spectrum analyzer configuration
```

#### Status & Monitoring
```javascript
GET  /api/status           // Get system status and connection info
GET  /api/signals          // Get detected signals with optional threshold
GET  /api/signals/stats    // Get signal detection statistics
```

#### OpenWebRX Integration
```javascript
POST /api/connect          // Connect to OpenWebRX WebSocket
POST /api/disconnect       // Disconnect from OpenWebRX
```

#### FFT Data Management
```javascript
GET  /api/fft/latest       // Get latest FFT data
POST /api/fft/clear        // Clear FFT buffer
```

#### Legacy Compatibility
```javascript
GET  /api/profiles         // Get scan profiles (VHF, UHF, ISM)
GET  /api/scan/:profileId  // Scan specific profile
```

#### WebSocket Events
```javascript
// Real-time data streams
'fftData'                  // FFT spectrum data
'signalsDetected'          // Detected signals
'openwebrxConnected'       // OpenWebRX connection status
'openwebrxDisconnected'    // OpenWebRX disconnection
'openwebrxError'           // OpenWebRX errors
'configUpdated'            // Configuration changes
'bufferCleared'            // Buffer cleared events
```

---

## Required Kismet Operations Center Endpoints

### Service Control Endpoints

```javascript
// Kismet Service Management
POST /api/kismet/start                 // Start Kismet service
POST /api/kismet/stop                  // Stop Kismet service  
POST /api/kismet/restart               // Restart Kismet service
GET  /api/kismet/status                // Get Kismet service status
GET  /api/kismet/logs                  // Get Kismet logs (last N lines)

// GPS Service Management
POST /api/gps/start                    // Start GPS/MAVLink bridge
POST /api/gps/stop                     // Stop GPS/MAVLink bridge
GET  /api/gps/status                   // Get GPS service status
POST /api/gps/restart                  // Restart GPS service

// System Service Management
POST /api/services/start-all           // Start GPS + Kismet + WigleToTAK
POST /api/services/stop-all            // Stop all services
GET  /api/services/status-all          // Get status of all services
```

### Configuration Management

```javascript
// Kismet Configuration
GET  /api/kismet/config                // Get Kismet configuration
POST /api/kismet/config                // Update Kismet configuration
POST /api/kismet/interface/set         // Set WiFi interface (e.g., wlan2)
GET  /api/kismet/interfaces            // List available WiFi interfaces

// GPS Configuration  
GET  /api/gps/config                   // Get GPS/MAVLink configuration
POST /api/gps/config                   // Update GPS configuration
```

### Monitoring & Status

```javascript
// Real-time Monitoring
GET  /api/monitor/processes            // Get running process PIDs
GET  /api/monitor/system               // Get system resource usage
GET  /api/monitor/wifi-adapters        // Get WiFi adapter status
GET  /api/monitor/gps-location         // Get current GPS coordinates

// File System Monitoring
GET  /api/files/wigle-csv              // List available WigleCSV files
GET  /api/files/kismet-logs            // List Kismet log files
GET  /api/files/system-logs            // List system log files
```

### WebSocket Real-time Events

```javascript
// Service Status Events
'kismetStarted'                        // Kismet service started
'kismetStopped'                        // Kismet service stopped
'kismetError'                          // Kismet service error
'gpsConnected'                         // GPS service connected
'gpsDisconnected'                      // GPS service disconnected
'systemAlert'                          // System-level alerts

// Data Events  
'wifiDevicesDetected'                  // New WiFi devices found
'gpsLocationUpdate'                    // GPS position update
'systemResourceUpdate'                 // CPU/Memory usage update
```

---

## Implementation Requirements

### 1. Service Control Implementation

```javascript
// Service management using systemctl and custom scripts
const { exec } = require('child_process');
const path = require('path');

class KismetService {
  async startKismet(interface = 'wlan2') {
    // Execute: /home/pi/Scripts/start_kismet.sh
    // Monitor PID file: /home/pi/tmp/kismet.pid
  }
  
  async stopKismet() {
    // Execute: pkill -f "kismet"
    // Clean up PID files
  }
  
  async getStatus() {
    // Check process: pgrep -f "kismet"
    // Return: { running: boolean, pid: number, uptime: string }
  }
}
```

### 2. GPS Service Integration

```javascript
class GPSService {
  async startGPS() {
    // Execute: source /home/pi/gpsmav/GPSmav/venv/bin/activate && ./mavgps.py
    // Monitor GPSD port 2947
  }
  
  async getLocation() {
    // Connect to GPSD: gpspipe -w -n 1
    // Return: { lat: number, lon: number, alt: number, time: string }
  }
}
```

### 3. File System Integration

```javascript
class FileSystem {
  async listWigleFiles() {
    // Scan: /home/pi/kismet_ops/ for *.wiglecsv
    // Return: Array of file objects with metadata
  }
  
  async getLogs(service, lines = 50) {
    // Read logs: tail -n ${lines} /home/pi/tmp/${service}.log
    // Return: Array of log entries
  }
}
```

### 4. WiFi Interface Management

```javascript
class WiFiInterface {
  async listInterfaces() {
    // Execute: iw dev
    // Return: Array of available WiFi interfaces
  }
  
  async setMonitorMode(interface) {
    // Execute: sudo ip link set ${interface} down
    // Execute: sudo iw dev ${interface} set monitor none
    // Execute: sudo ip link set ${interface} up
  }
}
```

---

## Frontend Requirements

### HTML Interface Components

```html
<!-- Service Control Panel -->
<div class="service-controls">
  <h2>🛡️ Kismet Operations Center</h2>
  
  <!-- Service Status Dashboard -->
  <div class="status-panel">
    <div class="service-status" id="kismet-status">
      <h3>Kismet Service</h3>
      <span class="status-indicator">●</span>
      <span class="status-text">Stopped</span>
      <button id="start-kismet">Start</button>
      <button id="stop-kismet">Stop</button>
    </div>
    
    <div class="service-status" id="gps-status">
      <h3>GPS Service</h3>
      <span class="status-indicator">●</span>
      <span class="status-text">Disconnected</span>
      <button id="start-gps">Start</button>
      <button id="stop-gps">Stop</button>
    </div>
  </div>
  
  <!-- WiFi Interface Selection -->
  <div class="interface-selection">
    <h3>WiFi Interface</h3>
    <select id="wifi-interface">
      <option value="wlan2">wlan2 (Primary)</option>
    </select>
    <button id="set-monitor-mode">Set Monitor Mode</button>
  </div>
  
  <!-- Quick Actions -->
  <div class="quick-actions">
    <button id="start-all" class="primary">🚀 Start All Services</button>
    <button id="stop-all" class="danger">⏹️ Stop All Services</button>
  </div>
</div>

<!-- System Monitoring -->
<div class="monitoring-panel">
  <h3>📊 System Monitoring</h3>
  <div id="system-stats">
    <div>CPU: <span id="cpu-usage">--</span>%</div>
    <div>Memory: <span id="memory-usage">--</span>%</div>
    <div>WiFi Devices: <span id="wifi-device-count">--</span></div>
    <div>GPS Fix: <span id="gps-fix">No Fix</span></div>
  </div>
</div>

<!-- Log Viewer -->
<div class="log-viewer">
  <h3>📋 Live Logs</h3>
  <select id="log-source">
    <option value="kismet">Kismet</option>
    <option value="gps">GPS Service</option>
    <option value="system">System</option>
  </select>
  <div id="log-output" class="log-container"></div>
</div>
```

### JavaScript Client Requirements

```javascript
class KismetOperationsCenter {
  constructor() {
    this.socket = io();
    this.services = {
      kismet: { running: false, pid: null },
      gps: { running: false, connected: false }
    };
  }
  
  async startKismet() {
    const response = await fetch('/api/kismet/start', { method: 'POST' });
    const result = await response.json();
    this.updateServiceStatus('kismet', result);
  }
  
  async stopKismet() {
    const response = await fetch('/api/kismet/stop', { method: 'POST' });
    const result = await response.json();
    this.updateServiceStatus('kismet', result);
  }
  
  initializeWebSocket() {
    this.socket.on('kismetStarted', (data) => {
      this.updateServiceStatus('kismet', { running: true, pid: data.pid });
    });
    
    this.socket.on('wifiDevicesDetected', (data) => {
      this.updateWiFiDeviceCount(data.count);
    });
    
    this.socket.on('gpsLocationUpdate', (data) => {
      this.updateGPSStatus(data);
    });
  }
}
```

---

## Migration Plan

### Phase 1: Core Service Control
1. Implement basic Kismet start/stop endpoints
2. Add GPS service management
3. Create service status monitoring
4. Basic HTML interface for service control

### Phase 2: Advanced Monitoring
1. Real-time WebSocket events
2. System resource monitoring
3. Log file viewing
4. WiFi interface management

### Phase 3: Integration
1. Connect with existing Spectrum Analyzer
2. Integrate with WigleToTAK interface
3. Unified dashboard
4. Cross-service coordination

### Phase 4: Enhanced Features
1. Automated service orchestration
2. Configuration backup/restore
3. Performance metrics
4. Alert notifications

---

## Compatibility Assessment

### ✅ Compatible Components
- Express.js server framework
- Socket.IO WebSocket implementation  
- JSON API responses
- Static file serving
- CORS and security middleware

### 🔄 Modifications Needed
- Add service management endpoints
- Implement system command execution
- Add file system monitoring
- Create real-time event system
- Develop service orchestration logic

### ⚠️ Security Considerations
- Sanitize system command inputs
- Implement authentication for service control
- Restrict file system access
- Rate limiting for service operations
- Audit logging for service changes

---

## Estimated Implementation Effort

| Component | Complexity | Time Estimate |
|-----------|------------|---------------|
| Service Control API | Medium | 4-6 hours |
| WebSocket Events | Low | 2-3 hours |
| HTML Interface | Medium | 3-4 hours |
| System Monitoring | High | 6-8 hours |
| Integration Testing | Medium | 3-4 hours |
| **Total** | **Medium-High** | **18-25 hours** |

---

## Next Steps

1. **Create Service Control Endpoints** - Implement basic Kismet/GPS service management
2. **Build HTML Interface** - Create operations center dashboard  
3. **Add Real-time Monitoring** - WebSocket events for service status
4. **System Integration** - Connect with existing spectrum analyzer
5. **Testing & Validation** - Ensure reliable service control

---

## Files to Create/Modify

### New Files Required
```
/src/nodejs/spectrum-analyzer/lib/kismetService.js
/src/nodejs/spectrum-analyzer/lib/gpsService.js  
/src/nodejs/spectrum-analyzer/lib/systemMonitor.js
/src/nodejs/spectrum-analyzer/views/operations-center.html
/src/nodejs/spectrum-analyzer/public/js/operations-center.js
/src/nodejs/spectrum-analyzer/public/css/operations-center.css
```

### Files to Modify
```
/src/nodejs/spectrum-analyzer/server.js        // Add new API endpoints
/src/nodejs/spectrum-analyzer/package.json     // Add dependencies
```

---

**Conclusion:** The existing Node.js server provides a solid foundation for implementing a Kismet Operations Center. The main work involves adding service management capabilities, system monitoring, and a dedicated operations interface. All required functionality can be implemented using the existing Express.js and Socket.IO infrastructure.
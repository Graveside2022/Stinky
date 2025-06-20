# Frontend-Backend Integration Mapping Report

## Executive Summary

This document maps all critical integration points between the current frontend implementations and backend services in the Stinkster system. This analysis is crucial for updating the frontend to match the new `/var/www/html/hi.html` design while preserving all backend functionality.

## Current System Architecture

### 1. Primary Services and Ports

- **Kismet Operations Center**: Port 8092 (Node.js - Main service)
- **WigleToTAK**: Port 8000 (Node.js) 
- **GPS Bridge**: Port 2947 (GPSD)
- **Kismet**: Port 2501 (Direct API)
- **OpenWebRX**: Port 8073 (Docker container)
- **Legacy Python Webhook**: Port 5000 (webhook.py - still running)

### 2. Frontend Files Analyzed

1. **New Target Design**: `/var/www/html/hi.html`
2. **Current Kismet Operations**: `/src/nodejs/kismet-operations/views/hi.html`
3. **Spectrum Analyzer**: `/src/nodejs/public/spectrum/index.html`
4. **WigleToTAK**: `/src/nodejs/wigle-to-tak/views/WigleToTAK.html`

## Critical Integration Points

### A. API Endpoints (REST)

#### 1. System Information & Status
```javascript
// Current Implementation (kismet-operations/index.js)
GET /info                    // System info (GPS, IP, status)
GET /script-status          // Running scripts status
GET /api/status            // Service status
GET /health               // Health check

// Used by hi.html frontend:
- fetch('/info') → Updates GPS coordinates, IP address
- fetch('/script-status') → Shows Kismet/Wigle running status
```

#### 2. Script Management
```javascript
// Current Implementation
POST /run-script           // Start services (Kismet, WigleToTAK, etc.)
POST /stop-script         // Stop services

// Frontend usage:
- Starts/stops Kismet and WigleToTAK services
- Updates status indicators (green/red dots)
```

#### 3. Kismet Data Integration
```javascript
// Current Implementation
GET /kismet-data          // Proxied Kismet device data

// Direct Kismet API (used by some components):
GET http://10.42.0.1:2501/devices/all_devices.json
GET http://10.42.0.1:2501/networks/all_networks.json
GET http://10.42.0.1:2501/system/status.json
```

#### 4. Spectrum Analyzer Specific
```javascript
GET /api/profiles         // Scan profiles (VHF, UHF, ISM)
GET /api/scan/:profileId  // Perform frequency scan
```

#### 5. WigleToTAK Specific
```javascript
POST /api/list-files      // List .wiglecsv files
POST /api/upload         // Upload CSV files
POST /api/start-broadcast // Start TAK broadcasting
POST /api/stop-broadcast  // Stop TAK broadcasting
POST /api/update-settings // Update TAK server config
GET /api/status          // Broadcasting status
```

### B. WebSocket Connections

#### 1. Spectrum Analyzer WebSocket
```javascript
// Socket.IO implementation
socket.on('connect')      // Connection established
socket.on('status')       // System status updates
socket.on('fft_data')     // Real-time FFT spectrum data
socket.on('error')        // Error notifications

// Emits:
- 'status': Service status
- 'fft_data': Real-time spectrum data
```

#### 2. Script Output WebSocket
```javascript
// Real-time script output streaming
socket.on('script_output')  // Script stdout/stderr
socket.on('script_exit')    // Script termination
```

### C. Data Flow Patterns

#### 1. GPS Data Flow
```
MAVLink Device → mavgps.py → GPSD (2947) → Kismet → /info endpoint → Frontend
```

#### 2. WiFi Scanning Flow
```
Kismet → .wiglecsv files → WigleToTAK → TAK UDP broadcast (6969)
         ↓
     /kismet-data API → Frontend display
```

#### 3. Spectrum Analysis Flow
```
HackRF → OpenWebRX → WebSocket → Spectrum Analyzer → Frontend Canvas
```

### D. Frontend Service Dependencies

#### 1. Hard-coded URLs in hi.html (new design)
```javascript
// These need to be made relative/configurable:
fetch('http://100.68.185.86:5000/info')
fetch('http://100.68.185.86:5000/kismet-data')
fetch('http://10.42.0.1:5000/run-script')
fetch('http://10.42.0.1:5000/stop-script')
fetch('http://10.42.0.1:5000/script-status')

// Kismet iframe:
src="http://10.42.0.1:2501"

// External links:
href="http://10.42.0.1:2501"  // Kismet Web UI
href="http://10.42.0.1:8000"  // WigleToTAK
```

#### 2. Current Backend Routes (kismet-operations)
```javascript
// All endpoints are relative in current implementation:
fetch('/info')
fetch('/kismet-data')
fetch('/run-script')
fetch('/stop-script')
fetch('/script-status')
```

### E. Form Submissions & User Inputs

#### 1. No Traditional Forms
- All interactions use JavaScript fetch() or WebSocket
- No `<form>` elements with action attributes

#### 2. User Controls
```javascript
// Button clicks trigger JavaScript functions:
onclick="startKismet()"
onclick="stopKismet()"
onclick="addLoadProfile()"
onclick="hackRFSweep()"
onclick="toggleMinimize(this)"
```

### F. Session & State Management

#### 1. No Server-side Sessions
- All state managed client-side
- No cookies or session storage used

#### 2. Persistent Connections
- WebSocket maintains connection state
- Auto-reconnect on disconnect

## Critical Integration Points to Preserve

### 1. Essential API Endpoints

**MUST PRESERVE:**
- `/info` - System status and GPS data
- `/script-status` - Service running status
- `/run-script` - Start services
- `/stop-script` - Stop services
- `/kismet-data` - Device feed data

**OPTIONAL (Feature-specific):**
- `/api/profiles` - Spectrum analyzer profiles
- `/api/scan/:id` - Spectrum scanning
- WigleToTAK endpoints - Only if preserving that UI

### 2. WebSocket Events

**MUST PRESERVE:**
- Basic connection/disconnection handling
- Status updates for real-time feedback
- Script output streaming (if showing logs)

### 3. External Service URLs

**MUST UPDATE TO RELATIVE:**
```javascript
// Change from:
fetch('http://100.68.185.86:5000/info')
// To:
fetch('/info')

// Change from:
fetch('http://10.42.0.1:5000/run-script') 
// To:
fetch('/run-script')
```

### 4. Service Status Indicators

**MUST PRESERVE:**
- Kismet running status (green/red dot)
- WigleToTAK running status
- GPS status and coordinates display
- IP address display

## Migration Strategy

### 1. URL Updates Required

```javascript
// Create a config object for all endpoints:
const API_CONFIG = {
    baseUrl: window.location.origin,
    endpoints: {
        info: '/info',
        scriptStatus: '/script-status',
        runScript: '/run-script',
        stopScript: '/stop-script',
        kismetData: '/kismet-data'
    },
    external: {
        kismetUI: 'http://10.42.0.1:2501',
        wigleToTak: 'http://10.42.0.1:8000'
    }
};
```

### 2. Preserve Core Functionality

1. **Status Updates**: Keep 5-second interval updates
2. **Script Control**: Maintain start/stop functionality  
3. **Data Display**: Show Kismet device feed
4. **GPS Info**: Display location and status

### 3. Backend Compatibility

The current Node.js backend (kismet-operations) already provides all required endpoints. No backend changes needed if we:
- Update frontend URLs to relative paths
- Ensure frontend is served from same port (8092)
- Keep the same endpoint names

## Conclusion

The new hi.html frontend can be successfully integrated with the existing backend by:

1. Updating all hardcoded URLs to relative paths
2. Ensuring the HTML is served from the kismet-operations service (port 8092)
3. Preserving the core JavaScript functionality for status updates and script control
4. Maintaining the same API endpoint structure

The backend is already fully compatible and requires no modifications. Only the frontend URLs and deployment location need adjustment.
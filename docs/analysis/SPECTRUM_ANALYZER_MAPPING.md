# Spectrum Analyzer File Structure Mapping

Generated: 2025-06-16T08:20:00Z
User: Christian

## Overview

The spectrum analyzer functionality has been migrated from a standalone Python Flask application to being integrated into the Node.js kismet-operations service. This document maps out all spectrum analyzer related files and their purposes.

## Current Architecture

### Primary Implementation (Node.js - ACTIVE)

**Location**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/`
**Port**: 8092 (as defined in server.js)
**Status**: Integrated into kismet-operations service

#### Key Files:

1. **server.js** (Main server file)
   - Serves spectrum analyzer UI at root path (/)
   - Includes spectrum analyzer API endpoints
   - Uses Socket.IO for real-time data
   - Configuration validation with Joi (already included in package.json)

2. **lib/spectrumCore.js**
   - Core spectrum analyzer logic
   - WebSocket connection to OpenWebRX
   - FFT buffer management
   - Real-time data processing

3. **views/spectrum.html**
   - Main UI for spectrum analyzer
   - Uses Socket.IO client for real-time updates
   - Plotly.js for visualization
   - Styled with hacker/terminal aesthetic

4. **public/js/spectrum.js**
   - Client-side JavaScript for spectrum analyzer
   - WebSocket communication handling

5. **public/css/spectrum.css**
   - Spectrum analyzer specific styles

### Legacy Implementation (Python Flask - INACTIVE)

**Location**: `/home/pi/projects/stinkster_malone/stinkster/src/hackrf/`
**Port**: 5000 (historically)
**Status**: Legacy code, not currently in use

#### Files:

1. **spectrum_analyzer.py**
   - Original Python Flask implementation
   - WebSocket connection to OpenWebRX
   - Signal detection and scanning profiles

2. **templates/spectrum.html**
   - Original HTML template (identical to Node.js version)

3. **spectrum.png** & **waterfall.png**
   - Generated visualization images

## Service Configuration

### Systemd Service Issue

**File**: `/home/pi/projects/stinkster_malone/stinkster/systemd/spectrum-analyzer-optimized.service`
**Issue**: Points to non-existent directory `/src/nodejs/spectrum-analyzer`
**Fix Required**: Should point to `/src/nodejs/kismet-operations`

### Correct Service Path

The spectrum analyzer is now part of kismet-operations and should be started using:
- **Working Directory**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations`
- **Start Script**: `start-optimized.sh`
- **Service Name**: Should be `kismet-operations` not `spectrum-analyzer`

## API Endpoints (Node.js Implementation)

1. **GET /** - Serves spectrum analyzer UI
2. **GET /api/config** - Get current configuration
3. **POST /api/config** - Update configuration (validated with Joi)
4. **GET /api/status** - Get current status
5. **POST /api/connect** - Connect to OpenWebRX WebSocket
6. **POST /api/disconnect** - Disconnect from OpenWebRX
7. **GET /api/profiles** - Get scan profiles
8. **POST /api/scan/:profile** - Start frequency scan
9. **POST /api/scan/stop** - Stop frequency scan
10. **GET /api/signals** - Get detected signals

## WebSocket Events

- **spectrum_data** - Real-time FFT data
- **config_update** - Configuration changes
- **status_update** - Connection status updates
- **signal_detected** - Signal detection events
- **scan_progress** - Scan progress updates

## Dependencies

### Node.js (Already in package.json)
- express
- socket.io
- ws (WebSocket client)
- joi (validation)
- winston (logging)
- cors
- helmet

### Python (Legacy, in requirements.txt)
- flask
- flask-socketio
- websockets
- numpy
- requests

## Migration Status

✅ **Completed**:
- Core spectrum analyzer logic ported to Node.js
- WebSocket integration with OpenWebRX
- Real-time data streaming via Socket.IO
- API endpoints implemented
- UI served from kismet-operations

⚠️ **Issues to Address**:
1. Systemd service file points to wrong directory
2. No separate spectrum-analyzer directory exists
3. Service should be unified under kismet-operations

## Recommendations

1. **Remove Legacy Code**: The Python spectrum_analyzer.py is no longer needed
2. **Fix Systemd Service**: Update to point to kismet-operations
3. **Unify Services**: Spectrum analyzer is already part of kismet-operations on port 8092
4. **Update Documentation**: References to standalone spectrum analyzer should be updated

## Access Points

- **Web UI**: http://localhost:8092/
- **API Base**: http://localhost:8092/api/
- **WebSocket**: ws://localhost:8092/socket.io/

## Testing

To verify spectrum analyzer is working:
```bash
# Check if service is running
sudo systemctl status kismet-operations

# Or start manually
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations
node server.js

# Access UI
curl http://localhost:8092/api/status
```
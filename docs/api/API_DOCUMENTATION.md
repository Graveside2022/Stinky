# API Documentation

This document provides comprehensive API documentation for the Stinkster Malone system, including the Kismet Operations Center (port 8003) and related services.

## Table of Contents

- [Overview](#overview)
- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [REST API Endpoints](#rest-api-endpoints)
  - [Health & Status](#health--status)
  - [Script Management](#script-management)
  - [Spectrum Analyzer](#spectrum-analyzer)
  - [Kismet Integration](#kismet-integration)
  - [Configuration Management](#configuration-management)
  - [Legacy Endpoints](#legacy-endpoints)
- [WebSocket API](#websocket-api)
- [Proxy Endpoints](#proxy-endpoints)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

The Stinkster Malone system provides a unified interface for SDR operations, WiFi scanning, GPS tracking, and TAK integration. The main API server runs on port 8003 and provides both REST and WebSocket interfaces.

## Base URLs

- **Development**: `http://localhost:8002`
- **Production**: `http://<raspberry-pi-ip>:8002`
- **Tailscale**: `http://<tailscale-ip>:8002`

## Authentication

Currently, the API does not require authentication for most endpoints. However, Kismet proxy endpoints include Basic Authentication:
- Username: `admin`
- Password: `admin`

## REST API Endpoints

### Health & Status

#### GET /health
Check the health status of the server.

**Response:**
```json
{
  "status": "healthy",
  "service": "kismet-operations",
  "timestamp": "2025-01-21T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 50331648,
    "heapTotal": 35913728,
    "heapUsed": 20123456,
    "external": 1234567
  },
  "port": 8003,
  "version": "2.0.0",
  "openwebrx_connected": false,
  "fft_buffer_size": 0,
  "connected_clients": 2
}
```

#### GET /api/status
Get detailed status of the spectrum analyzer.

**Response:**
```json
{
  "connected": false,
  "buffer_size": 0,
  "last_update": null,
  "config": {
    "fft_size": 0,
    "center_freq": 145000000,
    "samp_rate": 2400000,
    "fft_compression": "none",
    "signal_threshold": -70
  },
  "signal_count": 0,
  "server_uptime": 3600,
  "connected_clients": 2,
  "mode": "DEMO MODE",
  "openwebrx_connected": false,
  "real_data": false,
  "fft_buffer_size": 0,
  "last_fft_time": null
}
```

#### GET /script-status
Get the status of running services.

**Response:**
```json
{
  "kismet_running": true,
  "wigle_running": true,
  "gps_running": true,
  "timestamp": "2025-01-21T12:00:00.000Z"
}
```

### Script Management

#### POST /run-script
Start Kismet and related services.

**Request Body:**
```json
{
  "script_name": "gps_kismet_wigle",
  "args": []
}
```

**Supported Scripts:**
- `gps_kismet_wigle` - Start all services (GPS + Kismet + WigleToTAK)
- `smart_restart` - Smart restart with args: ["start"]
- `stop_restart_services` - Stop services with args: ["stop"]

**Response:**
```json
{
  "success": true,
  "status": "success",
  "message": "Script started successfully",
  "script": "gps_kismet_wigle",
  "pid": 12345,
  "timestamp": "2025-01-21T12:00:00.000Z"
}
```

#### POST /stop-script
Stop all running services.

**Response:**
```json
{
  "status": "success",
  "message": "Kismet services stopped successfully",
  "script": "gps_kismet_wigle",
  "stopped": true,
  "results": [
    {
      "cmd": "pkill -f \"gps_kismet_wigle\"",
      "success": true,
      "stdout": ""
    }
  ],
  "timestamp": "2025-01-21T12:00:00.000Z"
}
```

#### POST /api/start-script
Alternative endpoint for starting scripts with more control.

**Request Body:**
```json
{
  "scriptName": "gps_kismet_wigle.sh"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Script gps_kismet_wigle.sh started successfully",
  "processId": 12345,
  "scriptPath": "/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh",
  "startTime": "2025-01-21T12:00:00.000Z",
  "detached": false
}
```

#### POST /api/stop-script
Alternative endpoint for stopping the active script.

**Response:**
```json
{
  "success": true,
  "message": "Stop signal sent to script",
  "processId": 12345
}
```

#### GET /api/script-status
Get the status of the currently running script.

**Response:**
```json
{
  "success": true,
  "isRunning": true,
  "activeProcess": {
    "pid": 12345,
    "killed": false
  }
}
```

### Spectrum Analyzer

#### POST /api/connect
Connect to OpenWebRX WebSocket for spectrum data.

**Request Body:**
```json
{
  "url": "ws://localhost:8073/ws/"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection initiated to OpenWebRX",
  "url": "ws://localhost:8073/ws/"
}
```

#### POST /api/disconnect
Disconnect from OpenWebRX.

**Response:**
```json
{
  "success": true,
  "message": "Disconnected from OpenWebRX"
}
```

#### GET /api/signals
Get detected signals from the spectrum analyzer.

**Query Parameters:**
- `threshold` (optional): Signal detection threshold in dBm (default: -70)

**Response:**
```json
{
  "signals": [
    {
      "frequency": 145000000,
      "power": -65.5,
      "bandwidth": 12500,
      "snr": 15.2,
      "confidence": 0.85,
      "timestamp": 1642598400000
    }
  ],
  "threshold": -70,
  "timestamp": 1642598400000,
  "fft_buffer_size": 1024,
  "real_data": true,
  "signal_count": 1
}
```

#### GET /api/signals/stats
Get signal detection statistics.

**Response:**
```json
{
  "total_signals": 150,
  "average_power": -72.5,
  "peak_power": -45.2,
  "frequency_range": {
    "min": 144000000,
    "max": 148000000
  },
  "detection_rate": 0.15,
  "last_detection": "2025-01-21T12:00:00.000Z"
}
```

#### GET /api/fft/latest
Get the latest FFT data.

**Response:**
```json
{
  "success": true,
  "data": {
    "fft": [/* array of FFT values */],
    "timestamp": 1642598400000,
    "center_freq": 145000000,
    "samp_rate": 2400000
  },
  "buffer_size": 1024
}
```

#### POST /api/fft/clear
Clear the FFT buffer.

**Response:**
```json
{
  "success": true,
  "message": "FFT buffer cleared successfully"
}
```

### Kismet Integration

#### GET /kismet-data
Get formatted Kismet data for the frontend.

**Response:**
```json
{
  "devices_count": 25,
  "networks_count": 10,
  "recent_devices": [
    {
      "mac": "AA:BB:CC:DD:EE:FF",
      "manufacturer": "Apple",
      "type": "WiFi Client",
      "lastSeen": "2025-01-21T12:00:00.000Z",
      "signal": -65
    }
  ],
  "feed_items": [
    {
      "type": "Device",
      "message": "Detected WiFi Client: AA:BB:CC:DD:EE:FF (Apple)",
      "timestamp": "2025-01-21T12:00:00.000Z"
    }
  ]
}
```

#### GET /api/kismet-data
Get raw Kismet data with statistics.

**Response:**
```json
{
  "success": true,
  "source": "kismet",
  "timestamp": 1642598400000,
  "data": {
    "devices": [
      {
        "mac": "AA:BB:CC:DD:EE:FF",
        "last_seen": 1642598400,
        "signal": {
          "kismet.common.signal.last_signal": -65,
          "kismet.common.signal.max_signal": -55,
          "kismet.common.signal.min_signal": -75
        },
        "manufacturer": "Apple",
        "type": "WiFi Client",
        "channel": 6,
        "frequency": 2437000000,
        "packets": 1234,
        "datasize": 567890,
        "location": {
          "lat": 37.7749,
          "lon": -122.4194
        }
      }
    ],
    "networks": [
      {
        "ssid": "Home-WiFi",
        "bssid": "11:22:33:44:55:66",
        "channel": 6,
        "frequency": 2437000000,
        "encryption": "WPA2",
        "last_seen": 1642598400,
        "signal": {
          "kismet.common.signal.last_signal": -55
        },
        "clients": 5
      }
    ],
    "timestamp": 1642598400000
  },
  "stats": {
    "total_devices": 25,
    "total_networks": 10,
    "kismet_connected": true
  }
}
```

### Configuration Management

#### GET /api/config
Get current spectrum analyzer configuration.

**Response:**
```json
{
  "fft_size": 0,
  "center_freq": 145000000,
  "samp_rate": 2400000,
  "fft_compression": "none",
  "signal_threshold": -70,
  "signal_processing": {
    "enabled": true,
    "algorithm": "peak",
    "window_size": 10,
    "overlap": 0.5
  }
}
```

#### POST /api/config
Update spectrum analyzer configuration.

**Request Body:**
```json
{
  "center_freq": 146000000,
  "samp_rate": 2400000,
  "signal_threshold": -75
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "config": {
    "fft_size": 0,
    "center_freq": 146000000,
    "samp_rate": 2400000,
    "fft_compression": "none",
    "signal_threshold": -75
  }
}
```

### Legacy Endpoints

#### GET /api/profiles
Get available scan profiles.

**Response:**
```json
{
  "vhf": {
    "name": "VHF Amateur (144-148 MHz)",
    "ranges": [[144.0, 148.0]],
    "step": 25,
    "description": "VHF Amateur Radio Band"
  },
  "uhf": {
    "name": "UHF Amateur (420-450 MHz)",
    "ranges": [[420.0, 450.0]],
    "step": 25,
    "description": "UHF Amateur Radio Band"
  },
  "ism": {
    "name": "ISM Band (2.4 GHz)",
    "ranges": [[2400.0, 2485.0]],
    "step": 1000,
    "description": "Industrial, Scientific, Medical Band"
  }
}
```

#### GET /api/scan/:profileId
Scan a specific frequency profile.

**Parameters:**
- `profileId`: One of `vhf`, `uhf`, or `ism`

**Response:**
```json
{
  "profile": {
    "name": "VHF Amateur (144-148 MHz)",
    "ranges": [[144.0, 148.0]],
    "step": 25
  },
  "signals": [
    {
      "id": "signal-145000000",
      "frequency": 145000000,
      "strength": "-65.5",
      "power": -65.5,
      "bandwidth": "12.5",
      "confidence": 0.85,
      "type": "real"
    }
  ],
  "scan_time": 1642598400000,
  "real_data": true
}
```

### Utility Endpoints

#### GET /info
Get client IP and GPS information.

**Response:**
```json
{
  "ip": "192.168.1.100",
  "gps": {
    "status": "Connected",
    "lat": "37.7749",
    "lon": "-122.4194",
    "alt": "15.0m",
    "time": "2025-01-21T12:00:00.000Z"
  }
}
```

#### GET /debug-ip
Debug endpoint for IP detection.

**Response:**
```json
{
  "req.ip": "192.168.1.100",
  "req.ips": [],
  "x-forwarded-for": "192.168.1.100",
  "x-real-ip": "192.168.1.100",
  "x-forwarded-host": "localhost:8002",
  "connection.remoteAddress": "::ffff:192.168.1.100",
  "socket.remoteAddress": "::ffff:192.168.1.100",
  "trust proxy setting": true,
  "all headers": {
    "host": "localhost:8002",
    "user-agent": "Mozilla/5.0..."
  }
}
```

## WebSocket API

Connect to the WebSocket endpoint at `ws://localhost:8002/socket.io/`.

### Events (Server to Client)

#### status
Server status update.
```json
{
  "connected": false,
  "buffer_size": 0,
  "last_update": null,
  "config": { /* configuration object */ }
}
```

#### fftData
Real-time FFT data from OpenWebRX.
```json
{
  "fft": [/* array of FFT values */],
  "timestamp": 1642598400000,
  "center_freq": 145000000,
  "samp_rate": 2400000
}
```

#### signalsDetected
Detected signals above threshold.
```json
{
  "signals": [/* array of signal objects */],
  "timestamp": 1642598400000,
  "threshold": -70
}
```

#### kismetData
Kismet WiFi scanning data.
```json
{
  "success": true,
  "source": "kismet",
  "timestamp": 1642598400000,
  "data": {
    "devices": [/* array of devices */],
    "networks": [/* array of networks */]
  },
  "stats": {
    "total_devices": 25,
    "total_networks": 10,
    "kismet_connected": true
  }
}
```

#### kismetDataUpdate
Automatic Kismet data updates (if polling enabled).

#### openwebrxConnected
OpenWebRX connection established.

#### openwebrxDisconnected
OpenWebRX connection lost.

#### openwebrxError
OpenWebRX error occurred.
```json
{
  "error": "Connection timeout"
}
```

#### configUpdated
Configuration was updated.

#### bufferCleared
FFT buffer was cleared.

### Events (Client to Server)

#### requestStatus
Request current status.

#### requestLatestFFT
Request latest FFT data.

#### requestSignals
Request signal detection.
```json
{
  "threshold": -75
}
```

#### requestKismetData
Request latest Kismet data.

## Proxy Endpoints

### Kismet API Proxy
All Kismet API endpoints are proxied through `/api/kismet/*`.

Example: `GET /api/kismet/system/status.json` → `GET http://localhost:2501/system/status.json`

### WigleToTak API Proxy
All WigleToTak API endpoints are proxied through `/api/wigle/*`.

Example: `GET /api/wigle/status` → `GET http://localhost:8000/status`

### Kismet Web Interface
The full Kismet web interface is available at `/kismet/` (note the trailing slash).

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2025-01-21T12:00:00.000Z"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `403` - Forbidden (script not allowed)
- `404` - Not Found
- `409` - Conflict (script already running)
- `500` - Internal Server Error
- `502` - Bad Gateway (proxy errors)
- `504` - Gateway Timeout

## Examples

### Starting Services
```bash
curl -X POST http://localhost:8002/run-script \
  -H "Content-Type: application/json" \
  -d '{"script_name": "gps_kismet_wigle"}'
```

### Checking Service Status
```bash
curl http://localhost:8002/script-status
```

### Getting Kismet Data
```bash
curl http://localhost:8002/kismet-data
```

### WebSocket Connection (JavaScript)
```javascript
const socket = io('http://localhost:8002');

socket.on('connect', () => {
  console.log('Connected to server');
  socket.emit('requestStatus');
});

socket.on('kismetData', (data) => {
  console.log('Received Kismet data:', data);
});

socket.on('fftData', (data) => {
  console.log('FFT data:', data);
});
```

### Python WebSocket Client
```python
import socketio

sio = socketio.Client()

@sio.on('connect')
def on_connect():
    print('Connected to server')
    sio.emit('requestKismetData')

@sio.on('kismetData')
def on_kismet_data(data):
    print(f"Devices: {data['stats']['total_devices']}")
    print(f"Networks: {data['stats']['total_networks']}")

sio.connect('http://localhost:8002')
sio.wait()
```

## Environment Variables

The server supports the following environment variables:

- `PORT` - Server port (default: 8003)
- `KISMET_URL` - Kismet API URL (default: http://localhost:2501)
- `KISMET_API_KEY` - Kismet API key (optional)
- `KISMET_TIMEOUT` - Kismet request timeout in ms (default: 5000)
- `KISMET_AUTO_POLLING` - Enable automatic Kismet polling (default: false)
- `KISMET_POLL_INTERVAL` - Polling interval in ms (default: 5000)
- `OPENWEBRX_WS_URL` - Auto-connect to OpenWebRX on startup

## CORS Configuration

The server includes comprehensive CORS support for cross-origin requests. All endpoints accept requests from any origin by default.

Headers included:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With`
- `Access-Control-Allow-Credentials: true`

## Rate Limiting

Currently, there are no rate limits implemented. Consider implementing rate limiting for production deployments.

## Security Considerations

1. The API currently runs without authentication (except for Kismet proxy)
2. All endpoints are accessible from any origin (CORS: *)
3. Script execution is limited to a whitelist of allowed scripts
4. Consider implementing:
   - API key authentication
   - Rate limiting
   - Request validation
   - HTTPS in production
   - More restrictive CORS policies
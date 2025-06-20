# Webhook Service API Specification

## Overview

The webhook service provides endpoints for managing Kismet and GPS operations, including starting/stopping services, monitoring status, and retrieving Kismet data. This specification defines all endpoints that need to be migrated from the Flask implementation to Express.js.

## Base URL

- Development: `http://localhost:8092`
- Production: `http://10.42.0.1:8092`

## Authentication

Currently, no authentication is implemented. For production deployment, consider implementing:
- API key authentication via `X-API-Key` header
- JWT tokens for session management
- Rate limiting per IP address

## CORS Configuration

```javascript
{
  origin: "*",  // Development - restrict in production
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-API-Key"],
  credentials: true
}
```

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error description",
  "details": "Additional context if available",
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

## API Endpoints

### 1. Run Script

**Endpoint**: `POST /api/webhook/run-script`

**Description**: Starts Kismet and/or GPS services based on the script type.

**Request Body**:
```json
{
  "script": "kismet" | "gps" | "both",
  "options": {
    "interface": "wlan0",  // Optional, default: wlan0
    "config": "custom.conf"  // Optional
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Script started successfully",
  "script": "kismet",
  "pid": 12345,
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "INVALID_SCRIPT",
  "message": "Invalid script type specified",
  "details": "Valid options are: kismet, gps, both"
}
```

**Response** (409 Conflict):
```json
{
  "success": false,
  "error": "ALREADY_RUNNING",
  "message": "Script is already running",
  "details": "PID: 12345"
}
```

**Response** (500 Internal Server Error):
```json
{
  "success": false,
  "error": "EXECUTION_FAILED",
  "message": "Failed to start script",
  "details": "Permission denied or script not found"
}
```

**Implementation Notes**:
- Check if service is already running before starting
- Store PID in `/tmp/kismet-operations/` directory
- Use child_process.spawn() for non-blocking execution
- Implement proper signal handling for cleanup

### 2. Stop Script

**Endpoint**: `POST /api/webhook/stop-script`

**Description**: Stops running Kismet and/or GPS services.

**Request Body**:
```json
{
  "script": "kismet" | "gps" | "both",
  "force": false  // Optional, force kill if true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Script stopped successfully",
  "script": "kismet",
  "pid": 12345,
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "error": "NOT_RUNNING",
  "message": "Script is not running",
  "details": "No PID file found"
}
```

**Response** (500 Internal Server Error):
```json
{
  "success": false,
  "error": "STOP_FAILED",
  "message": "Failed to stop script",
  "details": "Process may require manual termination"
}
```

**Implementation Notes**:
- Send SIGTERM first, then SIGKILL if force=true
- Clean up PID files after stopping
- Wait for process to actually terminate
- Handle zombie processes

### 3. Get Script Status

**Endpoint**: `GET /api/webhook/script-status`

**Description**: Returns the current status of Kismet and GPS services.

**Query Parameters**:
- `script` (optional): Filter by specific script (kismet, gps)

**Response** (200 OK):
```json
{
  "success": true,
  "status": {
    "kismet": {
      "running": true,
      "pid": 12345,
      "uptime": 3600,  // seconds
      "startTime": "2025-06-16T11:00:00.000Z",
      "memory": {
        "rss": 156250000,  // bytes
        "vms": 512000000   // bytes
      },
      "cpu": 15.5  // percentage
    },
    "gps": {
      "running": false,
      "pid": null,
      "lastRunTime": "2025-06-16T10:00:00.000Z",
      "lastExitCode": 0
    }
  },
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

**Implementation Notes**:
- Check process existence using PID
- Read /proc/[pid]/stat for resource usage
- Cache status for 5 seconds to reduce system calls
- Include last known state for stopped services

### 4. Get System Information

**Endpoint**: `GET /api/webhook/info`

**Description**: Returns system information and service configuration.

**Response** (200 OK):
```json
{
  "success": true,
  "system": {
    "hostname": "raspberrypi",
    "platform": "linux",
    "arch": "arm64",
    "uptime": 86400,  // seconds
    "loadAverage": [0.15, 0.10, 0.05],
    "memory": {
      "total": 4294967296,  // bytes
      "free": 2147483648,
      "used": 2147483648,
      "percentage": 50
    },
    "disk": {
      "total": 32212254720,  // bytes
      "free": 16106127360,
      "used": 16106127360,
      "percentage": 50
    }
  },
  "services": {
    "kismet": {
      "version": "2023.07.R1",
      "configPath": "/etc/kismet/kismet.conf",
      "dataPath": "/home/pi/kismet_data",
      "interfaces": ["wlan0", "wlan1"]
    },
    "gps": {
      "device": "/dev/ttyUSB0",
      "baudRate": 9600,
      "protocol": "NMEA"
    },
    "spectrum": {
      "version": "2.0.0",
      "port": 8092,
      "openwebrxConnected": true
    }
  },
  "network": {
    "interfaces": [
      {
        "name": "wlan0",
        "address": "192.168.1.100",
        "mac": "b8:27:eb:00:00:00",
        "type": "wireless",
        "monitoring": true
      }
    ]
  },
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

**Implementation Notes**:
- Use os module for system stats
- Parse Kismet config files for version info
- Check network interfaces with child_process
- Cache static info for 60 seconds

### 5. Get Kismet Data

**Endpoint**: `GET /api/webhook/kismet-data`

**Description**: Retrieves recent data from Kismet including detected devices and networks.

**Query Parameters**:
- `type`: Data type (`devices`, `networks`, `alerts`, `all`)
- `limit`: Maximum number of results (default: 100, max: 1000)
- `since`: ISO timestamp for filtering recent data
- `format`: Response format (`json`, `csv`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "mac": "AA:BB:CC:DD:EE:FF",
        "firstSeen": "2025-06-16T11:00:00.000Z",
        "lastSeen": "2025-06-16T12:00:00.000Z",
        "manufacturer": "Apple, Inc.",
        "type": "Wi-Fi Client",
        "packets": 1234,
        "dataBytes": 567890,
        "signal": {
          "last": -65,
          "min": -80,
          "max": -45
        },
        "location": {
          "lat": 40.7128,
          "lon": -74.0060,
          "accuracy": 10
        }
      }
    ],
    "networks": [
      {
        "ssid": "MyNetwork",
        "bssid": "11:22:33:44:55:66",
        "channel": 6,
        "frequency": 2437,
        "encryption": "WPA2",
        "firstSeen": "2025-06-16T10:00:00.000Z",
        "lastSeen": "2025-06-16T12:00:00.000Z",
        "clients": 5,
        "packets": 5678,
        "signal": {
          "last": -55,
          "min": -70,
          "max": -40
        }
      }
    ],
    "alerts": [
      {
        "id": "alert-001",
        "type": "APSPOOF",
        "severity": "high",
        "timestamp": "2025-06-16T11:30:00.000Z",
        "message": "Possible AP spoofing detected",
        "details": {
          "ssid": "FakeNetwork",
          "mac": "XX:XX:XX:XX:XX:XX"
        }
      }
    ],
    "summary": {
      "totalDevices": 150,
      "totalNetworks": 25,
      "activeAlerts": 3,
      "dataRange": {
        "start": "2025-06-16T11:00:00.000Z",
        "end": "2025-06-16T12:00:00.000Z"
      }
    }
  },
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

**Response** (503 Service Unavailable):
```json
{
  "success": false,
  "error": "KISMET_UNAVAILABLE",
  "message": "Kismet service is not running or not responding",
  "details": "Start Kismet using /api/webhook/run-script"
}
```

**Implementation Notes**:
- Connect to Kismet REST API (default: http://localhost:2501)
- Implement pagination for large datasets
- Cache responses for 10 seconds
- Support CSV export for data analysis
- Handle Kismet authentication if configured

### 6. WebSocket Events

**Connection**: `ws://localhost:8092/webhook`

#### Client to Server Events:

**Subscribe to Updates**:
```json
{
  "event": "subscribe",
  "data": {
    "channels": ["status", "devices", "alerts"]
  }
}
```

**Request Status**:
```json
{
  "event": "requestStatus",
  "data": {
    "script": "kismet"
  }
}
```

#### Server to Client Events:

**Status Update**:
```json
{
  "event": "statusUpdate",
  "data": {
    "script": "kismet",
    "status": "running",
    "pid": 12345,
    "uptime": 3600
  }
}
```

**New Device Detected**:
```json
{
  "event": "newDevice",
  "data": {
    "mac": "AA:BB:CC:DD:EE:FF",
    "timestamp": "2025-06-16T12:00:00.000Z",
    "signal": -65,
    "type": "Wi-Fi Client"
  }
}
```

**Alert Notification**:
```json
{
  "event": "alert",
  "data": {
    "id": "alert-002",
    "type": "DEAUTH_FLOOD",
    "severity": "critical",
    "message": "Deauthentication flood detected",
    "timestamp": "2025-06-16T12:00:00.000Z"
  }
}
```

## Implementation Architecture

### Directory Structure
```
lib/
├── webhook/
│   ├── index.js          # Main webhook service
│   ├── routes.js         # Express route definitions
│   ├── scriptManager.js  # Process management
│   ├── kismetClient.js  # Kismet API integration
│   └── websocket.js     # WebSocket handlers
```

### Key Classes and Methods

```javascript
// lib/webhook/scriptManager.js
class ScriptManager {
  constructor() {
    this.scripts = new Map();
    this.pidDir = '/tmp/kismet-operations';
  }
  
  async startScript(scriptName, options = {}) {
    // Implementation
  }
  
  async stopScript(scriptName, force = false) {
    // Implementation
  }
  
  async getStatus(scriptName = null) {
    // Implementation
  }
  
  async checkProcess(pid) {
    // Implementation
  }
}

// lib/webhook/kismetClient.js
class KismetClient {
  constructor(config) {
    this.baseUrl = config.kismetUrl || 'http://localhost:2501';
    this.apiKey = config.apiKey;
  }
  
  async getDevices(options = {}) {
    // Implementation
  }
  
  async getNetworks(options = {}) {
    // Implementation
  }
  
  async getAlerts(since = null) {
    // Implementation
  }
  
  async streamData(callback) {
    // Implementation
  }
}
```

## Security Considerations

1. **Input Validation**:
   - Validate all script names against whitelist
   - Sanitize command options
   - Limit request sizes

2. **Process Isolation**:
   - Run scripts with minimal privileges
   - Use separate user account for services
   - Implement resource limits

3. **API Security**:
   - Implement rate limiting (100 req/min)
   - Add API key authentication for production
   - Log all script execution attempts

4. **File System Security**:
   - Restrict PID file locations
   - Validate all file paths
   - Prevent directory traversal

## Performance Optimization

1. **Caching Strategy**:
   - Cache system info for 60 seconds
   - Cache Kismet data for 10 seconds
   - Cache process status for 5 seconds

2. **Resource Management**:
   - Limit concurrent script executions
   - Implement connection pooling for Kismet API
   - Use streaming for large data responses

3. **WebSocket Optimization**:
   - Throttle updates to max 10/second
   - Batch multiple updates
   - Implement backpressure handling

## Testing Requirements

### Unit Tests
- Script execution and termination
- PID file management
- Error handling scenarios
- Input validation

### Integration Tests
- Kismet API connectivity
- Process lifecycle management
- WebSocket event flow
- Concurrent request handling

### Performance Tests
- Load test with 100 concurrent connections
- Memory usage under sustained load
- Response time benchmarks
- WebSocket scalability

## Migration Checklist

- [ ] Create webhook service structure
- [ ] Implement script management
- [ ] Add Kismet API integration
- [ ] Implement all REST endpoints
- [ ] Add WebSocket support
- [ ] Create comprehensive error handling
- [ ] Add logging and monitoring
- [ ] Write unit tests
- [ ] Perform integration testing
- [ ] Update frontend to use new endpoints
- [ ] Document deployment procedures
- [ ] Create monitoring dashboards

## Compatibility Notes

### Breaking Changes from Flask Version
- None - API maintained for compatibility

### Frontend Updates Required
- Change base URL from Flask port to Node.js port
- Update WebSocket connection string
- Add error handling for new error formats

### Backward Compatibility
- All endpoints maintain same URL structure
- Response formats unchanged
- Error codes consistent with Flask version
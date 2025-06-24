# Stinkster Service Control API Documentation

## Overview

The Stinkster Service Control API provides REST endpoints for controlling the main Stinkster backend services and monitoring system health. This API is designed to be consumed by the Svelte frontend for service management operations.

**Base URL**: `http://localhost:8080` (configurable)

## Features

- **Service Control**: Start, stop, and restart main Stinkster services
- **Status Monitoring**: Get real-time service and system status
- **Health Checks**: Monitor system resources and service health
- **CORS Support**: Configured for frontend integration
- **Error Handling**: Comprehensive error responses with proper HTTP status codes

## API Endpoints

### Health Check

#### `GET /health`

Basic health check endpoint for the API server itself.

**Response:**
```json
{
  "status": "healthy",
  "service": "stinkster-service-control-api",
  "timestamp": "2025-06-23T20:00:00.000Z",
  "uptime": 1234.567,
  "memory": {
    "rss": 45678912,
    "heapTotal": 23456789,
    "heapUsed": 12345678
  },
  "pid": 12345
}
```

### Service Management

#### `POST /api/services/start`

Start all Stinkster services (GPS, Kismet, WigleToTAK).

**Request Body:** None required

**Response (Success):**
```json
{
  "success": true,
  "message": "Services start initiated successfully",
  "details": {
    "pid": 12345,
    "message": "Services starting",
    "output": "..."
  },
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

**Response (Already Running):**
```json
{
  "success": false,
  "error": "ALREADY_RUNNING",
  "message": "Services are already running",
  "details": {
    "running": true,
    "pids": [12345, 12346, 12347]
  },
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

#### `POST /api/services/stop`

Stop all running Stinkster services.

**Request Body:**
```json
{
  "force": false  // Optional: use SIGKILL instead of SIGTERM
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Services stopped successfully",
  "details": {
    "processesKilled": 3,
    "signal": "SIGTERM",
    "results": [
      { "pid": 12345, "signal": "SIGTERM", "status": "sent" },
      { "pid": 12346, "signal": "SIGTERM", "status": "sent" }
    ]
  },
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

**Response (Not Running):**
```json
{
  "success": false,
  "error": "NOT_RUNNING",
  "message": "Services are not running",
  "details": "No active processes found",
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

#### `POST /api/services/restart`

Restart all Stinkster services (stop + start).

**Request Body:**
```json
{
  "force": false  // Optional: force stop before restart
}
```

**Response:** Same as start endpoint

### Status Monitoring

#### `GET /api/services/status`

Get detailed status of all Stinkster services.

**Response:**
```json
{
  "success": true,
  "running": true,
  "totalPids": 4,
  "runningPids": 4,
  "pids": [12345, 12346, 12347, 12348],
  "services": {
    "gps": {
      "running": true,
      "pids": [12345],
      "pid": 12345,
      "cpu": 0.5,
      "memory": {
        "percentage": 1.2,
        "rss": 8388608,
        "vms": 16777216
      },
      "uptime": "00:15:30"
    },
    "kismet": {
      "running": true,
      "pids": [12346],
      "pid": 12346,
      "cpu": 2.1,
      "memory": {
        "percentage": 3.4,
        "rss": 25165824,
        "vms": 50331648
      },
      "uptime": "00:15:25"
    },
    "wigletotak": {
      "running": true,
      "pids": [12347],
      "pid": 12347,
      "cpu": 0.8,
      "memory": {
        "percentage": 2.1,
        "rss": 12582912,
        "vms": 25165824
      },
      "uptime": "00:15:20"
    },
    "gpsd": {
      "running": true,
      "pids": [12348],
      "pid": 12348,
      "cpu": 0.1,
      "memory": {
        "percentage": 0.5,
        "rss": 4194304,
        "vms": 8388608
      },
      "uptime": "00:15:35"
    }
  },
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

### System Health

#### `GET /api/system/health`

Get comprehensive system health information.

**Response:**
```json
{
  "success": true,
  "system": {
    "hostname": "raspberrypi",
    "uptime": 86400,
    "loadAverage": [1.5, 1.2, 1.0],
    "memory": {
      "total": 4294967296,
      "free": 2147483648,
      "used": 2147483648,
      "percentage": 50
    },
    "disk": {
      "total": 32212254720,
      "used": 16106127360,
      "available": 16106127360,
      "percentage": 50
    },
    "temperature": {
      "celsius": 45.2,
      "fahrenheit": 113.4
    }
  },
  "services": {
    "gps": { "running": true },
    "kismet": { "running": true },
    "wigletotak": { "running": true },
    "gpsd": { "running": true }
  },
  "overall": {
    "healthy": true
  },
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

### Service Logs

#### `GET /api/services/logs`

Get recent service log entries.

**Query Parameters:**
- `lines` (optional): Number of log lines to return (default: 100)

**Response:**
```json
{
  "success": true,
  "logs": [
    "2025-06-23 20:00:00 - All services started!",
    "2025-06-23 20:00:05 - Kismet started with PID: 12346",
    "2025-06-23 20:00:10 - GPS fix acquired"
  ],
  "lineCount": 3,
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

### Network Information

#### `GET /api/system/interfaces`

Get network interface information.

**Response:**
```json
{
  "success": true,
  "interfaces": [
    {
      "name": "eth0",
      "address": "192.168.1.100",
      "mac": "b8:27:eb:12:34:56",
      "type": "ethernet",
      "monitoring": false
    },
    {
      "name": "wlan0",
      "address": "192.168.1.101",
      "mac": "b8:27:eb:ab:cd:ef",
      "type": "wireless",
      "monitoring": false
    },
    {
      "name": "wlan2",
      "address": "192.168.1.102",
      "mac": "00:c0:ca:12:34:56",
      "type": "wireless",
      "monitoring": true
    }
  ],
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

### Root Endpoint

#### `GET /`

API information and endpoint discovery.

**Response:**
```json
{
  "service": "Stinkster Service Control API",
  "version": "1.0.0",
  "description": "API for controlling Stinkster backend services",
  "endpoints": {
    "health": "GET /health",
    "services": {
      "start": "POST /api/services/start",
      "stop": "POST /api/services/stop",
      "restart": "POST /api/services/restart",
      "status": "GET /api/services/status",
      "logs": "GET /api/services/logs"
    },
    "system": {
      "health": "GET /api/system/health",
      "interfaces": "GET /api/system/interfaces"
    }
  },
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": "Additional error details",
  "timestamp": "2025-06-23T20:00:00.000Z"
}
```

### Common Error Codes

- `ALREADY_RUNNING`: Services are already running
- `NOT_RUNNING`: Services are not running
- `START_FAILED`: Failed to start services
- `STOP_FAILED`: Failed to stop services
- `RESTART_FAILED`: Failed to restart services
- `STATUS_FAILED`: Failed to get service status
- `HEALTH_CHECK_FAILED`: Failed to get system health
- `SCRIPT_NOT_FOUND`: Main orchestration script not found
- `NOT_FOUND`: Endpoint not found (404)
- `INTERNAL_SERVER_ERROR`: Unexpected server error

## CORS Configuration

The API is configured with CORS support for the following origins:

- `http://localhost:3000` (Svelte dev server)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:8000` (WigleToTAK)
- `http://localhost:8001` (Main UI)
- `http://localhost:8002` (Alternative UI port)
- Local network IPs (192.168.x.x, 10.x.x.x)
- Custom frontend URL via `FRONTEND_URL` environment variable

## Usage Examples

### Starting Services from Frontend

```javascript
async function startServices() {
  try {
    const response = await fetch('http://localhost:8080/api/services/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Services started successfully');
    } else {
      console.error('Failed to start services:', result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

### Getting Service Status

```javascript
async function getServiceStatus() {
  try {
    const response = await fetch('http://localhost:8080/api/services/status');
    const status = await response.json();
    
    if (status.success) {
      return status;
    } else {
      throw new Error(status.message);
    }
  } catch (error) {
    console.error('Failed to get status:', error);
    throw error;
  }
}
```

### Monitoring System Health

```javascript
async function checkSystemHealth() {
  try {
    const response = await fetch('http://localhost:8080/api/system/health');
    const health = await response.json();
    
    if (health.success && health.overall.healthy) {
      return health;
    } else {
      console.warn('System health issues detected');
      return health;
    }
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
}
```

## Running the API Server

### Quick Start

```bash
# Start the API server
cd /home/pi/projects/stinkster_christian/stinkster/src/nodejs
node service-control-api.js

# Or use the startup script
./start-service-control-api.sh start
```

### Configuration Options

```bash
# Custom port
node service-control-api.js --port=8081

# Debug mode
node service-control-api.js --debug

# Environment variables
API_PORT=8081 node service-control-api.js
FRONTEND_URL=http://192.168.1.50:3000 node service-control-api.js
```

### Management Script

```bash
# Start API
./start-service-control-api.sh start

# Stop API
./start-service-control-api.sh stop

# Restart API
./start-service-control-api.sh restart

# Check status
./start-service-control-api.sh status

# View logs
./start-service-control-api.sh logs

# Run tests
./start-service-control-api.sh test
```

## Testing

Test the API endpoints:

```bash
# Run comprehensive test suite
node test-service-control-api.js

# Test with custom URL
node test-service-control-api.js --url=http://192.168.1.100:8080

# Wait for server and then test
node test-service-control-api.js --wait
```

## Integration with Svelte Frontend

The API is designed for seamless integration with Svelte applications:

1. **Service Control**: Call start/stop/restart endpoints based on user actions
2. **Status Polling**: Regularly poll `/api/services/status` for real-time updates
3. **Health Monitoring**: Monitor system health with `/api/system/health`
4. **Error Handling**: Display user-friendly error messages from API responses

The API handles all the complexity of process management, PID tracking, and system monitoring, providing a clean interface for the frontend to consume.
# Kismet API Documentation

## Overview

The Kismet API provides comprehensive REST endpoints for managing Kismet wireless monitoring operations, device tracking, script execution, configuration management, and system monitoring.

Base URL: `http://localhost:[PORT]/api/kismet`

## Authentication

Currently, the API uses environment variables for Kismet authentication:
- `KISMET_API_KEY`: API key for Kismet server authentication

## API Endpoints

### Service Management

#### Start Kismet Service
```http
POST /service/start
```

**Response:**
```json
{
  "success": true,
  "message": "Service started successfully"
}
```

#### Stop Kismet Service
```http
POST /service/stop
```

#### Restart Kismet Service
```http
POST /service/restart
```

#### Get Service Status
```http
GET /service/status
```

**Response:**
```json
{
  "running": true,
  "service": "kismet",
  "pid": 12345,
  "memory": "125.5 MB"
}
```

### Device Management

#### List All Devices
```http
GET /devices?page=1&limit=100&sort=kismet.device.base.last_time&order=desc
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 100)
- `sort` (string): Sort field
- `order` (string): Sort order (asc/desc)
- `phyname` (string|array): Filter by PHY type
- `deviceType` (string|array): Filter by device type
- `minSignal` (number): Minimum signal strength
- `maxSignal` (number): Maximum signal strength
- `lastSeen` (number): Unix timestamp for last seen filter
- `firstSeen` (number): Unix timestamp for first seen filter
- `channels` (array): Filter by channels
- `datasource` (string): Filter by datasource UUID
- `manufacturer` (string): Filter by manufacturer
- `ssidRegex` (string): SSID regex filter
- `macRegex` (string): MAC address regex filter
- `tags` (array): Filter by tags

**Response:**
```json
{
  "data": [...],
  "total": 1234,
  "page": 1,
  "limit": 100,
  "hasNext": true,
  "hasPrev": false
}
```

#### Search Devices
```http
POST /devices/search
```

**Request Body:**
```json
{
  "criteria": {
    "text": "search term"
  },
  "page": 1,
  "limit": 100
}
```

#### Get Device Statistics
```http
GET /devices/stats?groupBy=type
```

**Query Parameters:**
- `groupBy` (string): Grouping criteria (type/manufacturer/channel/phy)

**Response:**
```json
{
  "success": true,
  "data": {
    "groupBy": "type",
    "stats": {
      "Wi-Fi AP": { "count": 45, "packets": 12345 },
      "Wi-Fi Client": { "count": 123, "packets": 54321 }
    },
    "totalDevices": 168,
    "timestamp": 1234567890000
  }
}
```

#### Get Device Details
```http
GET /devices/:key
```

#### Get Networks (APs Only)
```http
GET /networks?page=1&limit=100
```

#### Get Clients
```http
GET /clients?page=1&limit=100
```

### Script Management

#### List Available Scripts
```http
GET /scripts
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "start_kismet",
      "path": "/home/pi/Scripts/start_kismet.sh",
      "name": "Start Kismet",
      "description": "Start Kismet with custom configuration",
      "executable": true,
      "running": false,
      "lastExecution": 1234567890000
    }
  ]
}
```

#### Execute Script
```http
POST /scripts/:id/execute
```

**Request Body:**
```json
{
  "args": ["arg1", "arg2"],
  "env": {
    "CUSTOM_VAR": "value"
  },
  "detached": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890_abc123",
    "output": "Script output...",
    "error": "",
    "duration": 1234
  }
}
```

#### Stop Running Script
```http
POST /scripts/:id/stop
```

#### Get Script Execution Status
```http
GET /scripts/execution/:executionId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exec_1234567890_abc123",
    "script": "start_kismet",
    "pid": 12345,
    "startTime": 1234567890000,
    "endTime": 1234567891234,
    "status": "completed",
    "output": "Script output...",
    "error": ""
  }
}
```

#### Stream Script Output
```http
GET /scripts/execution/:executionId/stream
```

**Response:** Server-Sent Events stream

#### Get Script History
```http
GET /scripts/history?limit=50
```

### Configuration Management

#### Get Configuration
```http
GET /config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kismet.conf": {
      "server_name": "Kismet",
      "log_types": "pcap,kismet",
      "channel_hop": "true"
    }
  }
}
```

#### Update Configuration
```http
PUT /config/:file
```

**Request Body:**
```json
{
  "config": {
    "server_name": "My Kismet",
    "log_types": "pcap,kismet,kml",
    "channel_hop": "true"
  }
}
```

#### Validate Configuration
```http
POST /config/validate
```

**Request Body:**
```json
{
  "config": {
    "server_name": "My Kismet",
    "log_types": "pcap,invalid"
  }
}
```

**Response:**
```json
{
  "success": false,
  "validationErrors": [
    "Invalid log type: invalid"
  ]
}
```

#### List Configuration Backups
```http
GET /config/:file/backups
```

#### Restore Configuration
```http
POST /config/:file/restore
```

**Request Body:**
```json
{
  "backupPath": "/etc/kismet/kismet.conf.backup.1234567890"
}
```

### System Monitoring

#### Get System Status
```http
GET /status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "service": {
      "name": "kismet",
      "running": true,
      "pid": 12345,
      "memory": "125.5 MB",
      "uptime": 3600
    },
    "kismet": {
      "api": {
        "available": true,
        "version": "2021-08-R1",
        "url": "http://localhost:2501"
      }
    },
    "system": {
      "loadAverage": {
        "1min": 0.5,
        "5min": 0.7,
        "15min": 0.6
      },
      "memoryUsage": {
        "total": 8589934592,
        "used": 4294967296,
        "free": 4294967296,
        "percent": 50
      },
      "diskUsage": {
        "total": 107374182400,
        "used": 53687091200,
        "available": 53687091200,
        "percent": 50
      }
    }
  }
}
```

#### Get Detailed Statistics
```http
GET /stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": {
      "total": 168,
      "byType": {...},
      "byPhy": {...},
      "active": 45,
      "new": 12
    },
    "packets": {...},
    "datasources": {...},
    "memory": {...},
    "channels": {...},
    "alerts": {...}
  }
}
```

#### Get Real-Time Metrics
```http
GET /metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": 1234567890000,
    "packets": {
      "rate": 100,
      "total": 1000000,
      "dropped": 100,
      "error": 10
    },
    "devices": {
      "rate": 5,
      "active": 45,
      "total": 168
    },
    "datasources": {
      "active": 2,
      "total": 3,
      "error": 0
    },
    "system": {
      "cpu": 25.5,
      "memory": 50,
      "uptime": 3600
    }
  }
}
```

### Data Management

#### Get Datasources
```http
GET /datasources
```

#### Configure Datasource
```http
PUT /datasources/:uuid
```

**Request Body:**
```json
{
  "hop_rate": 5,
  "hop_channels": ["1", "6", "11"],
  "channel": "6"
}
```

#### Get Alerts
```http
GET /alerts
```

#### Configure Alert
```http
PUT /alerts/:type
```

**Request Body:**
```json
{
  "enabled": true,
  "severity": 5,
  "burstMax": 10,
  "burstUnit": 60
}
```

#### Get GPS Status
```http
GET /gps/status
```

#### Get Channel Statistics
```http
GET /channels/stats
```

### Data Export

#### Stream PCAP Data
```http
GET /pcap/stream?device=XX:XX:XX:XX:XX:XX&limit=1000
```

**Query Parameters:**
- `device` (string): Filter by device MAC
- `datasource` (string): Filter by datasource
- `filter` (string): BPF filter
- `limit` (number): Packet limit

### Log Streaming

#### Stream Logs
```http
GET /logs/stream
```

**Response:** Server-Sent Events stream with log entries:
```json
{
  "timestamp": 1234567890,
  "type": "info",
  "message": "Detected new device XX:XX:XX:XX:XX:XX",
  "source": "kismet"
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": 1234567890000
}
```

## Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource already exists/running)
- `500` - Internal Server Error

## WebSocket Events

The Kismet API also supports WebSocket connections for real-time updates. See `kismetWebSocket.ts` for WebSocket event documentation.
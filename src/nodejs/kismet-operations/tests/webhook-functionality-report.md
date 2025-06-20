# Webhook Functionality Documentation

Generated: 2025-06-16T08:34:06.298Z

## REST API Endpoints

### POST /api/webhook/run-script

**Description:** Start Kismet and/or GPS services

**Request Body:**
```json
{
  "script": "kismet|gps|both",
  "options": {
    "interface": "string (optional)",
    "config": "string (optional)"
  }
}
```

**Responses:**
- 200: Script started successfully
- 409: Script already running
- 500: Execution failed

### POST /api/webhook/stop-script

**Description:** Stop running Kismet and/or GPS services

**Request Body:**
```json
{
  "script": "kismet|gps|both",
  "force": "boolean (optional)"
}
```

**Responses:**
- 200: Script stopped successfully
- 404: Script not running
- 500: Stop failed

### GET /api/webhook/script-status

**Description:** Get current status of services

**Query Parameters:**
```json
{
  "script": "kismet|gps|both (optional)"
}
```

**Responses:**
- 200: Status retrieved

### GET /api/webhook/info

**Description:** Get system information and service configuration

**Responses:**
- 200: System info retrieved

### GET /api/webhook/kismet-data

**Description:** Get data from Kismet service

**Query Parameters:**
```json
{
  "type": "devices|networks|alerts|all (optional)",
  "limit": "number 1-1000 (optional)",
  "since": "ISO8601 date (optional)",
  "format": "json|csv (optional)"
}
```

**Responses:**
- 200: Data retrieved
- 503: Kismet unavailable

### GET /api/webhook/health

**Description:** Health check endpoint

**Responses:**
- 200: Service healthy
- 503: Service unhealthy

### POST /api/webhook/cache/clear

**Description:** Clear cache (admin endpoint)

**Request Body:**
```json
{
  "key": "string (optional)"
}
```

**Responses:**
- 200: Cache cleared

## WebSocket Features

### Namespace: /webhook

**Description:** WebSocket namespace for webhook events

**Server Events:**
- `status`: Script status updates
- `error`: Error notifications

**Client Events:**
- `subscribe`: Subscribe to specific script updates
- `unsubscribe`: Unsubscribe from script updates

## Integration Points

### Kismet Service

**Type:** HTTP API

**Description:** Connects to Kismet REST API for device/network data

**url:** http://localhost:2501

**authentication:** Basic Auth (if configured)

**dataFlow:** Kismet → Webhook Service → Client

### GPS Service

**Type:** Process Management

**Description:** Manages GPS data collection process

**command:** mavgps.py

**pidFile:** /tmp/kismet-operations/gps.pid

**dataFlow:** GPS Device → mavgps.py → GPSD → Kismet

### Script Management

**Type:** Shell Scripts

**Description:** Manages background processes via shell scripts

**scripts:**
```json
{
  "start_kismet": "Starts Kismet with configured parameters",
  "gps_kismet_wigle": "Orchestrates GPS, Kismet, and Wigle services",
  "start_mediamtx": "Starts media streaming service"
}
```

**pidDir:** /tmp/kismet-operations

### Cache System

**Type:** In-Memory Cache

**Description:** Caches API responses for performance

**timeout:** 10 seconds for data, 60 seconds for system info

**maxSize:** 1000 entries (monitored for memory leaks)

### Rate Limiting

**Type:** Middleware

**Description:** Prevents API abuse

**limits:**
```json
{
  "window": "1 minute",
  "maxRequests": 100,
  "perClient": "IP-based"
}
```


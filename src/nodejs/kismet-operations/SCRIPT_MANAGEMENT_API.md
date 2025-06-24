# Script Management API

The Node.js spectrum analyzer service now includes script management endpoints that allow starting and stopping system scripts via HTTP API calls.

## Endpoints

### GET /script-status
Get the status of all known scripts.

**Response:**
```json
{
  "start_kismet": {
    "status": "running",
    "pid": 12345,
    "cpu": "2.5%",
    "memory": "45.2 MB",
    "elapsed_time": "120 seconds",
    "managed": true
  },
  "mavgps": {
    "status": "stopped",
    "pid": null,
    "managed": false
  }
}
```

### POST /run-script
Start a script.

**Request Body:**
```json
{
  "script_name": "start_kismet",
  "args": []
}
```

**Available Scripts:**
- `start_kismet` - Start Kismet WiFi scanner
- `gps_kismet_wigle` - Start GPS + Kismet + WigleToTAK pipeline
- `mavgps` - Start MAVLink GPS bridge
- `spectrum_analyzer` - Start Python spectrum analyzer
- `start_mediamtx` - Start MediaMTX streaming server

**Response:**
```json
{
  "status": "success",
  "message": "Script start_kismet started",
  "process_id": 12345
}
```

### POST /stop-script
Stop a running script.

**Request Body:**
```json
{
  "script_name": "start_kismet"
}
```

Or by process ID:
```json
{
  "process_id": 12345
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Script stopped",
  "stopped": true
}
```

## WebSocket Events

The service also emits WebSocket events for script management:

- `script_output` - Real-time script output (stdout/stderr)
- `script_exit` - Script exit notification

## Example Usage

```javascript
// Start Kismet
fetch('http://localhost:8092/run-script', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    script_name: 'start_kismet',
    args: []
  })
})

// Check status
fetch('http://localhost:8092/script-status')
  .then(res => res.json())
  .then(data => console.log(data))

// Stop script
fetch('http://localhost:8092/stop-script', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    script_name: 'start_kismet'
  })
})
```

## Features

- **Process Management**: Spawns detached processes that survive parent exit
- **Virtual Environment Support**: Automatically detects and uses Python virtual environments
- **Real-time Output**: Streams stdout/stderr via WebSocket
- **Graceful Shutdown**: Attempts SIGTERM before SIGKILL
- **Status Tracking**: Monitors CPU, memory, and runtime
- **Error Handling**: Comprehensive error reporting

## Security Notes

- Scripts are limited to pre-defined paths in the configuration
- No arbitrary command execution is allowed
- All script paths must be explicitly configured
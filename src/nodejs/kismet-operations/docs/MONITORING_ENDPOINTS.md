# System Monitoring Endpoints

This document describes the system monitoring endpoints implemented in the Spectrum Analyzer service.

## Endpoints

### 1. GET /info
Returns comprehensive system information including hardware, memory, disk, and network details.

**Response Format:**
```json
{
  "system": {
    "hostname": "raspberrypi",
    "platform": "linux",
    "release": "6.12.25+rpt-rpi-v8",
    "arch": "arm64",
    "uptime": 123456,
    "cpus": {
      "count": 4,
      "model": "ARMv8 Processor rev 3 (v8l)",
      "speed": 1500
    },
    "memory": {
      "total": 8589934592,
      "free": 2147483648,
      "used": 6442450944,
      "percent_used": "75.00"
    },
    "load_average": {
      "1min": "0.52",
      "5min": "0.58",
      "15min": "0.59"
    },
    "disk": {
      "filesystem": "/dev/mmcblk0p2",
      "size": "29G",
      "used": "12G",
      "available": "16G",
      "use_percent": "44%"
    },
    "network_interfaces": {
      "eth0": [{
        "family": "IPv4",
        "address": "192.168.1.100",
        "netmask": "255.255.255.0"
      }]
    }
  },
  "process": {
    "pid": 12345,
    "version": "v16.20.0",
    "uptime": 3600,
    "memory": {
      "rss": 67108864,
      "heap_total": 33554432,
      "heap_used": 25165824,
      "external": 1048576
    }
  },
  "service": {
    "name": "spectrum-analyzer",
    "version": "2.0.0",
    "port": 8092,
    "environment": "production",
    "status": "running",
    "connected_clients": 2,
    "openwebrx_connected": false
  },
  "timestamp": "2025-06-16T10:30:00.000Z"
}
```

### 2. GET /script-status
Returns the status of all monitored scripts and services.

**Response Format:**
```json
{
  "scripts": {
    "gps_kismet_wigle.sh": {
      "status": "running",
      "pid": 1234,
      "cpu": "2.50%",
      "memory": "45.67 MB",
      "elapsed_time": "3600 seconds",
      "command": "/home/pi/stinky/gps_kismet_wigle.sh"
    },
    "start_kismet.sh": {
      "status": "stopped",
      "pid": null,
      "cpu": "0%",
      "memory": "0 MB",
      "elapsed_time": "0 seconds",
      "command": null
    }
  },
  "services": {
    "kismet": "running",
    "gpsd": "running",
    "openwebrx": "stopped"
  },
  "pid_files": {
    "gps_kismet_wigle.pids": "1234 5678 9012",
    "kismet.pid": "5678",
    "wigletotak.pid": "not found"
  },
  "node_services": {
    "spectrum_analyzer": {
      "status": "running",
      "port": 8092,
      "uptime": 3600000,
      "connected_clients": 2
    },
    "wigle_to_tak": {
      "status": "unknown",
      "port": 8000
    },
    "gps_bridge": {
      "status": "unknown",
      "port": 2947
    }
  },
  "timestamp": "2025-06-16T10:30:00.000Z"
}
```

### 3. GET /health
Returns basic health status of the service (already existed).

**Response Format:**
```json
{
  "status": "healthy",
  "service": "spectrum-analyzer",
  "timestamp": "2025-06-16T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 67108864,
    "heapTotal": 33554432,
    "heapUsed": 25165824,
    "external": 1048576,
    "arrayBuffers": 524288
  },
  "openwebrx_connected": false,
  "fft_buffer_size": 10,
  "connected_clients": 2
}
```

## Usage Examples

### Using curl:
```bash
# Get system information
curl http://localhost:8092/info

# Get script status
curl http://localhost:8092/script-status

# Get health status
curl http://localhost:8092/health
```

### Using the test script:
```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations
./test-monitoring-endpoints.js
```

## Integration with Frontend

These endpoints can be used by the frontend to display:
- System resource usage (CPU, memory, disk)
- Service health status
- Running scripts and their resource consumption
- Network interface information
- Process monitoring

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200: Success
- 500: Server error (with error details in response body)

Error response format:
```json
{
  "error": "Failed to get system information",
  "message": "Detailed error message",
  "timestamp": "2025-06-16T10:30:00.000Z"
}
```
# Flask webhook.py Implementation Analysis

## Executive Summary

The Flask webhook.py is a comprehensive service management API that orchestrates multiple components of the Stinkster system, including GPS services, Kismet WiFi scanning, and WigleToTAK integration. The application provides RESTful endpoints for service control, status monitoring, and data retrieval.

## Core Dependencies

### Python Modules
- **flask**: Core web framework (Flask, jsonify, request)
- **flask_cors**: CORS support for cross-origin requests
- **subprocess**: Process management for system commands
- **psutil**: Process monitoring and management
- **gps**: GPS data interface (python3-gps package)
- **requests**: HTTP client for Kismet API interactions
- **json**: JSON data parsing
- **csv**: CSV file parsing for Kismet data
- **glob**: File pattern matching for CSV files
- **logging**: Comprehensive application logging
- **datetime**: Time-based operations
- **os, signal**: System-level operations

### System Dependencies
- **gpsd**: GPS daemon service
- **gpspipe**: GPS data retrieval utility
- **Kismet**: WiFi scanning service with REST API
- **System commands**: sudo, ip, iw, systemctl

## Global Variables and Configuration

### File Paths
```python
PID_FILE = '/tmp/kismet_pids.txt'
SCRIPT_PID_FILE = '/tmp/kismet_script.pid'
WIGLETOTAK_SPECIFIC_PID_FILE = '/home/pi/tmp/wigletotak.specific.pid'
KISMET_LOG_PATH = '/var/log/kismet/kismet.log'
```

### API Configuration
```python
KISMET_API_URL = 'http://10.42.0.1:2501'
KISMET_AUTH = ('admin', 'admin')  # Default Kismet credentials
```

### Logging Configuration
- Log file: `/var/log/webhook.log`
- Log level: DEBUG
- Format includes timestamp, module name, level, and message

## Flask Routes Analysis

### 1. `/run-script` (POST)
**Purpose**: Start the main orchestration script and all services

**Key Functionality**:
- Checks if services are already running using PID files
- Performs cleanup of existing processes if unhealthy
- Executes `/home/pi/stinky/gps_kismet_wigle.sh` as user 'pi'
- Waits 30 seconds for initial startup
- Verifies Kismet process with 12 retry attempts (5-second intervals)
- Checks WigleToTAK status with 5 retry attempts (10-second intervals)
- Returns detailed status message about started services

**Response Format**:
```json
{
  "status": "success|error",
  "message": "Detailed status message"
}
```

### 2. `/stop-script` (POST)
**Purpose**: Stop all running services and cleanup

**Key Functionality**:
- Retrieves main script PID from SCRIPT_PID_FILE
- Kills process tree including all children
- Searches for and kills processes by name patterns:
  - 'kismet'
  - 'cgps'
  - 'WigleToTak'
  - 'gps_kismet_wigle'
- Removes PID files
- Restarts gpsd service
- Restores wlan2 network interface to managed mode
- Provides detailed cleanup status

**Response Format**:
```json
{
  "status": "success|error|warning",
  "message": "Detailed cleanup status"
}
```

### 3. `/info` (GET)
**Purpose**: Retrieve system status including GPS data

**Key Functionality**:
- Captures client IP address
- Checks gpsd service status
- Uses gpspipe to retrieve GPS data (10 samples)
- Parses TPV (Time-Position-Velocity) JSON objects
- Checks Kismet process and API accessibility
- Verifies WigleToTAK status via PID file
- Returns comprehensive system status

**Response Format**:
```json
{
  "gps": {
    "lat": null|number,
    "lon": null|number,
    "alt": null|number,
    "mode": 0-3,
    "time": null|string,
    "speed": null|number,
    "track": null|number,
    "status": "No Fix|2D Fix|3D Fix"
  },
  "kismet": "Running|Not Running",
  "wigle": "Running|Not Running",
  "ip": "client_ip_address"
}
```

### 4. `/script-status` (GET)
**Purpose**: Quick status check of all services

**Key Functionality**:
- Checks main script PID
- Verifies Kismet process existence
- Tests Kismet API connectivity on multiple endpoints:
  - http://localhost:2501
  - http://127.0.0.1:2501
  - http://10.42.0.1:2501
- Checks WigleToTAK process status
- Provides boolean flags for each service

**Response Format**:
```json
{
  "running": true|false,
  "message": "Combined status message",
  "kismet_running": true|false,
  "kismet_api_responding": true|false,
  "wigle_running": true|false
}
```

### 5. `/kismet-data` (GET)
**Purpose**: Retrieve Kismet scanning data

**Key Functionality**:
- Primary: Reads from latest CSV file in `/home/pi/kismet_ops/`
- Fallback: Queries Kismet REST API
- CSV validation includes:
  - File age check (< 1 hour)
  - File size check (not empty)
  - Column verification
- Parses device information:
  - MAC address, name, type, channel
  - Signal strength, first/last seen times
- Returns device counts and recent activity

**Response Format**:
```json
{
  "devices_count": number,
  "networks_count": number,
  "recent_devices": [
    {
      "name": "device_name",
      "type": "device_type",
      "channel": "channel_number"
    }
  ],
  "feed_items": [
    {
      "type": "Device",
      "message": "Device details string"
    }
  ],
  "last_update": "HH:MM:SS"
}
```

## Data Flow Architecture

### Service Startup Flow
1. Client POST to `/run-script`
2. Check existing PID files for running processes
3. Clean up unhealthy processes if needed
4. Execute orchestration script as 'pi' user
5. Monitor service startup with retries
6. Return consolidated status

### GPS Data Flow
1. gpsd service running on system
2. gpspipe command retrieves JSON stream
3. Parse TPV objects for position data
4. Transform to API response format
5. Include fix status based on available data

### Kismet Data Flow
1. Primary: Read CSV files from `/home/pi/kismet_ops/`
2. Validate file freshness and format
3. Parse device records with full metadata
4. Fallback: Query Kismet REST API with auth
5. Transform device data to unified format

## Button Handling Implementation

**Note**: This Flask implementation does not contain any button-specific routes or handling logic. All routes are standard REST endpoints that would be called by frontend JavaScript code. Button functionality would be implemented in the frontend layer that consumes these API endpoints.

The routes provide the backend functionality that buttons would trigger:
- Start button → POST `/run-script`
- Stop button → POST `/stop-script`
- Status updates → GET `/info` or `/script-status`
- Data refresh → GET `/kismet-data`

## Process Management

### PID File Management
- Multiple PID files track different components
- Hierarchical process killing (children first)
- Fallback to SIGKILL if standard kill fails
- Cleanup of PID files on stop

### Process Utilities
- `kill_process_tree()`: Recursive process termination
- `is_script_running()`: Main script status check
- `are_all_processes_running()`: Health check for all PIDs
- Process discovery by name patterns

## Error Handling

### Comprehensive Exception Handling
- Try-except blocks around all external operations
- Detailed logging of all errors
- Graceful fallbacks for service failures
- Always attempt cleanup even on errors

### Timeout Management
- gpspipe: 10-second timeout
- Kismet API: 2-5 second timeouts
- Socket connection tests on failure

## State Management

### No Persistent State
- All state derived from system (PID files, processes)
- No in-memory state between requests
- Stateless design for reliability

### External State Sources
- PID files for process tracking
- System process table via psutil
- Service status via systemctl
- File system for CSV data

## Security Considerations

### Authentication
- No authentication on Flask endpoints
- Kismet API uses hardcoded credentials
- Runs commands with sudo privileges

### Network Security
- CORS enabled for all routes
- Binds to all interfaces (0.0.0.0)
- No input validation on some parameters

## Performance Characteristics

### Blocking Operations
- Synchronous subprocess calls
- Long startup delays (30 seconds)
- Sequential service checks
- CSV file parsing on every request

### Resource Usage
- Creates subprocess for each command
- Holds connections during long operations
- No caching of service status
- Full process tree scanning

## Integration Points

### System Commands
- `sudo -u pi`: Run as specific user
- `systemctl restart gpsd`: Service management
- `ip link` / `iw dev`: Network interface control
- `gpspipe -w -n 10`: GPS data retrieval

### File System Integration
- PID files in `/tmp/` and `/home/pi/tmp/`
- CSV files in `/home/pi/kismet_ops/`
- Log files in `/var/log/`
- Script execution from `/home/pi/stinky/`

### Network Services
- Kismet REST API on port 2501
- Flask server on port 5000
- gpsd service (via gpspipe)

## Identified Complexities

### 1. Multi-Service Orchestration
- Complex startup sequencing with delays
- Multiple retry mechanisms with different intervals
- Health checking across multiple services

### 2. Process Management Complexity
- Recursive process tree killing
- Multiple PID file locations
- Process identification by name patterns

### 3. Data Source Multiplexing
- Primary CSV file reading with validation
- Fallback to REST API
- Different data formats requiring transformation

### 4. State Synchronization
- No central state store
- Derived state from multiple sources
- Potential race conditions in PID file access

### 5. Error Recovery
- Complex cleanup procedures
- Multiple fallback mechanisms
- Partial failure handling

## Recommendations for Node.js Port

1. **Async/Await Pattern**: Convert all subprocess and file operations to async
2. **Event-Driven Architecture**: Use EventEmitter for service status updates
3. **Process Management**: Consider using PM2 or native cluster module
4. **WebSocket Support**: Add real-time updates for status changes
5. **Proper Input Validation**: Add request validation middleware
6. **Configuration Management**: Externalize hardcoded values
7. **Connection Pooling**: Reuse HTTP connections to Kismet API
8. **Caching Layer**: Add Redis/in-memory cache for status data
9. **Structured Logging**: Use Winston or similar for better log management
10. **Health Check Endpoint**: Add dedicated health check route
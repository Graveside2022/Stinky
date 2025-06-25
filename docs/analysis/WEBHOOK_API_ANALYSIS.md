# Flask Webhook API Analysis
## File: /home/pi/web/webhook.py

## Overview
This Flask application serves as a webhook and control interface for managing the stinkster system, which includes GPS tracking (via gpsd), WiFi scanning (via Kismet), and WigleToTAK conversion services. The application runs on port 5000 with CORS enabled for cross-origin requests.

## Dependencies
- **Flask Framework**: Core web framework with CORS support
- **System Libraries**: subprocess, os, signal, psutil
- **GPS Libraries**: gps (python3-gps package)
- **HTTP Libraries**: requests for Kismet API communication
- **Data Processing**: json, csv, glob for file handling
- **Logging**: Comprehensive logging to `/var/log/webhook.log`

## Configuration Constants
```python
PID_FILE = '/tmp/kismet_pids.txt'
SCRIPT_PID_FILE = '/tmp/kismet_script.pid'
WIGLETOTAK_SPECIFIC_PID_FILE = '/home/pi/tmp/wigletotak.specific.pid'
KISMET_LOG_PATH = '/var/log/kismet/kismet.log'
KISMET_API_URL = 'http://10.42.0.1:2501'
KISMET_AUTH = ('admin', 'admin')  # Default Kismet credentials
```

## HTTP Routes and Endpoints

### 1. POST /run-script
**Purpose**: Start the main orchestration script that launches all services

**Request Method**: POST

**Authentication**: None

**Request Body**: None required

**Process Flow**:
1. Checks if script is already running and healthy
2. Cleans up any unhealthy existing processes
3. Starts `/home/pi/stinky/gps_kismet_wigle.sh` as user 'pi'
4. Waits 30 seconds for initial startup
5. Performs health checks on:
   - Kismet process (12 retries, 5-second intervals)
   - cgps process (optional)
   - WigleToTAK process (5 retries, 10-second intervals)

**Response Format**:
```json
{
    "status": "success|error",
    "message": "Detailed status message"
}
```

**Status Codes**:
- 200: Success (script started or already running)
- 500: Error (script not executable or failed to start)

### 2. POST /stop-script
**Purpose**: Stop all running processes and clean up resources

**Request Method**: POST

**Authentication**: None

**Request Body**: None required

**Process Flow**:
1. Checks for running script via PID files
2. Kills main script process tree
3. Kills related processes by name pattern:
   - kismet
   - cgps
   - WigleToTak
   - gps_kismet_wigle
4. Cleans up PID files
5. Restarts gpsd service
6. Restores wlan2 interface to managed mode

**Response Format**:
```json
{
    "status": "success|error|warning",
    "message": "Detailed status message"
}
```

**Status Codes**:
- 200: Success or warning (no processes found)
- 500: Error during stop operation

### 3. GET /info
**Purpose**: Retrieve current GPS coordinates and service status

**Request Method**: GET

**Authentication**: None

**Process Flow**:
1. Captures requester's IP address
2. Checks gpsd service status
3. Uses `gpspipe -w -n 10` to fetch GPS data
4. Parses TPV (Time-Position-Velocity) data
5. Checks Kismet process and API status
6. Checks WigleToTAK process status

**Response Format**:
```json
{
    "gps": {
        "lat": null|float,
        "lon": null|float,
        "alt": null|float,
        "mode": 0|2|3,
        "time": null|string,
        "speed": null|float,
        "track": null|float,
        "status": "No Fix|2D Fix|3D Fix"
    },
    "kismet": "Running|Not Running",
    "wigle": "Running|Not Running",
    "ip": "requester_ip_address"
}
```

**GPS Mode Values**:
- 0: No fix
- 2: 2D fix (latitude/longitude only)
- 3: 3D fix (latitude/longitude/altitude)

### 4. GET /script-status
**Purpose**: Check detailed status of all services

**Request Method**: GET

**Authentication**: None

**Process Flow**:
1. Checks main script PID file
2. Verifies Kismet process existence
3. Tests Kismet API connectivity on multiple endpoints:
   - http://localhost:2501
   - http://127.0.0.1:2501
   - http://10.42.0.1:2501
4. Checks WigleToTAK process status

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

### 5. GET /kismet-data
**Purpose**: Retrieve Kismet WiFi scanning data

**Request Method**: GET

**Authentication**: None (but uses Kismet auth for API calls)

**Data Sources** (in order of preference):
1. CSV files from `/home/pi/kismet_ops/*.csv`
2. Kismet REST API at `/devices/views/all_devices.json`

**CSV Processing**:
- Finds most recent CSV file
- Validates file age (must be < 1 hour old)
- Parses device information including:
  - MAC address
  - Device type
  - Channel
  - Signal strength
  - First/last seen timestamps

**Response Format**:
```json
{
    "devices_count": integer,
    "networks_count": integer,
    "recent_devices": [
        {
            "name": "device_name|mac_address",
            "type": "device_type",
            "channel": "channel_number"
        }
    ],
    "feed_items": [
        {
            "type": "Device",
            "message": "Device description"
        }
    ],
    "last_update": "HH:MM:SS",
    "error": "error_message (if applicable)"
}
```

## Error Handling Patterns

### 1. Process Management
- Uses `psutil` for robust process checking and killing
- Implements process tree killing to ensure child processes are terminated
- Fallback to SIGKILL if normal termination fails

### 2. File Operations
- Creates required directories (`/home/pi/tmp`) if missing
- Validates file existence before reading
- Handles file permission errors gracefully

### 3. Network Operations
- Implements timeout for all network requests (2-5 seconds)
- Tries multiple endpoints for Kismet API
- Provides detailed connection error diagnostics

### 4. GPS Data Handling
- Validates gpsd service before attempting connection
- Implements 10-second timeout for GPS data retrieval
- Parses multiple GPS data formats (TPV focus)

## Security Considerations

### 1. Authentication
- **No authentication** on webhook endpoints (security risk)
- Uses default Kismet credentials (`admin:admin`)
- Runs subprocesses as 'pi' user (privilege separation)

### 2. Input Validation
- No request body validation (endpoints don't accept user input)
- No rate limiting implemented
- No CSRF protection

### 3. Logging
- Comprehensive logging to `/var/log/webhook.log`
- Logs include IP addresses and detailed error messages
- No log rotation configured

## External Service Integrations

### 1. Kismet Integration
- REST API communication on port 2501
- Basic HTTP authentication
- Fallback to CSV file parsing
- Health checks via process monitoring

### 2. GPS Integration
- Uses gpspipe command-line tool
- Communicates with gpsd service
- Parses NMEA/JSON GPS data

### 3. System Service Integration
- Controls systemd services (gpsd)
- Manages network interfaces (wlan2)
- Process management via subprocess

## Performance Considerations

### 1. Startup Delays
- 30-second initial startup wait
- Multiple retry loops with delays
- Total startup time can exceed 2 minutes

### 2. File Operations
- CSV file parsing for potentially large datasets
- No pagination for device lists
- File age validation (1-hour threshold)

### 3. Process Monitoring
- Iterates through all system processes
- Multiple process existence checks
- No caching of process states

## Recommendations

### 1. Security Improvements
- Implement API key or token-based authentication
- Add rate limiting to prevent abuse
- Use environment variables for sensitive credentials
- Implement HTTPS with proper certificates

### 2. Error Handling
- Add request timeout handling for all subprocess calls
- Implement proper exception chaining
- Add health check endpoint with detailed diagnostics

### 3. Performance Optimization
- Cache process states with TTL
- Implement pagination for device lists
- Add WebSocket support for real-time updates
- Use connection pooling for Kismet API

### 4. Monitoring
- Add metrics collection (response times, error rates)
- Implement log rotation
- Add alerting for service failures
- Create dashboard for system health visualization
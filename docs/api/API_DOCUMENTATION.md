# Stinkster System API Documentation

## Overview

The Stinkster system provides multiple web interfaces for different components. This document comprehensively documents all REST API endpoints and WebSocket interfaces for the system's web services.

## System Architecture

The system consists of multiple Python Flask applications running on different ports:

- **WigleToTAK Interface**: Port 8000 (configurable via --flask-port)
- **Spectrum Analyzer Interface**: Port 8092 (with WebSocket support)
- **OpenWebRX SDR Interface**: Port 8073 (Docker container)
- **GPSD Service**: Port 2947
- **TAK Broadcasting**: Port 6969 (default, configurable)

## WigleToTAK Flask Interface (Port 8000)

The WigleToTAK service converts WiFi scan data from Kismet into TAK (Team Awareness Kit) format for tactical mapping applications.

### Base URL
```
http://<host>:8000
```

### REST API Endpoints

#### 1. Main Interface
- **GET /** - Serves the main WigleToTAK web interface
  - Returns: HTML template (WigleToTAK.html)

#### 2. TAK Server Configuration
- **POST /update_tak_settings** - Configure TAK server connection
  - **Request Body** (JSON):
    ```json
    {
      "tak_server_ip": "192.168.1.100",
      "tak_server_port": "8087"
    }
    ```
  - **Responses**:
    - 200: `{"message": "TAK settings updated successfully!"}`
    - 400: `{"error": "Missing TAK Server IP or Port in the request"}`

#### 3. Multicast Configuration
- **POST /update_multicast_state** - Enable/disable TAK multicast broadcasting
  - **Request Body** (JSON):
    ```json
    {
      "takMulticast": true
    }
    ```
  - **Responses**:
    - 200: `{"message": "TAK Multicast state updated successfully!"}`
    - 400: `{"error": "Missing TAK Multicast state in the request"}`

#### 4. Analysis Mode Configuration
- **POST /update_analysis_mode** - Set analysis mode (realtime or postcollection)
  - **Request Body** (JSON):
    ```json
    {
      "mode": "realtime"
    }
    ```
  - **Valid modes**: `"realtime"`, `"postcollection"`
  - **Responses**:
    - 200: `{"message": "Analysis mode updated successfully!"}`
    - 400: `{"error": "Invalid analysis mode in the request"}`

#### 5. Antenna Sensitivity Configuration
- **POST /update_antenna_sensitivity** - Configure antenna sensitivity compensation
  - **Request Body** (JSON):
    ```json
    {
      "antenna_sensitivity": "alfa_card",
      "custom_factor": 1.8
    }
    ```
  - **Valid sensitivity types**:
    - `"standard"` (1.0x)
    - `"alfa_card"` (1.5x)
    - `"high_gain"` (2.0x)
    - `"rpi_internal"` (0.7x)
    - `"custom"` (requires custom_factor)
  - **Responses**:
    - 200: `{"message": "Antenna sensitivity updated successfully!"}`
    - 400: `{"error": "Invalid antenna sensitivity type"}`

- **GET /get_antenna_settings** - Get current antenna configuration
  - **Response** (JSON):
    ```json
    {
      "current_sensitivity": "alfa_card",
      "available_types": ["standard", "alfa_card", "high_gain", "rpi_internal", "custom"],
      "custom_factor": 1.0
    }
    ```

#### 6. File Management
- **GET /list_wigle_files** - List available Wigle CSV files
  - **Query Parameters**:
    - `directory`: Directory path to scan for .wiglecsv files
  - **Response** (JSON):
    ```json
    {
      "files": ["2025-06-15-01.wiglecsv", "2025-06-14-23.wiglecsv"]
    }
    ```
  - **Error Responses**:
    - 400: `{"error": "Directory parameter is missing"}`
    - 500: `{"error": "Error listing files in directory"}`

#### 7. Broadcasting Control
- **POST /start_broadcast** - Start broadcasting WiFi data to TAK
  - **Request Body** (JSON):
    ```json
    {
      "directory": "/path/to/wigle/files",
      "filename": "2025-06-15-01.wiglecsv"
    }
    ```
  - **Responses**:
    - 200: `{"message": "Broadcast started for file: filename.csv"}`
    - 400: `{"error": "Filename parameter is missing"}`
    - 404: `{"error": "File does not exist"}`

- **POST /stop_broadcast** - Stop current broadcasting
  - **Response**: `{"message": "Broadcast stopped successfully"}`

#### 8. Whitelist Management
- **POST /add_to_whitelist** - Add SSID or MAC to whitelist (excludes from broadcasting)
  - **Request Body** (JSON):
    ```json
    {
      "ssid": "MyNetwork"
    }
    ```
    OR
    ```json
    {
      "mac": "AA:BB:CC:DD:EE:FF"
    }
    ```
  - **Responses**:
    - 200: `{"message": "SSID/MAC added to whitelist"}`
    - 400: `{"error": "Missing SSID or MAC address in request"}`

- **POST /remove_from_whitelist** - Remove from whitelist
  - **Request Body**: Same format as add_to_whitelist
  - **Responses**:
    - 200: `{"message": "SSID/MAC removed from whitelist"}`
    - 404: `{"error": "SSID/MAC not found in whitelist"}`

#### 9. Blacklist Management (Color Coding)
- **POST /add_to_blacklist** - Add SSID or MAC with color coding
  - **Request Body** (JSON):
    ```json
    {
      "ssid": "SuspiciousNetwork",
      "argb_value": "-16776961"
    }
    ```
  - **ARGB Color Values**:
    - Cyan: `-65281`
    - Red: `-16776961`
    - Green: `-16711936`
    - Blue: `-16711681`
  - **Responses**:
    - 200: `{"message": "SSID/MAC with ARGB value added to blacklist"}`
    - 400: `{"error": "Missing SSID or MAC address or ARGB value in request"}`

- **POST /remove_from_blacklist** - Remove from blacklist
  - **Request Body**: SSID or MAC only (no ARGB needed)
  - **Responses**:
    - 200: `{"message": "SSID/MAC removed from blacklist"}`
    - 404: `{"error": "SSID/MAC not found in blacklist"}`

## Spectrum Analyzer Interface (Port 8092)

The Spectrum Analyzer provides real-time spectrum analysis using HackRF via OpenWebRX integration with both REST API and WebSocket support.

### Base URL
```
http://<host>:8092
```

### REST API Endpoints

#### 1. Main Interface
- **GET /** - Serves the spectrum analyzer web interface
  - Returns: HTML template (spectrum.html)

#### 2. System Status
- **GET /api/status** - Get current system status and configuration
  - **Response** (JSON):
    ```json
    {
      "openwebrx_connected": true,
      "real_data": true,
      "fft_buffer_size": 3,
      "config": {
        "fft_size": 2048,
        "center_freq": 145000000,
        "samp_rate": 2400000,
        "fft_compression": "none"
      },
      "last_fft_time": 1718456789.123,
      "mode": "REAL DATA MODE"
    }
    ```

#### 3. Scan Profiles
- **GET /api/profiles** - Get available frequency scan profiles
  - **Response** (JSON):
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

#### 4. Signal Scanning
- **GET /api/scan/{profile_id}** - Perform signal scan using specified profile
  - **Path Parameters**:
    - `profile_id`: One of `"vhf"`, `"uhf"`, `"ism"`
  - **Response** (JSON):
    ```json
    {
      "profile": {
        "name": "VHF Amateur (144-148 MHz)",
        "ranges": [[144.0, 148.0]],
        "step": 25,
        "description": "VHF Amateur Radio Band"
      },
      "signals": [
        {
          "id": "real-1718456789-123",
          "frequency": "145.500",
          "strength": "-65.2",
          "bandwidth": "12.5",
          "confidence": 0.85,
          "type": "unknown"
        }
      ],
      "scan_time": 1718456789.123,
      "real_data": true
    }
    ```
  - **Error Responses**:
    - 400: `{"error": "Invalid profile"}`

### WebSocket Interface

#### Connection
```javascript
const socket = io('http://<host>:8092');
```

#### Events

##### Client Events
- **connect** - Triggered when client connects
  - Server responds with status information

##### Server Events
- **status** - Connection status updates
  - **Data**:
    ```json
    {
      "connected": true,
      "openwebrx_status": true
    }
    ```

- **fft_data** - Real-time FFT spectrum data
  - **Data**:
    ```json
    {
      "data": [-70.5, -68.2, -72.1, ...],
      "center_freq": 145000000,
      "samp_rate": 2400000,
      "timestamp": 1718456789.123
    }
    ```

## Security Considerations

### Authentication
- **Current State**: None of the interfaces implement authentication
- **Risk Level**: HIGH - All endpoints are publicly accessible
- **Recommendation**: Implement API key authentication or IP whitelisting

### Input Validation
- **WigleToTAK**: Basic validation on enum values (analysis_mode, antenna_sensitivity)
- **Spectrum Analyzer**: No input validation on scan profiles
- **Risks**: Directory traversal, file system access, command injection

### Network Security
- **All services bind to 0.0.0.0**: Accessible from any network interface
- **No HTTPS**: All traffic transmitted in plain text
- **No rate limiting**: Susceptible to DoS attacks

### Data Security
- **File Access**: WigleToTAK can access arbitrary directories
- **Logging**: May contain sensitive information in debug logs
- **Memory**: FFT data buffers may contain sensitive spectrum information

## Security Recommendations

1. **Implement Authentication**:
   ```python
   from functools import wraps
   
   def require_api_key(f):
       @wraps(f)
       def decorated_function(*args, **kwargs):
           api_key = request.headers.get('X-API-Key')
           if api_key != VALID_API_KEY:
               return jsonify({'error': 'Invalid API key'}), 401
           return f(*args, **kwargs)
       return decorated_function
   ```

2. **Input Validation**:
   ```python
   import os.path
   
   def validate_directory(directory):
       # Prevent directory traversal
       if '..' in directory or directory.startswith('/'):
           raise ValueError("Invalid directory path")
       return os.path.abspath(directory)
   ```

3. **Network Binding**:
   ```python
   # Bind only to localhost for security
   app.run(host='127.0.0.1', port=8000)
   ```

4. **Rate Limiting**:
   ```python
   from flask_limiter import Limiter
   
   limiter = Limiter(
       app,
       key_func=lambda: request.remote_addr,
       default_limits=["100 per hour"]
   )
   ```

## Usage Examples

### WigleToTAK Configuration Workflow
```bash
# 1. Configure TAK server
curl -X POST http://localhost:8000/update_tak_settings \
  -H "Content-Type: application/json" \
  -d '{"tak_server_ip": "192.168.1.100", "tak_server_port": "8087"}'

# 2. Set antenna sensitivity for Alfa card
curl -X POST http://localhost:8000/update_antenna_sensitivity \
  -H "Content-Type: application/json" \
  -d '{"antenna_sensitivity": "alfa_card"}'

# 3. List available Wigle files
curl "http://localhost:8000/list_wigle_files?directory=/home/pi/kismet_ops"

# 4. Start broadcasting
curl -X POST http://localhost:8000/start_broadcast \
  -H "Content-Type: application/json" \
  -d '{"directory": "/home/pi/kismet_ops", "filename": "latest.wiglecsv"}'

# 5. Add suspicious network to blacklist with red color
curl -X POST http://localhost:8000/add_to_blacklist \
  -H "Content-Type: application/json" \
  -d '{"ssid": "SuspiciousAP", "argb_value": "-16776961"}'
```

### Spectrum Analyzer Monitoring
```bash
# 1. Check system status
curl http://localhost:8092/api/status

# 2. Get available scan profiles
curl http://localhost:8092/api/profiles

# 3. Scan VHF amateur band
curl http://localhost:8092/api/scan/vhf

# 4. Monitor real-time FFT data via WebSocket
```

### JavaScript WebSocket Example
```javascript
const socket = io('http://localhost:8092');

socket.on('connect', function() {
    console.log('Connected to spectrum analyzer');
});

socket.on('fft_data', function(data) {
    console.log('FFT Data:', data.data.length, 'bins');
    console.log('Center Frequency:', data.center_freq / 1e6, 'MHz');
    // Process and visualize spectrum data
});

socket.on('status', function(data) {
    console.log('Status:', data);
});
```

## Error Handling

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (invalid parameters, missing required fields)
- **404**: Not Found (file not found, endpoint not found)
- **500**: Internal Server Error (file system errors, processing errors)

### Error Response Format
All error responses follow this format:
```json
{
  "error": "Descriptive error message"
}
```

### Common Error Scenarios
1. **File Operations**: Directory not accessible, file permissions
2. **Network Operations**: TAK server unreachable, socket errors
3. **Configuration**: Invalid parameters, missing required fields
4. **System Resources**: Memory exhaustion, disk space

## Performance Considerations

### WigleToTAK
- **File Processing**: Large .wiglecsv files may cause memory issues
- **Broadcasting Rate**: 0.1s delay between packets (10 Hz)
- **Concurrent Connections**: Single-threaded, may block on file I/O

### Spectrum Analyzer
- **FFT Processing**: Real-time processing may consume significant CPU
- **WebSocket Connections**: Multiple clients may impact performance
- **Buffer Management**: FFT buffer limited to 5 entries to prevent memory growth

### Optimization Recommendations
1. **Implement streaming for large files**
2. **Add connection pooling for TAK servers**
3. **Implement data compression for WebSocket communications**
4. **Add request queuing to prevent resource exhaustion**
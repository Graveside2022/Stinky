# Spectrum Analyzer API Specification

## Version Information
- **API Version**: 2.0.0
- **Created**: 2025-06-16
- **Service Name**: HackRF Spectrum Analyzer
- **Base URL**: `http://localhost:8092`
- **Protocol**: HTTP REST + WebSocket (Socket.IO)

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [CORS Configuration](#cors-configuration)
4. [Rate Limiting](#rate-limiting)
5. [REST API Endpoints](#rest-api-endpoints)
6. [WebSocket API](#websocket-api)
7. [Error Handling](#error-handling)
8. [Data Models](#data-models)
9. [OpenAPI Specification](#openapi-specification)

---

## Overview

The Spectrum Analyzer service provides real-time RF spectrum analysis capabilities using HackRF hardware through OpenWebRX integration. It offers both REST API endpoints for configuration and status queries, and WebSocket connections for real-time FFT data streaming.

### Key Features
- Real-time FFT data streaming from HackRF via OpenWebRX
- Signal detection and analysis
- Multiple frequency band profiles
- Demo mode for testing without hardware
- Performance monitoring and metrics

---

## Authentication

Currently, the service operates without authentication in the local development environment.

### Production Recommendations
- Implement API key authentication for REST endpoints
- Use token-based authentication for WebSocket connections
- Consider OAuth2 for third-party integrations

---

## CORS Configuration

The service is configured with permissive CORS settings for development:

```javascript
cors: {
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}
```

### Production CORS Settings
```javascript
cors: {
  origin: ["https://your-domain.com", "https://app.your-domain.com"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400 // 24 hours
}
```

---

## Rate Limiting

### Default Limits
- **REST API**: 100 requests per minute per IP
- **WebSocket**: 10 concurrent connections per IP
- **FFT Data Stream**: 10 updates per second max

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1750031234567
```

---

## REST API Endpoints

### 1. Get Service Health
```http
GET /health
```

**Description**: Returns service health status and metrics.

**Response**:
```json
{
  "status": "healthy",
  "service": "spectrum-analyzer",
  "timestamp": "2025-06-16T12:00:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 67108864,
    "heapTotal": 35139584,
    "heapUsed": 29654321,
    "external": 1234567,
    "arrayBuffers": 123456
  },
  "port": 8092,
  "version": "2.0.0",
  "openwebrx_connected": true,
  "fft_buffer_size": 150,
  "connected_clients": 3
}
```

**Status Codes**:
- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is unhealthy

---

### 2. Get Current Configuration
```http
GET /api/config
```

**Description**: Returns current spectrum analyzer configuration.

**Response**:
```json
{
  "fft_size": 1024,
  "center_freq": 145000000,
  "samp_rate": 2400000,
  "fft_compression": "none",
  "signal_threshold": -70
}
```

**Response Fields**:
- `fft_size`: FFT bin size (0 = auto)
- `center_freq`: Center frequency in Hz
- `samp_rate`: Sample rate in Hz
- `fft_compression`: FFT data compression method
- `signal_threshold`: Signal detection threshold in dBm

---

### 3. Update Configuration
```http
POST /api/config
```

**Description**: Update spectrum analyzer configuration.

**Request Body**:
```json
{
  "center_freq": 146000000,
  "samp_rate": 2400000,
  "signal_threshold": -75
}
```

**Response**:
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "config": {
    "fft_size": 1024,
    "center_freq": 146000000,
    "samp_rate": 2400000,
    "fft_compression": "none",
    "signal_threshold": -75
  }
}
```

**Status Codes**:
- `200 OK`: Configuration updated successfully
- `400 Bad Request`: Invalid configuration parameters
- `500 Internal Server Error`: Configuration update failed

---

### 4. Get System Status
```http
GET /api/status
```

**Description**: Returns comprehensive system status including OpenWebRX connection state and data availability.

**Response**:
```json
{
  "openwebrx_connected": true,
  "real_data": true,
  "fft_buffer_size": 150,
  "config": {
    "fft_size": 1024,
    "center_freq": 145000000,
    "samp_rate": 2400000,
    "fft_compression": "none",
    "signal_threshold": -70
  },
  "last_fft_time": 1750031234567,
  "mode": "REAL DATA MODE",
  "server_uptime": 3600.5,
  "connected_clients": 3
}
```

---

### 5. Connect to OpenWebRX
```http
POST /api/connect
```

**Description**: Establish WebSocket connection to OpenWebRX for FFT data.

**Request Body**:
```json
{
  "url": "ws://localhost:8073/ws/"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Connection initiated to OpenWebRX",
  "url": "ws://localhost:8073/ws/"
}
```

**Status Codes**:
- `200 OK`: Connection initiated
- `500 Internal Server Error`: Connection failed

---

### 6. Disconnect from OpenWebRX
```http
POST /api/disconnect
```

**Description**: Disconnect from OpenWebRX WebSocket.

**Response**:
```json
{
  "success": true,
  "message": "Disconnected from OpenWebRX"
}
```

---

### 7. Get Detected Signals
```http
GET /api/signals?threshold=-75
```

**Description**: Get list of detected signals above specified threshold.

**Query Parameters**:
- `threshold` (optional): Signal threshold in dBm (default: configured threshold)

**Response**:
```json
{
  "signals": [
    {
      "frequency": 145500000,
      "power": -45.2,
      "bin": 512,
      "confidence": 0.85
    }
  ],
  "threshold": -75,
  "timestamp": 1750031234567,
  "fft_buffer_size": 150,
  "real_data": true,
  "signal_count": 1
}
```

---

### 8. Get Signal Statistics
```http
GET /api/signals/stats
```

**Description**: Get statistical analysis of detected signals.

**Response**:
```json
{
  "total_signals": 125,
  "average_power": -65.5,
  "peak_power": -42.1,
  "frequency_range": {
    "min": 144000000,
    "max": 148000000
  },
  "signals_by_strength": {
    "strong": 5,
    "medium": 20,
    "weak": 100
  },
  "detection_rate": 2.5,
  "last_update": 1750031234567
}
```

---

### 9. Get Latest FFT Data
```http
GET /api/fft/latest
```

**Description**: Get the most recent FFT data sample.

**Response**:
```json
{
  "success": true,
  "data": {
    "fft_data": [-80.5, -75.2, -70.1, ...],
    "center_freq": 145000000,
    "samp_rate": 2400000,
    "timestamp": 1750031234567
  },
  "buffer_size": 150
}
```

---

### 10. Clear FFT Buffer
```http
POST /api/fft/clear
```

**Description**: Clear the FFT data buffer.

**Response**:
```json
{
  "success": true,
  "message": "FFT buffer cleared successfully"
}
```

---

### 11. Get Scan Profiles (Legacy)
```http
GET /api/profiles
```

**Description**: Get available frequency scan profiles.

**Response**:
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

---

### 12. Scan Profile (Legacy)
```http
GET /api/scan/{profile_id}
```

**Description**: Scan for signals using specified profile.

**Path Parameters**:
- `profile_id`: Profile identifier (vhf, uhf, ism)

**Response**:
```json
{
  "profile": {
    "name": "VHF Amateur (144-148 MHz)",
    "ranges": [[144.0, 148.0]],
    "step": 25
  },
  "signals": [
    {
      "id": "real-1750031234567-123",
      "frequency": "145.500",
      "strength": "-45.2",
      "bandwidth": "12.5",
      "confidence": 0.85,
      "type": "unknown"
    }
  ],
  "scan_time": 1750031234567,
  "real_data": true
}
```

---

## WebSocket API

### Connection
```javascript
const socket = io('http://localhost:8092', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

### Client-to-Server Events

#### 1. Request Status
```javascript
socket.emit('requestStatus');
```

**Description**: Request current system status.

#### 2. Request Latest FFT
```javascript
socket.emit('requestLatestFFT');
```

**Description**: Request most recent FFT data.

#### 3. Request Signals
```javascript
socket.emit('requestSignals', { threshold: -75 });
```

**Description**: Request detected signals with optional threshold.

### Server-to-Client Events

#### 1. Connection Status
```javascript
socket.on('status', (data) => {
  console.log('Status:', data);
});
```

**Data Format**:
```json
{
  "connected": true,
  "openwebrx_status": true,
  "buffer_size": 150,
  "config": {...}
}
```

#### 2. FFT Data Stream
```javascript
socket.on('fftData', (data) => {
  console.log('FFT Data:', data);
});
```

**Data Format**:
```json
{
  "data": [-80.5, -75.2, -70.1, ...],
  "center_freq": 145000000,
  "samp_rate": 2400000,
  "timestamp": 1750031234567
}
```

#### 3. Signals Detected
```javascript
socket.on('signalsDetected', (data) => {
  console.log('Signals:', data);
});
```

**Data Format**:
```json
{
  "signals": [
    {
      "frequency": 145500000,
      "power": -45.2,
      "bin": 512,
      "confidence": 0.85
    }
  ],
  "count": 1,
  "timestamp": 1750031234567
}
```

#### 4. Connection Events
```javascript
socket.on('openwebrxConnected', (data) => {
  console.log('OpenWebRX connected:', data);
});

socket.on('openwebrxDisconnected', (data) => {
  console.log('OpenWebRX disconnected:', data);
});

socket.on('openwebrxError', (data) => {
  console.error('OpenWebRX error:', data.error);
});
```

#### 5. Configuration Updated
```javascript
socket.on('configUpdated', (data) => {
  console.log('Config updated:', data);
});
```

#### 6. Buffer Cleared
```javascript
socket.on('bufferCleared', (data) => {
  console.log('Buffer cleared:', data);
});
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": "ERROR_CODE",
  "details": "Additional error context",
  "timestamp": "2025-06-16T12:00:00.000Z"
}
```

### Error Codes
- `OPENWEBRX_CONNECTION_FAILED`: Cannot connect to OpenWebRX
- `INVALID_CONFIGURATION`: Invalid configuration parameters
- `WEBSOCKET_ERROR`: WebSocket connection error
- `FFT_PROCESSING_ERROR`: Error processing FFT data
- `INVALID_PROFILE`: Unknown scan profile
- `BUFFER_OVERFLOW`: FFT buffer overflow
- `SIGNAL_DETECTION_ERROR`: Error detecting signals

### HTTP Status Codes
- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

---

## Data Models

### FFT Data Model
```typescript
interface FFTData {
  data: number[];           // Power values in dBm
  center_freq: number;      // Center frequency in Hz
  samp_rate: number;        // Sample rate in Hz
  timestamp: number;        // Unix timestamp in milliseconds
}
```

### Signal Model
```typescript
interface Signal {
  frequency: number;        // Frequency in Hz
  power: number;           // Power in dBm
  bin: number;             // FFT bin index
  confidence: number;      // Detection confidence (0.0-1.0)
}
```

### Configuration Model
```typescript
interface Configuration {
  fft_size: number;        // FFT size (0 = auto)
  center_freq: number;     // Center frequency in Hz
  samp_rate: number;       // Sample rate in Hz
  fft_compression: string; // Compression method
  signal_threshold: number; // Detection threshold in dBm
}
```

### Status Model
```typescript
interface Status {
  openwebrx_connected: boolean;
  real_data: boolean;
  fft_buffer_size: number;
  config: Configuration;
  last_fft_time: number | null;
  mode: 'REAL DATA MODE' | 'DEMO MODE';
  server_uptime: number;
  connected_clients: number;
}
```

---

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: HackRF Spectrum Analyzer API
  description: Real-time RF spectrum analysis service with OpenWebRX integration
  version: 2.0.0
  contact:
    name: API Support
    email: support@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:8092
    description: Development server
  - url: https://spectrum.example.com
    description: Production server

paths:
  /health:
    get:
      summary: Get service health
      operationId: getHealth
      tags:
        - System
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'
        '503':
          description: Service is unhealthy

  /api/status:
    get:
      summary: Get system status
      operationId: getStatus
      tags:
        - System
      responses:
        '200':
          description: Current system status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SystemStatus'
        '500':
          description: Internal server error

  /api/config:
    get:
      summary: Get current configuration
      operationId: getConfig
      tags:
        - Configuration
      responses:
        '200':
          description: Current configuration
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Configuration'
    
    post:
      summary: Update configuration
      operationId: updateConfig
      tags:
        - Configuration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConfigurationUpdate'
      responses:
        '200':
          description: Configuration updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConfigurationResponse'
        '400':
          description: Invalid configuration
        '500':
          description: Update failed

  /api/signals:
    get:
      summary: Get detected signals
      operationId: getSignals
      tags:
        - Signals
      parameters:
        - name: threshold
          in: query
          description: Signal threshold in dBm
          required: false
          schema:
            type: number
            example: -75
      responses:
        '200':
          description: Detected signals
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SignalsResponse'
        '500':
          description: Detection error

  /api/scan/{profileId}:
    get:
      summary: Scan frequency profile
      operationId: scanProfile
      tags:
        - Scanning
      parameters:
        - name: profileId
          in: path
          description: Profile identifier
          required: true
          schema:
            type: string
            enum: [vhf, uhf, ism]
      responses:
        '200':
          description: Scan results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ScanResponse'
        '400':
          description: Invalid profile
        '500':
          description: Scan error

components:
  schemas:
    HealthStatus:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, unhealthy]
        service:
          type: string
        timestamp:
          type: string
          format: date-time
        uptime:
          type: number
        memory:
          type: object
        version:
          type: string
        openwebrx_connected:
          type: boolean
        fft_buffer_size:
          type: integer
        connected_clients:
          type: integer

    Configuration:
      type: object
      properties:
        fft_size:
          type: integer
          minimum: 0
        center_freq:
          type: integer
          minimum: 0
        samp_rate:
          type: integer
          minimum: 0
        fft_compression:
          type: string
        signal_threshold:
          type: number

    SystemStatus:
      type: object
      properties:
        openwebrx_connected:
          type: boolean
        real_data:
          type: boolean
        fft_buffer_size:
          type: integer
        config:
          $ref: '#/components/schemas/Configuration'
        last_fft_time:
          type: integer
          nullable: true
        mode:
          type: string
          enum: ['REAL DATA MODE', 'DEMO MODE']
        server_uptime:
          type: number
        connected_clients:
          type: integer

    Signal:
      type: object
      properties:
        frequency:
          type: number
        power:
          type: number
        bin:
          type: integer
        confidence:
          type: number
          minimum: 0
          maximum: 1

    SignalsResponse:
      type: object
      properties:
        signals:
          type: array
          items:
            $ref: '#/components/schemas/Signal'
        threshold:
          type: number
        timestamp:
          type: integer
        fft_buffer_size:
          type: integer
        real_data:
          type: boolean
        signal_count:
          type: integer

    ScanResponse:
      type: object
      properties:
        profile:
          type: object
          properties:
            name:
              type: string
            ranges:
              type: array
              items:
                type: array
                items:
                  type: number
            step:
              type: number
        signals:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
              frequency:
                type: string
              strength:
                type: string
              bandwidth:
                type: string
              confidence:
                type: number
              type:
                type: string
        scan_time:
          type: integer
        real_data:
          type: boolean

    ConfigurationUpdate:
      type: object
      properties:
        center_freq:
          type: integer
        samp_rate:
          type: integer
        signal_threshold:
          type: number

    ConfigurationResponse:
      type: object
      properties:
        success:
          type: boolean
        message:
          type: string
        config:
          $ref: '#/components/schemas/Configuration'

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        message:
          type: string
        error:
          type: string
        details:
          type: string
        timestamp:
          type: string
          format: date-time
```

---

## Frontend Integration

### URL Mapping
The frontend expects the following endpoint structure:

| Frontend URL | Backend Endpoint | Method |
|-------------|------------------|---------|
| `/api/status` | `/api/status` | GET |
| `/api/scan/{profile}` | `/api/scan/{profile}` | GET |
| `/api/profiles` | `/api/profiles` | GET |
| Socket.IO connection | `ws://localhost:8092/socket.io/` | WebSocket |

### Frontend Hardcoded Values
Current hardcoded values in the frontend that should be configurable:
- Base URL: `http://localhost:8092`
- WebSocket URL: Auto-detected from page origin
- Refresh interval: 5000ms (5 seconds)
- Log buffer size: 100 entries

### Required Frontend Updates
1. Make base URL configurable via environment variable
2. Add connection retry logic with exponential backoff
3. Implement proper error handling for failed API calls
4. Add loading states for all async operations
5. Support configuration persistence in localStorage

---

## Security Recommendations

### Production Deployment
1. **HTTPS**: Use TLS certificates for all connections
2. **Authentication**: Implement API key or JWT authentication
3. **Rate Limiting**: Enforce stricter rate limits
4. **Input Validation**: Validate all inputs server-side
5. **CORS**: Restrict to specific domains
6. **Logging**: Implement comprehensive audit logging
7. **Monitoring**: Add application performance monitoring

### API Key Example
```http
GET /api/status
Authorization: Bearer YOUR_API_KEY_HERE
```

### WebSocket Authentication
```javascript
const socket = io('https://spectrum.example.com', {
  auth: {
    token: 'YOUR_API_KEY_HERE'
  }
});
```

---

## Performance Considerations

### Optimization Tips
1. **FFT Buffer**: Limit buffer size to prevent memory issues
2. **WebSocket Throttling**: Implement client-side throttling
3. **Data Compression**: Enable WebSocket compression
4. **Caching**: Cache static data like profiles
5. **Connection Pooling**: Reuse WebSocket connections

### Monitoring Metrics
- API response times
- WebSocket message latency
- FFT processing time
- Memory usage trends
- Client connection counts

---

## Version History

### v2.0.0 (2025-06-16)
- Initial Node.js implementation
- Full API compatibility with Flask version
- Enhanced WebSocket performance
- Added health check endpoints
- Improved error handling

### Future Enhancements
- GraphQL API support
- Real-time collaboration features
- Advanced signal classification
- Machine learning integration
- Cloud storage support

---

**Document Version**: 1.0  
**Last Updated**: 2025-06-16  
**Maintained By**: Development Team
# Backend API Analysis - Kismet Operations Center

## Executive Summary

The Kismet Operations Center Node.js backend provides a comprehensive API for managing Kismet WiFi scanning, spectrum analysis, and TAK integration. The server runs on port 8002 and includes REST endpoints, WebSocket support, and proxy middleware for Kismet integration.

## API Architecture Overview

### Server Configuration
- **Port**: 8002 (configurable via PORT env var)
- **Framework**: Express.js with Socket.IO for WebSocket support
- **Middleware**: CORS, Helmet, Morgan logging, compression
- **Proxy**: HTTP proxy middleware for Kismet (port 2501) and WigleToTAK (port 8000)

### Key Components
1. **Main Server** (`server.js`): Core Express application with routing and middleware
2. **Spectrum Analyzer** (`lib/spectrumCore.js`): OpenWebRX integration for SDR
3. **Kismet Client** (`lib/webhook/kismetClient.js`): API client for Kismet integration
4. **Script Manager**: Process management for starting/stopping services

## API Endpoint Analysis

### 1. Health & Status Endpoints ✓
- **GET /health**: Service health check with metrics
  - Returns: uptime, memory usage, connected clients, version
  - Status: **Working correctly**

- **GET /api/status**: Spectrum analyzer status
  - Returns: connection status, buffer size, configuration
  - Status: **Working correctly**

### 2. Kismet Integration Endpoints

#### Issues Found:
1. **Connection Errors**: KismetClient fails to connect (ECONNREFUSED)
   - Log shows repeated "Cannot connect to Kismet service" errors
   - Kismet is running but API client connection fails

2. **Authentication Issues**: 
   - Basic auth credentials hardcoded as `admin:admin`
   - No environment variable support for credentials

3. **Proxy Configuration**:
   - Proxy middleware correctly configured at `/api/kismet`
   - Authentication properly passed through proxy
   - Direct proxy calls work, but KismetClient fails

### 3. Script Management Endpoints

#### Working Endpoints:
- **POST /run-script**: Start Kismet services
- **POST /stop-script**: Stop Kismet services
- **GET /script-status**: Check service status

#### Issues Found:
1. **Timeout Handling**: Stop script can timeout (25s limit)
2. **Process Management**: Detached processes not tracked properly
3. **Error Recovery**: No retry mechanism for failed starts

### 4. Frontend Compatibility Endpoints

#### Working:
- **GET /kismet-data**: Returns Kismet data or demo data
- **GET /info**: System information endpoint
- **GET /iframe-test.html**: Test page for iframe integration

#### Issues:
1. **Data Formatting**: Empty device/network arrays when Kismet has no data
2. **Error Handling**: Falls back to demo data on any error
3. **Polling**: No automatic data refresh without WebSocket

### 5. WebSocket Integration

#### Working Features:
- Socket.IO properly configured with CORS
- Event forwarding for spectrum data
- Client connection tracking

#### Issues:
1. **Memory Leaks**: Event listeners not properly cleaned up
2. **Broadcasting**: Kismet data polling disabled by default
3. **Error Propagation**: WebSocket errors not properly handled

## Error Handling Analysis

### Current Issues:

1. **Connection Errors**:
   ```javascript
   // KismetClient fails with ECONNREFUSED
   // But direct curl to Kismet works
   ```
   - **Root Cause**: axios baseURL configuration issue
   - **Fix**: Use full URL paths instead of baseURL

2. **Timeout Errors**:
   - Script execution timeouts not configurable
   - No graceful degradation for slow operations

3. **CORS Errors**:
   - Dynamic CORS middleware conflicts with static configuration
   - Some endpoints missing proper CORS headers

## API Optimization Recommendations

### 1. Fix Kismet Client Connection
```javascript
// Current (broken):
baseURL: this.config.baseUrl,
timeout: this.config.timeout

// Recommended:
url: `${this.config.baseUrl}${endpoint}`,
timeout: this.config.timeout
```

### 2. Implement Proper Authentication
```javascript
// Add environment variable support
const kismetAuth = {
  username: process.env.KISMET_USER || 'admin',
  password: process.env.KISMET_PASS || 'admin'
};
```

### 3. Add Connection Pool Management
```javascript
// Implement connection pooling
const axiosInstance = axios.create({
  httpAgent: new http.Agent({ 
    keepAlive: true,
    maxSockets: 10
  })
});
```

### 4. Improve Error Recovery
```javascript
// Add retry logic with exponential backoff
async function retryRequest(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
```

### 5. Fix Memory Leaks
```javascript
// Properly remove event listeners
socket.on('disconnect', () => {
  // Remove all listeners for this specific socket
  spectrum.removeAllListeners(`socket-${socket.id}`);
});
```

## Service Integration Issues

### 1. Kismet API Integration
- **Problem**: KismetClient connection failures despite Kismet running
- **Impact**: No real device/network data available
- **Solution**: Fix axios configuration and add connection validation

### 2. Process Management
- **Problem**: Detached processes not properly tracked
- **Impact**: Can't determine if services are actually running
- **Solution**: Implement PID file tracking and process monitoring

### 3. WebSocket Broadcasting
- **Problem**: Kismet polling disabled, no automatic updates
- **Impact**: Frontend doesn't receive real-time updates
- **Solution**: Enable polling with configurable intervals

## Performance Optimizations

### 1. Caching Strategy
```javascript
// Implement in-memory cache for Kismet data
const cache = new Map();
const CACHE_TTL = 5000; // 5 seconds

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}
```

### 2. Request Batching
- Combine multiple Kismet API calls
- Reduce network overhead
- Implement request deduplication

### 3. Connection Pooling
- Reuse HTTP connections
- Reduce connection overhead
- Implement keep-alive properly

## Security Recommendations

### 1. Authentication
- Implement JWT tokens for API access
- Use environment variables for credentials
- Add rate limiting per user

### 2. Input Validation
- Add Joi validation for all endpoints
- Sanitize user inputs
- Prevent command injection in script execution

### 3. CORS Security
- Restrict origins in production
- Validate preflight requests
- Implement CSRF protection

## Monitoring Recommendations

### 1. Add Metrics Collection
```javascript
// Prometheus metrics
const promClient = require('prom-client');
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});
```

### 2. Implement Health Checks
- Add deep health checks for dependencies
- Monitor Kismet connection status
- Track WebSocket connection health

### 3. Error Tracking
- Implement Sentry or similar
- Track API errors by endpoint
- Monitor timeout occurrences

## Priority Fixes

1. **HIGH**: Fix KismetClient connection issues
2. **HIGH**: Implement proper error handling and recovery
3. **MEDIUM**: Add connection pooling and caching
4. **MEDIUM**: Fix memory leaks in WebSocket handlers
5. **LOW**: Implement comprehensive monitoring

## Testing Requirements

1. **Unit Tests**: Test KismetClient with mocked responses
2. **Integration Tests**: Test full API flow with real Kismet
3. **Load Tests**: Verify performance under concurrent connections
4. **Error Tests**: Validate error handling and recovery

## Conclusion

The Kismet Operations Center backend provides a solid foundation but requires fixes for:
- Kismet API connection reliability
- Error handling and recovery
- Memory management
- Performance optimization

Implementing these fixes will significantly improve system reliability and user experience.
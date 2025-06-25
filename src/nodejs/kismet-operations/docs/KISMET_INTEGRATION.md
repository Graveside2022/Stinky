# Kismet Data Integration

## Overview

The Node.js backend now includes full Kismet integration to provide WiFi scanning data to the frontend on port 8092. This integration supports both REST API endpoints and WebSocket real-time updates.

## Features

### 1. REST API Endpoint
- **Endpoint**: `GET /api/kismet-data`
- **Description**: Fetches current Kismet data including devices and networks
- **Response Format**:
```json
{
  "success": true,
  "source": "kismet|demo",
  "timestamp": 1234567890,
  "data": {
    "devices": [...],
    "networks": [...],
    "timestamp": 1234567890
  },
  "stats": {
    "total_devices": 10,
    "total_networks": 8,
    "kismet_connected": true
  }
}
```

### 2. WebSocket Support
- **Event**: `requestKismetData` - Client requests Kismet data
- **Response Event**: `kismetData` - Server sends Kismet data
- **Broadcast Event**: `kismetDataUpdate` - Automatic updates to all clients

### 3. Automatic Polling
- Enable with environment variable: `KISMET_AUTO_POLLING=true`
- Configure interval: `KISMET_POLL_INTERVAL=5000` (milliseconds)
- Broadcasts updates to all connected clients automatically

## Configuration

Set these environment variables to configure Kismet integration:

```bash
# Kismet API configuration
KISMET_URL=http://localhost:2501        # Kismet server URL
KISMET_API_KEY=                         # Optional API key for authentication
KISMET_TIMEOUT=5000                     # Request timeout in milliseconds

# Automatic polling
KISMET_AUTO_POLLING=true                # Enable automatic polling
KISMET_POLL_INTERVAL=5000               # Polling interval in milliseconds
```

## Data Format

### Device Object
```javascript
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "last_seen": 1234567890,
  "signal": {
    "kismet.common.signal.last_signal": -70,
    "kismet.common.signal.max_signal": -60,
    "kismet.common.signal.min_signal": -80
  },
  "manufacturer": "Apple",
  "type": "WiFi Client",
  "channel": 6,
  "frequency": 2437,
  "packets": 1000,
  "datasize": 500000,
  "location": {
    "lat": 37.7749,
    "lon": -122.4194
  }
}
```

### Network Object
```javascript
{
  "ssid": "MyNetwork",
  "bssid": "11:22:33:44:55:66",
  "channel": 11,
  "frequency": 2462,
  "encryption": "WPA2",
  "last_seen": 1234567890,
  "signal": {
    "kismet.common.signal.last_signal": -65
  },
  "clients": 5
}
```

## Error Handling

The integration gracefully handles Kismet connection failures:
1. Checks Kismet availability before attempting data fetch
2. Returns demo data if Kismet is unavailable
3. Includes error messages and warnings in response
4. Logs all errors for debugging

## Demo Mode

When Kismet is unavailable, the system automatically provides demo data:
- 10 demo devices with realistic properties
- 8 demo networks with common SSIDs
- Random signal strengths and timestamps
- Maintains the same data structure as real Kismet data

## Integration with Frontend

The frontend can access Kismet data through:

1. **HTTP Request**:
```javascript
fetch('http://localhost:8092/api/kismet-data')
  .then(response => response.json())
  .then(data => {
    console.log('Kismet data:', data);
  });
```

2. **WebSocket Request**:
```javascript
socket.emit('requestKismetData');
socket.on('kismetData', (data) => {
  console.log('Kismet data received:', data);
});
```

3. **Automatic Updates** (if polling enabled):
```javascript
socket.on('kismetDataUpdate', (data) => {
  console.log('Kismet update received:', data);
});
```

## Testing

Test the integration with:

```bash
# Test REST endpoint
curl http://localhost:8092/api/kismet-data

# Test with real Kismet (ensure Kismet is running)
KISMET_URL=http://localhost:2501 node server.js

# Test with automatic polling
KISMET_AUTO_POLLING=true KISMET_POLL_INTERVAL=3000 node server.js
```

## Troubleshooting

1. **No Kismet data**: Check if Kismet is running on the configured port
2. **Authentication errors**: Verify KISMET_API_KEY if Kismet requires authentication
3. **Timeout errors**: Increase KISMET_TIMEOUT value
4. **WebSocket issues**: Check CORS configuration and client connection
# Stinkster API Reference

Complete API documentation for all Stinkster services and endpoints.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [REST APIs](#rest-apis)
4. [WebSocket APIs](#websocket-apis)
5. [Data Formats](#data-formats)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Examples](#examples)

## Overview

Stinkster provides multiple APIs for different services:

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Spectrum Analyzer | 8092 | HTTP/WS | SDR control and data streaming |
| WigleToTAK | 6969 | HTTP/WS | WiFi device management and TAK conversion |
| Kismet Operations | 8002 | HTTP | Kismet control and monitoring |
| OpenWebRX | 8073 | HTTP/WS | SDR receiver interface |

### Base URLs

```
http://your-pi:8092/api/v1/    # Spectrum Analyzer
http://your-pi:6969/api/v1/    # WigleToTAK
http://your-pi:8002/api/v1/    # Kismet Operations
```

## Authentication

### API Key Authentication

Include API key in request headers:

```http
X-API-Key: your-api-key-here
```

Example:
```bash
curl -H "X-API-Key: your-api-key" \
     http://your-pi:8092/api/v1/spectrum/status
```

### Session Authentication

For web interfaces, session cookies are used:

```javascript
fetch('/api/v1/devices', {
    credentials: 'include'
});
```

## REST APIs

### Spectrum Analyzer API

#### Get Spectrum Status
```http
GET /api/v1/spectrum/status
```

Response:
```json
{
    "connected": true,
    "device": "HackRF One",
    "serial": "0000000000000000",
    "frequency": 100000000,
    "sampleRate": 20000000,
    "gain": {
        "lna": 16,
        "vga": 20,
        "amp": false
    }
}
```

#### Update Frequency
```http
POST /api/v1/spectrum/frequency
Content-Type: application/json

{
    "frequency": 433920000
}
```

Response:
```json
{
    "success": true,
    "frequency": 433920000
}
```

#### Update Gain Settings
```http
POST /api/v1/spectrum/gain
Content-Type: application/json

{
    "lna": 32,
    "vga": 30,
    "amp": true
}
```

#### Start/Stop Capture
```http
POST /api/v1/spectrum/control
Content-Type: application/json

{
    "action": "start" | "stop"
}
```

### WigleToTAK API

#### List Devices
```http
GET /api/v1/devices
```

Query parameters:
- `limit` - Number of devices (default: 100)
- `offset` - Pagination offset
- `sort` - Sort field (signal, lastseen, firstseen)
- `order` - Sort order (asc, desc)

Response:
```json
{
    "devices": [
        {
            "mac": "AA:BB:CC:DD:EE:FF",
            "ssid": "NetworkName",
            "manufacturer": "Apple",
            "type": "mobile",
            "signal": -45,
            "channel": 6,
            "frequency": 2437,
            "capabilities": ["WPA2", "WPS"],
            "firstSeen": "2024-01-15T10:30:00Z",
            "lastSeen": "2024-01-15T10:45:00Z",
            "lat": 40.7128,
            "lon": -74.0060,
            "packets": 1523
        }
    ],
    "total": 150,
    "limit": 100,
    "offset": 0
}
```

#### Get Device Details
```http
GET /api/v1/devices/{mac}
```

Response includes full device history and additional metadata.

#### Search Devices
```http
POST /api/v1/devices/search
Content-Type: application/json

{
    "query": "iPhone",
    "filters": {
        "type": ["mobile"],
        "signalMin": -70,
        "seenSince": "2024-01-15T00:00:00Z"
    }
}
```

#### Export to TAK
```http
POST /api/v1/tak/export
Content-Type: application/json

{
    "devices": ["AA:BB:CC:DD:EE:FF"],
    "format": "cot",
    "includeMetadata": true
}
```

Response:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="AA:BB:CC:DD:EE:FF" type="a-f-G-U-C" 
       time="2024-01-15T10:45:00Z" 
       start="2024-01-15T10:45:00Z" 
       stale="2024-01-15T10:50:00Z">
    <point lat="40.7128" lon="-74.0060" hae="0" ce="10" le="10"/>
    <detail>
        <contact callsign="iPhone-User"/>
        <remarks>Signal: -45dBm, Channel: 6</remarks>
    </detail>
</event>
```

#### Configure TAK Server
```http
POST /api/v1/tak/config
Content-Type: application/json

{
    "server": "tak-server.example.com",
    "port": 8087,
    "protocol": "tcp",
    "authentication": {
        "type": "certificate",
        "cert": "base64-encoded-cert",
        "key": "base64-encoded-key"
    }
}
```

### Kismet Operations API

#### Get Kismet Status
```http
GET /api/v1/kismet/status
```

Response:
```json
{
    "running": true,
    "uptime": 3600,
    "devices": 45,
    "packets": 125000,
    "sources": [
        {
            "uuid": "12345678-1234-1234-1234-123456789012",
            "interface": "wlan2",
            "type": "wifi",
            "channel": 6,
            "hopRate": 5,
            "packetsReceived": 45000
        }
    ]
}
```

#### Control Kismet
```http
POST /api/v1/kismet/control
Content-Type: application/json

{
    "action": "start" | "stop" | "restart"
}
```

#### Configure Source
```http
POST /api/v1/kismet/sources/{uuid}/config
Content-Type: application/json

{
    "hopChannels": [1, 6, 11],
    "hopRate": 3,
    "channelDwell": 0.25
}
```

### System API

#### Get System Status
```http
GET /api/v1/system/status
```

Response:
```json
{
    "hostname": "stinkster",
    "uptime": 86400,
    "load": [0.5, 0.6, 0.7],
    "memory": {
        "total": 4294967296,
        "free": 2147483648,
        "used": 2147483648,
        "percentage": 50
    },
    "cpu": {
        "model": "BCM2711",
        "cores": 4,
        "temperature": 45.2,
        "usage": 25.5
    },
    "storage": {
        "total": 32212254720,
        "free": 16106127360,
        "used": 16106127360,
        "percentage": 50
    }
}
```

#### Get Service Health
```http
GET /api/v1/system/health
```

Response:
```json
{
    "healthy": true,
    "services": {
        "spectrum": {
            "status": "running",
            "healthy": true,
            "uptime": 3600
        },
        "kismet": {
            "status": "running",
            "healthy": true,
            "uptime": 7200
        },
        "wigletotak": {
            "status": "running",
            "healthy": true,
            "uptime": 3600
        },
        "gps": {
            "status": "running",
            "healthy": true,
            "fix": true,
            "satellites": 8
        }
    }
}
```

## WebSocket APIs

### Spectrum Analyzer WebSocket

**Endpoint**: `ws://your-pi:8092/ws/spectrum`

#### Connection
```javascript
const ws = new WebSocket('ws://your-pi:8092/ws/spectrum');

ws.onopen = () => {
    console.log('Connected to spectrum analyzer');
};
```

#### Message Types

**Subscribe to FFT data**:
```json
{
    "type": "subscribe",
    "channel": "fft",
    "params": {
        "rate": 10
    }
}
```

**FFT Data Message**:
```json
{
    "type": "fft",
    "timestamp": 1234567890,
    "data": {
        "centerFreq": 100000000,
        "sampleRate": 20000000,
        "bins": 1024,
        "values": [-80, -75, -70, ...]
    }
}
```

**Control Commands**:
```json
{
    "type": "control",
    "command": "frequency",
    "value": 433920000
}
```

### WigleToTAK WebSocket

**Endpoint**: `ws://your-pi:6969/ws/devices`

#### Real-time Device Updates
```json
{
    "type": "device_update",
    "device": {
        "mac": "AA:BB:CC:DD:EE:FF",
        "ssid": "NetworkName",
        "signal": -45,
        "lastSeen": "2024-01-15T10:45:00Z"
    }
}
```

#### Device Tracking
```json
{
    "type": "subscribe",
    "filter": {
        "macs": ["AA:BB:CC:DD:EE:FF"],
        "trackMovement": true
    }
}
```

### GPS WebSocket

**Endpoint**: `ws://your-pi:8092/ws/gps`

#### GPS Updates
```json
{
    "type": "gps_position",
    "data": {
        "lat": 40.7128,
        "lon": -74.0060,
        "alt": 10.5,
        "speed": 0,
        "heading": 0,
        "accuracy": 5,
        "satellites": 8,
        "fix": "3D",
        "timestamp": "2024-01-15T10:45:00Z"
    }
}
```

## Data Formats

### Device Object
```typescript
interface Device {
    mac: string;              // MAC address
    ssid?: string;           // Network name
    manufacturer?: string;    // OUI lookup result
    type: DeviceType;        // mobile, ap, iot, etc.
    signal: number;          // Signal strength in dBm
    channel: number;         // WiFi channel
    frequency: number;       // Frequency in MHz
    capabilities: string[];  // Security capabilities
    firstSeen: string;       // ISO 8601 timestamp
    lastSeen: string;        // ISO 8601 timestamp
    lat?: number;            // Latitude
    lon?: number;            // Longitude
    packets: number;         // Packet count
    dataPackets: number;     // Data packet count
    encrypted: boolean;      // Encryption status
}
```

### FFT Data Format
```typescript
interface FFTData {
    timestamp: number;       // Unix timestamp
    centerFreq: number;      // Center frequency in Hz
    sampleRate: number;      // Sample rate in Hz
    bins: number;           // Number of FFT bins
    values: number[];       // Power values in dBm
    peakFreq?: number;      // Detected peak frequency
    peakPower?: number;     // Peak power in dBm
}
```

### CoT (Cursor on Target) Format
```xml
<event version="2.0" uid="unique-id" type="a-f-G-U-C" 
       time="2024-01-15T10:45:00Z" 
       start="2024-01-15T10:45:00Z" 
       stale="2024-01-15T10:50:00Z">
    <point lat="40.7128" lon="-74.0060" hae="0" ce="10" le="10"/>
    <detail>
        <contact callsign="Device-Name"/>
        <remarks>Additional information</remarks>
        <usericon iconsetpath="COT_MAPPING_2525B/a-f/a-f-G"/>
    </detail>
</event>
```

## Error Handling

### Error Response Format
```json
{
    "error": {
        "code": "INVALID_FREQUENCY",
        "message": "Frequency must be between 1 MHz and 6 GHz",
        "details": {
            "provided": 7000000000,
            "min": 1000000,
            "max": 6000000000
        }
    }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_PARAMS` | 400 | Invalid request parameters |
| `DEVICE_ERROR` | 503 | Hardware device error |
| `RATE_LIMITED` | 429 | Too many requests |

### WebSocket Errors
```json
{
    "type": "error",
    "error": {
        "code": "SUBSCRIPTION_FAILED",
        "message": "Unable to subscribe to channel",
        "recoverable": true
    }
}
```

## Rate Limiting

Default limits:
- **REST API**: 100 requests per minute
- **WebSocket**: 1000 messages per minute
- **Data exports**: 10 per hour

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## Examples

### Python Client

```python
import requests
import websocket
import json

class StinksterClient:
    def __init__(self, host, api_key):
        self.host = host
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers['X-API-Key'] = api_key
    
    def get_devices(self):
        response = self.session.get(
            f'http://{self.host}:6969/api/v1/devices'
        )
        response.raise_for_status()
        return response.json()
    
    def set_frequency(self, freq):
        response = self.session.post(
            f'http://{self.host}:8092/api/v1/spectrum/frequency',
            json={'frequency': freq}
        )
        response.raise_for_status()
        return response.json()
    
    def stream_fft(self, callback):
        ws = websocket.WebSocketApp(
            f'ws://{self.host}:8092/ws/spectrum',
            on_message=lambda ws, msg: callback(json.loads(msg)),
            header={'X-API-Key': self.api_key}
        )
        
        def on_open(ws):
            ws.send(json.dumps({
                'type': 'subscribe',
                'channel': 'fft'
            }))
        
        ws.on_open = on_open
        ws.run_forever()

# Usage
client = StinksterClient('192.168.1.100', 'your-api-key')
devices = client.get_devices()
print(f"Found {len(devices['devices'])} devices")
```

### JavaScript/TypeScript Client

```typescript
class StinksterAPI {
    private baseUrl: string;
    private apiKey: string;
    private ws: WebSocket | null = null;

    constructor(host: string, apiKey: string) {
        this.baseUrl = `http://${host}`;
        this.apiKey = apiKey;
    }

    async getDevices(): Promise<DeviceList> {
        const response = await fetch(
            `${this.baseUrl}:6969/api/v1/devices`,
            {
                headers: {
                    'X-API-Key': this.apiKey
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return response.json();
    }

    connectSpectrum(onData: (data: FFTData) => void): void {
        this.ws = new WebSocket(
            `ws://${this.baseUrl.replace('http://', '')}:8092/ws/spectrum`
        );

        this.ws.onopen = () => {
            this.ws!.send(JSON.stringify({
                type: 'subscribe',
                channel: 'fft'
            }));
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'fft') {
                onData(message.data);
            }
        };
    }

    async exportToTAK(devices: string[]): Promise<string> {
        const response = await fetch(
            `${this.baseUrl}:6969/api/v1/tak/export`,
            {
                method: 'POST',
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    devices,
                    format: 'cot'
                })
            }
        );
        
        return response.text();
    }
}

// Usage
const api = new StinksterAPI('192.168.1.100', 'your-api-key');

// Get devices
const devices = await api.getDevices();
console.log(`Found ${devices.total} devices`);

// Stream spectrum data
api.connectSpectrum((fftData) => {
    console.log(`Peak: ${fftData.peakFreq} Hz at ${fftData.peakPower} dBm`);
});
```

### cURL Examples

```bash
# Get system status
curl -H "X-API-Key: your-api-key" \
     http://your-pi:8092/api/v1/system/status

# Update spectrum frequency
curl -X POST \
     -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"frequency": 433920000}' \
     http://your-pi:8092/api/v1/spectrum/frequency

# Search for devices
curl -X POST \
     -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"query": "iPhone", "filters": {"signalMin": -70}}' \
     http://your-pi:6969/api/v1/devices/search

# Export device to TAK
curl -X POST \
     -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"devices": ["AA:BB:CC:DD:EE:FF"]}' \
     http://your-pi:6969/api/v1/tak/export
```

## API Versioning

The API uses URL versioning:
- Current version: `v1`
- Version in URL: `/api/v1/`

Deprecated endpoints return:
```json
{
    "warning": "This endpoint is deprecated",
    "alternative": "/api/v2/new-endpoint",
    "deprecationDate": "2024-06-01"
}
```

## Additional Resources

- [OpenAPI Specification](/api/openapi.yaml)
- [WebSocket Protocol Details](/api/websocket-protocol.md)
- [Authentication Guide](/api/authentication.md)
- [Rate Limiting Details](/api/rate-limiting.md)
- [SDK Downloads](/api/sdks/)

For questions or issues, please refer to the [Developer Guide](../developer-guide/README.md).
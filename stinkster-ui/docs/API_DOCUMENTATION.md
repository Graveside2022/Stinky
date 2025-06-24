# API Documentation - Stinkster UI

Comprehensive REST API and WebSocket interface documentation for the Stinkster UI backend services.

## Base Configuration

- **Base URL**: `http://localhost:3000/api`
- **WebSocket URL**: `ws://localhost:3000/socket.io`
- **Authentication**: Session-based (where applicable)
- **Content-Type**: `application/json`
- **CORS**: Enabled for development origins

## Response Format

All API responses follow a consistent format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
```

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-12-24T23:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-12-24T23:00:00.000Z"
}
```

## Core APIs

### Device Management

#### Get All Devices
```http
GET /api/devices
```

**Query Parameters:**
- `filter` (string, optional): Filter by device type
- `limit` (number, optional): Limit results (default: 100)
- `offset` (number, optional): Pagination offset

**Response:**
```typescript
interface DeviceResponse {
  devices: Device[];
  total: number;
  filtered: number;
}

interface Device {
  id: string;
  mac_address: string;
  ssid?: string;
  manufacturer?: string;
  first_seen: string;
  last_seen: string;
  signal_strength: number;
  frequency: number;
  channel: number;
  encryption: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  tags: string[];
  threat_level: 'low' | 'medium' | 'high';
}
```

#### Get Device Details
```http
GET /api/devices/{device_id}
```

**Response:**
```typescript
interface DeviceDetail extends Device {
  history: DeviceHistory[];
  connections: Connection[];
  analytics: DeviceAnalytics;
}
```

#### Update Device
```http
PUT /api/devices/{device_id}
```

**Request Body:**
```json
{
  "tags": ["string"],
  "threat_level": "low|medium|high",
  "notes": "string"
}
```

#### Delete Device
```http
DELETE /api/devices/{device_id}
```

### TAK Integration

#### Get TAK Configuration
```http
GET /api/tak/config
```

**Response:**
```typescript
interface TakConfig {
  server_host: string;
  server_port: number;
  protocol: 'tcp' | 'udp';
  certificate_path?: string;
  enabled: boolean;
  broadcast_interval: number;
  callsign: string;
  team: string;
  role: string;
}
```

#### Update TAK Configuration
```http
PUT /api/tak/config
```

**Request Body:** `TakConfig`

#### Start TAK Broadcasting
```http
POST /api/tak/start
```

#### Stop TAK Broadcasting
```http
POST /api/tak/stop
```

#### Get TAK Status
```http
GET /api/tak/status
```

**Response:**
```typescript
interface TakStatus {
  connected: boolean;
  broadcasting: boolean;
  last_broadcast: string;
  messages_sent: number;
  connection_error?: string;
}
```

### Scan Management

#### Start Scan
```http
POST /api/scan/start
```

**Request Body:**
```json
{
  "duration": 3600,
  "channels": [1, 2, 3],
  "interface": "wlan0",
  "filters": {
    "include_hidden": true,
    "min_signal_strength": -80
  }
}
```

#### Stop Scan
```http
POST /api/scan/stop
```

#### Get Scan Status
```http
GET /api/scan/status
```

**Response:**
```typescript
interface ScanStatus {
  active: boolean;
  started_at?: string;
  duration: number;
  progress: number;
  devices_found: number;
  current_channel: number;
  interface: string;
}
```

### Statistics

#### Get Device Statistics
```http
GET /api/stats/devices
```

**Query Parameters:**
- `timeframe` (string): `1h`, `24h`, `7d`, `30d`
- `group_by` (string): `hour`, `day`, `channel`, `manufacturer`

**Response:**
```typescript
interface DeviceStats {
  total_devices: number;
  new_devices: number;
  active_devices: number;
  by_encryption: Record<string, number>;
  by_manufacturer: Record<string, number>;
  by_channel: Record<number, number>;
  timeline: Array<{
    timestamp: string;
    count: number;
  }>;
}
```

#### Get Signal Statistics
```http
GET /api/stats/signals
```

**Response:**
```typescript
interface SignalStats {
  average_signal_strength: number;
  strongest_signal: number;
  weakest_signal: number;
  signal_distribution: Array<{
    range: string;
    count: number;
  }>;
}
```

### System Monitoring

#### Get System Health
```http
GET /api/system/health
```

**Response:**
```typescript
interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  services: {
    kismet: ServiceStatus;
    hackrf: ServiceStatus;
    wigle: ServiceStatus;
    gpsd: ServiceStatus;
  };
  system: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    cpu_temp: number;
    load_avg: number[];
  };
  alerts: Alert[];
}

interface ServiceStatus {
  running: boolean;
  pid?: number;
  cpu?: number;
  memory?: number;
}

interface Alert {
  level: 'info' | 'warning' | 'error';
  service?: string;
  type?: string;
  message: string;
  timestamp?: string;
}
```

#### Get System Metrics
```http
GET /api/system/metrics
```

**Query Parameters:**
- `timeframe` (string): Time range for metrics

## Service Integration APIs

### HackRF Integration

#### Get HackRF Status
```http
GET /api/hackrf/status
```

#### Start Spectrum Analysis
```http
POST /api/hackrf/spectrum/start
```

**Request Body:**
```json
{
  "frequency": 144000000,
  "sample_rate": 2000000,
  "gain": 20
}
```

#### Get Spectrum Data
```http
GET /api/hackrf/spectrum/data
```

### Kismet Integration

#### Get Kismet Status
```http
GET /api/kismet/status
```

#### Get Kismet Devices
```http
GET /api/kismet/devices
```

#### Proxy Kismet API
```http
GET /api/kismet/proxy/{endpoint}
```

### WigleToTAK Service

#### Get Service Status
```http
GET /api/wigle/status
```

#### Import Wigle CSV
```http
POST /api/wigle/import
Content-Type: multipart/form-data
```

**Request:** File upload with CSV data

## Data Management APIs

### Import/Export

#### Import Data
```http
POST /api/import
Content-Type: multipart/form-data
```

**Request:** File upload (CSV, JSON, etc.)

#### Export Devices
```http
GET /api/export/devices
```

**Query Parameters:**
- `format` (string): `csv`, `json`, `tak`, `wigle`
- `filter` (string): Device filter criteria

#### Export Statistics
```http
GET /api/export/stats
```

### File Management

#### List Files
```http
GET /api/files
```

#### Get File Info
```http
GET /api/files/{file_id}
```

#### Delete File
```http
DELETE /api/files/{file_id}
```

## Configuration APIs

### Antenna Configuration

#### Get Antenna Settings
```http
GET /api/antenna/config
```

**Response:**
```typescript
interface AntennaConfig {
  sensitivity_compensation: number;
  gain_offset: number;
  frequency_corrections: Array<{
    frequency: number;
    correction: number;
  }>;
}
```

#### Update Antenna Settings
```http
PUT /api/antenna/config
```

### Alert Management

#### Get Alerts
```http
GET /api/alerts
```

#### Create Alert Rule
```http
POST /api/alerts/rules
```

**Request Body:**
```json
{
  "name": "string",
  "condition": "string",
  "threshold": "number",
  "action": "email|webhook|log"
}
```

### Geofence Management

#### Get Geofences
```http
GET /api/geofences
```

#### Create Geofence
```http
POST /api/geofences
```

**Request Body:**
```json
{
  "name": "string",
  "type": "circle|polygon",
  "coordinates": "array",
  "radius": "number",
  "alert_on_entry": "boolean",
  "alert_on_exit": "boolean"
}
```

## WebSocket Events

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
});
```

### Event Types

#### Device Updates
```javascript
socket.on('device-update', (data) => {
  // Real-time device status changes
  console.log('Device updated:', data);
});

// Subscribe to specific device
socket.emit('subscribe-device', { device_id: 'xxx' });
```

#### Scan Progress
```javascript
socket.on('scan-progress', (data) => {
  // Live scan status updates
  console.log('Scan progress:', data.progress);
});
```

#### TAK Broadcasting
```javascript
socket.on('tak-broadcast', (data) => {
  // TAK message broadcasting events
  console.log('TAK message sent:', data);
});
```

#### System Alerts
```javascript
socket.on('system-alert', (alert) => {
  // System health notifications
  console.log('System alert:', alert);
});
```

#### Spectrum Data
```javascript
socket.on('spectrum-data', (data) => {
  // Real-time spectrum analyzer data
  console.log('Spectrum update:', data);
});
```

### Event Subscription

```javascript
// Subscribe to specific events
socket.emit('subscribe', {
  events: ['device-update', 'scan-progress'],
  filters: {
    device_type: 'wifi',
    signal_strength: { min: -70 }
  }
});

// Unsubscribe
socket.emit('unsubscribe', {
  events: ['device-update']
});
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error |
| 503 | Service Unavailable - External service down |

## Rate Limiting

- **Standard endpoints**: 100 requests per minute
- **File upload endpoints**: 10 requests per minute
- **WebSocket events**: 1000 events per minute per connection

## Authentication

### Session-based Authentication (where required)

```javascript
// Login (if implemented)
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    username: 'user',
    password: 'pass'
  })
});

// Subsequent requests automatically include session
fetch('/api/devices', {
  credentials: 'include'
});
```

## SDK Examples

### TypeScript Client

```typescript
class StinksterApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async getDevices(options?: {
    filter?: string;
    limit?: number;
    offset?: number;
  }): Promise<DeviceResponse> {
    const params = new URLSearchParams();
    if (options?.filter) params.set('filter', options.filter);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const response = await fetch(
      `${this.baseUrl}/devices?${params}`,
      { credentials: 'include' }
    );
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  }

  async startScan(config: ScanConfig): Promise<void> {
    const response = await fetch(`${this.baseUrl}/scan/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config)
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }
  }
}
```

### Python Client

```python
import requests
import socketio

class StinksterClient:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
        self.session = requests.Session()
        
    def get_devices(self, filter=None, limit=100, offset=0):
        params = {'limit': limit, 'offset': offset}
        if filter:
            params['filter'] = filter
            
        response = self.session.get(
            f'{self.base_url}/api/devices',
            params=params
        )
        response.raise_for_status()
        
        result = response.json()
        if not result['success']:
            raise Exception(result['error'])
            
        return result['data']
        
    def connect_websocket(self):
        sio = socketio.Client()
        
        @sio.event
        def device_update(data):
            print(f'Device update: {data}')
            
        sio.connect(f'{self.base_url}')
        return sio
```

## Testing

### API Testing with curl

```bash
# Get all devices
curl -X GET "http://localhost:3000/api/devices" \
  -H "Accept: application/json"

# Start a scan
curl -X POST "http://localhost:3000/api/scan/start" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 3600,
    "channels": [1, 2, 3],
    "interface": "wlan0"
  }'

# Get system health
curl -X GET "http://localhost:3000/api/system/health"
```

### WebSocket Testing

```javascript
// Browser console testing
const socket = io('ws://localhost:3000');

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('subscribe', { events: ['device-update'] });
});

socket.on('device-update', (data) => {
  console.log('Device update:', data);
});
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS_ORIGIN is configured correctly
2. **WebSocket Connection Failed**: Check firewall and port availability
3. **Service Unavailable**: Verify external services (Kismet, HackRF) are running
4. **File Upload Failed**: Check file size limits and permissions

### Debug Logging

```bash
# Enable debug logging
DEBUG=stinkster:* npm run dev

# Specific component debugging
DEBUG=stinkster:api npm run dev
DEBUG=stinkster:websocket npm run dev
```

---

For more information, see the [Development Guide](DEVELOPMENT_GUIDE.md) and [Backend README](backend/README.md).
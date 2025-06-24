# Kismet WebSocket Integration API

## Overview

The Kismet WebSocket service provides real-time streaming of WiFi device data, alerts, and system status from Kismet to the frontend application. It uses Socket.IO for reliable bidirectional communication with automatic reconnection and event-based messaging.

## Architecture

### Components

1. **KismetWebSocketService**: Polls Kismet REST API and converts data to WebSocket events
2. **WebSocketHandler**: Manages Socket.IO connections and event distribution
3. **Event Throttling**: Prevents overwhelming clients with rapid updates
4. **Connection Recovery**: Automatic reconnection with exponential backoff

### Data Flow

```
Kismet Server → REST API → KismetWebSocketService → WebSocketHandler → Socket.IO → Frontend
```

## WebSocket Events

### Client to Server Events

#### `subscribe`
Subscribe to specific event topics.
```javascript
socket.emit('subscribe', ['devices', 'alerts', 'system', 'scan', 'tak']);
```

#### `unsubscribe`
Unsubscribe from event topics.
```javascript
socket.emit('unsubscribe', ['alerts']);
```

#### `ping`
Measure connection latency.
```javascript
socket.emit('ping', (timestamp) => {
  console.log('Latency:', Date.now() - timestamp);
});
```

### Server to Client Events

#### `connected`
Emitted when client successfully connects.
```javascript
socket.on('connected', () => {
  console.log('Connected to server');
});
```

#### `event`
Main event channel for all Kismet data.
```javascript
socket.on('event', (event) => {
  // event.type determines the event type
  // event.data contains the payload
  // event.timestamp is the event time
  // event.id is a unique identifier
});
```

#### `error`
Error notifications.
```javascript
socket.on('error', ({ message, code }) => {
  console.error('Error:', message);
});
```

## Event Types

### Device Events

#### `device:update`
Emitted when a device is discovered, updated, or removed.

```typescript
{
  type: 'device:update',
  data: {
    device: WifiDevice,
    action: 'new' | 'update' | 'remove',
    changes?: Partial<WifiDevice>  // Only for updates
  },
  timestamp: number,
  id: string
}
```

### Alert Events

#### `alert:new`
Emitted when Kismet generates a new alert.

```typescript
{
  type: 'alert:new',
  data: {
    alert: {
      id: string,
      type: 'kismet',
      timestamp: number,
      severity: 'low' | 'medium' | 'high',
      message: string,
      header: string,
      class: string,
      deviceKey?: string,
      read: boolean
    }
  },
  timestamp: number,
  id: string
}
```

### System Events

#### `scan:status`
Regular updates on scanning status.

```typescript
{
  type: 'scan:status',
  data: {
    scanning: boolean,
    devicesFound: number,
    packetsProcessed: number,
    errors: number,
    currentChannel?: number
  },
  timestamp: number,
  id: string
}
```

#### `server:shutdown`
Notification before server shutdown.

```typescript
{
  type: 'server:shutdown',
  data: {
    message: string
  },
  timestamp: number
}
```

## REST API Endpoints

### `/api/kismet/ws/status`
Get WebSocket and Kismet connection status.

**Response:**
```json
{
  "success": true,
  "data": {
    "kismet": {
      "connected": true,
      "retries": 0,
      "deviceCount": 45,
      "lastPoll": 1700000000
    },
    "websocket": {
      "clients": 3,
      "clientDetails": [...],
      "rooms": {
        "devices": 2,
        "alerts": 1
      }
    }
  }
}
```

### `/api/kismet/ws/refresh`
Force refresh all Kismet data.

**Method:** POST

**Response:**
```json
{
  "success": true,
  "message": "Data refresh initiated"
}
```

### `/api/kismet/ws/stats`
Get WebSocket event statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "websocket": {
      "connectedClients": 3,
      "rooms": {...},
      "uptime": 3600
    },
    "kismet": {...},
    "events": {
      "totalEmitted": 1500,
      "byType": {...}
    }
  }
}
```

## Event Throttling

To prevent overwhelming clients, certain events are throttled:

- **Device Updates**: 500ms minimum interval
- **System Status**: 2000ms minimum interval  
- **Scan Status**: 1000ms minimum interval
- **Signal Updates**: 250ms minimum interval

New device discoveries and removals are never throttled.

## Connection Management

### Automatic Reconnection

The service implements automatic reconnection with exponential backoff:

1. Initial retry delay: 5 seconds
2. Maximum retries: 5
3. Exponential backoff: delay * 2^(retry - 1)

### Heartbeat Monitoring

- Heartbeat interval: 30 seconds
- Checks Kismet API availability
- Emits connection status to monitoring

## Usage Example

### Frontend Client

```javascript
import { io } from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:8001', {
  transports: ['websocket', 'polling']
});

// Subscribe to events
socket.on('connected', () => {
  socket.emit('subscribe', ['devices', 'alerts']);
});

// Handle device updates
socket.on('event', (event) => {
  switch (event.type) {
    case 'device:update':
      const { device, action } = event.data;
      if (action === 'new') {
        console.log('New device:', device.ssid, device.mac);
      }
      break;
      
    case 'alert:new':
      const { alert } = event.data;
      console.log('Alert:', alert.message);
      break;
  }
});

// Measure latency
setInterval(() => {
  socket.emit('ping', (timestamp) => {
    console.log('Latency:', Date.now() - timestamp, 'ms');
  });
}, 10000);
```

### Running the Example Client

```bash
npm run example:ws-client
```

## Configuration

Environment variables:

- `KISMET_API_URL`: Kismet REST API URL (default: http://localhost:2501)
- `KISMET_API_KEY`: Kismet API key for authentication
- `KISMET_ENABLED`: Enable/disable Kismet integration (default: true)
- `CORS_ORIGIN`: CORS origin for WebSocket connections (default: *)

## Error Handling

The service handles various error scenarios:

1. **Kismet Unavailable**: Continues to retry with backoff
2. **API Errors**: Logged but doesn't stop the service
3. **Data Parsing Errors**: Skips invalid data and continues
4. **WebSocket Errors**: Client disconnection handled gracefully

## Performance Considerations

1. **Polling Interval**: 2 seconds (configurable)
2. **Device Cache**: Only tracks recent devices (last 5 minutes)
3. **Event Batching**: Multiple updates consolidated when possible
4. **Memory Management**: Automatic cleanup of old data

## Security

1. **Authentication**: Optional API key for Kismet access
2. **CORS**: Configurable origin restrictions
3. **Rate Limiting**: Prevents DoS through excessive subscriptions
4. **Input Validation**: All client inputs validated

## Monitoring

The service provides extensive logging:

- Connection status changes
- Data polling cycles
- Event emission statistics
- Error conditions
- Performance metrics

## Troubleshooting

### Common Issues

1. **No events received**
   - Check Kismet is running
   - Verify API URL is correct
   - Check browser console for WebSocket errors

2. **High latency**
   - Check network conditions
   - Verify server resources
   - Consider increasing throttle intervals

3. **Missing devices**
   - Check Kismet datasource configuration
   - Verify WiFi adapter is in monitor mode
   - Check signal threshold settings

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

This will show detailed polling information and event flow.
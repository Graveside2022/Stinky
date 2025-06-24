# WebSocket Abstraction Layer Migration Guide

## Overview

The WebSocket abstraction layer provides a unified interface for both Socket.IO and native WebSocket connections, making it easier to migrate between connection types and maintain backward compatibility during the Svelte migration.

## Key Features

- **Unified Interface**: Single API for both Socket.IO and native WebSocket
- **Automatic Reconnection**: Built-in reconnection logic with exponential backoff
- **TypeScript Support**: Full type definitions for all messages and events
- **Backward Compatible**: Works with existing vanilla JavaScript code
- **Metrics & Monitoring**: Built-in connection metrics and performance tracking
- **Request/Response Pattern**: Promise-based request/response for better async handling

## Installation

### For TypeScript Projects
```typescript
import { createWebSocketClient } from './src/lib/websocket-client';
import type * as WSTypes from './src/types/websocket';
```

### For JavaScript Projects
```html
<script src="/socket.io/socket.io.js"></script>
<script src="/src/lib/websocket-client.js"></script>
```

## Basic Usage

### Creating a Connection

```javascript
// Socket.IO connection
const client = createWebSocketClient({
  url: 'http://localhost:8003',
  type: 'socket.io',
  reconnect: true,
  reconnectDelay: 2000
});

// Native WebSocket connection
const client = createWebSocketClient({
  url: 'ws://localhost:8003',
  type: 'websocket',
  reconnect: true
});

// Connect
await client.connect();
```

### Event Handling

```javascript
// Listen for events
client.on('connect', () => {
  console.log('Connected!');
});

client.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

client.on('fftData', (data) => {
  console.log('FFT data received:', data);
});

client.on('kismetData', (data) => {
  console.log('Kismet data:', data.stats);
});

// Generic message handler
client.on('message', (message) => {
  console.log('Message type:', message.type);
});
```

### Sending Messages

```javascript
// Socket.IO style emit
client.emit('requestStatus');
client.emit('requestSignals', { threshold: -70 });

// Request/response pattern with timeout
try {
  const status = await client.request('requestStatus', null, 5000);
  console.log('Status:', status);
} catch (error) {
  console.error('Request failed:', error);
}

// Native WebSocket style send
client.send(JSON.stringify({ type: 'ping' }));
```

## Migration Examples

### Before (Direct Socket.IO)
```javascript
const socket = io('http://localhost:8003');

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('requestStatus');
});

socket.on('status', (data) => {
  updateUI(data);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### After (Using Abstraction)
```javascript
const client = createWebSocketClient({
  url: 'http://localhost:8003',
  type: 'socket.io'
});

client.on('connect', () => {
  console.log('Connected');
  client.emit('requestStatus');
});

client.on('status', (data) => {
  updateUI(data);
});

client.on('disconnect', () => {
  console.log('Disconnected');
});

await client.connect();
```

### Handling Multiple Message Types

```javascript
// Define message handlers
const messageHandlers = {
  fftData: (data) => updateSpectrum(data),
  signalsDetected: (data) => showSignals(data.signals),
  kismetData: (data) => updateDeviceList(data.data.devices),
  status: (data) => updateStatus(data)
};

// Register all handlers
Object.entries(messageHandlers).forEach(([event, handler]) => {
  client.on(event, handler);
});
```

### Connection State Management

```javascript
// Check connection state
if (client.connected) {
  // Send messages
}

// Get full state information
const state = client.state;
console.log('Connected:', state.connected);
console.log('Reconnect attempts:', state.reconnectAttempts);
console.log('Connection type:', state.connectionType);

// Update reconnection options
client.setReconnectOptions({
  reconnectAttempts: 5,
  reconnectDelay: 3000
});
```

### Metrics and Monitoring

```javascript
// Get connection metrics
const metrics = client.getMetrics();
console.log('Messages sent:', metrics.messagesSent);
console.log('Messages received:', metrics.messagesReceived);
console.log('Bytes transferred:', metrics.bytesReceived + metrics.bytesSent);
console.log('Connection uptime:', metrics.connectionTime);

// Monitor connection health
setInterval(() => {
  const metrics = client.getMetrics();
  updateDashboard(metrics);
}, 1000);
```

## TypeScript Usage

```typescript
import { createWebSocketClient } from './src/lib/websocket-client';
import type { 
  IWebSocketClient, 
  WebSocketMessage,
  KismetData,
  FFTData,
  SignalDetection
} from './src/types/websocket';

const client: IWebSocketClient = createWebSocketClient({
  url: 'http://localhost:8003',
  type: 'socket.io'
});

// Type-safe event handling
client.on('kismetData', (data: KismetData) => {
  data.data.devices.forEach(device => {
    console.log(`Device ${device.mac}: ${device.signal}dBm`);
  });
});

// Type-safe requests
const status = await client.request<'requestStatus', 'status'>('requestStatus');
```

## Advanced Features

### Custom Reconnection Logic

```javascript
const client = createWebSocketClient({
  url: 'http://localhost:8003',
  type: 'socket.io',
  reconnect: true,
  reconnectAttempts: 10,
  reconnectDelay: 1000,
  reconnectDelayMax: 30000
});

client.on('reconnect_attempt', (attempt) => {
  console.log(`Reconnection attempt ${attempt}`);
});

client.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
});

client.on('reconnect_failed', () => {
  console.log('Failed to reconnect after maximum attempts');
  // Implement fallback logic
});
```

### Namespace Support (Socket.IO)

```javascript
// Connect to specific namespace
const signalClient = createWebSocketClient({
  url: 'http://localhost:8003/signal-stream',
  type: 'socket.io'
});

await signalClient.connect();

signalClient.emit('subscribe', { sources: ['kismet', 'hackrf'] });
signalClient.on('signal', (data) => {
  plotSignalOnMap(data.data);
});
```

### Error Handling

```javascript
client.on('error', (error) => {
  console.error('WebSocket error:', error);
  
  // Check error type and handle accordingly
  if (error.message.includes('timeout')) {
    showTimeoutWarning();
  } else if (error.message.includes('authentication')) {
    redirectToLogin();
  }
});

// Handle failed requests
try {
  const data = await client.request('requestKismetData', null, 5000);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Request timed out, retrying...');
    // Retry logic
  }
}
```

## Best Practices

1. **Always await connection**: Ensure the connection is established before sending messages
   ```javascript
   await client.connect();
   client.emit('requestStatus');
   ```

2. **Handle connection lifecycle**: Set up event handlers before connecting
   ```javascript
   const client = createWebSocketClient(options);
   client.on('connect', onConnect);
   client.on('disconnect', onDisconnect);
   await client.connect();
   ```

3. **Clean up on unmount**: Disconnect when component/page is destroyed
   ```javascript
   // In cleanup/destroy function
   client.disconnect();
   ```

4. **Use request/response for critical operations**: Get confirmation for important actions
   ```javascript
   try {
     const result = await client.request('startScript', { name: 'kismet' }, 10000);
     console.log('Script started:', result);
   } catch (error) {
     console.error('Failed to start script:', error);
   }
   ```

5. **Monitor connection health**: Implement heartbeat or status checks
   ```javascript
   setInterval(async () => {
     if (client.connected) {
       try {
         await client.request('requestStatus', null, 3000);
       } catch (error) {
         console.warn('Health check failed:', error);
       }
     }
   }, 30000);
   ```

## Svelte Integration Example

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { createWebSocketClient } from '$lib/websocket-client';
  
  let client;
  let connected = false;
  let messages = [];
  
  onMount(async () => {
    client = createWebSocketClient({
      url: 'http://localhost:8003',
      type: 'socket.io'
    });
    
    client.on('connect', () => {
      connected = true;
    });
    
    client.on('disconnect', () => {
      connected = false;
    });
    
    client.on('message', (msg) => {
      messages = [...messages, msg].slice(-100); // Keep last 100
    });
    
    await client.connect();
  });
  
  onDestroy(() => {
    if (client) {
      client.disconnect();
    }
  });
  
  function requestStatus() {
    if (client && connected) {
      client.emit('requestStatus');
    }
  }
</script>

<div>
  <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
  <button on:click={requestStatus} disabled={!connected}>
    Request Status
  </button>
  
  <ul>
    {#each messages as msg}
      <li>{msg.type} at {new Date(msg.timestamp).toLocaleTimeString()}</li>
    {/each}
  </ul>
</div>
```

## Troubleshooting

### Connection Issues
- Ensure Socket.IO client library is loaded before websocket-client.js
- Check CORS settings on the server
- Verify the URL format matches the connection type

### Message Not Received
- Verify the event name matches exactly
- Check if the server is sending to the correct namespace
- Use the generic 'message' event for debugging

### Reconnection Not Working
- Check reconnection options are set correctly
- Verify the server supports the connection type
- Monitor 'reconnect_error' events for details

## Future Enhancements

- **Binary Data Support**: Optimized handling for binary WebSocket frames
- **Compression**: Built-in message compression options
- **Message Queuing**: Queue messages when disconnected
- **Auto-switching**: Automatically switch between Socket.IO and WebSocket based on availability
- **Worker Support**: Run WebSocket connection in a Web Worker for better performance
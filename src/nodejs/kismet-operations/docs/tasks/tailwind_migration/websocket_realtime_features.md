# WebSocket and Real-Time Functionality Documentation

## Overview
This document comprehensively details all WebSocket and real-time functionality in the Kismet Operations Center that must be preserved during the Tailwind CSS migration.

## 1. Socket.IO WebSocket Implementation

### 1.1 Server Configuration (server.js)
```javascript
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || corsOptions.origin === '*') {
        return callback(null, true);
      }
      corsOptions.origin(origin, callback);
    },
    methods: corsOptions.methods,
    credentials: corsOptions.credentials,
    allowedHeaders: corsOptions.allowedHeaders
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});
```

### 1.2 WebSocket Handler (lib/webhook/websocket.js)
- **Connection Management**: Tracks all connected clients with metadata
- **Channel Subscriptions**: Supports 'status', 'devices', 'alerts' channels
- **Real-time Streaming**: Kismet data streaming with throttling
- **Event Broadcasting**: Broadcasts to specific channels or all clients

### 1.3 WebSocket Events

#### Client-to-Server Events:
1. **subscribe** - Subscribe to data channels
2. **unsubscribe** - Unsubscribe from channels  
3. **requestStatus** - Request immediate status update
4. **requestLatestFFT** - Request latest FFT data (spectrum analyzer)
5. **requestSignals** - Request detected signals with optional threshold

#### Server-to-Client Events:
1. **connected** - Initial connection confirmation
2. **statusUpdate** - Service status updates
3. **scriptEvent** - Script execution events
4. **newDevice** - New device detection from Kismet
5. **alert** - Real-time alerts from Kismet
6. **fftData** - Real-time FFT spectrum data
7. **signalsDetected** - Automatic signal detection notifications
8. **openwebrxConnected/Disconnected** - OpenWebRX connection status
9. **configUpdated** - Configuration change notifications
10. **bufferCleared** - FFT buffer clear notifications

## 2. HTTP Polling and Fetch-Based Updates

### 2.1 Periodic Status Updates (kismet-operations.js)
```javascript
// System status update every 5 seconds
setInterval(updateSystemStatus, 5000);

// Kismet data update every 2 seconds  
setInterval(updateKismetData, 2000);

// Kismet service status every 5 seconds
setInterval(updateKismetStatus, 5000);
```

### 2.2 API Endpoints for Real-Time Data
1. **GET /info** - System information including GPS status
2. **GET /kismet-data** - Kismet device counts and recent activity
3. **GET /script-status** - Service running status
4. **GET /api/status** - Spectrum analyzer status
5. **POST /api/start-script** - Start services (triggers status updates)
6. **POST /stop-script** - Stop services

### 2.3 Dynamic Status Indicators
- **Service Status Dots**: Real-time color changes (green/yellow/red)
- **GPS Information**: Live coordinates, altitude, time, MGRS
- **Device Counts**: Live updating device and network counts
- **Activity Feeds**: Scrolling feed with new item animations

## 3. Real-Time UI Updates

### 3.1 Status Indicator Updates
```javascript
// Dynamic status dot color changes
kismetStatus.style.background = '#44ff44'; // Running (green)
kismetStatus.style.boxShadow = '0 0 10px #44ff44';

kismetStatus.style.background = '#ffaa00'; // Starting (yellow)
kismetStatus.style.boxShadow = '0 0 10px #ffaa00';

kismetStatus.style.background = '#ff4444'; // Stopped (red)
kismetStatus.style.boxShadow = 'none';
```

### 3.2 Feed Updates with Animations
```javascript
// New feed items get highlight effect
feedItem.classList.add('feed-item-blink');
setTimeout(() => feedItem.classList.remove('feed-item-blink'), 2000);

// Auto-scroll to bottom
feedContainer.scrollTop = feedContainer.scrollHeight;
```

### 3.3 Message Rotation System
```javascript
// Rotating system messages every 7 seconds
updateSystemMessage();
setInterval(updateSystemMessage, 7000);
```

## 4. Interactive Features

### 4.1 Tab System
- **Dynamic Tab Switching**: Hides/shows content based on selection
- **Active State Management**: Visual feedback for active tab
- **Minimized Tab Bar**: Dynamic tab addition/removal

### 4.2 Window Management
- **Draggable Windows**: Grid items can be repositioned
- **Resizable Windows**: 8-directional resize handles
- **Minimize/Restore**: Windows can be minimized to tab bar

### 4.3 Iframe Integration
- **Kismet Interface**: Embedded iframe to http://localhost:2501
- **Dynamic Sizing**: Responsive iframe with mobile optimization
- **Start Minimized**: Kismet iframe starts minimized on page load

## 5. Service Control Integration

### 5.1 Start/Stop Services
- **Rapid Status Updates**: 1-second polling during service state changes
- **Multi-method Start**: Tries systemd, then direct execution
- **Comprehensive Stop**: Kills all related processes, cleans PIDs
- **Network Reset**: Resets WiFi adapter and Tailscale on stop

### 5.2 Process Management
```javascript
// Enhanced service readiness checks
const checkKismetReady = async () => {
  // Check process exists
  const processExists = await checkService('kismet_server');
  if (!processExists) return false;
  
  // Check API responding
  const response = await axios.get('http://localhost:2501/system/status.json');
  return response.status === 200;
};
```

## 6. Error Handling and Notifications

### 6.1 Global Notification System
```javascript
function showNotification(message, type = 'info') {
  notification.textContent = message;
  notification.className = 'notification show ' + type;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.className = 'notification';
  }, 5000);
}
```

### 6.2 Status Message Overlay
- Modal overlay for important system messages
- Click to dismiss functionality
- Backdrop blur effect

### 6.3 Loading States
- Full-screen loading overlay during operations
- Spinner animation with status text

## 7. Data Flow Patterns

### 7.1 Kismet Data Flow
```
Kismet Server → HTTP API → Node.js Server → Client (Polling)
                    ↓
              WebSocket Stream → WebSocket Handler → Subscribed Clients
```

### 7.2 GPS Data Flow
```
GPS Device → GPSD → Node.js Server → /info endpoint → Client UI
```

### 7.3 Service Control Flow
```
UI Button → Start Script API → Shell Script → Services
    ↓
Rapid Status Polling → Status Indicators Update
```

## 8. Mobile-Specific Optimizations

### 8.1 Touch Interactions
- Larger touch targets for mobile
- Disabled resize handles on mobile
- Horizontal scroll for tabs

### 8.2 Performance Optimizations
- Simplified background patterns on mobile
- Reduced animation complexity
- Throttled updates for low-power devices

## 9. Security and CORS

### 9.1 CORS Configuration
- Dynamic CORS based on request origin
- Preflight handling for complex requests
- Credentials support for authenticated requests

### 9.2 Content Security Policy
- No inline scripts (CSP compliant)
- External script loading only
- Event handlers via addEventListener

## 10. Critical Preservation Requirements

### MUST PRESERVE:
1. **All WebSocket event handlers and connections**
2. **Periodic update intervals and timings**
3. **API endpoint calls and data processing**
4. **Dynamic DOM updates and animations**
5. **Status indicator color logic**
6. **Feed auto-scrolling and highlighting**
7. **Tab switching and minimize/restore**
8. **Iframe embedding and sizing**
9. **Service start/stop functionality**
10. **Error handling and notifications**
11. **Loading states and overlays**
12. **Mobile touch optimizations**

### CSS Classes That Have JavaScript Dependencies:
- `.active` - Tab and button states
- `.minimized` - Window minimize state
- `.notification.show` - Notification visibility
- `.feed-item-blink` - New item animation
- `.status-dot` - Service status indicators
- `.resize-handle` - Window resizing
- `.grid-item` - Draggable windows
- `.nav-tab` - Tab switching
- `.loading` - Loading overlay
- `.status-message` - Status modal

### Data Attributes Used:
- `data-tab` - Tab navigation
- `data-profile` - Spectrum analyzer profiles

## Testing Checklist

- [ ] WebSocket connects and maintains connection
- [ ] All periodic updates continue working
- [ ] Service start/stop functions correctly
- [ ] Status indicators update in real-time
- [ ] Feed items appear and animate
- [ ] Notifications show and auto-hide
- [ ] Tabs switch properly
- [ ] Windows can be dragged and resized
- [ ] Minimize/restore works
- [ ] Mobile touch interactions work
- [ ] No JavaScript errors in console
- [ ] All API calls succeed
- [ ] Loading states display correctly
- [ ] Error handling works as expected
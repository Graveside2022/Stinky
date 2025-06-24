# Kismet Operations Center - Performance Optimization Guide

## Overview

This guide documents the performance optimizations implemented for the Kismet Operations Center to handle large amounts of real-time data efficiently.

## Implemented Optimizations

### 1. Code Splitting and Lazy Loading

#### Webpack Configuration
- Separate bundles for main app, spectrum analyzer, signal visualization, and theme
- Cesium 3D globe loaded on-demand only when needed
- Vendor code splitting for better caching

#### Implementation
```bash
# Build optimized bundles
npm run build:webpack

# Analyze bundle sizes
npm run build:webpack:analyze
```

### 2. WebSocket Message Batching

#### Features
- Messages batched every 100ms (configurable)
- Automatic backpressure handling
- Priority-based message queuing
- Compression for large payloads

#### Configuration
```javascript
const wsBatcher = new WebSocketBatcher({
  batchSize: 50,           // Messages per batch
  batchInterval: 100,      // Milliseconds
  maxQueueSize: 1000,      // Maximum queue size
  compressionThreshold: 1024  // Bytes
});
```

### 3. Device Memory Management

#### Features
- Automatic device history cleanup
- Configurable memory limits
- LRU eviction strategy
- Aggressive cleanup on memory pressure

#### Configuration
```javascript
const deviceManager = new DeviceMemoryManager({
  maxDevices: 1000,           // Maximum devices to track
  maxHistoryPerDevice: 50,    // History entries per device
  historyTTL: 3600000,        // 1 hour TTL
  cleanupInterval: 300000     // 5 minute cleanup cycle
});
```

### 4. Performance Monitoring

#### Real-time Metrics
- CPU and memory usage tracking
- Event loop lag detection
- Request/response timing
- WebSocket connection stats

#### Accessing Metrics
```bash
# View performance metrics
curl http://localhost:8003/api/performance

# Monitor in real-time via WebSocket
# Connect and emit 'request-performance'
```

### 5. Client-Side Optimizations

#### Lazy Loading
- 3D globe loads only when viewed
- Dashboard panels load on demand
- Heavy libraries loaded asynchronously

#### Rendering Optimizations
- Request Animation Frame for smooth updates
- Throttled device updates (250ms)
- Batched DOM operations
- Virtual scrolling for large lists

## Deployment Steps

### 1. Install Dependencies
```bash
cd /home/pi/projects/stinkster_christian/stinkster/src/nodejs/kismet-operations
npm install
```

### 2. Build Optimized Assets
```bash
# Build TypeScript and webpack bundles
npm run build

# Or build separately
npm run build:webpack
```

### 3. Configure Environment
```bash
# Set production environment
export NODE_ENV=production

# Optional: Enable Node.js profiling
export NODE_OPTIONS="--max-old-space-size=1024"
```

### 4. Start Optimized Server
```bash
# Use the optimized server
node server-optimized.js

# Or use the start script
npm run start:prod
```

### 5. Update HTML to Use Optimized JavaScript
Replace in `views/index.html`:
```html
<!-- Replace this -->
<script src="/js/kismet-operations.js"></script>

<!-- With this -->
<script src="/js/kismet-operations-optimized.js"></script>
```

## Performance Testing

### Run Performance Tests
```bash
# Run the performance test suite
node tests/performance/performance-test.js

# Custom test configuration
node tests/performance/performance-test.js --devices 1000 --duration 60000
```

### Monitor Performance
1. Open Chrome DevTools
2. Go to Performance tab
3. Record while using the application
4. Check for:
   - Frame rate (should be ~60 FPS)
   - Memory usage (should stabilize)
   - Network activity (should show batching)

## Configuration Tuning

### For Limited Hardware (Raspberry Pi)
```javascript
// Reduce limits for Raspberry Pi
const deviceManager = new DeviceMemoryManager({
  maxDevices: 500,          // Reduced from 1000
  maxHistoryPerDevice: 25,  // Reduced from 50
  historyTTL: 1800000,      // 30 minutes instead of 1 hour
  cleanupInterval: 180000   // 3 minutes instead of 5
});

// Increase batch interval
const wsBatcher = new WebSocketBatcher({
  batchInterval: 200  // 200ms instead of 100ms
});
```

### For High-Performance Systems
```javascript
// Increase limits for powerful systems
const deviceManager = new DeviceMemoryManager({
  maxDevices: 5000,
  maxHistoryPerDevice: 100,
  historyTTL: 7200000,      // 2 hours
  cleanupInterval: 600000   // 10 minutes
});

// Decrease batch interval for lower latency
const wsBatcher = new WebSocketBatcher({
  batchInterval: 50  // 50ms for more real-time updates
});
```

## Monitoring and Alerts

### Performance Alerts
The system will emit alerts when:
- Memory usage > 85%
- Event loop lag > 100ms
- CPU usage > 80%

### Handling Alerts
```javascript
performanceMonitor.on('alert', (alert) => {
  if (alert.type === 'memory') {
    // Trigger cleanup
    deviceManager.aggressiveCleanup();
  }
});
```

## Troubleshooting

### High Memory Usage
1. Check device count: `curl http://localhost:8003/api/devices`
2. Trigger manual cleanup via API
3. Reduce `maxDevices` configuration
4. Check for memory leaks in browser

### Slow Updates
1. Check WebSocket batch size in browser console
2. Verify network latency
3. Reduce update frequency
4. Enable compression for large payloads

### 3D Globe Performance
1. Ensure hardware acceleration is enabled
2. Reduce imagery provider detail level
3. Limit number of entities displayed
4. Use request render mode (already configured)

## Best Practices

1. **Regular Monitoring**: Check `/api/performance` endpoint regularly
2. **Gradual Scaling**: Start with conservative limits and increase gradually
3. **Browser Limits**: Modern browsers handle ~1000 WebSocket messages/second
4. **Network Bandwidth**: Monitor bandwidth usage, especially on mobile networks
5. **Database Integration**: For long-term storage, implement database archival

## Future Optimizations

1. **WebAssembly**: Port critical paths to WASM for better performance
2. **Service Workers**: Implement offline caching and background sync
3. **IndexedDB**: Store device history client-side for offline access
4. **WebRTC**: Direct peer-to-peer updates for reduced latency
5. **Protocol Buffers**: Binary protocol for smaller message sizes

## Rollback Procedure

If performance issues occur:

1. Stop the optimized server
2. Revert to original server:
   ```bash
   node server.js
   ```
3. Update HTML to use original JavaScript:
   ```html
   <script src="/js/kismet-operations.js"></script>
   ```
4. Report issues with performance metrics

## Support

For performance-related issues:
1. Collect metrics from `/api/performance`
2. Run performance test suite
3. Check browser console for errors
4. Monitor system resources with `htop`
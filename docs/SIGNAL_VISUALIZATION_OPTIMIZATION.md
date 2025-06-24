# Signal Visualization Optimization for Cesium

## Overview

The signal visualization module (`signal-visualization.js`) provides optimized rendering of multiple signal entities on a 3D Cesium globe. It implements several performance optimization techniques to handle hundreds of signals efficiently.

## Key Features

### 1. Efficient Rendering with Primitive Collections
- Uses `PointPrimitiveCollection` for basic signal markers
- Uses `BillboardCollection` for signal icons
- Uses `LabelCollection` for signal names
- These collections are more efficient than individual entities

### 2. Entity Clustering
- Automatically groups nearby signals when zoomed out
- Customizable cluster appearance with dynamic icons
- Configurable pixel range and minimum cluster size
- Default: 50 pixel range, minimum 2 entities per cluster

### 3. Level of Detail (LOD)
- Hides distant or weak signals based on camera distance
- Prioritizes stronger signals when limit is reached
- Maximum 500 visible entities at once (configurable)
- Weak signal threshold: -80 dBm

### 4. Batch Updates with RequestAnimationFrame
- Queues entity updates for batch processing
- Processes up to 50 updates per frame
- Uses requestAnimationFrame for smooth rendering
- Prevents UI blocking during large updates

### 5. Visibility Culling
- Updates entity visibility based on camera view
- Sorts entities by signal strength
- Shows only the strongest signals when over limit
- Automatic cleanup of old entities (5 minute timeout)

### 6. Performance Monitoring
- Built-in FPS counter (top-right corner)
- Displays visible vs total entity count
- Toggle with Ctrl+Shift+F
- Real-time performance statistics API

### 7. Billboard Sprites Instead of 3D Models
- Dynamic canvas-based signal icons
- Different icons for WiFi, Cellular, Bluetooth
- Color-coded by signal strength:
  - Green: Strong (-40 dBm or better)
  - Yellow: Good (-60 dBm)
  - Orange: Fair (-80 dBm)
  - Red: Weak (below -80 dBm)

### 8. Optimized Update Loop
- Processes update queue every 100ms
- Cleans up old entities every 30 seconds
- Efficient frame counting for FPS monitoring
- Minimal impact on main render loop

## Usage

### Basic Integration

```javascript
// Initialize after Cesium viewer is created
if (window.SignalVisualization) {
    window.SignalVisualization.initialize(cesiumViewer);
}

// Add a signal
window.SignalVisualization.addSignal({
    id: 'signal-123',
    name: 'WiFi Network',
    type: 'wifi', // 'wifi', 'cellular', 'bluetooth', or 'unknown'
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 0,
    strength: -65 // dBm
});

// Batch update multiple signals
window.SignalVisualization.batchUpdateSignals(signalArray);

// Remove a signal
window.SignalVisualization.removeSignal('signal-123');

// Clear all signals
window.SignalVisualization.clearAllSignals();

// Get performance stats
const stats = window.SignalVisualization.getPerformanceStats();
console.log(`FPS: ${stats.fps}, Visible: ${stats.visibleEntities}/${stats.totalEntities}`);
```

### UI Controls

The map interface includes:
- Checkboxes to filter signal types
- Toggle for entity clustering
- Clear all signals button
- Demo mode for testing

### Demo Mode

A signal demo (`signal-demo.js`) is included for testing:

```javascript
// Start demo with random signals
window.SignalDemo.start();

// Stop demo
window.SignalDemo.stop();

// Set center location for demo signals
window.SignalDemo.setCenterLocation(lat, lon);
```

Access demo mode by:
1. Click "Start Demo" button in the map controls
2. Or add `?demo=signals` to the URL

## Configuration

Key configuration options in `signal-visualization.js`:

```javascript
const CONFIG = {
    MAX_VISIBLE_ENTITIES: 500,       // Maximum entities shown at once
    CLUSTER_PIXEL_RANGE: 50,         // Pixel range for clustering
    CLUSTER_MINIMUM_SIZE: 2,         // Minimum entities per cluster
    LOD_DISTANCE_THRESHOLD: 10000,   // Distance threshold in meters
    WEAK_SIGNAL_THRESHOLD: -80,      // Weak signal threshold in dBm
    UPDATE_BATCH_SIZE: 50,           // Updates per batch
    FPS_UPDATE_INTERVAL: 1000,       // FPS update interval in ms
    ENTITY_FADE_DURATION: 2000,      // Fade duration in ms
};
```

## Performance Tips

1. **Limit Active Signals**: Keep total signals under 1000 for best performance
2. **Use Batch Updates**: Group multiple signal updates together
3. **Enable Clustering**: Helps with dense signal areas
4. **Filter Weak Signals**: Hide signals below -80 dBm when many are present
5. **Monitor FPS**: Use the FPS counter to track performance impact

## Integration with Kismet

The visualization automatically fetches data from Kismet every 2 seconds and converts device data to signal format:

```javascript
// Automatic integration in index.html
function startSignalDataFetching() {
    function fetchSignalData() {
        fetch('/kismet-data')
            .then(response => response.json())
            .then(data => {
                if (data.recent_devices) {
                    const signals = convertKismetToSignals(data.recent_devices);
                    window.SignalVisualization.batchUpdateSignals(signals);
                }
            });
    }
    setInterval(fetchSignalData, 2000);
}
```

## Browser Compatibility

- Requires WebGL support
- Tested on Chrome, Firefox, Safari
- Mobile devices may have reduced entity limits
- Raspberry Pi may need lower MAX_VISIBLE_ENTITIES setting

## Troubleshooting

1. **Low FPS**: Reduce MAX_VISIBLE_ENTITIES or increase WEAK_SIGNAL_THRESHOLD
2. **Signals not appearing**: Check console for errors, ensure Cesium is initialized
3. **Clustering issues**: Adjust CLUSTER_PIXEL_RANGE for your use case
4. **Memory usage**: Enable automatic cleanup, reduce ENTITY_FADE_DURATION
# 3D Visualization Components

Cesium-based 3D globe visualization for Kismet device tracking.

## Components

### CesiumGlobe
Core 3D globe component with device markers and clustering.

```svelte
<CesiumGlobe
  height="100%"
  showStats={true}
  enableClustering={true}
  cesiumToken={null}
/>
```

### DeviceTrackingGlobe
Enhanced wrapper with controls and device list sidebar.

```svelte
<DeviceTrackingGlobe
  height="100%"
  showControls={true}
  showDeviceList={true}
  enableClustering={true}
/>
```

### DeviceHeatmap
Overlay component for signal strength visualization.

```svelte
<DeviceHeatmap
  {viewer}
  {devices}
  visible={true}
  radius={1000}
  intensity={0.6}
/>
```

## Features

- Real-time device position updates via WebSocket
- Device clustering for performance
- Signal strength visualization
- Camera presets (Global, North America, Europe, Local)
- 2D/3D view switching
- Device search and filtering
- Click-to-select devices
- Customizable appearance based on device type

## Integration

The components integrate with Kismet WebSocket stores:
- `$lib/stores/websocket/kismet` - Device data and selection
- Updates automatically when devices are detected
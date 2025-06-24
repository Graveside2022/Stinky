# HackRF Real-time FFT Data Streaming

## Overview

The HackRF FFT streaming service provides high-performance real-time spectrum data visualization with WebSocket integration. It supports both real data from HackRF/OpenWebRX and demo mode for testing.

## Features

- **Real-time FFT streaming** via WebSocket with batching
- **Plotly.js visualization** with spectrum and waterfall displays
- **Performance optimization** with adaptive sampling and compression
- **Demo mode** with simulated signals for testing
- **Multiple performance profiles** (Performance, Balanced, Quality)
- **WebSocket rooms** for different data types (spectrum, signals, waterfall)
- **Automatic backpressure handling** to prevent overload
- **Peak detection and signal analysis**

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   HackRF/       │────▶│ SpectrumAnalyzer │────▶│ FFT Streamer    │
│   OpenWebRX     │     │   (Core)         │     │  (Processing)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Web Browser    │◀────│ WebSocket        │◀────│ WebSocket       │
│  (Plotly.js)    │     │   (Socket.IO)    │     │  Handler        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Components

### 1. HackRF FFT Streamer (`hackrf-fft-streamer.js`)
- Manages FFT data streaming pipeline
- Implements performance profiles and adaptive sampling
- Handles data decimation and compression
- Provides demo data generation

### 2. WebSocket Handler (`hackrf-websocket-handler.js`)
- Manages client connections and rooms
- Handles configuration updates
- Routes FFT data to appropriate clients
- Implements namespace `/hackrf`

### 3. Spectrum Plotly (`spectrum-plotly.js`)
- Client-side visualization using Plotly.js
- Real-time spectrum and waterfall displays
- Performance-optimized rendering
- Export capabilities

### 4. Integration Module (`hackrf-integration.js`)
- Wires components into main server
- Provides HTTP API endpoints
- Manages lifecycle

## Usage

### Server Integration

```javascript
const { initializeHackRFIntegration } = require('./lib/hackrf-integration');

// In your server setup
const hackrf = initializeHackRFIntegration(app, io, spectrumAnalyzer);

// Shutdown on exit
process.on('SIGINT', () => {
    hackrf.shutdown();
});
```

### Client Connection

```javascript
// Connect to HackRF namespace
const socket = io('/hackrf');

// Subscribe to FFT data
socket.emit('subscribe', { channels: ['fft'] });

// Handle FFT batches
socket.on('fftBatch', (batch) => {
    // Process FFT data
});

// Set performance mode
socket.emit('setPerformanceMode', { mode: 'balanced' });
```

### HTML Integration

```html
<!-- Include dependencies -->
<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
<script src="/socket.io/socket.io.js"></script>
<script src="/js/spectrum-plotly.js"></script>

<!-- Create spectrum analyzer -->
<div id="spectrum-container"></div>
<script>
    const spectrum = new SpectrumPlotly('spectrum-container', {
        updateRate: 30,
        showWaterfall: true,
        showPeaks: true
    });
    spectrum.connect('/hackrf');
</script>
```

## Performance Profiles

### Performance Mode
- Decimation: 4x
- Streaming Rate: 15 Hz
- Compression: Enabled
- Batch Size: 10
- **Best for**: Maximum throughput, many clients

### Balanced Mode (Default)
- Decimation: 2x
- Streaming Rate: 30 Hz
- Compression: Enabled
- Batch Size: 5
- **Best for**: General use, good balance

### Quality Mode
- Decimation: 1x (none)
- Streaming Rate: 60 Hz
- Compression: Disabled
- Batch Size: 1
- **Best for**: High-resolution analysis, few clients

## API Endpoints

### GET /api/hackrf/status
Get current status and configuration.

### POST /api/hackrf/config
Update streaming configuration.

```json
{
    "performanceMode": "balanced",
    "streamingRate": 30,
    "decimation": 2,
    "compression": true,
    "demoMode": false
}
```

### POST /api/hackrf/connect
Connect to OpenWebRX server.

```json
{
    "url": "ws://localhost:8073/ws/"
}
```

### GET /api/hackrf/metrics
Get performance metrics.

## WebSocket Events

### Client → Server

- `join`: Join a room (spectrum, signals, waterfall)
- `subscribe`: Subscribe to FFT streaming
- `updateConfig`: Update configuration
- `requestStatus`: Request current status
- `setPerformanceMode`: Change performance mode

### Server → Client

- `welcome`: Initial connection with config
- `fftBatch`: Batched FFT data
- `signalsDetected`: Detected signals
- `configUpdated`: Configuration changed
- `modeChange`: Demo/Real mode change

## Performance Optimization

### Data Reduction
- **Decimation**: Reduce FFT bin count by peak-hold decimation
- **Batching**: Group multiple FFT frames per message
- **Compression**: Optional data compression for large payloads

### Adaptive Streaming
- **Backpressure handling**: Automatic rate reduction on overload
- **Frame skipping**: Client-side frame rate adaptation
- **Priority queuing**: Important frames sent first

### Resource Management
- **Connection limits**: Maximum clients per room
- **Buffer management**: Automatic cleanup of old data
- **Memory monitoring**: Track and limit memory usage

## Demo Mode

When no HackRF is connected, demo mode provides simulated signals:
- 4 moving signals with different characteristics
- Realistic noise floor
- Signal animation for testing

Enable demo mode:
```javascript
socket.emit('updateConfig', { demoMode: true });
```

## Performance Benchmarks

Run the benchmark suite:
```bash
node tests/hackrf-performance-benchmark.js
```

Expected results:
- Performance mode: ~45-60 msg/s per client
- Balanced mode: ~25-35 msg/s per client
- Quality mode: ~50-70 msg/s per client
- Supports 50+ simultaneous clients

## Troubleshooting

### No data received
1. Check HackRF/OpenWebRX connection
2. Verify WebSocket connection to `/hackrf` namespace
3. Ensure subscription to 'fft' channel
4. Check browser console for errors

### Poor performance
1. Switch to Performance mode
2. Reduce number of connected clients
3. Enable compression
4. Check network bandwidth

### Demo mode not working
1. Ensure demoMode is enabled in config
2. Check for JavaScript errors
3. Verify WebSocket connection

## Example Applications

### Basic Spectrum Analyzer
See `/public/spectrum-plotly-demo.html` for a complete example.

### Integration with Existing UI
```javascript
// Add to existing Kismet operations page
const hackrfSection = document.createElement('div');
hackrfSection.id = 'hackrf-spectrum';
document.body.appendChild(hackrfSection);

const spectrum = new SpectrumPlotly('hackrf-spectrum', {
    height: 300,
    showWaterfall: false
});
spectrum.connect();
```

### Custom Signal Processing
```javascript
socket.on('signalsDetected', (data) => {
    data.signals.forEach(signal => {
        console.log(`Signal at ${signal.frequency} Hz, ${signal.power} dBm`);
        // Custom processing here
    });
});
```
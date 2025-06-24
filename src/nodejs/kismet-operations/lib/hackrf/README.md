# HackRF Backend Integration

TypeScript integration for the Python HackRF backend running on port 8092.

## Features

- Real-time FFT data streaming via WebSocket
- Binary protocol support for efficient data transfer
- Automatic signal detection and tracking
- REST API for configuration and control
- Frequency scanning capabilities
- GPS location integration
- Comprehensive TypeScript types

## Quick Start

```typescript
import { HackRFIntegration } from './lib/hackrf';

const hackrf = new HackRFIntegration({
  backendUrl: 'http://localhost:8092',
  enableBinaryMode: true
});

await hackrf.initialize();

// Listen for signals
hackrf.on('signal', (signal) => {
  console.log(`Signal: ${signal.frequency} Hz @ ${signal.signal_strength} dBm`);
});
```

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│ Node.js Client  │◄──────────────────►│ Python Backend   │
│                 │                     │ (Port 8092)      │
│ - TypeScript    │     REST API       │                  │
│ - Event-driven  │◄──────────────────►│ - HackRF Driver  │
│ - Binary proto  │                     │ - FFT Processing │
└─────────────────┘                     └──────────────────┘
```

## API Reference

### HackRFIntegration

Main integration class providing both WebSocket and REST API access.

#### Methods

- `initialize()` - Connect to backend
- `getStatus()` - Get device status
- `updateConfig(config)` - Update device configuration
- `startFrequencyScan(start, stop, step)` - Start frequency scan
- `shutdown()` - Clean shutdown

#### Events

- `connected` - WebSocket connected
- `fft` - FFT data received
- `signal` - Signal detected
- `status` - Status update
- `error` - Error occurred

### Types

All types are exported from `types/hackrf.d.ts`:

- `HackRFConfig` - Device configuration
- `HackRFFFTData` - FFT data format
- `HackRFSignal` - Detected signal
- `HackRFStatus` - Device status

## Performance

- Binary protocol reduces bandwidth by ~60%
- Supports >100 FFT frames/second
- Automatic buffer management
- Configurable decimation for display

## Testing

```bash
npm test -- hackrf-backend.test.js
```
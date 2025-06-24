# Stinkster TypeScript Type Definitions

Comprehensive TypeScript type definitions for the Stinkster project, covering all components including SDR/HackRF, WiFi/Kismet, GPS, TAK, and WebSocket communications.

## Structure

- **sdr.ts** - Software Defined Radio and HackRF types
- **wifi.ts** - WiFi scanning and Kismet integration types  
- **gps.ts** - GPS and location tracking types
- **tak.ts** - Team Awareness Kit and CoT message types
- **websocket.ts** - WebSocket message and communication types
- **api.ts** - REST API endpoint and response types
- **system.ts** - System management and monitoring types
- **index.ts** - Main export file with common types

## Usage

### In TypeScript Projects

```typescript
import { 
  WiFiDevice, 
  GPSPosition, 
  CoTEvent,
  WSMessage,
  APIResponse 
} from '@stinkster/types';

// Use the types
const device: WiFiDevice = {
  macAddress: '00:11:22:33:44:55',
  type: 'AP',
  ssid: 'TestNetwork',
  rssi: -65,
  // ...
};
```

### In JavaScript Projects with JSDoc

```javascript
/** @type {import('@stinkster/types').WiFiDevice} */
const device = {
  macAddress: '00:11:22:33:44:55',
  type: 'AP',
  ssid: 'TestNetwork',
  rssi: -65,
  // ...
};
```

## Key Type Categories

### SDR/HackRF Types
- `FFTData` - FFT spectrum data
- `SpectrumConfig` - Spectrum analyzer configuration
- `DetectedSignal` - Detected RF signals
- `ScanProfile` - Frequency scanning profiles

### WiFi/Kismet Types
- `WiFiDevice` - Generic WiFi device
- `WiFiNetwork` - Access point specific
- `WiFiClient` - Client device specific
- `KismetDevice` - Kismet API device format
- `WigleCSVRow` - Wigle CSV format

### GPS Types
- `GPSPosition` - Basic position data
- `GPSDTPV` - GPSD time-position-velocity
- `MAVLinkGPSRaw` - MAVLink GPS format
- `GPSTrack` - GPS track/trail data

### TAK Types
- `CoTEvent` - Cursor on Target event
- `CoTPoint` - Location in CoT format
- `CoTDetail` - Extended CoT information
- `TAKMessage` - TAK message wrapper

### WebSocket Types
- `WSMessage<T>` - Generic WebSocket message
- `WSDeviceMessage` - Device detection updates
- `WSSpectrumMessage` - Spectrum data updates
- `WSStatusMessage` - Service status updates

### API Types
- `APIResponse<T>` - Standard API response
- `PaginatedResponse<T>` - Paginated results
- `ServiceStatusResponse` - Service status
- `WiFiDevicesResponse` - WiFi device list

## Type Examples

### Creating a CoT Message
```typescript
import { CoTEvent, CoTPoint } from '@stinkster/types';

const cotEvent: CoTEvent = {
  version: '2.0',
  uid: 'WIFI-001',
  type: 'a-u-G',
  time: new Date().toISOString(),
  start: new Date().toISOString(),
  stale: new Date(Date.now() + 86400000).toISOString(),
  how: 'm-g',
  point: {
    lat: 40.7128,
    lon: -74.0060,
    hae: 10,
    ce: 50,
    le: 50
  },
  detail: {
    contact: {
      callsign: 'WiFi-Device-001'
    },
    remarks: 'Detected WiFi device'
  }
};
```

### Handling WebSocket Messages
```typescript
import { WSMessage, WSDeviceMessage } from '@stinkster/types';

function handleMessage(msg: WSMessage) {
  switch (msg.type) {
    case 'device':
      const deviceMsg = msg as WSDeviceMessage;
      console.log(`Device ${deviceMsg.data.action}: ${deviceMsg.data.device.mac}`);
      break;
    // Handle other message types...
  }
}
```

## Development

### Type Checking
```bash
npm run check
```

### Building Declaration Files
```bash
npm run build
```

## Contributing

When adding new types:
1. Add to the appropriate file based on component
2. Export from the file
3. Re-export from index.ts if commonly used
4. Document complex types with JSDoc comments
5. Include examples in this README
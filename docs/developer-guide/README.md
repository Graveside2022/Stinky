# Stinkster Developer Guide

This guide provides comprehensive information for developers working on or extending the Stinkster platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Component Development](#component-development)
4. [API Integration](#api-integration)
5. [Testing](#testing)
6. [Contributing](#contributing)

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Stinkster Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │   HackRF    │  │   Kismet    │  │   GPSmav     │        │
│  │   (SDR)     │  │   (WiFi)    │  │   (GPS)      │        │
│  └──────┬──────┘  └──────┬──────┘  └───────┬──────┘        │
│         │                 │                  │               │
│  ┌──────▼─────────────────▼─────────────────▼──────┐        │
│  │            Service Orchestration Layer           │        │
│  │         (gps_kismet_wigle.sh + Node.js)        │        │
│  └──────┬─────────────────┬─────────────────┬──────┘        │
│         │                 │                  │               │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼──────┐        │
│  │  OpenWebRX  │  │  Spectrum   │  │  WigleToTAK  │        │
│  │  (Docker)   │  │  Analyzer   │  │  Dashboard   │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend**: Node.js, Python, Bash
- **Frontend**: Svelte, TypeScript, Tailwind CSS
- **Real-time**: WebSockets, Server-Sent Events
- **Data**: JSON, CSV, SQLite (Kismet)
- **Deployment**: Docker, systemd, nginx

### Directory Structure

```
stinkster/
├── src/                    # Source code
│   ├── apps/              # Svelte applications
│   ├── gpsmav/            # GPS MAVLink bridge
│   ├── hackrf/            # SDR operations
│   ├── nodejs/            # Node.js services
│   ├── orchestration/     # Service coordination
│   ├── scripts/           # Utility scripts
│   └── wigletotak/        # WiFi to TAK converter
├── docs/                   # Documentation
├── tests/                  # Test suites
├── config/                 # Configuration files
└── systemd/               # Service definitions
```

## Development Setup

### Prerequisites

1. **Raspberry Pi OS** (Bullseye or newer)
2. **Node.js** 18+ and npm
3. **Python** 3.9+ with venv
4. **Docker** and docker-compose
5. **Git** for version control

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/stinkster.git
cd stinkster

# Install dependencies
./install.sh

# Set up development environment
./dev/setup.sh
```

### Development Tools

#### TypeScript Configuration

```bash
# Install TypeScript tooling
npm install

# Type checking
npm run type-check

# Build TypeScript
npm run build
```

#### Python Virtual Environments

Each Python component has its own environment:

```bash
# GPSmav
cd src/gpsmav
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# HackRF
cd src/hackrf
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Docker Development

```bash
# Build custom OpenWebRX image
docker-compose build

# Run with live logs
docker-compose up

# Access container shell
docker exec -it openwebrx bash
```

## Component Development

### HackRF/SDR Module

#### Architecture
```python
# src/hackrf/spectrum_analyzer.py
class SpectrumAnalyzer:
    def __init__(self):
        self.device = None
        self.config = load_config()
        
    def start_capture(self):
        # Initialize HackRF
        # Start FFT processing
        # Stream via WebSocket
```

#### Adding New Features

1. **Signal Detection**:
```python
def detect_signals(fft_data, threshold):
    """Detect signals above noise floor"""
    peaks = []
    for i, magnitude in enumerate(fft_data):
        if magnitude > threshold:
            frequency = calculate_frequency(i)
            peaks.append({
                'frequency': frequency,
                'power': magnitude
            })
    return peaks
```

2. **WebSocket Integration**:
```javascript
// src/nodejs/lib/hackrf-websocket-handler.js
class HackRFWebSocketHandler {
    handleConnection(ws) {
        ws.on('message', (data) => {
            const msg = JSON.parse(data);
            switch(msg.type) {
                case 'start_fft':
                    this.startFFTStream(ws, msg.params);
                    break;
                case 'update_gain':
                    this.updateGain(msg.params);
                    break;
            }
        });
    }
}
```

### Kismet Integration

#### API Client
```javascript
// src/nodejs/lib/kismet-client.js
class KismetClient {
    constructor(host = 'localhost', port = 2501) {
        this.baseUrl = `http://${host}:${port}`;
        this.apiKey = process.env.KISMET_API_KEY;
    }
    
    async getDevices() {
        const response = await fetch(
            `${this.baseUrl}/devices/all_devices.json`,
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            }
        );
        return response.json();
    }
}
```

#### Custom Plugins

Create Kismet plugins in `/etc/kismet/plugins/`:

```python
# custom_alert.py
from KismetExternal import KismetExternal

class CustomAlert(KismetExternal):
    def __init__(self):
        super().__init__()
        
    def handle_packet(self, packet):
        # Custom packet processing
        if self.is_suspicious(packet):
            self.raise_alert("Suspicious activity", packet)
```

### WigleToTAK Enhancement

#### Adding Device Types
```javascript
// src/nodejs/wigle-to-tak/device-classifier.js
class DeviceClassifier {
    static classify(device) {
        const oui = device.mac.substring(0, 8);
        
        // Check OUI database
        const vendor = OUIDatabase.lookup(oui);
        
        // Classify by characteristics
        if (device.ssid?.includes('iPhone')) {
            return 'mobile-ios';
        } else if (device.capabilities?.includes('ESS')) {
            return 'access-point';
        }
        
        return 'unknown';
    }
}
```

#### TAK Message Format
```javascript
// Generate CoT (Cursor on Target) message
function generateCoT(device) {
    return {
        event: {
            _attributes: {
                version: '2.0',
                uid: device.mac,
                type: 'a-f-G-U-C',
                time: new Date().toISOString(),
                start: new Date().toISOString(),
                stale: new Date(Date.now() + 300000).toISOString()
            },
            point: {
                _attributes: {
                    lat: device.lat || 0,
                    lon: device.lon || 0,
                    hae: '0',
                    ce: '10',
                    le: '10'
                }
            },
            detail: {
                contact: {
                    _attributes: {
                        callsign: device.ssid || device.mac
                    }
                },
                remarks: {
                    _text: `Signal: ${device.signal}dBm`
                }
            }
        }
    };
}
```

### Frontend Development

#### Svelte Components

```svelte
<!-- src/apps/wigle/components/DeviceList.svelte -->
<script>
    import { onMount } from 'svelte';
    import { devices } from '../stores/devices';
    
    let sortBy = 'signal';
    let filterText = '';
    
    $: filteredDevices = $devices
        .filter(d => d.ssid?.includes(filterText))
        .sort((a, b) => b[sortBy] - a[sortBy]);
</script>

<div class="device-list">
    <input 
        bind:value={filterText} 
        placeholder="Filter devices..."
    />
    
    <table>
        <thead>
            <tr>
                <th on:click={() => sortBy = 'ssid'}>SSID</th>
                <th on:click={() => sortBy = 'signal'}>Signal</th>
                <th>Type</th>
            </tr>
        </thead>
        <tbody>
            {#each filteredDevices as device}
                <tr>
                    <td>{device.ssid || 'Hidden'}</td>
                    <td>{device.signal} dBm</td>
                    <td>{device.type}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>
```

#### WebSocket Store
```javascript
// src/lib/stores/websocket/hackrf.js
import { writable, derived } from 'svelte/store';

function createHackRFStore() {
    const { subscribe, set, update } = writable({
        connected: false,
        fftData: [],
        config: {}
    });
    
    let ws;
    
    return {
        subscribe,
        connect: (url) => {
            ws = new WebSocket(url);
            
            ws.onopen = () => {
                update(state => ({ ...state, connected: true }));
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'fft') {
                    update(state => ({ 
                        ...state, 
                        fftData: data.payload 
                    }));
                }
            };
        },
        
        updateConfig: (config) => {
            ws.send(JSON.stringify({
                type: 'config_update',
                payload: config
            }));
        }
    };
}

export const hackrf = createHackRFStore();
```

## API Integration

### RESTful Endpoints

#### Base URL Structure
```
http://your-pi:8000/api/v1/
├── /devices          # WiFi devices
├── /spectrum         # SDR data
├── /gps              # Location info
├── /tak              # TAK messages
└── /system           # System status
```

#### Authentication
```javascript
// Using API keys
const headers = {
    'X-API-Key': 'your-api-key',
    'Content-Type': 'application/json'
};

// Or JWT tokens
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};
```

### WebSocket APIs

#### Connection
```javascript
// Spectrum data stream
const ws = new WebSocket('ws://your-pi:8092/spectrum');

ws.onopen = () => {
    ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['fft', 'waterfall']
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch(data.channel) {
        case 'fft':
            updateFFTDisplay(data.payload);
            break;
        case 'waterfall':
            updateWaterfall(data.payload);
            break;
    }
};
```

#### Message Types
```typescript
interface WebSocketMessage {
    type: 'subscribe' | 'unsubscribe' | 'config' | 'data';
    channel?: string;
    payload?: any;
}

interface FFTData {
    timestamp: number;
    centerFreq: number;
    sampleRate: number;
    bins: number[];
}
```

### External Integration

#### MQTT Bridge
```javascript
// src/nodejs/lib/mqtt-bridge.js
const mqtt = require('mqtt');

class MQTTBridge {
    constructor(broker) {
        this.client = mqtt.connect(broker);
        
        this.client.on('connect', () => {
            console.log('MQTT connected');
        });
    }
    
    publishDevice(device) {
        const topic = `stinkster/devices/${device.mac}`;
        const payload = JSON.stringify({
            timestamp: Date.now(),
            ...device
        });
        
        this.client.publish(topic, payload);
    }
}
```

## Testing

### Unit Tests

```javascript
// tests/unit/spectrum-analyzer.test.js
import { describe, it, expect } from 'vitest';
import { SpectrumAnalyzer } from '../../src/hackrf/spectrum';

describe('SpectrumAnalyzer', () => {
    it('should detect peaks in FFT data', () => {
        const analyzer = new SpectrumAnalyzer();
        const fftData = generateTestFFT();
        
        const peaks = analyzer.detectPeaks(fftData, -50);
        
        expect(peaks).toHaveLength(3);
        expect(peaks[0].frequency).toBeCloseTo(100.5, 1);
    });
});
```

### Integration Tests

```javascript
// tests/integration/wigle-kismet.test.js
describe('Wigle-Kismet Integration', () => {
    let kismetServer;
    let wigleServer;
    
    beforeAll(async () => {
        kismetServer = await startKismet();
        wigleServer = await startWigle();
    });
    
    it('should process Kismet devices', async () => {
        // Simulate device discovery
        await kismetServer.injectDevice(mockDevice);
        
        // Wait for processing
        await delay(1000);
        
        // Check WigleToTAK received it
        const devices = await wigleServer.getDevices();
        expect(devices).toContainEqual(
            expect.objectContaining({
                mac: mockDevice.mac
            })
        );
    });
});
```

### Performance Testing

```javascript
// tests/performance/websocket-load.test.js
describe('WebSocket Performance', () => {
    it('should handle 100 concurrent connections', async () => {
        const connections = [];
        const startTime = Date.now();
        
        // Create connections
        for (let i = 0; i < 100; i++) {
            connections.push(createWSConnection());
        }
        
        await Promise.all(connections);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000); // 5 seconds
        
        // Measure message throughput
        const messages = await measureThroughput(connections[0]);
        expect(messages.perSecond).toBeGreaterThan(100);
    });
});
```

## Contributing

### Code Style

#### JavaScript/TypeScript
- Use ESLint configuration
- Prettier for formatting
- Strict TypeScript settings

```javascript
// Good
export async function processDevice(device: Device): Promise<ProcessedDevice> {
    if (!device?.mac) {
        throw new Error('Device MAC required');
    }
    
    const processed = {
        ...device,
        timestamp: Date.now(),
        processed: true
    };
    
    return processed;
}

// Bad
export function processDevice(device) {
    device.timestamp = Date.now();
    device.processed = true;
    return device;
}
```

#### Python
- Follow PEP 8
- Type hints required
- Docstrings for all functions

```python
# Good
def calculate_frequency(bin_index: int, 
                       sample_rate: float, 
                       fft_size: int) -> float:
    """
    Calculate frequency from FFT bin index.
    
    Args:
        bin_index: FFT bin number
        sample_rate: Sample rate in Hz
        fft_size: Size of FFT
        
    Returns:
        Frequency in Hz
    """
    return (bin_index * sample_rate) / fft_size
```

### Git Workflow

1. **Branch naming**:
   - `feature/description`
   - `bugfix/issue-number`
   - `hotfix/critical-fix`

2. **Commit messages**:
   ```
   feat: Add frequency hopping to spectrum analyzer
   
   - Implement hop sequence configuration
   - Add WebSocket commands for hop control
   - Update UI with hop status indicator
   
   Closes #123
   ```

3. **Pull Request process**:
   - Create feature branch
   - Write tests
   - Update documentation
   - Submit PR with description
   - Address review comments

### Documentation

Always update documentation when:
- Adding new features
- Changing APIs
- Modifying configuration
- Fixing significant bugs

### Security Considerations

1. **Input validation**: Always validate user input
2. **Authentication**: Use proper auth for sensitive operations
3. **RF safety**: Include warnings for transmission features
4. **Privacy**: Respect device privacy in WiFi scanning

## Advanced Topics

### Custom Hardware Integration

```python
# Example: Adding RTL-SDR support
class RTLSDRAdapter:
    def __init__(self):
        import rtlsdr
        self.sdr = rtlsdr.RtlSdr()
        
    def configure(self, freq, sample_rate, gain):
        self.sdr.center_freq = freq
        self.sdr.sample_rate = sample_rate
        self.sdr.gain = gain
        
    def read_samples(self, num_samples):
        return self.sdr.read_samples(num_samples)
```

### Performance Optimization

1. **WebSocket batching**:
```javascript
class BatchedWebSocket {
    constructor(ws, batchSize = 10, interval = 100) {
        this.ws = ws;
        this.queue = [];
        this.batchSize = batchSize;
        
        setInterval(() => this.flush(), interval);
    }
    
    send(data) {
        this.queue.push(data);
        if (this.queue.length >= this.batchSize) {
            this.flush();
        }
    }
    
    flush() {
        if (this.queue.length > 0) {
            this.ws.send(JSON.stringify({
                type: 'batch',
                messages: this.queue
            }));
            this.queue = [];
        }
    }
}
```

2. **Memory management**:
```javascript
// Use object pooling for frequently created objects
const fftDataPool = new ObjectPool(() => ({
    timestamp: 0,
    data: new Float32Array(1024)
}));

function processFFT(rawData) {
    const fftData = fftDataPool.acquire();
    fftData.timestamp = Date.now();
    // Process data...
    
    // Return to pool when done
    setTimeout(() => fftDataPool.release(fftData), 1000);
}
```

### Debugging

Enable debug logging:
```bash
# Node.js
DEBUG=stinkster:* npm start

# Python
export STINKSTER_DEBUG=1
python spectrum_analyzer.py
```

Debug endpoints:
- `/api/debug/memory` - Memory usage
- `/api/debug/connections` - Active connections
- `/api/debug/performance` - Performance metrics

## Resources

- [API Reference](../api-reference/README.md)
- [Deployment Guide](../deployment/README.md)
- [Video Tutorials](../tutorials/README.md)
- [Troubleshooting](../deployment/TROUBLESHOOTING.md)

Happy coding! Remember to test thoroughly and document your changes.
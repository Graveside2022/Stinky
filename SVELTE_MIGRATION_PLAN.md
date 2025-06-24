# Svelte Frontend Migration Strategy

## Overview
This document outlines the migration strategy from vanilla JavaScript to Svelte for the Stinkster SDR/GPS/TAK platform.

## Current Architecture Analysis

### Existing Frontend Applications
1. **HackRF Spectrum Analyzer** (`/src/hackrf/templates/spectrum.html`)
   - Socket.IO WebSocket connections
   - Plotly.js for spectrum visualization
   - Real-time FFT data streaming
   - Demo/Real data mode switching

2. **Kismet Operations Center** (`/src/nodejs/kismet-operations/`)
   - Complex multi-panel dashboard
   - WebSocket for real-time updates
   - Cesium 3D globe integration
   - Signal detection visualization
   - Grid-based layout system

3. **WigleToTAK Interface** (`/src/wigletotak/`)
   - Flask-based backend with simple frontend
   - Device tracking and TAK conversion
   - Basic form controls and list displays

## Migration Priority Order

### Phase 1: Foundation & Shared Components (Week 1)
1. **Project Setup**
   - Initialize Svelte project with Vite
   - Configure TypeScript support
   - Setup component library structure
   - Establish WebSocket service layer

2. **Core Components**
   ```
   src/lib/components/
   ├── ui/
   │   ├── Button.svelte
   │   ├── Card.svelte
   │   ├── Panel.svelte
   │   ├── StatusIndicator.svelte
   │   └── DataGrid.svelte
   ├── layout/
   │   ├── GridLayout.svelte
   │   ├── ResizablePanel.svelte
   │   └── MinimizableBox.svelte
   └── theme/
       └── ThemeProvider.svelte
   ```

### Phase 2: Service Layer (Week 1-2)
Create reusable service modules for:
- WebSocket connections
- REST API clients
- Real-time data stores
- GPS/MGRS utilities

### Phase 3: Feature Components (Week 2-3)
Migrate in order of complexity:

1. **WigleToTAK** (Simplest)
   - Basic forms and controls
   - Device list management
   - TAK configuration

2. **Spectrum Analyzer**
   - Spectrum visualization component
   - Signal detection list
   - Mode switching

3. **Kismet Operations** (Most Complex)
   - Dashboard layout
   - Real-time feeds
   - 3D globe integration
   - Signal visualization

## Svelte Component Architecture

### 1. Store Architecture
```javascript
// stores/websocket.js
import { writable, derived } from 'svelte/store';

export const wsConnection = writable(null);
export const wsStatus = writable('disconnected');
export const wsReconnectAttempts = writable(0);

// stores/spectrum.js
export const fftData = writable([]);
export const centerFrequency = writable(0);
export const sampleRate = writable(0);
export const signalDetections = writable(new Map());

// stores/kismet.js
export const devices = writable([]);
export const networks = writable([]);
export const gpsData = writable({});
```

### 2. Component Structure Example

```svelte
<!-- components/spectrum/SpectrumAnalyzer.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { fftData, centerFrequency } from '$lib/stores/spectrum';
  import SpectrumPlot from './SpectrumPlot.svelte';
  import SignalList from './SignalList.svelte';
  import { WebSocketService } from '$lib/services/websocket';
  
  let ws;
  let scanning = false;
  
  onMount(() => {
    ws = new WebSocketService('/spectrum');
    ws.on('fft_data', handleFFTData);
    ws.connect();
  });
  
  onDestroy(() => {
    ws?.disconnect();
  });
  
  function handleFFTData(data) {
    $fftData = data.data;
    $centerFrequency = data.center_freq;
  }
</script>

<div class="spectrum-analyzer">
  <SpectrumPlot />
  <SignalList />
</div>
```

### 3. WebSocket Integration Pattern

```javascript
// lib/services/websocket.js
export class WebSocketService {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.ws = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  connect() {
    this.ws = new WebSocket(this.endpoint);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }
  
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }
  
  emit(event, data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }
  
  handleMessage(event) {
    const { type, data } = JSON.parse(event.data);
    const handlers = this.handlers.get(type) || [];
    handlers.forEach(handler => handler(data));
  }
}
```

## Build Pipeline Setup

### 1. Vite Configuration
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['plotly.js-dist-min', 'socket.io-client'],
          'cesium': ['cesium']
        }
      }
    }
  }
});
```

### 2. Package Structure
```json
{
  "name": "stinkster-frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint ."
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "svelte": "^4.2.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "dependencies": {
    "socket.io-client": "^4.7.0",
    "plotly.js-dist-min": "^2.27.0",
    "cesium": "^1.112.0"
  }
}
```

## Maintaining Functionality During Transition

### 1. Incremental Migration Strategy
- Keep existing vanilla JS apps running
- Deploy Svelte components alongside
- Use feature flags to switch between versions
- Migrate one module at a time

### 2. Shared API Layer
```javascript
// lib/api/index.js
export const api = {
  async getSystemInfo() {
    const res = await fetch('/api/info');
    return res.json();
  },
  
  async getKismetData() {
    const res = await fetch('/api/kismet-data');
    return res.json();
  },
  
  async startScan(profile) {
    const res = await fetch(`/api/scan/${profile}`);
    return res.json();
  }
};
```

### 3. Progressive Enhancement
- Start with static components
- Add interactivity incrementally
- Preserve all existing functionality
- Test thoroughly at each step

## Implementation Timeline

### Week 1: Setup & Foundation
- [ ] Initialize Svelte project
- [ ] Setup build pipeline
- [ ] Create base UI components
- [ ] Implement theme system

### Week 2: Core Services
- [ ] WebSocket service layer
- [ ] API client modules
- [ ] Reactive stores
- [ ] Error handling

### Week 3: Simple Components
- [ ] WigleToTAK interface
- [ ] Basic status displays
- [ ] Form components
- [ ] Data tables

### Week 4: Complex Features
- [ ] Spectrum analyzer
- [ ] Signal visualization
- [ ] Real-time charts
- [ ] Performance optimization

### Week 5: Dashboard Integration
- [ ] Kismet operations layout
- [ ] Grid system migration
- [ ] Cesium integration
- [ ] Final testing

## Testing Strategy

### 1. Component Testing
```javascript
// tests/SpectrumAnalyzer.test.js
import { render, fireEvent } from '@testing-library/svelte';
import SpectrumAnalyzer from '$lib/components/spectrum/SpectrumAnalyzer.svelte';

test('starts scan when button clicked', async () => {
  const { getByText } = render(SpectrumAnalyzer);
  const button = getByText('Start Scan');
  await fireEvent.click(button);
  // Assert WebSocket message sent
});
```

### 2. Integration Testing
- Test WebSocket connections
- Verify data flow
- Check UI updates
- Validate API calls

## Migration Checklist

- [ ] Project setup complete
- [ ] Core components library
- [ ] Service layer implemented
- [ ] WigleToTAK migrated
- [ ] Spectrum Analyzer migrated
- [ ] Kismet Operations migrated
- [ ] WebSocket connections stable
- [ ] Performance benchmarked
- [ ] Production build optimized
- [ ] Documentation updated
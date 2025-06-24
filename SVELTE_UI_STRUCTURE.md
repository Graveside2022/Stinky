# Svelte UI Structure - Migration Guide

## Overview

This document describes the Svelte-based UI structure that accommodates all three frontend applications (HackRF, WigleToTAK, Kismet) with shared components and gradual migration support.

## Project Structure

```
stinkster-ui/
├── src/
│   ├── apps/                    # Individual applications
│   │   ├── hackrf/
│   │   │   ├── index.html      # Entry point
│   │   │   ├── main.js         # App initialization
│   │   │   ├── App.svelte      # Root component
│   │   │   └── components/     # App-specific components
│   │   ├── wigle/
│   │   └── kismet/
│   │
│   ├── lib/                    # Shared library
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # Basic UI elements
│   │   │   ├── charts/        # Chart components
│   │   │   ├── maps/          # Map components
│   │   │   └── common/        # Common utilities
│   │   ├── stores/            # State management
│   │   │   ├── websocket/     # WebSocket stores
│   │   │   └── api/           # API state stores
│   │   ├── services/          # API services
│   │   │   ├── api/           # REST API clients
│   │   │   └── websocket/     # WebSocket services
│   │   └── utils/             # Utility functions
│   │
│   └── shared/                # Shared assets/styles
│
├── vite.config.js            # Base Vite configuration
├── vite.config.hackrf.js     # HackRF-specific config
├── vite.config.wigle.js      # WigleToTAK-specific config
├── vite.config.kismet.js     # Kismet-specific config
├── tailwind.config.js        # Tailwind CSS configuration
└── postcss.config.js         # PostCSS configuration
```

## Development Commands

### Individual App Development
```bash
# Develop HackRF app
npm run dev:hackrf

# Develop WigleToTAK app
npm run dev:wigle

# Develop Kismet app
npm run dev:kismet
```

### Building
```bash
# Build all apps
npm run build:all

# Build individual apps
npm run build:hackrf
npm run build:wigle
npm run build:kismet
```

## Key Features

### 1. Multiple Entry Points
Each app has its own entry point and can be developed/built independently:
- HackRF: `http://localhost:5173` (when running `npm run dev:hackrf`)
- WigleToTAK: `http://localhost:5173` (when running `npm run dev:wigle`)
- Kismet: `http://localhost:5173` (when running `npm run dev:kismet`)

### 2. Shared Component Library

#### UI Components
- **Card.svelte**: Reusable card container
- **Button.svelte**: Consistent button styling
- **StatusIndicator.svelte**: Connection/status indicators

#### WebSocket Stores
- **websocket.js**: Generic WebSocket store factory
- **hackrf.js**: HackRF-specific WebSocket handling
- **wigle.js**: WigleToTAK-specific WebSocket handling

#### API Services
- **base.js**: Base API service with interceptors
- **hackrf.js**: HackRF API endpoints
- **wigle.js**: WigleToTAK API endpoints

### 3. WebSocket Store Pattern

```javascript
// Example usage in a component
import { hackrfWS, spectrumData, startScan } from '@stores/websocket/hackrf.js'

// Connect on mount
onMount(() => {
  hackrfWS.connect()
})

// Use reactive stores
$: if ($spectrumData) {
  // Update visualization
}

// Call methods
function handleStartScan() {
  startScan()
}
```

### 4. API Service Pattern

```javascript
// Example API usage
import { hackrfAPI } from '@services/api/hackrf.js'

async function loadDeviceInfo() {
  try {
    const info = await hackrfAPI.getDeviceInfo()
    // Use device info
  } catch (error) {
    // Handle error
  }
}
```

### 5. Path Aliases

The following aliases are configured for clean imports:
- `@` → `./src`
- `@lib` → `./src/lib`
- `@components` → `./src/lib/components`
- `@stores` → `./src/lib/stores`
- `@services` → `./src/lib/services`
- `@utils` → `./src/lib/utils`
- `@shared` → `./src/shared`

## Migration Strategy

### Phase 1: Setup and HackRF Migration
1. ✅ Create base structure and configuration
2. ✅ Implement shared components and stores
3. ✅ Create HackRF app structure
4. Port HackRF functionality incrementally

### Phase 2: WigleToTAK Migration
1. Create WigleToTAK app structure
2. Port device list and map components
3. Implement TAK integration features
4. Migrate WebSocket functionality

### Phase 3: Kismet Migration
1. Create Kismet app structure
2. Handle iframe integration
3. Port control features
4. Integrate monitoring dashboards

### Phase 4: Integration and Optimization
1. Optimize bundle sizes
2. Implement code splitting
3. Add Progressive Web App features
4. Deploy to production

## Gradual Migration Benefits

1. **No Big Bang**: Each app can be migrated independently
2. **Parallel Development**: Old and new systems can run side-by-side
3. **Shared Components**: Build once, use everywhere
4. **Testing**: Each app can be tested in isolation
5. **Rollback**: Easy to revert individual apps if needed

## Next Steps

1. **Start with HackRF**: Begin porting the spectrum analyzer
2. **Build Component Library**: Create reusable components as needed
3. **Test WebSocket Integration**: Ensure real-time features work
4. **Document Patterns**: Update this guide as patterns emerge

## Development Tips

1. **Use TypeScript**: Add types gradually for better DX
2. **Component Testing**: Use Vitest for component tests
3. **Storybook**: Consider adding for component documentation
4. **Performance**: Use Svelte's built-in reactivity efficiently
5. **Accessibility**: Ensure all components are accessible

## Proxy Configuration

The Vite dev server is configured to proxy API and WebSocket requests:
- `/api/hackrf` → `http://localhost:8092`
- `/api/wigle` → `http://localhost:8000`
- `/api/kismet` → `http://localhost:2501`
- `/ws/hackrf` → `ws://localhost:8092`
- `/ws/wigle` → `ws://localhost:8000`

This allows frontend development without CORS issues.
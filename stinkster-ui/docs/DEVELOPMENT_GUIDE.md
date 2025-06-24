# Development Guide - Stinkster UI

Comprehensive development guide for the TypeScript + SvelteKit + Vite + Tailwind CSS tactical communications interface.

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher  
- **Git**: For version control
- **VS Code**: Recommended IDE

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "svelte.svelte-vscode",
    "bradlc.vscode-tailwindcss", 
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "usernamehw.errorlens",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## Project Setup

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd stinkster-ui

# Install frontend dependencies
npm install

# Install backend dependencies  
cd backend
npm install
cd ..

# Copy environment configuration
cp .env.example .env
cp backend/.env.example backend/.env

# Configure environment variables
vim .env
vim backend/.env
```

### Environment Configuration

#### Frontend Environment (`.env`)

```env
# SvelteKit Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=ws://localhost:3000
VITE_PUBLIC_APP_NAME="Stinkster UI"
VITE_PUBLIC_APP_VERSION="1.0.0"

# Service Ports
VITE_HACKRF_PORT=8092
VITE_WIGLE_PORT=8000
VITE_KISMET_PORT=2501
VITE_BACKEND_PORT=3000

# Development
VITE_DEV_MODE=true
VITE_DEBUG=true

# Feature Flags
VITE_ENABLE_3D_GLOBE=true
VITE_ENABLE_ANIMATIONS=true
VITE_ENABLE_WEBSOCKETS=true
```

#### Backend Environment (`backend/.env`)

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# WebSocket Configuration
WS_PORT=3000
WS_PATH=/socket.io

# External Services
HACKRF_SERVICE_URL=http://localhost:8092
WIGLE_SERVICE_URL=http://localhost:8000
KISMET_SERVICE_URL=http://localhost:2501

# Logging
LOG_LEVEL=debug
LOG_FORMAT=combined

# File Paths
WIGLE_CSV_PATH=/home/pi/kismet_ops
EXPORT_PATH=/tmp/exports
```

## Development Workflow

### Starting Development

```bash
# Option 1: Full-stack development (recommended)
npm run start:dev

# Option 2: Frontend only
npm run dev

# Option 3: Individual applications
npm run dev:hackrf    # HackRF spectrum analyzer
npm run dev:kismet    # Kismet operations center
npm run dev:wigle     # WigleToTAK interface

# Option 4: All applications in parallel
npm run dev:all
```

### Development URLs

- **Main SvelteKit App**: http://localhost:5173
- **HackRF Application**: http://localhost:5173/hackrf
- **Kismet Operations**: http://localhost:5173/kismet  
- **WigleToTAK Interface**: http://localhost:5173/wigle
- **Backend API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3000/socket.io

### Build Process

```bash
# Development builds
npm run build              # SvelteKit build
npm run build:all          # All applications

# Production builds  
npm run build:optimized    # Optimized build
npm run build:prod         # Production with NODE_ENV

# Preview builds
npm run preview            # Preview SvelteKit build
npm run preview:hackrf     # Preview HackRF build
```

## Architecture Overview

### Directory Structure

```
stinkster-ui/
├── src/                           # SvelteKit source
│   ├── routes/                    # File-based routing
│   │   ├── +layout.svelte         # Root layout
│   │   ├── +page.svelte           # Home page
│   │   ├── hackrf/+page.svelte    # HackRF app
│   │   ├── kismet/+page.svelte    # Kismet app
│   │   └── wigle/+page.svelte     # WigleToTAK app
│   ├── lib/                       # Shared library
│   │   ├── components/            # Reusable components
│   │   │   ├── cyber/             # Cyberpunk theme
│   │   │   ├── ui/                # Base UI components
│   │   │   ├── charts/            # Chart components
│   │   │   └── 3d/                # 3D visualization
│   │   ├── stores/                # Svelte stores
│   │   ├── services/              # API clients
│   │   ├── types/                 # TypeScript types
│   │   └── utils/                 # Utility functions
│   └── app.html                   # HTML template
├── backend/                       # TypeScript backend
│   ├── src/
│   │   ├── routes/                # Express routes
│   │   ├── services/              # Business logic
│   │   ├── types/                 # Type definitions
│   │   └── utils/                 # Utilities
│   └── dist/                      # Compiled backend
├── static/                        # Static assets
├── docs/                          # Documentation
└── deploy/                        # Deployment scripts
```

### Technology Stack

#### Frontend
- **SvelteKit**: Full-stack framework with file-based routing
- **TypeScript**: Strict type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling + custom cyberpunk theme
- **Chart.js**: Data visualization
- **Cesium.js**: 3D globe and mapping
- **Leaflet**: 2D mapping
- **Socket.IO**: Real-time communication

#### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **TypeScript**: Type safety
- **Socket.IO**: WebSocket server
- **Vitest**: Testing framework

#### Development Tools
- **Vitest**: Unit and integration testing
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks (if configured)

## Component Development

### Creating New Components

#### 1. Base UI Component

```typescript
// src/lib/components/ui/NewComponent.svelte
<script lang="ts">
  export let variant: 'primary' | 'secondary' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled: boolean = false;
  
  // Component logic here
</script>

<div 
  class="new-component {variant} {size}"
  class:disabled
>
  <slot />
</div>

<style>
  .new-component {
    /* Component styles */
  }
</style>
```

#### 2. Cyberpunk Theme Component

```typescript
// src/lib/components/cyber/CyberComponent.svelte
<script lang="ts">
  export let glow: boolean = true;
  export let animated: boolean = true;
  export let variant: 'cyan' | 'green' | 'purple' = 'cyan';
</script>

<div 
  class="cyber-component"
  class:glow
  class:animated
  class:variant-{variant}
>
  <div class="cyber-border"></div>
  <div class="cyber-content">
    <slot />
  </div>
  {#if glow}
    <div class="cyber-glow"></div>
  {/if}
</div>

<style>
  .cyber-component {
    position: relative;
    background: var(--cyber-panel);
    border: 1px solid var(--border-cyber);
    /* Cyberpunk styling */
  }
</style>
```

### Component Testing

```typescript
// src/lib/components/ui/NewComponent.test.ts
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import NewComponent from './NewComponent.svelte';

describe('NewComponent', () => {
  it('renders with default props', () => {
    const { container } = render(NewComponent);
    expect(container.querySelector('.new-component')).toBeTruthy();
  });

  it('applies variant classes correctly', () => {
    const { container } = render(NewComponent, {
      props: { variant: 'secondary' }
    });
    expect(container.querySelector('.secondary')).toBeTruthy();
  });
});
```

## API Development

### Creating API Routes

#### Frontend API Client

```typescript
// src/lib/services/api/newService.ts
import type { ApiResponse } from '$lib/types/api';

export class NewServiceClient {
  private baseUrl = 'http://localhost:3000/api';

  async getData<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}/${endpoint}`);
    return response.json();
  }

  async postData<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}
```

#### Backend Route

```typescript
// backend/src/routes/newRoute.ts
import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

router.get('/data', async (req: Request, res: Response) => {
  try {
    // Business logic here
    const data = await getDataFromService();
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

### WebSocket Events

#### Backend WebSocket Handler

```typescript
// backend/src/services/websocketHandler.ts
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';

export function setupWebSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe:updates', (channel: string) => {
      socket.join(channel);
      socket.emit('subscribed', { channel });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
```

#### Frontend WebSocket Client

```typescript
// src/lib/services/websocket/client.ts
import { io, type Socket } from 'socket.io-client';
import { writable } from 'svelte/store';

export class WebSocketClient {
  private socket: Socket;
  public connected = writable(false);

  constructor(url: string) {
    this.socket = io(url);
    
    this.socket.on('connect', () => {
      this.connected.set(true);
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
    });
  }

  subscribe(event: string, callback: (data: any) => void) {
    this.socket.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket.emit(event, data);
  }
}
```

## State Management

### Svelte Stores

```typescript
// src/lib/stores/device.ts
import { writable, derived } from 'svelte/store';
import type { Device } from '$lib/types';

// Writable store
export const devices = writable<Device[]>([]);

// Derived store
export const deviceCount = derived(
  devices,
  ($devices) => $devices.length
);

// Store with custom methods
function createDeviceStore() {
  const { subscribe, set, update } = writable<Device[]>([]);

  return {
    subscribe,
    addDevice: (device: Device) => update(devices => [...devices, device]),
    removeDevice: (id: string) => update(devices => 
      devices.filter(d => d.id !== id)
    ),
    clear: () => set([])
  };
}

export const deviceStore = createDeviceStore();
```

### Using Stores in Components

```typescript
// src/routes/devices/+page.svelte
<script lang="ts">
  import { deviceStore, deviceCount } from '$lib/stores/device';
  import type { Device } from '$lib/types';

  // Reactive statements
  $: totalDevices = $deviceCount;

  function addNewDevice() {
    const newDevice: Device = {
      id: crypto.randomUUID(),
      name: 'New Device',
      // ... other properties
    };
    deviceStore.addDevice(newDevice);
  }
</script>

<div>
  <h1>Devices ({totalDevices})</h1>
  
  {#each $deviceStore as device}
    <div class="device-card">
      <h3>{device.name}</h3>
      <button on:click={() => deviceStore.removeDevice(device.id)}>
        Remove
      </button>
    </div>
  {/each}
  
  <button on:click={addNewDevice}>Add Device</button>
</div>
```

## Testing

### Unit Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- device.test.ts

# Watch mode
npm run test:watch
```

### Integration Testing

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- hackrf-app.test.ts
```

### Test File Structure

```
src/
├── lib/
│   ├── components/
│   │   └── Button.test.ts          # Component tests
│   ├── services/
│   │   └── api.test.ts             # Service tests
│   └── utils/
│       └── helpers.test.ts         # Utility tests
└── test/
    ├── integration/                # Integration tests
    ├── setup.ts                    # Test setup
    └── utils/                      # Test utilities
```

## Styling with Tailwind CSS

### Custom Cyberpunk Theme

```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'cyber': {
          'black': '#0a0a0a',
          'dark': '#0f1419',
          'panel': 'rgba(15, 20, 25, 0.85)',
        },
        'neon': {
          'cyan': '#00ffff',
          'green': '#00ff00',
          'purple': '#b300ff',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'cyber': ['Orbitron', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'matrix-rain': 'matrix-rain 20s linear infinite',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ]
}
```

### Using Custom Classes

```svelte
<script>
  export let glowing = false;
</script>

<div 
  class="
    bg-cyber-panel 
    border border-neon-cyan 
    font-mono text-neon-cyan
    p-4 rounded-lg
    transition-all duration-300
  "
  class:animate-glow-pulse={glowing}
>
  <slot />
</div>
```

## Deployment

### Local Build

```bash
# Build for production
npm run build:prod

# Preview production build
npm run preview
```

### Production Deployment

```bash
# Build optimized version
npm run build:optimized

# Deploy using deployment scripts
sudo ./deploy/scripts/deploy.sh deploy builds/stinkster-ui_latest.tar.gz

# Quick deploy
./deploy/scripts/quick-deploy.sh
```

## Debugging

### Frontend Debugging

- **Svelte DevTools**: Browser extension for Svelte debugging
- **Vite DevTools**: Built-in debugging with source maps
- **Browser Console**: TypeScript error reporting
- **Network Tab**: API request monitoring

### Backend Debugging

```bash
# Debug mode
DEBUG=* npm run dev

# Specific debug namespace
DEBUG=app:* npm run dev

# VS Code debugging (launch.json configuration)
```

### Common Issues

#### TypeScript Errors
```bash
# Type checking
npm run type-check

# Clear type cache
rm -rf node_modules/.vite
npm run dev
```

#### Build Issues
```bash
# Clear build cache
npm run clean:all
npm install
npm run build
```

#### WebSocket Connection Issues
- Check CORS configuration
- Verify port availability
- Check firewall settings

## Best Practices

### Code Style

1. **TypeScript**: Use strict mode, define interfaces
2. **Components**: Single responsibility, props typing
3. **Stores**: Reactive patterns, derived stores
4. **API**: Type-safe clients, error handling
5. **Testing**: Unit tests for components, integration for workflows

### Performance

1. **Code Splitting**: Lazy load components
2. **Bundle Analysis**: Check bundle sizes
3. **Image Optimization**: Use appropriate formats
4. **Caching**: Implement service workers
5. **Tree Shaking**: Remove unused code

### Security

1. **Input Validation**: Sanitize user inputs
2. **CORS**: Configure properly for production
3. **Environment Variables**: Keep secrets secure
4. **Dependencies**: Regular security audits

## Resources

- **SvelteKit Documentation**: https://kit.svelte.dev/docs
- **Svelte Tutorial**: https://learn.svelte.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vitest**: https://vitest.dev/guide/

## Getting Help

1. **Documentation**: Check project docs in `/docs/`
2. **Issues**: GitHub issues for bug reports
3. **Development**: Internal team communication channels
4. **Code Review**: Pull request process
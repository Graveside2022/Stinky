# TypeScript Configuration & Build Setup

## Overview

This project is configured with a comprehensive TypeScript setup for a SvelteKit-based tactical communications interface. It supports multiple applications (HackRF, WigleToTAK, and Kismet) with shared components, utilities, and a cyberpunk design system - all built with strict type safety.

## Configuration Files

### TypeScript Configuration
- **tsconfig.json**: Base TypeScript configuration for the entire project
- **tsconfig.frontend.json**: Extended configuration with stricter settings for frontend code
- **svelte.config.ts**: Svelte configuration with TypeScript preprocessing

### Build Configuration
- **vite.config.ts**: Base Vite configuration shared across all apps
- **vite.config.hackrf.ts**: HackRF app-specific build configuration
- **vite.config.wigle.ts**: WigleToTAK app-specific build configuration
- **vite.config.kismet.ts**: Kismet app-specific build configuration

## Project Structure

```
stinkster-ui/
├── src/
│   ├── apps/
│   │   ├── hackrf/
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── App.svelte
│   │   ├── wigle/
│   │   │   ├── index.html
│   │   │   ├── main.ts
│   │   │   └── App.svelte
│   │   └── kismet/
│   │       ├── index.html
│   │       ├── main.ts
│   │       └── App.svelte
│   ├── shared/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── stores.ts
│   │   └── app.css
│   └── vite-env.d.ts
├── types/
├── dist/
│   ├── hackrf/
│   ├── wigle/
│   └── kismet/
└── Configuration files...
```

## Available Scripts

### Development
- `npm run dev:hackrf` - Start HackRF dev server (port 5173)
- `npm run dev:wigle` - Start WigleToTAK dev server (port 5174)
- `npm run dev:kismet` - Start Kismet dev server (port 5175)
- `npm run dev:all` - Start all dev servers in parallel

### Building
- `npm run build:hackrf` - Build HackRF app
- `npm run build:wigle` - Build WigleToTAK app
- `npm run build:kismet` - Build Kismet app
- `npm run build:all` - Build all apps

### Other Commands
- `npm run type-check` - Run TypeScript type checking
- `npm run preview:<app>` - Preview production build
- `npm run clean` - Clean build outputs

## Key Features

### TypeScript Support
- Full TypeScript support for Svelte components
- Strict type checking enabled
- Path aliases configured for clean imports
- Type definitions for environment variables

### Path Aliases
```typescript
// Available path aliases
import { something } from '$lib/...'
import { types } from '$shared/...'
import { component } from '$hackrf/...'
import { service } from '$wigle/...'
import { utils } from '$kismet/...'
```

### Hot Module Replacement (HMR)
- Full HMR support for all apps
- WebSocket-based HMR protocol
- Preserves component state during development

### Build Optimization
- Code splitting with manual chunks
- Vendor dependencies bundled separately
- Source maps enabled for debugging
- Tree-shaking for optimal bundle size

### Proxy Configuration
Each app has its own proxy configuration for API calls:
- HackRF: `/api/hackrf` → `http://localhost:8092`
- WigleToTAK: `/api/wigle` → `http://localhost:8000`
- Kismet: `/api/kismet` → `http://localhost:2501`

## Environment Variables

Create a `.env` file based on `.env.example`:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=ws://localhost:3000
VITE_HACKRF_PORT=8092
VITE_WIGLE_PORT=8000
VITE_KISMET_PORT=2501
```

## Getting Started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Start development server: `npm run dev:<app>`
4. Build for production: `npm run build:<app>`

## TypeScript Best Practices

1. Always use strict type checking
2. Define interfaces for all data structures
3. Use path aliases for cleaner imports
4. Keep shared types in `src/shared/types.ts`
5. Enable `noUncheckedIndexedAccess` for safer array/object access
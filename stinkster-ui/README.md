# Stinkster UI - Tactical Communications Interface

A cyberpunk-themed web interface for tactical communications, software-defined radio (SDR), and network reconnaissance operations. Built with modern TypeScript, SvelteKit, Vite, and Tailwind CSS.

## Features

- **HackRF SDR Operations**: Web-based spectrum analyzer and signal processing
- **WiFi Network Scanning**: Kismet-based network discovery and tracking  
- **TAK Integration**: Convert WiFi scan data to TAK format for tactical mapping
- **Real-time Data Streaming**: WebSocket-based live updates
- **Cyberpunk Design System**: Matrix-inspired UI with neon effects and animations
- **Multi-application Architecture**: Modular apps with shared component library

## Tech Stack

- **Frontend**: TypeScript + SvelteKit + Vite
- **Styling**: Tailwind CSS + Custom Cyber Theme
- **Backend**: Node.js + Express + TypeScript  
- **Real-time**: Socket.IO WebSockets
- **Testing**: Vitest + Testing Library
- **3D/Mapping**: Cesium.js + Leaflet
- **Charts**: Chart.js
- **Build**: Vite with multi-app configuration

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev:all          # All applications
npm run dev:hackrf       # HackRF spectrum analyzer  
npm run dev:kismet       # Kismet operations center
npm run dev:wigle        # WigleToTAK interface

# Individual development
npm run dev              # SvelteKit dev server
npm run dev:kit          # Alternative SvelteKit command
```

## Applications

### HackRF Spectrum Analyzer
- **URL**: `http://localhost:5173/hackrf`
- **Features**: Real-time spectrum analysis, waterfall display, signal detection
- **Config**: `vite.config.hackrf.ts`

### Kismet Operations Center  
- **URL**: `http://localhost:5174/kismet`
- **Features**: WiFi network monitoring, device tracking, threat detection
- **Config**: `vite.config.kismet.ts`

### WigleToTAK Interface
- **URL**: `http://localhost:5175/wigle` 
- **Features**: Device management, TAK server integration, map visualization
- **Config**: `vite.config.wigle.ts`

## Development

### Scripts

```bash
# Development
npm run dev                    # Main SvelteKit dev server
npm run dev:all               # All applications in parallel
npm run dev:hackrf            # HackRF app only
npm run dev:kismet            # Kismet app only  
npm run dev:wigle             # WigleToTAK app only

# Building
npm run build                 # Build all
npm run build:all             # Build all applications
npm run build:optimized       # Optimized production build
npm run build:prod            # Production build with NODE_ENV

# Testing
npm test                      # Run unit tests
npm run test:ui               # Test with UI
npm run test:coverage         # Coverage report
npm run test:integration      # Integration tests

# Type Checking
npm run type-check            # TypeScript validation

# Utilities
npm run clean                 # Clean dist folder
npm run clean:all             # Clean all build artifacts
```

### Architecture

```
src/
├── routes/                   # SvelteKit routes
├── lib/                      # Shared library
│   ├── components/           # Reusable components
│   │   ├── cyber/           # Cyberpunk theme components
│   │   ├── ui/              # Base UI components  
│   │   ├── charts/          # Chart components
│   │   └── 3d/              # 3D visualization
│   ├── stores/              # Svelte stores
│   ├── services/            # API clients
│   └── types/               # TypeScript definitions
├── apps/                     # Individual applications
│   ├── hackrf/              # SDR spectrum analyzer
│   ├── kismet/              # Network operations
│   └── wigle/               # TAK integration
frontend/                     # SvelteKit frontend
backend/                      # Node.js backend
```

### Component Library

The project includes a comprehensive cyberpunk-themed component system:

- **Core Components**: `CyberButton`, `CyberCard`, `CyberInput`
- **Layout Components**: `Header`, `Footer`, `Sidebar`, `Navigation`
- **Data Components**: `MetricCard`, `StatusIndicator`, `DataTable`
- **Effects**: `GeometricBackground`, `MatrixRain`, `NeonGlow`
- **3D/Mapping**: `CesiumGlobe`, `DeviceHeatmap`, `NetworkTopology`

## Configuration

### Environment Setup

```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp deploy/config/environment.template .env

# Edit configuration
vim backend/.env
```

### Vite Configuration

The project uses multiple Vite configurations for different applications:

- `vite.config.ts` - Main SvelteKit configuration
- `vite.config.hackrf.ts` - HackRF spectrum analyzer
- `vite.config.kismet.ts` - Kismet operations center 
- `vite.config.wigle.ts` - WigleToTAK interface

### Tailwind Theme

Custom cyberpunk theme with:
- Dark backgrounds with neon accents
- Custom color palette (cyan, green, purple neons)
- Typography using JetBrains Mono and Inter fonts
- Animated components with glow effects

## Backend Services

The TypeScript backend provides:

- **REST API**: Device management, configuration, statistics
- **WebSocket Server**: Real-time data streaming  
- **TAK Integration**: Message generation and broadcasting
- **File Processing**: Wigle CSV import/export
- **Service Management**: Health monitoring and status

See `backend/README.md` for detailed API documentation.

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests (if configured)
npm run test:e2e

# Coverage
npm run test:coverage
```

Test files are located alongside source files with `.test.ts` or `.spec.ts` extensions.

## Deployment

See `deploy/README.md` for production deployment instructions.

```bash
# Build for production
npm run build:prod

# Quick deploy
./deploy/scripts/quick-deploy.sh

# Full deployment
sudo ./deploy/scripts/deploy.sh deploy builds/stinkster-ui_latest.tar.gz
```

## Documentation

### Getting Started
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Comprehensive development workflow and setup
- **[TypeScript Configuration](docs/TYPESCRIPT_CONFIG.md)** - TypeScript setup and configuration
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete REST API and WebSocket reference

### Design & Architecture  
- **[Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)** - Detailed implementation instructions
- **[Design System](docs/DESIGN_TRANSFORMATION_PLAN.md)** - Cyberpunk UI/UX design documentation
- **[Kismet Theme](docs/KISMET_THEME_TRANSFORMATION.md)** - Kismet-specific theme implementation

### Backend Services
- **[Backend README](docs/backend/README.md)** - Backend service architecture and setup
- **[WebSocket Implementation](docs/backend/WEBSOCKET_IMPLEMENTATION.md)** - Real-time communication setup
- **[Kismet API Integration](docs/backend/KISMET_WEBSOCKET_API.md)** - Kismet service integration

### Deployment
- **[Deployment Guide](deploy/README.md)** - Production deployment instructions
- **[Migration Changelog](CHANGELOG.md)** - Complete migration documentation

## Development Tools

### Recommended IDE Setup

- **VS Code** with extensions:
  - Svelte for VS Code
  - TypeScript Hero
  - Tailwind CSS IntelliSense
  - Vite

### Key Dependencies

- **SvelteKit**: Full-stack framework
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Vitest**: Testing framework
- **Socket.IO**: Real-time communication
- **Chart.js**: Data visualization
- **Cesium**: 3D mapping and globe

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Include tests for new features
4. Update documentation for changes
5. Follow the cyberpunk design system guidelines

## License

Private project - All rights reserved.

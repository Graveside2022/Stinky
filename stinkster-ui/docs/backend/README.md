# Stinkster UI Backend - TypeScript

TypeScript backend service for the Stinkster UI tactical communications interface, providing REST APIs, WebSocket services, and integration with HackRF, Kismet, and TAK systems.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## Features

- **Full TypeScript Implementation**: Strict typing with comprehensive type definitions
- **Express.js REST API**: RESTful endpoints for all tactical operations
- **Socket.IO WebSocket Support**: Real-time data streaming and updates
- **TAK Integration**: Message generation, broadcasting, and protocol support
- **Multi-Service Integration**: HackRF, Kismet, WigleToTAK service coordination
- **Device Management**: WiFi device tracking, filtering, and analytics
- **Antenna Sensitivity Compensation**: Signal strength calibration
- **Health Monitoring**: Service status, metrics, and system monitoring
- **Comprehensive Error Handling**: Structured error responses and logging
- **Authentication & Security**: Session management and request validation

## API Endpoints

### Core APIs
- **`/api/devices`** - WiFi device management and tracking
- **`/api/tak`** - TAK server configuration and control
- **`/api/scan`** - Scan control and status management
- **`/api/stats`** - Device statistics and analytics
- **`/api/system`** - System health and monitoring

### Data Management
- **`/api/import`** - Import Wigle CSV files and data sources
- **`/api/export`** - Export device data in various formats
- **`/api/files`** - File management and processing

### Configuration
- **`/api/antenna`** - Antenna configuration and sensitivity
- **`/api/alerts`** - Alert management and notifications
- **`/api/geofences`** - Geofence management and monitoring

### Service Integration
- **`/api/hackrf`** - HackRF SDR service integration
- **`/api/kismet`** - Kismet operations and data access
- **`/api/wigle`** - WigleToTAK service management

### WebSocket Events
- **`device-update`** - Real-time device status changes
- **`scan-progress`** - Live scan status updates
- **`tak-broadcast`** - TAK message broadcasting
- **`system-alerts`** - System health notifications

## Architecture

### Directory Structure
```
backend/
├── src/
│   ├── routes/              # Express route handlers
│   │   ├── devices.ts       # Device management endpoints
│   │   ├── tak.ts           # TAK integration endpoints
│   │   ├── hackrf.ts        # HackRF service integration
│   │   ├── kismet.ts        # Kismet operations
│   │   └── system.ts        # System monitoring
│   ├── services/            # Business logic layer
│   │   ├── deviceManager.ts # Device tracking and management
│   │   ├── takBroadcaster.ts# TAK message handling
│   │   ├── wigleToTakCore.ts# Core conversion logic
│   │   └── websocketHandler.ts# WebSocket event handling
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # Authentication middleware
│   │   ├── errorHandler.ts  # Error handling middleware
│   │   └── requestLogger.ts # Request logging
│   ├── types/               # TypeScript definitions
│   │   ├── index.ts         # Shared type definitions
│   │   └── kismet.ts        # Kismet-specific types
│   ├── utils/               # Utility functions
│   └── server.ts            # Main server entry point
├── dist/                    # Compiled JavaScript
├── tests/                   # Test files
└── package.json             # Dependencies and scripts
```

### Core Components
- **Routes**: Express route handlers with TypeScript typing
- **Services**: Business logic with dependency injection
- **Middleware**: Authentication, logging, error handling, CORS
- **Types**: Comprehensive TypeScript definitions shared with frontend
- **WebSocket**: Real-time updates via Socket.IO with typed events
- **Testing**: Unit and integration tests with Vitest

## Configuration

See `.env.example` for all configuration options.

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run dev:debug        # Start with debug logging enabled

# Building
npm run build            # Compile TypeScript to JavaScript
npm run build:watch      # Build with watch mode

# Production
npm start                # Start production server
npm run start:prod       # Start with production configuration

# Type Checking & Linting
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint code linting
npm run lint:fix         # Auto-fix linting issues
npm run format           # Prettier code formatting

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:integration # Run integration tests

# Utilities
npm run clean            # Clean build artifacts
npm run logs             # View service logs
```

### Development Workflow

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Run Tests**:
   ```bash
   npm test
   ```

3. **Type Checking**:
   ```bash
   npm run typecheck
   ```

4. **Code Quality**:
   ```bash
   npm run lint
   npm run format
   ```
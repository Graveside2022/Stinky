# Kismet Operations Center

Web-based control center for managing Kismet WiFi scanning, spectrum analysis, and related services.

## Quick Start

```bash
npm install
npm start
```

Access the dashboard at http://localhost:8002

## Features

- Real-time service status monitoring
- Start/stop Kismet and related services
- Spectrum analyzer integration with HackRF
- Kismet data visualization
- WebSocket support for real-time updates
- Mobile-responsive UI

## Configuration

Environment variables:
- `PORT` - Server port (default: 8002)
- `KISMET_URL` - Kismet API URL (default: http://localhost:2501)
- `NODE_ENV` - Environment (development/production)

## API Endpoints

See [API_DOCUMENTATION.md](/API_DOCUMENTATION.md) for comprehensive API documentation.

Key endpoints:
- `GET /health` - Health check
- `POST /run-script` - Start services
- `POST /stop-script` - Stop services
- `GET /script-status` - Check service status

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Check code style
npm run lint
```

## Architecture

- Express.js server with Socket.IO
- Proxy middleware for Kismet integration
- CORS-enabled for cross-origin requests
- Helmet.js for security headers
- Winston logging

## Related Services

- Kismet (port 2501) - WiFi scanning
- WigleToTAK (port 8000) - TAK conversion
- OpenWebRX (port 8073) - SDR receiver
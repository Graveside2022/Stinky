# Mobile Kismet Operations Center Server

This server provides a mobile-optimized interface for the Kismet Operations Center on port 8889.

## Quick Start

```bash
./start.sh
```

Or manually:

```bash
npm install
npm start
```

## Features

- Serves the mobile-optimized HTML interface
- Proxies all API endpoints to the original server on port 8002
- Handles Kismet iframe integration
- Lightweight and fast

## Configuration

The server can be configured using environment variables:

- `PORT`: Server port (default: 8889)
- `ORIGINAL_SERVER_PORT`: Port of the original server to proxy to (default: 8002)
- `ORIGINAL_SERVER_HOST`: Host of the original server (default: localhost)

## API Endpoints

All API endpoints are proxied to the original server:

- `/info` - GPS and system information
- `/kismet-data` - Kismet device data
- `/script-status` - Service status
- `/run-script` - Start services
- `/stop-script` - Stop services
- `/kismet` - Kismet interface proxy

## Access

Once running, access the mobile interface at:
- http://localhost:8889
- http://[your-pi-ip]:8889

## Requirements

- Node.js 14+
- Original Kismet Operations server running on port 8002
- Mobile-optimized HTML file in outputs directory
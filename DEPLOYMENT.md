# Svelte Frontend Deployment

This document describes the deployment of the Svelte frontend applications.

## Overview

The Svelte frontend applications have been built and deployed:

- **HackRF SDR**: `/public/hackrf/` - Spectrum analyzer and signal detection
- **WigleToTAK**: `/public/wigle/` - WiFi device tracking and TAK integration  
- **Kismet Dashboard**: `/public/kismet/` - Network monitoring (build issues, not yet deployed)

## Accessing the Applications

### Option 1: Via Node.js Server (Port 3002)

The existing WigleToTAK Node.js server serves static files from the `public` directory:

```bash
# Start the server
cd src/nodejs/wigle-to-tak
node server.js --flask-port 3002
```

Access applications at:
- http://localhost:3002/hackrf/
- http://localhost:3002/wigle/
- http://localhost:3002/ (index page)

### Option 2: Direct File Access

If you have a web server (nginx, Apache) configured to serve from the project directory, access the files directly from the `/public` directory.

### Option 3: Python Simple Server (Development)

```bash
cd public
python3 -m http.server 8080
```

Access at http://localhost:8080/

## API Configuration

The applications are configured to use dynamic API endpoints based on the current location:

- In production: Uses same-origin requests (e.g., `ws://current-host:8092`)
- In development: Can use localhost or configured URLs via environment variables

## Backend Services Required

The frontend applications connect to these backend services:

- **HackRF Service**: Port 8092 (WebSocket + HTTP API)
- **WigleToTAK Service**: Port 8000 (WebSocket + HTTP API)  
- **Kismet Service**: Port 2501 (HTTP API)

Ensure these services are running for full functionality.

## Building and Deployment Scripts

### Quick Build

```bash
cd stinkster-ui
./scripts/quick-build.sh          # Build all apps
./scripts/quick-build.sh hackrf   # Build only HackRF
./scripts/quick-build.sh wigle    # Build only Wigle
```

### Full Deployment

```bash
cd stinkster-ui
./scripts/deploy.sh               # Build and deploy all apps
```

## Environment Configuration

For custom API endpoints, create `.env.production` in `stinkster-ui/`:

```env
VITE_API_BASE_URL=http://your-server
VITE_WS_BASE_URL=ws://your-server
VITE_HACKRF_PORT=8092
VITE_WIGLE_PORT=8000
VITE_KISMET_PORT=2501
```

## Troubleshooting

### Applications not loading
1. Check that the backend services are running
2. Verify the correct ports are being used
3. Check browser console for errors

### WebSocket connection failures
1. Ensure WebSocket services are running
2. Check firewall settings for the required ports
3. Verify CORS settings if accessing from different origins

### Build errors
- The Kismet app has known build issues with Svelte 5 component syntax
- TailwindCSS warnings about `bg-surface-50` can be ignored (non-critical)

## Production Deployment

For production deployment:

1. Build with production configuration
2. Deploy to a proper web server (nginx recommended)
3. Configure reverse proxy for backend services
4. Set up SSL/TLS certificates
5. Configure proper CORS headers

Example nginx configuration:

```nginx
location /hackrf/ {
    alias /path/to/stinkster/public/hackrf/;
    try_files $uri $uri/ /hackrf/index.html;
}

location /wigle/ {
    alias /path/to/stinkster/public/wigle/;
    try_files $uri $uri/ /wigle/index.html;
}

# Proxy WebSocket connections
location /ws/hackrf {
    proxy_pass http://localhost:8092;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```
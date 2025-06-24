# Nginx Configuration for Svelte Applications

## Overview
Nginx has been configured to serve the Svelte applications while maintaining backward compatibility with legacy apps.

## Configuration Details

### Configuration File
- Location: `/etc/nginx/sites-available/stinkster-svelte`
- Enabled via symlink in `/etc/nginx/sites-enabled/`

### URL Routes

#### Svelte Applications
- `/hackrf` - HackRF Spectrum Analyzer Svelte UI
- `/wigle` - WigleToTAK Svelte UI  
- `/kismet` - Kismet Operations Svelte UI

#### API Endpoints (Proxied)
- `/api/hackrf/` → `http://127.0.0.1:8092/`
- `/api/wigle/` → `http://127.0.0.1:8000/`
- `/api/kismet/` → `http://127.0.0.1:8002/`

#### WebSocket Endpoints
- `/ws/hackrf` → `http://127.0.0.1:8092/socket.io/`
- `/ws/wigle` → `http://127.0.0.1:8000/socket.io/`
- `/ws/kismet` → `http://127.0.0.1:8002/ws`

#### Legacy Support (Backward Compatibility)
- `/spectrum` → Direct proxy to spectrum analyzer
- `/wigletotak` → Direct proxy to WigleToTAK Flask app
- `/kismet-ops` → Direct proxy to Kismet Operations

## Features

### Performance Optimizations
- Gzip compression enabled
- Static asset caching (1 year for JS/CSS/images)
- WebSocket timeouts set to 24 hours

### CORS Support
- CORS headers configured for all API endpoints
- Preflight requests handled properly

### Logging
- Access log: `/var/log/nginx/stinkster-svelte-access.log`
- Error log: `/var/log/nginx/stinkster-svelte-error.log`

## Deployment Notes

### Building Svelte Apps
```bash
cd /home/pi/projects/stinkster_christian/stinkster/stinkster-ui
npm run build:all
```

### Permission Requirements
- Nginx runs as `www-data` user
- Requires read access to `/home/pi/projects/stinkster_christian/stinkster/stinkster-ui/dist/`
- Home directory permissions may need adjustment: `chmod 755 /home/pi`

### Testing
```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo nginx -s reload

# Test routes
curl http://localhost/
curl http://localhost/hackrf/
curl http://localhost/api/hackrf/api/status
```

## Troubleshooting

### Permission Denied Errors
If you see "Permission denied" errors in logs:
1. Check directory permissions: `ls -la /home/pi/projects/stinkster_christian/stinkster/stinkster-ui/dist/`
2. Ensure www-data can read: `sudo usermod -a -G pi www-data`
3. Fix permissions if needed: `chmod -R 755 /home/pi/projects/stinkster_christian/stinkster/`

### 500 Internal Server Error
Check error logs: `sudo tail -f /var/log/nginx/stinkster-svelte-error.log`

### Build Errors
If Svelte apps fail to build:
- Check for Tailwind CSS configuration issues
- Ensure all dependencies are installed: `npm install`
- Try building individually: `npm run build:hackrf`
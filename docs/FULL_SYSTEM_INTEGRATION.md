# Full System Integration Guide

## Overview

This guide covers the complete integration of the Stinkster system with:
- Node.js backends for all services
- Svelte frontends for modern UI
- WebSocket real-time communication
- Unified system management

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Svelte Apps    │     │  Svelte Apps    │     │  Svelte Apps    │
│  (HackRF UI)    │     │  (Wigle UI)     │     │  (Kismet UI)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ HTTP/WS               │ HTTP/WS               │ HTTP/WS
         │                       │                       │
┌────────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
│ Spectrum        │     │ WigleToTAK      │     │ Kismet Ops      │
│ Analyzer        │     │ Service         │     │ Center          │
│ (Port 8092)     │     │ (Port 8000)     │     │ (Port 8003)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ├───────────────────────┴───────────────────────┤
         │                                               │
┌────────▼───────────────────────────────────────────────▼────────┐
│                        GPS Bridge Service                        │
│                          (Port 2947)                             │
└──────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
cd /home/pi/projects/stinkster_christian/stinkster
npm install

# Install frontend dependencies
cd stinkster-ui
npm install
```

### 2. Configure Environment

```bash
# Copy production environment file
cp .env.production .env

# Edit configuration as needed
nano .env
```

### 3. Build Frontend

```bash
cd stinkster-ui

# Build all frontends
npm run build:all

# Or build individually
npm run build:hackrf
npm run build:wigle
npm run build:kismet
```

### 4. Start Services

#### Option A: Using Unified Startup Script

```bash
# Start all services
./scripts/unified-startup.sh start

# Check status
./scripts/unified-startup.sh status

# View logs
./scripts/unified-startup.sh logs
```

#### Option B: Using systemd

```bash
# Install systemd services
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable spectrum-analyzer
sudo systemctl enable wigle-to-tak
sudo systemctl enable gps-bridge
sudo systemctl enable kismet-operations-center

# Start services
sudo systemctl start spectrum-analyzer
sudo systemctl start wigle-to-tak
sudo systemctl start gps-bridge
sudo systemctl start kismet-operations-center
```

### 5. Verify Integration

```bash
# Run integration tests
node tests/integration/full-system-test.js

# Check health endpoints
curl http://localhost:8092/api/health
curl http://localhost:8000/api/health
curl http://localhost:8003/api/health
```

## Service Details

### Spectrum Analyzer (HackRF)
- **Port**: 8092
- **Frontend**: http://localhost:8092/hackrf/
- **API**: http://localhost:8092/api/
- **WebSocket**: ws://localhost:8092
- **Features**:
  - Real-time FFT spectrum display
  - Signal detection and tracking
  - OpenWebRX integration
  - Frequency/gain control

### WigleToTAK
- **Port**: 8000
- **Frontend**: http://localhost:8000/wigle/
- **API**: http://localhost:8000/api/
- **WebSocket**: ws://localhost:8000/ws
- **Features**:
  - WiFi device tracking
  - TAK server broadcasting
  - Real-time device updates
  - Filtering and whitelisting

### Kismet Operations Center
- **Port**: 8003
- **Frontend**: http://localhost:8003/kismet/
- **API**: http://localhost:8003/api/
- **WebSocket**: ws://localhost:8003
- **Features**:
  - Kismet integration
  - Script management
  - System monitoring
  - 3D globe visualization

### GPS Bridge
- **Port**: 2947 (GPSD protocol)
- **Features**:
  - MAVLink to GPSD conversion
  - Provides GPS data to all services
  - Automatic reconnection

## API Integration

### Authentication
Currently, the system does not require authentication. For production deployments, consider implementing:
- API key authentication
- JWT tokens
- OAuth2

### CORS Configuration
All services are configured to accept CORS requests. Modify `.env.production` to restrict origins:

```bash
SPECTRUM_CORS_ORIGIN=https://yourdomain.com
```

### WebSocket Events

#### Spectrum Analyzer
```javascript
// Subscribe to spectrum data
ws.send(JSON.stringify({ type: 'subscribe', channel: 'spectrum' }));

// Receive spectrum updates
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'spectrum') {
    // Handle spectrum data
  }
});
```

#### WigleToTAK
```javascript
// Subscribe to device updates
ws.send(JSON.stringify({ type: 'subscribe', channel: 'devices' }));

// Receive device updates
ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'device_update') {
    // Handle device update
  }
});
```

## Frontend Development

### Local Development

```bash
cd stinkster-ui

# Run specific app in dev mode
npm run dev:hackrf  # Port 5173
npm run dev:wigle   # Port 5174
npm run dev:kismet  # Port 5175
```

### Building for Production

```bash
# Build with optimizations
npm run build:all

# Output will be in:
# - dist/hackrf/
# - dist/wigle/
# - dist/kismet/
```

### Deployment

Frontend files are served by their respective Node.js backends:
- HackRF UI: Served from `/hackrf/` path
- Wigle UI: Served from `/wigle/` path
- Kismet UI: Served from `/kismet/` path

## Monitoring

### Health Checks

All services expose health endpoints:

```bash
# Check individual service health
curl http://localhost:8092/api/health
curl http://localhost:8000/api/health
curl http://localhost:8003/api/health

# Check system status
./scripts/unified-startup.sh health
```

### Logs

#### Using journalctl (systemd)
```bash
# View service logs
sudo journalctl -u spectrum-analyzer -f
sudo journalctl -u wigle-to-tak -f
sudo journalctl -u kismet-operations-center -f
```

#### Using log files
```bash
# View log files
tail -f /var/log/spectrum-analyzer.log
tail -f /var/log/wigle-to-tak.log
tail -f /var/log/kismet-operations-center.log
```

### Performance Monitoring

```bash
# Monitor system resources
htop

# Monitor Node.js processes
pm2 monit  # If using PM2

# Check port usage
sudo netstat -tlnp | grep -E '8092|8000|8003|2947'
```

## Troubleshooting

### Service Won't Start

1. Check port availability:
   ```bash
   sudo lsof -i :8092
   sudo lsof -i :8000
   sudo lsof -i :8003
   ```

2. Check logs:
   ```bash
   ./scripts/unified-startup.sh logs
   ```

3. Verify Node.js version:
   ```bash
   node --version  # Should be v18+
   ```

### WebSocket Connection Issues

1. Check CORS settings in `.env`
2. Verify firewall rules
3. Test with wscat:
   ```bash
   wscat -c ws://localhost:8092
   ```

### Frontend Not Loading

1. Verify build completed:
   ```bash
   ls -la stinkster-ui/dist/
   ```

2. Check backend static file serving
3. Clear browser cache

## Security Considerations

### Production Deployment

1. **Use HTTPS**: Deploy behind nginx with SSL
2. **Firewall**: Restrict ports to localhost only
3. **Authentication**: Implement API authentication
4. **Rate Limiting**: Enable rate limiting in production
5. **Environment Variables**: Never commit `.env` files

### Example nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name stinkster.local;
    
    ssl_certificate /etc/ssl/certs/stinkster.crt;
    ssl_certificate_key /etc/ssl/private/stinkster.key;
    
    # HackRF
    location /hackrf/ {
        proxy_pass http://localhost:8092/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # WigleToTAK
    location /wigle/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Kismet Operations
    location /kismet/ {
        proxy_pass http://localhost:8003/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Maintenance

### Backup

```bash
# Backup configuration
tar -czf stinkster-config-backup.tar.gz \
  .env \
  .env.production \
  systemd/ \
  config/

# Backup data
tar -czf stinkster-data-backup.tar.gz \
  /home/pi/kismet_ops/ \
  /home/pi/tmp/
```

### Updates

```bash
# Update dependencies
npm update

# Rebuild frontends
cd stinkster-ui && npm run build:all

# Restart services
./scripts/unified-startup.sh restart
```

## Performance Optimization

### Node.js Tuning

```bash
# Set in .env or systemd service files
NODE_OPTIONS="--max-old-space-size=512"
UV_THREADPOOL_SIZE=4
```

### Frontend Optimization

- Enable gzip compression
- Use CDN for static assets
- Implement lazy loading
- Enable browser caching

### Database Optimization

If using SQLite:
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
```

## Next Steps

1. **Implement Authentication**: Add user authentication system
2. **Add Monitoring**: Set up Prometheus/Grafana
3. **Container Deployment**: Create Docker containers
4. **CI/CD Pipeline**: Automate testing and deployment
5. **Documentation**: Generate API documentation with Swagger

## Support

For issues or questions:
1. Check logs first
2. Run integration tests
3. Review this documentation
4. Submit issues on GitHub
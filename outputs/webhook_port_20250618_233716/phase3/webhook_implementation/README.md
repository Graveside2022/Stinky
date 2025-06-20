# Stinkster Webhook Service

A standalone Node.js webhook service for orchestrating Kismet WiFi scanning, GPS services, and WigleToTAK integration. This service runs on port 8002 and provides a production-ready replacement for the Flask webhook.py implementation.

## Features

- ✅ Complete Flask webhook.py API compatibility
- ✅ Real-time WebSocket support for live updates
- ✅ Comprehensive process management with PID tracking
- ✅ GPS data integration via GPSD
- ✅ Kismet CSV and REST API support
- ✅ Robust error handling and logging
- ✅ CORS support for cross-origin requests
- ✅ Graceful shutdown handling
- ✅ Environment-based configuration

## Installation

1. Clone or copy this service to your system:
```bash
cd /home/pi/stinkster/src/nodejs/
cp -r /path/to/webhook-service .
```

2. Install dependencies:
```bash
cd webhook-service
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
# Edit .env with your specific configuration
```

4. Ensure required directories exist:
```bash
mkdir -p /home/pi/tmp
mkdir -p /var/log
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key settings:

- `WEBHOOK_PORT`: Service port (default: 8002)
- `MAIN_SCRIPT`: Path to orchestration script
- `KISMET_API_URL`: Kismet REST API endpoint
- `CORS_ORIGINS`: Allowed CORS origins

### Nginx Configuration

Add to your nginx configuration to proxy requests:

```nginx
location /webhook/ {
    proxy_pass http://localhost:8002/webhook/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
}
```

## API Endpoints

### Service Control

#### POST /webhook/run-script
Start Kismet and GPS services.

```bash
curl -X POST http://localhost:8002/webhook/run-script \
  -H "Content-Type: application/json" \
  -d '{"script": "both"}'
```

Options:
- `script`: "kismet", "gps", or "both" (default: "both")

#### POST /webhook/stop-script
Stop all services and cleanup.

```bash
curl -X POST http://localhost:8002/webhook/stop-script
```

### Status Monitoring

#### GET /webhook/info
Get system information including GPS data.

```bash
curl http://localhost:8002/webhook/info
```

Response includes:
- GPS coordinates, altitude, fix status
- Kismet service status
- WigleToTAK service status
- Client IP address

#### GET /webhook/script-status
Quick status check of all services.

```bash
curl http://localhost:8002/webhook/script-status
```

Response includes boolean flags for each service state.

#### GET /webhook/kismet-data
Retrieve Kismet scanning data.

```bash
curl http://localhost:8002/webhook/kismet-data
```

Returns device counts, recent activity, and network information.

### Health Check

#### GET /health
Service health status.

```bash
curl http://localhost:8002/health
```

## WebSocket Events

Connect to the WebSocket server for real-time updates:

```javascript
const socket = io('http://localhost:8002');

// Subscribe to output events
socket.emit('subscribe:output');
socket.on('script_output', (data) => {
    console.log('Script output:', data);
});

// Subscribe to status updates
socket.emit('subscribe:status');
socket.on('status_update', (data) => {
    console.log('Status update:', data);
});
```

### Event Types

- `script_output`: Real-time output from running scripts
- `status_update`: Service status changes
- `services_started`: Services have been started
- `services_stopped`: Services have been stopped

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### As a systemd Service

Create `/etc/systemd/system/webhook.service`:

```ini
[Unit]
Description=Stinkster Webhook Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/stinkster/src/nodejs/webhook-service
ExecStart=/usr/bin/node webhook.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable webhook
sudo systemctl start webhook
```

## Testing

Run the test suite:
```bash
npm test
```

Test button functionality:
```javascript
// In your frontend
async function startServices() {
    const response = await fetch('http://localhost:8002/webhook/run-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: 'both' })
    });
    const data = await response.json();
    console.log('Services started:', data);
}
```

## Troubleshooting

### Service won't start
- Check port 8002 is available: `sudo lsof -i :8002`
- Verify permissions on PID file directories
- Check logs: `journalctl -u webhook -f`

### Buttons not working
- Ensure CORS origins include your frontend URL
- Check browser console for errors
- Verify nginx proxy configuration

### GPS data not available
- Ensure GPSD is running: `sudo systemctl status gpsd`
- Check GPS device: `gpsmon`
- Verify gpspipe works: `gpspipe -w -n 1`

### Kismet data empty
- Check Kismet is running: `pgrep -f kismet`
- Verify CSV files exist in `/home/pi/kismet_ops/`
- Test Kismet API: `curl http://localhost:2501/system/status.json`

## Architecture

The service follows a modular architecture:

```
webhook.js                 # Main application entry
├── routes/
│   └── webhook.js        # API route handlers
├── services/
│   ├── processManager.js # Process orchestration
│   ├── gpsService.js     # GPS data handling
│   └── kismetService.js  # Kismet integration
├── middleware/
│   └── errorHandler.js   # Error handling
└── config/
    └── index.js         # Configuration management
```

## Migration from Flask

This service is a drop-in replacement for the Flask webhook.py. Key differences:

1. **Async Operations**: All I/O operations use async/await
2. **WebSocket Support**: Real-time updates via Socket.IO
3. **Better Error Handling**: Structured error classes and logging
4. **Environment Config**: All settings via environment variables
5. **Process Management**: More robust PID tracking and cleanup

## Contributing

When making changes:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test button functionality thoroughly
5. Ensure Flask API compatibility

## License

MIT License - See parent project for details
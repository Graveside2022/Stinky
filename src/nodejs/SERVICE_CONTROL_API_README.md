# Stinkster Service Control API

## Overview

This is a dedicated REST API server for controlling the main Stinkster backend services from web frontends. It provides endpoints to start, stop, restart, and monitor the core GPS, Kismet, and WigleToTAK services that comprise the Stinkster system.

## Quick Start

### 1. Start the API Server

```bash
# Using the startup script (recommended)
./start-service-control-api.sh start

# Or run directly
node service-control-api.js
```

### 2. Test the API

```bash
# Run the test suite
node test-service-control-api.js

# Or test manually
curl http://localhost:8080/health
```

### 3. Control Services

```bash
# Start all services
curl -X POST http://localhost:8080/api/services/start

# Check status
curl http://localhost:8080/api/services/status

# Stop services
curl -X POST http://localhost:8080/api/services/stop
```

## Files Created

### Core API Server
- **`service-control-api.js`** - Main API server with all endpoints
- **`service-control-package.json`** - Dependencies for the API
- **`start-service-control-api.sh`** - Management script for the API server

### Testing & Documentation
- **`test-service-control-api.js`** - Comprehensive test suite
- **`API_DOCUMENTATION.md`** - Complete API documentation
- **`frontend-integration-example.js`** - Frontend integration examples

### System Service
- **`stinkster-service-control-api.service`** - Systemd service file

## Key Features

### ✅ Service Control
- Start all Stinkster services with one API call
- Stop services gracefully or with force
- Restart services with proper cleanup
- Real-time status monitoring

### ✅ System Health Monitoring
- CPU, memory, and disk usage
- System temperature monitoring
- Load average tracking
- Process resource usage

### ✅ CORS Support
- Configured for Svelte frontend integration
- Supports multiple development ports
- Local network access enabled

### ✅ Error Handling
- Comprehensive error responses
- Proper HTTP status codes
- Detailed error messages for debugging

### ✅ Process Management
- PID file tracking
- Graceful shutdown handling
- Process health monitoring
- Automatic cleanup

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |
| GET | `/` | API information and endpoint discovery |
| POST | `/api/services/start` | Start all services |
| POST | `/api/services/stop` | Stop all services |
| POST | `/api/services/restart` | Restart all services |
| GET | `/api/services/status` | Get service status |
| GET | `/api/services/logs` | Get service logs |
| GET | `/api/system/health` | Get system health |
| GET | `/api/system/interfaces` | Get network interfaces |

## Configuration

### Environment Variables
- `API_PORT` - API server port (default: 8080)
- `NODE_ENV` - Environment (production/development)
- `FRONTEND_URL` - Custom frontend URL for CORS

### Script Paths
The API controls the main orchestration script at:
```
/home/pi/projects/stinkster_christian/stinkster/src/orchestration/gps_kismet_wigle.sh
```

### Log Files
- API logs: `/home/pi/tmp/service-control-api.log`
- Service logs: `/home/pi/tmp/gps_kismet_wigle.log`
- PID files: `/home/pi/tmp/`

## Management Commands

### Using the Management Script

```bash
# Start API server
./start-service-control-api.sh start

# Stop API server
./start-service-control-api.sh stop

# Restart API server
./start-service-control-api.sh restart

# Check API status
./start-service-control-api.sh status

# View logs
./start-service-control-api.sh logs

# Run tests
./start-service-control-api.sh test
```

### Manual Commands

```bash
# Start with custom port
API_PORT=8081 node service-control-api.js

# Debug mode
node service-control-api.js --debug

# Custom configuration
FRONTEND_URL=http://192.168.1.50:3000 node service-control-api.js
```

## Frontend Integration

### For Svelte Applications

```javascript
// Create API client
const api = new StinksterServiceAPI('http://localhost:8080');

// Start services
await api.startServices();

// Monitor status
api.on('statusUpdated', (status) => {
    console.log('Services status:', status);
});

// Start automatic polling
api.startPolling(5000); // Every 5 seconds
```

### CORS Configuration

The API is pre-configured for these frontend URLs:
- `http://localhost:3000` (Svelte dev)
- `http://localhost:5173` (Vite dev)
- `http://localhost:8000` (WigleToTAK)
- `http://localhost:8001` (Main UI)
- `http://localhost:8002` (Alternative)
- Local network IPs

## Service Integration

### What It Controls

The API controls the main `gps_kismet_wigle.sh` script which manages:

1. **GPS Services** - GPSD and GPS monitoring
2. **Kismet** - WiFi scanning and monitoring
3. **WigleToTAK** - WiFi data to TAK conversion
4. **Process Coordination** - PID management and health monitoring

### Process Lifecycle

1. **Start**: Executes the main orchestration script
2. **Monitor**: Tracks PIDs and process health
3. **Status**: Reports on individual service status
4. **Stop**: Gracefully terminates all processes
5. **Cleanup**: Removes PID files and cleans up

## Testing

### Comprehensive Test Suite

```bash
# Run all tests
node test-service-control-api.js

# Test specific URL
node test-service-control-api.js --url=http://192.168.1.100:8080

# Wait for server and test
node test-service-control-api.js --wait
```

### Test Coverage

- ✅ Health check endpoint
- ✅ Service control endpoints
- ✅ Status monitoring
- ✅ System health
- ✅ Network interfaces
- ✅ Error handling
- ✅ CORS headers
- ✅ 404 handling

## Installation as System Service

### 1. Copy Service File

```bash
sudo cp stinkster-service-control-api.service /etc/systemd/system/
```

### 2. Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable stinkster-service-control-api
sudo systemctl start stinkster-service-control-api
```

### 3. Check Status

```bash
sudo systemctl status stinkster-service-control-api
journalctl -u stinkster-service-control-api -f
```

## Security Considerations

### CORS Configuration
- Restricted to known frontend URLs
- Local network access only
- No wildcard origins

### Process Control
- Runs as pi user (not root)
- Limited to specific script execution
- PID file validation

### Resource Limits
- Memory limit: 512MB
- File descriptor limit: 65536
- No new privileges

## Troubleshooting

### API Won't Start
1. Check port availability: `netstat -tlnp | grep 8080`
2. Check Node.js version: `node --version`
3. Check dependencies: `npm install`
4. Check logs: `tail -f /home/pi/tmp/service-control-api.log`

### Services Won't Start
1. Check script exists: `ls -la /home/pi/projects/stinkster_christian/stinkster/src/orchestration/gps_kismet_wigle.sh`
2. Check permissions: Script should be executable
3. Check dependencies: GPS hardware, network interfaces
4. Check logs: `/home/pi/tmp/gps_kismet_wigle.log`

### CORS Issues
1. Check frontend URL in CORS configuration
2. Add custom URL via `FRONTEND_URL` environment variable
3. Check browser developer tools for CORS errors

### Health Check Failures
1. Verify API is responding: `curl http://localhost:8080/health`
2. Check system resources (CPU, memory, disk)
3. Verify all required services are accessible

## Development

### Adding New Endpoints

1. Add route in `service-control-api.js`
2. Update documentation in `API_DOCUMENTATION.md`
3. Add test in `test-service-control-api.js`
4. Update frontend integration examples

### Extending Health Monitoring

1. Add new health checks to `getSystemHealth()` method
2. Update response format in documentation
3. Add corresponding frontend handling

## Dependencies

### Required Node.js Packages
- `express` - Web framework
- `cors` - CORS middleware

### System Requirements
- Node.js 14.0.0 or higher
- Access to Stinkster orchestration scripts
- Read/write access to `/home/pi/tmp/`

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Authentication/authorization
- [ ] Service configuration endpoints
- [ ] Log streaming endpoints
- [ ] Metrics and alerting integration
- [ ] Docker support

---

**Created for the Stinkster project** - A Raspberry Pi-based SDR and WiFi intelligence platform with TAK integration.
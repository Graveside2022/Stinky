# CLAUDE.md - Project Guidelines

This file provides guidance to Claude Code (claude.ai/code) when working with the Stinkster Malone codebase.

## Project Overview

Stinkster Malone is a Raspberry Pi-based system that combines Software Defined Radio (SDR), WiFi scanning, and GPS tracking capabilities with TAK (Team Awareness Kit) integration. The system consists of several interconnected components managed through a unified web interface.

## Architecture

### Core Components

1. **Kismet Operations Center** (Port 8002)
   - Node.js/Express web dashboard
   - Service orchestration and monitoring
   - WebSocket support for real-time updates
   - Proxy integration for Kismet and WigleToTAK

2. **Kismet WiFi Scanner** (Port 2501)
   - Wireless network detection and monitoring
   - GPS integration for geolocation
   - Generates Wigle CSV files

3. **WigleToTAK Converter** (Port 8000)
   - Converts Kismet data to TAK format
   - Flask web interface
   - UDP broadcasting to TAK clients

4. **HackRF Spectrum Analyzer** (Port 8092)
   - Real-time spectrum visualization
   - OpenWebRX integration
   - Signal detection and analysis

5. **GPS MAVLink Bridge**
   - Converts MAVLink GPS to GPSD format
   - Provides location services to all components

## Development Workflow

### Directory Structure
```
stinkster/
├── src/
│   ├── nodejs/           # Node.js services
│   ├── hackrf/          # Python SDR tools
│   ├── wigletotak/      # Python TAK converter
│   ├── gpsmav/          # Python GPS bridge
│   ├── orchestration/   # Bash service scripts
│   └── scripts/         # Utility scripts
├── docs/                # Documentation
├── data/               # Runtime data
└── logs/               # Application logs
```

### Service Dependencies
1. GPS must start before Kismet
2. Kismet must be running for WigleToTAK
3. OpenWebRX container required for spectrum analysis
4. All services coordinate through the Operations Center

### Key Technologies
- **Backend**: Node.js (Express), Python (Flask)
- **Frontend**: Tailwind CSS, vanilla JavaScript, WebSockets
- **Infrastructure**: Docker, systemd, Bash scripting
- **SDR**: HackRF, OpenWebRX
- **WiFi**: Kismet, monitor mode interfaces
- **GPS**: GPSD, MAVLink

## Code Style Guidelines

### JavaScript (Node.js)
- Use ES6+ features
- Async/await for asynchronous code
- Proper error handling with try/catch
- Winston for logging
- JSDoc comments for functions

### Python
- Follow PEP 8
- Use virtual environments
- Type hints where appropriate
- Comprehensive logging
- Docstrings for all functions

### Bash Scripts
- Set -e for error handling
- Use functions for repeated code
- Proper signal handling (trap)
- Logging to files
- PID file management

## Testing Approach

### Manual Testing
- Service start/stop functionality
- WebSocket connections
- API endpoint responses
- UI responsiveness
- Cross-service communication

### Integration Testing
- GPS to Kismet flow
- Kismet to WigleToTAK pipeline
- Service orchestration
- Error recovery

## Common Tasks

### Adding New API Endpoints
1. Define route in server.js
2. Add validation with Joi
3. Implement error handling
4. Update API documentation
5. Test with curl/Postman

### Modifying UI
1. Use Tailwind CSS classes
2. Ensure mobile responsiveness
3. Test on actual devices
4. Update both light/dark themes
5. Verify WebSocket updates

### Service Integration
1. Check existing proxy patterns
2. Implement health checks
3. Add to orchestration scripts
4. Update status monitoring
5. Document in API_DOCUMENTATION.md

## Important Considerations

### Performance
- Raspberry Pi has limited resources
- Minimize memory usage
- Efficient data processing
- Proper cleanup on shutdown

### Security
- Services behind firewall
- Use Tailscale for remote access
- Validate all inputs
- Sanitize file paths
- No hardcoded credentials

### Reliability
- Automatic service restart
- Proper error recovery
- Signal handling
- Network interface management
- Log rotation

## Debugging Tips

### Check Service Status
```bash
curl http://localhost:8002/script-status | jq
ps aux | grep -E "kismet|node|python"
sudo netstat -tlnp | grep -E "8002|2501|8000"
```

### View Logs
```bash
tail -f /home/pi/projects/stinkster/logs/kismet-operations.log
journalctl -u kismet-operations -f
tail -f /home/pi/tmp/gps_kismet_wigle.log
```

### Test Components
```bash
# GPS
gpspipe -w -n 1

# Kismet API
curl -u admin:admin http://localhost:2501/system/status.json

# WiFi adapter
iw dev wlan2 info
```

## Best Practices

1. **Always test on the target hardware** - Raspberry Pi behaves differently than development machines
2. **Monitor resource usage** - Use htop during development
3. **Handle network failures gracefully** - WiFi and network can be unreliable
4. **Document API changes** - Keep API_DOCUMENTATION.md current
5. **Preserve existing functionality** - Don't break working features
6. **Use semantic versioning** - Update CHANGELOG.md appropriately

## Project Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and rotate logs
- Check for security updates
- Test backup/restore procedures
- Verify all services start correctly

### Before Major Changes
1. Create full system backup
2. Document current working state
3. Test in isolated environment
4. Have rollback plan ready
5. Update relevant documentation

## Contact & Support

For questions about the codebase architecture or implementation details, refer to:
- API_DOCUMENTATION.md - API reference
- DEPLOYMENT.md - Setup and deployment
- CHANGELOG.md - Recent changes
- Individual service README files
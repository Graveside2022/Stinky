# WigleToTAK Python to Node.js Migration Guide

## Overview

This guide documents the migration from the Python Flask implementation of WigleToTAK to the Node.js Express implementation.

## Key Changes

### 1. Technology Stack
- **Python/Flask** → **Node.js/Express**
- **Threading** → **Event-driven architecture**
- **No WebSocket** → **Socket.IO for real-time updates**
- **Basic logging** → **Winston for structured logging**

### 2. Performance Improvements
- Non-blocking I/O for file processing
- Chokidar for efficient file watching
- Stream processing for large CSV files
- WebSocket support for real-time status updates

### 3. Command Line Compatibility
Both versions accept the same command line arguments:
```bash
# Python version
python3 WigleToTak2.py --directory /path/to/csvs --port 6969 --flask-port 8000

# Node.js version
node server.js --directory /path/to/csvs --port 6969 --flask-port 8000
```

### 4. API Compatibility
All existing API endpoints are maintained with the same request/response formats:
- `/update_tak_settings`
- `/update_multicast_state`
- `/update_analysis_mode`
- `/update_antenna_sensitivity`
- `/get_antenna_settings`
- `/list_wigle_files`
- `/start_broadcast`
- `/stop_broadcast`
- `/add_to_whitelist`
- `/remove_from_whitelist`
- `/add_to_blacklist`
- `/remove_from_blacklist`

### 5. New Features
- WebSocket support for real-time updates
- File upload capability
- Health check endpoint (`/health`)
- Enhanced error handling and logging
- Systemd service integration

## Migration Steps

### 1. Stop Python Service
```bash
# If running as standalone
pkill -f "WigleToTak2.py"

# If running via orchestration script
/home/pi/stinky/gps_kismet_wigle.sh stop
```

### 2. Install Node.js Service
```bash
cd /home/pi/projects/stinkster_christian/stinkster/src/nodejs/wigle-to-tak
sudo ./install-service.sh
```

### 3. Update Orchestration Script
Use the new Node.js-aware orchestration script:
```bash
# Instead of:
/home/pi/stinky/gps_kismet_wigle.sh

# Use:
/home/pi/stinky/gps_kismet_wigle_nodejs.sh
```

### 4. Start Node.js Service
```bash
# As systemd service
sudo systemctl start wigle-to-tak-nodejs

# Or manually
./start-wigle-to-tak.sh /home/pi/kismet_ops 6969 8000
```

## Configuration Files

### Python Version
- Location: `/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/`
- Config: Command line arguments only
- State: In-memory only

### Node.js Version
- Location: `/home/pi/projects/stinkster_christian/stinkster/src/nodejs/wigle-to-tak/`
- Config: Command line arguments + systemd service file
- State: In-memory with WebSocket broadcasting
- Logs: `/home/pi/tmp/wigle-to-tak-nodejs.log`

## Frontend Compatibility

The HTML interface remains largely the same with these enhancements:
- WebSocket connection for real-time updates
- Enhanced status dashboard
- Improved error handling
- File upload support

## Rollback Procedure

If you need to rollback to the Python version:

1. Stop Node.js service:
   ```bash
   sudo systemctl stop wigle-to-tak-nodejs
   ./stop-wigle-to-tak.sh
   ```

2. Use the original orchestration script:
   ```bash
   /home/pi/stinky/gps_kismet_wigle.sh
   ```

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Check if Python version is still running
   - Use different port with `--flask-port`

2. **CSV files not detected**
   - Verify directory permissions
   - Check file extension is `.wiglecsv`

3. **TAK messages not sent**
   - Check UDP port availability
   - Verify network configuration
   - Check logs at `/home/pi/tmp/wigle-to-tak-nodejs.log`

### Debug Mode
Enable debug logging:
```bash
NODE_ENV=development node server.js --directory /path/to/csvs
```

## Benefits of Migration

1. **Better Performance**: Non-blocking I/O handles large files efficiently
2. **Real-time Updates**: WebSocket provides instant status updates
3. **Modern Stack**: Easier to maintain and extend
4. **Better Integration**: Works seamlessly with other Node.js services
5. **Enhanced Monitoring**: Structured logging and health checks
# Kismet Operations Center - Process Management Guide

## Overview

This document describes the process management approach for the Kismet Operations Center Node.js application. Since PM2 is not available, we've implemented a robust alternative solution using shell scripts and optional systemd integration.

## Quick Start

### Restart the Service
```bash
# Quick restart (works immediately)
./restart-service.sh

# Or use the management script
./manage-service.sh restart
```

### Check Status
```bash
./manage-service.sh status
```

### View Logs
```bash
./manage-service.sh logs
```

## Process Management Components

### 1. Restart Script (`restart-service.sh`)
Simple, direct process management for quick operations.

```bash
# Commands available:
./restart-service.sh start    # Start the service
./restart-service.sh stop     # Stop the service
./restart-service.sh restart  # Restart the service (default)
./restart-service.sh status   # Check service status
```

**Features:**
- Graceful shutdown with SIGTERM
- PID file management
- Automatic log rotation
- Process status checking
- Colored output for clarity

### 2. Process Monitor (`process-monitor.sh`)
Provides automatic restart capability similar to PM2.

```bash
# Start the monitor (runs in background)
./manage-service.sh monitor

# Stop the monitor
./manage-service.sh monitor-stop
```

**Features:**
- Checks service health every 30 seconds
- Automatically restarts if crashed
- Logs all monitoring activities
- Runs as a background daemon

### 3. Management Script (`manage-service.sh`)
Comprehensive management interface for all operations.

```bash
# Main commands:
./manage-service.sh start       # Start service
./manage-service.sh stop        # Stop service
./manage-service.sh restart     # Restart service
./manage-service.sh status      # Check status
./manage-service.sh logs        # View logs (tail -f)
./manage-service.sh monitor     # Enable auto-restart

# Systemd integration:
./manage-service.sh install-systemd    # Install as system service
./manage-service.sh uninstall-systemd  # Remove system service
```

### 4. Systemd Service (Optional)
For production deployments, systemd provides the most robust process management.

```bash
# Install systemd service
sudo ./manage-service.sh install-systemd

# Systemd commands (after installation)
sudo systemctl start kismet-operations-center
sudo systemctl stop kismet-operations-center
sudo systemctl restart kismet-operations-center
sudo systemctl status kismet-operations-center
sudo systemctl enable kismet-operations-center  # Auto-start on boot
```

**Systemd Benefits:**
- Automatic restart on failure
- System boot integration
- Resource limits and security
- Centralized logging via journald
- Process isolation

## File Locations

### PID Files
- Service PID: `/home/pi/tmp/kismet-operations-center.pid`
- Monitor PID: `/home/pi/tmp/kismet-operations-monitor.pid`

### Log Files
- Application logs: `/home/pi/tmp/kismet-operations-center.log`
- Monitor logs: `/home/pi/tmp/kismet-operations-monitor.log`
- Systemd logs: `journalctl -u kismet-operations-center`

### Configuration
- Systemd service: `/home/pi/projects/stinkster_malone/stinkster/systemd/kismet-operations-center.service`
- Scripts: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/`

## Common Operations

### Emergency Restart
If the service is unresponsive:
```bash
# Force kill and restart
pkill -f "node.*server.js"
./restart-service.sh start
```

### Debug Mode
Run the application directly for debugging:
```bash
# Stop any running instance
./restart-service.sh stop

# Run in foreground
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations
node server.js
```

### Check Resource Usage
```bash
# Using the status command
./manage-service.sh status

# Manual check
ps aux | grep -E "node.*server.js" | grep -v grep
```

### Integration with Main Script
The orchestration script (`gps_kismet_wigle.sh`) can use:
```bash
# Start
/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/restart-service.sh start

# Stop
/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/restart-service.sh stop
```

## Troubleshooting

### Service Won't Start
1. Check if port 3000 is already in use:
   ```bash
   sudo lsof -i :3000
   ```

2. Check logs for errors:
   ```bash
   tail -50 /home/pi/tmp/kismet-operations-center.log
   ```

3. Verify Node.js is available:
   ```bash
   which node
   node --version
   ```

### Service Keeps Crashing
1. Check system resources:
   ```bash
   free -h
   df -h
   ```

2. Review application logs for errors
3. Disable monitor and run in debug mode

### Systemd Issues
1. Check service status:
   ```bash
   sudo systemctl status kismet-operations-center
   ```

2. View detailed logs:
   ```bash
   sudo journalctl -u kismet-operations-center -n 100
   ```

3. Reload if configuration changed:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart kismet-operations-center
   ```

## Migration from PM2

If you previously used PM2, here's the equivalent commands:

| PM2 Command | New Command |
|-------------|-------------|
| `pm2 start server.js` | `./restart-service.sh start` |
| `pm2 stop server` | `./restart-service.sh stop` |
| `pm2 restart server` | `./restart-service.sh restart` |
| `pm2 status` | `./manage-service.sh status` |
| `pm2 logs` | `./manage-service.sh logs` |
| `pm2 startup` | `./manage-service.sh install-systemd` |

## Best Practices

1. **For Development**: Use the restart script directly
2. **For Production**: Install as systemd service
3. **For Testing**: Use process monitor for auto-restart
4. **Always**: Check logs after restart to ensure clean startup

## Security Notes

- The service runs as the `pi` user
- Systemd service has security hardening enabled
- Log files are in user-writable directory
- No root privileges required for basic operations
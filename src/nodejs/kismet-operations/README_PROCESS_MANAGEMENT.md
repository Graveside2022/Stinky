# Process Management Quick Reference

## PM2 Alternative Solution

Since PM2 is not available, we've implemented a robust process management solution using shell scripts.

## Quick Commands

### 🚀 Restart Service (Most Common)
```bash
./restart-service.sh
# or
./manage-service.sh restart
```

### 📊 Check Status
```bash
./restart-service.sh status
# or
./manage-service.sh status
```

### 📜 View Logs
```bash
./manage-service.sh logs
# or
tail -f /home/pi/tmp/kismet-operations-center.log
```

### 🔄 Enable Auto-Restart
```bash
./manage-service.sh monitor
```

## Service Information

- **Service**: Spectrum Analyzer (Node.js)
- **Port**: 8002
- **PID File**: `/home/pi/tmp/kismet-operations-center.pid`
- **Log File**: `/home/pi/tmp/kismet-operations-center.log`

## Emergency Commands

If service is unresponsive:
```bash
# Force kill
pkill -f "node.*server.js"

# Start fresh
./restart-service.sh start
```

## Integration with Main Scripts

The orchestration script can use:
```bash
# In gps_kismet_wigle.sh
/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/restart-service.sh start
```

## For Production

Consider installing as systemd service:
```bash
sudo ./manage-service.sh install-systemd
sudo systemctl enable kismet-operations-center
```

Then use standard systemd commands:
```bash
sudo systemctl restart kismet-operations-center
sudo systemctl status kismet-operations-center
```
# Kismet Operations - Quick Reference

## Common Commands

### Service Management
```bash
# Start all services (recommended)
~/stinky/gps_kismet_wigle.sh

# Stop all services
pkill -f gps_kismet_wigle.sh
pkill -f kismet
pkill -f WigleToTak2

# Check service status
pgrep -fa "kismet|wigle|gps"
cat ~/tmp/gps_kismet_wigle.pids

# Using systemd
sudo systemctl status kismet-orchestration
sudo systemctl status kismet-operations-center
```

### GPS Operations
```bash
# Test GPS
sudo gpspipe -w -n 5

# Check GPS device
ls -l /dev/ttyUSB* /dev/ttyACM*

# Restart GPSD
sudo systemctl restart gpsd

# Monitor GPS
watch -n 1 'gpspipe -w -n 1 | grep -E "lat|lon"'
```

### Kismet Management
```bash
# Start Kismet only
~/Scripts/start_kismet.sh

# Check Kismet status
curl -k https://localhost:2501/system/status.json

# View Kismet logs
tail -f ~/tmp/kismet.log
tail -f ~/kismet_ops/kismet_debug.log

# Access Kismet UI
# Browser: http://localhost:2501
```

### WigleToTAK Operations
```bash
# Start WigleToTAK manually
cd ~/WigletoTAK/WigleToTAK/TheStinkToTAK
source venv/bin/activate
python3 WigleToTak2.py

# Check WigleToTAK logs
tail -f ~/tmp/wigletotak.log

# Access WigleToTAK UI
# Browser: http://localhost:8000
```

### Log Monitoring
```bash
# All logs
tail -f ~/tmp/*.log

# Orchestration log
tail -f ~/tmp/gps_kismet_wigle.log

# Follow all service logs
multitail ~/tmp/gps_kismet_wigle.log ~/tmp/kismet.log ~/tmp/wigletotak.log
```

### Network Interface
```bash
# Put WiFi in monitor mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up

# Reset to managed mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up

# Check interface status
iw dev wlan2 info
```

## Troubleshooting Checklist

### GPS Not Working
1. Check device presence:
   ```bash
   ls -l /dev/ttyUSB*
   lsusb | grep -i gps
   ```

2. Test raw GPS data:
   ```bash
   sudo stty -F /dev/ttyUSB0 4800
   timeout 5 cat /dev/ttyUSB0
   ```

3. Verify GPSD:
   ```bash
   sudo systemctl status gpsd
   sudo gpspipe -w -n 1
   ```

4. Check permissions:
   ```bash
   sudo usermod -aG dialout $USER
   # Logout and login again
   ```

### Kismet Not Starting
1. Check for existing processes:
   ```bash
   pkill -f kismet
   sleep 2
   pgrep -f kismet
   ```

2. Verify configuration:
   ```bash
   kismet --check-config
   ```

3. Check port availability:
   ```bash
   sudo netstat -tulpn | grep 2501
   ```

4. Review logs:
   ```bash
   tail -50 ~/tmp/kismet.log
   journalctl -u kismet -n 50
   ```

### WigleToTAK Issues
1. Check Python environment:
   ```bash
   cd ~/WigletoTAK/WigleToTAK/TheStinkToTAK
   source venv/bin/activate
   python --version
   pip list | grep -E "flask|wigle"
   ```

2. Verify data files:
   ```bash
   ls -la ~/kismet_ops/*.wiglecsv
   ```

3. Test Flask app:
   ```bash
   python3 -m flask run --port 8001
   ```

### Service Coordination Problems
1. Check orchestration script:
   ```bash
   ps aux | grep gps_kismet_wigle
   cat ~/tmp/gps_kismet_wigle.pids
   ```

2. Verify PID files:
   ```bash
   ls -la ~/tmp/*.pid
   for pid in $(cat ~/tmp/gps_kismet_wigle.pids); do
     ps -p $pid -o comm=
   done
   ```

3. Debug mode:
   ```bash
   DEBUG=1 ~/stinky/gps_kismet_wigle.sh
   ```

## Key File Locations

### Configuration Files
- `/etc/kismet/kismet.conf` - Main Kismet configuration
- `/etc/default/gpsd` - GPSD configuration
- `~/kismet_ops/nodejs/config.json` - Node.js dashboard config
- `~/WigletoTAK/WigleToTAK/TheStinkToTAK/config.json` - WigleToTAK config

### Log Files
- `~/tmp/gps_kismet_wigle.log` - Orchestration log
- `~/tmp/kismet.log` - Kismet output
- `~/tmp/wigletotak.log` - WigleToTAK output
- `~/kismet_ops/kismet_debug.log` - Kismet debug log

### PID Files
- `~/tmp/gps_kismet_wigle.pids` - All service PIDs
- `~/tmp/kismet.pid` - Kismet process ID
- `~/tmp/wigletotak.pid` - WigleToTAK process ID

### Data Files
- `~/kismet_ops/*.kismet` - Kismet capture files
- `~/kismet_ops/*.wiglecsv` - WiFi scan results
- `~/kismet_ops/*.kml` - KML output files

### Scripts
- `~/stinky/gps_kismet_wigle.sh` - Main orchestration
- `~/Scripts/start_kismet.sh` - Kismet startup
- `~/stinky/smart_restart.sh` - Service restart utility

## Quick Fixes

### Reset Everything
```bash
# Stop all
pkill -f "kismet|wigle|gps_kismet"
sudo systemctl stop gpsd

# Clean up
rm -f ~/tmp/*.pid
rm -f ~/tmp/*.log

# Restart
sudo systemctl start gpsd
sleep 5
~/stinky/gps_kismet_wigle.sh
```

### Emergency Stop
```bash
# Force stop all services
pkill -9 -f "kismet|wigle|gps_kismet"
```

### Check System Health
```bash
# One-liner health check
echo "GPS: $(pgrep gpsd >/dev/null && echo OK || echo FAIL)" && \
echo "Kismet: $(pgrep kismet >/dev/null && echo OK || echo FAIL)" && \
echo "WigleToTAK: $(pgrep -f WigleToTak2 >/dev/null && echo OK || echo FAIL)"
```

## Port Reference
- 2947: GPSD
- 2501: Kismet HTTPS
- 3000: Node.js Operations Center
- 8000: WigleToTAK (configurable)
- 8073: OpenWebRX
- 8092: Spectrum Analyzer
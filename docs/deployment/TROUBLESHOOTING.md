# Stinkster Troubleshooting Guide

Comprehensive troubleshooting guide for common issues and their solutions.

## Quick Diagnostics

Run this command first for a system health check:
```bash
/home/pi/projects/stinkster_christian/stinkster/dev/tools/health-check.sh
```

## Table of Contents

1. [Service Issues](#service-issues)
2. [Hardware Problems](#hardware-problems)
3. [Network Issues](#network-issues)
4. [Performance Problems](#performance-problems)
5. [Data Issues](#data-issues)
6. [Web Interface Issues](#web-interface-issues)
7. [Integration Problems](#integration-problems)
8. [Recovery Procedures](#recovery-procedures)

## Service Issues

### Orchestrator Won't Start

**Symptoms**: Main service fails to start all components

**Diagnosis**:
```bash
# Check orchestrator log
tail -f /home/pi/tmp/gps_kismet_wigle.log

# Check if already running
ps aux | grep gps_kismet_wigle.sh
cat /home/pi/tmp/gps_kismet_wigle.pids
```

**Solutions**:

1. **Kill existing processes**:
```bash
# Stop all services
pkill -f "gps_kismet_wigle.sh"
pkill -f "kismet"
pkill -f "WigleToTak"
pkill -f "spectrum_analyzer"

# Remove PID files
rm -f /home/pi/tmp/*.pid
```

2. **Check permissions**:
```bash
# Fix ownership
sudo chown -R pi:pi /home/pi/tmp
sudo chown -R pi:pi /home/pi/projects/stinkster_christian

# Fix execute permissions
chmod +x /home/pi/projects/stinkster_christian/stinkster/src/orchestration/*.sh
```

3. **Verify dependencies**:
```bash
# Check if required services are installed
which kismet
which gpsd
which python3
which node
```

### Individual Service Failures

#### GPS Service Issues

**Symptoms**: No GPS fix, gpsd not running

**Diagnosis**:
```bash
# Check GPS daemon
sudo systemctl status gpsd

# Test GPS device
sudo stty -F /dev/ttyUSB0 4800
timeout 5 cat /dev/ttyUSB0

# Check GPS output
gpspipe -w -n 5
```

**Solutions**:

1. **Reconfigure GPSD**:
```bash
# Stop service
sudo systemctl stop gpsd

# Reconfigure
sudo dpkg-reconfigure gpsd
# Set device to /dev/ttyUSB0 (or appropriate)
# Enable automatic start

# Restart
sudo systemctl start gpsd
```

2. **Fix device permissions**:
```bash
sudo usermod -a -G dialout $USER
sudo chmod 666 /dev/ttyUSB0
```

#### Kismet Won't Start

**Symptoms**: Kismet fails to launch or crashes immediately

**Diagnosis**:
```bash
# Check Kismet directly
sudo kismet -c wlan2

# Check logs
tail -f /home/pi/tmp/kismet.log
tail -f /home/pi/kismet_ops/kismet_debug.log
```

**Solutions**:

1. **Fix WiFi adapter**:
```bash
# Reset interface
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up

# Set monitor mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up
```

2. **Clear Kismet database**:
```bash
# Backup existing data
mv ~/.kismet ~/kismet_backup_$(date +%Y%m%d)

# Start fresh
kismet --no-database
```

#### Spectrum Analyzer Issues

**Symptoms**: No FFT data, web interface blank

**Diagnosis**:
```bash
# Check if running
pgrep -f spectrum_analyzer
lsof -i :8092

# Test HackRF
hackrf_info
/home/pi/test-hackrf.sh
```

**Solutions**:

1. **Restart service**:
```bash
# Kill existing
pkill -f spectrum_analyzer

# Start manually
cd /home/pi/HackRF
source venv/bin/activate
python3 spectrum_analyzer.py
```

2. **Reset HackRF**:
```bash
# Unplug and replug HackRF
# Or reset USB
sudo usb_reset /dev/bus/usb/001/004  # Use actual bus/device
```

## Hardware Problems

### HackRF Not Detected

**Symptoms**: "No HackRF found" errors

**Diagnosis**:
```bash
# Check USB
lsusb | grep -i hackrf

# Check kernel messages
dmesg | tail -20

# Test with hackrf_info
hackrf_info
```

**Solutions**:

1. **USB power issues**:
```bash
# Use powered USB hub
# Or connect directly to Pi USB 3.0 port

# Disable USB autosuspend
echo -1 | sudo tee /sys/module/usbcore/parameters/autosuspend
```

2. **Driver issues**:
```bash
# Reinstall HackRF tools
sudo apt update
sudo apt install --reinstall hackrf libhackrf-dev

# Build from source if needed
git clone https://github.com/greatscottgadgets/hackrf.git
cd hackrf/host
mkdir build && cd build
cmake ..
make
sudo make install
sudo ldconfig
```

### WiFi Adapter Problems

**Symptoms**: Can't enter monitor mode, no packets captured

**Diagnosis**:
```bash
# Check adapter
iw list | grep -A 10 monitor
iwconfig wlan2

# Test monitor mode
sudo airmon-ng check
sudo airmon-ng start wlan2
```

**Solutions**:

1. **Wrong adapter**:
```bash
# List all adapters
ip link show
iw dev

# Use correct adapter
# Update configuration files
nano /home/pi/projects/stinkster_christian/stinkster/config/config.py
```

2. **Driver issues**:
```bash
# Update firmware
sudo apt update
sudo apt install firmware-misc-nonfree

# For Alfa adapters
sudo apt install realtek-rtl88xxau-dkms
```

### GPS Not Working

**Symptoms**: No GPS fix, no location data

**Diagnosis**:
```bash
# Check device exists
ls -la /dev/ttyUSB* /dev/ttyACM*

# Test raw NMEA
screen /dev/ttyUSB0 4800

# Check gpsd
cgps -s
gpsmon
```

**Solutions**:

1. **Wrong baud rate**:
```bash
# Try different rates
for rate in 4800 9600 19200 38400 57600 115200; do
    echo "Testing $rate"
    sudo stty -F /dev/ttyUSB0 $rate
    timeout 2 cat /dev/ttyUSB0 | grep '^\$'
done
```

2. **No satellite fix**:
- Move outdoors with clear sky view
- Wait 5-10 minutes for cold start
- Check antenna connection

## Network Issues

### Can't Access Web Interfaces

**Symptoms**: Connection refused or timeout

**Diagnosis**:
```bash
# Check services are listening
sudo netstat -tlnp | grep -E "(8092|6969|8073|2501)"

# Test locally
curl -I http://localhost:8092
curl -I http://localhost:6969
```

**Solutions**:

1. **Firewall blocking**:
```bash
# Check firewall
sudo iptables -L -n

# Allow ports
sudo ufw allow 8092/tcp
sudo ufw allow 6969/tcp
sudo ufw allow 8073/tcp
sudo ufw allow 2501/tcp
```

2. **Service binding**:
```bash
# Check service configuration
# Ensure binding to 0.0.0.0 not 127.0.0.1

# Edit service configs to bind to all interfaces
# Example for Node.js services:
# server.listen(port, '0.0.0.0')
```

### WebSocket Connection Failures

**Symptoms**: Real-time data not updating

**Diagnosis**:
```bash
# Check WebSocket endpoints
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:8092/ws/spectrum
```

**Solutions**:

1. **Proxy configuration**:
```nginx
# Add to nginx config
location /ws/ {
    proxy_pass http://localhost:8092;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

2. **Client-side fixes**:
```javascript
// Add reconnection logic
let ws;
function connect() {
    ws = new WebSocket('ws://your-pi:8092/ws/spectrum');
    ws.onclose = () => {
        setTimeout(connect, 1000);
    };
}
```

## Performance Problems

### System Running Slow

**Symptoms**: High CPU usage, laggy interface

**Diagnosis**:
```bash
# Check system resources
htop
iostat -x 1
vmstat 1

# Check temperature
vcgencmd measure_temp

# Check throttling
vcgencmd get_throttled
```

**Solutions**:

1. **Reduce load**:
```bash
# Limit Kismet channel hopping
# Edit kismet config to hop fewer channels

# Reduce spectrum analyzer sample rate
# Lower FFT update rate

# Disable unused services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
```

2. **Improve cooling**:
```bash
# Check current settings
cat /sys/class/thermal/thermal_zone0/temp

# Add cooling
# Install heatsinks
# Add fan with GPIO control

# Increase temperature limit (carefully!)
echo "temp_limit=85" | sudo tee -a /boot/config.txt
```

### Memory Issues

**Symptoms**: Out of memory errors, services crashing

**Diagnosis**:
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check for memory leaks
sudo smem -tk
```

**Solutions**:

1. **Add swap**:
```bash
# Create swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

2. **Optimize services**:
```bash
# Limit Node.js memory
export NODE_OPTIONS="--max-old-space-size=512"

# Configure systemd limits
# Add to service files:
# MemoryMax=512M
# MemoryHigh=384M
```

## Data Issues

### No WiFi Devices Found

**Symptoms**: Kismet running but no devices appear

**Diagnosis**:
```bash
# Check Kismet is capturing
curl http://localhost:2501/devices/all_devices.json

# Check interface is in monitor mode
iwconfig wlan2

# Monitor raw packets
sudo tcpdump -i wlan2 -c 10
```

**Solutions**:

1. **Channel configuration**:
```bash
# Force specific channel
sudo iwconfig wlan2 channel 6

# Or configure Kismet hopping
# Edit /etc/kismet/kismet_site.conf
# source=wlan2:name=wifi2,hop=true,channels="1,6,11"
```

2. **Location issues**:
- Move to area with more WiFi activity
- Check antenna connections
- Increase gain if using external antenna

### Corrupt Data Files

**Symptoms**: Services crash when reading data

**Diagnosis**:
```bash
# Check file integrity
file /home/pi/kismet_ops/*.wiglecsv
tail -n 10 /home/pi/kismet_ops/latest.wiglecsv
```

**Solutions**:

1. **Clear corrupted files**:
```bash
# Backup first
mkdir -p /home/pi/backup/corrupted
mv /home/pi/kismet_ops/*.wiglecsv /home/pi/backup/corrupted/

# Restart services
```

2. **Prevent corruption**:
```bash
# Ensure clean shutdown
# Always use Ctrl+C or stop script

# Add file system check
sudo touch /forcefsck
# Reboot to check filesystem
```

## Web Interface Issues

### Page Not Loading

**Symptoms**: Blank page or 404 errors

**Diagnosis**:
```bash
# Check web server logs
tail -f /var/log/nginx/error.log

# Check static files
ls -la /home/pi/projects/stinkster_christian/stinkster/public/
```

**Solutions**:

1. **Rebuild frontend**:
```bash
cd /home/pi/projects/stinkster_christian/stinkster
npm install
npm run build
```

2. **Fix permissions**:
```bash
sudo chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html
```

### JavaScript Errors

**Symptoms**: Features not working, console errors

**Solutions**:

1. **Clear browser cache**:
- Ctrl+Shift+R (hard refresh)
- Open DevTools → Application → Clear Storage

2. **Check for conflicts**:
```javascript
// Add to page
window.onerror = function(msg, source, lineno, colno, error) {
    console.error('Error:', msg, source, lineno);
    return true;
};
```

## Integration Problems

### TAK Server Connection Failed

**Symptoms**: Can't send data to TAK server

**Diagnosis**:
```bash
# Test network connectivity
ping tak-server.example.com
telnet tak-server.example.com 8087

# Check TAK configuration
cat /home/pi/WigletoTAK/config.json
```

**Solutions**:

1. **Certificate issues**:
```bash
# Verify certificates
openssl x509 -in client.crt -text -noout

# Test SSL connection
openssl s_client -connect tak-server:8089 \
  -cert client.crt -key client.key
```

2. **Format issues**:
```xml
<!-- Verify CoT format -->
<!-- Must include all required fields -->
<event version="2.0" uid="UNIQUE-ID" type="a-f-G-U-C">
    <point lat="0.0" lon="0.0" hae="0" ce="10" le="10"/>
    <detail>
        <contact callsign="Device-Name"/>
    </detail>
</event>
```

### Docker Container Issues

**Symptoms**: OpenWebRX not starting

**Diagnosis**:
```bash
# Check container status
docker ps -a
docker logs openwebrx --tail 50

# Check compose
docker-compose ps
```

**Solutions**:

1. **Rebuild container**:
```bash
# Stop and remove
docker-compose down
docker system prune -a

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

2. **Volume permissions**:
```bash
# Fix ownership
sudo chown -R 1000:1000 ./docker/volumes/

# Reset volumes
docker-compose down -v
docker-compose up -d
```

## Recovery Procedures

### Emergency Recovery Mode

```bash
#!/bin/bash
# Safe mode startup script

# Stop all services
systemctl stop stinkster-orchestrator
pkill -f kismet
pkill -f spectrum_analyzer
docker stop $(docker ps -q)

# Clear temporary files
rm -rf /home/pi/tmp/*
rm -rf /var/run/stinkster/*

# Reset configurations
cp /opt/stinkster/config/defaults/* /etc/stinkster/

# Start minimal services
gpsd /dev/ttyUSB0
python3 /opt/stinkster/src/hackrf/spectrum_analyzer.py --safe-mode

echo "System in safe mode. Check logs and reconfigure."
```

### Factory Reset

```bash
#!/bin/bash
# Complete reset to defaults

read -p "This will delete all data. Continue? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup current data
    tar -czf ~/stinkster_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
        /etc/stinkster /var/lib/stinkster /home/pi/kismet_ops
    
    # Remove all data
    sudo rm -rf /etc/stinkster
    sudo rm -rf /var/lib/stinkster
    rm -rf ~/.kismet
    
    # Reinstall
    cd /opt/stinkster
    ./install.sh --fresh
fi
```

### Diagnostic Data Collection

```bash
#!/bin/bash
# Collect diagnostic information

DIAG_DIR="/tmp/stinkster_diag_$(date +%Y%m%d_%H%M%S)"
mkdir -p $DIAG_DIR

# System info
uname -a > $DIAG_DIR/system.txt
free -h >> $DIAG_DIR/system.txt
df -h >> $DIAG_DIR/system.txt
lsusb >> $DIAG_DIR/system.txt

# Service status
systemctl status stinkster-* > $DIAG_DIR/services.txt
docker ps -a >> $DIAG_DIR/services.txt

# Recent logs
journalctl -u stinkster-orchestrator -n 1000 > $DIAG_DIR/orchestrator.log
tail -n 1000 /var/log/stinkster/*.log > $DIAG_DIR/app_logs.txt

# Configuration
cp -r /etc/stinkster $DIAG_DIR/config

# Create archive
tar -czf ~/stinkster_diagnostic.tar.gz -C /tmp $(basename $DIAG_DIR)
echo "Diagnostic data saved to ~/stinkster_diagnostic.tar.gz"
```

## Getting Help

If these solutions don't resolve your issue:

1. Collect diagnostic data (see above)
2. Check [GitHub Issues](https://github.com/yourusername/stinkster/issues)
3. Join [Discord/Forum](https://community.stinkster.io)
4. Include:
   - Exact error messages
   - Steps to reproduce
   - Hardware configuration
   - Software versions

Remember: Most issues are configuration-related. Double-check settings before assuming hardware failure!
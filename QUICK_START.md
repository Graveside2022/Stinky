# Stinkster Quick Start Guide

**One-command installation and setup for the complete Raspberry Pi SDR & WiFi Intelligence Platform**

---

## ⚡ Quick Installation

### Single Command Installation

```bash
git clone https://github.com/your-username/stinkster.git && cd stinkster && sudo ./install.sh
```

That's it! The installer will handle everything automatically:
- System dependencies
- Hardware detection and optimization  
- Service configuration
- Docker setup with HackRF optimization
- Virtual environments
- Startup scripts

**Installation time:** 10-15 minutes (depending on internet speed)

---

## 📋 Hardware Requirements

### Minimum Requirements
- **Raspberry Pi 3B+** (1GB RAM) - Limited performance
- **32GB+ MicroSD card** (Class 10 recommended)
- **Internet connection** during installation

### Recommended Configuration
- **Raspberry Pi 4B** (4GB+ RAM) - Optimal performance
- **64GB+ MicroSD card** (for data storage)
- **USB WiFi adapter** (monitor mode capable)
- **HackRF One SDR** device
- **GPS receiver** (USB or UART)

### Compatible Hardware

#### SDR Devices
- **HackRF One** (primary support)
  - Frequency: 1MHz - 6GHz
  - USB ID: `1d50:6089`
  - Native driver optimization included

#### WiFi Adapters
- Any adapter supporting **monitor mode**
- Popular models: Alfa AWUS036NHA, TP-Link AC600T2U
- Built-in WiFi can be used but external is recommended

#### GPS Receivers
- Any **NMEA 0183** compatible GPS
- USB GPS modules (most common)
- UART GPS (GPIO pins 14/15)
- MAVLink-compatible devices

---

## 🚀 First Run Instructions

### 1. Check Installation Status

After installation completes, verify everything is ready:

```bash
# Check service status
systemctl status stinkster

# Verify hardware detection
lsusb                    # Should show HackRF and GPS if connected
hackrf_info             # Test HackRF communication
gpspipe -w -n 1         # Test GPS data
```

### 2. Configure Your Environment

Edit the main configuration file:

```bash
nano .env
```

**Essential settings to update:**
```bash
# Change default password
OPENWEBRX_ADMIN_PASSWORD=YourSecurePassword

# Set your WiFi interface (check with: ip link show)
WIFI_INTERFACE=wlan2

# Configure GPS device (check with: ls -l /dev/ttyUSB*)
GPS_DEVICE=/dev/ttyUSB0

# Set your location and callsign
OPENWEBRX_LOCATION=Your_Location
TAK_CALLSIGN=YOUR_CALL
```

### 3. Start the System

```bash
# Start all services
sudo systemctl start stinkster

# Or start manually for testing
./src/orchestration/gps_kismet_wigle.sh
```

### 4. Access Web Interfaces

Open these URLs in your browser (replace `192.168.1.100` with your Pi's IP):

- **OpenWebRX (SDR):** http://192.168.1.100:8073
  - Login: `admin` / `YourPassword`
  - HackRF-optimized with multiple band profiles

- **Spectrum Analyzer:** http://192.168.1.100:8092
  - Real-time FFT analysis
  - WebSocket integration

- **Kismet (WiFi):** http://192.168.1.100:2501
  - WiFi scanning dashboard
  - Device tracking

- **WigleToTAK:** http://192.168.1.100:6969
  - WiFi to TAK conversion
  - Tactical mapping integration

---

## 🔧 Hardware Setup Guide

### HackRF One Setup

1. **Connect HackRF** to Pi via USB 3.0 port
2. **Verify detection:**
   ```bash
   hackrf_info
   # Should show: Found HackRF, Serial number: 0x...
   ```
3. **Attach antenna** (appropriate for your target frequencies)
4. **Test in OpenWebRX** - HackRF should appear automatically

### WiFi Adapter Setup

1. **Connect USB WiFi adapter**
2. **Check interface name:**
   ```bash
   ip link show | grep wlan
   # Note interface name (usually wlan1 or wlan2)
   ```
3. **Test monitor mode:**
   ```bash
   sudo ip link set wlan2 down
   sudo iw dev wlan2 set monitor none
   sudo ip link set wlan2 up
   iwconfig wlan2  # Should show "Mode:Monitor"
   ```

### GPS Setup

1. **Connect GPS device** (USB or UART)
2. **Find device path:**
   ```bash
   ls -l /dev/ttyUSB* /dev/ttyACM*
   # Usually /dev/ttyUSB0 for USB GPS
   ```
3. **Test GPS data:**
   ```bash
   sudo stty -F /dev/ttyUSB0 4800
   timeout 10 cat /dev/ttyUSB0 | grep GPGGA
   # Should show NMEA sentences
   ```

---

## 🏃‍♂️ Common First-Time Operations

### Quick System Check

Run this comprehensive check:

```bash
# System status
./dev/tools/health-check.sh

# Hardware verification
echo "=== Hardware Check ==="
echo "HackRF:" && hackrf_info | head -3
echo "GPS:" && timeout 3 gpspipe -w -n 1 | head -1
echo "WiFi:" && iw dev | grep Interface
echo "Docker:" && docker ps | grep openwebrx
```

### Start Individual Services

If you need to start services separately:

```bash
# GPS services only
sudo systemctl start gpsd
source /home/pi/gpsmav/GPSmav/venv/bin/activate && ./mavgps.py

# WiFi scanning only  
./src/scripts/start_kismet.sh

# SDR services only
cd docker && docker-compose up -d

# Web dashboard only
cd src/wigletotak && source venv/bin/activate && python WigleToTak2.py
```

### View Logs

```bash
# All services
tail -f /home/pi/tmp/gps_kismet_wigle.log

# Individual services
tail -f /home/pi/tmp/kismet.log
tail -f /home/pi/tmp/wigletotak.log
docker logs -f openwebrx
```

---

## 🚨 Troubleshooting

### Installation Issues

**Internet connection problems:**
```bash
# Test connectivity
curl -I http://www.google.com
# If failed, check network and DNS
```

**Permission errors:**
```bash
# Ensure pi user has sudo access
sudo whoami  # Should return 'root'

# Add to groups if needed
sudo usermod -aG kismet,docker pi
# Log out and back in
```

**Disk space issues:**
```bash
df -h  # Check available space
# Need at least 2GB free for installation
```

### Hardware Detection Issues

**HackRF not detected:**
```bash
# Check USB connection
lsusb | grep 1d50:6089

# Install/reinstall HackRF tools
sudo apt install --reinstall hackrf libhackrf0

# Check permissions
ls -l /dev/bus/usb/*/*
```

**WiFi adapter not working:**
```bash
# Check if adapter supports monitor mode
iw list | grep -A 10 "Supported interface modes"
# Should list "monitor"

# Try different interface names
ip link show | grep wlan
```

**GPS not responding:**
```bash
# Check device permissions
ls -l /dev/ttyUSB* /dev/ttyACM*

# Try different baud rates
sudo stty -F /dev/ttyUSB0 9600
sudo stty -F /dev/ttyUSB0 38400
```

### Service Issues

**Services won't start:**
```bash
# Check systemd status
systemctl status stinkster
journalctl -u stinkster -f

# Check individual processes
pgrep -f kismet
pgrep -f gpsd
docker ps | grep openwebrx
```

**OpenWebRX HackRF issues:**
```bash
# Verify HackRF in container
docker exec openwebrx hackrf_info

# Check container logs
docker logs openwebrx

# Rebuild optimized container
./rebuild-openwebrx-docker.sh
```

**No web interface access:**
```bash
# Check firewall
sudo ufw status

# Verify ports are listening
netstat -tlnp | grep :8073
netstat -tlnp | grep :2501

# Check Pi's IP address
ip addr show | grep inet
```

### Performance Issues

**High CPU usage:**
```bash
# Monitor resource usage
htop
docker stats

# Reduce OpenWebRX sample rates
# Edit docker/config/sdrs.json
# Lower "samp_rate" from 8000000 to 2400000
```

**SD card wear:**
```bash
# Move logs to tmpfs
sudo systemctl edit stinkster
# Add: Environment=LOG_DIR=/tmp/stinkster
```

---

## ✅ Verification Steps

### Complete System Test

Run this checklist after installation:

```bash
echo "=== Stinkster System Verification ==="

# 1. Hardware detection
echo "1. Hardware Detection:"
echo "   HackRF: $(hackrf_info >/dev/null 2>&1 && echo "✓ Detected" || echo "✗ Not found")"
echo "   GPS: $(timeout 3 gpspipe -w -n 1 >/dev/null 2>&1 && echo "✓ Active" || echo "✗ No data")"
echo "   WiFi: $(iw dev | grep -q Interface && echo "✓ Available" || echo "✗ No interfaces")"

# 2. Service status
echo "2. Service Status:"
echo "   GPSD: $(systemctl is-active gpsd)"
echo "   Kismet: $(pgrep -f kismet >/dev/null && echo "✓ Running" || echo "✗ Stopped")"
echo "   Docker: $(docker ps -q | grep -q . && echo "✓ Running" || echo "✗ No containers")"

# 3. Web interfaces
echo "3. Web Interface Accessibility:"
for port in 8073 2501 6969 8092; do
    echo "   Port $port: $(curl -s --connect-timeout 3 http://localhost:$port >/dev/null && echo "✓ Accessible" || echo "✗ Not responding")"
done

# 4. Python environments
echo "4. Python Environments:"
echo "   GPSmav: $(source /home/pi/gpsmav/GPSmav/venv/bin/activate 2>/dev/null && python -c 'import pymavlink' 2>/dev/null && echo "✓ Ready" || echo "✗ Issue")"
echo "   WigleToTAK: $(source /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/venv/bin/activate 2>/dev/null && python -c 'import flask' 2>/dev/null && echo "✓ Ready" || echo "✗ Issue")"

echo "=== Verification Complete ==="
```

### Test Individual Components

**HackRF Test:**
```bash
# Basic detection
hackrf_info

# Spectrum sweep test
hackrf_sweep -f 88:108 -w 100000 -l 32 -g 16 -1 | head -5
```

**GPS Test:**
```bash
# NMEA data test
timeout 10 gpspipe -w | grep -E "GPGGA|GPRMC" | head -3

# Position data test
gpspipe -w -n 5 | grep GPGGA
```

**WiFi Test:**
```bash
# Monitor mode test
sudo iwconfig wlan2 mode monitor
iwconfig wlan2

# Kismet test scan
timeout 30 kismet -c wlan2 --override wardrive | head -10
```

---

## 📚 Next Steps

### Configuration Optimization

1. **OpenWebRX Band Setup**
   - Edit `docker/config/sdrs.json` for your local frequencies
   - Add custom band profiles for your area
   - Optimize gain settings for your antenna

2. **Kismet Fine-tuning**
   - Configure `kismet_site.conf` for your WiFi adapter
   - Set up GPS integration for location tracking
   - Configure data logging preferences

3. **TAK Integration**
   - Set up TAK server connection in `wigletotak-config.json`
   - Configure callsign and unit information
   - Test TAK data flow

### Advanced Features

- **Development Mode:** `./dev.sh` for hot-reloading and debugging
- **Custom Scripts:** Add your own tools in `src/scripts/`
- **Integration Testing:** `./dev/test/run-all-tests.sh`
- **Performance Monitoring:** Built-in health checks and logging
- **Remote Access:** Configure secure remote access to web interfaces

### System Maintenance

- **Updates:** Pull latest code and run `./install.sh` to update
- **Backups:** Configuration and data backup scripts included  
- **Monitoring:** Check logs regularly for optimal performance
- **Security:** Change default passwords and secure web interfaces

---

## 🆘 Support & Resources

### Documentation
- **Full Documentation:** [README.md](README.md)
- **Architecture Guide:** [docs/architecture/](docs/architecture/)
- **API Documentation:** [docs/api/](docs/api/)
- **Development Guide:** [dev/DEVELOPMENT_GUIDE.md](dev/DEVELOPMENT_GUIDE.md)

### Command Reference
- **Health Check:** `./dev/tools/health-check.sh`
- **Service Management:** `systemctl status stinkster`
- **Log Monitoring:** `./dev/tools/logview.sh`
- **Component Testing:** `./dev/test/run-all-tests.sh`

### Getting Help
- **GitHub Issues:** Report bugs and feature requests
- **System Logs:** Check `/home/pi/tmp/` for detailed logs
- **Hardware Compatibility:** See [HARDWARE_COMPATIBILITY.md](docs/HARDWARE_COMPATIBILITY.md)
- **Legal Compliance:** Review [REGULATORY_COMPLIANCE.md](REGULATORY_COMPLIANCE.md)

---

**⚠️ Legal Notice:** This software involves RF monitoring capabilities. Users are responsible for compliance with local laws regarding radio frequency monitoring and wireless network scanning. Always operate within legal frequency allocations and obtain proper authorization for network monitoring activities.

**🔒 Security Notice:** Change all default passwords before deploying in production environments. Restrict network access to web interfaces and use strong authentication for all services.
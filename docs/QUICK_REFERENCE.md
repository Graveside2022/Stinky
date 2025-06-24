# Stinkster Quick Reference Card

## 🚀 Essential Commands

### Service Control
```bash
# Start all services
./src/orchestration/gps_kismet_wigle.sh

# Stop all services
pkill -f "gps_kismet_wigle.sh"

# Check status
./dev/tools/health-check.sh

# View logs
tail -f /home/pi/tmp/gps_kismet_wigle.log
```

### Individual Services
```bash
# GPS
sudo systemctl start gpsd
gpspipe -w -n 1  # Test GPS

# Kismet
/home/pi/Scripts/start_kismet.sh
pkill -f "kismet"  # Stop

# HackRF
cd /home/pi/HackRF && source venv/bin/activate
python3 spectrum_analyzer.py

# WigleToTAK
cd /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK
source venv/bin/activate && python3 WigleToTak2.py
```

## 🌐 Web Interfaces

| Service | URL | Default Login |
|---------|-----|---------------|
| Spectrum Analyzer | http://pi:8092 | None |
| WigleToTAK | http://pi:6969 | None |
| OpenWebRX | http://pi:8073 | admin/hackrf |
| Kismet | http://pi:2501 | Check ~/.kismet |

## 🔧 Common Operations

### WiFi Monitor Mode
```bash
# Enable monitor mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up

# Return to managed mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up
```

### Hardware Check
```bash
# List USB devices
lsusb

# Check HackRF
hackrf_info

# Check GPS
cat /dev/ttyUSB0

# Check WiFi adapters
iw dev
```

### Process Management
```bash
# View running processes
ps aux | grep -E "(kismet|spectrum|wigle|gpsd)"

# Check PIDs
cat /home/pi/tmp/gps_kismet_wigle.pids

# Kill stuck process
kill -9 $(pgrep -f "process_name")
```

## 📡 Frequency Reference

| Band | Frequency | Common Use |
|------|-----------|------------|
| FM Broadcast | 88-108 MHz | Radio stations |
| 2m Amateur | 144-148 MHz | Ham radio |
| 70cm Amateur | 420-450 MHz | Ham radio |
| ISM | 433.92 MHz | IoT devices |
| ISM | 868 MHz | EU IoT |
| ISM | 915 MHz | US IoT |
| WiFi | 2.4 GHz | 802.11b/g/n |
| WiFi | 5 GHz | 802.11a/n/ac |

## 🛠️ Troubleshooting

### Quick Fixes
```bash
# Service won't start
rm -f /home/pi/tmp/*.pid
pkill -f "service_name"

# No GPS fix
sudo systemctl restart gpsd
# Move outdoors for better signal

# HackRF not found
# Unplug and replug USB
# Or: sudo usb_reset /dev/bus/usb/001/XXX

# WiFi adapter issues
sudo airmon-ng check kill
sudo airmon-ng start wlan2

# Low memory
sudo sync && sudo sysctl -w vm.drop_caches=3
```

### Check Logs
```bash
# Main log
tail -f /home/pi/tmp/gps_kismet_wigle.log

# Service-specific
tail -f /home/pi/tmp/kismet.log
tail -f /home/pi/tmp/wigletotak.log
tail -f /home/pi/kismet_ops/kismet_debug.log

# System logs
journalctl -u stinkster-orchestrator -n 50
dmesg | tail -20
```

## 🔐 Security

### API Keys
```bash
# Generate new API key
openssl rand -hex 32

# Set in environment
export STINKSTER_API_KEY="your-key-here"
```

### Firewall
```bash
# Check firewall status
sudo ufw status

# Allow service port
sudo ufw allow 8092/tcp
```

## 📊 Data Locations

| Data Type | Location |
|-----------|----------|
| Kismet captures | /home/pi/kismet_ops/*.wiglecsv |
| Logs | /home/pi/tmp/*.log |
| Configs | /home/pi/stinkster/config/ |
| HackRF data | /home/pi/HackRF/ |
| Docker volumes | /var/lib/docker/volumes/ |

## ⚡ Performance

### Optimize for Field Use
```bash
# Reduce CPU frequency
sudo cpufreq-set -g powersave

# Disable unused services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon

# Monitor temperature
vcgencmd measure_temp
```

### Monitor Resources
```bash
# CPU and memory
htop

# Disk usage
df -h

# Network traffic
iftop

# USB bandwidth
usbtop
```

## 🆘 Emergency

### Complete Reset
```bash
# Stop everything
sudo killall -9 kismet spectrum_analyzer python3 node

# Clear temp files
rm -rf /home/pi/tmp/*

# Restart from scratch
cd /home/pi/projects/stinkster_christian/stinkster
./src/orchestration/gps_kismet_wigle.sh
```

### Backup Current State
```bash
# Quick backup
tar -czf ~/stinkster_backup_$(date +%Y%m%d).tar.gz \
    /home/pi/kismet_ops \
    /home/pi/stinkster/config \
    /home/pi/tmp/*.log
```

## 📞 Support

- Logs: First check `/home/pi/tmp/gps_kismet_wigle.log`
- Docs: `/home/pi/projects/stinkster_christian/stinkster/docs/`
- Issues: https://github.com/yourusername/stinkster/issues
- Discord: https://discord.gg/stinkster

---
**Pro Tip**: Keep this reference handy on your phone for field operations!
# Scripts Component

This directory contains utility scripts for starting and managing individual services within the Stinkster system. These scripts provide isolated startup functionality for Kismet WiFi scanning and MediaMTX streaming services.

## Overview

The scripts component provides:

- **Service Isolation**: Individual startup scripts for Kismet and MediaMTX
- **Network Interface Management**: Automated WiFi adapter configuration for monitor mode
- **Process Management**: PID tracking, cleanup routines, and resource monitoring
- **Error Handling**: Comprehensive logging and troubleshooting capabilities
- **Configuration Management**: Automated configuration file generation

## Scripts Documentation

### start_kismet.sh

**Purpose**: Configures WiFi interface for monitor mode and starts Kismet with appropriate settings for WiFi scanning and GPS integration.

**Key Features**:
- Automatic WiFi interface configuration (monitor mode)
- GPS integration via GPSD
- Web interface configuration with auto-login
- Process management with PID tracking
- Comprehensive logging and error handling
- Resource monitoring and crash detection

**Configuration Requirements**:
```bash
# Environment Variables
KISMET_DATA_DIR="/home/pi/projects/stinkster/data/kismet"  # Data storage directory

# Network Interface
# Requires wlan2 interface (USB WiFi adapter recommended)
# Interface will be automatically configured for monitor mode

# GPS Integration
# Expects GPSD running on localhost:2947
# GPS configuration is optional - script continues without GPS
```

**Network Interface Requirements**:
- USB WiFi adapter capable of monitor mode (recommended: wlan2)
- Interface must support monitor mode and channel hopping
- airmon-ng tools preferred but manual configuration fallback available
- Script automatically handles interface mode switching

**Usage Examples**:
```bash
# Basic startup with default data directory
./start_kismet.sh

# With custom data directory
KISMET_DATA_DIR="/custom/path" ./start_kismet.sh

# Check if running
ps aux | grep kismet

# View logs
tail -f /home/pi/projects/stinkster/data/kismet/kismet_debug.log
```

**Generated Configuration**:
The script automatically creates `~/.kismet/kismet_site.conf` with:
```bash
httpd_username=admin
httpd_password=admin
httpd_autologin=true
httpd_bind_address=0.0.0.0
source=wlan2:name=wlan2,type=linuxwifi,hop=true,channel_hop_speed=5/sec
gps=gpsd:host=localhost,port=2947,reconnect=true
```

**Process Management**:
- Creates PID file at `$KISMET_DATA_DIR/kismet.pid`
- Logs to `$KISMET_DATA_DIR/kismet_debug.log`
- Automatic cleanup on script exit
- Interface reset to managed mode on cleanup

### start_mediamtx.sh

**Purpose**: Starts MediaMTX streaming server for real-time video/audio streaming capabilities.

**Key Features**:
- Directory validation and executable checks
- Simple startup with working directory management
- Clean exit handling

**Configuration Requirements**:
```bash
# MediaMTX Installation Directory
MEDIAMTX_DIR="/home/pi/mediamtx"

# Executable Path
MEDIAMTX_EXECUTABLE="./mediamtx"

# Configuration File
# MediaMTX looks for mediamtx.yml in its working directory
```

**Dependencies**:
- MediaMTX binary installed in `/home/pi/mediamtx/`
- MediaMTX configuration file (`mediamtx.yml`) in the MediaMTX directory
- Appropriate permissions for executable

**Usage Examples**:
```bash
# Start MediaMTX
./start_mediamtx.sh

# Check if running
ps aux | grep mediamtx

# Custom MediaMTX directory
# Edit MEDIAMTX_DIR variable in script
```

**MediaMTX Configuration**:
MediaMTX requires a `mediamtx.yml` configuration file in its directory. Common settings:
```yaml
# Example basic configuration
api: yes
apiAddress: 0.0.0.0:9997
webrtcAddress: :8889
hlsAddress: :8888

paths:
  all:
    source: publisher
```

## Integration with Main System

### Kismet Integration

**GPS Integration**:
- Connects to GPSD service on port 2947
- Provides location data for WiFi device tracking
- Gracefully continues without GPS if service unavailable

**Data Output**:
- Creates `.wiglecsv` files for WigleToTAK integration
- Generates `.pcapng` files for detailed packet analysis
- Provides REST API on port 2502 for real-time data access

**Web Interface**:
- Available at `http://localhost:2501` (or Pi IP address)
- Auto-login enabled with admin/admin credentials
- Real-time WiFi device tracking and statistics

### MediaMTX Integration

**Streaming Capabilities**:
- WebRTC streaming support
- HLS (HTTP Live Streaming) support
- RTMP/RTSP protocol support
- REST API for stream management

**Use Cases in Stinkster**:
- Real-time video feeds from connected cameras
- Audio streaming from SDR operations
- Remote monitoring capabilities

## Network Interface Requirements

### WiFi Adapter Specifications

**Recommended Hardware**:
- USB WiFi adapter with monitor mode support
- Chipsets: Atheros, Ralink, Realtek (with proper drivers)
- Interface designation: wlan2 (script default)

**Monitor Mode Capabilities**:
- Channel hopping support
- Packet injection capability (optional)
- 2.4GHz and 5GHz band support

**Interface Configuration**:
```bash
# Manual monitor mode setup (if script fails)
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up

# Verify monitor mode
iw dev wlan2 info | grep type
```

## Troubleshooting

### Kismet Issues

**Interface Not Found**:
```bash
# Check available interfaces
ip link show

# Verify WiFi adapter
lsusb | grep -i wireless

# Check driver support
dmesg | grep wlan2
```

**Monitor Mode Failures**:
```bash
# Kill interfering processes
sudo airmon-ng check kill

# Manual interface reset
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up
```

**GPS Connection Issues**:
```bash
# Check GPSD status
sudo systemctl status gpsd

# Test GPS data
gpspipe -w -n 1

# Start GPSD if needed
sudo systemctl start gpsd
```

**Permission Issues**:
```bash
# Add user to required groups
sudo usermod -a -G netdev pi
sudo usermod -a -G dialout pi

# Restart session or reboot
```

### MediaMTX Issues

**Executable Not Found**:
```bash
# Verify MediaMTX installation
ls -la /home/pi/mediamtx/mediamtx

# Download MediaMTX if missing
wget https://github.com/aler9/mediamtx/releases/latest/download/mediamtx_linux_arm64v8.tar.gz
tar -xzf mediamtx_linux_arm64v8.tar.gz -C /home/pi/mediamtx/
```

**Configuration Issues**:
```bash
# Check configuration file
cat /home/pi/mediamtx/mediamtx.yml

# Validate YAML syntax
python3 -c "import yaml; yaml.safe_load(open('/home/pi/mediamtx/mediamtx.yml'))"
```

**Port Conflicts**:
```bash
# Check port usage
sudo netstat -tulpn | grep :8888
sudo netstat -tulpn | grep :9997

# Kill conflicting processes
sudo fuser -k 8888/tcp
sudo fuser -k 9997/tcp
```

## Dependencies and Setup

### System Dependencies

**Required Packages**:
```bash
# Kismet and WiFi tools
sudo apt update
sudo apt install kismet aircrack-ng wireless-tools iw

# GPS support
sudo apt install gpsd gpsd-clients

# Network utilities
sudo apt install net-tools
```

**Python Dependencies**:
```bash
# Kismet typically doesn't require Python dependencies
# But if using Python scripts for processing:
pip3 install requests json datetime
```

### MediaMTX Dependencies

**System Requirements**:
```bash
# Download and install MediaMTX
cd /home/pi
wget https://github.com/aler9/mediamtx/releases/latest/download/mediamtx_linux_arm64v8.tar.gz
mkdir -p mediamtx
tar -xzf mediamtx_linux_arm64v8.tar.gz -C mediamtx/
chmod +x mediamtx/mediamtx
```

**Configuration Setup**:
```bash
# Create basic configuration
cat > /home/pi/mediamtx/mediamtx.yml << EOF
api: yes
apiAddress: 0.0.0.0:9997
webrtcAddress: :8889
hlsAddress: :8888
EOF
```

### Permissions Setup

**Script Permissions**:
```bash
# Ensure scripts are executable
chmod +x start_kismet.sh
chmod +x start_mediamtx.sh

# Set proper ownership
sudo chown pi:pi *.sh
```

**Sudo Configuration** (optional for automated startup):
```bash
# Add to /etc/sudoers.d/kismet-setup
pi ALL=(ALL) NOPASSWD: /usr/bin/ip, /usr/bin/iw, /usr/bin/airmon-ng, /usr/bin/systemctl
```

## Logging and Monitoring

### Log Files

**Kismet Logs**:
- `$KISMET_DATA_DIR/kismet_debug.log` - Startup and operation log
- `$KISMET_DATA_DIR/kismet.pid` - Process ID file
- `$KISMET_DATA_DIR/*.wiglecsv` - WiFi scan data
- `$KISMET_DATA_DIR/*.pcapng` - Packet captures

**MediaMTX Logs**:
- stdout/stderr - Displayed in terminal
- System journal: `journalctl -u mediamtx` (if systemd service)

### Monitoring Commands

**Process Monitoring**:
```bash
# Check if services are running
ps aux | grep kismet
ps aux | grep mediamtx

# Monitor resource usage
top -p $(pgrep kismet)
htop
```

**Network Monitoring**:
```bash
# Check interface status
iwconfig wlan2

# Monitor network activity
sudo tcpdump -i wlan2 -c 10

# Check service ports
sudo netstat -tulpn | grep -E "(2501|2502|8888|9997)"
```

## Integration Examples

### Start Both Services

```bash
#!/bin/bash
# Start both Kismet and MediaMTX

echo "Starting Kismet WiFi scanning..."
./start_kismet.sh &
KISMET_PID=$!

echo "Starting MediaMTX streaming server..."
./start_mediamtx.sh &
MEDIAMTX_PID=$!

echo "Services started:"
echo "  Kismet PID: $KISMET_PID"
echo "  MediaMTX PID: $MEDIAMTX_PID"

# Wait for both processes
wait $KISMET_PID $MEDIAMTX_PID
```

### Health Check Script

```bash
#!/bin/bash
# Health check for services

check_kismet() {
    if pgrep kismet > /dev/null; then
        echo "✓ Kismet is running"
        curl -s http://localhost:2501 > /dev/null && echo "✓ Kismet web interface accessible"
    else
        echo "✗ Kismet is not running"
    fi
}

check_mediamtx() {
    if pgrep mediamtx > /dev/null; then
        echo "✓ MediaMTX is running"
        curl -s http://localhost:9997 > /dev/null && echo "✓ MediaMTX API accessible"
    else
        echo "✗ MediaMTX is not running"
    fi
}

echo "=== Service Health Check ==="
check_kismet
check_mediamtx
```

This scripts component provides the foundation for individual service management within the larger Stinkster ecosystem, offering reliable startup procedures with comprehensive error handling and monitoring capabilities.
# Orchestration Component

The orchestration component provides comprehensive service coordination and management for the Stinkster system, handling the complex startup, monitoring, and shutdown of multiple interconnected services including GPS, WiFi scanning (Kismet), and TAK integration.

## Overview

The orchestration scripts coordinate the following services:
- **GPSD**: GPS daemon for location services
- **cgps**: GPS monitoring interface
- **Kismet**: WiFi network scanning and monitoring
- **WigleToTAK**: Converts WiFi scan data to TAK format for mapping

These services have complex dependencies and require careful startup sequencing, environment configuration, and process monitoring.

## Scripts Overview

### 1. `gps_kismet_wigle.sh` (Primary Orchestrator)
**Purpose**: Full-featured orchestration script with comprehensive error handling and GPS device auto-detection.

**Key Features**:
- Automatic GPS device detection and configuration
- Robust gpsd startup with multiple retry attempts
- Full Kismet configuration and monitoring
- Virtual environment management for WigleToTAK
- Comprehensive process monitoring and cleanup
- Detailed logging with timestamps

**Usage**:
```bash
# Basic usage
./gps_kismet_wigle.sh

# With custom WigleToTAK directory and port
./gps_kismet_wigle.sh /custom/path/to/wigletotak 7070
```

### 2. `gps_kismet_wigle_fast.sh` (Optimized Version)
**Purpose**: Performance-optimized version with reduced startup time (~15 seconds vs 30+ seconds).

**Key Features**:
- Parallel service initialization
- Reduced wait times and timeouts
- Streamlined GPS device checking
- Background process coordination
- Optimized for reliable hardware configurations

**Usage**:
```bash
# Fast startup (recommended for production)
./gps_kismet_wigle_fast.sh
```

### 3. `gps_kismet_wigle_fast_simple.sh` (Simplified Version)
**Purpose**: Streamlined version assuming GPS is already configured and running.

**Key Features**:
- Assumes gpsd is pre-configured
- Minimal GPS device detection
- Desktop environment detection
- Simplified error handling
- Direct Kismet configuration

**Usage**:
```bash
# When GPS is already configured
./gps_kismet_wigle_fast_simple.sh
```

### 4. `start_kismet_background.sh` (Kismet Wrapper)
**Purpose**: Dedicated Kismet startup wrapper to avoid trap conflicts.

**Key Features**:
- Direct Kismet process management
- Configuration setup
- Background execution
- PID file management

**Usage**:
```bash
# Usually called by main orchestrators
./start_kismet_background.sh
```

### 5. `v2gps_kismet_wigle.sh` (Experimental Version)
**Purpose**: Alternative implementation with different approach to service management.

**Key Features**:
- Simplified cleanup logic
- Different process monitoring approach
- Experimental configuration options

## Environment Variables

### Required Variables
```bash
export LOG_DIR="/home/pi/projects/stinkster/logs"           # Log directory
export KISMET_DATA_DIR="/home/pi/projects/stinkster/data/kismet"  # Kismet data directory
export WIGLETOTAK_DIR="/home/pi/projects/stinkster/wigletotak"    # WigleToTAK directory
```

### Optional Variables
```bash
export DEBUG=1                    # Enable debug output
export DISPLAY=:0                 # X11 display (for cgps GUI)
export XAUTHORITY=/home/pi/.Xauthority  # X11 authorization
export WIGLETOTAK_PORT=6969       # WigleToTAK web interface port
```

### System Environment Setup
```bash
export TERM=xterm
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

## Service Dependencies and Startup Order

### Dependency Chain
```
1. Hardware Detection
   ├── GPS Device Detection (/dev/ttyUSB*, /dev/ttyACM*)
   └── WiFi Interface Detection (wlan2)

2. GPS Services
   ├── GPSD Configuration
   ├── GPSD Startup
   └── cgps Monitor (optional)

3. WiFi Services
   ├── Kismet Configuration
   ├── Monitor Mode Setup (wlan2)
   └── Kismet Startup

4. Integration Services
   ├── WigleToTAK Virtual Environment
   └── WigleToTAK Startup
```

### Critical Timing
- GPSD must be running before Kismet starts (GPS integration)
- Kismet needs 15+ seconds to fully initialize
- WigleToTAK requires Kismet to be creating .wiglecsv files
- All services use shared PID file for coordination

## Configuration Management

### Kismet Configuration
The scripts automatically generate `~/.kismet/kismet_site.conf`:
```ini
httpd_username=admin
httpd_password=admin
httpd_autologin=true
source=wlan2:name=wlan2,type=linuxwifi,hop=true,channel_hop_speed=5/sec
enable_datasource=wlan2
allowed_interfaces=wlan2,wlan2mon
gps=gpsd:host=localhost,port=2947,reconnect=true
gps_quit_on_error=false
```

### GPSD Configuration
Dynamic configuration in `/etc/default/gpsd`:
```bash
START_DAEMON="true"
USBAUTO="true"
DEVICES="/dev/ttyUSB0"  # Auto-detected
GPSD_OPTIONS="-n -G"
```

## Logging and Monitoring

### Log Files
```
${LOG_DIR}/gps_kismet_wigle.log     # Main orchestration log
${LOG_DIR}/cgps.log                 # GPS monitor output
${LOG_DIR}/kismet.log               # Kismet service log
${LOG_DIR}/wigletotak.log          # WigleToTAK application log
```

### PID Management
```
${LOG_DIR}/gps_kismet_wigle.pids          # All process PIDs
${KISMET_DATA_DIR}/kismet.pid             # Kismet-specific PID
${LOG_DIR}/wigletotak.specific.pid        # WigleToTAK-specific PID
```

### Process Monitoring
The orchestrators continuously monitor:
- Process existence via PID files
- Service responsiveness (gpsd, Kismet web interface)
- Critical process patterns (`cgps`, `kismet`, `python3.*WigleToTak2`)

## Process Management

### Cleanup Strategy
1. **Graceful Termination**: Send SIGTERM to all processes
2. **Wait Period**: Allow 1-2 seconds for clean shutdown
3. **Force Kill**: Send SIGKILL to remaining processes
4. **Resource Cleanup**: Remove PID files, reset network interfaces

### Signal Handling
```bash
trap 'handle_trap' INT TERM EXIT
```
- **INT (Ctrl+C)**: User-initiated shutdown
- **TERM**: System shutdown signal
- **EXIT**: Script termination cleanup

### Prevention of Recursive Cleanup
```bash
CLEANUP_IN_PROGRESS=0  # Prevents cleanup loops
```

## Usage Examples

### Basic Operations

#### Start All Services
```bash
cd /home/pi/projects/stinkster/src/orchestration
./gps_kismet_wigle.sh
```

#### Quick Start (Optimized)
```bash
./gps_kismet_wigle_fast.sh
```

#### Check Service Status
```bash
# Check if services are running
pgrep -f "kismet"
pgrep -f "WigleToTak2"
pgrep -f "cgps"

# Check logs
tail -f ${LOG_DIR}/gps_kismet_wigle.log
```

#### Stop All Services
```bash
# Send interrupt signal (Ctrl+C) or
kill -INT $(cat ${LOG_DIR}/gps_kismet_wigle.pids | tail -1)
```

### Advanced Usage

#### Custom WigleToTAK Configuration
```bash
# Custom directory and port
./gps_kismet_wigle.sh /custom/wigletotak/path 8080
```

#### Debug Mode
```bash
export DEBUG=1
./gps_kismet_wigle.sh
```

#### Different Log Directory
```bash
export LOG_DIR="/var/log/stinkster"
./gps_kismet_wigle.sh
```

## Troubleshooting and Debugging

### Common Issues

#### GPS Device Not Found
```bash
# Check for GPS devices
ls -l /dev/ttyUSB* /dev/ttyACM*

# Test device manually
sudo stty -F /dev/ttyUSB0 9600
timeout 2 cat /dev/ttyUSB0 | grep '^\$G[PNLR][A-Z]\{3\}'
```

#### GPSD Not Responding
```bash
# Check gpsd status
systemctl status gpsd
gpspipe -w -n 1

# Restart gpsd
sudo systemctl restart gpsd
```

#### Kismet Startup Failures
```bash
# Check interface status
ip link show wlan2
iw dev wlan2 info

# Check for conflicting processes
sudo airmon-ng check
```

#### WigleToTAK Issues
```bash
# Check virtual environment
ls -la ${WIGLETOTAK_DIR}/venv/

# Test Python environment
cd ${WIGLETOTAK_DIR}
source venv/bin/activate
python3 -c "import flask; print('Flask OK')"
```

### Debug Commands

#### Monitor Process Health
```bash
# Watch process status
watch -n 2 'cat ${LOG_DIR}/gps_kismet_wigle.pids | xargs -I {} ps -p {} -o pid,ppid,cmd'
```

#### Network Interface Debugging
```bash
# Check monitor mode
iw dev wlan2 info | grep type

# Reset interface
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up
```

#### Log Analysis
```bash
# Follow all logs simultaneously
tail -f ${LOG_DIR}/gps_kismet_wigle.log \
        ${LOG_DIR}/kismet.log \
        ${LOG_DIR}/wigletotak.log
```

### Performance Optimization

#### Memory Usage
```bash
# Check available memory before startup
free -m

# Monitor memory during operation
watch -n 5 'free -m && ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head'
```

#### Startup Time Optimization
- Use `gps_kismet_wigle_fast.sh` for production
- Pre-configure GPS device in `/etc/default/gpsd`
- Ensure WiFi interface is in correct state before startup

### Error Recovery

#### Automatic Restart on Failure
```bash
# Systemd service wrapper (example)
while true; do
    ./gps_kismet_wigle.sh
    echo "Service died, restarting in 10 seconds..."
    sleep 10
done
```

#### Partial Service Recovery
If individual services fail, you can restart specific components:
```bash
# Restart only Kismet
pkill -f kismet
./start_kismet_background.sh

# Restart only WigleToTAK
pkill -f WigleToTak2
cd ${WIGLETOTAK_DIR}
source venv/bin/activate
python3 WigleToTak2.py &
```

## Integration Points

### External Dependencies
- **System**: gpsd, kismet, python3, wireless-tools
- **Hardware**: GPS receiver, WiFi adapter with monitor mode support
- **Network**: Available interfaces (wlan2), proper drivers

### Data Flow
```
GPS Device → GPSD → Kismet (location tagging) → .wiglecsv files → WigleToTAK → TAK Server
```

### Service Ports
- **GPSD**: 2947 (standard GPS daemon port)
- **Kismet**: 2501 (web interface)
- **WigleToTAK**: 6969 (configurable web interface)

This orchestration component provides robust, monitored coordination of all Stinkster services with comprehensive error handling, logging, and recovery mechanisms.
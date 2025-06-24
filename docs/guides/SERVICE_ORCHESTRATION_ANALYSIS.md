# Service Orchestration and Process Management Analysis

## Executive Summary

The Stinkster project implements a sophisticated multi-service orchestration system that coordinates GPS tracking, WiFi scanning, spectrum analysis, and TAK integration. The system features robust process management, health monitoring, graceful shutdown mechanisms, and comprehensive logging capabilities.

## Service Architecture Overview

### Core Services
1. **GPSD** - GPS daemon providing location services
2. **Kismet** - WiFi scanning and monitoring 
3. **WigleToTAK** - WiFi data to TAK format converter
4. **HackRF/OpenWebRX** - Software Defined Radio operations
5. **GPSmav** - MAVLink to GPSD bridge

### Service Dependencies and Startup Sequence

```
1. GPSD Service (systemd managed)
   ↓
2. GPS Device Detection & Configuration
   ↓
3. cgps (GPS client for monitoring)
   ↓
4. Kismet WiFi Scanner
   ↓
5. WigleToTAK Web Application
```

## Main Orchestration Scripts

### 1. Primary Orchestration: `gps_kismet_wigle.sh`

**Location**: `/src/orchestration/gps_kismet_wigle.sh`

**Key Features**:
- **Comprehensive GPS Setup**: Automatically detects GPS devices across multiple serial interfaces (`/dev/ttyUSB0`, `/dev/ttyACM0`, `/dev/ttyAMA0`) with baud rate auto-detection (9600, 4800, 38400, 57600, 115200)
- **Robust Error Handling**: Implements cleanup recursion prevention and graceful signal handling
- **Process Monitoring**: Continuous health checks with automatic failure detection
- **Logging**: Timestamped logging with detailed error reporting

**Process Management**:
```bash
# PID tracking
PID_FILE="${LOG_DIR}/gps_kismet_wigle.pids"
KISMET_PID_FILE="${KISMET_DATA_DIR}/kismet.pid"

# Signal handling with trap
trap 'handle_trap' INT TERM EXIT
```

**Service Startup Sequence**:
1. GPSD service restart and verification
2. GPS device auto-detection and configuration
3. cgps client startup with retry logic
4. Kismet configuration and startup
5. WigleToTAK virtual environment setup and launch
6. Continuous process monitoring loop

### 2. Fast Startup Variant: `gps_kismet_wigle_fast.sh`

**Optimizations**:
- Parallel configuration setup
- Reduced sleep intervals (0.5s vs 1-2s)
- Background pre-flight checks
- Optimized startup sequence targeting ~15 seconds total

**Key Improvements**:
```bash
# Parallel setup
setup_kismet_config &

# Quick gpsd check with timeout
if ! timeout 1 gpspipe -w -n 1 > /dev/null 2>&1; then
    log "gpsd not responding, attempting quick restart..."
    sudo systemctl restart gpsd
    sleep 1
fi
```

### 3. Simplified Variant: `v2gps_kismet_wigle.sh`

**Focus**: Streamlined operations with less comprehensive error handling
**Use Case**: Development and testing environments

## Process Management Architecture

### PID File Management

The system uses multiple PID tracking mechanisms:

```bash
# Main process tracker
PID_FILE="${LOG_DIR}/gps_kismet_wigle.pids"

# Service-specific PID files
KISMET_PID_FILE="${KISMET_DATA_DIR}/kismet.pid"
WIGLETOTAK_PID="${LOG_DIR}/wigletotak.specific.pid"
```

### Process Health Monitoring

**Monitoring Loop Structure**:
```bash
CRITICAL_PROCESSES=("cgps" "kismet" "python3.*WigleToTak2")

while true; do
    # Check PIDs from PID_FILE
    for pid_to_c in "${pids_to_check[@]}"; do
        if ! check_process "$pid_to_c"; then
            log "Process $pid_to_c has died unexpectedly."
            exit 1
        fi
    done
    
    # Check critical processes by name
    for proc_pattern in "${CRITICAL_PROCESSES[@]}"; do
        if ! pgrep -f "$proc_pattern" > /dev/null; then
            log "CRITICAL: Process matching '$proc_pattern' not found!"
            exit 1
        fi
    done
    sleep 5
done
```

### Graceful Shutdown Implementation

**Cleanup Function Features**:
- Recursion prevention (`CLEANUP_IN_PROGRESS` flag)
- Graceful TERM signal followed by KILL if needed
- Service-specific shutdown procedures
- Resource cleanup (PID files, temporary files)

```bash
cleanup() {
    if [ "$CLEANUP_IN_PROGRESS" -eq 1 ]; then
        return
    fi
    CLEANUP_IN_PROGRESS=1
    
    # Stop services in reverse order
    # 1. Stop gpsd
    sudo systemctl stop gpsd.socket gpsd
    
    # 2. Stop Kismet using PID file
    if [ -f "$KISMET_PID_FILE" ]; then
        KISMET_PID=$(cat "$KISMET_PID_FILE")
        kill -TERM "$KISMET_PID"
        sleep 2
        if check_process "$KISMET_PID"; then
            kill -KILL "$KISMET_PID"
        fi
    fi
    
    # 3. Stop other processes
    while read -r pid; do
        kill -TERM "$pid"
        sleep 1
        if check_process "$pid"; then
            kill -KILL "$pid"
        fi
    done < "$PID_FILE"
}
```

## SystemD Integration

### Service Definitions

**HackRF Scanner Service** (`systemd/hackrf-scanner.service`):
```ini
[Unit]
Description=HackRF Scanner - Real-time Spectrum Analyzer
After=network.target
Wants=openwebrx.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/projects/stinkster/hackrf
ExecStart=/home/pi/projects/stinkster/hackrf/venv/bin/python /home/pi/projects/stinkster/hackrf/spectrum_analyzer.py
Restart=always
RestartSec=10
MemoryLimit=256M
CPUQuota=25%
```

**Service Installation** (`systemd/install.sh`):
- Automated service file deployment
- SystemD daemon reload
- Service enablement
- Status reporting

### Resource Management

**Hardware Resource Limits**:
- Memory limit: 256MB for HackRF scanner
- CPU quota: 25% to prevent system overload
- File descriptor limits via ulimit

## Development Environment Integration

### Component Management System

**Advanced Component Manager** (`dev/tools/component-manager.sh`):

**Features**:
- Individual component control
- Resource monitoring
- Performance analysis
- Zero-downtime rolling restarts
- Filtered log viewing

**Component Operations**:
```bash
# Start with options
start_component_advanced "$component" "$options"

# Graceful stop with timeout
stop_component_graceful "$component" "$timeout"

# Rolling restart for web components
restart_component_rolling "$component"

# Performance monitoring
analyze_performance "$component" "$duration"
```

### Health Monitoring System

**Comprehensive Health Checks** (`dev/tools/health-check.sh`):

**Assessment Areas**:
1. **System Dependencies**: Python, Docker, Kismet, GPSD, HackRF tools
2. **Python Environment**: Virtual environment, package availability
3. **Hardware**: Network interfaces, HackRF device, GPS devices
4. **Processes**: Component status, resource usage
5. **Network**: Service connectivity, internet access
6. **Resources**: Disk space, memory usage, log file sizes

### Hot Reload System

**File Monitoring** (`dev/hot-reload/monitor.sh`):
- Monitors `src/` directory for changes
- Component-specific restart logic
- Debouncing to prevent restart loops
- Graceful component lifecycle management

## Configuration Management

### Service Configuration

**Orchestration Configuration** (`service-orchestration.conf`):
```bash
# Service Start Order and Delays
GPS_START_DELAY=5
KISMET_START_DELAY=10
WIGLETOTAK_START_DELAY=15

# Health Check Intervals
HEALTH_CHECK_INTERVAL=30
SERVICE_RESTART_DELAY=10
MAX_RESTART_ATTEMPTS=3

# Service Ports
GPSD_PORT=2947
KISMET_PORT=2501
WIGLETOTAK_PORT=6969
OPENWEBRX_PORT=8073
```

### Kismet Configuration Management

**Dynamic Configuration Generation**:
```bash
setup_kismet_config() {
    mkdir -p ~/.kismet
    cat > ~/.kismet/kismet_site.conf << EOF
httpd_username=admin
httpd_password=admin
httpd_autologin=true
source=wlan2:name=wlan2,type=linuxwifi,hop=true,channel_hop_speed=5/sec
gps=gpsd:host=localhost,port=2947,reconnect=true
gps_quit_on_error=false
EOF
}
```

## Logging and Error Handling

### Centralized Logging

**Log File Structure**:
```
logs/
├── gps_kismet_wigle.log     # Main orchestration log
├── kismet.log               # Kismet-specific logs
├── wigletotak.log          # WigleToTAK application logs
├── cgps.log                # GPS client logs
└── health-report-*.txt     # Health check reports
```

**Logging Functions**:
```bash
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}
```

### Error Recovery Mechanisms

**GPS Service Recovery**:
```bash
if ! gpspipe -w -n 1 > /dev/null 2>&1; then
    log "ERROR: gpsd not responding, forcing restart..."
    sudo killall -9 gpsd gpsdctl
    sudo systemctl restart gpsd.socket gpsd
    sleep 3
fi
```

**Component Restart Logic**:
- Multiple restart attempts with backoff
- Failure escalation to script termination
- Comprehensive error logging

## Network Interface Management

### WiFi Adapter Configuration

**Monitor Mode Setup**:
```bash
# Airmon-ng method (preferred)
sudo airmon-ng start wlan2

# Manual method (fallback)
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up
```

**Interface Validation**:
- Existence check (`ip link show wlan2`)
- Monitor mode verification
- Process conflict resolution

## Performance Optimization

### Startup Time Optimization

**Fast Startup Features**:
- Parallel configuration setup
- Background pre-flight checks
- Reduced sleep intervals
- Optimized dependency checks

**Resource Optimization**:
- Memory limits via systemd
- CPU quotas for resource-intensive components
- Log rotation to prevent disk space issues

### Process Monitoring Efficiency

**Monitoring Intervals**:
- Main loop: 5-second intervals
- Health checks: 30-second intervals
- Hot reload: File system event-driven

## Security Considerations

### Process Isolation

**User Permissions**:
- Services run as `pi` user
- Sudo access limited to specific operations (systemctl, network commands)
- PID file permissions restricted

**Service Hardening**:
```ini
# SystemD security measures
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
NoNewPrivileges=yes
```

## Failure Scenarios and Recovery

### Component Failure Handling

**Failure Detection**:
1. PID-based process monitoring
2. Process name pattern matching
3. Service port connectivity checks
4. Resource usage monitoring

**Recovery Strategies**:
1. **Automatic Restart**: Individual component failures trigger restart
2. **Graceful Degradation**: Continue operation without failed non-critical components
3. **Complete Shutdown**: Critical component failures trigger full system shutdown
4. **Manual Recovery**: Health check reports guide manual intervention

### Data Integrity

**PID File Management**:
- Atomic PID file operations
- Stale PID file detection and cleanup
- Process verification before operations

**State Persistence**:
- Configuration backup before changes
- Log rotation with retention policies
- Process state documentation

## Monitoring and Observability

### Real-time Monitoring

**Process Monitor** (`dev/tools/monitor.sh`):
```bash
# Displays live process information
✓ wigletotak (PID: 1234)
  1234  1233  2.1  1.5  00:05:23 python3 WigleToTak2.py
```

**Health Dashboard**:
```bash
Component    Status     Uptime     CPU/MEM%      Memory(KB)
==========   ======     ======     =======       ==========
gpsmav       running    00:15:43   1.2/0.8       45632
hackrf       running    00:15:40   3.4/2.1       78944
wigletotak   running    00:15:35   0.9/1.2       52488
```

### Performance Analysis

**Resource Tracking**:
- CPU and memory usage over time
- Process startup time analysis
- Component restart frequency
- Error rate monitoring

## Best Practices and Recommendations

### Operational Excellence

1. **Monitoring**: Regular health checks and process monitoring
2. **Logging**: Comprehensive logging with appropriate rotation
3. **Testing**: Automated testing of component integration
4. **Documentation**: Keep configuration and deployment documentation current

### Development Workflow

1. **Component Development**: Use development environment with hot reload
2. **Testing**: Comprehensive unit and integration testing
3. **Staging**: Test orchestration changes in development environment first
4. **Production**: Use systemd services for production deployment

### Maintenance

1. **Log Management**: Regular log rotation and cleanup
2. **Resource Monitoring**: Track resource usage trends
3. **Configuration Backup**: Maintain configuration backups
4. **Update Procedures**: Test updates in development environment

## Conclusion

The Stinkster service orchestration system demonstrates sophisticated process management with robust error handling, comprehensive monitoring, and graceful failure recovery. The architecture supports both development and production environments with appropriate tooling for each use case. The system's modular design allows for individual component management while maintaining overall system coordination and health monitoring.

The implementation provides a solid foundation for reliable multi-service coordination in challenging environments where hardware dependencies, network interfaces, and external services must work together seamlessly.
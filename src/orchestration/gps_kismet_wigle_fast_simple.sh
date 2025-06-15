#!/bin/bash

# Enable debug mode if DEBUG environment variable is set
if [ -n "$DEBUG" ]; then
    set -x  # Print commands as they execute
fi

# Create tmp directory if it doesn't exist
mkdir -p ${LOG_DIR:-/home/pi/projects/stinkster/logs}

# File to store all PIDs
PID_FILE="${LOG_DIR:-/home/pi/projects/stinkster/logs}/gps_kismet_wigle.pids"
LOG_FILE="${LOG_DIR:-/home/pi/projects/stinkster/logs}/gps_kismet_wigle.log"
KISMET_PID_FILE="${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}/kismet.pid"

# Set up environment
export DISPLAY=:0
export XAUTHORITY=/home/pi/.Xauthority
export TERM=xterm
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if a process is running
check_process() {
    local pid=$1
    if ps -p "$pid" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to cleanup on exit
cleanup() {
    log "Cleanup initiated..."
    
    # Read PIDs from file and kill processes
    if [ -f "$PID_FILE" ]; then
        while IFS= read -r pid; do
            if [ -n "$pid" ] && check_process "$pid"; then
                log "Stopping process $pid"
                kill "$pid" 2>/dev/null
                sleep 1
                if check_process "$pid"; then
                    kill -9 "$pid" 2>/dev/null
                fi
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Stop gpsd
    log "Stopping gpsd..."
    sudo systemctl stop gpsd 2>/dev/null || sudo killall gpsd 2>/dev/null
    
    # Stop Kismet if it's still running
    if [ -f "$KISMET_PID_FILE" ]; then
        KISMET_PID=$(cat "$KISMET_PID_FILE")
        if check_process "$KISMET_PID"; then
            log "Stopping Kismet (PID: $KISMET_PID)"
            kill "$KISMET_PID" 2>/dev/null
            sleep 2
            kill -9 "$KISMET_PID" 2>/dev/null
        fi
        rm -f "$KISMET_PID_FILE"
    fi
    
    # Kill any remaining Kismet processes
    pkill -f kismet 2>/dev/null
    
    # Kill any remaining WigleToTAK processes
    pkill -f WigleToTak 2>/dev/null
    
    # Reset wlan2 to managed mode
    log "Resetting wlan2 to managed mode..."
    sudo ip link set wlan2 down 2>/dev/null
    sudo iw dev wlan2 set type managed 2>/dev/null
    sudo ip link set wlan2 up 2>/dev/null
    
    log "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Clear the log file
> "$LOG_FILE"
log "Starting GPS, Kismet, and WigleToTAK integration script"

# Clear PID file
> "$PID_FILE"

# Function to find GPS device
find_gps_device() {
    log "Searching for GPS device..."
    
    # Common GPS device paths
    local gps_devices=(
        "/dev/ttyACM0"
        "/dev/ttyACM1"
        "/dev/ttyUSB0"
        "/dev/ttyUSB1"
        "/dev/serial0"
        "/dev/ttyAMA0"
        "/dev/gps0"
    )
    
    for device in "${gps_devices[@]}"; do
        if [ -e "$device" ]; then
            log "Found potential GPS device: $device"
            # Try to detect if it's actually a GPS by checking for NMEA sentences
            if timeout 2 cat "$device" 2>/dev/null | grep -q '^\$G[PNLR][A-Z]\{3\}'; then
                log "Confirmed GPS device at $device"
                echo "$device"
                return 0
            fi
        fi
    done
    
    # If no device found with NMEA data, return the first available device
    for device in "${gps_devices[@]}"; do
        if [ -e "$device" ]; then
            log "Using device $device (NMEA not confirmed)"
            echo "$device"
            return 0
        fi
    done
    
    log "No GPS device found"
    return 1
}

# Function to configure and start gpsd
start_gpsd() {
    local gps_device="$1"
    
    log "Configuring gpsd for device: $gps_device"
    
    # Stop any existing gpsd instance
    sudo systemctl stop gpsd 2>/dev/null
    sudo killall gpsd 2>/dev/null
    sleep 1  # Reduced from 2
    
    # Configure gpsd
    sudo bash -c "cat > /etc/default/gpsd" << EOF
START_DAEMON="true"
USBAUTO="true"
DEVICES="$gps_device"
GPSD_OPTIONS="-n -G"
EOF
    
    # Start gpsd
    log "Starting gpsd..."
    sudo gpsd -n -G "$gps_device" 2>/dev/null
    sleep 2  # Reduced from 3
    
    # Verify gpsd is running
    if pgrep -x gpsd > /dev/null; then
        log "gpsd started successfully"
        return 0
    else
        log "Failed to start gpsd"
        return 1
    fi
}

# Find and configure GPS
GPS_DEVICE=$(find_gps_device)
if [ -z "$GPS_DEVICE" ]; then
    log "ERROR: No GPS device found. Continuing without GPS..."
    GPS_AVAILABLE=false
else
    if start_gpsd "$GPS_DEVICE"; then
        GPS_AVAILABLE=true
        
        # Test GPS connection
        log "Testing GPS connection..."
        if timeout 3 gpspipe -w -n 5 2>/dev/null | grep -q '"class":"TPV"'; then
            log "GPS is providing data"
        else
            log "WARNING: GPS connected but no position data yet"
        fi
    else
        GPS_AVAILABLE=false
        log "WARNING: Could not start gpsd, continuing without GPS"
    fi
fi

# Function to check if we're in a desktop environment
is_desktop_environment() {
    if [ -n "$DISPLAY" ] && command -v xterm >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start cgps if GPS is available and we're in a desktop environment
if [ "$GPS_AVAILABLE" = true ] && is_desktop_environment; then
    log "Starting cgps in new terminal..."
    
    # Create a wrapper script for cgps
    cat > /tmp/cgps_wrapper.sh << 'EOF'
#!/bin/bash
echo "Starting cgps GPS monitor..."
echo "Waiting for GPS fix..."
sleep 1
exec cgps
EOF
    chmod +x /tmp/cgps_wrapper.sh
    
    # Start cgps in a new terminal
    xterm -title "GPS Monitor (cgps)" -geometry 80x24+0+0 -e /tmp/cgps_wrapper.sh &
    CGPS_PID=$!
    
    if check_process "$CGPS_PID"; then
        echo "$CGPS_PID" >> "$PID_FILE"
        log "cgps started with PID: $CGPS_PID"
    else
        log "WARNING: Failed to start cgps terminal"
    fi
else
    if [ "$GPS_AVAILABLE" = false ]; then
        log "Skipping cgps - GPS not available"
    else
        log "Skipping cgps - not in desktop environment"
    fi
fi

# Configure Kismet
log "Configuring Kismet..."
mkdir -p ~/.kismet

# Create Kismet configuration
cat > ~/.kismet/kismet_site.conf << EOF
# Kismet configuration
httpd_username=admin
httpd_password=admin
httpd_bind_address=0.0.0.0
httpd_port=2501

# GPS configuration
gps=gpsd:host=localhost,port=2947,reconnect=true

# Logging configuration
log_types=kismetdb,pcapng
log_prefix=/home/pi/kismet_logs/
log_title=kismet

# Source configuration will be added via command line
EOF

# Ensure Kismet log directory exists
mkdir -p /home/pi/kismet_logs

# Check if wlan2 exists
if ! ip link show wlan2 >/dev/null 2>&1; then
    log "ERROR: wlan2 interface not found"
    exit 1
fi

# Kill any processes using wlan2
log "Preparing wlan2 for monitor mode..."
sudo airmon-ng check kill 2>/dev/null || true
sleep 1  # Reduced from 2

# Set wlan2 to monitor mode
log "Setting wlan2 to monitor mode..."
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up

# Verify monitor mode
MODE=$(iw dev wlan2 info | grep -o "type [a-z]*" | cut -d' ' -f2)
if [ "$MODE" = "monitor" ]; then
    log "wlan2 successfully set to monitor mode"
else
    log "WARNING: wlan2 may not be in monitor mode (detected: $MODE)"
fi

# Start Kismet
log "Starting Kismet..."
cd ${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet} || {
    log "ERROR: Cannot change to ${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet} directory"
    exit 1
}

# Use the existing start_kismet.sh script
if [ -x "/home/pi/projects/stinkster/scripts/start_kismet.sh" ]; then
    log "Using start_kismet.sh script..."
    nohup /home/pi/projects/stinkster/scripts/start_kismet.sh > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log 2>&1 &
    KISMET_SCRIPT_PID=$!
    log "Kismet launcher started with PID $KISMET_SCRIPT_PID"
else
    log "ERROR: /home/pi/projects/stinkster/scripts/start_kismet.sh not found or not executable"
    exit 1
fi

# Wait for Kismet to start (reduced wait time)
log "Waiting for Kismet to initialize..."
KISMET_WAIT=0
while [ $KISMET_WAIT -lt 15 ] && [ ! -f "$KISMET_PID_FILE" ]; do  # Reduced from 25
    sleep 1
    KISMET_WAIT=$((KISMET_WAIT + 1))
done

if [ -f "$KISMET_PID_FILE" ]; then
    KISMET_PID_VALUE=$(cat "$KISMET_PID_FILE")
    if [ -n "$KISMET_PID_VALUE" ] && check_process "$KISMET_PID_VALUE"; then
        echo "$KISMET_PID_VALUE" >> "$PID_FILE"
        log "Kismet started with PID: $KISMET_PID_VALUE"
    else
        log "ERROR: Kismet process not found despite PID file"
        exit 1
    fi
else
    log "ERROR: Kismet failed to create PID file"
    exit 1
fi

# Additional wait for Kismet to fully initialize (reduced)
log "Waiting for Kismet to fully initialize..."
sleep 5  # Reduced from 10

# Verify Kismet is accessible
if curl -s -f -u admin:admin http://localhost:2501/system/status >/dev/null 2>&1; then
    log "Kismet web interface is accessible"
else
    log "WARNING: Kismet web interface not responding yet"
fi

# Start WigleToTAK
log "Starting WigleToTAK..."

# Change to the WigleToTAK directory
cd /home/pi/WigleToTAK || {
    log "ERROR: Cannot change to /home/pi/WigleToTAK directory"
    exit 1
}

# Activate virtual environment and start WigleToTAK
if [ -f "venv/bin/activate" ]; then
    log "Activating WigleToTAK virtual environment..."
    source venv/bin/activate
    
    # Start WigleToTAK
    log "Launching WigleToTAK..."
    python WigleToTak.py > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log 2>&1 &
    WIGLE_PID=$!
    
    if check_process "$WIGLE_PID"; then
        echo "$WIGLE_PID" >> "$PID_FILE"
        log "WigleToTAK started with PID: $WIGLE_PID"
    else
        log "ERROR: Failed to start WigleToTAK"
        exit 1
    fi
else
    log "ERROR: WigleToTAK virtual environment not found"
    exit 1
fi

# Wait a moment for WigleToTAK to initialize (reduced)
sleep 2  # Reduced from 5

# Store the main script PID
echo "$$" >> "$PID_FILE"

# Summary
log "=== Startup Complete ==="
log "GPS Device: ${GPS_DEVICE:-Not found}"
log "GPS Available: $GPS_AVAILABLE"
if [ "$GPS_AVAILABLE" = true ] && [ -n "$CGPS_PID" ]; then
    log "cgps PID: $CGPS_PID"
fi
log "Kismet PID: ${KISMET_PID_VALUE:-Unknown}"
log "WigleToTAK PID: $WIGLE_PID"
log "Main Script PID: $$"
log "======================="

# Monitor processes
log "Monitoring processes (press Ctrl+C to stop all)..."
while true; do
    # Check if critical processes are still running
    if [ -n "$KISMET_PID_VALUE" ] && ! check_process "$KISMET_PID_VALUE"; then
        log "ERROR: Kismet process died"
        break
    fi
    
    if ! check_process "$WIGLE_PID"; then
        log "ERROR: WigleToTAK process died"
        break
    fi
    
    sleep 5  # Reduced from 10
done

log "One or more critical processes failed. Exiting..."
exit 1 
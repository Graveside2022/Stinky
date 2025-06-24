#!/bin/bash
# Or use #!/bin/bash if you prefer or if zsh isn't guaranteed

# --- Script to start Kismet in a specific directory ---

# Make interface configurable via environment variable
WIRELESS_INTERFACE="${WIRELESS_INTERFACE:-wlan2}"

# Use consistent paths with the orchestration script
KISMET_OPS_DIR="${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}"
PID_FILE="$KISMET_OPS_DIR/kismet.pid"
LOG_FILE="$KISMET_OPS_DIR/kismet_debug.log"

# Function to cleanup on exit
cleanup() {
    echo "Running cleanup..." >> "$LOG_FILE"
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "Killing Kismet process $pid" >> "$LOG_FILE"
            kill "$pid" 2>/dev/null
            sleep 2
            kill -9 "$pid" 2>/dev/null
        fi
        rm -f "$PID_FILE"
    fi
    
    # Reset interface to managed mode on exit
    echo "Resetting $WIRELESS_INTERFACE to managed mode..." >> "$LOG_FILE"
    ip link set "$WIRELESS_INTERFACE" down 2>/dev/null || true
    iw dev "$WIRELESS_INTERFACE" set type managed 2>/dev/null || true
    ip link set "$WIRELESS_INTERFACE" up 2>/dev/null || true
}

# Set up trap for cleanup
trap cleanup EXIT

# Create log file
touch "$LOG_FILE"
echo "Starting Kismet setup at $(date)" > "$LOG_FILE"

# --- Sanity Check: Ensure the directory exists ---
if [ ! -d "$KISMET_OPS_DIR" ]; then
    echo "Error: Directory '$KISMET_OPS_DIR' not found." >&2
    echo "Creating directory..." >&2
    mkdir -p "$KISMET_OPS_DIR"
fi

echo "Changing directory to $KISMET_OPS_DIR..."
cd "$KISMET_OPS_DIR" || { echo "Error: Failed to change directory to $KISMET_OPS_DIR" >&2; exit 1; }

echo "Current directory: $(pwd)"

# Check if wireless interface exists
if ! ip link show "$WIRELESS_INTERFACE" >/dev/null 2>&1; then
    echo "Error: $WIRELESS_INTERFACE interface not found" >&2
    exit 1
fi

# Kill any processes that might be using the interface
echo "Killing any processes using $WIRELESS_INTERFACE..." >> "$LOG_FILE"
airmon-ng check kill 2>/dev/null || true
pkill -f "wpa_supplicant.*$WIRELESS_INTERFACE" 2>/dev/null || true
pkill -f "dhclient.*$WIRELESS_INTERFACE" 2>/dev/null || true
sleep 2

# Check interface state
INTERFACE_STATE=$(ip link show "$WIRELESS_INTERFACE" | grep -o "state [A-Z]*" | cut -d' ' -f2)
echo "$WIRELESS_INTERFACE interface state: $INTERFACE_STATE" >> "$LOG_FILE"

# Try to ensure interface is in monitor mode - with better error handling
echo "Setting $WIRELESS_INTERFACE to monitor mode..." >> "$LOG_FILE"

# First, try using airmon-ng if available
if command -v airmon-ng >/dev/null 2>&1; then
    echo "Using airmon-ng to set monitor mode..." >> "$LOG_FILE"
    # Try without sudo (user should have proper permissions)
    airmon-ng stop "${WIRELESS_INTERFACE}mon" 2>/dev/null || true
    airmon-ng start "$WIRELESS_INTERFACE" 2>&1 >> "$LOG_FILE" || true
    # Check if monitor interface was created
    if ip link show "${WIRELESS_INTERFACE}mon" >/dev/null 2>&1; then
        echo "Monitor interface ${WIRELESS_INTERFACE}mon created" >> "$LOG_FILE"
        MONITOR_INTERFACE="${WIRELESS_INTERFACE}mon"
    else
        MONITOR_INTERFACE="$WIRELESS_INTERFACE"
    fi
else
    # Fallback to manual method
    echo "Using manual method to set monitor mode..." >> "$LOG_FILE"
    # Try without sudo (user should have proper permissions)
    if ! ip link set "$WIRELESS_INTERFACE" down 2>/dev/null; then
        echo "ERROR: Need elevated permissions for interface control." >> "$LOG_FILE"
        echo "Run: sudo /home/pi/projects/stinkster_malone/stinkster/scripts/setup_permissions.sh" >> "$LOG_FILE"
        echo "Then logout and login again for group membership to take effect." >> "$LOG_FILE"
        # Try anyway but log the issue
        ip link set "$WIRELESS_INTERFACE" down 2>/dev/null || true
    fi
    iw dev "$WIRELESS_INTERFACE" set monitor none 2>/dev/null || true
    ip link set "$WIRELESS_INTERFACE" up 2>/dev/null || true
    MONITOR_INTERFACE="$WIRELESS_INTERFACE"
fi

# Verify monitor mode
sleep 1
MODE=$(iw dev $MONITOR_INTERFACE info 2>/dev/null | grep -o "type [a-z]*" | cut -d' ' -f2)
echo "$MONITOR_INTERFACE mode: $MODE" >> "$LOG_FILE"

if [ "$MODE" != "monitor" ]; then
    echo "WARNING: Failed to verify monitor mode, but continuing anyway..." >> "$LOG_FILE"
fi

# Check if gpsd is available before configuring GPS
GPS_CONFIG=""
if timeout 1 bash -c "echo '' | nc -w 1 localhost 2947" 2>/dev/null; then
    echo "gpsd is available on port 2947, enabling GPS in Kismet" >> "$LOG_FILE"
    GPS_CONFIG="# GPS configuration - gpsd is available
gps=gpsd:host=localhost,port=2947,reconnect=true
# Don't exit on GPS errors
gps_quit_on_error=false"
else
    echo "WARNING: gpsd not responding on port 2947, disabling GPS in Kismet" >> "$LOG_FILE"
    GPS_CONFIG="# GPS disabled - gpsd not available
# gps=gpsd:host=localhost,port=2947"
fi

# --- Configure Kismet for auto-login and source ---
echo "Setting up Kismet configuration (start_kismet.sh)..."
mkdir -p ~/.kismet
cat > ~/.kismet/kismet_site.conf << EOF
httpd_username=admin
httpd_password=admin
httpd_autologin=true
httpd_bind_address=0.0.0.0
source=$MONITOR_INTERFACE:name=$MONITOR_INTERFACE,type=linuxwifi,hop=true,channel_hop_speed=5/sec
enable_datasource=$MONITOR_INTERFACE
allowed_interfaces=$MONITOR_INTERFACE,$WIRELESS_INTERFACE,${WIRELESS_INTERFACE}mon
# Disable some features that might cause crashes
dot11_process_phy=false
$GPS_CONFIG
EOF
chmod 600 ~/.kismet/kismet_site.conf

# Ensure no existing Kismet process is running
if [ -f "$PID_FILE" ]; then
    old_pid=$(cat "$PID_FILE")
    if ps -p "$old_pid" > /dev/null 2>&1; then
        echo "Stopping existing Kismet process (PID: $old_pid)..." >> "$LOG_FILE"
        kill "$old_pid" 2>/dev/null
        sleep 2
        kill -9 "$old_pid" 2>/dev/null
    fi
    rm -f "$PID_FILE"
fi

# Check system resources before starting
echo "System resources check:" >> "$LOG_FILE"
free -m >> "$LOG_FILE"
df -h "$KISMET_OPS_DIR" >> "$LOG_FILE"

# Set resource limits to prevent crashes (if we have permission)
ulimit -c unlimited 2>/dev/null || echo "Note: Cannot set core dump size (not running as root)" >> "$LOG_FILE"
ulimit -n 4096 2>/dev/null || echo "Note: Cannot increase file descriptor limit (not running as root)" >> "$LOG_FILE"

echo "Starting Kismet with interface $MONITOR_INTERFACE..."
echo "Command: kismet --source=$MONITOR_INTERFACE:type=linuxwifi,hop=true,channel_hop_speed=5/sec,name=$MONITOR_INTERFACE --no-daemonize" >> "$LOG_FILE"

# Additional diagnostics before starting Kismet
echo "Network diagnostics before Kismet start:" >> "$LOG_FILE"
echo "Checking localhost connectivity:" >> "$LOG_FILE"
ping -c 1 -W 1 127.0.0.1 >> "$LOG_FILE" 2>&1 || echo "localhost ping failed" >> "$LOG_FILE"
echo "Checking gpsd port:" >> "$LOG_FILE"
nc -zv localhost 2947 >> "$LOG_FILE" 2>&1 || echo "gpsd port check failed" >> "$LOG_FILE"
echo "Network interfaces:" >> "$LOG_FILE"
ip addr show >> "$LOG_FILE" 2>&1
echo "Routing table:" >> "$LOG_FILE"
ip route show >> "$LOG_FILE" 2>&1

# Start Kismet in background and capture its PID
# Run as current user, not root
# Use -c instead of --source as per Kismet documentation
kismet -c $MONITOR_INTERFACE:type=linuxwifi,hop=true,channel_hop_speed=5/sec,name=$MONITOR_INTERFACE \
       --no-daemonize \
       2>&1 | tee -a "$LOG_FILE" &

KISMET_PID=$!
echo $KISMET_PID > "$PID_FILE"
echo "Kismet started with PID: $KISMET_PID" >> "$LOG_FILE"

# Auto-enable the source after Kismet starts
echo "Starting source auto-enable script..." >> "$LOG_FILE"
(/home/pi/projects/stinkster_malone/stinkster/src/scripts/enable_kismet_source.sh >> "$LOG_FILE" 2>&1) &
ENABLE_PID=$!
echo "Source enabler started with PID: $ENABLE_PID" >> "$LOG_FILE"

# Wait for Kismet process
wait $KISMET_PID

KISMET_EXIT_CODE=$?
echo "Kismet exited with code: $KISMET_EXIT_CODE" >> "$LOG_FILE"

# If Kismet crashed, try to get more info
if [ $KISMET_EXIT_CODE -eq 139 ]; then
    echo "Kismet crashed with segmentation fault!" >> "$LOG_FILE"
    echo "Checking for core dump..." >> "$LOG_FILE"
    if [ -f core ]; then
        echo "Core dump found. Run 'gdb kismet core' for analysis" >> "$LOG_FILE"
    fi
    
    # Check dmesg for segfault info
    dmesg | tail -20 | grep -i "kismet\|segfault" >> "$LOG_FILE" 2>/dev/null || true
fi

exit $KISMET_EXIT_CODE

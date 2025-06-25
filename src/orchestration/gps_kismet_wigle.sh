#!/bin/bash
set -x # Force full command tracing

# Enable debug mode if DEBUG environment variable is set
# if [ -n "$DEBUG" ]; then
# set -x  # Print commands as they execute
# fi

# GPS Fix Timeout Configuration:
# Set GPS_TIMEOUT environment variable to change how long to wait for GPS fix
# Default is 30 seconds. Example: GPS_TIMEOUT=60 ./gps_kismet_wigle.sh

# Create log directory if it doesn't exist
export LOG_DIR="${LOG_DIR:-/home/pi/tmp}"
mkdir -p "$LOG_DIR"

# Set default directories
export KISMET_DATA_DIR="${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}"
export WIRELESS_INTERFACE="${WIRELESS_INTERFACE:-wlan2}"

# File to store all PIDs
PID_FILE="${LOG_DIR}/gps_kismet_wigle.pids"
LOG_FILE="${LOG_DIR}/gps_kismet_wigle.log"
KISMET_PID_FILE="${KISMET_DATA_DIR}/kismet.pid"

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
    if ps -p "$pid" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to check if a process by name is running
check_process_by_name() {
    local name=$1
    if pgrep -x "$name" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Variable to prevent cleanup recursion
CLEANUP_IN_PROGRESS=0

# Function to clean up all processes
cleanup() {
    if [ "$CLEANUP_IN_PROGRESS" -eq 1 ]; then
        log "Cleanup already in progress, skipping redundant call."
        return
    fi
    CLEANUP_IN_PROGRESS=1
    log "Stopping all services (invoked by cleanup function)..."

    # Robustly stop gpsd
    log "Forcefully stopping gpsd service..."
    systemctl --user stop gpsd.socket > /dev/null 2>&1 || true
    systemctl --user stop gpsd > /dev/null 2>&1 || true
    sleep 1 # Give services a moment
    killall gpsd gpsdctl > /dev/null 2>&1 || true # Suppress errors if not found
    log "gpsd stop sequence complete."
    
    # First, try to stop Kismet using its PID file
    if [ -f "$KISMET_PID_FILE" ]; then
        KISMET_PID=$(cat "$KISMET_PID_FILE")
        # Check if KISMET_PID is a number and process exists
        if [ -n "$KISMET_PID" ] && [ "$KISMET_PID" -eq "$KISMET_PID" ] 2>/dev/null && check_process "$KISMET_PID"; then
            log "Stopping Kismet (PID: $KISMET_PID)..."
            kill -TERM "$KISMET_PID" 2>/dev/null
            sleep 2
            if check_process "$KISMET_PID"; then
                log "Kismet still running, forcing kill..."
                kill -KILL "$KISMET_PID" 2>/dev/null
            fi
        fi
        rm -f "$KISMET_PID_FILE"
    fi
    
    # Then stop all other processes from the main PID file
    if [ -f "$PID_FILE" ]; then
        TMP_PID_FILE=$(mktemp)
        if [ -f "$PID_FILE" ]; then 
            cp "$PID_FILE" "$TMP_PID_FILE"
        fi
        
        while read -r pid; do
            if [ -n "$pid" ] && [ "$pid" -eq "$pid" ] 2>/dev/null && check_process "$pid"; then
                log "Stopping process $pid..."
                kill -TERM "$pid" 2>/dev/null
                sleep 1
                if check_process "$pid"; then
                    log "Process $pid still running, forcing kill..."
                    kill -KILL "$pid" 2>/dev/null
                fi
            fi
        done < "$TMP_PID_FILE"
        rm -f "$TMP_PID_FILE" 
        rm -f "$PID_FILE" 
    fi
    
    # Final cleanup of any remaining Kismet processes
    pkill -f "kismet" 2>/dev/null
    
    log "All services stopped (cleanup function complete)."
    CLEANUP_IN_PROGRESS=0
}
        
# Function to handle trap without recursion
handle_trap() {
    local EXIT_CODE=$?
    log "TRAP: Script exiting with code $EXIT_CODE. Running cleanup..."
    cleanup
    log "TRAP: Cleanup finished. Final exit with $EXIT_CODE."
    trap - INT TERM EXIT  # Remove the trap to prevent recursion
    exit $EXIT_CODE
}
    
trap 'handle_trap' INT TERM EXIT

touch "$LOG_FILE" 2>/dev/null || { echo "FATAL: Cannot create log file $LOG_FILE"; exit 1; }
> "$PID_FILE" || { echo "FATAL: Cannot create/clear PID file $PID_FILE"; exit 1; }

> "$LOG_FILE" 
rm -f "$KISMET_PID_FILE"

log "======== Starting gps_kismet_wigle.sh ========"

setup_kismet_config() {
    log "Setting up Kismet configuration..."
    mkdir -p ~/.kismet
        cat > ~/.kismet/kismet_site.conf << EOF
httpd_username=admin
httpd_password=admin
httpd_autologin=true
source=$WIRELESS_INTERFACE:name=$WIRELESS_INTERFACE,type=linuxwifi,hop=true,channel_hop_speed=5/sec
enable_datasource=$WIRELESS_INTERFACE
allowed_interfaces=$WIRELESS_INTERFACE,${WIRELESS_INTERFACE}mon
# GPS configuration
gps=gpsd:host=localhost,port=2947,reconnect=true,reconnect_wait=5
gps_quit_on_error=false
gps_retry=true
gps_retry_time=30
EOF
    chmod 600 ~/.kismet/kismet_site.conf
    log "Kismet configuration updated"
}

WIGLETOTAK_DIR="${WIGLETOTAK_DIR:-/home/pi/projects/stinkster_malone/stinkster/src/wigletotak}/WigleToTAK/TheStinkToTAK"
WIGLETOTAK_PORT=6969

if [ -n "$1" ]; then
    WIGLETOTAK_DIR="$1"
fi

if [ -n "$2" ]; then
    WIGLETOTAK_PORT="$2"
fi

setup_kismet_config

log "Attempting to (re)start gpsd service..."
systemctl --user stop gpsd.socket > /dev/null 2>&1 || true
systemctl --user stop gpsd > /dev/null 2>&1 || true
sleep 1
killall gpsd gpsdctl > /dev/null 2>&1 || true
log "Attempting to start gpsd socket and service..."
systemctl --user start gpsd.socket 2>/dev/null || systemctl start gpsd.socket 2>/dev/null || true
systemctl --user start gpsd 2>/dev/null || systemctl start gpsd 2>/dev/null || true
sleep 5 
log "gpsd start sequence initiated."

log "Checking gpsd status..."
if ! systemctl is-active --quiet gpsd; then
    log "ERROR: gpsd service is not active after attempting start. Forcing gpsd restart."
    killall -9 gpsd gpsdctl > /dev/null 2>&1 || true
    rm -f /var/run/gpsd.sock 2>/dev/null || true
    systemctl --user restart gpsd.socket 2>/dev/null || systemctl restart gpsd.socket 2>/dev/null || true
    systemctl --user restart gpsd 2>/dev/null || systemctl restart gpsd 2>/dev/null || true
    sleep 5 
    if ! systemctl is-active --quiet gpsd; then
        log "ERROR: gpsd service STILL not active after second attempt."
        log "WARNING: Continuing without gpsd. Kismet and WigleToTAK may not have GPS data."
        # exit 1
    fi
    log "gpsd is active after second attempt."
fi

if ! gpspipe -w -n 1 > /dev/null 2>&1; then
    log "ERROR: gpsd is not responding via gpspipe after (re)start. Forcing another gpsd restart."
    killall -9 gpsd gpsdctl > /dev/null 2>&1 || true
    rm -f /var/run/gpsd.sock 2>/dev/null || true
    systemctl --user restart gpsd.socket 2>/dev/null || systemctl restart gpsd.socket 2>/dev/null || true
    systemctl --user restart gpsd 2>/dev/null || systemctl restart gpsd 2>/dev/null || true
    sleep 3 
    if ! gpspipe -w -n 1 > /dev/null 2>&1; then
        log "ERROR: gpsd STILL not responding via gpspipe after multiple restart attempts."
        log "WARNING: Continuing without gpsd. Kismet and WigleToTAK may not have GPS data."
        # exit 1
    fi
    log "gpsd responded via gpspipe after multiple restart attempts."
fi
log "gpsd is running and responding."

log "Starting cgps..."
log "Current environment for cgps:"
env | grep -E 'DISPLAY|XAUTHORITY|TERM|PATH' >> "$LOG_FILE"
    
# Ensure gpsd has a GPS device configured
log "Checking GPS device configuration..."
    
# First, check what devices gpsd is using (with timeout to prevent hanging)
GPSD_DEVICES=$(timeout 2 gpspipe -w -n 3 2>/dev/null | grep -o '"path":"[^"]*"' | cut -d'"' -f4 | head -1 || true)
if [ -n "$GPSD_DEVICES" ]; then
    log "gpsd is configured with devices: $GPSD_DEVICES"
else
    log "No devices configured in gpsd, searching for GPS devices..."
    
    # Stop gpsd to reconfigure it
    systemctl --user stop gpsd 2>/dev/null || systemctl stop gpsd 2>/dev/null || true
    sleep 1
    
    # Try common GPS device paths
    GPS_DEVICE=""
    for device in /dev/ttyUSB0 /dev/ttyACM0 /dev/ttyAMA0; do
        if [ -e "$device" ]; then
            log "Found potential GPS device at $device"
            # Test if it's actually a GPS by checking for NMEA data at different baud rates
            GPS_FOUND=false
            for baud in 4800 9600 38400 57600 115200; do
                log "Testing $device at ${baud} baud..."
                stty -F "$device" "$baud" 2>/dev/null || continue
                # Give GPS time to start outputting data after baud rate change
                sleep 1
                # Try multiple times with longer timeout for GPS startup
                for attempt in 1 2 3; do
                    if timeout 3 cat "$device" 2>/dev/null | grep -q '^\$G[PNLR][A-Z]\{3\}'; then
                        log "Confirmed GPS device at $device with ${baud} baud (NMEA data detected on attempt $attempt)"
                        GPS_DEVICE="$device"
                        GPS_BAUD="$baud"
                        GPS_FOUND=true
                        break 2
                    fi
                    if [ $attempt -lt 3 ]; then
                        log "No NMEA data on attempt $attempt, retrying..."
                        sleep 1
                    fi
                done
            done
            
            if [ "$GPS_FOUND" = "true" ]; then
                break
            else
                log "Device $device exists but no NMEA data detected at any common baud rate"
            fi
        fi
    done
    
    if [ -n "$GPS_DEVICE" ]; then
        # Configure gpsd with the found device
        log "Configuring gpsd with device $GPS_DEVICE"
        # Try to configure gpsd (may need sudo for /etc/default/gpsd)
        if [ -w /etc/default/gpsd ]; then
            echo "DEVICES=\"$GPS_DEVICE\"" > /etc/default/gpsd
            echo "GPSD_OPTIONS=\"-n\"" >> /etc/default/gpsd
            echo "START_DAEMON=\"true\"" >> /etc/default/gpsd
            echo "USBAUTO=\"true\"" >> /etc/default/gpsd
        else
            log "WARNING: Cannot write to /etc/default/gpsd - gpsd configuration may need manual setup"
        fi
        
        # Restart gpsd with new configuration
        systemctl --user daemon-reload 2>/dev/null || systemctl daemon-reload 2>/dev/null || true
        systemctl --user start gpsd 2>/dev/null || systemctl start gpsd 2>/dev/null || true
        sleep 3
        
        # Verify gpsd is using the device
        if ! gpspipe -w -n 1 2>/dev/null | grep -q "$GPS_DEVICE"; then
            log "WARNING: gpsd may not be using $GPS_DEVICE correctly"
        fi
    else
        log "WARNING: No GPS device found or no NMEA data detected"
    fi
fi

# Start cgps with retry logic
MAX_CGPS_RETRIES=3
CGPS_RETRY=0
while [ $CGPS_RETRY -lt $MAX_CGPS_RETRIES ]; do
    /usr/bin/cgps > "${LOG_DIR}/cgps.log" 2>&1 &
    CGPS_PID=$!
    sleep 3
    
    if check_process "$CGPS_PID"; then
        break
    else
        log "cgps failed to start (attempt $((CGPS_RETRY + 1))/$MAX_CGPS_RETRIES)"
        CGPS_RETRY=$((CGPS_RETRY + 1))
        if [ $CGPS_RETRY -lt $MAX_CGPS_RETRIES ]; then
            log "Restarting gpsd before retry..."
            systemctl --user restart gpsd 2>/dev/null || systemctl restart gpsd 2>/dev/null || true
            sleep 2
        fi
    fi
done  

if ! check_process "$CGPS_PID"; then
    log "ERROR: Failed to start cgps (PID check failed for $CGPS_PID)"
    log "Checking cgps.log for errors..."
    if [ -f "${LOG_DIR}/cgps.log" ]; then
        cat "${LOG_DIR}/cgps.log" >> "$LOG_FILE"
    else
        log "cgps.log not found."
    fi
    exit 1 
fi

if ! check_process_by_name "cgps"; then
    log "ERROR: cgps process not found by name (PID was $CGPS_PID). cgps might have exited immediately."
    if [ -f "${LOG_DIR}/cgps.log" ]; then
        log "Contents of cgps.log:"
        cat "${LOG_DIR}/cgps.log" >> "$LOG_FILE"
    fi
    exit 1 
fi

log "cgps started successfully with PID: $CGPS_PID"

echo "$CGPS_PID" >> "$PID_FILE"
if ! grep -qF "$CGPS_PID" "$PID_FILE"; then 
    log "ERROR: Failed to write cgps PID ($CGPS_PID) to PID file ($PID_FILE)"
    exit 1 
fi

# Wait for GPS to get a fix before starting Kismet
log "Waiting for GPS to acquire fix before starting Kismet..."
GPS_TIMEOUT=${GPS_TIMEOUT:-30}  # Default 30 seconds timeout, configurable via environment
GPS_WAIT_COUNT=0
GPS_HAS_FIX=false

while [ $GPS_WAIT_COUNT -lt $GPS_TIMEOUT ]; do
    # Check for GPS fix using gpspipe
    # Look for TPV (Time-Position-Velocity) messages with valid lat/lon
    GPS_OUTPUT=$(timeout 2 gpspipe -w -n 5 2>/dev/null || true)
    
    # Check if we have a TPV message with lat and lon fields
    if echo "$GPS_OUTPUT" | grep -q '"class":"TPV".*"lat":[0-9.-]*,"lon":[0-9.-]*'; then
        # Extract latitude and longitude
        GPS_LAT=$(echo "$GPS_OUTPUT" | grep -o '"lat":[0-9.-]*' | head -1 | cut -d: -f2)
        GPS_LON=$(echo "$GPS_OUTPUT" | grep -o '"lon":[0-9.-]*' | head -1 | cut -d: -f2)
        
        # Check if coordinates are non-zero (0,0 means no fix)
        if [ -n "$GPS_LAT" ] && [ -n "$GPS_LON" ]; then
            if [ "$GPS_LAT" != "0" ] && [ "$GPS_LON" != "0" ] && [ "$GPS_LAT" != "0.0" ] && [ "$GPS_LON" != "0.0" ]; then
                GPS_HAS_FIX=true
                log "GPS fix acquired! Location: lat=$GPS_LAT, lon=$GPS_LON"
                break
            fi
        fi
    fi
    
    # Also check for valid NMEA sentences (as backup method)
    if ! $GPS_HAS_FIX && echo "$GPS_OUTPUT" | grep -q '"class":"TPV".*"mode":[23]'; then
        # mode 2 = 2D fix, mode 3 = 3D fix
        GPS_MODE=$(echo "$GPS_OUTPUT" | grep -o '"mode":[0-9]' | head -1 | cut -d: -f2)
        if [ "$GPS_MODE" = "2" ] || [ "$GPS_MODE" = "3" ]; then
            GPS_HAS_FIX=true
            log "GPS fix acquired! Mode: ${GPS_MODE}D fix"
            break
        fi
    fi
    
    # Provide progress feedback
    if [ $((GPS_WAIT_COUNT % 5)) -eq 0 ]; then
        log "Waiting for GPS fix... ($GPS_WAIT_COUNT/$GPS_TIMEOUT seconds)"
        
        # Log GPS status for debugging
        if echo "$GPS_OUTPUT" | grep -q '"class":"SKY".*"satellites"'; then
            SAT_COUNT=$(echo "$GPS_OUTPUT" | grep -o '"satellites":\[[^]]*\]' | grep -o '"used":true' | wc -l)
            log "GPS satellites in use: $SAT_COUNT"
        fi
    fi
    
    GPS_WAIT_COUNT=$((GPS_WAIT_COUNT + 1))
    sleep 1
done

if ! $GPS_HAS_FIX; then
    log "WARNING: GPS fix not acquired after $GPS_TIMEOUT seconds."
    log "Continuing to start Kismet without GPS fix. GPS data may become available later."
    log "To increase timeout, set GPS_TIMEOUT environment variable (e.g., GPS_TIMEOUT=60)"
else
    log "GPS is ready with valid position data."
    
    # Add stabilization period after GPS fix
    log "Waiting 10 seconds for GPS to stabilize..."
    GPS_STABILIZATION_TIME=${GPS_STABILIZATION_TIME:-10}  # Default 10 seconds
    
    # Simple wait without continuous checking to avoid blocking the socket
    sleep $GPS_STABILIZATION_TIME
    
    log "GPS stabilization complete"
fi

log "Starting Kismet on $WIRELESS_INTERFACE..."
    
# Pre-flight checks for Kismet
log "Performing pre-flight checks for Kismet..."
    
# Check if wireless interface exists
if ! ip link show "$WIRELESS_INTERFACE" > /dev/null 2>&1; then
    log "ERROR: Network interface $WIRELESS_INTERFACE not found"
    exit 1
fi
    
# Check if interface supports monitor mode
if ! iw list | grep -q "monitor"; then
    log "WARNING: No interfaces appear to support monitor mode"
fi
    
# Kill any existing Kismet processes (but not this script)
log "Checking for existing Kismet processes..."
KISMET_PIDS=""
for pid in $(pgrep -f "kismet" 2>/dev/null || true); do
    # Skip our own PID and any process containing our script name
    if [ "$pid" != "$$" ] && ! ps -p "$pid" -o cmd= 2>/dev/null | grep -q "gps_kismet_wigle"; then
        KISMET_PIDS="$KISMET_PIDS $pid"
    fi
done
    
if [ -n "$KISMET_PIDS" ]; then
    log "Found existing Kismet processes:$KISMET_PIDS, killing them..."
    for pid in $KISMET_PIDS; do
        kill -TERM "$pid" 2>/dev/null || true
    done
    sleep 2
    # Force kill if still running
    for pid in $KISMET_PIDS; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done
    log "Finished killing Kismet processes"
else
    log "No existing Kismet processes found"
fi
    
# Check available memory
AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')
if [ "$AVAILABLE_MEM" -lt 100 ]; then
    log "WARNING: Low available memory: ${AVAILABLE_MEM}MB"
fi

# Create kismet data directory if it doesn't exist
mkdir -p "$KISMET_DATA_DIR"
    
if [ -x "${STINKSTER_ROOT:-/home/pi/projects/stinkster_malone/stinkster}/src/scripts/start_kismet.sh" ]; then 
    log "Found start_kismet.sh script, executing with KISMET_DATA_DIR=$KISMET_DATA_DIR and WIRELESS_INTERFACE=$WIRELESS_INTERFACE..."
    # Export variables so child script can use them
    export KISMET_DATA_DIR
    export WIRELESS_INTERFACE
    nohup "${STINKSTER_ROOT:-/home/pi/projects/stinkster_malone/stinkster}/src/scripts/start_kismet.sh" > "${LOG_DIR}/kismet.log" 2>&1 &
    KISMET_SCRIPT_PID=$! 
    log "start_kismet.sh launched with PID $KISMET_SCRIPT_PID. Waiting for Kismet actual PID..."
    sleep 10  # Increased wait time for Kismet to fully start  
    
    if [ -f "$KISMET_PID_FILE" ]; then 
        KISMET_PID_VALUE=$(cat "$KISMET_PID_FILE")
        if [ -n "$KISMET_PID_VALUE" ] && [ "$KISMET_PID_VALUE" -eq "$KISMET_PID_VALUE" ] 2>/dev/null && check_process "$KISMET_PID_VALUE"; then
            echo "$KISMET_PID_VALUE" >> "$PID_FILE"
            log "Kismet started with PID: $KISMET_PID_VALUE"
        else
            log "ERROR: Kismet process (PID '$KISMET_PID_VALUE' from file $KISMET_PID_FILE) not running or PID is invalid after start"
            log "Checking kismet.log for errors..."
            if [ -f "${LOG_DIR}/kismet.log" ]; then 
                cat "${LOG_DIR}/kismet.log" >> "$LOG_FILE"
            fi
            exit 1 
        fi
    else
        log "ERROR: Kismet PID file ($KISMET_PID_FILE) not created by start_kismet.sh (launcher PID $KISMET_SCRIPT_PID)."
        log "Checking if start_kismet.sh script (PID $KISMET_SCRIPT_PID) is still running..."
        if ! check_process "$KISMET_SCRIPT_PID"; then
            log "ERROR: start_kismet.sh (PID $KISMET_SCRIPT_PID) also seems to have exited prematurely."
        else
            log "start_kismet.sh (PID $KISMET_SCRIPT_PID) is still running, but Kismet PID file wasn't created."
        fi
        log "Checking kismet.log for errors..."
        if [ -f "${LOG_DIR}/kismet.log" ]; then 
            cat "${LOG_DIR}/kismet.log" >> "$LOG_FILE"
        fi
        exit 1 
    fi
else
    log "ERROR: ${STINKSTER_ROOT:-/home/pi/projects/stinkster_malone/stinkster}/src/scripts/start_kismet.sh not found or not executable"
    exit 1 
fi

log "Kismet startup initiated. Waiting for Kismet to initialize (15 seconds)..."
sleep 15
log "Kismet initialization wait complete. Proceeding to WigleToTAK."


log "Starting WigleToTAK..."

# Check if port 8000 is already in use (Node.js WigleToTAK may be running)
if netstat -tlnp 2>/dev/null | grep -q ":8000 "; then
    log "Port 8000 is already in use. Skipping Python WigleToTAK startup (Node.js version may be running)."
    log "WigleToTAK functionality is available via Node.js server on port 8000."
else
    if [ -x "$WIGLETOTAK_DIR/WigleToTak2.py" ]; then
        log "Starting Python WigleToTAK..."
    cd "$WIGLETOTAK_DIR" || { log "ERROR: Failed to cd to $WIGLETOTAK_DIR"; exit 1; }
    
    # Create a virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        log "Creating Python virtual environment for WigleToTAK..."
        python3 -m venv venv
        if [ $? -ne 0 ]; then
            log "ERROR: Failed to create virtual environment."
            exit 1
        fi
        log "Activating virtual environment and installing requirements..."
        # shellcheck disable=SC1091
        . venv/bin/activate
        pip install -r requirements.txt
        if [ $? -ne 0 ]; then
            log "ERROR: Failed to install requirements in virtual environment."
            deactivate
            exit 1
        fi
        deactivate # Deactivate after setup, will be activated again for running
        log "Virtual environment setup complete."
    fi

    # Activate virtual environment and run WigleToTAK
    # shellcheck disable=SC1091
    . venv/bin/activate
    
    nohup python3 WigleToTak2.py > "${LOG_DIR}/wigletotak.log" 2>&1 &
    WIGLE_PID=$!
    sleep 5  # Give WigleToTAK a moment to start
    
    # Deactivate virtual environment
    deactivate

    if ! check_process "$WIGLE_PID"; then
        log "ERROR: Failed to start WigleToTAK (PID check failed for $WIGLE_PID)"
        log "Checking wigletotak.log for errors..."
        if [ -f "${LOG_DIR}/wigletotak.log" ]; then 
            cat "${LOG_DIR}/wigletotak.log" >> "$LOG_FILE"
        fi
        exit 1 # Ensuring script exits if WigleToTAK truly fails early
    fi
    
    if ! ps -p "$WIGLE_PID" -o cmd= | grep -q "WigleToTak2.py"; then
        log "ERROR: Process $WIGLE_PID is not running WigleToTak2.py. Command was: $(ps -p "$WIGLE_PID" -o cmd=)"
        log "Checking wigletotak.log for errors..."
        if [ -f "${LOG_DIR}/wigletotak.log" ]; then 
            cat "${LOG_DIR}/wigletotak.log" >> "$LOG_FILE"
        fi
        exit 1 # Ensuring script exits if command line is wrong
    fi
    
        echo "$WIGLE_PID" >> "$PID_FILE" # Keep adding to the general PID file
        echo "$WIGLE_PID" > "${LOG_DIR}/wigletotak.specific.pid" # Create specific PID file
        log "WigleToTAK started with PID: $WIGLE_PID (specific PID file created at ${LOG_DIR}/wigletotak.specific.pid)"
    else
        log "ERROR: WigleToTak2.py not found at $WIGLETOTAK_DIR/WigleToTak2.py"
        exit 1 
    fi
fi

echo "$$" >> "$PID_FILE"
log "Main script (gps_kismet_wigle.sh) PID: $$"

log "======== All services started! Monitoring processes. Press Ctrl+C to stop all services. ========"
log "DEBUG: Status after 'All services started' log: $?"

# Track critical processes
CRITICAL_PROCESSES=("cgps" "kismet" "python3.*WigleToTak2")

while true; do
    log "DEBUG: Monitoring loop entered." # Simple log to confirm loop entry
    if [ -f "$PID_FILE" ]; then 
        mapfile -t pids_to_check < "$PID_FILE"
        if [ ${#pids_to_check[@]} -eq 0 ]; then 
            log "WARNING: PID_FILE is empty. Waiting a moment..."
            sleep 10 
            continue
        fi
        
        # Check specific PIDs from the PID_FILE
        processed_pids_this_cycle=() # To keep track of PIDs we've seen from the file
        for pid_to_c_raw in "${pids_to_check[@]}"; do
            # Trim leading/trailing whitespace from the raw PID string
            pid_to_c=$(echo "$pid_to_c_raw" | awk '{$1=$1};1') # awk way to trim

            if [ -z "$pid_to_c" ]; then # If empty after trimming
                log "DEBUG: Skipped empty or whitespace-only line from $PID_FILE."
                continue
            fi

            if ! [[ "$pid_to_c" =~ ^[0-9]+$ ]]; then
                log "WARNING: Non-numeric PID string found in $PID_FILE and skipped: '$pid_to_c_raw' (trimmed: '$pid_to_c')"
                continue
            fi

            # Now pid_to_c is confirmed to be a non-empty numeric string
            processed_pids_this_cycle+=("$pid_to_c")

            if [ "$pid_to_c" -eq "$$" ]; then # Check if it's the main script's PID
                # log "DEBUG: PID $pid_to_c is self, skipping." # Optional: for debugging
                continue
            fi

            if ! check_process "$pid_to_c"; then
                log "ERROR: Monitored process with PID $pid_to_c (read from $PID_FILE as '$pid_to_c_raw') has died unexpectedly."
                log "Original PIDs in file for this cycle: (${pids_to_check[*]})"
                log "Initiating script exit and cleanup due to dead PID $pid_to_c."
                exit 1 # This will trigger the EXIT trap and run cleanup
            fi
        done
        
        # Also check critical processes by name (ensures they are running, even if their PID wasn't in PID_FILE for some reason)
        for proc_pattern in "${CRITICAL_PROCESSES[@]}"; do
            if ! pgrep -f "$proc_pattern" > /dev/null; then
                log "CRITICAL: Process matching '$proc_pattern' not found running!"
                log "Initiating script exit and cleanup via TRAP."
                exit 1
            fi
        done
    else
        log "CRITICAL: PID_FILE ($PID_FILE) not found. This should not happen. Initiating script exit and cleanup via TRAP."
        exit 1 
    fi
    sleep 5
done

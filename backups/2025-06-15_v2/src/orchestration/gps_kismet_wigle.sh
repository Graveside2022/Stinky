#!/bin/bash
set -x # Force full command tracing

# Enable debug mode if DEBUG environment variable is set
# if [ -n "$DEBUG" ]; then
# set -x  # Print commands as they execute
# fi

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
    sudo systemctl stop gpsd.socket > /dev/null 2>&1
    sudo systemctl stop gpsd > /dev/null 2>&1
    sleep 1 # Give services a moment
    sudo killall gpsd gpsdctl > /dev/null 2>&1 # Suppress errors if not found
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
source=wlan2:name=wlan2,type=linuxwifi,hop=true,channel_hop_speed=5/sec
enable_datasource=wlan2
allowed_interfaces=wlan2,wlan2mon
# GPS configuration
gps=gpsd:host=localhost,port=2947,reconnect=true,reconnect_wait=5
gps_quit_on_error=false
gps_retry=true
gps_retry_time=30
EOF
    chmod 600 ~/.kismet/kismet_site.conf
    log "Kismet configuration updated"
}

WIGLETOTAK_DIR="${WIGLETOTAK_DIR:-/home/pi/projects/stinkster/wigletotak}/WigleToTAK/TheStinkToTAK"
WIGLETOTAK_PORT=6969

if [ -n "$1" ]; then
    WIGLETOTAK_DIR="$1"
fi

if [ -n "$2" ]; then
    WIGLETOTAK_PORT="$2"
fi

setup_kismet_config

log "Attempting to (re)start gpsd service..."
sudo systemctl stop gpsd.socket > /dev/null 2>&1
sudo systemctl stop gpsd > /dev/null 2>&1
sleep 1
sudo killall gpsd gpsdctl > /dev/null 2>&1 
log "Attempting to start gpsd socket and service..."
sudo systemctl start gpsd.socket
sudo systemctl start gpsd
sleep 5 
log "gpsd start sequence initiated."

log "Checking gpsd status..."
if ! systemctl is-active --quiet gpsd; then
    log "ERROR: gpsd service is not active after attempting start. Forcing gpsd restart."
    sudo killall -9 gpsd gpsdctl > /dev/null 2>&1
    sudo rm -f /var/run/gpsd.sock 
    sudo systemctl restart gpsd.socket
    sudo systemctl restart gpsd
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
    sudo killall -9 gpsd gpsdctl > /dev/null 2>&1
    sudo rm -f /var/run/gpsd.sock 
    sudo systemctl restart gpsd.socket
    sudo systemctl restart gpsd
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
    
# First, check what devices gpsd is using
GPSD_DEVICES=$(gpspipe -w -n 1 2>/dev/null | grep -o '"path":"[^"]*"' | cut -d'"' -f4 || true)
if [ -n "$GPSD_DEVICES" ]; then
    log "gpsd is configured with devices: $GPSD_DEVICES"
else
    log "No devices configured in gpsd, searching for GPS devices..."
    
    # Stop gpsd to reconfigure it
    sudo systemctl stop gpsd
    sleep 1
    
    # Try common GPS device paths
    GPS_DEVICE=""
    for device in /dev/ttyUSB0 /dev/ttyACM0 /dev/ttyAMA0; do
        if [ -e "$device" ]; then
            log "Found potential GPS device at $device"
            # Test if it's actually a GPS by checking for NMEA data at different baud rates
            GPS_FOUND=false
            for baud in 9600 4800 38400 57600 115200; do
                log "Testing $device at ${baud} baud..."
                sudo stty -F "$device" "$baud" 2>/dev/null || continue
                if timeout 2 cat "$device" 2>/dev/null | grep -q '^\$G[PNLR][A-Z]\{3\}'; then
                    log "Confirmed GPS device at $device with ${baud} baud (NMEA data detected)"
                    GPS_DEVICE="$device"
                    GPS_BAUD="$baud"
                    GPS_FOUND=true
                    break
                fi
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
        echo "DEVICES=\"$GPS_DEVICE\"" | sudo tee /etc/default/gpsd > /dev/null
        echo "GPSD_OPTIONS=\"-n\"" | sudo tee -a /etc/default/gpsd > /dev/null
        echo "START_DAEMON=\"true\"" | sudo tee -a /etc/default/gpsd > /dev/null
        echo "USBAUTO=\"true\"" | sudo tee -a /etc/default/gpsd > /dev/null
        
        # Restart gpsd with new configuration
        sudo systemctl daemon-reload
        sudo systemctl start gpsd
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
    /usr/bin/cgps > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log 2>&1 &
    CGPS_PID=$!
    sleep 3
    
    if check_process "$CGPS_PID"; then
        break
    else
        log "cgps failed to start (attempt $((CGPS_RETRY + 1))/$MAX_CGPS_RETRIES)"
        CGPS_RETRY=$((CGPS_RETRY + 1))
        if [ $CGPS_RETRY -lt $MAX_CGPS_RETRIES ]; then
            log "Restarting gpsd before retry..."
            sudo systemctl restart gpsd
            sleep 2
        fi
    fi
done  

if ! check_process "$CGPS_PID"; then
    log "ERROR: Failed to start cgps (PID check failed for $CGPS_PID)"
    log "Checking cgps.log for errors..."
    if [ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log" ]; then
        cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log" >> "$LOG_FILE"
    else
        log "cgps.log not found."
    fi
    exit 1 
fi

if ! check_process_by_name "cgps"; then
    log "ERROR: cgps process not found by name (PID was $CGPS_PID). cgps might have exited immediately."
    if [ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log" ]; then
        log "Contents of cgps.log:"
        cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log" >> "$LOG_FILE"
    fi
    exit 1 
fi

log "cgps started successfully with PID: $CGPS_PID"

echo "$CGPS_PID" >> "$PID_FILE"
if ! grep -qF "$CGPS_PID" "$PID_FILE"; then 
    log "ERROR: Failed to write cgps PID ($CGPS_PID) to PID file ($PID_FILE)"
    exit 1 
fi

log "Starting Kismet on wlan2..."
    
# Pre-flight checks for Kismet
log "Performing pre-flight checks for Kismet..."
    
# Check if wlan2 exists
if ! ip link show wlan2 > /dev/null 2>&1; then
    log "ERROR: Network interface wlan2 not found"
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
    
if [ -x "/home/pi/projects/stinkster/scripts/start_kismet.sh" ]; then 
    log "Found start_kismet.sh script, executing..."
    nohup /home/pi/projects/stinkster/scripts/start_kismet.sh > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log 2>&1 &
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
            if [ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log" ]; then 
                cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log" >> "$LOG_FILE"
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
        if [ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log" ]; then 
            cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log" >> "$LOG_FILE"
        fi
        exit 1 
    fi
else
    log "ERROR: /home/pi/projects/stinkster/scripts/start_kismet.sh not found or not executable"
    exit 1 
fi

log "Kismet startup initiated. Waiting for Kismet to initialize (15 seconds)..."
sleep 15
log "Kismet initialization wait complete. Proceeding to WigleToTAK."


log "Starting WigleToTAK..."
if [ -x "$WIGLETOTAK_DIR/WigleToTak2.py" ]; then
    log "Starting WigleToTAK..."
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
    
    nohup python3 WigleToTak2.py > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log 2>&1 &
    WIGLE_PID=$!
    sleep 5  # Give WigleToTAK a moment to start
    
    # Deactivate virtual environment
    deactivate

    if ! check_process "$WIGLE_PID"; then
        log "ERROR: Failed to start WigleToTAK (PID check failed for $WIGLE_PID)"
        log "Checking wigletotak.log for errors..."
        if [ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log" ]; then 
            cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log" >> "$LOG_FILE"
        fi
        exit 1 # Ensuring script exits if WigleToTAK truly fails early
    fi
    
    if ! ps -p "$WIGLE_PID" -o cmd= | grep -q "WigleToTak2.py"; then
        log "ERROR: Process $WIGLE_PID is not running WigleToTak2.py. Command was: $(ps -p "$WIGLE_PID" -o cmd=)"
        log "Checking wigletotak.log for errors..."
        if [ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log" ]; then 
            cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log" >> "$LOG_FILE"
        fi
        exit 1 # Ensuring script exits if command line is wrong
    fi
    
    echo "$WIGLE_PID" >> "$PID_FILE" # Keep adding to the general PID file
    echo "$WIGLE_PID" > "${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.specific.pid" # Create specific PID file
    log "WigleToTAK started with PID: $WIGLE_PID (specific PID file created at ${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.specific.pid)"
else
    log "ERROR: WigleToTak2.py not found at $WIGLETOTAK_DIR/WigleToTak2.py"
    exit 1 
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

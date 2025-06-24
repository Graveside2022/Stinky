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
    sleep 0.5 # Reduced from 1
    sudo killall gpsd gpsdctl > /dev/null 2>&1 # Suppress errors if not found
    log "gpsd stop sequence complete."
    
    # First, try to stop Kismet using its PID file
    if [ -f "$KISMET_PID_FILE" ]; then
        KISMET_PID=$(cat "$KISMET_PID_FILE")
        # Check if KISMET_PID is a number and process exists
        if [ -n "$KISMET_PID" ] && [ "$KISMET_PID" -eq "$KISMET_PID" ] 2>/dev/null && check_process "$KISMET_PID"; then
            log "Stopping Kismet (PID: $KISMET_PID)..."
            kill -TERM "$KISMET_PID" 2>/dev/null
            sleep 1 # Reduced from 2
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
                sleep 0.5 # Reduced from 1
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
>"$PID_FILE" || { echo "FATAL: Cannot create/clear PID file $PID_FILE"; exit 1; }

>"$LOG_FILE" 
rm -f "$KISMET_PID_FILE"

log "======== Starting gps_kismet_wigle_fast.sh (OPTIMIZED) ========"

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
gps=gpsd:host=localhost,port=2947,reconnect=true
gps_quit_on_error=false
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

# Setup Kismet config in parallel
setup_kismet_config &

# Start gpsd quickly
log "Starting gpsd service..."
sudo systemctl stop gpsd.socket gpsd > /dev/null 2>&1
sudo killall gpsd gpsdctl > /dev/null 2>&1 
sudo systemctl start gpsd.socket gpsd

# Quick check if gpsd is responding (reduced timeout)
sleep 1
if ! timeout 1 gpspipe -w -n 1 > /dev/null 2>&1; then
    log "gpsd not responding, attempting quick restart..."
    sudo systemctl restart gpsd
    sleep 1
fi

# Start cgps immediately without extensive GPS device checking
log "Starting cgps..."
/usr/bin/cgps > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log 2>&1 &
CGPS_PID=$!
log "cgps started with PID: $CGPS_PID"
echo "$CGPS_PID" >> "$PID_FILE"

# Pre-flight checks for Kismet (in parallel)
log "Starting Kismet pre-flight checks..."
(
    # Check if wlan2 exists
    if ! ip link show wlan2 > /dev/null 2>&1; then
        log "ERROR: Network interface wlan2 not found"
        exit 1
    fi
    
    # Kill any existing Kismet processes
    KISMET_PIDS=""
    for pid in $(pgrep -f "kismet" 2>/dev/null || true); do
        if [ "$pid" != "$$" ] && ! ps -p "$pid" -o cmd= 2>/dev/null | grep -q "gps_kismet_wigle"; then
            KISMET_PIDS="$KISMET_PIDS $pid"
        fi
    done
    
    if [ -n "$KISMET_PIDS" ]; then
        log "Killing existing Kismet processes:$KISMET_PIDS"
        for pid in $KISMET_PIDS; do
            kill -TERM "$pid" 2>/dev/null || true
        done
    fi
) &

# Start Kismet immediately using our wrapper
if [ -x "/home/pi/projects/stinkster/start_kismet_background.sh" ]; then 
    log "Starting Kismet..."
    /home/pi/projects/stinkster/start_kismet_background.sh
    log "Kismet launcher completed"
else
    log "ERROR: /home/pi/projects/stinkster/start_kismet_background.sh not found or not executable"
    exit 1 
fi

# Start WigleToTAK preparation in parallel
log "Preparing WigleToTAK environment..."
(
    if [ -f "$WIGLETOTAK_DIR/WigleToTak2.py" ]; then 
        cd "$WIGLETOTAK_DIR" || exit 1
        
        if [ ! -d "venv" ]; then 
            log "Creating virtual environment..."
            /usr/bin/python3 -m venv venv || exit 1
        fi
        
        if [ -f "requirements.txt" ] && [ ! -f "venv/.deps_installed" ]; then 
            log "Installing requirements..."
            venv/bin/pip install -r requirements.txt && touch venv/.deps_installed
        fi
    fi
) &
WIGLE_PREP_PID=$!

# Wait for Kismet to create its PID file (reduced wait)
log "Waiting for Kismet to initialize..."
KISMET_WAIT=0
KISMET_STARTED=false
while [ $KISMET_WAIT -lt 15 ]; do
    if [ -f "$KISMET_PID_FILE" ]; then 
        KISMET_PID_VALUE=$(cat "$KISMET_PID_FILE")
        if [ -n "$KISMET_PID_VALUE" ] && check_process "$KISMET_PID_VALUE"; then
            echo "$KISMET_PID_VALUE" >> "$PID_FILE"
            log "Kismet started with PID: $KISMET_PID_VALUE"
            KISMET_STARTED=true
            break
        fi
    fi
    
    # Also check if kismet process exists by name
    if pgrep -f "kismet.*no-daemonize" > /dev/null; then
        log "Kismet process detected, waiting for PID file..."
    fi
    
    sleep 1
    KISMET_WAIT=$((KISMET_WAIT + 1))
done

if [ "$KISMET_STARTED" = "false" ]; then
    log "ERROR: Kismet failed to start within 15 seconds"
    log "Checking kismet.log for errors..."
    if [ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log" ]; then
        tail -20 ${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log >> "$LOG_FILE"
    fi
    exit 1
fi

# Wait for WigleToTAK preparation to complete
wait $WIGLE_PREP_PID

# Additional wait to ensure Kismet is fully initialized before starting WigleToTAK
log "Giving Kismet additional time to fully initialize..."
sleep 5

# Start WigleToTAK
log "Starting WigleToTAK..."
if [ -f "$WIGLETOTAK_DIR/WigleToTak2.py" ]; then 
    cd "$WIGLETOTAK_DIR" || exit 1
    . venv/bin/activate || exit 1
    
    nohup venv/bin/python3 WigleToTak2.py --directory "$WIGLETOTAK_DIR" --port "$WIGLETOTAK_PORT" --flask-port 8000 > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log 2>&1 &
    WIGLE_PID=$!
    
    # Quick check if process started
    sleep 2
    if check_process "$WIGLE_PID"; then
        echo "$WIGLE_PID" >> "$PID_FILE"
        log "WigletoTAK started with PID: $WIGLE_PID"
    else
        log "ERROR: Failed to start WigleToTAK"
        exit 1 
    fi
else
    log "ERROR: WigleToTak2.py not found"
    exit 1 
fi

echo "$$" >> "$PID_FILE"
log "Main script PID: $$"

log "======== All services started in ~15 seconds! Monitoring processes... ========"

# Track critical processes
CRITICAL_PROCESSES=("cgps" "kismet" "python3.*WigleToTak2")

while true; do
    if [ -f "$PID_FILE" ]; then 
        mapfile -t pids_to_check < "$PID_FILE"
        if [ ${#pids_to_check[@]} -eq 0 ]; then 
            log "WARNING: PID_FILE is empty. Waiting..."
            sleep 5
            continue
        fi
        
        # Check specific PIDs
        for pid_to_c in "${pids_to_check[@]}"; do
            if [ -n "$pid_to_c" ] && [ "$pid_to_c" -eq "$pid_to_c" ] 2>/dev/null && ! check_process "$pid_to_c"; then 
                if [ "$pid_to_c" -eq "$$" ]; then
                    continue  # Skip checking our own PID
                fi
                
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
    else
        log "CRITICAL: PID_FILE not found."
        exit 1 
    fi
    sleep 5
done 
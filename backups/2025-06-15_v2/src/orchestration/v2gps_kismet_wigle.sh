#!/bin/bash

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

# Function to clean up all processes
cleanup() {
    log "Stopping all services..."
    
    # First, try to stop Kismet using its PID file
    if [[ -f "$KISMET_PID_FILE" ]]; then
        KISMET_PID=$(cat "$KISMET_PID_FILE")
        if check_process "$KISMET_PID"; then
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
    if [[ -f "$PID_FILE" ]]; then
        while read -r pid; do
            if check_process "$pid"; then
                log "Stopping process $pid..."
                kill -TERM "$pid" 2>/dev/null
                sleep 1
                if check_process "$pid"; then
                    log "Process $pid still running, forcing kill..."
                    kill -KILL "$pid" 2>/dev/null
                fi
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Final cleanup of any remaining Kismet processes
    pkill -f "kismet" 2>/dev/null
    
    log "All services stopped."
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM EXIT

# Ensure we can write to the log and PID files
touch "$LOG_FILE" 2>/dev/null || { echo "Cannot create log file"; exit 1; }
touch "$PID_FILE" 2>/dev/null || { echo "Cannot create PID file"; exit 1; }

# Clear PID file and log file at start
rm -f "$PID_FILE"
rm -f "$LOG_FILE"
rm -f "$KISMET_PID_FILE"

log "Starting script..."

# Set up Kismet config file to enable auto-login and set wlan2 source
setup_kismet_config() {
    log "Setting up Kismet configuration..."
    mkdir -p ~/.kismet
    cat > ~/.kismet/kismet_site.conf << EOF
httpd_username=admin
httpd_password=admin
httpd_autologin=true
source=wlan2:name=wlan2,type=linuxwifi,hop=true,channel_hop_speed=5/sec
enable_datasource=wlan2
allowed_interfaces=wlan2
EOF
    chmod 600 ~/.kismet/kismet_site.conf
    log "Kismet configuration updated"
}

# Default values for WigletoTak
WIGLETOTAK_DIR="${WIGLETOTAK_DIR:-/home/pi/projects/stinkster/wigletotak}/WigleToTAK/TheStinkToTAK"
WIGLETOTAK_PORT=6969

# Check if parameters are provided, otherwise use defaults
if [[ -n "$1" ]]; then
    WIGLETOTAK_DIR="$1"
fi

if [[ -n "$2" ]]; then
    WIGLETOTAK_PORT="$2"
fi

setup_kismet_config

# Check if gpsd is running and responding
log "Checking gpsd status..."
if ! systemctl is-active --quiet gpsd; then
    log "ERROR: gpsd service is not running"
    cleanup
    exit 1
fi

if ! gpspipe -w -n 1 > /dev/null 2>&1; then
    log "ERROR: gpsd is not responding"
    cleanup
    exit 1
fi
log "gpsd is running and responding"

# Start cgps in the background without requiring a terminal
log "Starting cgps..."
log "Current environment:"
env | grep -E 'DISPLAY|XAUTHORITY|TERM|PATH' >> "$LOG_FILE"

# Try to start cgps with full path and environment
/usr/bin/cgps > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log 2>&1 &
CGPS_PID=$!
sleep 2  # Give cgps time to start

# Check if cgps is running
if ! check_process "$CGPS_PID"; then
    log "ERROR: Failed to start cgps (PID check failed)"
    log "Checking cgps.log for errors..."
    if [[ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log" ]]; then
        cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/cgps.log" >> "$LOG_FILE"
    fi
    cleanup
    exit 1
fi

if ! check_process_by_name "cgps"; then
    log "ERROR: cgps process not found by name"
    cleanup
    exit 1
fi

log "cgps started successfully with PID: $CGPS_PID"

# Write PID to file and verify
echo "$CGPS_PID" > "$PID_FILE"
if [[ ! -f "$PID_FILE" ]]; then
    log "ERROR: Failed to create PID file"
    cleanup
    exit 1
fi

log "Starting Kismet on wlan2..."
if [[ -x "/home/pi/projects/stinkster/scripts/start_kismet.sh" ]]; then
    log "Found start_kismet.sh script"
    nohup /home/pi/projects/stinkster/scripts/start_kismet.sh > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log 2>&1 &
    KISMET_SCRIPT_PID=$!
    sleep 5  # Give Kismet time to start
    
    if [[ -f "$KISMET_PID_FILE" ]]; then
        KISMET_PID=$(cat "$KISMET_PID_FILE")
        if check_process "$KISMET_PID"; then
            echo "$KISMET_PID" >> "$PID_FILE"
            log "Kismet started with PID: $KISMET_PID"
        else
            log "ERROR: Kismet process not running after start"
            log "Checking kismet.log for errors..."
            if [[ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log" ]]; then
                cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log" >> "$LOG_FILE"
            fi
            cleanup
            exit 1
        fi
    else
        log "ERROR: Kismet PID file not created"
        cleanup
        exit 1
    fi
else
    log "ERROR: start_kismet.sh not found or not executable"
    exit 1
fi

log "Waiting for Kismet to initialize (15 seconds)..."
sleep 15

log "Starting WiGLE to TAK..."
if [[ -f "$WIGLETOTAK_DIR/WigleToTak.py" ]]; then
    log "Found WigleToTak.py"
    cd "$WIGLETOTAK_DIR" || { log "ERROR: Failed to change to WigleToTAK directory"; cleanup; exit 1; }
    
    # Create a virtual environment if it doesn't exist
    if [[ ! -d "venv" ]]; then
        log "Creating virtual environment..."
        /usr/bin/python3 -m venv venv || { log "ERROR: Failed to create virtual environment"; cleanup; exit 1; }
    fi
    
    # Activate virtual environment and install requirements
    if [[ ! -f "venv/bin/activate" ]]; then
        log "ERROR: Virtual environment activation script not found"
        cleanup
        exit 1
    fi
    
    source venv/bin/activate || { log "ERROR: Failed to activate virtual environment"; cleanup; exit 1; }
    
    if [[ -f "requirements.txt" ]]; then
        log "Installing requirements..."
        venv/bin/pip install -r requirements.txt || { log "ERROR: Failed to install requirements"; cleanup; exit 1; }
    fi
    
    # Start WigleToTak.py with proper Python path
    log "Starting WigleToTak.py..."
    nohup venv/bin/python3 WigleToTak.py --directory "$WIGLETOTAK_DIR" --port "$WIGLETOTAK_PORT" --flask-port 8000 > ${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log 2>&1 &
    WIGLE_PID=$!
    sleep 5  # Give WiGLE more time to start
    
    if ! check_process "$WIGLE_PID"; then
        log "ERROR: Failed to start WigleToTAK (PID check failed)"
        log "Checking wigletotak.log for errors..."
        if [[ -f "${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log" ]]; then
            cat "${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.log" >> "$LOG_FILE"
        fi
        cleanup
        exit 1
    fi
    
    echo "$WIGLE_PID" >> "$PID_FILE"
    log "WigleToTAK started with PID: $WIGLE_PID"
else
    log "ERROR: WigleToTak.py not found"
    cleanup
    exit 1
fi

log "All services started successfully"

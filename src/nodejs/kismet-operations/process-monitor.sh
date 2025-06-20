#!/bin/bash
# Process Monitor for Kismet Operations Center
# Ensures the service stays running without PM2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESTART_SCRIPT="$SCRIPT_DIR/restart-service.sh"
PID_FILE="/home/pi/tmp/kismet-operations-center.pid"
MONITOR_PID_FILE="/home/pi/tmp/kismet-operations-monitor.pid"
LOG_FILE="/home/pi/tmp/kismet-operations-monitor.log"
CHECK_INTERVAL=30  # Check every 30 seconds

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to check if process is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Cleanup function
cleanup() {
    log_message "Monitor stopping..."
    rm -f "$MONITOR_PID_FILE"
    exit 0
}

# Set up signal handlers
trap cleanup EXIT SIGINT SIGTERM

# Save monitor PID
echo $$ > "$MONITOR_PID_FILE"

log_message "Process monitor started (PID: $$)"
log_message "Monitoring interval: ${CHECK_INTERVAL}s"

# Main monitoring loop
while true; do
    if ! is_running; then
        log_message "Service is not running. Attempting to restart..."
        "$RESTART_SCRIPT" start >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            log_message "Service restarted successfully"
        else
            log_message "Failed to restart service"
        fi
    fi
    
    sleep "$CHECK_INTERVAL"
done
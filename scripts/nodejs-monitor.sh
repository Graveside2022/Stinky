#!/bin/bash

# Node.js Kismet Operations Center Monitor
# This script monitors and keeps the Node.js server running on port 8002

LOG_FILE="/home/pi/tmp/nodejs-monitor.log"
CHECK_INTERVAL=30
SERVER_DIR="/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations"
SERVER_PORT=8002

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if server is running
check_server() {
    # Check if port is listening
    if netstat -tlnp 2>/dev/null | grep -q ":$SERVER_PORT"; then
        # Also check if it responds
        if curl -s -f "http://localhost:$SERVER_PORT/health" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Function to start the server
start_server() {
    log "Starting Node.js Kismet Operations Center..."
    
    # Kill any existing node server.js processes first
    pkill -f "node server.js" 2>/dev/null
    sleep 2
    
    # Start the server
    cd "$SERVER_DIR"
    nohup node server.js > /home/pi/tmp/kismet-operations.log 2>&1 &
    local pid=$!
    
    log "Started Node.js server with PID: $pid"
    
    # Wait a bit for server to start
    sleep 5
    
    # Verify it started
    if check_server; then
        log "Server started successfully and responding on port $SERVER_PORT"
        return 0
    else
        log "Server failed to start properly"
        return 1
    fi
}

# Main monitoring loop
main() {
    log "Starting Node.js server monitor for Kismet Operations Center"
    
    while true; do
        if ! check_server; then
            log "WARNING: Server is not responding on port $SERVER_PORT"
            
            # Try to start it
            if start_server; then
                log "Server restarted successfully"
            else
                log "ERROR: Failed to restart server"
                
                # Check what's using the port
                log "Checking what's using port $SERVER_PORT:"
                netstat -tlnp 2>/dev/null | grep ":$SERVER_PORT" | tee -a "$LOG_FILE"
            fi
        fi
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

# Create log directory if it doesn't exist
mkdir -p /home/pi/tmp

# Handle script termination
trap 'log "Node.js monitor stopped"; exit 0' INT TERM EXIT

# Run the main function
main
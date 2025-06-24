#!/bin/bash

# WigleToTAK Node.js Startup Script
# This script manages the WigleToTAK Node.js service

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="/home/pi/tmp/wigle-to-tak-nodejs.pid"
LOG_FILE="/home/pi/tmp/wigle-to-tak-nodejs.log"

# Default values
DEFAULT_DIRECTORY="/home/pi/kismet_ops"
DEFAULT_PORT="6969"
DEFAULT_FLASK_PORT="8000"

# Parse command line arguments
DIRECTORY="${1:-$DEFAULT_DIRECTORY}"
PORT="${2:-$DEFAULT_PORT}"
FLASK_PORT="${3:-$DEFAULT_FLASK_PORT}"

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "WigleToTAK is already running with PID $OLD_PID"
        exit 1
    else
        echo "Removing stale PID file"
        rm -f "$PID_FILE"
    fi
fi

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Start the service
echo "Starting WigleToTAK Node.js service..."
echo "Directory: $DIRECTORY"
echo "TAK Port: $PORT"
echo "Web Port: $FLASK_PORT"

cd "$SCRIPT_DIR"

# Start the Node.js server with the specified arguments
nohup node server.js \
    --directory "$DIRECTORY" \
    --port "$PORT" \
    --flask-port "$FLASK_PORT" \
    > "$LOG_FILE" 2>&1 &

PID=$!
echo $PID > "$PID_FILE"

# Wait a moment to check if it started successfully
sleep 2

if ps -p $PID > /dev/null 2>&1; then
    echo "WigleToTAK started successfully with PID $PID"
    echo "Web interface available at http://localhost:$FLASK_PORT"
    echo "TAK broadcasting on port $PORT"
    echo "Logs available at: $LOG_FILE"
else
    echo "Failed to start WigleToTAK"
    rm -f "$PID_FILE"
    tail -n 20 "$LOG_FILE"
    exit 1
fi
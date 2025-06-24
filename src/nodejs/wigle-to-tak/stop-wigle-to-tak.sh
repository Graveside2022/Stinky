#!/bin/bash

# WigleToTAK Node.js Stop Script

PID_FILE="/home/pi/tmp/wigle-to-tak-nodejs.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "WigleToTAK is not running (no PID file found)"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping WigleToTAK (PID: $PID)..."
    kill "$PID"
    
    # Wait for process to stop
    for i in {1..10}; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Force kill if still running
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Force killing WigleToTAK..."
        kill -9 "$PID"
    fi
    
    rm -f "$PID_FILE"
    echo "WigleToTAK stopped"
else
    echo "WigleToTAK process not found (PID: $PID)"
    rm -f "$PID_FILE"
fi
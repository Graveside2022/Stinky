#!/bin/bash

# Mobile Kismet Operations Center Stop Script

echo "Stopping Mobile Kismet Operations Center..."

# Find and kill the mobile server process
PID=$(ps aux | grep "node server.js" | grep -v grep | awk '{print $2}')

if [ -n "$PID" ]; then
    echo "Found server process with PID: $PID"
    kill $PID
    echo "Server stopped."
else
    echo "No server process found running."
fi

# Also try to kill by port in case we missed it
lsof -ti:8889 | xargs kill 2>/dev/null

echo "Mobile server on port 8889 has been stopped."
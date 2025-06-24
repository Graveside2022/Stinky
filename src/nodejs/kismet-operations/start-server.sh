#!/bin/bash
# Start script for Kismet Operations Center Node.js server

cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations

# Kill any existing Node.js servers on port 8003
lsof -ti:8003 | xargs -r kill -9 2>/dev/null || true

# Wait for port to be released
sleep 2

# Start the server
exec node server.js
#!/bin/bash
# Start script for Kismet Operations Center Node.js server

cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations

# Kill any existing Node.js servers on port 8002
lsof -ti:8002 | xargs -r kill -9 2>/dev/null || true

# Wait for port to be released
sleep 2

# Start the server
exec node server.js
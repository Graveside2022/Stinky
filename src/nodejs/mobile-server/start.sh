#!/bin/bash

# Mobile Kismet Operations Center Start Script

echo "Starting Mobile Kismet Operations Center on port 8889..."

# Change to script directory
cd "$(dirname "$0")"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Set environment variables
export PORT=8889
export ORIGINAL_SERVER_PORT=8003
export ORIGINAL_SERVER_HOST=localhost

# Check if the original server is running
if curl -s -o /dev/null http://localhost:8003/health; then
    echo "✓ Original server is running on port 8003"
else
    echo "⚠ Warning: Original server on port 8003 is not responding"
    echo "  The mobile interface will still start but API calls may fail"
fi

# Start the server
echo "Starting server..."
npm start
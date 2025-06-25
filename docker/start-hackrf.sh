#!/bin/bash
# HackRF startup script for OpenWebRX container
set -e

# Wait for USB devices to be ready
sleep 2

# Test HackRF availability
echo "Testing HackRF availability..."
if hackrf_info > /dev/null 2>&1; then
    echo "HackRF detected successfully"
    hackrf_info
else
    echo "WARNING: HackRF not detected. Please check USB connection."
fi

# Start OpenWebRX
echo "Starting OpenWebRX with HackRF configuration..."
exec /opt/openwebrx/openwebrx.py
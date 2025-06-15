#!/bin/bash
# Simple working OpenWebRX setup for HackRF One

echo "=== Simple HackRF Docker Setup ==="

# Check HackRF
if ! lsusb | grep -q "1d50:6089"; then
    echo "ERROR: HackRF One not detected"
    exit 1
fi
echo "✓ HackRF detected"

# Stop all OpenWebRX containers
docker ps -a | grep openwebrx | awk '{print $1}' | xargs -r docker stop 2>/dev/null
docker ps -a | grep openwebrx | awk '{print $1}' | xargs -r docker rm 2>/dev/null

# Run OpenWebRX with direct config mount
echo "Starting OpenWebRX..."
docker run -d \
    --name openwebrx \
    --restart unless-stopped \
    --privileged \
    -p 8073:8073 \
    -v "$(pwd)/openwebrx-hackrf-config.json:/var/lib/openwebrx/sdrs.json" \
    --device /dev/bus/usb:/dev/bus/usb \
    jketterl/openwebrx:latest

# Wait and verify
sleep 5
if docker exec openwebrx hackrf_info > /dev/null 2>&1; then
    echo "✓ HackRF accessible in container"
fi

echo ""
echo "OpenWebRX started!"
echo "URL: http://localhost:8073"
echo "Logs: docker logs -f openwebrx"
#!/bin/bash
# Start OpenWebRX with HackRF One support
# This script ensures HackRF is properly configured and accessible

set -e

echo "=== OpenWebRX HackRF Docker Launcher ==="
echo "Starting OpenWebRX with HackRF One support..."

# Check if HackRF is connected
echo -n "Checking for HackRF device... "
if lsusb | grep -q "1d50:6089"; then
    echo "✓ Found"
    hackrf_info > /dev/null 2>&1 && echo "✓ HackRF accessible from host"
else
    echo "✗ Not found"
    echo "ERROR: HackRF One not detected. Please connect your HackRF device."
    exit 1
fi

# Stop any existing OpenWebRX containers
echo -n "Stopping existing OpenWebRX containers... "
docker stop openwebrx-hackrf 2>/dev/null || true
docker rm openwebrx-hackrf 2>/dev/null || true
docker stop openwebrx 2>/dev/null || true
docker rm openwebrx 2>/dev/null || true
echo "✓ Done"

# Ensure config files have correct permissions
echo -n "Setting config file permissions... "
chmod 644 hackrf-only-config.json openwebrx-settings.json openwebrx-users.json openwebrx-bands.json openwebrx-bookmarks.json
echo "✓ Done"

# Start OpenWebRX using our simplified docker-compose
echo "Starting OpenWebRX container..."
docker compose -f docker-compose-hackrf.yml up -d

# Wait for container to start
echo -n "Waiting for container to start"
for i in {1..10}; do
    if docker ps | grep -q openwebrx-hackrf; then
        echo " ✓ Started"
        break
    fi
    echo -n "."
    sleep 1
done

# Verify HackRF is accessible inside container
echo -n "Verifying HackRF access in container... "
if docker exec openwebrx-hackrf hackrf_info > /dev/null 2>&1; then
    echo "✓ HackRF accessible"
else
    echo "✗ Failed"
    echo "WARNING: HackRF not accessible inside container"
fi

# Check if web interface is accessible
echo -n "Checking web interface... "
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8073 | grep -q "200\|302"; then
    echo "✓ Web interface ready"
else
    echo "⚠ Web interface not ready yet (may take a few more seconds)"
fi

echo ""
echo "=== OpenWebRX Started Successfully ==="
echo "Access the web interface at: http://localhost:8073"
echo "Username: admin"
echo "Password: hackrf"
echo ""
echo "To view logs: docker logs -f openwebrx-hackrf"
echo "To stop: docker compose -f docker-compose-hackrf.yml down"
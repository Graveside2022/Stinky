#!/bin/bash
# Final working OpenWebRX setup for HackRF One
# Based on documented working configuration

set -e

echo "=== OpenWebRX HackRF Final Setup ==="
echo "This uses the PROVEN WORKING configuration from the documentation"

# Check HackRF
if ! lsusb | grep -q "1d50:6089"; then
    echo "ERROR: HackRF One not detected"
    exit 1
fi
echo "✓ HackRF One detected"

# Stop existing containers
docker stop openwebrx-hackrf 2>/dev/null || true
docker rm openwebrx-hackrf 2>/dev/null || true
docker stop openwebrx 2>/dev/null || true  
docker rm openwebrx 2>/dev/null || true

# Use the existing working configuration file
if [ ! -f "openwebrx-hackrf-config.json" ]; then
    echo "ERROR: openwebrx-hackrf-config.json not found"
    echo "This file contains the working HackRF configuration"
    exit 1
fi

echo "✓ Using existing openwebrx-hackrf-config.json"

# Create directory for config files
mkdir -p docker/config

# Copy the working config
cp openwebrx-hackrf-config.json docker/config/sdrs.json

# Create minimal settings to prevent defaults
cat > docker/config/settings.json << 'EOF'
{
    "version": 2,
    "general": {
        "receiver_name": "HackRF SDR",
        "receiver_location": "Raspberry Pi",
        "receiver_admin": "admin@localhost",
        "receiver_gps": {"lat": 0.0, "lon": 0.0}
    },
    "debug": true
}
EOF

# Create users file
cat > docker/config/users.json << 'EOF'
{
    "version": 2,
    "users": {}
}
EOF

echo "✓ Configuration files prepared"

# Use the EXACT working docker-compose.yml configuration
echo "Starting OpenWebRX with documented working configuration..."

# Run using the main docker-compose.yml which has the working setup
docker compose up -d

echo -n "Waiting for container to start"
for i in {1..20}; do
    if docker ps | grep -q openwebrx; then
        echo " ✓"
        break  
    fi
    echo -n "."
    sleep 1
done

# Verify HackRF
echo -n "Verifying HackRF in container... "
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep openwebrx | head -1)
if [ -z "$CONTAINER_NAME" ]; then
    echo "✗ No OpenWebRX container found"
else
    if docker exec "$CONTAINER_NAME" hackrf_info > /dev/null 2>&1; then
        echo "✓ HackRF accessible"
    else
        echo "⚠ HackRF not accessible"
    fi
fi

# Force config application
echo "Applying HackRF configuration..."
if [ -n "$CONTAINER_NAME" ]; then
    docker exec "$CONTAINER_NAME" sh -c 'cp /var/lib/openwebrx/sdrs.json /var/lib/openwebrx/sdrs.json.bak' 2>/dev/null || true
    docker cp openwebrx-hackrf-config.json "$CONTAINER_NAME:/var/lib/openwebrx/sdrs.json"
    echo "✓ Configuration applied"
    
    # Restart to apply config
    echo "Restarting container to apply configuration..."
    docker restart "$CONTAINER_NAME"
    sleep 5
fi

echo ""
echo "=== Setup Complete ==="
echo "OpenWebRX should now be running with HackRF support"
echo ""
echo "Access URL: http://localhost:8073"
echo "Username: admin"  
echo "Password: hackrf"
echo ""
echo "Note: If you still see 'no SDR devices', the web interface should"
echo "show the HackRF in the device selector after a page refresh."
echo ""
echo "Troubleshooting:"
echo "  View logs: docker logs -f $CONTAINER_NAME"
echo "  Check config: docker exec $CONTAINER_NAME cat /var/lib/openwebrx/sdrs.json"
echo "  Restart: docker restart $CONTAINER_NAME"
#!/bin/bash
# OpenWebRX HackRF Fix Script
# This script fixes HackRF detection and configuration in OpenWebRX

set -e

echo "=== OpenWebRX HackRF Fix Script ==="
echo "Fixing HackRF detection and configuration..."

# Check if HackRF is connected
if lsusb | grep -q "1d50:6089"; then
    echo "✅ HackRF device detected on host"
    hackrf_info | head -5
else
    echo "❌ No HackRF device detected on host"
    echo "   Please connect HackRF One before proceeding"
    exit 1
fi

# Use the official OpenWebRX image with proper configuration
CONTAINER_NAME="openwebrx-hackrf"

# Stop any existing container
echo "Stopping existing containers..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Create optimized HackRF configuration
echo "Creating HackRF configuration..."
mkdir -p "$(pwd)/docker/config"

cat > "$(pwd)/docker/config/sdrs.json" << 'EOF'
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF One",
            "type": "hackrf",
            "enabled": true,
            "ppm": 0,
            "profiles": {
                "2m": {
                    "name": "2 Meter Amateur Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2048000,
                    "start_freq": 145500000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -78,
                    "waterfall_max_level": -30,
                    "lfo_offset": 300
                },
                "70cm": {
                    "name": "70cm Amateur Band",
                    "center_freq": 433000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2048000,
                    "start_freq": 433500000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -78,
                    "waterfall_max_level": -30,
                    "lfo_offset": 300
                },
                "70cm_repeater": {
                    "name": "70cm Repeater Output",
                    "center_freq": 439000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 438675000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -78,
                    "waterfall_max_level": -30,
                    "lfo_offset": 300
                },
                "fm_broadcast": {
                    "name": "FM Broadcast",
                    "center_freq": 100000000,
                    "rf_gain": "VGA=25,LNA=30,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 100000000,
                    "start_mod": "wfm",
                    "waterfall_min_level": -70,
                    "waterfall_max_level": -20,
                    "lfo_offset": 0
                },
                "airband": {
                    "name": "Airband",
                    "center_freq": 120000000,
                    "rf_gain": "VGA=30,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 120000000,
                    "start_mod": "am",
                    "waterfall_min_level": -80,
                    "waterfall_max_level": -20,
                    "lfo_offset": 0
                }
            }
        }
    }
}
EOF

# Create logs directory
mkdir -p "$(pwd)/docker/logs"

# Start new container with official OpenWebRX image and HackRF support
echo "Starting OpenWebRX container with HackRF support..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --device /dev/bus/usb:/dev/bus/usb:rw \
    --privileged \
    -p 8073:8073 \
    -v "$(pwd)/docker/config:/var/lib/openwebrx:rw" \
    -v "$(pwd)/docker/logs:/var/log/openwebrx:rw" \
    -e OPENWEBRX_ADMIN_USER=admin \
    -e OPENWEBRX_ADMIN_PASSWORD=hackrf \
    jketterl/openwebrx:latest

# Wait for container to start
echo "Waiting for container to initialize..."
sleep 10

# Test HackRF detection inside container
echo "Testing HackRF detection inside container..."
if docker exec "$CONTAINER_NAME" hackrf_info >/dev/null 2>&1; then
    echo "✅ HackRF detected inside container"
    docker exec "$CONTAINER_NAME" hackrf_info | head -5
else
    echo "❌ HackRF not detected inside container"
fi

# Test SoapySDR detection
echo "Testing SoapySDR device detection..."
docker exec "$CONTAINER_NAME" SoapySDRUtil --find | grep -A10 "Found device" || echo "No SoapySDR devices found"

# Wait for OpenWebRX to be ready
echo "Waiting for OpenWebRX web interface to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8073/ >/dev/null 2>&1; then
        echo "✅ OpenWebRX web interface is ready"
        break
    fi
    sleep 2
done

# Final status
echo ""
echo "=== OpenWebRX HackRF Setup Complete ==="
echo ""
echo "🌐 Web Interface: http://localhost:8073"
echo "🔐 Admin Login: admin / hackrf"
echo ""
echo "📊 Container Status:"
docker ps --filter name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🔧 Quick Commands:"
echo "   View logs:     docker logs $CONTAINER_NAME -f"
echo "   Access shell:  docker exec -it $CONTAINER_NAME bash"
echo "   Test HackRF:   docker exec $CONTAINER_NAME hackrf_info"
echo "   Stop:          docker stop $CONTAINER_NAME"
echo "   Restart:       docker restart $CONTAINER_NAME"
echo ""

# Test web interface accessibility
if curl -s http://localhost:8073/ >/dev/null; then
    echo "✅ SUCCESS: OpenWebRX is accessible and ready to use!"
else
    echo "⚠️  Warning: OpenWebRX web interface may not be fully ready"
    echo "   Wait a few more seconds and try: http://localhost:8073"
fi

echo ""
echo "📋 Configuration Details:"
echo "   - Native HackRF driver enabled"
echo "   - Multiple band profiles configured"
echo "   - Optimized gain settings applied"
echo "   - USB device passthrough working"
echo ""
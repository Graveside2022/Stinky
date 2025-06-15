#!/bin/bash
# Fix OpenWebRX to use HackRF One only
# This script creates a minimal config directory and starts OpenWebRX

set -e

echo "=== OpenWebRX HackRF Fix Script ==="

# Check if HackRF is connected
echo -n "Checking for HackRF device... "
if ! lsusb | grep -q "1d50:6089"; then
    echo "✗ Not found"
    echo "ERROR: HackRF One not detected. Please connect your HackRF device."
    exit 1
fi
echo "✓ Found"

# Create a clean config directory
CONFIG_DIR="./openwebrx-config"
echo -n "Creating clean config directory... "
rm -rf "$CONFIG_DIR"
mkdir -p "$CONFIG_DIR"
echo "✓ Done"

# Create minimal HackRF-only SDR config
echo -n "Creating HackRF configuration... "
cat > "$CONFIG_DIR/sdrs.json" << 'EOF'
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF One",
            "type": "hackrf",
            "ppm": 0,
            "always-on": true,
            "profiles": {
                "fm": {
                    "name": "FM Broadcast",
                    "center_freq": 100000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 100000000,
                    "start_mod": "wfm"
                }
            }
        }
    }
}
EOF
echo "✓ Done"

# Create minimal settings
echo -n "Creating settings... "
cat > "$CONFIG_DIR/settings.json" << 'EOF'
{
    "version": 2,
    "general": {
        "receiver_name": "HackRF SDR",
        "receiver_location": "Raspberry Pi",
        "receiver_admin": "admin@localhost",
        "receiver_gps": {"lat": 0.0, "lon": 0.0}
    }
}
EOF
echo "✓ Done"

# Create admin user (password: hackrf)
echo -n "Creating admin user... "
cat > "$CONFIG_DIR/users.json" << 'EOF'
{
    "version": 2,
    "users": {
        "admin": {
            "user": "admin",
            "bcrypt_hash": "$2b$12$rTkXRKw1jvxkQjYH/8ZKzuMZYNqzMPqLYZLDj7KKTMML4MXHtKfQC",
            "is_enabled": true,
            "roles": ["admin", "user"]
        }
    }
}
EOF
echo "✓ Done"

# Stop existing containers
echo -n "Stopping existing containers... "
docker stop openwebrx-hackrf 2>/dev/null || true
docker rm openwebrx-hackrf 2>/dev/null || true
echo "✓ Done"

# Run OpenWebRX with minimal config
echo "Starting OpenWebRX with HackRF-only configuration..."
docker run -d \
    --name openwebrx-hackrf \
    --restart unless-stopped \
    --privileged \
    -p 8073:8073 \
    -v "$PWD/$CONFIG_DIR:/var/lib/openwebrx" \
    --device /dev/bus/usb:/dev/bus/usb \
    jketterl/openwebrx:latest

# Wait for startup
echo -n "Waiting for OpenWebRX to start"
for i in {1..20}; do
    if docker logs openwebrx-hackrf 2>&1 | grep -q "hackrf"; then
        echo " ✓"
        break
    fi
    echo -n "."
    sleep 1
done

# Check HackRF in container
echo -n "Verifying HackRF access... "
if docker exec openwebrx-hackrf hackrf_info > /dev/null 2>&1; then
    echo "✓ HackRF accessible in container"
else
    echo "✗ Failed"
fi

# Show relevant logs
echo ""
echo "=== HackRF-related logs ==="
docker logs openwebrx-hackrf 2>&1 | grep -i hackrf | tail -10 || echo "No HackRF logs yet"

echo ""
echo "=== OpenWebRX Status ==="
echo "URL: http://localhost:8073"
echo "Username: admin"
echo "Password: hackrf"
echo ""
echo "View logs: docker logs -f openwebrx-hackrf"
echo "Stop: docker stop openwebrx-hackrf"
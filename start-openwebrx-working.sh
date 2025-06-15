#!/bin/bash
# Start OpenWebRX with working HackRF configuration
# Uses stable version that properly reads configuration files

set -e

echo "=== OpenWebRX HackRF Working Setup ==="
echo "Using stable OpenWebRX v1.2.2 with HackRF support"

# Check for HackRF
if ! lsusb | grep -q "1d50:6089"; then
    echo "ERROR: HackRF One not detected. Please connect your HackRF."
    exit 1
fi
echo "✓ HackRF One detected"

# Stop any existing containers
docker stop openwebrx-hackrf 2>/dev/null || true
docker rm openwebrx-hackrf 2>/dev/null || true

# Ensure config directory exists with proper HackRF config
CONFIG_DIR="./openwebrx-config"
mkdir -p "$CONFIG_DIR"

# Create working HackRF configuration
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
                "2m": {
                    "name": "2m Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm"
                },
                "fm": {
                    "name": "FM Broadcast",
                    "center_freq": 100000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 100000000,
                    "start_mod": "wfm"
                },
                "airband": {
                    "name": "Airband",
                    "center_freq": 124000000,
                    "rf_gain": "VGA=30,LNA=32,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 124000000,
                    "start_mod": "am"
                }
            }
        }
    }
}
EOF

# Create minimal settings
cat > "$CONFIG_DIR/settings.json" << 'EOF'
{
    "version": 2,
    "general": {
        "receiver_name": "HackRF SDR Receiver",
        "receiver_location": "Raspberry Pi"
    }
}
EOF

# Create users file
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

echo "✓ Configuration files created"

# Start with stable version
echo "Starting OpenWebRX stable version..."
docker compose -f docker-compose-hackrf-stable.yml up -d

# Wait for startup
echo -n "Waiting for OpenWebRX"
for i in {1..15}; do
    if docker ps | grep -q openwebrx-hackrf; then
        echo " ✓"
        break
    fi
    echo -n "."
    sleep 1
done

# Verify HackRF access
echo -n "Verifying HackRF access in container... "
if docker exec openwebrx-hackrf hackrf_info > /dev/null 2>&1; then
    echo "✓ Success"
else
    echo "⚠ Warning: HackRF may not be accessible"
fi

# Check for HackRF in logs
sleep 3
echo ""
echo "=== Checking HackRF initialization ==="
if docker logs openwebrx-hackrf 2>&1 | grep -q "hackrf"; then
    echo "✓ HackRF configuration loaded"
    docker logs openwebrx-hackrf 2>&1 | grep -i hackrf | tail -5
else
    echo "⚠ No HackRF logs found yet"
fi

echo ""
echo "=== OpenWebRX is running ==="
echo "URL: http://localhost:8073"
echo "Username: admin"
echo "Password: hackrf"
echo ""
echo "If you see 'no more SDR devices', wait a moment and refresh the page."
echo "The HackRF should appear in the device list."
echo ""
echo "Commands:"
echo "  View logs: docker logs -f openwebrx-hackrf"
echo "  Stop: docker compose -f docker-compose-hackrf-stable.yml down"
echo "  Restart: docker restart openwebrx-hackrf"
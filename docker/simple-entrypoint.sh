#!/bin/bash

# Simple entrypoint for OpenWebRX with automatic HackRF activation
# This uses basic HTTP requests to activate the receiver

echo "Starting OpenWebRX with automatic HackRF activation..."

# Start the original OpenWebRX service in the background
/init &
OPENWEBRX_PID=$!

# Wait for OpenWebRX to be ready
echo "Waiting for OpenWebRX to initialize..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8073 | grep -q "200\|401"; then
        echo "OpenWebRX is ready!"
        break
    fi
    echo "Waiting... (attempt $((attempt+1))/$max_attempts)"
    sleep 2
    attempt=$((attempt+1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "ERROR: OpenWebRX failed to start"
    exit 1
fi

# Additional wait to ensure full initialization
sleep 5

echo "Attempting to activate HackRF..."

# Method 1: Try to trigger via URL parameters (some OpenWebRX versions support this)
curl -s "http://localhost:8073/?sdr=hackrf&profile=2m" > /dev/null || true

# Method 2: Create a startup configuration file that OpenWebRX will read
cat > /var/lib/openwebrx/startup.json << 'EOF'
{
    "autostart": {
        "sdr": "hackrf",
        "profile": "2m"
    }
}
EOF

# Method 3: Use OpenWebRX's built-in auto-start if configured
if [ -f /var/lib/openwebrx/settings.json ]; then
    # Check if we can modify settings to auto-start
    if command -v jq >/dev/null 2>&1; then
        # Update settings to auto-start HackRF
        jq '.autostart_sdr = "hackrf" | .autostart_profile = "2m"' \
            /var/lib/openwebrx/settings.json > /tmp/settings.json && \
            mv /tmp/settings.json /var/lib/openwebrx/settings.json
        
        # Restart OpenWebRX to apply settings
        echo "Restarting OpenWebRX with auto-start settings..."
        kill -HUP $OPENWEBRX_PID 2>/dev/null || true
        sleep 5
    fi
fi

echo "HackRF activation attempted"
echo "You can now access OpenWebRX at http://localhost:8073"
echo "The HackRF should be active on the 2m band"

# Monitor the HackRF status
while true; do
    if command -v hackrf_info >/dev/null 2>&1; then
        # Check if HackRF is in use (will fail if OpenWebRX is using it)
        if ! timeout 1 hackrf_info >/dev/null 2>&1; then
            echo "HackRF is in use by OpenWebRX (good!)"
            break
        fi
    fi
    sleep 5
done

# Keep the container running
wait $OPENWEBRX_PID
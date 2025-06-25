#!/bin/bash
# Custom entrypoint for OpenWebRX with HackRF auto-configuration
set -e

echo "=== OpenWebRX HackRF Auto-start Entrypoint ==="
echo "Container started at: $(date)"

# Function to wait for HackRF
wait_for_hackrf() {
    local max_attempts=10
    local attempt=1
    
    echo "Waiting for HackRF to be available..."
    while [ $attempt -le $max_attempts ]; do
        if hackrf_info > /dev/null 2>&1; then
            echo "HackRF detected on attempt $attempt"
            return 0
        fi
        echo "Attempt $attempt: HackRF not found, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "WARNING: HackRF not detected after $max_attempts attempts"
    return 1
}

# Ensure configuration directory exists
mkdir -p /var/lib/openwebrx

# Check if configuration files exist, copy defaults if not
if [ ! -f /var/lib/openwebrx/settings.json ]; then
    echo "Creating default settings.json"
    cat > /var/lib/openwebrx/settings.json << 'EOF'
{
    "version": 2,
    "receiver_name": "OpenWebRX HackRF Receiver",
    "receiver_location": "Raspberry Pi",
    "receiver_asl": 0,
    "receiver_admin": "admin@example.com",
    "receiver_gps": [0, 0],
    "photo_title": "HackRF SDR",
    "photo_desc": "Raspberry Pi with HackRF One",
    "sdr_hu_url": "",
    "sdr_hu_key": "",
    "waterfall_scheme": "GoogleTurboWaterfall",
    "waterfall_colors": {
        "min": "#000066",
        "max": "#FFFFFF"
    },
    "fft_fps": 15,
    "fft_size": 4096,
    "fft_voverlap_factor": 0.3,
    "audio_compression": "adpcm",
    "digimodes_enable": true,
    "digimodes_fft_size": 2048,
    "csdr_dynamic_bufsize": true,
    "csdr_print_bufsizes": false,
    "csdr_through": false,
    "nmux_memory": 50,
    "google_maps_api_key": "",
    "map_position_retention_time": 2,
    "web_port": 8073,
    "max_clients": 10
}
EOF
fi

# Verify SDR configuration is in place
if [ ! -f /var/lib/openwebrx/sdrs.json ]; then
    echo "ERROR: No SDR configuration found at /var/lib/openwebrx/sdrs.json"
    echo "This should have been copied during Docker build"
    exit 1
fi

# Display current configuration
echo "Current SDR configuration:"
cat /var/lib/openwebrx/sdrs.json | grep -E '"name"|"type"' | head -10

# Test HackRF availability
if wait_for_hackrf; then
    echo "HackRF initialization successful"
    hackrf_info
else
    echo "Proceeding without HackRF detection (may fail if HackRF required)"
fi

# Set up signal handlers for graceful shutdown
trap 'echo "Received shutdown signal, stopping OpenWebRX..."; exit 0' SIGTERM SIGINT

# Execute the command passed to the container
echo "Starting OpenWebRX..."
exec "$@"
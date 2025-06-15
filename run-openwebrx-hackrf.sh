#!/bin/bash
# OpenWebRX with HackRF - Direct Run Script
# This bypasses any default configurations

set -e

echo "=== Starting OpenWebRX with HackRF ==="

# Ensure HackRF is connected
if ! lsusb | grep -q "1d50:6089"; then
    echo "ERROR: HackRF not detected!"
    exit 1
fi

# Create a minimal HackRF-only configuration
mkdir -p /tmp/openwebrx-hackrf-config

cat > /tmp/openwebrx-hackrf-config/sdrs.json << 'EOF'
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF One",
            "type": "hackrf",
            "ppm": 0,
            "profiles": {
                "2m": {
                    "name": "2m Amateur Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -72,
                    "waterfall_max_level": -20,
                    "lfo_offset": 300
                },
                "70cm": {
                    "name": "70cm Amateur Band",
                    "center_freq": 435000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 435000000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -78,
                    "waterfall_max_level": -20,
                    "lfo_offset": 300
                },
                "fm": {
                    "name": "FM Broadcast",
                    "center_freq": 100000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 100000000,
                    "start_mod": "wfm",
                    "waterfall_min_level": -65,
                    "waterfall_max_level": -20,
                    "lfo_offset": 0
                }
            }
        }
    }
}
EOF

cat > /tmp/openwebrx-hackrf-config/settings.json << 'EOF'
{
    "version": 2,
    "receiver_name": "HackRF SDR",
    "receiver_location": "Raspberry Pi",
    "receiver_qra": "JN00aa",
    "receiver_asl": 0,
    "sdr_id": "hackrf",
    "initial_profile_id": "2m",
    "log_level": "DEBUG"
}
EOF

# Run container with explicit config location
docker run -d \
    --name openwebrx-hackrf \
    --restart unless-stopped \
    --device /dev/bus/usb:/dev/bus/usb:rw \
    --privileged \
    -p 8073:8073 \
    -v /tmp/openwebrx-hackrf-config:/var/lib/openwebrx:rw \
    -e OPENWEBRX_ADMIN_USER=admin \
    -e OPENWEBRX_ADMIN_PASSWORD=hackrf \
    -e OPENWEBRX_DEBUG=1 \
    jketterl/openwebrx:latest

echo "Container started. Waiting for initialization..."
sleep 10

# Check status
echo "Container status:"
docker ps -a | grep openwebrx-hackrf

echo ""
echo "Testing HackRF detection:"
docker exec openwebrx-hackrf hackrf_info | head -5 || echo "HackRF test failed"

echo ""
echo "OpenWebRX logs:"
docker logs --tail 20 openwebrx-hackrf

echo ""
echo "Access OpenWebRX at: http://localhost:8073"
echo "Login: admin / hackrf"
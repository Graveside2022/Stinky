#!/bin/bash
#
# Post-startup hook for OpenWebRX
# Ensures HackRF configuration is correct after container starts
#

# Wait for container to be fully ready
sleep 5

# Check and fix configuration if needed
CONFIG_TYPE=$(docker exec openwebrx cat /var/lib/openwebrx/sdrs.json 2>/dev/null | grep -o '"type":\s*"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$CONFIG_TYPE" != "hackrf" ]; then
    # Apply native HackRF driver config
    if [ -f "/home/pi/projects/stinkster/openwebrx-hackrf-config.json" ]; then
        docker cp /home/pi/projects/stinkster/openwebrx-hackrf-config.json openwebrx:/var/lib/openwebrx/sdrs.json
        docker exec openwebrx chown openwebrx:openwebrx /var/lib/openwebrx/sdrs.json
        docker restart openwebrx
    fi
fi
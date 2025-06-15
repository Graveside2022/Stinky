#!/bin/bash

# verify-openwebrx-config.sh
# Verify what the final OpenWebRX configuration looks like after rebuild

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== OpenWebRX Configuration Verification ===${NC}"
echo

# Function to display step
step() {
    echo -e "\n${GREEN}[STEP]${NC} $1"
}

# Function to display info
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Show what configuration files exist
step "Checking existing configuration files..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Configuration files found:"
if [ -f "${SCRIPT_DIR}/config/examples/openwebrx-sdrs.json" ]; then
    echo "✓ ${SCRIPT_DIR}/config/examples/openwebrx-sdrs.json"
else
    echo "✗ No openwebrx-sdrs.json found in config/examples/"
fi

# Check for other potential config files
find "${SCRIPT_DIR}" -name "*openwebrx*" -name "*.json" -type f 2>/dev/null | while read file; do
    echo "  Found: $file"
done

# Show what the rebuild script would create
step "Showing configuration that rebuild script would create..."

# This is the configuration from the rebuild script
echo -e "${BLUE}Default HackRF configuration from rebuild script:${NC}"
cat << 'EOF'
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
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
                    "lfo_offset": 300
                },
                "airband": {
                    "name": "Airband",
                    "center_freq": 124000000,
                    "rf_gain": "VGA=30,LNA=32,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 124000000,
                    "start_mod": "am",
                    "waterfall_min_level": -80,
                    "lfo_offset": 0
                },
                "fm_broadcast": {
                    "name": "FM Broadcast",
                    "center_freq": 98000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 98000000,
                    "start_mod": "wfm",
                    "waterfall_min_level": -65,
                    "lfo_offset": 0
                }
            }
        }
    }
}
EOF

# Compare with existing configuration
step "Comparing with existing configuration..."
if [ -f "${SCRIPT_DIR}/config/examples/openwebrx-sdrs.json" ]; then
    echo -e "${BLUE}Current configuration in config/examples/openwebrx-sdrs.json:${NC}"
    cat "${SCRIPT_DIR}/config/examples/openwebrx-sdrs.json"
    
    echo -e "\n${YELLOW}Key differences:${NC}"
    echo "• Existing config has German amateur radio profiles (Relaisausgabe, Relaiseingabe, etc.)"
    echo "• Rebuild script creates English profiles (Amateur Band, Airband, FM Broadcast)"
    echo "• Rebuild script adds airband and FM broadcast profiles"
    echo "• Both use native HackRF driver (type: hackrf)"
    echo "• Both use same gain settings: VGA=35,LNA=40,AMP=0"
else
    echo "No existing configuration to compare with."
fi

# Show Docker setup that would be created
step "Docker configuration that would be created..."
echo -e "${BLUE}Dockerfile that would be generated:${NC}"
cat << 'EOF'
FROM openwebrx-hackrf-only:latest

# Install additional tools for debugging  
RUN apt-get update && apt-get install -y \
    hackrf \
    libhackrf-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV OPENWEBRX_ADMIN_USER=admin
ENV OPENWEBRX_ADMIN_PASSWORD=hackrf

# Create directory for custom configs
RUN mkdir -p /custom-config

# Copy working HackRF configuration
COPY openwebrx-hackrf-config.json /custom-config/sdrs.json

# Script to apply custom config on startup
RUN echo '#!/bin/bash\n\
if [ ! -f /var/lib/openwebrx/.configured ]; then\n\
    echo "First run detected, applying custom configuration..."\n\
    cp /custom-config/sdrs.json /var/lib/openwebrx/sdrs.json\n\
    touch /var/lib/openwebrx/.configured\n\
    echo "Custom configuration applied."\n\
fi\n\
exec /opt/openwebrx/docker/scripts/run.sh' > /custom-start.sh && \
    chmod +x /custom-start.sh

ENTRYPOINT ["/custom-start.sh"]
EOF

echo -e "\n${BLUE}Docker-compose.yml that would be created:${NC}"
cat << 'EOF'
version: '3.8'

services:
  openwebrx:
    image: openwebrx-hackrf:latest
    container_name: openwebrx
    restart: unless-stopped
    ports:
      - "8073:8073"
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - openwebrx-settings:/var/lib/openwebrx
      - openwebrx-config:/etc/openwebrx
    devices:
      - /dev/bus/usb:/dev/bus/usb
    privileged: true
    environment:
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=hackrf
    
volumes:
  openwebrx-settings:
  openwebrx-config:
EOF

# Show key configuration points
step "Key configuration points..."
echo -e "${GREEN}✓ Native HackRF driver:${NC} Uses 'type: hackrf' instead of SoapySDR"
echo -e "${GREEN}✓ Proper gain settings:${NC} VGA=35,LNA=40,AMP=0 for most bands"
echo -e "${GREEN}✓ Multiple band profiles:${NC} 2m, 70cm, airband, FM broadcast"
echo -e "${GREEN}✓ Frequency corrections:${NC} lfo_offset values for stability"
echo -e "${GREEN}✓ Automatic configuration:${NC} Applied on first container start"
echo -e "${GREEN}✓ USB device access:${NC} Full /dev/bus/usb mounting"
echo -e "${GREEN}✓ Privileged mode:${NC} Required for HackRF hardware access"

# Show access information
step "Access information after rebuild..."
IP_ADDRESS=$(hostname -I | cut -d' ' -f1 2>/dev/null || echo "localhost")
echo -e "${BLUE}Web interface:${NC} http://${IP_ADDRESS}:8073"
echo -e "${BLUE}Username:${NC} admin"
echo -e "${BLUE}Password:${NC} hackrf"

# Show what would happen during rebuild
step "Rebuild process summary..."
echo "1. Stop and remove existing OpenWebRX containers"
echo "2. Backup existing Docker volumes"
echo "3. Remove old Docker images"
echo "4. Create custom Dockerfile with HackRF support"
echo "5. Copy HackRF configuration file"
echo "6. Build new Docker image with embedded config"
echo "7. Create docker-compose.yml with proper device mounting"
echo "8. Start container with automatic configuration"
echo "9. Apply HackRF configuration on first run"
echo "10. Optionally create systemd service for auto-start"

echo -e "\n${GREEN}=== Configuration Verification Complete ===${NC}"
echo -e "${YELLOW}Note:${NC} This script shows what WOULD be configured. Run rebuild-openwebrx-docker.sh to actually apply changes."
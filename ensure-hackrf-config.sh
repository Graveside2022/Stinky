#!/bin/bash
#
# Ensure HackRF configuration is properly set in OpenWebRX
# This script can be run at any time to verify/fix the configuration
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="${PROJECT_DIR:-/home/pi/projects/stinkster}"

echo -e "${GREEN}=== Ensuring HackRF Configuration ===${NC}"

# Check if container is running
if ! docker ps | grep -q openwebrx; then
    echo -e "${YELLOW}OpenWebRX container is not running. Starting it...${NC}"
    "${PROJECT_DIR}/start-openwebrx.sh"
    exit 0
fi

# Check current configuration
CONFIG_TYPE=$(docker exec openwebrx cat /var/lib/openwebrx/sdrs.json 2>/dev/null | grep -o '"type":\s*"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$CONFIG_TYPE" = "hackrf" ]; then
    echo -e "${GREEN}✓ HackRF already configured with native driver${NC}"
    
    # Show current profiles
    echo -e "\n${YELLOW}Current HackRF profiles:${NC}"
    docker exec openwebrx cat /var/lib/openwebrx/sdrs.json | grep -A1 '"name"' | grep -v "^--$" || true
    
else
    echo -e "${YELLOW}Found configuration type: ${CONFIG_TYPE}${NC}"
    echo "Applying native HackRF driver configuration..."
    
    # Backup current config
    docker exec openwebrx cp /var/lib/openwebrx/sdrs.json /var/lib/openwebrx/sdrs.json.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # Apply correct configuration
    if [ -f "${PROJECT_DIR}/openwebrx-hackrf-config.json" ]; then
        docker cp "${PROJECT_DIR}/openwebrx-hackrf-config.json" openwebrx:/var/lib/openwebrx/sdrs.json
    elif [ -f "${PROJECT_DIR}/config/examples/openwebrx-sdrs.json" ]; then
        docker cp "${PROJECT_DIR}/config/examples/openwebrx-sdrs.json" openwebrx:/var/lib/openwebrx/sdrs.json
    else
        echo -e "${RED}No HackRF configuration file found!${NC}"
        exit 1
    fi
    
    docker exec openwebrx chown openwebrx:openwebrx /var/lib/openwebrx/sdrs.json
    
    # Restart container
    echo "Restarting OpenWebRX..."
    docker restart openwebrx
    
    sleep 10
    
    echo -e "${GREEN}✓ HackRF configuration applied successfully${NC}"
fi

# Test HackRF detection in container
echo -e "\n${YELLOW}Testing HackRF detection:${NC}"
docker exec openwebrx hackrf_info 2>&1 | head -5 || echo "hackrf_info not available in container (normal)"

# Show access information
IP=$(hostname -I | cut -d' ' -f1)
echo -e "\n${GREEN}OpenWebRX Access Information:${NC}"
echo -e "URL: ${YELLOW}http://${IP}:8073${NC}"
echo -e "Username: ${YELLOW}admin${NC}"
echo -e "Password: ${YELLOW}hackrf${NC}"

echo -e "\n${GREEN}Configuration check complete!${NC}"
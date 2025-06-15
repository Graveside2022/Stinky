#!/bin/bash

# apply-hackrf-config.sh
# Apply the working HackRF configuration to the OpenWebRX container
# This uses the known-good configuration with proper gain settings

set -e

# Script configuration
PROJECT_DIR="/home/pi/projects/stinkster"
# Use the HackRF-specific configuration file
CONFIG_FILE="${PROJECT_DIR}/openwebrx-hackrf-config.json"
CONTAINER_NAME="openwebrx"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Apply HackRF Configuration to OpenWebRX ===${NC}"
echo

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: OpenWebRX container is not running${NC}"
    echo "Please start the container first with:"
    echo "  ./restore-docker-backup.sh"
    echo "  or"
    echo "  ./start-openwebrx.sh"
    exit 1
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file not found at:${NC}"
    echo "  $CONFIG_FILE"
    exit 1
fi

echo -e "${GREEN}Found configuration file:${NC}"
echo "  $CONFIG_FILE"
echo

# Backup current configuration
echo -e "${YELLOW}Backing up current configuration...${NC}"
docker exec "$CONTAINER_NAME" bash -c "cp /var/lib/openwebrx/sdrs.json /var/lib/openwebrx/sdrs.json.backup 2>/dev/null || true"

# Copy new configuration
echo -e "${YELLOW}Applying HackRF configuration...${NC}"
docker cp "$CONFIG_FILE" "${CONTAINER_NAME}:/var/lib/openwebrx/sdrs.json"

# Set proper permissions
docker exec "$CONTAINER_NAME" chown openwebrx:openwebrx /var/lib/openwebrx/sdrs.json

echo -e "${GREEN}✓ Configuration applied successfully${NC}"

# Restart the container to apply changes
echo -e "\n${YELLOW}Restarting container to apply changes...${NC}"
docker restart "$CONTAINER_NAME"

# Wait for restart
echo "Waiting for container to restart..."
sleep 10

# Check status
if docker ps | grep -q "$CONTAINER_NAME"; then
    IP_ADDRESS=$(hostname -I | cut -d' ' -f1)
    echo -e "\n${GREEN}✓ OpenWebRX is running with new configuration!${NC}"
    echo
    echo -e "${BLUE}Configuration Details:${NC}"
    echo "  - HackRF with native driver (not SoapySDR)"
    echo "  - Gain settings: VGA=35, LNA=40, AMP=0"
    echo "  - Multiple band profiles configured"
    echo
    echo -e "${BLUE}Available Bands:${NC}"
    echo "  - 2m Amateur Band (145 MHz)"
    echo "  - 70cm bands (431-439 MHz)"
    echo
    echo -e "${BLUE}Access OpenWebRX:${NC}"
    echo "  URL: http://localhost:8073 or http://${IP_ADDRESS}:8073"
    echo "  Username: admin"
    echo "  Password: hackrf"
    echo
    
    # Show recent logs
    echo -e "${YELLOW}Recent container logs:${NC}"
    docker logs --tail 15 "$CONTAINER_NAME"
else
    echo -e "${RED}✗ Container failed to restart${NC}"
    docker logs "$CONTAINER_NAME"
    exit 1
fi

echo -e "\n${GREEN}Configuration complete!${NC}"
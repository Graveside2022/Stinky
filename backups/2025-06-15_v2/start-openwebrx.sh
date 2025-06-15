#!/bin/bash

# start-openwebrx.sh
# Quick start script for OpenWebRX with HackRF
# Uses existing working image or builds if necessary

set -e

# Load environment variables from config file if it exists
if [ -f "${PWD}/.env" ]; then
    source "${PWD}/.env"
fi

# Environment variables with defaults
PROJECT_DIR="${PROJECT_DIR:-/home/pi/projects/stinkster}"
OPENWEBRX_PORT="${OPENWEBRX_PORT:-8073}"
OPENWEBRX_ADMIN_USER="${OPENWEBRX_ADMIN_USER:-admin}"
OPENWEBRX_ADMIN_PASSWORD="${OPENWEBRX_ADMIN_PASSWORD:-hackrf}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== OpenWebRX Quick Start Script ===${NC}"
echo

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Starting Docker...${NC}"
    sudo systemctl start docker
    sleep 5
fi

# Check HackRF
echo "Checking HackRF device..."
if lsusb | grep -q "HackRF"; then
    echo -e "${GREEN}✓ HackRF detected${NC}"
    HACKRF_INFO=$(lsusb | grep -i hackrf)
    echo "  Device: $HACKRF_INFO"
else
    echo -e "${YELLOW}⚠ HackRF not detected - SDR functions will not work${NC}"
fi

# Stop any existing container
echo "Stopping any existing OpenWebRX container..."
docker stop openwebrx 2>/dev/null || true
docker rm openwebrx 2>/dev/null || true

# Check if image exists
if ! docker images | grep -q "openwebrx-hackrf.*latest"; then
    echo -e "${YELLOW}OpenWebRX image not found. Building...${NC}"
    "${PROJECT_DIR}/rebuild-openwebrx-docker.sh"
    exit 0
fi

# Start container using docker-compose
cd "${PROJECT_DIR}"
if [ -f "docker-compose.yml" ]; then
    echo "Starting OpenWebRX with docker-compose..."
    docker-compose up -d
else
    echo "docker-compose.yml not found, using docker run..."
    docker run -d \
        --name openwebrx \
        --restart unless-stopped \
        -p "${OPENWEBRX_PORT}:8073" \
        -v /dev/bus/usb:/dev/bus/usb \
        -v openwebrx-settings:/var/lib/openwebrx \
        -v openwebrx-config:/etc/openwebrx \
        --privileged \
        -e OPENWEBRX_ADMIN_USER="${OPENWEBRX_ADMIN_USER}" \
        -e OPENWEBRX_ADMIN_PASSWORD="${OPENWEBRX_ADMIN_PASSWORD}" \
        openwebrx-hackrf:latest
fi

# Wait and check status
echo "Waiting for container to start..."
sleep 8

if docker ps | grep -q openwebrx; then
    IP_ADDRESS=$(hostname -I | cut -d' ' -f1)
    echo -e "\n${GREEN}✓ OpenWebRX is running!${NC}"
    echo -e "  URL: http://${IP_ADDRESS}:${OPENWEBRX_PORT}"
    echo -e "  Username: ${OPENWEBRX_ADMIN_USER}"
    echo -e "  Password: ${OPENWEBRX_ADMIN_PASSWORD}"
    echo
    echo "Recent logs:"
    docker logs --tail 10 openwebrx
else
    echo -e "${RED}✗ Container failed to start${NC}"
    docker logs openwebrx
fi
#!/bin/bash

# restore-docker-backup.sh
# Restore the pre-configured OpenWebRX Docker image with HackRF support
# This uses the backup from docker-backup/openwebrx-hackrf-working_20250609.tar.gz

set -e

# Script configuration
PROJECT_DIR="/home/pi/projects/stinkster"
BACKUP_FILE="${PROJECT_DIR}/docker-backup/openwebrx-hackrf-working_20250609.tar.gz"
CONTAINER_NAME="openwebrx"
IMAGE_NAME="openwebrx-hackrf-only:latest"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== OpenWebRX Docker Backup Restore ===${NC}"
echo -e "This will restore the working HackRF configuration from June 9, 2025"
echo

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found at:${NC}"
    echo "  $BACKUP_FILE"
    exit 1
fi

# Check file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}Found backup file:${NC} $(basename "$BACKUP_FILE")"
echo -e "${GREEN}Size:${NC} $BACKUP_SIZE"
echo

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Starting Docker...${NC}"
    sudo systemctl start docker
    sleep 5
fi

# Stop and remove existing container
echo "Stopping any existing OpenWebRX containers..."
docker stop openwebrx 2>/dev/null || true
docker stop openwebrx-hackrf 2>/dev/null || true
docker rm openwebrx 2>/dev/null || true
docker rm openwebrx-hackrf 2>/dev/null || true

# Extract and load the Docker image
echo -e "\n${YELLOW}Loading Docker image from backup...${NC}"
echo "This may take a few minutes due to the file size..."

# First extract the tar.gz file
echo "Extracting backup..."
cd "${PROJECT_DIR}/docker-backup"
gunzip -c "openwebrx-hackrf-working_20250609.tar.gz" > "openwebrx-hackrf-working.tar"

# Load the Docker image
echo "Loading Docker image..."
docker load -i "openwebrx-hackrf-working.tar"

# Clean up the extracted tar file
rm -f "openwebrx-hackrf-working.tar"

echo -e "${GREEN}✓ Docker image loaded successfully${NC}"

# List loaded images to verify
echo -e "\nVerifying loaded image:"
docker images | grep -E "openwebrx|REPOSITORY" || true

# Create a simple docker-compose.yml for the restored image
echo -e "\n${YELLOW}Creating docker-compose configuration...${NC}"
cat > "${PROJECT_DIR}/docker-compose-restored.yml" << 'EOF'
version: '3.8'

services:
  openwebrx:
    image: openwebrx-hackrf-only:latest
    container_name: openwebrx
    restart: unless-stopped
    
    # Network ports
    ports:
      - "8073:8073"
    
    # Volumes for persistence
    volumes:
      # USB devices
      - /dev/bus/usb:/dev/bus/usb:ro
      # Configuration and data persistence
      - openwebrx-settings:/var/lib/openwebrx
      - openwebrx-config:/etc/openwebrx
    
    # Device access
    devices:
      # Allow access to all USB devices
      - /dev/bus/usb:/dev/bus/usb
    
    # Privileged mode for USB access
    privileged: true
    
    # Environment variables
    environment:
      # Admin credentials (from the working backup)
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=hackrf

# Named volumes for data persistence
volumes:
  openwebrx-settings:
    driver: local
  openwebrx-config:
    driver: local
EOF

# Start the container
echo -e "\n${YELLOW}Starting OpenWebRX container...${NC}"
cd "${PROJECT_DIR}"
docker-compose -f docker-compose-restored.yml up -d

# Wait for container to start
echo "Waiting for container to initialize..."
sleep 10

# Check status
if docker ps | grep -q openwebrx; then
    IP_ADDRESS=$(hostname -I | cut -d' ' -f1)
    echo -e "\n${GREEN}✓ OpenWebRX restored and running successfully!${NC}"
    echo
    echo -e "${BLUE}Access Information:${NC}"
    echo -e "  URL: http://localhost:8073 or http://${IP_ADDRESS}:8073"
    echo -e "  Username: admin"
    echo -e "  Password: hackrf"
    echo
    echo -e "${BLUE}HackRF Configuration:${NC}"
    echo "  The restored image includes the working HackRF configuration"
    echo "  with proper gain settings (VGA=35, LNA=40, AMP=0)"
    echo
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  View logs:        docker logs -f openwebrx"
    echo "  Stop container:   docker-compose -f docker-compose-restored.yml down"
    echo "  Start container:  docker-compose -f docker-compose-restored.yml up -d"
    echo "  Enter container:  docker exec -it openwebrx /bin/bash"
    echo
    
    # Show recent logs
    echo -e "${YELLOW}Recent container logs:${NC}"
    docker logs --tail 20 openwebrx
else
    echo -e "${RED}✗ Container failed to start${NC}"
    echo "Checking logs..."
    docker logs openwebrx
    exit 1
fi

echo -e "\n${GREEN}Restoration complete!${NC}"
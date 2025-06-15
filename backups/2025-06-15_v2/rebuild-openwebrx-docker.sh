#!/bin/bash

# rebuild-openwebrx-docker.sh
# Complete rebuild script for OpenWebRX Docker with HackRF support
# This script rebuilds the Docker image from scratch and applies working configuration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKUP_DIR="${SCRIPT_DIR}/docker-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}=== OpenWebRX Docker Complete Rebuild Script ===${NC}"
echo -e "${BLUE}=== Timestamp: ${TIMESTAMP} ===${NC}"
echo

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to display step
step() {
    echo -e "\n${GREEN}[STEP]${NC} $1"
}

# Function to display error
error() {
    echo -e "\n${RED}[ERROR]${NC} $1"
}

# Function to display warning
warning() {
    echo -e "\n${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
step "Checking prerequisites..."
if ! command_exists docker; then
    error "Docker is not installed. Please install Docker first."
    echo "Run: curl -fsSL https://get.docker.com | sh"
    echo "     sudo usermod -aG docker $USER"
    echo "     logout and login again"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    error "Docker daemon is not running or you don't have permissions."
    echo "Try: sudo systemctl start docker"
    echo "Or add yourself to docker group: sudo usermod -aG docker $USER"
    exit 1
fi

# Check HackRF device
step "Checking HackRF device..."
if ! lsusb | grep -q "HackRF"; then
    warning "HackRF not detected! The container will start but SDR won't work."
    echo "Make sure HackRF is connected and powered on."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    HACKRF_INFO=$(lsusb | grep -i hackrf)
    echo "HackRF detected: $HACKRF_INFO"
    
    # Get HackRF USB device path
    HACKRF_BUS=$(echo "$HACKRF_INFO" | cut -d' ' -f2 | sed 's/^0*//')
    HACKRF_DEV=$(echo "$HACKRF_INFO" | cut -d' ' -f4 | sed 's/://g' | sed 's/^0*//')
    HACKRF_PATH="/dev/bus/usb/$HACKRF_BUS/$HACKRF_DEV"
    echo "HackRF device path: $HACKRF_PATH"
fi

# Create backup directory
step "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

# Stop existing container
step "Stopping existing OpenWebRX containers..."
docker stop openwebrx 2>/dev/null || true
docker rm openwebrx 2>/dev/null || true

# Backup existing volumes if they exist
step "Backing up existing Docker volumes..."
if docker volume ls | grep -q openwebrx-settings; then
    echo "Backing up openwebrx-settings volume..."
    docker run --rm -v openwebrx-settings:/source -v "$BACKUP_DIR":/backup alpine \
        tar czf /backup/openwebrx-settings_${TIMESTAMP}.tar.gz -C /source .
    echo "Backup saved to: $BACKUP_DIR/openwebrx-settings_${TIMESTAMP}.tar.gz"
fi

if docker volume ls | grep -q openwebrx-config; then
    echo "Backing up openwebrx-config volume..."
    docker run --rm -v openwebrx-config:/source -v "$BACKUP_DIR":/backup alpine \
        tar czf /backup/openwebrx-config_${TIMESTAMP}.tar.gz -C /source .
    echo "Backup saved to: $BACKUP_DIR/openwebrx-config_${TIMESTAMP}.tar.gz"
fi

# Remove old images
step "Removing old Docker images..."
docker rmi openwebrx-hackrf:latest 2>/dev/null || true
docker rmi jketterl/openwebrx:latest 2>/dev/null || true
docker rmi jketterl/openwebrx:stable 2>/dev/null || true

# Create Dockerfile for custom build
step "Creating custom Dockerfile..."
cat > "${SCRIPT_DIR}/Dockerfile.openwebrx" << 'EOF'
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

# Copy working configuration
step "Copying working HackRF configuration..."
if [ -f "${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}-hackrf-config.json" ]; then
    cp ${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}-hackrf-config.json "${SCRIPT_DIR}/openwebrx-hackrf-config.json"
elif [ -f "${SCRIPT_DIR}/openwebrx-hackrf-config.json" ]; then
    echo "Using existing configuration in script directory"
else
    warning "No HackRF configuration found, creating default..."
    cat > "${SCRIPT_DIR}/openwebrx-hackrf-config.json" << 'EOF'
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
fi

# Build custom Docker image
step "Building custom Docker image..."
docker build -f "${SCRIPT_DIR}/Dockerfile.openwebrx" -t openwebrx-hackrf:latest "${SCRIPT_DIR}"

# Create docker-compose.yml
step "Creating docker-compose.yml..."
cat > "${SCRIPT_DIR}/docker-compose.yml" << EOF
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

# Remove old volumes if requested
read -p "Remove old Docker volumes and start fresh? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    step "Removing old Docker volumes..."
    docker volume rm openwebrx-settings 2>/dev/null || true
    docker volume rm openwebrx-config 2>/dev/null || true
    echo "Old volumes removed."
fi

# Start container with docker-compose
step "Starting OpenWebRX with docker-compose..."
cd "${SCRIPT_DIR}"
docker-compose up -d

# Wait for container to start
echo "Waiting for container to initialize..."
sleep 10

# Check container status
step "Checking container status..."
if docker ps | grep -q openwebrx; then
    echo -e "${GREEN}OpenWebRX container is running!${NC}"
    
    # Get container logs
    echo -e "\n${BLUE}Container logs:${NC}"
    docker logs --tail 30 openwebrx
    
    # Check if HackRF is detected inside container
    echo -e "\n${BLUE}Checking HackRF detection inside container:${NC}"
    docker exec openwebrx hackrf_info 2>&1 || warning "hackrf_info failed - this is normal if HackRF is not connected"
    
    # Apply configuration manually if needed
    step "Applying HackRF configuration to running container..."
    docker exec openwebrx cp /custom-config/sdrs.json /var/lib/openwebrx/sdrs.json
    
    # Display access information
    IP_ADDRESS=$(hostname -I | cut -d' ' -f1)
    echo -e "\n${GREEN}=== OpenWebRX Successfully Deployed ===${NC}"
    echo -e "${BLUE}Access URL:${NC} http://${IP_ADDRESS}:8073"
    echo -e "${BLUE}Username:${NC} admin"
    echo -e "${BLUE}Password:${NC} hackrf"
    echo
    echo -e "${YELLOW}Configuration Tips:${NC}"
    echo "1. The HackRF configuration has been applied automatically"
    echo "2. Multiple band profiles are available (2m, 70cm, airband, FM broadcast)"
    echo "3. If HackRF is not detected, check USB connection and restart container"
    echo "4. Logs are available with: docker logs -f openwebrx"
    echo
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  Stop:    docker-compose down"
    echo "  Start:   docker-compose up -d"
    echo "  Logs:    docker logs -f openwebrx"
    echo "  Shell:   docker exec -it openwebrx bash"
    echo "  Restart: docker-compose restart"
    
else
    error "Container failed to start!"
    echo "Checking logs for errors..."
    docker logs --tail 50 openwebrx
    exit 1
fi

# Create systemd service for auto-start (optional)
read -p "Create systemd service for auto-start on boot? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    step "Creating systemd service..."
    sudo tee /etc/systemd/system/openwebrx-docker.service > /dev/null << EOF
[Unit]
Description=OpenWebRX Docker Container
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${SCRIPT_DIR}
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
User=pi

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable openwebrx-docker.service
    echo "Systemd service created and enabled."
fi

echo -e "\n${GREEN}=== Rebuild Complete ===${NC}"
echo "Backups saved in: ${BACKUP_DIR}"

# Cleanup
rm -f "${SCRIPT_DIR}/Dockerfile.openwebrx"

echo -e "\n${BLUE}Script completed successfully!${NC}"
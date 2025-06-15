#!/bin/bash
#
# Load Pre-built OpenWebRX Docker Image from Backup
# This script loads the known working OpenWebRX HackRF image from the docker-backup directory
#
# Usage: ./load-openwebrx-backup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE="/home/pi/projects/stinkster/docker-backup/openwebrx-hackrf-working_20250609.tar.gz"
CONTAINER_NAME="openwebrx"
IMAGE_NAME="openwebrx-hackrf-only:latest"
PROJECT_ROOT="/home/pi/projects/stinkster"

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if backup file exists
check_backup() {
    print_status "Checking for backup image..."
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    # Show file info
    local size=$(du -h "$BACKUP_FILE" | cut -f1)
    local date=$(stat -c %y "$BACKUP_FILE" | cut -d' ' -f1)
    print_status "Found backup: $(basename "$BACKUP_FILE")"
    print_status "Size: $size, Date: $date"
}

# Check for HackRF device
check_hackrf() {
    print_status "Checking for HackRF device..."
    if lsusb | grep -q "1d50:6089"; then
        print_success "HackRF One detected!"
        hackrf_info 2>/dev/null || print_warning "hackrf_info not available on host"
    else
        print_warning "No HackRF device detected. Make sure it's connected."
    fi
}

# Stop existing container
stop_existing() {
    print_status "Checking for existing containers..."
    
    # Stop any running openwebrx containers
    for container in $(docker ps -a --filter "name=openwebrx" --format "{{.Names}}"); do
        print_status "Stopping container: $container"
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
    done
    
    print_success "Cleaned up existing containers"
}

# Load Docker image from backup
load_image() {
    print_status "Loading Docker image from backup..."
    print_status "This may take a few minutes..."
    
    # Extract and load the image
    if gunzip -c "$BACKUP_FILE" | docker load; then
        print_success "Docker image loaded successfully!"
        
        # List loaded images
        print_status "Available OpenWebRX images:"
        docker images | grep -E "(openwebrx|REPOSITORY)" | head -5
    else
        print_error "Failed to load Docker image"
        exit 1
    fi
}

# Create docker-compose.yml for the loaded image
create_compose_file() {
    print_status "Creating docker-compose.yml..."
    
    cat > "$PROJECT_ROOT/docker-compose.yml" <<EOF
version: '3.8'

services:
  openwebrx:
    image: ${IMAGE_NAME}
    container_name: ${CONTAINER_NAME}
    restart: unless-stopped
    ports:
      - "8073:8073"
    devices:
      - /dev/bus/usb:/dev/bus/usb
    volumes:
      - openwebrx-settings:/var/lib/openwebrx
      - openwebrx-config:/etc/openwebrx
    privileged: true
    environment:
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=hackrf

volumes:
  openwebrx-settings:
    driver: local
  openwebrx-config:
    driver: local
EOF
    
    print_success "docker-compose.yml created"
}

# Deploy HackRF configuration
deploy_config() {
    print_status "Checking for HackRF configuration..."
    
    local config_file="$PROJECT_ROOT/openwebrx-hackrf-config.json"
    if [ -f "$config_file" ]; then
        print_status "Found HackRF configuration, will apply after container starts"
    else
        print_warning "No HackRF configuration file found at $config_file"
        print_warning "You may need to configure SDR settings manually"
    fi
}

# Start the container
start_container() {
    print_status "Starting OpenWebRX container..."
    
    cd "$PROJECT_ROOT"
    if docker-compose up -d; then
        print_success "Container started successfully!"
        
        # Wait for container to initialize
        print_status "Waiting for OpenWebRX to initialize..."
        sleep 10
        
        # Apply HackRF config if available
        local config_file="$PROJECT_ROOT/openwebrx-hackrf-config.json"
        if [ -f "$config_file" ]; then
            print_status "Applying HackRF configuration..."
            docker cp "$config_file" "${CONTAINER_NAME}:/var/lib/openwebrx/sdrs.json"
            docker restart "$CONTAINER_NAME"
            sleep 5
        fi
        
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Verify installation
verify_installation() {
    print_status "Verifying installation..."
    
    # Check container status
    if docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Status}}" | grep -q "Up"; then
        print_success "Container is running"
        
        # Show container info
        echo -e "\n${BLUE}Container Information:${NC}"
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        # Test SoapySDR inside container
        echo -e "\n${BLUE}Testing SDR detection in container:${NC}"
        docker exec "$CONTAINER_NAME" SoapySDRUtil --find 2>/dev/null || print_warning "SoapySDR test failed"
        
        # Get access URL
        local ip=$(hostname -I | cut -d' ' -f1)
        echo -e "\n${GREEN}=== OpenWebRX is Ready! ===${NC}"
        echo -e "Access URL: ${BLUE}http://${ip}:8073${NC}"
        echo -e "Local URL: ${BLUE}http://localhost:8073${NC}"
        echo -e "Username: ${BLUE}admin${NC}"
        echo -e "Password: ${BLUE}hackrf${NC}"
        
        # Show useful commands
        echo -e "\n${YELLOW}Useful commands:${NC}"
        echo "  View logs:        docker logs -f $CONTAINER_NAME"
        echo "  Stop container:   docker stop $CONTAINER_NAME"
        echo "  Start container:  docker start $CONTAINER_NAME"
        echo "  Check status:     docker ps --filter name=$CONTAINER_NAME"
        
    else
        print_error "Container is not running properly"
        print_status "Checking logs for errors..."
        docker logs --tail 20 "$CONTAINER_NAME"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}=== OpenWebRX Pre-built Image Loader ===${NC}"
    echo "This script loads the known working OpenWebRX Docker image with HackRF support"
    echo
    
    # Run all steps
    check_backup
    check_hackrf
    stop_existing
    load_image
    create_compose_file
    deploy_config
    start_container
    verify_installation
    
    echo -e "\n${GREEN}Installation completed successfully!${NC}"
}

# Run main function
main "$@"
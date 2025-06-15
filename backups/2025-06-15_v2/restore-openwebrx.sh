#!/bin/bash
# restore-openwebrx.sh - Restore OpenWebRX container from backup or rebuild
# Created: 2025-06-15
# 
# This script provides two options for restoring OpenWebRX:
# 1. Load from a backed up Docker image
# 2. Rebuild from Dockerfile
#
# Usage: ./restore-openwebrx.sh [option]
#   option: --image (restore from backup) or --build (rebuild from Dockerfile)

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}-backups}"
OPENWEBRX_DIR="${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}"
CONTAINER_NAME="openwebrx"
IMAGE_NAME="jketterl/openwebrx:stable"
LOG_FILE="${LOG_DIR:-/home/pi/projects/stinkster/logs}/openwebrx-restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Display help
show_help() {
    cat << EOF
OpenWebRX Restore Script

This script restores the OpenWebRX container using one of two methods:

Usage: $0 [OPTION]

Options:
  --image    Restore from a backed up Docker image
  --build    Rebuild from Dockerfile
  --help     Show this help message

Examples:
  $0 --image    # Interactive selection of backup image
  $0 --build    # Rebuild using docker-compose

Environment Variables:
  BACKUP_DIR    Directory containing backups (default: ${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}-backups)

EOF
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log "ERROR" "docker-compose is not available. Please install docker-compose."
        exit 1
    fi
    
    # Create log directory if needed
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "INFO" "Prerequisites check completed"
}

# Stop and remove existing container
stop_existing_container() {
    log "INFO" "Checking for existing OpenWebRX container..."
    
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "INFO" "Stopping existing container..."
        docker stop "$CONTAINER_NAME" 2>/dev/null || true
        
        log "INFO" "Removing existing container..."
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    else
        log "INFO" "No existing container found"
    fi
}

# List available backup images
list_backup_images() {
    log "INFO" "Scanning for backup images in $BACKUP_DIR..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log "ERROR" "Backup directory not found: $BACKUP_DIR"
        return 1
    fi
    
    local images=()
    while IFS= read -r -d '' file; do
        images+=("$file")
    done < <(find "$BACKUP_DIR" -name "openwebrx-*.tar" -type f -print0 | sort -z)
    
    if [ ${#images[@]} -eq 0 ]; then
        log "ERROR" "No backup images found in $BACKUP_DIR"
        return 1
    fi
    
    echo -e "\n${BLUE}Available backup images:${NC}"
    for i in "${!images[@]}"; do
        local filename=$(basename "${images[$i]}")
        local size=$(du -h "${images[$i]}" | cut -f1)
        local date=$(stat -c %y "${images[$i]}" | cut -d' ' -f1)
        printf "  %2d) %-40s %10s  %s\n" $((i+1)) "$filename" "$size" "$date"
    done
    
    echo -e "\nSelect image number (1-${#images[@]}): \c"
    read -r selection
    
    if [[ ! "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#images[@]} ]; then
        log "ERROR" "Invalid selection"
        return 1
    fi
    
    SELECTED_IMAGE="${images[$((selection-1))]}"
    log "INFO" "Selected: $(basename "$SELECTED_IMAGE")"
}

# Restore from backup image
restore_from_image() {
    log "INFO" "Starting restoration from backup image..."
    
    # List and select backup
    if ! list_backup_images; then
        return 1
    fi
    
    # Verify the selected image exists
    if [ ! -f "$SELECTED_IMAGE" ]; then
        log "ERROR" "Selected image not found: $SELECTED_IMAGE"
        return 1
    fi
    
    # Load the Docker image
    log "INFO" "Loading Docker image from backup..."
    echo -e "${YELLOW}This may take several minutes...${NC}"
    
    if docker load -i "$SELECTED_IMAGE"; then
        log "INFO" "Docker image loaded successfully"
    else
        log "ERROR" "Failed to load Docker image"
        return 1
    fi
    
    # Get image name from the tar file
    local loaded_image=$(docker load -i "$SELECTED_IMAGE" 2>&1 | grep "Loaded image:" | awk '{print $3}')
    if [ -z "$loaded_image" ]; then
        loaded_image="$IMAGE_NAME"
    fi
    
    # Restore configuration if available
    local config_backup="${SELECTED_IMAGE%.tar}-config.tar.gz"
    if [ -f "$config_backup" ]; then
        log "INFO" "Found configuration backup, restoring..."
        
        # Create temporary directory for extraction
        local temp_dir=$(mktemp -d)
        tar -xzf "$config_backup" -C "$temp_dir"
        
        # Restore docker-compose.yml if present
        if [ -f "$temp_dir/docker-compose.yml" ]; then
            cp "$temp_dir/docker-compose.yml" "$OPENWEBRX_DIR/docker-compose.yml"
            log "INFO" "Restored docker-compose.yml"
        fi
        
        # Clean up
        rm -rf "$temp_dir"
    fi
    
    # Start the container
    log "INFO" "Starting OpenWebRX container..."
    cd "$OPENWEBRX_DIR"
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
    else
        # Fallback to direct docker run if no compose file
        docker run -d \
            --name "$CONTAINER_NAME" \
            --device /dev/bus/usb \
            -p 8073:8073 \
            -v /var/lib/openwebrx:/var/lib/openwebrx \
            "$loaded_image"
    fi
    
    log "INFO" "Container started successfully"
}

# Rebuild from Dockerfile
rebuild_from_dockerfile() {
    log "INFO" "Starting rebuild from Dockerfile..."
    
    # Check if OpenWebRX directory exists
    if [ ! -d "$OPENWEBRX_DIR" ]; then
        log "ERROR" "OpenWebRX directory not found: $OPENWEBRX_DIR"
        echo -e "${YELLOW}Would you like to clone the OpenWebRX repository? (y/n):${NC} \c"
        read -r response
        
        if [[ "$response" =~ ^[Yy]$ ]]; then
            log "INFO" "Cloning OpenWebRX repository..."
            git clone https://github.com/jketterl/openwebrx.git "$OPENWEBRX_DIR"
        else
            log "ERROR" "Cannot proceed without OpenWebRX directory"
            return 1
        fi
    fi
    
    cd "$OPENWEBRX_DIR"
    
    # Check for docker-compose.yml
    if [ ! -f "docker-compose.yml" ]; then
        log "INFO" "Creating default docker-compose.yml..."
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  openwebrx:
    image: jketterl/openwebrx:stable
    container_name: openwebrx
    restart: unless-stopped
    devices:
      - /dev/bus/usb
    ports:
      - "8073:8073"
    volumes:
      - /var/lib/openwebrx:/var/lib/openwebrx
    environment:
      - OPENWEBRX_ADMIN_PASSWORD=hackrf
EOF
        log "INFO" "Created default docker-compose.yml"
    fi
    
    # Pull or build the image
    log "INFO" "Building/pulling OpenWebRX image..."
    echo -e "${YELLOW}This may take several minutes...${NC}"
    
    if [ -f "Dockerfile" ]; then
        # Build from Dockerfile
        docker-compose build
    else
        # Pull the image
        docker-compose pull
    fi
    
    # Start the container
    log "INFO" "Starting OpenWebRX container..."
    docker-compose up -d
    
    log "INFO" "Container started successfully"
}

# Verify restoration
verify_restoration() {
    log "INFO" "Verifying restoration..."
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "ERROR" "Container is not running"
        return 1
    fi
    
    # Wait for container to be healthy
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}Waiting for OpenWebRX to start...${NC}"
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:8073 | grep -q "200\|302"; then
            log "INFO" "OpenWebRX is responding on port 8073"
            break
        fi
        
        sleep 2
        ((attempt++))
        echo -n "."
    done
    echo
    
    if [ $attempt -eq $max_attempts ]; then
        log "WARNING" "OpenWebRX did not respond within expected time"
        log "WARNING" "Check logs with: docker logs $CONTAINER_NAME"
    fi
    
    # Display container info
    echo -e "\n${GREEN}Restoration Summary:${NC}"
    echo "Container Name: $CONTAINER_NAME"
    echo "Status: $(docker ps --filter name=$CONTAINER_NAME --format 'table {{.Status}}' | tail -n 1)"
    echo "Ports: $(docker ps --filter name=$CONTAINER_NAME --format 'table {{.Ports}}' | tail -n 1)"
    echo
    echo -e "${BLUE}Access OpenWebRX at:${NC} http://localhost:8073"
    echo -e "${BLUE}Default credentials:${NC} admin/hackrf"
    echo
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  View logs:        docker logs -f $CONTAINER_NAME"
    echo "  Stop container:   docker stop $CONTAINER_NAME"
    echo "  Start container:  docker start $CONTAINER_NAME"
    echo "  Enter container:  docker exec -it $CONTAINER_NAME /bin/bash"
}

# Main execution
main() {
    echo -e "${BLUE}=== OpenWebRX Restore Script ===${NC}\n"
    
    # Initialize log
    echo "OpenWebRX Restore Log - $(date)" > "$LOG_FILE"
    
    # Check prerequisites
    check_prerequisites
    
    # Parse command line arguments
    case "${1:-}" in
        --image|--backup)
            log "INFO" "Restore method: From backup image"
            stop_existing_container
            if restore_from_image; then
                verify_restoration
                log "INFO" "Restoration completed successfully"
            else
                log "ERROR" "Restoration failed"
                exit 1
            fi
            ;;
            
        --build|--rebuild)
            log "INFO" "Restore method: Rebuild from Dockerfile"
            stop_existing_container
            if rebuild_from_dockerfile; then
                verify_restoration
                log "INFO" "Rebuild completed successfully"
            else
                log "ERROR" "Rebuild failed"
                exit 1
            fi
            ;;
            
        --help|-h)
            show_help
            exit 0
            ;;
            
        *)
            echo -e "${YELLOW}Please select a restoration method:${NC}"
            echo "  1) Restore from backup image"
            echo "  2) Rebuild from Dockerfile"
            echo -e "\nSelection (1-2): \c"
            read -r choice
            
            case "$choice" in
                1)
                    stop_existing_container
                    if restore_from_image; then
                        verify_restoration
                        log "INFO" "Restoration completed successfully"
                    else
                        log "ERROR" "Restoration failed"
                        exit 1
                    fi
                    ;;
                2)
                    stop_existing_container
                    if rebuild_from_dockerfile; then
                        verify_restoration
                        log "INFO" "Rebuild completed successfully"
                    else
                        log "ERROR" "Rebuild failed"
                        exit 1
                    fi
                    ;;
                *)
                    log "ERROR" "Invalid selection"
                    exit 1
                    ;;
            esac
            ;;
    esac
    
    echo -e "\n${GREEN}Process completed. Check log at: $LOG_FILE${NC}"
}

# Run main function
main "$@"
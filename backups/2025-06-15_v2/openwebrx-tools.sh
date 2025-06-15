#!/bin/bash

# openwebrx-tools.sh
# Tools for managing and troubleshooting OpenWebRX Docker installation
#
# Security Note: This script now uses environment variables for credentials
# instead of hardcoded values. Credentials are loaded from .env file via load_config.sh
# Configure credentials in .env file using the template config.template.env

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment configuration
if [ -f "$SCRIPT_DIR/load_config.sh" ]; then
    source "$SCRIPT_DIR/load_config.sh"
else
    echo "Warning: load_config.sh not found. Using default values."
    # Set default values for OpenWebRX credentials
    export OPENWEBRX_ADMIN_USER="${OPENWEBRX_ADMIN_USER:-admin}"
    export OPENWEBRX_ADMIN_PASSWORD="${OPENWEBRX_ADMIN_PASSWORD:-hackrf}"
    export OPENWEBRX_PORT="${OPENWEBRX_PORT:-8073}"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to show menu
show_menu() {
    echo -e "\n${BLUE}=== OpenWebRX Docker Tools ===${NC}"
    echo "1) Check status"
    echo "2) View logs (live)"
    echo "3) View logs (last 100 lines)"
    echo "4) Restart container"
    echo "5) Stop container"
    echo "6) Start container"
    echo "7) Apply HackRF config"
    echo "8) Test HackRF inside container"
    echo "9) Shell into container"
    echo "10) Show container stats"
    echo "11) Backup volumes"
    echo "12) Restore volumes"
    echo "13) Clean rebuild everything"
    echo "14) Check USB devices"
    echo "15) Fix permissions"
    echo "0) Exit"
    echo
}

# Function to check status
check_status() {
    echo -e "\n${BLUE}Container Status:${NC}"
    if docker ps | grep -q openwebrx; then
        echo -e "${GREEN}✓ OpenWebRX is running${NC}"
        docker ps --filter name=openwebrx --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        echo -e "\n${BLUE}Resource Usage:${NC}"
        docker stats --no-stream openwebrx
        
        IP=$(hostname -I | cut -d' ' -f1)
        echo -e "\n${BLUE}Access Information:${NC}"
        echo "URL: http://$IP:${OPENWEBRX_PORT}"
        echo "Username: ${OPENWEBRX_ADMIN_USER}"
        echo "Password: ${OPENWEBRX_ADMIN_PASSWORD}"
    else
        echo -e "${RED}✗ OpenWebRX is not running${NC}"
        echo
        echo "Recent containers:"
        docker ps -a --filter name=openwebrx --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
    
    echo -e "\n${BLUE}HackRF Status:${NC}"
    if lsusb | grep -q "HackRF"; then
        echo -e "${GREEN}✓ HackRF detected on host${NC}"
        lsusb | grep -i hackrf
    else
        echo -e "${RED}✗ HackRF not detected on host${NC}"
    fi
}

# Function to view logs
view_logs_live() {
    echo -e "${BLUE}Showing live logs (Ctrl+C to stop)...${NC}"
    docker logs -f openwebrx
}

view_logs_tail() {
    echo -e "${BLUE}Last 100 lines of logs:${NC}"
    docker logs --tail 100 openwebrx
}

# Function to apply HackRF config
apply_hackrf_config() {
    echo -e "${BLUE}Applying HackRF configuration...${NC}"
    
    if [ -f "${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}-hackrf-config.json" ]; then
        CONFIG_FILE="${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}-hackrf-config.json"
    elif [ -f "/home/pi/projects/stinkster/openwebrx-hackrf-config.json" ]; then
        CONFIG_FILE="/home/pi/projects/stinkster/openwebrx-hackrf-config.json"
    else
        echo -e "${RED}Error: HackRF config file not found${NC}"
        return 1
    fi
    
    # Copy config to container
    docker cp "$CONFIG_FILE" openwebrx:/tmp/sdrs.json
    docker exec openwebrx cp /tmp/sdrs.json /var/lib/openwebrx/sdrs.json
    
    echo -e "${GREEN}Configuration applied. Restarting container...${NC}"
    docker restart openwebrx
    sleep 5
    check_status
}

# Function to test HackRF
test_hackrf() {
    echo -e "${BLUE}Testing HackRF inside container...${NC}"
    
    echo "1. Checking for HackRF device:"
    docker exec openwebrx hackrf_info 2>&1 || echo -e "${YELLOW}hackrf_info not available or device not found${NC}"
    
    echo -e "\n2. Checking SoapySDR devices:"
    docker exec openwebrx SoapySDRUtil --find 2>&1 || echo -e "${YELLOW}SoapySDR not available${NC}"
    
    echo -e "\n3. Checking USB devices inside container:"
    docker exec openwebrx ls -la /dev/bus/usb/*/* | grep -E "(1d50|hackrf)" || echo "No HackRF USB devices found"
    
    echo -e "\n4. Checking current SDR configuration:"
    docker exec openwebrx cat /var/lib/openwebrx/sdrs.json 2>/dev/null | jq . || echo "No configuration found"
}

# Function to backup volumes
backup_volumes() {
    BACKUP_DIR="/home/pi/projects/stinkster/docker-backup"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$BACKUP_DIR"
    
    echo -e "${BLUE}Backing up Docker volumes...${NC}"
    
    # Backup settings volume
    if docker volume ls | grep -q openwebrx-settings; then
        echo "Backing up openwebrx-settings..."
        docker run --rm -v openwebrx-settings:/source -v "$BACKUP_DIR":/backup alpine \
            tar czf /backup/openwebrx-settings_${TIMESTAMP}.tar.gz -C /source .
        echo -e "${GREEN}✓ Saved to: $BACKUP_DIR/openwebrx-settings_${TIMESTAMP}.tar.gz${NC}"
    fi
    
    # Backup config volume
    if docker volume ls | grep -q openwebrx-config; then
        echo "Backing up openwebrx-config..."
        docker run --rm -v openwebrx-config:/source -v "$BACKUP_DIR":/backup alpine \
            tar czf /backup/openwebrx-config_${TIMESTAMP}.tar.gz -C /source .
        echo -e "${GREEN}✓ Saved to: $BACKUP_DIR/openwebrx-config_${TIMESTAMP}.tar.gz${NC}"
    fi
    
    echo -e "${GREEN}Backup complete!${NC}"
    ls -lh "$BACKUP_DIR"/*_${TIMESTAMP}.tar.gz
}

# Function to restore volumes
restore_volumes() {
    BACKUP_DIR="/home/pi/projects/stinkster/docker-backup"
    
    echo -e "${BLUE}Available backups:${NC}"
    ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | nl -w2 -s') '
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}No backups found in $BACKUP_DIR${NC}"
        return 1
    fi
    
    echo
    read -p "Enter backup number to restore (or 0 to cancel): " choice
    
    if [ "$choice" = "0" ]; then
        return 0
    fi
    
    BACKUP_FILE=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | sed -n "${choice}p")
    
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}Invalid selection${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Warning: This will overwrite current volumes!${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    # Stop container
    docker stop openwebrx 2>/dev/null || true
    
    # Determine which volume to restore
    if [[ "$BACKUP_FILE" == *"openwebrx-settings"* ]]; then
        VOLUME="openwebrx-settings"
    elif [[ "$BACKUP_FILE" == *"openwebrx-config"* ]]; then
        VOLUME="openwebrx-config"
    else
        echo -e "${RED}Cannot determine volume type from filename${NC}"
        return 1
    fi
    
    # Restore volume
    echo "Restoring $VOLUME from $BACKUP_FILE..."
    docker run --rm -v "$VOLUME":/target -v "$BACKUP_DIR":/backup alpine \
        sh -c "rm -rf /target/* && tar xzf /backup/$(basename "$BACKUP_FILE") -C /target"
    
    echo -e "${GREEN}✓ Restore complete${NC}"
    
    # Restart container
    echo "Starting container..."
    cd /home/pi/projects/stinkster && docker-compose up -d
}

# Function to check USB devices
check_usb() {
    echo -e "${BLUE}USB Device Information:${NC}"
    
    echo -e "\n${YELLOW}All USB devices:${NC}"
    lsusb
    
    echo -e "\n${YELLOW}HackRF specific:${NC}"
    lsusb -v -d 1d50: 2>/dev/null | grep -E "(idVendor|idProduct|bcdDevice|iProduct)" || echo "No HackRF devices found"
    
    echo -e "\n${YELLOW}USB device permissions:${NC}"
    ls -la /dev/bus/usb/*/* | grep -E "(1d50|hackrf)" || echo "No HackRF device files found"
    
    echo -e "\n${YELLOW}USB tree:${NC}"
    lsusb -t
}

# Function to fix permissions
fix_permissions() {
    echo -e "${BLUE}Fixing permissions...${NC}"
    
    # Add user to necessary groups
    echo "Adding user to groups..."
    sudo usermod -aG plugdev $USER 2>/dev/null || true
    sudo usermod -aG dialout $USER 2>/dev/null || true
    
    # Create udev rule for HackRF
    echo "Creating udev rule for HackRF..."
    sudo tee /etc/udev/rules.d/53-hackrf.rules > /dev/null << 'EOF'
# HackRF One
SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="6089", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="604b", MODE="0666", GROUP="plugdev"
EOF
    
    # Reload udev rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    
    echo -e "${GREEN}✓ Permissions fixed${NC}"
    echo -e "${YELLOW}Note: You may need to logout and login again for group changes to take effect${NC}"
}

# Main loop
while true; do
    show_menu
    read -p "Select option: " choice
    
    case $choice in
        1) check_status ;;
        2) view_logs_live ;;
        3) view_logs_tail ;;
        4) docker restart openwebrx && echo -e "${GREEN}Container restarted${NC}" ;;
        5) docker stop openwebrx && echo -e "${GREEN}Container stopped${NC}" ;;
        6) cd /home/pi/projects/stinkster && docker-compose up -d && echo -e "${GREEN}Container started${NC}" ;;
        7) apply_hackrf_config ;;
        8) test_hackrf ;;
        9) echo -e "${BLUE}Entering container shell (type 'exit' to leave)...${NC}" && docker exec -it openwebrx bash ;;
        10) docker stats openwebrx ;;
        11) backup_volumes ;;
        12) restore_volumes ;;
        13) read -p "This will rebuild everything from scratch. Continue? (y/n) " -n 1 -r && echo && [[ $REPLY =~ ^[Yy]$ ]] && /home/pi/projects/stinkster/rebuild-openwebrx-docker.sh ;;
        14) check_usb ;;
        15) fix_permissions ;;
        0) echo "Exiting..." && exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
    
    echo
    read -p "Press Enter to continue..."
done
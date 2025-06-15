#!/bin/bash
# Systemd Service Installation Script for Stinkster Project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing Stinkster systemd services...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Service files to install
SERVICES=(
    "hackrf-scanner.service"
    # "openwebrx-landing.service"  # Disabled - no landing server file
)

# Copy service files
for service in "${SERVICES[@]}"; do
    if [ -f "$SCRIPT_DIR/$service" ]; then
        echo -e "${YELLOW}Installing $service...${NC}"
        cp "$SCRIPT_DIR/$service" /etc/systemd/system/
        chmod 644 /etc/systemd/system/$service
        echo -e "${GREEN}✓ $service installed${NC}"
    else
        echo -e "${RED}✗ $service not found in $SCRIPT_DIR${NC}"
    fi
done

# Reload systemd daemon
echo -e "${YELLOW}Reloading systemd daemon...${NC}"
systemctl daemon-reload

# Enable services
echo -e "${YELLOW}Enabling services...${NC}"
for service in "${SERVICES[@]}"; do
    if [ -f "/etc/systemd/system/$service" ]; then
        systemctl enable $service
        echo -e "${GREEN}✓ $service enabled${NC}"
    fi
done

# Show status
echo -e "\n${GREEN}Installation complete!${NC}"
echo -e "\nTo start the services, run:"
for service in "${SERVICES[@]}"; do
    echo -e "  ${YELLOW}sudo systemctl start $service${NC}"
done

echo -e "\nTo check service status:"
for service in "${SERVICES[@]}"; do
    echo -e "  ${YELLOW}sudo systemctl status $service${NC}"
done

echo -e "\nTo view logs:"
for service in "${SERVICES[@]}"; do
    echo -e "  ${YELLOW}sudo journalctl -u $service -f${NC}"
done
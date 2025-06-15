#!/bin/bash
# Stinkster Configuration Setup Script
# This script helps set up configuration files from templates

set -e

echo "==================================="
echo "Stinkster Configuration Setup"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${YELLOW}Warning: $1 already exists.${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    return 0
}

# Function to generate random key
generate_key() {
    python3 -c "import secrets; print(secrets.token_hex(32))"
}

# Main configuration setup
echo "Setting up configuration files from templates..."
echo ""

# 1. Setup .env file
if check_file ".env"; then
    cp config.template.env .env
    echo -e "${GREEN}✓ Created .env from template${NC}"
    
    # Generate Flask secret key
    FLASK_KEY=$(generate_key)
    sed -i "s/GENERATE_A_RANDOM_SECRET_KEY_HERE/$FLASK_KEY/" .env
    
    # Generate API key
    API_KEY=$(generate_key | cut -c1-32)
    sed -i "s/YOUR_API_KEY_FOR_WEBHOOKS/$API_KEY/" .env
    
    echo -e "${GREEN}✓ Generated secure keys${NC}"
    echo ""
    echo -e "${YELLOW}Please edit .env to add:${NC}"
    echo "  - TAK server IP and credentials"
    echo "  - OpenWebRX admin password"
    echo "  - Your location and callsign"
fi

# 2. Setup Kismet configuration
if check_file "kismet_site.conf"; then
    cp kismet-config.template.conf kismet_site.conf
    echo -e "${GREEN}✓ Created kismet_site.conf from template${NC}"
    echo ""
    echo -e "${YELLOW}To set Kismet password, run:${NC}"
    echo "  kismet --make-password"
fi

# 3. Copy JSON configs
CONFIG_FILES=(
    "wigletotak-config.template.json:wigletotak-config.json"
    "spectrum-analyzer-config.template.json:spectrum-analyzer-config.json"
    "gpsmav-config.template.json:gpsmav-config.json"
    "webhook-config.template.json:webhook-config.json"
)

for config_pair in "${CONFIG_FILES[@]}"; do
    IFS=':' read -r template target <<< "$config_pair"
    if check_file "$target"; then
        cp "$template" "$target"
        echo -e "${GREEN}✓ Created $target from template${NC}"
    fi
done

# 4. Setup service orchestration config
if check_file "service-orchestration.conf"; then
    cp service-orchestration.template.conf service-orchestration.conf
    echo -e "${GREEN}✓ Created service-orchestration.conf from template${NC}"
fi

# 5. Check USB devices
echo ""
echo "Checking for USB devices..."
if ls /dev/ttyUSB* 2>/dev/null; then
    echo -e "${GREEN}Found USB devices:${NC}"
    ls -l /dev/ttyUSB*
else
    echo -e "${YELLOW}No USB devices found. Please connect your GPS/MAVLink device.${NC}"
fi

# 6. Check network interfaces
echo ""
echo "Checking network interfaces..."
if ip link show | grep -q "wlan"; then
    echo -e "${GREEN}Found WiFi interfaces:${NC}"
    ip link show | grep "wlan" | awk -F': ' '{print $2}'
else
    echo -e "${YELLOW}No WiFi interfaces found.${NC}"
fi

# 7. Create required directories
echo ""
echo "Creating required directories..."
mkdir -p ${LOG_DIR:-/home/pi/projects/stinkster/logs}
mkdir -p ${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}
mkdir -p /home/pi/backups
echo -e "${GREEN}✓ Directories created${NC}"

# 8. Set permissions
echo ""
echo "Setting file permissions..."
chmod 600 .env 2>/dev/null || true
chmod 600 *-config.json 2>/dev/null || true
chmod 600 *.conf 2>/dev/null || true
echo -e "${GREEN}✓ Permissions set${NC}"

# Summary
echo ""
echo "==================================="
echo "Configuration Setup Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your specific values"
echo "2. Update TAK server settings in wigletotak-config.json"
echo "3. Configure your WiFi interface in kismet_site.conf"
echo "4. Set Kismet password: kismet --make-password"
echo "5. Review and adjust other config files as needed"
echo ""
echo "To start services:"
echo "  docker-compose up -d         # Start OpenWebRX"
echo "  ./gps_kismet_wigle.sh       # Start main services"
echo ""
echo -e "${YELLOW}Remember: Never commit configuration files with real credentials!${NC}"
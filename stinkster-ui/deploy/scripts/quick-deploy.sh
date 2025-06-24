#!/bin/bash
# Quick deployment script for WigleToTAK
# Simplified deployment for development/testing

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}WigleToTAK Quick Deploy${NC}"
echo "========================="

# Check if running from correct directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "Error: Must run from stinkster-ui directory"
    exit 1
fi

# Build the application
echo -e "\n${YELLOW}Building application...${NC}"
./deploy/scripts/build-production.sh

# Find latest build
LATEST_BUILD=$(ls -t deploy/builds/wigletotak_*.tar.gz | head -1)

if [ -z "$LATEST_BUILD" ]; then
    echo "Error: No build found"
    exit 1
fi

echo -e "\n${YELLOW}Found build: $LATEST_BUILD${NC}"

# Deploy it
echo -e "\n${YELLOW}Deploying...${NC}"
sudo ./deploy/scripts/deploy.sh deploy "$LATEST_BUILD"

echo -e "\n${GREEN}Deployment complete!${NC}"
echo "Access the application at: http://$(hostname -I | awk '{print $1}')"
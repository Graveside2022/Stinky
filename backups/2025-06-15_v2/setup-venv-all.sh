#!/bin/bash
#
# Master Virtual Environment Setup Script
# Sets up all component virtual environments for the Stinkster project
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORCE_RECREATE="${1:-}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Stinkster Project - Virtual Environment Setup ===${NC}"
echo "This script will set up all component virtual environments"
echo ""

# Function to run component setup
setup_component() {
    local component_name="$1"
    local setup_script="$2"
    
    echo -e "${GREEN}Setting up: $component_name${NC}"
    echo "Running: $setup_script"
    
    if [ -f "$setup_script" ]; then
        chmod +x "$setup_script"
        if [ "$FORCE_RECREATE" = "--force" ]; then
            "$setup_script" --force
        else
            "$setup_script"
        fi
        echo -e "${GREEN}✓ $component_name setup complete${NC}"
    else
        echo -e "${RED}✗ Setup script not found: $setup_script${NC}"
        return 1
    fi
    echo ""
}

# Main setup sequence
echo "Starting virtual environment setup for all components..."
echo ""

# Set up each component
setup_component "GPSmav" "${SCRIPT_DIR}/setup-venv-gpsmav.sh"
setup_component "WigleToTAK" "${SCRIPT_DIR}/setup-venv-wigletotak.sh"
setup_component "HackRF" "${SCRIPT_DIR}/setup-venv-hackrf.sh"
setup_component "Web Services" "${SCRIPT_DIR}/setup-venv-web.sh"

# Summary
echo -e "${BLUE}=== Setup Summary ===${NC}"
echo "All virtual environments have been created and configured:"
echo ""
echo "• GPSmav: /home/pi/gpsmav/GPSmav/venv"
echo "• WigleToTAK: /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/venv"
echo "• HackRF: /home/pi/HackRF/venv"
echo "• Web Services: /home/pi/web/venv"
echo ""
echo -e "${GREEN}Virtual environment setup complete!${NC}"
echo ""
echo "To manage environments individually, use the component-specific scripts:"
echo "• setup-venv-gpsmav.sh"
echo "• setup-venv-wigletotak.sh"
echo "• setup-venv-hackrf.sh"
echo "• setup-venv-web.sh"
echo ""
echo "To recreate all environments: $0 --force"
#!/bin/bash
#
# GPSmav Virtual Environment Setup Script
# Creates and configures virtual environment for GPS/MAVLink bridge
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPONENT_NAME="GPSmav"

# Source environment if available
if [ -f "${SCRIPT_DIR}/setup-env.sh" ]; then
    source "${SCRIPT_DIR}/setup-env.sh"
fi

# Set paths with fallbacks
VENV_PATH="${GPSMAV_DIR:-/home/pi/gpsmav/GPSmav}/venv"
REQ_FILE="${SCRIPT_DIR}/requirements-gpsmav.txt"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== GPSmav Virtual Environment Setup ===${NC}"

# Check if requirements file exists
if [ ! -f "$REQ_FILE" ]; then
    echo -e "${RED}Error: Requirements file not found: $REQ_FILE${NC}"
    exit 1
fi

# Create directory if it doesn't exist
mkdir -p "$(dirname "$VENV_PATH")"

# Remove existing venv if requested
if [ "${1:-}" = "--force" ] && [ -d "$VENV_PATH" ]; then
    echo -e "${YELLOW}Removing existing virtual environment...${NC}"
    rm -rf "$VENV_PATH"
fi

# Create virtual environment
if [ ! -d "$VENV_PATH" ]; then
    echo "Creating virtual environment at: $VENV_PATH"
    python3 -m venv "$VENV_PATH"
else
    echo -e "${YELLOW}Virtual environment already exists at: $VENV_PATH${NC}"
    echo "Use --force to recreate"
fi

# Activate and install dependencies
echo "Installing dependencies from: $REQ_FILE"
source "$VENV_PATH/bin/activate"
pip install --upgrade pip
pip install -r "$REQ_FILE"

# Verify installation
echo -e "\n${GREEN}Installation verification:${NC}"
python -c "import pymavlink; print(f'pymavlink version: {pymavlink.__version__}')"
python -c "import serial; print(f'pyserial version: {serial.__version__}')"

echo -e "\n${GREEN}GPSmav virtual environment setup complete!${NC}"
echo "To activate: source $VENV_PATH/bin/activate"
echo "To run GPSmav: cd $(dirname $VENV_PATH) && source venv/bin/activate && ./mavgps.py"
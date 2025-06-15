#!/bin/bash
#
# HackRF Virtual Environment Setup Script
# Creates and configures virtual environment for spectrum analysis and SDR operations
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPONENT_NAME="HackRF"

# Source environment if available
if [ -f "${SCRIPT_DIR}/setup-env.sh" ]; then
    source "${SCRIPT_DIR}/setup-env.sh"
fi

# Set paths with fallbacks
VENV_PATH="${HACKRF_DIR:-/home/pi/HackRF}/venv"
REQ_FILE="${SCRIPT_DIR}/requirements-hackrf.txt"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== HackRF Virtual Environment Setup ===${NC}"

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
python -c "import flask; print(f'Flask version: {flask.__version__}')"
python -c "import flask_socketio; print(f'Flask-SocketIO version: {flask_socketio.__version__}')"
python -c "import numpy; print(f'NumPy version: {numpy.__version__}')"
python -c "import websockets; print(f'websockets version: {websockets.__version__}')"
python -c "import requests; print(f'requests version: {requests.__version__}')"

echo -e "\n${GREEN}HackRF virtual environment setup complete!${NC}"
echo "To activate: source $VENV_PATH/bin/activate"
echo "To run spectrum analyzer: cd $(dirname $VENV_PATH) && source venv/bin/activate && python3 spectrum_analyzer.py"
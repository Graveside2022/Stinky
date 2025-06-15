#!/bin/bash
#
# Web Services Virtual Environment Setup Script
# Creates and configures virtual environment for web interfaces and webhooks
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPONENT_NAME="Web Services"

# Source environment if available
if [ -f "${SCRIPT_DIR}/setup-env.sh" ]; then
    source "${SCRIPT_DIR}/setup-env.sh"
fi

# Set paths with fallbacks
VENV_PATH="${WEB_DIR:-/home/pi/web}/venv"
REQ_FILE="${SCRIPT_DIR}/requirements-web.txt"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Web Services Virtual Environment Setup ===${NC}"

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
python -c "import flask_cors; print(f'Flask-CORS version: {flask_cors.__version__}')"
python -c "import psutil; print(f'psutil version: {psutil.__version__}')"
python -c "import requests; print(f'requests version: {requests.__version__}')"
python -c "import dotenv; print(f'python-dotenv version: {dotenv.__version__}')"

echo -e "\n${GREEN}Web Services virtual environment setup complete!${NC}"
echo "To activate: source $VENV_PATH/bin/activate"
echo "Web services can now be run from their respective directories"
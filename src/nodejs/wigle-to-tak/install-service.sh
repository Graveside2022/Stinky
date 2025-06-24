#!/bin/bash

# WigleToTAK Node.js Service Installation Script

SERVICE_NAME="wigle-to-tak-nodejs"
SERVICE_FILE="${SERVICE_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing WigleToTAK Node.js service..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo: sudo $0"
    exit 1
fi

# Install Node.js dependencies if not already installed
echo "Checking Node.js dependencies..."
cd "$SCRIPT_DIR"
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    sudo -u pi npm install
fi

# Copy service file to systemd directory
echo "Installing systemd service..."
cp "${SCRIPT_DIR}/${SERVICE_FILE}" "/etc/systemd/system/${SERVICE_FILE}"

# Reload systemd daemon
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable the service
echo "Enabling service..."
systemctl enable "${SERVICE_NAME}"

echo "Service installed successfully!"
echo ""
echo "To start the service, run:"
echo "  sudo systemctl start ${SERVICE_NAME}"
echo ""
echo "To check status:"
echo "  sudo systemctl status ${SERVICE_NAME}"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
echo "To modify configuration, edit:"
echo "  /etc/systemd/system/${SERVICE_FILE}"
echo "  Then run: sudo systemctl daemon-reload && sudo systemctl restart ${SERVICE_NAME}"
#!/bin/bash

# This script sets up sudo permissions for the Kismet orchestration scripts
# Run this as root or with sudo

if [ "$EUID" -ne 0 ]; then 
    echo "Please run this script with sudo or as root"
    echo "Usage: sudo $0"
    exit 1
fi

SUDOERS_FILE="/etc/sudoers.d/kismet-operations"
CONFIG_FILE="/home/pi/projects/stinkster_malone/stinkster/config/kismet-sudoers"

echo "Setting up sudo permissions for Kismet operations..."

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file not found at $CONFIG_FILE"
    exit 1
fi

# Copy the sudoers configuration
cp "$CONFIG_FILE" "$SUDOERS_FILE"

# Set proper permissions (must be 0440 for sudoers files)
chmod 0440 "$SUDOERS_FILE"

# Validate the sudoers file
if visudo -c -f "$SUDOERS_FILE"; then
    echo "Sudoers configuration installed successfully!"
    echo "The 'pi' user can now run Kismet orchestration scripts without password."
else
    echo "Error: Invalid sudoers configuration!"
    rm -f "$SUDOERS_FILE"
    exit 1
fi

# Also install the systemd service if requested
if [ "$1" == "--with-systemd" ]; then
    echo "Installing systemd service..."
    cp /home/pi/projects/stinkster_malone/stinkster/systemd/kismet-orchestration.service /etc/systemd/system/
    systemctl daemon-reload
    echo "Systemd service installed. You can now use:"
    echo "  sudo systemctl start kismet-orchestration"
    echo "  sudo systemctl stop kismet-orchestration"
    echo "  sudo systemctl status kismet-orchestration"
fi

echo "Setup complete!"
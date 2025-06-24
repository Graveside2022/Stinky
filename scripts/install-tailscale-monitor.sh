#!/bin/bash

# Installation script for Tailscale monitor service

echo "Installing Tailscale Connection Monitor..."

# Copy the service file to systemd directory
sudo cp /home/pi/projects/stinkster_malone/stinkster/systemd/tailscale-monitor.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable tailscale-monitor.service

# Start the service
sudo systemctl start tailscale-monitor.service

# Check status
if sudo systemctl is-active --quiet tailscale-monitor.service; then
    echo "✓ Tailscale monitor service installed and started successfully"
    echo ""
    echo "To check the service status, run:"
    echo "  sudo systemctl status tailscale-monitor.service"
    echo ""
    echo "To view logs, run:"
    echo "  sudo journalctl -u tailscale-monitor.service -f"
    echo "  or check: /home/pi/tmp/tailscale-monitor.log"
else
    echo "✗ Failed to start Tailscale monitor service"
    echo "Check logs with: sudo journalctl -u tailscale-monitor.service"
    exit 1
fi
#!/bin/bash

# Webhook Service Deployment Script
# This script deploys the webhook service to production

set -e

echo "=== Stinkster Webhook Service Deployment ==="
echo

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "Please run this script as the 'pi' user, not as root"
   exit 1
fi

# Configuration
DEPLOY_DIR="/home/pi/stinkster/src/nodejs/webhook-service"
CURRENT_DIR="$(pwd)"

echo "1. Creating deployment directory..."
mkdir -p "$DEPLOY_DIR"

echo "2. Copying service files..."
cp -r "$CURRENT_DIR"/* "$DEPLOY_DIR/"
cd "$DEPLOY_DIR"

echo "3. Installing dependencies..."
npm install --production

echo "4. Setting up environment..."
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
    echo "   ⚠️  Created .env from .env.example - please review and update settings"
fi

echo "5. Creating required directories..."
mkdir -p /home/pi/tmp
mkdir -p /home/pi/kismet_ops

echo "6. Installing systemd service..."
sudo cp "$DEPLOY_DIR/webhook.service" /etc/systemd/system/
sudo systemctl daemon-reload

echo "7. Testing service startup..."
node webhook.js &
NODE_PID=$!
sleep 3

# Test health endpoint
if curl -f -s http://localhost:8002/health > /dev/null; then
    echo "   ✅ Service started successfully"
    kill $NODE_PID
else
    echo "   ❌ Service failed to start"
    kill $NODE_PID 2>/dev/null || true
    exit 1
fi

echo
echo "=== Deployment Complete ==="
echo
echo "Next steps:"
echo "1. Review and update configuration: $DEPLOY_DIR/.env"
echo "2. Enable the service: sudo systemctl enable webhook"
echo "3. Start the service: sudo systemctl start webhook"
echo "4. Check service status: sudo systemctl status webhook"
echo "5. View logs: journalctl -u webhook -f"
echo
echo "To test the service:"
echo "- Open test_button_integration.html in a browser"
echo "- Or run: node test_webhook.js"
echo
echo "Update nginx configuration to proxy /webhook/ to port 8002"
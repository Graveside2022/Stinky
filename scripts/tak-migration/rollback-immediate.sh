#!/bin/bash
# Immediate rollback script for TAK migration
# This script quickly reverts to Python-only operation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/home/pi/tmp/tak-rollback-$(date +%Y%m%d_%H%M%S).log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting immediate rollback to Python WigleToTAK"

# Step 1: Stop Node.js service
log "Stopping Node.js WigleToTAK service..."
if pgrep -f "node.*wigle-to-tak" > /dev/null; then
    pkill -f "node.*wigle-to-tak" || true
    sleep 2
fi

# Step 2: Ensure Python service is running
log "Checking Python WigleToTAK service..."
if ! pgrep -f "python.*WigleToTak2.py" > /dev/null; then
    log "Python service not running, starting it..."
    cd /home/pi/projects/stinkster/src/wigletotak/WigleToTAK/TheStinkToTAK
    source venv/bin/activate
    nohup python3 WigleToTak2.py --flask-port 8000 > /home/pi/tmp/wigletotak.log 2>&1 &
    PYTHON_PID=$!
    echo "$PYTHON_PID" > /home/pi/tmp/wigletotak.pid
    deactivate
    log "Python service started with PID: $PYTHON_PID"
else
    log "Python service already running"
fi

# Step 3: Update nginx configuration (if using load balancer)
if [ -f /etc/nginx/sites-available/wigletotak-migration ]; then
    log "Updating nginx configuration..."
    cat > /tmp/nginx-wigletotak-rollback << 'EOF'
upstream wigletotak {
    server localhost:8000 weight=100;  # Python only
}

server {
    listen 8080;
    server_name localhost;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }
}
EOF
    
    sudo cp /tmp/nginx-wigletotak-rollback /etc/nginx/sites-available/wigletotak-migration
    sudo nginx -t && sudo nginx -s reload
    log "Nginx configuration updated"
fi

# Step 4: Update systemd services (if applicable)
if systemctl is-active --quiet wigletotak-nodejs; then
    log "Stopping systemd Node.js service..."
    sudo systemctl stop wigletotak-nodejs || true
    sudo systemctl disable wigletotak-nodejs || true
fi

if systemctl is-enabled --quiet wigletotak-python; then
    log "Ensuring Python systemd service is running..."
    sudo systemctl start wigletotak-python || true
fi

# Step 5: Verify rollback
sleep 3
log "Verifying rollback..."

# Check Python service
if curl -s -f http://localhost:8000/ > /dev/null 2>&1; then
    log "✓ Python service responding on port 8000"
else
    log "✗ Python service NOT responding on port 8000"
    exit 1
fi

# Check Node.js service is stopped
if ! curl -s -f http://localhost:3002/health > /dev/null 2>&1; then
    log "✓ Node.js service stopped"
else
    log "⚠ Node.js service still running on port 3002"
fi

# Step 6: Send notification (if configured)
if [ -n "$ROLLBACK_NOTIFY_URL" ]; then
    curl -X POST "$ROLLBACK_NOTIFY_URL" \
        -H "Content-Type: application/json" \
        -d "{\"event\": \"tak_rollback_immediate\", \"status\": \"complete\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
        > /dev/null 2>&1 || true
fi

log "Immediate rollback completed successfully"
log "Log file: $LOG_FILE"

# Display current status
echo
echo "Current Status:"
echo "==============="
echo "Python WigleToTAK: http://localhost:8000"
echo "Node.js WigleToTAK: Stopped"
echo
echo "To monitor Python service:"
echo "  tail -f /home/pi/tmp/wigletotak.log"
echo
echo "To restore dual operation:"
echo "  ${SCRIPT_DIR}/restore-dual-operation.sh"
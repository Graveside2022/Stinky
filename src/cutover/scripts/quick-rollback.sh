#!/bin/bash

# Quick Rollback Script - Immediate traffic reversion
# Execution time: < 1 minute

set -euo pipefail

# Configuration
LOG_FILE="/var/log/stinkster-migration/rollback.log"
BACKUP_DIR="/home/pi/projects/stinkster_christian/stinkster/backups"
NGINX_CONFIG="/etc/nginx/sites-available/stinkster-migration"
NGINX_UPSTREAM="/etc/nginx/conf.d/stinkster-upstream.conf"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
    log "SUCCESS: $1"
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
    log "WARNING: $1"
}

info() {
    echo -e "${BLUE}INFO: $1${NC}"
    log "INFO: $1"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log "=== Starting Quick Rollback ==="

# Step 1: Immediately revert nginx to 100% legacy traffic
info "Reverting traffic to legacy system..."

cat > "$NGINX_UPSTREAM" <<EOF
# ROLLBACK: 100% Legacy Traffic
# Generated: $(date)
# Reason: Quick rollback initiated

upstream stinkster_backend {
    # Legacy Python system only
    server 127.0.0.1:8000 weight=100 max_fails=3 fail_timeout=30s;
    
    # New system disabled
    # server 127.0.0.1:3001 weight=0;
}

upstream stinkster_websocket {
    server 127.0.0.1:8000;
}
EOF

# Test and reload nginx
if nginx -t; then
    systemctl reload nginx
    success "Traffic reverted to legacy system"
else
    error "Nginx configuration test failed"
fi

# Step 2: Stop new Node.js services
info "Stopping new services..."

# Stop services gracefully
for pid_file in /var/run/stinkster-*.pid; do
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        service_name=$(basename "$pid_file" .pid)
        
        if kill -0 "$pid" 2>/dev/null; then
            info "Stopping $service_name (PID: $pid)"
            kill -TERM "$pid"
            sleep 2
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                warning "Force killing $service_name"
                kill -KILL "$pid"
            fi
        fi
        
        rm -f "$pid_file"
    fi
done

# Stop any remaining Node.js processes
pkill -f "node.*stinkster" || true

success "New services stopped"

# Step 3: Verify legacy services are running
info "Verifying legacy services..."

LEGACY_OK=true

# Check Python services
if pgrep -f "WigleToTak2.py" > /dev/null; then
    success "WigleToTak2 is running"
else
    warning "WigleToTak2 is not running"
    LEGACY_OK=false
fi

if pgrep -f "spectrum_analyzer.py" > /dev/null; then
    success "Spectrum Analyzer is running"
else
    warning "Spectrum Analyzer is not running"
    LEGACY_OK=false
fi

# Check ports
if netstat -tuln | grep -q ":8000 "; then
    success "Port 8000 is listening"
else
    warning "Port 8000 is not listening"
    LEGACY_OK=false
fi

if netstat -tuln | grep -q ":8092 "; then
    success "Port 8092 is listening"
else
    warning "Port 8092 is not listening"
    LEGACY_OK=false
fi

# Step 4: Send notification
info "Sending rollback notification..."

# Create rollback report
REPORT_FILE="/tmp/rollback-report-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" <<EOF
ROLLBACK REPORT
===============
Time: $(date)
Type: Quick Rollback
Duration: < 1 minute

Services Status:
- Legacy services: ${LEGACY_OK}
- New services: Stopped
- Traffic: 100% to legacy

Next Steps:
1. Check application logs for errors
2. Verify user access is restored
3. Investigate root cause
4. Plan remediation

Logs:
- Migration log: $LOG_FILE
- Legacy logs: /home/pi/tmp/*.log
- Nginx logs: /var/log/nginx/stinkster-*.log
EOF

cat "$REPORT_FILE"

# Step 5: Final verification
sleep 3

if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ | grep -q "200"; then
    success "Legacy system responding"
else
    error "Legacy system not responding - manual intervention required"
fi

# Log completion
log "Quick rollback completed in $(($SECONDS / 60)) minutes and $(($SECONDS % 60)) seconds"

echo ""
echo "========================================="
echo "ROLLBACK COMPLETE"
echo "========================================="
echo ""
echo "Status: ${LEGACY_OK}"
echo "Traffic: 100% to legacy system"
echo "Report: $REPORT_FILE"
echo ""
echo "Verify system functionality:"
echo "  - http://localhost:8000 (WigleToTAK)"
echo "  - http://localhost:8092 (Spectrum Analyzer)"
echo ""

if [ "$LEGACY_OK" = true ]; then
    success "Rollback successful - system restored to legacy state"
    exit 0
else
    error "Rollback completed with warnings - manual verification required"
    exit 1
fi
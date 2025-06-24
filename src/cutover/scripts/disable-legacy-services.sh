#!/bin/bash

# Disable Legacy Services Script
# Safely stops and disables legacy Python services

set -euo pipefail

# Configuration
LOG_FILE="/var/log/stinkster-migration/disable-legacy.log"
BACKUP_DIR="/home/pi/projects/stinkster_christian/stinkster/backups/legacy-$(date +%Y%m%d-%H%M%S)"

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

info() {
    echo -e "${BLUE}INFO: $1${NC}"
    log "INFO: $1"
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
    log "SUCCESS: $1"
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
    log "WARNING: $1"
}

# Create directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

log "=== Starting Legacy Service Shutdown ==="

# Step 1: Backup current state
info "Creating backup of current state..."

# Save process list
ps aux > "$BACKUP_DIR/process-list.txt"

# Save service ports
netstat -tuln > "$BACKUP_DIR/ports-list.txt"

# Backup crontab
crontab -l > "$BACKUP_DIR/crontab.txt" 2>/dev/null || true

success "Backup created in $BACKUP_DIR"

# Step 2: Stop legacy Python services
info "Stopping legacy Python services..."

LEGACY_SERVICES=(
    "WigleToTak2.py:WigleToTAK"
    "spectrum_analyzer.py:Spectrum Analyzer"
    "mavgps.py:GPS MAVLink Bridge"
)

for service_spec in "${LEGACY_SERVICES[@]}"; do
    process="${service_spec%:*}"
    name="${service_spec#*:}"
    
    pids=$(pgrep -f "$process" || true)
    
    if [ -n "$pids" ]; then
        info "Stopping $name (PIDs: $pids)"
        
        # Try graceful shutdown first
        for pid in $pids; do
            kill -TERM $pid 2>/dev/null || true
        done
        
        sleep 3
        
        # Force kill if still running
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                warning "Force killing $name (PID: $pid)"
                kill -KILL $pid 2>/dev/null || true
            fi
        done
        
        success "$name stopped"
    else
        info "$name was not running"
    fi
done

# Step 3: Stop orchestration script
info "Stopping orchestration script..."

if pgrep -f "gps_kismet_wigle.sh" > /dev/null; then
    pkill -f "gps_kismet_wigle.sh" || true
    success "Orchestration script stopped"
else
    info "Orchestration script was not running"
fi

# Step 4: Clean up PID files
info "Cleaning up PID files..."

PID_FILES=(
    "/home/pi/tmp/gps_kismet_wigle.pids"
    "/home/pi/tmp/kismet.pid"
    "/home/pi/tmp/wigletotak.pid"
    "/home/pi/tmp/gpsmav.pid"
)

for pid_file in "${PID_FILES[@]}"; do
    if [ -f "$pid_file" ]; then
        mv "$pid_file" "$BACKUP_DIR/" 2>/dev/null || true
        info "Moved $pid_file to backup"
    fi
done

# Step 5: Disable cron entries
info "Disabling cron entries..."

crontab -l 2>/dev/null | grep -v "gps_kismet_wigle.sh" | crontab - || true
success "Cron entries disabled"

# Step 6: Verify services are stopped
info "Verifying services are stopped..."

ALL_STOPPED=true
for service_spec in "${LEGACY_SERVICES[@]}"; do
    process="${service_spec%:*}"
    name="${service_spec#*:}"
    
    if pgrep -f "$process" > /dev/null; then
        warning "$name is still running"
        ALL_STOPPED=false
    else
        success "$name is stopped"
    fi
done

# Step 7: Free up ports
info "Checking port availability..."

LEGACY_PORTS=(
    "8000:WigleToTAK"
    "8092:Spectrum Analyzer"
)

for port_spec in "${LEGACY_PORTS[@]}"; do
    port="${port_spec%:*}"
    name="${port_spec#*:}"
    
    if netstat -tuln | grep -q ":$port "; then
        warning "Port $port ($name) is still in use"
        
        # Try to find and kill process using the port
        pid=$(lsof -ti:$port 2>/dev/null | head -1)
        if [ -n "$pid" ]; then
            warning "Killing process $pid using port $port"
            kill -KILL $pid 2>/dev/null || true
        fi
    else
        success "Port $port is free"
    fi
done

# Step 8: Create status report
REPORT_FILE="$BACKUP_DIR/shutdown-report.txt"
cat > "$REPORT_FILE" <<EOF
LEGACY SERVICE SHUTDOWN REPORT
==============================
Date: $(date)
Status: $([ "$ALL_STOPPED" = true ] && echo "SUCCESS" || echo "PARTIAL")

Services Stopped:
EOF

for service_spec in "${LEGACY_SERVICES[@]}"; do
    process="${service_spec%:*}"
    name="${service_spec#*:}"
    
    if pgrep -f "$process" > /dev/null; then
        echo "  - $name: STILL RUNNING" >> "$REPORT_FILE"
    else
        echo "  - $name: Stopped" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" <<EOF

Ports Status:
EOF

for port_spec in "${LEGACY_PORTS[@]}"; do
    port="${port_spec%:*}"
    name="${port_spec#*:}"
    
    if netstat -tuln | grep -q ":$port "; then
        echo "  - Port $port ($name): IN USE" >> "$REPORT_FILE"
    else
        echo "  - Port $port ($name): Free" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" <<EOF

Backup Location: $BACKUP_DIR

To restore legacy services:
1. Restore crontab: crontab $BACKUP_DIR/crontab.txt
2. Run orchestration: /home/pi/stinky/gps_kismet_wigle.sh
EOF

# Display summary
echo ""
echo "========================================="
echo "LEGACY SERVICE SHUTDOWN COMPLETE"
echo "========================================="
echo ""
cat "$REPORT_FILE"
echo ""

if [ "$ALL_STOPPED" = true ]; then
    success "All legacy services stopped successfully"
    log "Legacy service shutdown completed successfully"
    exit 0
else
    warning "Some services may still be running - check report"
    log "Legacy service shutdown completed with warnings"
    exit 1
fi
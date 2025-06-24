#!/bin/bash

# Full Rollback Script - Complete system restoration
# Execution time: < 5 minutes

set -euo pipefail

# Configuration
LOG_FILE="/var/log/stinkster-migration/full-rollback.log"
BACKUP_ROOT="/home/pi/projects/stinkster_christian/stinkster/backups"
PROJECT_ROOT="/home/pi/projects/stinkster_christian/stinkster"
LEGACY_SCRIPTS="/home/pi/stinky"
SYSTEMD_DIR="/etc/systemd/system"

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

log "=== Starting Full System Rollback ==="

# Step 1: Execute quick rollback first
info "Executing quick rollback to restore traffic..."
if [ -x "${PROJECT_ROOT}/src/cutover/scripts/quick-rollback.sh" ]; then
    "${PROJECT_ROOT}/src/cutover/scripts/quick-rollback.sh" || warning "Quick rollback reported warnings"
else
    warning "Quick rollback script not found - continuing with full rollback"
fi

# Step 2: Stop all new services and remove systemd units
info "Removing new service configurations..."

# Disable and remove systemd services
for service in stinkster-main stinkster-monitoring kismet-operations-center; do
    if systemctl is-enabled "$service" &>/dev/null; then
        info "Disabling $service"
        systemctl stop "$service" || true
        systemctl disable "$service" || true
    fi
    
    if [ -f "$SYSTEMD_DIR/$service.service" ]; then
        rm -f "$SYSTEMD_DIR/$service.service"
        info "Removed $service.service"
    fi
done

systemctl daemon-reload

# Step 3: Restore nginx configuration
info "Restoring original nginx configuration..."

# Find latest nginx backup
NGINX_BACKUP=$(find /etc/nginx/backups -type f -name "*.conf" | sort -r | head -1)

if [ -f "$NGINX_BACKUP" ]; then
    cp "$NGINX_BACKUP" /etc/nginx/sites-available/stinkster
    ln -sf /etc/nginx/sites-available/stinkster /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/stinkster-migration
    rm -f /etc/nginx/conf.d/stinkster-upstream.conf
    
    if nginx -t; then
        systemctl reload nginx
        success "Nginx configuration restored"
    else
        error "Nginx configuration test failed"
    fi
else
    warning "No nginx backup found - manual restoration required"
fi

# Step 4: Restore legacy startup scripts
info "Restoring legacy startup scripts..."

# Re-enable legacy services in crontab
crontab -l > /tmp/cron.tmp 2>/dev/null || true

# Remove new service entries
sed -i '/stinkster.*nodejs/d' /tmp/cron.tmp
sed -i '/monitoring.*dashboard/d' /tmp/cron.tmp

# Add legacy service entries if not present
if ! grep -q "gps_kismet_wigle.sh" /tmp/cron.tmp; then
    echo "@reboot sleep 30 && ${LEGACY_SCRIPTS}/gps_kismet_wigle.sh >> /home/pi/tmp/startup.log 2>&1" >> /tmp/cron.tmp
fi

crontab /tmp/cron.tmp
rm -f /tmp/cron.tmp

success "Crontab restored"

# Step 5: Clean up Node.js artifacts
info "Cleaning up migration artifacts..."

# Remove PID files
rm -f /var/run/stinkster-*.pid

# Archive migration logs
ARCHIVE_DIR="${BACKUP_ROOT}/rollback-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

# Move logs
mv /var/log/stinkster-migration/* "$ARCHIVE_DIR/" 2>/dev/null || true
mv /var/log/stinkster-*.log "$ARCHIVE_DIR/" 2>/dev/null || true

info "Migration logs archived to $ARCHIVE_DIR"

# Step 6: Restart legacy services if needed
info "Ensuring legacy services are running..."

# Start legacy orchestration script
if [ -f "${LEGACY_SCRIPTS}/gps_kismet_wigle.sh" ]; then
    info "Starting legacy orchestration script..."
    "${LEGACY_SCRIPTS}/gps_kismet_wigle.sh" &
    sleep 10
else
    warning "Legacy orchestration script not found"
fi

# Step 7: Verify system state
info "Verifying system state..."

ROLLBACK_SUCCESS=true
ISSUES=()

# Check services
SERVICES_TO_CHECK=(
    "kismet:Kismet"
    "gpsd:GPS Daemon"
    "WigleToTak2:WigleToTAK"
    "spectrum_analyzer:Spectrum Analyzer"
)

for service_spec in "${SERVICES_TO_CHECK[@]}"; do
    process="${service_spec%:*}"
    name="${service_spec#*:}"
    
    if pgrep -f "$process" > /dev/null; then
        success "$name is running"
    else
        warning "$name is not running"
        ISSUES+=("$name not running")
        ROLLBACK_SUCCESS=false
    fi
done

# Check critical ports
PORTS_TO_CHECK=(
    "2947:GPSD"
    "2501:Kismet"
    "8000:WigleToTAK"
    "8092:Spectrum Analyzer"
)

for port_spec in "${PORTS_TO_CHECK[@]}"; do
    port="${port_spec%:*}"
    name="${port_spec#*:}"
    
    if netstat -tuln | grep -q ":$port "; then
        success "$name port $port is listening"
    else
        warning "$name port $port is not listening"
        ISSUES+=("$name port $port not available")
        ROLLBACK_SUCCESS=false
    fi
done

# Step 8: Generate rollback report
REPORT_FILE="/tmp/full-rollback-report-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" <<EOF
FULL ROLLBACK REPORT
====================
Time: $(date)
Type: Full System Rollback
Duration: $(($SECONDS / 60)) minutes $(($SECONDS % 60)) seconds
Success: ${ROLLBACK_SUCCESS}

System State:
-------------
EOF

# Add service status
echo "Services:" >> "$REPORT_FILE"
ps aux | grep -E "kismet|gpsd|WigleToTak|spectrum_analyzer" | grep -v grep >> "$REPORT_FILE" || echo "  No services found" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "Listening Ports:" >> "$REPORT_FILE"
netstat -tuln | grep -E ":(2947|2501|8000|8092)" >> "$REPORT_FILE" || echo "  No ports found" >> "$REPORT_FILE"

# Add issues if any
if [ ${#ISSUES[@]} -gt 0 ]; then
    echo "" >> "$REPORT_FILE"
    echo "Issues Found:" >> "$REPORT_FILE"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue" >> "$REPORT_FILE"
    done
fi

# Add recommendations
cat >> "$REPORT_FILE" <<EOF

Recommendations:
----------------
1. Verify all services are functioning correctly
2. Check application logs for any errors
3. Test user access to all features
4. Monitor system for 24 hours
5. Document root cause of migration failure

Log Locations:
--------------
- Legacy logs: /home/pi/tmp/*.log
- Kismet logs: /home/pi/.kismet/logs/
- System logs: /var/log/syslog
- Archived migration logs: $ARCHIVE_DIR

Next Steps:
-----------
1. Review migration failure logs
2. Address identified issues
3. Update migration plan
4. Schedule retry with fixes
EOF

# Display report
echo ""
cat "$REPORT_FILE"
echo ""

# Step 9: Final status
log "Full rollback completed"

echo "========================================="
echo "FULL ROLLBACK COMPLETE"
echo "========================================="
echo ""
echo "Status: ${ROLLBACK_SUCCESS}"
echo "Report: $REPORT_FILE"
echo "Archives: $ARCHIVE_DIR"
echo ""
echo "Verify system access:"
echo "  - http://localhost:8000 (WigleToTAK)"
echo "  - http://localhost:8092 (Spectrum Analyzer)"
echo "  - http://localhost:2501 (Kismet)"
echo ""

if [ "$ROLLBACK_SUCCESS" = true ]; then
    success "Full rollback successful - legacy system restored"
    
    # Clean up temporary files
    rm -f /tmp/monitor-canary.sh
    rm -f /var/run/stinkster-monitor.pid
    
    exit 0
else
    error "Rollback completed with issues - manual intervention required"
    exit 1
fi
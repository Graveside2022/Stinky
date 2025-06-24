#!/bin/bash
# Zero-downtime deployment script for Kismet Operations Center
# Handles service updates, rollbacks, and health checks

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/dist"
DEPLOY_DIR="/opt/kismet-operations-center"
BACKUP_DIR="/opt/kismet-operations-center/backups"
SERVICE_NAME="kismet-operations-center"
NGINX_CONFIG="/etc/nginx/sites-available/kismet-operations"
HEALTH_CHECK_URL="http://localhost:3001/api/health"
HEALTH_CHECK_TIMEOUT=30
MAX_BACKUPS=5

# Deployment modes
DEPLOY_MODE="${1:-deploy}"  # deploy, rollback, status

# Logging
LOG_FILE="/var/log/kismet-operations-deploy.log"
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log "${RED}This script must be run as root${NC}"
        exit 1
    fi
}

# Health check function
health_check() {
    local url="$1"
    local timeout="${2:-30}"
    local elapsed=0
    
    log "${YELLOW}Performing health check...${NC}"
    
    while [ $elapsed -lt $timeout ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log "${GREEN}Health check passed${NC}"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    log "${RED}Health check failed after ${timeout}s${NC}"
    return 1
}

# Create backup
create_backup() {
    if [ -d "$DEPLOY_DIR/current" ]; then
        local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        local backup_path="$BACKUP_DIR/$backup_name"
        
        log "${YELLOW}Creating backup: $backup_name${NC}"
        mkdir -p "$BACKUP_DIR"
        cp -r "$DEPLOY_DIR/current" "$backup_path"
        
        # Keep only the last MAX_BACKUPS
        local backup_count=$(ls -1 "$BACKUP_DIR" | wc -l)
        if [ $backup_count -gt $MAX_BACKUPS ]; then
            ls -1t "$BACKUP_DIR" | tail -n +$((MAX_BACKUPS + 1)) | xargs -I {} rm -rf "$BACKUP_DIR/{}"
            log "Cleaned old backups (kept last $MAX_BACKUPS)"
        fi
        
        echo "$backup_name"
    fi
}

# Deploy new version
deploy() {
    log "${BLUE}Starting deployment of Kismet Operations Center${NC}"
    
    # Check if build exists
    if [ ! -d "$BUILD_DIR" ]; then
        log "${RED}Build directory not found: $BUILD_DIR${NC}"
        log "Run build-production.sh first"
        exit 1
    fi
    
    # Create deployment directory
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # Create backup
    local backup_name=$(create_backup)
    
    # Stop the service (gracefully)
    log "${YELLOW}Stopping service...${NC}"
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        systemctl stop "$SERVICE_NAME"
        sleep 3
    fi
    
    # Deploy new version
    log "${YELLOW}Deploying new version...${NC}"
    rm -rf "$DEPLOY_DIR/staging"
    cp -r "$BUILD_DIR" "$DEPLOY_DIR/staging"
    
    # Copy environment file if exists
    if [ -f "$DEPLOY_DIR/current/.env" ]; then
        cp "$DEPLOY_DIR/current/.env" "$DEPLOY_DIR/staging/"
    elif [ -f "$DEPLOY_DIR/.env" ]; then
        cp "$DEPLOY_DIR/.env" "$DEPLOY_DIR/staging/"
    fi
    
    # Atomic switch
    if [ -L "$DEPLOY_DIR/current" ]; then
        rm "$DEPLOY_DIR/current"
    elif [ -d "$DEPLOY_DIR/current" ]; then
        rm -rf "$DEPLOY_DIR/current"
    fi
    ln -s "$DEPLOY_DIR/staging" "$DEPLOY_DIR/current"
    
    # Update permissions
    chown -R pi:pi "$DEPLOY_DIR"
    chmod -R 755 "$DEPLOY_DIR"
    
    # Install/Update systemd service
    if [ ! -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
        log "${YELLOW}Installing systemd service...${NC}"
        cp "$SCRIPT_DIR/../systemd/$SERVICE_NAME.service" "/etc/systemd/system/"
        systemctl daemon-reload
        systemctl enable "$SERVICE_NAME"
    else
        systemctl daemon-reload
    fi
    
    # Start service
    log "${YELLOW}Starting service...${NC}"
    systemctl start "$SERVICE_NAME"
    
    # Wait for service to be ready
    sleep 5
    
    # Health check
    if health_check "$HEALTH_CHECK_URL" "$HEALTH_CHECK_TIMEOUT"; then
        log "${GREEN}Deployment successful!${NC}"
        
        # Clean up staging
        rm -rf "$DEPLOY_DIR/staging"
        
        # Log deployment info
        log "\nDeployment Summary:"
        log "- Version: $(cat "$DEPLOY_DIR/current/version.json" 2>/dev/null | jq -r .version || echo 'unknown')"
        log "- Backup: $backup_name"
        log "- Status: $(systemctl is-active $SERVICE_NAME)"
        
        # Update nginx if needed
        if [ -f "$SCRIPT_DIR/../nginx/kismet-operations.conf" ]; then
            log "${YELLOW}Updating nginx configuration...${NC}"
            cp "$SCRIPT_DIR/../nginx/kismet-operations.conf" "$NGINX_CONFIG"
            nginx -t && systemctl reload nginx
        fi
        
        return 0
    else
        log "${RED}Deployment failed - rolling back${NC}"
        rollback "$backup_name"
        return 1
    fi
}

# Rollback to previous version
rollback() {
    local backup_name="${1:-latest}"
    
    log "${YELLOW}Rolling back to: $backup_name${NC}"
    
    # Find backup
    if [ "$backup_name" = "latest" ]; then
        backup_name=$(ls -1t "$BACKUP_DIR" | head -n1)
    fi
    
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [ ! -d "$backup_path" ]; then
        log "${RED}Backup not found: $backup_path${NC}"
        exit 1
    fi
    
    # Stop service
    systemctl stop "$SERVICE_NAME" || true
    
    # Restore backup
    rm -rf "$DEPLOY_DIR/current"
    cp -r "$backup_path" "$DEPLOY_DIR/current"
    
    # Start service
    systemctl start "$SERVICE_NAME"
    
    # Health check
    sleep 5
    if health_check "$HEALTH_CHECK_URL" "$HEALTH_CHECK_TIMEOUT"; then
        log "${GREEN}Rollback successful${NC}"
    else
        log "${RED}Rollback failed - service may need manual intervention${NC}"
        exit 1
    fi
}

# Show deployment status
status() {
    log "${BLUE}Kismet Operations Center Deployment Status${NC}"
    log "================================================"
    
    # Service status
    log "\n${YELLOW}Service Status:${NC}"
    systemctl status "$SERVICE_NAME" --no-pager || true
    
    # Current version
    if [ -f "$DEPLOY_DIR/current/version.json" ]; then
        log "\n${YELLOW}Current Version:${NC}"
        cat "$DEPLOY_DIR/current/version.json" | jq . || cat "$DEPLOY_DIR/current/version.json"
    fi
    
    # Health check
    log "\n${YELLOW}Health Check:${NC}"
    if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log "${GREEN}Service is healthy${NC}"
        curl -s "$HEALTH_CHECK_URL" | jq . || curl -s "$HEALTH_CHECK_URL"
    else
        log "${RED}Service is not responding${NC}"
    fi
    
    # Available backups
    log "\n${YELLOW}Available Backups:${NC}"
    if [ -d "$BACKUP_DIR" ]; then
        ls -1t "$BACKUP_DIR" | head -10
    else
        log "No backups found"
    fi
    
    # Disk usage
    log "\n${YELLOW}Disk Usage:${NC}"
    du -sh "$DEPLOY_DIR" 2>/dev/null || echo "N/A"
    
    # Recent logs
    log "\n${YELLOW}Recent Logs:${NC}"
    journalctl -u "$SERVICE_NAME" -n 20 --no-pager || true
}

# Pre-deployment checks
pre_deploy_checks() {
    log "${YELLOW}Running pre-deployment checks...${NC}"
    
    # Check disk space
    local available_space=$(df -BM "$DEPLOY_DIR" 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/M//')
    if [ -n "$available_space" ] && [ "$available_space" -lt 500 ]; then
        log "${RED}Warning: Low disk space (${available_space}MB available)${NC}"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check if service exists
    if ! systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
        log "${YELLOW}Service $SERVICE_NAME not found, will be installed${NC}"
    fi
    
    # Check nginx
    if command -v nginx &> /dev/null && [ -f "$SCRIPT_DIR/../nginx/kismet-operations.conf" ]; then
        log "Nginx configuration will be updated"
    fi
    
    log "${GREEN}Pre-deployment checks passed${NC}"
}

# Main execution
check_root

case "$DEPLOY_MODE" in
    deploy)
        pre_deploy_checks
        deploy
        ;;
    rollback)
        rollback "${2:-latest}"
        ;;
    status)
        status
        ;;
    *)
        log "Usage: $0 {deploy|rollback [backup-name]|status}"
        exit 1
        ;;
esac
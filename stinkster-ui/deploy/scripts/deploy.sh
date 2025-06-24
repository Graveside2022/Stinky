#!/bin/bash
# Deployment script for WigleToTAK with rollback capability
# This script handles the complete deployment process including backup and rollback

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="pi"
DEPLOY_DIR="/opt/wigletotak"
BACKUP_DIR="/opt/wigletotak-backups"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
SYSTEMD_DIR="/etc/systemd/system"
LOG_FILE="/var/log/wigletotak-deploy.log"
HEALTH_CHECK_URL="http://localhost:8001/health"
HEALTH_CHECK_TIMEOUT=30

# Function to log messages
log() {
    local level="${2:-INFO}"
    local color="${3:-$NC}"
    echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] $1${NC}" | tee -a "${LOG_FILE}"
}

# Function to handle errors
handle_error() {
    log "Deployment failed! Starting rollback..." "ERROR" $RED
    rollback
    exit 1
}

# Trap errors
trap handle_error ERR

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log "This script must be run as root" "ERROR" $RED
        exit 1
    fi
}

# Function to validate deployment package
validate_package() {
    local package="$1"
    
    if [ ! -f "$package" ]; then
        log "Deployment package not found: $package" "ERROR" $RED
        exit 1
    fi
    
    # Verify checksum
    if [ -f "${package}.sha256" ]; then
        log "Verifying package checksum..." "INFO" $BLUE
        local expected=$(cat "${package}.sha256")
        local actual=$(sha256sum "$package" | cut -d' ' -f1)
        
        if [ "$expected" != "$actual" ]; then
            log "Checksum verification failed!" "ERROR" $RED
            exit 1
        fi
        log "Checksum verified successfully" "INFO" $GREEN
    fi
}

# Function to create backup
create_backup() {
    log "Creating backup of current deployment..." "INFO" $BLUE
    
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    
    mkdir -p "${BACKUP_DIR}"
    
    if [ -d "$DEPLOY_DIR" ]; then
        # Stop service before backup
        systemctl stop wigletotak || true
        
        # Create backup
        tar -czf "${backup_path}.tar.gz" -C "$(dirname $DEPLOY_DIR)" "$(basename $DEPLOY_DIR)"
        
        # Save current version info
        if [ -f "${DEPLOY_DIR}/version.json" ]; then
            cp "${DEPLOY_DIR}/version.json" "${backup_path}.version.json"
        fi
        
        # Create symlink to latest backup
        ln -sf "${backup_path}.tar.gz" "${BACKUP_DIR}/latest.tar.gz"
        
        log "Backup created: ${backup_path}.tar.gz" "INFO" $GREEN
    else
        log "No existing deployment to backup" "INFO" $YELLOW
    fi
}

# Function to deploy new version
deploy() {
    local package="$1"
    
    log "Starting deployment of: $package" "INFO" $BLUE
    
    # Create deployment directory
    mkdir -p "$DEPLOY_DIR"
    
    # Extract package
    log "Extracting deployment package..." "INFO" $BLUE
    tar -xzf "$package" -C "$DEPLOY_DIR"
    
    # Set permissions
    chown -R ${DEPLOY_USER}:${DEPLOY_USER} "$DEPLOY_DIR"
    
    # Install backend dependencies
    log "Installing backend dependencies..." "INFO" $BLUE
    cd "${DEPLOY_DIR}/backend"
    sudo -u ${DEPLOY_USER} npm ci --production
    cd -
    
    # Copy systemd service
    log "Installing systemd service..." "INFO" $BLUE
    cp "${DEPLOY_DIR}/systemd/wigletotak.service" "$SYSTEMD_DIR/"
    systemctl daemon-reload
    
    # Copy nginx configuration
    log "Installing nginx configuration..." "INFO" $BLUE
    cp "${DEPLOY_DIR}/nginx/wigletotak.conf" "$NGINX_SITES_AVAILABLE/"
    cp "${DEPLOY_DIR}/nginx/wigletotak-common.conf" "$NGINX_SITES_AVAILABLE/"
    
    # Enable nginx site if not already enabled
    if [ ! -L "${NGINX_SITES_ENABLED}/wigletotak.conf" ]; then
        ln -s "${NGINX_SITES_AVAILABLE}/wigletotak.conf" "${NGINX_SITES_ENABLED}/"
    fi
    
    # Test nginx configuration
    log "Testing nginx configuration..." "INFO" $BLUE
    nginx -t
    
    # Create necessary directories
    mkdir -p /var/log/wigletotak
    mkdir -p "${DEPLOY_DIR}/backend/data"
    mkdir -p "${DEPLOY_DIR}/backend/logs"
    chown -R ${DEPLOY_USER}:${DEPLOY_USER} /var/log/wigletotak
    
    # Reload nginx
    log "Reloading nginx..." "INFO" $BLUE
    systemctl reload nginx
    
    # Start service
    log "Starting WigleToTAK service..." "INFO" $BLUE
    systemctl enable wigletotak
    systemctl start wigletotak
    
    # Wait for service to be ready
    log "Waiting for service to be ready..." "INFO" $BLUE
    local count=0
    while [ $count -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log "Service is ready!" "INFO" $GREEN
            return 0
        fi
        sleep 1
        ((count++))
    done
    
    log "Service failed to start within timeout!" "ERROR" $RED
    return 1
}

# Function to rollback deployment
rollback() {
    log "Starting rollback procedure..." "INFO" $YELLOW
    
    local latest_backup="${BACKUP_DIR}/latest.tar.gz"
    
    if [ ! -f "$latest_backup" ]; then
        log "No backup found for rollback!" "ERROR" $RED
        return 1
    fi
    
    # Stop service
    systemctl stop wigletotak || true
    
    # Remove current deployment
    rm -rf "$DEPLOY_DIR"
    
    # Restore from backup
    log "Restoring from backup..." "INFO" $BLUE
    tar -xzf "$latest_backup" -C "$(dirname $DEPLOY_DIR)"
    
    # Start service
    systemctl start wigletotak
    
    # Check health
    sleep 5
    if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log "Rollback completed successfully!" "INFO" $GREEN
    else
        log "Rollback completed but service health check failed!" "ERROR" $RED
    fi
}

# Function to show deployment status
show_status() {
    log "Deployment Status:" "INFO" $BLUE
    
    # Check service status
    if systemctl is-active --quiet wigletotak; then
        log "Service: Active" "INFO" $GREEN
    else
        log "Service: Inactive" "INFO" $RED
    fi
    
    # Check current version
    if [ -f "${DEPLOY_DIR}/version.json" ]; then
        local version=$(cat "${DEPLOY_DIR}/version.json" | grep '"version"' | cut -d'"' -f4)
        local build_date=$(cat "${DEPLOY_DIR}/version.json" | grep '"buildDate"' | cut -d'"' -f4)
        log "Version: $version" "INFO" $NC
        log "Build Date: $build_date" "INFO" $NC
    fi
    
    # Check health endpoint
    if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log "Health Check: Passed" "INFO" $GREEN
    else
        log "Health Check: Failed" "INFO" $RED
    fi
}

# Main script logic
main() {
    local command="${1:-}"
    
    case "$command" in
        deploy)
            local package="${2:-}"
            if [ -z "$package" ]; then
                log "Usage: $0 deploy <package.tar.gz>" "ERROR" $RED
                exit 1
            fi
            check_root
            validate_package "$package"
            create_backup
            if deploy "$package"; then
                log "Deployment completed successfully!" "INFO" $GREEN
                show_status
            else
                handle_error
            fi
            ;;
        rollback)
            check_root
            rollback
            ;;
        status)
            show_status
            ;;
        backup)
            check_root
            create_backup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|backup}"
            echo ""
            echo "Commands:"
            echo "  deploy <package>  - Deploy a new version"
            echo "  rollback         - Rollback to previous version"
            echo "  status           - Show deployment status"
            echo "  backup           - Create backup of current deployment"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
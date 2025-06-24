#!/bin/bash
# Backup management script for WigleToTAK
# Handles automated backups, cleanup, and restoration

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/wigletotak-backups"
DEPLOY_DIR="/opt/wigletotak"
MAX_BACKUPS=10
BACKUP_RETENTION_DAYS=30
REMOTE_BACKUP_HOST="${REMOTE_BACKUP_HOST:-}"
REMOTE_BACKUP_PATH="${REMOTE_BACKUP_PATH:-/backups/wigletotak}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to log messages
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Function to create backup
create_backup() {
    local backup_name="${1:-backup_$(date +%Y%m%d_%H%M%S)}"
    local backup_file="${BACKUP_DIR}/${backup_name}.tar.gz"
    
    log "Creating backup: ${backup_name}" $BLUE
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Stop service for consistent backup
    log "Stopping service..." $YELLOW
    sudo systemctl stop wigletotak || true
    
    # Create backup with metadata
    cat > "/tmp/backup_metadata.json" <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)",
    "version": "$(cat ${DEPLOY_DIR}/version.json 2>/dev/null | grep '"version"' | cut -d'"' -f4 || echo 'unknown')",
    "size_before": "$(du -sh ${DEPLOY_DIR} 2>/dev/null | cut -f1 || echo 'unknown')"
}
EOF
    
    # Create tarball
    tar -czf "$backup_file" \
        -C "$(dirname $DEPLOY_DIR)" \
        "$(basename $DEPLOY_DIR)" \
        -C /tmp \
        backup_metadata.json
    
    rm -f /tmp/backup_metadata.json
    
    # Restart service
    log "Restarting service..." $YELLOW
    sudo systemctl start wigletotak || true
    
    # Create checksum
    sha256sum "$backup_file" > "${backup_file}.sha256"
    
    # Update latest symlink
    ln -sf "$backup_file" "${BACKUP_DIR}/latest.tar.gz"
    
    log "Backup created: $backup_file ($(du -h "$backup_file" | cut -f1))" $GREEN
    
    # Upload to remote if configured
    if [ -n "$REMOTE_BACKUP_HOST" ]; then
        upload_backup "$backup_file"
    fi
}

# Function to upload backup to remote host
upload_backup() {
    local backup_file="$1"
    
    log "Uploading backup to remote host..." $BLUE
    
    # Create remote directory
    ssh "$REMOTE_BACKUP_HOST" "mkdir -p $REMOTE_BACKUP_PATH" || {
        log "Failed to create remote directory" $RED
        return 1
    }
    
    # Upload file
    if scp "$backup_file" "${backup_file}.sha256" "${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}/"; then
        log "Backup uploaded successfully" $GREEN
    else
        log "Failed to upload backup" $RED
        return 1
    fi
}

# Function to list backups
list_backups() {
    log "Available backups:" $BLUE
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log "No backups found" $YELLOW
        return
    fi
    
    # List local backups
    echo "Local backups:"
    for backup in $(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null); do
        if [ -f "$backup" ]; then
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c %y "$backup" | cut -d' ' -f1,2)
            local name=$(basename "$backup")
            echo "  - $name ($size, $date)"
        fi
    done
    
    # List remote backups if configured
    if [ -n "$REMOTE_BACKUP_HOST" ]; then
        echo ""
        echo "Remote backups:"
        ssh "$REMOTE_BACKUP_HOST" "ls -la $REMOTE_BACKUP_PATH/*.tar.gz 2>/dev/null" || echo "  Unable to list remote backups"
    fi
}

# Function to restore backup
restore_backup() {
    local backup_name="$1"
    local backup_file
    
    # Check if it's a full path or just a name
    if [ -f "$backup_name" ]; then
        backup_file="$backup_name"
    elif [ -f "${BACKUP_DIR}/${backup_name}" ]; then
        backup_file="${BACKUP_DIR}/${backup_name}"
    elif [ -f "${BACKUP_DIR}/${backup_name}.tar.gz" ]; then
        backup_file="${BACKUP_DIR}/${backup_name}.tar.gz"
    else
        log "Backup not found: $backup_name" $RED
        return 1
    fi
    
    log "Restoring from backup: $backup_file" $BLUE
    
    # Verify checksum if available
    if [ -f "${backup_file}.sha256" ]; then
        log "Verifying backup integrity..." $YELLOW
        if ! sha256sum -c "${backup_file}.sha256" > /dev/null 2>&1; then
            log "Backup checksum verification failed!" $RED
            return 1
        fi
        log "Backup integrity verified" $GREEN
    fi
    
    # Create current backup before restore
    create_backup "pre_restore_$(date +%Y%m%d_%H%M%S)"
    
    # Stop service
    log "Stopping service..." $YELLOW
    sudo systemctl stop wigletotak || true
    
    # Remove current deployment
    if [ -d "$DEPLOY_DIR" ]; then
        sudo rm -rf "$DEPLOY_DIR"
    fi
    
    # Extract backup
    log "Extracting backup..." $YELLOW
    sudo tar -xzf "$backup_file" -C "$(dirname $DEPLOY_DIR)"
    
    # Remove metadata file if it exists
    rm -f "${DEPLOY_DIR}/backup_metadata.json"
    
    # Set permissions
    sudo chown -R pi:pi "$DEPLOY_DIR"
    
    # Restart service
    log "Starting service..." $YELLOW
    sudo systemctl start wigletotak
    
    log "Restore completed successfully!" $GREEN
}

# Function to clean old backups
cleanup_backups() {
    log "Cleaning up old backups..." $BLUE
    
    # Remove backups older than retention period
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.sha256" -type f -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Keep only MAX_BACKUPS most recent
    local backup_count=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        local to_remove=$((backup_count - MAX_BACKUPS))
        ls -t "$BACKUP_DIR"/*.tar.gz | tail -n "$to_remove" | xargs rm -f
        ls -t "$BACKUP_DIR"/*.sha256 | tail -n "$to_remove" | xargs rm -f 2>/dev/null || true
    fi
    
    log "Cleanup completed" $GREEN
}

# Function to verify backup
verify_backup() {
    local backup_name="$1"
    local backup_file
    
    # Find backup file
    if [ -f "$backup_name" ]; then
        backup_file="$backup_name"
    elif [ -f "${BACKUP_DIR}/${backup_name}" ]; then
        backup_file="${BACKUP_DIR}/${backup_name}"
    elif [ -f "${BACKUP_DIR}/${backup_name}.tar.gz" ]; then
        backup_file="${BACKUP_DIR}/${backup_name}.tar.gz"
    else
        log "Backup not found: $backup_name" $RED
        return 1
    fi
    
    log "Verifying backup: $backup_file" $BLUE
    
    # Check file exists and is readable
    if [ ! -r "$backup_file" ]; then
        log "Backup file not readable" $RED
        return 1
    fi
    
    # Verify checksum
    if [ -f "${backup_file}.sha256" ]; then
        if sha256sum -c "${backup_file}.sha256" > /dev/null 2>&1; then
            log "Checksum verification: PASSED" $GREEN
        else
            log "Checksum verification: FAILED" $RED
            return 1
        fi
    else
        log "No checksum file found" $YELLOW
    fi
    
    # Test archive integrity
    if tar -tzf "$backup_file" > /dev/null 2>&1; then
        log "Archive integrity: PASSED" $GREEN
    else
        log "Archive integrity: FAILED" $RED
        return 1
    fi
    
    # Show archive contents summary
    log "Archive contents:" $BLUE
    tar -tzf "$backup_file" | head -20
    echo "..."
    echo "Total files: $(tar -tzf "$backup_file" | wc -l)"
    
    return 0
}

# Main function
main() {
    case "${1:-}" in
        create)
            create_backup "${2:-}"
            cleanup_backups
            ;;
        list)
            list_backups
            ;;
        restore)
            if [ -z "${2:-}" ]; then
                log "Usage: $0 restore <backup-name>" $RED
                exit 1
            fi
            restore_backup "$2"
            ;;
        cleanup)
            cleanup_backups
            ;;
        verify)
            if [ -z "${2:-}" ]; then
                log "Usage: $0 verify <backup-name>" $RED
                exit 1
            fi
            verify_backup "$2"
            ;;
        auto)
            # Automated backup (for cron)
            create_backup
            cleanup_backups
            ;;
        *)
            echo "Usage: $0 {create|list|restore|cleanup|verify|auto} [backup-name]"
            echo ""
            echo "Commands:"
            echo "  create [name]  - Create a new backup"
            echo "  list          - List available backups"
            echo "  restore <name> - Restore from backup"
            echo "  cleanup       - Remove old backups"
            echo "  verify <name> - Verify backup integrity"
            echo "  auto          - Automated backup (for cron)"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
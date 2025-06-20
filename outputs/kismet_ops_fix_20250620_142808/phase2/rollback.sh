#!/bin/bash

# Rollback script for Kismet Operations Fix - Phase 2
# This script restores all original files from backups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
PROJECT_ROOT="/home/pi/projects/stinkster_malone/stinkster"

echo "Starting rollback of Kismet Operations Fix - Phase 2..."
echo "=================================================="

# Function to restore a file
restore_file() {
    local backup_file="$1"
    local original_path="$2"
    
    if [ -f "$backup_file" ]; then
        echo "Restoring: $original_path"
        cp "$backup_file" "$original_path"
        if [ $? -eq 0 ]; then
            echo "  ✓ Successfully restored"
        else
            echo "  ✗ Failed to restore"
            return 1
        fi
    else
        echo "  ⚠ Backup not found: $backup_file"
        return 1
    fi
}

# Restore all modified files
echo ""
echo "Restoring modified files..."
echo "---------------------------"

# Restore hi.html
restore_file "${BACKUP_DIR}/hi.html.backup" \
    "${PROJECT_ROOT}/src/nodejs/kismet-operations/views/hi.html"

# Restore server.js
restore_file "${BACKUP_DIR}/server.js.backup" \
    "${PROJECT_ROOT}/src/nodejs/kismet-operations/server.js"

echo ""
echo "Rollback complete!"
echo ""
echo "To verify the rollback:"
echo "1. Check that the API endpoints are reverted:"
echo "   grep -n 'api/start-script' ${PROJECT_ROOT}/src/nodejs/kismet-operations/views/hi.html"
echo "2. Check that the Kismet proxy is removed:"
echo "   grep -n '/kismet.*createProxyMiddleware' ${PROJECT_ROOT}/src/nodejs/kismet-operations/server.js"
echo ""
echo "You may need to restart the Kismet Operations Center service:"
echo "  sudo systemctl restart kismet-operations-center"
echo ""
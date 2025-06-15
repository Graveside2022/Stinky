#!/bin/bash
# test-restore-script.sh - Test the OpenWebRX restore script
# Created: 2025-06-15

echo "Testing OpenWebRX restore script..."
echo

# Test help functionality
echo "1. Testing --help option:"
./restore-openwebrx.sh --help
echo
echo "Press Enter to continue..."
read

# Show what would happen with --image option (dry run)
echo "2. Testing --image option (will show available backups if any exist):"
echo "Note: This is informational only, we won't actually restore"

# Check if backup directory exists
BACKUP_DIR="${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}-backups"
if [ -d "$BACKUP_DIR" ]; then
    echo "Backup directory exists. Contents:"
    ls -la "$BACKUP_DIR" | grep -E "\.tar$|\.tar\.gz$" || echo "No backup files found"
else
    echo "Backup directory does not exist: $BACKUP_DIR"
    echo "You would need to create backups first using backup-openwebrx.sh"
fi

echo
echo "3. Verifying script syntax:"
bash -n restore-openwebrx.sh && echo "✓ Script syntax is valid" || echo "✗ Script has syntax errors"

echo
echo "4. Checking Docker status:"
if command -v docker &> /dev/null; then
    echo "✓ Docker is installed"
    if docker ps &> /dev/null; then
        echo "✓ Docker daemon is running"
        
        # Check if OpenWebRX is currently running
        if docker ps --format '{{.Names}}' | grep -q "^openwebrx$"; then
            echo "✓ OpenWebRX container is currently running"
            docker ps --filter name=openwebrx --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        else
            echo "- OpenWebRX container is not currently running"
        fi
    else
        echo "✗ Docker daemon is not running"
    fi
else
    echo "✗ Docker is not installed"
fi

echo
echo "Test completed. The restore script is ready to use with:"
echo "  ./restore-openwebrx.sh --image    # Restore from backup"
echo "  ./restore-openwebrx.sh --build    # Rebuild from Dockerfile"
echo
echo "Run './restore-openwebrx.sh' without options for interactive mode"
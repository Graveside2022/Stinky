#!/bin/bash

# Backup script for the stinkster project and related Pi projects
# This script excludes Python virtual environments and other unnecessary files

# Set variables
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pi_projects_backup_${BACKUP_DATE}"
SOURCE_DIR="/home/pi"
BACKUP_DIR="/home/pi/backups"
EXCLUSION_FILE="/home/pi/projects/stinkster/backup_exclusions.txt"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to create tar backup with exclusions
create_tar_backup() {
    echo "Creating backup: ${BACKUP_NAME}.tar.gz"
    echo "This may take several minutes..."
    
    # Build exclude arguments from exclusion file
    EXCLUDE_ARGS=""
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ ! -z "$line" && ! "$line" =~ ^# ]]; then
            EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude='$line'"
        fi
    done < "$EXCLUSION_FILE"
    
    # Create the backup using tar with exclusions
    eval tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
        $EXCLUDE_ARGS \
        --exclude="${BACKUP_DIR}" \
        -C / \
        home/pi/stinky \
        home/pi/gpsmav \
        home/pi/WigletoTAK \
        home/pi/HackRF \
        home/pi/openwebrx \
        home/pi/kismet_ops \
        home/pi/Scripts \
        home/pi/projects \
        home/pi/military-sdr-wrapper \
        home/pi/sigint-scanner-modern \
        home/pi/gemini-mcp-server \
        home/pi/*.sh \
        home/pi/*.json \
        home/pi/*.md 2>/dev/null
    
    # Check if backup was successful
    if [ $? -eq 0 ]; then
        # Get backup size
        BACKUP_SIZE=$(ls -lh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | awk '{print $5}')
        echo "Backup completed successfully!"
        echo "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
        echo "Backup size: ${BACKUP_SIZE}"
        
        # Show what was excluded
        echo ""
        echo "The following patterns were excluded from the backup:"
        echo "- Python virtual environments (venv directories)"
        echo "- Python cache files (__pycache__, *.pyc)"
        echo "- Node.js modules (node_modules)"
        echo "- Temporary files and logs"
        echo "- IDE configuration files"
        
        # List recent backups
        echo ""
        echo "Recent backups in ${BACKUP_DIR}:"
        ls -lht "${BACKUP_DIR}" | grep "pi_projects_backup" | head -5
    else
        echo "Backup failed!"
        exit 1
    fi
}

# Function to estimate backup size (dry run)
estimate_size() {
    echo "Estimating backup size (this is a dry run)..."
    
    # Count files and estimate size
    TOTAL_SIZE=0
    FILE_COUNT=0
    
    for dir in stinky gpsmav WigletoTAK HackRF openwebrx kismet_ops Scripts projects military-sdr-wrapper sigint-scanner-modern gemini-mcp-server; do
        if [ -d "/home/pi/$dir" ]; then
            # Use du to get size, excluding virtual environments
            SIZE=$(du -sb "/home/pi/$dir" --exclude="*/venv" --exclude="*/node_modules" --exclude="*/__pycache__" 2>/dev/null | awk '{print $1}')
            TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
            COUNT=$(find "/home/pi/$dir" -type f ! -path "*/venv/*" ! -path "*/node_modules/*" ! -path "*/__pycache__/*" 2>/dev/null | wc -l)
            FILE_COUNT=$((FILE_COUNT + COUNT))
        fi
    done
    
    # Convert to human readable
    TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024 / 1024))
    
    echo "Estimated backup size: ~${TOTAL_SIZE_MB} MB (uncompressed)"
    echo "Estimated file count: ~${FILE_COUNT} files"
    echo "Compressed size will be significantly smaller"
}

# Function to verify exclusions are working
verify_exclusions() {
    echo "Verifying exclusions..."
    echo "Checking for virtual environments that will be excluded:"
    
    find /home/pi -type d \( -name "venv" -o -name ".venv" -o -name "node_modules" \) 2>/dev/null | grep -E "(stinky|gpsmav|WigletoTAK|HackRF|projects)" | head -10
    
    echo ""
    echo "These directories will NOT be included in the backup."
}

# Main script
echo "=== Raspberry Pi Projects Backup Script ==="
echo "Backup will exclude Python virtual environments and unnecessary files"
echo ""

# Check if exclusion file exists
if [ ! -f "$EXCLUSION_FILE" ]; then
    echo "Warning: Exclusion file not found at $EXCLUSION_FILE"
    echo "Creating basic exclusions..."
    cat > "$EXCLUSION_FILE" << 'EOF'
**/venv/
**/.venv/
**/node_modules/
**/__pycache__/
**/*.pyc
EOF
fi

# Parse command line arguments
case "$1" in
    --estimate|-e)
        estimate_size
        ;;
    --verify|-v)
        verify_exclusions
        ;;
    --help|-h)
        echo "Usage: $0 [OPTION]"
        echo "Create a backup of Raspberry Pi projects, excluding virtual environments"
        echo ""
        echo "Options:"
        echo "  --estimate, -e    Estimate backup size without creating backup"
        echo "  --verify, -v      Show which directories will be excluded"
        echo "  --help, -h        Show this help message"
        echo "  (no option)       Create the backup"
        ;;
    *)
        # Ask for confirmation
        echo "Ready to create backup excluding virtual environments."
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            verify_exclusions
            echo ""
            create_tar_backup
        else
            echo "Backup cancelled."
        fi
        ;;
esac
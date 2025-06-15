#!/bin/bash
#
# Path Update Script for Stinkster Project
# Updates all hardcoded /home/pi/ paths to use relative paths and environment variables
#
# This script will:
# - Replace hardcoded /home/pi/ paths with relative paths or environment variables
# - Update configuration files to reference the new structure
# - Preserve backup files but exclude them from updates
# - Test syntax of updated scripts
#
# Usage: ./update-paths.sh
#
# Author: Stinkster Project  
# Date: 2025-06-15

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get absolute path of stinkster root
STINKSTER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to create backup before making changes
create_backup() {
    local file="$1"
    local backup_file="${file}.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$file" "$backup_file"
    echo "  Backup: $backup_file"
}

# Function to update shell scripts
update_shell_scripts() {
    print_status "Updating shell scripts..."
    
    # Find all shell scripts, excluding backups and this script
    find "$STINKSTER_ROOT" -name "*.sh" -type f \
        ! -path "*/backups/*" \
        ! -name "$SCRIPT_NAME" \
        ! -name "update-paths.sh" | while read -r file; do
        
        print_status "Processing: $(basename "$file")"
        
        # Create backup
        create_backup "$file"
        
        # Define replacements for shell scripts
        sed -i.tmp \
            -e "s|/home/pi/stinky|${STINKSTER_ROOT}|g" \
            -e "s|/home/pi/tmp|\${LOG_DIR:-${STINKSTER_ROOT}/logs}|g" \
            -e "s|/home/pi/Scripts|${STINKSTER_ROOT}/scripts|g" \
            -e "s|/home/pi/kismet_ops|\${KISMET_DATA_DIR:-${STINKSTER_ROOT}/data/kismet}|g" \
            -e "s|/home/pi/HackRF|\${HACKRF_DIR:-${STINKSTER_ROOT}/hackrf}|g" \
            -e "s|/home/pi/gpsmav|\${GPSMAV_DIR:-${STINKSTER_ROOT}/gpsmav}|g" \
            -e "s|/home/pi/WigletoTAK|\${WIGLETOTAK_DIR:-${STINKSTER_ROOT}/wigletotak}|g" \
            -e "s|/home/pi/openwebrx|\${OPENWEBRX_DIR:-${STINKSTER_ROOT}/openwebrx}|g" \
            -e "s|/home/pi/web|\${WEB_DIR:-${STINKSTER_ROOT}/web}|g" \
            -e "s|INSTALL_BASE=\"/home/pi\"|INSTALL_BASE=\"\${STINKSTER_ROOT:-${STINKSTER_ROOT}}\"|g" \
            -e "s|LOG_DIR=\"\${INSTALL_BASE}/tmp\"|LOG_DIR=\"\${STINKSTER_ROOT}/logs\"|g" \
            "$file"
        
        # Remove temporary file
        rm -f "${file}.tmp"
        
        print_success "Updated: $(basename "$file")"
    done
}

# Function to update Python configuration files
update_python_configs() {
    print_status "Updating Python configuration files..."
    
    find "$STINKSTER_ROOT" -name "*.py" -type f \
        ! -path "*/backups/*" | while read -r file; do
        
        if grep -q "/home/pi/" "$file"; then
            print_status "Processing: $(basename "$file")"
            
            # Create backup
            create_backup "$file"
            
            # Update Python files
            sed -i.tmp \
                -e "s|'/home/pi/tmp'|os.getenv('LOG_DIR', os.path.join(self.base_dir, 'logs'))|g" \
                -e "s|'/home/pi/kismet_ops'|os.getenv('KISMET_DATA_DIR', os.path.join(self.base_dir, 'data', 'kismet'))|g" \
                -e "s|/home/pi/tmp|os.getenv('LOG_DIR', os.path.join(os.path.dirname(__file__), 'logs'))|g" \
                -e "s|/home/pi/kismet_ops|os.getenv('KISMET_DATA_DIR', os.path.join(os.path.dirname(__file__), 'data', 'kismet'))|g" \
                "$file"
            
            # Remove temporary file
            rm -f "${file}.tmp"
            
            print_success "Updated: $(basename "$file")"
        fi
    done
}

# Function to update JSON configuration templates
update_json_configs() {
    print_status "Updating JSON configuration files..."
    
    find "$STINKSTER_ROOT" -name "*.json" -type f \
        ! -path "*/backups/*" | while read -r file; do
        
        if grep -q "/home/pi/" "$file"; then
            print_status "Processing: $(basename "$file")"
            
            # Create backup
            create_backup "$file"
            
            # Update JSON files - use environment variable placeholders
            sed -i.tmp \
                -e 's|"/home/pi/tmp/|"${LOG_DIR}/|g' \
                -e 's|"/home/pi/kismet_ops"|"${KISMET_DATA_DIR}"|g' \
                -e 's|/home/pi/tmp/|\${LOG_DIR}/|g' \
                -e 's|/home/pi/kismet_ops|\${KISMET_DATA_DIR}|g' \
                "$file"
            
            # Remove temporary file
            rm -f "${file}.tmp"
            
            print_success "Updated: $(basename "$file")"
        fi
    done
}

# Function to update configuration files (.conf)
update_conf_files() {
    print_status "Updating .conf files..."
    
    find "$STINKSTER_ROOT" -name "*.conf" -type f \
        ! -path "*/backups/*" | while read -r file; do
        
        if grep -q "/home/pi/" "$file"; then
            print_status "Processing: $(basename "$file")"
            
            # Create backup
            create_backup "$file"
            
            # Update .conf files
            sed -i.tmp \
                -e "s|/home/pi/tmp/|\${LOG_DIR}/|g" \
                -e "s|/home/pi/kismet_ops/|\${KISMET_DATA_DIR}/|g" \
                -e "s|/home/pi/Scripts/|\${STINKSTER_ROOT}/scripts/|g" \
                "$file"
            
            # Remove temporary file
            rm -f "${file}.tmp"
            
            print_success "Updated: $(basename "$file")"
        fi
    done
}

# Function to update YAML/YML files (docker-compose, etc.)
update_yaml_files() {
    print_status "Updating YAML files..."
    
    find "$STINKSTER_ROOT" -name "*.yml" -o -name "*.yaml" -type f \
        ! -path "*/backups/*" | while read -r file; do
        
        if grep -q "/home/pi/" "$file"; then
            print_status "Processing: $(basename "$file")"
            
            # Create backup
            create_backup "$file"
            
            # Update YAML files
            sed -i.tmp \
                -e "s|/home/pi/openwebrx|.|g" \
                -e "s|/home/pi/tmp/|\${LOG_DIR}/|g" \
                "$file"
            
            # Remove temporary file
            rm -f "${file}.tmp"
            
            print_success "Updated: $(basename "$file")"
        fi
    done
}

# Function to create environment setup script
create_env_setup() {
    print_status "Creating environment setup script..."
    
    cat > "$STINKSTER_ROOT/setup-env.sh" <<'EOF'
#!/bin/bash
#
# Environment Setup Script for Stinkster
# Sets up environment variables for path configuration
#
# Usage: source ./setup-env.sh
#

# Get absolute path of stinkster root
export STINKSTER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Core directories
export LOG_DIR="${STINKSTER_ROOT}/logs"
export DATA_DIR="${STINKSTER_ROOT}/data"
export SCRIPTS_DIR="${STINKSTER_ROOT}/scripts"
export WEB_DIR="${STINKSTER_ROOT}/web"

# Service-specific directories
export KISMET_DATA_DIR="${DATA_DIR}/kismet"
export HACKRF_DIR="${STINKSTER_ROOT}/hackrf"
export GPSMAV_DIR="${STINKSTER_ROOT}/gpsmav"
export WIGLETOTAK_DIR="${STINKSTER_ROOT}/wigletotak"
export OPENWEBRX_DIR="${STINKSTER_ROOT}/openwebrx"

# Configuration files
export CONFIG_FILE="${STINKSTER_ROOT}/config.json"

# Network interface (override as needed)
export NETWORK_INTERFACE="${NETWORK_INTERFACE:-wlan2}"

# OpenWebRX settings
export OPENWEBRX_PORT="${OPENWEBRX_PORT:-8073}"
export OPENWEBRX_ADMIN_USER="${OPENWEBRX_ADMIN_USER:-admin}"
export OPENWEBRX_ADMIN_PASSWORD="${OPENWEBRX_ADMIN_PASSWORD:-hackrf}"
export OPENWEBRX_TITLE="${OPENWEBRX_TITLE:-Stinkster SDR}"
export OPENWEBRX_LOCATION="${OPENWEBRX_LOCATION:-Raspberry Pi}"
export OPENWEBRX_DEBUG="${OPENWEBRX_DEBUG:-false}"

# Docker settings
export DOCKER_RESTART_POLICY="${DOCKER_RESTART_POLICY:-unless-stopped}"
export DOCKER_COMPOSE_PROJECT_NAME="${DOCKER_COMPOSE_PROJECT_NAME:-stinkster}"

# Create directories if they don't exist
mkdir -p "$LOG_DIR" "$DATA_DIR" "$KISMET_DATA_DIR" "$SCRIPTS_DIR" "$WEB_DIR"

echo "Stinkster environment configured:"
echo "  STINKSTER_ROOT: $STINKSTER_ROOT"
echo "  LOG_DIR: $LOG_DIR"
echo "  DATA_DIR: $DATA_DIR"
echo "  KISMET_DATA_DIR: $KISMET_DATA_DIR"
EOF

    chmod +x "$STINKSTER_ROOT/setup-env.sh"
    print_success "Created: setup-env.sh"
}

# Function to create directory structure
create_directory_structure() {
    print_status "Creating new directory structure..."
    
    mkdir -p "$STINKSTER_ROOT/logs"
    mkdir -p "$STINKSTER_ROOT/data/kismet"
    mkdir -p "$STINKSTER_ROOT/scripts"
    mkdir -p "$STINKSTER_ROOT/web"
    mkdir -p "$STINKSTER_ROOT/hackrf"
    mkdir -p "$STINKSTER_ROOT/gpsmav"
    mkdir -p "$STINKSTER_ROOT/wigletotak"
    mkdir -p "$STINKSTER_ROOT/openwebrx"
    
    print_success "Directory structure created"
}

# Function to test script syntax
test_script_syntax() {
    print_status "Testing shell script syntax..."
    
    local error_count=0
    
    find "$STINKSTER_ROOT" -name "*.sh" -type f \
        ! -path "*/backups/*" | while read -r file; do
        
        if ! bash -n "$file" 2>/dev/null; then
            print_error "Syntax error in: $(basename "$file")"
            error_count=$((error_count + 1))
        else
            echo "  ✓ $(basename "$file")"
        fi
    done
    
    if [ $error_count -eq 0 ]; then
        print_success "All shell scripts have valid syntax"
    else
        print_error "$error_count shell scripts have syntax errors"
        return 1
    fi
}

# Function to update specific configuration values
update_specific_configs() {
    print_status "Updating specific configuration values..."
    
    # Update install.sh to use current directory structure
    if [ -f "$STINKSTER_ROOT/install.sh" ]; then
        print_status "Updating install.sh for stinkster-centric structure..."
        
        create_backup "$STINKSTER_ROOT/install.sh"
        
        # Replace the entire INSTALL_BASE and directory creation logic
        sed -i.tmp \
            -e 's|INSTALL_BASE="/home/pi"|INSTALL_BASE="${STINKSTER_ROOT}"|g' \
            -e 's|LOG_DIR="${INSTALL_BASE}/tmp"|LOG_DIR="${STINKSTER_ROOT}/logs"|g' \
            -e 's|mkdir -p "${INSTALL_BASE}/stinky"|mkdir -p "${STINKSTER_ROOT}/scripts"|g' \
            -e 's|mkdir -p "${INSTALL_BASE}/Scripts"|# Replaced by scripts directory|g' \
            -e 's|mkdir -p "${INSTALL_BASE}/kismet_ops"|mkdir -p "${STINKSTER_ROOT}/data/kismet"|g' \
            -e 's|mkdir -p "${INSTALL_BASE}/HackRF"|mkdir -p "${STINKSTER_ROOT}/hackrf"|g' \
            -e 's|mkdir -p "${INSTALL_BASE}/gpsmav"|mkdir -p "${STINKSTER_ROOT}/gpsmav"|g' \
            -e 's|mkdir -p "${INSTALL_BASE}/WigletoTAK"|mkdir -p "${STINKSTER_ROOT}/wigletotak"|g' \
            -e 's|mkdir -p "${INSTALL_BASE}/openwebrx"|mkdir -p "${STINKSTER_ROOT}/openwebrx"|g' \
            -e 's|mkdir -p "${INSTALL_BASE}/web"|mkdir -p "${STINKSTER_ROOT}/web"|g' \
            "$STINKSTER_ROOT/install.sh"
        
        rm -f "${STINKSTER_ROOT}/install.sh.tmp"
        print_success "Updated install.sh"
    fi
}

# Function to display summary
display_summary() {
    echo
    print_success "=== Path Update Complete ==="
    echo
    echo "Updated files:"
    echo "  - Shell scripts (.sh)"
    echo "  - Python configuration files (.py)"
    echo "  - JSON configuration templates (.json)"
    echo "  - Configuration files (.conf)"
    echo "  - YAML files (.yml/.yaml)"
    echo
    echo "Created:"
    echo "  - setup-env.sh (environment configuration)"
    echo "  - New directory structure under $STINKSTER_ROOT"
    echo
    echo "Next steps:"
    echo "  1. Source the environment: source ./setup-env.sh"
    echo "  2. Review and test updated configurations"
    echo "  3. Update any additional hardcoded paths as needed"
    echo
    print_warning "Backup files created with .backup-YYYYMMDD-HHMMSS extension"
}

# Main function
main() {
    echo "=== Stinkster Path Update Script ==="
    echo "Working directory: $STINKSTER_ROOT"
    echo
    
    create_directory_structure
    create_env_setup
    update_shell_scripts
    update_python_configs
    update_json_configs
    update_conf_files
    update_yaml_files
    update_specific_configs
    test_script_syntax
    
    display_summary
}

# Run main function
main "$@"
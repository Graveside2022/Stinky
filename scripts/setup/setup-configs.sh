#!/bin/bash
#
# Setup configuration files from templates
# Creates necessary configuration files in project root from templates
#

set -euo pipefail

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${PROJECT_ROOT}/config"
TEMPLATE_DIR="${CONFIG_DIR}/templates"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[CONFIG]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create config from template
create_config_from_template() {
    local template_file="$1"
    local output_file="$2"
    local config_name="$(basename "$output_file")"
    
    if [ -f "$output_file" ]; then
        warn "$config_name already exists, skipping..."
        return 0
    fi
    
    if [ ! -f "$template_file" ]; then
        error "Template not found: $template_file"
        return 1
    fi
    
    log "Creating $config_name from template..."
    cp "$template_file" "$output_file"
    
    # Set appropriate permissions for certain files
    case "$config_name" in
        *.sh|stinkster)
            chmod +x "$output_file"
            ;;
    esac
    
    log "Created: $output_file"
}

# Main setup function
main() {
    log "Setting up configuration files from templates..."
    
    # Check if template directory exists
    if [ ! -d "$TEMPLATE_DIR" ]; then
        error "Template directory not found: $TEMPLATE_DIR"
        exit 1
    fi
    
    # Create .env file
    if [ ! -f "${PROJECT_ROOT}/.env" ]; then
        create_config_from_template \
            "${TEMPLATE_DIR}/config.template.env" \
            "${PROJECT_ROOT}/.env"
        log "Please edit .env file with your specific configuration values"
    fi
    
    # Create JSON configuration files
    local json_configs=(
        "config.json:config.json.template"
        "gpsmav-config.json:gpsmav-config.template.json"
        "spectrum-analyzer-config.json:spectrum-analyzer-config.template.json"
        "webhook-config.json:webhook-config.template.json"
        "wigletotak-config.json:wigletotak-config.template.json"
    )
    
    for config_pair in "${json_configs[@]}"; do
        local output_name="${config_pair%%:*}"
        local template_name="${config_pair##*:}"
        create_config_from_template \
            "${TEMPLATE_DIR}/${template_name}" \
            "${PROJECT_ROOT}/${output_name}"
    done
    
    # Create Kismet configuration
    create_config_from_template \
        "${TEMPLATE_DIR}/kismet-config.template.conf" \
        "${PROJECT_ROOT}/kismet_site.conf"
    
    # Create service orchestration config
    create_config_from_template \
        "${TEMPLATE_DIR}/service-orchestration.template.conf" \
        "${PROJECT_ROOT}/service-orchestration.conf"
    
    # Create docker-compose.yml
    create_config_from_template \
        "${TEMPLATE_DIR}/docker-compose.template.yml" \
        "${PROJECT_ROOT}/docker-compose.yml"
    
    # Copy config.py if it doesn't exist
    if [ ! -f "${PROJECT_ROOT}/config.py" ]; then
        log "Copying config.py module..."
        if [ -f "${PROJECT_ROOT}/backups/2025-06-15_v2/config.py" ]; then
            cp "${PROJECT_ROOT}/backups/2025-06-15_v2/config.py" "${PROJECT_ROOT}/config.py"
            log "Created config.py"
        else
            warn "config.py not found in backups, you may need to create it manually"
        fi
    fi
    
    # Create logs directory if it doesn't exist
    mkdir -p "${PROJECT_ROOT}/logs"
    mkdir -p "${PROJECT_ROOT}/data/kismet"
    
    log "Configuration setup complete!"
    echo
    echo "Next steps:"
    echo "1. Edit .env file with your specific settings"
    echo "2. Review and adjust JSON configuration files as needed"
    echo "3. Run './dev.sh setup' to complete development environment setup"
    echo
}

# Run main function
main "$@"
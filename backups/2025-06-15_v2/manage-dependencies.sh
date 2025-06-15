#!/bin/bash
#
# Unified Dependency Management Script for Stinkster Project
# Manages Python dependencies across all components
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Virtual environment paths
declare -A VENV_PATHS=(
    ["gpsmav"]="/home/pi/gpsmav/GPSmav/venv"
    ["wigletotak"]="/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/venv"
    ["hackrf"]="/home/pi/HackRF/venv"
    ["web"]="/home/pi/web/venv"
)

# Requirements files
declare -A REQ_FILES=(
    ["gpsmav"]="${SCRIPT_DIR}/requirements-gpsmav.txt"
    ["wigletotak"]="${SCRIPT_DIR}/requirements-wigletotak.txt"
    ["hackrf"]="${SCRIPT_DIR}/requirements-hackrf.txt"
    ["web"]="${SCRIPT_DIR}/requirements-web.txt"
    ["master"]="${SCRIPT_DIR}/requirements.txt"
    ["dev"]="${SCRIPT_DIR}/requirements-dev.txt"
)

# Functions
show_help() {
    echo "Unified Dependency Management for Stinkster Project"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  status           Show status of all virtual environments"
    echo "  install [COMP]   Install dependencies (all components or specific)"
    echo "  update [COMP]    Update dependencies in virtual environments"
    echo "  check [COMP]     Check for outdated packages"
    echo "  freeze [COMP]    Generate current package list"
    echo "  clean [COMP]     Clean pip cache"
    echo "  sync             Sync component requirements with master"
    echo ""
    echo "Components: gpsmav, wigletotak, hackrf, web, all"
    echo ""
    echo "Examples:"
    echo "  $0 status                    # Show all environments status"
    echo "  $0 install all              # Install all dependencies"
    echo "  $0 install gpsmav           # Install only GPSmav dependencies"
    echo "  $0 update hackrf            # Update HackRF packages"
    echo "  $0 check all                # Check all for outdated packages"
    echo "  $0 freeze wigletotak        # Show installed packages in WigleToTAK"
}

check_venv_exists() {
    local component="$1"
    local venv_path="${VENV_PATHS[$component]}"
    
    if [ ! -d "$venv_path" ]; then
        echo -e "${RED}Virtual environment not found: $venv_path${NC}"
        echo "Run setup-venv-${component}.sh to create it first"
        return 1
    fi
    return 0
}

activate_venv() {
    local component="$1"
    local venv_path="${VENV_PATHS[$component]}"
    source "$venv_path/bin/activate"
}

show_status() {
    echo -e "${BLUE}=== Virtual Environment Status ===${NC}"
    echo ""
    
    for component in "${!VENV_PATHS[@]}"; do
        local venv_path="${VENV_PATHS[$component]}"
        local req_file="${REQ_FILES[$component]}"
        
        echo -e "${YELLOW}Component: $component${NC}"
        echo "  Virtual Environment: $venv_path"
        echo "  Requirements File: $req_file"
        
        if [ -d "$venv_path" ]; then
            echo -e "  Status: ${GREEN}✓ Exists${NC}"
            
            # Check if activate script exists
            if [ -f "$venv_path/bin/activate" ]; then
                # Try to get Python version
                local python_version
                python_version=$("$venv_path/bin/python" --version 2>&1 || echo "Unknown")
                echo "  Python: $python_version"
                
                # Count installed packages
                local pkg_count
                pkg_count=$("$venv_path/bin/pip" list --format=freeze 2>/dev/null | wc -l || echo "0")
                echo "  Packages installed: $pkg_count"
            else
                echo -e "  Status: ${RED}✗ Corrupted (no activate script)${NC}"
            fi
        else
            echo -e "  Status: ${RED}✗ Not found${NC}"
        fi
        
        if [ -f "$req_file" ]; then
            local req_count
            req_count=$(grep -v '^#' "$req_file" | grep -v '^$' | wc -l)
            echo "  Required packages: $req_count"
        else
            echo -e "  Requirements: ${RED}✗ File not found${NC}"
        fi
        
        echo ""
    done
}

install_dependencies() {
    local component="$1"
    
    if [ "$component" = "all" ]; then
        echo -e "${BLUE}Installing dependencies for all components...${NC}"
        for comp in "${!VENV_PATHS[@]}"; do
            install_single_component "$comp"
        done
    else
        install_single_component "$component"
    fi
}

install_single_component() {
    local component="$1"
    local req_file="${REQ_FILES[$component]}"
    
    echo -e "${GREEN}Installing dependencies for: $component${NC}"
    
    if ! check_venv_exists "$component"; then
        return 1
    fi
    
    if [ ! -f "$req_file" ]; then
        echo -e "${RED}Requirements file not found: $req_file${NC}"
        return 1
    fi
    
    activate_venv "$component"
    
    echo "Upgrading pip..."
    pip install --upgrade pip
    
    echo "Installing from: $req_file"
    pip install -r "$req_file"
    
    echo -e "${GREEN}✓ Dependencies installed for $component${NC}"
    deactivate
}

update_dependencies() {
    local component="$1"
    
    if [ "$component" = "all" ]; then
        echo -e "${BLUE}Updating dependencies for all components...${NC}"
        for comp in "${!VENV_PATHS[@]}"; do
            update_single_component "$comp"
        done
    else
        update_single_component "$component"
    fi
}

update_single_component() {
    local component="$1"
    
    echo -e "${GREEN}Updating dependencies for: $component${NC}"
    
    if ! check_venv_exists "$component"; then
        return 1
    fi
    
    activate_venv "$component"
    
    echo "Upgrading pip..."
    pip install --upgrade pip
    
    echo "Updating all packages..."
    pip list --outdated --format=freeze | grep -v '^\-e' | cut -d = -f 1 | xargs -n1 pip install -U || true
    
    echo -e "${GREEN}✓ Dependencies updated for $component${NC}"
    deactivate
}

check_outdated() {
    local component="$1"
    
    if [ "$component" = "all" ]; then
        echo -e "${BLUE}Checking outdated packages for all components...${NC}"
        for comp in "${!VENV_PATHS[@]}"; do
            check_outdated_single "$comp"
        done
    else
        check_outdated_single "$component"
    fi
}

check_outdated_single() {
    local component="$1"
    
    echo -e "${YELLOW}Checking outdated packages for: $component${NC}"
    
    if ! check_venv_exists "$component"; then
        return 1
    fi
    
    activate_venv "$component"
    
    local outdated
    outdated=$(pip list --outdated --format=columns 2>/dev/null || echo "")
    
    if [ -n "$outdated" ]; then
        echo "$outdated"
    else
        echo "All packages are up to date"
    fi
    
    deactivate
    echo ""
}

freeze_packages() {
    local component="$1"
    
    if [ "$component" = "all" ]; then
        echo -e "${BLUE}Generating package lists for all components...${NC}"
        for comp in "${!VENV_PATHS[@]}"; do
            freeze_single_component "$comp"
        done
    else
        freeze_single_component "$component"
    fi
}

freeze_single_component() {
    local component="$1"
    local output_file="${SCRIPT_DIR}/requirements-${component}-freeze.txt"
    
    echo -e "${GREEN}Generating package list for: $component${NC}"
    
    if ! check_venv_exists "$component"; then
        return 1
    fi
    
    activate_venv "$component"
    
    echo "# Frozen requirements for $component component" > "$output_file"
    echo "# Generated on $(date)" >> "$output_file"
    echo "" >> "$output_file"
    pip freeze >> "$output_file"
    
    echo "Package list saved to: $output_file"
    deactivate
}

clean_cache() {
    local component="$1"
    
    if [ "$component" = "all" ]; then
        echo -e "${BLUE}Cleaning pip cache for all components...${NC}"
        for comp in "${!VENV_PATHS[@]}"; do
            clean_single_cache "$comp"
        done
    else
        clean_single_cache "$component"
    fi
}

clean_single_cache() {
    local component="$1"
    
    echo -e "${GREEN}Cleaning pip cache for: $component${NC}"
    
    if ! check_venv_exists "$component"; then
        return 1
    fi
    
    activate_venv "$component"
    pip cache purge
    deactivate
    
    echo -e "${GREEN}✓ Cache cleaned for $component${NC}"
}

sync_requirements() {
    echo -e "${BLUE}Synchronizing component requirements with master file...${NC}"
    echo "This will update individual component requirement files based on the master requirements.txt"
    echo ""
    
    # This is a placeholder for future implementation
    echo -e "${YELLOW}Feature not yet implemented${NC}"
    echo "Currently, requirements are manually maintained for component isolation"
}

# Main script logic
case "${1:-}" in
    "status")
        show_status
        ;;
    "install")
        component="${2:-all}"
        if [ "$component" != "all" ] && [ -z "${VENV_PATHS[$component]:-}" ]; then
            echo -e "${RED}Invalid component: $component${NC}"
            echo "Valid components: ${!VENV_PATHS[*]}"
            exit 1
        fi
        install_dependencies "$component"
        ;;
    "update")
        component="${2:-all}"
        if [ "$component" != "all" ] && [ -z "${VENV_PATHS[$component]:-}" ]; then
            echo -e "${RED}Invalid component: $component${NC}"
            echo "Valid components: ${!VENV_PATHS[*]}"
            exit 1
        fi
        update_dependencies "$component"
        ;;
    "check")
        component="${2:-all}"
        if [ "$component" != "all" ] && [ -z "${VENV_PATHS[$component]:-}" ]; then
            echo -e "${RED}Invalid component: $component${NC}"
            echo "Valid components: ${!VENV_PATHS[*]}"
            exit 1
        fi
        check_outdated "$component"
        ;;
    "freeze")
        component="${2:-all}"
        if [ "$component" != "all" ] && [ -z "${VENV_PATHS[$component]:-}" ]; then
            echo -e "${RED}Invalid component: $component${NC}"
            echo "Valid components: ${!VENV_PATHS[*]}"
            exit 1
        fi
        freeze_packages "$component"
        ;;
    "clean")
        component="${2:-all}"
        if [ "$component" != "all" ] && [ -z "${VENV_PATHS[$component]:-}" ]; then
            echo -e "${RED}Invalid component: $component${NC}"
            echo "Valid components: ${!VENV_PATHS[*]}"
            exit 1
        fi
        clean_cache "$component"
        ;;
    "sync")
        sync_requirements
        ;;
    "--help"|"-h"|"help"|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
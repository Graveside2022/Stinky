#!/bin/bash
#
# Load configuration from .env file and export environment variables
# Source this file from other scripts to get configuration
#

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env file if it exists
if [ -f "${PROJECT_ROOT}/.env" ]; then
    # Export variables from .env file
    set -a  # Mark all new variables for export
    source "${PROJECT_ROOT}/.env"
    set +a  # Turn off auto-export
fi

# Set default values if not provided in .env
export PROJECT_ROOT="${PROJECT_ROOT}"
export LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/logs}"
export KISMET_DATA_DIR="${KISMET_DATA_DIR:-${PROJECT_ROOT}/data/kismet}"
export PID_DIR="${PID_DIR:-${PROJECT_ROOT}/logs}"
export NETWORK_INTERFACE="${NETWORK_INTERFACE:-wlan2}"
export KISMET_API_URL="${KISMET_API_URL:-http://localhost:2501}"
export TAK_SERVER_IP="${TAK_SERVER_IP:-0.0.0.0}"
export TAK_SERVER_PORT="${TAK_SERVER_PORT:-8087}"
export TAK_MULTICAST_GROUP="${TAK_MULTICAST_GROUP:-239.2.3.1}"
export WIGLETOTAK_FLASK_PORT="${WIGLETOTAK_FLASK_PORT:-8000}"
export WIGLETOTAK_DIRECTORY="${WIGLETOTAK_DIRECTORY:-${KISMET_DATA_DIR}}"
export GPSD_HOST="${GPSD_HOST:-localhost}"
export GPSD_PORT="${GPSD_PORT:-2947}"
export KISMET_USERNAME="${KISMET_USERNAME:-admin}"
export KISMET_PASSWORD="${KISMET_PASSWORD:-admin}"
export NETWORK_HOP_SPEED="${NETWORK_HOP_SPEED:-5/sec}"

# Function to verify critical configuration
verify_config() {
    local errors=0
    
    # Check if network interface exists
    if ! ip link show "${NETWORK_INTERFACE}" >/dev/null 2>&1; then
        echo "Warning: Network interface ${NETWORK_INTERFACE} not found" >&2
        errors=$((errors + 1))
    fi
    
    # Check if directories exist
    for dir in "${LOG_DIR}" "${KISMET_DATA_DIR}" "${PID_DIR}"; do
        if [ ! -d "${dir}" ]; then
            mkdir -p "${dir}" || {
                echo "Error: Cannot create directory ${dir}" >&2
                errors=$((errors + 1))
            }
        fi
    done
    
    return ${errors}
}

# Export the verify function so it can be used by other scripts
export -f verify_config
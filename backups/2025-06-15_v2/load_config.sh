#!/bin/bash
# Configuration loader for shell scripts
# Source this file to load environment variables and configuration

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables from .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "Loading environment from $SCRIPT_DIR/.env"
    set -a  # Mark all new variables for export
    source "$SCRIPT_DIR/.env"
    set +a  # Stop marking for export
else
    echo "Warning: .env file not found at $SCRIPT_DIR/.env"
    echo "Using default values. Copy .env.example to .env and configure."
fi

# Set default values if not already set
export KISMET_USERNAME="${KISMET_USERNAME:-admin}"
export KISMET_PASSWORD="${KISMET_PASSWORD:-admin}"
export KISMET_API_URL="${KISMET_API_URL:-http://localhost:2501}"
export KISMET_API_IP="${KISMET_API_IP:-10.42.0.1}"

# OpenWebRX Configuration
export OPENWEBRX_ADMIN_USER="${OPENWEBRX_ADMIN_USER:-admin}"
export OPENWEBRX_ADMIN_PASSWORD="${OPENWEBRX_ADMIN_PASSWORD:-hackrf}"
export OPENWEBRX_PORT="${OPENWEBRX_PORT:-8073}"

export TAK_SERVER_IP="${TAK_SERVER_IP:-0.0.0.0}"
export TAK_SERVER_PORT="${TAK_SERVER_PORT:-6969}"
export TAK_MULTICAST_GROUP="${TAK_MULTICAST_GROUP:-239.2.3.1}"
export WIGLETOTAK_FLASK_PORT="${WIGLETOTAK_FLASK_PORT:-8000}"
export WIGLETOTAK_DIRECTORY="${WIGLETOTAK_DIRECTORY:-${WIGLETOTAK_DIR:-/home/pi/projects/stinkster/wigletotak}/WigleToTAK/TheStinkToTAK}"

export GPSD_HOST="${GPSD_HOST:-localhost}"
export GPSD_PORT="${GPSD_PORT:-2947}"

export NETWORK_INTERFACE="${NETWORK_INTERFACE:-wlan2}"
export NETWORK_HOP_SPEED="${NETWORK_HOP_SPEED:-5/sec}"

export WEBHOOK_PORT="${WEBHOOK_PORT:-5000}"
export WEBHOOK_LOG_PATH="${WEBHOOK_LOG_PATH:-/var/log/webhook.log}"

export LOG_DIR="${LOG_DIR:-${LOG_DIR:-/home/pi/projects/stinkster/logs}}"
export PID_DIR="${PID_DIR:-${LOG_DIR:-/home/pi/projects/stinkster/logs}}"
export KISMET_OPS_DIR="${KISMET_OPS_DIR:-${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}}"
export SCRIPT_DIR="${SCRIPT_DIR:-/home/pi/projects/stinkster/scripts}"

export KISMET_PID_FILE="${KISMET_PID_FILE:-${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}/kismet.pid}"
export WIGLETOTAK_PID_FILE="${WIGLETOTAK_PID_FILE:-${LOG_DIR:-/home/pi/projects/stinkster/logs}/wigletotak.specific.pid}"
export SCRIPT_PID_FILE="${SCRIPT_PID_FILE:-/tmp/kismet_script.pid}"
export GPS_KISMET_WIGLE_PID_FILE="${GPS_KISMET_WIGLE_PID_FILE:-${LOG_DIR:-/home/pi/projects/stinkster/logs}/gps_kismet_wigle.pids}"

export DEBUG="${DEBUG:-false}"

# Function to print configuration summary
print_config() {
    echo "=== Stinkster Configuration ==="
    echo "Kismet API: $KISMET_API_URL"
    echo "TAK Server: $TAK_SERVER_IP:$TAK_SERVER_PORT"
    echo "Network Interface: $NETWORK_INTERFACE"
    echo "Log Directory: $LOG_DIR"
    echo "PID Directory: $PID_DIR"
    echo "Debug Mode: $DEBUG"
    echo "=============================="
}

# Print configuration if DEBUG is true
if [ "$DEBUG" = "true" ]; then
    print_config
fi
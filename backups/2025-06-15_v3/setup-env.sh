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

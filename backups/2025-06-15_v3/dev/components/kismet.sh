#!/bin/bash
# Kismet development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Load configuration
source "${PROJECT_ROOT}/load_config.sh"

# Set development options
export KISMET_CONF_DIR="${PROJECT_ROOT}/dev/config"
export KISMET_LOG_DIR="${PROJECT_ROOT}/dev/logs"

# Ensure network interface is available
INTERFACE="${NETWORK_INTERFACE:-wlan2}"

echo "Starting Kismet with interface: $INTERFACE"
echo "Configuration directory: $KISMET_CONF_DIR"
echo "Log directory: $KISMET_LOG_DIR"

# Create development kismet config if it doesn't exist
if [ ! -f "${KISMET_CONF_DIR}/kismet_site.conf" ]; then
    mkdir -p "${KISMET_CONF_DIR}"
    cp "${PROJECT_ROOT}/kismet_site.conf" "${KISMET_CONF_DIR}/"
fi

exec kismet \
    --override=configdir="${KISMET_CONF_DIR}" \
    --override=logdir="${KISMET_LOG_DIR}" \
    --override=source="${INTERFACE}" \
    --override=httpd_bind_address=127.0.0.1 \
    --override=httpd_port=2501

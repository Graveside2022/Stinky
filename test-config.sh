#!/bin/bash
#
# Test configuration loading system
#

set -euo pipefail

# Source the configuration loader
source "$(dirname "${BASH_SOURCE[0]}")/load_config.sh"

echo "=== Configuration Test ==="
echo "Testing configuration loading and environment variables..."
echo

# Display loaded configuration
echo "Project Configuration:"
echo "  PROJECT_ROOT: ${PROJECT_ROOT}"
echo "  LOG_DIR: ${LOG_DIR}"
echo "  KISMET_DATA_DIR: ${KISMET_DATA_DIR}"
echo "  NETWORK_INTERFACE: ${NETWORK_INTERFACE}"
echo

echo "Service Configuration:"
echo "  KISMET_API_URL: ${KISMET_API_URL}"
echo "  TAK_SERVER: ${TAK_SERVER_IP}:${TAK_SERVER_PORT}"
echo "  WIGLETOTAK_PORT: ${WIGLETOTAK_FLASK_PORT}"
echo "  GPSD: ${GPSD_HOST}:${GPSD_PORT}"
echo

# Test Python config module
echo "Testing Python config module..."
python3 -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}')
try:
    from config import config
    print('  ✓ Python config module loaded successfully')
    print(f'  ✓ Kismet API URL from Python: {config.kismet_api_url}')
    print(f'  ✓ TAK Server from Python: {config.tak_server_ip}:{config.tak_server_port}')
except Exception as e:
    print(f'  ✗ Failed to load Python config: {e}')
"
echo

# Verify configuration
echo "Verifying configuration..."
if verify_config; then
    echo "  ✓ Configuration verification passed"
else
    echo "  ✗ Configuration verification found issues"
fi
echo

echo "=== Configuration test complete ==="
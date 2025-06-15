#!/bin/bash
# Test GPSmav component

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${PROJECT_ROOT}/venv/bin/activate"
export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"

echo "Testing GPSmav component..."

# Test configuration
python3 -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}')
from config import config
print(f'GPSD Host: {config.gpsd_host}')
print(f'GPSD Port: {config.gpsd_port}')
"

echo "GPSmav test completed"

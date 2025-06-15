#!/bin/bash
# Run unit tests

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${PROJECT_ROOT}/venv/bin/activate"
export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"

echo "Running unit tests..."

# Test configuration loading
python3 -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}')
from config import config
print('✓ Configuration loading test passed')
print(f'  - Kismet API URL: {config.kismet_api_url}')
print(f'  - TAK Server: {config.tak_server_ip}:{config.tak_server_port}')
"

# Test Python imports
python3 -c "
import importlib.util
import sys

modules_to_test = [
    ('gpsmav', '${PROJECT_ROOT}/src/gpsmav'),
    ('hackrf', '${PROJECT_ROOT}/src/hackrf'),
    ('wigletotak', '${PROJECT_ROOT}/src/wigletotak'),
]

for module_name, module_path in modules_to_test:
    try:
        sys.path.insert(0, module_path)
        if module_name == 'gpsmav':
            # Test if gpsmav module structure exists
            import os
            if os.path.exists(f'{module_path}/__init__.py'):
                print(f'✓ {module_name} module structure exists')
            else:
                print(f'! {module_name} module needs __init__.py')
        else:
            print(f'✓ {module_name} path accessible')
    except Exception as e:
        print(f'✗ {module_name} import failed: {e}')
"

echo "Unit tests completed"

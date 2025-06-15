#!/bin/bash
# Configuration validator

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${PROJECT_ROOT}/venv/bin/activate"

echo "Validating Stinkster configuration..."

python3 -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}')

try:
    from config import config
    print('✓ Configuration loaded successfully')
    
    # Validate configuration values
    config_items = [
        ('Kismet API URL', config.kismet_api_url),
        ('TAK Server IP', config.tak_server_ip),
        ('TAK Server Port', config.tak_server_port),
        ('GPSD Host', config.gpsd_host),
        ('GPSD Port', config.gpsd_port),
        ('Network Interface', config.network_interface),
        ('Log Directory', str(config.log_dir)),
        ('PID Directory', str(config.pid_dir)),
    ]
    
    print('\nConfiguration values:')
    for name, value in config_items:
        print(f'  {name}: {value}')
    
    print('\n✓ All configuration values loaded')
    
except Exception as e:
    print(f'✗ Configuration error: {e}')
    sys.exit(1)
"

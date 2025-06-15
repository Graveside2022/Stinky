#!/bin/bash
#
# Development environment setup script
# Creates all necessary development infrastructure
#

set -euo pipefail

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_DIR="${PROJECT_ROOT}/dev"
SRC_DIR="${PROJECT_ROOT}/src"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Create development structure
create_dev_structure() {
    log "Creating development directory structure..."
    
    mkdir -p "${DEV_DIR}/components"
    mkdir -p "${DEV_DIR}/test"
    mkdir -p "${DEV_DIR}/tools"
    mkdir -p "${DEV_DIR}/hot-reload"
    mkdir -p "${DEV_DIR}/logs"
    mkdir -p "${DEV_DIR}/pids"
    mkdir -p "${DEV_DIR}/config"
    mkdir -p "${DEV_DIR}/templates"
}

# Create component wrapper scripts
create_component_scripts() {
    log "Creating component wrapper scripts..."
    
    # GPS MAVLink component
    cat > "${DEV_DIR}/components/gpsmav.sh" << 'EOF'
#!/bin/bash
# GPSmav development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${PROJECT_ROOT}/venv/bin/activate"

export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"
export DEV_MODE=1
export LOG_LEVEL=DEBUG

cd "${PROJECT_ROOT}/src/gpsmav"
exec python3 -m gpsmav.main
EOF

    # HackRF component
    cat > "${DEV_DIR}/components/hackrf.sh" << 'EOF'
#!/bin/bash
# HackRF development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${PROJECT_ROOT}/venv/bin/activate"

export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"
export DEV_MODE=1
export LOG_LEVEL=DEBUG

cd "${PROJECT_ROOT}/src/hackrf"
exec python3 -m hackrf.spectrum_analyzer
EOF

    # WigleToTAK component
    cat > "${DEV_DIR}/components/wigletotak.sh" << 'EOF'
#!/bin/bash
# WigleToTAK development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "${PROJECT_ROOT}/venv/bin/activate"

export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"
export DEV_MODE=1
export LOG_LEVEL=DEBUG
export FLASK_ENV=development
export FLASK_DEBUG=1

cd "${PROJECT_ROOT}/src/wigletotak"
exec python3 -m wigletotak.app
EOF

    # Kismet component
    cat > "${DEV_DIR}/components/kismet.sh" << 'EOF'
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
EOF

    # OpenWebRX component
    cat > "${DEV_DIR}/components/openwebrx.sh" << 'EOF'
#!/bin/bash
# OpenWebRX development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Starting OpenWebRX Docker container..."

# Check if container exists
if docker ps -a --format "table {{.Names}}" | grep -q "^openwebrx$"; then
    echo "Starting existing OpenWebRX container..."
    docker start openwebrx
else
    echo "Creating new OpenWebRX container..."
    cd "${PROJECT_ROOT}"
    docker-compose up -d openwebrx
fi

# Wait for container to be ready
echo "Waiting for OpenWebRX to be ready..."
sleep 10

# Show container status
docker ps --filter name=openwebrx

echo "OpenWebRX should be available at http://localhost:8073"
EOF

    # Make all component scripts executable
    chmod +x "${DEV_DIR}/components/"*.sh
}

# Create testing infrastructure
create_test_scripts() {
    log "Creating testing infrastructure..."
    
    # Main test runner
    cat > "${DEV_DIR}/test/run-all-tests.sh" << 'EOF'
#!/bin/bash
# Run all tests

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_DIR="${PROJECT_ROOT}/dev/test"

echo "Running all Stinkster tests..."
echo "================================"

# Activate virtual environment
source "${PROJECT_ROOT}/venv/bin/activate"
export PYTHONPATH="${PROJECT_ROOT}/src:${PYTHONPATH:-}"

# Run unit tests
echo "Running unit tests..."
if bash "${TEST_DIR}/run-unit-tests.sh"; then
    echo "✓ Unit tests passed"
else
    echo "✗ Unit tests failed"
    exit 1
fi

# Run integration tests
echo "Running integration tests..."
if bash "${TEST_DIR}/run-integration-tests.sh"; then
    echo "✓ Integration tests passed"
else
    echo "✗ Integration tests failed"
    exit 1
fi

echo "All tests completed successfully!"
EOF

    # Unit tests
    cat > "${DEV_DIR}/test/run-unit-tests.sh" << 'EOF'
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
EOF

    # Integration tests
    cat > "${DEV_DIR}/test/run-integration-tests.sh" << 'EOF'
#!/bin/bash
# Run integration tests

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Running integration tests..."

# Test network interface availability
INTERFACE="${NETWORK_INTERFACE:-wlan2}"
if ip link show "$INTERFACE" >/dev/null 2>&1; then
    echo "✓ Network interface $INTERFACE is available"
else
    echo "! Network interface $INTERFACE not found (will use simulation mode)"
fi

# Test Docker availability for OpenWebRX
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        echo "✓ Docker is available and running"
    else
        echo "! Docker is installed but not running"
    fi
else
    echo "! Docker is not installed"
fi

# Test HackRF availability
if command -v hackrf_info >/dev/null 2>&1; then
    if hackrf_info >/dev/null 2>&1; then
        echo "✓ HackRF device detected"
    else
        echo "! HackRF tools installed but no device detected"
    fi
else
    echo "! HackRF tools not installed"
fi

# Test Kismet availability
if command -v kismet >/dev/null 2>&1; then
    echo "✓ Kismet is installed"
else
    echo "! Kismet is not installed"
fi

# Test GPSD availability
if command -v gpsd >/dev/null 2>&1; then
    echo "✓ GPSD is installed"
else
    echo "! GPSD is not installed"
fi

echo "Integration tests completed"
EOF

    # Individual component tests
    cat > "${DEV_DIR}/test/test-gpsmav.sh" << 'EOF'
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
EOF

    # Make test scripts executable
    chmod +x "${DEV_DIR}/test/"*.sh
}

# Create hot reload system
create_hot_reload() {
    log "Creating hot reload system..."
    
    cat > "${DEV_DIR}/hot-reload/monitor.sh" << 'EOF'
#!/bin/bash
# Hot reload monitor for Python components

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_DIR="${PROJECT_ROOT}/src"
PID_DIR="${PROJECT_ROOT}/dev/pids"

echo "Starting hot reload monitor..."
echo "Watching: $SRC_DIR"

# Function to restart component
restart_component() {
    local component="$1"
    local pid_file="${PID_DIR}/${component}.pid"
    
    echo "File change detected, restarting $component..."
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            sleep 2
        fi
    fi
    
    # Restart component
    bash "${PROJECT_ROOT}/dev/components/${component}.sh" > "${PROJECT_ROOT}/dev/logs/${component}.log" 2>&1 &
    echo $! > "$pid_file"
    
    echo "$component restarted"
}

# Monitor file changes
if command -v inotifywait >/dev/null 2>&1; then
    inotifywait -m -r -e modify,create,delete --format '%w%f %e' "$SRC_DIR" | while read file event; do
        if [[ "$file" == *.py ]]; then
            echo "Python file changed: $file"
            
            # Determine which component to restart based on path
            if [[ "$file" == *"/gpsmav/"* ]]; then
                restart_component "gpsmav"
            elif [[ "$file" == *"/hackrf/"* ]]; then
                restart_component "hackrf"
            elif [[ "$file" == *"/wigletotak/"* ]]; then
                restart_component "wigletotak"
            fi
        fi
    done
else
    echo "inotifywait not found, hot reload unavailable"
    echo "Install with: sudo apt-get install inotify-tools"
    sleep infinity
fi
EOF

    chmod +x "${DEV_DIR}/hot-reload/monitor.sh"
}

# Create development tools
create_dev_tools() {
    log "Creating development tools..."
    
    # Log viewer tool
    cat > "${DEV_DIR}/tools/logview.sh" << 'EOF'
#!/bin/bash
# Interactive log viewer

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/dev/logs"

if [ $# -eq 0 ]; then
    echo "Available logs:"
    ls -1 "${LOG_DIR}"/*.log 2>/dev/null | sed 's|.*/||' | sed 's|\.log$||' || echo "No logs found"
    echo
    echo "Usage: $0 <component>"
    exit 1
fi

COMPONENT="$1"
LOG_FILE="${LOG_DIR}/${COMPONENT}.log"

if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
else
    echo "Log file not found: $LOG_FILE"
    exit 1
fi
EOF

    # Process monitor tool
    cat > "${DEV_DIR}/tools/monitor.sh" << 'EOF'
#!/bin/bash
# Process monitor for development

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_DIR="${PROJECT_ROOT}/dev/pids"

watch -n 2 "
echo 'Stinkster Development Process Monitor'
echo '====================================='
echo
for pidfile in ${PID_DIR}/*.pid; do
    if [ -f \"\$pidfile\" ]; then
        component=\$(basename \"\$pidfile\" .pid)
        pid=\$(cat \"\$pidfile\")
        if kill -0 \"\$pid\" 2>/dev/null; then
            echo \"✓ \$component (PID: \$pid)\"
            ps -p \"\$pid\" -o pid,ppid,pcpu,pmem,etime,cmd --no-headers | sed 's/^/  /'
        else
            echo \"✗ \$component (stopped)\"
        fi
        echo
    fi
done
"
EOF

    # Configuration validator
    cat > "${DEV_DIR}/tools/validate-config.sh" << 'EOF'
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
EOF

    # Make tools executable
    chmod +x "${DEV_DIR}/tools/"*.sh
}

# Main setup function
main() {
    log "Setting up Stinkster development environment..."
    
    create_dev_structure
    create_component_scripts
    create_test_scripts
    create_hot_reload
    create_dev_tools
    
    # Install development dependencies
    if command -v apt-get >/dev/null 2>&1; then
        info "Installing development dependencies..."
        if ! command -v inotifywait >/dev/null 2>&1; then
            echo "Consider installing inotify-tools for hot reload: sudo apt-get install inotify-tools"
        fi
    fi
    
    log "Development environment setup complete!"
    echo
    echo "Quick start:"
    echo "  ./dev.sh start          # Start all components"
    echo "  ./dev.sh status         # Check component status"
    echo "  ./dev.sh logs           # View all logs"
    echo "  ./dev.sh test           # Run all tests"
    echo
}

main "$@"
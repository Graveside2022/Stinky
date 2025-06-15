#!/bin/bash
#
# Health check tool for all Stinkster components
# Performs comprehensive system and component health assessment
#

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_DIR="${PROJECT_ROOT}/dev/pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[HEALTH]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check system dependencies
check_system_deps() {
    log "Checking system dependencies..."
    
    local deps=("python3" "docker" "kismet" "gpsd" "hackrf_info")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if command -v "$dep" >/dev/null 2>&1; then
            echo "  ✓ $dep"
        else
            echo "  ✗ $dep (missing)"
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        warn "Missing dependencies: ${missing[*]}"
        echo "  Install with your package manager or follow setup documentation"
    else
        log "All system dependencies available"
    fi
}

# Check Python environment
check_python_env() {
    log "Checking Python environment..."
    
    if [ -d "${PROJECT_ROOT}/venv" ]; then
        echo "  ✓ Virtual environment exists"
        
        source "${PROJECT_ROOT}/venv/bin/activate"
        
        # Check Python version
        local py_version=$(python3 --version)
        echo "  ✓ Python version: $py_version"
        
        # Check key packages
        local packages=("flask" "pymavlink" "requests")
        for pkg in "${packages[@]}"; do
            if python3 -c "import $pkg" 2>/dev/null; then
                echo "  ✓ $pkg package available"
            else
                echo "  ✗ $pkg package missing"
            fi
        done
    else
        error "Virtual environment not found at ${PROJECT_ROOT}/venv"
        echo "  Run: ./dev.sh setup"
    fi
}

# Check hardware availability
check_hardware() {
    log "Checking hardware availability..."
    
    # Check network interfaces
    local interface="${NETWORK_INTERFACE:-wlan2}"
    if ip link show "$interface" >/dev/null 2>&1; then
        echo "  ✓ Network interface $interface available"
        
        # Check if interface can be put in monitor mode
        local current_type=$(iw dev "$interface" info | grep type | awk '{print $2}')
        echo "    Current type: $current_type"
    else
        warn "Network interface $interface not found"
        echo "    Available interfaces:"
        ip link show | grep -E '^[0-9]+:' | awk '{print $2}' | sed 's/:$//' | sed 's/^/      /'
    fi
    
    # Check HackRF
    if command -v hackrf_info >/dev/null 2>&1; then
        if hackrf_info >/dev/null 2>&1; then
            echo "  ✓ HackRF device detected"
            hackrf_info | head -5 | sed 's/^/    /'
        else
            warn "HackRF tools available but no device detected"
        fi
    else
        warn "HackRF tools not installed"
    fi
    
    # Check GPS devices
    if ls /dev/ttyUSB* /dev/ttyACM* >/dev/null 2>&1; then
        echo "  ✓ Serial devices available:"
        ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null | sed 's/^/    /'
    else
        warn "No serial devices found for GPS"
    fi
}

# Check running processes
check_processes() {
    log "Checking component processes..."
    
    local components=("gpsmav" "hackrf" "wigletotak" "kismet" "openwebrx")
    local running_count=0
    
    for component in "${components[@]}"; do
        local pid_file="${PID_DIR}/${component}.pid"
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if kill -0 "$pid" 2>/dev/null; then
                echo "  ✓ $component running (PID: $pid)"
                
                # Check resource usage
                local cpu_mem=$(ps -p "$pid" -o %cpu,%mem --no-headers)
                echo "    CPU/Memory: $cpu_mem"
                
                running_count=$((running_count + 1))
            else
                echo "  ✗ $component stopped (stale PID file)"
            fi
        else
            echo "  ✗ $component not running"
        fi
    done
    
    if [ $running_count -gt 0 ]; then
        log "$running_count components running"
    else
        warn "No components currently running"
    fi
}

# Check network connectivity
check_connectivity() {
    log "Checking network connectivity..."
    
    # Check localhost services
    local services=(
        "2501:Kismet API"
        "6969:WigleToTAK"
        "8074:OpenWebRX"
        "2947:GPSD"
    )
    
    for service in "${services[@]}"; do
        local port=$(echo "$service" | cut -d: -f1)
        local name=$(echo "$service" | cut -d: -f2)
        
        if nc -z localhost "$port" 2>/dev/null; then
            echo "  ✓ $name (port $port) accessible"
        else
            echo "  ✗ $name (port $port) not accessible"
        fi
    done
    
    # Check external connectivity
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        echo "  ✓ Internet connectivity available"
    else
        warn "No internet connectivity"
    fi
}

# Check disk space and logs
check_resources() {
    log "Checking system resources..."
    
    # Check disk space
    local disk_usage=$(df -h "${PROJECT_ROOT}" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 90 ]; then
        echo "  ✓ Disk space OK (${disk_usage}% used)"
    else
        warn "Disk space high (${disk_usage}% used)"
    fi
    
    # Check memory usage
    local mem_info=$(free -h | grep Mem:)
    echo "  ✓ Memory: $mem_info"
    
    # Check log file sizes
    if [ -d "${PROJECT_ROOT}/dev/logs" ]; then
        local log_size=$(du -sh "${PROJECT_ROOT}/dev/logs" 2>/dev/null | cut -f1)
        echo "  ✓ Log directory size: $log_size"
        
        # Check for large log files
        find "${PROJECT_ROOT}/dev/logs" -name "*.log" -size +10M 2>/dev/null | while read -r large_log; do
            local size=$(du -sh "$large_log" | cut -f1)
            warn "Large log file: $(basename "$large_log") ($size)"
        done
    fi
}

# Check configuration
check_config() {
    log "Checking configuration..."
    
    source "${PROJECT_ROOT}/venv/bin/activate"
    
    python3 -c "
import sys
sys.path.insert(0, '${PROJECT_ROOT}')

try:
    from config import config
    print('  ✓ Configuration loads successfully')
    
    # Check critical config values
    if config.kismet_api_url:
        print(f'  ✓ Kismet API URL: {config.kismet_api_url}')
    else:
        print('  ✗ Kismet API URL not configured')
    
    if config.network_interface:
        print(f'  ✓ Network interface: {config.network_interface}')
    else:
        print('  ✗ Network interface not configured')
        
except Exception as e:
    print(f'  ✗ Configuration error: {e}')
"
}

# Generate health report
generate_report() {
    local report_file="${PROJECT_ROOT}/dev/logs/health-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Stinkster Health Check Report"
        echo "Generated: $(date)"
        echo "================================"
        echo
        
        echo "System Information:"
        uname -a
        echo
        
        echo "Component Status:"
        check_processes 2>&1
        echo
        
        echo "Hardware Status:"
        check_hardware 2>&1
        echo
        
        echo "Network Status:"
        check_connectivity 2>&1
        echo
        
        echo "Resource Usage:"
        check_resources 2>&1
        echo
        
    } > "$report_file"
    
    info "Health report saved to: $report_file"
}

# Main health check function
main() {
    local option="${1:-all}"
    
    case "$option" in
        system)
            check_system_deps
            ;;
        python)
            check_python_env
            ;;
        hardware)
            check_hardware
            ;;
        processes)
            check_processes
            ;;
        network)
            check_connectivity
            ;;
        config)
            check_config
            ;;
        resources)
            check_resources
            ;;
        report)
            generate_report
            ;;
        all|*)
            log "Running comprehensive health check..."
            echo
            check_system_deps
            echo
            check_python_env
            echo
            check_hardware
            echo
            check_processes
            echo
            check_connectivity
            echo
            check_resources
            echo
            check_config
            echo
            log "Health check complete"
            ;;
    esac
}

main "$@"
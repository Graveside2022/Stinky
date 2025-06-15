#!/bin/bash
#
# Main development launcher for Stinkster project
# Provides a complete development environment within the project folder
#

set -euo pipefail

# Project configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_DIR="${PROJECT_ROOT}/dev"
SRC_DIR="${PROJECT_ROOT}/src"
LOG_DIR="${PROJECT_ROOT}/dev/logs"
PID_DIR="${PROJECT_ROOT}/dev/pids"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Create development directories
setup_dev_environment() {
    log "Setting up development environment..."
    
    mkdir -p "${LOG_DIR}" "${PID_DIR}"
    mkdir -p "${DEV_DIR}/components"
    mkdir -p "${DEV_DIR}/test"
    mkdir -p "${DEV_DIR}/tools"
    mkdir -p "${DEV_DIR}/hot-reload"
    
    # Set up Python virtual environment if it doesn't exist
    if [ ! -d "${PROJECT_ROOT}/venv" ]; then
        log "Creating Python virtual environment..."
        python3 -m venv "${PROJECT_ROOT}/venv"
        source "${PROJECT_ROOT}/venv/bin/activate"
        pip install --upgrade pip
        if [ -f "${PROJECT_ROOT}/requirements.txt" ]; then
            pip install -r "${PROJECT_ROOT}/requirements.txt"
        fi
    fi
    
    log "Development environment ready"
}

# Function to start a component with monitoring
start_component() {
    local component="$1"
    local script_path="${DEV_DIR}/components/${component}.sh"
    
    if [ ! -f "$script_path" ]; then
        error "Component script not found: $script_path"
        return 1
    fi
    
    log "Starting component: $component"
    
    # Check if component is already running
    local pid_file="${PID_DIR}/${component}.pid"
    if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        warn "Component $component is already running (PID: $(cat "$pid_file"))"
        return 0
    fi
    
    # Start component in background
    bash "$script_path" > "${LOG_DIR}/${component}.log" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    
    # Wait a moment and check if it's still running
    sleep 2
    if kill -0 $pid 2>/dev/null; then
        log "Component $component started successfully (PID: $pid)"
    else
        error "Component $component failed to start"
        cat "${LOG_DIR}/${component}.log"
        return 1
    fi
}

# Function to stop a component
stop_component() {
    local component="$1"
    local pid_file="${PID_DIR}/${component}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping component: $component (PID: $pid)"
            kill "$pid"
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                warn "Component $component didn't stop gracefully, force killing..."
                kill -9 "$pid"
            fi
        fi
        rm -f "$pid_file"
    else
        warn "Component $component is not running"
    fi
}

# Function to show status of all components
show_status() {
    log "Component Status:"
    echo
    
    local components=("gpsmav" "hackrf" "wigletotak" "kismet" "openwebrx")
    
    for component in "${components[@]}"; do
        local pid_file="${PID_DIR}/${component}.pid"
        if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
            echo -e "  ${GREEN}●${NC} $component (PID: $(cat "$pid_file"))"
        else
            echo -e "  ${RED}●${NC} $component (stopped)"
        fi
    done
    echo
}

# Function to show logs
show_logs() {
    local component="${1:-all}"
    
    if [ "$component" = "all" ]; then
        log "Showing all component logs (press Ctrl+C to stop)..."
        tail -f "${LOG_DIR}"/*.log 2>/dev/null || {
            warn "No log files found"
            return 1
        }
    else
        local log_file="${LOG_DIR}/${component}.log"
        if [ -f "$log_file" ]; then
            log "Showing logs for $component (press Ctrl+C to stop)..."
            tail -f "$log_file"
        else
            error "Log file not found: $log_file"
            return 1
        fi
    fi
}

# Function to run tests
run_tests() {
    local test_type="${1:-all}"
    
    log "Running tests: $test_type"
    
    if [ -f "${DEV_DIR}/test/run-${test_type}-tests.sh" ]; then
        bash "${DEV_DIR}/test/run-${test_type}-tests.sh"
    else
        error "Test script not found: run-${test_type}-tests.sh"
        return 1
    fi
}

# Function to enable hot reload
enable_hot_reload() {
    log "Enabling hot reload for Python components..."
    
    if [ -f "${DEV_DIR}/hot-reload/monitor.sh" ]; then
        bash "${DEV_DIR}/hot-reload/monitor.sh" &
        echo $! > "${PID_DIR}/hot-reload.pid"
        log "Hot reload enabled"
    else
        error "Hot reload script not found"
        return 1
    fi
}

# Function to disable hot reload
disable_hot_reload() {
    local pid_file="${PID_DIR}/hot-reload.pid"
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "Disabling hot reload..."
            kill "$pid"
        fi
        rm -f "$pid_file"
    fi
}

# Function to stop all components
stop_all() {
    log "Stopping all components..."
    
    # Stop hot reload first
    disable_hot_reload
    
    # Stop all components
    local components=("gpsmav" "hackrf" "wigletotak" "kismet" "openwebrx")
    for component in "${components[@]}"; do
        stop_component "$component"
    done
    
    log "All components stopped"
}

# Cleanup function for script exit
cleanup() {
    log "Cleaning up..."
    stop_all
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Help function
show_help() {
    cat << EOF
Stinkster Development Environment

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    start [component]     Start all components or specific component
    stop [component]      Stop all components or specific component
    restart [component]   Restart all components or specific component
    status               Show status of all components
    logs [component]     Show logs for all or specific component
    test [type]          Run tests (all, unit, integration)
    hot-reload           Enable hot reload monitoring
    setup               Set up development environment
    clean               Clean up logs and PID files
    help                Show this help message

Components:
    gpsmav              GPS MAVLink bridge
    hackrf              HackRF spectrum analyzer
    wigletotak          WiFi to TAK converter
    kismet              WiFi scanner
    openwebrx           Web SDR interface

Examples:
    $0 start            # Start all components
    $0 start gpsmav     # Start only GPSmav component
    $0 logs wigletotak  # Show WigleToTAK logs
    $0 test unit        # Run unit tests
    $0 status           # Show component status

EOF
}

# Main command processing
main() {
    case "${1:-help}" in
        start)
            setup_dev_environment
            if [ -n "${2:-}" ]; then
                start_component "$2"
            else
                log "Starting all components..."
                enable_hot_reload
                start_component "gpsmav"
                sleep 3
                start_component "kismet"
                sleep 3
                start_component "wigletotak"
                sleep 3
                start_component "hackrf"
                sleep 3
                start_component "openwebrx"
                show_status
                log "All components started. Use '$0 logs' to monitor or '$0 stop' to stop all."
            fi
            ;;
        stop)
            if [ -n "${2:-}" ]; then
                stop_component "$2"
            else
                stop_all
            fi
            ;;
        restart)
            if [ -n "${2:-}" ]; then
                stop_component "$2"
                sleep 2
                start_component "$2"
            else
                stop_all
                sleep 3
                main start
            fi
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "${2:-all}"
            ;;
        test)
            run_tests "${2:-all}"
            ;;
        hot-reload)
            enable_hot_reload
            ;;
        setup)
            setup_dev_environment
            bash "${DEV_DIR}/setup.sh"
            ;;
        clean)
            log "Cleaning up development environment..."
            stop_all
            rm -f "${LOG_DIR}"/*.log
            rm -f "${PID_DIR}"/*.pid
            log "Cleanup complete"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
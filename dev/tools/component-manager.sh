#!/bin/bash
#
# Component management tool for Stinkster development
# Provides advanced component control and monitoring
#

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_DIR="${PROJECT_ROOT}/dev/pids"
LOG_DIR="${PROJECT_ROOT}/dev/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[MANAGER]${NC} $1"
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

# Get component status
get_component_status() {
    local component="$1"
    local pid_file="${PID_DIR}/${component}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "running:$pid"
        else
            echo "stopped:stale"
        fi
    else
        echo "stopped:none"
    fi
}

# Get component uptime
get_component_uptime() {
    local component="$1"
    local status=$(get_component_status "$component")
    
    if [[ "$status" == running:* ]]; then
        local pid=$(echo "$status" | cut -d: -f2)
        local uptime=$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ')
        echo "$uptime"
    else
        echo "N/A"
    fi
}

# Get component resource usage
get_component_resources() {
    local component="$1"
    local status=$(get_component_status "$component")
    
    if [[ "$status" == running:* ]]; then
        local pid=$(echo "$status" | cut -d: -f2)
        local resources=$(ps -p "$pid" -o %cpu,%mem,vsz,rss --no-headers 2>/dev/null)
        echo "$resources"
    else
        echo "N/A N/A N/A N/A"
    fi
}

# Show detailed component status
show_detailed_status() {
    local components=("gpsmav" "hackrf" "wigletotak" "kismet" "openwebrx")
    
    printf "%-12s %-10s %-10s %-15s %-15s\n" "Component" "Status" "Uptime" "CPU/MEM%" "Memory(KB)"
    printf "%-12s %-10s %-10s %-15s %-15s\n" "==========" "======" "======" "=======" "=========="
    
    for component in "${components[@]}"; do
        local status=$(get_component_status "$component")
        local uptime=$(get_component_uptime "$component")
        local resources=$(get_component_resources "$component")
        
        local status_display=""
        if [[ "$status" == running:* ]]; then
            status_display="${GREEN}running${NC}"
        else
            status_display="${RED}stopped${NC}"
        fi
        
        local cpu=$(echo "$resources" | awk '{print $1}')
        local mem=$(echo "$resources" | awk '{print $2}')
        local vsz=$(echo "$resources" | awk '{print $3}')
        local rss=$(echo "$resources" | awk '{print $4}')
        
        printf "%-12s %-20s %-10s %-15s %-15s\n" \
            "$component" \
            "$status_display" \
            "$uptime" \
            "${cpu}/${mem}" \
            "${rss}"
    done
}

# Start component with advanced options
start_component_advanced() {
    local component="$1"
    local options="${2:-}"
    
    local script_path="${PROJECT_ROOT}/dev/components/${component}.sh"
    
    if [ ! -f "$script_path" ]; then
        error "Component script not found: $script_path"
        return 1
    fi
    
    # Check if already running
    local status=$(get_component_status "$component")
    if [[ "$status" == running:* ]]; then
        warn "Component $component is already running"
        return 0
    fi
    
    log "Starting component: $component"
    
    # Create component-specific environment
    local env_file="${PROJECT_ROOT}/dev/config/${component}.env"
    if [ -f "$env_file" ]; then
        source "$env_file"
        info "Loaded environment from $env_file"
    fi
    
    # Set development flags
    export DEV_MODE=1
    export LOG_LEVEL=DEBUG
    
    # Apply options
    case "$options" in
        debug)
            export LOG_LEVEL=DEBUG
            export FLASK_DEBUG=1
            ;;
        verbose)
            export LOG_LEVEL=DEBUG
            export VERBOSE=1
            ;;
        profile)
            export PROFILE=1
            ;;
    esac
    
    # Start with process monitoring
    local log_file="${LOG_DIR}/${component}.log"
    local pid_file="${PID_DIR}/${component}.pid"
    
    # Rotate log if it exists and is large
    if [ -f "$log_file" ] && [ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file") -gt 10485760 ]; then
        mv "$log_file" "${log_file}.old"
        info "Rotated large log file for $component"
    fi
    
    # Start component
    bash "$script_path" > "$log_file" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    
    # Wait and verify startup
    sleep 3
    if kill -0 $pid 2>/dev/null; then
        log "Component $component started successfully (PID: $pid)"
        
        # Show startup log
        info "Startup log:"
        tail -n 10 "$log_file" | sed 's/^/  /'
    else
        error "Component $component failed to start"
        if [ -f "$log_file" ]; then
            error "Error log:"
            tail -n 20 "$log_file" | sed 's/^/  /'
        fi
        rm -f "$pid_file"
        return 1
    fi
}

# Stop component gracefully
stop_component_graceful() {
    local component="$1"
    local timeout="${2:-10}"
    
    local pid_file="${PID_DIR}/${component}.pid"
    
    if [ ! -f "$pid_file" ]; then
        warn "Component $component is not running"
        return 0
    fi
    
    local pid=$(cat "$pid_file")
    if ! kill -0 "$pid" 2>/dev/null; then
        warn "Component $component has stale PID file"
        rm -f "$pid_file"
        return 0
    fi
    
    log "Stopping component: $component (PID: $pid)"
    
    # Try graceful shutdown first
    kill -TERM "$pid"
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt $timeout ] && kill -0 "$pid" 2>/dev/null; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        warn "Component $component didn't stop gracefully, force killing..."
        kill -KILL "$pid"
        sleep 1
    fi
    
    # Clean up
    rm -f "$pid_file"
    log "Component $component stopped"
}

# Restart component with zero downtime
restart_component_rolling() {
    local component="$1"
    local options="${2:-}"
    
    log "Rolling restart of component: $component"
    
    # For web components, we can do zero-downtime restart
    if [[ "$component" == "wigletotak" || "$component" == "hackrf" ]]; then
        # Start new instance first
        local temp_component="${component}-temp"
        
        # Modify script to use different port temporarily
        export TEMP_PORT_OFFSET=1000
        start_component_advanced "$temp_component" "$options"
        
        # Stop old instance
        stop_component_graceful "$component"
        
        # Move temp to main
        mv "${PID_DIR}/${temp_component}.pid" "${PID_DIR}/${component}.pid"
        mv "${LOG_DIR}/${temp_component}.log" "${LOG_DIR}/${component}.log"
        
        log "Rolling restart completed for $component"
    else
        # Regular restart for other components
        stop_component_graceful "$component"
        sleep 2
        start_component_advanced "$component" "$options"
    fi
}

# Monitor component health
monitor_component() {
    local component="$1"
    local duration="${2:-60}"
    
    log "Monitoring component: $component for ${duration}s"
    
    local end_time=$(($(date +%s) + duration))
    
    while [ $(date +%s) -lt $end_time ]; do
        local status=$(get_component_status "$component")
        local uptime=$(get_component_uptime "$component")
        local resources=$(get_component_resources "$component")
        
        printf "\r[%s] Status: %-10s Uptime: %-10s Resources: %s" \
            "$(date +%H:%M:%S)" \
            "$status" \
            "$uptime" \
            "$resources"
        
        sleep 5
    done
    
    echo
    log "Monitoring completed"
}

# Show component logs with filtering
show_logs_filtered() {
    local component="$1"
    local filter="${2:-}"
    local lines="${3:-50}"
    
    local log_file="${LOG_DIR}/${component}.log"
    
    if [ ! -f "$log_file" ]; then
        error "Log file not found: $log_file"
        return 1
    fi
    
    log "Showing logs for $component (last $lines lines)"
    
    if [ -n "$filter" ]; then
        tail -n "$lines" "$log_file" | grep -i "$filter" --color=always
    else
        tail -n "$lines" "$log_file"
    fi
}

# Performance analysis
analyze_performance() {
    local component="$1"
    local duration="${2:-60}"
    
    log "Analyzing performance for $component (${duration}s)"
    
    local status=$(get_component_status "$component")
    if [[ "$status" != running:* ]]; then
        error "Component $component is not running"
        return 1
    fi
    
    local pid=$(echo "$status" | cut -d: -f2)
    local output_file="${LOG_DIR}/${component}-perf-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Performance Analysis for $component"
        echo "PID: $pid"
        echo "Duration: ${duration}s"
        echo "Started: $(date)"
        echo "================================"
        echo
        
        # Initial snapshot
        echo "Initial Resource Usage:"
        ps -p "$pid" -o pid,ppid,pcpu,pmem,vsz,rss,etime,cmd
        echo
        
        # Monitor for specified duration
        local count=0
        local interval=5
        local samples=$((duration / interval))
        
        echo "Resource Usage Over Time:"
        printf "%-10s %-8s %-8s %-12s %-12s\n" "Time" "CPU%" "MEM%" "VSZ(KB)" "RSS(KB)"
        printf "%-10s %-8s %-8s %-12s %-12s\n" "=====" "====" "====" "======" "======"
        
        while [ $count -lt $samples ]; do
            local timestamp=$(date +%H:%M:%S)
            local resources=$(ps -p "$pid" -o %cpu,%mem,vsz,rss --no-headers 2>/dev/null || echo "N/A N/A N/A N/A")
            
            printf "%-10s %s\n" "$timestamp" "$resources"
            
            sleep $interval
            count=$((count + 1))
        done
        
        echo
        echo "Final Resource Usage:"
        ps -p "$pid" -o pid,ppid,pcpu,pmem,vsz,rss,etime,cmd
        
    } > "$output_file"
    
    log "Performance analysis saved to: $output_file"
}

# Help function
show_help() {
    cat << EOF
Component Manager for Stinkster Development

Usage: $0 <command> [component] [options]

Commands:
    status [component]          Show component status
    start <component> [debug|verbose|profile]  Start component with options
    stop <component> [timeout] Stop component (default timeout: 10s)
    restart <component> [options] Restart component
    rolling-restart <component> Zero-downtime restart
    monitor <component> [duration] Monitor component health
    logs <component> [filter] [lines] Show filtered logs
    performance <component> [duration] Analyze performance
    list                        List all available components
    help                        Show this help

Components:
    gpsmav              GPS MAVLink bridge
    hackrf              HackRF spectrum analyzer
    wigletotak          WiFi to TAK converter
    kismet              WiFi scanner
    openwebrx           Web SDR interface

Options:
    debug               Enable debug logging
    verbose             Enable verbose output
    profile             Enable performance profiling

Examples:
    $0 status                           # Show all component status
    $0 start wigletotak debug           # Start WigleToTAK with debug logging
    $0 logs kismet error                # Show Kismet logs filtered for errors
    $0 monitor hackrf 120               # Monitor HackRF for 2 minutes
    $0 performance wigletotak 300       # Analyze WigleToTAK performance for 5 minutes

EOF
}

# Main function
main() {
    case "${1:-help}" in
        status)
            if [ -n "${2:-}" ]; then
                local component="$2"
                log "Status for component: $component"
                get_component_status "$component"
            else
                show_detailed_status
            fi
            ;;
        start)
            if [ -z "${2:-}" ]; then
                error "Component name required"
                exit 1
            fi
            start_component_advanced "$2" "${3:-}"
            ;;
        stop)
            if [ -z "${2:-}" ]; then
                error "Component name required"
                exit 1
            fi
            stop_component_graceful "$2" "${3:-10}"
            ;;
        restart)
            if [ -z "${2:-}" ]; then
                error "Component name required"
                exit 1
            fi
            stop_component_graceful "$2"
            sleep 2
            start_component_advanced "$2" "${3:-}"
            ;;
        rolling-restart)
            if [ -z "${2:-}" ]; then
                error "Component name required"
                exit 1
            fi
            restart_component_rolling "$2" "${3:-}"
            ;;
        monitor)
            if [ -z "${2:-}" ]; then
                error "Component name required"
                exit 1
            fi
            monitor_component "$2" "${3:-60}"
            ;;
        logs)
            if [ -z "${2:-}" ]; then
                error "Component name required"
                exit 1
            fi
            show_logs_filtered "$2" "${3:-}" "${4:-50}"
            ;;
        performance)
            if [ -z "${2:-}" ]; then
                error "Component name required"
                exit 1
            fi
            analyze_performance "$2" "${3:-60}"
            ;;
        list)
            log "Available components:"
            echo "  - gpsmav (GPS MAVLink bridge)"
            echo "  - hackrf (HackRF spectrum analyzer)"
            echo "  - wigletotak (WiFi to TAK converter)"
            echo "  - kismet (WiFi scanner)"
            echo "  - openwebrx (Web SDR interface)"
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

main "$@"
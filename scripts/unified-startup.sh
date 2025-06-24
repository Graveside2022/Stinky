#!/bin/bash
# Unified Startup Script for Stinkster System
# Manages all Node.js backends and coordinates with frontends

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NODEJS_DIR="$PROJECT_ROOT/src/nodejs"
LOG_DIR="/home/pi/tmp"
PID_DIR="/home/pi/tmp"

# Ensure log and PID directories exist
mkdir -p "$LOG_DIR" "$PID_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to check if a service is running
is_running() {
    local pid_file="$1"
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Function to start a Node.js service
start_service() {
    local service_name="$1"
    local service_dir="$2"
    local start_script="$3"
    local port="$4"
    local pid_file="$PID_DIR/${service_name}.pid"
    local log_file="$LOG_DIR/${service_name}.log"
    
    if is_running "$pid_file"; then
        warning "$service_name is already running (PID: $(cat "$pid_file"))"
        return 0
    fi
    
    log "Starting $service_name on port $port..."
    
    cd "$service_dir"
    
    # Set environment variables
    export NODE_ENV=production
    export PORT="$port"
    
    # Start the service
    if [ -f "$start_script" ]; then
        # Use the start script if it exists
        nohup bash "$start_script" > "$log_file" 2>&1 &
    else
        # Direct node execution
        nohup node server.js > "$log_file" 2>&1 &
    fi
    
    local pid=$!
    echo "$pid" > "$pid_file"
    
    # Wait for service to start
    sleep 2
    
    if is_running "$pid_file"; then
        log "$service_name started successfully (PID: $pid)"
        return 0
    else
        error "Failed to start $service_name"
        rm -f "$pid_file"
        return 1
    fi
}

# Function to stop a service
stop_service() {
    local service_name="$1"
    local pid_file="$PID_DIR/${service_name}.pid"
    
    if ! is_running "$pid_file"; then
        log "$service_name is not running"
        return 0
    fi
    
    local pid=$(cat "$pid_file")
    log "Stopping $service_name (PID: $pid)..."
    
    kill -TERM "$pid" 2>/dev/null || true
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt 10 ] && kill -0 "$pid" 2>/dev/null; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        warning "Force killing $service_name"
        kill -9 "$pid" 2>/dev/null || true
    fi
    
    rm -f "$pid_file"
    log "$service_name stopped"
}

# Function to check service health
check_health() {
    local service_name="$1"
    local port="$2"
    local endpoint="${3:-/api/health}"
    
    if curl -sf "http://localhost:$port$endpoint" > /dev/null; then
        log "$service_name health check passed"
        return 0
    else
        warning "$service_name health check failed"
        return 1
    fi
}

# Main execution
case "${1:-start}" in
    start)
        log "Starting Stinkster System..."
        
        # Start GPS Bridge first (provides GPS data to other services)
        start_service "gps-bridge" "$NODEJS_DIR/gps-bridge" "" 2947
        
        # Start Spectrum Analyzer (HackRF)
        start_service "spectrum-analyzer" "$NODEJS_DIR/kismet-operations" "start-optimized.sh" 8092
        
        # Start WigleToTAK
        start_service "wigle-to-tak" "$NODEJS_DIR/wigle-to-tak" "start-optimized.sh" 8000
        
        # Start Kismet Operations Center
        start_service "kismet-operations" "$NODEJS_DIR/kismet-operations" "" 8003
        
        # Wait for services to stabilize
        sleep 5
        
        # Health checks
        log "Performing health checks..."
        check_health "spectrum-analyzer" 8092 "/api/status"
        check_health "wigle-to-tak" 8000 "/api/status"
        check_health "kismet-operations" 8003 "/api/system/status"
        
        log "Stinkster System startup complete"
        ;;
        
    stop)
        log "Stopping Stinkster System..."
        
        # Stop services in reverse order
        stop_service "kismet-operations"
        stop_service "wigle-to-tak"
        stop_service "spectrum-analyzer"
        stop_service "gps-bridge"
        
        log "Stinkster System stopped"
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        log "Stinkster System Status:"
        echo "========================"
        
        for service in gps-bridge spectrum-analyzer wigle-to-tak kismet-operations; do
            pid_file="$PID_DIR/${service}.pid"
            if is_running "$pid_file"; then
                echo -e "$service: ${GREEN}Running${NC} (PID: $(cat "$pid_file"))"
            else
                echo -e "$service: ${RED}Stopped${NC}"
            fi
        done
        
        echo "========================"
        ;;
        
    health)
        log "Checking service health..."
        
        check_health "spectrum-analyzer" 8092 "/api/status"
        check_health "wigle-to-tak" 8000 "/api/status"
        check_health "kismet-operations" 8003 "/api/system/status"
        ;;
        
    logs)
        service="${2:-all}"
        
        if [ "$service" = "all" ]; then
            tail -f "$LOG_DIR"/*.log
        else
            tail -f "$LOG_DIR/${service}.log"
        fi
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|health|logs [service]}"
        exit 1
        ;;
esac

exit 0
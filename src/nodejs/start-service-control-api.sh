#!/bin/bash

# Stinkster Service Control API Startup Script
# 
# This script starts the Service Control API server with proper environment setup

set -e

# Configuration
API_PORT="${API_PORT:-8080}"
NODE_ENV="${NODE_ENV:-production}"
LOG_FILE="/home/pi/tmp/service-control-api.log"
PID_FILE="/home/pi/tmp/service-control-api.pid"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_SCRIPT="$SCRIPT_DIR/service-control-api.js"

# Ensure script exists
if [ ! -f "$API_SCRIPT" ]; then
    echo "ERROR: API script not found at $API_SCRIPT"
    exit 1
fi

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if API is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Running
        else
            rm -f "$PID_FILE"
            return 1  # Not running
        fi
    fi
    return 1  # Not running
}

# Function to stop existing API
stop_api() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        log "Stopping existing API (PID: $pid)..."
        
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                log "Forcing kill of API process..."
                kill -KILL "$pid" 2>/dev/null || true
            fi
        fi
        
        rm -f "$PID_FILE"
        log "API stopped"
    fi
}

# Function to start API
start_api() {
    log "Starting Stinkster Service Control API..."
    log "Port: $API_PORT"
    log "Environment: $NODE_ENV"
    log "Log file: $LOG_FILE"
    
    # Export environment variables
    export NODE_ENV="$NODE_ENV"
    export API_PORT="$API_PORT"
    
    # Start the API in background
    cd "$SCRIPT_DIR"
    nohup node "$API_SCRIPT" --port="$API_PORT" >> "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    log "API started with PID: $pid"
    
    # Wait a moment to check if it started successfully
    sleep 3
    
    if ps -p "$pid" > /dev/null 2>&1; then
        log "API startup successful"
        
        # Test the health endpoint
        if command -v curl > /dev/null 2>&1; then
            local health_url="http://localhost:$API_PORT/health"
            log "Testing health endpoint: $health_url"
            
            for i in {1..10}; do
                if curl -s -f "$health_url" > /dev/null 2>&1; then
                    log "Health check passed - API is responding"
                    break
                elif [ $i -eq 10 ]; then
                    log "WARNING: Health check failed after 10 attempts"
                else
                    sleep 1
                fi
            done
        fi
        
        return 0
    else
        log "ERROR: API failed to start"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to show status
show_status() {
    if check_running; then
        local pid=$(cat "$PID_FILE")
        log "API is running (PID: $pid)"
        
        # Show process info
        ps -p "$pid" -o pid,ppid,cmd --no-headers 2>/dev/null || true
        
        # Test connectivity
        if command -v curl > /dev/null 2>&1; then
            local health_url="http://localhost:$API_PORT/health"
            if curl -s -f "$health_url" > /dev/null 2>&1; then
                log "API is responding to requests"
            else
                log "WARNING: API process exists but not responding"
            fi
        fi
    else
        log "API is not running"
    fi
}

# Function to show usage
show_usage() {
    cat << EOF
Stinkster Service Control API Management Script

Usage: $0 {start|stop|restart|status|logs}

Commands:
  start     - Start the API server
  stop      - Stop the API server
  restart   - Restart the API server
  status    - Show API server status
  logs      - Show recent API logs

Environment Variables:
  API_PORT  - Port for API server (default: 8080)
  NODE_ENV  - Node.js environment (default: production)

Examples:
  $0 start
  API_PORT=8081 $0 start
  $0 status
  $0 logs

EOF
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Parse command
case "${1:-}" in
    start)
        if check_running; then
            log "API is already running"
            show_status
            exit 0
        fi
        
        start_api
        ;;
        
    stop)
        if ! check_running; then
            log "API is not running"
            exit 0
        fi
        
        stop_api
        ;;
        
    restart)
        log "Restarting API..."
        stop_api
        sleep 2
        start_api
        ;;
        
    status)
        show_status
        ;;
        
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            log "No log file found at $LOG_FILE"
            exit 1
        fi
        ;;
        
    test)
        # Hidden test command
        if check_running; then
            log "Running API tests..."
            node "$SCRIPT_DIR/test-service-control-api.js" --url="http://localhost:$API_PORT"
        else
            log "API is not running. Start it first with: $0 start"
            exit 1
        fi
        ;;
        
    *)
        show_usage
        exit 1
        ;;
esac
#!/bin/bash
# Kismet Operations Center Restart Script
# Alternative to PM2 for process management

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="/home/pi/tmp/kismet-operations-center.pid"
LOG_FILE="/home/pi/tmp/kismet-operations-center.log"
NODE_APP="server.js"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Kismet Operations Center - Process Management${NC}"
echo "============================================"

# Function to get the current process PID
get_pid() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "$pid"
            return 0
        fi
    fi
    
    # Fallback: search for the process
    local pid=$(ps aux | grep -E "node.*$NODE_APP" | grep -v grep | awk '{print $2}' | head -1)
    echo "$pid"
}

# Function to stop the service
stop_service() {
    local pid=$(get_pid)
    
    if [ -z "$pid" ]; then
        echo -e "${YELLOW}Service is not running${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Stopping service (PID: $pid)...${NC}"
    
    # Try graceful shutdown first
    kill -SIGTERM "$pid" 2>/dev/null
    
    # Wait for process to stop (max 10 seconds)
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${YELLOW}Force stopping service...${NC}"
        kill -SIGKILL "$pid" 2>/dev/null
        sleep 1
    fi
    
    # Clean up PID file
    rm -f "$PID_FILE"
    
    echo -e "${GREEN}Service stopped${NC}"
}

# Function to start the service
start_service() {
    local pid=$(get_pid)
    
    if [ ! -z "$pid" ]; then
        echo -e "${RED}Service is already running (PID: $pid)${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Starting service...${NC}"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Change to application directory
    cd "$SCRIPT_DIR" || exit 1
    
    # Start the Node.js application
    nohup node "$NODE_APP" >> "$LOG_FILE" 2>&1 &
    local new_pid=$!
    
    # Save PID
    echo "$new_pid" > "$PID_FILE"
    
    # Wait a moment to ensure it started successfully
    sleep 2
    
    if ps -p "$new_pid" > /dev/null 2>&1; then
        echo -e "${GREEN}Service started successfully (PID: $new_pid)${NC}"
        echo -e "Log file: ${LOG_FILE}"
        return 0
    else
        echo -e "${RED}Failed to start service${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to check service status
check_status() {
    local pid=$(get_pid)
    
    if [ -z "$pid" ]; then
        echo -e "${RED}Service is not running${NC}"
        return 1
    else
        echo -e "${GREEN}Service is running (PID: $pid)${NC}"
        
        # Show memory and CPU usage
        ps -p "$pid" -o pid,vsz,rss,pcpu,comm --no-headers
        
        # Show recent logs
        echo -e "\n${YELLOW}Recent logs:${NC}"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "No logs available"
        
        return 0
    fi
}

# Function to restart the service
restart_service() {
    echo -e "${YELLOW}Restarting service...${NC}"
    stop_service
    sleep 2
    start_service
}

# Main script logic
case "${1:-restart}" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        check_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo "  start   - Start the service"
        echo "  stop    - Stop the service"
        echo "  restart - Restart the service (default)"
        echo "  status  - Check service status"
        exit 1
        ;;
esac

exit $?
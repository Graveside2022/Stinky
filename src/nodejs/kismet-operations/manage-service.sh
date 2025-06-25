#!/bin/bash
# Comprehensive Service Management for Kismet Operations Center
# Provides PM2-like functionality without requiring PM2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="kismet-operations-center"
SYSTEMD_SERVICE="${SERVICE_NAME}.service"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Display header
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Kismet Operations Center Manager     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo

# Function to check if systemd is available
check_systemd() {
    if command -v systemctl >/dev/null 2>&1 && systemctl --version >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Function to check if running as systemd service
is_systemd_service() {
    if check_systemd && systemctl is-active --quiet "$SYSTEMD_SERVICE" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Display current management mode
if is_systemd_service; then
    echo -e "${GREEN}● Running as systemd service${NC}"
else
    echo -e "${YELLOW}● Running in standalone mode${NC}"
fi
echo

# Main menu
case "${1:-help}" in
    install-systemd)
        if ! check_systemd; then
            echo -e "${RED}Systemd is not available on this system${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}Installing systemd service...${NC}"
        
        # Copy service file
        sudo cp "$SCRIPT_DIR/../../../systemd/${SYSTEMD_SERVICE}" "/etc/systemd/system/"
        
        # Reload systemd
        sudo systemctl daemon-reload
        
        # Enable service
        sudo systemctl enable "$SYSTEMD_SERVICE"
        
        echo -e "${GREEN}Systemd service installed successfully${NC}"
        echo -e "Start with: ${BLUE}sudo systemctl start ${SYSTEMD_SERVICE}${NC}"
        ;;
        
    uninstall-systemd)
        if ! check_systemd; then
            echo -e "${RED}Systemd is not available on this system${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}Uninstalling systemd service...${NC}"
        
        # Stop and disable service
        sudo systemctl stop "$SYSTEMD_SERVICE" 2>/dev/null
        sudo systemctl disable "$SYSTEMD_SERVICE" 2>/dev/null
        
        # Remove service file
        sudo rm -f "/etc/systemd/system/${SYSTEMD_SERVICE}"
        
        # Reload systemd
        sudo systemctl daemon-reload
        
        echo -e "${GREEN}Systemd service uninstalled${NC}"
        ;;
        
    start)
        if is_systemd_service; then
            echo -e "${YELLOW}Service is managed by systemd${NC}"
            echo -e "Use: ${BLUE}sudo systemctl start ${SYSTEMD_SERVICE}${NC}"
        else
            "$SCRIPT_DIR/restart-service.sh" start
        fi
        ;;
        
    stop)
        if is_systemd_service; then
            echo -e "${YELLOW}Service is managed by systemd${NC}"
            echo -e "Use: ${BLUE}sudo systemctl stop ${SYSTEMD_SERVICE}${NC}"
        else
            "$SCRIPT_DIR/restart-service.sh" stop
        fi
        ;;
        
    restart)
        if is_systemd_service; then
            echo -e "${YELLOW}Restarting systemd service...${NC}"
            sudo systemctl restart "$SYSTEMD_SERVICE"
            echo -e "${GREEN}Service restarted${NC}"
        else
            "$SCRIPT_DIR/restart-service.sh" restart
        fi
        ;;
        
    status)
        if is_systemd_service; then
            sudo systemctl status "$SYSTEMD_SERVICE"
        else
            "$SCRIPT_DIR/restart-service.sh" status
        fi
        ;;
        
    logs)
        if is_systemd_service; then
            echo -e "${YELLOW}Showing systemd logs...${NC}"
            sudo journalctl -u "$SYSTEMD_SERVICE" -f
        else
            LOG_FILE="/home/pi/tmp/kismet-operations-center.log"
            if [ -f "$LOG_FILE" ]; then
                tail -f "$LOG_FILE"
            else
                echo -e "${RED}No log file found${NC}"
            fi
        fi
        ;;
        
    monitor)
        if is_systemd_service; then
            echo -e "${YELLOW}Service is managed by systemd (auto-restart enabled)${NC}"
        else
            echo -e "${YELLOW}Starting process monitor...${NC}"
            nohup "$SCRIPT_DIR/process-monitor.sh" >/dev/null 2>&1 &
            echo -e "${GREEN}Monitor started${NC}"
        fi
        ;;
        
    monitor-stop)
        MONITOR_PID_FILE="/home/pi/tmp/kismet-operations-monitor.pid"
        if [ -f "$MONITOR_PID_FILE" ]; then
            pid=$(cat "$MONITOR_PID_FILE")
            if ps -p "$pid" > /dev/null 2>&1; then
                kill "$pid"
                echo -e "${GREEN}Monitor stopped${NC}"
            else
                echo -e "${YELLOW}Monitor not running${NC}"
            fi
            rm -f "$MONITOR_PID_FILE"
        else
            echo -e "${YELLOW}Monitor not running${NC}"
        fi
        ;;
        
    help|*)
        echo "Usage: $0 {command}"
        echo
        echo "Service Commands:"
        echo "  start              - Start the service"
        echo "  stop               - Stop the service"
        echo "  restart            - Restart the service"
        echo "  status             - Show service status"
        echo "  logs               - Show service logs (tail -f)"
        echo
        echo "Process Monitoring:"
        echo "  monitor            - Start process monitor (auto-restart)"
        echo "  monitor-stop       - Stop process monitor"
        echo
        echo "Systemd Integration:"
        echo "  install-systemd    - Install as systemd service"
        echo "  uninstall-systemd  - Remove systemd service"
        echo
        echo "Examples:"
        echo "  $0 restart         - Quick restart"
        echo "  $0 logs            - View live logs"
        echo "  $0 monitor         - Enable auto-restart"
        ;;
esac
#!/bin/bash
# Stinkster Integration Monitoring Script
# Provides real-time status of all system components during integration phases

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if a service is running
check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✓${NC} $service"
    else
        echo -e "${RED}✗${NC} $service"
    fi
}

# Check if a port is listening
check_port() {
    local port=$1
    local name=$2
    if netstat -tln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} Port $port ($name)"
    else
        echo -e "${RED}✗${NC} Port $port ($name)"
    fi
}

# Check if a process is running
check_process() {
    local process=$1
    local name=$2
    if pgrep -f "$process" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
    else
        echo -e "${RED}✗${NC} $name"
    fi
}

# Check GPS status
check_gps() {
    if gpspipe -w -n 1 2>/dev/null | grep -q "TPV"; then
        local lat=$(gpspipe -w -n 1 2>/dev/null | grep TPV | jq -r .lat 2>/dev/null | head -1)
        local lon=$(gpspipe -w -n 1 2>/dev/null | grep TPV | jq -r .lon 2>/dev/null | head -1)
        echo -e "${GREEN}✓${NC} GPS (lat: $lat, lon: $lon)"
    else
        echo -e "${RED}✗${NC} GPS (no fix)"
    fi
}

# Check data files
check_data_files() {
    local wigle_count=$(find /home/pi/WigletoTAK/data -name "*.wiglecsv" -mmin -5 2>/dev/null | wc -l)
    if [ "$wigle_count" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Wigle data files (recent: $wigle_count)"
    else
        echo -e "${YELLOW}⚠${NC} Wigle data files (no recent files)"
    fi
}

# Check API endpoints
check_api() {
    local url=$1
    local name=$2
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} API: $name"
    else
        echo -e "${RED}✗${NC} API: $name"
    fi
}

# Main monitoring loop
while true; do
    clear
    echo "==================================="
    echo "   Stinkster Integration Monitor   "
    echo "==================================="
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    echo "PHASE 1: Core Services"
    echo "----------------------"
    check_service "gpsd"
    check_process "mavgps" "GPS Bridge (mavgps.py)"
    check_process "kismet" "Kismet WiFi Scanner"
    check_gps
    check_data_files
    echo ""
    
    echo "PHASE 2: Backend Services"
    echo "------------------------"
    check_port 8001 "Unified Backend"
    check_port 8002 "Kismet Operations"
    check_port 8092 "Spectrum Analyzer"
    check_process "node.*8001" "Node.js Backend"
    echo ""
    
    echo "PHASE 3: Web Services"
    echo "--------------------"
    check_service "nginx"
    check_api "http://localhost/api/wigle/status" "WigleToTAK"
    check_api "http://localhost/api/hackrf/status" "HackRF"
    check_api "http://localhost:8002/" "Kismet Ops"
    echo ""
    
    echo "System Resources"
    echo "---------------"
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
    echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
    echo ""
    
    echo "Recent Errors (last 5 min)"
    echo "-------------------------"
    journalctl --since "5 minutes ago" -p err --no-pager | tail -5
    
    echo ""
    echo "Press Ctrl+C to exit"
    sleep 10
done
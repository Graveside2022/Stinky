#!/bin/bash

# Monitoring Setup Script for Kismet Operations Fix
# This script sets up comprehensive monitoring for all services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/home/pi/projects/stinkster_malone/stinkster"
LOG_DIR="/home/pi/tmp"
KISMET_DATA_DIR="${PROJECT_ROOT}/data/kismet"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Kismet Operations Monitoring Setup"
echo "=================================="
echo ""

# Function to check service health
check_service_health() {
    local service_name="$1"
    local expected_port="$2"
    
    echo "Checking $service_name..."
    
    # Check systemd service status
    if systemctl is-active --quiet "$service_name"; then
        echo -e "  ${GREEN}✓${NC} Service is active"
    else
        echo -e "  ${RED}✗${NC} Service is not active"
        return 1
    fi
    
    # Check if port is listening (if port provided)
    if [ -n "$expected_port" ]; then
        if ss -tln | grep -q ":$expected_port "; then
            echo -e "  ${GREEN}✓${NC} Port $expected_port is listening"
        else
            echo -e "  ${YELLOW}⚠${NC} Port $expected_port is not listening"
        fi
    fi
    
    return 0
}

# Function to check process health
check_process_health() {
    local process_name="$1"
    local pid_file="$2"
    
    echo "Checking $process_name process..."
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Process running (PID: $pid)"
            return 0
        else
            echo -e "  ${RED}✗${NC} Process not running (stale PID: $pid)"
            return 1
        fi
    else
        # Try to find process without PID file
        if pgrep -f "$process_name" > /dev/null; then
            local pid=$(pgrep -f "$process_name" | head -1)
            echo -e "  ${YELLOW}⚠${NC} Process running (PID: $pid) but no PID file"
            return 0
        else
            echo -e "  ${RED}✗${NC} Process not running"
            return 1
        fi
    fi
}

# Function to check log file activity
check_log_activity() {
    local log_file="$1"
    local max_age_minutes="$2"
    
    if [ -f "$log_file" ]; then
        local last_modified=$(stat -c %Y "$log_file")
        local current_time=$(date +%s)
        local age_seconds=$((current_time - last_modified))
        local age_minutes=$((age_seconds / 60))
        
        if [ "$age_minutes" -lt "$max_age_minutes" ]; then
            echo -e "  ${GREEN}✓${NC} Log active (updated ${age_minutes}m ago)"
            return 0
        else
            echo -e "  ${YELLOW}⚠${NC} Log stale (updated ${age_minutes}m ago)"
            return 1
        fi
    else
        echo -e "  ${RED}✗${NC} Log file not found"
        return 1
    fi
}

# Function to check endpoint health
check_endpoint_health() {
    local endpoint="$1"
    local expected_status="$2"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓${NC} Endpoint returned $response"
        return 0
    else
        echo -e "  ${RED}✗${NC} Endpoint returned $response (expected $expected_status)"
        return 1
    fi
}

echo "1. Service Health Checks"
echo "------------------------"

# Check Kismet Operations Center
check_service_health "kismet-operations-center" "8000"

# Check GPS service
check_service_health "gpsd" "2947"

echo ""
echo "2. Process Health Checks"
echo "------------------------"

# Check orchestration script
check_process_health "gps_kismet_wigle.sh" "${LOG_DIR}/gps_kismet_wigle.pids"

# Check Kismet
if [ -f "${LOG_DIR}/gps_kismet_wigle.pids" ]; then
    kismet_pid=$(grep "KISMET_PID=" "${LOG_DIR}/gps_kismet_wigle.pids" 2>/dev/null | cut -d= -f2)
    if [ -n "$kismet_pid" ] && kill -0 "$kismet_pid" 2>/dev/null; then
        echo -e "Checking Kismet process...\n  ${GREEN}✓${NC} Process running (PID: $kismet_pid)"
    else
        check_process_health "kismet" ""
    fi
else
    check_process_health "kismet" ""
fi

# Check WigleToTAK
if [ -f "${LOG_DIR}/gps_kismet_wigle.pids" ]; then
    wigle_pid=$(grep "WIGLE_PID=" "${LOG_DIR}/gps_kismet_wigle.pids" 2>/dev/null | cut -d= -f2)
    if [ -n "$wigle_pid" ] && kill -0 "$wigle_pid" 2>/dev/null; then
        echo -e "Checking WigleToTak2.py process...\n  ${GREEN}✓${NC} Process running (PID: $wigle_pid)"
    else
        check_process_health "WigleToTak2.py" ""
    fi
else
    check_process_health "WigleToTak2.py" ""
fi

echo ""
echo "3. Log File Activity"
echo "--------------------"

# Check main orchestration log
echo "Checking orchestration log..."
check_log_activity "${LOG_DIR}/gps_kismet_wigle.log" 5

# Check Kismet log
echo "Checking Kismet log..."
check_log_activity "${KISMET_DATA_DIR}/kismet_debug.log" 10

# Check WigleToTAK log
echo "Checking WigleToTAK log..."
check_log_activity "${LOG_DIR}/wigletotak.log" 10

echo ""
echo "4. API Endpoint Health"
echo "----------------------"

# Check Kismet Operations Center
echo "Checking Kismet Operations Center..."
check_endpoint_health "http://localhost:8000/api/health" "200"

# Check button functionality endpoints
echo "Checking script control endpoints..."
check_endpoint_health "http://localhost:8000/api/start-script" "405"  # Should return 405 for GET
check_endpoint_health "http://localhost:8000/api/stop-script" "405"   # Should return 405 for GET

# Check Kismet proxy
echo "Checking Kismet proxy..."
check_endpoint_health "http://localhost:8000/kismet/" "200"

echo ""
echo "5. Key Performance Indicators"
echo "-----------------------------"

# Check GPS fix status
echo "GPS Status:"
if command -v gpspipe &> /dev/null; then
    if timeout 2 gpspipe -w -n 1 2>/dev/null | grep -q "TPV"; then
        echo -e "  ${GREEN}✓${NC} GPS has fix"
    else
        echo -e "  ${YELLOW}⚠${NC} GPS no fix or not responding"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} gpspipe not available"
fi

# Check WiFi interface status
echo ""
echo "WiFi Interface Status:"
if ip link show wlan2 &>/dev/null; then
    mode=$(iw dev wlan2 info 2>/dev/null | grep type | awk '{print $2}')
    if [ "$mode" = "monitor" ]; then
        echo -e "  ${GREEN}✓${NC} wlan2 in monitor mode"
    else
        echo -e "  ${YELLOW}⚠${NC} wlan2 in $mode mode (expected monitor)"
    fi
else
    echo -e "  ${RED}✗${NC} wlan2 interface not found"
fi

# Check for recent Kismet data
echo ""
echo "Kismet Data Collection:"
recent_files=$(find "${KISMET_DATA_DIR}" -name "*.wiglecsv" -mmin -10 2>/dev/null | wc -l)
if [ "$recent_files" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Found $recent_files recent WigleCSV files"
else
    echo -e "  ${YELLOW}⚠${NC} No recent WigleCSV files (last 10 minutes)"
fi

echo ""
echo "6. Alert Thresholds"
echo "-------------------"
echo "The following conditions should trigger alerts:"
echo "  • Any service marked as inactive"
echo "  • Process not running when expected"
echo "  • Log files not updated for >10 minutes"
echo "  • API endpoints returning unexpected status codes"
echo "  • GPS no fix for >5 minutes"
echo "  • WiFi interface not in monitor mode"
echo "  • No new Kismet data files for >15 minutes"

echo ""
echo "7. Automated Monitoring Setup"
echo "-----------------------------"
echo "To set up automated monitoring, create a cron job:"
echo "  */5 * * * * $SCRIPT_DIR/monitoring_setup.sh > /tmp/kismet_ops_monitor.log 2>&1"
echo ""
echo "Or create a systemd timer for more control."

# Create a simple status file for external monitoring
STATUS_FILE="${SCRIPT_DIR}/monitoring_status.json"
cat > "$STATUS_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "services": {
    "kismet-operations-center": $(systemctl is-active --quiet kismet-operations-center && echo "true" || echo "false"),
    "gpsd": $(systemctl is-active --quiet gpsd && echo "true" || echo "false")
  },
  "processes": {
    "orchestration": $(pgrep -f "gps_kismet_wigle.sh" > /dev/null && echo "true" || echo "false"),
    "kismet": $(pgrep -f "kismet" > /dev/null && echo "true" || echo "false"),
    "wigletotak": $(pgrep -f "WigleToTak2.py" > /dev/null && echo "true" || echo "false")
  },
  "endpoints": {
    "operations_center": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/api/health" 2>/dev/null | grep -q "200" && echo "true" || echo "false"),
    "kismet_proxy": $(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/kismet/" 2>/dev/null | grep -q "200" && echo "true" || echo "false")
  }
}
EOF

echo ""
echo "Monitoring status saved to: $STATUS_FILE"
echo ""
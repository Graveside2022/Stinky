#!/bin/bash
# HackRF Spectrum Analyzer Health Check and Monitoring Script
# Monitors service health, performance metrics, and OpenWebRX connectivity

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVICE_NAME="hackrf-spectrum"
API_URL="http://localhost:8092"
OPENWEBRX_URL="http://localhost:8073"
LOG_DIR="/var/log/hackrf-spectrum"
METRICS_FILE="$LOG_DIR/metrics.json"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=80
ALERT_THRESHOLD_BUFFER=900

# Check mode
CHECK_MODE="${1:-status}"  # status, monitor, alert, metrics

# Logging
log() {
    echo -e "$1"
}

# Check service status
check_service() {
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "${GREEN}✓ Service is running${NC}"
        return 0
    else
        log "${RED}✗ Service is not running${NC}"
        return 1
    fi
}

# Check API health
check_api() {
    if curl -sf "$API_URL/api/hackrf/status" > /dev/null 2>&1; then
        local status=$(curl -s "$API_URL/api/hackrf/status")
        local connected=$(echo "$status" | jq -r '.connected')
        
        if [ "$connected" == "true" ]; then
            log "${GREEN}✓ API is healthy and connected to OpenWebRX${NC}"
        else
            log "${YELLOW}⚠ API is running but not connected to OpenWebRX${NC}"
        fi
        return 0
    else
        log "${RED}✗ API is not responding${NC}"
        return 1
    fi
}

# Check OpenWebRX connectivity
check_openwebrx() {
    if curl -sf "$OPENWEBRX_URL" > /dev/null 2>&1; then
        log "${GREEN}✓ OpenWebRX is accessible${NC}"
        return 0
    else
        log "${RED}✗ OpenWebRX is not accessible${NC}"
        return 1
    fi
}

# Check performance metrics
check_performance() {
    local status=$(curl -s "$API_URL/api/hackrf/status" 2>/dev/null || echo '{}')
    local buffer_size=$(echo "$status" | jq -r '.buffer_size // 0')
    local last_update=$(echo "$status" | jq -r '.last_update // 0')
    
    if [ "$buffer_size" -gt "$ALERT_THRESHOLD_BUFFER" ]; then
        log "${YELLOW}⚠ Buffer size high: $buffer_size (threshold: $ALERT_THRESHOLD_BUFFER)${NC}"
    else
        log "${GREEN}✓ Buffer size normal: $buffer_size${NC}"
    fi
    
    # Check data freshness
    if [ "$last_update" != "0" ] && [ "$last_update" != "null" ]; then
        local now=$(date +%s%3N)
        local age=$((now - last_update))
        
        if [ "$age" -lt 5000 ]; then
            log "${GREEN}✓ Data is fresh (${age}ms old)${NC}"
        else
            log "${YELLOW}⚠ Data is stale (${age}ms old)${NC}"
        fi
    fi
}

# Check resource usage
check_resources() {
    local pid=$(systemctl show -p MainPID "$SERVICE_NAME" | cut -d= -f2)
    
    if [ "$pid" != "0" ]; then
        # CPU usage
        local cpu=$(ps -p "$pid" -o %cpu= | tr -d ' ')
        if (( $(echo "$cpu > $ALERT_THRESHOLD_CPU" | bc -l) )); then
            log "${YELLOW}⚠ High CPU usage: ${cpu}%${NC}"
        else
            log "${GREEN}✓ CPU usage: ${cpu}%${NC}"
        fi
        
        # Memory usage
        local mem=$(ps -p "$pid" -o %mem= | tr -d ' ')
        if (( $(echo "$mem > $ALERT_THRESHOLD_MEM" | bc -l) )); then
            log "${YELLOW}⚠ High memory usage: ${mem}%${NC}"
        else
            log "${GREEN}✓ Memory usage: ${mem}%${NC}"
        fi
    fi
}

# Collect metrics
collect_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local status=$(curl -s "$API_URL/api/hackrf/status" 2>/dev/null || echo '{}')
    local stats=$(curl -s "$API_URL/api/hackrf/stats" 2>/dev/null || echo '{}')
    local signals=$(curl -s "$API_URL/api/hackrf/signals" 2>/dev/null || echo '{}')
    
    # Get system metrics
    local pid=$(systemctl show -p MainPID "$SERVICE_NAME" | cut -d= -f2)
    local cpu="0"
    local mem="0"
    
    if [ "$pid" != "0" ]; then
        cpu=$(ps -p "$pid" -o %cpu= | tr -d ' ' || echo "0")
        mem=$(ps -p "$pid" -o %mem= | tr -d ' ' || echo "0")
    fi
    
    # Create metrics object
    cat > "$METRICS_FILE" <<EOF
{
  "timestamp": "$timestamp",
  "service": {
    "active": $(systemctl is-active "$SERVICE_NAME" &>/dev/null && echo "true" || echo "false"),
    "pid": $pid,
    "cpu_percent": $cpu,
    "memory_percent": $mem
  },
  "spectrum": {
    "connected": $(echo "$status" | jq -r '.connected // false'),
    "buffer_size": $(echo "$status" | jq -r '.buffer_size // 0'),
    "reconnect_attempts": $(echo "$status" | jq -r '.reconnect_attempts // 0'),
    "signal_count": $(echo "$signals" | jq -r '.count // 0')
  },
  "statistics": {
    "total_detections": $(echo "$stats" | jq -r '.total_detections // 0'),
    "total_signals": $(echo "$stats" | jq -r '.total_signals // 0'),
    "average_signals": $(echo "$stats" | jq -r '.average_signals_per_detection // 0')
  }
}
EOF
    
    log "${GREEN}Metrics collected and saved to $METRICS_FILE${NC}"
}

# Continuous monitoring
monitor() {
    log "${BLUE}Starting continuous monitoring (Ctrl+C to stop)${NC}"
    log "=================================================="
    
    while true; do
        clear
        log "${BLUE}HackRF Spectrum Analyzer Monitor${NC}"
        log "Time: $(date)"
        log "=================================================="
        
        check_service
        check_api
        check_openwebrx
        check_performance
        check_resources
        
        # Show signal activity
        local signals=$(curl -s "$API_URL/api/hackrf/signals" 2>/dev/null)
        if [ -n "$signals" ]; then
            local count=$(echo "$signals" | jq -r '.count // 0')
            log "\n${YELLOW}Signal Activity:${NC}"
            log "  Active signals: $count"
            
            if [ "$count" -gt 0 ]; then
                echo "$signals" | jq -r '.signals[:3][] | "  - \(.frequency)Hz @ \(.power)dB"' 2>/dev/null
            fi
        fi
        
        sleep 5
    done
}

# Alert checking
check_alerts() {
    local alerts=0
    
    log "${BLUE}Checking for alerts...${NC}"
    
    # Service alert
    if ! systemctl is-active --quiet "$SERVICE_NAME"; then
        log "${RED}ALERT: Service is down!${NC}"
        ((alerts++))
    fi
    
    # API alert
    if ! curl -sf "$API_URL/api/hackrf/status" > /dev/null 2>&1; then
        log "${RED}ALERT: API is not responding!${NC}"
        ((alerts++))
    fi
    
    # Performance alerts
    local status=$(curl -s "$API_URL/api/hackrf/status" 2>/dev/null || echo '{}')
    local buffer_size=$(echo "$status" | jq -r '.buffer_size // 0')
    
    if [ "$buffer_size" -gt "$ALERT_THRESHOLD_BUFFER" ]; then
        log "${RED}ALERT: Buffer overflow risk (size: $buffer_size)${NC}"
        ((alerts++))
    fi
    
    # Resource alerts
    local pid=$(systemctl show -p MainPID "$SERVICE_NAME" | cut -d= -f2)
    if [ "$pid" != "0" ]; then
        local cpu=$(ps -p "$pid" -o %cpu= | tr -d ' ')
        local mem=$(ps -p "$pid" -o %mem= | tr -d ' ')
        
        if (( $(echo "$cpu > $ALERT_THRESHOLD_CPU" | bc -l) )); then
            log "${RED}ALERT: High CPU usage: ${cpu}%${NC}"
            ((alerts++))
        fi
        
        if (( $(echo "$mem > $ALERT_THRESHOLD_MEM" | bc -l) )); then
            log "${RED}ALERT: High memory usage: ${mem}%${NC}"
            ((alerts++))
        fi
    fi
    
    if [ "$alerts" -eq 0 ]; then
        log "${GREEN}No alerts found${NC}"
    else
        log "${RED}Total alerts: $alerts${NC}"
    fi
    
    return "$alerts"
}

# Display status
show_status() {
    log "${BLUE}HackRF Spectrum Analyzer Status${NC}"
    log "=================================================="
    
    check_service
    check_api
    check_openwebrx
    check_performance
    check_resources
    
    # Additional details
    local status=$(curl -s "$API_URL/api/hackrf/status" 2>/dev/null || echo '{}')
    
    log "\n${YELLOW}Configuration:${NC}"
    echo "$status" | jq -r '.config | to_entries[] | "  \(.key): \(.value)"' 2>/dev/null
    
    log "\n${YELLOW}Statistics:${NC}"
    local stats=$(curl -s "$API_URL/api/hackrf/stats" 2>/dev/null || echo '{}')
    echo "$stats" | jq -r 'to_entries[] | "  \(.key): \(.value)"' 2>/dev/null
}

# Main execution
case "$CHECK_MODE" in
    status)
        show_status
        ;;
    monitor)
        monitor
        ;;
    alert)
        check_alerts
        exit $?
        ;;
    metrics)
        collect_metrics
        ;;
    *)
        log "Usage: $0 {status|monitor|alert|metrics}"
        exit 1
        ;;
esac
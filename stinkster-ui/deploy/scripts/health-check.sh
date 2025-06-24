#!/bin/bash
# Health check script for WigleToTAK
# Monitors service health and can be used by monitoring systems

set -euo pipefail

# Configuration
HEALTH_ENDPOINT="http://localhost:8001/health"
API_ENDPOINTS=(
    "http://localhost:8001/api/devices"
    "http://localhost:8001/api/scan"
    "http://localhost:8001/api/tak/status"
)
NGINX_STATUS="http://localhost/nginx_status"
LOG_FILE="/var/log/wigletotak/health-check.log"
ALERT_EMAIL="${ALERT_EMAIL:-}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

# Exit codes
EXIT_OK=0
EXIT_WARNING=1
EXIT_CRITICAL=2
EXIT_UNKNOWN=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to log messages
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
    
    case "$level" in
        ERROR)   echo -e "${RED}[${level}] ${message}${NC}" ;;
        WARNING) echo -e "${YELLOW}[${level}] ${message}${NC}" ;;
        OK)      echo -e "${GREEN}[${level}] ${message}${NC}" ;;
        *)       echo "[${level}] ${message}" ;;
    esac
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    local severity="${3:-WARNING}"
    
    # Send email if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "[WigleToTAK] $severity: $subject" "$ALERT_EMAIL" || true
    fi
    
    # Send webhook if configured
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -sf -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"severity\":\"$severity\",\"subject\":\"$subject\",\"message\":\"$message\"}" || true
    fi
}

# Function to check endpoint
check_endpoint() {
    local endpoint="$1"
    local timeout="${2:-5}"
    
    local response=$(curl -sf -w "\n%{http_code}" --connect-timeout "$timeout" "$endpoint" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo "OK"
        return 0
    else
        echo "FAIL (HTTP $http_code)"
        return 1
    fi
}

# Function to check process
check_process() {
    local process="$1"
    
    if pgrep -f "$process" > /dev/null; then
        echo "Running"
        return 0
    else
        echo "Not running"
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local path="$1"
    local threshold="${2:-90}"
    
    local usage=$(df -h "$path" | awk 'NR==2 {print int($5)}')
    
    if [ "$usage" -lt "$threshold" ]; then
        echo "OK (${usage}% used)"
        return 0
    else
        echo "WARNING (${usage}% used)"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    local threshold="${1:-90}"
    
    local usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ "$usage" -lt "$threshold" ]; then
        echo "OK (${usage}% used)"
        return 0
    else
        echo "WARNING (${usage}% used)"
        return 1
    fi
}

# Main health check function
perform_health_check() {
    local exit_code=$EXIT_OK
    local issues=()
    
    echo "=== WigleToTAK Health Check ==="
    echo "Timestamp: $(date)"
    echo ""
    
    # Check systemd service
    echo -n "Service Status: "
    if systemctl is-active --quiet wigletotak; then
        log "OK" "WigleToTAK service is active"
        echo -e "${GREEN}Active${NC}"
    else
        log "ERROR" "WigleToTAK service is not active"
        echo -e "${RED}Inactive${NC}"
        issues+=("Service is not running")
        exit_code=$EXIT_CRITICAL
    fi
    
    # Check main health endpoint
    echo -n "Health Endpoint: "
    if result=$(check_endpoint "$HEALTH_ENDPOINT"); then
        log "OK" "Health endpoint is responding"
        echo -e "${GREEN}$result${NC}"
    else
        log "ERROR" "Health endpoint is not responding: $result"
        echo -e "${RED}$result${NC}"
        issues+=("Health endpoint not responding")
        exit_code=$EXIT_CRITICAL
    fi
    
    # Check API endpoints
    echo ""
    echo "API Endpoints:"
    for endpoint in "${API_ENDPOINTS[@]}"; do
        echo -n "  ${endpoint}: "
        if result=$(check_endpoint "$endpoint"); then
            echo -e "${GREEN}$result${NC}"
        else
            echo -e "${YELLOW}$result${NC}"
            issues+=("API endpoint not responding: $endpoint")
            if [ $exit_code -eq $EXIT_OK ]; then
                exit_code=$EXIT_WARNING
            fi
        fi
    done
    
    # Check nginx
    echo ""
    echo -n "Nginx Status: "
    if nginx_status=$(check_process "nginx"); then
        echo -e "${GREEN}$nginx_status${NC}"
    else
        echo -e "${RED}$nginx_status${NC}"
        issues+=("Nginx is not running")
        exit_code=$EXIT_CRITICAL
    fi
    
    # Check disk space
    echo ""
    echo "Disk Space:"
    echo -n "  Root: "
    if disk_status=$(check_disk_space "/" 90); then
        echo -e "${GREEN}$disk_status${NC}"
    else
        echo -e "${YELLOW}$disk_status${NC}"
        issues+=("Low disk space on root")
        if [ $exit_code -eq $EXIT_OK ]; then
            exit_code=$EXIT_WARNING
        fi
    fi
    
    echo -n "  Data: "
    if disk_status=$(check_disk_space "/opt/wigletotak" 90); then
        echo -e "${GREEN}$disk_status${NC}"
    else
        echo -e "${YELLOW}$disk_status${NC}"
        issues+=("Low disk space on data directory")
        if [ $exit_code -eq $EXIT_OK ]; then
            exit_code=$EXIT_WARNING
        fi
    fi
    
    # Check memory
    echo ""
    echo -n "Memory Usage: "
    if mem_status=$(check_memory 90); then
        echo -e "${GREEN}$mem_status${NC}"
    else
        echo -e "${YELLOW}$mem_status${NC}"
        issues+=("High memory usage")
        if [ $exit_code -eq $EXIT_OK ]; then
            exit_code=$EXIT_WARNING
        fi
    fi
    
    # Check log file sizes
    echo ""
    echo "Log Files:"
    for logfile in /var/log/wigletotak/*.log; do
        if [ -f "$logfile" ]; then
            size=$(du -h "$logfile" | cut -f1)
            echo "  $(basename "$logfile"): $size"
        fi
    done
    
    # Summary
    echo ""
    echo "=== Summary ==="
    if [ $exit_code -eq $EXIT_OK ]; then
        echo -e "${GREEN}All checks passed${NC}"
        log "OK" "All health checks passed"
    else
        echo -e "${RED}Issues found:${NC}"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
        
        # Send alert if critical
        if [ $exit_code -eq $EXIT_CRITICAL ]; then
            send_alert "Health Check Failed" "Critical issues detected:\n$(printf '%s\n' "${issues[@]}")" "CRITICAL"
        fi
    fi
    
    return $exit_code
}

# Parse command line arguments
case "${1:-check}" in
    check)
        perform_health_check
        ;;
    json)
        # Output in JSON format for monitoring systems
        perform_health_check > /dev/null 2>&1
        status=$?
        cat <<EOF
{
  "status": $([ $status -eq 0 ] && echo '"OK"' || echo '"FAIL"'),
  "exit_code": $status,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "checks": {
    "service": $(systemctl is-active --quiet wigletotak && echo "true" || echo "false"),
    "health_endpoint": $(check_endpoint "$HEALTH_ENDPOINT" > /dev/null 2>&1 && echo "true" || echo "false"),
    "nginx": $(check_process "nginx" > /dev/null 2>&1 && echo "true" || echo "false")
  }
}
EOF
        exit $status
        ;;
    nagios)
        # Output in Nagios plugin format
        perform_health_check > /dev/null 2>&1
        status=$?
        case $status in
            0) echo "OK - All checks passed"; exit 0 ;;
            1) echo "WARNING - Some checks failed"; exit 1 ;;
            2) echo "CRITICAL - Critical checks failed"; exit 2 ;;
            *) echo "UNKNOWN - Check failed"; exit 3 ;;
        esac
        ;;
    *)
        echo "Usage: $0 {check|json|nagios}"
        exit 1
        ;;
esac
#!/bin/bash
# Validate Kismet Operations Center deployment
# Runs comprehensive checks to ensure deployment is successful

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVICE_NAME="kismet-operations-center"
DEPLOY_DIR="/opt/kismet-operations-center"
BASE_URL="http://localhost:3001"
CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}! $1${NC}"
}

echo -e "${BLUE}Kismet Operations Center - Deployment Validation${NC}"
echo "==============================================="
echo

# 1. Check deployment directory
echo -e "${YELLOW}Checking deployment structure...${NC}"
if [ -d "$DEPLOY_DIR/current" ]; then
    check_pass "Deployment directory exists"
    
    # Check critical files
    for file in "server.js" "package.json" "version.json"; do
        if [ -f "$DEPLOY_DIR/current/$file" ]; then
            check_pass "Found: $file"
        else
            check_fail "Missing: $file"
        fi
    done
else
    check_fail "Deployment directory not found: $DEPLOY_DIR/current"
fi

# 2. Check service status
echo -e "\n${YELLOW}Checking service status...${NC}"
if systemctl is-active --quiet "$SERVICE_NAME"; then
    check_pass "Service is running"
    
    # Get PID
    pid=$(systemctl show -p MainPID "$SERVICE_NAME" | cut -d= -f2)
    if [ "$pid" != "0" ]; then
        check_pass "Service PID: $pid"
        
        # Check process details
        if ps -p "$pid" > /dev/null; then
            mem_usage=$(ps -p "$pid" -o %mem | tail -1 | tr -d ' ')
            cpu_usage=$(ps -p "$pid" -o %cpu | tail -1 | tr -d ' ')
            check_pass "Process memory usage: ${mem_usage}%"
            check_pass "Process CPU usage: ${cpu_usage}%"
        fi
    fi
else
    check_fail "Service is not running"
fi

# 3. Check port binding
echo -e "\n${YELLOW}Checking network binding...${NC}"
if netstat -tlnp 2>/dev/null | grep -q ":3001"; then
    check_pass "Port 3001 is bound"
else
    check_fail "Port 3001 is not bound"
fi

# 4. Check health endpoint
echo -e "\n${YELLOW}Checking health endpoint...${NC}"
health_response=$(curl -sf -w '\n%{http_code}' "$BASE_URL/api/health" 2>/dev/null || echo "000")
http_code=$(echo "$health_response" | tail -1)

if [ "$http_code" = "200" ]; then
    check_pass "Health endpoint responding (HTTP 200)"
    
    # Parse health data
    health_data=$(echo "$health_response" | sed '$d')
    if echo "$health_data" | jq . > /dev/null 2>&1; then
        status=$(echo "$health_data" | jq -r '.status // "unknown"')
        if [ "$status" = "healthy" ]; then
            check_pass "Service reports healthy status"
        else
            check_warn "Service status: $status"
        fi
    fi
else
    check_fail "Health endpoint not responding (HTTP $http_code)"
fi

# 5. Check API endpoints
echo -e "\n${YELLOW}Checking API endpoints...${NC}"
endpoints=(
    "/api/status"
    "/api/kismet/devices"
    "/api/logs/recent"
    "/api/config"
)

for endpoint in "${endpoints[@]}"; do
    response_code=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null || echo "000")
    if [[ "$response_code" =~ ^(200|401|403)$ ]]; then
        check_pass "API endpoint $endpoint (HTTP $response_code)"
    else
        check_fail "API endpoint $endpoint (HTTP $response_code)"
    fi
done

# 6. Check WebSocket
echo -e "\n${YELLOW}Checking WebSocket support...${NC}"
if curl -sf -H "Upgrade: websocket" -H "Connection: Upgrade" "$BASE_URL/socket.io/" 2>&1 | grep -q "transport"; then
    check_pass "WebSocket endpoint available"
else
    check_warn "WebSocket endpoint may not be configured"
fi

# 7. Check logs
echo -e "\n${YELLOW}Checking logs...${NC}"
log_files=(
    "/var/log/kismet-operations/app.log"
    "/var/log/kismet-operations/health-check.log"
)

for log_file in "${log_files[@]}"; do
    if [ -f "$log_file" ]; then
        check_pass "Log file exists: $log_file"
        
        # Check if log is recent (modified in last hour)
        if [ "$(find "$log_file" -mmin -60 2>/dev/null)" ]; then
            check_pass "Log file is being updated"
        else
            check_warn "Log file not updated recently"
        fi
    else
        check_warn "Log file missing: $log_file"
    fi
done

# 8. Check nginx integration
echo -e "\n${YELLOW}Checking nginx integration...${NC}"
if [ -f "/etc/nginx/sites-enabled/kismet-operations.conf" ]; then
    check_pass "Nginx configuration found"
    
    if nginx -t 2>/dev/null; then
        check_pass "Nginx configuration is valid"
    else
        check_fail "Nginx configuration has errors"
    fi
    
    # Check if nginx is proxying correctly
    if systemctl is-active --quiet nginx; then
        check_pass "Nginx is running"
    else
        check_warn "Nginx is not running"
    fi
else
    check_warn "Nginx configuration not found"
fi

# 9. Check monitoring
echo -e "\n${YELLOW}Checking monitoring setup...${NC}"
if systemctl is-active --quiet kismet-operations-health.timer; then
    check_pass "Health check timer is active"
else
    check_warn "Health check timer not active"
fi

if systemctl is-active --quiet kismet-operations-metrics.timer; then
    check_pass "Metrics collection timer is active"
else
    check_warn "Metrics collection timer not active"
fi

# 10. Check permissions
echo -e "\n${YELLOW}Checking file permissions...${NC}"
if [ -d "$DEPLOY_DIR/current" ]; then
    owner=$(stat -c '%U' "$DEPLOY_DIR/current")
    group=$(stat -c '%G' "$DEPLOY_DIR/current")
    
    if [ "$owner" = "pi" ] && [ "$group" = "pi" ]; then
        check_pass "Correct ownership (pi:pi)"
    else
        check_fail "Incorrect ownership: $owner:$group (should be pi:pi)"
    fi
fi

# 11. Performance check
echo -e "\n${YELLOW}Running performance check...${NC}"
start_time=$(date +%s%N)
curl -sf "$BASE_URL/api/health" > /dev/null 2>&1
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))

if [ "$response_time" -lt 1000 ]; then
    check_pass "API response time: ${response_time}ms"
elif [ "$response_time" -lt 3000 ]; then
    check_warn "API response time: ${response_time}ms (slow)"
else
    check_fail "API response time: ${response_time}ms (very slow)"
fi

# 12. Check version info
echo -e "\n${YELLOW}Checking version information...${NC}"
if [ -f "$DEPLOY_DIR/current/version.json" ]; then
    version_data=$(cat "$DEPLOY_DIR/current/version.json" 2>/dev/null)
    if echo "$version_data" | jq . > /dev/null 2>&1; then
        version=$(echo "$version_data" | jq -r '.version // "unknown"')
        build_date=$(echo "$version_data" | jq -r '.buildDate // "unknown"')
        check_pass "Version: $version"
        check_pass "Build date: $build_date"
    fi
fi

# Summary
echo -e "\n${BLUE}Validation Summary${NC}"
echo "=================="
echo -e "Checks passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks failed: ${RED}$CHECKS_FAILED${NC}"

if [ "$CHECKS_FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}✓ Deployment validation successful!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Deployment validation failed!${NC}"
    echo -e "\nPlease review the failed checks above and:"
    echo "1. Check logs: sudo journalctl -u $SERVICE_NAME -n 100"
    echo "2. Check deployment status: sudo ./deploy.sh status"
    echo "3. Consider rollback if needed: sudo ./deploy.sh rollback"
    exit 1
fi
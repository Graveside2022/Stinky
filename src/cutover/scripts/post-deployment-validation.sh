#!/bin/bash

# Post-Deployment Validation Script
# Comprehensive system validation after migration

set -euo pipefail

# Configuration
REPORT_FILE="/var/log/stinkster-migration/post-deployment-$(date +%Y%m%d-%H%M%S).txt"
LOG_DIR="/var/log/stinkster-migration"
PROJECT_ROOT="/home/pi/projects/stinkster_christian/stinkster"

# Test configuration
LOAD_TEST_USERS=50
LOAD_TEST_DURATION=60
ENDPOINTS_TO_TEST=(
    "http://localhost:3001/health:Health Check"
    "http://localhost:3001/api/status:System Status"
    "http://localhost:3001/api/services:Services List"
    "http://localhost:3001/api/metrics:Metrics"
)

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$REPORT_FILE"
}

pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    log "PASS: $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    log "FAIL: $1"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN: $1${NC}"
    log "WARN: $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ INFO: $1${NC}"
    log "INFO: $1"
}

header() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
    echo ""
    log "=== $1 ==="
}

# Create directories
mkdir -p "$LOG_DIR"

# Start report
cat > "$REPORT_FILE" <<EOF
POST-DEPLOYMENT VALIDATION REPORT
=================================
Date: $(date)
System: Stinkster Migration
Type: Full Validation Suite

EOF

header "1. SERVICE AVAILABILITY CHECKS"

# Check Node.js services
info "Checking Node.js services..."

SERVICES=(
    "3001:Main Orchestrator"
    "3002:WigleToTAK"
    "3003:HackRF Service"
    "3004:Kismet Operations"
)

for service in "${SERVICES[@]}"; do
    port="${service%:*}"
    name="${service#*:}"
    
    if curl -s -f -o /dev/null "http://localhost:$port/health" 2>/dev/null; then
        pass "$name on port $port is healthy"
    else
        fail "$name on port $port is not responding"
    fi
done

# Check external dependencies
info "Checking external dependencies..."

if systemctl is-active --quiet gpsd; then
    pass "GPSD is running"
else
    fail "GPSD is not running"
fi

if pgrep -f kismet > /dev/null; then
    pass "Kismet is running"
else
    warn "Kismet is not running (may be intentional)"
fi

header "2. ENDPOINT FUNCTIONALITY TESTS"

# Test each endpoint
for endpoint_spec in "${ENDPOINTS_TO_TEST[@]}"; do
    url="${endpoint_spec%:*}"
    name="${endpoint_spec#*:}"
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        pass "$name returned 200 OK"
        
        # Validate JSON response
        if echo "$body" | jq . >/dev/null 2>&1; then
            pass "$name returned valid JSON"
        else
            fail "$name returned invalid JSON"
        fi
    else
        fail "$name returned HTTP $http_code"
    fi
done

header "3. WEBSOCKET CONNECTIVITY TEST"

# Test WebSocket connection
info "Testing WebSocket connectivity..."

# Create WebSocket test script
cat > /tmp/ws-test.js <<'EOF'
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');

let connected = false;
let timeout = setTimeout(() => {
    if (!connected) {
        console.log('TIMEOUT');
        process.exit(1);
    }
}, 5000);

ws.on('open', () => {
    connected = true;
    console.log('CONNECTED');
    ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', (data) => {
    console.log('MESSAGE:', data.toString());
    clearTimeout(timeout);
    ws.close();
    process.exit(0);
});

ws.on('error', (error) => {
    console.log('ERROR:', error.message);
    process.exit(1);
});
EOF

if command -v node >/dev/null 2>&1; then
    if node /tmp/ws-test.js 2>/dev/null | grep -q "CONNECTED"; then
        pass "WebSocket connection successful"
    else
        fail "WebSocket connection failed"
    fi
else
    warn "Node.js not available for WebSocket test"
fi

rm -f /tmp/ws-test.js

header "4. DATA FLOW VALIDATION"

# Test data flow from Kismet to TAK
info "Testing data processing pipeline..."

# Check if data directories exist
DATA_DIRS=(
    "/home/pi/.kismet/logs"
    "/home/pi/WigletoTAK/uploads"
    "/var/log/stinkster"
)

for dir in "${DATA_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        pass "Data directory exists: $dir"
        
        # Check for recent files
        if find "$dir" -type f -mmin -60 2>/dev/null | grep -q .; then
            pass "Recent data found in $dir"
        else
            warn "No recent data in $dir"
        fi
    else
        warn "Data directory missing: $dir"
    fi
done

header "5. PERFORMANCE BENCHMARKS"

# Simple load test
info "Running basic load test..."

if command -v ab >/dev/null 2>&1; then
    # Apache Bench test
    ab_result=$(ab -n 100 -c 10 -t 10 "http://localhost:3001/api/health" 2>&1 | grep -E "Requests per second:|Time per request:|Failed requests:")
    
    if echo "$ab_result" | grep -q "Failed requests:.*0"; then
        pass "Load test completed without failures"
    else
        fail "Load test reported failures"
    fi
    
    echo "$ab_result" | while read line; do
        info "$line"
    done
else
    warn "Apache Bench not installed - skipping load test"
fi

# Memory usage check
info "Checking memory usage..."

for service in "${SERVICES[@]}"; do
    port="${service%:*}"
    name="${service#*:}"
    
    # Find process by port
    pid=$(lsof -ti:$port 2>/dev/null | head -1)
    
    if [ -n "$pid" ]; then
        mem_usage=$(ps -p $pid -o %mem= 2>/dev/null || echo "0")
        mem_mb=$(ps -p $pid -o rss= 2>/dev/null || echo "0")
        mem_mb=$((mem_mb / 1024))
        
        if (( $(echo "$mem_usage < 10" | bc -l) )); then
            pass "$name memory usage: ${mem_usage}% (${mem_mb}MB)"
        else
            warn "$name high memory usage: ${mem_usage}% (${mem_mb}MB)"
        fi
    fi
done

header "6. SECURITY VALIDATION"

# Check for exposed sensitive endpoints
info "Checking security configurations..."

SENSITIVE_ENDPOINTS=(
    "/admin:Admin Panel"
    "/debug:Debug Interface"
    "/.env:Environment File"
    "/config:Configuration"
)

for endpoint_spec in "${SENSITIVE_ENDPOINTS[@]}"; do
    path="${endpoint_spec%:*}"
    name="${endpoint_spec#*:}"
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001$path" 2>/dev/null)
    
    if [ "$http_code" = "404" ] || [ "$http_code" = "403" ] || [ "$http_code" = "401" ]; then
        pass "$name properly secured (HTTP $http_code)"
    else
        fail "$name may be exposed (HTTP $http_code)"
    fi
done

# Check CORS headers
info "Checking CORS configuration..."

cors_headers=$(curl -s -I -X OPTIONS "http://localhost:3001/api/health" 2>/dev/null | grep -i "access-control")

if echo "$cors_headers" | grep -q "Access-Control-Allow-Origin"; then
    pass "CORS headers present"
    echo "$cors_headers" | while read line; do
        info "  $line"
    done
else
    warn "CORS headers not found"
fi

header "7. LOG ANALYSIS"

# Check for errors in logs
info "Analyzing application logs..."

LOG_FILES=(
    "/var/log/stinkster/*.log"
    "/var/log/stinkster-migration/*.log"
)

total_errors=0
for pattern in "${LOG_FILES[@]}"; do
    for log_file in $pattern; do
        if [ -f "$log_file" ]; then
            error_count=$(grep -ci "error\|exception\|fatal" "$log_file" 2>/dev/null || echo "0")
            
            if [ "$error_count" -eq 0 ]; then
                pass "No errors in $(basename "$log_file")"
            else
                warn "$error_count errors found in $(basename "$log_file")"
                total_errors=$((total_errors + error_count))
                
                # Show recent errors
                info "Recent errors:"
                tail -n 100 "$log_file" | grep -i "error\|exception\|fatal" | tail -5 | while read line; do
                    info "  $line"
                done
            fi
        fi
    done
done

header "8. INTEGRATION TESTS"

# Test GPS to Kismet integration
info "Testing GPS integration..."

if gpspipe -w -n 1 2>/dev/null | grep -q GPS; then
    pass "GPS data available"
    
    # Check if Kismet sees GPS
    kismet_gps=$(curl -s "http://localhost:2501/gps/location.json" 2>/dev/null || echo "{}")
    if echo "$kismet_gps" | jq -e '.lat' >/dev/null 2>&1; then
        pass "Kismet receiving GPS data"
    else
        warn "Kismet not receiving GPS data"
    fi
else
    warn "GPS data not available"
fi

# Test WiFi scanning
info "Testing WiFi scanning..."

if ip link show | grep -q "wlan.*MONITOR"; then
    pass "WiFi interface in monitor mode"
else
    warn "No WiFi interface in monitor mode"
fi

header "9. USER ACCEPTANCE CRITERIA"

# Simulate user actions
info "Simulating user workflows..."

# Test 1: View spectrum analyzer
if curl -s "http://localhost:3001/spectrum" | grep -q "Spectrum Analyzer"; then
    pass "Spectrum analyzer page loads"
else
    fail "Spectrum analyzer page not loading"
fi

# Test 2: Check WebSocket data stream
ws_test=$(timeout 5 curl -s -N "http://localhost:3001/api/stream" 2>/dev/null | head -n 1)
if [ -n "$ws_test" ]; then
    pass "Real-time data streaming works"
else
    warn "Real-time data streaming not verified"
fi

header "10. FINAL SUMMARY"

# Calculate success rate
total_tests=$((TESTS_PASSED + TESTS_FAILED))
if [ $total_tests -gt 0 ]; then
    success_rate=$(echo "scale=2; ($TESTS_PASSED * 100) / $total_tests" | bc)
else
    success_rate=0
fi

# Generate summary
cat >> "$REPORT_FILE" <<EOF

VALIDATION SUMMARY
==================
Total Tests: $total_tests
Passed: $TESTS_PASSED
Failed: $TESTS_FAILED
Warnings: $WARNINGS
Success Rate: ${success_rate}%
Overall Status: $([ $TESTS_FAILED -eq 0 ] && echo "PASSED" || echo "FAILED")

RECOMMENDATIONS
===============
EOF

# Add recommendations based on results
if [ $TESTS_FAILED -eq 0 ]; then
    echo "1. System is ready for production use" >> "$REPORT_FILE"
    echo "2. Continue monitoring for 24 hours" >> "$REPORT_FILE"
    echo "3. Document any user feedback" >> "$REPORT_FILE"
else
    echo "1. Address failed tests before proceeding" >> "$REPORT_FILE"
    echo "2. Review logs for root cause analysis" >> "$REPORT_FILE"
    echo "3. Consider partial rollback if needed" >> "$REPORT_FILE"
fi

if [ $WARNINGS -gt 5 ]; then
    echo "4. Investigate warnings to prevent future issues" >> "$REPORT_FILE"
fi

if [ $total_errors -gt 10 ]; then
    echo "5. High error count in logs requires investigation" >> "$REPORT_FILE"
fi

# Display summary
echo ""
echo "========================================="
echo "VALIDATION COMPLETE"
echo "========================================="
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "Warnings: $WARNINGS"
echo "Success Rate: ${success_rate}%"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    success "All critical tests passed - system validated"
    exit 0
else
    error "$TESTS_FAILED tests failed - review report for details"
    exit 1
fi
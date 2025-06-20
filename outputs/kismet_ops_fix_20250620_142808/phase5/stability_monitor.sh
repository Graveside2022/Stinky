#!/bin/bash

# Stability monitoring script for 10-minute test
# Created: $(date)

DURATION=600 # 10 minutes in seconds
INTERVAL=30  # Check every 30 seconds
LOG_DIR="/home/pi/projects/stinkster_malone/stinkster/outputs/kismet_ops_fix_20250620_142808/phase5"
STABILITY_LOG="$LOG_DIR/stability_metrics.log"

echo "=== Starting 10-minute stability test ===" | tee -a "$STABILITY_LOG"
echo "Start time: $(date)" | tee -a "$STABILITY_LOG"
echo "Duration: $DURATION seconds" | tee -a "$STABILITY_LOG"
echo "Check interval: $INTERVAL seconds" | tee -a "$STABILITY_LOG"
echo "" | tee -a "$STABILITY_LOG"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))
CHECK_NUM=0

# Function to check service status
check_service() {
    local service=$1
    local process=$2
    
    if pgrep -f "$process" > /dev/null; then
        echo "✓ $service is running (PID: $(pgrep -f "$process" | head -1))"
    else
        echo "✗ $service is NOT running"
        return 1
    fi
    return 0
}

# Function to check resource usage
check_resources() {
    echo "=== Resource Usage ==="
    
    # Memory usage
    free -h | grep Mem: | awk '{printf "Memory: %s/%s (%.1f%% used)\n", $3, $2, ($3/$2)*100}'
    
    # CPU load
    uptime | awk -F'load average:' '{print "Load average:" $2}'
    
    # Disk usage for key directories
    df -h /home/pi/tmp | tail -1 | awk '{printf "Disk /home/pi/tmp: %s/%s (%s used)\n", $3, $2, $5}'
}

# Function to check log errors
check_logs() {
    echo "=== Recent Log Errors (last 5 minutes) ==="
    
    # Check orchestration log
    local recent_errors=$(find /home/pi/tmp/gps_kismet_wigle.log -mmin -5 -exec grep -c "ERROR" {} \; 2>/dev/null || echo "0")
    echo "Orchestration errors: $recent_errors"
    
    # Check kismet log
    if [ -f /home/pi/tmp/kismet.log ]; then
        recent_errors=$(find /home/pi/tmp/kismet.log -mmin -5 -exec grep -c "ERROR" {} \; 2>/dev/null || echo "0")
        echo "Kismet errors: $recent_errors"
    fi
    
    # Check WigleToTAK log
    if [ -f /home/pi/tmp/wigletotak.log ]; then
        recent_errors=$(find /home/pi/tmp/wigletotak.log -mmin -5 -exec grep -c "ERROR" {} \; 2>/dev/null || echo "0")
        echo "WigleToTAK errors: $recent_errors"
    fi
}

# Main monitoring loop
while [ $(date +%s) -lt $END_TIME ]; do
    CHECK_NUM=$((CHECK_NUM + 1))
    ELAPSED=$(($(date +%s) - START_TIME))
    
    echo "" | tee -a "$STABILITY_LOG"
    echo "=== Check #$CHECK_NUM - $(date) (Elapsed: ${ELAPSED}s) ===" | tee -a "$STABILITY_LOG"
    
    # Check services
    echo "=== Service Status ===" | tee -a "$STABILITY_LOG"
    
    FAILURES=0
    
    # Check orchestration script
    if ! check_service "Orchestration" "gps_kismet_wigle.sh"; then
        ((FAILURES++))
    fi | tee -a "$STABILITY_LOG"
    
    # Check Kismet
    if ! check_service "Kismet" "kismet.*wlan2"; then
        ((FAILURES++))
    fi | tee -a "$STABILITY_LOG"
    
    # Check WigleToTAK
    if ! check_service "WigleToTAK" "WigleToTak2.py"; then
        ((FAILURES++))
    fi | tee -a "$STABILITY_LOG"
    
    # Check GPS
    echo -n "GPS Status: " | tee -a "$STABILITY_LOG"
    if gpspipe -w -n 1 2>/dev/null | grep -q "class"; then
        echo "✓ GPS is working" | tee -a "$STABILITY_LOG"
    else
        echo "✗ GPS is NOT working" | tee -a "$STABILITY_LOG"
        ((FAILURES++))
    fi
    
    # Check resources
    check_resources | tee -a "$STABILITY_LOG"
    
    # Check logs
    check_logs | tee -a "$STABILITY_LOG"
    
    # Check for "All services started" message
    echo -n "Services started message: " | tee -a "$STABILITY_LOG"
    if tail -100 /home/pi/tmp/gps_kismet_wigle.log | grep -q "All services started!"; then
        echo "✓ Found" | tee -a "$STABILITY_LOG"
    else
        echo "✗ Not found in recent logs" | tee -a "$STABILITY_LOG"
    fi
    
    # Summary
    echo "" | tee -a "$STABILITY_LOG"
    if [ $FAILURES -eq 0 ]; then
        echo "STATUS: ✓ All services healthy" | tee -a "$STABILITY_LOG"
    else
        echo "STATUS: ✗ $FAILURES service(s) failed" | tee -a "$STABILITY_LOG"
    fi
    
    # Sleep until next check
    if [ $(date +%s) -lt $END_TIME ]; then
        sleep $INTERVAL
    fi
done

# Final summary
echo "" | tee -a "$STABILITY_LOG"
echo "=== 10-Minute Stability Test Complete ===" | tee -a "$STABILITY_LOG"
echo "End time: $(date)" | tee -a "$STABILITY_LOG"
echo "Total duration: $(($(date +%s) - START_TIME)) seconds" | tee -a "$STABILITY_LOG"

# Count total failures
TOTAL_CHECKS=$(grep -c "Check #" "$STABILITY_LOG")
TOTAL_FAILURES=$(grep -c "service(s) failed" "$STABILITY_LOG")
SUCCESS_RATE=$(( (TOTAL_CHECKS - TOTAL_FAILURES) * 100 / TOTAL_CHECKS ))

echo "" | tee -a "$STABILITY_LOG"
echo "Summary Statistics:" | tee -a "$STABILITY_LOG"
echo "- Total checks: $TOTAL_CHECKS" | tee -a "$STABILITY_LOG"
echo "- Successful checks: $((TOTAL_CHECKS - TOTAL_FAILURES))" | tee -a "$STABILITY_LOG"
echo "- Failed checks: $TOTAL_FAILURES" | tee -a "$STABILITY_LOG"
echo "- Success rate: $SUCCESS_RATE%" | tee -a "$STABILITY_LOG"

if [ $SUCCESS_RATE -ge 95 ]; then
    echo "" | tee -a "$STABILITY_LOG"
    echo "RESULT: ✓ STABILITY TEST PASSED (≥95% success rate)" | tee -a "$STABILITY_LOG"
    exit 0
else
    echo "" | tee -a "$STABILITY_LOG"
    echo "RESULT: ✗ STABILITY TEST FAILED (<95% success rate)" | tee -a "$STABILITY_LOG"
    exit 1
fi
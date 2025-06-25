#!/bin/bash
# Production monitoring script for Node.js migration validation

LOG_FILE="/home/pi/projects/stinkster_malone/stinkster/monitoring-$(date +%Y%m%d).log"

log_metric() {
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - $1" >> "$LOG_FILE"
}

# Check service status
check_services() {
    # WigleToTAK (port 8000)
    if curl -s http://localhost:8000/api/status > /dev/null; then
        WIGLE_STATUS="OK"
    else
        WIGLE_STATUS="FAILED"
    fi
    
    # Spectrum Analyzer (port 8092) 
    if curl -s http://localhost:8092/api/status > /dev/null; then
        SPECTRUM_STATUS="OK"
    else
        SPECTRUM_STATUS="FAILED"
    fi
    
    # GPS Bridge (port 2947)
    if nc -zv localhost 2947 2>/dev/null; then
        GPS_STATUS="OK"
    else
        GPS_STATUS="FAILED"
    fi
    
    log_metric "SERVICE_STATUS: WigleToTAK=$WIGLE_STATUS, Spectrum=$SPECTRUM_STATUS, GPS=$GPS_STATUS"
}

# Check memory usage
check_memory() {
    MEMORY_USAGE=$(ps aux | grep -E "node.*server.js" | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
    log_metric "MEMORY_USAGE: ${MEMORY_USAGE}MB"
}

# Check API response times
check_performance() {
    START_TIME=$(date +%s%3N)
    curl -s http://localhost:8000/api/status > /dev/null
    END_TIME=$(date +%s%3N)
    RESPONSE_TIME=$((END_TIME - START_TIME))
    log_metric "API_RESPONSE_TIME: ${RESPONSE_TIME}ms"
}

# Initial startup log
log_metric "MONITORING_START: Production monitoring initiated for Node.js migration validation"

# Main monitoring loop
while true; do
    check_services
    check_memory  
    check_performance
    sleep 300  # 5-minute intervals
done
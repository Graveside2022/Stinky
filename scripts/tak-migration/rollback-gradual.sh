#!/bin/bash
# Gradual rollback script for TAK migration
# This script slowly shifts traffic back to Python implementation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/home/pi/tmp/tak-rollback-gradual-$(date +%Y%m%d_%H%M%S).log"
METRICS_FILE="/home/pi/tmp/tak-rollback-metrics.json"

# Configuration
ROLLBACK_STEPS=(90 70 50 30 10 0)  # Node.js weights (Python gets remainder)
STEP_DELAY=300  # 5 minutes between steps
HEALTH_CHECK_RETRIES=3

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Health check function
check_service_health() {
    local service=$1
    local port=$2
    local endpoint=$3
    
    for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
        if curl -s -f "http://localhost:${port}${endpoint}" > /dev/null 2>&1; then
            return 0
        fi
        sleep 2
    done
    return 1
}

# Metrics collection function
collect_metrics() {
    local python_weight=$1
    local node_weight=$2
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Collect basic metrics
    local python_responsive="false"
    local node_responsive="false"
    
    check_service_health "Python" 8000 "/" && python_responsive="true"
    check_service_health "Node.js" 3002 "/health" && node_responsive="true"
    
    # Append to metrics file
    cat >> "$METRICS_FILE" << EOF
{
  "timestamp": "$timestamp",
  "python_weight": $python_weight,
  "node_weight": $node_weight,
  "python_responsive": $python_responsive,
  "node_responsive": $node_responsive
}
EOF
}

# Update nginx weights
update_nginx_weights() {
    local python_weight=$1
    local node_weight=$2
    
    cat > /tmp/nginx-wigletotak-weights << EOF
upstream wigletotak {
    server localhost:8000 weight=${python_weight};  # Python
    server localhost:3002 weight=${node_weight};   # Node.js
}

server {
    listen 8080;
    server_name localhost;
    
    location / {
        proxy_pass http://wigletotak;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Host \$http_host;
    }
    
    location /health/python {
        proxy_pass http://localhost:8000/;
    }
    
    location /health/nodejs {
        proxy_pass http://localhost:3002/health;
    }
}
EOF
    
    sudo cp /tmp/nginx-wigletotak-weights /etc/nginx/sites-available/wigletotak-migration
    sudo nginx -t && sudo nginx -s reload
}

# Main rollback process
log "Starting gradual rollback to Python WigleToTAK"
log "This process will take approximately $((${#ROLLBACK_STEPS[@]} * STEP_DELAY / 60)) minutes"

# Initialize metrics file
echo "[]" > "$METRICS_FILE"

# Pre-flight checks
log "Performing pre-flight checks..."

if ! check_service_health "Python" 8000 "/"; then
    log "ERROR: Python service not responding. Attempting to start..."
    cd /home/pi/projects/stinkster/src/wigletotak/WigleToTAK/TheStinkToTAK
    source venv/bin/activate
    nohup python3 WigleToTak2.py --flask-port 8000 > /home/pi/tmp/wigletotak.log 2>&1 &
    deactivate
    sleep 5
    
    if ! check_service_health "Python" 8000 "/"; then
        log "ERROR: Failed to start Python service. Aborting rollback."
        exit 1
    fi
fi

if ! check_service_health "Node.js" 3002 "/health"; then
    log "WARNING: Node.js service not responding. Continuing with rollback..."
fi

# Execute gradual rollback
for node_weight in "${ROLLBACK_STEPS[@]}"; do
    python_weight=$((100 - node_weight))
    
    log "Step: Python ${python_weight}%, Node.js ${node_weight}%"
    
    # Update nginx configuration
    if [ -f /etc/nginx/sites-available/wigletotak-migration ]; then
        update_nginx_weights $python_weight $node_weight
        log "Nginx weights updated"
    else
        log "WARNING: Nginx configuration not found, skipping weight update"
    fi
    
    # Collect metrics
    collect_metrics $python_weight $node_weight
    
    # Monitor for issues
    sleep 10  # Brief pause to let traffic settle
    
    error_count=0
    for check in $(seq 1 5); do
        if ! check_service_health "Python" 8000 "/"; then
            ((error_count++))
            log "WARNING: Python health check failed ($check/5)"
        fi
        sleep 2
    done
    
    if [ $error_count -ge 3 ]; then
        log "ERROR: Python service unstable. Halting rollback."
        log "Current state: Python ${python_weight}%, Node.js ${node_weight}%"
        exit 1
    fi
    
    # Wait before next step (skip wait on last step)
    if [ $node_weight -ne 0 ]; then
        log "Waiting $((STEP_DELAY / 60)) minutes before next step..."
        sleep $STEP_DELAY
    fi
done

# Final step: Stop Node.js service
log "Final step: Stopping Node.js service..."
if pgrep -f "node.*wigle-to-tak" > /dev/null; then
    pkill -f "node.*wigle-to-tak" || true
fi

if systemctl is-active --quiet wigletotak-nodejs; then
    sudo systemctl stop wigletotak-nodejs || true
    sudo systemctl disable wigletotak-nodejs || true
fi

# Update nginx to Python-only
cat > /tmp/nginx-wigletotak-final << 'EOF'
server {
    listen 8080;
    server_name localhost;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }
}
EOF

if [ -f /etc/nginx/sites-available/wigletotak-migration ]; then
    sudo cp /tmp/nginx-wigletotak-final /etc/nginx/sites-available/wigletotak-migration
    sudo nginx -t && sudo nginx -s reload
fi

# Final metrics collection
collect_metrics 100 0

# Generate summary report
log "Generating rollback summary report..."
cat > "/home/pi/tmp/tak-rollback-summary-$(date +%Y%m%d_%H%M%S).txt" << EOF
TAK Migration Gradual Rollback Summary
======================================
Start Time: $(head -n 1 "$LOG_FILE" | cut -d']' -f1 | tr -d '[')
End Time: $(date '+%Y-%m-%d %H:%M:%S')
Total Duration: $((${#ROLLBACK_STEPS[@]} * STEP_DELAY / 60)) minutes

Final State:
- Python WigleToTAK: Active (100%)
- Node.js WigleToTAK: Stopped (0%)

Metrics File: $METRICS_FILE
Log File: $LOG_FILE

Next Steps:
1. Monitor Python service for stability
2. Review metrics for any anomalies
3. Investigate root cause of migration issues
4. Plan remediation before next migration attempt
EOF

log "Gradual rollback completed successfully"
log "Python WigleToTAK is now handling 100% of traffic"

# Display summary
echo
echo "Rollback Complete"
echo "================="
echo "Python service: http://localhost:8000 (100% traffic)"
echo "Node.js service: Stopped"
echo "Metrics saved to: $METRICS_FILE"
echo "Logs saved to: $LOG_FILE"
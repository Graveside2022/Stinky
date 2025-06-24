# Webhook Service Rollback Procedures

## Quick Reference - Emergency Rollback

**If something goes wrong, execute this immediately:**

```bash
#!/bin/bash
# EMERGENCY ROLLBACK - Copy and paste this entire block

# 1. Stop Node.js webhook service
sudo systemctl stop webhook-nodejs 2>/dev/null || true
sudo systemctl stop kismet-operations 2>/dev/null || true
pkill -f "webhook-service" 2>/dev/null || true
pkill -f "kismet-operations" 2>/dev/null || true

# 2. Stop any running processes from Node.js
sudo pkill -f "kismet" 2>/dev/null || true
sudo pkill -f "WigleToTak" 2>/dev/null || true

# 3. Clean up PID files
rm -f /home/pi/tmp/*.pid
rm -f /home/pi/kismet_ops/*.pid
rm -f /tmp/kismet*.pid

# 4. Reset network interface
sudo ip link set wlan2 down 2>/dev/null || true
sudo iw dev wlan2 set type managed 2>/dev/null || true
sudo ip link set wlan2 up 2>/dev/null || true

# 5. Restart GPS daemon
sudo systemctl restart gpsd

# 6. Start Python webhook service
cd /home/pi/web
python3 webhook.py &

# 7. Verify rollback success
sleep 3
if curl -s http://localhost:5000/info > /dev/null; then
    echo "✅ ROLLBACK SUCCESSFUL - Python service restored"
else
    echo "❌ ROLLBACK FAILED - Manual intervention required!"
fi
```

## Detailed Rollback Scenarios

### Scenario 1: API Response Format Mismatch

**Symptoms:**
- hi.html displays errors or blank data
- JavaScript console shows parsing errors
- Status messages not appearing correctly

**Rollback Steps:**

```bash
# 1. Verify the issue
curl http://localhost:8092/info | jq . > node_response.json
curl http://localhost:5000/info | jq . > python_response.json
diff node_response.json python_response.json

# 2. If differences found, rollback
./emergency-rollback.sh

# 3. Document the issue
echo "$(date): API mismatch in /info endpoint" >> rollback.log
echo "Differences:" >> rollback.log
diff node_response.json python_response.json >> rollback.log
```

### Scenario 2: Process Management Failure

**Symptoms:**
- Kismet won't start or keeps crashing
- GPS data not flowing
- PID files corrupted or missing

**Rollback Steps:**

```bash
# 1. Stop everything cleanly
sudo systemctl stop webhook-nodejs
./stop-all-services.sh

# 2. Check for orphaned processes
ps aux | grep -E "(kismet|gpsmav|WigleToTak)" | grep -v grep

# 3. Kill any orphans
sudo pkill -9 -f "kismet"
sudo pkill -9 -f "mavgps"
sudo pkill -9 -f "WigleToTak"

# 4. Clean state
rm -rf /home/pi/tmp/*.pid
rm -rf /home/pi/kismet_ops/*.pid

# 5. Rollback to Python
cd /home/pi/web
python3 webhook.py &

# 6. Test process management
curl -X POST http://localhost:5000/run-script
```

### Scenario 3: Performance Degradation

**Symptoms:**
- Response times > 500ms
- High CPU usage (> 50%)
- Memory usage growing rapidly

**Rollback Steps:**

```bash
# 1. Capture performance metrics
top -b -n 1 | grep -E "(node|webhook)" > perf_snapshot.txt
ps aux --sort=-%mem | head -20 >> perf_snapshot.txt

# 2. Get response times
time curl http://localhost:8092/info
time curl http://localhost:8092/kismet-data

# 3. If degraded, rollback
./emergency-rollback.sh

# 4. Compare with Python performance
time curl http://localhost:5000/info
time curl http://localhost:5000/kismet-data
```

### Scenario 4: Hardware Integration Issues

**Symptoms:**
- GPS not connecting
- WiFi adapter not entering monitor mode
- Permissions errors

**Rollback Steps:**

```bash
# 1. Check hardware status
ls -la /dev/ttyUSB* /dev/ttyACM*
iwconfig wlan2
sudo systemctl status gpsd

# 2. Reset hardware state
sudo systemctl stop webhook-nodejs
sudo systemctl restart gpsd
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up

# 3. Rollback to Python (has proven hardware integration)
cd /home/pi/web
python3 webhook.py &

# 4. Verify hardware working
gpspipe -w -n 1
sudo iwconfig wlan2
```

### Scenario 5: Partial Service Failure

**Symptoms:**
- Some endpoints work, others fail
- Intermittent errors
- Inconsistent behavior

**Rollback Steps:**

```bash
# 1. Test each endpoint
for endpoint in info script-status kismet-data; do
    echo "Testing /$endpoint..."
    curl -s http://localhost:8092/$endpoint > /dev/null && echo "✓ OK" || echo "✗ FAILED"
done

# 2. Check logs
tail -100 /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/spectrum-analyzer.log

# 3. Rollback if critical endpoints fail
if ! curl -s http://localhost:8092/info > /dev/null; then
    echo "Critical endpoint failed - rolling back"
    ./emergency-rollback.sh
fi
```

## Automated Rollback Monitoring

### Health Check Script

Create `/home/pi/webhook-health-check.sh`:

```bash
#!/bin/bash

# Configuration
NODE_URL="http://localhost:8092"
PYTHON_URL="http://localhost:5000"
MAX_RESPONSE_TIME=500  # milliseconds
MAX_RETRIES=3

# Health check function
check_endpoint() {
    local url=$1
    local endpoint=$2
    local start_time=$(date +%s%N)
    
    response=$(curl -s -w "\n%{http_code}" "${url}${endpoint}" 2>/dev/null)
    http_code=$(echo "$response" | tail -1)
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))  # Convert to ms
    
    if [[ "$http_code" != "200" ]]; then
        return 1
    fi
    
    if [[ $duration -gt $MAX_RESPONSE_TIME ]]; then
        return 2
    fi
    
    return 0
}

# Monitor Node.js service
monitor_service() {
    local failures=0
    
    for endpoint in "/info" "/script-status" "/kismet-data"; do
        if ! check_endpoint "$NODE_URL" "$endpoint"; then
            ((failures++))
            echo "$(date): Endpoint $endpoint failed" >> /var/log/webhook-monitor.log
        fi
    done
    
    if [[ $failures -gt 0 ]]; then
        echo "$(date): $failures endpoints failed - considering rollback" >> /var/log/webhook-monitor.log
        
        if [[ $failures -ge 2 ]]; then
            echo "$(date): Multiple failures detected - initiating rollback" >> /var/log/webhook-monitor.log
            /home/pi/emergency-rollback.sh
        fi
    fi
}

# Run monitoring
monitor_service
```

### Automated Rollback Trigger

Create systemd timer for monitoring:

```ini
# /etc/systemd/system/webhook-monitor.service
[Unit]
Description=Webhook Service Health Monitor
After=webhook-nodejs.service

[Service]
Type=oneshot
ExecStart=/home/pi/webhook-health-check.sh
User=pi

# /etc/systemd/system/webhook-monitor.timer
[Unit]
Description=Run webhook health check every minute
Requires=webhook-monitor.service

[Timer]
OnBootSec=60
OnUnitActiveSec=60

[Install]
WantedBy=timers.target
```

## Pre-Rollback Checklist

Before initiating rollback, collect this information:

```bash
#!/bin/bash
# Pre-rollback diagnostic collection

DIAG_DIR="/home/pi/rollback-diagnostics-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIAG_DIR"

# 1. Service status
systemctl status webhook-nodejs > "$DIAG_DIR/service-status.txt" 2>&1

# 2. Process list
ps aux > "$DIAG_DIR/process-list.txt"

# 3. Network status
netstat -tulpn > "$DIAG_DIR/network-ports.txt" 2>&1
iwconfig > "$DIAG_DIR/wifi-status.txt" 2>&1

# 4. Recent logs
journalctl -u webhook-nodejs -n 1000 > "$DIAG_DIR/systemd-logs.txt"
tail -1000 /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/spectrum-analyzer.log > "$DIAG_DIR/app-logs.txt" 2>/dev/null

# 5. API responses
curl -s http://localhost:8092/info > "$DIAG_DIR/api-info.json" 2>&1
curl -s http://localhost:8092/script-status > "$DIAG_DIR/api-status.json" 2>&1

# 6. System resources
free -m > "$DIAG_DIR/memory.txt"
df -h > "$DIAG_DIR/disk.txt"
top -b -n 1 > "$DIAG_DIR/top.txt"

echo "Diagnostics collected in: $DIAG_DIR"
```

## Post-Rollback Validation

After rollback, verify system functionality:

```bash
#!/bin/bash
# Post-rollback validation

echo "=== Post-Rollback Validation ==="

# 1. Check Python service running
if pgrep -f "webhook.py" > /dev/null; then
    echo "✓ Python webhook service running"
else
    echo "✗ Python webhook service NOT running"
    exit 1
fi

# 2. Test all endpoints
for endpoint in info script-status kismet-data; do
    if curl -s "http://localhost:5000/$endpoint" > /dev/null; then
        echo "✓ Endpoint /$endpoint responding"
    else
        echo "✗ Endpoint /$endpoint NOT responding"
    fi
done

# 3. Test service control
echo "Testing service control..."
curl -X POST http://localhost:5000/run-script
sleep 5

# 4. Check processes started
if pgrep -f "kismet" > /dev/null; then
    echo "✓ Kismet started successfully"
else
    echo "✗ Kismet failed to start"
fi

# 5. Check GPS
if gpspipe -w -n 1 2>/dev/null | grep -q "class"; then
    echo "✓ GPS data flowing"
else
    echo "✗ GPS data NOT flowing"
fi

# 6. Stop services
curl -X POST http://localhost:5000/stop-script

echo "=== Validation Complete ==="
```

## Rollback Communication Plan

### Immediate Actions
1. **Notify Team**
   ```bash
   echo "Webhook service rollback initiated at $(date)" | mail -s "URGENT: Webhook Rollback" team@example.com
   ```

2. **Update Status Page**
   ```bash
   echo "$(date): Webhook service reverted to Python implementation due to issues" >> /var/www/html/status.txt
   ```

3. **Log Incident**
   ```bash
   cat > "/home/pi/incidents/rollback-$(date +%Y%m%d-%H%M%S).md" << EOF
   # Webhook Service Rollback Incident
   
   Date: $(date)
   Service: Webhook (Node.js → Python)
   
   ## Symptoms
   [Document what went wrong]
   
   ## Actions Taken
   - Executed emergency rollback script
   - Restored Python webhook service
   - Validated functionality
   
   ## Root Cause
   [To be determined]
   
   ## Next Steps
   [Plan for fixing and re-attempting migration]
   EOF
   ```

## Rollback Prevention Strategies

### 1. Gradual Rollout
```nginx
# Use nginx to split traffic during migration
upstream webhook_backend {
    server localhost:5000 weight=90;  # Python - 90%
    server localhost:8092 weight=10;  # Node.js - 10%
}
```

### 2. Feature Flags
```javascript
// In Node.js service
const FEATURE_FLAGS = {
    USE_NEW_GPS_CLIENT: process.env.USE_NEW_GPS === 'true',
    USE_NEW_PROCESS_MANAGER: process.env.USE_NEW_PM === 'true'
};

// Gradual feature enablement
if (FEATURE_FLAGS.USE_NEW_GPS_CLIENT) {
    // New implementation
} else {
    // Fallback to Python-like implementation
}
```

### 3. Canary Deployment
```bash
# Run both services, route specific users to Node.js
if [[ "$REMOTE_ADDR" =~ ^192\.168\.1\. ]]; then
    # Local network - use Node.js
    proxy_pass http://localhost:8092;
else
    # External - use Python
    proxy_pass http://localhost:5000;
fi
```

## Recovery Time Objectives

| Scenario | Detection Time | Rollback Time | Total RTO |
|----------|---------------|---------------|-----------|
| API Format Error | < 1 minute | < 30 seconds | < 2 minutes |
| Process Failure | < 2 minutes | < 1 minute | < 3 minutes |
| Performance Issue | < 5 minutes | < 30 seconds | < 6 minutes |
| Complete Failure | Immediate | < 30 seconds | < 1 minute |

## Lessons Learned Documentation

After any rollback, document:

```markdown
## Rollback Post-Mortem

### What Happened
- Time of incident:
- First symptom noticed:
- Decision to rollback made:
- Rollback completed:

### Why It Happened
- Root cause:
- Contributing factors:
- What testing missed:

### How We Responded
- Detection method:
- Rollback procedure used:
- Time to recovery:

### What We're Doing About It
- Code fixes:
- Additional tests:
- Process improvements:

### Metrics
- Downtime:
- Users affected:
- Data loss:
```

## Final Notes

1. **Always Have Python Service Ready**
   - Keep webhook.py updated
   - Ensure Python dependencies installed
   - Test Python service monthly

2. **Practice Rollbacks**
   - Run rollback drills monthly
   - Time the process
   - Document any issues

3. **Monitor After Rollback**
   - Watch for 24 hours
   - Check all functionality
   - Gather user feedback

4. **Plan Re-Migration**
   - Fix identified issues
   - Add missing tests
   - Try again with lessons learned

Remember: **A successful rollback is better than a prolonged outage. Don't hesitate to rollback if issues arise.**
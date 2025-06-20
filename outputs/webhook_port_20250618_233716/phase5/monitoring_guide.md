# Webhook Service Production Monitoring Guide

**Service**: Stinkster Webhook Service  
**Version**: 1.0.0  
**Port**: 8002  
**Critical SLOs**: 99.9% uptime, <5s response time

## Monitoring Overview

This guide provides comprehensive monitoring strategies for the webhook service in production, including health checks, metrics, alerts, and troubleshooting procedures.

## Health Monitoring

### Primary Health Check

**Endpoint**: `http://localhost:8002/health`

```bash
# Basic health check
curl http://localhost:8002/health

# Automated health check script
#!/bin/bash
while true; do
  if ! curl -f -s http://localhost:8002/health > /dev/null; then
    echo "$(date): Health check failed!" | tee -a /home/pi/monitoring/health.log
    # Send alert (email, SMS, etc.)
  fi
  sleep 30
done
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "webhook",
  "uptime": 3600.123,
  "timestamp": "2025-06-18T12:00:00.000Z",
  "version": "1.0.0",
  "node": "v18.16.0"
}
```

### Service Status Monitoring

**Endpoint**: `http://localhost:8002/webhook/script-status`

Monitor the status of managed services:

```bash
# Check service status
STATUS=$(curl -s http://localhost:8002/webhook/script-status)
KISMET=$(echo $STATUS | jq -r '.kismet_running')
GPS=$(echo $STATUS | jq -r '.gps_running')
WIGLE=$(echo $STATUS | jq -r '.wigletotak_running')

if [ "$KISMET" != "true" ] || [ "$GPS" != "true" ] || [ "$WIGLE" != "true" ]; then
  echo "Service degraded: Kismet=$KISMET GPS=$GPS Wigle=$WIGLE"
fi
```

## System Metrics

### Resource Monitoring

1. **CPU Usage**:
   ```bash
   # Real-time CPU monitoring
   top -p $(pgrep -f webhook.js)

   # CPU usage percentage
   ps aux | grep webhook.js | grep -v grep | awk '{print $3}'
   ```

2. **Memory Usage**:
   ```bash
   # Memory in MB
   ps aux | grep webhook.js | grep -v grep | awk '{print $6/1024 " MB"}'

   # Detailed memory info
   cat /proc/$(pgrep -f webhook.js)/status | grep -E "VmRSS|VmSize"
   ```

3. **File Descriptors**:
   ```bash
   # Check open files
   lsof -p $(pgrep -f webhook.js) | wc -l

   # Monitor file descriptor usage
   watch -n 5 'lsof -p $(pgrep -f webhook.js) | wc -l'
   ```

### Network Monitoring

1. **Connection Count**:
   ```bash
   # Active connections to port 8002
   netstat -an | grep :8002 | grep ESTABLISHED | wc -l

   # WebSocket connections
   netstat -an | grep :8002 | grep -E "ESTABLISHED|TIME_WAIT" | wc -l
   ```

2. **Request Rate**:
   ```bash
   # Parse nginx access logs
   tail -n 1000 /var/log/nginx/access.log | \
     grep "/webhook/" | \
     awk '{print $4}' | \
     cut -d: -f1-3 | \
     sort | uniq -c
   ```

## Log Monitoring

### Application Logs

1. **systemd Logs**:
   ```bash
   # Recent logs
   journalctl -u webhook -n 100

   # Follow logs
   journalctl -u webhook -f

   # Logs with timestamp range
   journalctl -u webhook --since "1 hour ago"

   # Error logs only
   journalctl -u webhook -p err
   ```

2. **Winston Application Logs**:
   ```bash
   # Application log location
   tail -f /home/pi/stinkster/logs/webhook-*.log

   # Error logs
   grep ERROR /home/pi/stinkster/logs/webhook-*.log

   # Parse JSON logs
   jq '. | select(.level == "error")' /home/pi/stinkster/logs/webhook-*.log
   ```

### Log Analysis

**Common Log Patterns**:

```bash
# Count errors by type
grep ERROR /home/pi/stinkster/logs/webhook-*.log | \
  awk -F'"message":"' '{print $2}' | \
  cut -d'"' -f1 | \
  sort | uniq -c | sort -nr

# Response time analysis
grep "Response time" /home/pi/stinkster/logs/webhook-*.log | \
  awk '{print $NF}' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count "ms"}'

# Failed requests
grep -E "(failed|error|timeout)" /home/pi/stinkster/logs/webhook-*.log | wc -l
```

## Performance Monitoring

### Response Time Tracking

Create a monitoring script:

```bash
#!/bin/bash
# monitor_response_times.sh

ENDPOINTS=(
  "/health"
  "/webhook/script-status"
  "/webhook/info"
  "/webhook/kismet-data"
)

for endpoint in "${ENDPOINTS[@]}"; do
  RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}\n" http://localhost:8002$endpoint)
  echo "$(date +%Y-%m-%d\ %H:%M:%S) $endpoint: ${RESPONSE_TIME}s"
done
```

### WebSocket Monitoring

Monitor WebSocket connections:

```javascript
// ws_monitor.js
const io = require('socket.io-client');
const socket = io('http://localhost:8002');

socket.on('connect', () => {
  console.log(`Connected at ${new Date().toISOString()}`);
});

socket.on('disconnect', (reason) => {
  console.error(`Disconnected at ${new Date().toISOString()}: ${reason}`);
});

socket.on('error', (error) => {
  console.error(`Error at ${new Date().toISOString()}: ${error}`);
});

// Monitor latency
setInterval(() => {
  const start = Date.now();
  socket.emit('ping', () => {
    const latency = Date.now() - start;
    console.log(`Latency: ${latency}ms`);
  });
}, 5000);
```

## Alerting Rules

### Critical Alerts

1. **Service Down**:
   ```bash
   # Check every minute
   */1 * * * * curl -f -s http://localhost:8002/health || echo "Webhook service down!" | mail -s "CRITICAL: Webhook Down" admin@example.com
   ```

2. **High Memory Usage**:
   ```bash
   # Alert if memory > 200MB
   MEM=$(ps aux | grep webhook.js | grep -v grep | awk '{print $6}')
   if [ $MEM -gt 204800 ]; then
     echo "High memory usage: $((MEM/1024))MB" | mail -s "WARNING: High Memory" admin@example.com
   fi
   ```

3. **Error Rate Threshold**:
   ```bash
   # Alert if >10 errors in 5 minutes
   ERROR_COUNT=$(journalctl -u webhook --since "5 minutes ago" -p err | wc -l)
   if [ $ERROR_COUNT -gt 10 ]; then
     echo "High error rate: $ERROR_COUNT errors in 5 minutes" | mail -s "WARNING: High Errors" admin@example.com
   fi
   ```

### Warning Alerts

1. **Slow Response Times**:
   ```bash
   # Alert if response > 2 seconds
   RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8002/webhook/script-status)
   if (( $(echo "$RESPONSE_TIME > 2" | bc -l) )); then
     echo "Slow response time: ${RESPONSE_TIME}s" | mail -s "WARNING: Slow Response" admin@example.com
   fi
   ```

2. **Failed Service Starts**:
   ```bash
   # Monitor start failures
   grep "Failed to start" /home/pi/stinkster/logs/webhook-*.log | tail -n 1
   ```

## Dashboard Setup

### Simple Text Dashboard

Create `monitoring_dashboard.sh`:

```bash
#!/bin/bash
clear
while true; do
  echo "=== Webhook Service Monitor - $(date) ==="
  echo
  
  # Service Status
  echo "SERVICE STATUS:"
  systemctl is-active webhook
  
  # Health Check
  echo -e "\nHEALTH CHECK:"
  curl -s http://localhost:8002/health | jq -r '.status'
  
  # Resource Usage
  echo -e "\nRESOURCE USAGE:"
  ps aux | grep webhook.js | grep -v grep | awk '{printf "CPU: %s%% MEM: %.1fMB\n", $3, $6/1024}'
  
  # Connection Count
  echo -e "\nACTIVE CONNECTIONS:"
  netstat -an | grep :8002 | grep ESTABLISHED | wc -l
  
  # Recent Errors
  echo -e "\nRECENT ERRORS (last 5):"
  journalctl -u webhook -p err -n 5 --no-pager | tail -5
  
  # Managed Services
  echo -e "\nMANAGED SERVICES:"
  STATUS=$(curl -s http://localhost:8002/webhook/script-status)
  echo "Kismet: $(echo $STATUS | jq -r '.kismet_running')"
  echo "GPS: $(echo $STATUS | jq -r '.gps_running')"
  echo "WigleToTAK: $(echo $STATUS | jq -r '.wigletotak_running')"
  
  sleep 5
  clear
done
```

### Grafana Integration (Advanced)

1. **Install Grafana**:
   ```bash
   sudo apt-get install -y grafana
   sudo systemctl enable grafana-server
   sudo systemctl start grafana-server
   ```

2. **Configure Prometheus**:
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'webhook'
       static_configs:
         - targets: ['localhost:8002']
       metrics_path: '/metrics'
   ```

3. **Add metrics endpoint** to webhook service (future enhancement)

## Troubleshooting Procedures

### Service Won't Start

1. **Check logs**:
   ```bash
   journalctl -u webhook -n 50
   ```

2. **Verify configuration**:
   ```bash
   cd /home/pi/stinkster/src/nodejs/webhook-service
   node -c webhook.js  # Syntax check
   cat .env  # Check environment
   ```

3. **Port conflicts**:
   ```bash
   sudo lsof -i :8002
   ```

### High CPU Usage

1. **Identify hot paths**:
   ```bash
   # Profile the service
   sudo perf top -p $(pgrep -f webhook.js)
   ```

2. **Check for infinite loops**:
   ```bash
   # Look for rapid log entries
   journalctl -u webhook -f | grep -E "(loop|recursion|stack)"
   ```

### Memory Leaks

1. **Monitor growth**:
   ```bash
   # Track memory over time
   while true; do
     ps aux | grep webhook.js | grep -v grep | awk '{print strftime("%Y-%m-%d %H:%M:%S"), $6/1024 "MB"}'
     sleep 60
   done | tee memory_log.txt
   ```

2. **Analyze heap**:
   ```bash
   # Generate heap dump (requires --inspect flag)
   kill -USR2 $(pgrep -f webhook.js)
   ```

### WebSocket Issues

1. **Test connection**:
   ```bash
   # Use wscat to test
   npm install -g wscat
   wscat -c ws://localhost:8002/socket.io/\?transport=websocket
   ```

2. **Check nginx headers**:
   ```bash
   curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     http://localhost/socket.io/
   ```

## Maintenance Windows

### Planned Maintenance

1. **Pre-maintenance**:
   ```bash
   # Notify users
   echo "Maintenance starting in 5 minutes" | wall
   
   # Backup current state
   mkdir -p /home/pi/maintenance/$(date +%Y%m%d)
   cp -r /home/pi/stinkster/src/nodejs/webhook-service /home/pi/maintenance/$(date +%Y%m%d)/
   ```

2. **During maintenance**:
   ```bash
   # Stop service gracefully
   sudo systemctl stop webhook
   
   # Perform updates
   cd /home/pi/stinkster/src/nodejs/webhook-service
   npm update
   
   # Start service
   sudo systemctl start webhook
   ```

3. **Post-maintenance**:
   ```bash
   # Verify service health
   curl http://localhost:8002/health
   
   # Run integration tests
   node test_webhook.js
   ```

## Performance Baselines

### Expected Metrics

| Metric | Normal | Warning | Critical |
|--------|---------|----------|-----------|
| CPU Usage | <20% | 20-50% | >50% |
| Memory Usage | <100MB | 100-200MB | >200MB |
| Response Time (avg) | <100ms | 100-500ms | >500ms |
| Error Rate | <0.1% | 0.1-1% | >1% |
| WebSocket Latency | <10ms | 10-50ms | >50ms |
| Open File Descriptors | <100 | 100-500 | >500 |

### Capacity Planning

Monitor growth trends:

```bash
# Weekly report
echo "Weekly Capacity Report - $(date)"
echo "========================"
echo "Peak Connections: $(grep "connections" /var/log/webhook_metrics.log | awk '{print $2}' | sort -n | tail -1)"
echo "Avg Memory Usage: $(grep "memory" /var/log/webhook_metrics.log | awk '{sum+=$2; count++} END {print sum/count "MB"}')"
echo "Total Requests: $(grep -c "Request received" /home/pi/stinkster/logs/webhook-*.log)"
```

---

**Emergency Contact**: For critical issues, check logs first, then escalate as needed
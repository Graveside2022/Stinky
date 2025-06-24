#!/bin/bash
# Setup monitoring for Kismet Operations Center
# Configures health checks, alerts, and metrics collection

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SERVICE_NAME="kismet-operations-center"
MONITOR_DIR="/opt/kismet-operations-monitoring"
LOG_DIR="/var/log/kismet-operations"
HEALTH_CHECK_URL="http://localhost:3001/api/health"
ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

echo -e "${GREEN}Setting up monitoring for Kismet Operations Center${NC}"

# Create directories
mkdir -p "$MONITOR_DIR"/{scripts,configs,alerts}
mkdir -p "$LOG_DIR"

# Install monitoring dependencies
echo -e "${YELLOW}Installing monitoring tools...${NC}"
apt-get update
apt-get install -y \
    monit \
    prometheus-node-exporter \
    logrotate \
    mailutils \
    jq \
    curl

# Create health check script
cat > "$MONITOR_DIR/scripts/health-check.sh" << 'EOF'
#!/bin/bash
# Health check script for Kismet Operations Center

HEALTH_URL="http://localhost:3001/api/health"
TIMEOUT=10
LOG_FILE="/var/log/kismet-operations/health-check.log"

# Perform health check
response=$(curl -sf -w '\n%{http_code}' --connect-timeout $TIMEOUT "$HEALTH_URL" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

timestamp=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$http_code" = "200" ]; then
    echo "[$timestamp] Health check passed" >> "$LOG_FILE"
    exit 0
else
    echo "[$timestamp] Health check failed: HTTP $http_code" >> "$LOG_FILE"
    echo "$body" >> "$LOG_FILE"
    
    # Send alert
    /opt/kismet-operations-monitoring/scripts/send-alert.sh "Health check failed" "HTTP code: $http_code\n$body"
    
    exit 1
fi
EOF

# Create alert script
cat > "$MONITOR_DIR/scripts/send-alert.sh" << 'EOF'
#!/bin/bash
# Send alerts via email and Slack

SUBJECT="$1"
MESSAGE="$2"
ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Send email alert
if command -v mail &> /dev/null; then
    echo -e "Alert: Kismet Operations Center\n\n$MESSAGE" | mail -s "$SUBJECT" "$ALERT_EMAIL"
fi

# Send Slack alert
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"*Kismet Operations Alert*\n$SUBJECT\n\`\`\`$MESSAGE\`\`\`\"}" \
        "$SLACK_WEBHOOK" 2>/dev/null
fi

# Log alert
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERT: $SUBJECT - $MESSAGE" >> /var/log/kismet-operations/alerts.log
EOF

# Create metrics collection script
cat > "$MONITOR_DIR/scripts/collect-metrics.sh" << 'EOF'
#!/bin/bash
# Collect and export metrics for Kismet Operations Center

METRICS_FILE="/var/lib/prometheus/node-exporter/kismet-operations.prom"
METRICS_URL="http://localhost:3001/api/metrics"

# Get metrics from application
metrics=$(curl -sf "$METRICS_URL" 2>/dev/null)

if [ $? -eq 0 ]; then
    # Parse JSON metrics and convert to Prometheus format
    echo "$metrics" | jq -r '
        "# HELP kismet_operations_uptime_seconds Service uptime in seconds",
        "# TYPE kismet_operations_uptime_seconds gauge",
        "kismet_operations_uptime_seconds " + (.uptime|tostring),
        "",
        "# HELP kismet_operations_memory_usage_bytes Memory usage in bytes",
        "# TYPE kismet_operations_memory_usage_bytes gauge",
        "kismet_operations_memory_usage_bytes " + (.memory.heapUsed|tostring),
        "",
        "# HELP kismet_operations_cpu_usage_percent CPU usage percentage",
        "# TYPE kismet_operations_cpu_usage_percent gauge",
        "kismet_operations_cpu_usage_percent " + (.cpu.usage|tostring),
        "",
        "# HELP kismet_operations_active_connections Active WebSocket connections",
        "# TYPE kismet_operations_active_connections gauge",
        "kismet_operations_active_connections " + (.connections.active|tostring),
        "",
        "# HELP kismet_operations_request_rate Requests per second",
        "# TYPE kismet_operations_request_rate gauge",
        "kismet_operations_request_rate " + (.requests.rate|tostring)
    ' > "$METRICS_FILE.tmp"
    
    mv "$METRICS_FILE.tmp" "$METRICS_FILE"
fi

# Collect system metrics
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
memory_usage=$(free -m | awk 'NR==2{printf "%.2f", $3*100/$2}')
disk_usage=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

# Append system metrics
cat >> "$METRICS_FILE" << EOL

# HELP system_cpu_usage_percent System CPU usage
# TYPE system_cpu_usage_percent gauge
system_cpu_usage_percent $cpu_usage

# HELP system_memory_usage_percent System memory usage
# TYPE system_memory_usage_percent gauge
system_memory_usage_percent $memory_usage

# HELP system_disk_usage_percent Root disk usage
# TYPE system_disk_usage_percent gauge
system_disk_usage_percent $disk_usage
EOL
EOF

# Make scripts executable
chmod +x "$MONITOR_DIR/scripts/"*.sh

# Configure Monit
cat > "/etc/monit/conf.d/kismet-operations" << EOF
# Monit configuration for Kismet Operations Center

set daemon 30
set log /var/log/monit.log

set mail-format {
    from: monit@$(hostname)
    subject: Monit Alert - \$SERVICE \$EVENT
    message: \$EVENT Service \$SERVICE
             Date:        \$DATE
             Action:      \$ACTION
             Host:        \$HOST
             Description: \$DESCRIPTION
}

set alert $ALERT_EMAIL

# Monitor the service
check process kismet-operations with pidfile /run/kismet-operations-center.pid
    start program = "/bin/systemctl start kismet-operations-center"
    stop program = "/bin/systemctl stop kismet-operations-center"
    if failed host localhost port 3001 protocol http
        request "/api/health"
        with timeout 10 seconds
        for 3 cycles
    then restart
    if 3 restarts within 5 cycles then unmonitor
    if cpu usage > 80% for 5 cycles then alert
    if memory usage > 80% for 5 cycles then alert
    if failed uid pi then restart
    if failed gid pi then restart

# Monitor disk space
check filesystem rootfs with path /
    if space usage > 90% then alert

# Monitor system load
check system $(hostname)
    if loadavg (15min) > 4 then alert
    if memory usage > 85% then alert
    if cpu usage > 85% for 5 cycles then alert

# Monitor log file size
check file kismet-operations-log with path /var/log/kismet-operations/app.log
    if size > 100 MB then exec "/usr/sbin/logrotate -f /etc/logrotate.d/kismet-operations"
EOF

# Configure logrotate
cat > "/etc/logrotate.d/kismet-operations" << EOF
/var/log/kismet-operations/*.log {
    daily
    rotate 14
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
    create 0644 pi pi
    sharedscripts
    postrotate
        # Signal the application to reopen log files if needed
        systemctl reload kismet-operations-center 2>/dev/null || true
    endscript
}

/var/log/nginx/kismet-operations-*.log {
    daily
    rotate 14
    missingok
    notifempty
    compress
    delaycompress
    sharedscripts
    postrotate
        # Reload nginx to reopen log files
        nginx -s reload 2>/dev/null || true
    endscript
}
EOF

# Create systemd timer for metrics collection
cat > "/etc/systemd/system/kismet-operations-metrics.service" << EOF
[Unit]
Description=Collect Kismet Operations Center metrics
After=kismet-operations-center.service
Requires=kismet-operations-center.service

[Service]
Type=oneshot
ExecStart=$MONITOR_DIR/scripts/collect-metrics.sh
User=pi
Group=pi
EOF

cat > "/etc/systemd/system/kismet-operations-metrics.timer" << EOF
[Unit]
Description=Run Kismet Operations metrics collection every minute
After=kismet-operations-center.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min

[Install]
WantedBy=timers.target
EOF

# Create systemd timer for health checks
cat > "/etc/systemd/system/kismet-operations-health.service" << EOF
[Unit]
Description=Check Kismet Operations Center health
After=kismet-operations-center.service

[Service]
Type=oneshot
ExecStart=$MONITOR_DIR/scripts/health-check.sh
User=pi
Group=pi
EOF

cat > "/etc/systemd/system/kismet-operations-health.timer" << EOF
[Unit]
Description=Run Kismet Operations health check every 5 minutes
After=kismet-operations-center.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

# Enable and start monitoring services
echo -e "${YELLOW}Enabling monitoring services...${NC}"
systemctl daemon-reload
systemctl enable kismet-operations-metrics.timer
systemctl enable kismet-operations-health.timer
systemctl enable monit
systemctl enable prometheus-node-exporter

systemctl start kismet-operations-metrics.timer
systemctl start kismet-operations-health.timer
systemctl restart monit
systemctl restart prometheus-node-exporter

# Create monitoring dashboard info
cat > "$MONITOR_DIR/MONITORING_INFO.md" << EOF
# Kismet Operations Center Monitoring

## Overview
Monitoring is configured with the following components:

### Health Checks
- Automated health checks every 5 minutes via systemd timer
- Monit process monitoring with automatic restart
- Health endpoint: http://localhost:3001/api/health

### Metrics Collection
- Prometheus metrics exported to: /var/lib/prometheus/node-exporter/kismet-operations.prom
- Metrics collected every minute
- Application metrics endpoint: http://localhost:3001/api/metrics

### Alerts
- Email alerts to: $ALERT_EMAIL
- Slack webhook (if configured): $SLACK_WEBHOOK
- Alert log: /var/log/kismet-operations/alerts.log

### Log Management
- Automatic log rotation via logrotate
- 14 days retention
- Compression of old logs

### Monitoring Commands
\`\`\`bash
# Check service status
systemctl status kismet-operations-center
monit status kismet-operations

# View health check logs
tail -f /var/log/kismet-operations/health-check.log

# View alerts
tail -f /var/log/kismet-operations/alerts.log

# Test health check manually
$MONITOR_DIR/scripts/health-check.sh

# Collect metrics manually
$MONITOR_DIR/scripts/collect-metrics.sh

# View Prometheus metrics
curl http://localhost:9100/metrics | grep kismet_operations
\`\`\`

### Grafana Dashboard
Import the dashboard from: $MONITOR_DIR/configs/grafana-dashboard.json

### Troubleshooting
1. Check monit logs: tail -f /var/log/monit.log
2. Check systemd logs: journalctl -u kismet-operations-center -f
3. Test health endpoint: curl http://localhost:3001/api/health
4. Check timer status: systemctl list-timers | grep kismet-operations
EOF

# Create basic Grafana dashboard
cat > "$MONITOR_DIR/configs/grafana-dashboard.json" << 'EOF'
{
  "dashboard": {
    "title": "Kismet Operations Center",
    "panels": [
      {
        "title": "Service Uptime",
        "targets": [
          {"expr": "kismet_operations_uptime_seconds / 3600"}
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {"expr": "kismet_operations_memory_usage_bytes / 1024 / 1024"}
        ]
      },
      {
        "title": "CPU Usage",
        "targets": [
          {"expr": "kismet_operations_cpu_usage_percent"}
        ]
      },
      {
        "title": "Active Connections",
        "targets": [
          {"expr": "kismet_operations_active_connections"}
        ]
      },
      {
        "title": "Request Rate",
        "targets": [
          {"expr": "rate(kismet_operations_request_rate[5m])"}
        ]
      },
      {
        "title": "System Metrics",
        "targets": [
          {"expr": "system_cpu_usage_percent"},
          {"expr": "system_memory_usage_percent"},
          {"expr": "system_disk_usage_percent"}
        ]
      }
    ]
  }
}
EOF

# Set permissions
chown -R pi:pi "$MONITOR_DIR"
chown -R pi:pi "$LOG_DIR"

echo -e "${GREEN}Monitoring setup complete!${NC}"
echo -e "\nMonitoring information saved to: $MONITOR_DIR/MONITORING_INFO.md"
echo -e "Configure alerts by setting:"
echo -e "  - ALERT_EMAIL environment variable"
echo -e "  - SLACK_WEBHOOK environment variable"
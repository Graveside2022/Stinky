# Webhook Service Rollback Procedures

**Document Version**: 1.0.0  
**Service**: Stinkster Webhook Service  
**Risk Level**: Low (with proper procedures)  
**Estimated Rollback Time**: 5-10 minutes

## Overview

This document provides detailed rollback procedures for the webhook service migration. Follow these steps if critical issues arise after deploying the Node.js webhook service.

## Rollback Decision Matrix

| Issue Type | Severity | Rollback? | Alternative Action |
|------------|----------|-----------|-------------------|
| Service won't start | Critical | Yes | Try troubleshooting first (5 min) |
| High CPU usage (>80%) | High | Maybe | Try restart first |
| Memory leak | Medium | No | Monitor and plan fix |
| Slow responses | Medium | No | Investigate cause |
| WebSocket issues | Low | No | Fix in place |
| Missing features | Low | No | Quick patch |

## Pre-Rollback Checklist

Before initiating rollback:

1. **Document the issue**:
   ```bash
   # Capture current state
   echo "=== Rollback Reason: [DESCRIBE ISSUE] ===" > /home/pi/rollback_log_$(date +%Y%m%d_%H%M%S).txt
   
   # Save service logs
   journalctl -u webhook -n 1000 >> /home/pi/rollback_log_$(date +%Y%m%d_%H%M%S).txt
   
   # Save system state
   ps aux | grep -E "(webhook|node|kismet)" >> /home/pi/rollback_log_$(date +%Y%m%d_%H%M%S).txt
   netstat -tlnp >> /home/pi/rollback_log_$(date +%Y%m%d_%H%M%S).txt
   ```

2. **Notify stakeholders**:
   - Alert team of rollback decision
   - Estimated downtime: 5-10 minutes
   - Save any critical data if needed

3. **Locate backup files**:
   ```bash
   ls -la /home/pi/backups/webhook-migration-*/
   ```

## Quick Rollback Procedure (5 minutes)

### Step 1: Stop Node.js Service

```bash
# Stop the webhook service
sudo systemctl stop webhook

# Verify it's stopped
systemctl status webhook
ps aux | grep webhook.js  # Should return nothing

# Disable auto-start
sudo systemctl disable webhook
```

### Step 2: Restore Nginx Configuration

```bash
# Backup current (Node.js) config
sudo cp /etc/nginx/sites-enabled/default /home/pi/backups/nodejs-nginx-config.backup

# Restore Flask configuration
sudo cp /home/pi/backups/webhook-migration-[DATE]/default /etc/nginx/sites-enabled/default

# Or manually edit to restore Flask proxy
sudo nano /etc/nginx/sites-enabled/default
```

Original Flask webhook configuration:
```nginx
location /webhook/ {
    proxy_pass http://localhost:5000/webhook/;  # Or whatever port Flask used
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

```bash
# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Restart Flask Service

**Option A: If Flask was a systemd service**:
```bash
sudo systemctl start webhook-flask  # Or whatever the service was named
sudo systemctl enable webhook-flask
sudo systemctl status webhook-flask
```

**Option B: If Flask was run manually**:
```bash
# Navigate to Flask directory
cd /path/to/flask/webhook

# Start Flask (example - adjust as needed)
python webhook.py &

# Or with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 webhook:app &

# Save PID for management
echo $! > /home/pi/tmp/webhook-flask.pid
```

**Option C: If using screen/tmux**:
```bash
# Create new screen session
screen -S webhook-flask

# Inside screen, start Flask
cd /path/to/flask/webhook
python webhook.py

# Detach with Ctrl-A, D
```

### Step 4: Verify Flask is Working

```bash
# Test endpoints
curl http://localhost/webhook/script-status
curl http://localhost/webhook/info

# Check logs
tail -f /path/to/flask/logs/webhook.log  # Adjust path as needed
```

## Complete Rollback Procedure (10 minutes)

If quick rollback fails or more thorough rollback needed:

### Step 1: Full Service Cleanup

```bash
# Stop all webhook-related services
sudo systemctl stop webhook
pkill -f webhook.js
pkill -f node

# Remove Node.js service files
sudo rm /etc/systemd/system/webhook.service
sudo systemctl daemon-reload

# Clean up Node.js deployment
mv /home/pi/stinkster/src/nodejs/webhook-service /home/pi/backups/failed-deployment-$(date +%Y%m%d)
```

### Step 2: Restore Complete Flask Environment

```bash
# Restore Flask files from backup
cp -r /home/pi/backups/webhook-migration-[DATE]/webhook.py /path/to/flask/
cp -r /home/pi/backups/webhook-migration-[DATE]/templates /path/to/flask/
cp -r /home/pi/backups/webhook-migration-[DATE]/static /path/to/flask/

# Restore Python dependencies if needed
cd /path/to/flask
pip install -r requirements.txt  # If available

# Restore configuration files
cp /home/pi/backups/webhook-migration-[DATE]/config.py /path/to/flask/  # If applicable
```

### Step 3: Restore System Configuration

```bash
# Restore nginx completely
sudo cp /home/pi/backups/webhook-migration-[DATE]/nginx-sites-enabled-* /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# Restore any cron jobs
crontab -l > /tmp/current_cron
# Compare with backup and restore as needed

# Restore firewall rules if changed
sudo ufw status > /tmp/current_firewall
# Compare and restore as needed
```

### Step 4: Full System Verification

```bash
# Run comprehensive tests
echo "=== Testing Flask Webhook ==="

# Test all endpoints
for endpoint in script-status info kismet-data; do
    echo "Testing /webhook/$endpoint..."
    curl -s http://localhost/webhook/$endpoint | jq . || echo "FAILED"
done

# Test button functionality
echo "Testing START button..."
curl -X POST http://localhost/webhook/run-script -d "script_name=gps_kismet" -H "Content-Type: application/x-www-form-urlencoded"

# Monitor for 5 minutes
echo "Monitoring system for 5 minutes..."
for i in {1..30}; do
    curl -s http://localhost/webhook/script-status | jq -r '.kismet_running'
    sleep 10
done
```

## Emergency Procedures

### If Rollback Fails

1. **Check basic connectivity**:
   ```bash
   ping localhost
   curl http://localhost
   sudo systemctl status nginx
   ```

2. **Restart core services**:
   ```bash
   sudo systemctl restart nginx
   sudo systemctl restart gpsd
   # Restart any other critical services
   ```

3. **Manual service operation**:
   ```bash
   # Bypass webhook entirely if needed
   /home/pi/stinky/gps_kismet_wigle.sh start
   ```

### Recovery from Partial Rollback

If rollback was interrupted:

```bash
# 1. Stop everything
sudo systemctl stop webhook webhook-flask nginx
pkill -f webhook
pkill -f flask

# 2. Clean state
rm -f /home/pi/tmp/*.pid

# 3. Start fresh
sudo systemctl start nginx
# Then follow rollback steps from beginning
```

## Post-Rollback Tasks

### Immediate Actions

1. **Verify system stability**:
   ```bash
   # Monitor for 30 minutes
   watch -n 60 'curl -s http://localhost/webhook/script-status | jq .'
   ```

2. **Document issues**:
   ```bash
   # Create incident report
   cat > /home/pi/incident_report_$(date +%Y%m%d).md << EOF
   # Webhook Rollback Incident Report
   
   **Date**: $(date)
   **Duration**: [FILL IN]
   **Impact**: [FILL IN]
   
   ## Issue Description
   [Describe what went wrong]
   
   ## Root Cause
   [If known]
   
   ## Actions Taken
   1. Stopped Node.js service
   2. Restored nginx config
   3. Restarted Flask service
   
   ## Lessons Learned
   [What to do differently]
   EOF
   ```

3. **Notify stakeholders**:
   - Rollback complete
   - System operational
   - Plan for addressing issues

### Follow-up Actions

1. **Analyze failure**:
   ```bash
   # Review Node.js logs
   less /home/pi/rollback_log_*.txt
   
   # Check for common issues:
   grep -i "error\|fail\|timeout\|refused" /home/pi/rollback_log_*.txt
   ```

2. **Plan remediation**:
   - Fix identified issues
   - Update deployment procedures
   - Enhance testing

3. **Schedule retry**:
   - Address root causes
   - Test fixes in development
   - Plan new deployment window

## Rollback Verification Checklist

- [ ] Node.js service stopped
- [ ] Flask service running
- [ ] Nginx routing to Flask
- [ ] All endpoints responding
- [ ] Button functionality working
- [ ] GPS data available
- [ ] Kismet integration working
- [ ] No errors in logs
- [ ] System resources normal
- [ ] Users notified

## Common Issues and Solutions

### Issue: Flask won't start

```bash
# Check Python environment
which python
python --version

# Check for missing dependencies
cd /path/to/flask
python -c "import flask, requests"  # Add other imports

# Check port availability
sudo lsof -i :5000  # Or Flask port
```

### Issue: Nginx won't reload

```bash
# Check configuration syntax
sudo nginx -t

# Look for specific errors
sudo journalctl -u nginx -n 50

# Force reload if needed
sudo systemctl restart nginx
```

### Issue: Buttons not working after rollback

```bash
# Verify webhook is accessible
curl -v http://localhost/webhook/script-status

# Check orchestration script
ls -la /home/pi/stinky/gps_kismet_wigle.sh
/home/pi/stinky/gps_kismet_wigle.sh status

# Manually test script execution
cd /home/pi/stinky
./gps_kismet_wigle.sh start
```

## Support Contacts

- **Primary**: Check system logs first
- **Secondary**: Review backup files
- **Escalation**: Document issue thoroughly

---

**Remember**: A successful rollback is better than a broken production system. Don't hesitate to rollback if issues arise.
# Flask to Node.js Webhook Migration Plan

**Migration Version**: 1.0.0  
**Target Service**: webhook.py → webhook.js  
**Estimated Duration**: 30-45 minutes  
**Risk Level**: Low (with rollback plan)

## Overview

This document provides a detailed step-by-step migration plan to replace the Flask webhook.py service with the new Node.js webhook service. The migration is designed for zero downtime and includes rollback procedures.

## Pre-Migration Checklist

### System Requirements
- [ ] Node.js v14+ installed
- [ ] npm installed and working
- [ ] Port 8002 available
- [ ] 'pi' user has sudo permissions
- [ ] At least 100MB free disk space

### Backup Current System
```bash
# Create backup directory
mkdir -p /home/pi/backups/webhook-migration-$(date +%Y%m%d)
cd /home/pi/backups/webhook-migration-$(date +%Y%m%d)

# Backup Flask webhook
cp -r /path/to/webhook.py ./
cp -r /path/to/templates ./
cp -r /path/to/static ./

# Backup nginx configuration
sudo cp /etc/nginx/sites-enabled/* ./

# Backup current process states
ps aux | grep -E "(webhook|kismet|wigle)" > current_processes.txt
```

### Verify Current System
```bash
# Check Flask webhook status
curl http://localhost/webhook/script-status
curl http://localhost/webhook/info

# Document current ports
sudo netstat -tlnp | grep -E "(8000|8001|8002|80)" > current_ports.txt

# Save current nginx config
nginx -T > current_nginx_config.txt
```

## Migration Steps

### Phase 1: Deploy Node.js Service (No Impact)

1. **Deploy webhook service**:
   ```bash
   cd /home/pi/projects/stinkster_malone/stinkster/outputs/webhook_port_20250618_233716/phase3/webhook_implementation
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. **Configure environment**:
   ```bash
   cd /home/pi/stinkster/src/nodejs/webhook-service
   cp .env.example .env
   nano .env  # Update settings as needed
   ```

3. **Start service on port 8002**:
   ```bash
   sudo systemctl start webhook
   sudo systemctl status webhook
   ```

4. **Verify new service**:
   ```bash
   # Test health endpoint
   curl http://localhost:8002/health

   # Test API compatibility
   curl http://localhost:8002/webhook/script-status
   curl http://localhost:8002/webhook/info
   ```

### Phase 2: Parallel Testing (No Impact)

Run both services in parallel for testing:

1. **Test new endpoints directly**:
   ```bash
   # Compare responses
   echo "=== Flask Response ==="
   curl http://localhost/webhook/script-status | jq .
   
   echo "=== Node.js Response ==="
   curl http://localhost:8002/webhook/script-status | jq .
   ```

2. **Test button functionality**:
   - Open test_button_integration.html
   - Update URL to point to port 8002
   - Verify START/STOP operations work

3. **Load test** (optional):
   ```bash
   # Simple load test
   for i in {1..100}; do
     curl -s http://localhost:8002/webhook/script-status > /dev/null &
   done
   wait
   echo "Load test complete"
   ```

### Phase 3: Update Nginx (Service Cutover)

1. **Create new nginx config**:
   ```bash
   sudo cp /home/pi/stinkster/src/nodejs/webhook-service/nginx.conf.example \
           /etc/nginx/sites-available/stinkster-webhook-new
   ```

2. **Test nginx configuration**:
   ```bash
   sudo nginx -t
   ```

3. **Enable new configuration**:
   ```bash
   # Backup current config
   sudo cp /etc/nginx/sites-enabled/default /home/pi/backups/webhook-migration-$(date +%Y%m%d)/

   # Update webhook location block
   sudo nano /etc/nginx/sites-enabled/default
   ```

   Update the `/webhook/` location block:
   ```nginx
   location /webhook/ {
       proxy_pass http://localhost:8002/webhook/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection $connection_upgrade;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_buffering off;
   }
   ```

4. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

5. **Verify routing**:
   ```bash
   # Should now route to Node.js service
   curl http://localhost/webhook/script-status
   ```

### Phase 4: Disable Flask Service

1. **Stop Flask webhook** (if running as service):
   ```bash
   # If using systemd
   sudo systemctl stop webhook-flask
   sudo systemctl disable webhook-flask

   # If running via screen/tmux
   screen -ls  # Find webhook session
   screen -X -S [session-name] quit

   # If running directly
   ps aux | grep webhook.py
   kill [PID]
   ```

2. **Verify Flask is stopped**:
   ```bash
   ps aux | grep webhook.py  # Should return nothing
   sudo lsof -i :5000       # Or whatever port Flask was using
   ```

### Phase 5: Final Validation

1. **Test all endpoints via nginx**:
   ```bash
   # Run comprehensive test
   echo "Testing /webhook/script-status..."
   curl http://localhost/webhook/script-status | jq .

   echo "Testing /webhook/info..."
   curl http://localhost/webhook/info | jq .

   echo "Testing /webhook/kismet-data..."
   curl http://localhost/webhook/kismet-data | jq .
   ```

2. **Test button functionality**:
   - Access your normal UI
   - Click START button - verify no timeout
   - Click STOP button - verify immediate response
   - Check WebSocket updates work

3. **Monitor logs**:
   ```bash
   # Watch for any errors
   journalctl -u webhook -f
   ```

## Post-Migration Tasks

### Clean Up

1. **Remove Flask files** (after confirming stability):
   ```bash
   # After 24-48 hours of stable operation
   # mv /path/to/webhook.py /home/pi/backups/webhook-migration-$(date +%Y%m%d)/
   ```

2. **Update documentation**:
   - Update README files
   - Update system documentation
   - Note the service change in operations manual

### Update Monitoring

1. **Update health checks**:
   ```bash
   # Add to monitoring system
   http://localhost:8002/health
   ```

2. **Update alerts**:
   - Change alert endpoints
   - Update log file locations
   - Adjust threshold values if needed

### Performance Optimization

1. **Enable production optimizations**:
   ```bash
   cd /home/pi/stinkster/src/nodejs/webhook-service
   nano .env
   # Ensure NODE_ENV=production
   ```

2. **Monitor resource usage**:
   ```bash
   # Check memory usage
   ps aux | grep node

   # Monitor over time
   top -p $(pgrep -f webhook.js)
   ```

## Rollback Plan

If issues occur, follow these steps to rollback:

### Quick Rollback (< 5 minutes)

1. **Update nginx to point back to Flask**:
   ```bash
   # Restore original nginx config
   sudo cp /home/pi/backups/webhook-migration-$(date +%Y%m%d)/default \
           /etc/nginx/sites-enabled/default
   sudo systemctl reload nginx
   ```

2. **Start Flask service**:
   ```bash
   # Restart Flask webhook
   cd /path/to/flask/webhook
   python webhook.py &  # Or via systemd
   ```

3. **Stop Node.js service**:
   ```bash
   sudo systemctl stop webhook
   ```

### Full Rollback

See `rollback_procedures.md` for detailed steps.

## Success Criteria

Migration is successful when:

1. ✅ All webhook endpoints respond correctly via nginx
2. ✅ Button functionality works without timeouts
3. ✅ WebSocket connections establish properly
4. ✅ No errors in logs for 30 minutes
5. ✅ System resources stable (CPU/Memory)
6. ✅ All dependent services functioning normally

## Timeline

| Phase | Duration | Impact |
|-------|----------|---------|
| Pre-Migration | 15 min | None |
| Deploy Node.js | 10 min | None |
| Parallel Testing | 10 min | None |
| Nginx Update | 2 min | Service cutover |
| Flask Shutdown | 3 min | None (already cut over) |
| Validation | 5 min | None |
| **Total** | **45 min** | **2 min cutover** |

## Communication Plan

1. **Before Migration**:
   - Notify users of maintenance window
   - Expected duration: 45 minutes
   - Actual service impact: < 2 minutes

2. **During Migration**:
   - Monitor communication channel
   - Post updates at each phase

3. **After Migration**:
   - Confirm successful completion
   - Note any issues for users to watch for
   - Provide feedback channel

## Troubleshooting

### Common Issues

1. **Port 8002 already in use**:
   ```bash
   sudo lsof -i :8002
   # Kill the process or change port in .env
   ```

2. **Permission denied errors**:
   ```bash
   # Check file ownership
   sudo chown -R pi:pi /home/pi/stinkster/src/nodejs/webhook-service
   ```

3. **WebSocket not connecting**:
   - Check nginx configuration includes WebSocket headers
   - Verify CORS settings in .env
   - Check firewall rules

4. **Services not starting**:
   - Verify orchestration script path in .env
   - Check sudo permissions for pi user
   - Review service logs for specific errors

---

**Migration Support**: Monitor logs and be ready to rollback if needed
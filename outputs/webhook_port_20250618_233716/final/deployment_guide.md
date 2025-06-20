# Webhook Service Deployment Guide

**Version**: 1.0.0  
**Service**: Stinkster Webhook Service  
**Port**: 8002  
**Author**: Agent I - Integration Validator

## Prerequisites

Before deploying, ensure:

1. **Node.js**: Version 14.x or higher installed
   ```bash
   node --version  # Should be v14.0.0 or higher
   ```

2. **System User**: Deploy as 'pi' user (not root)
   ```bash
   whoami  # Should return 'pi'
   ```

3. **Required Directories**: 
   ```bash
   mkdir -p /home/pi/tmp
   mkdir -p /home/pi/kismet_ops
   mkdir -p /home/pi/stinkster/src/nodejs/webhook-service
   ```

4. **Port Availability**: Ensure port 8002 is free
   ```bash
   sudo lsof -i :8002  # Should return nothing
   ```

## Step-by-Step Deployment

### Step 1: Copy Service Files

From the implementation directory:

```bash
cd /home/pi/projects/stinkster_malone/stinkster/outputs/webhook_port_20250618_233716/phase3/webhook_implementation
```

Run the automated deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

**Manual Alternative**:
```bash
# Create deployment directory
DEPLOY_DIR="/home/pi/stinkster/src/nodejs/webhook-service"
mkdir -p "$DEPLOY_DIR"

# Copy all files
cp -r * "$DEPLOY_DIR/"
cd "$DEPLOY_DIR"
```

### Step 2: Install Dependencies

```bash
cd /home/pi/stinkster/src/nodejs/webhook-service
npm install --production
```

Expected output:
```
added 145 packages from 89 contributors in 12.456s
```

### Step 3: Configure Environment

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Edit configuration**:
   ```bash
   nano .env
   ```

3. **Key settings to verify**:
   ```env
   # Service Configuration
   WEBHOOK_PORT=8002
   WEBHOOK_HOST=0.0.0.0
   NODE_ENV=production

   # Service Paths
   ORCHESTRATION_SCRIPT=/home/pi/stinky/gps_kismet_wigle.sh
   PID_FILE=/home/pi/tmp/gps_kismet_wigle.pids
   KISMET_LOG=/home/pi/tmp/kismet.log
   WIGLETOTAK_LOG=/home/pi/tmp/wigletotak.log

   # Kismet Configuration
   KISMET_BASE_URL=http://localhost:2501
   KISMET_API_KEY=your-kismet-api-key-here
   KISMET_CSV_PATH=/home/pi/kismet_ops

   # CORS Origins (comma-separated)
   CORS_ORIGINS=http://localhost,http://localhost:8092
   ```

### Step 4: Test Service Manually

1. **Start in test mode**:
   ```bash
   node webhook.js
   ```

2. **Verify health endpoint**:
   ```bash
   # In another terminal
   curl http://localhost:8002/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "service": "webhook",
     "uptime": 2.345,
     "timestamp": "2025-06-18T12:00:00.000Z"
   }
   ```

3. **Stop test instance**: Press `Ctrl+C`

### Step 5: Install systemd Service

1. **Copy service file**:
   ```bash
   sudo cp webhook.service /etc/systemd/system/
   ```

2. **Reload systemd**:
   ```bash
   sudo systemctl daemon-reload
   ```

3. **Enable service**:
   ```bash
   sudo systemctl enable webhook
   ```

4. **Start service**:
   ```bash
   sudo systemctl start webhook
   ```

5. **Verify status**:
   ```bash
   sudo systemctl status webhook
   ```

   Expected output:
   ```
   ● webhook.service - Stinkster Webhook Service
      Loaded: loaded (/etc/systemd/system/webhook.service; enabled)
      Active: active (running) since...
      Main PID: 12345 (node)
   ```

### Step 6: Configure Nginx

1. **Copy nginx configuration**:
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/stinkster-webhook
   ```

2. **Enable site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/stinkster-webhook /etc/nginx/sites-enabled/
   ```

3. **Test nginx configuration**:
   ```bash
   sudo nginx -t
   ```

4. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

### Step 7: Verify Deployment

1. **Check service logs**:
   ```bash
   journalctl -u webhook -n 50 -f
   ```

2. **Test API endpoints**:
   ```bash
   # Status check
   curl http://localhost:8002/webhook/script-status

   # System info
   curl http://localhost:8002/webhook/info

   # Kismet data
   curl http://localhost:8002/webhook/kismet-data
   ```

3. **Test button functionality**:
   - Open `test_button_integration.html` in a web browser
   - Click START button - should see real-time updates
   - Click STOP button - should stop immediately

## Post-Deployment Checklist

- [ ] Service running: `systemctl is-active webhook`
- [ ] Port listening: `sudo lsof -i :8002`
- [ ] Nginx proxy working: `curl http://localhost/webhook/script-status`
- [ ] Logs rotating: Check `/home/pi/stinkster/logs/`
- [ ] WebSocket connection: Test with HTML page
- [ ] Button functionality: START/STOP working without timeout
- [ ] GPS data available: `/webhook/info` shows coordinates
- [ ] Kismet integration: `/webhook/kismet-data` returns data

## Service Management

### Starting/Stopping
```bash
# Start service
sudo systemctl start webhook

# Stop service
sudo systemctl stop webhook

# Restart service
sudo systemctl restart webhook

# View status
sudo systemctl status webhook
```

### Viewing Logs
```bash
# Recent logs
journalctl -u webhook -n 100

# Follow logs
journalctl -u webhook -f

# Logs since boot
journalctl -u webhook -b

# Application logs
tail -f /home/pi/stinkster/logs/webhook-*.log
```

### Troubleshooting

**Service won't start**:
```bash
# Check for port conflicts
sudo lsof -i :8002

# Check permissions
ls -la /home/pi/stinkster/src/nodejs/webhook-service

# Manual start for debugging
cd /home/pi/stinkster/src/nodejs/webhook-service
NODE_ENV=development node webhook.js
```

**WebSocket not connecting**:
```bash
# Check nginx WebSocket headers
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost/socket.io/

# Verify CORS settings in .env
grep CORS_ORIGINS .env
```

**Button timeout issues**:
```bash
# Check orchestration script
ls -la /home/pi/stinky/gps_kismet_wigle.sh

# Verify PID file location
ls -la /home/pi/tmp/

# Check service logs during button click
journalctl -u webhook -f
```

## Performance Tuning

### Optimize for Production

1. **Enable compression**:
   Already enabled in the service

2. **Set production environment**:
   ```bash
   # In .env file
   NODE_ENV=production
   ```

3. **Adjust timeouts for your environment**:
   ```env
   PROCESS_START_TIMEOUT=120000  # 2 minutes
   PROCESS_STOP_TIMEOUT=30000    # 30 seconds
   SERVICE_CHECK_RETRIES=30      # Number of health check retries
   ```

4. **Enable rate limiting** (optional):
   ```javascript
   // Uncomment in webhook.js if needed
   // app.use(rateLimit({ windowMs: 60000, max: 100 }));
   ```

## Monitoring

### Health Checks

Monitor service health:
```bash
# Simple health check
curl http://localhost:8002/health

# Detailed status
curl http://localhost:8002/webhook/script-status | jq .
```

### Metrics to Monitor

1. **Response Times**: Check nginx access logs
2. **Error Rate**: Monitor application logs
3. **Memory Usage**: `ps aux | grep node`
4. **CPU Usage**: `top -p $(pgrep -f webhook.js)`
5. **WebSocket Connections**: Check in application logs

## Security Hardening

1. **Firewall Rules**:
   ```bash
   # Only allow local connections to port 8002
   sudo ufw allow from 127.0.0.1 to any port 8002
   ```

2. **API Authentication** (future):
   - Consider adding API key authentication
   - Implement rate limiting per IP
   - Add request signing for critical operations

3. **Log Security**:
   - Ensure logs don't contain sensitive data
   - Set appropriate log rotation policies
   - Monitor for suspicious patterns

## Rollback Procedure

If issues arise, follow the rollback procedure in `rollback_procedures.md`

## Success Criteria

Deployment is successful when:

1. ✅ Service responds to health checks
2. ✅ All API endpoints return valid data
3. ✅ WebSocket connections establish properly
4. ✅ Button operations complete without timeout
5. ✅ No errors in service logs
6. ✅ Nginx proxy functioning correctly

---

**Support**: Check logs first, then refer to troubleshooting guide
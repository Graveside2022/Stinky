# Kismet Operations Center - Production Deployment Guide

## Overview
This guide covers the complete deployment process for Kismet Operations Center, including building, deploying, monitoring, and maintenance procedures.

## Prerequisites

### System Requirements
- Raspberry Pi 4 (4GB+ RAM recommended)
- Raspbian OS (Bullseye or newer)
- Node.js 18.x or newer
- nginx 1.18+
- systemd 247+
- 2GB free disk space

### Required Tools
```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y \
    nginx \
    build-essential \
    git \
    curl \
    jq \
    logrotate \
    monit
```

### Node.js Installation
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Quick Start

### 1. Build Production Version
```bash
cd /home/pi/projects/stinkster_christian/stinkster/src/nodejs/kismet-operations
./deploy/scripts/build-production.sh
```

### 2. Deploy to Production
```bash
sudo ./deploy/scripts/deploy.sh deploy
```

### 3. Setup Monitoring
```bash
sudo ./deploy/monitoring/setup-monitoring.sh
```

## Detailed Deployment Process

### Building for Production

1. **Run the build script:**
   ```bash
   ./deploy/scripts/build-production.sh
   ```

2. **Build outputs:**
   - Compiled TypeScript → JavaScript
   - Minified frontend assets
   - Optimized dependencies
   - Production configuration
   - Version information

3. **Build location:** `./dist/`

### Deployment Steps

1. **Initial deployment:**
   ```bash
   sudo ./deploy/scripts/deploy.sh deploy
   ```

2. **What happens during deployment:**
   - Current version backed up
   - Service gracefully stopped
   - New version deployed atomically
   - Service configuration updated
   - Health checks performed
   - Automatic rollback on failure

3. **Deployment locations:**
   - Application: `/opt/kismet-operations-center/current`
   - Backups: `/opt/kismet-operations-center/backups`
   - Logs: `/var/log/kismet-operations/`

### Configuration

#### Environment Variables
Create `/opt/kismet-operations-center/.env`:
```bash
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Kismet Configuration
KISMET_HOST=localhost
KISMET_PORT=2501
KISMET_USERNAME=kismet
KISMET_PASSWORD=your_secure_password

# Security
SESSION_SECRET=your_session_secret_here
CORS_ORIGINS=https://your-domain.com

# Performance
MAX_REQUEST_SIZE=50mb
WEBHOOK_TIMEOUT=30000
```

#### Nginx Configuration
1. **Install nginx config:**
   ```bash
   sudo cp deploy/nginx/kismet-operations.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/kismet-operations.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **SSL setup (Let's Encrypt):**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d kismet.yourdomain.com
   ```

### Service Management

#### Systemd Commands
```bash
# Start service
sudo systemctl start kismet-operations-center

# Stop service
sudo systemctl stop kismet-operations-center

# Restart service
sudo systemctl restart kismet-operations-center

# Check status
sudo systemctl status kismet-operations-center

# View logs
sudo journalctl -u kismet-operations-center -f

# Enable auto-start
sudo systemctl enable kismet-operations-center
```

#### Zero-Downtime Updates
```bash
# Deploy new version with automatic rollback on failure
sudo ./deploy/scripts/deploy.sh deploy

# Manual rollback to previous version
sudo ./deploy/scripts/deploy.sh rollback

# Rollback to specific backup
sudo ./deploy/scripts/deploy.sh rollback backup-20240123-143022
```

### Monitoring

#### Health Checks
- Endpoint: `http://localhost:3001/api/health`
- Automated checks every 5 minutes
- Automatic restart on failure
- Email/Slack alerts on issues

#### Metrics
- Prometheus endpoint: `http://localhost:3001/api/metrics`
- Node exporter: `http://localhost:9100/metrics`
- Custom metrics exported for Grafana

#### Log Files
```bash
# Application logs
/var/log/kismet-operations/app.log

# Health check logs
/var/log/kismet-operations/health-check.log

# Alert logs
/var/log/kismet-operations/alerts.log

# Nginx access logs
/var/log/nginx/kismet-operations-access.log

# Nginx error logs
/var/log/nginx/kismet-operations-error.log
```

### Troubleshooting

#### Service Won't Start
```bash
# Check logs
sudo journalctl -u kismet-operations-center -n 100

# Verify file permissions
ls -la /opt/kismet-operations-center/current/

# Test configuration
cd /opt/kismet-operations-center/current
sudo -u pi node server.js
```

#### Health Checks Failing
```bash
# Test health endpoint
curl -v http://localhost:3001/api/health

# Check if port is listening
sudo netstat -tlnp | grep 3001

# Review monit status
sudo monit status kismet-operations
```

#### High Resource Usage
```bash
# Check process stats
htop -p $(pgrep -f "node.*server.js")

# Review metrics
curl http://localhost:3001/api/metrics | jq .

# Check for memory leaks
sudo journalctl -u kismet-operations-center | grep -i "memory"
```

### Maintenance

#### Regular Tasks
1. **Weekly:**
   - Review error logs
   - Check disk space
   - Verify backups

2. **Monthly:**
   - Update dependencies
   - Review performance metrics
   - Clean old backups

3. **Quarterly:**
   - Security updates
   - Performance tuning
   - Capacity planning

#### Backup Management
```bash
# List backups
ls -la /opt/kismet-operations-center/backups/

# Manual backup
sudo ./deploy/scripts/deploy.sh status

# Restore from backup
sudo ./deploy/scripts/deploy.sh rollback backup-name
```

#### Log Rotation
Logs are automatically rotated daily with 14-day retention. Manual rotation:
```bash
sudo logrotate -f /etc/logrotate.d/kismet-operations
```

### Security Considerations

1. **Network Security:**
   - Use HTTPS with valid SSL certificates
   - Configure firewall rules
   - Restrict admin endpoints

2. **Application Security:**
   - Keep dependencies updated
   - Use strong passwords
   - Enable rate limiting
   - Configure CORS properly

3. **System Security:**
   - Regular OS updates
   - Minimize service permissions
   - Monitor for suspicious activity

### Performance Optimization

1. **Node.js Tuning:**
   ```bash
   # In systemd service file
   Environment="NODE_OPTIONS=--max-old-space-size=512"
   Environment="UV_THREADPOOL_SIZE=4"
   ```

2. **Nginx Caching:**
   - Static assets cached for 30 days
   - API responses cached for 5 minutes
   - WebSocket connections optimized

3. **Resource Limits:**
   - Memory limit: 1GB
   - CPU quota: 200%
   - Connection limits configured

### Integration with Other Services

#### Kismet Integration
Ensure Kismet is running and accessible:
```bash
# Check Kismet status
sudo systemctl status kismet

# Verify API access
curl -u kismet:password http://localhost:2501/system/status.json
```

#### TAK Server Integration
Configure webhook endpoints in the application for TAK data forwarding.

### Deployment Checklist

- [ ] Prerequisites installed
- [ ] Node.js 18+ available
- [ ] Build completed successfully
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Nginx configuration tested
- [ ] Service deployed and running
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Logs being collected
- [ ] Backups verified
- [ ] Documentation updated

### Support and Debugging

#### Debug Mode
```bash
# Run in debug mode
cd /opt/kismet-operations-center/current
NODE_ENV=development LOG_LEVEL=debug node server.js
```

#### Common Issues

1. **Port already in use:**
   ```bash
   sudo lsof -i :3001
   # Kill the process or change PORT in .env
   ```

2. **Permission denied:**
   ```bash
   # Fix ownership
   sudo chown -R pi:pi /opt/kismet-operations-center
   ```

3. **Module not found:**
   ```bash
   cd /opt/kismet-operations-center/current
   npm ci --production
   ```

### Version History
Track deployments in `/opt/kismet-operations-center/deployments.log`

### Contact
For issues or questions, check the logs first, then consult the development team.
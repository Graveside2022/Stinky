# Production Deployment Guide

This guide covers the production-ready features implemented for the Stinkster system.

## Security Features

### 1. Authentication & Authorization
- API key authentication for sensitive endpoints
- Rate limiting to prevent abuse
- Input validation and sanitization
- Path traversal protection

### 2. Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy
- Strict-Transport-Security (HTTPS only)

### 3. Configuration
```bash
# Copy and configure production environment
cp .env.production.example .env.production
# Edit with your secure values
```

## Error Tracking

### GlitchTip Integration
Open-source Sentry alternative for error tracking:

1. Set up GlitchTip instance (self-hosted or cloud)
2. Configure DSN in `.env.production`:
   ```
   GLITCHTIP_DSN=https://your-key@your-instance.com/1
   ```

### Local Error Logging
- Errors are logged to `/var/log/stinkster/errors.json`
- Automatic rotation and retention
- Structured JSON format for analysis

## Monitoring

### Prometheus Metrics
- HTTP request metrics (count, duration)
- WiFi device scanning metrics
- GPS status metrics
- HackRF signal strength metrics
- System metrics (CPU, memory, disk)

Access metrics at: `http://localhost:9090/metrics`

### Health Checks
```bash
curl http://localhost:8000/health
```

## Backup & Restore

### Automatic Backups
- Daily backups at 2 AM
- 30-day retention
- Compressed archives with checksums

### Manual Backup
```bash
python3 integration/backup/backup_manager.py --backup
```

### Restore
```bash
# List available backups
python3 integration/backup/backup_manager.py --list

# Restore specific backup
python3 integration/backup/backup_manager.py --restore backup_scheduled_20250623_020000
```

## Deployment

### Quick Deploy
```bash
# Run full production deployment
sudo python3 integration/deploy_production.py --deploy
```

### Manual Steps

1. **Install Dependencies**
   ```bash
   pip install -r requirements-production.txt
   ```

2. **Generate Secrets**
   ```bash
   python3 integration/deploy_production.py --secrets
   ```

3. **Run Security Audit**
   ```bash
   python3 integration/deploy_production.py --audit
   ```

4. **Start Services**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now stinkster-wigletotak
   sudo systemctl enable --now stinkster-spectrum
   sudo systemctl enable --now stinkster-gps
   ```

## Service Management

### Check Status
```bash
sudo systemctl status stinkster-*
```

### View Logs
```bash
# All services
sudo journalctl -u stinkster-* -f

# Specific service
sudo journalctl -u stinkster-wigletotak -f
```

### Restart Services
```bash
sudo systemctl restart stinkster-wigletotak
```

## Security Best Practices

1. **Regular Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade
   
   # Update Python packages
   pip install --upgrade -r requirements-production.txt
   ```

2. **Monitor Logs**
   - Check `/var/log/stinkster/audit.log` for security events
   - Review error logs for suspicious activity

3. **Backup Verification**
   - Test restore procedures monthly
   - Verify backup integrity

4. **API Key Rotation**
   - Rotate API keys quarterly
   - Update in `.env.production`

## Troubleshooting

### Service Won't Start
```bash
# Check logs
sudo journalctl -u stinkster-wigletotak -n 50

# Check permissions
ls -la /var/log/stinkster/
ls -la /var/lib/stinkster/
```

### High Memory Usage
```bash
# Check metrics
curl -H "X-API-Key: your-api-key" http://localhost:8000/metrics

# Restart service
sudo systemctl restart stinkster-wigletotak
```

### Backup Failures
```bash
# Check backup logs
tail -f /var/log/stinkster/backup.log

# Run manual backup with debug
python3 integration/backup/backup_manager.py --backup --debug
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Secrets generated (not default values)
- [ ] Firewall rules applied
- [ ] Services enabled and running
- [ ] Backups scheduled and tested
- [ ] Monitoring endpoints accessible
- [ ] Error tracking configured
- [ ] Log rotation configured
- [ ] Security audit passed
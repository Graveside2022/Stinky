# WigleToTAK Deployment

Production deployment scripts and configuration for WigleToTAK.

## Quick Start

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Build and deploy
./scripts/quick-deploy.sh
```

## Directory Structure

```
deploy/
├── scripts/           # Deployment scripts
├── config/           # Configuration templates
├── systemd/          # Service definitions
├── nginx/            # Web server config
└── builds/           # Build artifacts
```

## Deployment Process

1. **Build**: `./scripts/build-production.sh`
2. **Deploy**: `sudo ./scripts/deploy.sh deploy builds/wigletotak_latest.tar.gz`
3. **Monitor**: `./scripts/health-check.sh`

## Commands

### Build
```bash
./scripts/build-production.sh
```

### Deploy
```bash
sudo ./scripts/deploy.sh deploy <package.tar.gz>
```

### Rollback
```bash
sudo ./scripts/deploy.sh rollback
```

### Health Check
```bash
./scripts/health-check.sh check
```

## Configuration

1. Copy environment template:
   ```bash
   sudo cp config/environment.template /etc/wigletotak/environment
   sudo vim /etc/wigletotak/environment
   ```

2. Configure Nginx (if needed):
   ```bash
   sudo vim /etc/nginx/sites-available/wigletotak.conf
   ```

3. Set up log rotation:
   ```bash
   sudo cp config/logrotate.conf /etc/logrotate.d/wigletotak
   ```

## Monitoring

- Service: `systemctl status wigletotak`
- Logs: `journalctl -u wigletotak -f`
- Health: `curl http://localhost:8001/health`

## Troubleshooting

### Service Won't Start
```bash
# Check logs
journalctl -u wigletotak -n 50

# Check permissions
ls -la /opt/wigletotak

# Test manually
cd /opt/wigletotak/backend
node dist/server.js
```

### Nginx Issues
```bash
# Test config
nginx -t

# Check logs
tail -f /var/log/nginx/wigletotak_error.log
```
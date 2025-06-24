# Kismet Operations Center - Deployment

Quick deployment commands for production use.

## Quick Deploy

```bash
# Full deployment (build + deploy)
./quick-deploy.sh

# Deploy without rebuild
./quick-deploy.sh --skip-build

# Deploy without tests
./quick-deploy.sh --skip-tests

# Force deployment despite failures
./quick-deploy.sh --force
```

## Manual Steps

### 1. Build
```bash
./scripts/build-production.sh
```

### 2. Deploy
```bash
sudo ./scripts/deploy.sh deploy
```

### 3. Validate
```bash
sudo ./scripts/validate-deployment.sh
```

## Management

```bash
# Check status
sudo ./scripts/deploy.sh status

# Rollback
sudo ./scripts/deploy.sh rollback

# Setup monitoring
sudo ./monitoring/setup-monitoring.sh
```

## Service Control

```bash
# Start/stop/restart
sudo systemctl start kismet-operations-center
sudo systemctl stop kismet-operations-center
sudo systemctl restart kismet-operations-center

# View logs
sudo journalctl -u kismet-operations-center -f
```

## Directories

- `scripts/` - Deployment and build scripts
- `systemd/` - Service configuration
- `nginx/` - Web server configuration  
- `monitoring/` - Health checks and metrics

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed documentation.
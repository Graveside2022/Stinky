# OpenWebRX with HackRF Support - Automated Installation

OpenWebRX is now automatically installed and configured as part of the main Stinkster installation process. This guide covers post-installation configuration, management, and troubleshooting.

## Features

- **Automated installation** via `install.sh` script
- **Native HackRF driver** support (not just SoapySDR)
- **Pre-configured frequency profiles** for common bands
- **Optimized gain settings** for HackRF (VGA, LNA, AMP)
- **Persistent configuration** using Docker volumes
- **Health checks** and automatic restart
- **Resource limits** suitable for Raspberry Pi

## Automated Installation

OpenWebRX is automatically installed when you run:

```bash
# From the stinkster project root
./install.sh
```

The installation process:
1. Detects HackRF hardware automatically
2. Creates optimized Docker configuration
3. Builds custom OpenWebRX image with HackRF support
4. Configures frequency profiles for common bands
5. Sets up management scripts
6. Starts the service automatically

## Quick Start (Post-Installation)

1. **Verify HackRF connection**:
   ```bash
   lsusb | grep -i hackrf
   # Should show: Bus 001 Device 005: ID 1d50:6089 OpenMoko, Inc. Great Scott Gadgets HackRF One SDR
   ```

2. **Start OpenWebRX** (if not already running):
   ```bash
   ./start-openwebrx.sh
   ```

3. **Access the web interface**:
   - URL: `http://<raspberry-pi-ip>:8073`
   - Username: `admin`
   - Password: `hackrf`

## Management Scripts

The installation creates several management scripts:

```bash
./start-openwebrx.sh           # Quick start with automatic configuration
./rebuild-openwebrx-docker.sh  # Complete rebuild with latest optimizations
./verify-openwebrx-config.sh   # Verify configuration and HackRF detection
./load-openwebrx-backup.sh     # Restore from backup configuration
```

## Pre-configured Frequency Profiles

The automated installation creates these HackRF-optimized profiles:

1. **2m Amateur Band** (145 MHz)
   - NFM mode, 2.4 MHz bandwidth
   - Gain: VGA=35, LNA=40, AMP=0

2. **70cm Amateur Band** (435 MHz)
   - NFM mode, 2.4 MHz bandwidth
   - Gain: VGA=35, LNA=40, AMP=0

3. **Airband** (125 MHz)
   - AM mode, 2.4 MHz bandwidth
   - Gain: VGA=30, LNA=35, AMP=0

4. **Marine VHF** (157 MHz)
   - NFM mode, 2.4 MHz bandwidth
   - Gain: VGA=32, LNA=38, AMP=0

5. **Wide Spectrum Scanner** (400 MHz)
   - NFM mode, 8 MHz bandwidth
   - Gain: VGA=40, LNA=40, AMP=1

## Service Management

OpenWebRX starts automatically via systemd service:

```bash
# Check status
systemctl status stinkster

# Start/stop the main service (includes OpenWebRX)
sudo systemctl start stinkster
sudo systemctl stop stinkster

# Direct Docker management
docker-compose up -d        # Start OpenWebRX container
docker-compose down         # Stop OpenWebRX container
docker-compose restart      # Restart OpenWebRX container
```

## Troubleshooting

### HackRF Not Detected

1. **Check USB connection**:
   ```bash
   lsusb | grep 1d50:6089
   ```

2. **Verify configuration**:
   ```bash
   ./verify-openwebrx-config.sh
   ```

3. **Test HackRF in container**:
   ```bash
   docker exec openwebrx hackrf_info
   ```

4. **Check container logs**:
   ```bash
   docker logs -f openwebrx
   ```

### OpenWebRX Not Starting

1. **Check Docker service**:
   ```bash
   sudo systemctl status docker
   sudo systemctl start docker
   ```

2. **Rebuild container** (if corrupted):
   ```bash
   ./rebuild-openwebrx-docker.sh
   ```

3. **Check for port conflicts**:
   ```bash
   sudo netstat -tlnp | grep :8073
   ```

### Permission Issues

The container runs with appropriate permissions. If you encounter USB permission issues:

1. **Ensure proper group membership**:
   ```bash
   sudo usermod -aG plugdev,docker pi
   # Log out and back in for group changes to take effect
   ```

2. **Reload udev rules**:
   ```bash
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

3. **Restart container**:
   ```bash
   docker-compose restart
   ```

### Configuration Issues

1. **Reset to default configuration**:
   ```bash
   # Back up current config
   cp docker-compose.yml docker-compose.yml.backup
   
   # Restore from backup
   ./load-openwebrx-backup.sh
   ```

2. **Apply custom configuration**:
   ```bash
   # Edit configuration files in project root
   vim docker-compose.yml
   docker-compose restart
   ```

### Performance Issues

1. **Check system resources**:
   ```bash
   htop
   df -h
   ```

2. **Adjust container resources** (edit docker-compose.yml):
   ```yaml
   deploy:
     resources:
       limits:
         memory: 1G
         cpus: '2.0'
   ```

3. **Monitor container resource usage**:
   ```bash
   docker stats openwebrx
   ```

## Configuration Files

Key configuration files created by the installation:

- `docker-compose.yml` - Container orchestration
- `docker/Dockerfile` - Custom OpenWebRX image with HackRF support
- Config templates in `config/templates/`:
  - `docker-compose.template.yml`
  - SDR configuration templates

## Post-Installation Configuration

### Customizing Frequency Profiles

Edit the SDR configuration via the web interface or by modifying configuration files:

1. **Via web interface**:
   - Navigate to Settings > SDR Configuration
   - Add custom frequency profiles
   - Adjust gain settings for your environment

2. **Via configuration files**:
   ```bash
   # Edit SDR configuration
   docker exec -it openwebrx vi /var/lib/openwebrx/sdrs.json
   # Restart to apply changes
   docker-compose restart
   ```

### Band Definitions

Customize band definitions for your region:

```bash
# Edit band configuration
docker exec -it openwebrx vi /var/lib/openwebrx/bands.json
```

### Environment Variables

Configure via `.env` file in project root:

```bash
OPENWEBRX_PORT=8073
OPENWEBRX_ADMIN_USER=admin
OPENWEBRX_ADMIN_PASSWORD=hackrf
OPENWEBRX_MAX_CLIENTS=20
```

## Integration with Stinkster

OpenWebRX integrates seamlessly with the Stinkster system:

- **Automatic startup**: Starts with other Stinkster services via systemd
- **Port 8073**: Web SDR interface
- **HackRF sharing**: Coordinates with spectrum analyzer component
- **Docker network**: Uses `stinkster_network` for service integration
- **Logging**: Integrated with main Stinkster logging system

## Backup and Recovery

### Create Configuration Backup

```bash
# Create timestamped backup
./apply-hackrf-config.sh backup

# Manual backup
docker run --rm -v openwebrx_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/openwebrx_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### Restore Configuration

```bash
# Restore from backup
./load-openwebrx-backup.sh

# Manual restore (replace backup_file.tar.gz with your backup)
docker run --rm -v openwebrx_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/backup_file.tar.gz -C /data
docker-compose restart
```

## Updates and Maintenance

### Update OpenWebRX

```bash
# Update to latest image
docker-compose pull
docker-compose up -d

# Rebuild with latest optimizations
./rebuild-openwebrx-docker.sh
```

### System Maintenance

```bash
# Check service health
./verify-openwebrx-config.sh

# View resource usage
docker stats openwebrx

# Clean up old images
docker system prune -f
```

## Notes

- Native HackRF driver provides better performance than SoapySDR
- Container includes both drivers for maximum compatibility
- Gain settings are optimized for HackRF but adjustable via web interface
- Health checks run every 30 seconds to ensure service responsiveness
- Configuration persists across container restarts via Docker volumes
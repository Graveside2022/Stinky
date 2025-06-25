# Docker Configuration

This directory contains the working Docker Compose configuration for OpenWebRX with HackRF support.

## Files

### docker-compose.yml

**Purpose:** Primary Docker deployment configuration for OpenWebRX with HackRF One

**Key Features:**
- Uses official OpenWebRX image (`jketterl/openwebrx:latest`)
- Proper USB device mounting for HackRF access
- Privileged container mode for hardware access
- Comprehensive health checking
- Resource limits to prevent system overload

**Critical Settings:**

```yaml
# USB Device Access
devices:
  - "/dev/bus/usb:/dev/bus/usb:rw"

# Required for hardware access
privileged: true

# Port mapping
ports:
  - "8073:8073"

# Configuration and logs
volumes:
  - "./config:/var/lib/openwebrx:rw"
  - "./logs:/var/log/openwebrx:rw"
```

**Do NOT Modify:**
- Device mounting paths
- Privileged mode setting
- Container name (used by scripts)
- Group add values (required for USB access)

**Safe to Modify:**
- Port mapping (change host port if needed)
- Resource limits (memory/CPU)
- Admin credentials
- Log retention settings

## Usage

1. **Prerequisites:**
   - HackRF connected via USB: `lsusb | grep 1d50:6089`
   - Docker and Docker Compose installed
   - Configuration files in `./config/` directory

2. **Start Service:**
   ```bash
   docker-compose up -d
   ```

3. **Check Status:**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

4. **Stop Service:**
   ```bash
   docker-compose down
   ```

## Troubleshooting

**Container won't start:**
- Check Docker daemon: `sudo systemctl status docker`
- Verify HackRF connection: `lsusb | grep 1d50:6089`
- Check configuration syntax: `docker-compose config`

**HackRF not detected in container:**
- Verify USB mounting: `docker exec openwebrx-hackrf lsusb`
- Check privileged mode is enabled
- Ensure udev rules are properly mounted

**Permission issues:**
- Check PUID/PGID environment variables
- Verify container user groups (dialout, audio, plugdev)
- Check host system USB permissions

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| OPENWEBRX_ADMIN_USER | admin | Admin username |
| OPENWEBRX_ADMIN_PASSWORD | hackrf | Admin password |
| OPENWEBRX_DEBUG | 1 | Debug logging |
| PUID | 1000 | User ID for container |
| PGID | 1000 | Group ID for container |

## Resource Limits

Current limits are suitable for Raspberry Pi 4:

```yaml
deploy:
  resources:
    limits:
      memory: 1G      # Maximum memory usage
      cpus: '2.0'     # Maximum CPU cores
    reservations:
      memory: 256M    # Guaranteed memory
      cpus: '0.5'     # Guaranteed CPU
```

Adjust based on your hardware:
- **Raspberry Pi 3:** Reduce to 512M memory, 1.0 CPU
- **Desktop PC:** Increase to 2G memory, 4.0 CPU
- **High-traffic setup:** Increase reservations

## Health Check

The configuration includes automatic health monitoring:

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8073/ || exit 1"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Timeout after 10 seconds
  retries: 5         # Retry 5 times before marking unhealthy
  start_period: 120s # Wait 2 minutes before first check
```

Monitor health with:
```bash
docker-compose ps  # Shows health status
docker inspect openwebrx-hackrf | grep Health -A 10
```

## Security Considerations

**Current Security Level:** Development/Local Use

**For Production:**
1. Change default credentials
2. Bind to localhost only: `"127.0.0.1:8073:8073"`
3. Use reverse proxy with SSL
4. Disable debug mode
5. Implement log rotation

## Network Configuration

**Current:** Bridge networking (default)
**Alternative:** Custom network for isolation

```yaml
networks:
  sdr_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  openwebrx:
    networks:
      - sdr_network
```

## Integration with Host Scripts

This configuration is designed to work with:
- `../scripts/start-openwebrx.sh` - Startup automation
- `../scripts/build-openwebrx-hackrf.sh` - Build automation
- Health monitoring scripts
- Log rotation utilities

## Maintenance

**Regular Tasks:**
- Update image: `docker-compose pull && docker-compose up -d`
- Check logs: `docker-compose logs --tail=100`
- Monitor resources: `docker stats openwebrx-hackrf`
- Backup configuration: `tar -czf config-backup.tar.gz config/`

**Troubleshooting Commands:**
```bash
# Container shell access
docker exec -it openwebrx-hackrf bash

# Check HackRF in container
docker exec openwebrx-hackrf hackrf_info

# Test SoapySDR
docker exec openwebrx-hackrf SoapySDRUtil --find

# View startup logs
docker logs openwebrx-hackrf --since=10m
```

---

**Status:** ✅ Verified Working  
**Last Updated:** 2025-06-15  
**Tested With:** Docker 24.0+, HackRF One, Raspberry Pi 4
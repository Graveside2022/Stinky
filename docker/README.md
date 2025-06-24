# OpenWebRX Docker Setup for HackRF

This directory contains a Docker Compose configuration for running OpenWebRX with HackRF support.

## Quick Start

1. **Ensure HackRF is connected:**

   ```bash
   lsusb | grep 1d50:6089
   # Should show: Great Scott Gadgets HackRF One SDR
   ```

2. **Start the container:**

   ```bash
   cd /home/pi/projects/stinkster/docker
   docker-compose up -d
   ```

3. **Access the web interface:**

   - URL: http://localhost:8073 (or your Pi's IP:8073)
   - Username: `admin`
   - Password: `hackrf`

4. **Test the setup:**
   ```bash
   ./test-hackrf-docker.sh
   ```

## Key Features

### Improved USB Device Access

- **Proper USB mounting:** `/dev/bus/usb:/dev/bus/usb:rw`
- **System integration:** Mounts udev rules and system USB info
- **Group permissions:** Adds container user to `plugdev` group (GID 46)
- **Privileged mode:** Required for USB device access

### Official OpenWebRX Image

- Uses `jketterl/openwebrx:latest` (official, maintained image)
- No custom build required - faster startup
- Regular security updates from upstream

### Enhanced Security & Capabilities

- **Specific capabilities:** Only required capabilities added
- **AppArmor unconfined:** For USB device access
- **User/Group mapping:** Maps to pi user (1000:1000)
- **Resource limits:** Prevents system overload

### Comprehensive Monitoring

- **Extended healthcheck:** 120s startup period, 5 retries
- **Proper logging:** Dedicated logs directory
- **Resource monitoring:** CPU and memory limits
- **Init process:** Proper signal handling

## Configuration Files

### SDR Configuration (`config/sdrs.json`)

Pre-configured HackRF profiles:

- **2m Ham Band** (145 MHz) - FM voice
- **70cm Ham Band** (433 MHz) - FM voice
- **70cm Repeaters** (439 MHz) - Repeater outputs
- **FM Broadcast** (100 MHz) - Wide FM
- **Aviation Band** (120 MHz) - AM voice
- **Marine VHF** (156.8 MHz) - Maritime comms

### User Configuration (`config/users.json`)

- Default admin user with secure password hash
- No password change required on first login

## Troubleshooting

### HackRF Not Detected

1. **Check USB connection:**

   ```bash
   lsusb | grep 1d50:6089
   hackrf_info
   ```

2. **Check permissions:**

   ```bash
   ls -la /dev/bus/usb/001/
   # HackRF device should be in plugdev group
   ```

3. **Restart container:**
   ```bash
   docker-compose restart
   ```

### Container Won't Start

1. **Check Docker daemon:**

   ```bash
   sudo systemctl status docker
   docker ps
   ```

2. **Check logs:**

   ```bash
   docker-compose logs
   ```

3. **Verify configuration:**
   ```bash
   docker-compose config
   ```

### Web Interface Not Accessible

1. **Check container status:**

   ```bash
   docker-compose ps
   ```

2. **Check port binding:**

   ```bash
   netstat -tlnp | grep 8073
   ```

3. **Test locally:**
   ```bash
   curl -I http://localhost:8073
   ```

### Alternative Device Mounting

If the standard USB bus mounting doesn't work, try specific device mounting:

1. **Find HackRF device number:**

   ```bash
   lsusb | grep 1d50:6089
   # Note the device number (e.g., 005)
   ```

2. **Edit docker-compose.yml:**
   ```yaml
   devices:
     - '/dev/bus/usb/001/005:/dev/bus/usb/001/005:rw'
   ```

## Commands Reference

### Container Management

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Execute commands in container
docker-compose exec openwebrx bash
```

### HackRF Testing

```bash
# Test HackRF connection
hackrf_info

# Test inside container
docker-compose exec openwebrx hackrf_info

# Test SDR detection
docker-compose exec openwebrx SoapySDRUtil --find
```

### Configuration Updates

```bash
# Reload configuration (restart required)
docker-compose restart

# Backup configuration
cp -r config config.backup.$(date +%Y%m%d)

# Validate JSON configuration
python3 -m json.tool config/sdrs.json
```

## Performance Optimization

### Resource Limits

The container is configured with:

- **Memory limit:** 1GB (can be adjusted)
- **CPU limit:** 2 cores maximum
- **Memory reservation:** 256MB minimum

### Network Performance

- **Bridge networking:** Optimal for single-host setups
- **Port mapping:** Direct port 8073 binding
- **No network isolation:** Full performance

### USB Performance

- **Direct USB access:** No virtualization overhead
- **Proper permissions:** Minimal permission checks
- **System integration:** Uses host USB stack

## Security Considerations

### Container Security

- **Privileged mode:** Required for USB access
- **Limited capabilities:** Only necessary capabilities
- **User mapping:** Runs as pi user, not root
- **Resource limits:** Prevents resource exhaustion

### Network Security

- **Local binding:** Only accessible from local network
- **HTTPS available:** Can be configured with reverse proxy
- **Authentication:** Admin user with secure password

### USB Security

- **Device isolation:** Only HackRF device accessible
- **Permission checks:** Uses plugdev group permissions
- **No raw access:** Mediated through OpenWebRX

## Integration with Stinkster

This Docker setup integrates with the larger Stinkster project:

### Service Coordination

- **Dev environment:** `./dev.sh start openwebrx`
- **Orchestration:** Part of `gps_kismet_wigle.sh`
- **Monitoring:** Integrated health checks

### Configuration Management

- **Templates:** Uses Stinkster configuration templates
- **Environment:** Respects `.env` file settings
- **Backup:** Included in project backup system

### Logging Integration

- **Centralized logs:** Writes to `logs/` directory
- **Log rotation:** Handled by Docker
- **Monitoring:** Accessible via dev tools

## Frequently Asked Questions

### Q: Why use the official image instead of custom build?

A: The official image is maintained, secure, and regularly updated. Custom builds require
maintenance and may have security vulnerabilities.

### Q: Why privileged mode?

A: USB device access requires privileged mode in Docker. This is standard for SDR applications.

### Q: Can I use multiple HackRF devices?

A: Yes, but you'll need to modify the device mounting and SDR configuration to include multiple
devices.

### Q: How do I add more frequency profiles?

A: Edit `config/sdrs.json` and add new profiles under the HackRF configuration, then restart the
container.

### Q: Is this setup suitable for production?

A: Yes, but consider adding a reverse proxy with HTTPS and proper authentication for remote access.

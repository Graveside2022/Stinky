# Scripts Directory

This directory contains operational scripts for building, starting, and managing the OpenWebRX HackRF container setup.

## Files Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `start-openwebrx.sh` | Complete startup automation with health checks | Daily operation, service restart |
| `build-openwebrx-hackrf.sh` | Container build and deployment | Initial setup, rebuilds |

## start-openwebrx.sh - Service Startup Script

**Purpose:** Automated OpenWebRX startup with comprehensive pre-flight checks and health monitoring

### Features

- **HackRF Detection:** Verifies HackRF hardware is connected
- **Docker Environment Check:** Validates Docker daemon and Compose availability
- **Directory Structure:** Creates required directories automatically
- **Service Management:** Stops existing containers before starting new ones
- **Image Updates:** Pulls latest OpenWebRX image
- **Health Monitoring:** Waits for service to be ready before completion
- **Status Reporting:** Provides comprehensive status information

### Usage

```bash
# Make executable (first time only)
chmod +x start-openwebrx.sh

# Run startup sequence
./start-openwebrx.sh
```

### Pre-requisites

The script checks for and requires:
- HackRF device connected via USB (`lsusb | grep 1d50:6089`)
- Docker daemon running (`systemctl status docker`)
- Docker Compose available (either `docker-compose` or `docker compose`)
- Configuration files in `../json-configs/` directory

### Output Example

```
=== OpenWebRX HackRF Docker Startup ===
Starting OpenWebRX with HackRF support...

ℹ Checking HackRF connection...
✓ HackRF device detected
ℹ Checking Docker environment...
✓ Docker is available
✓ Docker Compose is available
ℹ Checking directory structure...
✓ Required directories exist
ℹ Stopping any existing OpenWebRX container...
ℹ Pulling latest OpenWebRX image...
✓ Image updated successfully
ℹ Starting OpenWebRX container...
✓ Container started successfully
ℹ Waiting for OpenWebRX to initialize...
✓ OpenWebRX is ready!

=== Service Status ===
    Name                   Command               State           Ports
openwebrx-hackrf   /opt/openwebrx/startup.sh    Up      0.0.0.0:8073->8073/tcp

=== Access Information ===
✓ OpenWebRX is running!
ℹ Web interface: http://localhost:8073
ℹ Username: admin
ℹ Password: hackrf

=== Useful Commands ===
  View logs:    docker-compose logs -f
  Stop service: docker-compose down
  Restart:      docker-compose restart
  Status:       docker-compose ps

ℹ Startup complete!
```

### Error Handling

The script provides specific error messages for common issues:

**HackRF not found:**
```
✗ HackRF device not found!
ℹ Please connect your HackRF device and try again
```

**Docker not available:**
```
✗ Docker not installed
✗ Cannot access Docker daemon
ℹ Try: sudo systemctl start docker
```

**Container start failure:**
```
✗ Failed to start container
ℹ Check logs with: docker-compose logs
```

### Customization

#### Change Port
Edit the script to check different ports:
```bash
# Line 96-98
if curl -s http://localhost:8074/ > /dev/null 2>&1; then
    print_status "OK" "OpenWebRX is ready!"
    break
fi
```

#### Adjust Timeout
Modify the startup wait time:
```bash
# Line 96 - change {1..30} to {1..60} for 2-minute timeout
for i in {1..60}; do
```

#### Add Custom Checks
Insert additional validation before container start:
```bash
# Add after line 70
print_status "INFO" "Running custom checks..."
# Your custom validation here
```

## build-openwebrx-hackrf.sh - Container Build Script

**Purpose:** Complete container build process with testing and validation

### Features

- **Hardware Detection:** Checks for HackRF before building
- **Clean Build Process:** Removes old images and containers
- **Comprehensive Testing:** Tests HackRF and SoapySDR detection in container
- **Status Reporting:** Shows detailed build and deployment status
- **Accessibility Testing:** Verifies web interface is accessible

### Usage

```bash
# Make executable (first time only)
chmod +x build-openwebrx-hackrf.sh

# Run build process
./build-openwebrx-hackrf.sh
```

### Build Process

1. **Pre-build Checks:**
   - HackRF device detection on host
   - Display HackRF info if available

2. **Environment Setup:**
   - Create required directories (`config`, `logs`)
   - Stop and remove existing containers

3. **Build Process:**
   - Remove existing images for clean build
   - Build new container with `--no-cache` flag
   - Start new container

4. **Post-build Testing:**
   - Test HackRF detection inside container
   - Test SoapySDR device enumeration
   - Display container startup logs

5. **Final Validation:**
   - Check web interface accessibility
   - Provide access information and troubleshooting commands

### Output Example

```
=== OpenWebRX HackRF Container Build Script ===
Building OpenWebRX container with native HackRF support...

✓ HackRF device detected on host
Found HackRF board 0:
Board ID Number: 2 (HackRF One)
Firmware Version: 2018.01.1
Part ID Number: 0xa000cb3c 0x00474c4c

Creating Docker volume directories...
Stopping existing containers...
Removing existing image...
Building OpenWebRX container with HackRF support...
[Docker build output...]

Starting OpenWebRX container...
Waiting for container to start...
Checking container status...

    Name                   Command               State           Ports
openwebrx-hackrf   /opt/openwebrx/startup.sh    Up      0.0.0.0:8073->8073/tcp

Testing HackRF detection inside container...
Found HackRF board 0:
Board ID Number: 2 (HackRF One)

Testing SoapySDR device detection...
Found device 0
  driver = hackrf
  part_id = a000cb3c474c4c
  serial = 0000000000000000457863c8240c215f
  version = 2018.01.1

=== Build and Deployment Complete ===

🌐 OpenWebRX Web Interface:
   http://localhost:8073
   Username: admin
   Password: hackrf

📊 Container Status:
    Name                   Command               State           Ports
openwebrx-hackrf   /opt/openwebrx/startup.sh    Up      0.0.0.0:8073->8073/tcp

📝 View Logs:
   docker logs openwebrx-hackrf -f

🔧 Troubleshooting:
   docker exec -it openwebrx-hackrf bash

🛑 Stop Container:
   docker-compose down

✅ OpenWebRX web interface is accessible
```

### Build Customization

#### Use Different Image Tag
Edit line 32 to use specific image version:
```bash
docker rmi openwebrx-hackrf-only:v1.2.2 2>/dev/null || true
```

#### Skip Image Pull
Comment out line 36 to use cached image:
```bash
# docker-compose build --no-cache
docker-compose build
```

#### Add Build Arguments
Modify build command with arguments:
```bash
docker-compose build --no-cache --build-arg OPENWEBRX_VERSION=1.2.2
```

## Script Integration

Both scripts are designed to work together and with the Docker configuration:

### Typical Workflow

1. **Initial Setup:**
   ```bash
   ./build-openwebrx-hackrf.sh  # Build and deploy
   ```

2. **Daily Operation:**
   ```bash
   ./start-openwebrx.sh         # Start/restart service
   ```

3. **After Configuration Changes:**
   ```bash
   docker-compose restart      # Quick restart
   # OR
   ./start-openwebrx.sh        # Full restart with checks
   ```

4. **After Dockerfile Changes:**
   ```bash
   ./build-openwebrx-hackrf.sh  # Rebuild container
   ```

### Docker Compose Integration

Both scripts use the Docker Compose configuration:
- Assume `docker-compose.yml` is in current directory
- Create `config/` and `logs/` directories
- Use container name `openwebrx-hackrf`
- Check service on port 8073

### Host System Integration

Scripts perform host system checks:
- HackRF USB device detection
- Docker service status
- Network port availability
- File system permissions

## Troubleshooting

### Common Script Issues

**Permission denied:**
```bash
chmod +x *.sh
```

**Docker access denied:**
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**HackRF not detected:**
```bash
# Check USB connection
lsusb | grep 1d50:6089

# Check udev rules
ls -la /etc/udev/rules.d/*hackrf*

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

**Container build fails:**
```bash
# Check Docker disk space
docker system df

# Clean up old images
docker system prune -f

# Check internet connectivity
curl -I https://hub.docker.com
```

### Script Debugging

Enable bash debugging:
```bash
bash -x start-openwebrx.sh
```

Add debug output:
```bash
# Add after line 5 in either script
set -x  # Enable command tracing
```

## Customization for Different Environments

### Raspberry Pi 3

Adjust resource limits and timeouts:
```bash
# In start-openwebrx.sh, line 96
for i in {1..60}; do  # Longer timeout for slower hardware
```

### Multi-container Setup

Modify container names and ports:
```bash
# Change container name
CONTAINER_NAME="openwebrx-hackrf-1"

# Change port check
curl -s http://localhost:8074/
```

### Development Environment

Add development-specific features:
```bash
# Add debug container startup
docker-compose -f docker-compose.dev.yml up -d

# Add configuration validation
jq '.' config/*.json
```

## Maintenance Scripts

Additional maintenance functionality can be added:

### Log Rotation Script
```bash
#!/bin/bash
# Rotate logs older than 7 days
find logs/ -name "*.log" -mtime +7 -delete
docker-compose logs --no-log-prefix > logs/container-$(date +%Y%m%d).log
```

### Health Check Script
```bash
#!/bin/bash
# Check container health
if ! curl -s http://localhost:8073/ > /dev/null; then
    echo "OpenWebRX not responding, restarting..."
    ./start-openwebrx.sh
fi
```

### Backup Script
```bash
#!/bin/bash
# Backup configuration
tar -czf backup-$(date +%Y%m%d).tar.gz config/ logs/
```

---

**Status:** ✅ Production Ready Scripts  
**Last Updated:** 2025-06-15  
**Tested With:** Bash 5.0+, Docker 24.0+, HackRF One  
**Compatibility:** Linux (Raspberry Pi OS, Ubuntu, Debian)
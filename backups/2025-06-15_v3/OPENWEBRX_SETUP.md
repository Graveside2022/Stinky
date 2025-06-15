# OpenWebRX with HackRF Support - Docker Setup

This directory contains a complete Docker setup for OpenWebRX with native HackRF support, built from scratch to ensure maximum compatibility with the HackRF One SDR.

## Features

- **Native HackRF driver** support (not just SoapySDR)
- **Pre-configured frequency profiles** for common bands
- **Optimized gain settings** for HackRF (VGA, LNA, AMP)
- **Persistent configuration** using Docker volumes
- **Health checks** and automatic restart
- **Resource limits** suitable for Raspberry Pi

## Files

- `Dockerfile` - Builds OpenWebRX from scratch with HackRF support
- `docker-compose.yml` - Container orchestration and configuration
- `build-openwebrx.sh` - Build and deployment script

## Quick Start

1. **Check HackRF connection**:
   ```bash
   lsusb | grep -i hackrf
   # Should show: Bus 001 Device 005: ID 1d50:6089 OpenMoko, Inc. Great Scott Gadgets HackRF One SDR
   ```

2. **Build and deploy**:
   ```bash
   ./build-openwebrx.sh deploy
   ```

3. **Access the web interface**:
   - URL: `http://<raspberry-pi-ip>:8073`
   - Username: `admin`
   - Password: `hackrf`

## Build Script Commands

```bash
./build-openwebrx.sh build    # Build the Docker image
./build-openwebrx.sh start    # Start the container
./build-openwebrx.sh stop     # Stop the container
./build-openwebrx.sh restart  # Restart the container
./build-openwebrx.sh logs     # Show container logs
./build-openwebrx.sh test     # Test SoapySDR device detection
./build-openwebrx.sh deploy   # Full deployment (build + start)
./build-openwebrx.sh clean    # Remove container and image
```

## Pre-configured Frequency Profiles

The Dockerfile includes these HackRF-optimized profiles:

1. **2m Amateur Band** (145 MHz)
   - NFM mode, 2.4 MHz bandwidth
   - Gain: VGA=35, LNA=40, AMP=0

2. **70cm Amateur Band** (435 MHz)
   - NFM mode, 2.4 MHz bandwidth
   - Gain: VGA=35, LNA=40, AMP=0

3. **Airband** (120 MHz)
   - AM mode, 2.4 MHz bandwidth
   - Gain: VGA=30, LNA=40, AMP=0

4. **FM Broadcast** (100 MHz)
   - WFM mode, 2.4 MHz bandwidth
   - Gain: VGA=25, LNA=30, AMP=0

## Troubleshooting

### HackRF Not Detected

1. Check USB connection:
   ```bash
   lsusb | grep 1d50:6089
   ```

2. Test in container:
   ```bash
   ./build-openwebrx.sh test
   ```

3. Check container logs:
   ```bash
   ./build-openwebrx.sh logs
   ```

### Permission Issues

The container runs as the `openwebrx` user with appropriate permissions. If you encounter USB permission issues:

1. Ensure the pi user is in the `plugdev` group:
   ```bash
   sudo usermod -aG plugdev pi
   ```

2. Reload udev rules:
   ```bash
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

### Using Custom Configuration

To use the existing HackRF configuration file:

```bash
# Option 1: During deployment
./build-openwebrx.sh deploy
# When prompted, choose to copy the existing config

# Option 2: Manual copy
docker run --rm \
  -v openwebrx-settings:/data \
  -v /home/pi/openwebrx-hackrf-config.json:/config.json:ro \
  alpine cp /config.json /data/sdrs.json

# Then restart
./build-openwebrx.sh restart
```

## Manual Docker Commands

If you prefer not to use the build script:

```bash
# Build
docker build -t openwebrx-hackrf:latest .

# Run with docker-compose
docker-compose up -d

# Or run directly
docker run -d \
  --name openwebrx-hackrf \
  --restart unless-stopped \
  -p 8073:8073 \
  --privileged \
  -v /dev/bus/usb:/dev/bus/usb \
  -v openwebrx-settings:/var/lib/openwebrx \
  -v openwebrx-config:/etc/openwebrx \
  -e OPENWEBRX_ADMIN_USER=admin \
  -e OPENWEBRX_ADMIN_PASSWORD=hackrf \
  openwebrx-hackrf:latest
```

## Integration with Stinkster

This OpenWebRX setup integrates with the larger Stinkster system:

- **Port 8073**: Web SDR interface
- **HackRF sharing**: Can coexist with spectrum analyzer when not in use simultaneously
- **Docker network**: Uses `stinkster-net` for potential service integration

## Notes

- The Dockerfile installs OpenWebRX 1.2.2 by default. Update the `OPENWEBRX_VERSION` variable for different versions.
- The container includes both SoapySDR and native HackRF drivers for maximum compatibility.
- Gain settings are optimized for HackRF but can be adjusted in the web interface.
- The container runs health checks every 30 seconds to ensure the service is responsive.
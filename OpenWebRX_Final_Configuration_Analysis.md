# OpenWebRX Final Configuration Analysis

## Executive Summary

After running the `rebuild-openwebrx-docker.sh` script, the final OpenWebRX configuration creates a custom Docker container with native HackRF support and optimized settings. This analysis compares the different configuration approaches and documents the final state.

## Configuration Sources Comparison

### 1. Current Dockerfile Configuration (docker/Dockerfile)
**Location**: `/home/pi/projects/stinkster/docker/Dockerfile`
**Approach**: Builds from scratch using Debian bookworm-slim

Key features:
- **Base Image**: `debian:bookworm-slim` (custom build)
- **Driver Type**: Uses both native HackRF tools and SoapySDR
- **Build Process**: Compiles SoapySDR and SoapyHackRF from source
- **Configuration**: Embedded HackRF config in Dockerfile
- **User**: Runs as `openwebrx` user (non-root)

### 2. Rebuild Script Configuration (rebuild-openwebrx-docker.sh)
**Location**: `/home/pi/projects/stinkster/rebuild-openwebrx-docker.sh`  
**Approach**: Extends official OpenWebRX image

Key features:
- **Base Image**: `jketterl/openwebrx:stable` (official image)
- **Driver Type**: Native HackRF driver only
- **Build Process**: Quick Docker build extending official image
- **Configuration**: Applied at container startup
- **User**: Runs as root (privileged container)

### 3. Existing Configuration Template
**Location**: `/home/pi/projects/stinkster/config/examples/openwebrx-sdrs.json`
**Approach**: Configuration file for manual application

## Final Configuration After Rebuild Script

### SDR Configuration (sdrs.json)
```json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
            "type": "hackrf",
            "ppm": 0,
            "profiles": {
                "2m": {
                    "name": "2m Amateur Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -72,
                    "lfo_offset": 300
                },
                "70cm": {
                    "name": "70cm Amateur Band",
                    "center_freq": 435000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 435000000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -78,
                    "lfo_offset": 300
                },
                "airband": {
                    "name": "Airband",
                    "center_freq": 124000000,
                    "rf_gain": "VGA=30,LNA=32,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 124000000,
                    "start_mod": "am",
                    "waterfall_min_level": -80,
                    "lfo_offset": 0
                },
                "fm_broadcast": {
                    "name": "FM Broadcast",
                    "center_freq": 98000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 98000000,
                    "start_mod": "wfm",
                    "waterfall_min_level": -65,
                    "lfo_offset": 0
                }
            }
        }
    }
}
```

### Docker Configuration
```yaml
version: '3.8'

services:
  openwebrx:
    image: openwebrx-hackrf:latest
    container_name: openwebrx
    restart: unless-stopped
    ports:
      - "8073:8073"
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - openwebrx-settings:/var/lib/openwebrx
      - openwebrx-config:/etc/openwebrx
    devices:
      - /dev/bus/usb:/dev/bus/usb
    privileged: true
    environment:
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=hackrf
    
volumes:
  openwebrx-settings:
  openwebrx-config:
```

### Custom Dockerfile Created
```dockerfile
FROM jketterl/openwebrx:stable

# Install additional tools for debugging
RUN apt-get update && apt-get install -y \
    hackrf \
    libhackrf-dev \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV OPENWEBRX_ADMIN_USER=admin
ENV OPENWEBRX_ADMIN_PASSWORD=hackrf

# Create directory for custom configs
RUN mkdir -p /custom-config

# Copy working HackRF configuration
COPY openwebrx-hackrf-config.json /custom-config/sdrs.json

# Script to apply custom config on startup
RUN echo '#!/bin/bash\n\
if [ ! -f /var/lib/openwebrx/.configured ]; then\n\
    echo "First run detected, applying custom configuration..."\n\
    cp /custom-config/sdrs.json /var/lib/openwebrx/sdrs.json\n\
    touch /var/lib/openwebrx/.configured\n\
    echo "Custom configuration applied."\n\
fi\n\
exec /opt/openwebrx/docker/scripts/run.sh' > /custom-start.sh && \
    chmod +x /custom-start.sh

ENTRYPOINT ["/custom-start.sh"]
```

## Key Configuration Points Verified

### ✅ Critical Success Factors

1. **Native HackRF Driver**: Uses `"type": "hackrf"` instead of SoapySDR
2. **Proper Gain Settings**: 
   - Most bands: `VGA=35,LNA=40,AMP=0`
   - Airband: `VGA=30,LNA=32,AMP=0` (lower gain for stronger signals)
   - FM Broadcast: `VGA=20,LNA=16,AMP=0` (lowest gain for very strong signals)
3. **Hardware Access**: Full USB device mounting with privileged mode
4. **Automatic Configuration**: Applied on first container start
5. **Persistent Storage**: Docker volumes for settings and configuration
6. **Multiple Band Profiles**: 2m, 70cm, airband, FM broadcast pre-configured

### ✅ Technical Verification

- **Driver Type**: Confirmed native HackRF driver usage
- **Gain Settings**: Optimized for different frequency bands
- **Frequency Corrections**: `lfo_offset` values set for stability
- **Container Security**: Uses official OpenWebRX base image
- **USB Access**: Proper device mounting and privileged mode
- **Configuration Persistence**: Automatic application and backup system

## Access Information

After running the rebuild script:

- **Web Interface**: http://[PI_IP_ADDRESS]:8073
- **Username**: admin
- **Password**: hackrf
- **Container Name**: openwebrx
- **Image**: openwebrx-hackrf:latest

## Rebuild Process Workflow

1. **Backup Phase**: Backs up existing Docker volumes to timestamped files
2. **Cleanup Phase**: Removes old containers and images
3. **Build Phase**: Creates custom Docker image with embedded configuration
4. **Deploy Phase**: Starts container with proper device mounting
5. **Configuration Phase**: Applies HackRF configuration automatically
6. **Verification Phase**: Tests HackRF detection and configuration

## Comparison with Alternatives

### vs. Manual SoapySDR Configuration
- ✅ **Better**: Native driver avoids SoapySDR compatibility issues
- ✅ **Better**: Automatic configuration reduces manual steps
- ✅ **Better**: Embedded configuration prevents loss

### vs. Default OpenWebRX Image
- ✅ **Better**: HackRF-specific optimizations
- ✅ **Better**: Pre-configured band profiles
- ✅ **Better**: Automatic device detection

### vs. Custom Dockerfile Build
- ⚖️ **Trade-off**: Faster rebuild (extends vs. builds from scratch)
- ⚖️ **Trade-off**: Uses official base (less control but more stable)
- ✅ **Better**: Simpler maintenance and updates

## Deployment Verification Commands

```bash
# Check container status
docker ps | grep openwebrx

# View logs
docker logs -f openwebrx

# Test HackRF detection
docker exec openwebrx hackrf_info

# Check configuration
docker exec openwebrx cat /var/lib/openwebrx/sdrs.json

# Access web interface
curl -I http://localhost:8073
```

## Conclusion

The `rebuild-openwebrx-docker.sh` script creates a production-ready OpenWebRX setup with:

1. **Native HackRF support** using the correct driver type
2. **Optimized gain settings** for different frequency bands  
3. **Automatic configuration** that applies on first run
4. **Persistent storage** with backup capabilities
5. **Professional band profiles** for amateur radio, airband, and FM broadcast
6. **Proper hardware access** with USB device mounting and privileged mode

This configuration addresses the common SoapySDR compatibility issues and provides a robust, ready-to-use SDR web interface specifically optimized for HackRF devices.
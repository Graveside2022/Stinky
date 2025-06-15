# OpenWebRX HackRF Setup Guide

## Overview

This guide explains how to properly set up OpenWebRX with HackRF One support. The standard OpenWebRX image has issues with HackRF detection through SoapySDR, so special configuration is required.

## Quick Start

### Option 1: Fix Existing Installation
If OpenWebRX is already running but HackRF isn't working:
```bash
./fix-openwebrx-hackrf.sh
```

### Option 2: Set Up From Scratch
For a fresh installation with proper HackRF support:
```bash
./setup-hackrf-only-image.sh
```

### Option 3: Load From Backup
If you have a working backup image:
```bash
./load-openwebrx-backup.sh
```

## The Problem

The standard `jketterl/openwebrx` Docker image uses SoapySDR for HackRF support, which often fails to detect HackRF One devices properly. Common symptoms include:
- "No devices found" error
- SoapySDR reporting 0 devices
- HackRF visible on host but not in container

## The Solution

Use the native HackRF driver instead of SoapySDR by:
1. Using a specialized `openwebrx-hackrf-only` image
2. Configuring SDR type as `"hackrf"` not `"soapy"`
3. Mounting proper HackRF configuration

## Configuration Details

### Working HackRF Configuration
The key is using `"type": "hackrf"` instead of `"type": "soapy"`:

```json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF One",
            "type": "hackrf",  // Native driver, not SoapySDR
            "ppm": 0,
            "profiles": {
                "2m": {
                    "name": "2m Amateur Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm"
                }
            }
        }
    }
}
```

### Gain Settings
Optimal HackRF gain settings for different bands:
- **2m/70cm Amateur**: `VGA=35,LNA=40,AMP=0`
- **Airband**: `VGA=30,LNA=32,AMP=0`
- **FM Broadcast**: `VGA=20,LNA=16,AMP=0`

## Docker Compose Configuration

The `docker-compose.yml` must include:
1. Privileged mode for USB access
2. USB device mounting
3. Configuration file mounting

```yaml
services:
  openwebrx:
    image: openwebrx-hackrf-only:latest
    container_name: openwebrx
    privileged: true
    devices:
      - /dev/bus/usb:/dev/bus/usb
    volumes:
      - ./openwebrx-hackrf-config.json:/var/lib/openwebrx/sdrs.json:ro
```

## Scripts Provided

### `fix-openwebrx-hackrf.sh`
- Fixes existing OpenWebRX installation
- Applies proper HackRF configuration
- No rebuild required

### `setup-hackrf-only-image.sh`
- Complete setup from scratch
- Creates optimized configuration
- Sets up docker-compose.yml

### `rebuild-openwebrx-docker.sh`
- Rebuilds image with HackRF support
- Backs up existing data
- Applies configuration automatically

### `apply-hackrf-config.sh`
- Applies HackRF config to running container
- Updates gain settings
- Restarts container

## Troubleshooting

### HackRF Not Detected
1. Check USB connection:
   ```bash
   lsusb | grep 1d50:6089
   ```

2. Verify inside container:
   ```bash
   docker exec openwebrx hackrf_info
   ```

3. Check container logs:
   ```bash
   docker logs openwebrx
   ```

### SoapySDR Errors
If you see "SoapySDR: 0 devices found":
1. The configuration is using SoapySDR instead of native driver
2. Run `./fix-openwebrx-hackrf.sh` to fix

### Permission Issues
Ensure Docker has USB access:
```bash
sudo usermod -aG plugdev $USER
sudo usermod -aG docker $USER
# Log out and back in
```

## Access Information
- **URL**: http://[your-ip]:8073
- **Username**: admin
- **Password**: hackrf

## Important Files
- `openwebrx-hackrf-config.json` - HackRF configuration
- `docker-compose.yml` - Container configuration
- `Dockerfile.openwebrx` - Custom image build file

## Notes
- Always use native HackRF driver, not SoapySDR
- Privileged mode is required for USB access
- Configuration must be mounted at container start
- Gain settings are critical for proper reception
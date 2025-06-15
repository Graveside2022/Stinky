# OpenWebRX HackRF-Only Image Build Guide

This guide explains how to build and use the specialized `openwebrx-hackrf-only` Docker image that provides native HackRF One support for the Stinkster project.

## Overview

The `openwebrx-hackrf-only` image is a custom-built Docker image that addresses the common issues with HackRF detection in the standard OpenWebRX image. It includes:

- Native HackRF driver support (not just SoapySDR)
- Pre-configured gain settings optimized for HackRF One
- Multiple band profiles (2m, 70cm, airband, FM broadcast, marine VHF, scanner)
- All necessary HackRF tools and libraries
- Proper USB device permissions
- Health checks and startup scripts

## Prerequisites

1. **Docker Installation**:
   ```bash
   # Install Docker if not already installed
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker pi
   # Logout and login again for group changes to take effect
   ```

2. **HackRF Device** (optional during build, required for operation):
   - Connect your HackRF One to a USB port
   - Verify detection: `lsusb | grep 1d50:6089`

3. **Disk Space**:
   - At least 1GB free space for building
   - ~500MB for the final image

## Building the Image

### Method 1: Automated Build Script (Recommended)

```bash
# Navigate to the project directory
cd /home/pi/projects/stinkster

# Run the build script
./build-openwebrx-hackrf-only.sh
```

The script will:
- Check prerequisites
- Build the image from source
- Verify the build
- Optionally create a backup
- Create helper scripts

Build time: ~10-15 minutes depending on internet speed

### Method 2: Manual Docker Build

```bash
# Navigate to the docker directory
cd /home/pi/projects/stinkster/docker

# Build the image
docker build -t openwebrx-hackrf-only:latest -f Dockerfile .

# Verify the build
docker images | grep openwebrx-hackrf-only
```

### Method 3: Load from Backup

If you have a pre-built image backup:

```bash
# Load the backup image
./load-openwebrx-backup.sh

# Or manually:
gunzip -c docker-backup/openwebrx-hackrf-only_20250609.tar.gz | docker load
```

## Configuration

The image uses a pre-configured `sdrs.json` with optimized HackRF settings:

```json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF One",
            "type": "hackrf",
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
                // Additional profiles...
            }
        }
    }
}
```

## Usage

### Starting OpenWebRX

1. **Using docker-compose** (recommended):
   ```bash
   cd /home/pi/projects/stinkster
   docker-compose up -d openwebrx
   ```

2. **Using the helper script**:
   ```bash
   ./start-openwebrx-hackrf.sh
   ```

3. **Using dev.sh**:
   ```bash
   ./dev.sh start openwebrx
   ```

### Accessing the Interface

- **URL**: http://localhost:8073 (or http://your-pi-ip:8073)
- **Username**: admin
- **Password**: hackrf

### Available Band Profiles

1. **2m Amateur Band** (145 MHz)
   - Mode: NFM
   - Optimized for amateur radio

2. **70cm Amateur Band** (435 MHz)
   - Mode: NFM
   - Optimized for UHF amateur radio

3. **Airband** (120-136 MHz)
   - Mode: AM
   - Aircraft communications

4. **FM Broadcast** (88-108 MHz)
   - Mode: WFM
   - Commercial FM radio

5. **Marine VHF** (156-162 MHz)
   - Mode: NFM
   - Marine communications

6. **Wide Scanner** (Variable)
   - Mode: NFM
   - 8 MHz bandwidth for scanning

## Troubleshooting

### HackRF Not Detected

1. **Check USB connection**:
   ```bash
   lsusb | grep 1d50:6089
   ```

2. **Verify inside container**:
   ```bash
   docker exec openwebrx hackrf_info
   ```

3. **Check container logs**:
   ```bash
   docker logs openwebrx
   ```

4. **Restart container**:
   ```bash
   docker restart openwebrx
   ```

### SoapySDR Issues

The image uses native HackRF drivers, but you can verify SoapySDR detection:

```bash
docker exec openwebrx SoapySDRUtil --find
```

Expected output:
```
Found device 0
  driver = hackrf
  serial = 0000000000000000
```

### Permission Issues

If you encounter USB permission errors:

1. **Add user to dialout group**:
   ```bash
   sudo usermod -aG dialout $USER
   ```

2. **Update udev rules**:
   ```bash
   echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="6089", MODE="0666"' | sudo tee /etc/udev/rules.d/53-hackrf.rules
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

## Maintenance

### Viewing Logs

```bash
# Container logs
docker logs -f openwebrx

# Build logs
cat build-openwebrx-hackrf-only.log
```

### Updating Configuration

1. **Edit configuration**:
   ```bash
   nano openwebrx-hackrf-config.json
   ```

2. **Apply to running container**:
   ```bash
   docker cp openwebrx-hackrf-config.json openwebrx:/var/lib/openwebrx/sdrs.json
   docker restart openwebrx
   ```

### Creating Image Backup

```bash
# Save current image
docker save openwebrx-hackrf-only:latest | gzip > docker-backup/openwebrx-hackrf-only_$(date +%Y%m%d).tar.gz
```

### Removing and Rebuilding

```bash
# Stop container
docker-compose stop openwebrx

# Remove container
docker rm openwebrx

# Remove image
docker rmi openwebrx-hackrf-only:latest

# Rebuild
./build-openwebrx-hackrf-only.sh
```

## Integration with Stinkster

The OpenWebRX service integrates with other Stinkster components:

1. **Spectrum Analyzer** (port 8092) can reference OpenWebRX frequencies
2. **GPS/Kismet** data can be overlaid on SDR waterfall
3. **TAK integration** for RF environment awareness

## Advanced Configuration

### Custom Gain Settings

Edit the RF gain parameters for each profile:
- **VGA** (Variable Gain Amplifier): 0-62 dB
- **LNA** (Low Noise Amplifier): 0-40 dB  
- **AMP** (Amplifier Enable): 0 or 1 (14dB when enabled)

Example for weak signals:
```json
"rf_gain": "VGA=40,LNA=40,AMP=1"
```

### Adding New Profiles

Add custom frequency profiles to the configuration:

```json
"custom_band": {
    "name": "My Custom Band",
    "center_freq": 150000000,
    "rf_gain": "VGA=30,LNA=35,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 150000000,
    "start_mod": "nfm"
}
```

## Support

For issues specific to the HackRF-only image:

1. Check the build log: `build-openwebrx-hackrf-only.log`
2. Verify Docker setup: `docker info`
3. Test HackRF hardware: `hackrf_info`
4. Review container logs: `docker logs openwebrx`

For general OpenWebRX documentation, see: https://github.com/jketterl/openwebrx
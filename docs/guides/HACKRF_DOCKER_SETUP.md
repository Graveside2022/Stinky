# HackRF Docker Setup Documentation

## Overview
This document captures the complete setup and configuration for running HackRF with OpenWebRX in Docker, including all the critical details that make it work properly.

## Working Docker Image
- **Image**: `jketterl/openwebrx:latest`
- **Container Name**: `openwebrx`
- **Architecture**: ARM64 compatible (works on Raspberry Pi)

## Docker Run Command
```bash
docker run -d \
  --name openwebrx \
  --restart unless-stopped \
  --device /dev/bus/usb \
  --device /dev/hackrf \
  --tmpfs=/tmp/openwebrx \
  -v /home/pi/openwebrx:/var/lib/openwebrx \
  -p 8073:8073 \
  -e OPENWEBRX_ADMIN_USER=admin \
  -e OPENWEBRX_ADMIN_PASSWORD=hackrf \
  jketterl/openwebrx:latest
```

## Critical Configuration Elements

### 1. Device Access
The container MUST have access to USB devices:
- `--device /dev/bus/usb` - Allows USB device enumeration
- `--device /dev/hackrf` - Direct HackRF device access (if udev rules create it)

### 2. Volume Mounts
- `/home/pi/openwebrx:/var/lib/openwebrx` - Persistent configuration storage
- Configuration files are stored here and survive container restarts

### 3. Memory Management
- `--tmpfs=/tmp/openwebrx` - Uses RAM for temporary files, improves performance on SD card-based systems

### 4. Network Configuration
- Port 8073 is exposed for web interface access
- Access URL: `http://<raspberry-pi-ip>:8073`

## HackRF-Specific Configuration

### The Critical Issue: Driver Selection
OpenWebRX defaults to using SoapySDR driver for HackRF, which often fails. The solution is to use the native HackRF driver.

### Working SDR Configuration (sdrs.json)
```json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
            "type": "hackrf",  // CRITICAL: Must be "hackrf", not "soapy"
            "ppm": 0,
            "profiles": {
                "2m": {
                    "name": "2m Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",  // CRITICAL: Proper gain format
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -72,
                    "lfo_offset": 300
                },
                "70cm": {
                    "name": "70cm Band",
                    "center_freq": 435000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 435000000,
                    "start_mod": "nfm"
                },
                "airband": {
                    "name": "Airband",
                    "center_freq": 124000000,
                    "rf_gain": "VGA=30,LNA=32,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 124000000,
                    "start_mod": "am"
                }
            }
        }
    }
}
```

### Key Configuration Points:
1. **Driver Type**: Must be `"type": "hackrf"` not `"type": "soapy"`
2. **RF Gain Format**: Use `"VGA=35,LNA=40,AMP=0"` format
   - VGA (Variable Gain Amplifier): 0-62 dB
   - LNA (Low Noise Amplifier): 0-40 dB  
   - AMP: 0 (off) or 14 (on) dB
3. **Sample Rate**: 2.4 MSPS works well for most applications
4. **LFO Offset**: Compensates for frequency drift

## Setup Procedure

### 1. Initial Container Setup
```bash
# Pull the latest image
docker pull jketterl/openwebrx:latest

# Create config directory
mkdir -p /home/pi/openwebrx

# Run the container
docker run -d \
  --name openwebrx \
  --restart unless-stopped \
  --device /dev/bus/usb \
  --tmpfs=/tmp/openwebrx \
  -v /home/pi/openwebrx:/var/lib/openwebrx \
  -p 8073:8073 \
  -e OPENWEBRX_ADMIN_USER=admin \
  -e OPENWEBRX_ADMIN_PASSWORD=hackrf \
  jketterl/openwebrx:latest
```

### 2. Verify HackRF Detection
```bash
# Check if HackRF is detected by the container
docker exec openwebrx hackrf_info

# Check SoapySDR detection (for comparison)
docker exec openwebrx SoapySDRUtil --find
```

### 3. Configure for Native HackRF Driver
```bash
# Create the correct configuration
cat > /home/pi/openwebrx-hackrf-config.json << 'EOF'
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
            "type": "hackrf",
            "ppm": 0,
            "profiles": {
                "2m": {
                    "name": "2m Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -72,
                    "lfo_offset": 300
                }
            }
        }
    }
}
EOF

# Copy to container
docker cp /home/pi/openwebrx-hackrf-config.json openwebrx:/var/lib/openwebrx/sdrs.json

# Restart container
docker restart openwebrx
```

### 4. Access and Test
- Navigate to `http://<pi-ip>:8073`
- Login with admin/hackrf
- Select the HackRF device
- Choose a profile and start receiving

## Troubleshooting

### HackRF Not Detected
```bash
# Check USB permissions
ls -la /dev/bus/usb/*/*
# Should show hackrf device

# Check container can see USB
docker exec openwebrx lsusb
# Should show: Bus xxx Device xxx: ID 1d50:6089 OpenMoko, Inc. HackRF One
```

### SoapySDR Issues
If OpenWebRX tries to use SoapySDR and fails:
1. Check logs: `docker logs openwebrx`
2. Look for: "SoapySDR: No device found"
3. Solution: Ensure sdrs.json uses `"type": "hackrf"` not `"type": "soapy"`

### Permission Issues
```bash
# Add udev rule for HackRF
echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="6089", MODE="0666", GROUP="plugdev"' | sudo tee /etc/udev/rules.d/53-hackrf.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Container Won't Start
```bash
# Check logs
docker logs openwebrx

# Common issues:
# - Port 8073 already in use
# - Volume mount permissions
# - USB device not available
```

## Performance Optimization

### 1. Use tmpfs for temporary files
The `--tmpfs=/tmp/openwebrx` flag prevents excessive SD card writes on Raspberry Pi.

### 2. Adjust Buffer Sizes
In the web interface under "Expert" settings:
- Buffer size: 65536
- Buffer count: 10

### 3. CPU Usage
Monitor with: `docker stats openwebrx`
- Expect 30-50% CPU on Pi 4
- Higher sample rates = more CPU

## Security Considerations

### 1. Change Default Password
```bash
docker exec -it openwebrx openwebrx-admin resetpassword admin
```

### 2. Restrict Network Access
Use firewall rules to limit access:
```bash
sudo ufw allow from 192.168.1.0/24 to any port 8073
```

### 3. Run as Non-Root (Advanced)
The container runs as root by default. For production, consider creating a custom image with a non-root user.

## Backup and Restore

### Backup Configuration
```bash
# Backup all configuration
tar -czf openwebrx-backup-$(date +%Y%m%d).tar.gz /home/pi/openwebrx/

# Backup just SDR config
cp /home/pi/openwebrx/sdrs.json /home/pi/openwebrx/sdrs.json.backup
```

### Restore Configuration
```bash
# Stop container
docker stop openwebrx

# Restore files
tar -xzf openwebrx-backup-20240115.tar.gz -C /

# Start container
docker start openwebrx
```

## Integration with Other Services

### Accessing from Other Containers
If other Docker containers need to access OpenWebRX:
```bash
# Create a Docker network
docker network create sdr-network

# Run OpenWebRX on the network
docker run -d \
  --name openwebrx \
  --network sdr-network \
  --restart unless-stopped \
  --device /dev/bus/usb \
  --tmpfs=/tmp/openwebrx \
  -v /home/pi/openwebrx:/var/lib/openwebrx \
  -p 8073:8073 \
  -e OPENWEBRX_ADMIN_USER=admin \
  -e OPENWEBRX_ADMIN_PASSWORD=hackrf \
  jketterl/openwebrx:latest
```

### API Access
OpenWebRX provides a WebSocket API for real-time data:
- Endpoint: `ws://<ip>:8073/ws/`
- Provides: Waterfall data, demodulated audio, metadata

## Maintenance

### Update Container
```bash
# Pull latest image
docker pull jketterl/openwebrx:latest

# Stop and remove old container
docker stop openwebrx
docker rm openwebrx

# Run new container with same parameters
# (use the full docker run command from above)
```

### Monitor Logs
```bash
# Live logs
docker logs -f openwebrx

# Last 100 lines
docker logs --tail 100 openwebrx
```

### Container Health Check
```bash
# Check if container is running
docker ps | grep openwebrx

# Detailed container info
docker inspect openwebrx
```

## Additional Resources

- OpenWebRX Documentation: https://github.com/jketterl/openwebrx/wiki
- HackRF Documentation: https://hackrf.readthedocs.io/
- Docker Documentation: https://docs.docker.com/

## Version Information
- Tested with OpenWebRX version: latest (as of documentation date)
- HackRF firmware version: 2021.03.1 or later recommended
- Docker version: 20.10 or later
- Raspberry Pi OS: Bullseye or later
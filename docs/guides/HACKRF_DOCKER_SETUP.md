# HackRF Docker Setup Documentation

## Overview
HackRF with OpenWebRX is **fully automated** through the `install.sh` script. This document provides troubleshooting guidance, advanced configuration options, and manual setup instructions for edge cases. For most users, running `./install.sh` is sufficient.

**✅ Automated by install.sh:**
- HackRF detection and driver setup
- Native HackRF driver configuration (not SoapySDR)
- Optimized Docker container with pre-configured band profiles
- USB device permissions and udev rules
- Working configuration with proper gain settings

**📋 Use this guide for:**
- Troubleshooting installation issues
- Advanced configuration customization
- Manual setup for development/testing
- Understanding the underlying Docker configuration

## Automated Setup

**Recommended approach for new installations:**

```bash
git clone https://github.com/your-username/stinkster.git
cd stinkster
./install.sh
```

The installer automatically:
1. **Detects HackRF hardware** and exports detection variables
2. **Installs Docker** and configures it properly
3. **Builds custom OpenWebRX container** with HackRF tools and optimizations
4. **Applies native HackRF driver configuration** (not SoapySDR)
5. **Creates working SDR profiles** for multiple bands
6. **Sets up USB permissions** and udev rules
7. **Starts OpenWebRX service** and verifies HackRF detection

**Installation completes with:**
- OpenWebRX accessible at `http://your-pi:8073` (admin/hackrf)
- Native HackRF driver configured and working
- Band profiles: 2m, 70cm, airband, marine, scanner
- Automatic container health monitoring
- Management scripts for easy control

**🎉 Major improvement:** No manual Docker commands, JSON editing, or SoapySDR troubleshooting required!

**The sections below are for troubleshooting and advanced customization only.**

### Verifying Automated Installation

After `./install.sh` completes, verify the setup:

```bash
# Check container status
docker ps | grep openwebrx

# Verify HackRF detection in container
docker exec openwebrx hackrf_info

# Test web interface
curl -s http://localhost:8073 >/dev/null && echo "OpenWebRX accessible"

# Check container logs
docker logs openwebrx --tail=20
```

**Expected results:**
- Container shows "Up" status
- `hackrf_info` shows HackRF device details
- Web interface returns HTTP 200
- Logs show successful HackRF initialization

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

## Verifying Installation

After running `install.sh`, verify that everything is working:

### 1. Check Container Status
```bash
# Verify OpenWebRX container is running
docker ps | grep openwebrx

# Check container logs for any errors
docker logs openwebrx
```

### 2. Verify HackRF Detection
```bash
# Check if HackRF is detected by the container
docker exec openwebrx hackrf_info

# Should show HackRF device information
# Check SoapySDR detection (for comparison)
docker exec openwebrx SoapySDRUtil --find
```

### 3. Access Web Interface
- Navigate to `http://<pi-ip>:8073`
- Login with admin/hackrf (default credentials set by install script)
- Select the HackRF device
- Choose a profile and start receiving

### 4. Test Reception
- Try different frequency bands (2m, 70cm, airband)
- Verify waterfall display shows signals
- Test audio output on known active frequencies

## Troubleshooting

If the automated setup doesn't work or you encounter issues later, use these troubleshooting steps:

### HackRF Not Detected

**Step 1: Check Physical Connection**
```bash
# Verify HackRF is connected and recognized by the system
lsusb | grep -i hackrf
# Should show: Bus xxx Device xxx: ID 1d50:6089 OpenMoko, Inc. HackRF One

# Check if hackrf_info works on the host
hackrf_info
```

**Step 2: Check Container USB Access**
```bash
# Verify container can see USB devices
docker exec openwebrx lsusb | grep -i hackrf

# Check USB permissions in container
docker exec openwebrx ls -la /dev/bus/usb/
```

**Step 3: Check Configuration**
```bash
# Verify the native HackRF driver is configured
docker exec openwebrx cat /var/lib/openwebrx/sdrs.json | grep '"type"'
# Should show: "type": "hackrf" (not "soapy")
```

### SoapySDR Issues
If OpenWebRX tries to use SoapySDR and fails:
1. Check logs: `docker logs openwebrx`
2. Look for: "SoapySDR: No device found" or similar errors
3. **Solution**: The install.sh script should have configured the native driver, but you can manually fix it:
   ```bash
   # Re-run the OpenWebRX configuration part of install.sh
   ./install.sh --openwebrx-only
   ```

### Permission Issues
The install.sh script should handle udev rules, but if you still have permission issues:
```bash
# Check if the udev rule exists
cat /etc/udev/rules.d/53-hackrf.rules

# If missing, add it manually
echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="6089", MODE="0666", GROUP="plugdev"' | sudo tee /etc/udev/rules.d/53-hackrf.rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Restart the Docker container
docker restart openwebrx
```

### Container Won't Start
```bash
# Check detailed logs
docker logs openwebrx

# Common issues and solutions:
# - Port 8073 already in use: Kill process using port or change port
# - Volume mount permissions: Check /home/pi/openwebrx ownership
# - USB device not available: Verify HackRF is connected and recognized
```

### Web Interface Issues

**Can't Access Web Interface**
```bash
# Check if container is running and port is exposed
docker ps | grep openwebrx
# Should show port mapping 0.0.0.0:8073->8073/tcp

# Test from local system
curl -I http://localhost:8073
# Should return HTTP headers

# Check firewall (if accessing remotely)
sudo ufw status
```

**Login Issues**
- Default credentials are admin/hackrf (set by install.sh)
- If login fails, reset password:
  ```bash
  docker exec -it openwebrx openwebrx-admin resetpassword admin
  ```

### Poor Reception Quality

**Check Gain Settings**
The install.sh script configures optimal gain settings, but you may need to adjust for your environment:
- VGA (Variable Gain Amplifier): 0-62 dB
- LNA (Low Noise Amplifier): 0-40 dB  
- AMP: 0 (off) or 14 (on) dB

**Environmental Factors**
- Antenna connection and type
- RF interference from nearby devices
- USB cable quality (use short, high-quality cables)

### Automated Configuration Recovery

If the automated configuration gets corrupted, use the automated recovery:

```bash
# Stop the container
docker stop openwebrx

# Backup current config
sudo cp -r /home/pi/openwebrx /home/pi/openwebrx.backup

# Re-run just the OpenWebRX configuration (RECOMMENDED)
./install.sh --openwebrx-only

# Or manually restore the working configuration (LEGACY - NOT RECOMMENDED)
# Use automated setup instead: ./install.sh --openwebrx-only
# docker cp docker/openwebrx-sdrs.json openwebrx:/var/lib/openwebrx/sdrs.json
# docker restart openwebrx
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

## Advanced Configuration

### Custom Frequency Profiles

You can add custom frequency profiles by editing the SDR configuration:

```bash
# Edit the SDR configuration
docker exec -it openwebrx vi /var/lib/openwebrx/sdrs.json

# Or edit from host system
sudo vi /home/pi/openwebrx/sdrs.json
docker restart openwebrx
```

Example additional profiles:
```json
"marine": {
    "name": "Marine VHF",
    "center_freq": 156800000,
    "rf_gain": "VGA=30,LNA=35,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 156800000,
    "start_mod": "nfm"
},
"pager": {
    "name": "Pager Frequencies",
    "center_freq": 152000000,
    "rf_gain": "VGA=40,LNA=40,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 152240000,
    "start_mod": "nfm"
}
```

### Custom Docker Configuration

If you need to modify the Docker container settings beyond what install.sh provides:

```bash
# Stop the auto-created container
docker stop openwebrx
docker rm openwebrx

# Create your custom docker-compose.yml
cat > docker-compose-openwebrx.yml << 'EOF'
version: '3.8'
services:
  openwebrx:
    image: jketterl/openwebrx:latest
    container_name: openwebrx
    restart: unless-stopped
    devices:
      - /dev/bus/usb
    tmpfs:
      - /tmp/openwebrx
    volumes:
      - /home/pi/openwebrx:/var/lib/openwebrx
    ports:
      - "8073:8073"
    environment:
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=your_secure_password
    # Add custom environment variables here
EOF

# Start with docker-compose
docker-compose -f docker-compose-openwebrx.yml up -d
```

### Integration with Other Services

**Accessing from Other Containers**
The install.sh script creates OpenWebRX on the default Docker network. To integrate with other services:

```bash
# Create a custom Docker network (if needed)
docker network create sdr-network

# Connect existing OpenWebRX container to network
docker network connect sdr-network openwebrx

# New containers can now access OpenWebRX via container name
# Example: http://openwebrx:8073
```

**API Access**
OpenWebRX provides a WebSocket API for real-time data:
- Endpoint: `ws://<ip>:8073/ws/`
- Provides: Waterfall data, demodulated audio, metadata

**Integration with Stinkster Components**
The spectrum analyzer component in this project can interface with OpenWebRX:
- Uses the same HackRF device (ensure no conflicts)
- Can pull data from OpenWebRX WebSocket API
- Coordinates through the main orchestration scripts

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
- Stinkster Project Documentation: See other files in `/docs/guides/`

## Summary

The HackRF Docker setup is now fully automated through the main `install.sh` script. This document serves as a troubleshooting and advanced configuration reference. The key points to remember:

1. **Use `./install.sh`** - Don't manually configure Docker or SDR settings
2. **Native HackRF driver** - The automated setup uses `"type": "hackrf"` (not SoapySDR)
3. **Proper gain settings** - VGA=35, LNA=40, AMP=0 work well for most scenarios
4. **USB permissions** - Handled automatically via udev rules
5. **Integration** - Works with other Stinkster components through orchestration scripts

If you encounter issues, work through the troubleshooting section systematically. Most problems are related to USB permissions, driver configuration, or Docker container setup - all of which are handled by the automated installation.

## Version Information
- Tested with OpenWebRX version: latest (as of documentation date)
- HackRF firmware version: 2021.03.1 or later recommended
- Docker version: 20.10 or later
- Raspberry Pi OS: Bullseye or later
- Install script version: Automated setup (replaces manual configuration)
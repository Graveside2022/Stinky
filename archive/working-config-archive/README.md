# Working Configuration Archive

This archive contains all the proven, working configuration files for the OpenWebRX HackRF integration. These configurations have been tested and verified to work correctly with HackRF hardware on Raspberry Pi.

## Archive Structure

```
working-config-archive/
├── docker/                     # Docker Compose configuration
│   └── docker-compose.yml      # Working Docker Compose setup
├── dockerfile-configs/         # Docker build configurations
│   └── Dockerfile             # Complete OpenWebRX + HackRF Dockerfile
├── json-configs/              # JSON configuration files (current working)
│   ├── sdrs.json             # SDR device configurations
│   ├── settings.json         # OpenWebRX application settings
│   ├── users.json            # User authentication configuration
│   └── openwebrx-hackrf-config.json  # HackRF-specific SDR config
├── legacy-config/             # Legacy and backup configurations
│   ├── config_webrx_hackrf.py # Old Python-based configuration
│   ├── index.json            # Docker backup metadata
│   ├── manifest.json         # Docker image manifest backup
│   ├── sdrs.json             # Previous working SDR configuration
│   ├── settings.json         # Backup OpenWebRX settings
│   └── users.json            # Backup user authentication
├── scripts/                   # Operational scripts
│   ├── build-openwebrx-hackrf.sh  # Container build script
│   └── start-openwebrx.sh     # Startup and health check script
├── README.md                  # This file
└── TEMPLATE_GUIDE.md          # Guide for creating new configurations
```

## Quick Start

To deploy the working OpenWebRX HackRF configuration:

1. **Copy the working files to your docker directory:**
   ```bash
   cp docker/docker-compose.yml /path/to/your/docker/
   cp dockerfile-configs/Dockerfile /path/to/your/docker/
   cp -r json-configs/* /path/to/your/docker/config/
   ```

2. **Run the deployment:**
   ```bash
   cd /path/to/your/docker/
   chmod +x ../working-config-archive/scripts/start-openwebrx.sh
   ../working-config-archive/scripts/start-openwebrx.sh
   ```

3. **Access the interface:**
   - URL: http://localhost:8073
   - Username: admin
   - Password: hackrf

## Critical Success Factors

These configurations work because they address the key issues with HackRF + OpenWebRX integration:

### 1. Native HackRF Driver Usage
- Uses `"type": "hackrf"` instead of `"type": "soapy"`
- Direct HackRF driver provides better performance and stability

### 2. Proper USB Device Mounting
- Mounts entire USB bus: `/dev/bus/usb:/dev/bus/usb:rw`
- Includes udev rules: `/etc/udev/rules.d:/etc/udev/rules.d:ro`
- Privileged container mode for hardware access

### 3. Optimized RF Gain Settings
- Format: `"VGA=35,LNA=40,AMP=0"`
- VGA: Variable Gain Amplifier (0-62)
- LNA: Low Noise Amplifier (0-40)
- AMP: RF Amplifier (0 or 14)

### 4. Frequency Band Profiles
- Pre-configured for amateur radio bands (2m, 70cm)
- Commercial bands (FM broadcast, airband)
- Proper sample rates and offsets for each band

## File Descriptions

### Docker Configuration Files

#### `docker/docker-compose.yml`
**Purpose:** Primary Docker deployment configuration  
**Critical Settings:**
- Container name: `openwebrx-hackrf`
- Port mapping: `8073:8073`
- USB device mounting for HackRF access
- Privileged mode enabled
- Resource limits (1GB memory, 2 CPU cores)

**Do NOT change:**
- Device mounting paths
- Privileged mode setting
- Container name (used by scripts)

#### `dockerfile-configs/Dockerfile`
**Purpose:** Custom OpenWebRX container with HackRF support  
**Features:**
- Based on Debian Bookworm
- Native HackRF and SoapySDR compilation
- OpenWebRX installation from official package
- Pre-configured with working SDR profiles

### JSON Configuration Files

#### `json-configs/sdrs.json`
**Purpose:** Defines SDR hardware and frequency profiles  
**Critical Elements:**
- `"type": "hackrf"` - Uses native driver
- RF gain format: `"VGA=35,LNA=40,AMP=0"`
- `always_on: true` - Keeps SDR active
- `start_profile: "fm_broadcast"` - Default profile

**Band Profiles:**
- **2m Amateur:** 145 MHz, NFM, optimized for repeaters
- **70cm Amateur:** 435 MHz, NFM, UHF communications
- **FM Broadcast:** 98 MHz, WFM, commercial radio
- **Airband:** 124 MHz, AM, aviation communications

#### `json-configs/settings.json`
**Purpose:** OpenWebRX application configuration  
**Key Settings:**
- Receiver name and description
- Waterfall display parameters
- Service integrations (disabled for security)
- Audio/FFT compression settings

#### `json-configs/users.json`
**Purpose:** User authentication  
**Default Credentials:**
- Username: admin
- Password: hackrf (hashed)

### Scripts

#### `scripts/start-openwebrx.sh`
**Purpose:** Complete startup automation with health checks  
**Features:**
- HackRF device detection
- Docker environment verification
- Container health monitoring
- Service status reporting
- Automatic image updates

#### `scripts/build-openwebrx-hackrf.sh`
**Purpose:** Complete container build and deployment  
**Features:**
- Clean rebuild process
- HackRF detection testing
- SoapySDR verification
- Comprehensive status reporting

## Configuration Dependencies

The working configuration requires these components to work together:

1. **Hardware:** HackRF One connected via USB
2. **Host System:** Docker with USB device access
3. **Container:** Privileged mode with proper device mounting
4. **Driver:** Native HackRF driver (not SoapySDR wrapper)
5. **Configuration:** Matching SDR profiles and gain settings

## Troubleshooting Reference

### Common Issues and Solutions

**HackRF not detected:**
- Check USB connection: `lsusb | grep 1d50:6089`
- Verify container device mounting
- Ensure privileged mode is enabled

**No audio output:**
- Check RF gain settings (too high causes clipping)
- Verify frequency is within band limits
- Try different demodulation modes

**Container won't start:**
- Check Docker daemon status
- Verify configuration file syntax
- Review container logs: `docker logs openwebrx-hackrf`

## Version Information

- **OpenWebRX Version:** Latest (pulled from jketterl/openwebrx)
- **HackRF Driver:** Native libhackrf
- **SoapySDR Version:** 0.8.1 (compiled from source)
- **Configuration Format:** Version 2 (current standard)

## Security Notes

- Default password should be changed in production
- Container runs in privileged mode (required for USB access)
- Web interface is unencrypted (HTTP only)
- No external service integrations enabled

## Maintenance

- **Backup:** Archive entire `working-config-archive/` directory
- **Updates:** Test OpenWebRX image updates in isolated environment
- **Monitoring:** Check container health with included scripts
- **Logs:** Monitor `/path/to/docker/logs/` for issues

---

**Status:** ✅ Verified Working Configuration  
**Last Updated:** 2025-06-15  
**Tested On:** Raspberry Pi 4 with HackRF One  
**Docker Version:** 24.0+  
**OpenWebRX Version:** Latest stable
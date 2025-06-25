# Template Guide for OpenWebRX HackRF Configuration

This guide provides templates and instructions for adapting the working configuration to different environments and requirements.

## Configuration Templates

### 1. SDR Configuration Template (sdrs.json)

```json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF One",
            "type": "hackrf",
            "ppm": 0,
            "always_on": true,
            "start_profile": "PROFILE_NAME",
            "initial_squelch_level": -150,
            "auto_start": true,
            "profiles": {
                "PROFILE_NAME": {
                    "name": "DISPLAY_NAME",
                    "center_freq": FREQUENCY_HZ,
                    "rf_gain": "VGA=XX,LNA=XX,AMP=X",
                    "samp_rate": SAMPLE_RATE,
                    "start_freq": START_FREQUENCY_HZ,
                    "start_mod": "MODULATION_TYPE",
                    "waterfall_min_level": -XX,
                    "lfo_offset": OFFSET_HZ,
                    "initial_squelch_level": -150,
                    "auto_squelch": false,
                    "squelch_level": -150,
                    "demod_auto_start": true
                }
            }
        }
    }
}
```

### 2. Docker Compose Template

```yaml
version: '3.8'

services:
  openwebrx:
    container_name: openwebrx-hackrf
    image: jketterl/openwebrx:latest
    ports:
      - "PORT:8073"
    devices:
      - "/dev/bus/usb:/dev/bus/usb:rw"
    volumes:
      - "./config:/var/lib/openwebrx:rw"
      - "./logs:/var/log/openwebrx:rw"
      - "/etc/udev/rules.d:/etc/udev/rules.d:ro"
      - "/sys/bus/usb:/sys/bus/usb:ro"
    environment:
      - OPENWEBRX_ADMIN_USER=USERNAME
      - OPENWEBRX_ADMIN_PASSWORD=PASSWORD
      - OPENWEBRX_DEBUG=1
      - PUID=1000
      - PGID=1000
    privileged: true
    cap_add:
      - SYS_ADMIN
      - DAC_OVERRIDE
      - CHOWN
      - FOWNER
      - FSETID
      - KILL
      - SETGID
      - SETUID
      - SETPCAP
      - NET_BIND_SERVICE
      - NET_RAW
      - SYS_CHROOT
      - MKNOD
      - AUDIT_WRITE
      - SETFCAP
    security_opt:
      - apparmor:unconfined
    group_add:
      - "20"    # dialout
      - "29"    # audio
      - "46"    # plugdev
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8073/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s
    network_mode: "bridge"
    labels:
      - "com.stinkster.service=openwebrx"
      - "com.stinkster.description=OpenWebRX HackRF SDR Interface"
    deploy:
      resources:
        limits:
          memory: MEMORY_LIMIT
          cpus: 'CPU_LIMIT'
        reservations:
          memory: MEMORY_RESERVATION
          cpus: 'CPU_RESERVATION'
```

## Parameter Reference

### RF Gain Settings

The HackRF gain is controlled by three parameters in the format `"VGA=XX,LNA=XX,AMP=X"`:

#### VGA (Variable Gain Amplifier)
- **Range:** 0-62 (even numbers only)
- **Purpose:** Final amplification stage
- **Recommended:** 20-40 for most applications
- **Effects:** Higher values = more sensitivity but more noise

#### LNA (Low Noise Amplifier)
- **Range:** 0-40 (8dB steps)
- **Purpose:** First amplification stage
- **Recommended:** 16-32 for most applications
- **Effects:** Critical for weak signal reception

#### AMP (RF Amplifier)
- **Range:** 0 or 14 (binary on/off)
- **Purpose:** Additional 14dB amplification
- **Recommended:** 0 for most applications (use only for very weak signals)
- **Effects:** Can cause overload with strong signals

### Frequency Band Guidelines

#### Amateur Radio Bands

**2 Meter Band (144-148 MHz):**
```json
{
    "name": "2m Amateur Band",
    "center_freq": 145000000,
    "rf_gain": "VGA=35,LNA=40,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 145700000,
    "start_mod": "nfm",
    "waterfall_min_level": -72,
    "lfo_offset": 300
}
```

**70cm Band (420-450 MHz):**
```json
{
    "name": "70cm Amateur Band", 
    "center_freq": 435000000,
    "rf_gain": "VGA=35,LNA=40,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 435000000,
    "start_mod": "nfm",
    "waterfall_min_level": -78,
    "lfo_offset": 300
}
```

#### Commercial Bands

**FM Broadcast (88-108 MHz):**
```json
{
    "name": "FM Broadcast",
    "center_freq": 98000000,
    "rf_gain": "VGA=20,LNA=16,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 98000000,
    "start_mod": "wfm",
    "waterfall_min_level": -65,
    "lfo_offset": 0
}
```

**Airband (108-137 MHz):**
```json
{
    "name": "Airband",
    "center_freq": 124000000,
    "rf_gain": "VGA=30,LNA=32,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 124000000,
    "start_mod": "am",
    "waterfall_min_level": -80,
    "lfo_offset": 0
}
```

### Sample Rate Guidelines

| Frequency Range | Recommended Sample Rate | Notes |
|----------------|-------------------------|-------|
| < 30 MHz       | 1024000 Hz             | HF bands |
| 30-300 MHz     | 2400000 Hz             | VHF bands |
| 300-1000 MHz   | 2400000 Hz             | UHF bands |
| > 1000 MHz     | 2400000 Hz             | Microwave bands |

### Modulation Types

- **NFM:** Narrow Band FM (amateur radio, commercial two-way)
- **WFM:** Wide Band FM (FM broadcast radio, 200kHz bandwidth)
- **AM:** Amplitude Modulation (airband, AM broadcast)
- **USB:** Upper Sideband (HF amateur radio)
- **LSB:** Lower Sideband (HF amateur radio)
- **CW:** Continuous Wave (morse code)

## Customization Examples

### Example 1: High-Gain Setup for Weak Signals

```json
{
    "name": "High Sensitivity",
    "center_freq": 145000000,
    "rf_gain": "VGA=50,LNA=40,AMP=14",
    "samp_rate": 2400000,
    "start_freq": 145700000,
    "start_mod": "nfm",
    "waterfall_min_level": -85,
    "lfo_offset": 300
}
```

### Example 2: Low-Gain Setup for Strong Local Signals

```json
{
    "name": "Low Sensitivity",
    "center_freq": 145000000,
    "rf_gain": "VGA=20,LNA=16,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 145700000,
    "start_mod": "nfm",
    "waterfall_min_level": -60,
    "lfo_offset": 300
}
```

### Example 3: Wideband Scanner Profile

```json
{
    "name": "Scanner Mode",
    "center_freq": 450000000,
    "rf_gain": "VGA=30,LNA=24,AMP=0",
    "samp_rate": 2400000,
    "start_freq": 450000000,
    "start_mod": "nfm",
    "waterfall_min_level": -75,
    "lfo_offset": 0
}
```

## Environment-Specific Configurations

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  openwebrx:
    container_name: openwebrx-dev
    image: jketterl/openwebrx:latest
    ports:
      - "8074:8073"  # Different port to avoid conflicts
    environment:
      - OPENWEBRX_DEBUG=1
      - OPENWEBRX_ADMIN_USER=dev
      - OPENWEBRX_ADMIN_PASSWORD=dev123
    # ... rest of configuration
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  openwebrx:
    container_name: openwebrx-prod
    image: jketterl/openwebrx:latest
    ports:
      - "8073:8073"
    environment:
      - OPENWEBRX_DEBUG=0
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=SECURE_PASSWORD_HERE
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '4.0'
    # ... rest of configuration
```

## Security Considerations

### Password Security

Always change default passwords:

```json
[
    {
        "user": "admin",
        "enabled": true,
        "must_change_password": false,
        "password": {
            "encoding": "hash",
            "value": "YOUR_SECURE_HASH_HERE",
            "algorithm": "sha256",
            "salt": "RANDOM_SALT_HERE"
        }
    }
]
```

Generate secure hash:
```bash
echo -n "your_password_here" | sha256sum
```

### Network Security

For production deployments:

```yaml
# Use reverse proxy
ports:
  - "127.0.0.1:8073:8073"  # Bind to localhost only

# Or use custom networks
networks:
  sdr_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Troubleshooting Templates

### Debug Configuration

Add debug settings to `settings.json`:

```json
{
    "version": 7,
    "debug": true,
    "log_level": "DEBUG",
    "receiver_name": "DEBUG - OpenWebRX",
    // ... rest of configuration
}
```

### Minimal Test Configuration

Create a minimal `sdrs.json` for testing:

```json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF Test",
            "type": "hackrf",
            "ppm": 0,
            "profiles": {
                "test": {
                    "name": "Test Profile",
                    "center_freq": 100000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 100000000,
                    "start_mod": "wfm"
                }
            }
        }
    }
}
```

## Validation Checklist

Before deploying a new configuration:

- [ ] JSON syntax is valid (use `jq` to validate)
- [ ] All required fields are present
- [ ] Frequencies are within HackRF range (1MHz - 6GHz)
- [ ] Gain values are within valid ranges
- [ ] Sample rates are compatible with HackRF
- [ ] Docker Compose file passes `docker-compose config` validation
- [ ] HackRF device is detected on host system
- [ ] Test startup with `docker-compose up` (not `-d`)
- [ ] Verify web interface accessibility
- [ ] Check container logs for errors
- [ ] Test frequency tuning and demodulation

## Migration Guide

### From Legacy Python Configuration

Convert Python config to JSON:

```python
# Old format (config_webrx.py)
sdrs = {
    "hackrf": {
        "name": "HackRF",
        "type": "hackrf",
        "profiles": {
            "2m": {
                "name": "2m",
                "center_freq": 145000000,
                # ... other settings
            }
        }
    }
}
```

```json
// New format (sdrs.json)
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
            "type": "hackrf",
            "profiles": {
                "2m": {
                    "name": "2m",
                    "center_freq": 145000000
                }
            }
        }
    }
}
```

### From SoapySDR Configuration

Change driver type:

```json
// Old (problematic)
{
    "type": "soapy",
    "device": "hackrf",
    "rf_gain": 35
}

// New (working)
{
    "type": "hackrf",
    "rf_gain": "VGA=35,LNA=40,AMP=0"
}
```

---

**Note:** Always test configurations in a development environment before deploying to production. Keep backups of working configurations.
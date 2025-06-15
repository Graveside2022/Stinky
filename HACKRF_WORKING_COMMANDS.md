# HackRF OpenWebRX Working Commands

This document contains the **tested and verified working commands** for HackRF integration with OpenWebRX.

## ✅ Successful Configuration Method

### 1. Working Docker Setup
```bash
# Use official OpenWebRX image (not custom builds)
image: jketterl/openwebrx:latest

# Mount working configuration directly
- ./openwebrx-hackrf-config.json:/var/lib/openwebrx/sdrs.json:ro

# Enable proper USB access
privileged: true
devices:
  - /dev/bus/usb:/dev/bus/usb
```

### 2. Verified Working Commands

**Quick Start:**
```bash
# Start with working configuration
./start-openwebrx.sh

# Or via Docker Compose
docker-compose up -d
```

**Validation:**
```bash
# Test HackRF on host
hackrf_info

# Test HackRF in container
docker exec openwebrx hackrf_info

# Validate complete setup
./validate-hackrf-config.sh
```

**Fix/Repair:**
```bash
# Apply working configuration if broken
./fix-openwebrx-hackrf.sh
```

## ✅ Working Configuration File

File: `openwebrx-hackrf-config.json`
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

## ✅ Working Docker Compose

File: `docker-compose.yml`
```yaml
version: '3.8'

services:
  openwebrx:
    image: jketterl/openwebrx:latest
    container_name: openwebrx
    restart: unless-stopped
    ports:
      - "8073:8073"
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      # Mount working HackRF configuration directly (tested and verified)
      - ./openwebrx-hackrf-config.json:/var/lib/openwebrx/sdrs.json:ro
      - openwebrx-settings:/var/lib/openwebrx
      - openwebrx-config:/etc/openwebrx
    devices:
      - /dev/bus/usb:/dev/bus/usb
    privileged: true
    environment:
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=hackrf
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8073"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    
volumes:
  openwebrx-settings:
  openwebrx-config:
```

## 🔧 Troubleshooting Commands

**Problem: HackRF not detected**
```bash
# Check USB connection
lsusb | grep 1d50:6089

# Test HackRF tools
hackrf_info

# Restart container
docker restart openwebrx
```

**Problem: SoapySDR error in web interface**
```bash
# Check current driver configuration
docker exec openwebrx cat /var/lib/openwebrx/sdrs.json | grep '"type"'

# Should show: "type": "hackrf"
# If shows "soapy", apply fix:
./fix-openwebrx-hackrf.sh
```

**Problem: Container won't start**
```bash
# Check Docker logs
docker logs openwebrx

# Start fresh
docker-compose down
docker-compose up -d
```

## 🎯 Key Success Factors

1. **Native HackRF Driver**: Use `"type": "hackrf"` NOT `"type": "soapy"`
2. **Official Image**: Use `jketterl/openwebrx:latest` 
3. **Direct Config Mount**: Mount config file directly to `/var/lib/openwebrx/sdrs.json`
4. **Privileged Mode**: Required for USB device access
5. **Proper Gain Settings**: Use tested VGA/LNA/AMP combinations

## 📋 Verification Checklist

- [ ] HackRF detected on host: `hackrf_info`
- [ ] Docker running: `docker ps | grep openwebrx`  
- [ ] Container config correct: `docker exec openwebrx cat /var/lib/openwebrx/sdrs.json | grep hackrf`
- [ ] Web interface accessible: `curl http://localhost:8073`
- [ ] HackRF detected in container: `docker exec openwebrx hackrf_info`

## 🚀 Quick Reference

| Command | Purpose |
|---------|---------|
| `./start-openwebrx.sh` | Start with working config |
| `./fix-openwebrx-hackrf.sh` | Apply configuration fix |
| `./validate-hackrf-config.sh` | Complete validation |
| `docker exec openwebrx hackrf_info` | Test HackRF in container |
| `docker logs openwebrx` | View container logs |

**Web Access**: http://localhost:8073 (admin/hackrf)

---

*This configuration has been tested and verified working on Raspberry Pi with HackRF One.*
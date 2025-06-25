# Legacy Configuration Files

This directory contains backup and legacy configuration files from previous working setups. These files serve as reference and fallback options.

## Files Overview

| File | Source | Purpose | Format |
|------|--------|---------|--------|
| `config_webrx_hackrf.py` | Legacy Python config | Original working configuration | Python |
| `sdrs.json` | Docker backup | Previous SDR configuration | JSON v2 |
| `settings.json` | Docker backup | Previous application settings | JSON v7 |
| `users.json` | Docker backup | Previous user authentication | JSON |
| `index.json` | Docker backup | Container image metadata | JSON |
| `manifest.json` | Docker backup | Docker image manifest | JSON |

## Legacy Python Configuration (config_webrx_hackrf.py)

**Historical Context:** This was the original working OpenWebRX configuration before the migration to JSON-based configuration.

### Key Features
- Native HackRF support with proper driver selection
- Optimized gain settings for amateur radio bands
- Pre-configured frequency profiles

### Why It Worked
```python
# Native HackRF driver (not SoapySDR)
device_type = "hackrf"

# Proper gain settings
rf_gain = {
    "VGA": 35,    # Variable Gain Amplifier
    "LNA": 40,    # Low Noise Amplifier  
    "AMP": 0      # RF Amplifier off
}

# Multiple band profiles
profiles = {
    "2m": {
        "center_freq": 145000000,
        "samp_rate": 2400000,
        # ... other settings
    }
}
```

### Migration Notes
The Python configuration was converted to JSON format for better maintainability and OpenWebRX compatibility. Key translations:

**Python → JSON:**
- `device_type = "hackrf"` → `"type": "hackrf"`
- `rf_gain = {"VGA": 35}` → `"rf_gain": "VGA=35,LNA=40,AMP=0"`
- Profile dictionaries → JSON profile objects

## Docker Backup Configurations

These files represent the exact configuration that was working inside the Docker container before updates.

### sdrs.json (Backup)
**Date:** 2025-06-15  
**Version:** 2  
**Notable Features:**
- German profile names ("70cm Relaisausgabe")
- Optimized for European amateur radio frequencies
- Proven stable operation

### settings.json (Backup)
**Date:** 2025-06-15  
**Version:** 7  
**Key Differences from Current:**
- Different waterfall color scheme
- Alternative audio compression settings
- Original service integration settings

### users.json (Backup)
**Security Note:** Contains working authentication hashes for the admin user with password "hackrf"

## Docker Image Metadata

### index.json & manifest.json
**Purpose:** Complete backup of Docker container configuration metadata

**Contents:**
- Layer information for container rebuild
- Image configuration settings
- Manifest data for exact reproduction

**Use Case:** If current container configuration fails, these files can help recreate the exact working environment.

## When to Use Legacy Configurations

### Rollback Scenarios

**Current JSON config fails:**
1. Copy `sdrs.json` from legacy to current config directory
2. Restart container
3. Test functionality

**Container won't start with new image:**
1. Use manifest.json to identify working image version
2. Pin Docker image to specific version
3. Rebuild with legacy configuration

**Authentication issues:**
1. Copy working `users.json` from legacy
2. Restart container
3. Use known working credentials

### Troubleshooting Reference

**Compare configurations:**
```bash
# Compare current vs legacy SDR config
diff ../json-configs/sdrs.json sdrs.json

# Check what changed in settings
diff ../json-configs/settings.json settings.json
```

**Validate legacy config still works:**
```bash
# Test legacy SDR config
cp sdrs.json ../json-configs/
docker-compose restart
```

## Migration History

### Phase 1: Python to JSON (Early 2025)
- Converted `config_webrx_hackrf.py` to `sdrs.json`
- Maintained all working frequency profiles
- Preserved gain settings and driver selection

### Phase 2: Container Optimization (2025-06-15)
- Updated Docker Compose configuration
- Improved USB device mounting
- Enhanced health checking

### Phase 3: Configuration Refinement (2025-06-15)
- Added additional amateur radio bands
- Optimized gain settings for different environments
- Improved profile naming and organization

## Recovery Procedures

### Complete System Recovery

If the current configuration completely fails:

1. **Stop current container:**
   ```bash
   docker-compose down
   docker system prune -f
   ```

2. **Restore legacy configuration:**
   ```bash
   cp legacy-config/*.json ../json-configs/
   ```

3. **Restart with legacy config:**
   ```bash
   docker-compose up -d
   ```

4. **Verify operation:**
   ```bash
   curl http://localhost:8073/
   ```

### Partial Recovery

For specific issues:

**SDR detection problems:**
```bash
cp legacy-config/sdrs.json ../json-configs/
docker-compose restart
```

**Authentication problems:**
```bash
cp legacy-config/users.json ../json-configs/
docker-compose restart
```

**Display issues:**
```bash
cp legacy-config/settings.json ../json-configs/
docker-compose restart
```

## Configuration Analysis

### What Made These Configs Work

1. **Correct Driver Selection:**
   - Used native HackRF driver instead of SoapySDR
   - Direct hardware access without abstraction layer

2. **Optimized Gain Settings:**
   - VGA=35, LNA=40, AMP=0 for most bands
   - Balanced sensitivity vs. noise performance

3. **Proper Frequency Planning:**
   - Center frequencies optimized for band coverage
   - Sample rates appropriate for bandwidth

4. **Container Configuration:**
   - Privileged mode for USB access
   - Proper device mounting
   - Correct user permissions

### Lessons Learned

**Docker USB Mounting:**
- Full bus mounting (`/dev/bus/usb`) more reliable than specific devices
- udev rules mounting essential for device detection
- Privileged mode required for HackRF access

**OpenWebRX Configuration:**
- Native drivers preferred over SoapySDR when available
- Gain string format critical for HackRF
- Profile organization improves usability

**System Integration:**
- Health checks prevent silent failures
- Resource limits prevent system overload
- Automatic restarts improve reliability

## Compatibility Notes

### OpenWebRX Versions

**Legacy Python Config:**
- Compatible with OpenWebRX 0.19 - 1.0
- Requires manual Python configuration file editing
- No web-based configuration interface

**Legacy JSON Config:**
- Compatible with OpenWebRX 1.0+
- Uses JSON format version 2
- Web-based configuration available

**Current Config:**
- Compatible with OpenWebRX 1.2+
- Enhanced features and stability
- Full web management interface

### HackRF Firmware

All configurations tested with:
- HackRF firmware 2018.01.1
- libhackrf 2018.01.1+
- SoapyHackRF 0.3.3+

### Host System Requirements

**Minimum:**
- Docker 20.0+
- USB 2.0 port
- 1GB RAM
- 500MB storage

**Recommended:**
- Docker 24.0+
- USB 3.0 port
- 2GB+ RAM
- 2GB+ storage

## Maintenance

### Backup Verification

Periodically test legacy configurations:
```bash
# Monthly verification
cd legacy-config
jq '.' *.json  # Validate JSON syntax
```

### Documentation Updates

When current configuration changes significantly:
1. Document changes in this README
2. Update migration procedures
3. Test rollback procedures
4. Update compatibility notes

### Security Maintenance

Legacy configurations may contain:
- Outdated authentication methods
- Default passwords
- Deprecated security settings

**Recommendation:** Use legacy configs only for emergency rollback, not production deployment.

---

**Status:** 📋 Reference Archive  
**Last Updated:** 2025-06-15  
**Purpose:** Emergency rollback and troubleshooting reference  
**Security Level:** Internal use only (contains default passwords)
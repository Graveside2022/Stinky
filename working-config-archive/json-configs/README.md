# JSON Configuration Files

This directory contains the working JSON configuration files for OpenWebRX with HackRF support.

## Files Overview

| File | Purpose | Critical Settings |
|------|---------|------------------|
| `sdrs.json` | SDR device definitions and frequency profiles | Driver type, gain settings, frequency bands |
| `settings.json` | OpenWebRX application settings | Receiver info, display settings, services |
| `users.json` | User authentication | Admin credentials (hashed) |
| `openwebrx-hackrf-config.json` | HackRF-specific SDR configuration | Alternative SDR config format |

## sdrs.json - SDR Device Configuration

**Purpose:** Defines the HackRF device and all frequency band profiles

### Critical Configuration Elements

#### Device Definition
```json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
            "type": "hackrf",           // CRITICAL: Must be "hackrf", not "soapy"
            "ppm": 0,                   // Frequency correction (usually 0)
            "always_on": true,          // Keep SDR active
            "start_profile": "fm_broadcast",  // Default profile on startup
            "auto_start": true          // Start automatically
        }
    }
}
```

#### Profile Structure
Each frequency band is defined as a profile:
```json
"profile_name": {
    "name": "Display Name",
    "center_freq": 145000000,          // Center frequency in Hz
    "rf_gain": "VGA=35,LNA=40,AMP=0",  // CRITICAL: HackRF gain format
    "samp_rate": 2400000,              // Sample rate in Hz
    "start_freq": 145700000,           // Initial tuning frequency
    "start_mod": "nfm",                // Default modulation
    "waterfall_min_level": -72,        // Waterfall display minimum
    "lfo_offset": 300,                 // Local oscillator offset
    "initial_squelch_level": -150,     // Squelch level
    "auto_squelch": false,             // Disable auto-squelch
    "demod_auto_start": true           // Start demodulator automatically
}
```

### Frequency Band Profiles

#### 2m Amateur Band (144-148 MHz)
- **Use Case:** VHF amateur radio, repeaters
- **Modulation:** NFM (Narrow FM)
- **Gain:** Moderate for good sensitivity
- **Sample Rate:** 2.4 MSPS

#### 70cm Amateur Band (420-450 MHz)
- **Use Case:** UHF amateur radio, repeaters
- **Modulation:** NFM (Narrow FM)
- **Gain:** Moderate with good UHF performance
- **Sample Rate:** 2.4 MSPS

#### FM Broadcast (88-108 MHz)
- **Use Case:** Commercial FM radio
- **Modulation:** WFM (Wide FM)
- **Gain:** Lower (strong signals)
- **Sample Rate:** 2.4 MSPS

#### Airband (108-137 MHz)
- **Use Case:** Aviation communications
- **Modulation:** AM (Amplitude Modulation)
- **Gain:** Moderate for air traffic control
- **Sample Rate:** 2.4 MSPS

### RF Gain Settings

**Format:** `"VGA=XX,LNA=XX,AMP=X"`

| Parameter | Range | Purpose | Typical Values |
|-----------|-------|---------|----------------|
| VGA | 0-62 (even) | Variable gain amplifier | 20-40 |
| LNA | 0-40 (8dB steps) | Low noise amplifier | 16-32 |
| AMP | 0 or 14 | RF amplifier on/off | 0 (usually off) |

**Examples:**
- **Strong signals:** `"VGA=20,LNA=16,AMP=0"`
- **Moderate signals:** `"VGA=35,LNA=40,AMP=0"`
- **Weak signals:** `"VGA=50,LNA=40,AMP=14"`

## settings.json - Application Configuration

**Purpose:** OpenWebRX application settings and display configuration

### Key Sections

#### Receiver Information
```json
{
    "version": 7,
    "receiver_name": "OpenWebRX - HackRF Only",
    "receiver_location": "Raspberry Pi",
    "receiver_asl": 200,                    // Altitude above sea level
    "receiver_admin": "admin@localhost",
    "receiver_gps": {
        "lat": 0.0,
        "lon": 0.0
    }
}
```

#### Display Settings
```json
{
    "waterfall_scheme": "GoogleTurboWaterfall",  // Color scheme
    "fft_fps": 9,                               // FFT update rate
    "waterfall_levels": {
        "min": -88.0,                           // Minimum display level
        "max": -20.0                            // Maximum display level
    },
    "tuning_precision": 1                       // Frequency tuning step
}
```

#### Audio Settings
```json
{
    "audio_compression": "adpcm",    // Audio codec
    "fft_compression": "adpcm"       // FFT data compression
}
```

#### Service Integrations (Disabled for Security)
```json
{
    "services": {
        "sdrhu": false,          // Disable SDR.hu reporting
        "pskreporter": false,    // Disable PSK Reporter
        "wsjt": false,          // Disable WSJT-X integration
        "js8": false,           // Disable JS8 integration
        "packet": false,        // Disable packet radio
        "pocsag": false         // Disable POCSAG pager decoding
    }
}
```

**Security Note:** All external services are disabled to prevent data leakage and reduce attack surface.

## users.json - User Authentication

**Purpose:** Defines user accounts and authentication

### Structure
```json
[
    {
        "user": "admin",
        "enabled": true,
        "must_change_password": false,
        "password": {
            "encoding": "hash",
            "value": "c70472610312fcfa7af6abcd6b24eebabcd0a6a8f10abf2c6044e79ef5369373",
            "algorithm": "sha256",
            "salt": "467d8cb5b0130869cda502eddeff6b7439d3a5e18a92b69c2f8f360e8246d550"
        }
    }
]
```

### Default Credentials
- **Username:** admin
- **Password:** hackrf

### Changing Password

1. Generate new hash:
   ```bash
   echo -n "new_password" | sha256sum
   ```

2. Generate random salt:
   ```bash
   openssl rand -hex 32
   ```

3. Update `users.json` with new values

**Security:** Always change default password for production use.

## openwebrx-hackrf-config.json - Alternative Configuration

**Purpose:** Standalone HackRF configuration (backup/alternative)

This file contains the same SDR definitions as `sdrs.json` but in a different format for compatibility with different OpenWebRX versions.

## Configuration Dependencies

These files must work together:

1. **sdrs.json:** Defines the hardware and profiles
2. **settings.json:** Provides application settings that reference SDR profiles
3. **users.json:** Enables access to the web interface
4. **Docker volume mapping:** Makes configs available to container

## Validation and Testing

### JSON Syntax Validation
```bash
# Test each file for valid JSON
jq '.' sdrs.json
jq '.' settings.json
jq '.' users.json
```

### Configuration Testing
```bash
# Test in development container
docker run --rm -it \
  -v $(pwd):/var/lib/openwebrx:ro \
  jketterl/openwebrx:latest \
  python3 -m openwebrx --config-check
```

### Field Validation Checklist

**sdrs.json:**
- [ ] `"type": "hackrf"` (not "soapy")
- [ ] Frequencies within HackRF range (1MHz - 6GHz)
- [ ] Gain values within valid ranges
- [ ] Sample rates supported by HackRF
- [ ] Profile names are valid identifiers

**settings.json:**
- [ ] Version number matches OpenWebRX version
- [ ] All required fields present
- [ ] Service integrations appropriately configured
- [ ] Display settings reasonable for hardware

**users.json:**
- [ ] At least one enabled user
- [ ] Valid password hashes
- [ ] Proper JSON array structure

## Troubleshooting

### Common Issues

**HackRF not detected:**
- Check `"type": "hackrf"` in sdrs.json
- Verify container has access to USB devices
- Confirm HackRF is connected: `lsusb | grep 1d50:6089`

**No audio output:**
- Check RF gain settings (too high causes clipping)
- Verify frequency is within band limits
- Try different modulation modes

**Configuration not loading:**
- Validate JSON syntax
- Check file permissions in container
- Verify volume mounting in docker-compose.yml

**Web interface not accessible:**
- Check users.json for valid credentials
- Verify container port mapping
- Check firewall settings

### Debug Configuration

Add debug settings to settings.json:
```json
{
    "debug": true,
    "log_level": "DEBUG"
}
```

## Customization Guide

### Adding New Frequency Bands

1. Add new profile to sdrs.json:
```json
"new_band": {
    "name": "New Band Name",
    "center_freq": FREQUENCY_HZ,
    "rf_gain": "VGA=XX,LNA=XX,AMP=X",
    "samp_rate": 2400000,
    "start_freq": START_FREQUENCY,
    "start_mod": "MODULATION_TYPE"
}
```

2. Test with container restart:
```bash
docker-compose restart
```

### Optimizing for Different Environments

**Urban Environment (Strong Signals):**
- Reduce VGA and LNA values
- Use AMP=0
- Lower waterfall minimum levels

**Rural Environment (Weak Signals):**
- Increase VGA and LNA values
- Consider AMP=14 for very weak signals
- Raise waterfall minimum levels

**Mobile/Portable Setup:**
- Use balanced gain settings
- Enable auto-squelch
- Set reasonable default frequencies

## Backup and Recovery

### Create Backup
```bash
tar -czf config-backup-$(date +%Y%m%d).tar.gz *.json
```

### Restore from Backup
```bash
tar -xzf config-backup-YYYYMMDD.tar.gz
docker-compose restart
```

### Version Control
These configuration files should be version controlled:
```bash
git add *.json
git commit -m "Update OpenWebRX configuration"
```

---

**Status:** ✅ Verified Working Configuration  
**Last Updated:** 2025-06-15  
**Compatible With:** OpenWebRX 1.2+, HackRF One  
**Format Version:** 2 (current standard)
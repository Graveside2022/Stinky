# OpenWebRX HackRF One - Working Solution

## Quick Start (Tested & Working)

```bash
# 1. Ensure HackRF is connected
lsusb | grep 1d50:6089

# 2. Run the simple setup script
./hackrf-docker-simple.sh

# 3. Access OpenWebRX
# URL: http://localhost:8073
# Username: admin (if prompted)
# Password: hackrf (if prompted)
```

## What This Does

1. **Uses Official Image**: `jketterl/openwebrx:latest`
2. **Direct Config Mount**: Mounts the working `openwebrx-hackrf-config.json` directly as `/var/lib/openwebrx/sdrs.json`
3. **Native HackRF Driver**: Uses `"type": "hackrf"` (NOT SoapySDR)
4. **Privileged USB Access**: Full access to USB devices

## The Working Configuration

The key is using the native HackRF driver configuration in `openwebrx-hackrf-config.json`:

```json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
            "type": "hackrf",  // ← Critical: Native driver
            "ppm": 0,
            "profiles": {
                "2m": {
                    "name": "2m Amateur Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm"
                },
                "fm_broadcast": {
                    "name": "FM Broadcast",
                    "center_freq": 98000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 98000000,
                    "start_mod": "wfm"
                }
            }
        }
    }
}
```

## Manual Docker Command

If you prefer to run manually:

```bash
docker run -d \
    --name openwebrx \
    --restart unless-stopped \
    --privileged \
    -p 8073:8073 \
    -v "$(pwd)/openwebrx-hackrf-config.json:/var/lib/openwebrx/sdrs.json" \
    --device /dev/bus/usb:/dev/bus/usb \
    jketterl/openwebrx:latest
```

## Troubleshooting

### HackRF Not Detected
```bash
# Check USB connection
lsusb | grep 1d50:6089
hackrf_info

# Verify in container
docker exec openwebrx hackrf_info
```

### Wrong SDR Type Shows
If you see RTL-SDR, Airspy, or SDRPlay errors:
- The config file isn't being read properly
- Solution: Use the simple script which mounts config directly

### Port Already in Use
```bash
# Find what's using port 8073
sudo lsof -i :8073

# Stop all OpenWebRX containers
docker stop $(docker ps -q --filter name=openwebrx)
docker rm $(docker ps -aq --filter name=openwebrx)
```

## Common Commands

```bash
# View logs
docker logs -f openwebrx

# Restart container
docker restart openwebrx

# Stop container
docker stop openwebrx

# Check config inside container
docker exec openwebrx cat /var/lib/openwebrx/sdrs.json
```

## Known Issues

1. **OpenWebRX v1.3.0-dev**: May ignore custom configs and try default SDRs
2. **Solution**: The direct mount approach bypasses this issue

## Success Indicators

- ✅ No "RTL-SDR USB Stick" errors in logs
- ✅ No "Airspy HF+" errors in logs  
- ✅ No "SDRPlay device" errors in logs
- ✅ HackRF shows in device selector
- ✅ Waterfall displays when tuned to active frequency

## Tested Frequencies

- **FM Broadcast**: 88-108 MHz (strong signals)
- **2m Amateur**: 144-148 MHz
- **Aircraft**: 118-136 MHz (AM mode)
- **70cm Amateur**: 430-450 MHz
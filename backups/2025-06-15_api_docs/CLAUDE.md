# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raspberry Pi-based system that combines Software Defined Radio (SDR), WiFi scanning, and GPS tracking capabilities with TAK (Team Awareness Kit) integration. The system consists of several interconnected components:

- **HackRF SDR Operations**: Web-based SDR receiver and spectrum analyzer
- **WiFi Scanning**: Kismet-based network scanning with real-time tracking
- **GPS Integration**: MAVLink to GPSD bridge for location services
- **TAK Integration**: Converts WiFi scan data to TAK format for mapping

## Common Commands

### Service Management

Start all services (GPS + Kismet + WigleToTAK):
```bash
/home/pi/stinky/gps_kismet_wigle.sh
```

Individual service commands:
```bash
# GPS services
sudo systemctl restart gpsd
gpspipe -w -n 1  # Test GPS

# Kismet (WiFi scanning)
/home/pi/Scripts/start_kismet.sh
pkill -f "kismet"  # Stop Kismet

# Check service status
pgrep -f "kismet"
pgrep -f "WigleToTak2"
cat /home/pi/tmp/gps_kismet_wigle.pids
```

### Python Virtual Environments

Activate environments before running Python applications:
```bash
# GPSmav (GPS bridge)
source /home/pi/gpsmav/GPSmav/venv/bin/activate
cd /home/pi/gpsmav/GPSmav && ./mavgps.py

# WigleToTAK
cd /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK
source venv/bin/activate
python3 WigleToTak2.py

# HackRF spectrum analyzer
cd /home/pi/HackRF
source venv/bin/activate
python3 spectrum_analyzer.py
```

### Monitoring and Logs

Check application logs:
```bash
tail -f /home/pi/tmp/gps_kismet_wigle.log
tail -f /home/pi/tmp/kismet.log
tail -f /home/pi/tmp/wigletotak.log
tail -f /home/pi/kismet_ops/kismet_debug.log
```

### Network Interface Configuration

Configure WiFi adapter for monitoring:
```bash
# Put in monitor mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up

# Reset to managed mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up
```

## Code Architecture

### Directory Structure
- `/home/pi/stinky/`: Main orchestration scripts that coordinate all services
- `/home/pi/gpsmav/`: MAVLink to GPSD bridge - converts drone GPS to standard format
- `/home/pi/WigletoTAK/`: Web dashboard for converting Kismet WiFi scans to TAK format
- `/home/pi/HackRF/`: SDR tools including spectrum analyzer and signal processing
- `/home/pi/openwebrx/`: Docker-based web SDR receiver
- `/home/pi/kismet_ops/`: Kismet operation logs and captured data files

### Key Integration Points
1. **GPS Flow**: MAVLink device → mavgps.py → GPSD (port 2947) → Kismet
2. **WiFi Scanning**: Kismet → .wiglecsv files → WigleToTAK → TAK server
3. **Service Coordination**: gps_kismet_wigle.sh manages all processes with PID tracking

### Important Ports
- 2947: GPSD service
- 6969: TAK broadcasting (default, configurable)
- 8000: WigleToTAK Flask web interface (configurable via --flask-port)
- 8073: OpenWebRX SDR interface (Docker container)
- 8092: Spectrum Analyzer web interface with WebSocket support
- 14550: MAVProxy connection

### Web Applications
- **WigleToTak2.py**: Flask app at port 8000 (configurable) for WiFi device tracking and TAK conversion
- **spectrum_analyzer.py**: Flask/SocketIO app at port 8092 for real-time spectrum analysis with OpenWebRX integration
- **OpenWebRX**: Docker-based SDR web interface at port 8073
- **v2WigleToTak2.py**: Enhanced version with antenna sensitivity compensation and improved features

**📋 See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for comprehensive REST API and WebSocket interface documentation.**

## Development Notes

### Testing Commands
```bash
# Test HackRF
/home/pi/test-hackrf.sh
/home/pi/test-hackrf-reception.sh

# Test GPS connection
sudo stty -F /dev/ttyUSB0 4800
timeout 2 cat /dev/ttyUSB0 | grep '^\$G[PNLR][A-Z]\{3\}'

# Check USB devices
lsusb
ls -l /dev/ttyUSB* /dev/ttyACM*
```

### Process Management
The main orchestration script (`gps_kismet_wigle.sh`) handles:
- Starting services with proper delays
- Monitoring process health
- Automatic restart on failure
- Clean shutdown with signal handling
- PID file management in `/home/pi/tmp/`

### Configuration Files
- `config.json`: HackRF frequency and gain settings
- `sdrs.json`, `settings.json`: SDR configurations
- `bands.json`: Radio band definitions
- Docker configurations in `docker-compose.yml`

### Python Dependencies
Each component has its own virtual environment with requirements.txt:
- GPSmav: pymavlink, pyserial
- WigleToTAK: Flask, various web dependencies
- HackRF: Signal processing libraries

Always activate the appropriate virtual environment before running Python scripts.

## HackRF/OpenWebRX Troubleshooting

### Issue: HackRF not working in OpenWebRX
The default SDR configuration uses SoapySDR which may not work properly with HackRF. Use the native HackRF driver instead.

### Solution Steps:
1. **Verify HackRF detection**:
   ```bash
   docker exec openwebrx SoapySDRUtil --find
   # Should show: Found device 0, driver = hackrf
   ```

2. **Backup and update SDR configuration**:
   ```bash
   docker exec openwebrx cp /var/lib/openwebrx/sdrs.json /var/lib/openwebrx/sdrs.json.backup
   docker cp /home/pi/openwebrx-hackrf-config.json openwebrx:/var/lib/openwebrx/sdrs.json
   docker restart openwebrx
   ```

3. **Working HackRF configuration** (native driver with proper gain settings):
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
                       "name": "2m AFu Band",
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
   ```

4. **Access OpenWebRX**:
   - URL: http://localhost:8073 (or your Pi's IP:8073)
   - Default credentials: admin/hackrf

### Key Changes from Default:
- Changed `"type": "soapy"` to `"type": "hackrf"` (native driver)
- Added specific RF gain settings: `"VGA=35,LNA=40,AMP=0"`
- Added `lfo_offset` for frequency correction
- Configured multiple band profiles for different frequencies
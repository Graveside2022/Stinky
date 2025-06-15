# Components Mapping

This document maps the external component directories to the new stinkster project structure.

## Component Structure

### Orchestration Scripts (`src/orchestration/`)
**Source:** `/home/pi/stinky/`
**Contents:**
- `gps_kismet_wigle.sh` - Main orchestration script (executable)
- `gps_kismet_wigle_fast.sh` - Fast variant (executable)
- `gps_kismet_wigle_fast_simple.sh` - Simplified fast variant (executable)
- `start_kismet_background.sh` - Background Kismet starter (executable)
- `v2gps_kismet_wigle.sh` - Version 2 orchestration (executable)

**Purpose:** Main service coordination and process management scripts

### GPS/MAVLink Bridge (`src/gpsmav/`)
**Source:** `/home/pi/gpsmav/GPSmav/`
**Contents:**
- `mavgps.py` - Main MAVLink to GPSD bridge (executable)
- `requirements.txt` - Python dependencies
- `install_offline.sh` - Offline installation script
- `README.md` - Component documentation
- `venv/` - Virtual environment with dependencies
- `pymavlink_package.tar.gz` - Offline package
- `pyserial_package.tar.gz` - Offline package

**Purpose:** Converts MAVLink GPS data to GPSD format for system integration

### WiFi Scanning & TAK Integration (`src/wigletotak/`)
**Source:** `/home/pi/WigletoTAK/`
**Contents:**
- `WigleToTAK/` - Main WigleToTAK application
  - `TheStinkToTAK/` - Enhanced version
    - `WigleToTak2.py` - Main Flask application
    - `v2WigleToTak2.py` - Version 2 variant
    - `templates/WigleToTAK.html` - Web interface
    - `requirements.txt` - Dependencies
    - `venv/` - Virtual environment
  - `WigletoTAK.py` - Original version
  - `requirements.txt` - Dependencies
  - `templates/WigleToTAK.html` - Web interface
- `LICENSE` - License file
- `README.md` - Documentation

**Purpose:** Web dashboard for converting Kismet WiFi scan data to TAK format

### HackRF SDR Operations (`src/hackrf/`)
**Source:** `/home/pi/HackRF/`
**Contents:**
- `spectrum_analyzer.py` - Main spectrum analyzer Flask app
- `DETECT.py` - Signal detection script
- `detect.py` - Detection utilities
- `d2.py` - Data processing script
- `d2_before_visual_fixes.py` - Previous version
- `config.json` - HackRF configuration
- `templates/spectrum.html` - Web interface template
- `venv/` - Virtual environment
- `detect/` - Detection library virtual environment
- `docker/dockerfile` - Docker configuration
- Various log files and data files

**Purpose:** HackRF-based spectrum analysis and signal detection

### Utility Scripts (`src/scripts/`)
**Source:** `/home/pi/Scripts/`
**Contents:**
- `start_kismet.sh` - Kismet startup script (executable)
- `start_mediamtx.sh` - MediaMTX startup script (executable)

**Purpose:** Individual service startup and management utilities

## File Permissions Preserved

All executable permissions have been preserved:
- Shell scripts (*.sh) maintain their executable status
- Python scripts maintain their permissions
- Configuration files remain readable

## Virtual Environments

Each component includes its virtual environment with installed dependencies:
- `src/gpsmav/venv/` - GPSmav Python environment
- `src/wigletotak/WigleToTAK/TheStinkToTAK/venv/` - WigleToTAK environment
- `src/hackrf/venv/` - HackRF spectrum analyzer environment
- `src/hackrf/detect/` - Detection utilities environment

## Integration Points

The components integrate through:
1. **GPS Flow:** mavgps.py → GPSD (port 2947) → Kismet
2. **WiFi Data:** Kismet → .wiglecsv files → WigleToTAK → TAK server
3. **Service Management:** Orchestration scripts coordinate all processes
4. **Web Interfaces:** 
   - Port 6969: WigleToTAK dashboard
   - Spectrum analyzer: Flask/SocketIO interface

## Original Locations Reference

| Component | Original Path | New Path |
|-----------|---------------|----------|
| Orchestration | `/home/pi/stinky/` | `src/orchestration/` |
| GPS Bridge | `/home/pi/gpsmav/GPSmav/` | `src/gpsmav/` |
| WiFi/TAK | `/home/pi/WigletoTAK/` | `src/wigletotak/` |
| HackRF/SDR | `/home/pi/HackRF/` | `src/hackrf/` |
| Utilities | `/home/pi/Scripts/` | `src/scripts/` |

All source code has been successfully copied with permissions preserved.
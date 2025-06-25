# External System Dependencies Analysis

This document identifies all external system files and dependencies that the stinkster project references outside of `/home/pi/projects/stinkster/`.

## Executive Summary

The stinkster project has extensive dependencies on external directories and files throughout the `/home/pi/` filesystem. These dependencies include:

- **5 major component directories** under `/home/pi/`
- **2 systemd service files** in `/etc/systemd/system/`
- **Multiple configuration files** in `/home/pi/` and `/etc/`
- **System directories** for logs, PIDs, and operations
- **Backup directories** and configuration files

## Major External Directories Required

### Component Directories (CRITICAL)
1. **`/home/pi/stinky/`** - Main orchestration scripts
   - Contains: `gps_kismet_wigle.sh` and related service coordination scripts
   - Status: ✅ EXISTS
   - Files: gps_kismet_wigle.sh, gps_kismet_wigle_fast.sh, etc.

2. **`/home/pi/gpsmav/GPSmav/`** - GPS bridge service
   - Contains: MAVLink to GPSD bridge with Python virtual environment
   - Status: ✅ EXISTS
   - Files: mavgps.py, venv/, requirements.txt

3. **`/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/`** - WiFi to TAK conversion
   - Contains: Flask web application for converting Kismet data to TAK format
   - Status: ✅ EXISTS
   - Files: WigleToTak2.py, venv/, config files

4. **`/home/pi/HackRF/`** - SDR tools and spectrum analyzer
   - Contains: HackRF tools, spectrum analyzer, signal processing
   - Status: ✅ EXISTS
   - Files: spectrum_analyzer.py, config.json, venv/

5. **`/home/pi/openwebrx/`** - Web-based SDR receiver
   - Contains: OpenWebRX configuration and data
   - Status: ✅ EXISTS
   - Files: owrx/, requirements.txt, configuration files

### System Directories
6. **`/home/pi/tmp/`** - Log and PID files
   - Purpose: Runtime logs, PID files, temporary data
   - Referenced in: config.py, load_config.sh, multiple scripts
   - Status: ✅ EXISTS (created by system-dependencies.sh)

7. **`/home/pi/kismet_ops/`** - Kismet operation data
   - Purpose: Kismet logs, captured data files, session storage
   - Status: ✅ EXISTS
   - Files: *.kismet, *.wiglecsv, kismet_debug.log

8. **`/home/pi/backups/`** - System backups
   - Purpose: Automated backups created by backup scripts
   - Status: ✅ EXISTS
   - Files: Timestamped backup directories

## Systemd Service Files

### Active Service Files in `/etc/systemd/system/`
1. **`hackrf-scanner.service`** - HackRF Scanner service
   - Source: `/home/pi/projects/stinkster/systemd/hackrf-scanner.service`
   - Status: ✅ INSTALLED
   - Target: `/etc/systemd/system/hackrf-scanner.service`

2. **`openwebrx-landing.service`** - Landing page service  
   - Source: `/home/pi/projects/stinkster/systemd/openwebrx-landing.service`
   - Status: ✅ INSTALLED and ENABLED
   - Target: `/etc/systemd/system/openwebrx-landing.service`

## Configuration Files in `/home/pi/`

### SDR Configuration Files
1. **`/home/pi/openwebrx-hackrf-config.json`** - OpenWebRX HackRF profiles
   - Purpose: Custom frequency bands and HackRF settings for OpenWebRX
   - Status: ✅ EXISTS
   - Referenced in: build-openwebrx.sh, openwebrx-tools.sh, HACKRF_DOCKER_SETUP.md

2. **`/home/pi/config.json`** - HackRF configuration
   - Purpose: HackRF frequency and gain settings
   - Status: ✅ EXISTS
   - Size: 823 bytes

### Other Configuration Files
3. **`/home/pi/hackrf-sdrs.json`** - HackRF SDR definitions
4. **`/home/pi/military-sigint-profiles.json`** - Military SIGINT profiles
5. **`/home/pi/sdrs.json`**, **`/home/pi/sdrs-final.json`** - Various SDR configs
6. **`/home/pi/settings.json`** - General settings

## Configuration Files in `/etc/`

### System Configuration Files
1. **`/etc/default/gpsd`** - GPSD configuration
   - Purpose: GPSD daemon configuration including device paths
   - Referenced in: DEPENDENCIES.md, install.sh, config_backup_guide.md

2. **`/etc/udev/rules.d/53-hackrf.rules`** - HackRF USB permissions
   - Purpose: USB device permissions for HackRF access
   - Content: `SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="6089", MODE="0666", GROUP="plugdev"`

### Kismet Configuration Files
3. **`/etc/kismet/`** directory - Kismet system configuration
   - Files: kismet.conf, kismet_alerts.conf, kismet_filter.conf, etc.
   - Purpose: System-wide Kismet configuration

### User-Specific Kismet Configuration
4. **`/home/pi/.kismet/`** directory - User Kismet settings
   - Files: kismet_site.conf, kismet_httpd.conf, kismet_server_id.conf
   - Purpose: User-specific Kismet overrides (takes precedence over /etc/kismet/)

## Virtual Environments and Dependencies

### Python Virtual Environments (Referenced in backup_exclusions.txt)
1. **`/home/pi/gemini-mcp-server/venv/`** - Gemini MCP server environment
2. **`/home/pi/python_venvs/GPSmav_venv/venv/`** - GPSmav virtual environment
3. **`/home/pi/python_venvs/mavproxy_venv/`** - MAVProxy virtual environment
4. **`/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/venv/`** - WigleToTAK environment
5. **`/home/pi/gpsmav/GPSmav/venv/`** - GPSmav environment
6. **`/home/pi/HackRF/venv/`** - HackRF tools environment
7. **`/home/pi/military-sdr-wrapper/venv/`** - Military SDR wrapper environment

## External Scripts and Tools

### Referenced External Paths
1. **`/home/pi/Scripts/`** - External scripts directory
   - Referenced in: load_config.sh as SCRIPT_DIR
   - Purpose: Contains various utility scripts
   - Status: ❌ NOT FOUND (or empty)

2. **`/home/pi/scripts/`** - System scripts (different from Scripts/)
   - Referenced in: SESSION_LOG_2025-06-15.md
   - Files: backup_system.sh, maintenance.sh, backup_exclude.txt

## Docker and Container Dependencies

### Docker Volumes and Mounts
1. **`/home/pi/openwebrx:/var/lib/openwebrx`** - OpenWebRX data persistence
2. **`openwebrx-config:/etc/openwebrx`** - OpenWebRX configuration volume

### Docker Compose Files
- **`/home/pi/projects/stinkster/docker-compose.yml`** - Main orchestration
- **`/home/pi/projects/stinkster/docker-compose.template.yml`** - Template

## Backup and Restore Dependencies

### Backup Directories
1. **`/home/pi/backups/`** - Main backup directory
2. **`/home/pi/openwebrx-backups/`** - OpenWebRX-specific backups
3. **`/home/pi/openwebrx-backup-YYYYMMDD-HHMMSS/`** - Timestamped backups

### Backup-Related Files
- **`/home/pi/projects/stinkster/backup_exclusions.txt`** - Files to exclude from backups

## Service Dependencies and Integration Points

### Port Dependencies
- **2947** - GPSD service port
- **6969** - WigleToTAK web interface  
- **8073** - OpenWebRX web interface
- **14550** - MAVProxy connection

### Process Integration
- **GPS Flow**: MAVLink device → mavgps.py → GPSD (port 2947) → Kismet
- **WiFi Scanning**: Kismet → .wiglecsv files → WigleToTAK → TAK server
- **Service Coordination**: gps_kismet_wigle.sh manages all processes with PID tracking

## Required Actions for Full Portability

### Symlinks or References Needed
1. Create symlinks in `/home/pi/projects/stinkster/external/` pointing to:
   - `/home/pi/stinky/` → `external/stinky/`
   - `/home/pi/gpsmav/` → `external/gpsmav/`
   - `/home/pi/WigletoTAK/` → `external/WigletoTAK/`
   - `/home/pi/HackRF/` → `external/HackRF/`
   - `/home/pi/openwebrx/` → `external/openwebrx/`

2. Configuration file management:
   - Copy `/home/pi/openwebrx-hackrf-config.json` to project
   - Document all `/etc/` configuration requirements
   - Create templates for all system configuration files

3. Service file management:
   - Ensure systemd service files are properly copied to `/etc/systemd/system/`
   - Create installation scripts for service activation

### Migration Recommendations
1. **Immediate**: Copy all configuration files from `/home/pi/` to project directory
2. **Medium-term**: Create container or virtual environment approach to reduce system dependencies
3. **Long-term**: Refactor to use relative paths and environment variables where possible

## Risk Assessment

### HIGH RISK - Critical Dependencies
- Component directories (`/home/pi/stinky/`, `/home/pi/gpsmav/`, etc.)
- Systemd service files
- GPSD and USB device configuration

### MEDIUM RISK - Configuration Dependencies  
- SDR configuration files in `/home/pi/`
- Kismet user configuration
- Backup directories

### LOW RISK - Transient Dependencies
- Log files in `/home/pi/tmp/`
- PID files
- Cache directories

This analysis shows that the stinkster project has significant external dependencies that would require careful migration planning for full portability.
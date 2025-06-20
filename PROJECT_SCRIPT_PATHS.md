# Project Script Paths Configuration

## Overview
All scripts are now configured to use paths within the project directory structure, making the project self-contained and portable.

## Script Locations
- **Main Orchestration**: `/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh`
- **Kismet Startup**: `/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh`
- **Smart Restart**: `/home/pi/projects/stinkster_malone/stinkster/src/orchestration/smart_restart.sh`
- **Service Control**: `/home/pi/projects/stinkster_malone/stinkster/src/orchestration/stop_and_restart_services.sh`

## Configuration Updates Applied

### 1. Node.js Server (`server.js`)
- Updated SimpleScriptManager to use project-local scripts
- Updated API endpoints to reference correct paths

### 2. Sudoers Configuration
- Added permissions for all project scripts
- Removed references to external script locations
- Installed at `/etc/sudoers.d/kismet-operations`

### 3. Systemd Service
- Added write permissions for `/home/pi/kismet_ops` and `/home/pi/WigletoTAK`
- Service configured to allow script execution with proper permissions

### 4. Script Updates
- Fixed default paths in orchestration scripts
- Updated STINKSTER_ROOT defaults to correct project path
- Configured Kismet to use `/home/pi/kismet_ops` for data storage

## Usage
The web interface start/stop buttons now execute scripts from within the project directory with proper permissions.

## Testing
Click the start button in the web interface - it should now successfully:
1. Start GPS services
2. Launch Kismet with WiFi monitoring
3. Start WigleToTAK for TAK integration
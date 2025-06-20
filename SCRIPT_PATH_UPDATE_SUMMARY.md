# Script Path Update Summary

## Overview
Updated all script paths in the Node.js server and related files to use scripts from within the project directory instead of external locations.

## Changes Made

### 1. Node.js Server Updates
**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/server.js`

#### SimpleScriptManager Constructor (Lines 89-92)
Updated script paths from:
- `gps_kismet_wigle: '/home/pi/stinky/gps_kismet_wigle.sh'`
- `kismet: '/home/pi/Scripts/start_kismet.sh'`

To:
- `gps_kismet_wigle: '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh'`
- `kismet: '/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh'`

#### API Endpoint Script Paths (Lines 1697-1700)
Updated script paths in the `/api/start-script` endpoint from external locations to project-local paths.

### 2. Test File Updates
**File**: `/home/pi/projects/stinkster_malone/stinkster/scripts/test-script-execution.js`
- Updated test script path from `/home/pi/stinky/gps_kismet_wigle.sh` to project-local path

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/tests/mocks/index.js`
- Updated mock script paths in MockShellExecutor to use project-local paths

### 3. Documentation Updates
**File**: `/home/pi/projects/stinkster_malone/stinkster/HANDOFF_SUMMARY.md`
- Updated orchestration script reference to project-local path

**File**: `/home/pi/projects/stinkster_malone/stinkster/WEBHOOK_DEPENDENCY_MAPPING.md`
- Updated both primary script and Kismet script paths to project-local paths

## Verified Correct Paths
The following files already had correct project-local paths:
- `/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh` - Uses STINKSTER_ROOT variable with correct default
- `/home/pi/projects/stinkster_malone/stinkster/systemd/kismet-orchestration.service` - Already uses correct project path

## Project Script Structure
All scripts are now referenced from within the project:
```
/home/pi/projects/stinkster_malone/stinkster/
├── src/
│   ├── orchestration/
│   │   ├── gps_kismet_wigle.sh      # Main orchestration script
│   │   ├── smart_restart.sh         # Smart restart wrapper
│   │   └── stop_and_restart_services.sh  # Service control script
│   └── scripts/
│       └── start_kismet.sh          # Kismet startup script
```

## Benefits
1. **Self-contained**: All scripts are within the project directory
2. **Portable**: Project can be moved/copied without breaking script references
3. **Version control**: All scripts are part of the repository
4. **Consistency**: No dependencies on external script locations

## Testing
After these changes, the Node.js server should be able to:
1. Start/stop services using the project-local scripts
2. Execute all orchestration tasks without external dependencies
3. Run tests with correct mock paths
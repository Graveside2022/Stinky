# ORCHESTRATION DEPENDENCY ANALYSIS

## Executive Summary

This analysis documents the orchestration scripts found in the current project structure, their dependencies, required paths, and external service requirements. Path corrections needed for full colocation within the current `/home/pi/projects/stinkster_malone/stinkster` directory are identified.

## Current Project Structure

**Base Directory**: `/home/pi/projects/stinkster_malone/stinkster`

### Key Orchestration Scripts

1. **Primary Orchestration Scripts**
   - `src/orchestration/gps_kismet_wigle.sh` - Main orchestration script
   - `src/orchestration/v2gps_kismet_wigle.sh` - Alternative version  
   - `src/orchestration/gps_kismet_wigle_fast.sh` - Fast startup version
   - `src/orchestration/gps_kismet_wigle_fast_simple.sh` - Simplified version

2. **Service-Specific Scripts**
   - `src/scripts/start_kismet.sh` - Kismet WiFi scanner startup
   - `src/scripts/start_mediamtx.sh` - MediaMTX streaming server
   - `dev/components/*.sh` - Development wrappers for each service

## Path Dependencies Analysis

### 1. GPS Service (GPSmav) Dependencies

**Current Script References:**
```bash
# From gps_kismet_wigle.sh
GPSMAV_DIR="/home/pi/gpsmav/GPSmav"  # OLD PATH
```

**Required Corrections:**
```bash
# Should be:
GPSMAV_DIR="${PROJECT_ROOT}/src/gpsmav"
GPSMAV_VENV="${GPSMAV_DIR}/venv"
GPSMAV_SCRIPT="${GPSMAV_DIR}/mavgps.py"
```

**Files Present in Current Structure:**
- `/home/pi/projects/stinkster_malone/stinkster/src/gpsmav/mavgps.py` ✅
- `/home/pi/projects/stinkster_malone/stinkster/src/gpsmav/requirements.txt` ✅
- `/home/pi/projects/stinkster_malone/stinkster/src/gpsmav/venv/` (needs creation)

### 2. Kismet Service Dependencies

**Current Script References:**
```bash
# From start_kismet.sh
KISMET_OPS_DIR="${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}"
```

**Required Corrections:**
```bash
# Should be:
KISMET_OPS_DIR="${PROJECT_ROOT}/data/kismet"
KISMET_PID_FILE="${KISMET_OPS_DIR}/kismet.pid"
KISMET_LOG_FILE="${KISMET_OPS_DIR}/kismet_debug.log"
```

**Current Structure:**
- Data directory: `/home/pi/projects/stinkster_malone/stinkster/data/kismet/` ✅
- Kismet config: `~/.kismet/kismet_site.conf` (dynamically created)

### 3. WigleToTAK Service Dependencies

**Current Script References:**
```bash
# From gps_kismet_wigle.sh
WIGLETOTAK_DIR="${WIGLETOTAK_DIR:-/home/pi/projects/stinkster/wigletotak}/WigleToTAK/TheStinkToTAK"
```

**Path Issues Identified:**
- Original Python version path: `/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/`
- Current colocated Python version: `src/wigletotak/WigleToTAK/TheStinkToTAK/`
- **NEW Node.js version**: `src/nodejs/wigle-to-tak/` (needs integration)

**Required Corrections:**
```bash
# Should use Node.js version:
WIGLETOTAK_DIR="${PROJECT_ROOT}/src/nodejs/wigle-to-tak"
WIGLETOTAK_SERVICE="server.js"
WIGLETOTAK_PORT="${WIGLETOTAK_PORT:-8000}"
```

### 4. Node.js Services Integration

**New Services Not in Original Scripts:**
1. **Kismet Operations Center**
   - Path: `src/nodejs/kismet-operations/`
   - Port: 8092 (configurable)
   - Service: `server.js`

2. **WigleToTAK Node.js Service**
   - Path: `src/nodejs/wigle-to-tak/`
   - Port: 8000 (configurable)
   - Service: `server.js`

## Log Directory Corrections

**Current References:**
```bash
LOG_DIR="${LOG_DIR:-/home/pi/projects/stinkster/logs}"
```

**Required Corrections:**
```bash
PROJECT_ROOT="/home/pi/projects/stinkster_malone/stinkster"
LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/logs}"
```

## Environment Variable Standardization

### Required Environment Variables
```bash
# Base project configuration
export PROJECT_ROOT="/home/pi/projects/stinkster_malone/stinkster"
export STINKSTER_ROOT="${PROJECT_ROOT}"

# Service directories
export GPSMAV_DIR="${PROJECT_ROOT}/src/gpsmav"
export KISMET_DATA_DIR="${PROJECT_ROOT}/data/kismet"
export WIGLETOTAK_DIR="${PROJECT_ROOT}/src/nodejs/wigle-to-tak"
export KISMET_OPS_DIR="${PROJECT_ROOT}/src/nodejs/kismet-operations"

# Log directories
export LOG_DIR="${PROJECT_ROOT}/logs"
export DEV_LOG_DIR="${PROJECT_ROOT}/dev/logs"

# Port configurations
export WIGLETOTAK_PORT=8000
export KISMET_OPS_PORT=8092
export OPENWEBRX_PORT=8073
export GPSD_PORT=2947
export TAK_BROADCAST_PORT=6969
```

## External Service Dependencies

### 1. System Services Required
- **gpsd**: GPS daemon (port 2947)
- **docker**: For OpenWebRX container
- **kismet**: WiFi scanning (requires monitor mode interface)

### 2. Hardware Dependencies
- **wlan2**: WiFi interface for monitoring (configurable)
- **GPS device**: `/dev/ttyUSB0`, `/dev/ttyACM0`, or `/dev/ttyAMA0`
- **HackRF**: USB SDR device for OpenWebRX

### 3. Network Interface Requirements
```bash
# From start_kismet.sh - monitor mode setup
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up
```

## Port Mapping and Service Communication

### Service Port Assignments
| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| GPSD | 2947 | TCP | GPS data distribution |
| WigleToTAK (Node.js) | 8000 | HTTP/WebSocket | Web interface |
| Kismet Operations | 8092 | HTTP/WebSocket | Operations dashboard |
| OpenWebRX | 8073 | HTTP | SDR web interface |
| TAK Broadcast | 6969 | UDP | TAK data transmission |
| MAVLink | 14550 | TCP | Drone GPS connection |

### Inter-Service Communication
```
GPS Flow: MAVLink → mavgps.py → GPSD (port 2947) → Kismet
WiFi Flow: Kismet → .wiglecsv files → WigleToTAK → TAK UDP
Spectrum: HackRF → OpenWebRX (port 8073) ← Kismet Operations dashboard
```

## Critical Path Corrections Needed

### 1. Update Main Orchestration Script
File: `src/orchestration/gps_kismet_wigle.sh`

**Lines requiring updates:**
- Line 10: `LOG_DIR` path correction
- Line 13: `PID_FILE` path correction  
- Line 15: `KISMET_PID_FILE` path correction
- Line 153: `WIGLETOTAK_DIR` path correction to Node.js version
- Line 374: `STINKSTER_ROOT` path correction

### 2. Update Service Scripts
File: `src/scripts/start_kismet.sh`

**Lines requiring updates:**
- Line 6: `KISMET_OPS_DIR` path correction

### 3. Create Node.js Service Integration

**Missing orchestration for Node.js services:**
```bash
# Add to main orchestration script
start_nodejs_services() {
    cd "${PROJECT_ROOT}/src/nodejs/kismet-operations"
    npm start > "${LOG_DIR}/kismet-operations.log" 2>&1 &
    KISMET_OPS_PID=$!
    
    cd "${PROJECT_ROOT}/src/nodejs/wigle-to-tak"  
    npm start > "${LOG_DIR}/wigle-to-tak-nodejs.log" 2>&1 &
    WIGLE_NODEJS_PID=$!
}
```

## Python Virtual Environment Dependencies

### GPSmav Requirements
```bash
cd "${PROJECT_ROOT}/src/gpsmav"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### WigleToTAK Python (Legacy) Requirements
```bash
cd "${PROJECT_ROOT}/src/wigletotak/WigleToTAK/TheStinkToTAK"
python3 -m venv venv
source venv/bin/activate  
pip install -r requirements.txt
```

## Node.js Dependencies

### Kismet Operations
```bash
cd "${PROJECT_ROOT}/src/nodejs/kismet-operations"
npm install
```

### WigleToTAK Node.js
```bash
cd "${PROJECT_ROOT}/src/nodejs/wigle-to-tak"
npm install
```

## Recommended Orchestration Strategy

### Phase 1: Path Standardization
1. Update all scripts to use `PROJECT_ROOT` environment variable
2. Create standardized environment configuration file
3. Test individual service startup with corrected paths

### Phase 2: Service Integration Testing
1. Test GPS → Kismet integration with corrected paths
2. Verify Kismet → WigleToTAK data flow
3. Test Node.js services startup and communication

### Phase 3: Full Stack Orchestration
1. Create unified orchestration script with all services
2. Add proper dependency checking and error handling
3. Implement service health monitoring and auto-restart

## Migration Checklist

- [ ] Update `PROJECT_ROOT` in all orchestration scripts
- [ ] Create environment configuration file
- [ ] Test GPS service with corrected paths
- [ ] Test Kismet startup with corrected data directory
- [ ] Integrate Node.js WigleToTAK service into orchestration
- [ ] Add Kismet Operations Center to orchestration
- [ ] Test full service stack startup
- [ ] Verify inter-service communication
- [ ] Test service monitoring and restart capabilities
- [ ] Create development vs production environment configs

## Risk Assessment

**High Risk:**
- Path mismatches could prevent service startup
- Missing Node.js service integration breaks new functionality
- Log directory permissions and access

**Medium Risk:**
- Virtual environment setup failures
- Port conflicts between services
- Network interface configuration changes

**Low Risk:**
- Docker container configuration (already working)
- Hardware device detection (robust fallback logic exists)

## Next Steps

1. **Immediate**: Update main orchestration script paths
2. **Short-term**: Create environment configuration management
3. **Medium-term**: Full Node.js service integration
4. **Long-term**: Comprehensive service health monitoring

This analysis provides the foundation for full colocation and proper service orchestration within the current project structure.
# Kismet Operations Fix - Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing the Kismet operations fixes, including GPS integration improvements, service coordination, and Node.js dashboard updates.

## Prerequisites
- Raspberry Pi with Kismet installed
- GPS device connected (USB or serial)
- Node.js 14+ installed
- Python 3.7+ with virtual environments
- Sudo access for service management

## Implementation Steps

### Step 1: Backup Current Configuration
```bash
# Create backup directory
mkdir -p ~/kismet_backup_$(date +%Y%m%d)

# Backup critical files
cp -r ~/stinky ~/kismet_backup_$(date +%Y%m%d)/
cp -r ~/kismet_ops ~/kismet_backup_$(date +%Y%m%d)/
cp -r ~/WigletoTAK ~/kismet_backup_$(date +%Y%m%d)/
cp -r /etc/systemd/system/kismet*.service ~/kismet_backup_$(date +%Y%m%d)/ 2>/dev/null
```

### Step 2: Apply GPS Integration Fixes

#### 2.1 Update the orchestration script
```bash
# Replace the existing gps_kismet_wigle.sh
cp /home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh ~/stinky/
chmod +x ~/stinky/gps_kismet_wigle.sh
```

#### 2.2 Configure GPS settings
```bash
# Edit GPSD configuration if needed
sudo nano /etc/default/gpsd

# Ensure these settings:
DEVICES="/dev/ttyUSB0"
GPSD_OPTIONS="-n"
USBAUTO="true"
START_DAEMON="true"
```

#### 2.3 Test GPS connectivity
```bash
# Test GPS device
sudo gpspipe -w -n 5

# If no output, check device:
ls -l /dev/ttyUSB* /dev/ttyACM*
sudo stty -F /dev/ttyUSB0 4800
```

### Step 3: Update Kismet Configuration

#### 3.1 Configure Kismet for GPS
```bash
# Edit Kismet configuration
sudo nano /etc/kismet/kismet.conf

# Add or update:
gps=gpsd:host=localhost,port=2947
```

#### 3.2 Update start script
```bash
# Replace the existing start_kismet.sh
cp /home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh ~/Scripts/
chmod +x ~/Scripts/start_kismet.sh
```

### Step 4: Install Node.js Dashboard Updates

#### 4.1 Navigate to Node.js directory
```bash
cd ~/kismet_ops/nodejs
```

#### 4.2 Install dependencies
```bash
npm install
```

#### 4.3 Update configuration
```bash
# Edit config.json
nano config.json

# Ensure these settings:
{
  "kismet": {
    "host": "localhost",
    "port": 2501,
    "username": "your_username",
    "password": "your_password"
  },
  "server": {
    "port": 3000
  }
}
```

### Step 5: Deploy Service Files

#### 5.1 Copy systemd service files
```bash
# Kismet Operations Center
sudo cp /home/pi/projects/stinkster_malone/stinkster/systemd/kismet-operations-center.service /etc/systemd/system/

# Orchestration service
sudo cp /home/pi/projects/stinkster_malone/stinkster/systemd/kismet-orchestration.service /etc/systemd/system/
```

#### 5.2 Reload systemd
```bash
sudo systemctl daemon-reload
```

#### 5.3 Enable services
```bash
sudo systemctl enable kismet-operations-center
sudo systemctl enable kismet-orchestration
```

### Step 6: Testing Procedures

#### 6.1 Test GPS integration
```bash
# Start GPSD
sudo systemctl restart gpsd

# Verify GPS data
gpspipe -w -n 5 | grep -E "lat|lon"
```

#### 6.2 Test Kismet startup
```bash
# Start Kismet manually
~/Scripts/start_kismet.sh

# Check if running
pgrep -f kismet
curl -k https://localhost:2501/system/status.json
```

#### 6.3 Test orchestration
```bash
# Start orchestration script
~/stinky/gps_kismet_wigle.sh

# Check all services
cat ~/tmp/gps_kismet_wigle.pids
tail -f ~/tmp/gps_kismet_wigle.log
```

#### 6.4 Test Node.js dashboard
```bash
# Start dashboard
cd ~/kismet_ops/nodejs
npm start

# Access at http://localhost:3000
```

### Step 7: Production Deployment

#### 7.1 Stop all services
```bash
# Stop orchestration
pkill -f gps_kismet_wigle.sh
pkill -f kismet
pkill -f WigleToTak2
```

#### 7.2 Start production services
```bash
# Using systemd
sudo systemctl start kismet-orchestration
sudo systemctl start kismet-operations-center

# Or using orchestration script directly
~/stinky/gps_kismet_wigle.sh &
```

#### 7.3 Verify deployment
```bash
# Check service status
sudo systemctl status kismet-orchestration
sudo systemctl status kismet-operations-center

# Check logs
tail -f ~/tmp/gps_kismet_wigle.log
tail -f ~/tmp/kismet.log
```

## Configuration Changes Summary

### 1. GPS Configuration
- GPSD configured for USB GPS device
- Kismet configured to use GPSD
- Added GPS fix waiting logic

### 2. Process Management
- Enhanced PID tracking
- Improved error handling
- Added automatic restart capability

### 3. Service Coordination
- Sequential startup with proper delays
- Health monitoring
- Graceful shutdown handling

### 4. Logging Improvements
- Structured logging with timestamps
- Debug mode support
- Separate log files for each component

## Rollback Procedure

If issues occur, rollback using:
```bash
# Stop all services
sudo systemctl stop kismet-orchestration
sudo systemctl stop kismet-operations-center

# Restore backup
cp -r ~/kismet_backup_$(date +%Y%m%d)/* ~/

# Restart services with old configuration
~/stinky/gps_kismet_wigle.sh &
```

## Verification Checklist

- [ ] GPS device detected and providing data
- [ ] GPSD service running and accessible
- [ ] Kismet starts without errors
- [ ] Kismet receives GPS data
- [ ] WigleToTAK processes scan data
- [ ] Node.js dashboard accessible
- [ ] All processes have PID files
- [ ] Logs show normal operation
- [ ] Services restart on failure

## Next Steps

1. Monitor logs for 24-48 hours
2. Verify GPS accuracy in different locations
3. Test service recovery after reboot
4. Configure alerts for service failures
5. Set up log rotation if needed
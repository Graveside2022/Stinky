# Recovery Procedures for Kismet Operations System

## Overview
This document provides manual recovery steps for common failure scenarios in the Kismet Operations system. Follow these procedures when automated rollback fails or when manual intervention is required.

## Table of Contents
1. [Service Dependency Order](#service-dependency-order)
2. [Manual Recovery Steps](#manual-recovery-steps)
3. [Common Troubleshooting Scenarios](#common-troubleshooting-scenarios)
4. [Emergency Procedures](#emergency-procedures)
5. [Service Recovery Commands](#service-recovery-commands)

## Service Dependency Order

Services must be recovered in the following order due to dependencies:

1. **GPSD** (GPS Service) - Required by Kismet
2. **Network Interface** (wlan2) - Must be in monitor mode
3. **Kismet** - Depends on GPSD and network interface
4. **WigleToTAK** - Depends on Kismet data files
5. **Kismet Operations Center** - Web interface (independent)

## Manual Recovery Steps

### If Rollback Script Fails

1. **Manually restore backup files:**
   ```bash
   # Navigate to backup directory
   cd /home/pi/projects/stinkster_malone/stinkster/outputs/kismet_ops_fix_20250620_142808/phase2/backups
   
   # Restore hi.html
   cp hi.html.backup /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/views/hi.html
   
   # Restore server.js
   cp server.js.backup /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/server.js
   ```

2. **Restart affected services:**
   ```bash
   sudo systemctl restart kismet-operations-center
   ```

3. **Verify restoration:**
   ```bash
   # Check that proxy configuration is removed
   grep -n "createProxyMiddleware" /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/server.js
   
   # Check that API endpoints are reverted
   grep -n "api/start-script" /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/views/hi.html
   ```

### Full System Recovery

1. **Stop all services:**
   ```bash
   # Kill orchestration script
   sudo pkill -f "gps_kismet_wigle.sh"
   
   # Stop individual services
   sudo pkill -f "kismet"
   sudo pkill -f "WigleToTak2.py"
   sudo systemctl stop kismet-operations-center
   ```

2. **Clean up PID files:**
   ```bash
   rm -f /home/pi/tmp/gps_kismet_wigle.pids
   rm -f /home/pi/tmp/*.pid
   ```

3. **Reset network interface:**
   ```bash
   sudo ip link set wlan2 down
   sudo iw dev wlan2 set type managed
   sudo ip link set wlan2 up
   ```

4. **Restart services in order:**
   ```bash
   # Start GPS service
   sudo systemctl start gpsd
   
   # Configure network interface
   sudo ip link set wlan2 down
   sudo iw dev wlan2 set monitor none
   sudo ip link set wlan2 up
   
   # Start orchestration script
   sudo /home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh &
   
   # Start web interface
   sudo systemctl start kismet-operations-center
   ```

## Common Troubleshooting Scenarios

### Scenario 1: Service Fails to Start

**Symptoms:** Service shows as inactive or fails immediately after starting

**Steps:**
1. Check service logs:
   ```bash
   journalctl -u kismet-operations-center -n 50
   ```

2. Check for port conflicts:
   ```bash
   sudo ss -tlnp | grep -E "8000|2947|2501"
   ```

3. Verify file permissions:
   ```bash
   ls -la /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/
   ```

4. Manual start for debugging:
   ```bash
   cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations
   node server.js
   ```

### Scenario 2: GPS Timeout Handling

**Symptoms:** Services fail with GPS timeout errors

**Steps:**
1. Check GPS device:
   ```bash
   ls -la /dev/ttyUSB* /dev/ttyACM*
   ```

2. Test GPS directly:
   ```bash
   sudo stty -F /dev/ttyUSB0 4800
   timeout 5 cat /dev/ttyUSB0
   ```

3. Restart GPSD with correct device:
   ```bash
   sudo systemctl stop gpsd
   sudo gpsd -n /dev/ttyUSB0
   ```

4. Verify GPS fix:
   ```bash
   gpspipe -w -n 5
   ```

### Scenario 3: Network Connectivity Loss

**Symptoms:** WiFi interface not available or not in monitor mode

**Steps:**
1. List network interfaces:
   ```bash
   ip link show
   iw dev
   ```

2. Reset WiFi adapter:
   ```bash
   sudo ip link set wlan2 down
   sleep 2
   sudo ip link set wlan2 up
   ```

3. Force monitor mode:
   ```bash
   sudo airmon-ng start wlan2
   ```

4. Verify monitor mode:
   ```bash
   iw dev wlan2 info | grep type
   ```

### Scenario 4: Port Conflicts

**Symptoms:** Services fail to bind to ports

**Steps:**
1. Identify conflicting processes:
   ```bash
   sudo lsof -i :8000
   sudo lsof -i :2947
   sudo lsof -i :2501
   ```

2. Kill conflicting processes:
   ```bash
   sudo kill -9 $(sudo lsof -t -i :8000)
   ```

3. Change service ports if needed:
   ```bash
   # Edit service configuration
   nano /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/server.js
   # Change PORT variable
   ```

## Emergency Procedures

### Complete System Reset

**Use only when all other recovery attempts fail:**

1. **Create emergency backup:**
   ```bash
   tar -czf /home/pi/emergency_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
     /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/ \
     /home/pi/projects/stinkster_malone/stinkster/src/orchestration/
   ```

2. **Stop everything:**
   ```bash
   sudo killall -9 node kismet python3
   sudo systemctl stop gpsd kismet-operations-center
   ```

3. **Reset to known good state:**
   ```bash
   cd /home/pi/projects/stinkster_malone/stinkster
   git status  # Check current changes
   git stash   # Save current changes
   git checkout -- .  # Reset to last commit
   ```

4. **Restart from clean state:**
   ```bash
   sudo reboot
   ```

### Emergency Contact Procedures

1. **Check system logs:**
   ```bash
   sudo journalctl -p err -n 100
   ```

2. **Collect diagnostic information:**
   ```bash
   # Create diagnostic report
   {
     echo "=== System Information ==="
     date
     uname -a
     echo -e "\n=== Service Status ==="
     systemctl status kismet-operations-center gpsd
     echo -e "\n=== Running Processes ==="
     ps aux | grep -E "kismet|gps|wigle|node"
     echo -e "\n=== Network Interfaces ==="
     ip addr show
     iw dev
     echo -e "\n=== Recent Errors ==="
     journalctl -p err -n 50
   } > /home/pi/diagnostic_report_$(date +%Y%m%d_%H%M%S).txt
   ```

3. **Prepare for support:**
   - Diagnostic report location
   - Recent changes made
   - Error messages encountered
   - Recovery steps attempted

## Service Recovery Commands

### Quick Reference Commands

```bash
# Check all services
/home/pi/projects/stinkster_malone/stinkster/outputs/kismet_ops_fix_20250620_142808/phase4/monitoring_setup.sh

# Restart orchestration
sudo /home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh &

# Restart web interface
sudo systemctl restart kismet-operations-center

# View logs
tail -f /home/pi/tmp/gps_kismet_wigle.log
tail -f /home/pi/projects/stinkster/data/kismet/kismet_debug.log

# Emergency stop all
sudo pkill -f "gps_kismet_wigle.sh|kismet|WigleToTak2"
```

### Service Health Verification

After any recovery procedure, verify system health:

1. Run monitoring script:
   ```bash
   /home/pi/projects/stinkster_malone/stinkster/outputs/kismet_ops_fix_20250620_142808/phase4/monitoring_setup.sh
   ```

2. Check web interface:
   ```bash
   curl -I http://localhost:8000/api/health
   ```

3. Verify data collection:
   ```bash
   ls -la /home/pi/projects/stinkster/data/kismet/*.wiglecsv | tail -5
   ```

## Notes

- Always attempt automated recovery first using the rollback script
- Document any manual changes made during recovery
- Test services incrementally after recovery
- Keep backup copies of working configurations
- Monitor logs during recovery for additional errors

**Recovery Time Objectives:**
- Service restart: 2-5 minutes
- Full rollback: 5-10 minutes
- Complete system reset: 15-20 minutes
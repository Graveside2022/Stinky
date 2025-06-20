# Kismet Operations - Known Issues & Limitations

## Current Limitations

### 1. GPS Synchronization
**Issue**: GPS fix may take 30-120 seconds in cold start conditions
- **Impact**: Services may start without location data initially
- **Workaround**: The orchestration script now waits for GPS fix before starting Kismet
- **Future Fix**: Implement GPS almanac caching for faster fixes

### 2. Memory Usage
**Issue**: Long-running Kismet sessions can consume significant memory
- **Impact**: System may slow down after 24-48 hours of continuous operation
- **Workaround**: 
  ```bash
  # Add to crontab for daily restart
  0 3 * * * systemctl restart kismet-orchestration
  ```
- **Future Fix**: Implement automatic log rotation and database cleanup

### 3. WiFi Interface Conflicts
**Issue**: Monitor mode may conflict with NetworkManager
- **Impact**: WiFi interface may reset to managed mode unexpectedly
- **Workaround**:
  ```bash
  # Disable NetworkManager for monitor interface
  sudo nmcli device set wlan2 managed no
  ```
- **Future Fix**: Create udev rules for persistent monitor mode

### 4. Process Recovery
**Issue**: Child processes may become orphaned if parent crashes
- **Impact**: Duplicate processes may run after unexpected termination
- **Workaround**: Clean shutdown script in orchestration
- **Future Fix**: Implement process group management with cgroups

## Known Bugs

### 1. Log File Growth
**Description**: Log files grow indefinitely without rotation
- **Severity**: Medium
- **Workaround**:
  ```bash
  # Add logrotate configuration
  sudo tee /etc/logrotate.d/kismet-ops << EOF
  /home/pi/tmp/*.log {
      daily
      rotate 7
      compress
      missingok
      notifempty
      create 0644 pi pi
  }
  EOF
  ```

### 2. PID File Stale Locks
**Description**: PID files may remain after improper shutdown
- **Severity**: Low
- **Workaround**: Orchestration script now cleans stale PID files on startup
- **Manual Fix**:
  ```bash
  rm -f ~/tmp/*.pid
  ```

### 3. Node.js Dashboard Memory Leak
**Description**: Dashboard may leak memory when left open for extended periods
- **Severity**: Low
- **Workaround**: Refresh browser page periodically
- **Future Fix**: Implement proper WebSocket cleanup and connection pooling

### 4. GPS Data Validation
**Description**: Invalid GPS data may be accepted during poor signal conditions
- **Severity**: Medium
- **Workaround**: Added basic validation in orchestration script
- **Future Fix**: Implement comprehensive NMEA sentence validation

## Performance Limitations

### 1. Scan Rate
- **Current**: ~100-200 networks per minute (depending on density)
- **Limitation**: USB 2.0 bandwidth and CPU processing
- **Optimization**: Use dedicated monitoring interface

### 2. Database Size
- **Current**: SQLite database grows ~1GB per 24 hours in dense areas
- **Limitation**: SD card I/O performance
- **Optimization**: Move database to external SSD

### 3. Web Interface Responsiveness
- **Current**: May lag with >10,000 networks in database
- **Limitation**: Browser memory and rendering performance
- **Optimization**: Implement pagination and data virtualization

## Compatibility Issues

### 1. GPS Devices
**Tested Working**:
- Generic USB GPS (PL2303)
- GlobalSat BU-353
- u-blox GPS modules

**Known Issues**:
- Some Garmin devices require specific baud rates
- Bluetooth GPS modules have connection stability issues

### 2. WiFi Adapters
**Recommended**:
- Alfa AWUS036ACH (AC1200)
- TP-Link TL-WN722N v1 (not v2/v3)

**Known Issues**:
- Realtek RTL8812AU may require driver compilation
- Some adapters don't support monitor mode properly

### 3. Operating System
**Tested On**:
- Raspberry Pi OS (Bullseye)
- Ubuntu 20.04/22.04 ARM64

**Known Issues**:
- SELinux may block some operations
- AppArmor profiles may need adjustment

## Security Considerations

### 1. Default Credentials
**Issue**: Kismet uses default admin credentials initially
- **Risk**: Unauthorized access to scan data
- **Mitigation**: Change password immediately after installation

### 2. HTTPS Certificates
**Issue**: Self-signed certificates trigger browser warnings
- **Risk**: Man-in-the-middle attacks on local network
- **Mitigation**: Install proper certificates or use SSH tunnel

### 3. Service Permissions
**Issue**: Some services run with elevated privileges
- **Risk**: Potential privilege escalation
- **Mitigation**: Use capability dropping where possible

## Future Improvements Needed

### High Priority
1. **Automated Testing Suite**
   - Unit tests for GPS validation
   - Integration tests for service coordination
   - Performance benchmarks

2. **Configuration Management**
   - Centralized configuration file
   - Environment-specific overrides
   - Configuration validation

3. **Monitoring & Alerting**
   - Prometheus metrics export
   - Service health endpoints
   - Alert on service failures

### Medium Priority
1. **Data Management**
   - Automatic database archival
   - Data retention policies
   - Export to cloud storage

2. **User Interface**
   - Real-time GPS status indicator
   - Service health dashboard
   - Mobile-responsive design

3. **Documentation**
   - API documentation
   - Architecture diagrams
   - Video tutorials

### Low Priority
1. **Feature Enhancements**
   - Multiple GPS source support
   - Advanced filtering options
   - Custom alert rules

2. **Integration Options**
   - MQTT publishing
   - Elasticsearch export
   - Grafana dashboards

## Workaround Summary

### Quick Fixes for Common Issues

1. **Services won't start**:
   ```bash
   ~/stinky/smart_restart.sh
   ```

2. **GPS not working**:
   ```bash
   sudo systemctl restart gpsd
   sleep 5
   gpspipe -w -n 1
   ```

3. **High memory usage**:
   ```bash
   sudo systemctl restart kismet-orchestration
   ```

4. **Dashboard not accessible**:
   ```bash
   cd ~/kismet_ops/nodejs
   npm start
   ```

5. **Complete reset**:
   ```bash
   pkill -f "kismet|wigle|gps"
   rm -f ~/tmp/*.pid
   ~/stinky/gps_kismet_wigle.sh
   ```

## Reporting Issues

When reporting issues, please include:
1. Output of `~/stinky/gps_kismet_wigle.sh status`
2. Last 100 lines of `~/tmp/gps_kismet_wigle.log`
3. System information: `uname -a`
4. GPS device: `lsusb | grep -i gps`
5. WiFi adapter: `iw dev`

## Support Resources

- Project Repository: [GitHub URL]
- Issue Tracker: [GitHub Issues]
- Documentation: See implementation_guide.md
- Quick Help: See quick_reference.md
# Webhook Migration Acceptance Criteria and Success Metrics

## Executive Summary

This document defines the acceptance criteria and success metrics for the webhook service migration from Python (Flask) to Node.js (Express). All criteria must be met before the migration can be considered complete and production-ready.

## 1. Functional Acceptance Criteria

### 1.1 API Compatibility ✓ MUST PASS

#### Endpoint Response Matching
- [ ] **POST /run-script** returns identical JSON structure as Python version
  ```json
  {
    "status": "success|error",
    "message": "Exact message text matching Python"
  }
  ```

- [ ] **POST /stop-script** returns identical JSON structure
  ```json
  {
    "status": "success|error", 
    "message": "Exact message text matching Python"
  }
  ```

- [ ] **GET /info** returns identical GPS and system data format
  ```json
  {
    "gps": {
      "lat": number|null,
      "lon": number|null,
      "alt": number|null,
      "mode": number (0-3),
      "time": string|null,
      "speed": number|null,
      "track": number|null,
      "status": "3D Fix|2D Fix|No Fix"
    },
    "kismet": "Running|Not Running",
    "wigle": "Running|Not Running",
    "ip": "valid.ip.address"
  }
  ```

- [ ] **GET /script-status** returns process status accurately
  ```json
  {
    "running": boolean,
    "message": string,
    "kismet_running": boolean,
    "kismet_api_responding": boolean,
    "wigle_running": boolean
  }
  ```

- [ ] **GET /kismet-data** returns device data in correct format
  ```json
  {
    "devices_count": number,
    "networks_count": number,
    "recent_devices": [...],
    "feed_items": [...],
    "last_update": "HH:MM:SS",
    "error": undefined|string
  }
  ```

### 1.2 Process Management ✓ MUST PASS

#### GPS Integration
- [ ] Successfully connects to GPSD on port 2947
- [ ] Retrieves GPS data when fix is available
- [ ] Handles no-fix scenarios gracefully
- [ ] Reconnects automatically if GPSD restarts
- [ ] Timeout handling prevents hanging

#### Kismet Control
- [ ] Starts Kismet process with correct arguments
- [ ] Creates PID file in correct location
- [ ] Monitors Kismet process health
- [ ] Kills Kismet cleanly on stop
- [ ] Cleans up orphaned Kismet processes
- [ ] Kismet API accessible at expected URL

#### Network Interface Management
- [ ] Sets wlan2 to monitor mode successfully
- [ ] Resets to managed mode on stop
- [ ] Handles missing interface gracefully
- [ ] Recovers from failed mode changes
- [ ] No interference with other network interfaces

#### WigleToTAK Process
- [ ] Starts WigleToTAK with correct parameters
- [ ] Process runs continuously without crashes
- [ ] Reads Kismet CSV files correctly
- [ ] Broadcasts to TAK server successfully

### 1.3 File System Operations ✓ MUST PASS

#### PID File Management
- [ ] Creates PID files in correct locations:
  - `/home/pi/tmp/gps_kismet_wigle.pids`
  - `/home/pi/kismet_ops/kismet.pid`
  - `/home/pi/tmp/wigletotak.specific.pid`
- [ ] PID files contain valid process IDs
- [ ] Cleans up stale PID files
- [ ] Handles concurrent access safely

#### Log File Creation
- [ ] Creates logs in expected locations:
  - `/home/pi/tmp/gps_kismet_wigle.log`
  - `/home/pi/tmp/kismet.log`
  - `/home/pi/tmp/wigletotak.log`
- [ ] Logs contain meaningful information
- [ ] Log rotation prevents disk fill

#### Data File Access
- [ ] Reads Kismet CSV files from `/home/pi/kismet_ops/`
- [ ] Handles missing files gracefully
- [ ] Processes large CSV files efficiently
- [ ] No file locking issues

### 1.4 Error Handling ✓ MUST PASS

- [ ] All system commands have error handling
- [ ] Network timeouts don't crash service
- [ ] Missing hardware handled gracefully
- [ ] Permission errors reported clearly
- [ ] Recovery from transient failures
- [ ] No unhandled promise rejections
- [ ] No uncaught exceptions

## 2. Performance Acceptance Criteria

### 2.1 Response Time Requirements ✓ MUST MEET

| Endpoint | p50 (median) | p95 | p99 | Max Acceptable |
|----------|--------------|-----|-----|----------------|
| /info | < 50ms | < 100ms | < 200ms | 500ms |
| /script-status | < 30ms | < 50ms | < 100ms | 200ms |
| /kismet-data | < 100ms | < 300ms | < 500ms | 1000ms |
| /run-script | < 500ms | < 1500ms | < 2000ms | 3000ms |
| /stop-script | < 500ms | < 2000ms | < 3000ms | 5000ms |

### 2.2 Resource Usage ✓ MUST MEET

#### Memory Usage
- [ ] Idle: < 50MB RSS
- [ ] Active: < 100MB RSS
- [ ] After 24 hours: < 150MB RSS (no leaks)
- [ ] During CSV processing: < 200MB RSS

#### CPU Usage
- [ ] Idle: < 2% CPU
- [ ] Active polling: < 5% CPU
- [ ] During process start: < 30% CPU (spike ok)
- [ ] CSV processing: < 20% CPU sustained

### 2.3 Concurrent Request Handling ✓ MUST SUPPORT

- [ ] Handles 10 concurrent status requests
- [ ] Handles rapid start/stop sequences
- [ ] No race conditions with simultaneous requests
- [ ] Maintains performance under load
- [ ] Request queuing prevents overload

## 3. Compatibility Acceptance Criteria

### 3.1 hi.html Interface ✓ MUST WORK PERFECTLY

#### UI Functionality
- [ ] All buttons function correctly
- [ ] Status messages display properly
- [ ] Color coding works (green/red/yellow)
- [ ] Auto-refresh continues working
- [ ] No JavaScript errors in console
- [ ] Cache busting prevents stale data

#### Data Display
- [ ] GPS coordinates show correctly
- [ ] Kismet device list populates
- [ ] Timestamps format properly
- [ ] Special characters handled
- [ ] Long device names don't break layout
- [ ] Empty states show appropriate messages

#### Cross-Browser Support
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (if applicable)
- [ ] Mobile browsers (basic support)

### 3.2 Backward Compatibility ✓ NO BREAKING CHANGES

- [ ] Existing scripts calling webhook continue working
- [ ] API response formats unchanged
- [ ] Error codes match Python version
- [ ] Status messages identical
- [ ] No additional authentication required
- [ ] Same CORS behavior

## 4. Reliability Acceptance Criteria

### 4.1 Stability Requirements ✓ MUST ACHIEVE

#### Uptime Targets
- [ ] 99.9% availability over 7 days
- [ ] No crashes in 24-hour test period
- [ ] Graceful recovery from errors
- [ ] Automatic restart on failure
- [ ] No memory leaks detected

#### Process Reliability
- [ ] GPS connection stable for 24+ hours
- [ ] Kismet runs continuously without intervention
- [ ] Network interface remains stable
- [ ] PID tracking remains accurate
- [ ] Log files don't cause issues

### 4.2 Data Integrity ✓ ZERO DATA LOSS

- [ ] No GPS data points lost
- [ ] All Kismet devices captured
- [ ] CSV parsing 100% accurate
- [ ] TAK messages delivered reliably
- [ ] Status information always current

## 5. Operational Acceptance Criteria

### 5.1 Deployment Requirements ✓ MUST SUPPORT

#### Installation Process
- [ ] Single command installation
- [ ] All dependencies resolved
- [ ] No manual configuration needed
- [ ] Permissions set correctly
- [ ] Service files work properly

#### Monitoring Capabilities
- [ ] Health check endpoint available
- [ ] Meaningful log messages
- [ ] Error tracking functional
- [ ] Performance metrics exposed
- [ ] Resource usage visible

### 5.2 Maintenance Requirements ✓ MUST ENABLE

- [ ] Log rotation configured
- [ ] Old PID files cleaned up
- [ ] Temp files managed
- [ ] Documentation complete
- [ ] Troubleshooting guide available

## 6. Security Acceptance Criteria

### 6.1 Input Validation ✓ MUST IMPLEMENT

- [ ] All API inputs validated
- [ ] No command injection possible
- [ ] File paths sanitized
- [ ] No directory traversal
- [ ] Safe subprocess execution

### 6.2 Access Control ✓ MUST MAINTAIN

- [ ] Same security level as Python version
- [ ] No new attack vectors
- [ ] Sudo commands limited in scope
- [ ] File permissions appropriate
- [ ] No sensitive data exposed

## 7. Success Metrics

### 7.1 Quantitative Metrics

#### Performance Improvements
```yaml
Target Improvements vs Python:
  Response Time: 20% faster (achieved if p50 < 40ms)
  Memory Usage: 30% reduction (achieved if < 35MB idle)
  CPU Usage: 25% reduction (achieved if < 1.5% idle)
  Startup Time: 50% faster (achieved if < 1.5s)
```

#### Reliability Metrics
```yaml
Minimum Requirements:
  Uptime: 99.9% (max 8.6 minutes downtime/week)
  Error Rate: < 0.1% of requests
  Process Crashes: 0 in 24 hours
  Memory Growth: < 1MB/hour
```

### 7.2 Qualitative Metrics

#### User Experience
- [ ] No perceptible difference in hi.html behavior
- [ ] Improved responsiveness noted by users
- [ ] No new error messages encountered
- [ ] Smooth transition during deployment

#### Developer Experience
- [ ] Easier to debug than Python version
- [ ] Better error messages
- [ ] Cleaner code structure
- [ ] Improved testability

## 8. Testing Validation

### 8.1 Test Coverage Requirements

- [ ] Unit test coverage > 80%
- [ ] Integration tests for all workflows
- [ ] End-to-end tests passing
- [ ] Performance tests completed
- [ ] Load tests successful
- [ ] 24-hour stability test passed

### 8.2 Test Scenarios Validated

#### Happy Path
- [ ] Start services successfully
- [ ] Monitor devices for 1 hour
- [ ] Stop services cleanly
- [ ] Restart services multiple times

#### Error Scenarios
- [ ] GPS device disconnected
- [ ] WiFi adapter removed
- [ ] Kismet crashes
- [ ] Disk full
- [ ] Network issues
- [ ] Permission denied

#### Edge Cases
- [ ] 1000+ devices detected
- [ ] Very long running time
- [ ] Rapid start/stop cycles
- [ ] Concurrent API access
- [ ] System resource pressure

## 9. Documentation Requirements

### 9.1 Technical Documentation

- [ ] API documentation complete
- [ ] Code well-commented
- [ ] Architecture diagrams updated
- [ ] Deployment guide written
- [ ] Configuration options documented

### 9.2 Operational Documentation

- [ ] Runbook created
- [ ] Troubleshooting guide complete
- [ ] Monitoring setup documented
- [ ] Alert procedures defined
- [ ] Rollback plan tested

## 10. Sign-off Checklist

### 10.1 Technical Team Sign-off

- [ ] Lead Developer approval
- [ ] Code review completed
- [ ] Security review passed
- [ ] Performance validated
- [ ] All tests passing

### 10.2 Operations Team Sign-off

- [ ] Deployment procedures tested
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Team trained
- [ ] Support ready

### 10.3 User Acceptance Sign-off

- [ ] UI functions identically
- [ ] No workflow changes
- [ ] Performance acceptable
- [ ] Stability demonstrated
- [ ] Feature parity confirmed

## 11. Go/No-Go Decision Matrix

| Criteria | Weight | Status | Score |
|----------|--------|--------|-------|
| API Compatibility | 25% | ⬜ Pass/Fail | 0/25 |
| Process Management | 20% | ⬜ Pass/Fail | 0/20 |
| Performance | 15% | ⬜ Pass/Fail | 0/15 |
| Stability | 20% | ⬜ Pass/Fail | 0/20 |
| hi.html Compatibility | 15% | ⬜ Pass/Fail | 0/15 |
| Documentation | 5% | ⬜ Pass/Fail | 0/5 |
| **Total** | **100%** | | **0/100** |

**Minimum Passing Score: 95/100**

## 12. Post-Migration Success Indicators

### Week 1 Metrics
- [ ] Zero rollback incidents
- [ ] No critical bugs reported
- [ ] Performance targets maintained
- [ ] User satisfaction confirmed

### Month 1 Metrics
- [ ] Uptime > 99.9%
- [ ] No memory leaks detected
- [ ] Feature requests (not bugs) received
- [ ] Team comfortable with new system

### Long-term Success
- [ ] Reduced maintenance burden
- [ ] Faster feature development
- [ ] Better system observability
- [ ] Improved user experience

## Final Acceptance

**Migration Accepted By:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | ____________ | ___/___/___ | ____________ |
| Operations Manager | ____________ | ___/___/___ | ____________ |
| Product Owner | ____________ | ___/___/___ | ____________ |
| End User Representative | ____________ | ___/___/___ | ____________ |

**Notes:**
- All criteria must be met before acceptance
- Any failures require documented remediation plan
- Partial acceptance not permitted for production deployment
- Post-migration monitoring required for 30 days

This document serves as the definitive guide for webhook migration acceptance. No deployment to production should occur until all criteria are satisfied and documented.
# Stinkster System Integration Plan

## Overview
This document outlines the comprehensive integration plan for the Stinkster system, ensuring all components work together reliably with proper service management, orchestration, and monitoring.

## Current Architecture

### Core Components
1. **GPS Bridge** (gpsmav) - MAVLink to GPSD bridge
2. **Kismet** - WiFi scanning service  
3. **WigleToTAK** - Converts WiFi scan data to TAK format
4. **HackRF Services** - SDR spectrum analyzer and scanner
5. **OpenWebRX** - Docker-based SDR receiver
6. **Kismet Operations Center** - Node.js monitoring dashboard

### Service Ports
- 2947: GPSD service
- 6969: TAK broadcasting (default)
- 8000: WigleToTAK web interface (Node.js)
- 8073: OpenWebRX SDR interface
- 8092: Spectrum Analyzer web interface
- 8889: Kismet Operations Center
- 14550: MAVProxy connection

## Integration Tasks

### 1. Systemd Service Files
Create/update service files for all components with:
- Proper dependencies and startup order
- Resource limits and security hardening
- Automatic restart policies
- Log rotation configuration

### 2. Service Dependencies
```
GPS Bridge → GPSD → Kismet → WigleToTAK → TAK Server
                 ↓
            HackRF Services
                 ↓
          Kismet Operations Center
```

### 3. Health Monitoring
- Service health checks every 30 seconds
- Automatic restart on failure
- Alert generation for persistent failures
- Resource usage monitoring

### 4. Startup Sequence
1. Network interfaces configuration
2. GPS services initialization
3. WiFi adapter setup (monitor mode)
4. Core services startup
5. Web services initialization
6. Health monitoring activation

### 5. Recovery Mechanisms
- Automatic service restart with backoff
- State persistence across restarts
- Graceful degradation on component failure
- System-wide recovery procedures

## Implementation Steps

### Phase 1: Service Files Creation
- [x] Analyze existing services
- [ ] Create missing service files
- [ ] Update existing service files for new paths
- [ ] Add proper dependencies

### Phase 2: Orchestration Update
- [ ] Update main orchestration script
- [ ] Implement proper PID management
- [ ] Add health check integration
- [ ] Create startup/shutdown procedures

### Phase 3: Monitoring Implementation
- [ ] Create health check scripts
- [ ] Implement resource monitoring
- [ ] Add alerting mechanisms
- [ ] Create status dashboard

### Phase 4: Testing & Validation
- [ ] Test individual services
- [ ] Test full system startup
- [ ] Validate recovery procedures
- [ ] Stress test monitoring

### Phase 5: Documentation
- [ ] Update operational runbook
- [ ] Create troubleshooting guide
- [ ] Document recovery procedures
- [ ] Add monitoring guide

## Service Management Commands

### System Control
```bash
# Start all services
sudo systemctl start stinkster.target

# Stop all services
sudo systemctl stop stinkster.target

# Check system status
sudo systemctl status stinkster-*

# View logs
journalctl -u stinkster-* -f
```

### Individual Service Control
```bash
# GPS services
sudo systemctl restart stinkster-gps-bridge
sudo systemctl status gpsd

# Kismet services
sudo systemctl restart stinkster-kismet
sudo systemctl status stinkster-kismet-operations

# HackRF services
sudo systemctl restart stinkster-hackrf-scanner
sudo systemctl restart stinkster-spectrum-analyzer

# WigleToTAK
sudo systemctl restart stinkster-wigle-to-tak
```

## Monitoring & Alerts

### Health Checks
- Service availability checks
- Port connectivity tests
- Process resource monitoring
- Log error pattern detection

### Alert Conditions
- Service down > 2 minutes
- CPU usage > 80% sustained
- Memory usage > 90%
- Disk space < 10%
- Network interface down

### Recovery Actions
1. Automatic service restart
2. Resource cleanup
3. Interface reset
4. Full system restart (last resort)

## Security Considerations

### Service Isolation
- Run services as non-root users
- Use systemd security features
- Limit file system access
- Network namespace isolation

### Access Control
- Firewall rules for service ports
- Authentication for web interfaces
- API key management
- Log access restrictions

## Maintenance Procedures

### Daily Tasks
- Check service health dashboard
- Review error logs
- Verify GPS lock status
- Monitor disk usage

### Weekly Tasks
- Update system packages
- Rotate log files
- Check for security updates
- Test recovery procedures

### Monthly Tasks
- Full system backup
- Performance analysis
- Security audit
- Documentation review

## Rollback Procedures

### Service Rollback
1. Stop affected service
2. Restore previous configuration
3. Restore previous binaries
4. Restart service
5. Verify functionality

### Full System Rollback
1. Stop all services
2. Restore system backup
3. Restore configuration files
4. Restart services in order
5. Validate system operation

## Success Metrics

### Availability
- 99.9% uptime target
- < 1 minute recovery time
- Zero data loss

### Performance
- < 100ms service response time
- < 5 second startup time
- < 50% resource utilization

### Reliability
- Automatic recovery success > 95%
- Clean shutdown/startup cycles
- Persistent state maintenance
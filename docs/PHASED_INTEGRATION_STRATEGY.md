# Stinkster Phased Integration Strategy

## Executive Summary

This document outlines a four-phase integration strategy to transition the Stinkster system from its current partially broken state to full operational capability. The strategy prioritizes maintaining working functionality while gradually fixing broken components and integrating new architecture.

**Current State Assessment:**
- ✅ Working: Nginx, partial backend (Node.js on 8001), Kismet Operations Center (8002), Python Spectrum Analyzer (8092)
- ❌ Broken: GPS data pipeline, WigleToTAK data flow, unified service orchestration
- 🔄 Partial: HackRF integration (Python working, Node.js incomplete)

## Phase 1: Restore Core Functionality (GPS & WiFi Scanning)
**Timeline: 3-5 days**
**Priority: Critical**

### Objectives
1. Restore GPS data flow from MAVLink → GPSD → Kismet
2. Fix WiFi scanning and data collection pipeline
3. Ensure basic TAK integration works

### Tasks
1. **GPS Pipeline Restoration**
   - Fix mavgps.py startup issues
   - Verify GPSD configuration and startup
   - Test GPS data flow to Kismet
   - Create systemd service for GPS bridge

2. **WiFi Scanning Pipeline**
   - Verify Kismet service startup
   - Check WiFi adapter configuration (monitor mode)
   - Test .wiglecsv file generation
   - Ensure data directory permissions

3. **Basic TAK Integration**
   - Test WigleToTAK data conversion
   - Verify TAK server connectivity
   - Check UDP broadcast functionality

### Success Criteria
- [ ] GPS coordinates visible in GPSD (gpspipe -w)
- [ ] Kismet collecting WiFi data
- [ ] .wiglecsv files being generated
- [ ] TAK receiving basic device data

### Rollback Procedure
```bash
# Stop new services
sudo systemctl stop stinkster-gps-bridge
sudo systemctl stop stinkster-kismet

# Restore original scripts
cp /home/pi/stinky/gps_kismet_wigle.sh.backup /home/pi/stinky/gps_kismet_wigle.sh
./gps_kismet_wigle.sh
```

### Verification Commands
```bash
# Test GPS
gpspipe -w -n 1 | grep -E "(lat|lon)"

# Test Kismet
curl http://localhost:2501/system/status.json

# Check data files
ls -la /home/pi/WigletoTAK/data/*.wiglecsv
```

## Phase 2: Fix Backend API and Data Flow
**Timeline: 5-7 days**
**Priority: High**

### Objectives
1. Complete unified backend implementation
2. Fix data processing pipeline
3. Implement proper WebSocket connections
4. Create systemd services for all components

### Tasks
1. **Backend Consolidation**
   - Complete HackRF API implementation in Node.js
   - Fix WigleToTAK API endpoints
   - Implement WebSocket handlers for real-time data
   - Add health check endpoints

2. **Data Pipeline Fixes**
   - Fix file watching for .wiglecsv files
   - Implement proper data parsing
   - Add error handling and retries
   - Configure data retention policies

3. **Service Management**
   - Create stinkster-backend.service
   - Update all service dependencies
   - Implement proper startup order
   - Add monitoring hooks

### Success Criteria
- [ ] All API endpoints responding correctly
- [ ] WebSocket connections stable
- [ ] Data flowing from Kismet → Backend → TAK
- [ ] Services auto-starting on boot

### Rollback Procedure
```bash
# Stop new backend
sudo systemctl stop stinkster-backend

# Restore Python services
cd /home/pi/WigletoTAK/TheStinkToTAK
source venv/bin/activate
python3 v2WigleToTak2.py --flask-port 8000 &

# Restore Python spectrum analyzer
cd /home/pi/HackRF
source venv/bin/activate
python3 spectrum_analyzer.py &
```

### Verification Commands
```bash
# Test API endpoints
curl http://localhost:8001/api/wigle/status
curl http://localhost:8001/api/hackrf/status

# Test WebSocket
wscat -c ws://localhost:8001/socket.io/

# Check service status
systemctl status stinkster-backend
```

## Phase 3: Integrate New Svelte Frontends
**Timeline: 3-4 days**
**Priority: Medium**

### Objectives
1. Deploy Svelte applications
2. Configure Nginx routing
3. Migrate users to new interfaces
4. Maintain backward compatibility

### Tasks
1. **Frontend Deployment**
   - Build production Svelte apps
   - Deploy to Nginx document root
   - Configure proper base paths
   - Set up static asset caching

2. **Nginx Configuration**
   - Update proxy routes for new backend
   - Configure WebSocket upgrades
   - Add legacy route redirects
   - Implement CORS policies

3. **User Migration**
   - Create migration notices
   - Update documentation
   - Provide training materials
   - Set up A/B testing

### Success Criteria
- [ ] Svelte apps accessible at /wigle/, /hackrf/
- [ ] API calls routing correctly
- [ ] WebSocket connections working
- [ ] Legacy URLs redirecting properly

### Rollback Procedure
```bash
# Restore old Nginx config
sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl reload nginx

# Keep legacy apps running
# No need to stop anything, just update routing
```

### Verification Commands
```bash
# Test frontend access
curl -I http://localhost/wigle/
curl -I http://localhost/hackrf/

# Test API proxying
curl http://localhost/api/wigle/status

# Check WebSocket upgrade
curl -i -N -H "Upgrade: websocket" http://localhost/ws/wigle
```

## Phase 4: Deprecate Legacy Components
**Timeline: 2-3 days**
**Priority: Low**

### Objectives
1. Remove Python implementations
2. Clean up legacy code
3. Update all documentation
4. Archive historical data

### Tasks
1. **Service Deprecation**
   - Stop Python spectrum_analyzer.py
   - Remove old Flask applications
   - Disable legacy systemd services
   - Clean up cron jobs

2. **Code Cleanup**
   - Archive Python code to legacy/
   - Remove unused dependencies
   - Update package.json files
   - Clean virtual environments

3. **Documentation Update**
   - Update all README files
   - Create migration guide
   - Update API documentation
   - Archive old guides

### Success Criteria
- [ ] No Python services running
- [ ] All functionality in Node.js/Svelte
- [ ] Documentation fully updated
- [ ] Clean service architecture

### Rollback Procedure
```bash
# This phase is reversible by restoring from archive
cd /home/pi/projects/stinkster_christian/stinkster/archive
tar -xzf legacy-python-services.tar.gz -C /

# Re-enable services
sudo systemctl enable spectrum-analyzer.service
sudo systemctl start spectrum-analyzer.service
```

### Verification Commands
```bash
# Ensure no Python services
ps aux | grep python | grep -v grep

# Check all services are Node.js
systemctl list-units --type=service | grep stinkster

# Verify all endpoints working
/home/pi/projects/stinkster_christian/stinkster/tests/integration/full-system-test.sh
```

## Implementation Timeline

```
Week 1: Phase 1 - Core Functionality
  Day 1-2: GPS pipeline restoration
  Day 3-4: WiFi scanning fixes
  Day 5: TAK integration testing

Week 2: Phase 2 - Backend fixes
  Day 6-8: Backend API completion
  Day 9-10: Data pipeline implementation
  Day 11-12: Service management setup

Week 3: Phase 3 & 4 - Frontend & Cleanup
  Day 13-15: Svelte deployment
  Day 16-17: Legacy deprecation
  Day 18-19: Final testing and documentation
```

## Risk Mitigation

### High-Risk Areas
1. **GPS Data Loss**
   - Mitigation: Keep manual GPS input option
   - Backup: Static GPS coordinates in config

2. **Service Dependencies**
   - Mitigation: Implement health checks
   - Backup: Manual start procedures

3. **Data Pipeline Interruption**
   - Mitigation: Queue-based processing
   - Backup: Manual file processing scripts

### Monitoring During Transition
```bash
# Continuous monitoring script
#!/bin/bash
while true; do
  clear
  echo "=== Stinkster System Status ==="
  echo "GPS: $(gpspipe -w -n 1 2>/dev/null | grep -c TPV)"
  echo "Kismet: $(curl -s http://localhost:2501/system/status.json | jq -r .kismet_state 2>/dev/null)"
  echo "Backend: $(curl -s http://localhost:8001/health | jq -r .status 2>/dev/null)"
  echo "Spectrum: $(curl -s http://localhost:8092/api/status | jq -r .status 2>/dev/null)"
  sleep 5
done
```

## Post-Integration Validation

### System Health Checks
1. **Automated Tests**
   ```bash
   npm run test:integration
   npm run test:e2e
   ```

2. **Performance Benchmarks**
   - API response time < 100ms
   - WebSocket latency < 50ms
   - CPU usage < 60%
   - Memory usage < 1GB

3. **Data Integrity**
   - GPS accuracy within 10m
   - WiFi device detection rate > 95%
   - TAK update frequency < 5s

### Final Acceptance Criteria
- [ ] All services start automatically on boot
- [ ] System recovers from component failures
- [ ] Web interfaces fully responsive
- [ ] Data flows without manual intervention
- [ ] Documentation complete and accurate
- [ ] Monitoring and alerting operational

## Conclusion

This phased approach ensures minimal disruption while systematically addressing each broken component. By maintaining working services throughout the transition and providing clear rollback procedures, we minimize risk while modernizing the architecture. Each phase builds upon the previous one, with clear success criteria and verification steps to ensure stability before proceeding.
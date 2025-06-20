# Flask to Node.js Migration Rollback Procedures

## Overview

This document provides comprehensive rollback procedures for the Flask to Node.js migration. These procedures are designed to restore the system to its pre-migration state quickly and safely.

## Rollback Decision Matrix

### Immediate Rollback Triggers (Automatic)
| Condition | Threshold | Action |
|-----------|-----------|---------|
| Service Availability | <95% for >10 minutes | Immediate automated rollback |
| Critical API Failure | Any critical endpoint non-responsive >5 minutes | Immediate automated rollback |
| Performance Degradation | >50% performance drop for >5 minutes | Immediate automated rollback |
| Data Corruption | Any data integrity issue detected | Immediate manual rollback |
| Security Incident | Security vulnerability discovered | Immediate manual rollback |

### Manual Rollback Triggers
| Condition | Assessment Required | Action |
|-----------|-------------------|---------|
| User Complaints | Multiple functionality complaints | Manual rollback consideration |
| External Integration Failure | OpenWebRX/TAK/Kismet integration issues | Manual rollback consideration |
| Resource Exhaustion | Memory/CPU usage beyond acceptable limits | Manual rollback consideration |
| Monitoring Failure | Unable to monitor system health | Manual rollback consideration |

## Rollback Procedures

### Phase 1: Emergency Stop (0-5 minutes)

#### Step 1.1: Stop Node.js Services
```bash
#!/bin/bash
# Execute immediately to stop Node.js services

echo "=== EMERGENCY ROLLBACK: Stopping Node.js Services ==="
date

# Stop systemd services
sudo systemctl stop hackrf-scanner-nodejs.service 2>/dev/null || true
sudo systemctl stop wigle-to-tak-nodejs.service 2>/dev/null || true

# Kill any remaining Node.js processes
pkill -f "node.*spectrum-analyzer" 2>/dev/null || true
pkill -f "node.*wigle-to-tak" 2>/dev/null || true

# Verify ports are free
netstat -tulpn | grep -E ":8092|:8000" || echo "Ports 8092 and 8000 are now free"

echo "Node.js services stopped"
```

#### Step 1.2: Verify Service Shutdown
```bash
# Verify no Node.js services are running
if pgrep -f "node.*spectrum|node.*wigle" > /dev/null; then
    echo "❌ WARNING: Node.js services still running!"
    pgrep -f "node.*spectrum|node.*wigle"
    # Force kill if necessary
    pkill -9 -f "node.*spectrum|node.*wigle"
else
    echo "✅ All Node.js services stopped"
fi

# Check port availability
for port in 8092 8000; do
    if netstat -tulpn | grep ":$port " > /dev/null; then
        echo "❌ WARNING: Port $port still in use!"
        netstat -tulpn | grep ":$port "
    else
        echo "✅ Port $port available"
    fi
done
```

### Phase 2: Flask Service Restoration (5-10 minutes)

#### Step 2.1: Restore Flask Environment
```bash
#!/bin/bash
# Restore Python Flask services

echo "=== ROLLBACK: Restoring Flask Services ==="

# Navigate to project directory
cd /home/pi/projects/stinkster_malone/stinkster

# Activate Python virtual environments if needed
if [ -d "src/hackrf/venv" ]; then
    echo "Activating HackRF virtual environment"
    source src/hackrf/venv/bin/activate
fi

# Start Spectrum Analyzer Flask service
echo "Starting Spectrum Analyzer Flask service..."
cd src/hackrf
nohup python3 spectrum_analyzer.py > /tmp/spectrum_analyzer_rollback.log 2>&1 &
SPECTRUM_PID=$!
echo $SPECTRUM_PID > /tmp/spectrum_analyzer.pid
cd ../..

# Wait for service to start
sleep 5

# Test Spectrum Analyzer service
if curl -s http://localhost:8092/api/status > /dev/null; then
    echo "✅ Spectrum Analyzer restored successfully"
else
    echo "❌ Failed to restore Spectrum Analyzer"
fi

# Start WigleToTAK Flask service
echo "Starting WigleToTAK Flask service..."
cd src/wigletotak/WigleToTAK/TheStinkToTAK
source venv/bin/activate 2>/dev/null || true
nohup python3 WigleToTak2.py --flask-port 8000 > /tmp/wigle_to_tak_rollback.log 2>&1 &
WIGLE_PID=$!
echo $WIGLE_PID > /tmp/wigle_to_tak.pid
cd ../../../..

# Wait for service to start
sleep 5

# Test WigleToTAK service
if curl -s http://localhost:8000/ > /dev/null; then
    echo "✅ WigleToTAK restored successfully"
else
    echo "❌ Failed to restore WigleToTAK"
fi

echo "Flask services restoration complete"
```

#### Step 2.2: Validate Flask Service Functionality
```bash
#!/bin/bash
# Comprehensive Flask service validation

echo "=== ROLLBACK VALIDATION: Testing Flask Services ==="

# Test Spectrum Analyzer API endpoints
echo "Testing Spectrum Analyzer endpoints..."

# Test status endpoint
if curl -s http://localhost:8092/api/status | grep -q "buffer_size\|config"; then
    echo "✅ Spectrum Analyzer /api/status working"
else
    echo "❌ Spectrum Analyzer /api/status failed"
fi

# Test profiles endpoint
if curl -s http://localhost:8092/api/profiles | grep -q "vhf\|uhf"; then
    echo "✅ Spectrum Analyzer /api/profiles working"
else
    echo "❌ Spectrum Analyzer /api/profiles failed"
fi

# Test scan endpoint
if curl -s http://localhost:8092/api/scan/vhf | grep -q "signals\|profile"; then
    echo "✅ Spectrum Analyzer /api/scan working"
else
    echo "❌ Spectrum Analyzer /api/scan failed"
fi

# Test WigleToTAK endpoints
echo "Testing WigleToTAK endpoints..."

# Test main page
if curl -s http://localhost:8000/ | grep -q "WigleToTAK\|html"; then
    echo "✅ WigleToTAK main page working"
else
    echo "❌ WigleToTAK main page failed"
fi

# Test settings update
if curl -s -X POST http://localhost:8000/update_tak_settings \
   -H "Content-Type: application/json" \
   -d '{"tak_server_ip":"192.168.1.100","tak_server_port":"6969"}' | grep -q "message"; then
    echo "✅ WigleToTAK settings update working"
else
    echo "❌ WigleToTAK settings update failed"
fi

echo "Flask service validation complete"
```

### Phase 3: Configuration Restoration (10-15 minutes)

#### Step 3.1: Restore System Configuration
```bash
#!/bin/bash
# Restore pre-migration system configuration

echo "=== ROLLBACK: Restoring System Configuration ==="

# Restore systemd service files
if [ -f "systemd/hackrf-scanner.service.backup" ]; then
    echo "Restoring systemd service files..."
    cp systemd/hackrf-scanner.service.backup systemd/hackrf-scanner.service
    echo "✅ Systemd service files restored"
fi

# Remove Node.js systemd services
echo "Removing Node.js systemd services..."
sudo rm -f /etc/systemd/system/hackrf-scanner-nodejs.service
sudo rm -f /etc/systemd/system/wigle-to-tak-nodejs.service
sudo systemctl daemon-reload
echo "✅ Node.js systemd services removed"

# Restore Docker configuration if modified
if [ -f "docker-compose.yml.backup" ]; then
    echo "Restoring Docker configuration..."
    cp docker-compose.yml.backup docker-compose.yml
    echo "✅ Docker configuration restored"
fi

# Restore other configuration files
if [ -d "config.backup" ]; then
    echo "Restoring configuration files..."
    cp -r config.backup/* config/ 2>/dev/null || true
    echo "✅ Configuration files restored"
fi

echo "System configuration restoration complete"
```

#### Step 3.2: Clean Up Node.js Artifacts
```bash
#!/bin/bash
# Clean up Node.js migration artifacts

echo "=== ROLLBACK: Cleaning Up Node.js Artifacts ==="

# Remove Node.js source directories (optional, for complete rollback)
read -p "Remove Node.js source code? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing Node.js source directories..."
    rm -rf src/nodejs
    echo "✅ Node.js source directories removed"
else
    echo "ℹ️ Node.js source directories preserved"
fi

# Remove Node.js logs
echo "Removing Node.js logs..."
rm -f /tmp/*nodejs*.log
rm -f /var/log/*nodejs*.log
echo "✅ Node.js logs cleaned"

# Remove Node.js process files
echo "Removing Node.js process files..."
rm -f /tmp/*spectrum*nodejs*.pid
rm -f /tmp/*wigle*nodejs*.pid
echo "✅ Node.js process files cleaned"

echo "Node.js artifact cleanup complete"
```

### Phase 4: System Validation (15-20 minutes)

#### Step 4.1: Complete System Test
```bash
#!/bin/bash
# Complete system validation after rollback

echo "=== ROLLBACK VALIDATION: Complete System Test ==="

# Test all critical functionality
echo "Testing critical system functionality..."

# Test Spectrum Analyzer with OpenWebRX integration
echo "Testing Spectrum Analyzer with OpenWebRX..."
if curl -s http://localhost:8073 > /dev/null; then
    echo "✅ OpenWebRX accessible"
    # Test WebSocket connection (simplified test)
    if curl -s http://localhost:8092/api/status | grep -q "openwebrx_connected.*true"; then
        echo "✅ Spectrum Analyzer connected to OpenWebRX"
    else
        echo "⚠️ Spectrum Analyzer not connected to OpenWebRX (may need manual intervention)"
    fi
else
    echo "⚠️ OpenWebRX not accessible (external dependency)"
fi

# Test WigleToTAK with file processing
echo "Testing WigleToTAK file processing..."
if [ -d "data/kismet" ]; then
    if curl -s "http://localhost:8000/list_wigle_files?directory=data/kismet" | grep -q "files"; then
        echo "✅ WigleToTAK file listing working"
    else
        echo "❌ WigleToTAK file listing failed"
    fi
else
    echo "ℹ️ Kismet data directory not found (normal if no data collected)"
fi

# Test TAK broadcasting capability
echo "Testing TAK broadcasting..."
if curl -s -X POST http://localhost:8000/update_multicast_state \
   -H "Content-Type: application/json" \
   -d '{"takMulticast":true}' | grep -q "message"; then
    echo "✅ TAK multicast configuration working"
else
    echo "❌ TAK multicast configuration failed"
fi

echo "System validation complete"
```

#### Step 4.2: Performance Verification
```bash
#!/bin/bash
# Verify system performance after rollback

echo "=== ROLLBACK VALIDATION: Performance Verification ==="

# Measure current performance
echo "Measuring post-rollback performance..."

# Test response times
echo "Testing API response times..."
for endpoint in "/api/status" "/api/profiles"; do
    start_time=$(date +%s.%N)
    curl -s http://localhost:8092$endpoint > /dev/null
    end_time=$(date +%s.%N)
    response_time=$(echo "$end_time - $start_time" | bc -l)
    echo "  Spectrum Analyzer $endpoint: ${response_time}s"
done

# Test memory usage
echo "Checking memory usage..."
ps aux | grep -E "(spectrum_analyzer|WigleToTak2)" | grep -v grep | while read line; do
    echo "  $line"
done

# Compare with baseline if available
if [ -f "tests/migration/performance/benchmarks/performance_baseline_*.json" ]; then
    echo "ℹ️ Baseline performance data available for comparison"
    echo "ℹ️ Review baseline files in tests/migration/performance/benchmarks/"
else
    echo "ℹ️ No baseline performance data available"
fi

echo "Performance verification complete"
```

## Rollback Automation Scripts

### Automated Rollback Script
```bash
#!/bin/bash
# /home/pi/projects/stinkster_malone/stinkster/rollback-migration.sh
# Automated rollback script for Flask to Node.js migration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/migration_rollback_$(date +%Y%m%d_%H%M%S).log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    log "ERROR: Rollback failed at line $1"
    log "Check log file: $LOG_FILE"
    exit 1
}

trap 'handle_error $LINENO' ERR

log "=== STARTING AUTOMATED MIGRATION ROLLBACK ==="
log "Rollback log: $LOG_FILE"

# Phase 1: Stop Node.js services
log "Phase 1: Stopping Node.js services"
sudo systemctl stop hackrf-scanner-nodejs.service 2>/dev/null || true
sudo systemctl stop wigle-to-tak-nodejs.service 2>/dev/null || true
pkill -f "node.*spectrum-analyzer" 2>/dev/null || true
pkill -f "node.*wigle-to-tak" 2>/dev/null || true
log "✅ Node.js services stopped"

# Phase 2: Start Flask services
log "Phase 2: Starting Flask services"
cd "$SCRIPT_DIR"

# Start Spectrum Analyzer
cd src/hackrf
source venv/bin/activate 2>/dev/null || true
nohup python3 spectrum_analyzer.py > /tmp/spectrum_analyzer_rollback.log 2>&1 &
echo $! > /tmp/spectrum_analyzer.pid
cd ../..

# Start WigleToTAK
cd src/wigletotak/WigleToTAK/TheStinkToTAK
source venv/bin/activate 2>/dev/null || true
nohup python3 WigleToTak2.py --flask-port 8000 > /tmp/wigle_to_tak_rollback.log 2>&1 &
echo $! > /tmp/wigle_to_tak.pid
cd ../../../..

sleep 10  # Allow services to start

log "✅ Flask services started"

# Phase 3: Validate services
log "Phase 3: Validating services"
if ! curl -s http://localhost:8092/api/status > /dev/null; then
    log "❌ Spectrum Analyzer validation failed"
    exit 1
fi

if ! curl -s http://localhost:8000/ > /dev/null; then
    log "❌ WigleToTAK validation failed"
    exit 1
fi

log "✅ Service validation passed"

# Phase 4: Clean up
log "Phase 4: Cleaning up"
sudo rm -f /etc/systemd/system/hackrf-scanner-nodejs.service
sudo rm -f /etc/systemd/system/wigle-to-tak-nodejs.service
sudo systemctl daemon-reload
log "✅ Cleanup complete"

log "=== MIGRATION ROLLBACK COMPLETED SUCCESSFULLY ==="
log "Services restored:"
log "  - Spectrum Analyzer: http://localhost:8092"
log "  - WigleToTAK: http://localhost:8000"
log "Log file: $LOG_FILE"
```

### Rollback Validation Script
```bash
#!/bin/bash
# /home/pi/projects/stinkster_malone/stinkster/validate-rollback.sh
# Comprehensive rollback validation

VALIDATION_RESULTS="/tmp/rollback_validation_$(date +%Y%m%d_%H%M%S).txt"

validate_service() {
    local service_name=$1
    local url=$2
    local expected_content=$3
    
    echo "Validating $service_name..." | tee -a "$VALIDATION_RESULTS"
    
    if curl -s --max-time 10 "$url" | grep -q "$expected_content"; then
        echo "✅ $service_name: PASS" | tee -a "$VALIDATION_RESULTS"
        return 0
    else
        echo "❌ $service_name: FAIL" | tee -a "$VALIDATION_RESULTS"
        return 1
    fi
}

echo "=== ROLLBACK VALIDATION REPORT ===" | tee "$VALIDATION_RESULTS"
echo "Date: $(date)" | tee -a "$VALIDATION_RESULTS"
echo "" | tee -a "$VALIDATION_RESULTS"

# Service availability tests
validate_service "Spectrum Analyzer Status" "http://localhost:8092/api/status" "buffer_size"
validate_service "Spectrum Analyzer Profiles" "http://localhost:8092/api/profiles" "vhf"
validate_service "WigleToTAK Main Page" "http://localhost:8000/" "WigleToTAK"

# Process tests
echo "" | tee -a "$VALIDATION_RESULTS"
echo "Process Status:" | tee -a "$VALIDATION_RESULTS"

if pgrep -f "spectrum_analyzer.py" > /dev/null; then
    echo "✅ Spectrum Analyzer process: RUNNING" | tee -a "$VALIDATION_RESULTS"
else
    echo "❌ Spectrum Analyzer process: NOT RUNNING" | tee -a "$VALIDATION_RESULTS"
fi

if pgrep -f "WigleToTak2.py" > /dev/null; then
    echo "✅ WigleToTAK process: RUNNING" | tee -a "$VALIDATION_RESULTS"
else
    echo "❌ WigleToTAK process: NOT RUNNING" | tee -a "$VALIDATION_RESULTS"
fi

# Port tests
echo "" | tee -a "$VALIDATION_RESULTS"
echo "Port Status:" | tee -a "$VALIDATION_RESULTS"

for port in 8092 8000; do
    if netstat -tulpn | grep ":$port " | grep -q "python"; then
        echo "✅ Port $port: OCCUPIED BY PYTHON" | tee -a "$VALIDATION_RESULTS"
    else
        echo "❌ Port $port: NOT OCCUPIED BY PYTHON" | tee -a "$VALIDATION_RESULTS"
    fi
done

# Node.js cleanup verification
echo "" | tee -a "$VALIDATION_RESULTS"
echo "Node.js Cleanup:" | tee -a "$VALIDATION_RESULTS"

if ! pgrep -f "node.*spectrum|node.*wigle" > /dev/null; then
    echo "✅ No Node.js services running" | tee -a "$VALIDATION_RESULTS"
else
    echo "❌ Node.js services still running" | tee -a "$VALIDATION_RESULTS"
    pgrep -f "node.*spectrum|node.*wigle" | tee -a "$VALIDATION_RESULTS"
fi

echo "" | tee -a "$VALIDATION_RESULTS"
echo "=== VALIDATION COMPLETE ===" | tee -a "$VALIDATION_RESULTS"
echo "Results saved to: $VALIDATION_RESULTS"
```

## Recovery Procedures

### Data Recovery
If data corruption is detected during rollback:

1. **Stop all services immediately**
2. **Restore from backup**:
   ```bash
   # Restore configuration backup
   cd /home/pi/projects/stinkster_malone/stinkster
   tar -xzf backups/pre_migration_backup.tar.gz
   
   # Restore database/data files
   cp -r backups/data/* data/
   ```
3. **Verify data integrity**
4. **Restart services**

### Network Recovery
If network connectivity issues arise:

1. **Reset network interfaces**:
   ```bash
   sudo systemctl restart networking
   sudo systemctl restart docker  # If using Docker
   ```
2. **Verify port bindings**
3. **Test external connectivity**

### Service Recovery
If Flask services fail to start:

1. **Check Python environments**:
   ```bash
   # Verify virtual environments
   ls -la src/*/venv/
   
   # Reinstall if necessary
   pip install -r requirements.txt
   ```
2. **Check dependencies**
3. **Review error logs**
4. **Manual service restart**

## Post-Rollback Actions

### Immediate Actions (0-30 minutes)
- [ ] Verify all services operational
- [ ] Check external system integration
- [ ] Notify stakeholders of rollback
- [ ] Begin root cause analysis

### Short-term Actions (30 minutes - 2 hours)
- [ ] Complete system validation
- [ ] Performance verification
- [ ] Update documentation
- [ ] Prepare incident report

### Long-term Actions (2+ hours)
- [ ] Root cause analysis completion
- [ ] Migration plan revision
- [ ] Additional testing requirements
- [ ] Timeline reassessment

## Contact Information

### Emergency Contacts
- **System Administrator**: [Contact Information]
- **Development Team Lead**: [Contact Information]
- **Operations Manager**: [Contact Information]

### Escalation Path
1. Development Team Lead
2. Operations Manager
3. Technical Director
4. CTO/Senior Management

## Documentation Updates

After rollback completion:
- [ ] Update migration status in project documentation
- [ ] Record lessons learned
- [ ] Update rollback procedures based on experience
- [ ] Revise migration timeline and approach
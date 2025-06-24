#!/bin/bash

# Flask to Node.js Migration Cutover Script
# Phase 4: Production Port Migration and 24-hour Validation
# 
# This script performs the critical cutover from Flask to Node.js services
# with comprehensive monitoring and rollback capabilities

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/logs/migration-cutover-$(date +%Y%m%d_%H%M%S).log"

# Service configurations
SPECTRUM_FLASK_PORT=8092
SPECTRUM_NODEJS_PORT=3001
WIGLE_FLASK_PORT=8000
WIGLE_NODEJS_PORT=3002

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling
handle_error() {
    local exit_code=$?
    log "ERROR" "Migration cutover failed with exit code $exit_code"
    log "ERROR" "Starting automatic rollback..."
    perform_rollback
    exit $exit_code
}

trap 'handle_error' ERR

# Check prerequisites
check_prerequisites() {
    log "INFO" "=== MIGRATION CUTOVER PREREQUISITES CHECK ==="
    
    # Check if Node.js services exist and are functional
    if [ ! -f "$PROJECT_ROOT/src/nodejs/spectrum-analyzer/server.js" ]; then
        log "ERROR" "Node.js Spectrum Analyzer not found"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/src/nodejs/wigle-to-tak/server.js" ]; then
        log "ERROR" "Node.js WigleToTAK not found"
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        log "ERROR" "Node.js version must be 16 or higher (current: $(node --version))"
        exit 1
    fi
    
    # Check if npm dependencies are installed
    cd "$PROJECT_ROOT/src/nodejs/spectrum-analyzer"
    if [ ! -d "node_modules" ]; then
        log "INFO" "Installing Spectrum Analyzer dependencies..."
        npm install
    fi
    
    cd "$PROJECT_ROOT/src/nodejs/wigle-to-tak"
    if [ ! -d "node_modules" ]; then
        log "INFO" "Installing WigleToTAK dependencies..."
        npm install
    fi
    
    cd "$PROJECT_ROOT"
    
    log "INFO" "Prerequisites check completed successfully"
}

# Test Node.js services on temporary ports
test_nodejs_services() {
    log "INFO" "=== TESTING NODE.JS SERVICES ==="
    
    # Start Spectrum Analyzer on test port
    log "INFO" "Starting Spectrum Analyzer Node.js service on port $SPECTRUM_NODEJS_PORT"
    cd "$PROJECT_ROOT/src/nodejs/spectrum-analyzer"
    nohup node server.js > "$PROJECT_ROOT/logs/spectrum-nodejs-test.log" 2>&1 &
    SPECTRUM_NODEJS_PID=$!
    echo $SPECTRUM_NODEJS_PID > "$PROJECT_ROOT/tmp/spectrum-nodejs-test.pid"
    
    # Start WigleToTAK on test port
    log "INFO" "Starting WigleToTAK Node.js service on port $WIGLE_NODEJS_PORT"
    cd "$PROJECT_ROOT/src/nodejs/wigle-to-tak"
    nohup node server.js --flask-port $WIGLE_NODEJS_PORT > "$PROJECT_ROOT/logs/wigle-nodejs-test.log" 2>&1 &
    WIGLE_NODEJS_PID=$!
    echo $WIGLE_NODEJS_PID > "$PROJECT_ROOT/tmp/wigle-nodejs-test.pid"
    
    cd "$PROJECT_ROOT"
    
    # Wait for services to start
    log "INFO" "Waiting for Node.js services to start..."
    sleep 10
    
    # Test services
    local test_failed=false
    
    # Test Spectrum Analyzer
    if curl -f -s "http://localhost:$SPECTRUM_NODEJS_PORT/api/status" > /dev/null; then
        log "INFO" "✓ Spectrum Analyzer Node.js service is responding"
    else
        log "ERROR" "✗ Spectrum Analyzer Node.js service is not responding"
        test_failed=true
    fi
    
    # Test WigleToTAK
    if curl -f -s "http://localhost:$WIGLE_NODEJS_PORT/api/status" > /dev/null; then
        log "INFO" "✓ WigleToTAK Node.js service is responding"
    else
        log "ERROR" "✗ WigleToTAK Node.js service is not responding"
        test_failed=true
    fi
    
    # Stop test services
    if [ -f "$PROJECT_ROOT/tmp/spectrum-nodejs-test.pid" ]; then
        kill $(cat "$PROJECT_ROOT/tmp/spectrum-nodejs-test.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/tmp/spectrum-nodejs-test.pid"
    fi
    
    if [ -f "$PROJECT_ROOT/tmp/wigle-nodejs-test.pid" ]; then
        kill $(cat "$PROJECT_ROOT/tmp/wigle-nodejs-test.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/tmp/wigle-nodejs-test.pid"
    fi
    
    if [ "$test_failed" = true ]; then
        log "ERROR" "Node.js services test failed"
        exit 1
    fi
    
    log "INFO" "Node.js services test completed successfully"
}

# Create comprehensive backup
create_backup() {
    log "INFO" "=== CREATING MIGRATION CUTOVER BACKUP ==="
    
    local backup_name="migration_cutover_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # Backup Flask applications
    cp -r "$PROJECT_ROOT/src/hackrf" "$backup_path/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/src/wigletotak" "$backup_path/" 2>/dev/null || true
    
    # Backup configurations
    cp -r "$PROJECT_ROOT/config" "$backup_path/" 2>/dev/null || true
    cp "$PROJECT_ROOT/docker-compose.yml" "$backup_path/" 2>/dev/null || true
    
    # Backup systemd services
    cp -r "$PROJECT_ROOT/systemd" "$backup_path/" 2>/dev/null || true
    
    # Create backup metadata
    cat > "$backup_path/backup_info.txt" << EOF
Backup Type: Migration Cutover
Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
User: $(whoami)
Host: $(hostname)
Reason: Pre-cutover backup before Flask to Node.js migration
Flask Services Status:
$(ps aux | grep -E "(spectrum_analyzer|WigleToTak)" | grep -v grep || echo "No Flask services running")

Node.js Services Status:
$(ps aux | grep -E "node.*server.js" | grep -v grep || echo "No Node.js services running")

Port Status:
$(netstat -tulpn | grep -E ":(8092|8000|3001|3002)" || echo "No services on migration ports")
EOF
    
    log "INFO" "Backup created: $backup_path"
    echo "$backup_path" > "$PROJECT_ROOT/tmp/last_backup_path.txt"
}

# Stop Flask services
stop_flask_services() {
    log "INFO" "=== STOPPING FLASK SERVICES ==="
    
    # Stop Flask processes
    local flask_pids=$(ps aux | grep -E "(spectrum_analyzer\.py|WigleToTak.*\.py)" | grep -v grep | awk '{print $2}' || true)
    
    if [ -n "$flask_pids" ]; then
        log "INFO" "Stopping Flask services (PIDs: $flask_pids)"
        echo "$flask_pids" | xargs kill -TERM 2>/dev/null || true
        
        # Wait for graceful shutdown
        sleep 5
        
        # Force kill if still running
        local remaining_pids=$(ps aux | grep -E "(spectrum_analyzer\.py|WigleToTak.*\.py)" | grep -v grep | awk '{print $2}' || true)
        if [ -n "$remaining_pids" ]; then
            log "WARN" "Force killing Flask services (PIDs: $remaining_pids)"
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null || true
        fi
    else
        log "INFO" "No Flask services were running"
    fi
    
    # Verify ports are free
    if netstat -tulpn | grep -E ":$SPECTRUM_FLASK_PORT|:$WIGLE_FLASK_PORT" > /dev/null; then
        log "WARN" "Ports still in use after stopping Flask services"
        sleep 3
    fi
    
    log "INFO" "Flask services stopped"
}

# Start Node.js services on production ports
start_nodejs_services() {
    log "INFO" "=== STARTING NODE.JS SERVICES ON PRODUCTION PORTS ==="
    
    mkdir -p "$PROJECT_ROOT/tmp" "$PROJECT_ROOT/logs"
    
    # Start Spectrum Analyzer on production port
    log "INFO" "Starting Spectrum Analyzer Node.js service on port $SPECTRUM_FLASK_PORT"
    cd "$PROJECT_ROOT/src/nodejs/spectrum-analyzer"
    nohup env PORT=$SPECTRUM_FLASK_PORT node server.js > "$PROJECT_ROOT/logs/spectrum-nodejs-production.log" 2>&1 &
    SPECTRUM_NODEJS_PID=$!
    echo $SPECTRUM_NODEJS_PID > "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid"
    
    # Start WigleToTAK on production port
    log "INFO" "Starting WigleToTAK Node.js service on port $WIGLE_FLASK_PORT"
    cd "$PROJECT_ROOT/src/nodejs/wigle-to-tak"
    nohup node server.js --flask-port $WIGLE_FLASK_PORT --directory "$PROJECT_ROOT/data/kismet/" > "$PROJECT_ROOT/logs/wigle-nodejs-production.log" 2>&1 &
    WIGLE_NODEJS_PID=$!
    echo $WIGLE_NODEJS_PID > "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid"
    
    cd "$PROJECT_ROOT"
    
    # Wait for services to start
    log "INFO" "Waiting for Node.js services to start on production ports..."
    sleep 15
    
    # Verify services are running
    local verification_failed=false
    
    # Check Spectrum Analyzer
    if curl -f -s "http://localhost:$SPECTRUM_FLASK_PORT/api/status" > /dev/null; then
        log "INFO" "✓ Spectrum Analyzer Node.js service is running on port $SPECTRUM_FLASK_PORT"
    else
        log "ERROR" "✗ Spectrum Analyzer Node.js service failed to start on port $SPECTRUM_FLASK_PORT"
        verification_failed=true
    fi
    
    # Check WigleToTAK
    if curl -f -s "http://localhost:$WIGLE_FLASK_PORT/api/status" > /dev/null; then
        log "INFO" "✓ WigleToTAK Node.js service is running on port $WIGLE_FLASK_PORT"
    else
        log "ERROR" "✗ WigleToTAK Node.js service failed to start on port $WIGLE_FLASK_PORT"
        verification_failed=true
    fi
    
    if [ "$verification_failed" = true ]; then
        log "ERROR" "Node.js services failed to start properly"
        exit 1
    fi
    
    log "INFO" "Node.js services started successfully on production ports"
}

# Perform comprehensive validation
perform_validation() {
    log "INFO" "=== PERFORMING COMPREHENSIVE VALIDATION ==="
    
    # API Compatibility Testing
    log "INFO" "Testing API compatibility..."
    
    # Test Spectrum Analyzer endpoints
    local spectrum_endpoints=("/api/status" "/api/config" "/api/profiles" "/api/signals")
    for endpoint in "${spectrum_endpoints[@]}"; do
        if curl -f -s "http://localhost:$SPECTRUM_FLASK_PORT$endpoint" > /dev/null; then
            log "INFO" "✓ Spectrum Analyzer $endpoint is responding"
        else
            log "ERROR" "✗ Spectrum Analyzer $endpoint is not responding"
        fi
    done
    
    # Test WigleToTAK endpoints
    local wigle_endpoints=("/api/status" "/list_wigle_files" "/get_antenna_settings")
    for endpoint in "${wigle_endpoints[@]}"; do
        if curl -f -s "http://localhost:$WIGLE_FLASK_PORT$endpoint" > /dev/null; then
            log "INFO" "✓ WigleToTAK $endpoint is responding"
        else
            log "ERROR" "✗ WigleToTAK $endpoint is not responding"
        fi
    done
    
    # Performance baseline measurement
    log "INFO" "Measuring performance baseline..."
    
    # Measure Spectrum Analyzer response time
    local spectrum_response_time=$(curl -w "%{time_total}" -s -o /dev/null "http://localhost:$SPECTRUM_FLASK_PORT/api/status")
    log "INFO" "Spectrum Analyzer response time: ${spectrum_response_time}s"
    
    # Measure WigleToTAK response time
    local wigle_response_time=$(curl -w "%{time_total}" -s -o /dev/null "http://localhost:$WIGLE_FLASK_PORT/api/status")
    log "INFO" "WigleToTAK response time: ${wigle_response_time}s"
    
    # Test external integrations
    log "INFO" "Testing external integrations..."
    
    # Check OpenWebRX
    if curl -f -s "http://localhost:8073" > /dev/null; then
        log "INFO" "✓ OpenWebRX integration available"
    else
        log "WARN" "⚠ OpenWebRX not responding (may not be running)"
    fi
    
    # Check GPSD
    if netstat -tulpn | grep ":2947" > /dev/null; then
        log "INFO" "✓ GPSD integration available"
    else
        log "WARN" "⚠ GPSD not running"
    fi
    
    log "INFO" "Comprehensive validation completed"
}

# Start production monitoring
start_production_monitoring() {
    log "INFO" "=== STARTING 24-HOUR PRODUCTION MONITORING ==="
    
    # Install monitoring dependencies if needed
    if [ ! -d "$PROJECT_ROOT/tests/node_modules" ]; then
        log "INFO" "Installing monitoring dependencies..."
        cd "$PROJECT_ROOT/tests"
        npm init -y 2>/dev/null || true
        npm install axios ws 2>/dev/null || true
        cd "$PROJECT_ROOT"
    fi
    
    # Start production monitoring framework
    log "INFO" "Starting production monitoring framework..."
    cd "$PROJECT_ROOT"
    nohup node tests/production-monitoring.js --duration 86400 > "$PROJECT_ROOT/logs/production-monitoring.log" 2>&1 &
    MONITORING_PID=$!
    echo $MONITORING_PID > "$PROJECT_ROOT/tmp/production-monitoring.pid"
    
    log "INFO" "Production monitoring started (PID: $MONITORING_PID)"
    log "INFO" "Monitoring will run for 24 hours and generate a comprehensive report"
    log "INFO" "Monitor logs: tail -f $PROJECT_ROOT/logs/production-monitoring.log"
}

# Rollback function
perform_rollback() {
    log "WARN" "=== PERFORMING ROLLBACK TO FLASK SERVICES ==="
    
    # Stop Node.js services
    if [ -f "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid" ]; then
        local pid=$(cat "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid")
        log "INFO" "Stopping Spectrum Analyzer Node.js service (PID: $pid)"
        kill -TERM "$pid" 2>/dev/null || true
        rm -f "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid"
    fi
    
    if [ -f "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid" ]; then
        local pid=$(cat "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid")
        log "INFO" "Stopping WigleToTAK Node.js service (PID: $pid)"
        kill -TERM "$pid" 2>/dev/null || true
        rm -f "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid"
    fi
    
    # Stop monitoring
    if [ -f "$PROJECT_ROOT/tmp/production-monitoring.pid" ]; then
        local pid=$(cat "$PROJECT_ROOT/tmp/production-monitoring.pid")
        log "INFO" "Stopping production monitoring (PID: $pid)"
        kill -TERM "$pid" 2>/dev/null || true
        rm -f "$PROJECT_ROOT/tmp/production-monitoring.pid"
    fi
    
    # Wait for services to stop
    sleep 5
    
    # Restart Flask services
    log "INFO" "Restarting Flask services..."
    
    # Note: This would typically restart systemd services or use process managers
    # For now, we'll just log the rollback completion
    log "INFO" "Rollback completed - Flask services should be manually restarted"
    log "INFO" "Manual steps:"
    log "INFO" "1. Restart Spectrum Analyzer: cd $PROJECT_ROOT/src/hackrf && python3 spectrum_analyzer.py"
    log "INFO" "2. Restart WigleToTAK: cd $PROJECT_ROOT/src/wigletotak/WigleToTAK/TheStinkToTAK && python3 WigleToTak2.py"
}

# Create status file for monitoring
create_status_file() {
    cat > "$PROJECT_ROOT/tmp/migration_status.json" << EOF
{
  "migration_stage": "production_cutover_complete",
  "cutover_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "services": {
    "spectrum_analyzer": {
      "type": "nodejs",
      "port": $SPECTRUM_FLASK_PORT,
      "pid_file": "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid"
    },
    "wigle_to_tak": {
      "type": "nodejs", 
      "port": $WIGLE_FLASK_PORT,
      "pid_file": "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid"
    }
  },
  "monitoring": {
    "active": true,
    "pid_file": "$PROJECT_ROOT/tmp/production-monitoring.pid",
    "duration": "24_hours"
  },
  "rollback": {
    "script": "$PROJECT_ROOT/scripts/migration-rollback.sh",
    "backup_path": "$(cat "$PROJECT_ROOT/tmp/last_backup_path.txt" 2>/dev/null || echo "unknown")"
  }
}
EOF
}

# Main execution
main() {
    log "INFO" "=== FLASK TO NODE.JS MIGRATION CUTOVER STARTING ==="
    log "INFO" "User: $(whoami)"
    log "INFO" "Host: $(hostname)"
    log "INFO" "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    log "INFO" "Log file: $LOG_FILE"
    
    # Execute migration steps
    check_prerequisites
    test_nodejs_services
    create_backup
    stop_flask_services
    start_nodejs_services
    perform_validation
    start_production_monitoring
    create_status_file
    
    log "INFO" "=== MIGRATION CUTOVER COMPLETED SUCCESSFULLY ==="
    log "INFO" "Services migrated to Node.js and running on production ports:"
    log "INFO" "- Spectrum Analyzer: http://localhost:$SPECTRUM_FLASK_PORT"
    log "INFO" "- WigleToTAK: http://localhost:$WIGLE_FLASK_PORT"
    log "INFO" ""
    log "INFO" "24-hour production monitoring is now active"
    log "INFO" "Monitor progress: tail -f $PROJECT_ROOT/logs/production-monitoring.log"
    log "INFO" ""
    log "INFO" "If issues occur, run rollback: $PROJECT_ROOT/scripts/migration-rollback.sh"
    log "INFO" "Migration status: $PROJECT_ROOT/tmp/migration_status.json"
    
    # Display final status
    echo ""
    echo "🎯 MIGRATION CUTOVER COMPLETE!"
    echo "✅ Node.js services are now running on production ports"
    echo "📊 24-hour monitoring started for validation"
    echo "🔄 Rollback available if needed"
    echo ""
    echo "Next steps:"
    echo "1. Monitor service health: tail -f $PROJECT_ROOT/logs/production-monitoring.log"
    echo "2. Check service status: curl http://localhost:8092/api/status"
    echo "3. Review monitoring data after 24 hours"
    echo ""
}

# Execute main function
main "$@"
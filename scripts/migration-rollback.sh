#!/bin/bash

# Flask to Node.js Migration Rollback Script
# Emergency rollback capability for production cutover
#
# This script provides complete rollback capability to Flask services
# if Node.js migration encounters issues during the 24-hour validation period

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/migration-rollback-$(date +%Y%m%d_%H%M%S).log"

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

# Check rollback prerequisites
check_rollback_prerequisites() {
    log "INFO" "=== ROLLBACK PREREQUISITES CHECK ==="
    
    # Check if migration status file exists
    if [ ! -f "$PROJECT_ROOT/tmp/migration_status.json" ]; then
        log "WARN" "Migration status file not found - proceeding with best-effort rollback"
    else
        log "INFO" "Migration status file found"
    fi
    
    # Check if backup exists
    if [ -f "$PROJECT_ROOT/tmp/last_backup_path.txt" ]; then
        local backup_path=$(cat "$PROJECT_ROOT/tmp/last_backup_path.txt")
        if [ -d "$backup_path" ]; then
            log "INFO" "Backup found: $backup_path"
        else
            log "WARN" "Backup path in file does not exist: $backup_path"
        fi
    else
        log "WARN" "No backup path file found - will perform cleanup-only rollback"
    fi
    
    log "INFO" "Prerequisites check completed"
}

# Stop Node.js services
stop_nodejs_services() {
    log "INFO" "=== STOPPING NODE.JS SERVICES ==="
    
    # Stop production monitoring first
    if [ -f "$PROJECT_ROOT/tmp/production-monitoring.pid" ]; then
        local monitoring_pid=$(cat "$PROJECT_ROOT/tmp/production-monitoring.pid" 2>/dev/null || echo "")
        if [ -n "$monitoring_pid" ]; then
            log "INFO" "Stopping production monitoring (PID: $monitoring_pid)"
            kill -TERM "$monitoring_pid" 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if kill -0 "$monitoring_pid" 2>/dev/null; then
                log "WARN" "Force killing production monitoring"
                kill -KILL "$monitoring_pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PROJECT_ROOT/tmp/production-monitoring.pid"
    fi
    
    # Stop Spectrum Analyzer Node.js service
    if [ -f "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid" ]; then
        local spectrum_pid=$(cat "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid" 2>/dev/null || echo "")
        if [ -n "$spectrum_pid" ]; then
            log "INFO" "Stopping Spectrum Analyzer Node.js service (PID: $spectrum_pid)"
            kill -TERM "$spectrum_pid" 2>/dev/null || true
            sleep 3
            # Force kill if still running
            if kill -0 "$spectrum_pid" 2>/dev/null; then
                log "WARN" "Force killing Spectrum Analyzer Node.js service"
                kill -KILL "$spectrum_pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid"
    fi
    
    # Stop WigleToTAK Node.js service
    if [ -f "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid" ]; then
        local wigle_pid=$(cat "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid" 2>/dev/null || echo "")
        if [ -n "$wigle_pid" ]; then
            log "INFO" "Stopping WigleToTAK Node.js service (PID: $wigle_pid)"
            kill -TERM "$wigle_pid" 2>/dev/null || true
            sleep 3
            # Force kill if still running
            if kill -0 "$wigle_pid" 2>/dev/null; then
                log "WARN" "Force killing WigleToTAK Node.js service"
                kill -KILL "$wigle_pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid"
    fi
    
    # Additional cleanup - kill any remaining Node.js processes from this project
    local remaining_node_pids=$(ps aux | grep -E "node.*server\.js" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$remaining_node_pids" ]; then
        log "WARN" "Found remaining Node.js processes, cleaning up: $remaining_node_pids"
        echo "$remaining_node_pids" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        # Force kill any that are still running
        remaining_node_pids=$(ps aux | grep -E "node.*server\.js" | grep -v grep | awk '{print $2}' || true)
        if [ -n "$remaining_node_pids" ]; then
            echo "$remaining_node_pids" | xargs kill -KILL 2>/dev/null || true
        fi
    fi
    
    # Wait for ports to be freed
    sleep 5
    
    # Verify ports are free
    if netstat -tulpn | grep -E ":8092|:8000" > /dev/null; then
        log "WARN" "Ports 8092 or 8000 still in use after stopping Node.js services"
        netstat -tulpn | grep -E ":8092|:8000" | while read line; do
            log "WARN" "Port in use: $line"
        done
    else
        log "INFO" "Ports 8092 and 8000 are now free"
    fi
    
    log "INFO" "Node.js services stopped"
}

# Restore configurations from backup
restore_configurations() {
    log "INFO" "=== RESTORING CONFIGURATIONS FROM BACKUP ==="
    
    if [ ! -f "$PROJECT_ROOT/tmp/last_backup_path.txt" ]; then
        log "WARN" "No backup path file found - skipping configuration restoration"
        return 0
    fi
    
    local backup_path=$(cat "$PROJECT_ROOT/tmp/last_backup_path.txt")
    if [ ! -d "$backup_path" ]; then
        log "WARN" "Backup directory not found: $backup_path - skipping configuration restoration"
        return 0
    fi
    
    log "INFO" "Restoring configurations from: $backup_path"
    
    # Restore Flask applications (if they were backed up)
    if [ -d "$backup_path/hackrf" ]; then
        log "INFO" "Restoring Flask Spectrum Analyzer..."
        cp -r "$backup_path/hackrf"/* "$PROJECT_ROOT/src/hackrf/" 2>/dev/null || true
    fi
    
    if [ -d "$backup_path/wigletotak" ]; then
        log "INFO" "Restoring Flask WigleToTAK..."
        cp -r "$backup_path/wigletotak"/* "$PROJECT_ROOT/src/wigletotak/" 2>/dev/null || true
    fi
    
    # Restore configurations
    if [ -d "$backup_path/config" ]; then
        log "INFO" "Restoring configuration files..."
        cp -r "$backup_path/config"/* "$PROJECT_ROOT/config/" 2>/dev/null || true
    fi
    
    if [ -f "$backup_path/docker-compose.yml" ]; then
        log "INFO" "Restoring docker-compose.yml..."
        cp "$backup_path/docker-compose.yml" "$PROJECT_ROOT/" 2>/dev/null || true
    fi
    
    # Restore systemd services
    if [ -d "$backup_path/systemd" ]; then
        log "INFO" "Restoring systemd service files..."
        cp -r "$backup_path/systemd"/* "$PROJECT_ROOT/systemd/" 2>/dev/null || true
    fi
    
    log "INFO" "Configuration restoration completed"
}

# Start Flask services
start_flask_services() {
    log "INFO" "=== STARTING FLASK SERVICES ==="
    
    # Create necessary directories
    mkdir -p "$PROJECT_ROOT/tmp" "$PROJECT_ROOT/logs"
    
    # Check if Flask applications exist
    if [ ! -f "$PROJECT_ROOT/src/hackrf/spectrum_analyzer.py" ]; then
        log "ERROR" "Flask Spectrum Analyzer not found at expected location"
        log "ERROR" "Manual intervention required to restore Flask services"
        return 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py" ]; then
        log "ERROR" "Flask WigleToTAK not found at expected location"
        log "ERROR" "Manual intervention required to restore Flask services"
        return 1
    fi
    
    # Start Spectrum Analyzer Flask service
    log "INFO" "Starting Flask Spectrum Analyzer on port 8092..."
    cd "$PROJECT_ROOT/src/hackrf"
    
    # Activate virtual environment if it exists
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    nohup python3 spectrum_analyzer.py > "$PROJECT_ROOT/logs/spectrum-flask-rollback.log" 2>&1 &
    SPECTRUM_FLASK_PID=$!
    echo $SPECTRUM_FLASK_PID > "$PROJECT_ROOT/tmp/spectrum-flask-rollback.pid"
    log "INFO" "Flask Spectrum Analyzer started (PID: $SPECTRUM_FLASK_PID)"
    
    # Start WigleToTAK Flask service
    log "INFO" "Starting Flask WigleToTAK on port 8000..."
    cd "$PROJECT_ROOT/src/wigletotak/WigleToTAK/TheStinkToTAK"
    
    # Activate virtual environment if it exists
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    nohup python3 WigleToTak2.py --flask-port 8000 > "$PROJECT_ROOT/logs/wigle-flask-rollback.log" 2>&1 &
    WIGLE_FLASK_PID=$!
    echo $WIGLE_FLASK_PID > "$PROJECT_ROOT/tmp/wigle-flask-rollback.pid"
    log "INFO" "Flask WigleToTAK started (PID: $WIGLE_FLASK_PID)"
    
    cd "$PROJECT_ROOT"
    
    # Wait for services to start
    log "INFO" "Waiting for Flask services to start..."
    sleep 15
    
    # Verify services are running
    local verification_failed=false
    
    # Check Spectrum Analyzer
    if curl -f -s "http://localhost:8092/api/status" > /dev/null; then
        log "INFO" "✓ Flask Spectrum Analyzer is running on port 8092"
    else
        log "ERROR" "✗ Flask Spectrum Analyzer failed to start on port 8092"
        verification_failed=true
    fi
    
    # Check WigleToTAK
    if curl -f -s "http://localhost:8000/api/status" > /dev/null; then
        log "INFO" "✓ Flask WigleToTAK is running on port 8000"
    else
        log "ERROR" "✗ Flask WigleToTAK failed to start on port 8000"
        verification_failed=true
    fi
    
    if [ "$verification_failed" = true ]; then
        log "ERROR" "Flask services rollback failed - manual intervention required"
        log "ERROR" "Check logs:"
        log "ERROR" "- Spectrum Analyzer: $PROJECT_ROOT/logs/spectrum-flask-rollback.log"
        log "ERROR" "- WigleToTAK: $PROJECT_ROOT/logs/wigle-flask-rollback.log"
        return 1
    fi
    
    log "INFO" "Flask services started successfully"
    return 0
}

# Verify rollback success
verify_rollback() {
    log "INFO" "=== VERIFYING ROLLBACK SUCCESS ==="
    
    # Test Flask services
    local test_failed=false
    
    # Test Spectrum Analyzer endpoints
    local spectrum_endpoints=("/api/status" "/api/config" "/api/profiles")
    for endpoint in "${spectrum_endpoints[@]}"; do
        if curl -f -s "http://localhost:8092$endpoint" > /dev/null; then
            log "INFO" "✓ Flask Spectrum Analyzer $endpoint is responding"
        else
            log "ERROR" "✗ Flask Spectrum Analyzer $endpoint is not responding"
            test_failed=true
        fi
    done
    
    # Test WigleToTAK endpoints
    local wigle_endpoints=("/api/status" "/list_wigle_files")
    for endpoint in "${wigle_endpoints[@]}"; do
        if curl -f -s "http://localhost:8000$endpoint" > /dev/null; then
            log "INFO" "✓ Flask WigleToTAK $endpoint is responding"
        else
            log "ERROR" "✗ Flask WigleToTAK $endpoint is not responding"
            test_failed=true
        fi
    done
    
    # Check process status
    if [ -f "$PROJECT_ROOT/tmp/spectrum-flask-rollback.pid" ]; then
        local spectrum_pid=$(cat "$PROJECT_ROOT/tmp/spectrum-flask-rollback.pid")
        if kill -0 "$spectrum_pid" 2>/dev/null; then
            log "INFO" "✓ Flask Spectrum Analyzer process is running (PID: $spectrum_pid)"
        else
            log "ERROR" "✗ Flask Spectrum Analyzer process is not running"
            test_failed=true
        fi
    fi
    
    if [ -f "$PROJECT_ROOT/tmp/wigle-flask-rollback.pid" ]; then
        local wigle_pid=$(cat "$PROJECT_ROOT/tmp/wigle-flask-rollback.pid")
        if kill -0 "$wigle_pid" 2>/dev/null; then
            log "INFO" "✓ Flask WigleToTAK process is running (PID: $wigle_pid)"
        else
            log "ERROR" "✗ Flask WigleToTAK process is not running"
            test_failed=true
        fi
    fi
    
    if [ "$test_failed" = true ]; then
        log "ERROR" "Rollback verification failed"
        return 1
    fi
    
    log "INFO" "Rollback verification successful"
    return 0
}

# Clean up migration artifacts
cleanup_migration_artifacts() {
    log "INFO" "=== CLEANING UP MIGRATION ARTIFACTS ==="
    
    # Remove migration status files
    rm -f "$PROJECT_ROOT/tmp/migration_status.json"
    rm -f "$PROJECT_ROOT/tmp/last_backup_path.txt"
    
    # Remove Node.js PID files (should already be removed, but double-check)
    rm -f "$PROJECT_ROOT/tmp/spectrum-nodejs-production.pid"
    rm -f "$PROJECT_ROOT/tmp/wigle-nodejs-production.pid"
    rm -f "$PROJECT_ROOT/tmp/production-monitoring.pid"
    rm -f "$PROJECT_ROOT/tmp/spectrum-nodejs-test.pid"
    rm -f "$PROJECT_ROOT/tmp/wigle-nodejs-test.pid"
    
    # Create rollback status file
    cat > "$PROJECT_ROOT/tmp/rollback_status.json" << EOF
{
  "rollback_completed": true,
  "rollback_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "services": {
    "spectrum_analyzer": {
      "type": "flask",
      "port": 8092,
      "pid_file": "$PROJECT_ROOT/tmp/spectrum-flask-rollback.pid"
    },
    "wigle_to_tak": {
      "type": "flask",
      "port": 8000,
      "pid_file": "$PROJECT_ROOT/tmp/wigle-flask-rollback.pid"
    }
  },
  "rollback_log": "$LOG_FILE"
}
EOF
    
    log "INFO" "Migration artifacts cleaned up"
}

# Generate rollback report
generate_rollback_report() {
    log "INFO" "=== GENERATING ROLLBACK REPORT ==="
    
    local report_file="$PROJECT_ROOT/reports/rollback-report-$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Migration Rollback Report

**Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**User**: $(whoami)  
**Host**: $(hostname)  
**Rollback Log**: $LOG_FILE

## Rollback Summary

The Flask to Node.js migration has been rolled back successfully. All services have been restored to their original Flask implementations.

## Services Status After Rollback

### Spectrum Analyzer
- **Type**: Flask (Python)
- **Port**: 8092
- **Status**: $(curl -f -s http://localhost:8092/api/status >/dev/null && echo "✅ Running" || echo "❌ Not responding")
- **PID File**: $PROJECT_ROOT/tmp/spectrum-flask-rollback.pid
- **Log File**: $PROJECT_ROOT/logs/spectrum-flask-rollback.log

### WigleToTAK
- **Type**: Flask (Python)  
- **Port**: 8000
- **Status**: $(curl -f -s http://localhost:8000/api/status >/dev/null && echo "✅ Running" || echo "❌ Not responding")
- **PID File**: $PROJECT_ROOT/tmp/wigle-flask-rollback.pid
- **Log File**: $PROJECT_ROOT/logs/wigle-flask-rollback.log

## API Endpoints Verification

### Spectrum Analyzer Endpoints
$(for endpoint in "/api/status" "/api/config" "/api/profiles"; do
    if curl -f -s "http://localhost:8092$endpoint" >/dev/null; then
        echo "- ✅ $endpoint"
    else
        echo "- ❌ $endpoint"
    fi
done)

### WigleToTAK Endpoints
$(for endpoint in "/api/status" "/list_wigle_files"; do
    if curl -f -s "http://localhost:8000$endpoint" >/dev/null; then
        echo "- ✅ $endpoint"
    else
        echo "- ❌ $endpoint"
    fi
done)

## Next Steps

1. **Monitor Services**: Ensure Flask services remain stable
2. **Investigate Issues**: Review Node.js migration logs to understand rollback reasons
3. **Plan Re-migration**: Address issues before attempting migration again

## Files and Logs

- **Rollback Log**: $LOG_FILE
- **Rollback Status**: $PROJECT_ROOT/tmp/rollback_status.json
- **Service Logs**: $PROJECT_ROOT/logs/
- **Backup Used**: $(cat "$PROJECT_ROOT/tmp/last_backup_path.txt" 2>/dev/null || echo "None specified")

## Contact Information

If issues persist, contact the system administrator or development team.

---
*Rollback completed at $(date)*
EOF
    
    log "INFO" "Rollback report generated: $report_file"
}

# Main rollback execution
main() {
    log "INFO" "=== FLASK TO NODE.JS MIGRATION ROLLBACK STARTING ==="
    log "INFO" "User: $(whoami)"
    log "INFO" "Host: $(hostname)"
    log "INFO" "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    log "INFO" "Log file: $LOG_FILE"
    log "INFO" "Reason: Migration rollback requested"
    
    # Confirm rollback with user unless --force flag is provided
    if [ "$1" != "--force" ]; then
        echo ""
        echo "⚠️  MIGRATION ROLLBACK CONFIRMATION ⚠️"
        echo ""
        echo "This will:"
        echo "• Stop all Node.js services"
        echo "• Restore Flask services on ports 8092 and 8000"
        echo "• Stop production monitoring"
        echo "• Clean up migration artifacts"
        echo ""
        read -p "Are you sure you want to proceed with rollback? (yes/no): " confirmation
        
        if [ "$confirmation" != "yes" ]; then
            log "INFO" "Rollback cancelled by user"
            echo "Rollback cancelled."
            exit 0
        fi
    fi
    
    log "INFO" "Rollback confirmed, proceeding..."
    
    # Execute rollback steps
    check_rollback_prerequisites
    stop_nodejs_services
    restore_configurations
    
    if start_flask_services; then
        if verify_rollback; then
            cleanup_migration_artifacts
            generate_rollback_report
            
            log "INFO" "=== MIGRATION ROLLBACK COMPLETED SUCCESSFULLY ==="
            log "INFO" "Flask services restored and verified:"
            log "INFO" "- Spectrum Analyzer: http://localhost:8092"
            log "INFO" "- WigleToTAK: http://localhost:8000"
            log "INFO" ""
            log "INFO" "Rollback report: $(ls -t $PROJECT_ROOT/reports/rollback-report-*.md | head -1)"
            
            # Display final status
            echo ""
            echo "🔄 MIGRATION ROLLBACK COMPLETE!"
            echo "✅ Flask services restored and running"
            echo "🔍 Services verified and responding"
            echo "📋 Rollback report generated"
            echo ""
            echo "Service URLs:"
            echo "• Spectrum Analyzer: http://localhost:8092"
            echo "• WigleToTAK: http://localhost:8000"
            echo ""
            echo "Check service status:"
            echo "• curl http://localhost:8092/api/status"
            echo "• curl http://localhost:8000/api/status"
            echo ""
        else
            log "ERROR" "Rollback verification failed - manual intervention required"
            exit 1
        fi
    else
        log "ERROR" "Failed to start Flask services - manual intervention required"
        exit 1
    fi
}

# Execute main function
main "$@"
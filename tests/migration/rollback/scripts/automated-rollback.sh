#!/bin/bash
# Automated Migration Rollback Script
# 
# This script provides automated rollback functionality for the Flask to Node.js migration
# Usage: ./automated-rollback.sh [--force] [--no-cleanup] [--validate-only]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
LOG_FILE="/tmp/migration_rollback_$(date +%Y%m%d_%H%M%S).log"
PID_DIR="/tmp"
FORCE_ROLLBACK=false
NO_CLEANUP=false
VALIDATE_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_ROLLBACK=true
            shift
            ;;
        --no-cleanup)
            NO_CLEANUP=true
            shift
            ;;
        --validate-only)
            VALIDATE_ONLY=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--force] [--no-cleanup] [--validate-only]"
            echo "  --force         Force rollback without confirmation"
            echo "  --no-cleanup    Skip cleanup of Node.js artifacts"
            echo "  --validate-only Only validate current state, don't perform rollback"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling function
handle_error() {
    log "ERROR" "Rollback failed at line $1"
    log "ERROR" "Last command: $BASH_COMMAND"
    log "ERROR" "Check log file: $LOG_FILE"
    
    # Attempt emergency stop of all services
    log "INFO" "Attempting emergency service stop..."
    emergency_stop || true
    
    exit 1
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Emergency stop function
emergency_stop() {
    log "WARN" "Emergency stop: Stopping all services"
    
    # Stop Node.js services
    sudo systemctl stop hackrf-scanner-nodejs.service 2>/dev/null || true
    sudo systemctl stop wigle-to-tak-nodejs.service 2>/dev/null || true
    
    # Kill Node.js processes
    pkill -9 -f "node.*spectrum-analyzer" 2>/dev/null || true
    pkill -9 -f "node.*wigle-to-tak" 2>/dev/null || true
    
    # Stop Flask services
    pkill -f "spectrum_analyzer.py" 2>/dev/null || true
    pkill -f "WigleToTak2.py" 2>/dev/null || true
    
    log "INFO" "Emergency stop completed"
}

# Validation function
validate_system_state() {
    log "INFO" "Validating current system state..."
    
    local validation_errors=0
    
    # Check if Node.js services are running
    if systemctl is-active hackrf-scanner-nodejs.service >/dev/null 2>&1; then
        log "INFO" "Node.js Spectrum Analyzer service is active"
    else
        log "WARN" "Node.js Spectrum Analyzer service is not active"
    fi
    
    if systemctl is-active wigle-to-tak-nodejs.service >/dev/null 2>&1; then
        log "INFO" "Node.js WigleToTAK service is active"
    else
        log "WARN" "Node.js WigleToTAK service is not active"
    fi
    
    # Check if Flask services are running
    if pgrep -f "spectrum_analyzer.py" > /dev/null; then
        log "WARN" "Flask Spectrum Analyzer is already running"
        ((validation_errors++))
    fi
    
    if pgrep -f "WigleToTak2.py" > /dev/null; then
        log "WARN" "Flask WigleToTAK is already running"
        ((validation_errors++))
    fi
    
    # Check port availability
    for port in 8092 8000; do
        if netstat -tulpn 2>/dev/null | grep -q ":$port "; then
            local process=$(netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}' | head -1)
            log "INFO" "Port $port is occupied by: $process"
        else
            log "WARN" "Port $port is not occupied"
            ((validation_errors++))
        fi
    done
    
    # Check external dependencies
    if curl -s --connect-timeout 5 http://localhost:8073 > /dev/null; then
        log "INFO" "OpenWebRX is accessible"
    else
        log "WARN" "OpenWebRX is not accessible (external dependency)"
    fi
    
    log "INFO" "System state validation completed with $validation_errors warnings"
    return $validation_errors
}

# Stop Node.js services
stop_nodejs_services() {
    log "INFO" "Stopping Node.js services..."
    
    # Stop systemd services
    if systemctl is-active hackrf-scanner-nodejs.service >/dev/null 2>&1; then
        log "INFO" "Stopping hackrf-scanner-nodejs.service"
        sudo systemctl stop hackrf-scanner-nodejs.service
    fi
    
    if systemctl is-active wigle-to-tak-nodejs.service >/dev/null 2>&1; then
        log "INFO" "Stopping wigle-to-tak-nodejs.service"
        sudo systemctl stop wigle-to-tak-nodejs.service
    fi
    
    # Disable services
    sudo systemctl disable hackrf-scanner-nodejs.service 2>/dev/null || true
    sudo systemctl disable wigle-to-tak-nodejs.service 2>/dev/null || true
    
    # Kill any remaining Node.js processes
    if pgrep -f "node.*spectrum-analyzer" > /dev/null; then
        log "INFO" "Killing remaining spectrum analyzer Node.js processes"
        pkill -f "node.*spectrum-analyzer"
        sleep 2
        pkill -9 -f "node.*spectrum-analyzer" 2>/dev/null || true
    fi
    
    if pgrep -f "node.*wigle-to-tak" > /dev/null; then
        log "INFO" "Killing remaining WigleToTAK Node.js processes"
        pkill -f "node.*wigle-to-tak"
        sleep 2
        pkill -9 -f "node.*wigle-to-tak" 2>/dev/null || true
    fi
    
    # Verify ports are free
    sleep 3
    for port in 8092 8000; do
        if netstat -tulpn 2>/dev/null | grep -q ":$port "; then
            local process=$(netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}')
            log "WARN" "Port $port still occupied by: $process"
            
            # Force kill process on port
            local pid=$(netstat -tulpn 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
            if [[ -n "$pid" && "$pid" != "-" ]]; then
                log "INFO" "Force killing process $pid on port $port"
                kill -9 "$pid" 2>/dev/null || true
            fi
        else
            log "INFO" "Port $port is now free"
        fi
    done
    
    log "INFO" "Node.js services stopped"
}

# Start Flask services
start_flask_services() {
    log "INFO" "Starting Flask services..."
    
    cd "$PROJECT_ROOT"
    
    # Start Spectrum Analyzer Flask service
    log "INFO" "Starting Spectrum Analyzer Flask service..."
    cd src/hackrf
    
    # Activate virtual environment if it exists
    if [ -d "venv" ]; then
        log "INFO" "Activating Spectrum Analyzer virtual environment"
        source venv/bin/activate
    fi
    
    # Start service in background
    nohup python3 spectrum_analyzer.py > "$PID_DIR/spectrum_analyzer_rollback.log" 2>&1 &
    local spectrum_pid=$!
    echo $spectrum_pid > "$PID_DIR/spectrum_analyzer.pid"
    log "INFO" "Started Spectrum Analyzer with PID: $spectrum_pid"
    
    cd "$PROJECT_ROOT"
    
    # Start WigleToTAK Flask service
    log "INFO" "Starting WigleToTAK Flask service..."
    cd src/wigletotak/WigleToTAK/TheStinkToTAK
    
    # Activate virtual environment if it exists
    if [ -d "venv" ]; then
        log "INFO" "Activating WigleToTAK virtual environment"
        source venv/bin/activate
    fi
    
    # Start service in background
    nohup python3 WigleToTak2.py --flask-port 8000 > "$PID_DIR/wigle_to_tak_rollback.log" 2>&1 &
    local wigle_pid=$!
    echo $wigle_pid > "$PID_DIR/wigle_to_tak.pid"
    log "INFO" "Started WigleToTAK with PID: $wigle_pid"
    
    cd "$PROJECT_ROOT"
    
    # Wait for services to start
    log "INFO" "Waiting for Flask services to start..."
    sleep 10
    
    log "INFO" "Flask services started"
}

# Validate Flask services
validate_flask_services() {
    log "INFO" "Validating Flask services..."
    
    local validation_errors=0
    
    # Test Spectrum Analyzer
    log "INFO" "Testing Spectrum Analyzer service..."
    
    if curl -s --connect-timeout 10 http://localhost:8092/api/status > /dev/null; then
        log "INFO" "✅ Spectrum Analyzer /api/status: OK"
    else
        log "ERROR" "❌ Spectrum Analyzer /api/status: FAILED"
        ((validation_errors++))
    fi
    
    if curl -s --connect-timeout 10 http://localhost:8092/api/profiles | grep -q "vhf\|uhf"; then
        log "INFO" "✅ Spectrum Analyzer /api/profiles: OK"
    else
        log "ERROR" "❌ Spectrum Analyzer /api/profiles: FAILED"
        ((validation_errors++))
    fi
    
    if curl -s --connect-timeout 10 http://localhost:8092/api/scan/vhf | grep -q "signals\|profile"; then
        log "INFO" "✅ Spectrum Analyzer /api/scan: OK"
    else
        log "WARN" "⚠️ Spectrum Analyzer /api/scan: Limited functionality (may be normal)"
    fi
    
    # Test WigleToTAK
    log "INFO" "Testing WigleToTAK service..."
    
    if curl -s --connect-timeout 10 http://localhost:8000/ | grep -q "WigleToTAK\|html"; then
        log "INFO" "✅ WigleToTAK main page: OK"
    else
        log "ERROR" "❌ WigleToTAK main page: FAILED"
        ((validation_errors++))
    fi
    
    if curl -s --connect-timeout 10 -X POST http://localhost:8000/update_tak_settings \
       -H "Content-Type: application/json" \
       -d '{"tak_server_ip":"192.168.1.100","tak_server_port":"6969"}' | grep -q "message"; then
        log "INFO" "✅ WigleToTAK settings update: OK"
    else
        log "ERROR" "❌ WigleToTAK settings update: FAILED"
        ((validation_errors++))
    fi
    
    # Verify processes are running
    if pgrep -f "spectrum_analyzer.py" > /dev/null; then
        log "INFO" "✅ Spectrum Analyzer process: RUNNING"
    else
        log "ERROR" "❌ Spectrum Analyzer process: NOT RUNNING"
        ((validation_errors++))
    fi
    
    if pgrep -f "WigleToTak2.py" > /dev/null; then
        log "INFO" "✅ WigleToTAK process: RUNNING"
    else
        log "ERROR" "❌ WigleToTAK process: NOT RUNNING"
        ((validation_errors++))
    fi
    
    log "INFO" "Flask service validation completed with $validation_errors errors"
    
    if [ $validation_errors -gt 0 ]; then
        log "ERROR" "Flask service validation failed"
        return 1
    fi
    
    return 0
}

# Cleanup Node.js artifacts
cleanup_nodejs_artifacts() {
    if [ "$NO_CLEANUP" = true ]; then
        log "INFO" "Skipping Node.js artifact cleanup (--no-cleanup specified)"
        return 0
    fi
    
    log "INFO" "Cleaning up Node.js artifacts..."
    
    # Remove systemd service files
    if [ -f "/etc/systemd/system/hackrf-scanner-nodejs.service" ]; then
        log "INFO" "Removing hackrf-scanner-nodejs.service"
        sudo rm -f /etc/systemd/system/hackrf-scanner-nodejs.service
    fi
    
    if [ -f "/etc/systemd/system/wigle-to-tak-nodejs.service" ]; then
        log "INFO" "Removing wigle-to-tak-nodejs.service"
        sudo rm -f /etc/systemd/system/wigle-to-tak-nodejs.service
    fi
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Remove Node.js logs
    log "INFO" "Removing Node.js logs..."
    rm -f "$PID_DIR"/*nodejs*.log
    rm -f "$PID_DIR"/*spectrum*nodejs*.pid
    rm -f "$PID_DIR"/*wigle*nodejs*.pid
    rm -f /var/log/*nodejs*.log 2>/dev/null || true
    
    # Optionally remove Node.js source (ask user unless --force)
    if [ "$FORCE_ROLLBACK" = true ]; then
        log "INFO" "Force removing Node.js source directories..."
        rm -rf "$PROJECT_ROOT/src/nodejs" 2>/dev/null || true
    else
        echo
        read -p "Remove Node.js source directories? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log "INFO" "Removing Node.js source directories..."
            rm -rf "$PROJECT_ROOT/src/nodejs"
        else
            log "INFO" "Preserving Node.js source directories"
        fi
    fi
    
    log "INFO" "Node.js artifact cleanup completed"
}

# Restore system configuration
restore_system_configuration() {
    log "INFO" "Restoring system configuration..."
    
    cd "$PROJECT_ROOT"
    
    # Restore systemd service files
    if [ -f "systemd/hackrf-scanner.service.backup" ]; then
        log "INFO" "Restoring original systemd service file"
        cp systemd/hackrf-scanner.service.backup systemd/hackrf-scanner.service
    fi
    
    # Restore Docker configuration
    if [ -f "docker-compose.yml.backup" ]; then
        log "INFO" "Restoring original Docker configuration"
        cp docker-compose.yml.backup docker-compose.yml
    fi
    
    # Restore other configuration files
    if [ -d "config.backup" ]; then
        log "INFO" "Restoring configuration files"
        cp -r config.backup/* config/ 2>/dev/null || true
    fi
    
    log "INFO" "System configuration restored"
}

# Generate rollback report
generate_rollback_report() {
    local report_file="$PID_DIR/rollback_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log "INFO" "Generating rollback report: $report_file"
    
    {
        echo "================================="
        echo "MIGRATION ROLLBACK REPORT"
        echo "================================="
        echo "Date: $(date)"
        echo "User: $(whoami)"
        echo "Host: $(hostname)"
        echo ""
        echo "ROLLBACK SUMMARY:"
        echo "- Status: SUCCESS"
        echo "- Duration: $(($(date +%s) - start_time)) seconds"
        echo "- Log File: $LOG_FILE"
        echo ""
        echo "SERVICES RESTORED:"
        echo "- Spectrum Analyzer: http://localhost:8092"
        echo "- WigleToTAK: http://localhost:8000"
        echo ""
        echo "PROCESS STATUS:"
        ps aux | grep -E "(spectrum_analyzer|WigleToTak2)" | grep -v grep
        echo ""
        echo "PORT STATUS:"
        netstat -tulpn 2>/dev/null | grep -E ":8092|:8000" || echo "No processes found on target ports"
        echo ""
        echo "NEXT STEPS:"
        echo "1. Verify system functionality"
        echo "2. Monitor services for stability"
        echo "3. Review migration failure reasons"
        echo "4. Plan remediation steps"
        echo ""
        echo "VALIDATION COMMANDS:"
        echo "curl http://localhost:8092/api/status"
        echo "curl http://localhost:8000/"
        echo ""
    } > "$report_file"
    
    log "INFO" "Rollback report generated: $report_file"
    echo
    cat "$report_file"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    log "INFO" "=== STARTING AUTOMATED MIGRATION ROLLBACK ==="
    log "INFO" "Script: $0"
    log "INFO" "Arguments: $*"
    log "INFO" "Log file: $LOG_FILE"
    log "INFO" "Project root: $PROJECT_ROOT"
    
    # Validate system state first
    validate_system_state
    
    if [ "$VALIDATE_ONLY" = true ]; then
        log "INFO" "Validation-only mode complete"
        exit 0
    fi
    
    # Confirm rollback unless --force specified
    if [ "$FORCE_ROLLBACK" = false ]; then
        echo
        echo "⚠️  This will rollback the Flask to Node.js migration"
        echo "   - Stop all Node.js services"
        echo "   - Start Flask services"
        echo "   - Clean up Node.js artifacts"
        echo
        read -p "Continue with rollback? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "INFO" "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    log "INFO" "Starting rollback procedure..."
    
    # Execute rollback phases
    log "INFO" "Phase 1: Stopping Node.js services"
    stop_nodejs_services
    
    log "INFO" "Phase 2: Starting Flask services"
    start_flask_services
    
    log "INFO" "Phase 3: Validating Flask services"
    validate_flask_services
    
    log "INFO" "Phase 4: Restoring system configuration"
    restore_system_configuration
    
    log "INFO" "Phase 5: Cleaning up Node.js artifacts"
    cleanup_nodejs_artifacts
    
    log "INFO" "Phase 6: Generating rollback report"
    generate_rollback_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "=== MIGRATION ROLLBACK COMPLETED SUCCESSFULLY ==="
    log "INFO" "Total duration: ${duration} seconds"
    log "INFO" "Services available at:"
    log "INFO" "  - Spectrum Analyzer: http://localhost:8092"
    log "INFO" "  - WigleToTAK: http://localhost:8000"
    log "INFO" "Log file: $LOG_FILE"
    
    echo
    echo "🎯 Rollback completed successfully!"
    echo "📊 Check services at: http://localhost:8092 and http://localhost:8000"
    echo "📝 Full log available at: $LOG_FILE"
}

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Warning: Running as root is not recommended"
    echo "   This script should be run as the pi user with sudo privileges"
fi

# Execute main function
main "$@"
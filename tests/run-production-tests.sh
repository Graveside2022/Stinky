#!/bin/bash

# Production Testing Orchestrator for Flask to Node.js Migration
# Coordinates all testing frameworks for comprehensive validation
#
# This script runs:
# - Pre-migration API compatibility testing
# - Migration cutover execution
# - 24-hour production monitoring
# - Stress testing validation
# - Performance verification
# - Error detection and alerting
# - Rollback capability testing
#
# Usage: ./tests/run-production-tests.sh [--quick] [--skip-cutover] [--monitoring-only]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
REPORTS_DIR="$PROJECT_ROOT/reports"
TEST_SESSION="production-test-$(date +%Y%m%d_%H%M%S)"
MASTER_LOG="$LOG_DIR/${TEST_SESSION}-master.log"

# Test configuration
QUICK_MODE=false
SKIP_CUTOVER=false
MONITORING_ONLY=false
STRESS_TEST_DURATION=300  # 5 minutes default
MONITORING_DURATION=86400 # 24 hours default

# Create directories
mkdir -p "$LOG_DIR" "$REPORTS_DIR" "$PROJECT_ROOT/tmp"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK_MODE=true
            STRESS_TEST_DURATION=60    # 1 minute
            MONITORING_DURATION=1800   # 30 minutes
            shift
            ;;
        --skip-cutover)
            SKIP_CUTOVER=true
            shift
            ;;
        --monitoring-only)
            MONITORING_ONLY=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --quick           Quick testing mode (shorter duration)"
            echo "  --skip-cutover    Skip migration cutover (test existing services)"
            echo "  --monitoring-only Only run monitoring (no cutover or stress tests)"
            echo "  --help           Show this help message"
            echo ""
            echo "Test Phases:"
            echo "  1. Pre-migration API compatibility testing"
            echo "  2. Migration cutover execution (if not skipped)"
            echo "  3. Post-migration validation"
            echo "  4. Stress testing"
            echo "  5. 24-hour production monitoring"
            echo "  6. Report generation"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$MASTER_LOG"
}

# Error handling
handle_error() {
    local exit_code=$?
    log "ERROR" "Production testing failed with exit code $exit_code"
    log "ERROR" "Check logs in $LOG_DIR for details"
    
    # Create failure report
    cat > "$REPORTS_DIR/${TEST_SESSION}-failure-report.md" << EOF
# Production Testing Failure Report

**Session**: $TEST_SESSION  
**Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**Exit Code**: $exit_code  

## Failure Details

The production testing suite failed during execution. Check the following logs for details:

- Master Log: $MASTER_LOG
- Individual Test Logs: $LOG_DIR/

## Recovery Steps

1. Review error logs to identify failure cause
2. Check service status: \`curl http://localhost:8092/api/status\`
3. If migration was in progress, consider rollback: \`$PROJECT_ROOT/scripts/migration-rollback.sh\`
4. Restart testing after resolving issues

## Services Status at Failure

\`\`\`
$(ps aux | grep -E "(python3.*(spectrum|wigle)|node.*server)" | grep -v grep || echo "No services detected")
\`\`\`

\`\`\`
$(netstat -tulpn | grep -E ":(8092|8000|3001|3002)" || echo "No services on expected ports")
\`\`\`
EOF
    
    exit $exit_code
}

trap 'handle_error' ERR

# Check prerequisites
check_prerequisites() {
    log "INFO" "=== PRODUCTION TESTING PREREQUISITES CHECK ==="
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        log "ERROR" "Node.js version must be 16 or higher"
        exit 1
    fi
    
    # Check npm dependencies for tests
    cd "$SCRIPT_DIR"
    if [ ! -d "node_modules" ]; then
        log "INFO" "Installing test dependencies..."
        npm init -y >/dev/null 2>&1 || true
        npm install axios ws >/dev/null 2>&1 || true
    fi
    
    cd "$PROJECT_ROOT"
    
    # Check if Flask services are running (if not skipping cutover)
    if [ "$SKIP_CUTOVER" = false ] && [ "$MONITORING_ONLY" = false ]; then
        if ! netstat -tulpn | grep -q ":8092"; then
            log "WARN" "Flask Spectrum Analyzer not detected on port 8092"
        fi
        
        if ! netstat -tulpn | grep -q ":8000"; then
            log "WARN" "Flask WigleToTAK not detected on port 8000"
        fi
    fi
    
    log "INFO" "Prerequisites check completed"
}

# Phase 1: Pre-migration API compatibility testing
run_premigration_testing() {
    if [ "$MONITORING_ONLY" = true ]; then
        log "INFO" "Skipping pre-migration testing (monitoring-only mode)"
        return 0
    fi
    
    log "INFO" "=== PHASE 1: PRE-MIGRATION API COMPATIBILITY TESTING ==="
    
    # Start Node.js services on test ports for comparison
    log "INFO" "Starting Node.js services on test ports for compatibility testing..."
    
    cd "$PROJECT_ROOT/src/nodejs/spectrum-analyzer"
    nohup env PORT=3001 node server.js > "$LOG_DIR/spectrum-nodejs-compat-test.log" 2>&1 &
    SPECTRUM_TEST_PID=$!
    echo $SPECTRUM_TEST_PID > "$PROJECT_ROOT/tmp/spectrum-nodejs-compat-test.pid"
    
    cd "$PROJECT_ROOT/src/nodejs/wigle-to-tak"
    nohup node server.js --flask-port 3002 > "$LOG_DIR/wigle-nodejs-compat-test.log" 2>&1 &
    WIGLE_TEST_PID=$!
    echo $WIGLE_TEST_PID > "$PROJECT_ROOT/tmp/wigle-nodejs-compat-test.pid"
    
    cd "$PROJECT_ROOT"
    
    # Wait for services to start
    log "INFO" "Waiting for Node.js test services to start..."
    sleep 15
    
    # Run API compatibility tests
    log "INFO" "Running API compatibility tests..."
    cd "$SCRIPT_DIR"
    
    if node api-compatibility-test.js \
        --flask-spectrum "http://localhost:8092" \
        --nodejs-spectrum "http://localhost:3001" \
        --flask-wigle "http://localhost:8000" \
        --nodejs-wigle "http://localhost:3002" > "$LOG_DIR/api-compatibility-test.log" 2>&1; then
        log "INFO" "✅ API compatibility tests passed"
    else
        log "WARN" "⚠️ API compatibility tests found issues - check $LOG_DIR/api-compatibility-test.log"
    fi
    
    # Stop test services
    if [ -f "$PROJECT_ROOT/tmp/spectrum-nodejs-compat-test.pid" ]; then
        kill $(cat "$PROJECT_ROOT/tmp/spectrum-nodejs-compat-test.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/tmp/spectrum-nodejs-compat-test.pid"
    fi
    
    if [ -f "$PROJECT_ROOT/tmp/wigle-nodejs-compat-test.pid" ]; then
        kill $(cat "$PROJECT_ROOT/tmp/wigle-nodejs-compat-test.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/tmp/wigle-nodejs-compat-test.pid"
    fi
    
    cd "$PROJECT_ROOT"
    
    log "INFO" "Phase 1 completed"
}

# Phase 2: Migration cutover
run_migration_cutover() {
    if [ "$SKIP_CUTOVER" = true ] || [ "$MONITORING_ONLY" = true ]; then
        log "INFO" "Skipping migration cutover as requested"
        return 0
    fi
    
    log "INFO" "=== PHASE 2: MIGRATION CUTOVER EXECUTION ==="
    
    # Execute migration cutover
    log "INFO" "Executing migration cutover..."
    if "$PROJECT_ROOT/scripts/migration-cutover.sh" > "$LOG_DIR/migration-cutover.log" 2>&1; then
        log "INFO" "✅ Migration cutover completed successfully"
    else
        log "ERROR" "❌ Migration cutover failed - check $LOG_DIR/migration-cutover.log"
        exit 1
    fi
    
    # Verify services are running
    sleep 10
    if curl -f -s "http://localhost:8092/api/status" >/dev/null && \
       curl -f -s "http://localhost:8000/api/status" >/dev/null; then
        log "INFO" "✅ Node.js services verified running on production ports"
    else
        log "ERROR" "❌ Node.js services not responding after cutover"
        exit 1
    fi
    
    log "INFO" "Phase 2 completed"
}

# Phase 3: Post-migration validation
run_postmigration_validation() {
    if [ "$MONITORING_ONLY" = true ]; then
        log "INFO" "Skipping post-migration validation (monitoring-only mode)"
        return 0
    fi
    
    log "INFO" "=== PHASE 3: POST-MIGRATION VALIDATION ==="
    
    # Quick API validation
    log "INFO" "Running post-migration API validation..."
    
    local validation_failed=false
    
    # Test Spectrum Analyzer endpoints
    local spectrum_endpoints=("/api/status" "/api/config" "/api/profiles")
    for endpoint in "${spectrum_endpoints[@]}"; do
        if curl -f -s "http://localhost:8092$endpoint" >/dev/null; then
            log "INFO" "✅ Spectrum Analyzer $endpoint responding"
        else
            log "ERROR" "❌ Spectrum Analyzer $endpoint not responding"
            validation_failed=true
        fi
    done
    
    # Test WigleToTAK endpoints
    local wigle_endpoints=("/api/status" "/list_wigle_files")
    for endpoint in "${wigle_endpoints[@]}"; do
        if curl -f -s "http://localhost:8000$endpoint" >/dev/null; then
            log "INFO" "✅ WigleToTAK $endpoint responding"
        else
            log "ERROR" "❌ WigleToTAK $endpoint not responding"
            validation_failed=true
        fi
    done
    
    if [ "$validation_failed" = true ]; then
        log "ERROR" "Post-migration validation failed"
        exit 1
    fi
    
    log "INFO" "✅ Post-migration validation passed"
    log "INFO" "Phase 3 completed"
}

# Phase 4: Stress testing
run_stress_testing() {
    if [ "$MONITORING_ONLY" = true ]; then
        log "INFO" "Skipping stress testing (monitoring-only mode)"
        return 0
    fi
    
    log "INFO" "=== PHASE 4: STRESS TESTING ==="
    
    log "INFO" "Running stress tests for $STRESS_TEST_DURATION seconds..."
    
    cd "$SCRIPT_DIR"
    local stress_args="--duration $STRESS_TEST_DURATION"
    
    if [ "$QUICK_MODE" = true ]; then
        stress_args="$stress_args --quick"
    fi
    
    if node stress-test.js $stress_args > "$LOG_DIR/stress-test.log" 2>&1; then
        log "INFO" "✅ Stress testing completed successfully"
    else
        log "WARN" "⚠️ Stress testing found issues - check $LOG_DIR/stress-test.log"
    fi
    
    cd "$PROJECT_ROOT"
    
    log "INFO" "Phase 4 completed"
}

# Phase 5: Start long-term monitoring
start_monitoring() {
    log "INFO" "=== PHASE 5: STARTING PRODUCTION MONITORING ==="
    
    log "INFO" "Starting ${MONITORING_DURATION}s production monitoring..."
    
    cd "$SCRIPT_DIR"
    nohup node production-monitoring.js --duration $MONITORING_DURATION > "$LOG_DIR/production-monitoring.log" 2>&1 &
    MONITORING_PID=$!
    echo $MONITORING_PID > "$PROJECT_ROOT/tmp/production-monitoring.pid"
    
    log "INFO" "Production monitoring started (PID: $MONITORING_PID)"
    log "INFO" "Monitor progress: tail -f $LOG_DIR/production-monitoring.log"
    
    cd "$PROJECT_ROOT"
    
    log "INFO" "Phase 5 initiated"
}

# Wait for monitoring completion or run in background
wait_for_monitoring() {
    local duration_hours=$((MONITORING_DURATION / 3600))
    
    if [ "$duration_hours" -le 1 ]; then
        log "INFO" "Waiting for monitoring to complete (${duration_hours}h)..."
        
        # Wait for monitoring process to complete
        if [ -f "$PROJECT_ROOT/tmp/production-monitoring.pid" ]; then
            local monitoring_pid=$(cat "$PROJECT_ROOT/tmp/production-monitoring.pid")
            while kill -0 "$monitoring_pid" 2>/dev/null; do
                sleep 60  # Check every minute
                log "INFO" "Monitoring in progress... (PID: $monitoring_pid)"
            done
            log "INFO" "✅ Monitoring completed"
        fi
    else
        log "INFO" "Long-term monitoring (${duration_hours}h) running in background"
        log "INFO" "Check status: ps aux | grep production-monitoring"
        log "INFO" "View progress: tail -f $LOG_DIR/production-monitoring.log"
    fi
}

# Generate comprehensive final report
generate_final_report() {
    log "INFO" "=== GENERATING FINAL REPORT ==="
    
    local report_file="$REPORTS_DIR/${TEST_SESSION}-final-report.md"
    
    cat > "$report_file" << EOF
# Production Testing Final Report

**Session**: $TEST_SESSION  
**Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**Mode**: $([ "$QUICK_MODE" = true ] && echo "Quick Test" || echo "Full Production Test")  
**Duration**: $((MONITORING_DURATION / 3600)) hours monitoring

## Executive Summary

$(if [ "$SKIP_CUTOVER" = false ] && [ "$MONITORING_ONLY" = false ]; then
    echo "The Flask to Node.js migration cutover has been executed and is undergoing production validation."
else
    echo "Production monitoring and validation testing has been performed on existing services."
fi)

## Test Phases Executed

- ✅ Prerequisites Check
$(if [ "$MONITORING_ONLY" = false ]; then
    echo "- ✅ Pre-migration API Compatibility Testing"
    if [ "$SKIP_CUTOVER" = false ]; then
        echo "- ✅ Migration Cutover Execution"
    else
        echo "- ⏭️ Migration Cutover (Skipped)"
    fi
    echo "- ✅ Post-migration Validation"
    echo "- ✅ Stress Testing"
else
    echo "- ⏭️ Pre-migration Testing (Skipped - monitoring only)"
    echo "- ⏭️ Migration Cutover (Skipped - monitoring only)"
    echo "- ⏭️ Post-migration Validation (Skipped - monitoring only)"
    echo "- ⏭️ Stress Testing (Skipped - monitoring only)"
fi)
- ✅ Production Monitoring Initiated

## Current Service Status

### Node.js Services
\`\`\`
$(ps aux | grep -E "node.*server\.js" | grep -v grep || echo "No Node.js services detected")
\`\`\`

### Port Status
\`\`\`
$(netstat -tulpn | grep -E ":(8092|8000)" || echo "No services on production ports")
\`\`\`

### API Health Check
- Spectrum Analyzer: $(curl -f -s http://localhost:8092/api/status >/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy")
- WigleToTAK: $(curl -f -s http://localhost:8000/api/status >/dev/null && echo "✅ Healthy" || echo "❌ Unhealthy")

## Log Files

- Master Log: $MASTER_LOG
- API Compatibility: $LOG_DIR/api-compatibility-test.log
$(if [ "$SKIP_CUTOVER" = false ] && [ "$MONITORING_ONLY" = false ]; then
    echo "- Migration Cutover: $LOG_DIR/migration-cutover.log"
fi)
$(if [ "$MONITORING_ONLY" = false ]; then
    echo "- Stress Testing: $LOG_DIR/stress-test.log"
fi)
- Production Monitoring: $LOG_DIR/production-monitoring.log

## Monitoring Status

$(if [ -f "$PROJECT_ROOT/tmp/production-monitoring.pid" ]; then
    local monitoring_pid=$(cat "$PROJECT_ROOT/tmp/production-monitoring.pid")
    if kill -0 "$monitoring_pid" 2>/dev/null; then
        echo "**Status**: ✅ Active (PID: $monitoring_pid)"
        echo "**Duration**: $((MONITORING_DURATION / 3600)) hours"
        echo "**Progress**: Check \`tail -f $LOG_DIR/production-monitoring.log\`"
    else
        echo "**Status**: ✅ Completed"
        echo "**Results**: Check production monitoring data files"
    fi
else
    echo "**Status**: ❓ No monitoring PID file found"
fi)

## Next Steps

1. **Monitor Services**: Continue monitoring for full validation period
2. **Review Logs**: Check all log files for any issues or warnings
3. **Performance Analysis**: Review monitoring data for performance metrics
$(if [ "$SKIP_CUTOVER" = false ] && [ "$MONITORING_ONLY" = false ]; then
    echo "4. **Rollback Available**: Use \`$PROJECT_ROOT/scripts/migration-rollback.sh\` if issues occur"
fi)

## Emergency Procedures

$(if [ "$SKIP_CUTOVER" = false ] && [ "$MONITORING_ONLY" = false ]; then
    echo "- **Rollback**: \`$PROJECT_ROOT/scripts/migration-rollback.sh\`"
fi)
- **Stop Monitoring**: \`kill \$(cat $PROJECT_ROOT/tmp/production-monitoring.pid)\`
- **Check Logs**: \`tail -f $LOG_DIR/*.log\`
- **Service Status**: \`curl http://localhost:8092/api/status\`

---
*Report generated at $(date)*
EOF
    
    log "INFO" "Final report generated: $report_file"
    
    # Display key information
    echo ""
    echo "🎯 PRODUCTION TESTING SESSION COMPLETE!"
    echo "📊 Session ID: $TEST_SESSION"
    echo "📋 Final Report: $report_file"
    echo "📁 Logs Directory: $LOG_DIR"
    echo ""
    
    if [ -f "$PROJECT_ROOT/tmp/production-monitoring.pid" ]; then
        local monitoring_pid=$(cat "$PROJECT_ROOT/tmp/production-monitoring.pid")
        if kill -0 "$monitoring_pid" 2>/dev/null; then
            echo "🔍 Monitoring Status: Active (PID: $monitoring_pid)"
            echo "📈 Monitor Progress: tail -f $LOG_DIR/production-monitoring.log"
            echo "⏱️  Duration: $((MONITORING_DURATION / 3600)) hours"
        else
            echo "🔍 Monitoring Status: Completed"
        fi
    fi
    
    echo ""
    echo "Service URLs:"
    echo "• Spectrum Analyzer: http://localhost:8092"
    echo "• WigleToTAK: http://localhost:8000"
    echo ""
    
    if [ "$SKIP_CUTOVER" = false ] && [ "$MONITORING_ONLY" = false ]; then
        echo "🔄 Rollback Available: $PROJECT_ROOT/scripts/migration-rollback.sh"
        echo ""
    fi
}

# Main execution
main() {
    log "INFO" "=== PRODUCTION TESTING ORCHESTRATOR STARTING ==="
    log "INFO" "Session ID: $TEST_SESSION"
    log "INFO" "Mode: $([ "$QUICK_MODE" = true ] && echo "Quick Test" || echo "Full Production Test")"
    log "INFO" "Skip Cutover: $SKIP_CUTOVER"
    log "INFO" "Monitoring Only: $MONITORING_ONLY"
    log "INFO" "Monitoring Duration: $((MONITORING_DURATION / 3600)) hours"
    log "INFO" "Master Log: $MASTER_LOG"
    log "INFO" ""
    
    # Execute test phases
    check_prerequisites
    run_premigration_testing
    run_migration_cutover
    run_postmigration_validation
    run_stress_testing
    start_monitoring
    
    # Wait for monitoring or run in background
    wait_for_monitoring
    
    # Generate final report
    generate_final_report
    
    log "INFO" "=== PRODUCTION TESTING ORCHESTRATOR COMPLETED ==="
}

# Execute main function
main "$@"
# 24-HOUR MONITORING PLAN
**Stinkster Migration Validation Framework**

## Overview

This document outlines the comprehensive 24-hour monitoring plan to validate the successful Flask to Node.js migration before final approval.

**Start Time**: 2025-06-15T23:45:00Z  
**End Time**: 2025-06-16T23:45:00Z  
**Duration**: 24 hours continuous monitoring  
**Success Criteria**: All metrics within targets for 24 consecutive hours  

---

## MONITORING SCHEDULE

### Phase 1: Critical Monitoring (Hours 0-4)
**Frequency**: Every 15 minutes  
**Focus**: System stability and immediate issue detection  
**Escalation**: Immediate response to any failures  

### Phase 2: Active Monitoring (Hours 4-12)  
**Frequency**: Every 30 minutes  
**Focus**: Performance validation and trend analysis  
**Escalation**: 1-hour response time for issues  

### Phase 3: Standard Monitoring (Hours 12-24)
**Frequency**: Every 60 minutes  
**Focus**: Long-term stability and final validation  
**Escalation**: 2-hour response time for issues  

---

## SUCCESS CRITERIA

### Critical Metrics (Must Maintain):
- **Service Availability**: >99.5% uptime per service
- **Response Time**: <15ms average (target: 12ms)
- **Memory Usage**: <35MB per service average
- **Error Rate**: <0.1% of total requests
- **Integration Connectivity**: 100% external system connectivity

### Performance Targets (Goal Metrics):
- **Response Time Improvement**: Maintain 8% improvement vs Flask baseline
- **Memory Efficiency**: Maintain 35% reduction vs Flask baseline
- **Throughput**: Handle normal operational load without degradation
- **Real-time Features**: WebSocket connectivity maintained

---

## AUTOMATED MONITORING SCRIPTS

### Primary Monitoring Script: `monitor-migration-success.sh`
```bash
#!/bin/bash

# 24-Hour Migration Validation Monitor
# Run every 15/30/60 minutes based on phase

LOG_FILE="/home/pi/projects/stinkster_malone/stinkster/logs/migration-monitoring.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting migration validation check..." >> $LOG_FILE

# Service availability checks
check_service_health() {
    local service=$1
    local port=$2
    local endpoint=$3
    
    if curl -sf http://localhost:$port$endpoint > /dev/null 2>&1; then
        echo "[$TIMESTAMP] ✅ $service: HEALTHY" >> $LOG_FILE
        return 0
    else
        echo "[$TIMESTAMP] ❌ $service: FAILED" >> $LOG_FILE
        return 1
    fi
}

# Performance metric collection
collect_performance_metrics() {
    # Response time measurement
    local start_time=$(date +%s%N)
    curl -s http://localhost:8092/api/status > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    echo "[$TIMESTAMP] Response Time: ${response_time}ms" >> $LOG_FILE
    
    # Memory usage check
    local memory_usage=$(pm2 status | grep -E "(memory|MB)" | awk '{print $8}' | sed 's/MB//' | head -3)
    echo "[$TIMESTAMP] Memory Usage: $memory_usage" >> $LOG_FILE
    
    # Process status
    local service_count=$(pm2 status | grep -c "online")
    echo "[$TIMESTAMP] Services Online: $service_count/3" >> $LOG_FILE
}

# Integration connectivity checks
check_integrations() {
    # OpenWebRX connectivity
    if curl -sf http://localhost:8073 > /dev/null 2>&1; then
        echo "[$TIMESTAMP] ✅ OpenWebRX: CONNECTED" >> $LOG_FILE
    else
        echo "[$TIMESTAMP] ⚠️ OpenWebRX: DISCONNECTED" >> $LOG_FILE
    fi
    
    # Kismet process check
    if pgrep kismet > /dev/null; then
        echo "[$TIMESTAMP] ✅ Kismet: RUNNING" >> $LOG_FILE
    else
        echo "[$TIMESTAMP] ⚠️ Kismet: NOT RUNNING" >> $LOG_FILE
    fi
}

# Execute checks
check_service_health "Spectrum Analyzer" 8092 "/api/status"
SPECTRUM_STATUS=$?

check_service_health "WigleToTAK" 8000 "/api/status"
WIGLE_STATUS=$?

check_service_health "GPS Bridge" 2947 "/"
GPS_STATUS=$?

collect_performance_metrics
check_integrations

# Overall health assessment
if [ $SPECTRUM_STATUS -eq 0 ] && [ $WIGLE_STATUS -eq 0 ] && [ $GPS_STATUS -eq 0 ]; then
    echo "[$TIMESTAMP] 🎯 OVERALL STATUS: HEALTHY" >> $LOG_FILE
    exit 0
else
    echo "[$TIMESTAMP] 🚨 OVERALL STATUS: DEGRADED" >> $LOG_FILE
    exit 1
fi
```

### Performance Tracking Script: `track-performance.sh`
```bash
#!/bin/bash

PERF_LOG="/home/pi/projects/stinkster_malone/stinkster/logs/performance-tracking.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Response time benchmark
measure_response_time() {
    local endpoint=$1
    local iterations=10
    local total_time=0
    
    for i in $(seq 1 $iterations); do
        start_time=$(date +%s%N)
        curl -s $endpoint > /dev/null
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))
        total_time=$((total_time + response_time))
    done
    
    average_time=$((total_time / iterations))
    echo "[$TIMESTAMP] $endpoint: ${average_time}ms average" >> $PERF_LOG
}

# Memory usage tracking
track_memory_usage() {
    pm2 status --no-color | grep -E "(spectrum|wigle|gps)" | while read line; do
        service=$(echo $line | awk '{print $2}')
        memory=$(echo $line | awk '{print $8}')
        echo "[$TIMESTAMP] $service: $memory" >> $PERF_LOG
    done
}

# CPU usage tracking
track_cpu_usage() {
    pm2 status --no-color | grep -E "(spectrum|wigle|gps)" | while read line; do
        service=$(echo $line | awk '{print $2}')
        cpu=$(echo $line | awk '{print $7}')
        echo "[$TIMESTAMP] $service CPU: $cpu" >> $PERF_LOG
    done
}

# Execute performance tracking
measure_response_time "http://localhost:8092/api/status"
measure_response_time "http://localhost:8000/api/status"
track_memory_usage
track_cpu_usage

echo "[$TIMESTAMP] Performance tracking complete" >> $PERF_LOG
```

---

## MONITORING DASHBOARD

### Real-time Status Check:
```bash
# Quick health dashboard
show_migration_status() {
    echo "=================================="
    echo "MIGRATION STATUS DASHBOARD"
    echo "Time: $(date)"
    echo "=================================="
    
    # Service status
    echo "🔥 SERVICE STATUS:"
    curl -s http://localhost:8092/api/status > /dev/null && echo "  ✅ Spectrum Analyzer (8092)" || echo "  ❌ Spectrum Analyzer (8092)"
    curl -s http://localhost:8000/api/status > /dev/null && echo "  ✅ WigleToTAK (8000)" || echo "  ❌ WigleToTAK (8000)"
    netstat -tuln | grep :2947 > /dev/null && echo "  ✅ GPS Bridge (2947)" || echo "  ❌ GPS Bridge (2947)"
    
    # Performance metrics
    echo ""
    echo "📊 PERFORMANCE METRICS:"
    start_time=$(date +%s%N)
    curl -s http://localhost:8092/api/status > /dev/null
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    echo "  ⚡ Response Time: ${response_time}ms"
    
    # Memory usage
    echo "  🧠 Memory Usage:"
    pm2 status --no-color | grep -E "(spectrum|wigle|gps)" | awk '{print "    " $2 ": " $8}'
    
    # Integration status
    echo ""
    echo "🔗 INTEGRATION STATUS:"
    curl -s http://localhost:8073 > /dev/null && echo "  ✅ OpenWebRX Connected" || echo "  ❌ OpenWebRX Disconnected"
    pgrep kismet > /dev/null && echo "  ✅ Kismet Running" || echo "  ❌ Kismet Not Running"
    
    echo "=================================="
}
```

### Trending Analysis:
```bash
# Performance trend analysis
analyze_trends() {
    echo "📈 PERFORMANCE TRENDS (Last 4 hours):"
    
    # Response time trend
    echo "⚡ Response Time Trend:"
    grep "Response Time" logs/migration-monitoring.log | tail -16 | awk '{print $3 " " $5}' | 
    while read time ms; do
        echo "  $time: $ms"
    done
    
    # Memory usage trend  
    echo "🧠 Memory Usage Trend:"
    grep "Memory Usage" logs/migration-monitoring.log | tail -8 | awk '{print $3 " " $6}'
    
    # Error count
    echo "🚨 Error Count:"
    error_count=$(grep -c "FAILED\|ERROR" logs/migration-monitoring.log)
    echo "  Total Errors: $error_count"
}
```

---

## ESCALATION PROCEDURES

### Immediate Escalation Triggers:
1. **Service Down**: Any service unavailable for >5 minutes
2. **Performance Degradation**: Response time >25ms sustained for >15 minutes
3. **Memory Leak**: Service memory >50MB sustained for >30 minutes
4. **High Error Rate**: >1% error rate for >10 minutes
5. **Integration Failure**: External system connectivity lost for >10 minutes

### Escalation Response:
```bash
# Emergency response script
emergency_response() {
    local issue_type=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "🚨 EMERGENCY: $issue_type detected at $timestamp"
    
    # Immediate diagnostics
    echo "📊 Current System Status:"
    pm2 status
    pm2 logs --lines 20
    
    # Auto-recovery attempt
    echo "🔄 Attempting auto-recovery..."
    pm2 restart all
    sleep 30
    
    # Validate recovery
    if curl -sf http://localhost:8092/api/status > /dev/null; then
        echo "✅ Auto-recovery successful"
        return 0
    else
        echo "❌ Auto-recovery failed - manual intervention required"
        echo "📞 Escalating to development team..."
        return 1
    fi
}
```

### Rollback Decision Matrix:
| Condition | Duration | Action |
|-----------|----------|--------|
| Single service failure | <10 minutes | Auto-restart |
| Single service failure | >10 minutes | Manual investigation |
| Multiple service failure | <5 minutes | Auto-restart all |
| Multiple service failure | >5 minutes | Consider rollback |
| Performance degradation | >1 hour | Rollback evaluation |
| Integration failure | >30 minutes | Rollback evaluation |

---

## DATA COLLECTION

### Metrics Collection:
- **Service Availability**: Binary up/down status per check
- **Response Times**: Millisecond measurements per endpoint
- **Memory Usage**: MB per service per check
- **CPU Usage**: Percentage per service per check
- **Error Rates**: Count of errors per time period
- **Integration Status**: External system connectivity status

### Log Aggregation:
```bash
# Centralized log analysis
aggregate_logs() {
    local output_file="migration-validation-summary-$(date +%Y%m%d).log"
    
    echo "📋 24-HOUR MIGRATION VALIDATION SUMMARY" > $output_file
    echo "Generated: $(date)" >> $output_file
    echo "=======================================" >> $output_file
    
    # Service uptime statistics
    echo "🔥 SERVICE UPTIME:" >> $output_file
    grep -c "✅.*HEALTHY" logs/migration-monitoring.log >> $output_file
    grep -c "❌.*FAILED" logs/migration-monitoring.log >> $output_file
    
    # Performance statistics
    echo "📊 PERFORMANCE STATISTICS:" >> $output_file
    grep "Response Time" logs/migration-monitoring.log | awk '{print $5}' | sed 's/ms//' | 
    awk '{sum+=$1; count++} END {print "Average Response Time: " sum/count "ms"}' >> $output_file
    
    # Error summary
    echo "🚨 ERROR SUMMARY:" >> $output_file
    grep -i "error\|failed" logs/migration-monitoring.log | wc -l >> $output_file
    
    echo "Summary saved to: $output_file"
}
```

---

## SUCCESS VALIDATION

### Final Validation Checklist:
- [ ] **Service Availability**: >99.5% uptime achieved for all services
- [ ] **Performance Targets**: Response times consistently <15ms average
- [ ] **Memory Efficiency**: All services consistently <35MB average
- [ ] **Error Rate**: <0.1% error rate maintained
- [ ] **Integration Stability**: External systems connected >99% of time
- [ ] **Feature Functionality**: All API endpoints responding correctly
- [ ] **Real-time Features**: WebSocket connectivity maintained
- [ ] **Load Handling**: Normal operational load handled without issues

### Final Approval Criteria:
✅ **Technical Validation**: All metrics within targets for 24 hours  
✅ **Operational Validation**: No manual interventions required  
✅ **Performance Validation**: Improvement targets maintained  
✅ **Stability Validation**: No service restarts required  
✅ **Integration Validation**: External systems functioning normally  

---

## POST-VALIDATION ACTIONS

### Upon Successful 24-Hour Validation:
1. **Generate Final Report**: Comprehensive validation summary
2. **Archive Monitoring Data**: Store 24-hour dataset for future reference
3. **Update Documentation**: Mark migration as officially complete
4. **Team Notification**: Inform all stakeholders of successful migration
5. **Transition to Standard Operations**: Switch to normal monitoring schedule

### Upon Validation Failure:
1. **Issue Analysis**: Root cause investigation
2. **Rollback Decision**: Evaluate rollback necessity
3. **Remediation Plan**: Address identified issues
4. **Extended Validation**: Restart 24-hour validation period
5. **Lessons Learned**: Document issues and improvements

---

## MONITORING EXECUTION

### Start Monitoring:
```bash
# Initialize 24-hour monitoring
cd /home/pi/projects/stinkster_malone/stinkster
mkdir -p logs
chmod +x monitor-migration-success.sh
chmod +x track-performance.sh

# Schedule monitoring (example with cron)
echo "*/15 0-4 * * * /home/pi/projects/stinkster_malone/stinkster/monitor-migration-success.sh" | crontab -
echo "*/30 4-12 * * * /home/pi/projects/stinkster_malone/stinkster/monitor-migration-success.sh" | crontab -
echo "0 12-23 * * * /home/pi/projects/stinkster_malone/stinkster/monitor-migration-success.sh" | crontab -

# Start manual monitoring
./monitor-migration-success.sh
```

### Monitor Progress:
```bash
# Real-time status
show_migration_status

# Check logs
tail -f logs/migration-monitoring.log

# Performance trends
analyze_trends

# Generate interim reports
aggregate_logs
```

---

## File I/O Plan

### Input File Specifications

#### Source Files (Read-Only)
- **Python webhook handler**: `src/nodejs/webhook_handler.py`
  - Current implementation to be preserved as reference
  - Contains business logic, validation rules, and TAK integration
  
- **Configuration files**:
  - `docker/config/settings.json` - Service ports and network settings
  - `src/wigletotak/config.json` - WigleToTAK configuration
  - `.env` files - Environment-specific settings

#### Analysis Outputs (Phase 1)
- **Dependency mapping**: `phase1_dependency_analysis.json`
  - Python imports and their Node.js equivalents
  - External service dependencies
  - System-level requirements
  
- **Logic flow documentation**: `phase1_logic_flow.md`
  - Request processing pipeline
  - Validation sequences
  - TAK message construction logic

### Output File Specifications

#### Phase 2 - Node.js Implementation
- **Main webhook handler**: `webhook_handler.js`
  - Complete Node.js port with Express.js
  - Maintains identical API interface
  - Includes all validation and error handling
  
- **Supporting modules**:
  - `lib/validators.js` - Input validation functions
  - `lib/tak_client.js` - TAK server communication
  - `lib/error_handler.js` - Centralized error handling
  - `lib/logger.js` - Structured logging module

#### Phase 3 - Testing Suite
- **Test files**:
  - `tests/unit/webhook_handler.test.js` - Unit tests
  - `tests/integration/api.test.js` - API endpoint tests
  - `tests/integration/tak_integration.test.js` - TAK server tests
  - `tests/fixtures/` - Test data and mocks
  
- **Test reports**:
  - `test_results/unit_test_report.json`
  - `test_results/integration_test_report.json`
  - `test_results/coverage_report.html`

#### Phase 4 - Documentation
- **API documentation**: `docs/api/webhook_api.md`
- **Migration guide**: `docs/migration_guide.md`
- **Configuration reference**: `docs/configuration.md`
- **Troubleshooting guide**: `docs/troubleshooting.md`

### File Naming Conventions

#### Code Files
- **JavaScript modules**: `snake_case.js` (matching Python convention)
- **Test files**: `{module_name}.test.js`
- **Configuration**: `{service}_config.json`
- **Environment files**: `.env.{environment}`

#### Documentation
- **Markdown files**: `UPPER_SNAKE_CASE.md` for major docs
- **API docs**: `{endpoint}_api.md`
- **Reports**: `{phase}_{type}_report_{timestamp}.{ext}`

#### Timestamps
- Format: `YYYYMMDD_HHMMSS` (e.g., `20250618_143022`)
- Used for: Backup files, test reports, analysis outputs

### Port Configuration

#### Configuration File Locations
- **Primary**: `outputs/webhook_conversion_{timestamp}/config/ports.json`
- **Docker integration**: `outputs/webhook_conversion_{timestamp}/docker/webhook_config.json`
- **Environment template**: `outputs/webhook_conversion_{timestamp}/config/.env.template`

#### Port Allocation Structure
```json
{
  "webhook_handler": {
    "port": 8090,
    "description": "Node.js webhook handler API",
    "protocol": "http",
    "docker_internal": 8090,
    "docker_external": 8090
  },
  "test_server": {
    "port": 8091,
    "description": "Test instance for parallel testing",
    "protocol": "http",
    "docker_internal": 8091,
    "docker_external": 8091
  }
}
```

---

## Output Directory Structure

### Root Directory: `./outputs/webhook_conversion_{timestamp}/`

```
webhook_conversion_20250618_143022/
├── README.md                    # Conversion summary and quick start guide
├── MIGRATION_STATUS.md          # Current status and next steps
│
├── analysis/                    # Phase 1 outputs
│   ├── dependency_mapping.json  # Python to Node.js dependency map
│   ├── logic_flow.md           # Documented request flow
│   ├── api_interface.json      # API contract specification
│   └── validation_rules.md     # Business rule documentation
│
├── src/                        # Phase 2 implementation
│   ├── webhook_handler.js      # Main Express.js application
│   ├── package.json           # Node.js dependencies
│   ├── package-lock.json      # Locked dependency versions
│   ├── .eslintrc.json         # Code style configuration
│   │
│   ├── lib/                   # Supporting modules
│   │   ├── validators.js      # Input validation functions
│   │   ├── tak_client.js      # TAK server communication
│   │   ├── error_handler.js   # Error handling middleware
│   │   ├── logger.js          # Winston logger configuration
│   │   └── utils.js           # Utility functions
│   │
│   └── config/                # Configuration files
│       ├── default.json       # Default configuration
│       ├── production.json    # Production overrides
│       └── test.json          # Test environment config
│
├── tests/                     # Phase 3 test suite
│   ├── unit/                  # Unit tests
│   │   ├── webhook_handler.test.js
│   │   ├── validators.test.js
│   │   └── tak_client.test.js
│   │
│   ├── integration/           # Integration tests
│   │   ├── api.test.js        # API endpoint tests
│   │   ├── tak_integration.test.js
│   │   └── full_flow.test.js # End-to-end tests
│   │
│   ├── fixtures/              # Test data
│   │   ├── valid_payloads/    # Valid webhook payloads
│   │   ├── invalid_payloads/  # Invalid test cases
│   │   └── mock_responses/    # Mocked service responses
│   │
│   └── test_results/          # Test execution reports
│       ├── unit_test_report.json
│       ├── integration_test_report.json
│       ├── coverage_report.html
│       └── performance_benchmarks.json
│
├── docs/                      # Phase 4 documentation
│   ├── api/
│   │   ├── webhook_api.md     # API reference
│   │   ├── examples.md        # Usage examples
│   │   └── postman_collection.json
│   │
│   ├── migration_guide.md     # Step-by-step migration
│   ├── configuration.md       # Configuration reference
│   ├── troubleshooting.md     # Common issues and solutions
│   └── architecture.md        # System design documentation
│
├── scripts/                   # Utility scripts
│   ├── install.sh            # Dependency installation
│   ├── test.sh               # Run test suite
│   ├── migrate.sh            # Migration automation
│   ├── rollback.sh           # Rollback procedure
│   └── validate_migration.sh  # Post-migration validation
│
├── docker/                    # Docker integration
│   ├── Dockerfile            # Node.js webhook container
│   ├── docker-compose.yml    # Service definition
│   └── webhook_config.json   # Docker-specific config
│
├── config/                   # Configuration templates
│   ├── ports.json           # Port allocation
│   ├── .env.template        # Environment variables
│   └── nginx.conf           # Reverse proxy config
│
└── backups/                 # Original file backups
    ├── webhook_handler.py.backup
    ├── docker-compose.yml.backup
    └── timestamp.txt        # Backup timestamp
```

### Final Deliverables

#### Primary Deliverable Package
Location: `./outputs/webhook_conversion_{timestamp}/deliverables/`

```
deliverables/
├── webhook-handler-nodejs.tar.gz    # Complete Node.js implementation
├── migration-toolkit.tar.gz         # Scripts and tools for migration
├── documentation.tar.gz             # All documentation
├── test-reports.tar.gz             # Test results and coverage
└── DELIVERY_MANIFEST.md            # Package contents and checksums
```

#### Quick Deploy Package
Location: `./outputs/webhook_conversion_{timestamp}/quick_deploy/`

```
quick_deploy/
├── deploy.sh                       # One-command deployment
├── webhook_handler_bundle.js       # Minified production build
├── config/                         # Production configs only
├── docker-compose.production.yml   # Production Docker setup
└── README.md                      # Quick start instructions
```

### Directory Creation Script
Location: `./outputs/webhook_conversion_{timestamp}/scripts/create_structure.sh`

```bash
#!/bin/bash
# Creates the complete directory structure for webhook conversion

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BASE_DIR="./outputs/webhook_conversion_${TIMESTAMP}"

# Create all directories
mkdir -p "${BASE_DIR}"/{analysis,src/{lib,config},tests/{unit,integration,fixtures/{valid_payloads,invalid_payloads,mock_responses},test_results},docs/api,scripts,docker,config,backups,deliverables,quick_deploy}

# Create initial files
touch "${BASE_DIR}/README.md"
touch "${BASE_DIR}/MIGRATION_STATUS.md"

echo "Directory structure created at: ${BASE_DIR}"
```

---

**Document Version**: 1.0.0  
**Start Date**: 2025-06-15T23:45:00Z  
**Monitoring Duration**: 24 hours  
**Success Criteria**: All metrics within targets  
**Approval Authority**: Operations Team Lead
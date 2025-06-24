# Comprehensive Webhook Migration Testing and Validation Strategy

## Executive Summary

This document outlines a complete testing and validation strategy for migrating the webhook service from Python (Flask) to Node.js (Express) while ensuring 100% compatibility with the existing `hi.html` interface and maintaining all critical system functionality.

### Key Requirements
- **Zero Downtime Migration**: Parallel deployment with seamless cutover
- **100% API Compatibility**: All endpoints must respond identically  
- **Process Management Integrity**: GPS, Kismet, and WigleToTAK orchestration must work flawlessly
- **Rollback Capability**: Instant reversion to Python service if issues arise

## Testing Phases Overview

### Phase 1: Unit Testing (Development)
- Individual component testing
- Mock external dependencies
- API response validation
- Error handling verification

### Phase 2: Integration Testing (Staging)
- Real GPS hardware integration
- Kismet process management
- Network interface control
- PID file management

### Phase 3: Compatibility Testing (Parallel)
- Side-by-side API comparison
- Response format validation
- Timing and performance tests
- Load testing

### Phase 4: Acceptance Testing (Production)
- Live deployment validation
- User interface testing
- Monitoring and observability
- Performance benchmarking

## Detailed Test Cases

### 1. API Endpoint Testing

#### 1.1 POST /run-script
**Purpose**: Start GPS, Kismet, and WigleToTAK services

**Test Cases**:
```javascript
// Test Case 1.1.1: Successful script start
{
  test: "Start script when no processes running",
  preconditions: [
    "No existing Kismet processes",
    "No PID files present",
    "GPS device available",
    "wlan2 interface available"
  ],
  steps: [
    "POST /run-script",
    "Verify response format",
    "Check process creation",
    "Verify PID files created",
    "Confirm GPS data flow",
    "Verify Kismet started"
  ],
  expectedResponse: {
    status: "success",
    message: "Script started successfully"
  },
  validation: [
    "Response matches Python format exactly",
    "All processes running",
    "PID files exist and contain valid PIDs",
    "Logs created in correct locations"
  ]
}

// Test Case 1.1.2: Script already running
{
  test: "Attempt start when already running",
  preconditions: ["Script already running"],
  expectedResponse: {
    status: "error",
    message: "Script is already running"
  }
}

// Test Case 1.1.3: Cleanup stale processes
{
  test: "Start with stale PID files",
  preconditions: [
    "PID files exist but processes dead",
    "Stale Kismet processes running"
  ],
  validation: [
    "Stale processes killed",
    "Old PID files cleaned up",
    "New processes started successfully"
  ]
}
```

#### 1.2 POST /stop-script
**Purpose**: Stop all services and cleanup

**Test Cases**:
```javascript
// Test Case 1.2.1: Successful stop
{
  test: "Stop all running services",
  preconditions: ["All services running"],
  steps: [
    "POST /stop-script",
    "Verify process termination",
    "Check PID file cleanup",
    "Verify network interface reset",
    "Confirm GPSD restart"
  ],
  expectedResponse: {
    status: "success",
    message: "Script stopped successfully"
  },
  validation: [
    "All processes terminated",
    "PID files removed",
    "wlan2 in managed mode",
    "GPSD service restarted"
  ]
}

// Test Case 1.2.2: Stop when not running
{
  test: "Stop when nothing running",
  expectedResponse: {
    status: "success",
    message: "Script was not running"
  }
}
```

#### 1.3 GET /info
**Purpose**: System status and GPS information

**Test Cases**:
```javascript
// Test Case 1.3.1: GPS with 3D fix
{
  test: "GPS data with good signal",
  preconditions: ["GPS has 3D fix"],
  expectedResponse: {
    gps: {
      lat: 40.7128,  // Example values
      lon: -74.0060,
      alt: 10.5,
      mode: 3,
      time: "2025-06-16T12:00:00Z",
      speed: 0.5,
      track: 180.0,
      status: "3D Fix"
    },
    kismet: "Running",
    wigle: "Running", 
    ip: "192.168.1.100"
  },
  validation: [
    "All GPS fields present",
    "Numeric values properly typed",
    "Status string matches exactly",
    "IP address format valid"
  ]
}

// Test Case 1.3.2: GPS no fix
{
  test: "GPS without fix",
  expectedResponse: {
    gps: {
      lat: null,
      lon: null,
      alt: null,
      mode: 0,
      time: null,
      speed: null,
      track: null,
      status: "No Fix"
    }
  }
}
```

#### 1.4 GET /script-status
**Purpose**: Detailed process status

**Test Cases**:
```javascript
// Test Case 1.4.1: All services running
{
  test: "Full operational status",
  expectedResponse: {
    running: true,
    message: "All services operational",
    kismet_running: true,
    kismet_api_responding: true,
    wigle_running: true
  }
}

// Test Case 1.4.2: Partial failure
{
  test: "Kismet API not responding",
  preconditions: ["Kismet process running but API down"],
  expectedResponse: {
    running: true,
    message: "Script running but Kismet API not responding",
    kismet_running: true,
    kismet_api_responding: false,
    wigle_running: true
  }
}
```

#### 1.5 GET /kismet-data
**Purpose**: WiFi scanning results

**Test Cases**:
```javascript
// Test Case 1.5.1: CSV data available
{
  test: "Read Kismet CSV successfully",
  preconditions: ["Kismet CSV files exist with data"],
  expectedResponse: {
    devices_count: 10,
    networks_count: 5,
    recent_devices: [
      {
        name: "TestDevice",
        type: "Wi-Fi AP",
        channel: "6"
      }
    ],
    feed_items: [
      {
        type: "Device",
        message: "New device detected: TestDevice"
      }
    ],
    last_update: "14:30:45",
    error: undefined
  }
}

// Test Case 1.5.2: Fallback to API
{
  test: "No CSV, use Kismet API",
  preconditions: ["No CSV files", "Kismet API available"],
  validation: [
    "API fallback works",
    "Data format identical",
    "Error field not present on success"
  ]
}
```

### 2. Process Management Testing

#### 2.1 GPS Integration
```yaml
Test Suite: GPS Communication
  - Test GPSD connection on port 2947
  - Validate GPS data parsing
  - Test reconnection after GPSD restart
  - Verify timeout handling
  - Test invalid GPS data handling
```

#### 2.2 Kismet Process Control
```yaml
Test Suite: Kismet Management
  - Start Kismet with correct arguments
  - Monitor mode activation for wlan2
  - PID tracking accuracy
  - Log file creation and rotation
  - Process cleanup on crash
  - API availability check
```

#### 2.3 Network Interface Management
```yaml
Test Suite: WiFi Interface Control
  - Set interface to monitor mode
  - Reset to managed mode
  - Handle missing interface
  - Recover from failed mode change
  - Verify interface state
```

### 3. Integration Test Scenarios

#### 3.1 Full System Test
```bash
#!/bin/bash
# Full integration test script

echo "=== Webhook Migration Integration Test ==="

# 1. Start Node.js service on test port
export WEBHOOK_PORT=5001
node src/nodejs/webhook-service/index.js &
NODE_PID=$!

# 2. Wait for service to start
sleep 5

# 3. Test complete workflow
echo "Testing complete workflow..."

# Start services
curl -X POST http://localhost:5001/run-script
sleep 10

# Check status
curl http://localhost:5001/script-status | jq .

# Get GPS info
curl http://localhost:5001/info | jq .

# Get Kismet data
curl http://localhost:5001/kismet-data | jq .

# Stop services
curl -X POST http://localhost:5001/stop-script

# 4. Cleanup
kill $NODE_PID
```

#### 3.2 Parallel Comparison Test
```javascript
// Compare Python and Node.js responses
const comparator = {
  async compareEndpoints() {
    const endpoints = [
      { method: 'GET', path: '/info' },
      { method: 'GET', path: '/script-status' },
      { method: 'GET', path: '/kismet-data' },
      { method: 'POST', path: '/run-script' },
      { method: 'POST', path: '/stop-script' }
    ];
    
    for (const endpoint of endpoints) {
      const pythonResponse = await fetch(`http://localhost:5000${endpoint.path}`, {
        method: endpoint.method
      });
      const nodeResponse = await fetch(`http://localhost:5001${endpoint.path}`, {
        method: endpoint.method
      });
      
      const pythonData = await pythonResponse.json();
      const nodeData = await nodeResponse.json();
      
      // Deep comparison
      const differences = deepDiff(pythonData, nodeData);
      if (differences.length > 0) {
        console.error(`Mismatch in ${endpoint.path}:`, differences);
      }
    }
  }
};
```

### 4. Performance Testing

#### 4.1 Response Time Benchmarks
```yaml
Benchmark Requirements:
  - /info: < 100ms
  - /script-status: < 50ms
  - /kismet-data: < 500ms (with large CSV)
  - /run-script: < 2000ms
  - /stop-script: < 3000ms
```

#### 4.2 Load Testing
```javascript
// Artillery load test configuration
{
  "config": {
    "target": "http://localhost:5001",
    "phases": [
      { "duration": 60, "arrivalRate": 10 },
      { "duration": 120, "arrivalRate": 50 },
      { "duration": 60, "arrivalRate": 100 }
    ]
  },
  "scenarios": [
    {
      "name": "Status Polling",
      "weight": 60,
      "flow": [
        { "get": { "url": "/info" } },
        { "get": { "url": "/script-status" } },
        { "get": { "url": "/kismet-data" } }
      ]
    },
    {
      "name": "Control Operations",
      "weight": 40,
      "flow": [
        { "post": { "url": "/run-script" } },
        { "think": 30 },
        { "post": { "url": "/stop-script" } }
      ]
    }
  ]
}
```

### 5. Error Scenario Testing

#### 5.1 Hardware Failures
```yaml
Test Cases:
  - GPS device disconnected
  - WiFi adapter removed
  - Kismet crashes unexpectedly
  - Disk full (log rotation)
  - Permission denied errors
```

#### 5.2 Network Issues
```yaml
Test Cases:
  - GPSD not responding
  - Kismet API timeout
  - Port conflicts
  - Firewall blocking
```

#### 5.3 Concurrent Access
```yaml
Test Cases:
  - Multiple start requests
  - Start/stop race conditions
  - Concurrent status polling
  - PID file locking
```

### 6. Compatibility Validation

#### 6.1 hi.html Interface Testing
```javascript
// Automated UI test with Puppeteer
const puppeteer = require('puppeteer');

async function testUI() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Test with Node.js backend
  await page.goto('http://localhost:5001/hi.html');
  
  // Test start button
  await page.click('#startButton');
  await page.waitForSelector('.status-message.success');
  
  // Verify status updates
  await page.waitForFunction(
    () => document.querySelector('#system-status').textContent.includes('3D Fix'),
    { timeout: 30000 }
  );
  
  // Test Kismet feed
  await page.waitForSelector('.feed-item');
  
  // Test stop button
  await page.click('#stopButton');
  await page.waitForSelector('.status-message.success');
  
  await browser.close();
}
```

#### 6.2 Response Format Validation
```javascript
// JSON Schema validation
const Joi = require('joi');

const schemas = {
  info: Joi.object({
    gps: Joi.object({
      lat: Joi.number().allow(null),
      lon: Joi.number().allow(null),
      alt: Joi.number().allow(null),
      mode: Joi.number().required(),
      time: Joi.string().allow(null),
      speed: Joi.number().allow(null),
      track: Joi.number().allow(null),
      status: Joi.string().valid('3D Fix', '2D Fix', 'No Fix').required()
    }).required(),
    kismet: Joi.string().valid('Running', 'Not Running').required(),
    wigle: Joi.string().valid('Running', 'Not Running').required(),
    ip: Joi.string().ip().required()
  }),
  
  scriptStatus: Joi.object({
    running: Joi.boolean().required(),
    message: Joi.string().required(),
    kismet_running: Joi.boolean().required(),
    kismet_api_responding: Joi.boolean().required(),
    wigle_running: Joi.boolean().required()
  })
};

// Validate all responses against schemas
function validateResponse(endpoint, data) {
  const { error } = schemas[endpoint].validate(data);
  if (error) {
    throw new Error(`Invalid response format: ${error.message}`);
  }
}
```

### 7. Rollback Procedures

#### 7.1 Instant Rollback Script
```bash
#!/bin/bash
# Emergency rollback to Python service

echo "=== EMERGENCY ROLLBACK ==="

# 1. Stop Node.js service
sudo systemctl stop webhook-nodejs

# 2. Kill any orphaned Node.js processes
pkill -f "webhook-service"

# 3. Start Python service
sudo systemctl start webhook-python

# 4. Verify Python service running
sleep 2
if curl -s http://localhost:5000/info > /dev/null; then
  echo "✅ Python service restored successfully"
else
  echo "❌ CRITICAL: Python service failed to start!"
  exit 1
fi
```

#### 7.2 Rollback Triggers
- Response format mismatch detected
- Process management failures
- Performance degradation > 50%
- Critical errors in production
- User-reported issues

### 8. Acceptance Criteria

#### 8.1 Functional Requirements
- [ ] All 5 API endpoints respond identically to Python version
- [ ] GPS data collection works continuously
- [ ] Kismet process management is reliable
- [ ] Network interface control functions properly
- [ ] PID file management prevents duplicate processes
- [ ] Log files created in correct locations
- [ ] Error messages match Python version exactly

#### 8.2 Performance Requirements
- [ ] Response times within 10% of Python version
- [ ] Memory usage < 100MB under normal load
- [ ] CPU usage < 5% when idle
- [ ] Can handle 100 concurrent requests
- [ ] No memory leaks over 24-hour period

#### 8.3 Compatibility Requirements
- [ ] hi.html works without modification
- [ ] All JavaScript polling continues to function
- [ ] Error handling matches Python behavior
- [ ] Status messages display correctly
- [ ] No CORS issues with existing setup

### 9. Success Metrics

#### 9.1 Technical Metrics
```yaml
Response Time:
  - /info: ≤ 100ms (p95)
  - /script-status: ≤ 50ms (p95)
  - /kismet-data: ≤ 500ms (p95)

Reliability:
  - Uptime: ≥ 99.9%
  - Error rate: < 0.1%
  - Process management success: 100%

Resource Usage:
  - Memory: < 100MB
  - CPU idle: < 5%
  - CPU active: < 20%
```

#### 9.2 Operational Metrics
```yaml
Deployment:
  - Zero downtime migration
  - Rollback time: < 30 seconds
  - No data loss during cutover

Monitoring:
  - All endpoints instrumented
  - Error tracking enabled
  - Performance metrics collected
```

### 10. Testing Timeline

#### Phase 1: Development Testing (2 days)
- Day 1: Unit tests and component testing
- Day 2: Integration testing and debugging

#### Phase 2: Staging Testing (2 days)
- Day 1: Hardware integration and process management
- Day 2: Performance and load testing

#### Phase 3: Production Testing (1 day)
- Morning: Parallel deployment and comparison
- Afternoon: Cutover and validation
- Evening: Monitoring and optimization

#### Phase 4: Acceptance (1 day)
- 24-hour monitoring period
- Performance benchmarking
- Final sign-off

### 11. Testing Tools and Infrastructure

#### Required Tools
```bash
# Install testing dependencies
npm install --save-dev jest supertest
npm install --save-dev artillery puppeteer
npm install --save-dev joi deep-diff

# System monitoring
apt-get install htop iotop nethogs

# Process monitoring
npm install -g pm2
pm2 install pm2-logrotate
```

#### Test Environment Setup
```yaml
Hardware:
  - Raspberry Pi (identical to production)
  - GPS device connected
  - WiFi adapter with monitor mode support
  - Test WiFi networks available

Software:
  - GPSD service installed and configured
  - Kismet installed and configured
  - Test data files prepared
  - Monitoring tools configured
```

### 12. Risk Mitigation

#### High-Risk Areas
1. **Process Management**
   - Risk: Orphaned processes
   - Mitigation: Comprehensive PID tracking and cleanup
   - Test: Kill -9 scenarios

2. **GPS Communication**
   - Risk: Connection drops
   - Mitigation: Automatic reconnection logic
   - Test: GPSD restart during operation

3. **File System Operations**
   - Risk: Race conditions on PID files
   - Mitigation: File locking mechanisms
   - Test: Concurrent access scenarios

4. **Network Interface Control**
   - Risk: Interface state corruption
   - Mitigation: State verification before operations
   - Test: Rapid mode switching

### 13. Documentation Requirements

#### Test Documentation
- [ ] Test plan reviewed and approved
- [ ] Test cases documented in test management system
- [ ] Test results recorded for each phase
- [ ] Performance benchmarks documented
- [ ] Known issues and workarounds documented

#### Operational Documentation
- [ ] Deployment guide updated
- [ ] Rollback procedures documented
- [ ] Monitoring setup documented
- [ ] Troubleshooting guide created
- [ ] API documentation updated

### 14. Sign-off Criteria

#### Technical Sign-off
- [ ] All test cases passed
- [ ] Performance requirements met
- [ ] No critical bugs remaining
- [ ] Security review completed

#### Operational Sign-off
- [ ] Operations team trained
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Runbook updated

#### Business Sign-off
- [ ] User acceptance completed
- [ ] No functionality regression
- [ ] Performance acceptable
- [ ] Risk assessment approved

## Conclusion

This comprehensive testing strategy ensures a safe, reliable migration from Python to Node.js while maintaining 100% compatibility with existing interfaces and functionality. The phased approach allows for thorough validation at each stage with clear rollback procedures if issues arise.

### Key Success Factors
1. **Parallel Testing**: Run both services side-by-side for comparison
2. **Automated Validation**: Use scripts to verify response compatibility
3. **Real Hardware Testing**: Test with actual GPS and WiFi hardware
4. **User Interface Testing**: Ensure hi.html works without modification
5. **Performance Monitoring**: Track metrics throughout migration

### Final Checklist
- [ ] All API endpoints tested and validated
- [ ] Process management verified under all scenarios
- [ ] Performance benchmarks met or exceeded
- [ ] Rollback procedures tested and documented
- [ ] 24-hour stability test completed
- [ ] Team trained on new service
- [ ] Documentation complete and approved

**Estimated Total Testing Time**: 6 days (including 24-hour stability test)
**Risk Level**: Low (with proper testing and rollback procedures)
**Confidence Level**: High (comprehensive test coverage)
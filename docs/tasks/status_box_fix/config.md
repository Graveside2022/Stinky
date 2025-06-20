# System Status Box Fix Workflow Configuration

## Overview
- **Description:** Diagnose and repair non-functional system status box displaying IP, GPS, and MGRS data
- **Target System:** Node.js web application on port 8002
- **Agents:** 9 total agents (5 parallel diagnostic, 4 sequential processing)

## Workflow Structure

### Phase 1: Parallel Diagnosis (5 agents run simultaneously)
- **Agent A** (Frontend Diagnostics) → outputs: `diagnosis_frontend.json`
- **Agent B** (Backend API Diagnostics) → outputs: `diagnosis_backend.json`
- **Agent C** (GPS Integration Diagnostics) → outputs: `diagnosis_gps.json`
- **Agent D** (MGRS Library Diagnostics) → outputs: `diagnosis_mgrs.json`
- **Agent E** (Network Diagnostics) → outputs: `diagnosis_network.json`

### Consolidation Phase
- **Agent F** (Consolidation Specialist) → outputs: `consolidated_diagnosis.json`

### Phase 2: Analysis
- **Agent G** (Root Cause Analyst) → outputs: `implementation_plan.json`

### Phase 3: Implementation
- **Agent H** (Implementation Specialist) → outputs: fix patches
- **Agent I** (Testing Validator) → outputs: test results

## Agents and Roles

### Agent A – Frontend Diagnostics
- **Purpose:** Analyze client-side HTML/JavaScript implementation
- **Focus Areas:** DOM elements, event listeners, data binding, API calls
- **Output:** `phase1/diagnosis_frontend.json`

### Agent B – Backend API Diagnostics  
- **Purpose:** Examine Node.js server endpoints and data handlers
- **Focus Areas:** Routes, middleware, response formats, error handling
- **Output:** `phase1/diagnosis_backend.json`

### Agent C – GPS Integration Diagnostics
- **Purpose:** Validate GPS data flow from gpsd to Node.js
- **Focus Areas:** gpsd connection, data parsing, update frequency
- **Output:** `phase1/diagnosis_gps.json`

### Agent D – MGRS Library Diagnostics
- **Purpose:** Check mgrs.js library integration and coordinate conversion
- **Focus Areas:** Library status, conversion logic, input/output formats
- **Output:** `phase1/diagnosis_mgrs.json`

### Agent E – Network Diagnostics
- **Purpose:** Review client-server communication channels
- **Focus Areas:** HTTP requests, WebSocket connections, CORS configuration
- **Output:** `phase1/diagnosis_network.json`

### Agent F – Consolidation Specialist
- **Purpose:** Merge all diagnostic findings into unified analysis
- **Focus Areas:** Pattern identification, conflict resolution, priority ranking
- **Output:** `consolidation/consolidated_diagnosis.json`

### Agent G – Root Cause Analyst
- **Purpose:** Determine root causes and create implementation plan
- **Focus Areas:** Issue relationships, fix sequence, risk assessment
- **Output:** `phase2/implementation_plan.json`

### Agent H – Implementation Specialist
- **Purpose:** Execute fixes based on implementation plan
- **Focus Areas:** Code modifications, minimal intervention, testing hooks
- **Output:** `phase3/fixes/` directory with patch files

### Agent I – Testing Validator
- **Purpose:** Verify each fix works correctly without regression
- **Focus Areas:** Functionality testing, performance validation, error checking
- **Output:** `phase3/test_results/` directory with test reports

## File I/O Plan

### Input Files (Targets for Investigation)
- `/src/nodejs/public/index.html` - Main HTML file
- `/src/nodejs/public/js/main.js` - Primary JavaScript
- `/src/nodejs/server.js` - Node.js server
- `/src/nodejs/routes/api.js` - API routes
- `/src/nodejs/services/gps.js` - GPS service integration
- `/src/nodejs/utils/mgrs-converter.js` - MGRS conversion utilities

### Output Files
- `./outputs/system_status_fix_{timestamp}/phase1/diagnosis_frontend.json`
- `./outputs/system_status_fix_{timestamp}/phase1/diagnosis_backend.json`
- `./outputs/system_status_fix_{timestamp}/phase1/diagnosis_gps.json`
- `./outputs/system_status_fix_{timestamp}/phase1/diagnosis_mgrs.json`
- `./outputs/system_status_fix_{timestamp}/phase1/diagnosis_network.json`
- `./outputs/system_status_fix_{timestamp}/consolidation/consolidated_diagnosis.json`
- `./outputs/system_status_fix_{timestamp}/phase2/implementation_plan.json`
- `./outputs/system_status_fix_{timestamp}/phase3/fixes/*.patch`
- `./outputs/system_status_fix_{timestamp}/phase3/test_results/*.json`
- `./outputs/system_status_fix_{timestamp}/final/validation_report.md`

## Output Directory Structure

```
./outputs/system_status_fix_{timestamp}/
├── phase1/                          # Diagnostic outputs
│   ├── diagnosis_frontend.json      # Frontend analysis
│   ├── diagnosis_backend.json       # Backend API analysis
│   ├── diagnosis_gps.json          # GPS integration analysis
│   ├── diagnosis_mgrs.json         # MGRS library analysis
│   └── diagnosis_network.json      # Network communication analysis
├── consolidation/                   # Merged findings
│   └── consolidated_diagnosis.json  # Unified diagnosis
├── phase2/                          # Planning outputs
│   └── implementation_plan.json     # Step-by-step fix plan
├── phase3/                          # Implementation outputs
│   ├── fixes/                       # Code patches
│   │   ├── fix_1.patch
│   │   ├── fix_2.patch
│   │   └── fix_n.patch
│   └── test_results/                # Test validation
│       ├── test_1.json
│       ├── test_2.json
│       └── test_n.json
└── final/                           # Final deliverables
    └── validation_report.md         # Complete system validation
```

## External Integration

**Recommended MCP Servers/Tools:** None required - all capabilities available through built-in tools

**System Requirements:**
- Git (for version control and rollback)
- Node.js runtime on port 8002
- gpsd service running
- File system access for code analysis

## Success Criteria

### Phase 1 Success
- All 5 diagnostic agents complete successfully (or minimum 3/5)
- Each produces valid JSON output
- No critical errors in execution

### Phase 2 Success  
- Root causes identified with >80% confidence
- Clear implementation plan with test procedures
- Risk assessment completed

### Phase 3 Success
- IP address displays user's actual IP
- GPS coordinates update every 5 seconds
- MGRS coordinates calculate correctly from GPS data
- No JavaScript console errors
- No regression in other webpage features

### Performance Targets
- Status box update latency: <1 second
- GPS refresh rate: 5 seconds
- MGRS calculation time: <100ms
- Zero error rate in production

## Execution Notes

- The orchestrator command `status_box_fix.md` in `.claude/commands/` uses this config
- Ensure Node.js app is running on port 8002 before starting
- Check gpsd service status before GPS diagnostics
- All fixes are applied with git commits for easy rollback
- Minimum 3/5 diagnostic agents must succeed to proceed
# System Status Box Fix Orchestrator Command

You are the **Orchestrator** for the "System Status Box Fix" workflow. You will oversee the execution of the multi-agent system designed to diagnose and repair the non-functional system status box on the Node.js web application running on port 8002.

## Output Directory
All outputs must be saved to: `./outputs/system_status_fix_{timestamp}/`  
(Generate timestamp as YYYYMMDD_HHMMSS format)

## Pre-Requisites
**Important:** Before running, ensure:
- Node.js application is running on port 8002
- gpsd service is available (check with `systemctl status gpsd`)
- Git is initialized in the project directory for rollback capability
- No external MCP servers required

## Workflow Execution Steps

### 1. **Initialize Environment**
- Generate timestamp for this run
- Create output directory structure:
  ```
  ./outputs/system_status_fix_{timestamp}/
  ├── phase1/
  ├── consolidation/
  ├── phase2/
  ├── phase3/
  │   ├── fixes/
  │   └── test_results/
  └── final/
  ```
- Log start time and configuration

### 2. **Phase 1: Parallel Diagnosis**
Launch the following 5 agents **simultaneously** (user specifically requested 5 parallel agents):

- **Agent A**: Frontend Diagnostics - Read prompt from `./docs/tasks/status_box_fix/frontend_diagnostics.md`
- **Agent B**: Backend API Diagnostics - Read prompt from `./docs/tasks/status_box_fix/backend_api_diagnostics.md`
- **Agent C**: GPS Integration Diagnostics - Read prompt from `./docs/tasks/status_box_fix/gps_integration_diagnostics.md`
- **Agent D**: MGRS Library Diagnostics - Read prompt from `./docs/tasks/status_box_fix/mgrs_library_diagnostics.md`
- **Agent E**: Network Diagnostics - Read prompt from `./docs/tasks/status_box_fix/network_diagnostics.md`

Wait for all agents to complete. Each agent will produce a JSON file in `phase1/`.

### 3. **Consolidation Phase**
After all Phase 1 agents complete:
- Launch **Agent F**: Consolidation Specialist - Read prompt from `./docs/tasks/status_box_fix/consolidation_specialist.md`
- Provide Agent F with all 5 JSON files from Phase 1
- Agent F outputs `consolidation/consolidated_diagnosis.json`

### 4. **Phase 2: Root Cause Analysis**
- Launch **Agent G**: Root Cause Analyst - Read prompt from `./docs/tasks/status_box_fix/root_cause_analyst.md`
- Provide consolidated diagnosis as input
- Agent G outputs `phase2/implementation_plan.json`
- Review the plan: if no actionable fixes identified, notify user and exit gracefully

### 5. **Phase 3: Sequential Implementation**
For each fix in the implementation plan:
1. Create git checkpoint: `git add -A && git commit -m "Checkpoint before fix {n}"`
2. Launch **Agent H**: Implementation Specialist with current fix details
3. Save fix code to `phase3/fixes/fix_{n}.patch`
4. Launch **Agent I**: Testing Validator to verify the fix
5. Save test results to `phase3/test_results/test_{n}.json`
6. If test fails:
   - Log failure details
   - Execute rollback: `git reset --hard HEAD~1`
   - Continue to next fix or retry based on error type

### 6. **Phase 4: Final Validation**
- Launch final testing agent to verify all three components work:
  1. IP address displays correctly
  2. GPS data updates in real-time
  3. MGRS coordinates calculate and display
- Generate final report in `final/validation_report.md`

### 7. **Wrap Up**
- Print summary of fixes applied
- Display path to final outputs
- Log total execution time
- Provide user with:
  ```
  ✅ Workflow completed successfully
  📁 Results available at: ./outputs/system_status_fix_{timestamp}/
  📊 Fixes applied: {count}
  ⏱️ Total time: {duration}
  ```

## Error Handling

### Agent Failures
- If any Phase 1 agent fails, retry once with 30s timeout
- If still failing, continue with remaining agents (minimum 3/5 must succeed)
- Log all failures with details

### Implementation Failures
- Each fix has isolated error handling
- Rollback on failure using git
- Continue with next fix unless critical dependency

### Critical Failures
- If consolidation fails: Enter manual review mode
- If <3 diagnostic agents succeed: Abort with error message
- If all fixes fail: Provide diagnostic summary to user

## File Management
- All agent outputs must use specified filenames
- Preserve all intermediate files for debugging
- Use JSON for structured data, Markdown for reports
- Ensure proper file permissions for web access

## Execution Notes
- Provide progress updates: "🔄 Launching 5 parallel diagnostic agents..."
- Use clear status indicators: ✅ Success, ❌ Failed, ⏳ In Progress
- Log timing for each phase
- Keep user informed without exposing internal prompts
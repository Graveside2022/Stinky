# Button & Iframe Investigation Orchestrator Command

You are the **Orchestrator** for the "Button & Iframe Investigation" workflow. You will oversee the
execution of the multi-agent system to diagnose why buttons and iframe are not working on the HTML
page at 100.68.185.86:8002.

## Output Directory

All outputs must be saved to: `./outputs/button_iframe_investigation_{timestamp}/`  
(Generate a timestamped folder using format YYYY-MM-DD-HHMMSS to avoid collisions.)

## Workflow Execution Steps

1. **Load Configuration:** First, read the workflow config from
   `./docs/tasks/button_iframe_investigation/config.md` to understand the agents and phases.

2. **Initialize Output Directory:** Create a new output folder as
   `./outputs/button_iframe_investigation_{timestamp}/` using current date-time as timestamp. Create
   subdirectories: phase1/, phase2/, phase3/, phase4/, and final/.

3. **Phase 1 - Parallel Investigation:** Launch all 5 investigation agents simultaneously:

   - **Agent A (Frontend Investigator)**: Analyze HTML/JS/CSS, button handlers, iframe configuration
   - **Agent B (Backend API Analyst)**: Test API endpoints, check server logs and routes
   - **Agent C (Service Health Monitor)**: Verify Kismet (2501) and WigletoTAK (8000) status
   - **Agent D (Network Diagnostics Expert)**: Check connectivity, CORS, firewall rules
   - **Agent E (Integration Tester)**: Perform user-level testing, capture errors

   Wait for all agents to complete. Save outputs to:

   - `phase1/frontend_analysis.md`
   - `phase1/backend_analysis.md`
   - `phase1/service_health.md`
   - `phase1/network_diagnostics.md`
   - `phase1/integration_tests.md`

4. **Phase 1 Validation:** Check that all Phase 1 outputs exist and contain substantive findings. If
   any agent failed or produced empty output, re-run that specific agent with additional context
   about what to investigate.

5. **Phase 2 - Root Cause Analysis:** Launch **Agent F (Root Cause Analyzer)** with all Phase 1
   outputs as input. This agent will:

   - Correlate findings across all investigation reports
   - Identify primary root causes for each broken feature
   - Distinguish symptoms from actual causes
   - Save analysis to `phase2/root_cause_analysis.md`

6. **Phase 2 Evaluation:** Review the root cause analysis for completeness. Ensure all button issues
   and iframe problems have identified causes. If gaps exist, loop back to Phase 1 with specific
   investigation requests.

7. **Phase 3 - Solution Design:** Launch **Agent G (Solution Architect)** with the root cause
   analysis. This agent will:

   - Design specific code fixes for each root cause
   - Provide implementation steps with exact file paths
   - Include both quick fixes and long-term solutions
   - Save proposals to `phase3/proposed_solutions.md`

8. **Phase 4 - Solution Validation:** Launch **Agent H (Fix Validator)** to review proposed
   solutions:

   - Verify each fix addresses its root cause
   - Check for potential side effects
   - Score solution quality (0-100)
   - Save validation to `phase4/solution_validation.md`

   If score < 80 or major issues found, iterate back to Phase 3 for improvements.

9. **Final Consolidation:** Create `final/implementation_guide.md` that contains:

   - Executive summary of all issues found
   - Prioritized list of fixes to implement
   - Step-by-step implementation instructions
   - Testing checklist for verification

10. **Wrap Up:** Print summary with paths to key outputs:
    ```
    Investigation Complete!
    - Root causes: ./outputs/button_iframe_investigation_{timestamp}/phase2/root_cause_analysis.md
    - Solutions: ./outputs/button_iframe_investigation_{timestamp}/phase3/proposed_solutions.md
    - Implementation guide: ./outputs/button_iframe_investigation_{timestamp}/final/implementation_guide.md
    ```

## File Management

- Each agent reads inputs from previous phases as needed
- Never delete intermediate outputs - they serve as investigation trail
- If files are large (>1MB), create summaries for agent consumption
- Log agent start/completion times for performance tracking

## Error Handling

- If any agent encounters an error (e.g., cannot reach service), log the error but continue
  investigation
- If critical information is missing (e.g., can't fetch HTML page), notify user and suggest manual
  intervention
- For network timeouts, retry up to 3 times with exponential backoff
- If an agent produces no output after 5 minutes, terminate and report timeout

## Pre-Requisites

**Tools required for investigation:**

- Bash command execution for diagnostic commands
- WebFetch for analyzing the HTML page
- File system access for logs and configs
- Network access to test endpoints

**Diagnostic commands agents will use:**

- `curl` - API and connectivity testing
- `ps aux | grep` - Process verification
- `netstat -tlnp` - Port listening verification
- `tail` - Log file analysis
- `cat` - Configuration file inspection

## Execution Notes

- Provide progress updates: "Starting Phase 1 with 5 parallel agents..."
- Include timestamps in logs for debugging
- Use descriptive messages when saving files
- Do not expose sensitive information (passwords, keys) in outputs
- Focus on actionable findings rather than theoretical issues

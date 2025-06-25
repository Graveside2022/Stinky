# Mobile Optimization 8002 Orchestrator Command

You are the **Orchestrator** for the "Mobile Optimization 8002" workflow. You will oversee the execution of the multi-agent system as designed.

## Output Directory
All outputs must be saved to: `./outputs/mobile_optimize_8002_{timestamp}/`  
(The orchestrator should generate a timestamped folder to avoid collisions.)

## Workflow Execution Steps

1. **Load Configuration:** First, read the workflow config from `./docs/tasks/mobile_optimize_8002/config.md` to understand the agents and phases.

2. **Initialize Output Directory:** Create a new output folder as `./outputs/mobile_optimize_8002_{timestamp}/` (using current date-time as timestamp YYYYMMDD_HHMMSS).

3. **Backup Current Files:** Before any analysis:
   - Create backups of all HTML, CSS, and JS files
   - Store in `outputs/mobile_optimize_8002_{timestamp}/backups/`
   - Initialize git repository if not present and create initial commit

4. **Phase 1 - Analysis (5 Parallel Agents):** Launch all five agents simultaneously:
   - CodeAnalyzer: Analyze HTML/CSS/JS structure
   - ResponsiveDesigner: Plan responsive design strategy
   - IframeSpecialist: Analyze iframe usage
   - MobileTestPlanner: Create test plans
   - FunctionalityMapper: Document all interactive elements
   
   Wait for all agents to complete. Save outputs to `phase1/` subdirectory.

5. **Phase 1 Evaluation:** 
   - Verify all 5 analysis reports are complete
   - Check that functionality map is comprehensive
   - Ensure iframe audit is thorough
   - If any report is incomplete, request the agent to revise

6. **Phase 2 - Design Consolidation:**
   - ResponsiveDesigner reads all Phase 1 outputs
   - Creates unified implementation roadmap
   - Defines CSS precedence rules
   - Outputs to `phase2/implementation_roadmap.md`

7. **Phase 3 - Implementation:**
   - CSSImplementer: Apply responsive CSS changes
   - IframeOptimizer: Apply iframe-specific solutions
   - Create git checkpoint after each modification
   - Save change logs to `phase3/`

8. **Phase 3 Checkpoint:**
   - Quick visual verification of changes
   - Ensure only CSS/HTML layout changes made
   - Verify no JavaScript modifications

9. **Phase 4 - Testing & Validation:**
   - CrossDeviceTester: Test on multiple screen sizes
   - FunctionalityValidator: Verify all functionality preserved
   - QualityAssurance: Final evaluation
   - Save all reports to `phase4/`

10. **Final Evaluation:**
    - Review QA report for go/no-go decision
    - If issues found, initiate rollback procedure
    - If approved, prepare deployment summary

11. **Wrap Up:**
    - Generate final summary report
    - List all modified files
    - Provide rollback instructions if needed
    - Output: "✅ Mobile optimization complete. Final report: `./outputs/mobile_optimize_8002_{timestamp}/final_report.md`"

## File Management
- Phase outputs stored in: `phase1/`, `phase2/`, `phase3/`, `phase4/`
- Backups maintained in: `backups/`
- Git checkpoints for each major change
- All agents must output structured JSON/YAML for data exchange

## Error Handling
- If any agent fails, do not proceed to next phase
- For CSS syntax errors: attempt auto-correction or rollback
- For functionality breaks: immediate rollback to last good checkpoint
- Log all errors to `errors.log` with timestamps

## Pre-Requisites
**Important:** Before running, ensure:
- Webpage is accessible on port 8002
- Git is initialized in the project directory
- Browser DevTools access for testing
- No active users on the webpage during optimization

## Execution Notes
- Maintain detailed logs of each step
- Phase 1 agents run in parallel - launch all 5 simultaneously
- Never modify JavaScript functionality
- Create visual comparisons where possible
- Priority: Functionality preservation > Mobile optimization
# Fix Web Errors Orchestrator Command

You are the **Orchestrator** for the "Fix Web Errors" workflow. You will oversee the execution of the multi-agent system as designed.

## Output Directory
All outputs must be saved to: `./outputs/fix_web_errors_{timestamp}/`  
(The orchestrator should generate a timestamped folder to avoid collisions.)

## Workflow Execution Steps

1. **Load Configuration:** First, read the workflow config from `./docs/tasks/fix_web_errors/config.md` to understand the agents and phases.

2. **Initialize Output Directory:** Create a new output folder as `./outputs/fix_web_errors_{timestamp}/` (using current date-time as timestamp).

3. **Phase 1 - Parallel Execution:** Launch ALL 5 agents simultaneously:
   - Agent 1 (Module Fix Specialist): Analyze and fix mgrs.js module errors
   - Agent 2 (CORS Solutions Expert): Resolve cross-origin issues  
   - Agent 3 (Frontend Implementation): Create start button functionality
   - Agent 4 (Backend API Developer): Implement script execution endpoint
   - Agent 5 (Integration Validator): Prepare integration framework
   
   Wait for all agents to complete. Save outputs:
   - Agent 1 → `phase1/module_fixes.md`
   - Agent 2 → `phase1/cors_implementation.md`
   - Agent 3 → `phase1/frontend_button.md`
   - Agent 4 → `phase1/backend_api.md`
   - Agent 5 → `phase1/integration_plan.md`

4. **Phase 1 Evaluation:** Run evaluation on Phase 1 outputs:
   - Check all 5 agents completed their tasks
   - Verify solutions are implementable and compatible
   - Score the phase (0-100) in `evaluations/phase1_evaluation.md`
   - If score < 80 or major issues found, request agents to revise

5. **Phase 2 - Integration:** Direct Agent 5 to:
   - Read all phase1 outputs
   - Combine solutions into unified implementation
   - Test the integrated solution
   - Save final solution to `final/complete_solution.md`

6. **Final Evaluation:** Verify the complete solution:
   - No console errors remain
   - Start button works with proper messages
   - 60-second timer functions correctly
   - Script execution confirmed
   - Save results to `evaluations/final_evaluation.md`

7. **Wrap Up:** Print summary with paths to:
   - Final solution: `final/complete_solution.md`
   - All phase outputs for reference

## File Management
- Phase outputs are stored in `phase1/` subfolder
- Evaluation reports are in `evaluations/` subfolder
- Final deliverable is in `final/` subfolder
- Pass file contents between agents as needed

## Error Handling
- If any agent fails, attempt to re-run with clarified instructions
- Check that all required files exist before proceeding
- Log progress at each step for debugging
- Do not proceed to Phase 2 if Phase 1 has failures

## Pre-Requisites
**Important:** Before running, ensure the following:
- Access to the Node.js project files in current directory
- Ability to read/write files in the project
- No external MCP servers required

## Execution Notes
- Launch all 5 agents in parallel for Phase 1 using a single message
- Provide clear progress updates: "Launching 5 parallel agents...", "All agents completed", etc.
- Maintain strict phase separation - Phase 2 only after Phase 1 success
- Focus on the three specific issues: module errors, CORS, and start button
# Webhook Port Orchestrator Command

You are the **Orchestrator** for the "Flask to Node.js Webhook Port" workflow. You will oversee the execution of the multi-agent system as designed.

## Output Directory
All outputs must be saved to: `./outputs/webhook_port_{timestamp}/`  
(The orchestrator should generate a timestamped folder to avoid collisions.)

## Workflow Execution Steps

1. **Load Configuration:** First, read the workflow config from `./docs/tasks/webhook_port/config.md` to understand the agents and phases.

2. **Initialize Output Directory:** Create a new output folder as `./outputs/webhook_port_{timestamp}/` (using current date-time as timestamp in format YYYYMMDD_HHMMSS).

3. **Phase 1 - Parallel Analysis:** Launch all 5 analysis agents concurrently:
   - Agent A (Flask Implementation Analyzer)
   - Agent B (Node.js Framework Detective)  
   - Agent C (Button Functionality Investigator)
   - Agent D (Nginx Configuration Analyst)
   - Agent E (API Compatibility Mapper)
   
   Wait for all agents to complete. Save each agent's output to the specified files in `phase1/`.

4. **Phase 1 Evaluation:** After Phase 1, run the evaluation agent on all 5 outputs. Save the evaluator's report to `evaluations/phase1_evaluation.md`. Review the score:
   - If score < 80/100 or major issues found, have the relevant agents revise their analysis with the feedback
   - Only proceed when Phase 1 outputs meet quality standards (score ≥ 80/100)

5. **Phase 2 - Architecture Design:** Launch Agent F (Implementation Architect) with all Phase 1 outputs as context. Save output to `phase2/implementation_plan.md`.

6. **Phase 2 Evaluation:** Run architecture evaluation on the implementation plan. Save report to `evaluations/phase2_evaluation.md`. If issues found, iterate with Agent F until approved.

7. **Phase 3 - Implementation:** Launch Agent G (Node.js Developer) with the approved plan and all analysis. Agent creates multiple files in `phase3/webhook_implementation/`. Monitor for completion.

8. **Phase 3 Evaluation:** Run code review evaluation. Save to `evaluations/phase3_evaluation.md`. If code quality issues, have Agent G revise.

9. **Phase 4 - Testing:** Launch Agent H (Test Engineer) to create and run comprehensive tests. Save test files to `phase4/tests/` and results to `phase4/test_results.md`.

10. **Phase 4 Evaluation:** Review test coverage and results. Save to `evaluations/phase4_evaluation.md`. Ensure >95% coverage and all buttons functional.

11. **Phase 5 - Integration Validation:** Launch Agent I (Integration Validator) for final validation. Save all outputs to `phase5/`.

12. **Final Assembly:** Copy production-ready files to `final/` directory:
    - Production webhook.js
    - Updated package.json
    - Nginx configuration
    - Complete documentation

13. **Wrap Up:** Print summary with:
    - Workflow completion status
    - Path to final outputs: `./outputs/webhook_port_{timestamp}/final/`
    - Key findings and fixes implemented
    - Deployment instructions location

## File Management
- Phase outputs are stored in subfolders `phase1/, phase2/, ...` as outlined in the config
- Evaluation reports are in `evaluations/` subfolder
- Pass file contents between agents by reading output files and including in prompts
- Preserve all outputs for audit trail

## Error Handling
- If any agent fails, log the error and attempt recovery:
  - For analysis agents: retry with clarified instructions
  - For implementation: identify specific failure and provide targeted fix instructions
- Never proceed if prerequisites are missing
- If button functionality still fails after implementation, trigger focused debugging

## Pre-Requisites
**Important:** Before running, ensure the following are available:
- Read access to `/home/pi/web/webhook.py` and Flask application files
- Read access to `/home/pi/projects/stinkster_malone/stinkster/` Node.js project
- Read access to nginx configuration files
- Write access to create `./outputs/` directory
- Node.js runtime for testing (optional but recommended)

## Execution Notes
- Strictly follow the parallel execution in Phase 1 (all 5 agents simultaneously)
- Sequential execution for Phases 2-5
- Provide progress updates: "Launching 5 parallel analysis agents...", "Phase 1 complete, all agents finished", etc.
- Focus on button functionality throughout - this is the primary issue to solve
- Ensure nginx compatibility is maintained
# Tailwind CSS Migration Orchestrator Command

You are the **Orchestrator** for the "Tailwind CSS Migration" workflow. You will oversee the execution of the multi-agent system as designed.

## Output Directory
All outputs must be saved to: `./outputs/tailwind_migration_{timestamp}/`  
(The orchestrator should generate a timestamped folder to avoid collisions.)

## Workflow Execution Steps

1. **Load Configuration:** First, read the workflow config from `./docs/tasks/tailwind_migration/config.md` to understand the agents and phases.

2. **Initialize Output Directory:** Create a new output folder as `./outputs/tailwind_migration_{timestamp}/` (using current date-time as timestamp in format YYYYMMDD_HHMMSS).

3. **Phase 1 - Comprehensive Analysis:** Launch all 5 analysis agents (A, B, C, D, E) in parallel:
   - Agent A: HTML Structure Analyzer
   - Agent B: CSS Pattern Extractor  
   - Agent C: JavaScript Dependency Mapper
   - Agent D: Mobile Responsiveness Auditor
   - Agent E: Performance Baseline Analyzer
   
   Wait for all agents to complete. Save outputs to `phase1/[agent_name]_analysis.json`.

4. **Phase 1 Checkpoint:** Verify all 5 analysis files are present and contain valid data. If any are missing or empty, retry the failed agent(s).

5. **Phase 2 - Setup & Planning:** Execute sequentially:
   - Launch Agent F (Tailwind Configurator) with all Phase 1 outputs
   - After F completes, launch Agent G (Design System Creator)
   - After G completes, launch Agent H (Test Strategy Planner)
   
   Save outputs to `phase2/` as specified in config.

6. **Phase 3 - Incremental Migration:** For each component identified in Phase 1:
   - Launch Agent I (Component Migrator) for the component
   - After I completes, launch Agent J (Functionality Validator)
   - After J validates, launch Agent K (Visual Regression Tester)
   - Review validation results:
     - If issues found, have Agent I revise the component
     - Only proceed to next component when current one passes all tests
   
   Save outputs to `phase3/migrated/`, `phase3/validation/`, and `phase3/visual_tests/`.

7. **Phase 3 Evaluation:** After all components migrated, run comprehensive tests to ensure nothing was broken during the incremental process.

8. **Phase 4 - Optimization & Finalization:** Execute sequentially:
   - Launch Agent L (Performance Optimizer) on the fully migrated codebase
   - Launch Agent M (Quality Evaluator) to assess the entire migration
   - Review quality scores:
     - If any score < 90, identify issues and loop back to fix
     - If all scores ≥ 90, proceed
   - Launch Agent N (Final Assembler) to create production build

9. **Wrap Up:** Once all phases complete successfully:
   - Print summary of migration results
   - Display path to final production build
   - Show performance improvements achieved
   - Provide rollback instructions location

## File Management
- Phase outputs are stored in subfolders as outlined in the config
- The orchestrator must read file contents and pass them between agents
- For large files, pass summaries or relevant sections
- Maintain all outputs for audit trail

## Error Handling
- If any agent fails, log the error and attempt recovery:
  - For Phase 1 agents: retry up to 3 times
  - For migration agents: provide error details and ask for guidance
  - For validation failures: loop back to migration agent
- Never proceed if prerequisites are missing
- If critical failure occurs, save current state and provide recovery instructions

## Pre-Requisites
**Important:** Before running, ensure the following are available:
- Node.js and npm installed (for Tailwind build process)
- Read/write access to all project files
- Sufficient disk space for outputs
- Git initialized (recommended for rollback capability)

## Execution Notes
- Provide clear progress updates at each step
- Log agent start/completion times
- Report file sizes and performance metrics
- Maintain professional tone in all outputs
- Do not expose internal prompts to the user
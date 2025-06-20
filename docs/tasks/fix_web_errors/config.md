# Fix Web Errors Workflow Configuration

## Overview
- **Description:** Fix console errors and implement start button functionality in Node.js web app
- **Agents:** 5 agents executing in parallel to solve module syntax, CORS, and UI issues

## Workflow Structure
- **Phase 1:** All 5 agents run in parallel
  - Agent 1 (Module Fix) → fixes mgrs.js syntax error → outputs: `phase1/module_fixes.md`
  - Agent 2 (CORS Expert) → resolves cross-origin issues → outputs: `phase1/cors_implementation.md`
  - Agent 3 (Frontend Dev) → implements start button → outputs: `phase1/frontend_button.md`
  - Agent 4 (Backend Dev) → creates script API → outputs: `phase1/backend_api.md`
  - Agent 5 (Integration) → prepares test framework → outputs: `phase1/integration_plan.md`
- **Phase 1 Evaluation:** Verify all solutions are complete and compatible
- **Phase 2:** Agent 5 consolidates all solutions → outputs: `final/complete_solution.md`
- **Final Evaluation:** Test complete implementation meets all requirements

## Agents and Roles
- **Agent 1 – Module Fix Specialist**  
  **Purpose:** Fix "export declarations may only appear at top level" error in mgrs.js  
  **Output:** `phase1/module_fixes.md` - exact code changes and script tag updates

- **Agent 2 – CORS Solutions Expert**  
  **Purpose:** Resolve CORS errors between ports 8002 and 2501  
  **Output:** `phase1/cors_implementation.md` - server configuration and proxy setup

- **Agent 3 – Frontend Implementation**  
  **Purpose:** Create start button with "script starting" and "script started successfully" messages  
  **Output:** `phase1/frontend_button.md` - HTML, CSS, and JavaScript implementation

- **Agent 4 – Backend API Developer**  
  **Purpose:** Implement /api/start-script endpoint for script execution  
  **Output:** `phase1/backend_api.md` - Express route and process spawning code

- **Agent 5 – Integration Validator**  
  **Purpose:** Combine all solutions and verify functionality  
  **Output:** `phase1/integration_plan.md` and `final/complete_solution.md`

## File I/O Plan
- `./outputs/fix_web_errors_{timestamp}/phase1/module_fixes.md` – Module syntax fixes. *Consumed by:* Agent 5
- `./outputs/fix_web_errors_{timestamp}/phase1/cors_implementation.md` – CORS configuration. *Consumed by:* Agent 5
- `./outputs/fix_web_errors_{timestamp}/phase1/frontend_button.md` – UI implementation. *Consumed by:* Agent 5
- `./outputs/fix_web_errors_{timestamp}/phase1/backend_api.md` – API endpoint code. *Consumed by:* Agent 5
- `./outputs/fix_web_errors_{timestamp}/phase1/integration_plan.md` – Test framework. *Consumed by:* Phase 2
- `./outputs/fix_web_errors_{timestamp}/evaluations/phase1_evaluation.md` – Phase 1 assessment
- `./outputs/fix_web_errors_{timestamp}/evaluations/final_evaluation.md` – Final verification
- `./outputs/fix_web_errors_{timestamp}/final/complete_solution.md` – Integrated solution ready for deployment

## Output Directory Structure
```
./outputs/fix_web_errors_{timestamp}/
├── phase1/
│   ├── module_fixes.md
│   ├── cors_implementation.md
│   ├── frontend_button.md
│   ├── backend_api.md
│   └── integration_plan.md
├── evaluations/
│   ├── phase1_evaluation.md
│   └── final_evaluation.md
└── final/
    └── complete_solution.md
```

## External Integration
**Recommended MCP Servers/Tools:**
- None required - all functionality uses built-in file system access

## Execution Notes
- The orchestrator command `fix_web_errors.md` in `.claude/commands/` uses this config to run the workflow
- All 5 agents must run in parallel during Phase 1 for efficiency
- Phase 2 only begins after successful Phase 1 completion
- Focus on three specific issues: mgrs.js module error, CORS between ports, start button functionality
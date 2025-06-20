# Button & Iframe Investigation Workflow Configuration

## Overview
- **Description:** Investigate non-functional buttons and iframe on HTML page at 100.68.185.86:8002
- **Agents:** 8 total agents (5 parallel investigation, 3 sequential analysis/solution)
- **Target Issues:** Start/Stop Kismet buttons, Open Kismet Web UI button, Open WigletoTAK button, Kismet iframe not loading

## Workflow Structure

### Phase 1: Parallel Investigation (5 agents)
- **Agent A (Frontend Investigator)** – Analyzes HTML/JavaScript/CSS issues → outputs: `phase1/frontend_analysis.md`
- **Agent B (Backend API Analyst)** – Tests API endpoints and server logs → outputs: `phase1/backend_analysis.md`
- **Agent C (Service Health Monitor)** – Verifies Kismet:2501 and WigletoTAK:8000 → outputs: `phase1/service_health.md`
- **Agent D (Network Diagnostics Expert)** – Checks connectivity and CORS → outputs: `phase1/network_diagnostics.md`
- **Agent E (Integration Tester)** – Performs user-level testing → outputs: `phase1/integration_tests.md`

### Phase 2: Root Cause Analysis (1 agent)
- **Agent F (Root Cause Analyzer)** – Correlates all findings → outputs: `phase2/root_cause_analysis.md`

### Phase 3: Solution Design (1 agent)
- **Agent G (Solution Architect)** – Designs fixes for root causes → outputs: `phase3/proposed_solutions.md`

### Phase 4: Solution Validation (1 agent)
- **Agent H (Fix Validator)** – Validates proposed solutions → outputs: `phase4/solution_validation.md`

## Agents and Roles

### Investigation Agents (Phase 1)

- **Agent A – Frontend Investigator**  
  **Purpose:** Examine client-side code for issues with buttons and iframe  
  **Outputs:** `phase1/frontend_analysis.md` containing HTML structure analysis, JavaScript errors, event handler issues

- **Agent B – Backend API Analyst**  
  **Purpose:** Test server-side endpoints for start/stop operations  
  **Outputs:** `phase1/backend_analysis.md` containing API test results, server logs, route analysis

- **Agent C – Service Health Monitor**  
  **Purpose:** Verify Kismet and WigletoTAK services are running and accessible  
  **Outputs:** `phase1/service_health.md` containing service status, port availability, process verification

- **Agent D – Network Diagnostics Expert**  
  **Purpose:** Analyze network-level issues preventing communication  
  **Outputs:** `phase1/network_diagnostics.md` containing firewall rules, CORS config, connectivity tests

- **Agent E – Integration Tester**  
  **Purpose:** Simulate user interactions and capture detailed errors  
  **Outputs:** `phase1/integration_tests.md` containing browser errors, network traces, user flow tests

### Analysis & Solution Agents (Phases 2-4)

- **Agent F – Root Cause Analyzer**  
  **Purpose:** Synthesize all findings into specific root causes  
  **Outputs:** `phase2/root_cause_analysis.md` containing prioritized root causes with evidence

- **Agent G – Solution Architect**  
  **Purpose:** Design implementable fixes for each root cause  
  **Outputs:** `phase3/proposed_solutions.md` containing code fixes, configuration changes, implementation steps

- **Agent H – Fix Validator**  
  **Purpose:** Validate solutions for correctness and completeness  
  **Outputs:** `phase4/solution_validation.md` containing validation scores, improvement suggestions

## File I/O Plan

### Phase 1 Outputs (Investigation)
- `./outputs/button_iframe_investigation_{timestamp}/phase1/frontend_analysis.md` – HTML/JS/CSS issues, button handlers, iframe config. *Consumed by:* Agent F
- `./outputs/button_iframe_investigation_{timestamp}/phase1/backend_analysis.md` – API endpoint tests, server logs, routes. *Consumed by:* Agent F  
- `./outputs/button_iframe_investigation_{timestamp}/phase1/service_health.md` – Service status for Kismet/WigletoTAK. *Consumed by:* Agent F
- `./outputs/button_iframe_investigation_{timestamp}/phase1/network_diagnostics.md` – Connectivity, CORS, firewall analysis. *Consumed by:* Agent F
- `./outputs/button_iframe_investigation_{timestamp}/phase1/integration_tests.md` – User-level test results, browser errors. *Consumed by:* Agent F

### Phase 2-4 Outputs (Analysis & Solutions)
- `./outputs/button_iframe_investigation_{timestamp}/phase2/root_cause_analysis.md` – Consolidated root causes. *Consumed by:* Agent G
- `./outputs/button_iframe_investigation_{timestamp}/phase3/proposed_solutions.md` – Fix proposals with code. *Consumed by:* Agent H
- `./outputs/button_iframe_investigation_{timestamp}/phase4/solution_validation.md` – Validated solutions. *Consumed by:* Final consolidation

### Final Output
- `./outputs/button_iframe_investigation_{timestamp}/final/implementation_guide.md` – Ready-to-implement fixes with instructions

## Output Directory Structure

```
./outputs/button_iframe_investigation_{timestamp}/
├── phase1/
│   ├── frontend_analysis.md
│   ├── backend_analysis.md
│   ├── service_health.md
│   ├── network_diagnostics.md
│   └── integration_tests.md
├── phase2/
│   └── root_cause_analysis.md
├── phase3/
│   └── proposed_solutions.md
├── phase4/
│   └── solution_validation.md
└── final/
    └── implementation_guide.md
```

## External Integration

**Required Tools/Capabilities:**
- **Bash Execution** – For running diagnostic commands (curl, ps, netstat, etc.)
- **WebFetch** – For analyzing the HTML page at 100.68.185.86:8002
- **File System Access** – For reading logs and configuration files
- **Network Access** – For testing service endpoints

**No external MCP servers required** – All investigation uses built-in Claude Code capabilities

## Execution Notes

- The orchestrator command `button_iframe_investigation.md` in `.claude/commands/` manages the workflow
- Agents have permission to run diagnostic commands with `sudo` if needed
- Investigation focuses on actionable findings, not theoretical issues
- All findings must include evidence (error messages, log entries, test results)
- Solutions should be practical and immediately implementable
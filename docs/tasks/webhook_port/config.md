# Flask to Node.js Webhook Port Workflow Configuration

## Overview
- **Description:** Port Flask webhook.py to Node.js framework ensuring button functionality
- **Agents:** 9 total agents (5 parallel analysis, 4 sequential implementation)

## Workflow Structure

### Phase 1: Analysis (Parallel Execution)
- **Agent A (Flask Implementation Analyzer)** – Analyzes webhook.py for complete implementation details → outputs: `phase1/flask_analysis.md`
- **Agent B (Node.js Framework Detective)** – Identifies frameworks and existing patterns → outputs: `phase1/nodejs_analysis.md`  
- **Agent C (Button Functionality Investigator)** – Traces button failures on port 8002 → outputs: `phase1/button_analysis.md`
- **Agent D (Nginx Configuration Analyst)** – Examines nginx proxy configurations → outputs: `phase1/nginx_analysis.md`
- **Agent E (API Compatibility Mapper)** – Maps Flask routes to Node.js equivalents → outputs: `phase1/api_mapping.md`
- **Phase 1 Evaluation** – Reviews all analysis outputs → outputs: `evaluations/phase1_evaluation.md`

### Phase 2: Architecture Design
- **Agent F (Implementation Architect)** – Creates implementation plan from analyses → outputs: `phase2/implementation_plan.md`
- **Phase 2 Evaluation** – Reviews architecture feasibility → outputs: `evaluations/phase2_evaluation.md`

### Phase 3: Implementation  
- **Agent G (Node.js Developer)** – Implements complete webhook solution → outputs: `phase3/webhook_implementation/*`
- **Phase 3 Evaluation** – Code quality review → outputs: `evaluations/phase3_evaluation.md`

### Phase 4: Testing
- **Agent H (Test Engineer)** – Creates and runs comprehensive tests → outputs: `phase4/tests/*`, `phase4/test_results.md`
- **Phase 4 Evaluation** – Test coverage review → outputs: `evaluations/phase4_evaluation.md`

### Phase 5: Validation
- **Agent I (Integration Validator)** – Final validation and deployment prep → outputs: `phase5/validation_report.md`, `phase5/deployment_guide.md`

## Agents and Roles

- **Agent A – Flask Implementation Analyzer**  
  **Purpose:** Deep analysis of webhook.py to extract all implementation details  
  **Output:** `phase1/flask_analysis.md` with routes, dependencies, and patterns

- **Agent B – Node.js Framework Detective**  
  **Purpose:** Analyze stinkster project to identify frameworks and patterns  
  **Output:** `phase1/nodejs_analysis.md` with framework identification

- **Agent C – Button Functionality Investigator**  
  **Purpose:** Debug why buttons fail on port 8002  
  **Output:** `phase1/button_analysis.md` with failure diagnosis

- **Agent D – Nginx Configuration Analyst**  
  **Purpose:** Understand nginx proxy requirements  
  **Output:** `phase1/nginx_analysis.md` with configuration analysis

- **Agent E – API Compatibility Mapper**  
  **Purpose:** Create detailed API mapping between Flask and Node.js  
  **Output:** `phase1/api_mapping.md` with endpoint mappings

- **Agent F – Implementation Architect**  
  **Purpose:** Design complete Node.js implementation plan  
  **Output:** `phase2/implementation_plan.md` with architecture

- **Agent G – Node.js Developer**  
  **Purpose:** Implement production-ready webhook code  
  **Output:** `phase3/webhook_implementation/` directory with all code

- **Agent H – Test Engineer**  
  **Purpose:** Comprehensive testing of all functionality  
  **Output:** `phase4/tests/` and `phase4/test_results.md`

- **Agent I – Integration Validator**  
  **Purpose:** Final validation and deployment preparation  
  **Output:** `phase5/validation_report.md` and guides

## File I/O Plan

- `./outputs/webhook_port_{timestamp}/phase1/flask_analysis.md` – Flask implementation details. *Consumed by:* Agents F, G
- `./outputs/webhook_port_{timestamp}/phase1/nodejs_analysis.md` – Node.js framework analysis. *Consumed by:* Agents F, G
- `./outputs/webhook_port_{timestamp}/phase1/button_analysis.md` – Button failure diagnosis. *Consumed by:* Agents F, G, H
- `./outputs/webhook_port_{timestamp}/phase1/nginx_analysis.md` – Nginx configuration requirements. *Consumed by:* Agents F, G, I
- `./outputs/webhook_port_{timestamp}/phase1/api_mapping.md` – API compatibility mapping. *Consumed by:* Agents F, G, H
- `./outputs/webhook_port_{timestamp}/phase2/implementation_plan.md` – Architecture blueprint. *Consumed by:* Agent G
- `./outputs/webhook_port_{timestamp}/phase3/webhook_implementation/` – Complete Node.js code. *Consumed by:* Agents H, I
- `./outputs/webhook_port_{timestamp}/phase4/test_results.md` – Test execution results. *Consumed by:* Agent I
- `./outputs/webhook_port_{timestamp}/evaluations/*` – Quality checkpoints. *Consumed by:* Orchestrator

## Output Directory Structure

```
./outputs/webhook_port_{timestamp}/
├── phase1/
│   ├── flask_analysis.md
│   ├── nodejs_analysis.md
│   ├── button_analysis.md
│   ├── nginx_analysis.md
│   └── api_mapping.md
├── phase2/
│   └── implementation_plan.md
├── phase3/
│   └── webhook_implementation/
│       ├── webhook.js
│       ├── package.json
│       ├── routes/
│       ├── middleware/
│       ├── config/
│       └── public/
├── phase4/
│   ├── tests/
│   └── test_results.md
├── phase5/
│   ├── validation_report.md
│   └── deployment_guide.md
├── evaluations/
│   ├── phase1_evaluation.md
│   ├── phase2_evaluation.md
│   ├── phase3_evaluation.md
│   └── phase4_evaluation.md
└── final/
    ├── webhook.js
    ├── package.json
    ├── nginx.conf
    └── README.md
```

## External Integration

**Recommended MCP Servers/Tools:**
- None required - all analysis done with file system access
- Optional: browser-automation for button testing
- Optional: network-debugger for API tracing

## Execution Notes

- The orchestrator command `webhook_port.md` in `.claude/commands/` uses this config to run the workflow
- Focus on button functionality issues throughout all phases
- Ensure nginx compatibility is maintained
- Port 8002 configuration must be preserved
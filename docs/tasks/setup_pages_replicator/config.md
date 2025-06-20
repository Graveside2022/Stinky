# Setup Pages Replicator Workflow Configuration

## Overview
- **Description:** Replicate setup instruction pages (wigle, atak, kismet) from /var/www/html/ to project directory
- **Agents:** 5 agents total (1 sequential discovery, 4 parallel execution)

## Workflow Structure
- **Phase 1: Discovery** 
  - Agent A (Template & Source Discovery) – analyzes source pages and extracts template → outputs: `phase1/template_analysis.json`
  
- **Phase 2: Parallel Execution** (all agents run simultaneously after Phase 1)
  - Agent B (Wigle Page Builder) – creates wigle.html → outputs: `phase2/wigle.html`
  - Agent C (ATAK Page Builder) – creates atak.html → outputs: `phase2/atak.html`
  - Agent D (Kismet Page Builder) – creates kismet.html → outputs: `phase2/kismet.html`
  - Agent E (Asset Handler) – manages CSS/JS/images → outputs: `phase2/assets/`

- **Phase 3: Validation**
  - Orchestrator reviews all outputs and copies to final location

## Agents and Roles

### Agent A – Template & Source Discovery
- **Purpose:** Analyze source pages and extract common template structure
- **Output:** `phase1/template_analysis.json`

### Agent B – Wigle Page Builder  
- **Purpose:** Create wigle.html replicating the original
- **Output:** `phase2/wigle.html`

### Agent C – ATAK Page Builder
- **Purpose:** Create atak.html replicating the original  
- **Output:** `phase2/atak.html`

### Agent D – Kismet Page Builder
- **Purpose:** Create kismet.html replicating the original
- **Output:** `phase2/kismet.html`

### Agent E – Asset Handler
- **Purpose:** Handle CSS, JavaScript, and image assets
- **Output:** `phase2/assets/` directory with resources

## File I/O Plan
- `/var/www/html/wigle.html` → read by Agent A and Agent B
- `/var/www/html/atak.html` → read by Agent A and Agent C  
- `/var/www/html/kismet.html` → read by Agent A and Agent D
- `phase1/template_analysis.json` → read by Agents B, C, D, E
- `phase2/wigle.html` → copied to `./wigle.html`
- `phase2/atak.html` → copied to `./atak.html`
- `phase2/kismet.html` → copied to `./kismet.html`
- `phase2/assets/` → copied to `./assets/`

## Output Directory Structure
```
./outputs/setup_pages_{timestamp}/
├── phase1/
│   └── template_analysis.json
├── phase2/
│   ├── wigle.html
│   ├── atak.html
│   ├── kismet.html
│   └── assets/
│       ├── style.css
│       └── [other assets]
└── logs/
    └── execution.log
```

## External Integration
**Recommended MCP Servers/Tools:**
- None required - uses built-in file system access only

## Execution Notes
- Agents B,C,D,E depend on Agent A's output
- Phase 1 must complete before Phase 2 begins
- All path references should be converted from absolute to relative
- Preserve exact text content and layout structure
- Handle missing source files gracefully with fallback templates
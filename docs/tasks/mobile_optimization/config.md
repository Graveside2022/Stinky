# Mobile Optimization Workflow Configuration

## Overview
- **Description:** Optimize HTML code for mobile devices without breaking existing functionality
- **Agents:** 6 agents total - 5 for optimization tasks, 1 for integration/testing
- **Approach:** Mobile-first responsive design with comprehensive testing

## Workflow Structure
- Phase 1: Analysis (5 agents in parallel) - Comprehensive analysis of mobile optimization needs
  - Agent A (Mobile Analyzer) → outputs: mobile_issues_analysis.md  
  - Agent B (CSS Specialist) → outputs: css_analysis.md
  - Agent C (JS Analyzer) → outputs: js_analysis.md
  - Agent D (HTML Optimizer) → outputs: structure_analysis.md
  - Agent E (Performance Analyzer) → outputs: performance_analysis.md
- Phase 1 Evaluation: Mobile Evaluator reviews all analyses → output: phase1_evaluation.md
- Phase 2: Implementation (4 agents in parallel) - Create mobile optimizations
  - Agent B → outputs: mobile_styles.css
  - Agent C → outputs: mobile_scripts.js  
  - Agent D → outputs: mobile_structure.html
  - Agent E → outputs: performance_optimizations.txt
- Phase 2 Evaluation: Mobile Evaluator reviews implementations → output: phase2_evaluation.md
- Phase 3: Integration & Testing (Agent F) - Combine and validate all changes
  - Agent F → outputs: test_report.md, kismet_mobile_optimized.html

## Agents and Roles
- **Agent A – Mobile Analyzer:** Analyzes current HTML/CSS/JS for mobile issues and creates optimization inventory
  **Purpose:** Identify all mobile optimization opportunities  
  **Output:** `phase1/mobile_issues_analysis.md`
  
- **Agent B – CSS Mobile Specialist:** Analyzes CSS and creates responsive mobile-first styles
  **Purpose:** Design and implement mobile-optimized CSS framework  
  **Output:** `phase1/css_analysis.md`, `phase2/mobile_styles.css`
  
- **Agent C – JavaScript Analyzer & Adapter:** Ensures JS works on mobile with touch support
  **Purpose:** Adapt JavaScript for mobile devices with touch events and network resilience  
  **Output:** `phase1/js_analysis.md`, `phase2/mobile_scripts.js`
  
- **Agent D – HTML Structure Optimizer:** Optimizes HTML structure for mobile rendering
  **Purpose:** Restructure HTML with proper mobile meta tags and semantic markup  
  **Output:** `phase1/structure_analysis.md`, `phase2/mobile_structure.html`
  
- **Agent E – Performance Optimizer:** Optimizes for mobile performance
  **Purpose:** Implement performance optimizations for resource-constrained devices  
  **Output:** `phase1/performance_analysis.md`, `phase2/performance_optimizations.txt`
  
- **Agent F – Integration & Testing Coordinator:** Combines optimizations and validates functionality
  **Purpose:** Integrate all changes and perform comprehensive testing  
  **Output:** `phase3/test_report.md`, `final/kismet_mobile_optimized.html`

## File I/O Plan
- `./outputs/mobile_optimization_{timestamp}/phase1/mobile_issues_analysis.md` – Mobile issues inventory. *Consumed by:* All Phase 2 agents
- `./outputs/mobile_optimization_{timestamp}/phase1/css_analysis.md` – CSS analysis. *Consumed by:* Agent B (Phase 2)
- `./outputs/mobile_optimization_{timestamp}/phase1/js_analysis.md` – JavaScript analysis. *Consumed by:* Agent C (Phase 2)  
- `./outputs/mobile_optimization_{timestamp}/phase1/structure_analysis.md` – HTML structure analysis. *Consumed by:* Agent D (Phase 2)
- `./outputs/mobile_optimization_{timestamp}/phase1/performance_analysis.md` – Performance analysis. *Consumed by:* Agent E (Phase 2)
- `./outputs/mobile_optimization_{timestamp}/phase2/mobile_styles.css` – Mobile CSS. *Consumed by:* Agent F
- `./outputs/mobile_optimization_{timestamp}/phase2/mobile_scripts.js` – Mobile JavaScript. *Consumed by:* Agent F
- `./outputs/mobile_optimization_{timestamp}/phase2/mobile_structure.html` – Optimized HTML structure. *Consumed by:* Agent F
- `./outputs/mobile_optimization_{timestamp}/phase2/performance_optimizations.txt` – Performance recommendations. *Consumed by:* Agent F
- `./outputs/mobile_optimization_{timestamp}/evaluations/phase1_evaluation.md` – Phase 1 evaluation. *Reference for:* Orchestrator
- `./outputs/mobile_optimization_{timestamp}/evaluations/phase2_evaluation.md` – Phase 2 evaluation. *Reference for:* Orchestrator
- `./outputs/mobile_optimization_{timestamp}/phase3/test_report.md` – Testing results. *Reference for:* User
- `./outputs/mobile_optimization_{timestamp}/final/kismet_mobile_optimized.html` – Final optimized HTML. *Deliverable for:* User

## Output Directory Structure
```
./outputs/mobile_optimization_{timestamp}/
├── phase1/
│   ├── mobile_issues_analysis.md
│   ├── css_analysis.md
│   ├── js_analysis.md
│   ├── structure_analysis.md
│   └── performance_analysis.md
├── phase2/
│   ├── mobile_styles.css
│   ├── mobile_scripts.js
│   ├── mobile_structure.html
│   └── performance_optimizations.txt
├── phase3/
│   └── test_report.md
├── evaluations/
│   ├── phase1_evaluation.md
│   └── phase2_evaluation.md
└── final/
    └── kismet_mobile_optimized.html
```

## External Integration
**Recommended MCP Servers/Tools:**
- None required

## Execution Notes
- The orchestrator command `mobile_optimize.md` in `.claude/commands/` uses this config to run the workflow
- Ensure the original HTML file is provided as input to all agents
- The workflow preserves all existing functionality while optimizing for mobile
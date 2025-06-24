# Tailwind CSS Migration Workflow Configuration

## Overview
- **Description:** Migrate vanilla HTML/CSS/JS application to Tailwind CSS framework with mobile-first responsive design
- **Agents:** 14 total agents (5 parallel in Phase 1, rest sequential with validation loops)
- **Estimated Duration:** 60-90 minutes depending on codebase size

## Workflow Structure

### Phase 1: Comprehensive Analysis (5 agents in parallel)
- Agent A (HTML Structure Analyzer) – Maps HTML architecture → outputs: `phase1/html_structure_analysis.json`
- Agent B (CSS Pattern Extractor) – Extracts and categorizes all CSS → outputs: `phase1/css_pattern_analysis.json`
- Agent C (JavaScript Dependency Mapper) – Maps JS-CSS dependencies → outputs: `phase1/js_dependency_analysis.json`
- Agent D (Mobile Responsiveness Auditor) – Audits mobile behavior → outputs: `phase1/mobile_responsiveness_audit.json`
- Agent E (Performance Baseline Analyzer) – Measures current metrics → outputs: `phase1/performance_baseline.json`

### Phase 2: Setup & Planning (Sequential)
- Agent F (Tailwind Configurator) – Sets up Tailwind infrastructure → outputs: `phase2/tailwind_config/`
- Agent G (Design System Creator) – Creates mobile-first design system → outputs: `phase2/design_system.md`
- Agent H (Test Strategy Planner) – Designs testing approach → outputs: `phase2/test_plan.md`

### Phase 3: Incremental Migration (Sequential with validation loops)
- Agent I (Component Migrator) – Migrates components one by one → outputs: `phase3/migrated/[component]/`
- Agent J (Functionality Validator) – Validates each component → outputs: `phase3/validation/[component].md`
- Agent K (Visual Regression Tester) – Tests visual consistency → outputs: `phase3/visual_tests/[component]/`

### Phase 4: Optimization & Finalization (Sequential)
- Agent L (Performance Optimizer) – Optimizes for production → outputs: `phase4/optimized_build/`
- Agent M (Quality Evaluator) – Comprehensive assessment → outputs: `evaluations/quality_report.md`
- Agent N (Final Assembler) – Creates production build → outputs: `final/`

## Agents and Roles

### Analysis Agents (Phase 1)
- **Agent A – HTML Structure Analyzer**  
  **Purpose:** Map complete HTML architecture and component relationships  
  **Output:** `phase1/html_structure_analysis.json`

- **Agent B – CSS Pattern Extractor**  
  **Purpose:** Extract and categorize all CSS rules and patterns  
  **Output:** `phase1/css_pattern_analysis.json`

- **Agent C – JavaScript Dependency Mapper**  
  **Purpose:** Identify all JavaScript dependencies on CSS classes/IDs  
  **Output:** `phase1/js_dependency_analysis.json`

- **Agent D – Mobile Responsiveness Auditor**  
  **Purpose:** Audit current responsive design implementation  
  **Output:** `phase1/mobile_responsiveness_audit.json`

- **Agent E – Performance Baseline Analyzer**  
  **Purpose:** Establish performance metrics for comparison  
  **Output:** `phase1/performance_baseline.json`

### Setup Agents (Phase 2)
- **Agent F – Tailwind Configurator**  
  **Purpose:** Set up Tailwind CSS with proper configuration  
  **Output:** `phase2/tailwind_config/` (package.json, tailwind.config.js, postcss.config.js)

- **Agent G – Design System Creator**  
  **Purpose:** Create unified mobile-first design system  
  **Output:** `phase2/design_system.md`

- **Agent H – Test Strategy Planner**  
  **Purpose:** Design testing approach without existing infrastructure  
  **Output:** `phase2/test_plan.md`

### Migration Agents (Phase 3)
- **Agent I – Component Migrator**  
  **Purpose:** Convert CSS to Tailwind utilities incrementally  
  **Output:** `phase3/migrated/[component]/`

- **Agent J – Functionality Validator**  
  **Purpose:** Ensure all functionality is preserved  
  **Output:** `phase3/validation/[component].md`

- **Agent K – Visual Regression Tester**  
  **Purpose:** Verify visual consistency  
  **Output:** `phase3/visual_tests/[component]/`

### Finalization Agents (Phase 4)
- **Agent L – Performance Optimizer**  
  **Purpose:** Optimize bundle size and performance  
  **Output:** `phase4/optimized_build/`

- **Agent M – Quality Evaluator**  
  **Purpose:** Comprehensive quality assessment with scoring  
  **Output:** `evaluations/quality_report.md`

- **Agent N – Final Assembler**  
  **Purpose:** Create production-ready deliverables  
  **Output:** `final/production_build/`, `final/migration_guide.md`

## File I/O Plan

### Input Files
- `*.html` - All HTML files in project root
- `*.css` - All CSS files including `assets/css/common-styles.css`
- `*.js` - All JavaScript files
- Inline styles within HTML files

### Key Output Files
- `phase1/*_analysis.json` - Analysis data from each Phase 1 agent
- `phase2/tailwind_config/` - Tailwind configuration files
- `phase2/design_system.md` - Design system documentation
- `phase2/test_plan.md` - Testing strategy
- `phase3/migrated/` - Migrated components
- `phase4/optimized_build/` - Optimized production build
- `final/production_build/` - Final deliverables

## Output Directory Structure
```
./outputs/tailwind_migration_{timestamp}/
├── phase1/
│   ├── html_structure_analysis.json
│   ├── css_pattern_analysis.json
│   ├── js_dependency_analysis.json
│   ├── mobile_responsiveness_audit.json
│   └── performance_baseline.json
├── phase2/
│   ├── tailwind_config/
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   └── postcss.config.js
│   ├── design_system.md
│   └── test_plan.md
├── phase3/
│   ├── migrated/
│   │   └── [component_name]/
│   ├── validation/
│   │   └── [component_name]_validation.md
│   └── visual_tests/
│       └── [component_name]/
├── phase4/
│   └── optimized_build/
├── evaluations/
│   ├── component_evaluations/
│   └── quality_report.md
└── final/
    ├── production_build/
    ├── migration_guide.md
    └── rollback_instructions.md
```

## Quality Criteria

Migration must achieve:
- **Functionality Preservation:** 100% (no broken features)
- **Visual Accuracy:** >95% (minor improvements acceptable)
- **Mobile Responsiveness:** >90% (improved from baseline)
- **Performance:** >20% CSS size reduction
- **Code Quality:** Clean, maintainable Tailwind utilities

## External Integration

**Recommended Tools:**
- **Filesystem Access:** Required for reading/writing all files
- **Git Integration:** Recommended for version control and rollback
- **Node.js Runtime:** Required for Tailwind build process
- **Image Tools:** Optional for visual regression testing

## Execution Notes

- The orchestrator command `tailwind_migration.md` in `.claude/commands/` uses this config
- Components are migrated incrementally with validation after each
- Performance baseline is established before any changes
- All JavaScript functionality must be preserved
- Mobile-first approach is mandatory
- Rollback capability must be maintained throughout
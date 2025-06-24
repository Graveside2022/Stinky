# Mobile Optimization 8002 Workflow Configuration

## Overview
- **Description:** Optimize webpage on port 8002 for mobile responsiveness without altering functionality
- **Agents:** 10 total agents (5 parallel in Phase 1, 5 sequential in subsequent phases)
- **Technology Stack:** HTML5, Node.js, CSS, JavaScript, iframes
- **Priority:** Preserve all functionality while achieving responsive design

## Workflow Structure

### Phase 1: Discovery & Analysis (5 Parallel Agents)
- **CodeAnalyzer** – Examines HTML/CSS/JS structure → outputs: `phase1/code_structure.json`, `phase1/css_inventory.json`
- **ResponsiveDesigner** – Plans responsive strategy → outputs: `phase1/responsive_plan.json`
- **IframeSpecialist** – Analyzes iframe usage → outputs: `phase1/iframe_audit.json`
- **MobileTestPlanner** – Creates test plans → outputs: `phase1/test_plan.json`
- **FunctionalityMapper** – Documents interactions → outputs: `phase1/functionality_map.json`

### Phase 2: Design Consolidation
- **ResponsiveDesigner** – Consolidates findings, creates roadmap → output: `phase2/implementation_roadmap.md`

### Phase 3: Implementation
- **CSSImplementer** – Applies responsive CSS → modifies CSS files, logs to `phase3/css_changes.log`
- **IframeOptimizer** – Implements iframe solutions → modifies HTML/CSS, logs to `phase3/iframe_changes.log`

### Phase 4: Testing & Validation
- **CrossDeviceTester** – Tests across devices → output: `phase4/device_test_results.md`
- **FunctionalityValidator** – Verifies functionality → output: `phase4/functionality_report.md`
- **QualityAssurance** – Final evaluation → outputs: `phase4/qa_report.md`, `final_report.md`

## Agents and Roles

### CodeAnalyzer
- **Role:** HTML/CSS/JavaScript Structure Analyst
- **Purpose:** Identify current responsive implementations, frameworks, and structural issues
- **Outputs:** JSON reports detailing code structure and CSS inventory

### ResponsiveDesigner
- **Role:** Responsive Design Strategist
- **Purpose:** Plan comprehensive responsive design approach and consolidate findings
- **Outputs:** Design specifications and implementation roadmap

### IframeSpecialist
- **Role:** Iframe Responsiveness Expert
- **Purpose:** Analyze and solve iframe-specific responsive challenges
- **Outputs:** Iframe audit and responsive solutions

### MobileTestPlanner
- **Role:** Mobile Testing Strategist
- **Purpose:** Create comprehensive test plans for all screen sizes
- **Outputs:** Detailed test plans and checklists

### FunctionalityMapper
- **Role:** Interactive Element Documenter
- **Purpose:** Ensure no functionality is altered during optimization
- **Outputs:** Complete map of all interactive elements

### CSSImplementer
- **Role:** Responsive CSS Developer
- **Purpose:** Implement responsive CSS changes safely
- **Outputs:** Modified CSS files with detailed change logs

### IframeOptimizer
- **Role:** Iframe Solution Implementer
- **Purpose:** Apply responsive iframe solutions
- **Outputs:** Modified HTML/CSS for iframes

### CrossDeviceTester
- **Role:** Multi-Device Test Executor
- **Purpose:** Verify responsiveness across all screen sizes
- **Outputs:** Comprehensive test results

### FunctionalityValidator
- **Role:** Functionality Preservation Validator
- **Purpose:** Ensure all interactive elements work as before
- **Outputs:** Functionality validation report

### QualityAssurance
- **Role:** Final Quality Evaluator
- **Purpose:** Provide go/no-go decision for deployment
- **Outputs:** QA report and final recommendations

## File I/O Plan

### Input Files
- All HTML files from webpage
- All CSS files (including preprocessed)
- JavaScript files (read-only)
- Configuration files
- Package.json

### Phase 1 Outputs (Analysis Reports)
- `phase1/code_structure.json` - HTML/CSS/JS analysis
- `phase1/css_inventory.json` - All CSS files and rules
- `phase1/responsive_plan.json` - Responsive design strategy
- `phase1/iframe_audit.json` - Iframe analysis
- `phase1/test_plan.json` - Testing strategy
- `phase1/functionality_map.json` - Interactive elements catalog

### Phase 2 Outputs (Design)
- `phase2/implementation_roadmap.md` - Consolidated plan

### Phase 3 Outputs (Implementation)
- `phase3/css_changes.log` - All CSS modifications
- `phase3/iframe_changes.log` - Iframe-specific changes
- Modified CSS/HTML files in place

### Phase 4 Outputs (Testing)
- `phase4/device_test_results.md` - Cross-device test results
- `phase4/functionality_report.md` - Functionality validation
- `phase4/qa_report.md` - Final quality assessment
- `final_report.md` - Executive summary

## Output Directory Structure

```
./outputs/mobile_optimize_8002_{timestamp}/
├── backups/
│   ├── css/
│   ├── html/
│   └── initial_commit.git
├── phase1/
│   ├── code_structure.json
│   ├── css_inventory.json
│   ├── responsive_plan.json
│   ├── iframe_audit.json
│   ├── test_plan.json
│   └── functionality_map.json
├── phase2/
│   └── implementation_roadmap.md
├── phase3/
│   ├── css_changes.log
│   └── iframe_changes.log
├── phase4/
│   ├── device_test_results.md
│   ├── functionality_report.md
│   └── qa_report.md
├── errors.log
└── final_report.md
```

## CSS Precedence Rules

1. **Critical** (Priority 1): Reset styles, viewport settings
2. **Layout** (Priority 2): Grid/Flexbox, positioning
3. **Components** (Priority 3): Specific element styles
4. **Responsive** (Priority 4): Media queries, breakpoints

## External Integration

**Recommended Tools:**
- Browser DevTools Protocol - For automated testing
- Git - For version control and rollback
- Local development server - To test changes
- Visual comparison tools - For before/after analysis

**No MCP servers required** - All work can be done with built-in capabilities

## Execution Notes

- The orchestrator command `mobile_optimize_8002.md` in `.claude/commands/` uses this config
- Ensure port 8002 is accessible before starting
- Back up all files before any modifications
- Test on real devices when possible
- Priority: Don't break functionality > Make it responsive
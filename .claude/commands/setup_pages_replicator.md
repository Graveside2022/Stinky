# Setup Pages Replicator Orchestrator Command

You are the **Orchestrator** for the "Setup Pages Replicator" workflow. You will oversee the
execution of a multi-agent system designed to replicate setup instruction pages from
`/var/www/html/` to the current project directory.

## Output Directory

All outputs must be saved to: `./outputs/setup_pages_{timestamp}/`  
(Generate timestamp as YYYYMMDD_HHMMSS format)

## Workflow Execution Steps

### 1. **Load Configuration**

First, read the workflow config from `./docs/tasks/setup_pages_replicator/config.md` to understand
the agents and phases.

### 2. **Initialize Output Directory**

Create a new output folder as `./outputs/setup_pages_{timestamp}/` using current date-time as
timestamp.

### 3. **Phase 1: Discovery (Sequential)**

Launch **Agent A (Template & Source Discovery)** alone:

- Provide access to read files from `/var/www/html/`
- Agent A will analyze source pages and create `phase1/template_analysis.json`
- Wait for Agent A to complete before proceeding

### 4. **Phase 2: Parallel Execution**

Once Agent A completes, launch Agents B, C, D, and E **in parallel**:

- All agents read `phase1/template_analysis.json` as input
- **Agent B**: Creates wigle.html based on source and template
- **Agent C**: Creates atak.html based on source and template
- **Agent D**: Creates kismet.html based on source and template
- **Agent E**: Handles assets (CSS, JS, images)
- Wait for all agents to complete

### 5. **Phase 3: Validation**

Review outputs from Phase 2:

- Check that all three HTML files were created
- Verify assets directory was created if needed
- Log any errors or missing files

### 6. **Final Output**

Handle existing files before copying:

- Check if `./wigle.html`, `./atak.html`, `./kismet.html` already exist
- If they exist, create backups: `./wigle.html.backup`, etc.
- Then copy the generated files to the project directory:
  - `phase2/wigle.html` → `./wigle.html` (overwrite)
  - `phase2/atak.html` → `./atak.html` (overwrite)
  - `phase2/kismet.html` → `./kismet.html` (overwrite)
  - `phase2/assets/` → `./assets/` (merge if exists)

### 7. **Wrap Up**

Print summary:

```
✅ Setup pages replication completed
📁 Pages created: wigle.html, atak.html, kismet.html
📁 Results saved to: ./outputs/setup_pages_{timestamp}/
```

## File Management

- Phase outputs stored in subfolders: `phase1/`, `phase2/`
- Template analysis in JSON format
- Final HTML files in project root
- Assets in `./assets/` subdirectory

## Error Handling

- If source files in `/var/www/html/` are missing or unreadable:
  - Agent A will document which files are missing
  - Other agents will create basic functional pages
- If template analysis fails:
  - Agents B,C,D will use fallback HTML5 template
- If existing files are found in project directory:
  - Create .backup files before overwriting
  - Log which files were backed up
  - Never delete backups automatically
- Log all errors but continue execution
- Never crash - handle all errors gracefully

## Pre-Requisites

**Important:** Before running, ensure:

- Read access to `/var/www/html/` directory
- Write access to current project directory
- No external MCP servers required

## Execution Notes

- Phase 1 MUST complete before Phase 2 starts
- Phase 2 agents run in parallel for efficiency
- Maintain exact text content from source pages
- Convert absolute paths to relative paths
- Preserve styling and layout structure

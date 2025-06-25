#!/bin/bash

# Repository Reorganization Script
# This script will clean up and reorganize the Stinkster Malone repository
# to have a more professional structure.
#
# WARNING: Review this script carefully before executing!
# Run with --dry-run flag to see what would be done without making changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if dry run mode
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}Running in DRY RUN mode - no changes will be made${NC}"
fi

# Function to execute or print commands
execute() {
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "${BLUE}[DRY RUN]${NC} $*"
    else
        echo -e "${GREEN}[EXECUTING]${NC} $*"
        "$@"
    fi
}

# Function to create directory if it doesn't exist
ensure_dir() {
    if [[ ! -d "$1" ]]; then
        execute mkdir -p "$1"
    fi
}

echo -e "${GREEN}=== Repository Reorganization Script ===${NC}"
echo "This script will reorganize the repository structure"
echo ""

# Create target directories
echo -e "${YELLOW}Creating directory structure...${NC}"
ensure_dir "docs/analysis"
ensure_dir "docs/migration"
ensure_dir "docs/reports"
ensure_dir "docs/handoffs"
ensure_dir "docs/compliance"
ensure_dir "docs/monitoring"
ensure_dir "scripts/migration"
ensure_dir "scripts/setup"
ensure_dir "scripts/monitoring"
ensure_dir "archive/temp-files"
ensure_dir "archive/old-reports"
ensure_dir "archive/test-results"

echo ""
echo -e "${YELLOW}Moving documentation files to docs/...${NC}"

# Move main documentation files (keep these in root)
echo -e "${BLUE}Keeping essential docs in root:${NC}"
echo "  - README.md"
echo "  - LICENSE"
echo "  - CHANGELOG.md"
echo "  - CONTRIBUTING.md"
echo "  - SECURITY.md"
echo "  - QUICK_START.md"
echo "  - CLAUDE.md (project-specific instructions)"

# Move analysis documents
echo -e "${BLUE}Moving analysis documents to docs/analysis/:${NC}"
for file in *_ANALYSIS*.md *_MAPPING*.md *_ASSESSMENT*.md; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "docs/analysis/"
    fi
done

# Move migration documents
echo -e "${BLUE}Moving migration documents to docs/migration/:${NC}"
for file in *MIGRATION*.md *NODEJS*.md *FLASK*.md *WEBHOOK*.md TODO_NODEJS_MIGRATION.md WORKFLOW_PHASES.md; do
    if [[ -f "$file" && "$file" != "CONTRIBUTING.md" ]]; then
        execute mv "$file" "docs/migration/"
    fi
done

# Move reports
echo -e "${BLUE}Moving reports to docs/reports/:${NC}"
for file in *_REPORT*.md *_SUMMARY*.md *_STATUS*.md; do
    if [[ -f "$file" && "$file" != "README.md" && "$file" != "CHANGELOG.md" ]]; then
        execute mv "$file" "docs/reports/"
    fi
done

# Move JSON reports to archive
echo -e "${BLUE}Moving JSON reports to archive/old-reports/:${NC}"
for file in *.json; do
    if [[ -f "$file" && "$file" != "package.json" && "$file" != "postcss.config.js" ]]; then
        execute mv "$file" "archive/old-reports/"
    fi
done

# Move handoff documents
echo -e "${BLUE}Moving handoff documents to docs/handoffs/:${NC}"
for file in *HANDOFF*.md SESSION_CONTINUITY.md; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "docs/handoffs/"
    fi
done

# Move compliance and legal documents
echo -e "${BLUE}Moving compliance documents to docs/compliance/:${NC}"
for file in LEGAL_*.md REGULATORY_*.md THIRD_PARTY_*.md; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "docs/compliance/"
    fi
done

# Move monitoring documents
echo -e "${BLUE}Moving monitoring documents to docs/monitoring/:${NC}"
for file in MONITORING_*.md *_MONITORING_*.md OPERATIONAL_RUNBOOK*.md; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "docs/monitoring/"
    fi
done

# Move deployment and configuration docs
echo -e "${BLUE}Moving deployment docs to docs/:${NC}"
for file in DEPLOYMENT.md API_DOCUMENTATION.md TODO.md; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "docs/"
    fi
done

# Move setup scripts
echo -e "${BLUE}Moving setup scripts to scripts/setup/:${NC}"
for file in setup*.sh install*.sh create_backup.sh load_config.sh; do
    if [[ -f "$file" && "$file" != "install.sh" ]]; then  # Keep main install.sh in root
        execute mv "$file" "scripts/setup/"
    fi
done

# Move migration scripts
echo -e "${BLUE}Moving migration scripts to scripts/migration/:${NC}"
for file in migration*.sh rollback*.sh; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "scripts/migration/"
    fi
done

# Move monitoring scripts
echo -e "${BLUE}Moving monitoring scripts to scripts/monitoring/:${NC}"
for file in monitor*.sh *-monitor.sh; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "scripts/monitoring/"
    fi
done

# Move test scripts
echo -e "${BLUE}Moving test scripts to scripts/:${NC}"
for file in test-*.sh verify-*.sh validate-*.sh; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "scripts/"
    fi
done

# Move HackRF-specific scripts
echo -e "${BLUE}Moving HackRF scripts to scripts/:${NC}"
for file in *hackrf*.sh start-hackrf*.sh; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "scripts/"
    fi
done

# Move HTML files to appropriate locations
echo -e "${BLUE}Moving HTML files:${NC}"
# These appear to be web UI pages, keep them in root for now
echo "  - Keeping index.html, kismet.html, wigle.html, atak.html in root (web UI pages)"

# Move test results
echo -e "${BLUE}Moving test results to archive/test-results/:${NC}"
if [[ -d "test-results" ]]; then
    execute mv test-results/* "archive/test-results/" 2>/dev/null || true
    execute rmdir test-results
fi

# Move JavaScript test files to archive
echo -e "${BLUE}Moving standalone JS test files to archive/:${NC}"
for file in *test*.js api_*.js comprehensive_*.js integration_*.js focused-*.js; do
    if [[ -f "$file" ]]; then
        execute mv "$file" "archive/temp-files/"
    fi
done

# Clean up empty directories
echo ""
echo -e "${YELLOW}Cleaning up empty directories...${NC}"
if [[ "$DRY_RUN" != true ]]; then
    find . -type d -empty -delete 2>/dev/null || true
fi

# Create a clean .gitignore if needed
echo ""
echo -e "${YELLOW}Updating .gitignore...${NC}"
if [[ "$DRY_RUN" != true ]]; then
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
venv/
__pycache__/
*.pyc

# Logs
logs/
*.log

# Runtime files
data/
tmp/
pids/
*.pid

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local

# Build outputs
dist/
build/
*.min.js
*.min.css

# Test coverage
coverage/
.nyc_output/

# Archive directory (temporary files)
archive/temp-files/

# Backup files
*.backup
*.bak
*~

# Docker volumes
docker/logs/
EOF
fi

# Create a summary of changes
echo ""
echo -e "${GREEN}=== Reorganization Summary ===${NC}"
echo ""
echo "Directory structure after reorganization:"
echo "  /"
echo "  ├── src/           (source code)"
echo "  ├── config/        (configuration files)"
echo "  ├── scripts/       (all scripts organized by type)"
echo "  ├── docs/          (all documentation organized by category)"
echo "  ├── systemd/       (service files)"
echo "  ├── docker/        (Docker configurations)"
echo "  ├── assets/        (web assets)"
echo "  ├── dev/           (development tools)"
echo "  ├── archive/       (old reports and temporary files)"
echo "  └── [root files]   (README, LICENSE, main scripts, web UI files)"
echo ""

if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}This was a DRY RUN - no files were actually moved${NC}"
    echo -e "${YELLOW}Run without --dry-run flag to execute the reorganization${NC}"
else
    echo -e "${GREEN}Reorganization complete!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review the changes with: git status"
    echo "2. Test that all scripts still work from their new locations"
    echo "3. Update any hardcoded paths in scripts if needed"
    echo "4. Commit the reorganization: git add -A && git commit -m 'chore: Reorganize repository structure'"
fi

echo ""
echo -e "${YELLOW}Files to manually review:${NC}"
echo "- Any Python config files (config.py) - decide if they should move"
echo "- Standalone CSS file (styles.css in src/) - check if it's orphaned"
echo "- Migration baseline files - check if still needed"
echo "- The before_evidence/ directory - archive or remove if no longer needed"
echo "- The reports/ directory - merge with archive/old-reports if appropriate"
echo "- The memory/ directory - check if patterns should move to docs"
echo "- The worktrees/ directory - remove if empty or no longer used"
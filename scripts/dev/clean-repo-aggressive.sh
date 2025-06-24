#!/bin/bash

# Aggressive repository cleanup - leaves only truly essential files in root

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Aggressive Repository Cleanup ===${NC}"
echo "This will create a very clean repository structure"
echo

# Function to handle dry run
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}Running in DRY RUN mode - no changes will be made${NC}"
fi

# Function to execute or simulate commands
execute() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${BLUE}[DRY RUN]${NC} $*"
    else
        "$@"
    fi
}

echo -e "${YELLOW}Creating directory structure...${NC}"
execute mkdir -p docs/{guides,api,architecture,tasks,analysis,compliance,legacy}
execute mkdir -p scripts/{setup,dev,production}
execute mkdir -p archive/legacy-files
execute mkdir -p config/examples
execute mkdir -p public

echo -e "${YELLOW}Moving documentation files...${NC}"

# Move all analysis and report files to docs/analysis/
for file in *_ANALYSIS*.md *_REPORT*.md *_SUMMARY.md *_VERIFICATION*.md *_MAPPING*.md *_STATUS*.md; do
    [ -f "$file" ] && execute mv "$file" docs/analysis/
done

# Move specific documentation to appropriate folders
[ -f "API_DOCUMENTATION.md" ] && execute mv "API_DOCUMENTATION.md" docs/api/
[ -f "DEPLOYMENT.md" ] && execute mv "DEPLOYMENT.md" docs/guides/
[ -f "TODO.md" ] && execute mv "TODO.md" docs/
[ -f "OPERATIONAL_RUNBOOK_NODEJS.md" ] && execute mv "OPERATIONAL_RUNBOOK_NODEJS.md" docs/guides/
[ -f "MONITORING_DASHBOARD.md" ] && execute mv "MONITORING_DASHBOARD.md" docs/guides/

# Move compliance documents
for file in LEGAL_QUICK_REFERENCE.md REGULATORY_COMPLIANCE.md THIRD_PARTY_LICENSES.md; do
    [ -f "$file" ] && execute mv "$file" docs/compliance/
done

# Move all handoff and session files to archive
for file in *_HANDOFF*.md SESSION_CONTINUITY.md; do
    [ -f "$file" ] && execute mv "$file" archive/legacy-files/
done

# Move all test and integration files
for file in agent*.js *test*.js comprehensive_api_report.js integration_test*.js; do
    [ -f "$file" ] && execute mv "$file" archive/legacy-files/
done

# Move all JSON report files
execute mv *.json archive/legacy-files/ 2>/dev/null || true

# Move HTML files to public directory (except index.html)
for file in atak.html kismet.html wigle.html; do
    [ -f "$file" ] && execute mv "$file" public/
done

# Move scripts
[ -f "create_backup.sh" ] && execute mv "create_backup.sh" scripts/dev/
[ -f "monitor-production.sh" ] && execute mv "monitor-production.sh" scripts/production/
[ -f "harden-production.sh" ] && execute mv "harden-production.sh" scripts/production/
[ -f "hackrf-quick-start.sh" ] && execute mv "hackrf-quick-start.sh" scripts/setup/
[ -f "setup-configs.sh" ] && execute mv "setup-configs.sh" scripts/setup/
[ -f "load_config.sh" ] && execute mv "load_config.sh" scripts/setup/
[ -f "rollback_phase2.sh" ] && execute mv "rollback_phase2.sh" scripts/dev/

# Move test scripts
for file in test-*.sh validate-*.sh verify-*.sh; do
    [ -f "$file" ] && execute mv "$file" scripts/dev/
done

# Move Python config to config directory
[ -f "config.py" ] && execute mv "config.py" config/

# Move all remaining loose markdown files that aren't essential
for file in *.md; do
    case "$file" in
        README.md|LICENSE|CHANGELOG.md|CONTRIBUTING.md|SECURITY.md|QUICK_START.md|CLAUDE.md)
            # Keep these in root
            ;;
        *)
            [ -f "$file" ] && execute mv "$file" docs/legacy/
            ;;
    esac
done

# Clean up other files
[ -f "styles.css" ] && execute rm "styles.css"  # Appears to be in wrong location
[ -f "test-integration.wiglecsv" ] && execute mv "test-integration.wiglecsv" archive/legacy-files/
[ -f "migration_baseline.md" ] && execute mv "migration_baseline.md" docs/legacy/
[ -f "kismet-operations-center-api-analysis.md" ] && execute mv "kismet-operations-center-api-analysis.md" docs/analysis/

# Move config files that aren't essential to root
[ -f "production-security-config.js" ] && execute mv "production-security-config.js" config/

# Handle special directories
[ -d "before_evidence" ] && execute mv "before_evidence" archive/legacy-files/
[ -d "test-results" ] && execute mv "test-results" archive/legacy-files/
[ -d "reports" ] && execute mv "reports" archive/legacy-files/
[ -d "worktrees" ] && execute rmdir "worktrees" 2>/dev/null || true
[ -d "openwebrx-hackrf-autostart.json" ] && execute rmdir "openwebrx-hackrf-autostart.json" 2>/dev/null || true

echo
echo -e "${GREEN}=== Cleanup Summary ===${NC}"
echo -e "${BLUE}Essential files remaining in root:${NC}"
echo "  - README.md          (project overview)"
echo "  - LICENSE            (legal requirements)"  
echo "  - CHANGELOG.md       (version history)"
echo "  - CONTRIBUTING.md    (contribution guide)"
echo "  - SECURITY.md        (security policy)"
echo "  - QUICK_START.md     (quick start guide)"
echo "  - CLAUDE.md          (AI assistant instructions)"
echo "  - package.json       (Node.js manifest)"
echo "  - docker-compose.yml (Docker configuration)"
echo "  - .gitignore         (Git ignore rules)"
echo "  - .env.example       (Environment template)"
echo "  - install.sh         (Main installation script)"
echo "  - index.html         (Landing page)"
echo "  - postcss.config.js  (PostCSS config)"
echo "  - tailwind.config.js (Tailwind config)"

echo
echo -e "${BLUE}Essential directories:${NC}"
echo "  - src/               (source code)"
echo "  - docs/              (documentation)"
echo "  - config/            (configuration)"
echo "  - scripts/           (utility scripts)"  
echo "  - public/            (public HTML files)"
echo "  - assets/            (CSS, JS, images)"
echo "  - systemd/           (service files)"
echo "  - data/              (runtime data)"
echo "  - logs/              (log files)"
echo "  - external/          (external links)"
echo "  - dev/               (development tools)"
echo "  - docker/            (Docker files)"
echo "  - patterns/          (code patterns)"
echo "  - memory/            (AI memory patterns)"
echo "  - archive/           (archived files)"

if [ "$DRY_RUN" = false ]; then
    echo
    echo -e "${GREEN}Cleanup complete!${NC}"
    echo "Run 'git status' to review changes"
    echo "Run 'git add -A && git commit -m \"chore: Clean up repository structure\"' to commit"
else
    echo
    echo -e "${YELLOW}Dry run complete. Run without --dry-run to apply changes.${NC}"
fi
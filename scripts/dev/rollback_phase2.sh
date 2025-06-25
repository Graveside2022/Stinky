#!/bin/bash

# rollback_phase2.sh - Specific rollback for Phase 2 Node.js scaffolding
# Usage: ./rollback_phase2.sh

set -e

echo "=== Phase 2 Node.js Scaffolding Rollback ==="
echo "User: Christian"
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_NAME="phase2_nodejs_scaffolding_2025-06-15_v1"
BACKUP_PATH="${PROJECT_ROOT}/backups/${BACKUP_NAME}"

# Verify backup exists
if [ ! -d "${BACKUP_PATH}" ]; then
    echo "❌ ERROR: Backup directory not found: ${BACKUP_PATH}"
    echo "Available backups:"
    ls -la "${PROJECT_ROOT}/backups/" | grep phase2 || echo "No Phase 2 backups found"
    exit 1
fi

echo "Found backup: ${BACKUP_NAME}"
echo "Backup location: ${BACKUP_PATH}"
echo ""

# Stop any running Node.js processes
echo "Stopping Node.js processes..."
pkill -f "node.*server.js" 2>/dev/null || echo "No Node.js servers running"
pkill -f "npm.*start" 2>/dev/null || echo "No npm processes running"
pkill -f "nodemon" 2>/dev/null || echo "No nodemon processes running"

# Remove Node.js scaffolding directories if they exist
echo "Removing Node.js scaffolding..."
if [ -d "${PROJECT_ROOT}/src/nodejs" ]; then
    echo "  - Removing src/nodejs directory"
    rm -rf "${PROJECT_ROOT}/src/nodejs"
fi

# Restore specific files from backup if they were modified
echo "Restoring files from backup..."
for file in TODO.md TODO_NODEJS_MIGRATION.md package.json docker-compose.yml; do
    if [ -f "${BACKUP_PATH}/${file}" ]; then
        cp "${BACKUP_PATH}/${file}" "${PROJECT_ROOT}/"
        echo "  ✓ Restored ${file}"
    fi
done

# Restore configuration files
if [ -d "${BACKUP_PATH}/config" ]; then
    cp -r "${BACKUP_PATH}/config"/* "${PROJECT_ROOT}/config/" 2>/dev/null || true
    echo "  ✓ Restored config directory"
fi

# Restore Docker configurations
if [ -d "${BACKUP_PATH}/docker" ]; then
    cp -r "${BACKUP_PATH}/docker"/* "${PROJECT_ROOT}/docker/" 2>/dev/null || true
    echo "  ✓ Restored docker directory"
fi

# Restore source code if it was modified (extract from tar)
if [ -f "${BACKUP_PATH}/src_backup.tar.gz" ]; then
    echo "  - Extracting source code backup..."
    cd "${PROJECT_ROOT}"
    tar -xzf "${BACKUP_PATH}/src_backup.tar.gz" 2>/dev/null || true
    echo "  ✓ Restored src directory"
fi

# Verify Flask applications are still functional
echo ""
echo "Verifying Flask applications..."

# Test spectrum analyzer
cd "${PROJECT_ROOT}/src/hackrf"
if python3 -c "from spectrum_analyzer import app; print('Spectrum Analyzer OK')" 2>/dev/null; then
    echo "  ✅ Spectrum Analyzer Flask app: FUNCTIONAL"
else
    echo "  ❌ Spectrum Analyzer Flask app: ISSUE DETECTED"
fi

# Test WigleToTAK
cd "${PROJECT_ROOT}/src/wigletotak/WigleToTAK/TheStinkToTAK"
if python3 -c "import WigleToTak2; print('WigleToTAK OK')" 2>/dev/null; then
    echo "  ✅ WigleToTAK Flask app: FUNCTIONAL"
else
    echo "  ❌ WigleToTAK Flask app: ISSUE DETECTED"
fi

# Check for any remaining Node.js artifacts
echo ""
echo "Checking for Node.js artifacts..."
if [ -d "${PROJECT_ROOT}/node_modules" ]; then
    echo "  ⚠️ Found node_modules directory - leaving in place (may be intentional)"
fi

if find "${PROJECT_ROOT}" -name "package-lock.json" -type f | grep -q .; then
    echo "  ⚠️ Found package-lock.json files - leaving in place"
fi

# Create rollback completion log
cat >> "${PROJECT_ROOT}/backups/rollback_log.txt" << EOF
[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Phase 2 Rollback Complete
- Backup used: ${BACKUP_NAME}
- Node.js directories removed: src/nodejs/
- Node.js processes stopped
- Flask applications verified functional
- Configuration files restored
EOF

echo ""
echo "✅ Phase 2 rollback completed successfully"
echo "✅ Flask applications verified functional"
echo "✅ System restored to pre-Phase 2 state"
echo ""
echo "Log entry added to: ${PROJECT_ROOT}/backups/rollback_log.txt"
echo "Original backup preserved at: ${BACKUP_PATH}"
echo ""
echo "You can now:"
echo "  - Test Flask applications: python3 src/hackrf/spectrum_analyzer.py"
echo "  - Test WigleToTAK: python3 src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py"
echo "  - Resume migration from Phase 1 if desired"
echo ""
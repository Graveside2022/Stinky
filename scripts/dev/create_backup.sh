#!/bin/bash

# create_backup.sh - Comprehensive backup system for Stinkster project
# Usage: ./create_backup.sh "backup_reason"

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
DATE_STAMP=$(date +%Y-%m-%d)
REASON="${1:-manual_backup}"

echo "=== Stinkster Project Backup System ==="
echo "User: Christian"
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Reason: ${REASON}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Find next version number for today
VERSION=1
while [ -d "${BACKUP_DIR}/${REASON}_${DATE_STAMP}_v${VERSION}" ]; do
    VERSION=$((VERSION + 1))
done

BACKUP_NAME="${REASON}_${DATE_STAMP}_v${VERSION}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "Creating backup: ${BACKUP_NAME}"
mkdir -p "${BACKUP_PATH}"

# Core project files
echo "Backing up core project files..."
for file in TODO.md TODO_NODEJS_MIGRATION.md CLAUDE.md HANDOFF.md package.json docker-compose.yml; do
    [ -f "${PROJECT_ROOT}/${file}" ] && cp "${PROJECT_ROOT}/${file}" "${BACKUP_PATH}/" && echo "  ✓ ${file}"
done

# Configuration files
echo "Backing up configuration files..."
mkdir -p "${BACKUP_PATH}/config"
if [ -d "${PROJECT_ROOT}/config" ]; then
    cp -r "${PROJECT_ROOT}/config"/* "${BACKUP_PATH}/config/" 2>/dev/null || true
    echo "  ✓ config directory"
fi

# Docker configurations
echo "Backing up Docker configurations..."
mkdir -p "${BACKUP_PATH}/docker"
if [ -d "${PROJECT_ROOT}/docker" ]; then
    cp -r "${PROJECT_ROOT}/docker"/* "${BACKUP_PATH}/docker/" 2>/dev/null || true
    echo "  ✓ docker directory"
fi

# Source code
echo "Backing up source code..."
mkdir -p "${BACKUP_PATH}/src"
if [ -d "${PROJECT_ROOT}/src" ]; then
    # Create tar archive for source code to preserve permissions
    tar -czf "${BACKUP_PATH}/src_backup.tar.gz" -C "${PROJECT_ROOT}" src/ 2>/dev/null || true
    echo "  ✓ src directory (archived)"
fi

# Systemd services
echo "Backing up systemd services..."
mkdir -p "${BACKUP_PATH}/systemd"
if [ -d "${PROJECT_ROOT}/systemd" ]; then
    cp -r "${PROJECT_ROOT}/systemd"/* "${BACKUP_PATH}/systemd/" 2>/dev/null || true
    echo "  ✓ systemd directory"
fi

# Documentation
echo "Backing up documentation..."
mkdir -p "${BACKUP_PATH}/docs"
if [ -d "${PROJECT_ROOT}/docs" ]; then
    cp -r "${PROJECT_ROOT}/docs"/* "${BACKUP_PATH}/docs/" 2>/dev/null || true
    echo "  ✓ docs directory"
fi

# Current git state
echo "Backing up git state..."
if [ -d "${PROJECT_ROOT}/.git" ]; then
    cd "${PROJECT_ROOT}"
    git status --porcelain > "${BACKUP_PATH}/git_status.txt" 2>/dev/null || true
    git branch --show-current > "${BACKUP_PATH}/git_branch.txt" 2>/dev/null || true
    git log --oneline -10 > "${BACKUP_PATH}/git_recent_commits.txt" 2>/dev/null || true
    echo "  ✓ git state captured"
fi

# System state
echo "Capturing system state..."
{
    echo "# System State Snapshot"
    echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "User: Christian"
    echo "Hostname: $(hostname)"
    echo ""
    echo "## Process State"
    ps aux | grep -E "(spectrum|wigle|kismet|hackrf|openwebrx)" | grep -v grep || echo "No relevant processes running"
    echo ""
    echo "## Port Usage"
    netstat -tulpn | grep -E ":8092|:8000|:8001|:6969|:8073" || echo "No services on monitored ports"
    echo ""
    echo "## Disk Usage"
    df -h "${PROJECT_ROOT}"
    echo ""
    echo "## Python Virtual Environments"
    find "${PROJECT_ROOT}" -name "venv" -type d | head -5
    echo ""
    echo "## Node.js Status"
    node --version 2>/dev/null || echo "Node.js not installed"
    npm --version 2>/dev/null || echo "npm not available"
} > "${BACKUP_PATH}/system_state.txt"

# Create backup metadata
cat > "${BACKUP_PATH}/backup_info.txt" << EOF
# Backup Information
Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)
User: Christian
Reason: ${REASON}
Version: ${BACKUP_NAME}
Project Root: ${PROJECT_ROOT}
Backup Path: ${BACKUP_PATH}

## Contents
- Core project files (TODO.md, CLAUDE.md, etc.)
- Configuration files (config/, docker/)
- Source code (archived as src_backup.tar.gz)
- Systemd service files
- Documentation
- Git state snapshot
- System state snapshot

## File Count
- Total files: $(find "${BACKUP_PATH}" -type f | wc -l)
- Total size: $(du -sh "${BACKUP_PATH}" | cut -f1)

## Git Status
- Current branch: $(cd "${PROJECT_ROOT}" && git branch --show-current 2>/dev/null || echo "unknown")
- Uncommitted changes: $(cd "${PROJECT_ROOT}" && git status --porcelain | wc -l)

## Services State
- Running processes: $(ps aux | grep -E "(spectrum|wigle)" | grep -v grep | wc -l)
- Active ports: $(netstat -tulpn | grep -E ":8092|:8000" | wc -l)
EOF

# Log backup creation
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ${BACKUP_NAME} - ${REASON}" >> "${BACKUP_DIR}/backup_log.txt"

# Cleanup old backups (keep last 30 days)
echo "Cleaning up old backups..."
find "${BACKUP_DIR}" -type d -name "*_20*_v*" -mtime +30 -exec rm -rf {} + 2>/dev/null || true

# Update last backup timestamp
touch "${BACKUP_DIR}/.last_scheduled_backup"

echo ""
echo "✓ Backup created successfully: ${BACKUP_NAME}"
echo "✓ Backup location: ${BACKUP_PATH}"
echo "✓ Total size: $(du -sh "${BACKUP_PATH}" | cut -f1)"
echo "✓ Files backed up: $(find "${BACKUP_PATH}" -type f | wc -l)"
echo ""
echo "Backup log: ${BACKUP_DIR}/backup_log.txt"
echo "System state: ${BACKUP_PATH}/system_state.txt"
echo ""
#!/bin/bash

# Architecture Documentation Link Verification Script
# Verifies all cross-references and navigation links in the architecture documentation

set -e

DOCS_ROOT="/home/pi/projects/stinkster/docs/architecture"
LINK_ERRORS=0

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[ERROR] $1" >&2
    LINK_ERRORS=$((LINK_ERRORS + 1))
}

check_file_exists() {
    local file_path="$1"
    local referring_file="$2"
    
    if [ ! -f "$file_path" ]; then
        error "Missing file: $file_path (referenced from $referring_file)"
        return 1
    fi
    return 0
}

check_markdown_links() {
    local file="$1"
    local base_dir="$(dirname "$file")"
    
    log "Checking links in: $file"
    
    # Extract markdown links [text](path)
    grep -oE '\[([^\]]+)\]\(([^)]+)\)' "$file" | while read -r link; do
        # Extract the URL part
        url=$(echo "$link" | sed -E 's/\[([^\]]+)\]\(([^)]+)\)/\2/')
        
        # Skip external URLs
        if [[ "$url" =~ ^https?:// ]]; then
            continue
        fi
        
        # Skip anchors within the same document
        if [[ "$url" =~ ^# ]]; then
            continue
        fi
        
        # Resolve relative path
        if [[ "$url" =~ ^\./ ]]; then
            # Remove leading ./
            url="${url#./}"
            target_path="$base_dir/$url"
        elif [[ "$url" =~ ^\.\.\/ ]]; then
            # Handle ../ paths
            target_path="$(cd "$base_dir" && realpath "$url" 2>/dev/null || echo "INVALID")"
        else
            # Absolute path within docs
            target_path="$DOCS_ROOT/$url"
        fi
        
        # Check if target file exists
        if [ "$target_path" != "INVALID" ] && [ ! -f "$target_path" ]; then
            error "Broken link in $file: $url -> $target_path"
        fi
    done
}

# Main verification process
log "Starting architecture documentation link verification"

# Check if docs directory exists
if [ ! -d "$DOCS_ROOT" ]; then
    error "Documentation root directory not found: $DOCS_ROOT"
    exit 1
fi

# Verify main architecture files exist
EXPECTED_FILES=(
    "README.md"
    "system-overview.md"
    "integration-overview.md"
    "subsystems/README.md"
    "subsystems/gps-subsystem.md"
    "subsystems/wifi-subsystem.md"
    "subsystems/sdr-subsystem.md"
    "subsystems/tak-subsystem.md"
    "subsystems/web-subsystem.md"
    "components/README.md"
    "components/spectrum-analyzer.md"
)

log "Verifying expected files exist..."
for file in "${EXPECTED_FILES[@]}"; do
    full_path="$DOCS_ROOT/$file"
    if ! check_file_exists "$full_path" "expected file list"; then
        continue
    fi
done

# Check all markdown files for broken links
log "Checking all markdown files for broken links..."
find "$DOCS_ROOT" -name "*.md" -type f | while read -r file; do
    check_markdown_links "$file"
done

# Verify navigation consistency
log "Verifying navigation consistency..."

# Check that all subsystem files have proper navigation
SUBSYSTEM_FILES=(
    "$DOCS_ROOT/subsystems/gps-subsystem.md"
    "$DOCS_ROOT/subsystems/wifi-subsystem.md" 
    "$DOCS_ROOT/subsystems/sdr-subsystem.md"
    "$DOCS_ROOT/subsystems/tak-subsystem.md"
    "$DOCS_ROOT/subsystems/web-subsystem.md"
)

for file in "${SUBSYSTEM_FILES[@]}"; do
    if [ -f "$file" ]; then
        if ! grep -q "## Navigation" "$file"; then
            error "Missing navigation section in: $file"
        fi
        if ! grep -q "← Back to Architecture Overview" "$file"; then
            error "Missing back link to architecture overview in: $file"
        fi
    fi
done

# Check component files
COMPONENT_FILES=(
    "$DOCS_ROOT/components/README.md"
    "$DOCS_ROOT/components/spectrum-analyzer.md"
)

for file in "${COMPONENT_FILES[@]}"; do
    if [ -f "$file" ]; then
        if ! grep -q "## Navigation" "$file"; then
            error "Missing navigation section in: $file"
        fi
    fi
done

# Verify cross-references between levels
log "Verifying cross-references between architecture levels..."

# System overview should reference all subsystems
SYSTEM_OVERVIEW="$DOCS_ROOT/system-overview.md"
if [ -f "$SYSTEM_OVERVIEW" ]; then
    for subsystem in gps wifi sdr tak web; do
        if ! grep -qi "$subsystem" "$SYSTEM_OVERVIEW"; then
            error "System overview missing reference to $subsystem subsystem"
        fi
    done
fi

# Integration overview should reference all subsystems
INTEGRATION_OVERVIEW="$DOCS_ROOT/integration-overview.md"
if [ -f "$INTEGRATION_OVERVIEW" ]; then
    for subsystem in gps wifi sdr tak web; do
        if ! grep -qi "$subsystem" "$INTEGRATION_OVERVIEW"; then
            error "Integration overview missing reference to $subsystem subsystem"
        fi
    done
fi

# Check for consistent section headings
log "Verifying consistent section structure..."

REQUIRED_SECTIONS=(
    "## Overview"
    "## Navigation"
)

find "$DOCS_ROOT" -name "*.md" -type f | while read -r file; do
    for section in "${REQUIRED_SECTIONS[@]}"; do
        if ! grep -q "^$section" "$file"; then
            error "Missing required section '$section' in: $file"
        fi
    done
done

# Summary
log "Link verification completed"
if [ $LINK_ERRORS -eq 0 ]; then
    log "✓ All links verified successfully - no broken links found"
    exit 0
else
    error "✗ Found $LINK_ERRORS link errors"
    exit 1
fi
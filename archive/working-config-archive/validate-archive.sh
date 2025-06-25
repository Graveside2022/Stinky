#!/bin/bash
# Working Configuration Archive Validation Script
# Validates the completeness and integrity of the working configuration archive

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK") echo -e "${GREEN}✓${NC} $message" ;;
        "WARN") echo -e "${YELLOW}⚠${NC} $message" ;;
        "ERROR") echo -e "${RED}✗${NC} $message" ;;
        "INFO") echo -e "${BLUE}ℹ${NC} $message" ;;
    esac
}

echo "=== Working Configuration Archive Validation ==="
echo "Validating completeness and integrity of OpenWebRX HackRF configuration archive"
echo

# Change to archive directory
cd "$(dirname "$0")"

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

check_file() {
    local file=$1
    local description=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -f "$file" ]; then
        print_status "OK" "$description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        print_status "ERROR" "$description (missing: $file)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

check_json() {
    local file=$1
    local description=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -f "$file" ]; then
        if command -v jq >/dev/null 2>&1; then
            if jq '.' "$file" >/dev/null 2>&1; then
                print_status "OK" "$description (valid JSON)"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
                return 0
            else
                print_status "ERROR" "$description (invalid JSON: $file)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                return 1
            fi
        else
            print_status "WARN" "$description (jq not available, syntax not validated)"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            return 0
        fi
    else
        print_status "ERROR" "$description (missing: $file)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

check_executable() {
    local file=$1
    local description=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -f "$file" ]; then
        if [ -x "$file" ]; then
            print_status "OK" "$description (executable)"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            return 0
        else
            print_status "WARN" "$description (not executable, run: chmod +x $file)"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            return 0
        fi
    else
        print_status "ERROR" "$description (missing: $file)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

echo "1. Checking Core Documentation..."
check_file "README.md" "Main archive documentation"
check_file "TEMPLATE_GUIDE.md" "Configuration templates and examples"
check_file "ARCHIVE_INDEX.md" "Complete archive index"

echo ""
echo "2. Checking Docker Configuration..."
check_file "docker/README.md" "Docker configuration documentation"
check_file "docker/docker-compose.yml" "Docker Compose configuration"

echo ""
echo "3. Checking JSON Configurations..."
check_file "json-configs/README.md" "JSON configuration documentation"
check_json "json-configs/sdrs.json" "SDR device configuration"
check_json "json-configs/settings.json" "OpenWebRX application settings"
check_json "json-configs/users.json" "User authentication configuration"
check_json "json-configs/openwebrx-hackrf-config.json" "Alternative HackRF configuration"

echo ""
echo "4. Checking Legacy Configuration..."
check_file "legacy-config/README.md" "Legacy configuration documentation"
check_file "legacy-config/config_webrx_hackrf.py" "Original Python configuration"
check_json "legacy-config/sdrs.json" "Legacy SDR configuration"
check_json "legacy-config/settings.json" "Legacy application settings"
check_json "legacy-config/users.json" "Legacy user authentication"

echo ""
echo "5. Checking Scripts..."
check_file "scripts/README.md" "Scripts documentation"
check_executable "scripts/start-openwebrx.sh" "Service startup script"
check_executable "scripts/build-openwebrx-hackrf.sh" "Container build script"

echo ""
echo "6. Checking Dockerfile Configuration..."
check_file "dockerfile-configs/README.md" "Dockerfile documentation"
check_file "dockerfile-configs/Dockerfile" "Custom OpenWebRX container build"

echo ""
echo "7. Validating Configuration Content..."

# Check critical configuration elements in sdrs.json
if [ -f "json-configs/sdrs.json" ]; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if command -v jq >/dev/null 2>&1; then
        if jq -e '.sdrs.hackrf.type == "hackrf"' json-configs/sdrs.json >/dev/null 2>&1; then
            print_status "OK" "SDR configuration uses native HackRF driver"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            print_status "ERROR" "SDR configuration missing native HackRF driver"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    fi
fi

# Check for HackRF gain format in profiles
if [ -f "json-configs/sdrs.json" ]; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if command -v jq >/dev/null 2>&1; then
        if jq -e '.sdrs.hackrf.profiles | to_entries[0].value.rf_gain | test("VGA=.*,LNA=.*,AMP=")' json-configs/sdrs.json >/dev/null 2>&1; then
            print_status "OK" "RF gain settings use correct HackRF format"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            print_status "ERROR" "RF gain settings not in HackRF format"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    fi
fi

# Check Docker Compose has privileged mode
if [ -f "docker/docker-compose.yml" ]; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if grep -q "privileged: true" docker/docker-compose.yml; then
        print_status "OK" "Docker Compose has privileged mode enabled"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_status "ERROR" "Docker Compose missing privileged mode"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
fi

# Check Docker Compose has USB device mounting
if [ -f "docker/docker-compose.yml" ]; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if grep -q "/dev/bus/usb:/dev/bus/usb" docker/docker-compose.yml; then
        print_status "OK" "Docker Compose has USB device mounting"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_status "ERROR" "Docker Compose missing USB device mounting"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
fi

echo ""
echo "8. Checking Archive Completeness..."

# Count files in each category
CONFIG_FILES=$(find json-configs -name "*.json" 2>/dev/null | wc -l)
SCRIPT_FILES=$(find scripts -name "*.sh" 2>/dev/null | wc -l)
DOC_FILES=$(find . -name "README.md" 2>/dev/null | wc -l)
LEGACY_FILES=$(find legacy-config -type f 2>/dev/null | wc -l)

print_status "INFO" "Archive contains $CONFIG_FILES JSON configs, $SCRIPT_FILES scripts, $DOC_FILES docs, $LEGACY_FILES legacy files"

# Check minimum required files
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $CONFIG_FILES -ge 4 ] && [ $SCRIPT_FILES -ge 2 ] && [ $DOC_FILES -ge 5 ]; then
    print_status "OK" "Archive contains minimum required files"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_status "ERROR" "Archive missing required files"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""
echo "9. Deployment Readiness Check..."

# Check if this could be deployed immediately
DEPLOYMENT_READY=true

if [ ! -f "docker/docker-compose.yml" ]; then
    DEPLOYMENT_READY=false
fi

if [ ! -f "json-configs/sdrs.json" ] || [ ! -f "json-configs/settings.json" ] || [ ! -f "json-configs/users.json" ]; then
    DEPLOYMENT_READY=false
fi

if [ ! -f "scripts/start-openwebrx.sh" ]; then
    DEPLOYMENT_READY=false
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ "$DEPLOYMENT_READY" = true ]; then
    print_status "OK" "Archive is ready for immediate deployment"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_status "ERROR" "Archive missing files required for deployment"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""
echo "=== Validation Summary ==="
echo "Total checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
else
    echo -e "Failed: ${GREEN}0${NC}"
fi

SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo "Success rate: $SUCCESS_RATE%"

echo ""
if [ $FAILED_CHECKS -eq 0 ]; then
    print_status "OK" "Archive validation passed completely"
    echo ""
    echo "=== Quick Deployment Guide ==="
    echo "1. Copy archive to target system"
    echo "2. cd working-config-archive"
    echo "3. chmod +x scripts/*.sh"
    echo "4. ./scripts/start-openwebrx.sh"
    echo "5. Access http://localhost:8073 (admin/hackrf)"
    
    exit 0
else
    print_status "ERROR" "Archive validation failed - fix errors before deployment"
    echo ""
    echo "=== Fix Required Issues ==="
    echo "Review the errors above and:"
    echo "1. Ensure all required files are present"
    echo "2. Validate JSON syntax with: jq '.' filename.json"
    echo "3. Make scripts executable with: chmod +x scripts/*.sh"
    echo "4. Re-run validation: ./validate-archive.sh"
    
    exit 1
fi
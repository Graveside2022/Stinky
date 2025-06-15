#!/bin/bash
# Simple Wire Diagram Documentation Structure Verification

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Wire Diagram Documentation Structure Verification${NC}"
echo

CHECKS=0
PASSED=0

check_item() {
    local item="$1"
    local type="$2"
    CHECKS=$((CHECKS + 1))
    
    if [ "$type" = "file" ] && [ -f "$item" ]; then
        echo -e "${GREEN}✓${NC} $item"
        PASSED=$((PASSED + 1))
    elif [ "$type" = "dir" ] && [ -d "$item" ]; then
        echo -e "${GREEN}✓${NC} $item/"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $item (missing)"
    fi
}

echo "Checking directories:"
check_item "core-flows" "dir"
check_item "component-details" "dir"
check_item "integration-patterns" "dir"
check_item "templates" "dir"

echo
echo "Checking main files:"
check_item "legend.md" "file"
check_item "mermaid-styles.css" "file"

echo
echo "Checking templates:"
check_item "templates/component-template.md" "file"
check_item "templates/flow-template.md" "file"
check_item "templates/integration-template.md" "file"
check_item "templates/README.md" "file"

echo
echo "Checking README files:"
check_item "core-flows/README.md" "file"
check_item "component-details/README.md" "file"
check_item "integration-patterns/README.md" "file"
check_item "../README.md" "file"

echo
echo "Summary: $PASSED/$CHECKS checks passed"

if [ $PASSED -eq $CHECKS ]; then
    echo -e "${GREEN}All structure checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some items are missing.${NC}"
    exit 1
fi
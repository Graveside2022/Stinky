#!/bin/bash
# Wire Diagram Documentation Structure Verification
# Verifies that all required files and directories are in place

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Wire Diagram Documentation Structure Verification ===${NC}"
echo

# Base directory
BASE_DIR="/home/pi/projects/stinkster/docs/architecture/wire-diagrams"
cd "$BASE_DIR" || {
    echo -e "${RED}ERROR: Cannot access base directory $BASE_DIR${NC}"
    exit 1
}

# Track verification results
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Function to check file existence
check_file() {
    local file="$1"
    local description="$2"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description: $file"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}✗${NC} $description: $file ${RED}(MISSING)${NC}"
    fi
}

# Function to check directory existence
check_directory() {
    local dir="$1"
    local description="$2"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description: $dir/"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}✗${NC} $description: $dir/ ${RED}(MISSING)${NC}"
    fi
}

# Function to validate Mermaid syntax in markdown files
validate_mermaid() {
    local file="$1"
    if [ -f "$file" ]; then
        if grep -q "```mermaid" "$file"; then
            echo -e "${BLUE}  → Contains Mermaid diagrams${NC}"
        fi
    fi
}

echo -e "${YELLOW}Checking Core Directory Structure...${NC}"

# Check main directories
check_directory "core-flows" "Core Flows Directory"
check_directory "component-details" "Component Details Directory"
check_directory "integration-patterns" "Integration Patterns Directory"
check_directory "templates" "Templates Directory"

echo
echo -e "${YELLOW}Checking Core Documentation Files...${NC}"

# Check main documentation files
check_file "legend.md" "Documentation Legend"
check_file "mermaid-styles.css" "Mermaid CSS Styles"
check_file "verify-structure.sh" "Structure Verification Script"

echo
echo -e "${YELLOW}Checking Template Files...${NC}"

# Check template files
check_file "templates/component-template.md" "Component Template"
check_file "templates/flow-template.md" "Flow Template"
check_file "templates/integration-template.md" "Integration Template"
check_file "templates/README.md" "Templates Documentation"

echo
echo -e "${YELLOW}Checking README Files...${NC}"

# Check README files
check_file "core-flows/README.md" "Core Flows Documentation"
check_file "component-details/README.md" "Component Details Documentation"
check_file "integration-patterns/README.md" "Integration Patterns Documentation"
check_file "../README.md" "Architecture Overview"

echo
echo -e "${YELLOW}Checking File Content Quality...${NC}"

# Content quality checks
CONTENT_CHECKS=0
CONTENT_PASSED=0

# Check for proper Mermaid diagram syntax
if [ -d "templates" ]; then
    for template in templates/*.md; do
        if [ -f "$template" ]; then
            CONTENT_CHECKS=$((CONTENT_CHECKS + 1))
            if grep -q "mermaid" "$template"; then
                echo -e "${GREEN}✓${NC} Mermaid syntax in $(basename "$template")"
                CONTENT_PASSED=$((CONTENT_PASSED + 1))
            else
                echo -e "${RED}✗${NC} Missing Mermaid syntax in $(basename "$template")"
            fi
        fi
    done
fi

# Check for standard color class usage
CONTENT_CHECKS=$((CONTENT_CHECKS + 1))
if ls templates/*.md >/dev/null 2>&1 && grep -q "gps-data\|wifi-data\|rf-data\|tak-data\|system-process\|software\|hardware\|docker\|webapp" templates/*.md 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Standard color classes used in templates"
    CONTENT_PASSED=$((CONTENT_PASSED + 1))
else
    echo -e "${RED}✗${NC} Standard color classes not found in templates"
fi

# Check for cross-reference sections
CONTENT_CHECKS=$((CONTENT_CHECKS + 1))
if grep -q "Cross References\|Related Documentation" templates/*.md; then
    echo -e "${GREEN}✓${NC} Cross-reference sections present in templates"
    CONTENT_PASSED=$((CONTENT_PASSED + 1))
else
    echo -e "${RED}✗${NC} Cross-reference sections missing from templates"
fi

echo
echo -e "${YELLOW}Checking CSS File Structure...${NC}"

# Check CSS content
CONTENT_CHECKS=$((CONTENT_CHECKS + 1))
if [ -f "mermaid-styles.css" ] && grep -q "gps-data\|wifi-data\|rf-data" mermaid-styles.css; then
    echo -e "${GREEN}✓${NC} CSS contains standard data type styles"
    CONTENT_PASSED=$((CONTENT_PASSED + 1))
else
    echo -e "${RED}✗${NC} CSS missing standard data type styles"
fi

CONTENT_CHECKS=$((CONTENT_CHECKS + 1))
if [ -f "mermaid-styles.css" ] && grep -q "@media\|@keyframes" mermaid-styles.css; then
    echo -e "${GREEN}✓${NC} CSS includes responsive and animation features"
    CONTENT_PASSED=$((CONTENT_PASSED + 1))
else
    echo -e "${RED}✗${NC} CSS missing responsive/animation features"
fi

echo
echo -e "${YELLOW}Checking Documentation Standards...${NC}"

# Check legend file content
CONTENT_CHECKS=$((CONTENT_CHECKS + 1))
if [ -f "legend.md" ] && grep -q "Color Scheme\|Standard Symbols\|Mermaid Diagram Standards" legend.md; then
    echo -e "${GREEN}✓${NC} Legend contains required sections"
    CONTENT_PASSED=$((CONTENT_PASSED + 1))
else
    echo -e "${RED}✗${NC} Legend missing required sections"
fi

# Check for version control information
CONTENT_CHECKS=$((CONTENT_CHECKS + 1))
version_files=0
for file in templates/*.md legend.md; do
    if [ -f "$file" ] && grep -q "Document Version\|Last Updated\|Version Control" "$file"; then
        version_files=$((version_files + 1))
    fi
done

if [ $version_files -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Version control information present ($version_files files)"
    CONTENT_PASSED=$((CONTENT_PASSED + 1))
else
    echo -e "${RED}✗${NC} Version control information missing"
fi

echo
echo -e "${YELLOW}File Size and Structure Analysis...${NC}"

# Analyze file sizes
echo "File sizes:"
find . -name "*.md" -exec ls -lh {} \; | awk '{print $5 "\t" $9}' | sort -hr

echo
echo "Directory structure:"
tree -a -I ".git" . 2>/dev/null || find . -type d | sort

echo
echo -e "${YELLOW}Cross-Reference Validation...${NC}"

# Check for broken internal links (basic check)
CONTENT_CHECKS=$((CONTENT_CHECKS + 1))
broken_links=0
for file in $(find . -name "*.md"); do
    # Look for markdown links to other documentation files
    while IFS= read -r line; do
        if [[ $line =~ \[.*\]\(([^)]+\.md[^)]*)\) ]]; then
            link="${BASH_REMATCH[1]}"
            # Remove anchor fragments
            file_path="${link%%#*}"
            # Resolve relative path
            if [[ ! $file_path =~ ^/ ]]; then
                dir=$(dirname "$file")
                target="$dir/$file_path"
            else
                target="$file_path"
            fi
            
            if [ ! -f "$target" ]; then
                echo -e "${RED}✗${NC} Broken link in $file: $link"
                broken_links=$((broken_links + 1))
            fi
        fi
    done < "$file"
done

if [ $broken_links -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No broken internal links found"
    CONTENT_PASSED=$((CONTENT_PASSED + 1))
else
    echo -e "${RED}✗${NC} Found $broken_links broken internal links"
fi

echo
echo -e "${BLUE}=== Verification Summary ===${NC}"

# Calculate totals
TOTAL_ALL=$((TOTAL_CHECKS + CONTENT_CHECKS))
PASSED_ALL=$((PASSED_CHECKS + CONTENT_PASSED))

echo -e "Structure checks: ${PASSED_CHECKS}/${TOTAL_CHECKS}"
echo -e "Content checks: ${CONTENT_PASSED}/${CONTENT_CHECKS}"
echo -e "Total: ${PASSED_ALL}/${TOTAL_ALL}"

# Calculate percentage
if [ $TOTAL_ALL -gt 0 ]; then
    percentage=$((PASSED_ALL * 100 / TOTAL_ALL))
    echo -e "Success rate: ${percentage}%"
    
    if [ $percentage -eq 100 ]; then
        echo -e "${GREEN}✓ All checks passed! Documentation structure is complete.${NC}"
        exit 0
    elif [ $percentage -ge 80 ]; then
        echo -e "${YELLOW}⚠ Most checks passed. Minor issues to address.${NC}"
        exit 1
    else
        echo -e "${RED}✗ Significant issues found. Documentation structure needs attention.${NC}"
        exit 2
    fi
else
    echo -e "${RED}✗ No checks performed. Verification script may have issues.${NC}"
    exit 3
fi
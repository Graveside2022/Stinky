#!/bin/bash

# GitHub Metadata Verification Script
# Checks for GitHub community standards compliance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✓${NC} $message"
            ((PASSED++))
            ;;
        "FAIL")
            echo -e "${RED}✗${NC} $message"
            ((FAILED++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            ((WARNINGS++))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

echo -e "${BLUE}=== GitHub Repository Metadata Verification ===${NC}\n"

# Check required files
echo -e "${BLUE}Checking Required Files:${NC}"

required_files=(
    "README.md"
    "LICENSE" 
    "CONTRIBUTING.md"
    "SECURITY.md"
    ".gitignore"
    ".env.example"
    "package.json"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        print_status "PASS" "Found $file"
    else
        print_status "FAIL" "Missing $file"
    fi
done

# Check GitHub directory structure
echo -e "\n${BLUE}Checking GitHub Directory Structure:${NC}"

github_files=(
    ".github/ISSUE_TEMPLATE/bug_report.md"
    ".github/ISSUE_TEMPLATE/feature_request.md"
    ".github/ISSUE_TEMPLATE/hardware_support.md"
    ".github/ISSUE_TEMPLATE/config.yml"
    ".github/pull_request_template.md"
    ".github/workflows/ci.yml"
    ".github/CODE_OF_CONDUCT.md"
    ".github/FUNDING.yml"
    ".github/dependabot.yml"
)

for file in "${github_files[@]}"; do
    if [[ -f "$file" ]]; then
        print_status "PASS" "Found $file"
    else
        print_status "FAIL" "Missing $file"
    fi
done

# Check README.md content
echo -e "\n${BLUE}Checking README.md Content:${NC}"

if [[ -f "README.md" ]]; then
    # Check for badges
    if grep -q "badge" README.md; then
        print_status "PASS" "README contains status badges"
    else
        print_status "WARN" "README missing status badges"
    fi
    
    # Check for installation instructions
    if grep -qi "installation\|install" README.md; then
        print_status "PASS" "README contains installation instructions"
    else
        print_status "FAIL" "README missing installation instructions"
    fi
    
    # Check for usage examples
    if grep -qi "usage\|example\|quick start" README.md; then
        print_status "PASS" "README contains usage examples"
    else
        print_status "WARN" "README missing usage examples"
    fi
    
    # Check for legal notice
    if grep -qi "legal\|license\|compliance\|regulatory" README.md; then
        print_status "PASS" "README contains legal/compliance information"
    else
        print_status "FAIL" "README missing legal/compliance information"
    fi
    
    # Check for contribution guidelines reference
    if grep -qi "contributing" README.md; then
        print_status "PASS" "README references contribution guidelines"
    else
        print_status "WARN" "README missing contribution guidelines reference"
    fi
else
    print_status "FAIL" "README.md not found"
fi

# Check LICENSE file
echo -e "\n${BLUE}Checking LICENSE File:${NC}"

if [[ -f "LICENSE" ]]; then
    if grep -qi "mit\|apache\|gpl\|bsd" LICENSE; then
        print_status "PASS" "LICENSE contains recognized license text"
    else
        print_status "WARN" "LICENSE may not contain standard license"
    fi
    
    if grep -qi "third.party\|mixed.license" LICENSE; then
        print_status "PASS" "LICENSE addresses third-party components"
    else
        print_status "WARN" "LICENSE may not address third-party components"
    fi
    
    if grep -qi "regulatory\|compliance\|rf\|radio" LICENSE; then
        print_status "PASS" "LICENSE includes regulatory warnings"
    else
        print_status "WARN" "LICENSE missing regulatory warnings"
    fi
else
    print_status "FAIL" "LICENSE file not found"
fi

# Check .gitignore comprehensiveness
echo -e "\n${BLUE}Checking .gitignore Coverage:${NC}"

if [[ -f ".gitignore" ]]; then
    gitignore_patterns=(
        "*.log"
        "venv/"
        "__pycache__/"
        ".env"
        "*.pid"
        "node_modules/"
        ".DS_Store"
        "*.tmp"
    )
    
    for pattern in "${gitignore_patterns[@]}"; do
        if grep -q "$pattern" .gitignore; then
            print_status "PASS" ".gitignore includes $pattern"
        else
            print_status "WARN" ".gitignore missing $pattern"
        fi
    done
else
    print_status "FAIL" ".gitignore not found"
fi

# Check package.json metadata
echo -e "\n${BLUE}Checking package.json Metadata:${NC}"

if [[ -f "package.json" ]]; then
    # Check for required fields
    required_fields=("name" "version" "description" "license" "repository")
    
    for field in "${required_fields[@]}"; do
        if grep -q "\"$field\":" package.json; then
            print_status "PASS" "package.json contains $field"
        else
            print_status "FAIL" "package.json missing $field"
        fi
    done
    
    # Check for scripts
    if grep -q "\"scripts\":" package.json; then
        print_status "PASS" "package.json contains npm scripts"
    else
        print_status "WARN" "package.json missing npm scripts"
    fi
    
    # Check for keywords
    if grep -q "\"keywords\":" package.json; then
        print_status "PASS" "package.json contains keywords"
    else
        print_status "WARN" "package.json missing keywords"
    fi
else
    print_status "FAIL" "package.json not found"
fi

# Check environment configuration
echo -e "\n${BLUE}Checking Environment Configuration:${NC}"

if [[ -f ".env.example" ]]; then
    print_status "PASS" "Found .env.example file"
    
    # Check for common configuration categories
    config_categories=("HACKRF" "WIFI" "GPS" "LOG" "PORT")
    
    for category in "${config_categories[@]}"; do
        if grep -qi "$category" .env.example; then
            print_status "PASS" ".env.example includes $category configuration"
        else
            print_status "WARN" ".env.example missing $category configuration"
        fi
    done
else
    print_status "FAIL" ".env.example not found"
fi

# Check for sensitive information
echo -e "\n${BLUE}Checking for Sensitive Information:${NC}"

# Check for potential secrets in common files
sensitive_patterns=("password.*=" "api.key.*=" "secret.*=" "token.*=")
sensitive_files=("README.md" "package.json" ".env.example" "docker-compose.yml")

found_sensitive=false
for file in "${sensitive_files[@]}"; do
    if [[ -f "$file" ]]; then
        for pattern in "${sensitive_patterns[@]}"; do
            if grep -i "$pattern" "$file" | grep -v "example\|template\|TODO\|FIXME\|your-\|placeholder" > /dev/null; then
                print_status "WARN" "Potential sensitive data in $file: $(grep -i "$pattern" "$file" | head -1)"
                found_sensitive=true
            fi
        done
    fi
done

if [[ "$found_sensitive" == false ]]; then
    print_status "PASS" "No obvious sensitive information found"
fi

# Check CI/CD configuration
echo -e "\n${BLUE}Checking CI/CD Configuration:${NC}"

if [[ -f ".github/workflows/ci.yml" ]]; then
    print_status "PASS" "Found CI workflow configuration"
    
    # Check for common CI jobs
    ci_jobs=("test" "lint" "security" "build")
    
    for job in "${ci_jobs[@]}"; do
        if grep -qi "$job" .github/workflows/ci.yml; then
            print_status "PASS" "CI includes $job job"
        else
            print_status "WARN" "CI missing $job job"
        fi
    done
else
    print_status "FAIL" "CI workflow configuration not found"
fi

# Check security configuration
echo -e "\n${BLUE}Checking Security Configuration:${NC}"

if [[ -f "SECURITY.md" ]]; then
    security_sections=("reporting" "supported versions" "vulnerability" "policy")
    
    for section in "${security_sections[@]}"; do
        if grep -qi "$section" SECURITY.md; then
            print_status "PASS" "SECURITY.md includes $section information"
        else
            print_status "WARN" "SECURITY.md missing $section information"
        fi
    done
else
    print_status "FAIL" "SECURITY.md not found"
fi

# Check for regulatory compliance documentation
echo -e "\n${BLUE}Checking Regulatory Compliance:${NC}"

regulatory_files=("REGULATORY_COMPLIANCE.md" "LEGAL_QUICK_REFERENCE.md")
found_regulatory=false

for file in "${regulatory_files[@]}"; do
    if [[ -f "$file" ]]; then
        print_status "PASS" "Found regulatory documentation: $file"
        found_regulatory=true
    fi
done

if [[ "$found_regulatory" == false ]]; then
    print_status "WARN" "No dedicated regulatory compliance documentation found"
fi

# Summary
echo -e "\n${BLUE}=== Verification Summary ===${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

# Overall status
if [[ $FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✓ Repository meets GitHub community standards!${NC}"
    exit 0
elif [[ $FAILED -le 3 ]]; then
    echo -e "\n${YELLOW}⚠ Repository mostly compliant with minor issues${NC}"
    exit 1
else
    echo -e "\n${RED}✗ Repository has significant compliance issues${NC}"
    exit 2
fi
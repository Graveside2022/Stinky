#!/bin/bash
# Verify System Integration
# Checks all components are properly configured

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Stinkster System Integration Verification ===${NC}\n"

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 (missing: $1)"
        return 1
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 (missing: $1)"
        return 1
    fi
}

# Function to check Node.js package
check_npm_package() {
    if [ -f "$1/package.json" ]; then
        if [ -d "$1/node_modules" ]; then
            echo -e "${GREEN}✓${NC} $2 dependencies installed"
            return 0
        else
            echo -e "${YELLOW}⚠${NC} $2 dependencies not installed (run npm install)"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $2 package.json missing"
        return 1
    fi
}

# Track overall status
ERRORS=0

echo -e "${BLUE}1. Checking Project Structure${NC}"
check_dir "$PROJECT_ROOT/src/nodejs/kismet-operations" "Kismet Operations backend"
check_dir "$PROJECT_ROOT/src/nodejs/wigle-to-tak" "WigleToTAK backend"
check_dir "$PROJECT_ROOT/src/nodejs/gps-bridge" "GPS Bridge backend"
check_dir "$PROJECT_ROOT/src/nodejs/shared" "Shared utilities"
check_dir "$PROJECT_ROOT/stinkster-ui" "Svelte frontend"

echo -e "\n${BLUE}2. Checking Configuration Files${NC}"
check_file "$PROJECT_ROOT/.env.production" "Production environment config"
check_file "$PROJECT_ROOT/src/nodejs/config/index.js" "Central configuration"
check_file "$PROJECT_ROOT/scripts/unified-startup.sh" "Unified startup script"

echo -e "\n${BLUE}3. Checking Systemd Services${NC}"
check_file "$PROJECT_ROOT/systemd/spectrum-analyzer.service" "Spectrum Analyzer service"
check_file "$PROJECT_ROOT/systemd/wigle-to-tak.service" "WigleToTAK service"
check_file "$PROJECT_ROOT/systemd/gps-bridge.service" "GPS Bridge service"
check_file "$PROJECT_ROOT/systemd/kismet-operations-center.service" "Kismet Operations service"

echo -e "\n${BLUE}4. Checking Frontend Configuration${NC}"
check_file "$PROJECT_ROOT/stinkster-ui/src/lib/config.ts" "Frontend configuration"
check_file "$PROJECT_ROOT/stinkster-ui/vite.config.hackrf.ts" "HackRF Vite config"
check_file "$PROJECT_ROOT/stinkster-ui/vite.config.wigle.ts" "Wigle Vite config"
check_file "$PROJECT_ROOT/stinkster-ui/vite.config.kismet.ts" "Kismet Vite config"

echo -e "\n${BLUE}5. Checking API Services${NC}"
check_file "$PROJECT_ROOT/stinkster-ui/src/lib/services/api/hackrf.ts" "HackRF API service"
check_file "$PROJECT_ROOT/stinkster-ui/src/lib/services/api/wigle.ts" "Wigle API service"
check_file "$PROJECT_ROOT/stinkster-ui/src/lib/services/websocket/hackrf.ts" "HackRF WebSocket service"

echo -e "\n${BLUE}6. Checking Dependencies${NC}"
check_npm_package "$PROJECT_ROOT" "Root project"
check_npm_package "$PROJECT_ROOT/src/nodejs/kismet-operations" "Kismet Operations"
check_npm_package "$PROJECT_ROOT/src/nodejs/wigle-to-tak" "WigleToTAK"
check_npm_package "$PROJECT_ROOT/stinkster-ui" "Frontend"

echo -e "\n${BLUE}7. Checking Node.js Version${NC}"
NODE_VERSION=$(node -v 2>/dev/null || echo "not installed")
if [[ "$NODE_VERSION" == v1[89]* ]] || [[ "$NODE_VERSION" == v2* ]]; then
    echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js $NODE_VERSION (requires v18+)"
    ERRORS=$((ERRORS + 1))
fi

echo -e "\n${BLUE}8. Checking Required Ports${NC}"
for port in 8092 8000 8003 2947; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC} Port $port is already in use"
    else
        echo -e "${GREEN}✓${NC} Port $port is available"
    fi
done

echo -e "\n${BLUE}9. Checking Integration Tests${NC}"
check_file "$PROJECT_ROOT/tests/integration/full-system-test.js" "Full system integration test"
check_file "$PROJECT_ROOT/src/nodejs/shared/health-check.js" "Health check middleware"

echo -e "\n${BLUE}10. Checking Documentation${NC}"
check_file "$PROJECT_ROOT/docs/FULL_SYSTEM_INTEGRATION.md" "Integration documentation"

# Summary
echo -e "\n${BLUE}=== Verification Summary ===${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! System is ready for integration.${NC}"
    echo -e "\nNext steps:"
    echo "1. Install dependencies: npm install (in each directory)"
    echo "2. Build frontends: cd stinkster-ui && npm run build:all"
    echo "3. Start services: ./scripts/unified-startup.sh start"
    echo "4. Run tests: node tests/integration/full-system-test.js"
else
    echo -e "${RED}✗ Found $ERRORS issues that need to be addressed.${NC}"
    exit 1
fi

exit 0
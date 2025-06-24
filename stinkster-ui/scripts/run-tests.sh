#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Running WigleToTAK Test Suite${NC}"
echo "=================================="

# Check if backend is running for integration tests
check_backend() {
    curl -s http://localhost:8001/api/health > /dev/null 2>&1
    return $?
}

# Run unit tests
echo -e "\n${YELLOW}📦 Running Unit Tests...${NC}"
npm run test:run

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
fi

# Run integration tests if requested
if [[ "$1" == "--integration" ]] || [[ "$1" == "--all" ]]; then
    echo -e "\n${YELLOW}🔗 Running Integration Tests...${NC}"
    
    # Start backend if not running
    if ! check_backend; then
        echo "Starting backend for integration tests..."
        cd backend && npm run start:test &
        BACKEND_PID=$!
        
        # Wait for backend to be ready
        for i in {1..30}; do
            if check_backend; then
                echo "Backend is ready"
                break
            fi
            sleep 1
        done
    fi
    
    # Run integration tests
    npm run test:integration
    INTEGRATION_EXIT_CODE=$?
    
    # Stop backend if we started it
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ $INTEGRATION_EXIT_CODE -ne 0 ]; then
        echo -e "${RED}❌ Integration tests failed${NC}"
        exit 1
    fi
fi

# Run coverage if requested
if [[ "$1" == "--coverage" ]] || [[ "$2" == "--coverage" ]]; then
    echo -e "\n${YELLOW}📊 Generating Coverage Report...${NC}"
    npm run test:coverage
    
    # Display coverage summary
    echo -e "\n${GREEN}Coverage Summary:${NC}"
    cat coverage/coverage-summary.json | \
        jq -r '.total | "Lines: \(.lines.pct)% | Statements: \(.statements.pct)% | Functions: \(.functions.pct)% | Branches: \(.branches.pct)%"'
fi

echo -e "\n${GREEN}✅ All tests passed!${NC}"

# Open coverage report if requested
if [[ "$1" == "--open-coverage" ]] || [[ "$2" == "--open-coverage" ]]; then
    echo "Opening coverage report in browser..."
    open coverage/index.html 2>/dev/null || xdg-open coverage/index.html 2>/dev/null || echo "Please open coverage/index.html manually"
fi
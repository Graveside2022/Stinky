#!/bin/bash
# Test Execution Script for Webhook Service
# Ensures all dependencies are installed and runs the complete test suite

set -e

echo "🧪 Webhook Service Test Runner"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the tests directory.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

echo "📦 Installing test dependencies..."
npm install

# Create necessary directories
mkdir -p reports
mkdir -p coverage

echo ""
echo "🔧 Running tests..."
echo ""

# Run the test suite
if npm test; then
    echo ""
    echo -e "${GREEN}✅ All tests completed successfully!${NC}"
    echo ""
    echo "📊 Test reports available at:"
    echo "   - Console output above"
    echo "   - JSON: ./reports/test-results.json"
    echo "   - Markdown: ./reports/test-results.md"
    echo "   - HTML: ./reports/test-results.html"
    echo "   - Coverage: ./coverage/lcov-report/index.html"
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi

# Optional: Open HTML report in browser
if command -v xdg-open &> /dev/null; then
    echo ""
    read -p "Would you like to open the HTML report in your browser? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open ./reports/test-results.html
    fi
elif command -v open &> /dev/null; then
    echo ""
    read -p "Would you like to open the HTML report in your browser? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open ./reports/test-results.html
    fi
fi
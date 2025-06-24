#!/bin/bash
# Quick deployment helper for Kismet Operations Center
# Combines build and deploy steps with safety checks

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}Kismet Operations Center - Quick Deploy${NC}"
echo "========================================"

# Parse arguments
SKIP_BUILD=false
SKIP_TESTS=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-build] [--skip-tests] [--force]"
            exit 1
            ;;
    esac
done

# Confirmation prompt
if [ "$FORCE" != true ]; then
    echo -e "\n${YELLOW}This will deploy Kismet Operations Center to production.${NC}"
    echo "Current settings:"
    echo "  - Skip build: $SKIP_BUILD"
    echo "  - Skip tests: $SKIP_TESTS"
    echo ""
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

# Run pre-deployment checks
echo -e "\n${YELLOW}Running pre-deployment checks...${NC}"

# Check if running as regular user for build
if [ "$SKIP_BUILD" != true ] && [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Do not run build as root. Use sudo only for deployment step.${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed${NC}"
    exit 1
fi

# Check if service is running
if systemctl is-active --quiet kismet-operations-center; then
    echo -e "${GREEN}✓ Service is currently running${NC}"
else
    echo -e "${YELLOW}! Service is not running${NC}"
fi

# Build if not skipped
if [ "$SKIP_BUILD" != true ]; then
    echo -e "\n${YELLOW}Building production version...${NC}"
    cd "$SCRIPT_DIR/.."
    
    # Install dependencies
    echo "Installing dependencies..."
    npm ci
    
    # Run tests if not skipped
    if [ "$SKIP_TESTS" != true ]; then
        echo "Running tests..."
        npm test || {
            echo -e "${RED}Tests failed!${NC}"
            if [ "$FORCE" != true ]; then
                exit 1
            fi
            echo -e "${YELLOW}Continuing despite test failures (--force)${NC}"
        }
    fi
    
    # Build
    "$SCRIPT_DIR/scripts/build-production.sh" || {
        echo -e "${RED}Build failed!${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Build completed successfully${NC}"
else
    echo -e "${YELLOW}Skipping build step${NC}"
fi

# Deploy
echo -e "\n${YELLOW}Deploying to production...${NC}"
echo "This step requires sudo privileges."

sudo "$SCRIPT_DIR/scripts/deploy.sh" deploy || {
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
}

# Post-deployment status
echo -e "\n${GREEN}Deployment completed!${NC}"
echo -e "\n${YELLOW}Post-deployment status:${NC}"

# Show service status
sudo systemctl status kismet-operations-center --no-pager | head -15

# Show health check
echo -e "\n${YELLOW}Health check:${NC}"
sleep 3
if curl -sf http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✓ Service is healthy${NC}"
    curl -s http://localhost:3001/api/health | jq . || curl -s http://localhost:3001/api/health
else
    echo -e "${RED}✗ Health check failed${NC}"
fi

# Show access URLs
echo -e "\n${YELLOW}Access URLs:${NC}"
echo "  - Local: http://localhost:3001"
echo "  - Network: http://$(hostname -I | awk '{print $1}'):3001"
if [ -f /etc/nginx/sites-enabled/kismet-operations.conf ]; then
    echo "  - HTTPS: https://$(hostname -f)"
fi

# Show logs command
echo -e "\n${YELLOW}View logs:${NC}"
echo "  sudo journalctl -u kismet-operations-center -f"

echo -e "\n${GREEN}Deployment complete!${NC}"
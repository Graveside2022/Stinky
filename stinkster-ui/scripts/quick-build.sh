#!/bin/bash
# Quick build script for Svelte apps - builds only what's needed

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}🚀 Quick build of Svelte applications${NC}"

cd "$UI_DIR"

# Parse arguments
BUILD_ALL=false
BUILD_HACKRF=false
BUILD_WIGLE=false
BUILD_KISMET=false

if [ $# -eq 0 ]; then
    BUILD_ALL=true
else
    for arg in "$@"; do
        case $arg in
            hackrf) BUILD_HACKRF=true ;;
            wigle) BUILD_WIGLE=true ;;
            kismet) BUILD_KISMET=true ;;
            all) BUILD_ALL=true ;;
            *) echo -e "${RED}Unknown app: $arg${NC}"; exit 1 ;;
        esac
    done
fi

# Build requested apps
if [ "$BUILD_ALL" = true ] || [ "$BUILD_HACKRF" = true ]; then
    echo -e "${YELLOW}Building HackRF...${NC}"
    npm run build:hackrf
fi

if [ "$BUILD_ALL" = true ] || [ "$BUILD_WIGLE" = true ]; then
    echo -e "${YELLOW}Building Wigle...${NC}"
    npm run build:wigle
fi

if [ "$BUILD_ALL" = true ] || [ "$BUILD_KISMET" = true ]; then
    echo -e "${YELLOW}Building Kismet...${NC}"
    npm run build:kismet || echo -e "${YELLOW}Kismet build failed (expected)${NC}"
fi

echo -e "${GREEN}✅ Build complete!${NC}"
echo -e "${YELLOW}Run ./scripts/deploy.sh to deploy the built applications${NC}"
#!/bin/bash

# Kismet Operations Center - Performance Optimized Startup Script
# This script starts the optimized version with proper configuration

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Kismet Operations Center (Performance Optimized)...${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install dependencies${NC}"
        exit 1
    fi
fi

# Build optimized assets if not exists or if source is newer
if [ ! -d "dist" ] || [ "server-optimized.js" -nt "dist/server-optimized.js" ]; then
    echo -e "${YELLOW}Building optimized assets...${NC}"
    npm run build:webpack
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to build webpack assets${NC}"
        exit 1
    fi
fi

# Set production environment
export NODE_ENV=production

# Set Node.js memory limit (adjust based on your Raspberry Pi model)
# For Pi 4 with 4GB RAM, we can use 1GB for Node.js
export NODE_OPTIONS="--max-old-space-size=1024"

# Enable garbage collection monitoring (optional)
# export NODE_OPTIONS="$NODE_OPTIONS --expose-gc"

# Create logs directory if not exists
mkdir -p logs

# Start the optimized server
echo -e "${GREEN}Starting optimized server on port 8003...${NC}"
echo -e "${YELLOW}Performance monitoring available at: http://localhost:8003/api/performance${NC}"

# Use node directly for production
node server-optimized.js 2>&1 | tee -a logs/kismet-operations-optimized.log

# If you want to run in background, uncomment below:
# nohup node server-optimized.js > logs/kismet-operations-optimized.log 2>&1 &
# echo $! > kismet-operations-optimized.pid
# echo -e "${GREEN}Server started with PID: $(cat kismet-operations-optimized.pid)${NC}"
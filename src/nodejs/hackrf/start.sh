#!/bin/bash

# HackRF Node.js Server Startup Script

# Set environment
export NODE_ENV=production
export PORT=8092
export OPENWEBRX_URL=ws://localhost:8073/ws/

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting HackRF Node.js Server...${NC}"

# Check if OpenWebRX is running
if ! curl -s http://localhost:8073 > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: OpenWebRX not detected on port 8073${NC}"
    echo "HackRF server will run in demo mode until OpenWebRX is available"
fi

# Check if old Python service is running
if lsof -i:8092 > /dev/null 2>&1; then
    echo -e "${RED}Port 8092 is already in use!${NC}"
    echo "Checking for Python spectrum analyzer..."
    
    if pgrep -f "spectrum_analyzer.py" > /dev/null; then
        echo -e "${YELLOW}Found Python spectrum analyzer running${NC}"
        echo "Run: pkill -f spectrum_analyzer.py"
        echo "Then try starting this service again"
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Build TypeScript if needed
if [ ! -d "dist" ] || [ "server.ts" -nt "dist/server.js" ]; then
    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build
fi

# Start the server
echo -e "${GREEN}Starting server on port ${PORT}...${NC}"
exec node dist/server.js
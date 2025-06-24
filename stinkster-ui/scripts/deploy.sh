#!/bin/bash
# Deploy Svelte frontend applications to public directory

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$UI_DIR")"
DIST_DIR="$UI_DIR/dist"
PUBLIC_DIR="$PROJECT_ROOT/public"

echo -e "${GREEN}🚀 Starting deployment of Svelte frontend applications${NC}"

# Check if we're in the right directory
if [ ! -f "$UI_DIR/package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the stinkster-ui directory.${NC}"
    exit 1
fi

cd "$UI_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Build all applications
echo -e "${YELLOW}🔨 Building applications...${NC}"

# Build HackRF
echo -e "${YELLOW}  Building HackRF app...${NC}"
npm run build:hackrf

# Build Wigle
echo -e "${YELLOW}  Building Wigle app...${NC}"
npm run build:wigle

# Build Kismet (if it builds successfully)
echo -e "${YELLOW}  Building Kismet app (may fail due to known issues)...${NC}"
npm run build:kismet || echo -e "${YELLOW}  ⚠️  Kismet build failed (expected)${NC}"

# Create deployment directories
echo -e "${YELLOW}📁 Creating deployment directories...${NC}"
mkdir -p "$PUBLIC_DIR/hackrf" "$PUBLIC_DIR/wigle" "$PUBLIC_DIR/kismet"

# Deploy built applications
echo -e "${YELLOW}📤 Deploying applications...${NC}"

# Deploy HackRF
if [ -d "$DIST_DIR/hackrf" ]; then
    echo -e "${YELLOW}  Deploying HackRF...${NC}"
    rm -rf "$PUBLIC_DIR/hackrf"/*
    cp -r "$DIST_DIR/hackrf"/* "$PUBLIC_DIR/hackrf/"
    echo -e "${GREEN}  ✅ HackRF deployed${NC}"
else
    echo -e "${RED}  ❌ HackRF build not found${NC}"
fi

# Deploy Wigle
if [ -d "$DIST_DIR/wigle" ]; then
    echo -e "${YELLOW}  Deploying Wigle...${NC}"
    rm -rf "$PUBLIC_DIR/wigle"/*
    cp -r "$DIST_DIR/wigle"/* "$PUBLIC_DIR/wigle/"
    echo -e "${GREEN}  ✅ Wigle deployed${NC}"
else
    echo -e "${RED}  ❌ Wigle build not found${NC}"
fi

# Deploy Kismet (if built)
if [ -d "$DIST_DIR/kismet" ]; then
    echo -e "${YELLOW}  Deploying Kismet...${NC}"
    rm -rf "$PUBLIC_DIR/kismet"/*
    cp -r "$DIST_DIR/kismet"/* "$PUBLIC_DIR/kismet/"
    echo -e "${GREEN}  ✅ Kismet deployed${NC}"
else
    echo -e "${YELLOW}  ⚠️  Kismet not deployed (build failed or not found)${NC}"
fi

# Create index page for easy access
echo -e "${YELLOW}📝 Creating index page...${NC}"
cat > "$PUBLIC_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stinkster Applications</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #0f0f0f;
            color: #fff;
        }
        h1 { color: #22c55e; }
        .apps {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .app {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 1.5rem;
            text-decoration: none;
            color: #fff;
            transition: all 0.2s;
        }
        .app:hover {
            background: #222;
            border-color: #22c55e;
            transform: translateY(-2px);
        }
        .app h2 {
            margin: 0 0 0.5rem 0;
            color: #22c55e;
        }
        .app p {
            margin: 0;
            color: #999;
            font-size: 0.9rem;
        }
        .status {
            margin-top: 0.5rem;
            font-size: 0.8rem;
        }
        .status.online { color: #22c55e; }
        .status.offline { color: #f87171; }
    </style>
</head>
<body>
    <h1>Stinkster Applications</h1>
    <div class="apps">
        <a href="/hackrf/" class="app">
            <h2>HackRF SDR</h2>
            <p>Spectrum analyzer and signal detection</p>
            <div class="status" id="hackrf-status">Checking...</div>
        </a>
        <a href="/wigle/" class="app">
            <h2>WigleToTAK</h2>
            <p>WiFi device tracking and TAK integration</p>
            <div class="status" id="wigle-status">Checking...</div>
        </a>
        <a href="/kismet/" class="app">
            <h2>Kismet Dashboard</h2>
            <p>Network monitoring and analysis</p>
            <div class="status" id="kismet-status">Checking...</div>
        </a>
    </div>
    
    <script>
        // Check service status
        async function checkStatus(service, port) {
            const statusEl = document.getElementById(service + '-status');
            try {
                const response = await fetch(`http://${window.location.hostname}:${port}/api/status`, {
                    mode: 'no-cors',
                    cache: 'no-cache'
                });
                statusEl.textContent = '● Online';
                statusEl.className = 'status online';
            } catch (e) {
                statusEl.textContent = '● Service on port ' + port;
                statusEl.className = 'status offline';
            }
        }
        
        // Check all services
        checkStatus('hackrf', 8092);
        checkStatus('wigle', 8000);
        checkStatus('kismet', 2501);
    </script>
</body>
</html>
EOF

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}Applications are now available at:${NC}"
echo -e "  ${YELLOW}HackRF:${NC} http://localhost/hackrf/"
echo -e "  ${YELLOW}Wigle:${NC}  http://localhost/wigle/"
echo -e "  ${YELLOW}Kismet:${NC} http://localhost/kismet/"
echo ""
echo -e "${YELLOW}Note: Make sure your web server is configured to serve from ${PUBLIC_DIR}${NC}"
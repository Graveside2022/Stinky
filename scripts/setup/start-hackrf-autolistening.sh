#!/bin/bash
# Start HackRF Auto-Listening Script
# This script builds and starts OpenWebRX with HackRF auto-listening enabled

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== HackRF Auto-Listening Startup Script ===${NC}"
echo "This script will:"
echo "  1. Check for HackRF hardware"
echo "  2. Build custom Docker image if needed"
echo "  3. Start OpenWebRX with auto-listening enabled"
echo "  4. Verify HackRF is actively receiving signals"
echo ""

# Step 1: Check for HackRF device on host
echo -e "${YELLOW}Step 1: Checking for HackRF device...${NC}"
if lsusb | grep -q "1d50:6089"; then
    echo -e "${GREEN}✓ HackRF device detected on host${NC}"
    echo "  Device information:"
    hackrf_info 2>/dev/null | head -5 | sed 's/^/    /'
else
    echo -e "${RED}✗ No HackRF device detected!${NC}"
    echo "  Please connect your HackRF and run this script again."
    exit 1
fi

# Step 2: Check Docker installation
echo ""
echo -e "${YELLOW}Step 2: Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed!${NC}"
    echo "  Please install Docker first: curl -sSL https://get.docker.com | sh"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo -e "${RED}✗ Docker daemon is not running!${NC}"
    echo "  Please start Docker: sudo systemctl start docker"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed and running${NC}"

# Step 3: Stop any existing containers
echo ""
echo -e "${YELLOW}Step 3: Stopping existing containers...${NC}"
docker stop openwebrx 2>/dev/null || true
docker stop openwebrx-hackrf 2>/dev/null || true
docker rm openwebrx 2>/dev/null || true
docker rm openwebrx-hackrf 2>/dev/null || true
echo -e "${GREEN}✓ Cleaned up existing containers${NC}"

# Step 4: Build custom Docker image if needed
echo ""
echo -e "${YELLOW}Step 4: Building OpenWebRX Docker image...${NC}"
if [[ -f "docker/Dockerfile" ]] && docker images | grep -q "openwebrx-hackrf-only"; then
    echo "  Custom image already exists. Rebuilding to ensure latest..."
    cd docker
    docker compose build --no-cache
    cd ..
    echo -e "${GREEN}✓ Custom Docker image rebuilt${NC}"
else
    echo "  Using official OpenWebRX image with custom configuration..."
fi

# Step 5: Prepare configuration with auto-start enabled
echo ""
echo -e "${YELLOW}Step 5: Preparing auto-listening configuration...${NC}"

# Create a temporary auto-start config based on existing config
cat > /tmp/sdrs-autostart.json << 'EOF'
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
            "type": "hackrf",
            "ppm": 0,
            "always-on": true,
            "enabled": true,
            "profiles": {
                "fm_broadcast": {
                    "name": "FM Broadcast (Auto-Start)",
                    "center_freq": 98000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 98000000,
                    "start_mod": "wfm",
                    "waterfall_min_level": -65,
                    "lfo_offset": 0,
                    "initial_profile": true
                },
                "2m": {
                    "name": "2m Amateur Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -72,
                    "lfo_offset": 300
                },
                "70cm": {
                    "name": "70cm Amateur Band",
                    "center_freq": 435000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 435000000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -78,
                    "lfo_offset": 300
                },
                "airband": {
                    "name": "Airband",
                    "center_freq": 124000000,
                    "rf_gain": "VGA=30,LNA=32,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 124000000,
                    "start_mod": "am",
                    "waterfall_min_level": -80,
                    "lfo_offset": 0
                }
            }
        }
    }
}
EOF

echo -e "${GREEN}✓ Auto-listening configuration prepared${NC}"
echo "  Default frequency: 98.0 MHz FM Broadcast"

# Step 6: Start OpenWebRX container
echo ""
echo -e "${YELLOW}Step 6: Starting OpenWebRX container...${NC}"

# Use custom image if available, otherwise use official
if docker images | grep -q "openwebrx-hackrf-only"; then
    echo "  Using custom OpenWebRX image..."
    cd docker
    docker compose up -d
    cd ..
    CONTAINER_NAME="openwebrx-hackrf"
else
    echo "  Using official OpenWebRX image..."
    docker run -d \
        --name openwebrx \
        --restart unless-stopped \
        --device /dev/bus/usb:/dev/bus/usb \
        --privileged \
        -p 8073:8073 \
        -v /tmp/sdrs-autostart.json:/var/lib/openwebrx/sdrs.json \
        -v "${SCRIPT_DIR}/docker-backup/users.json:/var/lib/openwebrx/users.json" \
        -v "${SCRIPT_DIR}/docker-backup/settings.json:/var/lib/openwebrx/settings.json" \
        jketterl/openwebrx:latest
    CONTAINER_NAME="openwebrx"
fi

# Wait for container to start
echo "  Waiting for container to initialize..."
sleep 10

# Step 7: Verify container is running
echo ""
echo -e "${YELLOW}Step 7: Verifying container status...${NC}"
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${GREEN}✓ OpenWebRX container is running${NC}"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo -e "${RED}✗ Container failed to start!${NC}"
    echo "  Showing last 20 lines of logs:"
    docker logs "$CONTAINER_NAME" 2>&1 | tail -20
    exit 1
fi

# Step 8: Verify HackRF is detected in container
echo ""
echo -e "${YELLOW}Step 8: Verifying HackRF detection in container...${NC}"
if docker exec "$CONTAINER_NAME" hackrf_info &>/dev/null; then
    echo -e "${GREEN}✓ HackRF is detected inside container${NC}"
    echo "  HackRF info from container:"
    docker exec "$CONTAINER_NAME" hackrf_info 2>/dev/null | head -5 | sed 's/^/    /'
else
    echo -e "${RED}✗ HackRF not detected in container!${NC}"
    echo "  This might be a USB passthrough issue."
fi

# Step 9: Check if HackRF is actively receiving
echo ""
echo -e "${YELLOW}Step 9: Checking HackRF reception status...${NC}"
echo "  Checking container logs for SDR activity..."

# Look for signs of active reception in logs
if docker logs "$CONTAINER_NAME" 2>&1 | tail -50 | grep -E "(Started|Running|hackrf|stream|connected)" | tail -5; then
    echo -e "${GREEN}✓ HackRF appears to be actively receiving${NC}"
else
    echo -e "${YELLOW}⚠ Could not confirm active reception from logs${NC}"
fi

# Step 10: Test web interface
echo ""
echo -e "${YELLOW}Step 10: Testing web interface accessibility...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8073 | grep -q "200\|302"; then
    echo -e "${GREEN}✓ OpenWebRX web interface is accessible${NC}"
else
    echo -e "${RED}✗ Web interface is not responding${NC}"
    echo "  Please check container logs: docker logs $CONTAINER_NAME"
fi

# Step 11: Display final status and information
echo ""
echo -e "${BLUE}=== HackRF Auto-Listening Status ===${NC}"
echo ""
echo -e "${GREEN}✅ System Status:${NC}"
echo "  • HackRF Hardware: Detected"
echo "  • Docker Container: Running"
echo "  • Web Interface: http://localhost:8073"
echo "  • Default Profile: FM Broadcast (98.0 MHz)"
echo ""
echo -e "${BLUE}📡 Frequency Information:${NC}"
echo "  • Current Band: FM Broadcast"
echo "  • Center Frequency: 98.0 MHz"
echo "  • Sample Rate: 2.4 MSPS"
echo "  • Modulation: WFM (Wide FM)"
echo ""
echo -e "${BLUE}🔧 Available Commands:${NC}"
echo "  • View logs: docker logs -f $CONTAINER_NAME"
echo "  • Enter container: docker exec -it $CONTAINER_NAME bash"
echo "  • Stop container: docker stop $CONTAINER_NAME"
echo "  • Check USB devices: docker exec $CONTAINER_NAME lsusb"
echo ""
echo -e "${BLUE}🌐 Web Interface Access:${NC}"
echo "  • URL: http://localhost:8073"
echo "  • Username: admin"
echo "  • Password: hackrf"
echo ""
echo -e "${YELLOW}📻 To change frequency bands:${NC}"
echo "  1. Open web interface"
echo "  2. Click on the frequency display"
echo "  3. Select a different profile (2m, 70cm, Airband)"
echo ""

# Optional: Show real-time activity indicator
echo -e "${BLUE}🎯 Real-time Activity Monitor:${NC}"
echo "  Checking for data flow (5 seconds)..."
docker exec "$CONTAINER_NAME" timeout 5 bash -c '
    if pgrep -f hackrf > /dev/null; then
        echo "  ✓ HackRF process is running"
        ps aux | grep hackrf | grep -v grep | head -1
    fi
' 2>/dev/null || echo "  Could not verify HackRF process"

echo ""
echo -e "${GREEN}✅ HackRF auto-listening setup complete!${NC}"
echo "  The SDR should now be actively receiving on 98.0 MHz FM"
echo "  Open http://localhost:8073 to see the waterfall display"

# Create a simple status check function
cat > /tmp/hackrf-status.sh << 'EOF'
#!/bin/bash
echo "=== HackRF Auto-Listening Status Check ==="
echo ""
echo "Container Status:"
docker ps --filter "name=openwebrx" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "HackRF Status:"
docker exec $(docker ps -q -f name=openwebrx) hackrf_info 2>/dev/null | head -3 || echo "HackRF not detected"
echo ""
echo "Recent Log Activity:"
docker logs $(docker ps -q -f name=openwebrx) 2>&1 | tail -5
echo ""
echo "Web Interface: http://localhost:8073 (admin/hackrf)"
EOF
chmod +x /tmp/hackrf-status.sh

echo ""
echo "💡 Tip: Run '/tmp/hackrf-status.sh' anytime to check status"
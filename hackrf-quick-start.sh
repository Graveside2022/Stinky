#!/bin/bash
# HackRF OpenWebRX Quick Start Script
# Automates the complete setup process with clear status messages

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored status messages
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Header
echo -e "\n${BLUE}=== HackRF OpenWebRX Quick Start ===${NC}\n"

# Step 1: Check prerequisites
print_status "Checking prerequisites..."

# Check if running on Raspberry Pi
if [[ -f /proc/device-tree/model ]]; then
    model=$(cat /proc/device-tree/model)
    print_success "Running on: $model"
else
    print_warning "Not running on Raspberry Pi - continuing anyway"
fi

# Check for HackRF
if lsusb | grep -q "1d50:6089"; then
    print_success "HackRF One detected via USB"
    if command -v hackrf_info &> /dev/null; then
        hackrf_serial=$(hackrf_info 2>/dev/null | grep "Serial number" | awk '{print $3}')
        print_success "HackRF serial: ${hackrf_serial:-Unknown}"
    else
        print_warning "hackrf_info not found - install hackrf tools for more info"
    fi
else
    print_error "HackRF One not detected! Please connect your HackRF device."
    exit 1
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Install Docker with: curl -sSL https://get.docker.com | sh"
    echo "Then add user to docker group: sudo usermod -aG docker $USER"
    exit 1
fi
print_success "Docker is installed"

# Check if user can run Docker
if ! docker ps &> /dev/null; then
    print_error "Cannot run Docker commands. Add user to docker group:"
    echo "sudo usermod -aG docker $USER"
    echo "Then logout and login again."
    exit 1
fi
print_success "Docker permissions OK"

# Step 2: Check for existing container
print_status "Checking for existing OpenWebRX container..."
if docker ps -a | grep -q openwebrx; then
    print_warning "Existing OpenWebRX container found"
    echo -n "Stop and remove it? [y/N] "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        docker stop openwebrx 2>/dev/null || true
        docker rm openwebrx 2>/dev/null || true
        print_success "Removed existing container"
    else
        print_error "Cannot continue with existing container"
        exit 1
    fi
fi

# Step 3: Create necessary directories
print_status "Creating configuration directories..."
mkdir -p docker/config
print_success "Created docker/config directory"

# Step 4: Create working HackRF configuration
print_status "Creating HackRF configuration..."
cat > docker/config/sdrs.json << 'EOF'
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF",
            "type": "hackrf",
            "ppm": 0,
            "profiles": {
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
                },
                "fm_broadcast": {
                    "name": "FM Broadcast",
                    "center_freq": 98000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 98000000,
                    "start_mod": "wfm",
                    "waterfall_min_level": -65,
                    "lfo_offset": 0
                }
            }
        }
    }
}
EOF
print_success "Created HackRF configuration"

# Step 5: Start OpenWebRX container
print_status "Starting OpenWebRX container..."
docker run -d \
    --name openwebrx \
    --restart unless-stopped \
    --privileged \
    -v /dev/bus/usb:/dev/bus/usb \
    -v $(pwd)/docker/config/sdrs.json:/var/lib/openwebrx/sdrs.json \
    -p 8074:8073 \
    -e OPENWEBRX_ADMIN_USER=admin \
    -e OPENWEBRX_ADMIN_PASSWORD=hackrf \
    jketterl/openwebrx:latest

if [ $? -eq 0 ]; then
    print_success "OpenWebRX container started successfully"
else
    print_error "Failed to start OpenWebRX container"
    exit 1
fi

# Step 6: Wait for container to be ready
print_status "Waiting for OpenWebRX to initialize..."
sleep 5

# Step 7: Verify HackRF detection in container
print_status "Verifying HackRF detection in container..."
if docker exec openwebrx hackrf_info &> /dev/null; then
    print_success "HackRF successfully detected in container!"
    hackrf_info_output=$(docker exec openwebrx hackrf_info 2>&1 | head -5)
    echo -e "${GREEN}HackRF Info:${NC}"
    echo "$hackrf_info_output"
else
    print_warning "HackRF not immediately detected - may need a moment to initialize"
fi

# Step 8: Check container status
print_status "Checking container health..."
container_status=$(docker ps --filter name=openwebrx --format "table {{.Status}}" | tail -1)
print_success "Container status: $container_status"

# Step 9: Display access information
echo -e "\n${GREEN}=== Setup Complete! ===${NC}\n"
echo -e "${BLUE}Access OpenWebRX at:${NC}"
echo -e "  Local:    ${GREEN}http://localhost:8074${NC}"

# Get IP addresses
if command -v hostname &> /dev/null; then
    ip_addr=$(hostname -I | awk '{print $1}')
    if [ -n "$ip_addr" ]; then
        echo -e "  Network:  ${GREEN}http://${ip_addr}:8074${NC}"
    fi
fi

echo -e "\n${BLUE}Login credentials:${NC}"
echo -e "  Username: ${GREEN}admin${NC}"
echo -e "  Password: ${GREEN}hackrf${NC}"

echo -e "\n${BLUE}Available frequency bands:${NC}"
echo "  • 2m Amateur Band (145 MHz)"
echo "  • 70cm Amateur Band (435 MHz)"
echo "  • Airband (124 MHz)"
echo "  • FM Broadcast (98 MHz)"

echo -e "\n${BLUE}Useful commands:${NC}"
echo "  View logs:        docker logs -f openwebrx"
echo "  Stop container:   docker stop openwebrx"
echo "  Start container:  docker start openwebrx"
echo "  Remove container: docker rm -f openwebrx"
echo "  Check HackRF:     docker exec openwebrx hackrf_info"

echo -e "\n${BLUE}Troubleshooting:${NC}"
echo "  If HackRF not detected:"
echo "    1. Unplug and replug HackRF"
echo "    2. Run: docker restart openwebrx"
echo "    3. Check: docker exec openwebrx hackrf_info"

echo -e "\n${GREEN}Happy listening!${NC}\n"
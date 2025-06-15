#!/bin/bash
# Comprehensive verification script for OpenWebRX HackRF setup

echo "======================================="
echo "OpenWebRX HackRF Verification Script"
echo "======================================="

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        [ -n "$3" ] && echo "  $3"
    fi
}

# 1. Check host system
echo -e "\n${YELLOW}1. Host System Checks:${NC}"

# Check for HackRF on host
lsusb | grep -q "1d50:6089"
print_status $? "HackRF USB device detected" "Make sure HackRF is connected via USB"

# Check hackrf_info on host
hackrf_info > /dev/null 2>&1
print_status $? "HackRF accessible on host" "Install hackrf tools: sudo apt-get install hackrf"

# 2. Check Docker setup
echo -e "\n${YELLOW}2. Docker Container Checks:${NC}"

# Check if container is running
docker ps | grep -q openwebrx-hackrf
print_status $? "OpenWebRX container is running" "Run: ./build-openwebrx-hackrf-custom.sh"

if docker ps | grep -q openwebrx-hackrf; then
    # Check container health
    HEALTH=$(docker inspect openwebrx-hackrf --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")
    if [ "$HEALTH" = "healthy" ]; then
        print_status 0 "Container health check passing"
    else
        print_status 1 "Container health check status: $HEALTH"
    fi

    # Check HackRF in container
    docker exec openwebrx-hackrf hackrf_info > /dev/null 2>&1
    print_status $? "HackRF accessible in container" "Check USB passthrough and privileged mode"

    # Check for HackRF in container USB devices
    docker exec openwebrx-hackrf ls /dev/bus/usb > /dev/null 2>&1
    print_status $? "USB devices mounted in container"

    # 3. Configuration checks
    echo -e "\n${YELLOW}3. Configuration Checks:${NC}"

    # Check if custom config was applied
    docker exec openwebrx-hackrf test -f /var/lib/openwebrx/.custom-configured
    print_status $? "Custom configuration applied"

    # Verify HackRF driver configuration
    CONFIG_TYPE=$(docker exec openwebrx-hackrf cat /var/lib/openwebrx/sdrs.json 2>/dev/null | grep -o '"type":\s*"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ "$CONFIG_TYPE" = "hackrf" ]; then
        print_status 0 "Using native HackRF driver (type: hackrf)"
    else
        print_status 1 "Wrong driver type: $CONFIG_TYPE" "Should be 'hackrf', not 'soapy'"
    fi

    # 4. Authentication checks
    echo -e "\n${YELLOW}4. Authentication Checks:${NC}"

    # Check if admin user exists
    docker exec openwebrx-hackrf python3 /opt/openwebrx/openwebrx.py admin --silent hasuser admin 2>/dev/null
    print_status $? "Admin user exists"

    # Test web interface
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8073/ || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        print_status 0 "Web interface accessible (HTTP $HTTP_CODE)"
    else
        print_status 1 "Web interface returned HTTP $HTTP_CODE"
    fi

    # Test authentication
    AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -u admin:hackrf http://localhost:8073/settings || echo "000")
    if [ "$AUTH_CODE" = "200" ] || [ "$AUTH_CODE" = "302" ]; then
        print_status 0 "Authentication working (HTTP $AUTH_CODE)"
    else
        print_status 1 "Authentication test returned HTTP $AUTH_CODE"
    fi

    # 5. SDR functionality checks
    echo -e "\n${YELLOW}5. SDR Functionality:${NC}"

    # Check if SDR profiles are configured
    PROFILE_COUNT=$(docker exec openwebrx-hackrf cat /var/lib/openwebrx/sdrs.json 2>/dev/null | grep -c '"name":\s*".*Band"' || echo "0")
    if [ "$PROFILE_COUNT" -gt 0 ]; then
        print_status 0 "Found $PROFILE_COUNT band profiles configured"
    else
        print_status 1 "No band profiles found"
    fi

    # List configured profiles
    echo -e "\n  Configured profiles:"
    docker exec openwebrx-hackrf cat /var/lib/openwebrx/sdrs.json 2>/dev/null | grep '"name":\s*"' | sed 's/.*"name":\s*"\([^"]*\)".*/  - \1/'

else
    echo -e "\n${RED}Container not running. Skipping container-specific checks.${NC}"
fi

# 6. Troubleshooting info
echo -e "\n${YELLOW}6. Troubleshooting Information:${NC}"

echo -e "\nContainer logs (last 10 lines):"
docker logs openwebrx-hackrf 2>&1 | tail -10

echo -e "\nUseful commands:"
echo "  View full logs:        docker logs openwebrx-hackrf"
echo "  Enter container:       docker exec -it openwebrx-hackrf bash"
echo "  Restart container:     docker restart openwebrx-hackrf"
echo "  Rebuild container:     ./build-openwebrx-hackrf-custom.sh"
echo "  Check USB in container: docker exec openwebrx-hackrf lsusb"

echo -e "\n======================================="
echo "Access OpenWebRX at: http://localhost:8073"
echo "Username: admin"
echo "Password: hackrf"
echo "======================================="
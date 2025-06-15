#!/bin/bash
# Run integration tests
# Validates system components installed by install.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_CATEGORY="${1:-all}"

echo "Running integration tests (category: $TEST_CATEGORY)..."
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
warn_count=0
fail_count=0

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    pass_count=$((pass_count + 1))
}

test_warn() {
    echo -e "${YELLOW}!${NC} $1"
    warn_count=$((warn_count + 1))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    fail_count=$((fail_count + 1))
}

run_system_tests() {
    echo "Testing system dependencies..."

    # Test system dependencies installed by install.sh
    if command -v python3 >/dev/null 2>&1; then
        test_pass "Python 3 is installed"
    else
        test_fail "Python 3 is not installed"
    fi
    
    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            test_pass "Docker is available and running"
        else
            test_warn "Docker is installed but not running"
        fi
    else
        test_fail "Docker is not installed"
    fi
    
    if command -v kismet >/dev/null 2>&1; then
        test_pass "Kismet is installed"
    else
        test_fail "Kismet is not installed (run ./install.sh)"
    fi
    
    if command -v gpsd >/dev/null 2>&1; then
        test_pass "GPSD is installed"
    else
        test_fail "GPSD is not installed (run ./install.sh)"
    fi
    
    if command -v hackrf_info >/dev/null 2>&1; then
        test_pass "HackRF tools are installed"
    else
        test_fail "HackRF tools not installed (run ./install.sh)"
    fi
}

run_hardware_tests() {
    echo "Testing hardware availability..."
    
    # Test network interface availability
    INTERFACE="${NETWORK_INTERFACE:-wlan2}"
    if ip link show "$INTERFACE" >/dev/null 2>&1; then
        test_pass "WiFi interface $INTERFACE is available"
    else
        test_warn "WiFi interface $INTERFACE not found (will use simulation mode)"
    fi
    
    # Test HackRF device
    if command -v hackrf_info >/dev/null 2>&1; then
        if hackrf_info >/dev/null 2>&1; then
            test_pass "HackRF device detected and functional"
        else
            test_warn "HackRF tools installed but no device detected"
        fi
    else
        test_fail "HackRF tools not available"
    fi
    
    # Test GPS devices
    if ls /dev/ttyUSB* >/dev/null 2>&1 || ls /dev/ttyACM* >/dev/null 2>&1; then
        test_pass "Serial devices detected (potential GPS devices)"
    else
        test_warn "No serial devices detected - GPS functionality may be limited"
    fi
}

run_component_tests() {
    echo "Testing component startup..."
    
    # Test virtual environments
    if [ -d "$PROJECT_ROOT/venv" ]; then
        test_pass "Main virtual environment exists"
    else
        test_fail "Main virtual environment missing (run ./install.sh)"
    fi
    
    if [ -d "$PROJECT_ROOT/src/gpsmav/venv" ]; then
        test_pass "GPSmav virtual environment exists"
    else
        test_warn "GPSmav virtual environment missing"
    fi
    
    if [ -d "$PROJECT_ROOT/src/hackrf/venv" ]; then
        test_pass "HackRF virtual environment exists"
    else
        test_warn "HackRF virtual environment missing"
    fi
    
    if [ -d "$PROJECT_ROOT/src/wigletotak/WigleToTAK/TheStinkToTAK/venv" ]; then
        test_pass "WigleToTAK virtual environment exists"
    else
        test_warn "WigleToTAK virtual environment missing"
    fi
    
    # Test OpenWebRX container
    if docker ps -a | grep -q openwebrx; then
        if docker ps | grep -q openwebrx; then
            test_pass "OpenWebRX container is running"
        else
            test_warn "OpenWebRX container exists but not running"
        fi
    else
        test_warn "OpenWebRX container not found (may need setup)"
    fi
    
    # Test configuration files
    if [ -f "$PROJECT_ROOT/config.py" ]; then
        test_pass "Main configuration file exists"
    else
        test_fail "Main configuration file missing"
    fi
}

run_service_tests() {
    echo "Testing service availability..."
    
    # Test GPSD service
    if systemctl is-active --quiet gpsd; then
        test_pass "GPSD service is running"
    else
        test_warn "GPSD service is not running"
    fi
    
    # Test port availability
    local ports=("2501:Kismet API" "8073:OpenWebRX" "2947:GPSD")
    for port_info in "${ports[@]}"; do
        port=${port_info%:*}
        service=${port_info#*:}
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            test_pass "Port $port ($service) is in use"
        else
            test_warn "Port $port ($service) is not in use"
        fi
    done
}

# Run test categories based on parameter
case "$TEST_CATEGORY" in
    "system")
        run_system_tests
        ;;
    "hardware")
        run_hardware_tests
        ;;
    "components")
        run_component_tests
        ;;
    "services")
        run_service_tests
        ;;
    "all")
        run_system_tests
        echo
        run_hardware_tests
        echo
        run_component_tests
        echo
        run_service_tests
        ;;
    *)
        echo "Usage: $0 [system|hardware|components|services|all]"
        exit 1
        ;;
esac

echo
echo "Integration test summary:"
echo "========================="
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${YELLOW}Warnings: $warn_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"

if [ $fail_count -gt 0 ]; then
    echo
    echo -e "${RED}Some tests failed. Consider running ./install.sh to fix missing dependencies.${NC}"
    exit 1
elif [ $warn_count -gt 0 ]; then
    echo
    echo -e "${YELLOW}Some tests had warnings. System should work but some features may be limited.${NC}"
    exit 0
else
    echo
    echo -e "${GREEN}All tests passed successfully!${NC}"
    exit 0
fi

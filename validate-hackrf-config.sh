#!/bin/bash
# HackRF Configuration Validation Script
# Validates that HackRF is properly configured and working with OpenWebRX

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== HackRF Configuration Validation ===${NC}"
echo

# Function to print status
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0

# Step 1: Check HackRF hardware detection on host
echo "1. Checking HackRF hardware detection on host..."
if lsusb | grep -q "1d50:6089"; then
    print_success "HackRF detected via USB (1d50:6089)"
    HACKRF_USB_INFO=$(lsusb | grep "1d50:6089")
    echo "   Device: $HACKRF_USB_INFO"
else
    print_error "HackRF not detected on USB bus"
    print_info "Expected USB ID: 1d50:6089 (HackRF One)"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# Step 2: Check hackrf_info command
echo
echo "2. Testing HackRF info command..."
if command -v hackrf_info >/dev/null 2>&1; then
    if hackrf_info >/dev/null 2>&1; then
        print_success "hackrf_info command works"
        HACKRF_SERIAL=$(hackrf_info 2>/dev/null | grep "Serial number" | cut -d: -f2 | tr -d ' ' || echo "unknown")
        echo "   Serial: $HACKRF_SERIAL"
    else
        print_warning "hackrf_info command failed (device may be in use)"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
else
    print_error "hackrf_info command not found"
    print_info "Install with: sudo apt install hackrf"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# Step 3: Check Docker status
echo
echo "3. Checking Docker service..."
if systemctl is-active --quiet docker; then
    print_success "Docker service is running"
else
    print_error "Docker service is not running"
    print_info "Start with: sudo systemctl start docker"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# Step 4: Check OpenWebRX container
echo
echo "4. Checking OpenWebRX container..."
if docker ps | grep -q openwebrx; then
    print_success "OpenWebRX container is running"
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep openwebrx)
    echo "   Container: $CONTAINER_NAME"
else
    print_warning "OpenWebRX container is not running"
    print_info "Start with: docker-compose up -d"
    VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
fi

# Step 5: Check configuration file exists
echo
echo "5. Checking HackRF configuration file..."
if [ -f "openwebrx-hackrf-config.json" ]; then
    print_success "HackRF config file exists"
    
    # Validate JSON syntax
    if python3 -m json.tool openwebrx-hackrf-config.json >/dev/null 2>&1; then
        print_success "Configuration file has valid JSON syntax"
    else
        print_error "Configuration file has invalid JSON syntax"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check for native HackRF driver
    if grep -q '"type": "hackrf"' openwebrx-hackrf-config.json; then
        print_success "Native HackRF driver configured"
    else
        print_error "Native HackRF driver not configured"
        print_info "Expected: \"type\": \"hackrf\" (not \"soapy\")"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check for proper gain settings
    if grep -q "VGA=.*,LNA=.*,AMP=" openwebrx-hackrf-config.json; then
        print_success "Proper gain settings found"
    else
        print_warning "Gain settings may not be optimal"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
else
    print_error "HackRF config file not found"
    print_info "Expected: openwebrx-hackrf-config.json"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# Step 6: Check docker-compose.yml
echo
echo "6. Checking docker-compose.yml configuration..."
if [ -f "docker-compose.yml" ]; then
    print_success "docker-compose.yml exists"
    
    # Check for official image
    if grep -q "jketterl/openwebrx:latest" docker-compose.yml; then
        print_success "Using official OpenWebRX image"
    else
        print_warning "Not using official OpenWebRX image"
        VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
    fi
    
    # Check for config mount
    if grep -q "openwebrx-hackrf-config.json:/var/lib/openwebrx/sdrs.json" docker-compose.yml; then
        print_success "HackRF config properly mounted"
    else
        print_error "HackRF config not properly mounted"
        print_info "Expected mount: ./openwebrx-hackrf-config.json:/var/lib/openwebrx/sdrs.json:ro"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check for privileged mode
    if grep -q "privileged: true" docker-compose.yml; then
        print_success "Privileged mode enabled for USB access"
    else
        print_error "Privileged mode not enabled"
        print_info "Required for USB device access"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
else
    print_error "docker-compose.yml not found"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# Step 7: Test HackRF in container (if running)
if docker ps | grep -q openwebrx; then
    echo
    echo "7. Testing HackRF detection in container..."
    if docker exec openwebrx hackrf_info >/dev/null 2>&1; then
        print_success "HackRF detected inside container"
        
        # Get container HackRF info
        CONTAINER_SERIAL=$(docker exec openwebrx hackrf_info 2>/dev/null | grep "Serial number" | cut -d: -f2 | tr -d ' ' || echo "unknown")
        echo "   Container Serial: $CONTAINER_SERIAL"
    else
        print_error "HackRF not detected inside container"
        print_info "Try: docker restart openwebrx"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    # Check container configuration
    echo
    echo "8. Checking container SDR configuration..."
    if docker exec openwebrx test -f /var/lib/openwebrx/sdrs.json; then
        CONTAINER_DRIVER=$(docker exec openwebrx cat /var/lib/openwebrx/sdrs.json 2>/dev/null | grep '"type"' | head -1 | cut -d'"' -f4 || echo "unknown")
        if [ "$CONTAINER_DRIVER" = "hackrf" ]; then
            print_success "Container using native HackRF driver"
        else
            print_error "Container using wrong driver: $CONTAINER_DRIVER"
            print_info "Expected: hackrf, Found: $CONTAINER_DRIVER"
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
    else
        print_error "Container SDR configuration not found"
        VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
fi

# Step 8: Test web interface accessibility
echo
echo "9. Testing web interface accessibility..."
if curl -s --connect-timeout 5 http://localhost:8073/ >/dev/null 2>&1; then
    print_success "OpenWebRX web interface accessible"
    echo "   URL: http://localhost:8073"
    echo "   Login: admin / hackrf"
else
    print_warning "OpenWebRX web interface not accessible"
    print_info "Container may still be starting up"
    VALIDATION_WARNINGS=$((VALIDATION_WARNINGS + 1))
fi

# Summary
echo
echo "=== Validation Summary ==="
if [ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ]; then
    print_success "All validations passed! HackRF configuration is working correctly."
elif [ $VALIDATION_ERRORS -eq 0 ]; then
    print_warning "Validation completed with $VALIDATION_WARNINGS warning(s)"
    echo "System should work but may need minor adjustments"
else
    print_error "Validation failed with $VALIDATION_ERRORS error(s) and $VALIDATION_WARNINGS warning(s)"
    echo
    echo "Suggested fixes:"
    echo "1. Ensure HackRF is connected: lsusb | grep 1d50:6089"
    echo "2. Start Docker: sudo systemctl start docker"
    echo "3. Apply working config: ./fix-openwebrx-hackrf.sh"
    echo "4. Start container: docker-compose up -d"
    echo "5. Restart container: docker restart openwebrx"
fi

echo
echo "=== Quick Commands ==="
echo "• Start OpenWebRX: ./start-openwebrx.sh"
echo "• Apply fix: ./fix-openwebrx-hackrf.sh"
echo "• Check logs: docker logs openwebrx"
echo "• Test HackRF: hackrf_info"
echo "• Container shell: docker exec -it openwebrx bash"

# Exit with error code if validation failed
if [ $VALIDATION_ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi
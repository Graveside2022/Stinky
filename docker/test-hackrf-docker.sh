#!/bin/bash
# HackRF Docker Testing Script
# Tests HackRF connectivity and Docker container setup

set -e

echo "=== HackRF Docker Testing Script ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# 1. Check HackRF hardware connection
echo "=== Hardware Detection ==="
if lsusb | grep -q "1d50:6089"; then
    print_status "OK" "HackRF device detected"
    HACKRF_DEVICE=$(lsusb | grep "1d50:6089")
    print_status "INFO" "Device: $HACKRF_DEVICE"
else
    print_status "ERROR" "HackRF device not found"
    exit 1
fi

# 2. Check USB device permissions
echo
echo "=== USB Device Permissions ==="
HACKRF_USB_PATH=$(lsusb -t | grep -A 5 "1d50:6089" | head -n 1 | sed 's/.*Dev \([0-9]*\).*/\1/')
if [ -n "$HACKRF_USB_PATH" ]; then
    USB_DEVICE="/dev/bus/usb/001/$(printf '%03d' $HACKRF_USB_PATH)"
    if [ -c "$USB_DEVICE" ]; then
        print_status "OK" "USB device file exists: $USB_DEVICE"
        ls -la "$USB_DEVICE"
        if [ -r "$USB_DEVICE" ] && [ -w "$USB_DEVICE" ]; then
            print_status "OK" "USB device is readable and writable"
        else
            print_status "WARN" "USB device permissions may be restrictive"
        fi
    else
        print_status "ERROR" "USB device file not found: $USB_DEVICE"
    fi
fi

# 3. Test HackRF tools
echo
echo "=== HackRF Tools Test ==="
if command -v hackrf_info > /dev/null; then
    print_status "OK" "hackrf_info command available"
    if hackrf_info > /dev/null 2>&1; then
        print_status "OK" "HackRF responds to hackrf_info"
    else
        print_status "ERROR" "hackrf_info failed - device may be in use or permissions issue"
    fi
else
    print_status "WARN" "hackrf_info command not found"
fi

# 4. Check Docker availability
echo
echo "=== Docker Environment ==="
if command -v docker > /dev/null; then
    print_status "OK" "Docker command available"
    if docker ps > /dev/null 2>&1; then
        print_status "OK" "Docker daemon accessible"
    else
        print_status "ERROR" "Cannot access Docker daemon"
        exit 1
    fi
else
    print_status "ERROR" "Docker not installed"
    exit 1
fi

if command -v docker-compose > /dev/null; then
    print_status "OK" "Docker Compose available"
else
    print_status "WARN" "Docker Compose not found, using 'docker compose'"
fi

# 5. Check configuration files
echo
echo "=== Configuration Files ==="
if [ -f "docker-compose.yml" ]; then
    print_status "OK" "docker-compose.yml exists"
else
    print_status "ERROR" "docker-compose.yml not found"
    exit 1
fi

if [ -f "config/sdrs.json" ]; then
    print_status "OK" "SDR configuration exists"
    # Validate JSON
    if python3 -m json.tool config/sdrs.json > /dev/null 2>&1; then
        print_status "OK" "SDR configuration is valid JSON"
    else
        print_status "ERROR" "SDR configuration has invalid JSON"
    fi
else
    print_status "ERROR" "SDR configuration not found"
fi

if [ -d "config" ] && [ -d "logs" ]; then
    print_status "OK" "Required directories exist"
else
    print_status "WARN" "Creating missing directories"
    mkdir -p config logs
fi

# 6. Test Docker container startup
echo
echo "=== Docker Container Test ==="
print_status "INFO" "Testing Docker container startup..."

# Stop any existing container
docker-compose down > /dev/null 2>&1 || true

# Start container in detached mode
if docker-compose up -d; then
    print_status "OK" "Container started successfully"
    
    # Wait for container to initialize
    print_status "INFO" "Waiting for container initialization..."
    for i in {1..30}; do
        if docker-compose ps | grep -q "Up"; then
            print_status "OK" "Container is running"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            print_status "ERROR" "Container failed to start within timeout"
            docker-compose logs
            exit 1
        fi
    done
    
    # Test web interface
    print_status "INFO" "Testing web interface..."
    for i in {1..20}; do
        if curl -s http://localhost:8073/ > /dev/null 2>&1; then
            print_status "OK" "Web interface accessible at http://localhost:8073"
            break
        fi
        sleep 3
        if [ $i -eq 20 ]; then
            print_status "WARN" "Web interface not accessible yet"
        fi
    done
    
    # Check container logs for HackRF detection
    print_status "INFO" "Checking container logs for HackRF detection..."
    sleep 5
    if docker-compose logs | grep -i hackrf > /dev/null 2>&1; then
        print_status "OK" "HackRF mentioned in container logs"
    else
        print_status "WARN" "No HackRF references found in logs"
    fi
    
    # Show container status
    echo
    echo "=== Container Status ==="
    docker-compose ps
    
    echo
    echo "=== Recent Container Logs ==="
    docker-compose logs --tail=20
    
else
    print_status "ERROR" "Failed to start container"
    exit 1
fi

echo
echo "=== Test Summary ==="
print_status "OK" "Hardware test completed"
print_status "INFO" "OpenWebRX should be accessible at: http://localhost:8073"
print_status "INFO" "Default credentials: admin/hackrf"
print_status "INFO" "To stop the container: docker-compose down"

echo
print_status "INFO" "Test completed successfully!"
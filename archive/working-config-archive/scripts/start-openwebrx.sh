#!/bin/bash
# OpenWebRX HackRF Docker Startup Script
# Performs pre-flight checks and starts the OpenWebRX container

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK") echo -e "${GREEN}✓${NC} $message" ;;
        "WARN") echo -e "${YELLOW}⚠${NC} $message" ;;
        "ERROR") echo -e "${RED}✗${NC} $message" ;;
        "INFO") echo -e "${BLUE}ℹ${NC} $message" ;;
    esac
}

echo "=== OpenWebRX HackRF Docker Startup ==="
echo "Starting OpenWebRX with HackRF support..."
echo

# Change to script directory
cd "$(dirname "$0")"

# 1. Check HackRF connection
print_status "INFO" "Checking HackRF connection..."
if lsusb | grep -q "1d50:6089"; then
    print_status "OK" "HackRF device detected"
else
    print_status "ERROR" "HackRF device not found!"
    print_status "INFO" "Please connect your HackRF device and try again"
    exit 1
fi

# 2. Check Docker
print_status "INFO" "Checking Docker environment..."
if ! command -v docker > /dev/null; then
    print_status "ERROR" "Docker not installed"
    exit 1
fi

if ! docker ps > /dev/null 2>&1; then
    print_status "ERROR" "Cannot access Docker daemon"
    print_status "INFO" "Try: sudo systemctl start docker"
    exit 1
fi
print_status "OK" "Docker is available"

# 3. Check Docker Compose
if command -v docker-compose > /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    print_status "ERROR" "Docker Compose not available"
    exit 1
fi
print_status "OK" "Docker Compose is available"

# 4. Ensure directories exist
print_status "INFO" "Checking directory structure..."
mkdir -p config logs
print_status "OK" "Required directories exist"

# 5. Stop any existing container
print_status "INFO" "Stopping any existing OpenWebRX container..."
$COMPOSE_CMD down > /dev/null 2>&1 || true

# 6. Pull latest image
print_status "INFO" "Pulling latest OpenWebRX image..."
if $COMPOSE_CMD pull; then
    print_status "OK" "Image updated successfully"
else
    print_status "WARN" "Could not update image, using existing"
fi

# 7. Start container
print_status "INFO" "Starting OpenWebRX container..."
if $COMPOSE_CMD up -d; then
    print_status "OK" "Container started successfully"
else
    print_status "ERROR" "Failed to start container"
    print_status "INFO" "Check logs with: $COMPOSE_CMD logs"
    exit 1
fi

# 8. Wait for service to be ready
print_status "INFO" "Waiting for OpenWebRX to initialize..."
for i in {1..30}; do
    if curl -s http://localhost:8073/ > /dev/null 2>&1; then
        print_status "OK" "OpenWebRX is ready!"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        print_status "WARN" "OpenWebRX may still be starting"
        break
    fi
done

# 9. Show status
echo
echo "=== Service Status ==="
$COMPOSE_CMD ps

echo
echo "=== Access Information ==="
print_status "OK" "OpenWebRX is running!"
print_status "INFO" "Web interface: http://localhost:8073"
print_status "INFO" "Username: admin"
print_status "INFO" "Password: hackrf"

echo
echo "=== Useful Commands ==="
echo "  View logs:    $COMPOSE_CMD logs -f"
echo "  Stop service: $COMPOSE_CMD down"
echo "  Restart:      $COMPOSE_CMD restart"
echo "  Status:       $COMPOSE_CMD ps"

echo
print_status "INFO" "Startup complete!"
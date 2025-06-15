#!/bin/bash
# Test script for HackRF auto-start Docker setup

set -e

echo "=== Testing HackRF Auto-start Docker Setup ==="
echo "Test started at: $(date)"

# Change to project directory
cd /home/pi/projects/stinkster

# Test 1: Check all required files
echo "\n1. Checking required files..."
required_files=(
    "Dockerfile.hackrf-autostart"
    "openwebrx-hackrf-config.json"
    "docker/entrypoint-hackrf.sh"
    "docker-compose.hackrf-autostart.yml"
    "build-hackrf-autostart.sh"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (MISSING)"
        exit 1
    fi
done

# Test 2: Validate Dockerfile syntax  
echo "\n2. Validating Dockerfile syntax..."
# Skip actual build for speed, just check basic format
if grep -q "^FROM " Dockerfile.hackrf-autostart && grep -q "^COPY " Dockerfile.hackrf-autostart; then
    echo "  ✓ Dockerfile format appears valid"
else
    echo "  ✗ Dockerfile format issue"
    exit 1
fi

# Test 3: Check docker-compose syntax
echo "\n3. Validating docker-compose syntax..."
if docker compose -f docker-compose.hackrf-autostart.yml config >/dev/null 2>&1; then
    echo "  ✓ Docker Compose configuration valid"
else
    echo "  ✗ Docker Compose configuration error"
    exit 1
fi

# Test 4: Check HackRF config JSON
echo "\n4. Validating HackRF configuration..."
if python3 -m json.tool openwebrx-hackrf-config.json >/dev/null 2>&1; then
    echo "  ✓ HackRF configuration JSON valid"
    # Show config summary
    echo "  SDR type: $(cat openwebrx-hackrf-config.json | grep '"type"' | head -1 | cut -d'"' -f4)"
    echo "  Profiles: $(cat openwebrx-hackrf-config.json | grep '"name"' | wc -l) configured"
else
    echo "  ✗ HackRF configuration JSON invalid"
    exit 1
fi

# Test 5: Check entrypoint script
echo "\n5. Validating entrypoint script..."
if bash -n docker/entrypoint-hackrf.sh; then
    echo "  ✓ Entrypoint script syntax valid"
else
    echo "  ✗ Entrypoint script syntax error"
    exit 1
fi

# Test 6: Check build script
echo "\n6. Validating build script..."
if bash -n build-hackrf-autostart.sh; then
    echo "  ✓ Build script syntax valid"
else
    echo "  ✗ Build script syntax error"
    exit 1
fi

# Test 7: Check HackRF on host (optional)
echo "\n7. Checking HackRF availability on host..."
if command -v hackrf_info >/dev/null 2>&1; then
    if hackrf_info >/dev/null 2>&1; then
        echo "  ✓ HackRF detected and functional"
        hackrf_info | grep "Serial number\|Board ID" | sed 's/^/    /'
    else
        echo "  ⚠ HackRF tools installed but device not detected"
        echo "    (This is OK if HackRF is not connected)"
    fi
else
    echo "  ⚠ HackRF tools not installed on host"
    echo "    (Docker container will have its own tools)"
fi

# Test 8: Docker environment check
echo "\n8. Checking Docker environment..."
if docker info >/dev/null 2>&1; then
    echo "  ✓ Docker daemon accessible"
else
    echo "  ✗ Docker daemon not accessible"
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    echo "  ✓ Docker Compose available"
else
    echo "  ✗ Docker Compose not available"
    exit 1
fi

echo "\n=== All Tests Passed! ==="
echo "\nReady to build and run HackRF auto-start container:"
echo "  Build: ./build-hackrf-autostart.sh"
echo "  Run:   ./start-openwebrx-autostart.sh"
echo "  Or:    docker compose -f docker-compose.hackrf-autostart.yml up -d"
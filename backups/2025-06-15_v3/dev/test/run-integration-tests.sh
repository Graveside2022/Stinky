#!/bin/bash
# Run integration tests

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Running integration tests..."

# Test network interface availability
INTERFACE="${NETWORK_INTERFACE:-wlan2}"
if ip link show "$INTERFACE" >/dev/null 2>&1; then
    echo "✓ Network interface $INTERFACE is available"
else
    echo "! Network interface $INTERFACE not found (will use simulation mode)"
fi

# Test Docker availability for OpenWebRX
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        echo "✓ Docker is available and running"
    else
        echo "! Docker is installed but not running"
    fi
else
    echo "! Docker is not installed"
fi

# Test HackRF availability
if command -v hackrf_info >/dev/null 2>&1; then
    if hackrf_info >/dev/null 2>&1; then
        echo "✓ HackRF device detected"
    else
        echo "! HackRF tools installed but no device detected"
    fi
else
    echo "! HackRF tools not installed"
fi

# Test Kismet availability
if command -v kismet >/dev/null 2>&1; then
    echo "✓ Kismet is installed"
else
    echo "! Kismet is not installed"
fi

# Test GPSD availability
if command -v gpsd >/dev/null 2>&1; then
    echo "✓ GPSD is installed"
else
    echo "! GPSD is not installed"
fi

echo "Integration tests completed"

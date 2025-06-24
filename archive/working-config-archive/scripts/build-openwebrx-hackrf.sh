#!/bin/bash
# OpenWebRX HackRF Container Build Script
# This script builds and deploys OpenWebRX with native HackRF support

set -e

echo "=== OpenWebRX HackRF Container Build Script ==="
echo "Building OpenWebRX container with native HackRF support..."

# Change to docker directory
cd "$(dirname "$0")/docker"

# Check if HackRF is connected
if lsusb | grep -q "1d50:6089"; then
    echo "✓ HackRF device detected on host"
    hackrf_info | head -5
else
    echo "⚠️  WARNING: No HackRF device detected on host"
    echo "   Make sure HackRF is connected before starting container"
fi

# Create necessary directories
echo "Creating Docker volume directories..."
mkdir -p config logs

# Stop and remove existing container if running
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Remove existing image to force rebuild
echo "Removing existing image..."
docker rmi openwebrx-hackrf-only:latest 2>/dev/null || true

# Build new container
echo "Building OpenWebRX container with HackRF support..."
docker-compose build --no-cache

# Start the container
echo "Starting OpenWebRX container..."
docker-compose up -d

# Wait for container to be ready
echo "Waiting for container to start..."
sleep 5

# Check container status
echo "Checking container status..."
docker-compose ps

# Test HackRF detection inside container
echo ""
echo "Testing HackRF detection inside container..."
docker exec openwebrx-hackrf hackrf_info | head -5 || echo "HackRF test failed"

# Test SoapySDR detection
echo ""
echo "Testing SoapySDR device detection..."
docker exec openwebrx-hackrf SoapySDRUtil --find | grep -A10 "Found device" || echo "No SoapySDR devices found"

# Show container logs
echo ""
echo "Container startup logs:"
docker logs openwebrx-hackrf 2>&1 | tail -10

# Final status
echo ""
echo "=== Build and Deployment Complete ==="
echo ""
echo "🌐 OpenWebRX Web Interface:"
echo "   http://localhost:8073"
echo "   Username: admin"
echo "   Password: hackrf"
echo ""
echo "📊 Container Status:"
docker-compose ps
echo ""
echo "📝 View Logs:"
echo "   docker logs openwebrx-hackrf -f"
echo ""
echo "🔧 Troubleshooting:"
echo "   docker exec -it openwebrx-hackrf bash"
echo ""
echo "🛑 Stop Container:"
echo "   docker-compose down"
echo ""

# Test web interface accessibility
if curl -s http://localhost:8073/ >/dev/null; then
    echo "✅ OpenWebRX web interface is accessible"
else
    echo "❌ OpenWebRX web interface is not accessible"
    echo "   Check container logs: docker logs openwebrx-hackrf"
fi
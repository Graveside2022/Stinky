#!/bin/bash
# OpenWebRX development wrapper

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Starting OpenWebRX Docker container..."

# Check if container exists
if docker ps -a --format "table {{.Names}}" | grep -q "^openwebrx$"; then
    echo "Starting existing OpenWebRX container..."
    docker start openwebrx
else
    echo "Creating new OpenWebRX container..."
    cd "${PROJECT_ROOT}"
    docker-compose up -d openwebrx
fi

# Wait for container to be ready
echo "Waiting for OpenWebRX to be ready..."
sleep 10

# Show container status
docker ps --filter name=openwebrx

echo "OpenWebRX should be available at http://localhost:8073"

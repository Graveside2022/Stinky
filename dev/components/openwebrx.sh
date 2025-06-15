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

# Apply HackRF configuration fix if needed
echo "Checking HackRF configuration..."
CONFIG_TYPE=$(docker exec openwebrx cat /var/lib/openwebrx/sdrs.json 2>/dev/null | grep -o '"type":\s*"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$CONFIG_TYPE" != "hackrf" ]; then
    echo "Applying native HackRF driver configuration..."
    
    # Use the existing openwebrx-hackrf-config.json if available
    if [ -f "${PROJECT_ROOT}/openwebrx-hackrf-config.json" ]; then
        docker cp "${PROJECT_ROOT}/openwebrx-hackrf-config.json" openwebrx:/var/lib/openwebrx/sdrs.json
        docker exec openwebrx chown openwebrx:openwebrx /var/lib/openwebrx/sdrs.json
        docker restart openwebrx
        sleep 10
        echo "HackRF configuration applied successfully"
    fi
fi

# Show container status
docker ps --filter name=openwebrx

echo "OpenWebRX should be available at http://localhost:8074"

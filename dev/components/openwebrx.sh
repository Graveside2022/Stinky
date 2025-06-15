#!/bin/bash
# OpenWebRX component management script
# Part of the unified development environment

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

# Source configuration
source "$PROJECT_ROOT/dev/config/dev.conf" 2>/dev/null || {
    echo "Development configuration not found, using defaults"
    LOGS_DIR="$PROJECT_ROOT/dev/logs"
    PIDS_DIR="$PROJECT_ROOT/dev/pids"
}

# Component configuration
COMPONENT_NAME="openwebrx"
PID_FILE="$PIDS_DIR/$COMPONENT_NAME.pid"
LOG_FILE="$LOGS_DIR/$COMPONENT_NAME.log"

start_component() {
    echo "Starting OpenWebRX via Docker..."
    
    cd "$PROJECT_ROOT/docker"
    
    # Check if HackRF is connected
    if lsusb | grep -q "1d50:6089"; then
        echo "✓ HackRF device detected"
    else
        echo "⚠️  WARNING: No HackRF device detected"
    fi
    
    # Start the container
    docker-compose up -d openwebrx
    
    # Get container PID for tracking
    CONTAINER_ID=$(docker ps -q -f name=openwebrx-hackrf)
    if [ -n "$CONTAINER_ID" ]; then
        echo "$CONTAINER_ID" > "$PID_FILE"
        echo "OpenWebRX container started (ID: $CONTAINER_ID)"
        
        # Stream logs to dev logs directory
        docker logs -f openwebrx-hackrf > "$LOG_FILE" 2>&1 &
        
        # Wait for health check
        echo "Waiting for OpenWebRX to be ready..."
        for i in {1..30}; do
            if docker exec openwebrx-hackrf curl -s http://localhost:8073/ >/dev/null 2>&1; then
                echo "✅ OpenWebRX is ready at http://localhost:8073"
                echo "   Username: admin"
                echo "   Password: hackrf"
                
                # Test HackRF detection inside container
                echo "Testing HackRF detection inside container..."
                if docker exec openwebrx-hackrf hackrf_info >/dev/null 2>&1; then
                    echo "✅ HackRF detected inside container"
                else
                    echo "❌ HackRF not detected inside container"
                fi
                
                return 0
            fi
            sleep 2
        done
        echo "⚠️  Warning: OpenWebRX may not be fully ready yet"
        echo "   Check logs: docker logs openwebrx-hackrf -f"
    else
        echo "❌ Failed to start OpenWebRX container"
        return 1
    fi
}

stop_component() {
    echo "Stopping OpenWebRX..."
    
    cd "$PROJECT_ROOT/docker"
    docker-compose stop openwebrx
    
    # Stop log streaming
    pkill -f "docker logs.*openwebrx-hackrf" 2>/dev/null || true
    
    # Remove PID file
    rm -f "$PID_FILE"
    echo "OpenWebRX stopped"
}

restart_component() {
    stop_component
    sleep 2
    start_component
}

status_component() {
    cd "$PROJECT_ROOT/docker"
    
    if docker-compose ps openwebrx | grep -q "Up"; then
        echo "OpenWebRX: Running ✅"
        echo "  Container: $(docker ps -f name=openwebrx-hackrf --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}')"
        echo "  Web interface: http://localhost:8073"
        echo "  Admin credentials: admin/hackrf"
        
        # Check HackRF status
        if docker exec openwebrx-hackrf hackrf_info >/dev/null 2>&1; then
            echo "  HackRF status: Connected ✅"
        else
            echo "  HackRF status: Not detected ❌"
        fi
        
        # Check web interface
        if curl -s http://localhost:8073/ >/dev/null 2>&1; then
            echo "  Web interface: Accessible ✅"
        else
            echo "  Web interface: Not accessible ❌"
        fi
    else
        echo "OpenWebRX: Stopped ❌"
    fi
}

logs_component() {
    cd "$PROJECT_ROOT/docker"
    
    if [ "$1" = "-f" ]; then
        echo "Streaming OpenWebRX logs (Ctrl+C to stop)..."
        docker-compose logs -f openwebrx
    else
        echo "Recent OpenWebRX logs:"
        docker-compose logs --tail=50 openwebrx
    fi
}

rebuild_component() {
    echo "Rebuilding OpenWebRX container..."
    cd "$PROJECT_ROOT"
    
    # Stop container first
    stop_component
    
    # Remove existing image
    docker rmi openwebrx-hackrf-only:latest 2>/dev/null || true
    
    # Rebuild using the build script
    ./build-openwebrx-hackrf.sh
}

case "${1:-}" in
    start)
        start_component
        ;;
    stop)
        stop_component
        ;;
    restart)
        restart_component
        ;;
    status)
        status_component
        ;;
    logs)
        logs_component "${2:-}"
        ;;
    rebuild)
        rebuild_component
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs [-f]|rebuild}"
        echo ""
        echo "Commands:"
        echo "  start    - Start OpenWebRX container"
        echo "  stop     - Stop OpenWebRX container"
        echo "  restart  - Restart OpenWebRX container"
        echo "  status   - Show container and HackRF status"
        echo "  logs     - Show recent logs"
        echo "  logs -f  - Stream logs in real-time"
        echo "  rebuild  - Rebuild container from scratch"
        exit 1
        ;;
esac
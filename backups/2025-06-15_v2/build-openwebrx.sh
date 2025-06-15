#!/bin/bash
# OpenWebRX with HackRF build and deployment script
# This script builds and manages the OpenWebRX Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="openwebrx-hackrf"
CONTAINER_NAME="openwebrx-hackrf"
CONFIG_SOURCE="${OPENWEBRX_DIR:-/home/pi/projects/stinkster/openwebrx}-hackrf-config.json"

# Functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_hackrf() {
    print_status "Checking for HackRF device..."
    if lsusb | grep -q "1d50:6089"; then
        print_status "HackRF device detected!"
        hackrf_info 2>/dev/null || print_warning "hackrf_info not available on host"
    else
        print_warning "No HackRF device detected. Make sure it's connected."
    fi
}

stop_container() {
    if docker ps -q -f name=$CONTAINER_NAME > /dev/null 2>&1; then
        print_status "Stopping existing container..."
        docker stop $CONTAINER_NAME || true
        docker rm $CONTAINER_NAME || true
    fi
}

build_image() {
    print_status "Building OpenWebRX image with HackRF support..."
    docker build -t $IMAGE_NAME:latest .
    
    if [ $? -eq 0 ]; then
        print_status "Build completed successfully!"
    else
        print_error "Build failed!"
        exit 1
    fi
}

deploy_config() {
    if [ -f "$CONFIG_SOURCE" ]; then
        print_status "Found existing HackRF configuration at $CONFIG_SOURCE"
        read -p "Copy this configuration to the container? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Create a temporary container to copy the config
            docker run --rm -v openwebrx-settings:/data -v "$CONFIG_SOURCE:/config.json:ro" \
                alpine cp /config.json /data/sdrs.json
            print_status "Configuration copied!"
        fi
    fi
}

start_container() {
    print_status "Starting OpenWebRX container..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_status "Container started successfully!"
        print_status "Waiting for OpenWebRX to initialize..."
        sleep 10
        
        # Check if service is running
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:8073 | grep -q "200"; then
            print_status "OpenWebRX is running!"
            print_status "Access the web interface at: http://localhost:8073"
            print_status "Default credentials: admin / hackrf"
        else
            print_warning "OpenWebRX might still be starting up. Check logs with: docker logs $CONTAINER_NAME"
        fi
    else
        print_error "Failed to start container!"
        exit 1
    fi
}

show_logs() {
    print_status "Showing container logs..."
    docker logs -f $CONTAINER_NAME
}

test_soapy() {
    print_status "Testing SoapySDR in container..."
    docker exec $CONTAINER_NAME SoapySDRUtil --find
}

# Main menu
case "${1:-help}" in
    build)
        check_hackrf
        stop_container
        build_image
        ;;
    start)
        check_hackrf
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        stop_container
        start_container
        ;;
    logs)
        show_logs
        ;;
    test)
        test_soapy
        ;;
    deploy)
        check_hackrf
        stop_container
        build_image
        deploy_config
        start_container
        ;;
    clean)
        stop_container
        print_status "Removing image..."
        docker rmi $IMAGE_NAME:latest || true
        print_status "Cleanup complete!"
        ;;
    *)
        echo "OpenWebRX HackRF Docker Management Script"
        echo ""
        echo "Usage: $0 {build|start|stop|restart|logs|test|deploy|clean}"
        echo ""
        echo "Commands:"
        echo "  build    - Build the Docker image"
        echo "  start    - Start the container"
        echo "  stop     - Stop the container"
        echo "  restart  - Restart the container"
        echo "  logs     - Show container logs"
        echo "  test     - Test SoapySDR device detection"
        echo "  deploy   - Build, configure, and start (full deployment)"
        echo "  clean    - Stop container and remove image"
        echo ""
        echo "Example: $0 deploy"
        ;;
esac
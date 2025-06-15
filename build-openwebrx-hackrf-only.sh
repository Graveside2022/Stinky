#!/bin/bash
#
# Build OpenWebRX HackRF-Only Docker Image
# This script builds the specialized OpenWebRX image from source with native HackRF support
#
# Usage: ./build-openwebrx-hackrf-only.sh
#
# The image is built from the Dockerfile in docker/Dockerfile and tagged as openwebrx-hackrf-only:latest
# This image includes:
#   - Native HackRF driver support (not just SoapySDR)
#   - Optimized gain settings for HackRF One
#   - Pre-configured band profiles
#   - All necessary HackRF tools and libraries
#
# Requirements:
#   - Docker installed and running
#   - docker/Dockerfile present in the project
#   - Sufficient disk space (~500MB for the image)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/pi/projects/stinkster"
DOCKER_DIR="${PROJECT_ROOT}/docker"
DOCKERFILE="${DOCKER_DIR}/Dockerfile"
IMAGE_NAME="openwebrx-hackrf-only"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
BUILD_LOG="${PROJECT_ROOT}/build-openwebrx-hackrf-only.log"

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1" | tee -a "$BUILD_LOG"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$BUILD_LOG"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$BUILD_LOG"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$BUILD_LOG"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Run: curl -fsSL https://get.docker.com | sh"
        echo "     sudo usermod -aG docker $USER"
        echo "     Then logout and login again"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running or you don't have permissions."
        echo "Try: sudo systemctl start docker"
        echo "Or add yourself to docker group: sudo usermod -aG docker $USER"
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "$DOCKERFILE" ]; then
        print_error "Dockerfile not found at: $DOCKERFILE"
        exit 1
    fi
    
    # Check disk space (need at least 1GB free)
    AVAILABLE_SPACE=$(df -BG /var/lib/docker | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 1 ]; then
        print_warning "Low disk space: ${AVAILABLE_SPACE}GB available. Build may fail."
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    print_success "Prerequisites check passed"
}

# Check for HackRF device
check_hackrf() {
    print_status "Checking for HackRF device..."
    if lsusb | grep -q "1d50:6089"; then
        print_success "HackRF One detected!"
        local hackrf_info=$(lsusb | grep "1d50:6089")
        echo "  Device: $hackrf_info"
        
        # Try to get more info if hackrf_info is available
        if command -v hackrf_info &> /dev/null; then
            echo "  HackRF Info:"
            hackrf_info 2>&1 | head -10 || true
        fi
    else
        print_warning "No HackRF device detected. The image will build but SDR won't work until device is connected."
    fi
}

# Clean up old images
cleanup_old_images() {
    print_status "Checking for existing images..."
    
    if docker images | grep -q "$IMAGE_NAME"; then
        print_warning "Existing $IMAGE_NAME image found"
        docker images | grep "$IMAGE_NAME"
        
        read -p "Remove existing image and rebuild from scratch? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Removing existing images..."
            docker rmi -f $(docker images -q "$IMAGE_NAME") 2>/dev/null || true
            print_success "Old images removed"
        fi
    fi
}

# Build the Docker image
build_image() {
    print_status "Building OpenWebRX HackRF-Only Docker image..."
    print_status "This may take 10-15 minutes depending on your internet connection..."
    echo "Build log: $BUILD_LOG"
    echo
    
    # Change to docker directory
    cd "$DOCKER_DIR"
    
    # Start the build
    START_TIME=$(date +%s)
    
    if docker build \
        --no-cache \
        --progress=plain \
        -t "$FULL_IMAGE_NAME" \
        -f Dockerfile \
        . 2>&1 | tee -a "$BUILD_LOG"; then
        
        END_TIME=$(date +%s)
        BUILD_TIME=$((END_TIME - START_TIME))
        BUILD_MINUTES=$((BUILD_TIME / 60))
        BUILD_SECONDS=$((BUILD_TIME % 60))
        
        print_success "Docker image built successfully!"
        print_success "Build time: ${BUILD_MINUTES}m ${BUILD_SECONDS}s"
    else
        print_error "Docker build failed! Check the build log: $BUILD_LOG"
        exit 1
    fi
}

# Verify the built image
verify_image() {
    print_status "Verifying built image..."
    
    # Check if image exists
    if ! docker images | grep -q "$IMAGE_NAME.*$IMAGE_TAG"; then
        print_error "Image not found after build!"
        exit 1
    fi
    
    # Get image details
    IMAGE_ID=$(docker images -q "$FULL_IMAGE_NAME")
    IMAGE_SIZE=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep "$FULL_IMAGE_NAME" | awk '{print $2}')
    
    print_success "Image verified:"
    echo "  Name: $FULL_IMAGE_NAME"
    echo "  ID: $IMAGE_ID"
    echo "  Size: $IMAGE_SIZE"
    
    # Test running the image briefly
    print_status "Testing image startup..."
    if docker run --rm --name test-openwebrx "$FULL_IMAGE_NAME" echo "Image test successful" 2>&1 | tee -a "$BUILD_LOG"; then
        print_success "Image test passed"
    else
        print_warning "Image test had warnings - this may be normal if no HackRF is connected"
    fi
}

# Save image backup
save_image_backup() {
    print_status "Creating image backup..."
    
    BACKUP_DIR="${PROJECT_ROOT}/docker-backup"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="${BACKUP_DIR}/openwebrx-hackrf-only_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    read -p "Save a backup of the built image? This will use ~250MB of disk space. (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Saving image to: $BACKUP_FILE"
        print_status "This may take a few minutes..."
        
        if docker save "$FULL_IMAGE_NAME" | gzip > "$BACKUP_FILE"; then
            local backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
            print_success "Image backup saved: $BACKUP_FILE ($backup_size)"
            echo "To restore this image later, run:"
            echo "  gunzip -c $BACKUP_FILE | docker load"
        else
            print_error "Failed to save image backup"
        fi
    fi
}

# Create helper scripts
create_helper_scripts() {
    print_status "Creating helper scripts..."
    
    # Create quick start script
    cat > "${PROJECT_ROOT}/start-openwebrx-hackrf.sh" << 'EOF'
#!/bin/bash
# Quick start script for OpenWebRX with HackRF-Only image

cd "$(dirname "${BASH_SOURCE[0]}")"

# Check if image exists
if ! docker images | grep -q "openwebrx-hackrf-only.*latest"; then
    echo "ERROR: openwebrx-hackrf-only:latest image not found!"
    echo "Please run ./build-openwebrx-hackrf-only.sh first"
    exit 1
fi

# Start using docker-compose
if [ -f docker-compose.yml ]; then
    docker-compose up -d openwebrx
    echo "OpenWebRX started. Access at: http://localhost:8073"
else
    echo "ERROR: docker-compose.yml not found!"
    exit 1
fi
EOF
    chmod +x "${PROJECT_ROOT}/start-openwebrx-hackrf.sh"
    
    print_success "Helper scripts created"
}

# Update docker-compose.yml to use the built image
update_compose_file() {
    print_status "Updating docker-compose.yml..."
    
    # Check if docker-compose.yml exists
    if [ -f "${PROJECT_ROOT}/docker-compose.yml" ]; then
        # Backup existing file
        cp "${PROJECT_ROOT}/docker-compose.yml" "${PROJECT_ROOT}/docker-compose.yml.backup"
        
        # Update the image reference
        if grep -q "openwebrx-hackrf-only:latest" "${PROJECT_ROOT}/docker-compose.yml"; then
            print_success "docker-compose.yml already configured for hackrf-only image"
        else
            print_warning "docker-compose.yml needs to be updated to use openwebrx-hackrf-only:latest"
            echo "Please update the openwebrx service image to: openwebrx-hackrf-only:latest"
        fi
    else
        print_warning "No docker-compose.yml found in project root"
    fi
}

# Display next steps
show_next_steps() {
    local ip=$(hostname -I | cut -d' ' -f1)
    
    echo -e "\n${GREEN}=== Build Complete! ===${NC}"
    echo -e "\n${YELLOW}Image Details:${NC}"
    echo "  Name: $FULL_IMAGE_NAME"
    echo "  Size: $IMAGE_SIZE"
    echo "  Build log: $BUILD_LOG"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Start OpenWebRX:"
    echo "   cd $PROJECT_ROOT"
    echo "   docker-compose up -d openwebrx"
    echo ""
    echo "2. Access the web interface:"
    echo "   Local: http://localhost:8073"
    echo "   Network: http://${ip}:8073"
    echo "   Username: admin"
    echo "   Password: hackrf"
    echo ""
    echo "3. Verify HackRF detection:"
    echo "   docker exec openwebrx hackrf_info"
    echo ""
    echo "4. Check logs if needed:"
    echo "   docker logs -f openwebrx"
    
    echo -e "\n${YELLOW}Quick Commands:${NC}"
    echo "  Start: ./start-openwebrx-hackrf.sh"
    echo "  Stop: docker-compose stop openwebrx"
    echo "  Logs: docker logs -f openwebrx"
    echo "  Shell: docker exec -it openwebrx bash"
}

# Main execution
main() {
    echo -e "${BLUE}=== OpenWebRX HackRF-Only Image Builder ===${NC}"
    echo "This script builds the specialized OpenWebRX Docker image with native HackRF support"
    echo "Build started at: $(date)"
    echo
    
    # Initialize log file
    echo "=== OpenWebRX HackRF-Only Build Log ===" > "$BUILD_LOG"
    echo "Started: $(date)" >> "$BUILD_LOG"
    echo "" >> "$BUILD_LOG"
    
    # Run all steps
    check_prerequisites
    check_hackrf
    cleanup_old_images
    build_image
    verify_image
    save_image_backup
    create_helper_scripts
    update_compose_file
    show_next_steps
    
    echo -e "\n${GREEN}Build process completed successfully!${NC}"
    echo "Finished at: $(date)"
}

# Run main function
main "$@"
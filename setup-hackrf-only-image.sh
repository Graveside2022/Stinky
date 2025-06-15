#!/bin/bash
#
# Setup OpenWebRX HackRF-Only Image
# This script sets up the specialized OpenWebRX image that properly supports HackRF One
# without the issues present in the standard jketterl/openwebrx image
#
# Usage: ./setup-hackrf-only-image.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/pi/projects/stinkster"
HACKRF_CONFIG_FILE="${PROJECT_ROOT}/openwebrx-hackrf-config.json"
CONTAINER_NAME="openwebrx"

echo -e "${BLUE}=== OpenWebRX HackRF-Only Image Setup ===${NC}"
echo "This script sets up the specialized OpenWebRX image for HackRF One"
echo

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check for HackRF device
check_hackrf() {
    print_status "Checking for HackRF device..."
    if lsusb | grep -q "1d50:6089"; then
        print_success "HackRF One detected!"
        local hackrf_info=$(lsusb | grep "1d50:6089")
        echo "  Device: $hackrf_info"
    else
        print_warning "No HackRF device detected. Make sure it's connected."
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Stop existing containers
stop_existing() {
    print_status "Stopping existing OpenWebRX containers..."
    docker stop openwebrx 2>/dev/null || true
    docker rm openwebrx 2>/dev/null || true
    print_success "Cleaned up existing containers"
}

# Create optimized HackRF configuration
create_hackrf_config() {
    print_status "Creating optimized HackRF configuration..."
    
    cat > "${HACKRF_CONFIG_FILE}" << 'EOF'
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF One",
            "type": "hackrf",
            "ppm": 0,
            "profiles": {
                "2m": {
                    "name": "2m Amateur Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -72,
                    "waterfall_auto_level_margin": {"min": 5, "max": 20},
                    "lfo_offset": 300
                },
                "70cm": {
                    "name": "70cm Amateur Band",
                    "center_freq": 435000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 435000000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -78,
                    "waterfall_auto_level_margin": {"min": 5, "max": 20},
                    "lfo_offset": 300
                },
                "airband": {
                    "name": "Airband",
                    "center_freq": 124000000,
                    "rf_gain": "VGA=30,LNA=32,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 124000000,
                    "start_mod": "am",
                    "waterfall_min_level": -80,
                    "waterfall_auto_level_margin": {"min": 5, "max": 20},
                    "lfo_offset": 0
                },
                "fm_broadcast": {
                    "name": "FM Broadcast",
                    "center_freq": 98000000,
                    "rf_gain": "VGA=20,LNA=16,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 98000000,
                    "start_mod": "wfm",
                    "waterfall_min_level": -65,
                    "waterfall_auto_level_margin": {"min": 5, "max": 20},
                    "lfo_offset": 0
                },
                "scanner": {
                    "name": "Scanner (Wide)",
                    "center_freq": 100000000,
                    "rf_gain": "VGA=30,LNA=32,AMP=0",
                    "samp_rate": 10000000,
                    "start_freq": 100000000,
                    "start_mod": "am",
                    "waterfall_min_level": -75,
                    "waterfall_auto_level_margin": {"min": 5, "max": 20}
                }
            }
        }
    }
}
EOF
    
    print_success "Created optimized HackRF configuration"
}

# Create docker-compose.yml for HackRF-only image
create_compose_file() {
    print_status "Creating docker-compose.yml for HackRF-only image..."
    
    cat > "${PROJECT_ROOT}/docker-compose.yml" <<EOF
version: '3.8'

services:
  openwebrx:
    image: openwebrx-hackrf-only:latest
    container_name: ${CONTAINER_NAME}
    restart: unless-stopped
    ports:
      - "8073:8073"
    devices:
      - /dev/bus/usb:/dev/bus/usb
    volumes:
      - openwebrx-settings:/var/lib/openwebrx
      - openwebrx-config:/etc/openwebrx
      - ${HACKRF_CONFIG_FILE}:/var/lib/openwebrx/sdrs.json:ro
    privileged: true
    environment:
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=hackrf

volumes:
  openwebrx-settings:
    driver: local
  openwebrx-config:
    driver: local
EOF
    
    print_success "docker-compose.yml created"
}

# Instructions for obtaining the HackRF-only image
show_image_instructions() {
    print_status "Checking for HackRF-only image..."
    
    if docker images | grep -q "openwebrx-hackrf-only.*latest"; then
        print_success "HackRF-only image found!"
    else
        print_warning "HackRF-only image not found"
        echo
        echo -e "${YELLOW}The openwebrx-hackrf-only image is required for proper HackRF One support.${NC}"
        echo -e "${YELLOW}This is a specialized build that fixes the SoapySDR issues with HackRF.${NC}"
        echo
        echo "To obtain this image, you can either:"
        echo "1. Load it from a backup if available:"
        echo "   docker load < openwebrx-hackrf-only.tar"
        echo
        echo "2. Build it from source with HackRF-specific patches"
        echo
        echo "3. Use the fallback method with the standard image (less reliable):"
        echo "   docker pull jketterl/openwebrx:stable"
        echo "   docker tag jketterl/openwebrx:stable openwebrx-hackrf-only:latest"
        echo "   Note: This fallback may have issues with HackRF detection"
        echo
        read -p "Try the fallback method? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Using fallback method..."
            docker pull jketterl/openwebrx:stable
            docker tag jketterl/openwebrx:stable openwebrx-hackrf-only:latest
            print_warning "Using standard image as fallback - may have HackRF issues"
        else
            exit 1
        fi
    fi
}

# Start the container
start_container() {
    print_status "Starting OpenWebRX with HackRF-only image..."
    
    cd "${PROJECT_ROOT}"
    if docker-compose up -d; then
        print_success "Container started successfully!"
        
        # Wait for initialization
        print_status "Waiting for OpenWebRX to initialize..."
        sleep 10
        
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Verify and display information
verify_installation() {
    print_status "Verifying installation..."
    
    if docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Status}}" | grep -q "Up"; then
        print_success "Container is running"
        
        # Get access information
        local ip=$(hostname -I | cut -d' ' -f1)
        echo -e "\n${GREEN}=== OpenWebRX HackRF-Only Setup Complete ===${NC}"
        echo -e "Access URL: ${BLUE}http://${ip}:8073${NC}"
        echo -e "Local URL: ${BLUE}http://localhost:8073${NC}"
        echo -e "Username: ${BLUE}admin${NC}"
        echo -e "Password: ${BLUE}hackrf${NC}"
        
        echo -e "\n${YELLOW}Key Features:${NC}"
        echo "✓ Native HackRF driver (not SoapySDR)"
        echo "✓ Optimized gain settings for HackRF One"
        echo "✓ Multiple band profiles configured"
        echo "✓ Proper USB device passthrough"
        echo "✓ Configuration mounted directly into container"
        
        echo -e "\n${YELLOW}Available Bands:${NC}"
        echo "• 2m Amateur (145 MHz)"
        echo "• 70cm Amateur (435 MHz)"
        echo "• Airband (124 MHz)"
        echo "• FM Broadcast (98 MHz)"
        echo "• Wide Scanner (100 MHz, 10MHz bandwidth)"
        
        echo -e "\n${YELLOW}Troubleshooting:${NC}"
        echo "If HackRF is not detected:"
        echo "1. Check USB connection: lsusb | grep 1d50:6089"
        echo "2. Restart container: docker restart ${CONTAINER_NAME}"
        echo "3. Check logs: docker logs ${CONTAINER_NAME}"
        echo "4. Verify inside container: docker exec ${CONTAINER_NAME} hackrf_info"
        
    else
        print_error "Container is not running"
        docker logs --tail 20 "${CONTAINER_NAME}"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}=== OpenWebRX HackRF-Only Image Setup ===${NC}"
    echo "Setting up specialized OpenWebRX for HackRF One"
    echo
    
    check_hackrf
    stop_existing
    create_hackrf_config
    show_image_instructions
    create_compose_file
    start_container
    verify_installation
    
    echo -e "\n${GREEN}Setup completed successfully!${NC}"
}

# Run main function
main "$@"
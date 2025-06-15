#!/bin/bash
#
# Stinkster Installation Script
# Orchestrates the complete installation of the Stinkster system on a fresh Raspberry Pi
#
# This script will:
# - Install system dependencies
# - Set up required services (GPSD, Kismet, Docker)
# - Clone/download all necessary repositories
# - Create Python virtual environments
# - Configure system settings
# - Set up systemd services
#
# Usage: ./install.sh
#
# Author: Stinkster Project
# Date: 2025-06-15

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Installation directories
INSTALL_BASE="/home/pi"
LOG_DIR="${INSTALL_BASE}/tmp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STINKSTER_ROOT="/home/pi/projects/stinkster"

# Progress tracking variables
TOTAL_STEPS=15
CURRENT_STEP=0

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

# Function to show progress
show_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local percentage=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    echo -e "${BLUE}[PROGRESS]${NC} Step $CURRENT_STEP/$TOTAL_STEPS ($percentage%) - $1"
    
    # Create a simple progress bar
    local bar_length=30
    local filled_length=$((CURRENT_STEP * bar_length / TOTAL_STEPS))
    local bar=""
    for ((i=0; i<filled_length; i++)); do bar+="█"; done
    for ((i=filled_length; i<bar_length; i++)); do bar+="░"; done
    echo -e "${BLUE}[$bar]${NC} $percentage%"
    echo
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

# Function to validate prerequisites
validate_prerequisites() {
    print_status "Validating prerequisites..."
    local errors=0
    
    # Check internet connectivity
    if ! curl -s --head --connect-timeout 5 http://www.google.com/ > /dev/null; then
        print_error "No internet connectivity detected"
        errors=$((errors + 1))
    fi
    
    # Check available disk space (need at least 2GB free)
    local available_kb=$(df / | tail -1 | awk '{print $4}')
    local available_gb=$((available_kb / 1024 / 1024))
    if [ "$available_gb" -lt 2 ]; then
        print_error "Insufficient disk space. Need at least 2GB free, have ${available_gb}GB"
        errors=$((errors + 1))
    fi
    
    # Check if we have sudo access
    if ! sudo -n true 2>/dev/null; then
        print_error "This script requires sudo access. Please ensure 'pi' user has passwordless sudo"
        errors=$((errors + 1))
    fi
    
    # Check for essential commands
    local required_commands=("python3" "git" "curl" "wget" "systemctl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "Required command '$cmd' not found"
            errors=$((errors + 1))
        fi
    done
    
    if [ "$errors" -gt 0 ]; then
        print_error "Found $errors prerequisite errors. Please fix them before continuing."
        return 1
    fi
    
    print_success "Prerequisites validated"
    return 0
}

# Function to check hardware requirements
check_hardware() {
    print_status "Checking hardware requirements..."
    local warnings=0
    
    # Check for USB devices
    if ! lsusb > /dev/null 2>&1; then
        print_warning "Cannot detect USB devices - lsusb not available"
        warnings=$((warnings + 1))
    else
        print_status "USB devices detected:"
        lsusb | while read -r line; do
            print_status "  $line"
        done
    fi
    
    # Check for WiFi interfaces
    local wifi_count=$(iw dev 2>/dev/null | grep -c Interface || echo "0")
    if [ "$wifi_count" -eq 0 ]; then
        print_warning "No WiFi interfaces detected - Kismet functionality will be limited"
        warnings=$((warnings + 1))
    else
        print_success "Found $wifi_count WiFi interface(s)"
        iw dev 2>/dev/null | grep Interface | while read -r interface_line; do
            interface=$(echo "$interface_line" | awk '{print $2}')
            print_status "  WiFi interface: $interface"
        done
    fi
    
    # Check for HackRF (if connected)
    if lsusb | grep -q "1d50:6089"; then
        print_success "HackRF One detected"
    elif lsusb | grep -q "HackRF"; then
        print_success "HackRF device detected"
    else
        print_warning "HackRF not currently connected - SDR functionality will require manual setup"
        warnings=$((warnings + 1))
    fi
    
    # Check for GPS devices
    if ls /dev/ttyUSB* > /dev/null 2>&1 || ls /dev/ttyACM* > /dev/null 2>&1; then
        print_success "Serial devices detected (potential GPS devices):"
        ls -la /dev/ttyUSB* /dev/ttyACM* 2>/dev/null | while read -r line; do
            print_status "  $line"
        done
    else
        print_warning "No serial devices detected - GPS functionality will require manual setup"
        warnings=$((warnings + 1))
    fi
    
    if [ "$warnings" -gt 0 ]; then
        print_warning "Found $warnings hardware warnings. Installation will continue, but some features may require manual configuration."
    fi
    
    print_success "Hardware check completed"
}

# Function to handle errors gracefully
handle_error() {
    local exit_code=$?
    local line_number=$1
    
    print_error "An error occurred on line $line_number (exit code: $exit_code)"
    print_error "Installation failed. Check the logs above for details."
    
    # Cleanup on error
    print_status "Cleaning up partial installation..."
    
    # Stop any services that might have been started
    sudo systemctl stop stinkster 2>/dev/null || true
    sudo systemctl disable stinkster 2>/dev/null || true
    
    # Kill any background processes
    if [ -f "${LOG_DIR}/install.pids" ]; then
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done < "${LOG_DIR}/install.pids"
        rm -f "${LOG_DIR}/install.pids"
    fi
    
    print_error "Installation aborted. You can retry after fixing the issues."
    exit $exit_code
}

# Set up error handling
trap 'handle_error $LINENO' ERR

# Function to check if running on Raspberry Pi
check_raspberry_pi() {
    print_status "Checking if running on Raspberry Pi..."
    if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        print_warning "This doesn't appear to be a Raspberry Pi. Some features may not work correctly."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Running on Raspberry Pi"
    fi
}

# Function to check if running as pi user
check_user() {
    print_status "Checking user..."
    if [ "$USER" != "pi" ]; then
        print_error "This script should be run as the 'pi' user"
        exit 1
    fi
    print_success "Running as pi user"
}

# Function to update system
update_system() {
    print_status "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    print_success "System updated"
}

# Function to install system dependencies
install_system_deps() {
    print_status "Installing system dependencies..."
    
    # Core build tools
    sudo apt install -y \
        build-essential \
        python3-dev \
        python3-pip \
        python3-venv \
        git \
        vim \
        screen \
        tmux \
        htop \
        curl \
        wget
    
    # GPS and serial communication
    sudo apt install -y \
        gpsd \
        gpsd-clients \
        python3-gps \
        usbutils
    
    # Network and WiFi tools
    sudo apt install -y \
        net-tools \
        wireless-tools \
        iw \
        aircrack-ng
    
    # HackRF SDR tools
    sudo apt install -y \
        hackrf \
        libhackrf-dev \
        libhackrf0 \
        rtl-sdr \
        gqrx-sdr
    
    print_success "System dependencies installed"
}

# Function to install Kismet
install_kismet() {
    print_status "Installing Kismet..."
    
    # Add Kismet repository
    wget -O - https://www.kismetwireless.net/repos/kismet-release.gpg.key | sudo apt-key add -
    echo "deb https://www.kismetwireless.net/repos/apt/release/$(lsb_release -cs) $(lsb_release -cs) main" | \
        sudo tee /etc/apt/sources.list.d/kismet.list
    
    sudo apt update
    sudo apt install -y kismet kismet-plugins
    
    # Add pi user to kismet group
    sudo usermod -aG kismet pi
    
    print_success "Kismet installed"
}

# Function to install Docker
install_docker() {
    print_status "Installing Docker..."
    
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker pi
        sudo systemctl enable docker
        sudo systemctl start docker
        print_success "Docker installed"
    else
        print_warning "Docker already installed"
    fi
}

# Function to create directory structure
create_directories() {
    print_status "Creating directory structure..."
    
    # Main directories
    mkdir -p "${STINKSTER_ROOT}/scripts"
    mkdir -p "${STINKSTER_ROOT}/logs"
    mkdir -p "${LOG_DIR}"
    mkdir -p "${STINKSTER_ROOT}/data/kismet"
    mkdir -p "${STINKSTER_ROOT}/hackrf"
    mkdir -p "${STINKSTER_ROOT}/gpsmav"
    mkdir -p "${STINKSTER_ROOT}/wigletotak"
    mkdir -p "${STINKSTER_ROOT}/openwebrx"
    mkdir -p "${STINKSTER_ROOT}/web"
    
    print_success "Directory structure created"
}

# Function to clone repositories
clone_repositories() {
    print_status "Cloning/downloading required repositories..."
    
    # GPSmav - MAVLink to GPSD bridge
    if [ ! -d "${INSTALL_BASE}/gpsmav/GPSmav" ]; then
        print_status "Setting up GPSmav structure..."
        mkdir -p "${INSTALL_BASE}/gpsmav/GPSmav"
        
        # Create placeholder structure for GPSmav
        # Note: Replace with actual repository when available
        # git clone https://github.com/USERNAME/GPSmav.git "${INSTALL_BASE}/gpsmav/GPSmav"
        
        # Create basic structure for now
        mkdir -p "${INSTALL_BASE}/gpsmav/GPSmav/src"
        print_warning "GPSmav repository structure created - manual setup required"
        print_warning "NOTE: GPSmav source code must be manually added to ${INSTALL_BASE}/gpsmav/GPSmav/"
    fi
    
    # WigleToTAK - WiFi data to TAK format converter
    if [ ! -d "${INSTALL_BASE}/WigletoTAK/WigleToTAK/TheStinkToTAK" ]; then
        print_status "Setting up WigleToTAK structure..."
        mkdir -p "${INSTALL_BASE}/WigletoTAK/WigleToTAK/TheStinkToTAK"
        
        # Create placeholder structure for WigleToTAK
        # Note: Replace with actual repository when available
        # git clone https://github.com/USERNAME/WigleToTAK.git "${INSTALL_BASE}/WigletoTAK/WigleToTAK"
        
        # Create basic structure for now
        mkdir -p "${INSTALL_BASE}/WigletoTAK/WigleToTAK/TheStinkToTAK/src"
        mkdir -p "${INSTALL_BASE}/WigletoTAK/WigleToTAK/TheStinkToTAK/static"
        mkdir -p "${INSTALL_BASE}/WigletoTAK/WigleToTAK/TheStinkToTAK/templates"
        print_warning "WigleToTAK repository structure created - manual setup required"
        print_warning "NOTE: WigleToTAK source code must be manually added to ${INSTALL_BASE}/WigletoTAK/WigleToTAK/TheStinkToTAK/"
    fi
    
    # OpenWebRX setup (uses existing Docker image)
    if [ ! -d "${INSTALL_BASE}/openwebrx" ]; then
        print_status "Setting up OpenWebRX directory..."
        mkdir -p "${INSTALL_BASE}/openwebrx/config"
    fi
    
    print_success "Repository setup complete"
}

# Function to setup Python virtual environments
setup_python_envs() {
    print_status "Setting up Python virtual environments..."
    
    # Use the new unified setup system
    if [ -f "${SCRIPT_DIR}/setup-venv-all.sh" ]; then
        print_status "Using unified virtual environment setup..."
        chmod +x "${SCRIPT_DIR}/setup-venv-all.sh"
        "${SCRIPT_DIR}/setup-venv-all.sh"
        print_success "Python environments created using unified system"
        return
    fi
    
    # Fallback to original method if unified scripts not available
    print_warning "Unified setup scripts not found, using fallback method..."
    
    # GPSmav environment
    if [ ! -d "/home/pi/gpsmav/GPSmav/venv" ]; then
        print_status "Creating GPSmav virtual environment..."
        mkdir -p "/home/pi/gpsmav/GPSmav"
        cd "/home/pi/gpsmav/GPSmav"
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install pymavlink pyserial
        deactivate
    fi
    
    # WigleToTAK environment
    if [ ! -d "/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/venv" ]; then
        print_status "Creating WigleToTAK virtual environment..."
        mkdir -p "/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK"
        cd "/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK"
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install "Flask==3.0.2"
        deactivate
    fi
    
    # HackRF tools environment
    if [ ! -d "/home/pi/HackRF/venv" ]; then
        print_status "Creating HackRF virtual environment..."
        mkdir -p "/home/pi/HackRF"
        cd "/home/pi/HackRF"
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install "Flask==3.0.2" "Flask-SocketIO>=5.5.1" "numpy>=2.3.0" "websockets>=15.0.1" "requests>=2.32.3"
        deactivate
    fi
    
    # Web services environment
    if [ ! -d "/home/pi/web/venv" ]; then
        print_status "Creating web services virtual environment..."
        mkdir -p "/home/pi/web"
        cd "/home/pi/web"
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install "Flask==3.0.2" "Flask-CORS>=6.0.1" "psutil>=7.0.0" "requests>=2.32.3" "python-dotenv>=1.0.0"
        deactivate
    fi
    
    print_success "Python environments created"
}

# Function to configure GPSD
configure_gpsd() {
    print_status "Configuring GPSD..."
    
    # Create GPSD configuration
    sudo tee /etc/default/gpsd > /dev/null <<EOF
# Default settings for the gpsd init script and the hotplug wrapper.

# Start the gpsd daemon automatically at boot time
START_DAEMON="true"

# Use USB hotplugging to add new USB devices automatically to the daemon
USBAUTO="true"

# Devices gpsd should collect to at boot time.
# They need to be read/writeable, either by user gpsd or the group dialout.
DEVICES="/dev/ttyUSB0 /dev/ttyACM0"

# Other options you want to pass to gpsd
GPSD_OPTIONS="-n -G"
EOF
    
    # Enable and start GPSD
    sudo systemctl enable gpsd
    sudo systemctl restart gpsd
    
    print_success "GPSD configured"
}

# Function to setup OpenWebRX
setup_openwebrx() {
    print_status "Setting up OpenWebRX..."
    
    # Create docker-compose.yml
    cat > "${INSTALL_BASE}/openwebrx/docker-compose.yml" <<EOF
version: '3'
services:
  openwebrx:
    image: jketterl/openwebrx:latest
    container_name: openwebrx
    restart: unless-stopped
    ports:
      - "8073:8073"
    devices:
      - /dev/bus/usb:/dev/bus/usb
    volumes:
      - ./config:/var/lib/openwebrx
    privileged: true
    environment:
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=${OPENWEBRX_ADMIN_PASSWORD:-hackrf}
EOF
    
    # Start OpenWebRX
    cd "${INSTALL_BASE}/openwebrx"
    docker-compose up -d
    
    print_success "OpenWebRX setup complete"
}

# Function to create startup scripts
create_startup_scripts() {
    print_status "Creating startup scripts..."
    
    # Create main orchestration script
    mkdir -p "${STINKSTER_ROOT}/src/orchestration"
    cat > "${STINKSTER_ROOT}/src/orchestration/gps_kismet_wigle.sh" <<'EOF'
#!/bin/bash
# Main orchestration script for Stinkster
# This script starts and manages GPS, Kismet, and WigleToTAK services

# Set up directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="${LOG_DIR:-/home/pi/tmp}/gps_kismet_wigle.pids"
LOG_FILE="${LOG_DIR:-/home/pi/tmp}/gps_kismet_wigle.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to cleanup on exit
cleanup() {
    log_message "Shutting down services..."
    
    # Kill processes
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    log_message "Cleanup complete"
    exit 0
}

trap cleanup EXIT INT TERM

# Start services
log_message "Starting Stinkster services..."

# Start GPSD service
log_message "Starting GPSD service..."
sudo systemctl start gpsd
if systemctl is-active --quiet gpsd; then
    log_message "GPSD started successfully"
else
    log_message "WARNING: GPSD failed to start"
fi

# Start GPSmav bridge (if available)
if [ -d "/home/pi/gpsmav/GPSmav" ] && [ -f "/home/pi/gpsmav/GPSmav/venv/bin/activate" ]; then
    log_message "Starting GPSmav bridge..."
    cd /home/pi/gpsmav/GPSmav
    source venv/bin/activate
    if [ -f "mavgps.py" ]; then
        ./mavgps.py > /home/pi/tmp/gpsmav.log 2>&1 &
        echo $! >> "$PID_FILE"
        log_message "GPSmav started with PID $!"
    fi
    deactivate
fi

# Start Kismet (if WiFi interface available)
if ip link show wlan2 >/dev/null 2>&1; then
    log_message "Starting Kismet on wlan2..."
    sudo ip link set wlan2 down 2>/dev/null
    sudo iw dev wlan2 set monitor none 2>/dev/null
    sudo ip link set wlan2 up 2>/dev/null
    kismet -c wlan2 --override wardrive > /home/pi/tmp/kismet.log 2>&1 &
    echo $! >> "$PID_FILE"
    log_message "Kismet started with PID $!"
elif ip link show wlan1 >/dev/null 2>&1; then
    log_message "Starting Kismet on wlan1..."
    sudo ip link set wlan1 down 2>/dev/null
    sudo iw dev wlan1 set monitor none 2>/dev/null
    sudo ip link set wlan1 up 2>/dev/null
    kismet -c wlan1 --override wardrive > /home/pi/tmp/kismet.log 2>&1 &
    echo $! >> "$PID_FILE"
    log_message "Kismet started with PID $!"
else
    log_message "WARNING: No suitable WiFi interface found for Kismet"
fi

# Start WigleToTAK (if available)
if [ -d "/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK" ] && [ -f "/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/venv/bin/activate" ]; then
    log_message "Starting WigleToTAK service..."
    cd /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK
    source venv/bin/activate
    if [ -f "WigleToTak2.py" ]; then
        python3 WigleToTak2.py > /home/pi/tmp/wigletotak.log 2>&1 &
        echo $! >> "$PID_FILE"
        log_message "WigleToTAK started with PID $!"
    fi
    deactivate
fi

# Start OpenWebRX (if configured)
if [ -f "/home/pi/openwebrx/docker-compose.yml" ]; then
    log_message "Starting OpenWebRX..."
    cd /home/pi/openwebrx
    docker-compose up -d > /home/pi/tmp/openwebrx.log 2>&1
    log_message "OpenWebRX startup attempted"
fi

log_message "All services started"

# Keep script running
while true; do
    sleep 60
done
EOF
    
    chmod +x "${STINKSTER_ROOT}/src/orchestration/gps_kismet_wigle.sh"
    
    # Create Kismet startup script
    mkdir -p "${STINKSTER_ROOT}/src/scripts"
    cat > "${STINKSTER_ROOT}/src/scripts/start_kismet.sh" <<'EOF'
#!/bin/bash
# Start Kismet with proper configuration

# Set WiFi adapter to monitor mode
sudo ip link set wlan2 down 2>/dev/null
sudo iw dev wlan2 set monitor none 2>/dev/null
sudo ip link set wlan2 up 2>/dev/null

# Start Kismet
kismet -c wlan2 --override wardrive &

echo "Kismet started with PID $!"
EOF
    
    chmod +x "${STINKSTER_ROOT}/src/scripts/start_kismet.sh"
    
    print_success "Startup scripts created"
}

# Function to create systemd service
create_systemd_service() {
    print_status "Creating systemd service..."
    
    sudo tee /etc/systemd/system/stinkster.service > /dev/null <<EOF
[Unit]
Description=Stinkster SDR/WiFi/GPS System
After=network.target gpsd.service docker.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/projects/stinkster
ExecStart=/home/pi/projects/stinkster/src/orchestration/gps_kismet_wigle.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable stinkster.service
    
    print_success "Systemd service created"
}

# Function to setup configurations
setup_configurations() {
    print_status "Setting up configuration files..."
    
    # Check if setup-configs.sh exists
    if [ -f "${SCRIPT_DIR}/setup-configs.sh" ]; then
        print_status "Running configuration setup script..."
        cd "${SCRIPT_DIR}"
        bash setup-configs.sh
        print_success "Configuration setup completed"
    else
        print_warning "setup-configs.sh not found, creating basic configurations..."
        
        # Create basic .env file if it doesn't exist
        if [ ! -f ".env" ] && [ -f "config.template.env" ]; then
            cp config.template.env .env
            print_status "Created .env from template"
        fi
        
        # Create basic config files from templates
        for template in *.template.*; do
            if [ -f "$template" ]; then
                target="${template//.template/}"
                if [ ! -f "$target" ]; then
                    cp "$template" "$target"
                    print_status "Created $target from $template"
                fi
            fi
        done
        
        print_success "Basic configuration files created"
    fi
}

# Function to display installation summary
display_summary() {
    echo
    print_success "=== Stinkster Installation Complete ==="
    echo
    echo "Installed components:"
    echo "  - System dependencies"
    echo "  - GPSD for GPS services"
    echo "  - Kismet for WiFi scanning"
    echo "  - Docker for OpenWebRX"
    echo "  - Python virtual environments"
    echo "  - Startup scripts"
    echo
    echo "Next steps:"
    echo "  1. Review and edit configuration files in: ${SCRIPT_DIR}/"
    echo "     - Edit .env file with your specific settings"
    echo "     - Update TAK server settings in wigletotak-config.json"
    echo "     - Configure your WiFi interface in kismet_site.conf"
    echo "  2. Connect your HackRF and GPS devices"
    echo "  3. Reboot to ensure all services start correctly"
    echo "  4. Start the system with: sudo systemctl start stinkster"
    echo "  5. Access web interfaces:"
    echo "     - OpenWebRX: http://localhost:8073"
    echo "     - WigleToTAK: http://localhost:6969"
    echo "  6. Monitor logs in: ${LOG_DIR}/"
    echo "  7. Check service status: systemctl status stinkster"
    echo
    print_warning "Note: You need to log out and back in for Docker group membership to take effect"
}

# Main installation flow
main() {
    echo "=== Stinkster Installation Script ==="
    echo "This will install and configure the complete Stinkster system"
    echo "Estimated time: 10-15 minutes"
    echo
    
    show_progress "Checking system prerequisites"
    validate_prerequisites
    
    show_progress "Checking Raspberry Pi compatibility"
    check_raspberry_pi
    
    show_progress "Verifying user permissions"
    check_user
    
    show_progress "Checking hardware requirements"
    check_hardware
    
    show_progress "Updating system packages"
    update_system
    
    show_progress "Installing system dependencies"
    install_system_deps
    
    show_progress "Installing Kismet WiFi scanner"
    install_kismet
    
    show_progress "Installing Docker for OpenWebRX"
    install_docker
    
    show_progress "Creating directory structure"
    create_directories
    
    show_progress "Setting up component repositories"
    clone_repositories
    
    show_progress "Creating Python virtual environments"
    setup_python_envs
    
    show_progress "Configuring GPS services"
    configure_gpsd
    
    show_progress "Setting up OpenWebRX SDR interface"
    setup_openwebrx
    
    show_progress "Creating startup scripts"
    create_startup_scripts
    
    show_progress "Installing systemd service"
    create_systemd_service
    
    show_progress "Configuring application settings"
    setup_configurations
    
    echo
    print_success "Installation completed successfully!"
    display_summary
}

# Run main function
main "$@"
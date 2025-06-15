#!/bin/bash
# System Dependencies Installation Script for Stinkster Project
# This script documents and can install all system-level dependencies
# for the Raspberry Pi SDR/WiFi scanning system

set -e

echo "=== Stinkster System Dependencies Installation ==="
echo "This script will install all required system packages for:"
echo "- GPS/GPSD services"
echo "- HackRF SDR tools"
echo "- Kismet WiFi scanning"
echo "- Python development tools"
echo "- Docker for OpenWebRX"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "Please run this script as a regular user (not root)"
   echo "The script will use sudo when needed"
   exit 1
fi

# Update package lists
echo "Updating package lists..."
sudo apt update

# Core system tools
echo ""
echo "Installing core system tools..."
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

# GPS and location services
echo ""
echo "Installing GPS/GPSD components..."
sudo apt install -y \
    gpsd \
    gpsd-clients \
    python3-gps \
    chrony

# Configure GPSD for USB GPS devices
echo ""
echo "Configuring GPSD..."
sudo systemctl stop gpsd.socket
sudo systemctl disable gpsd.socket
# Note: GPSD configuration in /etc/default/gpsd should be:
# DEVICES="/dev/ttyUSB0"
# GPSD_OPTIONS="-n"
# START_DAEMON="true"

# HackRF SDR tools
echo ""
echo "Installing HackRF SDR tools..."
sudo apt install -y \
    hackrf \
    libhackrf-dev \
    libhackrf0 \
    gr-osmosdr \
    gqrx-sdr

# USB tools
echo ""
echo "Installing USB utilities..."
sudo apt install -y \
    usbutils \
    libusb-1.0-0-dev

# Network and WiFi tools
echo ""
echo "Installing network and WiFi tools..."
sudo apt install -y \
    net-tools \
    wireless-tools \
    iw \
    aircrack-ng \
    tcpdump \
    nmap

# Kismet WiFi scanner
echo ""
echo "Installing Kismet..."
# Add Kismet repository
wget -O - https://www.kismetwireless.net/repos/kismet-release.gpg.key | sudo apt-key add -
echo "deb https://www.kismetwireless.net/repos/apt/release/$(lsb_release -cs) $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/kismet.list
sudo apt update
sudo apt install -y \
    kismet \
    kismet-plugins \
    kismet-capture-linux-wifi \
    kismet-capture-linux-bluetooth

# Add user to kismet group
sudo usermod -a -G kismet $USER

# System monitoring tools
echo ""
echo "Installing system monitoring tools..."
sudo apt install -y \
    psutil \
    python3-psutil \
    iotop \
    nethogs

# Docker for OpenWebRX (optional)
echo ""
read -p "Install Docker for OpenWebRX? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "Note: You'll need to log out and back in for docker group membership to take effect"
fi

# Additional Python system packages
echo ""
echo "Installing additional Python system packages..."
sudo apt install -y \
    python3-numpy \
    python3-scipy \
    python3-matplotlib \
    python3-flask \
    python3-requests

# Permissions and udev rules
echo ""
echo "Setting up udev rules for HackRF..."
cat << 'EOF' | sudo tee /etc/udev/rules.d/53-hackrf.rules
# HackRF One
SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="6089", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="cc15", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTRS{idVendor}=="1fc9", ATTRS{idProduct}=="000c", MODE="0666", GROUP="plugdev"
EOF

# Add user to necessary groups
echo ""
echo "Adding user to necessary groups..."
sudo usermod -a -G plugdev $USER
sudo usermod -a -G dialout $USER
sudo usermod -a -G gpio $USER

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Optional: RTL-SDR support
echo ""
read -p "Install RTL-SDR support? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    sudo apt install -y \
        rtl-sdr \
        librtlsdr-dev \
        librtlsdr0
fi

# Create project directories
echo ""
echo "Creating project directories..."
mkdir -p ${LOG_DIR:-/home/pi/projects/stinkster/logs}
mkdir -p ${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}
mkdir -p /home/pi/logs

# Summary
echo ""
echo "=== Installation Complete ==="
echo ""
echo "System dependencies have been installed. Please note:"
echo "1. Log out and back in for group memberships to take effect"
echo "2. Configure GPSD in /etc/default/gpsd for your GPS device"
echo "3. Configure Kismet in /etc/kismet/kismet.conf"
echo "4. Python virtual environments should be created for each component"
echo ""
echo "To set up Python environments, run:"
echo "  cd /path/to/component"
echo "  python3 -m venv venv"
echo "  source venv/bin/activate"
echo "  pip install -r requirements.txt"
echo ""
echo "Key services to start:"
echo "  sudo systemctl start gpsd"
echo "  sudo systemctl start kismet"
echo ""
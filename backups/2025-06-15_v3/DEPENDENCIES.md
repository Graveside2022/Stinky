# Stinkster Project Dependencies Documentation

## Overview
This document provides a comprehensive list of all dependencies required to recreate the Stinkster SDR/WiFi scanning system on a new Raspberry Pi.

## Python Dependencies

### Core Python Packages
All Python dependencies are documented in `requirements.txt`. The main packages include:

- **pymavlink** (≥2.4.33): MAVLink protocol for drone GPS communication
- **pyserial** (≥3.5): Serial port communication
- **Flask** (≥3.1.1): Web framework for dashboards
- **Flask-SocketIO** (≥5.5.1): Real-time WebSocket support
- **Flask-CORS** (≥6.0.1): Cross-origin resource sharing
- **numpy** (≥2.3.0): Numerical computing for signal processing
- **websockets** (≥15.0.1): WebSocket client library
- **requests** (≥2.32.3): HTTP library for API calls
- **psutil** (≥7.0.0): System monitoring

### Component-Specific Virtual Environments

Each component should have its own virtual environment. Use the automated setup scripts in the project root:

#### Automated Setup (Recommended)
```bash
cd /home/pi/projects/stinkster
source ./setup-env.sh  # Load environment variables
./setup-venv-all.sh    # Set up all virtual environments
```

#### Manual Setup by Component

1. **GPSmav** (MAVLink to GPSD bridge):
   ```bash
   cd /home/pi/projects/stinkster
   ./setup-venv-gpsmav.sh
   # Creates venv at: ${GPSMAV_DIR}/venv (default: /home/pi/gpsmav/GPSmav/venv)
   ```

2. **WigleToTAK** (WiFi scan to TAK converter):
   ```bash
   cd /home/pi/projects/stinkster
   ./setup-venv-wigletotak.sh
   # Creates venv at: ${WIGLETOTAK_DIR}/venv (default: /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/venv)
   ```

3. **HackRF Tools** (Spectrum analyzer):
   ```bash
   cd /home/pi/projects/stinkster
   ./setup-venv-hackrf.sh
   # Creates venv at: ${HACKRF_DIR}/venv (default: /home/pi/HackRF/venv)
   ```

4. **Web Services** (Webhook and monitoring):
   ```bash
   cd /home/pi/projects/stinkster
   ./setup-venv-web.sh
   # Creates venv at: ${WEB_DIR}/venv (default: /home/pi/web/venv)
   ```

#### Recreate Virtual Environments
To force recreation of environments:
```bash
./setup-venv-all.sh --force
# or for individual components:
./setup-venv-gpsmav.sh --force
```

## System-Level Dependencies

### Quick Installation
Run the provided script to install all system dependencies:
```bash
./system-dependencies.sh
```

### Manual Installation by Category

#### 1. Core Development Tools
```bash
sudo apt update
sudo apt install -y build-essential python3-dev python3-pip python3-venv git vim screen tmux htop
```

#### 2. GPS and Location Services
```bash
sudo apt install -y gpsd gpsd-clients python3-gps chrony
```

Configure GPSD by editing `/etc/default/gpsd`:
```
DEVICES="/dev/ttyUSB0"
GPSD_OPTIONS="-n"
START_DAEMON="true"
```

#### 3. HackRF SDR Tools
```bash
sudo apt install -y hackrf libhackrf-dev libhackrf0 gr-osmosdr gqrx-sdr
```

Add udev rules for HackRF:
```bash
sudo tee /etc/udev/rules.d/53-hackrf.rules << EOF
SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="6089", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="cc15", MODE="0666", GROUP="plugdev"
EOF
sudo udevadm control --reload-rules
```

#### 4. WiFi Scanning (Kismet)
```bash
# Add Kismet repository
wget -O - https://www.kismetwireless.net/repos/kismet-release.gpg.key | sudo apt-key add -
echo "deb https://www.kismetwireless.net/repos/apt/release/$(lsb_release -cs) $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/kismet.list
sudo apt update
sudo apt install -y kismet kismet-plugins kismet-capture-linux-wifi
```

#### 5. Network Tools
```bash
sudo apt install -y net-tools wireless-tools iw aircrack-ng tcpdump nmap
```

#### 6. USB and System Tools
```bash
sudo apt install -y usbutils libusb-1.0-0-dev psutil python3-psutil
```

#### 7. Docker (for OpenWebRX)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### User Group Memberships
Add the pi user to necessary groups:
```bash
sudo usermod -a -G plugdev,dialout,gpio,kismet,docker $USER
```
**Note**: Log out and back in for group changes to take effect.

## Docker Images

### OpenWebRX with HackRF Support
The OpenWebRX container requires specific configuration for HackRF:

1. Pull or build the OpenWebRX image:
   ```bash
   docker pull jketterl/openwebrx:latest
   ```

2. Configure for HackRF (use native driver, not SoapySDR):
   ```json
   {
       "version": 2,
       "sdrs": {
           "hackrf": {
               "name": "HackRF",
               "type": "hackrf",
               "ppm": 0,
               "profiles": {
                   "2m": {
                       "name": "2m Band",
                       "center_freq": 145000000,
                       "rf_gain": "VGA=35,LNA=40,AMP=0",
                       "samp_rate": 2400000
                   }
               }
           }
       }
   }
   ```

## Directory Structure Requirements

The installation script automatically creates the required directory structure. If manual setup is needed:

### Core Project Directories
```bash
cd /home/pi/projects/stinkster
source ./setup-env.sh  # Load environment variables
mkdir -p "${LOG_DIR}" "${KISMET_DATA_DIR}" "${HACKRF_DIR}" "${GPSMAV_DIR}" "${WIGLETOTAK_DIR}" "${WEB_DIR}"
```

### Legacy/External Directories (maintained for compatibility)
```bash
mkdir -p /home/pi/tmp
mkdir -p /home/pi/kismet_ops
mkdir -p /home/pi/logs
mkdir -p /home/pi/gpsmav/GPSmav
mkdir -p /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK
mkdir -p /home/pi/HackRF
mkdir -p /home/pi/web
```

## Service Configuration Files

### Systemd Services
The system uses several systemd services that should be configured:

1. **GPSD**: `/etc/systemd/system/gpsd.service`
2. **Custom services**: Can be created for auto-starting components

### Configuration Files to Backup
- `/etc/default/gpsd` - GPSD configuration
- `/etc/kismet/kismet.conf` - Kismet configuration
- `/etc/udev/rules.d/53-hackrf.rules` - HackRF permissions
- Docker configurations in project directories

## Verification Commands

After installation, verify components:

```bash
# Check GPS
gpspipe -w -n 1

# Check HackRF
hackrf_info

# Check Kismet
kismet --version

# Check Python
python3 --version
pip3 --version

# Check Docker
docker --version

# Check USB devices
lsusb | grep -E "(HackRF|GPS|0403:6001)"
```

## Troubleshooting

### Common Issues

1. **GPS not working**: Check USB device permissions and GPSD configuration
2. **HackRF not detected**: Verify udev rules and USB connection
3. **Kismet permission denied**: Ensure user is in kismet group
4. **Docker permission denied**: Ensure user is in docker group and re-login

### Log Locations
- GPSD: `journalctl -u gpsd`
- Kismet: `/home/pi/kismet_ops/kismet_debug.log`
- Application logs: `/home/pi/tmp/*.log`

## Complete Setup Sequence

### Automated Installation (Recommended)
```bash
cd /home/pi/projects/stinkster
./install.sh
```

### Manual Installation Steps
1. Install system dependencies: `./system-dependencies.sh`
2. Configure GPSD for your GPS device
3. Set up Python virtual environments: `./setup-venv-all.sh`
4. Configure application settings: `./setup-configs.sh`
5. Configure Kismet for your WiFi adapter
6. Set up Docker and OpenWebRX (optional)
7. Test each component individually
8. Run the main orchestration script: `./src/orchestration/gps_kismet_wigle.sh`

### Environment Setup
Always source the environment before running scripts:
```bash
cd /home/pi/projects/stinkster
source ./setup-env.sh
```

This ensures all path variables are correctly set for your system configuration.
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

Each component should have its own virtual environment:

1. **GPSmav** (MAVLink to GPSD bridge):
   ```bash
   cd /home/pi/gpsmav/GPSmav
   python3 -m venv venv
   source venv/bin/activate
   pip install pymavlink pyserial
   ```

2. **WigleToTAK** (WiFi scan to TAK converter):
   ```bash
   cd /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK
   python3 -m venv venv
   source venv/bin/activate
   pip install Flask Flask-CORS
   ```

3. **HackRF Tools** (Spectrum analyzer):
   ```bash
   cd /home/pi/HackRF
   python3 -m venv venv
   source venv/bin/activate
   pip install Flask Flask-SocketIO numpy websockets requests
   ```

4. **Web Services** (Webhook and monitoring):
   ```bash
   cd /home/pi/web
   python3 -m venv venv
   source venv/bin/activate
   pip install Flask Flask-CORS psutil requests
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

Create these directories:
```bash
mkdir -p /home/pi/tmp
mkdir -p /home/pi/kismet_ops
mkdir -p /home/pi/logs
mkdir -p /home/pi/stinky
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

1. Install system dependencies: `./system-dependencies.sh`
2. Configure GPSD for your GPS device
3. Set up Python virtual environments for each component
4. Configure Kismet for your WiFi adapter
5. Set up Docker and OpenWebRX (optional)
6. Test each component individually
7. Run the main orchestration script: `/home/pi/stinky/gps_kismet_wigle.sh`
# MavLink to GPSD Bridge for Kismet

A simple Python script that bridges MavLink GPS data to GPSD format for Kismet.

## Installation

### Raspbian (Raspberry Pi OS)
```bash
# Install Python and development tools
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev python3-venv

# Create a virtual environment
python3 -m venv ~/GPSmav/venv

# Activate virtual environment
source ~/GPSmav/venv/bin/activate

# Install pymavlink in the virtual environment
pip install pymavlink

# Add user to dialout group (for USB access)
sudo usermod -a -G dialout $USER

# Install dependencies from requirements.txt
pip install -r requirements.txt

# Alternative: Install pymavlink directly
# pip install pymavlink
```

### Ubuntu
```bash
# Install Python and development tools
sudo apt update
sudo apt install -y python3-pip python3-dev python3-venv

# Create a virtual environment
python3 -m venv ~/GPSmav/venv

# Activate virtual environment
source ~/GPSmav/venv/bin/activate

# Install pymavlink in the virtual environment
pip install pymavlink

# Add user to dialout group (for USB access)
sudo usermod -a -G dialout $USER

# If using Ubuntu Desktop, you might need to install netcat
sudo apt install -y netcat

# Install dependencies from requirements.txt
pip install -r requirements.txt

# Alternative: Install pymavlink directly
# pip install pymavlink
```

After installation:
1. Log out and log back in for the group changes to take effect
2. Remember to activate the virtual environment before running the script:
```bash
source ~/GPSmav/venv/bin/activate
```

## Quick Start

1. Make script executable:
```bash
chmod +x mavgps.py
```

2. Run the script (with virtual environment activated):
```bash
# Activate virtual environment if not already activated
source ~/GPSmav/venv/bin/activate

# Run the script
./mavgps.py
```

## Connection Methods

### Direct USB Connection
If `/dev/ttyACM0` exists, the script will automatically connect directly to the autopilot.

Common USB device locations:
- Raspbian/Ubuntu: `/dev/ttyACM0`
- Alternative locations: `/dev/ttyUSB0`, `/dev/serial/by-id/*`

### Via MavProxy
1. Install MavProxy:
```bash
# Install dependencies
sudo apt install -y python3-wxgtk4.0 python3-lxml python3-pygame

# Install MAVProxy in the virtual environment
source ~/GPSmav/venv/bin/activate
pip install MAVProxy
```

2. Start MavProxy (with virtual environment activated):
```bash
source ~/GPSmav/venv/bin/activate
mavproxy.py --master=/dev/ttyACM0
```

3. In another terminal, run the bridge:
```bash
source ~/GPSmav/venv/bin/activate
./mavgps.py
```

## Kismet Configuration

Add to your `/etc/kismet/kismet_site.conf`:
```
gps=gpsd:host=localhost,port=2947
```

## Testing

Check if GPS data is being received:
```bash
# Using netcat
echo "?WATCH={\"enable\":true,\"json\":true};" | nc localhost 2947

# Alternative using curl
curl -s localhost:2947 -d '?WATCH={"enable":true,"json":true};'
```

## Features

- Automatic connection detection (USB or MavProxy)
- GPSD-compatible server on port 2947
- Clean shutdown with Ctrl+C
- Multiple client support
- Minimal dependencies
- Cross-distribution compatibility (Raspbian/Ubuntu)

## Troubleshooting

1. Check USB connection:
```bash
# List USB devices
ls -l /dev/ttyACM*
ls -l /dev/ttyUSB*
ls -l /dev/serial/by-id/*

# Check USB permissions
groups | grep dialout
```

2. Check MavProxy connection:
```bash
nc localhost 14550   # For MavProxy
```

3. Test GPS data:
```bash
# In Python:
from pymavlink import mavutil
mav = mavutil.mavlink_connection('/dev/ttyACM0')
mav.wait_heartbeat()
```

4. Common Issues:

#### Permission Denied
```bash
# Fix USB permissions
sudo usermod -a -G dialout $USER
# Log out and log back in
```

#### Port Already in Use
```bash
# Check if something is using port 2947
sudo lsof -i :2947
# or
sudo netstat -tuln | grep 2947
```

#### No USB Device
```bash
# List all USB devices
lsusb
# Check dmesg for USB connection events
dmesg | grep -i tty
```

## System-Specific Notes

### Raspbian (Raspberry Pi OS)
- Works on all Raspberry Pi models
- Tested on Raspberry Pi OS Lite and Desktop
- May need `sudo raspi-config` to enable serial port
- Lower CPU usage on Pi 4 compared to Pi 3

### Ubuntu
- Works on both Desktop and Server editions
- Tested on Ubuntu 20.04 LTS and newer
- ModemManager might interfere with USB connection
- NetworkManager doesn't affect GPS functionality

## Automatic Startup

To set up the service to start automatically 60 seconds after boot:

### Using Cron Job

1. Create a startup script in your home directory:
```bash
cat > ~/start_mavgps.sh << 'EOF'
#!/bin/bash
# Wait 60 seconds for system to fully initialize
sleep 60

# Activate virtual environment and run the script
cd ~/GPSmav
source ~/GPSmav/venv/bin/activate
./mavgps.py > ~/mavgps.log 2>&1 &
EOF

# Make the script executable
chmod +x ~/start_mavgps.sh
```

2. Add a cron job to run at boot:
```bash
# Open crontab editor
crontab -e

# Add the following line
@reboot ~/start_mavgps.sh
```

3. Verify the cron job was added:
```bash
crontab -l | grep start_mavgps
```

### Using systemd (Alternative Method)

1. Create a systemd service file:
```bash
sudo bash -c 'cat > /etc/systemd/system/mavgps.service << EOF
[Unit]
Description=MavLink to GPSD Bridge
After=network.target

[Service]
Type=simple
User=$USER
ExecStartPre=/bin/sleep 60
ExecStart=/bin/bash -c "source $HOME/GPSmav/venv/bin/activate && $HOME/GPSmav/mavgps.py"
WorkingDirectory=$HOME/GPSmav
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF'
```

2. Enable and start the service:
```bash
sudo systemctl enable mavgps.service
sudo systemctl start mavgps.service
```

3. Check service status:
```bash
sudo systemctl status mavgps.service
```

## General Notes

- Requires Python 3.x
- Uses port 2947 (standard GPSD port)
- Supports both direct USB and MavProxy connections
- Provides TPV (Time-Position-Velocity) and SKY reports
- Auto-detects best available connection
- Low resource usage (~2% CPU on Raspberry Pi 4)
- No root privileges required (except for initial setup)

## Offline Installation

If you're setting up this service on a device without internet access (like a drone or rover), you can use the offline installation method:

### Preparing Package Files (on a computer with internet)

1. Download the required packages:
```bash
# Create a temporary directory
mkdir -p ~/temp_packages && cd ~/temp_packages

# Install packages to get the files
pip install pymavlink pyserial

# Create tarballs of the packages
# For pymavlink (adjust path as needed for your system)
cd ~/.local/lib/python3.10/site-packages  # Adjust Python version as needed
tar -czf ~/temp_packages/pymavlink_package.tar.gz pymavlink

# For pyserial (adjust path as needed for your system)
# If using system packages:
cd /usr/lib/python3/dist-packages  # Adjust path as needed
sudo tar -czf ~/temp_packages/pyserial_package.tar.gz serial*

# Or if installed in user directory:
cd ~/.local/lib/python3.10/site-packages  # Adjust Python version as needed
tar -czf ~/temp_packages/pyserial_package.tar.gz serial*

cd ~/temp_packages
```

2. Transfer the package files and installation script to your device:
```bash
# Copy files to your device (replace USERNAME and IP_ADDRESS)
scp pymavlink_package.tar.gz pyserial_package.tar.gz install_offline.sh USERNAME@IP_ADDRESS:~/GPSmav/
```

### Installing on the Target Device (without internet)

1. Run the offline installation script:
```bash
cd ~/GPSmav
chmod +x install_offline.sh
./install_offline.sh
```

2. Verify installation:
```bash
source venv/bin/activate
python -c 'import pymavlink, serial; print("Dependencies installed successfully!")'
```

### Troubleshooting Offline Installation

If you encounter issues with the offline installation:

1. Check that the package tarballs were extracted correctly:
```bash
source venv/bin/activate
pip list
```

2. Manually extract the packages if needed:
```bash
cd ~/GPSmav
source venv/bin/activate
python -c 'import site; print(site.getsitepackages()[0])' # Get site-packages path
SITE_PACKAGES=$(python -c 'import site; print(site.getsitepackages()[0])')
tar -xzf pymavlink_package.tar.gz -C "$SITE_PACKAGES"
tar -xzf pyserial_package.tar.gz -C "$SITE_PACKAGES"
``` 
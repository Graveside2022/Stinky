# Deployment Guide

This guide covers deployment and setup of the Stinkster Malone system on a Raspberry Pi.

## Table of Contents

- [System Requirements](#system-requirements)
- [Pre-Installation](#pre-installation)
- [Installation Steps](#installation-steps)
- [Service Configuration](#service-configuration)
- [Network Configuration](#network-configuration)
- [Starting Services](#starting-services)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## System Requirements

### Hardware
- Raspberry Pi 4 (4GB+ RAM recommended)
- HackRF One SDR device
- USB WiFi adapter with monitor mode support (e.g., Alfa AWUS036ACH)
- GPS device with MAVLink support (optional)
- MicroSD card (32GB+ recommended)

### Software
- Raspberry Pi OS (64-bit recommended)
- Node.js 18+ 
- Python 3.9+
- Docker and Docker Compose
- Git

### Network
- Internet connection for initial setup
- Tailscale (recommended for remote access)
- Static IP or DHCP reservation (recommended)

## Pre-Installation

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential
```

### 2. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Install Python Dependencies
```bash
sudo apt install -y python3-pip python3-venv python3-dev
sudo apt install -y libhackrf-dev librtlsdr-dev
```

### 4. Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Logout and login again for group changes to take effect
```

### 5. Install System Dependencies
```bash
# For Kismet
sudo apt install -y kismet kismet-plugins

# For GPS/GPSD
sudo apt install -y gpsd gpsd-clients

# For network monitoring
sudo apt install -y aircrack-ng wireless-tools iw

# Development tools
sudo apt install -y tmux htop iotop
```

## Installation Steps

### 1. Clone Repository
```bash
cd /home/pi/projects
git clone https://github.com/yourusername/stinkster_malone.git
cd stinkster_malone/stinkster
```

### 2. Install Node.js Dependencies
```bash
cd src/nodejs/kismet-operations
npm install
```

### 3. Set Up Python Virtual Environments

#### WigleToTAK
```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/wigletotak/WigleToTAK/TheStinkToTAK
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

#### HackRF Spectrum Analyzer
```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/hackrf
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

#### GPS MAVLink Bridge
```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/gpsmav/GPSmav
python3 -m venv venv
source venv/bin/activate
pip install pymavlink pyserial
deactivate
```

### 4. Configure Docker Services

#### OpenWebRX
```bash
cd /home/pi/projects/stinkster_malone/stinkster
docker-compose up -d openwebrx
```

### 5. Create Required Directories
```bash
# Create log directory
mkdir -p /home/pi/projects/stinkster/logs

# Create data directories
mkdir -p /home/pi/projects/stinkster/data/kismet
mkdir -p /home/pi/projects/stinkster/data/captures

# Create temp directory
mkdir -p /home/pi/tmp

# Set permissions
chmod 755 /home/pi/projects/stinkster/logs
chmod 755 /home/pi/projects/stinkster/data
```

## Service Configuration

### 1. Configure Kismet
Edit `/etc/kismet/kismet.conf`:
```conf
# Set GPS source
gps=gpsd:host=localhost,port=2947

# Set WiFi interface
source=wlan2:type=linuxwifi

# Set log directory
log_prefix=/home/pi/projects/stinkster/data/kismet/

# Enable REST API
httpd_port=2501
httpd_username=admin
httpd_password=admin
```

### 2. Configure GPSD
Edit `/etc/default/gpsd`:
```bash
START_DAEMON="true"
USBAUTO="true"
DEVICES="/dev/ttyUSB0"
GPSD_OPTIONS="-n"
```

### 3. Create Systemd Service
Create `/etc/systemd/system/kismet-operations.service`:
```ini
[Unit]
Description=Kismet Operations Center
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/home/pi/projects/stinkster/logs/kismet-operations.log
StandardError=append:/home/pi/projects/stinkster/logs/kismet-operations-error.log

Environment="NODE_ENV=production"
Environment="PORT=8002"

[Install]
WantedBy=multi-user.target
```

Enable the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable kismet-operations
sudo systemctl start kismet-operations
```

### 4. Configure Nginx (Optional)
If using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name stinkster.local;

    location / {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /kismet/ {
        proxy_pass http://localhost:2501/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        auth_basic "Kismet Access";
        auth_basic_user_file /etc/nginx/.kismet_htpasswd;
    }

    location /wigle/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Network Configuration

### 1. Configure WiFi Adapter
Ensure your WiFi adapter supports monitor mode:
```bash
# Check adapter
iw list | grep -A 10 "Supported interface modes"

# Should show: * monitor
```

### 2. Set Static IP (Optional)
Edit `/etc/dhcpcd.conf`:
```conf
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

### 3. Install Tailscale (Recommended)
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 4. Configure Firewall
```bash
# Allow Kismet Operations Center
sudo ufw allow 8002/tcp

# Allow Kismet
sudo ufw allow 2501/tcp

# Allow WigleToTAK
sudo ufw allow 8000/tcp

# Allow TAK broadcasting
sudo ufw allow 6969/udp

# Enable firewall
sudo ufw enable
```

## Starting Services

### Manual Start (Development)
```bash
# Start all services
/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh

# Or start individually:
# Start Kismet Operations Center
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations
npm start

# Start WigleToTAK
cd /home/pi/projects/stinkster_malone/stinkster/src/wigletotak/WigleToTAK/TheStinkToTAK
source venv/bin/activate
python3 WigleToTak2.py
```

### Production Start
```bash
# Using systemd
sudo systemctl start kismet-operations

# Using the web interface
# Navigate to http://raspberry-pi:8002
# Click "Start Services" button
```

### Verify Services
```bash
# Check service status
systemctl status kismet-operations

# Check running processes
ps aux | grep -E "kismet|node|python"

# Check ports
sudo netstat -tlnp | grep -E "8002|2501|8000|6969"

# Check logs
tail -f /home/pi/projects/stinkster/logs/kismet-operations.log
```

## Monitoring & Maintenance

### Log Files
- Kismet Operations: `/home/pi/projects/stinkster/logs/kismet-operations.log`
- Orchestration: `/home/pi/tmp/gps_kismet_wigle.log`
- Kismet: `/home/pi/projects/stinkster/data/kismet/`
- System: `journalctl -u kismet-operations`

### Monitoring Commands
```bash
# Monitor system resources
htop

# Monitor network interfaces
watch -n 1 'iw dev wlan2 info'

# Monitor services
watch -n 5 'curl -s http://localhost:8002/script-status | jq'

# Monitor GPS
gpspipe -w -n 5
```

### Backup
```bash
# Backup configuration
tar -czf stinkster-config-$(date +%Y%m%d).tar.gz \
  /home/pi/projects/stinkster_malone/stinkster/src/orchestration/ \
  /etc/kismet/ \
  /etc/systemd/system/kismet-operations.service

# Backup data
tar -czf stinkster-data-$(date +%Y%m%d).tar.gz \
  /home/pi/projects/stinkster/data/
```

### Updates
```bash
cd /home/pi/projects/stinkster_malone/stinkster
git pull origin main
cd src/nodejs/kismet-operations
npm update
sudo systemctl restart kismet-operations
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
journalctl -u kismet-operations -n 50

# Check permissions
ls -la /home/pi/projects/stinkster/logs/

# Check Node.js
node --version  # Should be 18+

# Check dependencies
cd src/nodejs/kismet-operations
npm list
```

### Kismet Connection Issues
```bash
# Check if Kismet is running
ps aux | grep kismet_server

# Check Kismet API
curl -u admin:admin http://localhost:2501/system/status.json

# Restart Kismet
sudo systemctl restart kismet
```

### WiFi Adapter Issues
```bash
# Reset adapter
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up

# Check for driver issues
dmesg | grep -i wlan
```

### GPS Issues
```bash
# Check GPS device
ls -l /dev/ttyUSB*

# Test GPS
gpspipe -w -n 1

# Restart GPSD
sudo systemctl restart gpsd
```

### Performance Issues
```bash
# Check CPU/Memory
free -h
top -b -n 1

# Check disk space
df -h

# Check network
iftop -i wlan2
```

## Security Considerations

### 1. Change Default Passwords
- Kismet: Edit `/etc/kismet/kismet.conf`
- OpenWebRX: Change in web interface
- System: `passwd pi`

### 2. Restrict Access
```bash
# Bind services to localhost only
# Edit service configurations to bind to 127.0.0.1

# Use Tailscale for remote access
sudo tailscale up --ssh
```

### 3. Regular Updates
```bash
# Create update script
cat > /home/pi/update-system.sh << 'EOF'
#!/bin/bash
sudo apt update && sudo apt upgrade -y
cd /home/pi/projects/stinkster_malone/stinkster
git pull
cd src/nodejs/kismet-operations
npm update
sudo systemctl restart kismet-operations
EOF

chmod +x /home/pi/update-system.sh
```

### 4. Backup Strategy
- Automated daily backups of configuration
- Weekly backups of captured data
- Off-site backup to cloud storage

### 5. Monitoring
- Set up alerts for service failures
- Monitor disk space usage
- Log rotation for all services

## Performance Tuning

### 1. Raspberry Pi Optimization
```bash
# Increase GPU memory split
echo "gpu_mem=128" | sudo tee -a /boot/config.txt

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
```

### 2. Node.js Optimization
```bash
# Set production environment
export NODE_ENV=production

# Increase memory limit if needed
node --max-old-space-size=2048 server.js
```

### 3. Network Optimization
```bash
# Increase network buffers
echo "net.core.rmem_max=134217728" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max=134217728" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Quick Reference Card

### Start Everything
```bash
curl -X POST http://localhost:8002/run-script \
  -H "Content-Type: application/json" \
  -d '{"script_name": "gps_kismet_wigle"}'
```

### Stop Everything
```bash
curl -X POST http://localhost:8002/stop-script
```

### Check Status
```bash
curl http://localhost:8002/script-status | jq
```

### View Dashboard
- Main UI: http://raspberry-pi:8002
- Kismet: http://raspberry-pi:8002/kismet/
- API Docs: http://raspberry-pi:8002/api-docs
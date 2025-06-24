# Stinkster Deployment Guide

Comprehensive guide for deploying Stinkster in various environments and configurations.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Installation Methods](#installation-methods)
4. [Configuration](#configuration)
5. [Production Deployment](#production-deployment)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

## Deployment Overview

Stinkster supports multiple deployment scenarios:

- **Standalone**: Single Raspberry Pi with all services
- **Distributed**: Multiple Pis with specialized roles
- **Headless**: No GUI, API-only operation
- **Field Deployment**: Battery-powered mobile setup
- **Lab Setup**: Permanent installation with external antennas

### Architecture Patterns

```
Standalone Deployment:
┌──────────────────────┐
│   Raspberry Pi 4     │
├──────────────────────┤
│ • All services       │
│ • Local web UI       │
│ • Direct USB devices │
└──────────────────────┘

Distributed Deployment:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SDR Pi    │────▶│  Process Pi │────▶│   TAK Pi    │
│ • HackRF    │     │ • Analysis  │     │ • TAK Server│
│ • OpenWebRX │     │ • Storage   │     │ • Mapping   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Prerequisites

### Hardware Requirements

#### Minimum
- Raspberry Pi 3B+ (1GB RAM)
- 16GB SD card
- 2.5A power supply
- USB WiFi adapter (monitor mode)

#### Recommended
- Raspberry Pi 4 (4GB+ RAM)
- 32GB+ SD card (A2 rated)
- 3A power supply
- Dedicated WiFi adapter (Alfa AWUS036ACH)
- HackRF One SDR
- GPS receiver (USB or GPIO)
- Cooling (heatsinks/fan)

#### Field Deployment
- Portable battery (20,000mAh+)
- Weatherproof case
- External antennas
- USB hub (powered)

### Software Requirements

- Raspberry Pi OS Bullseye or newer (64-bit recommended)
- Internet connection for initial setup
- SSH access enabled

## Installation Methods

### Method 1: Automated Install (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/stinkster.git
cd stinkster

# Run installer
sudo ./install.sh

# Follow prompts for:
# - Component selection
# - Hardware configuration
# - Service setup
```

### Method 2: Docker Deployment

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Deploy with docker-compose
cd stinkster
docker-compose up -d

# Check status
docker-compose ps
```

### Method 3: Manual Installation

```bash
# System dependencies
sudo apt update
sudo apt install -y \
    python3-pip python3-venv \
    nodejs npm \
    libhackrf-dev \
    gpsd gpsd-clients \
    nginx \
    git build-essential

# Python environments
cd src/gpsmav
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ../hackrf
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Node.js services
cd ../nodejs
npm install
npm run build

# Configure services
sudo cp ../systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### Method 4: Ansible Playbook

```yaml
# deploy-stinkster.yml
- name: Deploy Stinkster
  hosts: raspberrypis
  become: yes
  
  tasks:
    - name: Install dependencies
      apt:
        name:
          - python3-pip
          - nodejs
          - docker.io
        state: present
    
    - name: Clone repository
      git:
        repo: https://github.com/yourusername/stinkster.git
        dest: /opt/stinkster
    
    - name: Run installer
      command: ./install.sh --unattended
      args:
        chdir: /opt/stinkster
```

## Configuration

### Initial Setup

1. **Network Configuration**
```bash
# /etc/stinkster/network.conf
WIFI_INTERFACE=wlan2
MONITOR_MODE=true
CHANNEL_HOP=true
HOP_CHANNELS="1,6,11"
```

2. **Service Ports**
```bash
# /etc/stinkster/services.conf
SPECTRUM_PORT=8092
WIGLE_PORT=6969
KISMET_PORT=2501
OPENWEBRX_PORT=8073
```

3. **Hardware Settings**
```json
// /etc/stinkster/hardware.json
{
    "hackrf": {
        "serial": "0000000000000000",
        "defaultFreq": 100000000,
        "defaultGain": {
            "lna": 16,
            "vga": 20,
            "amp": false
        }
    },
    "gps": {
        "device": "/dev/ttyUSB0",
        "baudrate": 4800,
        "protocol": "NMEA"
    }
}
```

### Environment Variables

```bash
# /etc/environment
STINKSTER_HOME=/opt/stinkster
STINKSTER_DATA=/var/lib/stinkster
STINKSTER_LOG=/var/log/stinkster
STINKSTER_CONFIG=/etc/stinkster
```

### API Keys

```bash
# Generate API keys
openssl rand -hex 32 > /etc/stinkster/api.key

# Configure in services
export STINKSTER_API_KEY=$(cat /etc/stinkster/api.key)
```

## Production Deployment

### System Optimization

1. **Performance Tuning**
```bash
# /etc/sysctl.d/99-stinkster.conf
# Network performance
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Memory management
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
```

2. **CPU Governor**
```bash
# Set performance mode
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Make persistent
sudo apt install cpufrequtils
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
```

3. **GPU Memory Split**
```bash
# /boot/config.txt
gpu_mem=128  # Reduce GPU memory for headless operation
```

### Service Management

1. **Systemd Services**
```bash
# Enable services
sudo systemctl enable stinkster-orchestrator
sudo systemctl enable spectrum-analyzer
sudo systemctl enable wigle-to-tak
sudo systemctl enable openwebrx-docker

# Start all services
sudo systemctl start stinkster-orchestrator
```

2. **Service Dependencies**
```ini
# /etc/systemd/system/stinkster-orchestrator.service
[Unit]
Description=Stinkster Orchestrator
After=network.target gpsd.service docker.service
Wants=gpsd.service

[Service]
Type=forking
ExecStart=/opt/stinkster/src/orchestration/gps_kismet_wigle.sh
ExecStop=/opt/stinkster/src/orchestration/stop_all.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/stinkster
server {
    listen 80;
    server_name stinkster.local;
    
    # Main dashboard
    location / {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Spectrum analyzer
    location /spectrum/ {
        proxy_pass http://localhost:8092/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
    
    # WigleToTAK
    location /wigle/ {
        proxy_pass http://localhost:6969/;
    }
    
    # WebSocket support
    location /ws/ {
        proxy_pass http://localhost:8092;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### SSL/TLS Setup

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d stinkster.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## Security Hardening

### Network Security

1. **Firewall Rules**
```bash
# Install UFW
sudo apt install ufw

# Configure rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 6969/tcp  # TAK
sudo ufw enable
```

2. **Fail2ban**
```bash
# Install
sudo apt install fail2ban

# Configure for Stinkster
cat > /etc/fail2ban/jail.local <<EOF
[stinkster-api]
enabled = true
port = 8092,6969,8002
filter = stinkster-api
logpath = /var/log/stinkster/api.log
maxretry = 5
bantime = 3600
EOF
```

### Access Control

1. **API Authentication**
```javascript
// Middleware for API routes
const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || !isValidApiKey(apiKey)) {
        return res.status(401).json({
            error: 'Unauthorized'
        });
    }
    
    next();
};
```

2. **User Management**
```bash
# Create system user
sudo useradd -r -s /bin/false stinkster

# Set permissions
sudo chown -R stinkster:stinkster /opt/stinkster
sudo chmod 750 /opt/stinkster
```

### Data Protection

1. **Encryption at Rest**
```bash
# Encrypt data partition
sudo apt install cryptsetup

# Create encrypted volume
sudo cryptsetup luksFormat /dev/sda1
sudo cryptsetup open /dev/sda1 stinkster-data

# Mount
sudo mkfs.ext4 /dev/mapper/stinkster-data
sudo mount /dev/mapper/stinkster-data /var/lib/stinkster
```

2. **Log Rotation**
```bash
# /etc/logrotate.d/stinkster
/var/log/stinkster/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 640 stinkster stinkster
    sharedscripts
    postrotate
        systemctl reload stinkster-orchestrator
    endscript
}
```

## Monitoring & Maintenance

### Health Monitoring

1. **Prometheus Metrics**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'stinkster'
    static_configs:
      - targets: 
        - 'localhost:9090'  # Stinkster metrics
        - 'localhost:9100'  # Node exporter
```

2. **Health Check Script**
```bash
#!/bin/bash
# /opt/stinkster/monitoring/health-check.sh

check_service() {
    systemctl is-active --quiet $1 && echo "$1: OK" || echo "$1: FAILED"
}

check_port() {
    nc -z localhost $1 && echo "Port $1: OK" || echo "Port $1: FAILED"
}

# Check services
check_service stinkster-orchestrator
check_service gpsd
check_service docker

# Check ports
check_port 8092  # Spectrum
check_port 6969  # WigleToTAK
check_port 2501  # Kismet

# Check hardware
lsusb | grep -q "HackRF" && echo "HackRF: OK" || echo "HackRF: NOT FOUND"

# Check disk space
df -h | grep -E "/$|/var/lib/stinkster"
```

### Performance Monitoring

```bash
# Install monitoring stack
docker run -d \
    --name=grafana \
    -p 3000:3000 \
    -v grafana-storage:/var/lib/grafana \
    grafana/grafana

# Configure datasources
# - Prometheus: http://localhost:9090
# - Loki: http://localhost:3100
```

### Automated Alerts

```yaml
# alertmanager.yml
route:
  receiver: 'email'
  
receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@example.com'
        from: 'stinkster@example.com'
        smarthost: 'smtp.example.com:587'
        
templates:
  - '/etc/alertmanager/templates/*.tmpl'
```

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# /opt/stinkster/backup/backup.sh

BACKUP_DIR="/backup/stinkster"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="stinkster_backup_${DATE}.tar.gz"

# Create backup
tar -czf ${BACKUP_DIR}/${BACKUP_FILE} \
    /etc/stinkster \
    /var/lib/stinkster \
    /opt/stinkster/config \
    --exclude='*.log' \
    --exclude='node_modules'

# Keep only last 7 days
find ${BACKUP_DIR} -name "stinkster_backup_*.tar.gz" -mtime +7 -delete

# Sync to remote
rsync -avz ${BACKUP_DIR}/ backup@remote-server:/backups/stinkster/
```

### Recovery Procedure

```bash
# Stop services
sudo systemctl stop stinkster-orchestrator

# Restore from backup
sudo tar -xzf /backup/stinkster_backup_20240115_120000.tar.gz -C /

# Update permissions
sudo chown -R stinkster:stinkster /opt/stinkster
sudo chown -R stinkster:stinkster /var/lib/stinkster

# Restart services
sudo systemctl start stinkster-orchestrator
```

### Database Backups

```bash
# Kismet database
sqlite3 /var/lib/kismet/kismet.db ".backup /backup/kismet_$(date +%Y%m%d).db"

# Application data
mongodump --out /backup/mongo_$(date +%Y%m%d)
```

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
journalctl -u stinkster-orchestrator -n 100

# Check permissions
ls -la /opt/stinkster
ls -la /var/run/stinkster

# Verify dependencies
systemctl status gpsd
docker ps
```

#### Hardware Not Detected
```bash
# USB devices
lsusb -v | grep -E "HackRF|WiFi"

# Serial devices
ls -la /dev/tty*
dmesg | grep -E "USB|tty"

# Reset USB
echo "1-1" > /sys/bus/usb/drivers/usb/unbind
echo "1-1" > /sys/bus/usb/drivers/usb/bind
```

#### Performance Issues
```bash
# Check resources
htop
iostat -x 1
vmstat 1

# Check temperature
vcgencmd measure_temp

# Clear caches
sync && echo 3 > /proc/sys/vm/drop_caches
```

### Debug Mode

```bash
# Enable debug logging
export STINKSTER_DEBUG=1
export NODE_ENV=development

# Start with verbose output
/opt/stinkster/src/orchestration/gps_kismet_wigle.sh -v

# Monitor debug logs
tail -f /var/log/stinkster/debug.log
```

### Emergency Recovery

```bash
# Safe mode startup
/opt/stinkster/scripts/safe-mode.sh

# Reset to defaults
/opt/stinkster/scripts/factory-reset.sh

# Diagnostic report
/opt/stinkster/scripts/diagnostic-report.sh > diagnostic.txt
```

## Field Deployment Tips

### Power Management
- Use quality USB-C PD power banks (20W+)
- Enable power saving when on battery
- Disable unnecessary services
- Use efficient antennas

### Environmental Considerations
- Use weatherproof enclosures
- Add silica gel packs for moisture
- Ensure adequate ventilation
- Use industrial SD cards

### Remote Access
- Configure Tailscale/WireGuard VPN
- Use reverse SSH tunnels
- Enable remote syslog
- Set up out-of-band management

## Support Resources

- [User Guide](../user-guide/README.md)
- [Developer Guide](../developer-guide/README.md)
- [API Reference](../api-reference/README.md)
- [Video Tutorials](../tutorials/README.md)
- [Community Forum](https://forum.stinkster.io)
- [Issue Tracker](https://github.com/yourusername/stinkster/issues)

Remember to test your deployment thoroughly before going to production!
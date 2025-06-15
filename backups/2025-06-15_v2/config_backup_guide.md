# Configuration Files Backup Guide

## Critical Custom Configuration Files (MUST BACKUP)

### 1. Kismet User Configurations
- **`/home/pi/.kismet/kismet_site.conf`** - Custom Kismet settings including:
  - WiFi adapter configuration (wlan2)
  - GPS settings (gpsd connection)
  - HTTP authentication settings
  - Performance tuning options
- **`/home/pi/.kismet/kismet_httpd.conf`** - HTTP server customizations
- **`/home/pi/.kismet/kismet_server_id.conf`** - Server identity

### 2. GPSD Configuration
- **`/etc/default/gpsd`** - Custom GPSD settings:
  - Device: `/dev/ttyUSB0`
  - Options: `-n` (no wait for clients)
  - START_DAEMON and USBAUTO settings

### 3. Custom Systemd Services
- **`/etc/systemd/system/hackrf-scanner.service`** - HackRF Scanner service
- **`/etc/systemd/system/openwebrx-landing.service`** - Landing page service

### 4. HackRF/SDR Configurations
- **`/home/pi/HackRF/config.json`** - HackRF frequency and gain settings
- **`/home/pi/openwebrx-hackrf-config.json`** - OpenWebRX HackRF profiles with custom frequency bands

### 5. Application Configurations
- **`/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/config.py`** (if exists) - WigleToTAK settings
- **`/home/pi/stinky/config.sh`** (if exists) - Main orchestration config

## Default Package Files (DO NOT NEED TO BACKUP)

### Kismet Default Configs
These are installed by the Kismet package and remain at defaults:
- `/etc/kismet/kismet.conf` - Main config (just loads other configs)
- `/etc/kismet/kismet_alerts.conf`
- `/etc/kismet/kismet_filter.conf`
- `/etc/kismet/kismet_wardrive.conf`
- `/etc/kismet/kismet_logging.conf`
- `/etc/kismet/kismet_80211.conf`
- `/etc/kismet/kismet_memory.conf`
- `/etc/kismet/kismet_httpd.conf`
- `/etc/kismet/kismet_uav.conf`

### System Default Services
These are symlinks to package-provided services:
- `/etc/systemd/system/multi-user.target.wants/gpsd.service`
- `/etc/systemd/system/sockets.target.wants/gpsd.socket`

## Backup Commands

Create a backup of all custom configurations:

```bash
# Create backup directory with timestamp
BACKUP_DIR="$HOME/config_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup Kismet user configs
cp -r /home/pi/.kismet "$BACKUP_DIR/"

# Backup GPSD config
sudo cp /etc/default/gpsd "$BACKUP_DIR/"

# Backup custom systemd services
sudo cp /etc/systemd/system/hackrf-scanner.service "$BACKUP_DIR/"
sudo cp /etc/systemd/system/openwebrx-landing.service "$BACKUP_DIR/"

# Backup HackRF configs
cp /home/pi/HackRF/config.json "$BACKUP_DIR/"
cp /home/pi/openwebrx-hackrf-config.json "$BACKUP_DIR/"

# Create restore script
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# Restore custom configurations

# Restore Kismet user configs
cp -r .kismet /home/pi/

# Restore GPSD config (requires sudo)
sudo cp gpsd /etc/default/

# Restore systemd services (requires sudo)
sudo cp *.service /etc/systemd/system/
sudo systemctl daemon-reload

# Restore HackRF configs
cp config.json /home/pi/HackRF/
cp openwebrx-hackrf-config.json /home/pi/

echo "Configuration restored. You may need to restart services."
EOF

chmod +x "$BACKUP_DIR/restore.sh"

# Create backup info
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Configuration Backup
Created: $(date)
System: $(hostname)
User: $(whoami)

Contents:
- Kismet user configurations
- GPSD device settings
- Custom systemd services
- HackRF/SDR configurations
EOF

echo "Backup created in: $BACKUP_DIR"
```

## Notes

1. **Kismet Configuration Hierarchy**: Kismet loads configs in order, with `kismet_site.conf` overriding all others. The user-specific file in `~/.kismet/` takes precedence over `/etc/kismet/`.

2. **GPSD Settings**: The `/etc/default/gpsd` file contains critical device path configuration that differs from package defaults.

3. **Systemd Services**: Only backup services you created. Package-provided services will be recreated on reinstall.

4. **Docker Configurations**: OpenWebRX configurations inside Docker containers should be backed up separately if modified from defaults.
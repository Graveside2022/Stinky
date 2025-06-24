# Systemd Service Files

This directory contains the systemd service files for the Stinkster project.

## Automated Installation

**⚡ For new installations, systemd services are automatically installed by the main installer:**

```bash
git clone https://github.com/your-username/stinkster.git
cd stinkster
./install.sh
```

The installer automatically:
- ✅ Creates and installs `stinkster.service` for complete system management
- ✅ Configures service dependencies (GPSD, Docker, network)
- ✅ Enables automatic startup on boot
- ✅ Sets proper permissions and working directories

**No manual systemd configuration required!**

## Main Service

### stinkster.service
- **Description**: Stinkster SDR/WiFi/GPS System
- **Dependencies**: network.target, gpsd.service, docker.service
- **Working Directory**: /home/pi/projects/stinkster
- **Script**: /home/pi/projects/stinkster/src/orchestration/gps_kismet_wigle.sh

The main service orchestrates all components:
- GPS services (GPSD, MAVLink bridge)
- WiFi scanning (Kismet)
- SDR operations (OpenWebRX via Docker)
- TAK integration (WigleToTAK)
- Web interfaces

## Service Management

After installation, manage the system with:

```bash
# Start/stop all services
sudo systemctl start stinkster
sudo systemctl stop stinkster

# Check service status
systemctl status stinkster

# View logs
journalctl -u stinkster -f

# Enable/disable automatic startup
sudo systemctl enable stinkster   # Start on boot
sudo systemctl disable stinkster  # Don't start on boot
```

## Legacy Service Files

This directory also contains legacy service files for reference:

### hackrf-scanner.service (Legacy)
- **Description**: Individual HackRF Scanner service
- **Port**: 8090
- **Note**: Now integrated into main stinkster.service

### openwebrx-landing.service (Legacy)
- **Description**: Individual OpenWebRX Landing Page
- **Note**: Now integrated into main stinkster.service

## Manual Installation (Advanced)

For custom installations or development, you can manually install services:

```bash
# Install main service (done automatically by install.sh)
sudo cp stinkster.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable stinkster.service
sudo systemctl start stinkster.service
```

## Dependencies

These services depend on the following system services:
- **gpsd.service**: GPS daemon for location services
- **kismet.service**: WiFi scanning service (usually started by scripts, not systemd)

## Notes

- All custom services run as user 'pi' for security
- The hackrf-scanner service has resource limits set for Raspberry Pi (256M memory, 25% CPU)
- Logs can be viewed with: `sudo journalctl -u service-name -f`
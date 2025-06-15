# Systemd Service Files

This directory contains the systemd service files for the Stinkster project.

## Service Files

### hackrf-scanner.service
- **Description**: HackRF Scanner - Real-time Spectrum Analyzer
- **Port**: 8090
- **Dependencies**: OpenWebRX service
- **Working Directory**: /home/pi/projects/hackrfscanner

### openwebrx-landing.service
- **Description**: OpenWebRX Landing Page Server
- **Working Directory**: /home/pi
- **Script**: /home/pi/landing-server.py

## Installation

To install these services on a new system:

```bash
# Copy service files to systemd directory
sudo cp hackrf-scanner.service /etc/systemd/system/
sudo cp openwebrx-landing.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable hackrf-scanner.service
sudo systemctl enable openwebrx-landing.service

# Start services
sudo systemctl start hackrf-scanner.service
sudo systemctl start openwebrx-landing.service

# Check service status
sudo systemctl status hackrf-scanner.service
sudo systemctl status openwebrx-landing.service
```

## Dependencies

These services depend on the following system services:
- **gpsd.service**: GPS daemon for location services
- **kismet.service**: WiFi scanning service (usually started by scripts, not systemd)

## Notes

- All custom services run as user 'pi' for security
- The hackrf-scanner service has resource limits set for Raspberry Pi (256M memory, 25% CPU)
- Logs can be viewed with: `sudo journalctl -u service-name -f`
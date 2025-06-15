# Stinkster - Raspberry Pi SDR & WiFi Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi-red.svg)](https://www.raspberrypi.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![CI](https://github.com/username/stinkster/workflows/Continuous%20Integration/badge.svg)](https://github.com/username/stinkster/actions)
[![Security](https://img.shields.io/badge/Security-Scanning-green.svg)](./SECURITY.md)
[![Regulatory](https://img.shields.io/badge/RF-Compliance%20Required-orange.svg)](./REGULATORY_COMPLIANCE.md)

A comprehensive Raspberry Pi-based platform that combines Software Defined Radio (SDR), WiFi scanning, GPS tracking, and TAK (Team Awareness Kit) integration for tactical networking and spectrum analysis.

> ⚠️ **IMPORTANT LEGAL NOTICE**: This software involves RF transmission and monitoring capabilities. Users are responsible for compliance with all applicable laws, regulations, and licensing requirements in their jurisdiction. See [Legal Compliance](#legal-compliance) section below.

## Features

- **HackRF SDR Operations**: Web-based SDR receiver with real-time spectrum analysis
- **WiFi Intelligence**: Kismet-based network scanning with advanced detection capabilities
- **GPS Integration**: MAVLink to GPSD bridge for precise location services
- **TAK Integration**: Converts WiFi scan data to TAK format for tactical mapping
- **Docker Support**: Containerized OpenWebRX for consistent SDR operations
- **Web Interfaces**: Multiple Flask-based services for monitoring and control

## Quick Start

### Prerequisites

- Raspberry Pi 4 (4GB+ recommended)
- MicroSD card (32GB+ recommended)
- HackRF One SDR device
- USB WiFi adapter (monitoring mode capable)
- GPS receiver (optional, for location services)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/stinkster.git
   cd stinkster
   ```

2. **Run the installer:**
   ```bash
   chmod +x install.sh
   sudo ./install.sh
   ```

3. **Configure your environment:**
   ```bash
   cp .env.example .env
   nano .env  # Fill in your specific values
   ```

4. **Start the services:**
   ```bash
   # Start GPS, Kismet, and WigleToTAK services
   ./src/orchestration/gps_kismet_wigle.sh
   
   # Or start individual services:
   ./start-openwebrx.sh        # SDR web interface
   ./dev.sh                    # Development environment
   ```

### Quick Configuration

The installer will set up all dependencies, but you'll need to configure:

- **GPS Device**: Set your GPS device path in `.env`
- **WiFi Interface**: Configure monitoring interface (usually `wlan1` or `wlan2`)
- **TAK Server**: If using TAK integration, set your server details
- **OpenWebRX**: Access at `http://your-pi-ip:8073` (admin/password from .env)

## Architecture

### Component Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GPS/MAVLink   │───▶│      GPSD       │───▶│     Kismet      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OpenWebRX     │    │   WigleToTAK    │◀───│  WiFi Scanning  │
│   (Docker)      │    │   (Flask App)   │    │   (.wiglecsv)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Spectrum Web   │    │   TAK Server    │
│   Interface     │    │  Integration    │
└─────────────────┘    └─────────────────┘
```

### Directory Structure

```
stinkster/
├── src/                    # Core application code
│   ├── gpsmav/            # GPS/MAVLink bridge
│   ├── hackrf/            # SDR spectrum analysis
│   ├── wigletotak/        # WiFi to TAK conversion
│   ├── orchestration/     # Service coordination scripts
│   └── scripts/           # Utility scripts
├── external/              # Symlinks to external components
├── dev/                   # Development tools and testing
├── systemd/              # System service definitions
├── docker-compose.yml    # Container orchestration
├── requirements*.txt     # Python dependencies by component
└── *.template.*          # Configuration templates
```

## Services

### 1. WiFi Scanning (Kismet)
- Real-time 802.11 monitoring
- Device fingerprinting and tracking
- GPS-enabled geolocation
- Export to WigleCSV format
- Web interface at `http://localhost:2501`

### 2. SDR Operations (HackRF + OpenWebRX)
- **OpenWebRX**: Full-featured web SDR at `http://localhost:8073`
- **Spectrum Analyzer**: Real-time FFT analysis at `http://localhost:8092`
- **Signal Detection**: Automated signal classification

### 3. GPS Integration
- MAVLink to GPSD bridge
- Support for various GPS receivers
- Real-time position for Kismet logging

### 4. TAK Integration (WigleToTAK)
- Converts WiFi scan results to TAK format
- Real-time device tracking on tactical maps
- Integration with ATAK/WinTAK
- Web interface at `http://localhost:6969`

### 5. Web Services
- **Health Monitoring**: Service status and logs
- **Configuration**: Web-based parameter tuning
- **Webhooks**: Remote control and integration

## Configuration

### Environment Variables (.env)

Key configuration options in your `.env` file:

```bash
# Hardware
GPS_DEVICE=/dev/ttyUSB0
WIFI_INTERFACE=wlan2

# Network Services
TAK_SERVER_IP=192.168.1.100
OPENWEBRX_ADMIN_PASSWORD=secure_password

# System Paths
PROJECT_DIR=/home/pi/projects/stinkster
LOG_DIR=/home/pi/tmp
```

### Service-Specific Configs

- **Kismet**: `kismet_site.conf` (from template)
- **OpenWebRX**: Configured via Docker environment
- **WigleToTAK**: `wigletotak-config.json`
- **GPS**: `gpsmav-config.json`

## Usage

### Starting Services

**Core services (GPS + Kismet + WigleToTAK):**
```bash
./src/orchestration/gps_kismet_wigle.sh
```

**Alternative orchestration scripts:**
```bash
# Fast startup (simplified)
./src/orchestration/gps_kismet_wigle_fast.sh

# Simple configuration
./src/orchestration/gps_kismet_wigle_fast_simple.sh
```

**Individual services:**
```bash
# SDR operations
./start-openwebrx.sh

# Development mode (includes monitoring)
./dev.sh

# Individual component scripts
./src/scripts/start_kismet.sh
./src/scripts/start_mediamtx.sh
```

### Monitoring

**Check service status:**
```bash
./dev/tools/health-check.sh
```

**View logs:**
```bash
# Main orchestration logs
tail -f /home/pi/tmp/gps_kismet_wigle.log

# Individual service logs
tail -f /home/pi/tmp/kismet.log
tail -f /home/pi/tmp/wigletotak.log

# Container logs
docker logs openwebrx
```

**Web interfaces:**
- OpenWebRX: `http://your-pi:8073`
- Kismet: `http://your-pi:2501`
- WigleToTAK: `http://your-pi:6969`
- Spectrum Analyzer: `http://your-pi:8092`
- Webhook Services: `http://your-pi:5000`

## Development

### Development Environment

```bash
# Start development environment
./dev.sh

# Run tests
./dev/test/run-integration-tests.sh

# Monitor components
./dev/tools/health-check.sh
```

### Adding Components

1. Create component in `src/` directory
2. Add requirements to appropriate `requirements-*.txt`
3. Update orchestration scripts
4. Add health checks
5. Update documentation

### Testing

- **All tests**: `./dev/test/run-all-tests.sh`
- **Unit tests**: `./dev/test/run-unit-tests.sh`
- **Integration tests**: `./dev/test/run-integration-tests.sh`
- **GPS component test**: `./dev/test/test-gpsmav.sh`

## Hardware Setup

### WiFi Adapter Configuration

Set your WiFi adapter to monitor mode:
```bash
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up
```

### HackRF Setup

Verify HackRF detection:
```bash
hackrf_info
# Should show your HackRF device details
```

### GPS Setup

Test GPS connection:
```bash
sudo stty -F /dev/ttyUSB0 4800
timeout 5 cat /dev/ttyUSB0 | grep GPGGA
```

## Troubleshooting

### Common Issues

**Services won't start:**
- Check hardware connections
- Verify device permissions: `ls -l /dev/ttyUSB* /dev/hackrf*`
- Ensure WiFi adapter supports monitor mode

**No GPS data:**
- Verify GPS device path in `.env`
- Check GPS reception (outdoor testing recommended)
- Test with `gpspipe -w`

**OpenWebRX container issues:**
- Check Docker service: `sudo systemctl status docker`
- Rebuild container: `./rebuild-openwebrx-docker.sh`
- Check logs: `docker logs openwebrx`

**WiFi scanning problems:**
- Verify interface supports monitor mode
- Check Kismet configuration
- Ensure no other processes using WiFi adapter

### Log Locations

- **Orchestration logs**: `/home/pi/tmp/gps_kismet_wigle.log`
- **Service logs**: `/home/pi/tmp/` (kismet.log, wigletotak.log, etc.)
- **Kismet capture data**: `data/kismet/`
- **Docker logs**: `docker logs openwebrx`
- **System service logs**: `journalctl -u <service_name>`

## Security Considerations

- **Change default passwords** in all configuration files
- **Restrict network access** to web interfaces
- **Use strong API keys** for webhook services
- **Keep firmware updated** on all hardware
- **Monitor logs** for suspicious activity

## Legal Compliance

### Regulatory Requirements

This software involves RF monitoring and transmission capabilities. Users must comply with:

- **Amateur Radio Licensing**: Some features may require appropriate radio license
- **Frequency Allocations**: Operate only within authorized frequency bands
- **Power Limits**: Respect local RF emission regulations
- **Privacy Laws**: Follow applicable data protection and privacy laws
- **Network Monitoring**: Obtain proper authorization for network scanning

### Compliance Documentation

- [REGULATORY_COMPLIANCE.md](REGULATORY_COMPLIANCE.md) - Detailed compliance guidance
- [SECURITY.md](SECURITY.md) - Security policies and procedures
- [LICENSE](LICENSE) - Full license terms including third-party components

### Prohibited Uses

- Unauthorized network access or intrusion
- Interference with licensed radio communications
- Privacy violations or unauthorized surveillance
- Operation outside licensed frequency allocations

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

**Quick contribution steps:**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Test your changes: `./dev/test/run-all-tests.sh`
4. Commit your changes: `git commit -m "Description"`
5. Push to your branch: `git push origin feature-name`
6. Open a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Include appropriate tests for new functionality
- Update documentation for user-facing changes
- Consider legal and regulatory implications
- Add appropriate warnings for RF-related features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Kismet** - Wireless network detector and scanner
- **OpenWebRX** - Multi-user SDR receiver
- **HackRF** - Software defined radio platform
- **GPSD** - GPS service daemon
- **Docker** - Containerization platform

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/stinkster/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/stinkster/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/stinkster/wiki)

---

**⚠️ Legal Notice**: This software is for educational and research purposes. Users are responsible for compliance with local laws and regulations regarding radio frequency monitoring and wireless network scanning.
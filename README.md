# Stinkster

Raspberry Pi-based platform combining SDR, WiFi scanning, GPS tracking, and TAK integration for tactical networking and spectrum analysis.

## Quick Start

```bash
git clone https://github.com/Graveside2022/stinkster.git
cd stinkster
./install.sh && ./src/orchestration/gps_kismet_wigle.sh
```

## Key Commands

- `./src/orchestration/gps_kismet_wigle.sh` - Start all services
- `./dev/tools/health-check.sh` - Check service status
- `./dev/test/run-all-tests.sh` - Run tests
- `docker logs openwebrx` - View SDR logs
- `tail -f /home/pi/tmp/gps_kismet_wigle.log` - View main logs

## Features

- HackRF SDR with web-based spectrum analyzer
- Kismet WiFi scanning with real-time tracking
- MAVLink to GPSD bridge for GPS integration
- WiFi to TAK format conversion for tactical mapping
- Multiple web interfaces for monitoring and control

## Web Interfaces

- OpenWebRX: `http://your-pi:8073` (admin/hackrf)
- Spectrum Analyzer: `http://your-pi:8092`
- WigleToTAK: `http://your-pi:6969`
- Kismet: `http://your-pi:2501`

## System Requirements

- Raspberry Pi 4 (4GB+) or Pi 3B+
- HackRF One SDR device
- USB WiFi adapter (monitor mode capable)
- GPS receiver (optional)

## License

MIT License - see [LICENSE](LICENSE) file for details.

**⚠️ Legal Notice**: Users are responsible for compliance with local laws regarding RF monitoring and wireless scanning. See [REGULATORY_COMPLIANCE.md](REGULATORY_COMPLIANCE.md) for details.
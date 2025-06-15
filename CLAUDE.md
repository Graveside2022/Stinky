# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raspberry Pi-based system that combines Software Defined Radio (SDR), WiFi scanning, and GPS tracking capabilities with TAK (Team Awareness Kit) integration. The system consists of several interconnected components:

- **HackRF SDR Operations**: Web-based SDR receiver and spectrum analyzer
- **WiFi Scanning**: Kismet-based network scanning with real-time tracking
- **GPS Integration**: MAVLink to GPSD bridge for location services
- **TAK Integration**: Converts WiFi scan data to TAK format for mapping

## Installation and Setup

### Automated Installation (Recommended)

**One-command installation on fresh Raspberry Pi:**

```bash
git clone https://github.com/your-username/stinkster.git
cd stinkster
./install.sh
```

The installer automatically:
- ✅ Validates hardware (HackRF, GPS, WiFi adapters)
- ✅ Installs system dependencies (Kismet, Docker, HackRF tools, GPSD)
- ✅ Sets up Python virtual environments for all components
- ✅ Builds HackRF-optimized OpenWebRX Docker container
- ✅ Creates systemd services for automatic startup
- ✅ Configures all templates with working defaults

**Installation time:** 10-15 minutes

### Post-Installation Setup

After automated installation:

```bash
# 1. Review/edit configuration (optional - defaults work)
nano .env

# 2. Start all services
sudo systemctl start stinkster
# OR start manually:
./src/orchestration/gps_kismet_wigle.sh

# 3. Access web interfaces at:
# - OpenWebRX (HackRF): http://your-pi:8074 (admin/hackrf)
# - Spectrum Analyzer: http://your-pi:8092
# - WigleToTAK: http://your-pi:6969
# - Kismet: http://your-pi:2501
```

### Development Environment Setup

For active development (after installation):

```bash
# Set up development tools
./dev.sh setup

# Start all services in development mode  
./dev.sh start
```

### Configuration Management
The project uses a template-based configuration system:
- Templates are stored in `/config/templates/`
- Automated installer creates all configurations from templates
- Manual setup: `./setup-configs.sh` to create configuration files
- Edit `.env` file for environment-specific settings
- Component-specific configs: `gpsmav-config.json`, `spectrum-analyzer-config.json`, etc.

## Common Commands

### Service Management (New Unified System)

Start all services:
```bash
./dev.sh start
```

Start individual components:
```bash
./dev.sh start gpsmav      # GPS MAVLink bridge
./dev.sh start hackrf      # HackRF spectrum analyzer
./dev.sh start wigletotak  # WiFi to TAK converter
./dev.sh start kismet      # WiFi scanner
./dev.sh start openwebrx   # Web SDR interface
```

Stop services:
```bash
./dev.sh stop              # Stop all components
./dev.sh stop kismet       # Stop specific component
```

Check service status:
```bash
./dev.sh status
```

Restart services:
```bash
./dev.sh restart           # Restart all
./dev.sh restart hackrf    # Restart specific component
```

### Monitoring and Logs

View logs:
```bash
./dev.sh logs              # Show all component logs
./dev.sh logs wigletotak   # Show specific component logs
./dev.sh logs kismet       # Show Kismet logs
```

Direct log file access:
```bash
tail -f dev/logs/gpsmav.log
tail -f dev/logs/hackrf.log
tail -f dev/logs/wigletotak.log
tail -f dev/logs/kismet.log
tail -f dev/logs/openwebrx.log
```

### Development Environment

Enable hot reload for development:
```bash
./dev.sh hot-reload
```

Run tests:
```bash
./dev.sh test              # Run all tests
./dev.sh test unit         # Run unit tests
./dev.sh test integration  # Run integration tests
```

Clean up environment:
```bash
./dev.sh clean             # Clean logs and PID files
```

### Legacy Service Commands (For Reference)

Individual service testing:
```bash
# GPS services
sudo systemctl restart gpsd
gpspipe -w -n 1  # Test GPS

# Legacy orchestration scripts (now managed by dev.sh)
src/orchestration/gps_kismet_wigle.sh
src/orchestration/v2gps_kismet_wigle.sh

# Direct script access
src/scripts/start_kismet.sh
src/scripts/start_mediamtx.sh
```

### Python Virtual Environments

The new system uses a unified project-level virtual environment:
```bash
# Activate main project environment
source venv/bin/activate

# Component-specific environments are still available:
# GPSmav
source src/gpsmav/venv/bin/activate
cd src/gpsmav && python3 mavgps.py

# WigleToTAK
cd src/wigletotak/WigleToTAK/TheStinkToTAK
source venv/bin/activate
python3 WigleToTak2.py

# HackRF spectrum analyzer
cd src/hackrf
source venv/bin/activate  
python3 spectrum_analyzer.py
```

### Network Interface Configuration

Configure WiFi adapter for monitoring:
```bash
# Put in monitor mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up

# Reset to managed mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up
```

## Code Architecture

### Directory Structure (Updated)
- `src/gpsmav/`: MAVLink to GPSD bridge - converts drone GPS to standard format
- `src/wigletotak/`: Web dashboard for converting Kismet WiFi scans to TAK format
- `src/hackrf/`: SDR tools including spectrum analyzer and signal processing
- `src/orchestration/`: Service coordination scripts
- `src/scripts/`: Individual service startup scripts
- `dev/`: Development environment with component wrappers and tools
- `config/`: Configuration templates and examples
- `docker/`: Docker configurations
- `docs/`: API documentation and system guides
- `logs/`: Runtime logs (created during execution)
- `data/`: Persistent data storage (Kismet captures, etc.)
- `external/`: Git submodules for external components

### Key Integration Points
1. **GPS Flow**: MAVLink device → mavgps.py → GPSD (port 2947) → Kismet
2. **WiFi Scanning**: Kismet → .wiglecsv files → WigleToTAK → TAK server
3. **Service Coordination**: dev.sh manages all processes with PID tracking and logging

### Important Ports
- 2947: GPSD service
- 6969: TAK broadcasting (default, configurable)
- 8000: WigleToTAK Flask web interface (configurable via --flask-port)
- 8074: OpenWebRX SDR interface (Docker container)
- 8092: Spectrum Analyzer web interface with WebSocket support
- 14550: MAVProxy connection

### Web Applications
- **WigleToTak2.py**: Flask app at port 8000 (configurable) for WiFi device tracking and TAK conversion
- **spectrum_analyzer.py**: Flask/SocketIO app at port 8092 for real-time spectrum analysis with OpenWebRX integration
- **OpenWebRX**: Docker-based SDR web interface at port 8074
- **v2WigleToTak2.py**: Enhanced version with antenna sensitivity compensation and improved features

**📋 See [docs/api/API_DOCUMENTATION.md](docs/api/API_DOCUMENTATION.md) for comprehensive REST API and WebSocket interface documentation.**

## Development Notes

### Testing Commands

**Post-Installation Verification:**
```bash
# Quick system health check (from install.sh)
./dev/tools/health-check.sh

# Comprehensive verification
./dev/test/run-all-tests.sh

# Check installation status
systemctl status stinkster
```

**Automated Development Testing:**
```bash
./dev.sh test unit         # Unit tests
./dev.sh test integration  # Integration tests  
./dev.sh test all          # All tests
```

**Manual Hardware Testing:**
```bash
# Test HackRF
hackrf_info
lsusb | grep 1d50:6089

# Test GPS connection  
gpspipe -w -n 1
timeout 5 cat /dev/ttyUSB0 | grep GPGGA

# Test WiFi interfaces
iw dev | grep Interface
iwconfig

# Check USB devices
lsusb
ls -l /dev/ttyUSB* /dev/ttyACM*
```

**Service Testing:**
```bash
# Test individual components
./dev.sh status
./dev.sh test integration

# Web interface accessibility
curl -s http://localhost:8074 >/dev/null && echo "OpenWebRX OK" || echo "OpenWebRX Failed"
curl -s http://localhost:6969 >/dev/null && echo "WigleToTAK OK" || echo "WigleToTAK Failed"
```

### Process Management
The new development system (`dev.sh`) handles:
- Unified component lifecycle management
- Health monitoring and automatic restart capabilities
- Centralized logging to `dev/logs/`
- PID tracking in `dev/pids/`
- Hot reload support for development
- Clean shutdown with signal handling

### Configuration Files
Template-based configuration system:
- **Templates**: `config/templates/*.template.*`
- **Generated configs**: Project root (`.env`, `*.json`, `*.conf`)
- **Component configs**: Component-specific JSON files
- **Docker**: `docker-compose.yml` from template
- **Environment**: `.env` file for sensitive settings

### Python Dependencies
Unified dependency management:
- **Main project**: `requirements.txt` and `venv/`
- **Component-specific**: Each component maintains its own `requirements.txt` and `venv/`
- **Configuration files**: `config/requirements-*.txt` for different component groups

Use project virtual environment when possible:
```bash
source venv/bin/activate
```

### Development Workflow
1. **Setup**: `./setup-configs.sh` then `./dev.sh setup`
2. **Development**: `./dev.sh start` and `./dev.sh hot-reload`
3. **Testing**: `./dev.sh test`
4. **Monitoring**: `./dev.sh logs` and `./dev.sh status`
5. **Cleanup**: `./dev.sh clean`

## Docker and SDR Integration

### HackRF/OpenWebRX Setup
The system includes automated Docker setup for OpenWebRX:

```bash
# Start OpenWebRX via dev.sh
./dev.sh start openwebrx

# Or manually via Docker Compose
docker-compose up openwebrx

# Check SDR configuration
docker exec openwebrx cat /var/lib/openwebrx/sdrs.json
```

### Troubleshooting HackRF Integration
1. **Verify HackRF detection**:
   ```bash
   docker exec openwebrx SoapySDRUtil --find
   # Should show: Found device 0, driver = hackrf
   ```

2. **Configuration management**:
   - SDR configurations are managed via templates in `config/templates/`
   - OpenWebRX configurations are automatically applied during container startup
   - Use `config/examples/openwebrx-sdrs.json` as reference

3. **Access OpenWebRX**:
   - URL: http://localhost:8074 (or your Pi's IP:8074)
   - Default credentials configured in docker-compose.yml

### Working HackRF Configuration
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
                    "name": "2m AFu Band",
                    "center_freq": 145000000,  
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -72,
                    "lfo_offset": 300
                }
            }
        }
    }
}
```

### Key Integration Features:
- Native HackRF driver support (not SoapySDR)
- Automated configuration deployment
- Integrated spectrum analyzer at port 8092
- WebSocket real-time data streaming
- Multi-band profile support

## Quick Reference Summary

### New User - Complete Setup
```bash
# 1. One-command installation (recommended)
git clone https://github.com/your-username/stinkster.git && cd stinkster && ./install.sh

# 2. Start services
sudo systemctl start stinkster

# 3. Access web interfaces
# - OpenWebRX: http://your-pi:8074 (admin/hackrf)
# - WigleToTAK: http://your-pi:6969
# - Spectrum Analyzer: http://your-pi:8092
# - Kismet: http://your-pi:2501
```

### Developer - Development Workflow
```bash
# After installation, set up development environment
./dev.sh setup

# Start development mode with hot reload
./dev.sh start

# View logs and monitor
./dev.sh logs
./dev.sh status

# Run tests
./dev.sh test
```

### System Administration
```bash
# Service management
sudo systemctl start/stop/restart stinkster
systemctl status stinkster

# Health monitoring
./dev/tools/health-check.sh

# Configuration validation
./dev/tools/validate-config.sh

# View system logs
journalctl -u stinkster -f
```

### Troubleshooting Quick Checks
```bash
# Hardware verification
hackrf_info                    # HackRF detection
gpspipe -w -n 1               # GPS data
iw dev                        # WiFi interfaces
docker ps                     # Container status

# Service verification  
curl -s http://localhost:8074 >/dev/null && echo "OpenWebRX OK"
./dev.sh status               # All components
./dev/test/run-all-tests.sh   # Comprehensive testing
```

For detailed documentation, see:
- **[QUICK_START.md](QUICK_START.md)** - Complete installation and setup guide
- **[README.md](README.md)** - Project overview and architecture
- **[dev/DEVELOPMENT_GUIDE.md](dev/DEVELOPMENT_GUIDE.md)** - Development environment details
- **[docs/api/API_DOCUMENTATION.md](docs/api/API_DOCUMENTATION.md)** - API reference
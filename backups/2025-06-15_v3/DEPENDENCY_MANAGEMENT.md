# Stinkster Project - Dependency Management Guide

This document describes the unified dependency management system for the Stinkster project, which includes multiple Python components with different requirements.

## Overview

The Stinkster project consists of several components:
- **GPSmav**: GPS/MAVLink bridge for converting drone GPS data to GPSD format
- **WigleToTAK**: Web interface for converting WiFi scan data to TAK format
- **HackRF**: Spectrum analyzer and SDR tools for radio frequency analysis
- **Web Services**: General web interfaces, webhooks, and configuration management

## Dependency Files

### Master Requirements
- `requirements.txt` - Master requirements file with all dependencies
- `requirements-dev.txt` - Development dependencies (testing, code quality tools)

### Component-Specific Requirements
- `requirements-gpsmav.txt` - GPS/MAVLink bridge minimal dependencies
- `requirements-wigletotak.txt` - WiFi data conversion minimal dependencies  
- `requirements-hackrf.txt` - Spectrum analyzer and SDR dependencies
- `requirements-web.txt` - Web services and webhook dependencies

### Generated Files
- `requirements-*-freeze.txt` - Frozen/pinned versions of installed packages

## Setup Scripts

### Virtual Environment Creation
- `setup-venv-all.sh` - Sets up all component virtual environments
- `setup-venv-gpsmav.sh` - GPSmav component only
- `setup-venv-wigletotak.sh` - WigleToTAK component only
- `setup-venv-hackrf.sh` - HackRF component only
- `setup-venv-web.sh` - Web services component only

### Dependency Management
- `manage-dependencies.sh` - Unified dependency management tool

## Virtual Environment Locations

```
/home/pi/gpsmav/GPSmav/venv                    # GPSmav
/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/venv  # WigleToTAK
/home/pi/HackRF/venv                          # HackRF tools
/home/pi/web/venv                             # Web services
```

## Quick Start

### 1. Set up all virtual environments:
```bash
cd /home/pi/projects/stinkster
./setup-venv-all.sh
```

### 2. Check status:
```bash
./manage-dependencies.sh status
```

### 3. Install/update dependencies:
```bash
./manage-dependencies.sh install all
./manage-dependencies.sh update all
```

## Component Details

### GPSmav Dependencies
```
pymavlink>=2.4.33    # MAVLink protocol implementation
pyserial>=3.5        # Serial port communication
```

**Purpose**: Converts MAVLink GPS data from drones to standard GPSD format for use by other applications.

### WigleToTAK Dependencies
```
Flask==3.0.2         # Web framework
```

**Purpose**: Web interface for converting Kismet WiFi scan data to TAK (Team Awareness Kit) format for tactical mapping.

### HackRF Dependencies
```
Flask==3.0.2         # Web framework
Flask-SocketIO>=5.5.1  # WebSocket support
numpy>=2.3.0         # Numerical computing
websockets>=15.0.1   # WebSocket communication
requests>=2.32.3     # HTTP requests
```

**Purpose**: Real-time spectrum analysis and SDR operations using HackRF hardware.

### Web Services Dependencies
```
Flask==3.0.2         # Web framework
Flask-CORS>=6.0.1    # Cross-origin support
psutil>=7.0.0        # System monitoring
requests>=2.32.3     # HTTP requests
python-dotenv>=1.0.0 # Environment management
```

**Purpose**: General web interfaces, webhooks, and system configuration management.

## System Dependencies

These must be installed with `apt` on Raspberry Pi OS:

### GPS and Location Services
```bash
sudo apt install gpsd gpsd-clients python3-gps
```

### HackRF SDR Tools
```bash
sudo apt install hackrf libhackrf-dev libhackrf0
```

### WiFi Scanning (Kismet)
```bash
sudo apt install kismet kismet-plugins
```

### Build Tools
```bash
sudo apt install build-essential python3-dev python3-venv python3-pip
```

### Network Tools
```bash
sudo apt install net-tools wireless-tools iw
```

### Docker (for OpenWebRX)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

## Management Commands

### Check Status
```bash
./manage-dependencies.sh status
```
Shows the status of all virtual environments and installed packages.

### Install Dependencies
```bash
# Install all components
./manage-dependencies.sh install all

# Install specific component
./manage-dependencies.sh install gpsmav
./manage-dependencies.sh install wigletotak
./manage-dependencies.sh install hackrf
./manage-dependencies.sh install web
```

### Update Dependencies
```bash
# Update all components
./manage-dependencies.sh update all

# Update specific component
./manage-dependencies.sh update hackrf
```

### Check for Outdated Packages
```bash
./manage-dependencies.sh check all
./manage-dependencies.sh check gpsmav
```

### Generate Package Lists (Freeze)
```bash
./manage-dependencies.sh freeze all
./manage-dependencies.sh freeze hackrf
```

### Clean Pip Cache
```bash
./manage-dependencies.sh clean all
```

## Component Isolation Strategy

Each component has its own virtual environment to prevent dependency conflicts:

1. **Minimal Dependencies**: Each component only includes what it actually needs
2. **Version Locking**: Flask is locked to 3.0.2 to match WigleToTAK's exact requirement
3. **Optional Dependencies**: Advanced features (scipy, matplotlib) are commented out by default
4. **System Integration**: Uses system packages for GPS and SDR libraries when possible

## Development Dependencies

For development work, install additional tools:

```bash
# Create development environment
cd /home/pi/projects/stinkster
python3 -m venv venv-dev
source venv-dev/bin/activate
pip install -r requirements-dev.txt
```

Development tools include:
- pytest (testing)
- black (code formatting)
- flake8 (linting)
- mypy (type checking)
- jupyter (notebooks)

## Troubleshooting

### Virtual Environment Issues
```bash
# Recreate a specific environment
./setup-venv-hackrf.sh --force

# Recreate all environments
./setup-venv-all.sh --force
```

### Permission Issues
```bash
# Fix permissions for HackRF
sudo usermod -aG plugdev $USER
sudo usermod -aG dialout $USER

# Create udev rules (handled by system-dependencies.sh)
```

### Missing System Dependencies
```bash
# Run system dependency installer
./system-dependencies.sh
```

### Package Installation Failures
```bash
# Clean cache and retry
./manage-dependencies.sh clean hackrf
./manage-dependencies.sh install hackrf
```

## Integration with Main Install Script

The main installation script (`install.sh`) automatically uses this dependency management system:

1. First tries to use `setup-venv-all.sh` for unified setup
2. Falls back to manual setup if unified scripts aren't available
3. Uses exact version specifications to ensure consistency

## Backup Considerations

Virtual environments are excluded from backups by default because they can be recreated from requirements files:

- `backup_exclusions.txt` includes `**/venv/` patterns
- Use `./setup-venv-all.sh` to recreate environments after restore
- Requirements files are included in backups

## Best Practices

1. **Always activate the correct virtual environment** before running components
2. **Use component-specific requirements files** for minimal installations
3. **Keep requirements files updated** when adding new dependencies
4. **Test in isolated environments** before updating production
5. **Document any system-level dependencies** in this file

## Future Enhancements

Planned improvements to the dependency management system:

1. **Automatic dependency conflict detection**
2. **Requirements synchronization** from master to component files
3. **Automated testing** of dependency combinations
4. **Docker-based isolation** as an alternative to virtual environments
5. **Dependency vulnerability scanning**
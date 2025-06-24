# Stinkster Development Environment Guide

This guide covers the comprehensive development workflow for the Stinkster project, allowing you to
work entirely within the project folder with advanced development tools, testing, and hot-reload
capabilities.

## Quick Start

### Prerequisites

Before starting development, ensure you have a working Stinkster installation:

```bash
# If not already installed, run the automated installation
./install.sh

# This will automatically:
# - Install system dependencies (Docker, Kismet, GPSD, HackRF tools)
# - Set up Python virtual environments
# - Configure services
# - Download and configure OpenWebRX with HackRF support
# - Set up development environment
```

### Development Workflow

```bash
# Set up development environment (if not done by install.sh)
./dev.sh setup

# Start all services in development mode
./dev.sh start

# Check component status
./dev.sh status

# View logs
./dev.sh logs

# Run tests
./dev.sh test

# Stop all services
./dev.sh stop
```

## Development Environment Structure

```
stinkster/
├── dev.sh                     # Main development launcher
├── dev/
│   ├── setup.sh              # Environment setup script
│   ├── components/           # Component wrapper scripts
│   │   ├── gpsmav.sh        # GPS MAVLink bridge wrapper
│   │   ├── hackrf.sh        # HackRF spectrum analyzer wrapper
│   │   ├── wigletotak.sh    # WiFi to TAK converter wrapper
│   │   ├── kismet.sh        # Kismet WiFi scanner wrapper
│   │   └── openwebrx.sh     # OpenWebRX SDR wrapper
│   ├── test/                # Testing infrastructure
│   │   ├── run-all-tests.sh # Main test runner
│   │   ├── run-unit-tests.sh # Unit tests
│   │   └── run-integration-tests.sh # Integration tests
│   ├── tools/               # Development tools
│   │   ├── health-check.sh  # System health monitoring
│   │   ├── component-manager.sh # Advanced component management
│   │   ├── logview.sh       # Interactive log viewer
│   │   ├── monitor.sh       # Process monitor
│   │   └── validate-config.sh # Configuration validator
│   ├── hot-reload/          # Hot reload system
│   │   └── monitor.sh       # File change monitor
│   ├── logs/               # Development logs
│   ├── pids/               # Process ID files
│   └── config/             # Development configurations
├── src/                    # Source code (primary codebase)
│   ├── gpsmav/            # GPS MAVLink bridge
│   ├── hackrf/            # HackRF tools
│   ├── wigletotak/        # WiFi to TAK conversion
│   ├── orchestration/     # Service orchestration
│   └── scripts/           # Utility scripts
└── config.py              # Main configuration module
```

## Development Commands

### Main Development Launcher (`./dev.sh`)

```bash
# Start all components
./dev.sh start

# Start specific component
./dev.sh start gpsmav

# Stop all components
./dev.sh stop

# Stop specific component
./dev.sh stop wigletotak

# Restart components
./dev.sh restart
./dev.sh restart hackrf

# Show component status
./dev.sh status

# View logs (all components)
./dev.sh logs

# View logs for specific component
./dev.sh logs kismet

# Run tests
./dev.sh test           # All tests
./dev.sh test unit      # Unit tests only
./dev.sh test integration # Integration tests only

# Enable hot reload
./dev.sh hot-reload

# Set up development environment
./dev.sh setup

# Clean up logs and PID files
./dev.sh clean
```

### Component Management (`./dev/tools/component-manager.sh`)

Advanced component control with detailed monitoring:

```bash
# Show detailed component status
./dev/tools/component-manager.sh status

# Start component with debug logging
./dev/tools/component-manager.sh start wigletotak debug

# Start component with verbose output
./dev/tools/component-manager.sh start gpsmav verbose

# Start component with profiling
./dev/tools/component-manager.sh start hackrf profile

# Stop component with custom timeout
./dev/tools/component-manager.sh stop kismet 30

# Rolling restart (zero downtime)
./dev/tools/component-manager.sh rolling-restart wigletotak

# Monitor component health
./dev/tools/component-manager.sh monitor hackrf 120

# Show filtered logs
./dev/tools/component-manager.sh logs kismet error

# Performance analysis
./dev/tools/component-manager.sh performance wigletotak 300
```

### Health Monitoring (`./dev/tools/health-check.sh`)

Comprehensive system and component health assessment:

```bash
# Full health check
./dev/tools/health-check.sh

# Check specific aspects
./dev/tools/health-check.sh system      # System dependencies
./dev/tools/health-check.sh hardware    # Hardware availability
./dev/tools/health-check.sh processes   # Running processes
./dev/tools/health-check.sh network     # Network connectivity
./dev/tools/health-check.sh config      # Configuration validation

# Generate health report
./dev/tools/health-check.sh report
```

### Hot Reload System (`./dev/hot-reload/monitor.sh`)

Automatic component restart on file changes:

```bash
# Start hot reload monitoring
./dev/hot-reload/monitor.sh start

# Check monitor status
./dev/hot-reload/monitor.sh status

# Create configuration file
./dev/hot-reload/monitor.sh config
```

### Testing Infrastructure

```bash
# Run all tests
./dev/test/run-all-tests.sh

# Run unit tests only
./dev/test/run-unit-tests.sh

# Run integration tests
./dev/test/run-integration-tests.sh

# Run specific integration test types
./dev/test/run-integration-tests.sh system
./dev/test/run-integration-tests.sh hardware
./dev/test/run-integration-tests.sh components
```

## Component Development

### Working with Python Components

Each Python component has its own wrapper script that:

- Activates the Python virtual environment
- Sets up the Python path to include `src/`
- Sets development environment variables
- Enables debug logging
- Runs the component from the `src/` directory

#### GPSmav Development

```bash
# Start GPSmav in development mode
./dev/components/gpsmav.sh

# The wrapper automatically:
# - Activates venv
# - Sets PYTHONPATH to include src/
# - Sets DEV_MODE=1 and LOG_LEVEL=DEBUG
# - Runs: python3 -m gpsmav.main
```

#### HackRF Development

```bash
# Start HackRF spectrum analyzer
./dev/components/hackrf.sh

# Automatically configures:
# - Development environment
# - Debug logging
# - Runs: python3 -m hackrf.spectrum_analyzer
```

#### WigleToTAK Development

```bash
# Start WigleToTAK web application
./dev/components/wigletotak.sh

# Sets Flask development mode:
# - FLASK_ENV=development
# - FLASK_DEBUG=1
# - Runs: python3 -m wigletotak.app
```

### Configuration Management

The development environment uses a unified configuration system established by the installer:

#### Centralized Configuration

```python
# config.py provides centralized configuration
from config import config

# Access configuration values
kismet_url = config.kismet_api_url
tak_server = config.tak_server_ip
gps_host = config.gpsd_host
hackrf_gain = config.hackrf_vga_gain
```

#### Configuration Files Structure

```
config/
├── templates/           # Template files for all configurations
│   ├── config.json.template
│   ├── docker-compose.template.yml
│   ├── gpsmav-config.template.json
│   ├── spectrum-analyzer-config.template.json
│   └── wigletotak-config.template.json
└── examples/            # Working example configurations
    ├── gpsmav-config.json
    ├── openwebrx-sdrs.json
    └── spectrum-analyzer-config.json
```

#### Environment Variable Overrides

Environment variables override default values:

- `KISMET_API_URL`
- `TAK_SERVER_IP`
- `GPSD_HOST`
- `NETWORK_INTERFACE`
- `LOG_LEVEL`
- `HACKRF_VGA_GAIN`
- `HACKRF_LNA_GAIN`
- `HACKRF_AMP_ENABLE`

#### Configuration Setup

The installer automatically creates working configurations:

```bash
# Setup configurations (done by install.sh)
./setup-configs.sh

# Validate configurations
./dev/tools/validate-config.sh
```

## Hot Reload Development

The hot reload system monitors source files and automatically restarts components when changes are
detected:

### Features

- **File Watching**: Monitors `src/` directory and `config.py`
- **Debouncing**: Waits 3 seconds after changes before restarting
- **Graceful Restart**: Stops components cleanly before restarting
- **Component Detection**: Automatically determines which component to restart
- **Loop Prevention**: Limits restart attempts to prevent infinite loops

### Configuration

Edit `dev/hot-reload/config.sh` to customize:

```bash
# Debounce interval (seconds)
DEBOUNCE_INTERVAL=3

# File extensions to ignore
EXCLUDED_EXTENSIONS=("pyc" "pyo" "__pycache__")

# Paths to ignore
EXCLUDED_PATHS=("venv" ".git" "__pycache__")
```

### Usage

```bash
# Enable hot reload (included in ./dev.sh start)
./dev.sh hot-reload

# Or start manually
./dev/hot-reload/monitor.sh start
```

## Testing Framework

### Test Types

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test component interactions and system integration
3. **Hardware Tests**: Test hardware availability and connectivity

### Test Execution

```bash
# Run all tests
./dev.sh test

# Run specific test types
./dev.sh test unit
./dev.sh test integration

# Run integration tests with specific focus
./dev/test/run-integration-tests.sh system      # Test installed dependencies
./dev/test/run-integration-tests.sh hardware    # Test hardware availability
./dev/test/run-integration-tests.sh components  # Test component setup
./dev/test/run-integration-tests.sh services    # Test running services
./dev/test/run-integration-tests.sh all         # Run all integration tests
```

### Installation Validation

After running `./install.sh`, validate the installation:

```bash
# Comprehensive system validation
./dev/test/run-integration-tests.sh all

# Quick health check
./dev/tools/health-check.sh

# Verify specific components
./dev/test/run-integration-tests.sh system     # Check installed packages
./dev/test/run-integration-tests.sh hardware   # Check connected devices
```

### Integration Test Coverage

- **System Dependencies**: Python 3, Docker, Kismet, GPSD, HackRF tools
- **Network Interface Availability**: WiFi adapters, monitor mode capability
- **Hardware Detection**: HackRF One, GPS devices, USB permissions
- **Component Startup and Health**: All services start correctly
- **Service Port Availability**: All required ports accessible
- **Configuration Validation**: All config files valid and consistent
- **Docker Container Functionality**: OpenWebRX container runs and responds
- **Virtual Environment Integrity**: All Python environments working
- **File Permissions**: Correct permissions for hardware access

## Monitoring and Debugging

### Process Monitoring

```bash
# Real-time process monitor
./dev/tools/monitor.sh

# Component status with resource usage
./dev/tools/component-manager.sh status
```

### Log Management

```bash
# View all logs
./dev.sh logs

# View specific component logs
./dev.sh logs wigletotak

# Interactive log viewer
./dev/tools/logview.sh gpsmav

# Filtered log viewing
./dev/tools/component-manager.sh logs kismet error
```

### Performance Analysis

```bash
# Analyze component performance
./dev/tools/component-manager.sh performance wigletotak 300

# Health check with resource usage
./dev/tools/health-check.sh resources
```

## Development Best Practices

### 1. Environment Setup

#### Initial Installation

For a fresh system, use the automated installer:

```bash
# Complete system setup with all dependencies
./install.sh
```

This automated installer:

- Validates hardware requirements (HackRF, GPS, WiFi adapters)
- Installs system dependencies (Docker, Kismet, GPSD, HackRF tools)
- Sets up Python virtual environments with correct dependencies
- Configures OpenWebRX with native HackRF support
- Creates proper directory structure
- Sets up systemd services
- Initializes development environment

#### Development Environment Setup

If you need to reinitialize just the development environment:

```bash
./dev.sh setup
```

This creates:

- Development directory structure
- Component wrapper scripts
- Test infrastructure
- Hot reload monitoring

### 2. Hot Reload Development

Use hot reload for active development:

```bash
./dev.sh start  # Includes hot reload
```

- Make changes to files in `src/`
- Components automatically restart
- Check logs for errors: `./dev.sh logs`

### 3. Testing Workflow

Test early and often:

```bash
# Before making changes
./dev.sh test

# After making changes
./dev.sh test

# Check specific functionality
./dev/test/run-integration-tests.sh components
```

### 4. Health Monitoring

Regularly check system health:

```bash
# Quick health check
./dev/tools/health-check.sh

# Detailed component status
./dev/tools/component-manager.sh status
```

### 5. Configuration Management

Use environment variables for development overrides:

```bash
# Set development configuration
export KISMET_API_URL="http://localhost:2501"
export LOG_LEVEL="DEBUG"
export DEV_MODE="1"

# Start components
./dev.sh start
```

## Installation and Setup

### Automated Installation

The project includes a comprehensive automated installer that handles all system setup:

```bash
# Run the automated installer
./install.sh
```

**What the installer does:**

1. **Validates Prerequisites**: Internet connectivity, disk space, sudo access
2. **Checks Hardware**: HackRF detection, WiFi interfaces, GPS devices
3. **System Dependencies**: Docker, Kismet, GPSD, HackRF tools, build tools
4. **Repository Setup**: Creates directory structure and symlinks
5. **Python Environments**: Sets up isolated virtual environments for each component
6. **OpenWebRX Integration**: Downloads and configures pre-built OpenWebRX with HackRF support
7. **Service Configuration**: Sets up systemd services and configurations
8. **Development Environment**: Initializes development tools and testing infrastructure

### Post-Installation Verification

```bash
# Verify installation
./dev/tools/health-check.sh

# Test individual components
./dev.sh test

# Start development environment
./dev.sh start
```

### OpenWebRX Integration

The installer includes automated OpenWebRX setup with:

- **Pre-built Docker image** with native HackRF support
- **Optimized configurations** for HackRF One devices
- **Hardware-specific settings** based on detected devices
- **Automatic container management**

If OpenWebRX needs rebuilding:

```bash
# Rebuild OpenWebRX container
./rebuild-openwebrx-docker.sh

# Or restore from working backup
./load-openwebrx-backup.sh
```

## Troubleshooting

### Installation Issues

1. **Installation fails**

   ```bash
   # Check prerequisites
   curl -s --head --connect-timeout 5 http://www.google.com/
   df -h  # Check disk space (need 2GB+)
   sudo -n true  # Check sudo access
   ```

2. **Hardware not detected**

   ```bash
   # Check HackRF
   lsusb | grep 1d50:6089
   hackrf_info

   # Check GPS devices
   ls -la /dev/ttyUSB* /dev/ttyACM*

   # Check WiFi interfaces
   iw dev
   ```

### Development Issues

1. **Components won't start**

   ```bash
   # Check system dependencies
   ./dev/tools/health-check.sh system

   # Verify installation
   ./dev/tools/health-check.sh
   ```

2. **Network interface not available**

   ```bash
   # Check hardware
   ./dev/tools/health-check.sh hardware
   ```

3. **Python import errors**

   ```bash
   # Validate configuration
   ./dev/tools/validate-config.sh

   # Check virtual environments
   ./dev/tools/health-check.sh
   ```

4. **Hot reload not working**

   ```bash
   # inotify-tools should be installed by install.sh
   # If missing, install manually:
   sudo apt-get install inotify-tools
   ```

5. **OpenWebRX issues**

   ```bash
   # Check container status
   docker ps | grep openwebrx

   # View logs
   docker logs openwebrx

   # Test HackRF in container
   docker exec openwebrx SoapySDRUtil --find

   # Rebuild if needed
   ./rebuild-openwebrx-docker.sh

   # Restore from working backup
   ./load-openwebrx-backup.sh
   ```

### OpenWebRX Development

The project includes automated OpenWebRX setup with native HackRF support:

#### Container Management

```bash
# Start OpenWebRX container
./dev/components/openwebrx.sh

# Manual container operations
docker start openwebrx
docker stop openwebrx
docker restart openwebrx

# View real-time logs
docker logs -f openwebrx
```

#### Configuration

OpenWebRX is pre-configured with:

- **Native HackRF driver** (not SoapySDR)
- **Optimized gain settings**: VGA=35, LNA=40, AMP=0
- **Multiple frequency profiles**: 2m, 70cm, airband, FM broadcast
- **Hardware-specific settings** based on detected HackRF device

#### Accessing OpenWebRX

- **URL**: http://localhost:8073 (or your Pi's IP)
- **Username**: admin
- **Password**: hackrf

#### Troubleshooting OpenWebRX

```bash
# Check HackRF detection in container
docker exec openwebrx hackrf_info

# Verify SDR configuration
docker exec openwebrx cat /var/lib/openwebrx/sdrs.json

# Test SoapySDR device detection
docker exec openwebrx SoapySDRUtil --find

# Apply HackRF configuration fixes
./apply-hackrf-config.sh

# Complete rebuild if needed
./rebuild-openwebrx-docker.sh
```

#### Backup and Restore

```bash
# The installer includes a working OpenWebRX backup
# Restore if container becomes corrupted:
./load-openwebrx-backup.sh

# Create new backup after customization:
docker save openwebrx:latest > openwebrx-custom-backup.tar.gz
```

### Debug Mode

Start components with debug logging:

```bash
./dev/tools/component-manager.sh start wigletotak debug
```

### Performance Issues

Analyze component performance:

```bash
./dev/tools/component-manager.sh performance hackrf 180
```

## Integration with External Systems

### Hardware Requirements

**All hardware is automatically detected and configured by `install.sh`:**

- **HackRF One**: USB SDR device for spectrum analysis (ID: 1d50:6089)
- **GPS Device**: Serial GPS for location services (USB or UART)
- **WiFi Adapter**: For Kismet monitoring (monitor mode capable preferred)

### Service Dependencies

**All dependencies are automatically installed by `install.sh`:**

- **Docker**: For OpenWebRX containers (automatically installed)
- **Kismet**: WiFi scanning framework (installed from official repository)
- **GPSD**: GPS daemon (automatically installed and configured)
- **HackRF Tools**: Native HackRF support (libhackrf-dev, hackrf)
- **System Dependencies**: Build tools, Python 3, development headers
- **Python Virtual Environments**: Isolated environments for each component

### Network Services

Development services run on:

- **2501**: Kismet API
- **6969**: WigleToTAK web interface
- **8073**: OpenWebRX web interface (with native HackRF support)
- **8092**: HackRF Spectrum Analyzer web interface
- **2947**: GPSD service
- **5000**: Webhook service
- **14550**: MAVProxy connection for GPS bridge

## Contributing to Development

### Adding New Components

1. **Create component script** in `dev/components/`
2. **Add to main launcher** (`dev.sh`)
3. **Create tests** in `dev/test/`
4. **Update hot reload monitoring**
5. **Add health checks**
6. **Update integration tests** with new component validation
7. **Add configuration templates** if needed
8. **Update installer** if system dependencies required

### Extending Testing

1. **Add test functions** to appropriate test files
2. **Update test runners** to include new test categories
3. **Document test coverage** in this guide
4. **Add integration test scenarios** for new components
5. **Update validation scripts** to check new dependencies
6. **Add hardware tests** for new devices or interfaces

### Improving Hot Reload

1. **Extend file pattern matching** for new file types
2. **Add component-specific restart logic** for new services
3. **Improve debouncing algorithms** for better performance
4. **Add configuration options** for customization

### Installation Integration

#### Adding Dependencies to Installer

When adding new components that require system dependencies:

1. **Update `install.sh`**:

   ```bash
   # Add to install_system_deps() function
   sudo apt install -y new-package
   ```

2. **Update health checks**:

   ```bash
   # Add to dev/tools/health-check.sh
   if command -v new-tool >/dev/null 2>&1; then
       echo "✓ New tool is installed"
   fi
   ```

3. **Update integration tests**:
   ```bash
   # Add to dev/test/run-integration-tests.sh
   if command -v new-tool >/dev/null 2>&1; then
       test_pass "New tool is installed"
   fi
   ```

#### Configuration Template System

New components should use the configuration template system:

1. **Create template** in `config/templates/`
2. **Add example** in `config/examples/`
3. **Update `setup-configs.sh`** to process new templates
4. **Add validation** in `dev/tools/validate-config.sh`

#### Docker Integration

For new Docker-based components:

1. **Add to `docker-compose.yml`** or create separate compose file
2. **Include health checks** in container definition
3. **Add management scripts** following OpenWebRX pattern
4. **Update development wrappers** in `dev/components/`

This development environment provides a complete, self-contained workflow for Stinkster development
with advanced tooling, monitoring, and automation capabilities.

# Stinkster Development Environment Guide

This guide covers the comprehensive development workflow for the Stinkster project, allowing you to work entirely within the project folder with advanced development tools, testing, and hot-reload capabilities.

## Quick Start

```bash
# Set up development environment
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

The development environment uses the project's configuration system with development overrides:

```python
# config.py provides centralized configuration
from config import config

# Access configuration values
kismet_url = config.kismet_api_url
tak_server = config.tak_server_ip
gps_host = config.gpsd_host
```

Environment variables override default values:
- `KISMET_API_URL`
- `TAK_SERVER_IP`
- `GPSD_HOST`
- `NETWORK_INTERFACE`
- `LOG_LEVEL`

## Hot Reload Development

The hot reload system monitors source files and automatically restarts components when changes are detected:

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

# Run tests with specific focus
./dev/test/run-integration-tests.sh hardware
./dev/test/run-integration-tests.sh components
```

### Integration Test Coverage

- System dependencies (Python, Docker, etc.)
- Network interface availability
- Hardware detection (HackRF, GPS devices)
- Component startup and health
- Service port availability
- Configuration validation
- Docker container functionality

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

Always start by setting up the development environment:

```bash
./dev.sh setup
```

This creates:
- Python virtual environment
- Development directory structure
- Component wrapper scripts
- Test infrastructure

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

## Troubleshooting

### Common Issues

1. **Components won't start**
   ```bash
   # Check system dependencies
   ./dev/tools/health-check.sh system
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
   ```

4. **Hot reload not working**
   ```bash
   # Install inotify-tools
   sudo apt-get install inotify-tools
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

- **HackRF**: USB SDR device for spectrum analysis
- **GPS Device**: Serial GPS for location services
- **WiFi Adapter**: For Kismet monitoring (preferably monitor mode capable)

### Service Dependencies

- **Docker**: For OpenWebRX containers
- **Kismet**: WiFi scanning framework
- **GPSD**: GPS daemon

### Network Services

Development services run on:
- **2501**: Kismet API
- **6969**: WigleToTAK web interface
- **8073**: OpenWebRX web interface
- **2947**: GPSD service
- **5000**: Webhook service

## Contributing to Development

### Adding New Components

1. Create component script in `dev/components/`
2. Add component to main launcher (`dev.sh`)
3. Create tests in `dev/test/`
4. Update hot reload monitoring
5. Add health checks

### Extending Testing

1. Add test functions to appropriate test files
2. Update test runners
3. Document test coverage
4. Add integration test scenarios

### Improving Hot Reload

1. Extend file pattern matching
2. Add component-specific restart logic
3. Improve debouncing algorithms
4. Add configuration options

This development environment provides a complete, self-contained workflow for Stinkster development with advanced tooling, monitoring, and automation capabilities.
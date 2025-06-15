# Stinkster Development Environment

This directory contains development tools and scripts for working with the Stinkster project entirely within the project folder.

## Prerequisites

Before using the development environment, ensure you have run the automated installer:

```bash
# From project root - installs all dependencies automatically
./install.sh
```

The installer sets up:
- System dependencies (Docker, Kismet, GPSD, HackRF tools)
- Python virtual environments
- OpenWebRX with native HackRF support
- Development tools and testing infrastructure

## Quick Start

```bash
# Start all services in development mode
./dev.sh start

# Run individual components
./dev/components/gpsmav.sh
./dev/components/hackrf.sh
./dev/components/wigletotak.sh
./dev/components/kismet.sh
./dev/components/openwebrx.sh

# Run tests
./dev/test/run-all-tests.sh
./dev/test/test-gpsmav.sh
./dev/test/run-integration-tests.sh
```

## Development Commands

- `dev.sh` - Main development launcher
- `dev/setup.sh` - Setup development environment
- `dev/test/` - Testing scripts
- `dev/components/` - Component wrapper scripts
- `dev/tools/` - Development utilities
- `dev/hot-reload/` - Hot reload system

## Features

- **Automated Installation**: Complete system setup with single command
- **Isolated Development Environment**: Work entirely within project folder
- **Hot Reload**: Automatic restart on code changes for Python components
- **Comprehensive Testing**: Unit and integration tests with hardware validation
- **Component Health Monitoring**: Real-time status and performance monitoring
- **Service Orchestration**: Coordinated startup/shutdown of all components
- **Real-time Log Monitoring**: Centralized logging with filtering and analysis
- **Docker Integration**: Automated container management for OpenWebRX
- **Hardware Validation**: Automatic detection and configuration of HackRF/GPS devices
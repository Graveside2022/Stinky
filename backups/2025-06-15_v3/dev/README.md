# Stinkster Development Environment

This directory contains development tools and scripts for working with the Stinkster project entirely within the project folder.

## Quick Start

```bash
# Start all services in development mode
./dev.sh

# Run individual components
./dev/components/gpsmav.sh
./dev/components/hackrf.sh
./dev/components/wigletotak.sh
./dev/components/kismet.sh

# Run tests
./dev/test/run-all-tests.sh
./dev/test/test-gpsmav.sh
./dev/test/test-hackrf.sh
```

## Development Commands

- `dev.sh` - Main development launcher
- `dev/setup.sh` - Setup development environment
- `dev/test/` - Testing scripts
- `dev/components/` - Component wrapper scripts
- `dev/tools/` - Development utilities
- `dev/hot-reload/` - Hot reload system

## Features

- Isolated development environment
- Hot reload for Python components
- Comprehensive testing suite
- Component health monitoring
- Automated service orchestration
- Real-time log monitoring
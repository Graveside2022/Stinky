# Changelog

All notable changes to the Stinkster Malone project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-21

### Added
- Comprehensive API documentation (API_DOCUMENTATION.md)
- Deployment guide (DEPLOYMENT.md) 
- CHANGELOG.md for tracking project changes
- Mobile-optimized UI with responsive design
- Tailwind CSS integration
- Enhanced CORS configuration for better cross-origin support
- WebSocket API for real-time spectrum and Kismet data
- Proxy endpoints for Kismet and WigleToTak integration
- Smart restart and stop scripts for service management
- IP detection debug endpoints
- Script execution tracking with process management
- Kismet iframe integration with proper path handling

### Changed
- Migrated from inline styles to Tailwind CSS
- Improved error handling and logging across all services
- Enhanced service status detection with readiness checks
- Updated Node.js dependencies for security
- Refactored server.js for better modularity
- Improved GPS and network reset procedures in stop scripts

### Fixed
- Kismet iframe loading issues with base tag injection
- CORS headers for all proxy endpoints
- Network interface reset on service stop
- Tailscale reconnection after service restart
- Mobile UI tab visibility and interaction
- Process cleanup for detached scripts

### Security
- Added helmet.js with custom configuration
- Implemented script whitelist for execution
- Added process isolation for script execution
- Enhanced error messages to prevent information leakage

## [1.5.0] - 2025-01-20

### Added
- Kismet Operations Center web interface
- Real-time spectrum analyzer integration
- HackRF SDR support
- OpenWebRX Docker integration
- WigleToTAK v2 with antenna sensitivity compensation

### Changed
- Restructured project directory layout
- Improved orchestration scripts
- Enhanced logging and debugging capabilities

### Fixed
- GPS MAVLink bridge connection issues
- Kismet authentication problems
- WiFi adapter monitor mode switching

## [1.0.0] - 2025-01-15

### Added
- Initial release
- Basic Kismet integration
- GPS support via GPSD
- WigleToTAK conversion
- TAK server broadcasting
- Service orchestration scripts

### Known Issues
- Mobile UI needs optimization
- Some services require manual restart on failure
- Limited error recovery in orchestration scripts

## Roadmap

### Planned for Next Release
- [ ] Authentication system for API endpoints
- [ ] Rate limiting for API requests  
- [ ] Automated backup system
- [ ] Service health monitoring dashboard
- [ ] Docker containerization for all services
- [ ] Improved error recovery and resilience
- [ ] Real-time signal classification
- [ ] Historical data visualization
- [ ] Multi-user support
- [ ] Plugin architecture for extensions
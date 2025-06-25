# Stinkster Architecture Documentation

This directory contains comprehensive architectural documentation for the Stinkster tactical intelligence platform, organized in a hierarchical structure from high-level system overview to detailed component implementation.

## Architecture Hierarchy

### 📋 [Level 1: System Overview](./system-overview.md)
High-level system architecture showing major subsystems and their relationships
- System-level data flows and integration points
- External interfaces and dependencies  
- Security boundaries and trust zones
- Performance and scalability characteristics

### 🔧 [Level 2: Subsystem Architecture](./subsystems/README.md)
Detailed architectural views of major functional subsystems
- [GPS Subsystem](./subsystems/gps-subsystem.md) - Location services and geospatial data
- [WiFi Subsystem](./subsystems/wifi-subsystem.md) - Wireless intelligence gathering
- [SDR Subsystem](./subsystems/sdr-subsystem.md) - Software-defined radio operations
- [TAK Subsystem](./subsystems/tak-subsystem.md) - Team Awareness Kit integration
- [Web Subsystem](./subsystems/web-subsystem.md) - Unified web interfaces

### ⚙️ [Level 3: Component Details](./components/README.md)  
Implementation-level component architecture and design patterns
- [Spectrum Analyzer Component](./components/spectrum-analyzer.md) - Real-time FFT processing
- [Service Orchestration](./components/service-orchestration.md) - Process lifecycle management
- [Configuration Management](./components/configuration-management.md) - Template-based configuration
- Critical component internal architecture and data flows

### 🔗 [Integration Overview](./integration-overview.md)
Cross-system integration patterns and operational dependencies
- Event-driven architecture and communication patterns
- Security integration and authentication flows
- Performance optimization and resource management
- Error handling and recovery strategies

## Legacy Wire Diagrams

### 📊 Wire Diagrams (Legacy)
- [Core System Flows](wire-diagrams/core-flows/) - Primary data and signal paths through the system
- [Component Details](wire-diagrams/component-details/) - Individual component wiring and interfaces
- [Integration Patterns](wire-diagrams/integration-patterns/) - How components connect and communicate
- [Documentation Standards](wire-diagrams/legend.md) - Symbols, colors, and conventions

### 🔧 Legacy Component Diagrams
- [HackRF SDR](wire-diagrams/component-details/hackrf-sdr.md) - Software Defined Radio operations
- [Kismet WiFi](wire-diagrams/component-details/kismet-wifi.md) - Network scanning and monitoring
- [GPS Integration](wire-diagrams/component-details/gps-integration.md) - Location services and MAVLink bridge
- [TAK Integration](wire-diagrams/component-details/tak-integration.md) - Team Awareness Kit connectivity
- [OpenWebRX](wire-diagrams/component-details/openwebrx.md) - Web-based SDR interface

### 🌐 Legacy System Flows
- [GPS → Kismet → TAK Pipeline](wire-diagrams/core-flows/gps-kismet-tak-flow.md) - Primary operational flow
- [SDR Signal Processing](wire-diagrams/core-flows/sdr-signal-flow.md) - RF signal handling
- [Data Collection Pipeline](wire-diagrams/core-flows/data-collection-flow.md) - How data flows through the system
- [Service Orchestration](wire-diagrams/core-flows/service-orchestration.md) - Process management and coordination

### 🔗 Legacy Integration Patterns
- [Port Mapping](wire-diagrams/integration-patterns/port-mapping.md) - Network ports and services
- [File System Integration](wire-diagrams/integration-patterns/filesystem-integration.md) - Data file flows
- [Process Communication](wire-diagrams/integration-patterns/process-communication.md) - IPC and service coordination
- [Docker Integration](wire-diagrams/integration-patterns/docker-integration.md) - Container networking

## Quick Reference

### System Overview
The Stinkster system combines multiple RF and networking technologies:
- **RF Processing**: HackRF SDR + OpenWebRX for spectrum analysis
- **Network Intelligence**: Kismet for WiFi scanning and device tracking
- **Location Services**: GPS/MAVLink integration via GPSD
- **Tactical Integration**: WigleToTAK for military/tactical applications

### Key Integration Points
1. **GPS Flow**: MAVLink → mavgps.py → GPSD (port 2947) → Kismet
2. **WiFi Data**: Kismet → .wiglecsv → WigleToTAK → TAK server
3. **SDR Operations**: HackRF → OpenWebRX (Docker) → Web interface
4. **Service Management**: Orchestration scripts coordinate all processes

### Documentation Standards
All wire diagrams use standardized:
- **Colors**: Consistent scheme for data types (GPS=blue, WiFi=green, RF=red)
- **Symbols**: Standard electronics and networking symbols
- **Formats**: Mermaid diagrams with embedded documentation
- **Cross-references**: Linked navigation between related diagrams

For detailed symbol definitions and color schemes, see [Documentation Legend](wire-diagrams/legend.md).
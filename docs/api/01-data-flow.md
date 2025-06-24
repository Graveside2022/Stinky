# Level 1 Data Flow Diagram - Stinkster System

This document provides a detailed analysis of data movement through the Stinkster system, showing how GPS data, WiFi scan data, SDR data, and control signals flow between components with specific transformations, protocols, and storage mechanisms.

## Overview

The Stinkster system processes three primary data streams:
1. **GPS Data Flow**: MAVLink → mavgps.py → GPSD → Kismet
2. **WiFi Data Flow**: WiFi adapter → Kismet → .wiglecsv → WigleToTAK → TAK
3. **SDR Data Flow**: HackRF → OpenWebRX → Spectrum Analyzer → Web interface

## 1. GPS Data Flow (Real-time Location Services)

```mermaid
flowchart TD
    subgraph "GPS Data Chain"
        A[MAVLink Device<br/>ttyUSB0/ttyACM0<br/>Binary MAVLink Protocol] --> B[mavgps.py<br/>Port 14550<br/>MAVLink Bridge]
        B --> C[GPSD Service<br/>Port 2947<br/>JSON/NMEA Protocol]
        C --> D[Kismet GPS Module<br/>Real-time Position]
        C --> E[External GPS Clients<br/>cgps, gpspipe]
    end
    
    subgraph "Data Transformations"
        F[GLOBAL_POSITION_INT<br/>GPS_RAW_INT<br/>Binary Mavlink] --> G[TPV/SKY Reports<br/>JSON Format<br/>GPSD Protocol]
        G --> H[Geographic Coordinates<br/>lat/lon/alt<br/>Kismet Integration]
    end
    
    subgraph "Error Handling"
        I[GPS Device Detection<br/>Auto-baud Detection<br/>4800-115200 bps] --> J[Connection Retry Logic<br/>5 second intervals<br/>Reconnect on failure]
        J --> K[Fallback Mode<br/>Continue without GPS<br/>Log warnings]
    end
    
    A -.-> F
    B -.-> G
    C -.-> H
    
    style A fill:#e1f5fe
    style C fill:#f3e5f5
    style D fill:#e8f5e8
```

### GPS Data Format Transformations

1. **MAVLink to GPSD Conversion** (mavgps.py):
   - Input: Binary MAVLink messages (GLOBAL_POSITION_INT, GPS_RAW_INT)
   - Output: JSON GPSD protocol (TPV, SKY, VERSION messages)
   - Frequency: Real-time, ~10Hz updates
   - Error handling: Automatic reconnection, signal validation

2. **GPSD to Kismet Integration**:
   - Protocol: JSON over TCP (port 2947)
   - Data: lat/lon coordinates, altitude, speed, timestamp
   - Validation: Fix type checking, accuracy validation

## 2. WiFi Data Flow (Wireless Network Scanning)

```mermaid
flowchart TD
    subgraph "WiFi Scanning Pipeline"
        A[WiFi Adapter wlan2<br/>Monitor Mode<br/>Raw 802.11 Frames] --> B[Kismet Scanner<br/>Real-time Processing<br/>Channel Hopping 5/sec]
        B --> C[Kismet Database<br/>.kismet Files<br/>SQLite Format]
        B --> D[WigleCSV Export<br/>.wiglecsv Files<br/>CSV Format]
        D --> E[WigleToTAK Processor<br/>Real-time/Batch Mode<br/>Flask Web Interface]
        E --> F[TAK CoT Messages<br/>XML Format<br/>UDP Multicast]
        F --> G[TAK Server/Clients<br/>Tactical Awareness<br/>Map Visualization]
    end
    
    subgraph "Data Transformations"
        H[802.11 Beacon/Probe<br/>Binary Frames<br/>Channel Data] --> I[WiFi Network Records<br/>SSID, MAC, RSSI<br/>GPS Coordinates]
        I --> J[WigleCSV Format<br/>MAC,SSID,AuthMode,FirstSeen<br/>Channel,RSSI,Lat,Lon,Alt]
        J --> K[TAK CoT XML<br/>Ellipse Shapes<br/>Color-coded Icons]
    end
    
    subgraph "Configuration & Control"
        L[Kismet Config<br/>~/.kismet/kismet_site.conf<br/>Source & GPS Settings] --> B
        M[WigleToTAK Config<br/>JSON Configuration<br/>TAK Server Settings] --> E
        N[Interface Management<br/>Monitor Mode Setup<br/>Channel Configuration] --> A
    end
    
    A -.-> H
    B -.-> I
    D -.-> J
    E -.-> K
    
    style A fill:#ffebee
    style D fill:#fff3e0
    style F fill:#e8f5e8
```

### WiFi Data Format Transformations

1. **802.11 Frame Processing** (Kismet):
   - Input: Raw wireless frames in monitor mode
   - Processing: SSID extraction, signal strength measurement, GPS tagging
   - Output: Structured database records with location data
   - Frequency: Real-time, 5 channels/second hop rate

2. **WigleCSV Generation**:
   ```csv
   MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
   ```
   - GPS coordinates attached to each WiFi detection
   - Real-time file updates or batch processing mode

3. **TAK CoT XML Generation** (WigleToTAK):
   - Input: CSV records with WiFi + GPS data
   - Output: XML Cursor-on-Target messages with ellipse shapes
   - Features: Color coding, antenna sensitivity adjustment, filtering
   - Delivery: UDP multicast (239.2.3.1:6969) or direct TAK server

## 3. SDR Data Flow (Software Defined Radio)

```mermaid
flowchart TD
    subgraph "SDR Processing Chain"
        A[HackRF One<br/>USB Interface<br/>Raw IQ Samples] --> B[OpenWebRX Container<br/>Docker Environment<br/>SoapySDR/Native Driver]
        B --> C[DSP Processing<br/>FFT Computation<br/>Waterfall Generation]
        C --> D[WebSocket Interface<br/>Port 8073<br/>Binary FFT Data]
        D --> E[Spectrum Analyzer<br/>Python Flask App<br/>Real-time Analysis]
        E --> F[Web Interface<br/>Port 8092<br/>Interactive Charts]
    end
    
    subgraph "Data Transformations"
        G[IQ Samples<br/>Complex Float32<br/>2.4 MHz Sample Rate] --> H[FFT Bins<br/>Power Spectrum<br/>dBm Values]
        H --> I[Waterfall Data<br/>UInt8/Float32<br/>Compressed Format]
        I --> J[Signal Detection<br/>Peak Analysis<br/>Frequency/Power Pairs]
    end
    
    subgraph "Configuration Management"
        K[SDR Configuration<br/>sdrs.json<br/>HackRF Parameters] --> B
        L[Band Profiles<br/>VHF/UHF/ISM<br/>Frequency Ranges] --> E
        M[Gain Settings<br/>VGA/LNA/AMP<br/>RF Parameters] --> A
    end
    
    subgraph "Web Integration"
        N[OpenWebRX Web UI<br/>Port 8073<br/>Traditional SDR Interface] --> B
        O[Spectrum Analyzer UI<br/>Port 8092<br/>Signal Detection Focus] --> E
    end
    
    A -.-> G
    C -.-> H
    D -.-> I
    E -.-> J
    
    style A fill:#e3f2fd
    style C fill:#f1f8e9
    style F fill:#fce4ec
```

### SDR Data Format Transformations

1. **IQ Sample Processing** (OpenWebRX):
   - Input: Raw IQ samples from HackRF (complex float32)
   - Processing: FFT computation, power spectrum calculation
   - Output: Binary waterfall data via WebSocket
   - Sample Rate: 2.4 MHz default, configurable

2. **FFT Data Analysis** (Spectrum Analyzer):
   - Input: Binary FFT data from OpenWebRX WebSocket
   - Processing: Peak detection, signal identification
   - Output: Frequency/power pairs with confidence levels
   - Real-time: Signal detection and threshold analysis

3. **Web Interface Integration**:
   - OpenWebRX: Traditional SDR waterfall interface (port 8073)
   - Spectrum Analyzer: Signal detection focus (port 8092)
   - Data sharing: WebSocket protocol for real-time updates

## 4. Service Orchestration & Control Flow

```mermaid
flowchart TD
    subgraph "Service Management"
        A[gps_kismet_wigle.sh<br/>Main Orchestration<br/>Process Coordinator] --> B[GPS Service Chain<br/>mavgps.py → GPSD<br/>Location Services]
        A --> C[WiFi Scanning Chain<br/>Kismet → WigleToTAK<br/>Network Detection]
        A --> D[SDR Processing<br/>OpenWebRX Container<br/>Spectrum Analysis]
    end
    
    subgraph "Process Management"
        E[PID Tracking<br/>gps_kismet_wigle.pids<br/>Process Monitoring] --> F[Health Checking<br/>5-second intervals<br/>Automatic Restart]
        F --> G[Signal Handling<br/>SIGTERM/SIGINT<br/>Clean Shutdown]
        G --> H[Resource Cleanup<br/>Interface Reset<br/>Process Termination]
    end
    
    subgraph "Configuration Flow"
        I[Environment Variables<br/>LOG_DIR, KISMET_DATA_DIR<br/>Runtime Configuration] --> A
        J[Config Templates<br/>JSON/CONF Files<br/>Service Settings] --> K[Active Configuration<br/>Runtime Application<br/>Service Parameters]
        K --> B
        K --> C
        K --> D
    end
    
    subgraph "Logging & Monitoring"
        L[Service Logs<br/>gps_kismet_wigle.log<br/>Centralized Logging] --> M[Component Logs<br/>kismet.log, wigletotak.log<br/>Service-specific Logs]
        M --> N[Debug Information<br/>Process Status<br/>Error Tracking]
    end
    
    A -.-> E
    B -.-> L
    C -.-> L
    D -.-> L
    
    style A fill:#fff9c4
    style E fill:#e8eaf6
    style L fill:#f3e5f5
```

## 5. Configuration & Data Persistence

```mermaid
flowchart LR
    subgraph "Configuration Files"
        A[Template Configs<br/>*.template.json<br/>Default Settings] --> B[Active Configs<br/>Runtime JSON<br/>Service Parameters]
        B --> C[Service Integration<br/>Parameter Loading<br/>Runtime Application]
    end
    
    subgraph "Data Storage"
        D[Kismet Database<br/>.kismet Files<br/>SQLite Format] --> E[WigleCSV Export<br/>.wiglecsv Files<br/>CSV Network Data]
        E --> F[TAK Data Stream<br/>XML CoT Messages<br/>Real-time Broadcast]
    end
    
    subgraph "Log Persistence"
        G[Service Logs<br/>Rotating Logs<br/>Debug Information] --> H[System Logs<br/>systemd/dmesg<br/>System Events]
        H --> I[Backup & Archive<br/>Log Rotation<br/>Historical Data]
    end
    
    style A fill:#e1f5fe
    style D fill:#f3e5f5
    style G fill:#fff3e0
```

## 6. Network & Communication Protocols

### Port Mapping & Network Services
- **2947**: GPSD service (JSON protocol)
- **6969**: WigleToTAK web interface
- **8073**: OpenWebRX web interface
- **8092**: Spectrum analyzer interface
- **14550**: MAVLink TCP connection
- **239.2.3.1:6969**: TAK multicast group

### Data Protocols
1. **MAVLink**: Binary protocol for drone/GPS communication
2. **GPSD JSON**: Standard GPS daemon protocol
3. **IEEE 802.11**: Raw wireless frame capture
4. **TAK CoT XML**: Tactical awareness markup
5. **WebSocket**: Real-time web communication
6. **UDP Multicast**: TAK message distribution

## 7. Error Handling & Fallback Mechanisms

```mermaid
flowchart TD
    subgraph "GPS Error Handling"
        A[Device Detection Failure] --> B[Auto-baud Testing<br/>4800-115200 bps<br/>NMEA Validation]
        B --> C[Connection Retry<br/>5-second intervals<br/>Reconnection Logic]
        C --> D[Fallback Mode<br/>Continue without GPS<br/>Warning Logs]
    end
    
    subgraph "WiFi Error Handling"
        E[Interface Setup Failure] --> F[Monitor Mode Retry<br/>airmon-ng/manual<br/>Interface Recovery]
        F --> G[Kismet Restart<br/>Process Recovery<br/>Configuration Reload]
        G --> H[Service Continuation<br/>Degraded Mode<br/>No WiFi Scanning]
    end
    
    subgraph "SDR Error Handling"
        I[HackRF Detection Failure] --> J[Driver Fallback<br/>SoapySDR→Native<br/>Configuration Switch]
        J --> K[Container Restart<br/>Docker Recovery<br/>Service Reload]
        K --> L[Demo Mode<br/>Simulated Data<br/>Testing Interface]
    end
    
    style A fill:#ffebee
    style E fill:#ffebee
    style I fill:#ffebee
    style D fill:#e8f5e8
    style H fill:#e8f5e8
    style L fill:#e8f5e8
```

## 8. Real-time vs Batch Processing

### Real-time Data Flows
- **GPS Updates**: 10Hz position updates from MAVLink to GPSD
- **WiFi Scanning**: Continuous channel hopping, immediate detection
- **SDR Processing**: Live FFT computation and spectrum display
- **TAK Broadcasting**: Immediate CoT message transmission

### Batch Processing
- **WigleCSV Generation**: File-based WiFi data export
- **Post-collection Analysis**: Historical WiFi scan processing
- **Log Aggregation**: Periodic log file rotation and archival
- **Configuration Updates**: Template-based config generation

## Summary

The Stinkster system implements a sophisticated data flow architecture that:

1. **Integrates Multiple Data Sources**: GPS, WiFi, and SDR data streams
2. **Provides Real-time Processing**: Live updates with sub-second latency
3. **Implements Robust Error Handling**: Fallback modes and automatic recovery
4. **Maintains Data Persistence**: Configuration templates and log archives
5. **Supports Multiple Interfaces**: Web UIs, APIs, and direct data access
6. **Enables Tactical Integration**: TAK-compatible output for military/emergency use

The modular design allows each component to operate independently while maintaining tight integration for coordinated operation across GPS tracking, wireless network scanning, and radio frequency analysis capabilities.
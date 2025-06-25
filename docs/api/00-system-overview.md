# Level 0: Stinkster System Overview

## System Architecture Diagram

```mermaid
C4Context
    title Stinkster System - Complete Architecture Overview

    Person(operator, "Operator", "System operator monitoring WiFi/GPS/SDR")
    
    System_Boundary(stinkster, "Stinkster System") {
        Container(orchestration, "Orchestration Layer", "Bash Scripts", "Main service coordination and process management")
        
        Container_Boundary(sdr_subsystem, "SDR Subsystem") {
            Container(openwebrx, "OpenWebRX", "Docker/Web", "Web-based SDR receiver")
            Container(spectrum, "Spectrum Analyzer", "Python/Flask", "Real-time spectrum analysis")
        }
        
        Container_Boundary(gps_subsystem, "GPS Subsystem") {
            Container(mavbridge, "MAVLink Bridge", "Python", "Converts MAVLink to GPSD")
            Container(gpsd, "GPSD Service", "System Service", "GPS daemon providing location data")
        }
        
        Container_Boundary(wifi_subsystem, "WiFi Subsystem") {
            Container(kismet, "Kismet", "C++/Service", "WiFi scanning and packet capture")
            Container(wigletak, "WigleToTAK", "Python/Flask", "Converts WiFi data to TAK format")
        }
        
        Container_Boundary(web_layer, "Web Interface Layer") {
            Container(landing, "Landing Page", "Python/Flask", "Main dashboard")
            Container(webhooks, "Webhook Service", "Python/Flask", "Integration endpoints")
        }
    }
    
    System_Ext(tak_server, "TAK Server", "Team Awareness Kit server for tactical mapping")
    System_Ext(gps_device, "GPS Device", "MAVLink GPS or serial GPS device")
    System_Ext(hackrf, "HackRF SDR", "Software Defined Radio hardware")
    System_Ext(wifi_adapter, "WiFi Adapter", "Monitor mode capable wireless interface")
    
    Rel(operator, landing, "Accesses", "HTTP/Web Browser")
    Rel(operator, openwebrx, "Monitors", "HTTP:8073")
    Rel(operator, spectrum, "Analyzes", "HTTP:5000")
    Rel(operator, wigletak, "Views", "HTTP:6969")
    
    Rel(orchestration, sdr_subsystem, "Manages", "Process Control")
    Rel(orchestration, gps_subsystem, "Manages", "Process Control")
    Rel(orchestration, wifi_subsystem, "Manages", "Process Control")
    
    Rel(gps_device, mavbridge, "Provides", "MAVLink/Serial")
    Rel(mavbridge, gpsd, "Feeds", "TCP:2947")
    Rel(gpsd, kismet, "Location Data", "TCP:2947")
    
    Rel(hackrf, openwebrx, "RF Data", "USB")
    Rel(hackrf, spectrum, "RF Data", "USB")
    
    Rel(wifi_adapter, kismet, "802.11 Frames", "Monitor Mode")
    Rel(kismet, wigletak, "WiFi CSV Data", "File System")
    Rel(wigletak, tak_server, "TAK Messages", "TCP:8087")
    
    Rel(webhooks, kismet, "API Calls", "HTTP:2501")
    Rel(webhooks, wigletak, "Control", "HTTP:6969")
```

## Complete System Topology

### Hardware Layer
```mermaid
graph TB
    subgraph "Physical Hardware"
        RPI[Raspberry Pi 4]
        HACKRF[HackRF One SDR]
        GPS[GPS Device/MAVLink]
        WIFI[WiFi Adapter wlan2]
        USB[USB Hub]
    end
    
    RPI ---|USB| HACKRF
    RPI ---|USB/Serial| GPS
    RPI ---|USB| WIFI
    RPI ---|USB| USB
    
    subgraph "Network Interfaces"
        ETH[eth0 - Ethernet]
        WLAN1[wlan1 - Management]
        WLAN2[wlan2 - Monitor Mode]
    end
    
    RPI --- ETH
    RPI --- WLAN1
    RPI --- WLAN2
```

### Service Architecture & Data Flow

```mermaid
graph TB
    subgraph "Hardware Interfaces"
        HACKRF[HackRF SDR<br/>USB Device]
        GPS_HW[GPS Device<br/>/dev/ttyUSB0]
        WIFI_HW[WiFi Adapter<br/>wlan2 Monitor Mode]
    end
    
    subgraph "System Services"
        GPSD[GPSD Daemon<br/>Port 2947]
        DOCKER[Docker Engine]
    end
    
    subgraph "Core Applications"
        MAVBRIDGE[MAVLink Bridge<br/>mavgps.py<br/>venv: /src/gpsmav/venv]
        KISMET[Kismet WiFi Scanner<br/>Port 2501/2502]
        OPENWEBRX[OpenWebRX SDR<br/>Docker Container<br/>Port 8073]
        SPECTRUM[Spectrum Analyzer<br/>spectrum_analyzer.py<br/>venv: /src/hackrf/venv]
        WIGLETAK[WigleToTAK Service<br/>WigleToTak2.py<br/>venv: /src/wigletotak/venv<br/>Port 6969]
    end
    
    subgraph "Web Services"
        LANDING[Landing Page<br/>landing-server.py<br/>Port 8080]
        WEBHOOKS[Webhook Service<br/>webhook.py<br/>Port 5001]
    end
    
    subgraph "Orchestration"
        ORCH[Main Orchestrator<br/>gps_kismet_wigle.sh<br/>PID Management]
    end
    
    subgraph "External Systems"
        TAK[TAK Server<br/>Port 8087]
        BROWSER[Web Browser]
    end
    
    %% Hardware to Services
    GPS_HW -->|Serial/MAVLink| MAVBRIDGE
    HACKRF -->|USB| OPENWEBRX
    HACKRF -->|USB| SPECTRUM
    WIFI_HW -->|Monitor Mode| KISMET
    
    %% Service Dependencies
    MAVBRIDGE -->|GPS Data| GPSD
    GPSD -->|Location Feed| KISMET
    DOCKER -->|Container| OPENWEBRX
    
    %% Data Flow
    KISMET -->|WiFi CSV Files| WIGLETAK
    WIGLETAK -->|TAK Messages| TAK
    
    %% Web Access
    BROWSER -->|HTTP:8080| LANDING
    BROWSER -->|HTTP:8073| OPENWEBRX
    BROWSER -->|HTTP:5000| SPECTRUM
    BROWSER -->|HTTP:6969| WIGLETAK
    BROWSER -->|HTTP:5001| WEBHOOKS
    
    %% Process Management
    ORCH -->|Start/Stop/Monitor| MAVBRIDGE
    ORCH -->|Start/Stop/Monitor| KISMET
    ORCH -->|Start/Stop/Monitor| WIGLETAK
    ORCH -->|Control| OPENWEBRX
    
    %% API Integration
    WEBHOOKS -->|HTTP API| KISMET
    WEBHOOKS -->|Control API| WIGLETAK
```

### Service Communication Matrix

| Service | Listens On | Connects To | Protocol | Purpose |
|---------|------------|-------------|----------|---------|
| **GPSD** | :2947 | GPS Device | TCP/Serial | GPS data distribution |
| **MAVLink Bridge** | - | /dev/ttyUSB0, :2947 | Serial/TCP | GPS protocol conversion |
| **Kismet** | :2501, :2502 | :2947, wlan2 | HTTP/TCP/802.11 | WiFi scanning + GPS |
| **WigleToTAK** | :6969 | Kismet files, TAK Server | HTTP/TCP | WiFi to TAK conversion |
| **OpenWebRX** | :8073 | HackRF | HTTP/USB | Web SDR interface |
| **Spectrum Analyzer** | :5000 | HackRF | HTTP/USB | Real-time spectrum |
| **Landing Page** | :8080 | - | HTTP | Main dashboard |
| **Webhooks** | :5001 | :2501, :6969 | HTTP | API integration |

### Physical and Logical Boundaries

```mermaid
graph TB
    subgraph "Physical Boundary - Raspberry Pi"
        subgraph "Docker Boundary"
            OPENWEBRX_C[OpenWebRX Container]
        end
        
        subgraph "Python Virtual Environments"
            GPSMAV_VENV[GPSmav venv<br/>/src/gpsmav/venv]
            HACKRF_VENV[HackRF venv<br/>/src/hackrf/venv]
            WIGLE_VENV[WigleToTAK venv<br/>/src/wigletotak/venv]
        end
        
        subgraph "System Services"
            GPSD_SYS[GPSD System Service]
            KISMET_SYS[Kismet System Process]
        end
        
        subgraph "File System Boundaries"
            CONFIG_FS[Configuration Files<br/>*.json, *.conf, .env]
            LOG_FS[Log Directory<br/>/home/pi/tmp/]
            DATA_FS[Data Directory<br/>/home/pi/kismet_ops/]
            SRC_FS[Source Code<br/>/home/pi/projects/stinkster/src/]
        end
    end
    
    subgraph "Network Boundary"
        EXT_TAK[External TAK Server]
        EXT_WEB[External Web Clients]
    end
    
    subgraph "Hardware Boundary"
        EXT_GPS[External GPS Device]
        EXT_HACKRF[External HackRF]
        EXT_WIFI[External WiFi Signals]
    end
```

### Service Dependencies & Startup Order

```mermaid
graph TD
    START[System Boot] --> HARDWARE[Hardware Detection]
    HARDWARE --> GPSD_START[Start GPSD]
    HARDWARE --> DOCKER_START[Start Docker]
    
    GPSD_START --> MAVBRIDGE_START[Start MAVLink Bridge]
    MAVBRIDGE_START --> KISMET_START[Start Kismet]
    KISMET_START --> WIGLETAK_START[Start WigleToTAK]
    
    DOCKER_START --> OPENWEBRX_START[Start OpenWebRX Container]
    
    subgraph "Independent Services"
        SPECTRUM_START[Spectrum Analyzer<br/>On-Demand]
        WEBHOOK_START[Webhook Service<br/>On-Demand]
        LANDING_START[Landing Page<br/>On-Demand]
    end
    
    subgraph "Orchestration Control"
        ORCH_MONITOR[Orchestrator Monitoring<br/>PID Tracking<br/>Health Checks<br/>Auto-Restart]
    end
    
    WIGLETAK_START --> ORCH_MONITOR
    OPENWEBRX_START --> ORCH_MONITOR
```

## Key Integration Points

### 1. GPS Data Flow
```
MAVLink Device → mavgps.py → GPSD (port 2947) → Kismet → WigleToTAK → TAK Server
```

### 2. WiFi Scanning Pipeline
```
WiFi Signals → wlan2 (monitor) → Kismet → .wiglecsv files → WigleToTAK → TAK Messages
```

### 3. SDR Operations
```
RF Spectrum → HackRF → [OpenWebRX Container | Spectrum Analyzer] → Web Interface
```

### 4. Service Orchestration
```
gps_kismet_wigle.sh → Process Management → PID Tracking → Health Monitoring → Auto-Restart
```

## External Interfaces

| Interface | Type | Purpose | Access Point |
|-----------|------|---------|--------------|
| **Web Dashboard** | HTTP | Main system control | http://pi-ip:8080 |
| **SDR Receiver** | HTTP | Real-time SDR | http://pi-ip:8073 |
| **Spectrum Analyzer** | HTTP/WebSocket | RF analysis | http://pi-ip:5000 |
| **WigleToTAK Interface** | HTTP | WiFi tracking | http://pi-ip:6969 |
| **TAK Integration** | TCP | Tactical data export | External TAK Server |
| **Kismet API** | HTTP | WiFi data access | http://pi-ip:2501 |
| **GPSD Interface** | TCP | GPS data access | port 2947 |

## Configuration Management

The system uses a hierarchical configuration approach:

1. **Environment Variables** (`.env` file) - Sensitive credentials and system paths
2. **JSON Configuration** (`config.json`) - Service-specific settings
3. **Template Files** (`*.template.*`) - Default configurations for deployment
4. **Component Configs** - Individual service configuration files

## System Monitoring & Management

- **Process Management**: PID files in `/home/pi/tmp/`
- **Log Aggregation**: Centralized logging in `/home/pi/tmp/`
- **Health Checks**: Orchestrator monitors all services
- **Auto-Recovery**: Automatic restart on service failure
- **Backup System**: Configuration and data backup capabilities

This system provides a comprehensive SDR, WiFi scanning, and GPS tracking platform with TAK integration, all coordinated through a robust orchestration layer with web-based monitoring and control interfaces.
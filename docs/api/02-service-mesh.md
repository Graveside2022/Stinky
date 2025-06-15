# Level 1 Service Mesh Architecture

This document provides a comprehensive view of the Stinkster service mesh, including all inter-service communication patterns, network protocols, container orchestration, and process dependencies.

## Service Mesh Overview

The Stinkster platform implements a multi-tier service mesh architecture combining containerized services, native system services, and Python microservices with sophisticated orchestration and monitoring capabilities.

### Core Network Architecture

```mermaid
graph TB
    %% External Network Layer
    ExtNet[External Network]
    Internet[Internet/WAN]
    TAKServer[TAK Server<br/>Port 8087]
    
    %% Host Network Layer  
    subgraph "Host Network (bridge)"
        HostIP[Host IP: Raspberry Pi]
        
        %% Physical Interfaces
        subgraph "Network Interfaces"
            WiFiMon[wlan2<br/>Monitor Mode<br/>WiFi Scanning]
            WiFiMgmt[wlan0/eth0<br/>Management]
            USBGPS[USB GPS<br/>/dev/ttyUSB0]
            USBHackRF[USB HackRF<br/>SDR Device]
        end
    end
    
    %% Docker Network Layer
    subgraph "Docker Network: stinkster-net"
        DockerBridge[Docker Bridge<br/>172.18.0.0/16]
        
        %% OpenWebRX Container
        subgraph "OpenWebRX Container (Automated)"
            OpenWebRX[OpenWebRX SDR<br/>Web Interface<br/>admin/hackrf]
            HackRFDriver[Native HackRF Driver<br/>Optimized Performance]
            AutoConfig[Automated Configuration<br/>Pre-configured Profiles]
        end
    end
    
    %% Service Layer
    subgraph "Native Services Layer"
        %% System Services
        subgraph "SystemD Services"
            GPSD[GPSD Daemon<br/>Port 2947<br/>GPS Distribution]
            KismetSvc[Kismet Service<br/>Port 2501<br/>WiFi Scanning]
            HackRFSvc[HackRF Scanner<br/>SystemD Service]
        end
        
        %% Python Microservices
        subgraph "Python Applications"
            GPSmav[GPSmav Bridge<br/>MAVLink → GPSD<br/>Port 14550]
            WigleToTAK[WigleToTAK<br/>Web Dashboard<br/>Port 6969]
            SpectrumAnalyzer[Spectrum Analyzer<br/>Real-time SDR<br/>Port 5000]
            WebhookSvc[Webhook Service<br/>API Integration<br/>Port 5001]
        end
        
        %% Process Orchestration
        subgraph "Orchestration Layer"
            MainOrch[gps_kismet_wigle.sh<br/>Main Orchestrator]
            FastOrch[Fast Startup Variant]
            BgKismet[Background Kismet]
            DevOrch[Development Tools]
        end
    end
    
    %% Service Connections
    Internet -.-> TAKServer
    TAKServer -.-> WigleToTAK
    ExtNet --> HostIP
    
    %% Hardware to Services
    USBGPS --> GPSD
    USBGPS --> GPSmav
    WiFiMon --> KismetSvc
    USBHackRF --> OpenWebRX
    USBHackRF --> SpectrumAnalyzer
    
    %% Docker Network
    HostIP --> DockerBridge
    DockerBridge --> OpenWebRX
    USBHackRF -.-> HackRFDriver
    
    %% Internal Service Communication
    GPSmav --> GPSD
    GPSD --> KismetSvc
    KismetSvc --> WigleToTAK
    MainOrch --> GPSD
    MainOrch --> KismetSvc
    MainOrch --> WigleToTAK
    MainOrch --> GPSmav
    
    %% Port Mappings
    HostIP --> |8073| OpenWebRX
    HostIP --> |6969| WigleToTAK
    HostIP --> |5000| SpectrumAnalyzer
    HostIP --> |5001| WebhookSvc
    HostIP --> |2947| GPSD
    HostIP --> |2501| KismetSvc
```

## Detailed Service Communication Patterns

### 1. GPS Data Flow Architecture

```mermaid
sequenceDiagram
    participant GPS as USB GPS Device
    participant MAV as GPSmav Bridge
    participant GPSD as GPSD Daemon
    participant Kiss as Kismet Scanner
    participant cgps as cgps Client
    participant Wigle as WigleToTAK
    
    Note over GPS,Wigle: GPS Data Pipeline (Port 2947)
    
    GPS->>MAV: NMEA/MAVLink Data<br/>/dev/ttyUSB0 @ 57600
    MAV->>GPSD: GPS Data Injection<br/>localhost:2947
    
    GPSD->>Kiss: Location Data<br/>TCP:2947 (auto-reconnect)
    GPSD->>cgps: Live GPS Display<br/>TCP:2947
    GPSD->>Wigle: Location Services<br/>TCP:2947 (timeout: 5s)
    
    Kiss->>Wigle: WiFi Data + GPS<br/>.wiglecsv files
    Wigle->>TAKServer: CoT Messages<br/>TCP:8087
    
    Note over GPS,Wigle: Automatic retry and reconnection logic
```

### 2. Container Orchestration & Networking

```mermaid
graph TB
    %% Docker Compose Network
    subgraph "Docker Compose: stinkster-net"
        DCNetwork[Bridge Network<br/>172.18.0.0/16]
        
        %% OpenWebRX Container Details
        subgraph "openwebrx-hackrf Container"
            WebRXApp[OpenWebRX Application<br/>Port 8073 Internal]
            SDRConfig[SDR Configuration<br/>/var/lib/openwebrx]
            HackRFNative[Native HackRF Driver<br/>Type: hackrf]
            
            %% Volume Mounts
            subgraph "Volume Mounts"
                USBVol[USB Devices<br/>/dev/bus/usb]
                SettingsVol[openwebrx-settings<br/>Persistent Config]
                ConfigVol[openwebrx-config<br/>Runtime Config]
            end
        end
    end
    
    %% Host Integration
    subgraph "Host System"
        DockerDaemon[Docker Daemon]
        HostUSB[Host USB Subsystem]
        HostNetwork[Host Network Stack]
        
        %% Physical Hardware
        HackRFHW[HackRF Hardware<br/>USB Connected]
    end
    
    %% External Access
    subgraph "External Access"
        WebClients[Web Browsers<br/>Port 8073]
        APIs[REST APIs<br/>Admin Interface]
    end
    
    %% Connections
    HackRFHW --> HostUSB
    HostUSB --> USBVol
    USBVol --> HackRFNative
    HackRFNative --> WebRXApp
    
    HostNetwork --> |Port 8073| DCNetwork
    DCNetwork --> WebRXApp
    WebClients --> |HTTP/WebSocket| WebRXApp
    
    %% Resource Limits
    WebRXApp -.-> |CPU: 2.0/0.5| DockerDaemon
    WebRXApp -.-> |Memory: 1G/512M| DockerDaemon
```

### 3. Process Startup Dependencies & Health Monitoring

```mermaid
stateDiagram-v2
    [*] --> SystemBoot
    
    SystemBoot --> GPSDetection: Auto-detect GPS devices
    GPSDetection --> GPSDStart: Configure /dev/ttyUSB0
    
    state GPSDStart {
        [*] --> StopExisting
        StopExisting --> StartSocket: systemctl stop gpsd
        StartSocket --> StartService: systemctl start gpsd.socket
        StartService --> VerifyGPSD: systemctl start gpsd
        VerifyGPSD --> GPSDReady: gpspipe -w -n 1
    }
    
    GPSDReady --> GPSmavStart: If MAVLink source
    GPSmavStart --> cgpsStart: Background GPS display
    
    cgpsStart --> KismetPrep: Delay 5-15s
    
    state KismetPrep {
        [*] --> InterfaceCheck
        InterfaceCheck --> MonitorMode: wlan2 validation
        MonitorMode --> KismetConfig: Dynamic config generation
        KismetConfig --> KismetLaunch: Background start
    }
    
    KismetLaunch --> KismetReady: PID file created
    KismetReady --> WigleStart: Delay 15s
    
    state WigleStart {
        [*] --> VenvCheck
        VenvCheck --> VenvCreate: If missing
        VenvCreate --> VenvActivate
        VenvActivate --> WigleLaunch: Python process
    }
    
    WigleLaunch --> MonitoringLoop: All services running
    
    state MonitoringLoop {
        [*] --> PIDCheck
        PIDCheck --> ProcessCheck: Every 5s
        ProcessCheck --> HealthCheck: Critical processes
        HealthCheck --> PIDCheck: All healthy
        
        ProcessCheck --> FailureDetected: Process died
        FailureDetected --> Cleanup: Exit orchestrator
        
        HealthCheck --> CriticalFailure: Missing critical process
        CriticalFailure --> Cleanup
    }
    
    Cleanup --> [*]: Graceful shutdown
```

### 4. Inter-Service Communication Protocols

```mermaid
graph TB
    %% Communication Protocol Types
    subgraph "Protocol Categories"
        TCPComm[TCP/IP Communication]
        HTTPComm[HTTP/REST APIs]
        WSComm[WebSocket Streaming]
        FileComm[File-based IPC]
        ProcComm[Process Management]
    end
    
    %% TCP/IP Services
    subgraph "TCP Services"
        GPSD2947[GPSD<br/>Port 2947<br/>JSON Protocol]
        Kismet2501[Kismet<br/>Port 2501<br/>HTTP API/WebSocket]
        MAVProxy[MAVProxy<br/>Port 14550-14552<br/>MAVLink UDP]
        TAKExt[TAK Server<br/>Port 8087<br/>CoT/XML]
    end
    
    %% HTTP Services
    subgraph "HTTP Services"
        WigleHTTP[WigleToTAK<br/>Port 6969<br/>Flask/REST]
        SpectrumHTTP[Spectrum Analyzer<br/>Port 5000<br/>Flask/SocketIO]
        WebhookHTTP[Webhook Service<br/>Port 5001<br/>REST API]
        OpenWebRXHTTP[OpenWebRX<br/>Port 8073<br/>Web Interface]
    end
    
    %% File-based IPC
    subgraph "File Communication"
        WigleCSV[Kismet .wiglecsv<br/>WiFi scan results]
        PIDFiles[PID Files<br/>Process tracking]
        LogFiles[Log Files<br/>Centralized logging]
        ConfigFiles[Dynamic Config<br/>Runtime updates]
    end
    
    %% Communication Flows
    GPSD2947 --> WigleHTTP: GPS coordinates
    GPSD2947 --> Kismet2501: Location data
    Kismet2501 --> WigleCSV: Scan results
    WigleCSV --> WigleHTTP: File parsing
    WigleHTTP --> TAKExt: CoT messages
    
    %% Process Management
    PIDFiles --> ProcComm: Health monitoring
    LogFiles --> ProcComm: Error detection
    
    %% WebSocket Streaming
    SpectrumHTTP --> WSComm: Real-time FFT
    Kismet2501 --> WSComm: Live scanning
```

## Network Port Mappings & Security

### Port Allocation Matrix

| Service | Port | Protocol | Access | Purpose | Security |
|---------|------|----------|--------|---------|----------|
| **GPSD** | 2947 | TCP | Internal | GPS data distribution | Localhost only |
| **Kismet** | 2501 | HTTP/WS | Internal | WiFi scanning API | Admin auth |
| **WigleToTAK** | 6969 | HTTP | External | Web dashboard | Flask session |
| **Spectrum Analyzer** | 5000 | HTTP/WS | External | Real-time SDR | CORS enabled |
| **Webhook Service** | 5001 | HTTP | External | API integration | API key auth |
| **OpenWebRX** | 8073 | HTTP/WS | External | SDR web interface | Admin login |
| **MAVProxy** | 14550-14552 | UDP | Internal | MAVLink distribution | Localhost only |
| **TAK Server** | 8087 | TCP | External | CoT message sink | External service |

### Security Boundaries & Authentication

```mermaid
graph TB
    %% Security Zones
    subgraph "DMZ Zone"
        Internet[Internet Access]
        TAKRemote[Remote TAK Server]
    end
    
    subgraph "Public Services Zone"
        direction TB
        PublicWeb[Public Web Interfaces<br/>Ports: 6969, 5000, 8073]
        APIGateway[Webhook API<br/>Port 5001]
    end
    
    subgraph "Internal Services Zone"
        direction TB
        InternalAPI[Internal APIs<br/>Ports: 2947, 2501]
        ProcessMgmt[Process Management<br/>PID/Log files]
    end
    
    subgraph "Hardware Zone"
        direction TB
        USBDevices[USB Hardware<br/>GPS, HackRF, WiFi]
        NetworkHW[Network Interfaces<br/>wlan2 monitor]
    end
    
    %% Security Controls
    subgraph "Authentication Methods"
        BasicAuth[HTTP Basic Auth<br/>Kismet, OpenWebRX]
        APIKey[API Key Authentication<br/>Webhook service]
        SessionAuth[Flask Sessions<br/>WigleToTAK]
        NoAuth[No Authentication<br/>Internal services]
    end
    
    %% Access Controls
    PublicWeb --> BasicAuth
    PublicWeb --> SessionAuth
    APIGateway --> APIKey
    InternalAPI --> NoAuth
    
    %% Network Access
    Internet -.-> PublicWeb
    Internet -.-> APIGateway
    TAKRemote -.-> Internet
    
    PublicWeb --> InternalAPI
    InternalAPI --> ProcessMgmt
    ProcessMgmt --> USBDevices
    ProcessMgmt --> NetworkHW
```

## Load Balancing & Failover Patterns

### Service Resilience Architecture

```mermaid
graph TB
    %% Orchestration Layer
    subgraph "Orchestration Tier"
        MainScript[gps_kismet_wigle.sh<br/>Primary Orchestrator]
        FastScript[Fast Startup Variant<br/>Development Mode]
        DevTools[Development Tools<br/>Component Manager]
    end
    
    %% Service Monitoring
    subgraph "Health Monitoring"
        PIDMonitor[PID-based Monitoring<br/>5-second intervals]
        ProcessMonitor[Process Name Monitoring<br/>Pattern matching]
        PortMonitor[Port Connectivity<br/>Service verification]
        ResourceMonitor[Resource Usage<br/>Memory/CPU tracking]
    end
    
    %% Failure Detection
    subgraph "Failure Detection"
        ProcessDeath[Process Death<br/>PID validation]
        ServiceUnresponsive[Service Timeout<br/>Connection failures]
        ResourceExhaustion[Resource Limits<br/>Memory/CPU thresholds]
        HealthChecks[Periodic Health<br/>30-second intervals]
    end
    
    %% Recovery Strategies
    subgraph "Recovery Actions"
        GracefulRestart[Graceful Restart<br/>TERM → KILL sequence]
        ServiceReset[Service Reset<br/>SystemD restart]
        FullCleanup[Complete Shutdown<br/>All services stop]
        ManualIntervention[Manual Recovery<br/>Health reports]
    end
    
    %% Monitoring Flows
    MainScript --> PIDMonitor
    PIDMonitor --> ProcessDeath
    ProcessMonitor --> ServiceUnresponsive
    PortMonitor --> ServiceUnresponsive
    ResourceMonitor --> ResourceExhaustion
    
    %% Recovery Flows
    ProcessDeath --> GracefulRestart
    ServiceUnresponsive --> ServiceReset
    ResourceExhaustion --> FullCleanup
    HealthChecks --> ManualIntervention
    
    %% Escalation
    GracefulRestart -.-> |Retry Failed| ServiceReset
    ServiceReset -.-> |Multiple Failures| FullCleanup
```

### Restart and Retry Logic

```mermaid
stateDiagram-v2
    [*] --> ServiceHealthy: Normal operation
    
    ServiceHealthy --> ProcessCheck: Monitor every 5s
    ProcessCheck --> ServiceHealthy: All processes OK
    
    ProcessCheck --> ProcessMissing: PID check failed
    ProcessMissing --> RestartAttempt: Service died
    
    state RestartAttempt {
        [*] --> GracefulStop
        GracefulStop --> TermSignal: SIGTERM
        TermSignal --> WaitGraceful: 2 second timeout
        WaitGraceful --> KillSignal: Still running
        KillSignal --> CleanupPID: SIGKILL
        CleanupPID --> [*]: PID file cleanup
    }
    
    RestartAttempt --> ServiceRestart: Begin restart sequence
    ServiceRestart --> RestartDelay: 10 second delay
    RestartDelay --> ServiceStart: Restart service
    
    ServiceStart --> RestartSuccess: Service started
    RestartSuccess --> ServiceHealthy: Back to monitoring
    
    ServiceStart --> RestartFailed: Start failed
    RestartFailed --> RetryCounter: Check attempts
    
    state RetryCounter {
        [*] --> AttemptCheck
        AttemptCheck --> TryAgain: < 3 attempts
        AttemptCheck --> GiveUp: >= 3 attempts
    }
    
    TryAgain --> ServiceRestart: Increment counter
    GiveUp --> SystemFailure: Escalate failure
    
    SystemFailure --> FullShutdown: Cleanup all services
    FullShutdown --> [*]: System exit
```

## Monitoring and Logging Interconnections

### Centralized Logging Architecture

```mermaid
graph TB
    %% Log Sources
    subgraph "Log Sources"
        OrchLogs[Orchestration Scripts<br/>gps_kismet_wigle.log]
        ServiceLogs[Service-Specific Logs<br/>kismet.log, wigletotak.log]
        SystemLogs[System Logs<br/>SystemD journal]
        AppLogs[Application Logs<br/>Python, Flask apps]
    end
    
    %% Log Aggregation
    subgraph "Log Collection"
        LogDir[Central Log Directory<br/>/home/pi/projects/stinkster/logs]
        PIDTracking[PID File Tracking<br/>Process correlation]
        HealthReports[Health Check Reports<br/>Periodic assessments]
    end
    
    %% Log Processing
    subgraph "Log Analysis"
        ErrorDetection[Error Pattern Detection<br/>Automated scanning]
        PerformanceMetrics[Performance Analysis<br/>Resource usage trends]
        AlertGeneration[Alert Generation<br/>Critical events]
    end
    
    %% Monitoring Tools
    subgraph "Monitoring Interface"
        DevMonitor[Development Monitor<br/>Real-time display]
        HealthDash[Health Dashboard<br/>Component status]
        LogViewer[Log Viewer<br/>Filtered display]
        ComponentMgr[Component Manager<br/>Service control]
    end
    
    %% Log Flow
    OrchLogs --> LogDir
    ServiceLogs --> LogDir
    SystemLogs --> LogDir
    AppLogs --> LogDir
    
    LogDir --> ErrorDetection
    PIDTracking --> ErrorDetection
    HealthReports --> PerformanceMetrics
    
    ErrorDetection --> AlertGeneration
    PerformanceMetrics --> HealthDash
    AlertGeneration --> DevMonitor
    
    LogDir --> LogViewer
    PIDTracking --> ComponentMgr
```

### Real-time Monitoring Dashboard

```mermaid
graph TB
    %% Monitoring Components
    subgraph "Real-time Monitoring"
        ProcessMon[Process Monitor<br/>Live PID tracking]
        ResourceMon[Resource Monitor<br/>CPU/Memory usage]
        NetworkMon[Network Monitor<br/>Port connectivity]
        ServiceMon[Service Monitor<br/>Health endpoints]
    end
    
    %% Data Collection
    subgraph "Data Sources"
        PSOutput[ps command output<br/>Process statistics]
        SystemStats[System statistics<br/>/proc filesystem]
        NetStats[Network statistics<br/>netstat/ss output]
        LogTail[Log file tails<br/>Real-time events]
    end
    
    %% Display Interface
    subgraph "Monitoring Interface"
        StatusTable[Status Table<br/>Component overview]
        ResourceGraphs[Resource Graphs<br/>Usage trends]
        LogStream[Log Stream<br/>Live events]
        AlertPanel[Alert Panel<br/>Critical notifications]
    end
    
    %% Health Metrics
    subgraph "Health Indicators"
        UptimeTrack[Uptime Tracking<br/>Service availability]
        ErrorRates[Error Rate Monitoring<br/>Failure frequency]
        PerformanceTrack[Performance Tracking<br/>Response times]
        ResourceLimits[Resource Limits<br/>Threshold monitoring]
    end
    
    %% Data Flow
    ProcessMon --> PSOutput
    ResourceMon --> SystemStats
    NetworkMon --> NetStats
    ServiceMon --> LogTail
    
    PSOutput --> StatusTable
    SystemStats --> ResourceGraphs
    NetStats --> StatusTable
    LogTail --> LogStream
    
    StatusTable --> UptimeTrack
    ResourceGraphs --> ResourceLimits
    LogStream --> ErrorRates
    AlertPanel --> PerformanceTrack
```

## Service Discovery and Registration

### Dynamic Service Management

```mermaid
graph TB
    %% Service Registry
    subgraph "Service Registry"
        PIDRegistry[PID File Registry<br/>Active process tracking]
        PortRegistry[Port Registry<br/>Service endpoints]
        ConfigRegistry[Configuration Registry<br/>Service parameters]
        HealthRegistry[Health Registry<br/>Service status]
    end
    
    %% Discovery Mechanisms
    subgraph "Service Discovery"
        PIDScan[PID File Scanning<br/>Automatic detection]
        PortScan[Port Scanning<br/>Connectivity tests]
        ProcessScan[Process Scanning<br/>Pattern matching]
        ConfigScan[Config Scanning<br/>Parameter detection]
    end
    
    %% Management Operations
    subgraph "Service Operations"
        StartService[Start Service<br/>Launch with monitoring]
        StopService[Stop Service<br/>Graceful shutdown]
        RestartService[Restart Service<br/>Rolling restart]
        StatusService[Status Check<br/>Health verification]
    end
    
    %% Integration Points
    subgraph "Integration Layer"
        OrchIntegration[Orchestration Integration<br/>Main script coordination]
        DevIntegration[Development Integration<br/>Hot reload support]
        MonitorIntegration[Monitoring Integration<br/>Health dashboard]
        APIIntegration[API Integration<br/>External access]
    end
    
    %% Registry Updates
    PIDScan --> PIDRegistry
    PortScan --> PortRegistry
    ProcessScan --> PIDRegistry
    ConfigScan --> ConfigRegistry
    
    %% Operation Flows
    PIDRegistry --> StartService
    PortRegistry --> StopService
    ConfigRegistry --> RestartService
    HealthRegistry --> StatusService
    
    %% Integration Flows
    StartService --> OrchIntegration
    StatusService --> MonitorIntegration
    RestartService --> DevIntegration
    PortRegistry --> APIIntegration
```

## Container Orchestration Relationships

### Docker Service Integration

```mermaid
graph TB
    %% Docker Infrastructure
    subgraph "Docker Infrastructure"
        DockerEngine[Docker Engine<br/>Container runtime]
        DockerCompose[Docker Compose<br/>Service orchestration]
        DockerNet[Docker Networks<br/>stinkster-net bridge]
        DockerVol[Docker Volumes<br/>Persistent storage]
    end
    
    %% Container Services
    subgraph "Containerized Services"
        OpenWebRXCont[OpenWebRX Container<br/>openwebrx-hackrf]
        VolumeConfig[Volume Mounts<br/>Config persistence]
        USBAccess[USB Device Access<br/>Privileged mode]
        NetworkExpose[Network Exposure<br/>Port 8073]
    end
    
    %% Host Integration
    subgraph "Host System Integration"
        SystemD[SystemD Services<br/>Native services]
        USBSubsystem[USB Subsystem<br/>Hardware access]
        NetworkStack[Network Stack<br/>Host networking]
        FileSystem[File System<br/>Volume mounts]
    end
    
    %% Native Services
    subgraph "Native Service Layer"
        GPSD[GPSD Service<br/>GPS daemon]
        Kismet[Kismet Service<br/>WiFi scanning]
        PythonApps[Python Applications<br/>Microservices]
        OrchScripts[Orchestration Scripts<br/>Process management]
    end
    
    %% Service Relationships
    DockerEngine --> OpenWebRXCont
    DockerCompose --> DockerNet
    DockerNet --> NetworkExpose
    DockerVol --> VolumeConfig
    
    %% Host Integration
    USBSubsystem --> USBAccess
    NetworkStack --> NetworkExpose
    FileSystem --> VolumeConfig
    SystemD --> GPSD
    SystemD --> Kismet
    
    %% Cross-layer Communication
    PythonApps -.-> OpenWebRXCont: API integration
    OrchScripts -.-> DockerEngine: Container management
    GPSD -.-> PythonApps: Data sharing
    Kismet -.-> PythonApps: WiFi data
```

### Resource Management and Limits

```mermaid
graph TB
    %% Resource Categories
    subgraph "Resource Management"
        CPULimits[CPU Quotas<br/>Process allocation]
        MemoryLimits[Memory Limits<br/>Container/Process]
        NetworkLimits[Network Bandwidth<br/>Traffic shaping]
        DiskLimits[Disk I/O<br/>Storage quotas]
    end
    
    %% Container Resources
    subgraph "Container Resource Limits"
        DockerCPU[Docker CPU<br/>2.0 cores max<br/>0.5 cores reserved]
        DockerMem[Docker Memory<br/>1GB max<br/>512MB reserved]
        DockerLog[Docker Logging<br/>10MB max size<br/>3 file rotation]
    end
    
    %% SystemD Resources
    subgraph "SystemD Resource Controls"
        SystemDCPU[SystemD CPU<br/>25% quota]
        SystemDMem[SystemD Memory<br/>256MB limit]
        SystemDIO[SystemD I/O<br/>Priority scheduling]
    end
    
    %% Application Resources
    subgraph "Application Limits"
        PythonProc[Python Processes<br/>Virtual environment isolation]
        LogRotation[Log Rotation<br/>Size-based rotation]
        TempFiles[Temporary Files<br/>Automatic cleanup]
    end
    
    %% Monitoring Integration
    subgraph "Resource Monitoring"
        ResMonitor[Resource Monitor<br/>Usage tracking]
        AlertThresh[Alert Thresholds<br/>Limit warnings]
        AutoScale[Auto-scaling<br/>Service adjustment]
    end
    
    %% Resource Assignment
    CPULimits --> DockerCPU
    CPULimits --> SystemDCPU
    MemoryLimits --> DockerMem
    MemoryLimits --> SystemDMem
    
    %% Monitoring Integration
    DockerCPU --> ResMonitor
    SystemDMem --> AlertThresh
    PythonProc --> AutoScale
```

## Summary

The Stinkster service mesh demonstrates a sophisticated multi-layer architecture that successfully integrates:

### Key Architectural Strengths:

1. **Hybrid Container/Native Architecture**: Seamless integration between Docker containers and native system services
2. **Robust Process Management**: Comprehensive PID tracking, health monitoring, and graceful failure recovery
3. **Flexible Network Architecture**: Multi-protocol communication supporting TCP, HTTP, WebSocket, and file-based IPC
4. **Hardware Integration**: Direct USB device access with proper privilege management
5. **Development Support**: Hot reload, component management, and debugging tools
6. **Security Boundaries**: Layered security with appropriate authentication for each service tier

### Service Mesh Benefits:

- **High Availability**: Multiple retry mechanisms and automatic failover
- **Scalability**: Resource limits and monitoring prevent system overload
- **Maintainability**: Centralized logging and health monitoring
- **Flexibility**: Development and production modes with different orchestration strategies
- **Integration**: External TAK server integration with proper CoT message formatting

This architecture provides a solid foundation for reliable operation in challenging environments where hardware dependencies, network interfaces, and external services must work together seamlessly while maintaining system stability and observability.
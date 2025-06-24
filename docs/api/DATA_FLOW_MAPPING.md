# Stinkster System Data Flow Mapping

## Overview

This document maps the complete data flows between GPS, Kismet, WigleToTAK, and HackRF components in the Stinkster system. The system integrates Software Defined Radio (SDR), WiFi scanning, GPS tracking, and TAK (Team Awareness Kit) capabilities on a Raspberry Pi platform.

## System Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GPS Device    │    │   WiFi Adapter  │    │   HackRF SDR    │    │   OpenWebRX     │
│  (MAVLink/NMEA) │    │     (wlan2)     │    │      USB        │    │    Docker       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │                      │
          │                      │                      │              ┌───────▼───────┐
          ▼                      ▼                      ▼              │   WebSocket   │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │  :8073/ws/    │
│    mavgps.py    │    │     Kismet      │    │ spectrum_       │    └───────┬───────┘
│   GPS Bridge    │    │   WiFi Scanner  │    │ analyzer.py     │            │
│   Port: 2947    │    │   Port: 2501    │    │   Port: 8092    │            │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘            │
          │                      │                      │                    │
          │              ┌───────▼───────┐              │                    │
          │              │  .wiglecsv    │              │                    │
          │              │    Files      │              │                    │
          │              │ ${KISMET_DATA}│              │                    │
          │              └───────┬───────┘              │                    │
          │                      │                      │                    │
          ▼                      ▼                      ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            WigleToTAK Processing                                    │
│                              Port: 6969                                            │
│                         (v2WigleToTak2.py)                                        │
└─────────────────────────────┬───────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   TAK Server    │
                    │ UDP/Multicast   │
                    │  239.2.3.1:6969 │
                    └─────────────────┘
```

## Data Flow Details

### 1. GPS Data Flow

#### 1.1 Input Sources
- **MAVLink Devices**: TCP connection on port 14550 (e.g., drone telemetry)
- **Serial GPS**: Direct USB/serial connection (`/dev/ttyUSB0`, `/dev/ttyACM0`, `/dev/ttyAMA0`)

#### 1.2 Processing Chain
```
GPS Device → mavgps.py → GPSD (port 2947) → Kismet GPS Module
```

#### 1.3 Data Transformations
**Input**: MAVLink `GLOBAL_POSITION_INT` and `GPS_RAW_INT` messages
```python
# MAVLink Message Structure
GLOBAL_POSITION_INT:
  - lat: int32 (1e7 scale)
  - lon: int32 (1e7 scale) 
  - alt: int32 (mm)
  - vx, vy: int16 (cm/s)
  - hdg: uint16 (cdeg)

GPS_RAW_INT:
  - fix_type: uint8
  - satellites_visible: uint8
  - eph, epv: uint16 (cm)
```

**Output**: GPSD JSON Protocol
```json
{
  "class": "TPV",
  "device": "mavlink",
  "mode": 3,
  "time": "2025-06-15T10:30:45.123Z",
  "lat": 40.7128,
  "lon": -74.0060,
  "alt": 10.5,
  "track": 90.0,
  "speed": 2.5
}
```

#### 1.4 Network Protocol
- **Protocol**: TCP JSON over port 2947
- **Format**: GPSD protocol v3.11
- **Authentication**: None
- **Persistence**: Real-time streaming, no local storage

### 2. WiFi Scanning Data Flow

#### 2.1 Input Sources
- **WiFi Interface**: wlan2 in monitor mode
- **Channel Hopping**: 5 channels/second across 2.4GHz band

#### 2.2 Processing Chain
```
WiFi Adapter → Kismet → .wiglecsv Files → WigleToTAK → TAK Protocol
```

#### 2.3 Data Transformations
**Input**: Raw 802.11 frames (monitor mode)
```
802.11 Frame:
  - MAC addresses (BSSID, source, destination)
  - SSID (in beacon/probe frames)
  - Signal strength (RSSI)
  - Channel information
  - Authentication methods
```

**Intermediate**: Kismet .wiglecsv format
```csv
MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
aa:bb:cc:dd:ee:ff,MyNetwork,WPA2,2025-06-15 10:30:45,-65,40.7128,-74.0060,10.5,5.0,WiFi
```

**Output**: TAK CoT (Cursor on Target) XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<event access="Undefined" how="h-e" stale="2025-06-16T10:30:45.123Z" 
       start="2025-06-15T10:30:45.123Z" time="2025-06-15T10:30:45.123Z" 
       type="u-d-c-e" uid="MyNetwork" version="2.0">
    <point ce="9999999.0" hae="10.5" lat="40.7128" le="9999999.0" lon="-74.0060"/>
    <detail>
        <shape>
            <ellipse angle="45.0" major="130" minor="104"/>
        </shape>
        <remarks>Channel: 6, RSSI: -65, Authentication: WPA2, MAC: aa:bb:cc:dd:ee:ff</remarks>
    </detail>
</event>
```

#### 2.4 Network Protocols
- **Kismet Web UI**: HTTP on port 2501
- **Kismet REST API**: HTTP on port 2502
- **TAK Output**: UDP multicast to 239.2.3.1:6969

#### 2.5 File Storage
- **Location**: `${KISMET_DATA_DIR}/` (default: `/home/pi/projects/stinkster/data/kismet/`)
- **Formats**: `.kismet`, `.wiglecsv`, `.pcapng`
- **Rotation**: By time/size (configurable)

### 3. HackRF SDR Data Flow

#### 3.1 Input Sources
- **HackRF USB Device**: Raw IQ samples from RF spectrum
- **Frequency Range**: 1MHz - 6GHz (hardware dependent)

#### 3.2 Processing Chain
```
HackRF → OpenWebRX (Docker) → WebSocket → spectrum_analyzer.py → Web UI
```

#### 3.3 Data Transformations
**Input**: Raw IQ samples (complex float)
```python
# HackRF sample format
IQ_Sample = complex(I_value, Q_value)  # 8-bit or 16-bit
```

**Intermediate**: OpenWebRX FFT data
```python
# WebSocket binary message format
{
    "type": "config",
    "value": {
        "fft_size": 2048,
        "center_freq": 145000000,
        "samp_rate": 2400000,
        "fft_compression": "none"
    }
}

# Binary FFT payload (message type 1)
fft_data = numpy.array([...])  # Power spectrum in dB
```

**Output**: Real-time spectrum visualization
```json
{
  "data": [-80.5, -75.2, -82.1, ...],
  "center_freq": 145000000,
  "samp_rate": 2400000,
  "timestamp": 1671098445.123
}
```

#### 3.4 Network Protocols
- **OpenWebRX UI**: HTTP on port 8073
- **WebSocket**: `ws://localhost:8073/ws/`
- **Spectrum Analyzer**: HTTP/WebSocket on port 8092

#### 3.5 Signal Detection
```python
# Peak detection algorithm
def find_signal_peaks(fft_data, profile):
    signals = []
    for i in range(2, len(fft_data) - 2):
        if (fft_data[i] > fft_data[i-1] and 
            fft_data[i] > fft_data[i+1] and
            fft_data[i] > signal_threshold):
            
            frequency = calculate_frequency(i, center_freq, samp_rate)
            bandwidth = estimate_bandwidth(fft_data, i)
            confidence = calculate_confidence(fft_data[i])
            
            signals.append({
                'frequency': frequency,
                'power': fft_data[i],
                'bandwidth': bandwidth,
                'confidence': confidence
            })
    return signals
```

### 4. Integration and Data Correlation

#### 4.1 GPS Integration Points
- **Kismet**: Consumes GPSD data on port 2947 for location tagging
- **WigleToTAK**: Uses GPS coordinates from .wiglecsv files for ellipse positioning

#### 4.2 Cross-Component Communication
```
GPS (mavgps.py:2947) ←→ Kismet (WiFi Scanner)
                                    ↓
                             .wiglecsv files
                                    ↓
                          WigleToTAK (Port 6969)
                                    ↓
                             TAK Server/Clients

HackRF → OpenWebRX (8073) → WebSocket → spectrum_analyzer.py (8092)
```

#### 4.3 Data Persistence Mechanisms
```
Component          | Storage Type    | Location                               | Format
-------------------|-----------------|----------------------------------------|----------
GPS Bridge         | None (stream)   | Memory only                           | JSON
Kismet             | File-based      | ${KISMET_DATA_DIR}/                   | .wiglecsv, .kismet, .pcapng
WigleToTAK         | None (process)  | Reads from Kismet files              | CoT XML
HackRF/OpenWebRX   | Docker volumes  | openwebrx-settings, openwebrx-config | Binary/Config
Spectrum Analyzer  | None (realtime) | Memory buffers                        | NumPy arrays
```

## Port Summary

| Service               | Port  | Protocol | Purpose                    |
|----------------------|-------|----------|----------------------------|
| mavgps.py (GPSD)     | 2947  | TCP      | GPS data distribution      |
| Kismet Web UI        | 2501  | HTTP     | Web interface              |
| Kismet REST API      | 2502  | HTTP     | REST API                   |
| WigleToTAK Web       | 6969  | HTTP     | Control interface          |
| TAK Multicast        | 6969  | UDP      | TAK data distribution      |
| OpenWebRX            | 8073  | HTTP/WS  | SDR web interface          |
| Spectrum Analyzer    | 8092  | HTTP/WS  | Spectrum visualization     |
| Webhook Server       | 5001  | HTTP     | System integration         |
| MAVLink Source       | 14550 | TCP      | Drone telemetry input      |

## Service Dependencies

### Startup Order
1. **GPS Services**: mavgps.py → GPSD
2. **WiFi Scanning**: Kismet (depends on GPS for location tagging)
3. **TAK Integration**: WigleToTAK (depends on Kismet for .wiglecsv files)
4. **SDR Services**: OpenWebRX (Docker) → spectrum_analyzer.py

### Critical Dependencies
- **WigleToTAK** requires Kismet-generated .wiglecsv files
- **Kismet** requires GPS data for location tagging (optional but recommended)
- **spectrum_analyzer.py** requires OpenWebRX WebSocket connection
- **All services** require proper network interface configuration

### Process Monitoring
The system uses `/home/pi/projects/stinkster/src/orchestration/gps_kismet_wigle.sh` for:
- Service startup coordination
- Process health monitoring
- Automatic restart on failure
- Clean shutdown procedures
- PID file management in `/home/pi/projects/stinkster/logs/`

## Error Handling and Recovery

### GPS Bridge
- Automatic reconnection to MAVLink sources
- Fallback to serial GPS devices
- Client connection management
- Graceful degradation without GPS

### Kismet
- Interface monitoring and reset
- Channel hopping recovery
- Memory management
- Crash detection and restart

### WigleToTAK
- File monitoring for new .wiglecsv data
- Real-time vs post-collection modes
- Antenna sensitivity adjustments
- TAK server connection handling

### HackRF/OpenWebRX
- Docker container health monitoring
- Hardware device detection
- WebSocket reconnection logic
- FFT data validation

This comprehensive data flow mapping provides the foundation for understanding system integration, troubleshooting issues, and implementing enhancements to the Stinkster platform.
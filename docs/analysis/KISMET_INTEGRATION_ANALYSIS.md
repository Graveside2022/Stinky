# Kismet Integration Analysis: Flask vs Node.js Implementation

## Executive Summary

The system uses Kismet for WiFi scanning, which outputs data in WigleCSV format. This data is then processed by WigleToTAK (available in both Flask/Python and Node.js implementations) and converted to TAK (Team Awareness Kit) format for real-time tracking and visualization.

## Data Flow Architecture

### Complete Data Flow: Kismet → TAK

```
1. WiFi Interface (wlan0/wlan0mon)
   ↓
2. Kismet Scanner
   ↓
3. WigleCSV Files (continuous output)
   ↓
4. WigleToTAK Processor (Flask or Node.js)
   ↓
5. CoT XML Messages
   ↓
6. TAK Server/Multicast Network
```

## 1. Kismet Data Collection

### How Kismet Operates
- **Interface**: Uses wlan0 in monitor mode (or wlan0mon if created by airmon-ng)
- **Output Format**: WigleCSV files with standardized format
- **File Location**: `/home/pi/projects/stinkster/data/kismet/`
- **File Naming**: `Kismet-YYYYMMDD-HH-MM-SS-1.wiglecsv`

### WigleCSV Format
```csv
WigleWifi-1.4,appRelease=Kismet202307R2,model=Kismet,release=2023.07.R2...
MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
```

### Important Note: No Direct Webhook Integration
**Kismet does NOT send webhook data to WigleToTAK**. Instead:
- Kismet continuously writes to `.wiglecsv` files
- WigleToTAK monitors these files for changes
- In realtime mode, WigleToTAK tails the files for new entries

## 2. WigleToTAK Processing

### Flask Implementation (Python)

**Location**: `/home/pi/projects/stinkster_malone/stinkster/src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py`

**Key Features**:
1. **File Monitoring**: 
   ```python
   def read_file(filename, start_position):
       with open(filename, 'r') as file:
           file.seek(start_position)
           for line in file:
               yield line.strip().split(',')
   ```

2. **Two Processing Modes**:
   - **Realtime**: Continuously monitors file growth
   - **Post-collection**: Processes complete files in chunks

3. **Data Processing**:
   - Parses CSV lines into WiFi device records
   - Applies antenna sensitivity compensation
   - Filters based on whitelist/blacklist
   - Converts RSSI to estimated coverage ellipse

4. **TAK Message Generation**:
   - Creates CoT (Cursor on Target) XML messages
   - Includes device info, location, signal strength
   - Supports custom colors for visualization

### Node.js Implementation

**Location**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/wigle-to-tak/`

**Key Differences**:
1. Uses the same file monitoring approach
2. Provides WebSocket support for real-time updates
3. Better async handling with Node.js event loop
4. More modular architecture with separate core library

## 3. Service Orchestration

### The Master Script: `gps_kismet_wigle.sh`

**Location**: `/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh`

**Orchestration Flow**:
```bash
1. Start GPSD service
   - Ensures GPS data is available
   - Configures GPS device if needed
   - Starts cgps for monitoring

2. Start Kismet
   - Configures monitor mode on wlan0
   - Sets up Kismet configuration
   - Starts with channel hopping
   - Outputs to data directory

3. Start WigleToTAK
   - Checks if port 8000 is in use
   - Starts Python or Node.js version
   - Begins monitoring .wiglecsv files

4. Process Monitoring
   - Tracks all PIDs
   - Monitors critical processes
   - Handles cleanup on exit
```

## 4. Real-time Data Flow Details

### Step-by-Step Process:

1. **WiFi Packet Capture**:
   - Kismet captures 802.11 packets on monitor interface
   - Extracts device info (MAC, SSID, signal strength)
   - Determines GPS location (from GPSD)

2. **CSV File Writing**:
   - Kismet writes new devices to active .wiglecsv file
   - Each line represents a WiFi device observation
   - File grows continuously during operation

3. **File Monitoring** (WigleToTAK):
   ```python
   while broadcasting:
       for fields in read_file(full_path, last_position):
           # Process new lines
       last_position = os.path.getsize(full_path)
       time.sleep(0.1)
   ```

4. **Data Transformation**:
   - Parse CSV fields
   - Apply antenna sensitivity factor
   - Calculate coverage ellipse from RSSI
   - Generate unique device ID

5. **TAK Broadcasting**:
   - Create CoT XML message
   - Send to multicast group (239.2.3.1:6969)
   - And/or send to configured TAK server

## 5. Key Integration Points

### GPS Integration
- GPSD provides location data to Kismet
- Each WiFi observation includes GPS coordinates
- Accuracy depends on GPS fix quality

### Network Configuration
- **Kismet Web UI**: http://localhost:2501
- **WigleToTAK Flask**: http://localhost:8000
- **TAK Multicast**: 239.2.3.1:6969
- **Node.js Alternative**: http://localhost:3002

### Data Persistence
- Kismet files stored in `/home/pi/projects/stinkster/data/kismet/`
- Files are timestamped and never overwritten
- Can be replayed later in post-collection mode

## 6. Error Handling & Recovery

### Kismet Crashes
- Script monitors Kismet PID
- Automatic detection of segfaults
- Logs stored in kismet_debug.log

### Network Interface Issues
- Automatic monitor mode setup
- Fallback from airmon-ng to manual method
- Interface reset on exit

### Process Coordination
- PID tracking in `/home/pi/projects/stinkster/logs/*.pids`
- Cleanup handlers for graceful shutdown
- Process health monitoring every 5 seconds

## 7. Performance Considerations

### Antenna Sensitivity Compensation
The system supports different antenna types:
```python
sensitivity_factors = {
    'standard': 1.0,
    'alfa_card': 1.5,
    'high_gain': 2.0,
    'rpi_internal': 0.7,
    'custom': 1.0
}
```

### Processing Efficiency
- Realtime mode: Minimal delay (<1 second)
- File position tracking prevents reprocessing
- MAC address deduplication
- Configurable update intervals

## 8. API Endpoints Comparison

### Flask Implementation
- `/update_tak_settings` - Configure TAK server
- `/update_multicast_state` - Enable/disable multicast
- `/update_analysis_mode` - Switch realtime/post modes
- `/update_antenna_sensitivity` - Adjust sensitivity
- `/list_wigle_files` - List available CSV files
- `/start_broadcast` - Begin processing a file
- `/stop_broadcast` - Stop current broadcast

### Node.js Implementation
- Similar REST endpoints
- Additional WebSocket support
- Better async file handling
- Integrated with Kismet Operations dashboard

## Conclusion

The Kismet integration does NOT use webhooks. Instead, it relies on file-based communication through WigleCSV format. This approach is:
- **Reliable**: Files persist even if processors crash
- **Flexible**: Multiple processors can read the same data
- **Simple**: No complex webhook configuration needed
- **Efficient**: File position tracking prevents reprocessing

The orchestration script (`gps_kismet_wigle.sh`) manages the entire pipeline, ensuring all components start in the correct order and remain healthy during operation.
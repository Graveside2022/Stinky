# WigleToTAK Frontend Architecture Documentation

## Overview

WigleToTAK is a web-based interface that converts WiFi scan data from Kismet's WigleCSV format into TAK (Team Awareness Kit) messages for real-time tactical awareness. The frontend provides a comprehensive dashboard for managing the conversion process, configuring TAK server settings, and monitoring broadcasting status.

## Architecture Components

### 1. Frontend Technologies

- **Vanilla JavaScript**: Core client-side logic without frameworks
- **HTML5**: Semantic markup with responsive design
- **CSS3**: Dark theme styling with yellow accent colors (#ffcc00)
- **No map integration**: Visualization is handled by TAK clients, not the web interface

### 2. Core JavaScript Module (`wigle-to-tak.js`)

The main JavaScript class `WigleToTAKInterface` provides:

#### State Management
- Broadcasting status tracking
- Analysis mode (realtime vs post-collection)
- Selected file and directory management
- Processed entries tracking

#### Event Handlers
- TAK settings configuration
- Antenna sensitivity management
- File selection and upload
- Whitelist/blacklist management
- Broadcast control (start/stop)

#### API Integration Methods
- `refreshStatus()`: Polls server status every 5 seconds
- `updateTakSettings()`: Configures TAK server IP/port
- `updateAntennaSettings()`: Sets antenna sensitivity factors
- `listFiles()`: Retrieves available WigleCSV files
- `startBroadcast()`: Initiates TAK message broadcasting
- `stopBroadcast()`: Halts broadcasting

### 3. Dashboard Layout

The interface uses a two-column responsive layout:

#### Controls Column (Left)
1. **System Status Panel**
   - Service health indicator
   - Broadcasting status (Active/Inactive)
   - Current analysis mode
   - Antenna sensitivity display

2. **TAK Server Configuration**
   - IPv4 address input
   - Port configuration (default: 6969)
   - Multicast toggle (239.2.3.1:6969)

3. **Antenna Configuration**
   - Predefined types: Standard, Alfa Card, High Gain, RPi Internal
   - Custom sensitivity factor option
   - Real-time sensitivity adjustment

4. **File Management**
   - Directory browser for WigleCSV files
   - File selector dropdown
   - Direct file upload support
   - Analysis mode toggle (Real-time/Post-collection)

5. **Filtering Controls**
   - SSID/MAC whitelist management
   - Blacklist with color coding (-256: yellow, -65536: red, etc.)

#### Instructions Column (Right)
- Quick start guide
- Configuration details
- System integration notes
- Real-time log output display

### 4. Data Flow

```
User Input → JavaScript Event → REST API Call → Node.js Backend
                                                        ↓
                                                  WigleToTAK Core
                                                        ↓
                                                   CSV Processing
                                                        ↓
                                                  TAK XML Generation
                                                        ↓
                                                   UDP Broadcast
```

### 5. REST API Endpoints

#### Status & Configuration
- `GET /api/status` - System status and current configuration
- `POST /api/config` - Update multiple configuration parameters
- `GET /api/antenna-settings` - Retrieve antenna configuration
- `POST /api/antenna-settings` - Update antenna sensitivity

#### Broadcasting Control
- `POST /api/start` - Start broadcasting with optional file selection
- `POST /api/stop` - Stop active broadcasting
- `GET /api/list-files?directory={path}` - List available WigleCSV files

#### Filtering Management
- `GET /api/filters` - Retrieve whitelist/blacklist entries
- `POST /api/whitelist` - Add SSID/MAC to whitelist
- `DELETE /api/whitelist` - Remove from whitelist
- `POST /api/blacklist` - Add to blacklist with color
- `DELETE /api/blacklist` - Remove from blacklist

#### File Operations
- `POST /api/upload` - Upload WigleCSV files via multipart form

### 6. Real-time Updates

- **Status Polling**: 5-second interval for system status
- **No WebSocket**: Uses REST polling instead of real-time connections
- **Log Display**: In-memory log buffer (max 100 entries)
- **Progress Indication**: Visual feedback for active operations

### 7. User Interaction Features

#### Visual Feedback
- Toast notifications for success/error messages (3-second auto-dismiss)
- Color-coded status indicators (green: active, red: inactive)
- Disabled buttons for invalid operations
- Loading states during API calls

#### Form Validation
- Required field checking
- Input type validation (IP addresses, ports, numbers)
- Contextual enable/disable of controls

#### Responsive Design
- Mobile-friendly breakpoints (480px, 768px, 1024px)
- Flexible column layout
- Touch-friendly button sizing

### 8. Integration Points

#### TAK Server Communication
- UDP multicast to 239.2.3.1:6969
- Direct server connection support
- CoT (Cursor on Target) XML message format

#### WiFi Data Processing
- Ellipse visualization based on RSSI values
- Antenna sensitivity compensation
- GPS coordinate mapping
- Device type identification

#### System Coordination
- Works alongside Kismet for WiFi scanning
- Integrates with GPSd for location services
- Compatible with TAK clients (ATAK, WinTAK, iTAK)

### 9. Configuration Storage

- All settings stored in backend memory
- No persistent client-side storage
- Configuration retrieved on page load
- Settings persist across page refreshes via server

### 10. Security Considerations

- No authentication system (intended for local/trusted networks)
- CORS enabled for cross-origin requests
- Helmet.js for security headers
- Input sanitization for file paths and network inputs

## Dependencies

### Frontend (Loaded via CDN or bundled)
- No external JavaScript libraries
- Pure vanilla JavaScript implementation
- No jQuery, React, or other frameworks

### Backend (Node.js)
- Express.js - Web framework
- Socket.io - WebSocket support (available but unused in current implementation)
- Chokidar - File system watching
- CSV-parser - WigleCSV parsing
- Winston - Logging
- Multer - File uploads

## Future Enhancement Opportunities

1. **Map Integration**: Add Leaflet/OpenStreetMap for visual device tracking
2. **WebSocket Updates**: Replace polling with real-time WebSocket events
3. **Authentication**: Add user authentication for secure deployments
4. **Persistent Storage**: Save configuration to file/database
5. **Device History**: Track and display historical device movements
6. **Export Features**: Download processed TAK messages or device lists
7. **Advanced Filtering**: Regular expression support for SSID/MAC filtering
8. **Multi-file Selection**: Process multiple CSV files simultaneously
9. **Statistics Dashboard**: Show device counts, signal strength distributions
10. **Alert System**: Notifications for specific devices or signal patterns
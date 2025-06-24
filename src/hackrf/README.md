# HackRF Spectrum Analyzer Component

## Overview

The HackRF Spectrum Analyzer component provides real-time spectrum analysis capabilities for the Stinkster project. It interfaces with HackRF Software Defined Radio (SDR) hardware through OpenWebRX to perform signal detection, frequency scanning, and spectrum visualization.

### Key Features

- **Real-time Spectrum Analysis**: Live FFT data processing from HackRF via OpenWebRX WebSocket
- **Web-based Interface**: Interactive spectrum display with signal detection at port 8092
- **Multiple Scan Profiles**: Pre-configured frequency ranges for VHF, UHF, and ISM bands
- **Signal Detection**: Automated peak detection with configurable thresholds
- **OpenWebRX Integration**: Seamless integration with OpenWebRX web SDR platform
- **Demo Mode**: Fallback simulation when hardware is unavailable

## Hardware Requirements

### HackRF Device
- **HackRF One**: Software Defined Radio transceiver
- **Frequency Range**: 1 MHz to 6 GHz
- **Sample Rate**: Up to 20 MSPS
- **Connection**: USB 2.0/3.0

### System Requirements
- **RAM**: Minimum 2GB (4GB+ recommended for high sample rates)
- **CPU**: Multi-core ARM or x86 processor
- **USB**: Available USB port for HackRF device
- **Network**: Ethernet/WiFi for web interface access

## Installation

### Automated Installation (Recommended)

The easiest way to set up the HackRF component is through the automated installer:

```bash
git clone https://github.com/your-username/stinkster.git
cd stinkster
./install.sh
```

The installer automatically:
- ✅ Detects HackRF hardware and configures drivers
- ✅ Creates Python virtual environment with all dependencies
- ✅ Builds HackRF-optimized OpenWebRX Docker container
- ✅ Sets up native HackRF driver configuration (not SoapySDR)
- ✅ Configures USB permissions and udev rules
- ✅ Creates working band profiles for spectrum analysis

After installation, start the spectrum analyzer with:
```bash
# Start all services (includes HackRF spectrum analyzer)
sudo systemctl start stinkster

# Or start manually in development mode
./dev.sh start hackrf
```

### Manual Installation (Advanced Users)

For development or custom setups:

#### 1. Hardware Setup
```bash
# Connect HackRF to USB port
# Verify device detection
lsusb | grep HackRF
# Should show: Bus XXX Device XXX: ID 1d50:6089 OpenMoko, Inc. HackRF One

# Test HackRF directly
hackrf_info
```

#### 2. Software Dependencies
```bash
# Install from project root
cd /home/pi/projects/stinkster

# Create virtual environment (done by install.sh)
python3 -m venv src/hackrf/venv
source src/hackrf/venv/bin/activate

# Install Python dependencies
pip install -r requirements-hackrf.txt
```

#### 3. OpenWebRX Setup
The spectrum analyzer requires OpenWebRX for HackRF hardware interface:

```bash
# Start OpenWebRX (via Docker - auto-configured by install.sh)
docker-compose up -d openwebrx

# Verify OpenWebRX is running with HackRF support
curl http://localhost:8073
docker exec openwebrx hackrf_info
```

## Configuration

### Primary Configuration Files

#### 1. `config.json` - Basic HackRF Settings
```json
{
  "frequency": 945000000,
  "sample_rate": 2000000,
  "threshold": -60,
  "lna_gain": 24,
  "vga_gain": 52,
  "dest_ip": "239.2.3.1",
  "dest_port": 18999,
  "capture_size": 1048576,
  "running": false
}
```

#### 2. `spectrum-analyzer-config.json` - Advanced Configuration
```json
{
  "server": {
    "host": "0.0.0.0",
    "port": 5000,
    "debug": false,
    "cors_origins": ["*"]
  },
  "hackrf": {
    "default_frequency": 915000000,
    "default_sample_rate": 20000000,
    "default_bandwidth": 20000000,
    "default_lna_gain": 16,
    "default_vga_gain": 20,
    "fft_size": 1024,
    "averaging": 5
  },
  "frequency_bands": [
    {
      "name": "ISM 433MHz",
      "start": 433050000,
      "end": 434790000,
      "description": "Industrial, Scientific, Medical"
    }
  ]
}
```

### Configuration Parameters

| Parameter | Description | Default | Range |
|-----------|-------------|---------|-------|
| `frequency` | Center frequency (Hz) | 945000000 | 1MHz - 6GHz |
| `sample_rate` | Sample rate (Hz) | 2000000 | 2MHz - 20MHz |
| `lna_gain` | LNA gain (dB) | 24 | 0-40 |
| `vga_gain` | VGA gain (dB) | 52 | 0-62 |
| `threshold` | Signal threshold (dBm) | -60 | -100 to 0 |

## Usage

### Starting the Spectrum Analyzer

```bash
# Navigate to HackRF directory
cd /home/pi/projects/stinkster/src/hackrf

# Activate virtual environment
source venv/bin/activate

# Start spectrum analyzer
python3 spectrum_analyzer.py
```

### Web Interface Access

Open browser to: `http://localhost:8092` or `http://[PI_IP]:8092`

## API Documentation

### REST API Endpoints

#### GET `/api/status`
Returns system status and configuration
```json
{
  "openwebrx_connected": true,
  "real_data": true,
  "fft_buffer_size": 3,
  "config": {
    "fft_size": 1024,
    "center_freq": 145000000,
    "samp_rate": 2400000
  },
  "mode": "REAL DATA MODE"
}
```

#### GET `/api/scan/<profile_id>`
Perform signal scan using specified profile
- **profile_id**: `vhf`, `uhf`, or `ism`

```json
{
  "profile": {
    "name": "VHF Amateur (144-148 MHz)",
    "ranges": [[144.0, 148.0]],
    "step": 25
  },
  "signals": [
    {
      "id": "real-1671234567-123",
      "frequency": "145.500",
      "strength": "-65.2",
      "bandwidth": "12.5",
      "confidence": 0.85,
      "type": "unknown"
    }
  ],
  "scan_time": 1671234567.123,
  "real_data": true
}
```

#### GET `/api/profiles`
Returns available scan profiles
```json
{
  "vhf": {
    "name": "VHF Amateur (144-148 MHz)",
    "ranges": [[144.0, 148.0]],
    "step": 25,
    "description": "VHF Amateur Radio Band"
  }
}
```

### WebSocket Events

#### Connection (Port 8092)
```javascript
const socket = io('http://localhost:8092');
```

#### Events Received

**`fft_data`** - Real-time FFT spectrum data
```json
{
  "data": [-65.2, -67.1, -63.5, ...],
  "center_freq": 145000000,
  "samp_rate": 2400000,
  "timestamp": 1671234567.123
}
```

**`status`** - Connection status updates
```json
{
  "connected": true,
  "openwebrx_status": true
}
```

## Integration with OpenWebRX

### WebSocket Connection Flow

1. **Connect**: Establish WebSocket to `ws://localhost:8073/ws/`
2. **Handshake**: Send client identification and connection properties
3. **DSP Control**: Configure demodulator settings
4. **FFT Stream**: Receive continuous FFT data for analysis

### OpenWebRX Configuration
```json
{
  "version": 2,
  "sdrs": {
    "hackrf": {
      "name": "HackRF",
      "type": "hackrf",
      "ppm": 0,
      "profiles": {
        "2m": {
          "name": "2m Amateur Band",
          "center_freq": 145000000,
          "rf_gain": "VGA=35,LNA=40,AMP=0",
          "samp_rate": 2400000,
          "start_freq": 145700000,
          "start_mod": "nfm"
        }
      }
    }
  }
}
```

## Scan Profiles

### Built-in Profiles

#### VHF Amateur (144-148 MHz)
- **Use Case**: Amateur radio operations
- **Step Size**: 25 kHz
- **Typical Signals**: FM repeaters, simplex

#### UHF Amateur (420-450 MHz)
- **Use Case**: Amateur radio UHF operations
- **Step Size**: 25 kHz
- **Typical Signals**: FM repeaters, digital modes

#### ISM Band (2.4 GHz)
- **Use Case**: Industrial/Scientific/Medical
- **Step Size**: 1 MHz
- **Typical Signals**: WiFi, Bluetooth, IoT devices

### Custom Profiles

Add custom scan profiles in `spectrum_analyzer.py`:
```python
SCAN_PROFILES['custom'] = {
    'name': 'Custom Band',
    'ranges': [(400.0, 500.0)],  # MHz
    'step': 50,  # kHz
    'description': 'Custom frequency range'
}
```

## Screenshots and Examples

### Real-time Spectrum Display
The web interface shows:
- **Green Terminal Style**: Matrix-inspired UI
- **Live FFT Plot**: Real-time spectrum waterfall
- **Signal List**: Detected signals with metadata
- **Status Panel**: Connection and configuration info

### Signal Detection Example
```
📡 Peak 1: 145.500 MHz, -65.2 dB, 12.5 kHz
📡 Peak 2: 146.940 MHz, -72.1 dB, 25.0 kHz
🎯 Found 2 signal peaks for VHF Amateur (144-148 MHz)
```

## Troubleshooting

### Common Issues

#### 1. HackRF Not Detected
```bash
# Check USB connection
lsusb | grep HackRF

# Check permissions
sudo usermod -a -G plugdev $USER
# Logout and login again

# Test HackRF directly
hackrf_info
```

#### 2. OpenWebRX Connection Failed
```bash
# Verify OpenWebRX is running
docker ps | grep openwebrx

# Check OpenWebRX logs
docker logs openwebrx

# Test WebSocket manually
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:8073/ws/
```

#### 3. No FFT Data Received
- **Check**: OpenWebRX SDR configuration
- **Verify**: HackRF is selected as active SDR
- **Solution**: Update `sdrs.json` with native HackRF driver

#### 4. Poor Signal Reception
```bash
# Adjust gains in config.json
{
  "lna_gain": 32,    # Increase for weak signals
  "vga_gain": 40,    # Adjust based on noise floor
  "threshold": -75   # Lower for weaker signals
}
```

#### 5. Web Interface Shows Demo Mode
- **Cause**: No real FFT data from OpenWebRX
- **Check**: WebSocket connection status
- **Verify**: HackRF hardware detection

### Performance Optimization

#### Memory Usage
```bash
# Monitor memory usage
top -p $(pgrep python3)

# Reduce FFT buffer size if needed
# Edit spectrum_analyzer.py:
if len(fft_buffer) > 3:  # Reduce from 5 to 3
    fft_buffer.pop(0)
```

#### CPU Usage
```bash
# Lower sample rate in OpenWebRX
# Reduce FFT update rate
"websocket": {
  "update_rate": 5  # Reduce from 10 Hz
}
```

### Log Analysis

#### Enable Debug Logging
```python
# In spectrum_analyzer.py
logging.basicConfig(level=logging.DEBUG)
```

#### Key Log Messages
- `✅ Connected to OpenWebRX WebSocket` - Successful connection
- `📡 OpenWebRX Config received` - Configuration loaded
- `🎯 FFT Data received` - Real-time data flow
- `🎯 Found X signal peaks` - Signal detection working

## Integration Points

### With Kismet (WiFi Scanning)
- Coordinate 2.4 GHz band scanning
- Share frequency allocation data
- Correlate WiFi signals with spectrum peaks

### With GPS (Location Services)
- Geolocate detected signals
- Create signal strength maps
- Track mobile transmitters

### With TAK Integration
- Export signal data to TAK format
- Display spectrum data on tactical maps
- Share RF intelligence

## Advanced Usage

### Custom Signal Processing
```python
def custom_signal_detector(fft_data, threshold):
    """Custom signal detection algorithm"""
    # Implement custom peak detection
    # Add signal classification
    # Return enhanced signal metadata
    pass
```

### Frequency Coordination
```python
# Check for interference before transmission
def check_frequency_clear(frequency_mhz, bandwidth_khz):
    # Scan specific frequency
    # Return interference level
    pass
```

### Automated Scanning
```python
# Schedule periodic scans
import schedule
schedule.every(5).minutes.do(lambda: api_scan('vhf'))
```

## Security Considerations

- **Network Access**: Web interface accessible on all interfaces (0.0.0.0)
- **Authentication**: No built-in authentication (add reverse proxy if needed)
- **RF Emissions**: HackRF can transmit - use receive-only mode for scanning
- **Legal Compliance**: Ensure operation within authorized frequency bands

## Contributing

When modifying the HackRF component:

1. **Test with Hardware**: Verify changes work with actual HackRF device
2. **Demo Mode**: Ensure demo mode still functions without hardware
3. **WebSocket Protocol**: Maintain OpenWebRX compatibility
4. **Configuration**: Update config templates for new parameters
5. **Documentation**: Update API documentation for new endpoints

---

For support and additional information, see the main Stinkster project documentation.
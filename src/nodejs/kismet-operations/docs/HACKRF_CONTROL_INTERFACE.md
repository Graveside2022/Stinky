# HackRF Control Interface Documentation

## Overview

The HackRF Control Interface provides a comprehensive web-based control system for the HackRF SDR device, integrated into the Kismet Operations Center. It offers real-time frequency control, gain management, scan modes, recording capabilities, and advanced settings.

## Components

### 1. ScanModeSelector Component

**Purpose**: Allows users to select different scanning modes for the HackRF device.

**Available Modes**:
- **Single**: One-time scan at current frequency
- **Continuous**: Continuous scanning at fixed frequency
- **Sweep**: Frequency sweep across a defined range
- **Hop**: Frequency hopping between predefined frequencies

**Features**:
- Dynamic settings panel based on selected mode
- Real-time mode switching
- Configurable parameters for each mode

### 2. RecordingControls Component

**Purpose**: Manages RF signal recording with various formats and options.

**Features**:
- Start/Stop/Pause recording controls
- Multiple recording formats:
  - IQ Data (.iq)
  - WAV Audio (.wav)
  - Complex Float32 (.cf32)
- Recording options:
  - Include waterfall data
  - Include metadata
- Real-time recording timer
- Visual recording status indicator

### 3. DeviceStatus Component

**Purpose**: Displays real-time HackRF device status and connection information.

**Status Information**:
- Connection status
- Current sample rate
- FFT size
- Buffer status
- Device temperature
- USB connection speed

### 4. AdvancedSettings Component

**Purpose**: Provides expert-level controls for advanced users.

**Settings**:
- Sample rate selection (2-20 MHz)
- FFT size configuration (256-4096)
- Window function selection (Hamming, Hanning, Blackman, Rectangular)
- Averaging control
- Bias-T power enable/disable

### 5. Frequency Controls

**Purpose**: Precise frequency control with multiple input methods.

**Features**:
- Large frequency display
- Slider control for smooth tuning
- Step buttons (-10, -1, -0.1, +0.1, +1, +10 MHz)
- Direct frequency entry
- Real-time frequency updates

### 6. Gain Controls

**Purpose**: Manual and automatic gain control for optimal signal reception.

**Controls**:
- VGA Gain (0-62 dB, 2 dB steps)
- LNA Gain (0-40 dB, 8 dB steps)
- AMP Enable toggle (14 dB amplifier)
- Auto Gain button for automatic optimization

## API Integration

### WebSocket Events (Client → Server)

```javascript
// Frequency control
socket.emit('set_frequency', { frequency: 146500000 }); // Hz

// Gain control
socket.emit('set_gain', { vga: 30, lna: 40, amp: 0 });

// Auto gain request
socket.emit('auto_gain', { center_freq: 145000000, bandwidth: 2400000 });

// Scan mode
socket.emit('set_scan_mode', { mode: 'sweep' });

// Recording control
socket.emit('start_recording', { 
    format: 'iq', 
    includeWaterfall: true,
    includeMetadata: true 
});
socket.emit('stop_recording');
socket.emit('pause_recording');

// Advanced settings
socket.emit('update_advanced_settings', {
    samp_rate: 5000000,
    fft_size: 2048,
    window_function: 'hamming',
    averaging: 5,
    bias_tee: false
});

// Configuration request
socket.emit('get_config');
```

### WebSocket Events (Server → Client)

```javascript
// Configuration updates
socket.on('config_update', (config) => {
    // config.center_freq, config.samp_rate, config.gain, etc.
});

// Device status
socket.on('device_status', (status) => {
    // status.connected, status.temperature, status.buffer_size, etc.
});

// Recording status
socket.on('recording_status', (status) => {
    // status.recording, status.id, status.format, status.startTime
});

// Auto gain result
socket.on('gain_optimized', (gains) => {
    // gains.vga, gains.lna, gains.amp
});

// Real-time FFT data
socket.on('fftData', (data) => {
    // data.data (array), data.center_freq, data.samp_rate
});
```

## Usage Example

```javascript
// Initialize HackRF controls
const hackrfSocket = io('/hackrf', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});

// Initialize controls
window.hackrfControls.initialize(hackrfSocket);

// Listen for FFT data
hackrfSocket.on('fftData', (data) => {
    updateSpectrumPlot(data);
});
```

## UI Integration

The HackRF Control Interface is integrated into the Kismet Operations Center as a dedicated tab. The controls are responsive and adapt to different screen sizes.

### CSS Classes

- `.hackrf-control-panel`: Main container
- `.control-section`: Individual control sections
- `.frequency-display`: Large frequency readout
- `.scan-mode-btn`: Scan mode selection buttons
- `.control-btn`: Generic control buttons
- `.status-grid`: Device status grid layout
- `.recording-status`: Recording status display

### Theme Support

The interface supports both dark and light themes through CSS variables:
- `--bg-primary`, `--bg-secondary`: Background colors
- `--text-primary`, `--text-accent`: Text colors
- `--border-primary`: Border colors

## Mobile Optimization

- Touch-friendly controls with minimum 48px touch targets
- Responsive layout that stacks controls on small screens
- Optimized for both portrait and landscape orientations
- Hardware-accelerated scrolling for smooth performance

## Performance Considerations

- FFT data is throttled to prevent UI lag
- Spectrum plot updates use efficient Plotly restyle methods
- WebSocket reconnection with exponential backoff
- Efficient event handler cleanup on disconnect

## Testing

Run the test suite to verify all components:

```bash
npm test tests/test-hackrf-controls.js
```

The test suite covers:
1. WebSocket connection
2. Configuration requests
3. Frequency changes
4. Gain adjustments
5. Auto gain optimization
6. Scan mode selection
7. Recording controls
8. Advanced settings
9. FFT data reception

## Future Enhancements

1. **Preset Management**: Save and load frequency/gain presets
2. **Signal Detection**: Automatic signal detection and marking
3. **Waterfall Display**: Time-based waterfall visualization
4. **Recording Playback**: Play back recorded IQ files
5. **Remote Control API**: REST API for external control
6. **Frequency Scanner**: Automated frequency scanning with signal logging
7. **Protocol Decoders**: Integration with signal decoders
8. **GPS Integration**: Automatic location tagging of recordings
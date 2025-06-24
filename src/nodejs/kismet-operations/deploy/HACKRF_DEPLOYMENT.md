# HackRF Spectrum Analyzer Deployment Guide

## Overview

This guide covers deployment, configuration, and maintenance of the HackRF Spectrum Analyzer component.

## Quick Start

Deploy to production:
```bash
sudo ./deploy/scripts/deploy-hackrf.sh deploy production
```

## Deployment Environments

### Production
- Optimized for Raspberry Pi performance
- Conservative buffer sizes
- Rate-limited WebSocket messages (30Hz)
- Persistent logging with rotation

### Development
- Higher message rates for debugging
- Larger buffers for analysis
- Debug logging enabled
- CORS open for testing

### Test
- Minimal configuration
- Small buffers for unit tests
- No automatic reconnection
- Error-level logging only

## Deployment Commands

### Initial Deployment
```bash
# Deploy with production configuration
sudo ./deploy/scripts/deploy-hackrf.sh deploy production

# Deploy with development configuration
sudo ./deploy/scripts/deploy-hackrf.sh deploy development
```

### Configuration Updates
```bash
# Update configuration without full deployment
sudo ./deploy/scripts/deploy-hackrf.sh configure production
```

### Service Management
```bash
# Check service status
sudo ./deploy/scripts/deploy-hackrf.sh status

# Restart service
sudo ./deploy/scripts/deploy-hackrf.sh restart

# View logs
sudo journalctl -u hackrf-spectrum -f
```

## Health Monitoring

### Quick Status Check
```bash
./deploy/scripts/hackrf-health-check.sh status
```

### Continuous Monitoring
```bash
./deploy/scripts/hackrf-health-check.sh monitor
```

### Alert Checking
```bash
# Check for critical alerts (returns exit code)
./deploy/scripts/hackrf-health-check.sh alert
```

### Metrics Collection
```bash
# Collect performance metrics
./deploy/scripts/hackrf-health-check.sh metrics
```

## Configuration

Configuration file location: `/opt/hackrf-spectrum/config.json`

### Key Configuration Options

```json
{
  "spectrum": {
    "fft_size": 4096,              // FFT bin count
    "center_freq": 145000000,      // Center frequency in Hz
    "samp_rate": 2400000,          // Sample rate in Hz
    "signal_threshold": -70,       // Signal detection threshold in dB
    "openwebrx_url": "ws://localhost:8073/ws/"
  },
  "websocket": {
    "messageRateLimit": 30,        // Max messages per second
    "reconnectAttempts": 10,       // Max reconnection attempts
    "reconnectDelay": 2000         // Initial reconnect delay (ms)
  },
  "performance": {
    "maxBufferSize": 1000,         // Maximum FFT buffer size
    "bufferCleanupThreshold": 500  // Buffer size after cleanup
  }
}
```

## API Endpoints

The service exposes REST API on port 8092:

- `GET /api/hackrf/status` - Service and connection status
- `GET /api/hackrf/config` - Current configuration
- `POST /api/hackrf/config` - Update configuration
- `GET /api/hackrf/signals` - Detected signals
- `GET /api/hackrf/stats` - Signal detection statistics

## WebSocket Interface

WebSocket connection available at `ws://localhost:8092`

### Incoming Messages
- `fftData` - Real-time FFT spectrum data
- `signalsDetected` - Signal detection events
- `connection` - Connection status updates

### Outgoing Commands
```javascript
// Update configuration
{
  "action": "updateConfig",
  "config": { "signal_threshold": -65 }
}

// Clear buffer
{ "action": "clearBuffer" }

// Get status
{ "action": "getStatus" }
```

## Performance Tuning

### Raspberry Pi Optimization

1. **Reduce FFT Size** for lower CPU usage:
   ```bash
   sudo ./deploy/scripts/deploy-hackrf.sh configure production
   # Edit /opt/hackrf-spectrum/config.json
   # Set fft_size to 1024 or 2048
   ```

2. **Adjust Message Rate** to reduce network load:
   ```json
   "messageRateLimit": 15  // 15 Hz for low-power devices
   ```

3. **Buffer Management**:
   ```json
   "maxBufferSize": 500,
   "bufferCleanupThreshold": 250
   ```

### Resource Limits

The systemd service includes resource limits:
- Memory: 512MB maximum
- CPU: 50% quota
- Automatic restart on failure

## Troubleshooting

### Service Won't Start
```bash
# Check service status
sudo systemctl status hackrf-spectrum

# View detailed logs
sudo journalctl -u hackrf-spectrum -n 100

# Check configuration syntax
jq . /opt/hackrf-spectrum/config.json
```

### OpenWebRX Connection Issues
```bash
# Verify OpenWebRX is running
sudo systemctl status openwebrx

# Check WebSocket connectivity
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8073/ws/
```

### High CPU/Memory Usage
```bash
# Monitor resources
./deploy/scripts/hackrf-health-check.sh monitor

# Adjust configuration
sudo nano /opt/hackrf-spectrum/config.json
# Reduce fft_size and messageRateLimit

# Restart service
sudo systemctl restart hackrf-spectrum
```

### No Signal Detection
1. Check signal threshold in configuration
2. Verify HackRF hardware is connected
3. Ensure OpenWebRX is receiving data
4. Check frequency and sample rate settings

## Backup and Recovery

### Backup Configuration
```bash
sudo cp /opt/hackrf-spectrum/config.json /opt/hackrf-spectrum/config.json.backup
```

### Restore Configuration
```bash
sudo cp /opt/hackrf-spectrum/config.json.backup /opt/hackrf-spectrum/config.json
sudo systemctl restart hackrf-spectrum
```

## Integration with Kismet Operations Center

The HackRF spectrum analyzer integrates with the main dashboard:

1. Spectrum data available via WebSocket
2. REST API accessible from dashboard
3. Shared authentication when deployed together
4. Coordinated logging and metrics

## Security Considerations

1. **Network Access**: By default, binds to all interfaces in production. Restrict with:
   ```json
   "host": "127.0.0.1"  // Local only
   ```

2. **CORS**: Configure allowed origins:
   ```json
   "cors": {
     "origins": ["http://your-domain.com"]
   }
   ```

3. **Resource Protection**: SystemD service includes:
   - No new privileges
   - Private /tmp
   - Protected system/home directories

## Maintenance

### Log Rotation
Logs are automatically rotated when they reach 10MB, keeping last 5 files.

### Service Updates
```bash
# Update code
cd /path/to/project
git pull

# Rebuild if needed
npm run build

# Redeploy
sudo ./deploy/scripts/deploy-hackrf.sh deploy production
```

### Performance Metrics
```bash
# Generate performance report
./deploy/scripts/hackrf-health-check.sh metrics
cat /var/log/hackrf-spectrum/metrics.json | jq .
```

## Support

For issues:
1. Check service logs
2. Verify configuration
3. Test API endpoints
4. Monitor WebSocket connection
5. Review performance metrics
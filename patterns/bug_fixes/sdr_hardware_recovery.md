# SDR Hardware Recovery Pattern

## Problem

SDR hardware (HackRF, RTL-SDR) frequently loses connection due to USB issues, power management,
driver conflicts, or thermal problems. Manual reconnection is impractical for production systems.

## Solution

Implement automated hardware detection, recovery, and health monitoring with fallback strategies for
continuous operation.

## Implementation

### 1. Hardware State Detection

```bash
# Detect HackRF hardware state
detect_hackrf_state() {
    local device_state="unknown"

    # Check USB enumeration
    if lsusb | grep -q "1d50:6089"; then
        device_state="usb_detected"

        # Check driver binding
        if hackrf_info >/dev/null 2>&1; then
            device_state="driver_ready"

            # Check operational state
            if timeout 5 hackrf_transfer -r /dev/null -n 1024 >/dev/null 2>&1; then
                device_state="operational"
            else
                device_state="driver_error"
            fi
        else
            device_state="driver_missing"
        fi
    else
        device_state="usb_missing"
    fi

    echo "$device_state"
}
```

### 2. Automated Recovery Procedures

```python
import subprocess
import time
import logging
from enum import Enum

class HardwareState(Enum):
    OPERATIONAL = "operational"
    USB_MISSING = "usb_missing"
    DRIVER_MISSING = "driver_missing"
    DRIVER_ERROR = "driver_error"
    UNKNOWN = "unknown"

class SDRRecoveryManager:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.recovery_attempts = 0
        self.max_recovery_attempts = 3

    def get_hardware_state(self):
        """Detect current hardware state"""
        try:
            result = subprocess.run(['bash', '-c', 'detect_hackrf_state'],
                                  capture_output=True, text=True, timeout=10)
            state_str = result.stdout.strip()
            return HardwareState(state_str)
        except Exception as e:
            self.logger.error(f"State detection failed: {e}")
            return HardwareState.UNKNOWN

    def recover_usb_connection(self):
        """Reset USB connection"""
        self.logger.info("Attempting USB recovery...")
        try:
            # Unbind and rebind USB device
            subprocess.run(['sudo', 'bash', '-c',
                          'echo "1d50 6089" > /sys/bus/usb/drivers/hackrf/unbind'],
                          timeout=5, check=False)
            time.sleep(2)

            subprocess.run(['sudo', 'bash', '-c',
                          'echo "1d50 6089" > /sys/bus/usb/drivers/hackrf/bind'],
                          timeout=5, check=False)
            time.sleep(3)

            return self.get_hardware_state() == HardwareState.OPERATIONAL
        except Exception as e:
            self.logger.error(f"USB recovery failed: {e}")
            return False

    def recover_driver(self):
        """Reload kernel module"""
        self.logger.info("Attempting driver recovery...")
        try:
            # Remove and reload hackrf module
            subprocess.run(['sudo', 'modprobe', '-r', 'hackrf'], timeout=10)
            time.sleep(2)
            subprocess.run(['sudo', 'modprobe', 'hackrf'], timeout=10)
            time.sleep(3)

            return self.get_hardware_state() == HardwareState.OPERATIONAL
        except Exception as e:
            self.logger.error(f"Driver recovery failed: {e}")
            return False

    def power_cycle_usb_hub(self):
        """Power cycle USB hub if available"""
        self.logger.info("Attempting USB hub power cycle...")
        try:
            # Find USB hub and power cycle
            result = subprocess.run(['lsusb', '-t'], capture_output=True, text=True)

            # Look for USB hub in topology
            if 'Hub' in result.stdout:
                # Reset USB hub power (requires uhubctl or similar)
                subprocess.run(['sudo', 'uhubctl', '-a', '0'], timeout=5, check=False)
                time.sleep(2)
                subprocess.run(['sudo', 'uhubctl', '-a', '1'], timeout=5, check=False)
                time.sleep(5)

                return self.get_hardware_state() == HardwareState.OPERATIONAL
        except Exception as e:
            self.logger.warning(f"USB hub power cycle failed: {e}")
        return False

    def perform_recovery(self):
        """Execute recovery sequence"""
        if self.recovery_attempts >= self.max_recovery_attempts:
            self.logger.error("Max recovery attempts exceeded")
            return False

        self.recovery_attempts += 1
        state = self.get_hardware_state()

        self.logger.info(f"Current state: {state.value}, attempt {self.recovery_attempts}")

        recovery_sequence = {
            HardwareState.DRIVER_ERROR: [self.recover_usb_connection, self.recover_driver],
            HardwareState.DRIVER_MISSING: [self.recover_driver],
            HardwareState.USB_MISSING: [self.power_cycle_usb_hub, self.recover_driver]
        }

        if state in recovery_sequence:
            for recovery_func in recovery_sequence[state]:
                if recovery_func():
                    self.logger.info("Recovery successful")
                    self.recovery_attempts = 0
                    return True
                time.sleep(2)

        return False
```

### 3. Health Monitoring Service

```bash
# Continuous hardware health monitoring
#!/bin/bash

HEALTH_CHECK_INTERVAL=30
LOG_FILE="/var/log/sdr_health.log"
PID_FILE="/var/run/sdr_monitor.pid"

log_message() {
    echo "$(date): $1" | tee -a "$LOG_FILE"
}

monitor_sdr_health() {
    echo $$ > "$PID_FILE"
    log_message "SDR health monitor started"

    while true; do
        state=$(detect_hackrf_state)

        case "$state" in
            "operational")
                # All good, minimal logging
                ;;
            "driver_error"|"driver_missing"|"usb_missing")
                log_message "Hardware issue detected: $state"

                # Attempt recovery
                if python3 -c "
from sdr_recovery import SDRRecoveryManager
manager = SDRRecoveryManager()
success = manager.perform_recovery()
exit(0 if success else 1)
                "; then
                    log_message "Recovery successful"
                else
                    log_message "Recovery failed, will retry"
                fi
                ;;
            *)
                log_message "Unknown state: $state"
                ;;
        esac

        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Signal handlers
cleanup() {
    log_message "SDR health monitor stopping"
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start monitoring
monitor_sdr_health
```

### 4. Fallback Strategy Implementation

```javascript
// JavaScript fallback for web interface
class SDRFallbackManager {
  constructor() {
    this.primarySDR = null;
    this.fallbackMode = false;
    this.mockData = this.generateMockSpectrum();
  }

  async checkSDRAvailability() {
    try {
      const response = await fetch('/api/sdr/status', { timeout: 5000 });
      const status = await response.json();

      if (status.operational) {
        if (this.fallbackMode) {
          console.log('SDR recovered, switching from fallback mode');
          this.fallbackMode = false;
        }
        return true;
      }
    } catch (error) {
      console.warn('SDR status check failed:', error.message);
    }

    if (!this.fallbackMode) {
      console.log('SDR unavailable, switching to fallback mode');
      this.fallbackMode = true;
    }
    return false;
  }

  async getSpectrumData() {
    if (await this.checkSDRAvailability()) {
      try {
        const response = await fetch('/api/spectrum/data');
        return await response.json();
      } catch (error) {
        console.warn('Spectrum data fetch failed, using fallback');
        this.fallbackMode = true;
      }
    }

    // Return mock data when SDR unavailable
    return this.generateMockSpectrum();
  }

  generateMockSpectrum() {
    // Generate realistic-looking mock spectrum data
    const frequencies = [];
    const powers = [];

    for (let i = 0; i < 1024; i++) {
      frequencies.push(144000000 + i * 1000); // 144 MHz + offset
      // Add some noise and mock signals
      let power = -80 + Math.random() * 10;
      if (i % 100 === 0) power += 20; // Mock strong signal
      powers.push(power);
    }

    return {
      frequencies,
      powers,
      timestamp: Date.now(),
      mock: true,
    };
  }
}
```

## Testing

### 1. Hardware Disconnection Simulation

```bash
test_hardware_recovery() {
    echo "Testing hardware recovery..."

    # Simulate hardware disconnection
    sudo modprobe -r hackrf
    sleep 2

    # Check detection
    state=$(detect_hackrf_state)
    if [ "$state" != "driver_missing" ]; then
        echo "✗ Failed to detect driver removal"
        return 1
    fi

    # Test recovery
    python3 -c "
from sdr_recovery import SDRRecoveryManager
manager = SDRRecoveryManager()
success = manager.perform_recovery()
print('✓ Recovery successful' if success else '✗ Recovery failed')
exit(0 if success else 1)
    "
}
```

### 2. Stress Testing

```python
def test_recovery_stress():
    """Test recovery under repeated failures"""
    manager = SDRRecoveryManager()

    for i in range(10):
        print(f"Stress test iteration {i+1}")

        # Simulate failure
        subprocess.run(['sudo', 'modprobe', '-r', 'hackrf'])
        time.sleep(1)

        # Test recovery
        success = manager.perform_recovery()
        assert success, f"Recovery failed on iteration {i+1}"

        # Verify operational state
        state = manager.get_hardware_state()
        assert state == HardwareState.OPERATIONAL

        time.sleep(2)
```

## Usage Notes

- Deploy health monitoring as systemd service
- Configure appropriate recovery intervals
- Implement exponential backoff for repeated failures
- Log all recovery attempts for analysis
- Provide fallback data when hardware unavailable
- Monitor USB power management settings
- Test recovery procedures regularly

## Related Patterns

- Health Check Pattern
- Circuit Breaker Pattern
- Graceful Degradation Pattern
- Retry with Exponential Backoff

# Systematic Error Resolution Pattern

## Problem
SDR and IoT systems often exhibit cascading failures where one component error triggers multiple downstream failures. Traditional ad-hoc error handling leads to incomplete fixes and recurring issues.

## Solution
Implement systematic error resolution using structured diagnostic flows, service health checks, and automated recovery procedures.

## Implementation

### 1. Service Health Monitoring
```bash
# Health check pattern for SDR services
check_service_health() {
    local service_name=$1
    local health_endpoint=$2
    local max_retries=${3:-3}
    
    for i in $(seq 1 $max_retries); do
        if curl -sf "$health_endpoint" >/dev/null 2>&1; then
            echo "✓ $service_name healthy"
            return 0
        fi
        echo "⚠ $service_name check failed (attempt $i/$max_retries)"
        sleep 2
    done
    echo "✗ $service_name unhealthy"
    return 1
}
```

### 2. Systematic Diagnostic Flow
```bash
# SDR system diagnostic pattern
diagnose_sdr_system() {
    echo "=== SDR System Diagnostic ==="
    
    # 1. Hardware layer
    echo "Checking hardware..."
    lsusb | grep -i hackrf || echo "✗ HackRF not detected"
    
    # 2. Driver layer  
    echo "Checking drivers..."
    if ! command -v hackrf_info >/dev/null; then
        echo "✗ HackRF tools not installed"
        return 1
    fi
    
    # 3. Service layer
    echo "Checking services..."
    check_service_health "OpenWebRX" "http://localhost:8073/status"
    check_service_health "Spectrum Analyzer" "http://localhost:8092/health"
    
    # 4. Integration layer
    echo "Checking integrations..."
    pgrep kismet >/dev/null && echo "✓ Kismet running" || echo "✗ Kismet not running"
}
```

### 3. Automated Recovery Procedures
```bash
# Recovery pattern for common SDR failures
recover_sdr_service() {
    local service=$1
    
    case "$service" in
        "hackrf")
            echo "Recovering HackRF..."
            # Reset USB device
            sudo bash -c 'echo 1 > /sys/bus/usb/devices/*/authorized' 2>/dev/null
            sleep 2
            hackrf_info || return 1
            ;;
        "openwebrx")
            echo "Recovering OpenWebRX..."
            docker restart openwebrx
            sleep 5
            check_service_health "OpenWebRX" "http://localhost:8073/status"
            ;;
        "kismet")
            echo "Recovering Kismet..."
            pkill -f kismet
            sleep 2
            /home/pi/scripts/start_kismet.sh
            ;;
    esac
}
```

### 4. Error Pattern Recognition
```python
# Python pattern for error classification
class ErrorPatternResolver:
    def __init__(self):
        self.error_patterns = {
            'usb_device_lost': r'usb.*disconnect|device not found',
            'port_in_use': r'address already in use|port.*busy',
            'permission_denied': r'permission denied|access denied',
            'resource_exhausted': r'no space left|out of memory'
        }
    
    def classify_error(self, error_message):
        for pattern_name, regex in self.error_patterns.items():
            if re.search(regex, error_message, re.IGNORECASE):
                return pattern_name
        return 'unknown_error'
    
    def resolve_error(self, error_type, context=None):
        resolvers = {
            'usb_device_lost': self._recover_usb_device,
            'port_in_use': self._recover_port_conflict,
            'permission_denied': self._fix_permissions,
            'resource_exhausted': self._cleanup_resources
        }
        return resolvers.get(error_type, self._generic_recovery)(context)
```

## Testing

### 1. Failure Simulation Tests
```bash
# Test systematic recovery
test_error_recovery() {
    echo "Testing HackRF recovery..."
    
    # Simulate USB disconnect
    sudo modprobe -r hackrf
    sleep 2
    
    # Test recovery
    if recover_sdr_service "hackrf"; then
        echo "✓ HackRF recovery successful"
    else
        echo "✗ HackRF recovery failed"
    fi
    
    # Restore driver
    sudo modprobe hackrf
}
```

### 2. Integration Health Tests
```bash
# Test complete system health
test_system_health() {
    echo "Testing system health monitoring..."
    
    diagnose_sdr_system
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✓ System health check passed"
    else
        echo "✗ System health issues detected"
        return 1
    fi
}
```

### 3. Error Pattern Recognition Tests
```python
def test_error_classification():
    resolver = ErrorPatternResolver()
    
    test_cases = [
        ("hackrf_open() failed: HACKRF_ERROR_NOT_FOUND", "usb_device_lost"),
        ("bind: Address already in use", "port_in_use"),
        ("Permission denied: /dev/hackrf", "permission_denied")
    ]
    
    for error_msg, expected_type in test_cases:
        result = resolver.classify_error(error_msg)
        assert result == expected_type, f"Expected {expected_type}, got {result}"
```

## Usage Notes

- Apply this pattern when encountering recurring system failures
- Use diagnostic flow before attempting fixes
- Implement automated recovery for common failure modes
- Log all error patterns and resolutions for continuous improvement
- Test recovery procedures regularly to ensure reliability

## Related Patterns

- Service Health Monitoring
- Graceful Degradation
- Circuit Breaker Pattern
- Bulkhead Isolation
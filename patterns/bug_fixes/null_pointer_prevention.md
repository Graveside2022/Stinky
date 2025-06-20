# Null Pointer Prevention Pattern

## Problem
SDR and IoT applications frequently crash due to null pointer dereferences when hardware is disconnected, services become unavailable, or configuration data is missing. These crashes often occur in production environments where hardware state is unpredictable.

## Solution
Implement defensive programming practices with systematic null checking, safe defaults, and graceful degradation for missing resources.

## Implementation

### 1. Safe Hardware Access Pattern
```python
# Python pattern for safe SDR device access
class SafeSDRDevice:
    def __init__(self, device_path=None):
        self._device = None
        self._device_path = device_path
        self._is_connected = False
    
    def connect(self):
        try:
            if self._device_path and os.path.exists(self._device_path):
                self._device = hackrf.HackRF()
                self._is_connected = True
                return True
        except Exception as e:
            logger.warning(f"Device connection failed: {e}")
            self._device = None
            self._is_connected = False
        return False
    
    def safe_read(self, default_value=None):
        if not self._is_connected or self._device is None:
            logger.debug("Device not connected, returning default")
            return default_value
        
        try:
            return self._device.read_samples()
        except Exception as e:
            logger.error(f"Device read failed: {e}")
            self._is_connected = False
            return default_value
    
    def __enter__(self):
        self.connect()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._device:
            try:
                self._device.close()
            except:
                pass
        self._device = None
```

### 2. Configuration Safe Access
```javascript
// Node.js pattern for safe configuration access
class SafeConfig {
    constructor(configPath) {
        this.config = {};
        this.defaults = {
            sdr: {
                frequency: 145000000,
                sample_rate: 2400000,
                gain: 35
            },
            network: {
                port: 8092,
                host: 'localhost'
            },
            paths: {
                data_dir: './data',
                log_dir: './logs'
            }
        };
        this.loadConfig(configPath);
    }
    
    loadConfig(configPath) {
        try {
            if (fs.existsSync(configPath)) {
                const rawConfig = fs.readFileSync(configPath, 'utf8');
                this.config = JSON.parse(rawConfig);
                console.log(`✓ Config loaded from ${configPath}`);
            } else {
                console.warn(`⚠ Config file not found: ${configPath}, using defaults`);
                this.config = {};
            }
        } catch (error) {
            console.error(`✗ Config parsing failed: ${error.message}, using defaults`);
            this.config = {};
        }
    }
    
    get(keyPath, defaultValue = null) {
        const keys = keyPath.split('.');
        let current = this.config;
        
        // Traverse config object safely
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                // Fall back to defaults
                current = this.getDefault(keyPath);
                break;
            }
        }
        
        return current !== undefined ? current : defaultValue;
    }
    
    getDefault(keyPath) {
        const keys = keyPath.split('.');
        let current = this.defaults;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return null;
            }
        }
        
        return current;
    }
}
```

### 3. Service Dependency Safe Access
```bash
# Bash pattern for safe service interaction
safe_service_call() {
    local service_name=$1
    local service_url=$2
    local timeout=${3:-5}
    local retries=${4:-3}
    
    if [ -z "$service_name" ] || [ -z "$service_url" ]; then
        echo "✗ Invalid service parameters"
        return 1
    fi
    
    for attempt in $(seq 1 $retries); do
        if timeout "$timeout" curl -sf "$service_url" >/dev/null 2>&1; then
            echo "✓ $service_name responded"
            return 0
        fi
        
        echo "⚠ $service_name attempt $attempt/$retries failed"
        [ $attempt -lt $retries ] && sleep 2
    done
    
    echo "✗ $service_name unavailable after $retries attempts"
    return 1
}

# Safe GPS data access
get_gps_coordinates() {
    local gps_service="http://localhost:2947"
    local default_lat=${DEFAULT_LAT:-"0.0"}
    local default_lon=${DEFAULT_LON:-"0.0"}
    
    if safe_service_call "GPSD" "$gps_service/status"; then
        local gps_data=$(timeout 3 gpspipe -w -n 1 2>/dev/null | jq -r '.lat, .lon' 2>/dev/null)
        
        if [ -n "$gps_data" ] && [ "$gps_data" != "null" ]; then
            echo "$gps_data"
        else
            echo "$default_lat $default_lon"
        fi
    else
        echo "$default_lat $default_lon"
    fi
}
```

### 4. Memory Safe Operations
```c
// C pattern for safe memory operations in SDR processing
typedef struct {
    double *samples;
    size_t length;
    size_t capacity;
} safe_buffer_t;

safe_buffer_t* safe_buffer_create(size_t initial_capacity) {
    if (initial_capacity == 0) {
        return NULL;
    }
    
    safe_buffer_t *buffer = malloc(sizeof(safe_buffer_t));
    if (!buffer) {
        return NULL;
    }
    
    buffer->samples = calloc(initial_capacity, sizeof(double));
    if (!buffer->samples) {
        free(buffer);
        return NULL;
    }
    
    buffer->length = 0;
    buffer->capacity = initial_capacity;
    return buffer;
}

int safe_buffer_append(safe_buffer_t *buffer, double sample) {
    if (!buffer || !buffer->samples) {
        return -1;
    }
    
    if (buffer->length >= buffer->capacity) {
        // Safe resize
        size_t new_capacity = buffer->capacity * 2;
        double *new_samples = realloc(buffer->samples, new_capacity * sizeof(double));
        if (!new_samples) {
            return -1; // Resize failed, original buffer intact
        }
        buffer->samples = new_samples;
        buffer->capacity = new_capacity;
    }
    
    buffer->samples[buffer->length++] = sample;
    return 0;
}

void safe_buffer_destroy(safe_buffer_t *buffer) {
    if (buffer) {
        if (buffer->samples) {
            free(buffer->samples);
        }
        free(buffer);
    }
}
```

## Testing

### 1. Null Injection Tests
```python
def test_null_safety():
    """Test handling of null/missing resources"""
    
    # Test device disconnection
    with SafeSDRDevice("/dev/nonexistent") as device:
        result = device.safe_read(default_value=[])
        assert result == [], "Should return default when device unavailable"
    
    # Test missing configuration
    config = SafeConfig("/nonexistent/config.json")
    freq = config.get("sdr.frequency")
    assert freq == 145000000, "Should return default frequency"
    
    # Test partial configuration
    partial_config = {"sdr": {"frequency": 144000000}}
    config.config = partial_config
    gain = config.get("sdr.gain")
    assert gain == 35, "Should return default gain for missing key"
```

### 2. Resource Exhaustion Tests
```bash
test_resource_limits() {
    echo "Testing resource limit handling..."
    
    # Test memory limit
    ulimit -v 100000  # 100MB virtual memory limit
    
    # Test safe buffer creation under memory pressure
    if ./test_safe_buffer_stress; then
        echo "✓ Safe buffer handles memory pressure"
    else
        echo "✗ Safe buffer failed under memory pressure"
    fi
    
    # Reset limits
    ulimit -v unlimited
}
```

### 3. Service Unavailability Tests
```javascript
async function testServiceDegradation() {
    console.log("Testing service unavailability handling...");
    
    // Simulate GPS service down
    const coords = await getGPSCoordinates();
    console.log(`GPS coordinates (degraded): ${coords}`);
    
    // Should return default coordinates, not crash
    if (coords && coords.lat !== undefined && coords.lon !== undefined) {
        console.log("✓ GPS unavailability handled gracefully");
    } else {
        console.log("✗ GPS unavailability caused null pointer");
    }
}
```

## Usage Notes

- Always check for null/undefined before dereferencing
- Provide sensible defaults for missing configuration
- Use safe wrapper classes for hardware access
- Implement timeout mechanisms for external service calls
- Test null conditions explicitly in unit tests
- Log warnings when using fallback values
- Design for graceful degradation rather than hard failures

## Related Patterns

- Graceful Degradation Pattern  
- Circuit Breaker Pattern
- Default Value Pattern
- Resource Management Pattern
# GPIO Timing Issues Pattern

## Problem
Raspberry Pi GPIO operations often suffer from timing inconsistencies, race conditions, and interference from system processes. This leads to unreliable hardware control and data corruption in time-sensitive applications.

## Solution
Implement proper GPIO timing controls, interrupt handling, and real-time scheduling to ensure reliable hardware interfacing.

## Implementation

### 1. GPIO Timing Control
```python
import RPi.GPIO as GPIO
import time
import threading
from contextlib import contextmanager

class TimingControlledGPIO:
    def __init__(self):
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        self._lock = threading.Lock()
        
    @contextmanager
    def timing_critical_section(self):
        """Disable interrupts for timing-critical operations"""
        import os
        
        # Set high priority for current thread
        old_priority = os.getpriority(os.PRIO_PROCESS, 0)
        try:
            os.setpriority(os.PRIO_PROCESS, 0, -20)  # High priority
            with self._lock:
                yield
        finally:
            os.setpriority(os.PRIO_PROCESS, 0, old_priority)
    
    def precise_pulse(self, pin, duration_us):
        """Generate precise timing pulse"""
        with self.timing_critical_section():
            GPIO.output(pin, GPIO.HIGH)
            # Use busy wait for microsecond precision
            start_time = time.perf_counter()
            while (time.perf_counter() - start_time) < (duration_us / 1_000_000):
                pass
            GPIO.output(pin, GPIO.LOW)
    
    def setup_pin_with_timing(self, pin, direction, pull_up_down=GPIO.PUD_OFF):
        """Setup pin with proper timing considerations"""
        GPIO.setup(pin, direction, pull_up_down=pull_up_down)
        # Allow settling time
        time.sleep(0.001)  # 1ms settling time
```

### 2. Interrupt-Safe GPIO Operations  
```c
// C implementation for critical timing
#include <wiringPi.h>
#include <sys/mman.h>
#include <sched.h>
#include <time.h>

typedef struct {
    int pin;
    int state;
    struct timespec timestamp;
} gpio_event_t;

// Lock memory to prevent paging delays
int setup_realtime_gpio() {
    // Lock all memory
    if (mlockall(MCL_CURRENT | MCL_FUTURE) != 0) {
        perror("mlockall failed");
        return -1;
    }
    
    // Set real-time scheduling
    struct sched_param param;
    param.sched_priority = 99;
    if (sched_setscheduler(0, SCHED_FIFO, &param) != 0) {
        perror("sched_setscheduler failed");
        return -1;
    }
    
    // Initialize wiringPi
    if (wiringPiSetup() == -1) {
        return -1;
    }
    
    return 0;
}

// Precise timing function using nanosleep
void precise_delay_ns(long nanoseconds) {
    struct timespec req, rem;
    req.tv_sec = nanoseconds / 1000000000L;
    req.tv_nsec = nanoseconds % 1000000000L;
    
    while (nanosleep(&req, &rem) == -1) {
        req = rem;  // Continue if interrupted
    }
}

// Atomic GPIO operations with timing
void atomic_pin_sequence(int pin, int *sequence, int *delays_us, int count) {
    int i;
    struct timespec start, end;
    
    // Disable interrupts for sequence
    clock_gettime(CLOCK_MONOTONIC, &start);
    
    for (i = 0; i < count; i++) {
        digitalWrite(pin, sequence[i]);
        if (delays_us[i] > 0) {
            precise_delay_ns(delays_us[i] * 1000);
        }
    }
    
    clock_gettime(CLOCK_MONOTONIC, &end);
    
    // Log timing accuracy
    long actual_ns = (end.tv_sec - start.tv_sec) * 1000000000L + 
                     (end.tv_nsec - start.tv_nsec);
    printf("Sequence completed in %ld ns\n", actual_ns);
}
```

### 3. Debounced Input Handling
```python
class DebouncedGPIOInput:
    def __init__(self, pin, debounce_time_ms=50):
        self.pin = pin
        self.debounce_time = debounce_time_ms / 1000.0
        self.last_change_time = 0
        self.stable_state = None
        self.callbacks = []
        
        GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.add_event_detect(pin, GPIO.BOTH, callback=self._interrupt_handler)
    
    def _interrupt_handler(self, channel):
        """Interrupt handler with debouncing"""
        current_time = time.time()
        current_state = GPIO.input(self.pin)
        
        # Check if enough time has passed since last change
        if (current_time - self.last_change_time) > self.debounce_time:
            if self.stable_state != current_state:
                self.stable_state = current_state
                self.last_change_time = current_time
                
                # Notify callbacks
                for callback in self.callbacks:
                    try:
                        callback(self.pin, current_state)
                    except Exception as e:
                        print(f"Callback error: {e}")
    
    def add_callback(self, callback):
        """Add state change callback"""
        self.callbacks.append(callback)
    
    def get_stable_state(self):
        """Get current stable state"""
        return self.stable_state
```

### 4. System Resource Management
```bash
# Configure system for GPIO timing reliability
configure_gpio_system() {
    echo "Configuring system for GPIO timing..."
    
    # Disable unnecessary services that can cause timing jitter
    sudo systemctl disable bluetooth
    sudo systemctl disable wifi-powersave
    
    # Configure CPU governor for performance
    echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
    
    # Disable swap to prevent timing delays
    sudo swapoff -a
    
    # Configure kernel parameters
    cat << EOF | sudo tee -a /boot/cmdline.txt
isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3
EOF
    
    # Set GPIO memory permissions
    sudo usermod -a -G gpio pi
    sudo chmod 666 /dev/gpiomem
    
    echo "System configured for GPIO timing reliability"
    echo "Reboot required for CPU isolation to take effect"
}

# Real-time process launcher
launch_gpio_process() {
    local binary=$1
    local priority=${2:-99}
    
    # Set CPU affinity to isolated cores
    sudo taskset -c 2,3 chrt -f $priority $binary
}
```

### 5. Timing Validation and Monitoring
```python
class GPIOTimingValidator:
    def __init__(self):
        self.measurements = []
        
    def measure_gpio_latency(self, pin, iterations=1000):
        """Measure GPIO operation latency"""
        GPIO.setup(pin, GPIO.OUT)
        latencies = []
        
        for i in range(iterations):
            start_time = time.perf_counter()
            GPIO.output(pin, GPIO.HIGH)
            GPIO.output(pin, GPIO.LOW)
            end_time = time.perf_counter()
            
            latencies.append((end_time - start_time) * 1_000_000)  # microseconds
        
        return {
            'mean': sum(latencies) / len(latencies),
            'min': min(latencies),
            'max': max(latencies),
            'std_dev': (sum((x - sum(latencies)/len(latencies))**2 for x in latencies) / len(latencies))**0.5
        }
    
    def test_pulse_accuracy(self, pin, target_width_us, iterations=100):
        """Test pulse width accuracy"""
        GPIO.setup(pin, GPIO.OUT)
        measured_widths = []
        
        for i in range(iterations):
            # Generate pulse and measure with oscilloscope simulation
            start_time = time.perf_counter()
            GPIO.output(pin, GPIO.HIGH)
            time.sleep(target_width_us / 1_000_000)
            GPIO.output(pin, GPIO.LOW)
            end_time = time.perf_counter()
            
            measured_width = (end_time - start_time) * 1_000_000
            measured_widths.append(measured_width)
        
        accuracy = {
            'target_us': target_width_us,
            'actual_mean_us': sum(measured_widths) / len(measured_widths),
            'error_us': abs(sum(measured_widths) / len(measured_widths) - target_width_us),
            'error_percent': abs(sum(measured_widths) / len(measured_widths) - target_width_us) / target_width_us * 100
        }
        
        return accuracy
```

## Testing

### 1. Timing Accuracy Tests
```python
def test_gpio_timing_accuracy():
    """Test GPIO timing accuracy"""
    validator = GPIOTimingValidator()
    
    # Test different pulse widths
    test_widths = [1, 10, 100, 1000]  # microseconds
    
    for width_us in test_widths:
        result = validator.test_pulse_accuracy(18, width_us)
        print(f"Pulse width {width_us}μs:")
        print(f"  Actual: {result['actual_mean_us']:.2f}μs")
        print(f"  Error: {result['error_percent']:.2f}%")
        
        # Assert reasonable accuracy
        assert result['error_percent'] < 10, f"Timing error too high: {result['error_percent']:.2f}%"
```

### 2. Race Condition Tests  
```python
def test_gpio_race_conditions():
    """Test for race conditions in GPIO operations"""
    import threading
    
    test_pin = 18
    GPIO.setup(test_pin, GPIO.OUT)
    results = []
    
    def gpio_worker(worker_id):
        for i in range(100):
            GPIO.output(test_pin, GPIO.HIGH)
            time.sleep(0.001)
            state = GPIO.input(test_pin)
            results.append((worker_id, i, state))
            GPIO.output(test_pin, GPIO.LOW)
    
    # Start multiple threads
    threads = []
    for i in range(3):
        t = threading.Thread(target=gpio_worker, args=(i,))
        threads.append(t)
        t.start()
    
    # Wait for completion
    for t in threads:
        t.join()
    
    # Analyze results for race conditions
    print(f"Total GPIO operations: {len(results)}")
    # Check for unexpected states
```

### 3. System Load Impact Tests
```bash
test_gpio_under_load() {
    echo "Testing GPIO timing under system load..."
    
    # Start background load
    stress --cpu 4 --io 4 --vm 2 --vm-bytes 128M --timeout 60s &
    STRESS_PID=$!
    
    # Run GPIO timing test
    python3 -c "
from gpio_timing import GPIOTimingValidator
validator = GPIOTimingValidator()
result = validator.measure_gpio_latency(18)
print(f'Under load - Mean latency: {result[\"mean\"]:.2f}μs')
print(f'Under load - Max latency: {result[\"max\"]:.2f}μs')
"
    
    # Clean up
    kill $STRESS_PID 2>/dev/null
    
    echo "GPIO timing test completed"
}
```

## Usage Notes

- Use real-time scheduling for time-critical GPIO operations
- Implement proper debouncing for input signals
- Validate timing requirements with oscilloscope measurements
- Consider hardware solutions for sub-microsecond timing
- Monitor system load impact on GPIO timing
- Use CPU isolation for dedicated GPIO processing
- Implement fallback strategies for timing-critical operations

## Related Patterns

- Real-time Scheduling Pattern
- Hardware Abstraction Layer Pattern  
- Interrupt Management Pattern
- Resource Locking Pattern
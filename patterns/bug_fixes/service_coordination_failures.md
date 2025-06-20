# Service Coordination Failures Pattern

## Problem
Multi-service SDR systems (GPS, Kismet, OpenWebRX, WigleToTAK) often fail due to startup order dependencies, port conflicts, resource contention, and communication timeouts between services.

## Solution
Implement service orchestration with dependency management, health checks, and graceful failure handling to ensure reliable multi-service coordination.

## Implementation

### 1. Service Dependency Management
```python
import asyncio
import aiohttp
import logging
from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Optional

class ServiceStatus(Enum):
    STOPPED = "stopped"
    STARTING = "starting" 
    RUNNING = "running"
    FAILING = "failing"
    FAILED = "failed"

@dataclass
class ServiceConfig:
    name: str
    start_command: str
    health_check_url: str
    dependencies: List[str]
    startup_timeout: int = 30
    health_check_interval: int = 10
    max_retries: int = 3

class ServiceOrchestrator:
    def __init__(self):
        self.services = {}
        self.service_status = {}
        self.logger = logging.getLogger(__name__)
        
    def register_service(self, config: ServiceConfig):
        """Register a service with its configuration"""
        self.services[config.name] = config
        self.service_status[config.name] = ServiceStatus.STOPPED
        
    async def start_service(self, service_name: str) -> bool:
        """Start a service with dependency checking"""
        if service_name not in self.services:
            self.logger.error(f"Unknown service: {service_name}")
            return False
            
        config = self.services[service_name]
        
        # Check dependencies first
        for dep in config.dependencies:
            if not await self.ensure_service_running(dep):
                self.logger.error(f"Dependency {dep} failed for {service_name}")
                return False
        
        # Start the service
        self.service_status[service_name] = ServiceStatus.STARTING
        
        try:
            process = await asyncio.create_subprocess_shell(
                config.start_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Wait for startup with timeout
            try:
                await asyncio.wait_for(
                    self._wait_for_health_check(service_name),
                    timeout=config.startup_timeout
                )
                self.service_status[service_name] = ServiceStatus.RUNNING
                self.logger.info(f"Service {service_name} started successfully")
                return True
                
            except asyncio.TimeoutError:
                self.logger.error(f"Service {service_name} startup timeout")
                self.service_status[service_name] = ServiceStatus.FAILED
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to start {service_name}: {e}")
            self.service_status[service_name] = ServiceStatus.FAILED
            return False
    
    async def _wait_for_health_check(self, service_name: str):
        """Wait for service to pass health check"""
        config = self.services[service_name]
        
        while True:
            if await self._check_service_health(service_name):
                return
            await asyncio.sleep(1)
    
    async def _check_service_health(self, service_name: str) -> bool:
        """Check if service is healthy"""
        config = self.services[service_name]
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(config.health_check_url) as response:
                    return response.status == 200
        except Exception:
            return False
    
    async def ensure_service_running(self, service_name: str) -> bool:
        """Ensure a service is running, start if necessary"""
        if self.service_status.get(service_name) == ServiceStatus.RUNNING:
            if await self._check_service_health(service_name):
                return True
            else:
                self.logger.warning(f"Service {service_name} health check failed")
                self.service_status[service_name] = ServiceStatus.FAILING
        
        return await self.start_service(service_name)
```

### 2. Startup Sequence Orchestration
```bash
#!/bin/bash
# Coordinated startup script for SDR services

set -e

LOG_FILE="/var/log/sdr_startup.log"
PID_DIR="/var/run/sdr"
STARTUP_TIMEOUT=60

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

create_pid_dir() {
    sudo mkdir -p "$PID_DIR"
    sudo chown pi:pi "$PID_DIR"
}

wait_for_service() {
    local service_name=$1
    local health_url=$2
    local timeout=${3:-30}
    local interval=2
    local elapsed=0
    
    log_message "Waiting for $service_name to become ready..."
    
    while [ $elapsed -lt $timeout ]; do
        if curl -sf "$health_url" >/dev/null 2>&1; then
            log_message "$service_name is ready"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log_message "Timeout waiting for $service_name"
    return 1
}

start_gpsd() {
    log_message "Starting GPSD..."
    
    # Check if GPS device is available
    if [ ! -e /dev/ttyUSB0 ]; then
        log_message "GPS device not found, skipping GPSD"
        return 1
    fi
    
    sudo systemctl start gpsd
    
    # Wait for GPSD to be ready
    if wait_for_service "GPSD" "http://localhost:2947/status" 10; then
        echo $! > "$PID_DIR/gpsd.pid"
        return 0
    else
        log_message "GPSD startup failed"
        return 1
    fi
}

start_kismet() {
    log_message "Starting Kismet..."
    
    # Check WiFi interface availability
    if ! ip link show wlan1 >/dev/null 2>&1; then
        log_message "WiFi interface wlan1 not found"
        return 1
    fi
    
    # Start Kismet in background
    kismet --daemonize --silent \
           --override=server.capture_source=wlan1 \
           --override=server.log_prefix=/home/pi/data/kismet/ &
    
    KISMET_PID=$!
    echo $KISMET_PID > "$PID_DIR/kismet.pid"
    
    if wait_for_service "Kismet" "http://localhost:2501/system/status.json" 30; then
        return 0
    else
        log_message "Kismet startup failed"
        kill $KISMET_PID 2>/dev/null
        return 1
    fi
}

start_openwebrx() {
    log_message "Starting OpenWebRX..."
    
    # Check HackRF availability
    if ! hackrf_info >/dev/null 2>&1; then
        log_message "HackRF not detected, skipping OpenWebRX"
        return 1
    fi
    
    # Start OpenWebRX container
    docker-compose up -d openwebrx
    
    if wait_for_service "OpenWebRX" "http://localhost:8073/status" 45; then
        return 0
    else
        log_message "OpenWebRX startup failed"
        docker-compose stop openwebrx
        return 1
    fi
}

start_wigletotak() {
    log_message "Starting WigleToTAK..."
    
    # Ensure Kismet is running first
    if ! pgrep -f kismet >/dev/null; then
        log_message "Kismet not running, cannot start WigleToTAK"
        return 1
    fi
    
    cd /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK
    source venv/bin/activate
    
    python3 WigleToTak2.py --background &
    WIGLE_PID=$!
    echo $WIGLE_PID > "$PID_DIR/wigletotak.pid"
    
    if wait_for_service "WigleToTAK" "http://localhost:8000/health" 20; then
        return 0
    else
        log_message "WigleToTAK startup failed"
        kill $WIGLE_PID 2>/dev/null
        return 1
    fi
}

# Main startup sequence
main() {
    log_message "Starting SDR service orchestration..."
    create_pid_dir
    
    # Start services in dependency order
    SERVICES_SUCCESS=0
    
    # Layer 1: Base services
    if start_gpsd; then
        ((SERVICES_SUCCESS++))
    fi
    
    # Layer 2: Hardware-dependent services
    if start_openwebrx; then
        ((SERVICES_SUCCESS++))
    fi
    
    if start_kismet; then
        ((SERVICES_SUCCESS++))
    fi
    
    # Layer 3: Integration services
    if start_wigletotak; then
        ((SERVICES_SUCCESS++))
    fi
    
    log_message "Startup complete: $SERVICES_SUCCESS services started"
    
    if [ $SERVICES_SUCCESS -eq 0 ]; then
        log_message "No services started successfully"
        exit 1
    fi
}

# Signal handlers for graceful shutdown
cleanup() {
    log_message "Shutting down services..."
    
    # Stop in reverse order
    [ -f "$PID_DIR/wigletotak.pid" ] && kill "$(cat "$PID_DIR/wigletotak.pid")" 2>/dev/null
    [ -f "$PID_DIR/kismet.pid" ] && kill "$(cat "$PID_DIR/kismet.pid")" 2>/dev/null
    
    docker-compose stop openwebrx 2>/dev/null
    sudo systemctl stop gpsd 2>/dev/null
    
    rm -f "$PID_DIR"/*.pid
    log_message "Shutdown complete"
}

trap cleanup EXIT SIGTERM SIGINT

main "$@"
```

### 3. Health Monitoring and Recovery
```python
class ServiceHealthMonitor:
    def __init__(self, orchestrator: ServiceOrchestrator):
        self.orchestrator = orchestrator
        self.monitoring = False
        self.logger = logging.getLogger(__name__)
        
    async def start_monitoring(self):
        """Start continuous health monitoring"""
        self.monitoring = True
        
        while self.monitoring:
            for service_name, config in self.orchestrator.services.items():
                try:
                    if self.orchestrator.service_status[service_name] == ServiceStatus.RUNNING:
                        if not await self.orchestrator._check_service_health(service_name):
                            self.logger.warning(f"Service {service_name} health check failed")
                            await self._handle_service_failure(service_name)
                            
                except Exception as e:
                    self.logger.error(f"Health monitoring error for {service_name}: {e}")
            
            await asyncio.sleep(10)  # Check every 10 seconds
    
    async def _handle_service_failure(self, service_name: str):
        """Handle service failure with recovery attempts"""
        config = self.orchestrator.services[service_name]
        
        if self.orchestrator.service_status[service_name] == ServiceStatus.FAILING:
            # Already handling failure
            return
            
        self.orchestrator.service_status[service_name] = ServiceStatus.FAILING
        
        for attempt in range(config.max_retries):
            self.logger.info(f"Recovery attempt {attempt + 1} for {service_name}")
            
            if await self.orchestrator.start_service(service_name):
                self.logger.info(f"Service {service_name} recovered successfully")
                return
            
            await asyncio.sleep(5)  # Wait between retries
        
        self.logger.error(f"Service {service_name} recovery failed after {config.max_retries} attempts")
        self.orchestrator.service_status[service_name] = ServiceStatus.FAILED
```

### 4. Resource Conflict Resolution
```python
class ResourceManager:
    def __init__(self):
        self.port_allocations = {}
        self.device_allocations = {}
        self.logger = logging.getLogger(__name__)
    
    def allocate_port(self, service_name: str, port: int) -> bool:
        """Allocate a port to a service"""
        if port in self.port_allocations:
            existing_service = self.port_allocations[port]
            if existing_service != service_name:
                self.logger.error(f"Port {port} already allocated to {existing_service}")
                return False
        
        self.port_allocations[port] = service_name
        self.logger.info(f"Port {port} allocated to {service_name}")
        return True
    
    def allocate_device(self, service_name: str, device_path: str) -> bool:
        """Allocate a device to a service"""
        if device_path in self.device_allocations:
            existing_service = self.device_allocations[device_path]
            if existing_service != service_name:
                self.logger.error(f"Device {device_path} already allocated to {existing_service}")
                return False
        
        self.device_allocations[device_path] = service_name
        self.logger.info(f"Device {device_path} allocated to {service_name}")
        return True
    
    def release_resources(self, service_name: str):
        """Release all resources for a service"""
        # Release ports
        ports_to_remove = [port for port, service in self.port_allocations.items() if service == service_name]
        for port in ports_to_remove:
            del self.port_allocations[port]
            self.logger.info(f"Port {port} released from {service_name}")
        
        # Release devices
        devices_to_remove = [device for device, service in self.device_allocations.items() if service == service_name]
        for device in devices_to_remove:
            del self.device_allocations[device]
            self.logger.info(f"Device {device} released from {service_name}")
```

## Testing

### 1. Dependency Order Testing
```python
async def test_service_dependencies():
    """Test service startup dependency order"""
    orchestrator = ServiceOrchestrator()
    
    # Register services with dependencies
    orchestrator.register_service(ServiceConfig(
        name="gpsd",
        start_command="sudo systemctl start gpsd",
        health_check_url="http://localhost:2947/status",
        dependencies=[]
    ))
    
    orchestrator.register_service(ServiceConfig(
        name="kismet",
        start_command="/home/pi/scripts/start_kismet.sh",
        health_check_url="http://localhost:2501/system/status.json",
        dependencies=["gpsd"]
    ))
    
    # Test dependency violation
    try:
        await orchestrator.start_service("kismet")
        # Should fail if gpsd is not running
    except Exception as e:
        print(f"Expected dependency failure: {e}")
```

### 2. Failure Recovery Testing
```bash
test_service_recovery() {
    echo "Testing service recovery..."
    
    # Start services
    ./start_sdr_services.sh
    
    # Simulate failures
    echo "Simulating Kismet failure..."
    pkill -f kismet
    
    # Wait for recovery
    sleep 30
    
    # Check if service recovered
    if pgrep -f kismet >/dev/null; then
        echo "✓ Kismet recovery successful"
    else
        echo "✗ Kismet recovery failed"
    fi
}
```

### 3. Resource Conflict Testing
```python
def test_resource_conflicts():
    """Test resource conflict detection"""
    rm = ResourceManager()
    
    # Test port allocation
    assert rm.allocate_port("service1", 8080) == True
    assert rm.allocate_port("service2", 8080) == False  # Should fail
    
    # Test device allocation
    assert rm.allocate_device("kismet", "/dev/wlan1") == True
    assert rm.allocate_device("monitor", "/dev/wlan1") == False  # Should fail
    
    # Test resource release
    rm.release_resources("service1")
    assert rm.allocate_port("service2", 8080) == True  # Should succeed now
```

## Usage Notes

- Define clear service dependencies and startup order
- Implement comprehensive health checks for all services
- Use resource managers to prevent conflicts  
- Implement exponential backoff for service recovery
- Monitor service coordination metrics
- Provide manual override mechanisms for debugging
- Test failure scenarios regularly

## Related Patterns

- Circuit Breaker Pattern
- Health Check Pattern
- Resource Pool Pattern
- Graceful Degradation Pattern
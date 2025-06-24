# Dual Parallel Agent Configuration Pattern

## Pattern Overview

This pattern defines the configuration and coordination of parallel processing agents for SDR data
analysis, spectrum monitoring, and real-time signal processing in resource-constrained environments.

## Problem Statement

SDR systems require:

- Simultaneous processing of multiple frequency bands
- Real-time analysis of spectrum data while maintaining responsiveness
- Efficient resource utilization on Raspberry Pi hardware
- Coordination between signal detection and data processing agents

## Solution Architecture

### Agent Types and Responsibilities

```python
class AgentType:
    SPECTRUM_ANALYZER = "spectrum_analyzer"
    SIGNAL_DETECTOR = "signal_detector"
    DATA_PROCESSOR = "data_processor"
    FREQUENCY_SCANNER = "frequency_scanner"
    THRESHOLD_MONITOR = "threshold_monitor"
    WEBSOCKET_HANDLER = "websocket_handler"

class AgentConfiguration:
    def __init__(self, agent_type, priority, resources):
        self.type = agent_type
        self.priority = priority  # 1-10, 10 being highest
        self.cpu_cores = resources.get('cpu_cores', 1)
        self.memory_limit = resources.get('memory_mb', 256)
        self.queue_size = resources.get('queue_size', 1000)
```

### Dual Agent Architecture Pattern

```python
# Primary-Secondary Agent Configuration
class DualAgentManager:
    def __init__(self):
        self.primary_agents = {}
        self.secondary_agents = {}
        self.shared_queue = asyncio.Queue(maxsize=5000)

    def configure_dual_agents(self, task_type):
        """Configure primary and secondary agents for specific tasks"""
        if task_type == "spectrum_analysis":
            # Primary: Real-time FFT processing
            self.primary_agents['spectrum'] = SpectrumAgent(
                priority=9,
                fft_size=1024,
                update_rate=50,  # 50Hz updates
                websocket_enabled=True
            )

            # Secondary: Signal detection and alerting
            self.secondary_agents['detector'] = SignalDetectorAgent(
                priority=7,
                threshold=-70,  # dBm
                scan_bandwidth=2.4e6,  # 2.4 MHz
                alert_enabled=True
            )

        elif task_type == "kismet_monitoring":
            # Primary: WiFi packet capture
            self.primary_agents['kismet'] = KismetAgent(
                priority=8,
                interface='wlan2',
                capture_rate=100,  # packets per second
                storage_path='/data/kismet'
            )

            # Secondary: Data processing and conversion
            self.secondary_agents['converter'] = WigleConverterAgent(
                priority=6,
                input_format='kismet',
                output_format='tak',
                batch_size=50
            )
```

### Agent Coordination Patterns

```python
class AgentCoordinator:
    def __init__(self):
        self.agents = {}
        self.communication_bus = asyncio.Queue()
        self.resource_monitor = ResourceMonitor()

    async def coordinate_agents(self):
        """Main coordination loop for parallel agents"""
        while True:
            # Check system resources
            cpu_usage = self.resource_monitor.get_cpu_usage()
            memory_usage = self.resource_monitor.get_memory_usage()

            # Adjust agent priorities based on resources
            if cpu_usage > 80:
                await self.throttle_secondary_agents()
            elif cpu_usage < 40:
                await self.boost_secondary_agents()

            # Coordinate data flow between agents
            await self.process_inter_agent_messages()

            await asyncio.sleep(0.1)  # 100ms coordination cycle

    async def throttle_secondary_agents(self):
        """Reduce secondary agent activity under high load"""
        for agent_name, agent in self.secondary_agents.items():
            agent.reduce_processing_rate(0.5)

    async def boost_secondary_agents(self):
        """Increase secondary agent activity under low load"""
        for agent_name, agent in self.secondary_agents.items():
            agent.increase_processing_rate(1.5)
```

### WebSocket Agent Pattern

```javascript
// Client-side agent coordination for real-time updates
class WebSocketAgentManager {
  constructor() {
    this.agents = new Map();
    this.connectionPool = new Map();
    this.messageRouter = new MessageRouter();
  }

  createDualWebSocketAgents(config) {
    // Primary agent: Real-time spectrum data
    const spectrumAgent = new WebSocketAgent({
      url: 'ws://localhost:8092/spectrum',
      reconnect: true,
      priority: 'high',
      bufferSize: 1000,
      onMessage: (data) => this.handleSpectrumData(data),
    });

    // Secondary agent: Kismet status updates
    const kismetAgent = new WebSocketAgent({
      url: 'ws://localhost:8002/kismet',
      reconnect: true,
      priority: 'medium',
      bufferSize: 500,
      onMessage: (data) => this.handleKismetData(data),
    });

    this.agents.set('spectrum', spectrumAgent);
    this.agents.set('kismet', kismetAgent);

    // Configure cross-agent communication
    this.setupAgentCommunication();
  }

  setupAgentCommunication() {
    // Spectrum agent alerts trigger Kismet frequency focusing
    this.messageRouter.route('spectrum.signal_detected', 'kismet', (data) => {
      return {
        action: 'focus_frequency',
        frequency: data.frequency,
        bandwidth: data.bandwidth,
      };
    });
  }
}
```

### Resource-Aware Agent Scheduling

```python
class ResourceAwareScheduler:
    def __init__(self, max_cpu_usage=75, max_memory_usage=80):
        self.max_cpu = max_cpu_usage
        self.max_memory = max_memory_usage
        self.agent_queue = asyncio.PriorityQueue()

    async def schedule_agents(self):
        """Schedule agents based on resource availability"""
        while True:
            current_resources = await self.get_system_resources()

            if self.can_run_agent(current_resources):
                try:
                    priority, agent_task = await asyncio.wait_for(
                        self.agent_queue.get(), timeout=0.1
                    )

                    # Run agent task with resource monitoring
                    await self.run_agent_with_monitoring(agent_task)

                except asyncio.TimeoutError:
                    pass

            await asyncio.sleep(0.05)  # 50ms scheduling cycle

    def can_run_agent(self, resources):
        return (resources['cpu'] < self.max_cpu and
                resources['memory'] < self.max_memory)

    async def run_agent_with_monitoring(self, agent_task):
        """Run agent with resource monitoring and limits"""
        start_time = time.time()
        start_resources = await self.get_system_resources()

        try:
            await agent_task.execute()
        except Exception as e:
            logger.error(f"Agent task failed: {e}")
        finally:
            execution_time = time.time() - start_time
            end_resources = await self.get_system_resources()

            # Log resource usage for optimization
            self.log_resource_usage(agent_task, start_resources,
                                  end_resources, execution_time)
```

### Configuration Management

```json
{
  "dual_agent_config": {
    "spectrum_analysis": {
      "primary_agent": {
        "type": "spectrum_analyzer",
        "priority": 9,
        "resources": {
          "cpu_cores": 2,
          "memory_mb": 512,
          "fft_size": 1024
        },
        "websocket": {
          "port": 8092,
          "update_rate_hz": 50
        }
      },
      "secondary_agent": {
        "type": "signal_detector",
        "priority": 7,
        "resources": {
          "cpu_cores": 1,
          "memory_mb": 256
        },
        "detection": {
          "threshold_dbm": -70,
          "scan_bandwidth_hz": 2400000
        }
      }
    },
    "resource_limits": {
      "max_cpu_usage_percent": 75,
      "max_memory_usage_percent": 80,
      "coordination_cycle_ms": 100
    }
  }
}
```

### Performance Monitoring

```python
class AgentPerformanceMonitor:
    def __init__(self):
        self.metrics = {}
        self.alert_thresholds = {
            'cpu_usage': 85,
            'memory_usage': 90,
            'queue_depth': 1000,
            'processing_lag_ms': 500
        }

    def monitor_agent_performance(self, agent_name, metrics):
        """Monitor individual agent performance"""
        self.metrics[agent_name] = {
            'timestamp': time.time(),
            'cpu_usage': metrics['cpu'],
            'memory_usage': metrics['memory'],
            'queue_depth': metrics['queue_depth'],
            'processing_rate': metrics['processing_rate'],
            'error_rate': metrics['error_rate']
        }

        # Check for performance issues
        self.check_performance_alerts(agent_name, metrics)

    def check_performance_alerts(self, agent_name, metrics):
        """Generate alerts for performance issues"""
        for metric, threshold in self.alert_thresholds.items():
            if metrics.get(metric, 0) > threshold:
                logger.warning(f"Agent {agent_name} {metric} exceeded threshold: "
                             f"{metrics[metric]} > {threshold}")
```

## Benefits

- **Parallel Processing**: Simultaneous handling of multiple data streams
- **Resource Efficiency**: Optimal utilization of Raspberry Pi resources
- **Real-time Performance**: Low latency data processing and response
- **Fault Tolerance**: Agent isolation prevents cascading failures
- **Adaptive Performance**: Dynamic resource allocation based on system load

## Usage Context

- Real-time SDR signal processing systems
- Multi-frequency spectrum monitoring applications
- Resource-constrained Raspberry Pi deployments
- Systems requiring both real-time and batch processing capabilities

## Related Patterns

- Producer-Consumer Pattern (for data flow between agents)
- Circuit Breaker Pattern (for agent fault tolerance)
- Resource Pool Pattern (for shared resource management)
- Event-Driven Architecture (for agent coordination)

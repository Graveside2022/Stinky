# Microservice Architecture Pattern for SDR Systems

## Pattern Overview

This pattern defines the microservice architecture used in the stinkster SDR system, focusing on
service separation, inter-service communication, and container orchestration.

## Problem Statement

Complex SDR systems require:

- Isolated service boundaries for HackRF, Kismet, GPS, and web interfaces
- Independent scaling and deployment of components
- Fault isolation between services
- Clean API boundaries between Python and Node.js services

## Solution Architecture

### Core Services

```yaml
services:
  # SDR Web Interface (OpenWebRX)
  openwebrx:
    technology: Docker Container
    port: 8073
    purpose: Web-based SDR receiver interface

  # Spectrum Analysis Service
  spectrum-analyzer:
    technology: Python Flask + SocketIO
    port: 8092
    purpose: Real-time spectrum analysis with WebSocket feeds

  # WiFi Operations Center
  kismet-operations:
    technology: Node.js Express + Socket.IO
    port: 8002
    purpose: Kismet management and WiFi monitoring dashboard

  # WigleToTAK Service
  wigle-to-tak:
    technology: Node.js Express
    port: 8000
    purpose: WiFi data conversion to TAK format

  # GPS Bridge Service
  gps-bridge:
    technology: Python MAVLink
    port: 14550
    purpose: MAVLink to GPSD bridge
```

### Service Communication Patterns

#### WebSocket Integration

```javascript
// Real-time data streaming between services
const spectrumsocket = new WebSocket('ws://localhost:8092/spectrum');
const kismetSocket = new WebSocket('ws://localhost:8002/kismet');

// Cross-service event forwarding
spectrumsocket.on('signal_detected', (data) => {
  kismetSocket.emit('spectrum_alert', {
    frequency: data.frequency,
    strength: data.power,
    timestamp: data.timestamp,
  });
});
```

#### REST API Inter-service Communication

```python
# Service health checks and data exchange
def check_service_health(service_port):
    try:
        response = requests.get(f'http://localhost:{service_port}/health')
        return response.status_code == 200
    except:
        return False

# Cross-service data sharing
def forward_gps_data(gps_data):
    requests.post('http://localhost:8002/api/gps/update', json=gps_data)
    requests.post('http://localhost:8000/api/location/update', json=gps_data)
```

### Container Orchestration Pattern

```yaml
# Docker Compose service coordination
services:
  openwebrx:
    depends_on:
      - spectrum-analyzer
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8073']

  spectrum-analyzer:
    environment:
      - OPENWEBRX_WS_URL=ws://openwebrx:8073/ws/

  kismet-operations:
    volumes:
      - ./data/kismet:/data/kismet:ro
    depends_on:
      - gps-bridge
```

## Implementation Guidelines

### Service Boundary Definition

```python
# Each service should have clear responsibility boundaries
class ServiceBoundary:
    def __init__(self, service_name, port, responsibilities):
        self.name = service_name
        self.port = port
        self.responsibilities = responsibilities
        self.health_endpoint = f'/health'
        self.api_prefix = f'/api/v1'
```

### Error Handling and Circuit Breaker

```javascript
// Implement circuit breaker pattern for service resilience
class ServiceCircuitBreaker {
  constructor(service_url, failure_threshold = 5) {
    this.service_url = service_url;
    this.failure_count = 0;
    this.failure_threshold = failure_threshold;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async callService(endpoint, data) {
    if (this.state === 'OPEN') {
      throw new Error(`Service ${this.service_url} is down`);
    }

    try {
      const response = await fetch(`${this.service_url}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      this.failure_count = 0;
      this.state = 'CLOSED';
      return response;
    } catch (error) {
      this.failure_count++;
      if (this.failure_count >= this.failure_threshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}
```

### Service Discovery Pattern

```python
# Simple service registry for dynamic service discovery
class ServiceRegistry:
    def __init__(self):
        self.services = {}

    def register_service(self, name, host, port, health_check_path='/health'):
        self.services[name] = {
            'host': host,
            'port': port,
            'url': f'http://{host}:{port}',
            'health_check': f'http://{host}:{port}{health_check_path}'
        }

    def get_service(self, name):
        return self.services.get(name)

    def is_service_healthy(self, name):
        service = self.get_service(name)
        if not service:
            return False

        try:
            response = requests.get(service['health_check'], timeout=5)
            return response.status_code == 200
        except:
            return False
```

## Configuration Management

```json
{
  "services": {
    "openwebrx": {
      "port": 8073,
      "container": true,
      "dependencies": []
    },
    "spectrum-analyzer": {
      "port": 8092,
      "technology": "python-flask",
      "dependencies": ["openwebrx"]
    },
    "kismet-operations": {
      "port": 8002,
      "technology": "nodejs-express",
      "dependencies": ["gps-bridge"]
    }
  },
  "communication": {
    "websocket_enabled": true,
    "rest_api_enabled": true,
    "circuit_breaker_enabled": true
  }
}
```

## Benefits

- **Isolation**: Services can fail independently without affecting others
- **Scalability**: Individual services can be scaled based on demand
- **Technology Diversity**: Python for signal processing, Node.js for web interfaces
- **Maintainability**: Clear service boundaries reduce complexity
- **Testability**: Services can be tested in isolation

## Usage Context

- Multi-component SDR systems with diverse technology stacks
- Systems requiring real-time data streaming between components
- Raspberry Pi deployments with resource constraints
- Applications needing fault tolerance and service isolation

## Related Patterns

- Event-Driven Architecture (for real-time data flow)
- Circuit Breaker Pattern (for service resilience)
- API Gateway Pattern (for external access)
- Service Registry Pattern (for dynamic discovery)

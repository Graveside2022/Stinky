# Cross Project Deployment Pattern

## Pattern Overview
This pattern defines deployment strategies for SDR systems across multiple Raspberry Pi nodes, development environments, and production scenarios with different hardware configurations and service requirements.

## Problem Statement
SDR systems need to be deployed across:
- Multiple Raspberry Pi devices with varying hardware capabilities
- Development, staging, and production environments
- Different network configurations and access patterns
- Heterogeneous hardware setups (different SDR devices, GPS modules, WiFi adapters)

## Solution Architecture

### Environment-Specific Deployment Configurations
```yaml
# Base deployment configuration
apiVersion: v1
kind: DeploymentConfig
metadata:
  name: stinkster-sdr-deployment
spec:
  environments:
    development:
      hardware_profile: "rpi4_dev"
      services:
        - openwebrx
        - spectrum-analyzer
        - development-dashboard
      resource_limits:
        cpu: "2000m"
        memory: "2Gi"
      
    staging:
      hardware_profile: "rpi4_staging"
      services:
        - openwebrx
        - spectrum-analyzer
        - kismet-operations
        - wigle-to-tak
      resource_limits:
        cpu: "3000m"
        memory: "4Gi"
        
    production:
      hardware_profile: "rpi4_production"
      services:
        - openwebrx
        - spectrum-analyzer
        - kismet-operations
        - wigle-to-tak
        - gps-bridge
        - monitoring-dashboard
      resource_limits:
        cpu: "3500m"
        memory: "6Gi"
```

### Hardware Profile Management
```python
class HardwareProfile:
    def __init__(self, profile_name):
        self.profile_name = profile_name
        self.hardware_config = self.load_hardware_config()
        
    def load_hardware_config(self):
        """Load hardware-specific configuration"""
        profiles = {
            'rpi4_dev': {
                'cpu_cores': 4,
                'memory_gb': 4,
                'sdr_devices': ['hackrf'],
                'wifi_adapters': ['wlan1'],
                'gps_available': False,
                'storage_gb': 32
            },
            'rpi4_staging': {
                'cpu_cores': 4,
                'memory_gb': 8,
                'sdr_devices': ['hackrf', 'rtlsdr'],
                'wifi_adapters': ['wlan1', 'wlan2'],
                'gps_available': True,
                'storage_gb': 64
            },
            'rpi4_production': {
                'cpu_cores': 4,
                'memory_gb': 8,
                'sdr_devices': ['hackrf', 'rtlsdr', 'bladerf'],
                'wifi_adapters': ['wlan1', 'wlan2', 'wlan3'],
                'gps_available': True,
                'storage_gb': 128,
                'external_storage': True
            }
        }
        return profiles.get(self.profile_name, {})
        
    def get_service_configuration(self, service_name):
        """Get service configuration based on hardware profile"""
        config_map = {
            'openwebrx': self.configure_openwebrx(),
            'spectrum-analyzer': self.configure_spectrum_analyzer(),
            'kismet-operations': self.configure_kismet(),
            'wigle-to-tak': self.configure_wigle_to_tak(),
            'gps-bridge': self.configure_gps_bridge()
        }
        return config_map.get(service_name, {})
```

### Multi-Node Deployment Strategy
```python
class MultiNodeDeployment:
    def __init__(self, deployment_config):
        self.config = deployment_config
        self.nodes = {}
        self.service_mesh = ServiceMesh()
        
    def deploy_across_nodes(self, node_list):
        """Deploy services across multiple Raspberry Pi nodes"""
        for node_id, node_config in node_list.items():
            self.nodes[node_id] = {
                'ip_address': node_config['ip'],
                'hardware_profile': node_config['profile'],
                'services': self.assign_services_to_node(node_config)
            }
            
        # Setup service mesh for inter-node communication
        self.setup_service_mesh()
        
    def assign_services_to_node(self, node_config):
        """Assign services based on node capabilities"""
        profile = HardwareProfile(node_config['profile'])
        assigned_services = []
        
        # Core services (required on all nodes)
        assigned_services.extend(['openwebrx', 'spectrum-analyzer'])
        
        # Optional services based on hardware
        if profile.hardware_config.get('gps_available'):
            assigned_services.append('gps-bridge')
            
        if len(profile.hardware_config.get('wifi_adapters', [])) > 1:
            assigned_services.append('kismet-operations')
            
        if profile.hardware_config.get('storage_gb', 0) > 64:
            assigned_services.append('data-archival')
            
        return assigned_services
        
    def setup_service_mesh(self):
        """Configure service mesh for inter-node communication"""
        for node_id, node_config in self.nodes.items():
            # Register node services in service mesh
            for service in node_config['services']:
                self.service_mesh.register_service(
                    service_name=service,
                    node_id=node_id,
                    endpoint=f"http://{node_config['ip_address']}"
                )
```

### Docker Compose Multi-Environment Pattern
```yaml
# docker-compose.base.yml
version: '3.8'
services:
  openwebrx:
    image: openwebrx-hackrf-only:latest
    container_name: openwebrx
    restart: unless-stopped
    environment:
      - OPENWEBRX_ADMIN_USER=${OPENWEBRX_USER:-admin}
      - OPENWEBRX_ADMIN_PASSWORD=${OPENWEBRX_PASSWORD:-hackrf}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8073"]
      interval: 30s
      timeout: 10s
      retries: 3

---
# docker-compose.dev.yml
version: '3.8'
services:
  openwebrx:
    extends:
      file: docker-compose.base.yml
      service: openwebrx
    ports:
      - "8073:8073"
    volumes:
      - ./config/dev:/var/lib/openwebrx
      
  spectrum-analyzer:
    build:
      context: ./src/hackrf
      dockerfile: Dockerfile.dev
    ports:
      - "8092:8092"
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug

---
# docker-compose.prod.yml
version: '3.8'
services:
  openwebrx:
    extends:
      file: docker-compose.base.yml
      service: openwebrx
    ports:
      - "8073:8073"
    volumes:
      - ./config/prod:/var/lib/openwebrx
      - openwebrx-data:/data
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '1.0'
          memory: 512M
          
  spectrum-analyzer:
    build:
      context: ./src/hackrf
      dockerfile: Dockerfile.prod
    ports:
      - "8092:8092"
    environment:
      - DEBUG=false
      - LOG_LEVEL=info
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 512M
```

### Configuration Management Across Environments
```python
class CrossEnvironmentConfig:
    def __init__(self, base_config_path):
        self.base_config = self.load_base_config(base_config_path)
        self.environment_configs = {}
        
    def load_environment_config(self, environment):
        """Load environment-specific configuration"""
        config_file = f"config/{environment}/config.json"
        with open(config_file, 'r') as f:
            env_config = json.load(f)
            
        # Merge with base configuration
        merged_config = self.merge_configs(self.base_config, env_config)
        
        # Apply environment-specific transformations
        if environment == 'production':
            merged_config = self.apply_production_hardening(merged_config)
        elif environment == 'development':
            merged_config = self.apply_development_features(merged_config)
            
        return merged_config
        
    def apply_production_hardening(self, config):
        """Apply production-specific security and performance settings"""
        config['security'] = {
            'authentication_required': True,
            'rate_limiting_enabled': True,
            'ssl_enabled': True,
            'cors_restricted': True
        }
        
        config['performance'] = {
            'caching_enabled': True,
            'compression_enabled': True,
            'monitoring_enabled': True,
            'log_level': 'warn'
        }
        
        return config
        
    def apply_development_features(self, config):
        """Apply development-specific features"""
        config['development'] = {
            'hot_reload_enabled': True,
            'debug_mode': True,
            'cors_permissive': True,
            'log_level': 'debug'
        }
        
        return config
```

### Automated Deployment Pipeline
```bash
#!/bin/bash
# deploy.sh - Cross-environment deployment script

set -e

ENVIRONMENT=${1:-development}
TARGET_NODES=${2:-"node1"}
DEPLOYMENT_CONFIG="config/${ENVIRONMENT}/deployment.yml"

echo "Starting deployment to ${ENVIRONMENT} environment"

# Validate environment
if [[ ! -f "$DEPLOYMENT_CONFIG" ]]; then
    echo "Error: Deployment configuration not found for $ENVIRONMENT"
    exit 1
fi

# Load deployment configuration
source "config/${ENVIRONMENT}/env.sh"

# Deploy to each target node
IFS=',' read -ra NODES <<< "$TARGET_NODES"
for node in "${NODES[@]}"; do
    echo "Deploying to node: $node"
    
    # Get node configuration
    NODE_CONFIG=$(jq -r ".nodes.${node}" "$DEPLOYMENT_CONFIG")
    NODE_IP=$(echo "$NODE_CONFIG" | jq -r '.ip')
    NODE_PROFILE=$(echo "$NODE_CONFIG" | jq -r '.profile')
    
    # Copy deployment files
    rsync -av --exclude='.git' \
        --exclude='node_modules' \
        --exclude='venv' \
        ./ "pi@${NODE_IP}:/home/pi/stinkster/"
    
    # Run remote deployment
    ssh "pi@${NODE_IP}" "cd /home/pi/stinkster && ./scripts/deploy-node.sh ${ENVIRONMENT} ${NODE_PROFILE}"
    
    # Verify deployment
    if ! ssh "pi@${NODE_IP}" "cd /home/pi/stinkster && ./scripts/health-check.sh"; then
        echo "Error: Deployment verification failed for node $node"
        exit 1
    fi
    
    echo "Successfully deployed to node: $node"
done

echo "Deployment to $ENVIRONMENT environment completed successfully"
```

### Service Discovery and Load Balancing
```python
class CrossProjectServiceDiscovery:
    def __init__(self):
        self.service_registry = {}
        self.load_balancer = LoadBalancer()
        
    def register_project_services(self, project_name, services):
        """Register services from a project deployment"""
        self.service_registry[project_name] = {}
        
        for service_name, service_config in services.items():
            self.service_registry[project_name][service_name] = {
                'endpoints': service_config['endpoints'],
                'health_check': service_config['health_check'],
                'load_balancing': service_config.get('load_balancing', 'round_robin')
            }
            
    def get_service_endpoint(self, project_name, service_name):
        """Get best available endpoint for a service"""
        if project_name not in self.service_registry:
            return None
            
        service_config = self.service_registry[project_name].get(service_name)
        if not service_config:
            return None
            
        return self.load_balancer.get_endpoint(service_config)
        
    def health_check_all_services(self):
        """Perform health checks on all registered services"""
        for project_name, services in self.service_registry.items():
            for service_name, service_config in services.items():
                for endpoint in service_config['endpoints']:
                    health_status = self.check_service_health(endpoint)
                    if not health_status:
                        self.handle_unhealthy_service(project_name, service_name, endpoint)
```

## Benefits
- **Environment Consistency**: Standardized deployment across dev, staging, and production
- **Hardware Adaptation**: Automatic configuration based on available hardware
- **Scalability**: Easy addition of new nodes and services
- **Reliability**: Health checking and automatic failover
- **Maintainability**: Centralized configuration management

## Usage Context
- Multi-node Raspberry Pi SDR deployments
- Development teams with multiple environments
- Production systems requiring high availability
- Mixed hardware configurations
- Distributed SDR sensor networks

## Related Patterns
- Blue-Green Deployment (for zero-downtime updates)
- Service Mesh Pattern (for inter-service communication)
- Configuration Management Pattern (for environment-specific settings)
- Health Check Pattern (for service monitoring)
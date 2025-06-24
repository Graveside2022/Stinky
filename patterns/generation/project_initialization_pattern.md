# Project Initialization Pattern

## Trigger Conditions

- First-time project setup
- "boot", "setup", "startup" commands
- Fresh environment initialization
- Development environment setup
- System recovery after major changes

## Template Structure

### Project Initialization Sequence

```bash
#!/bin/bash
# Stinkster Project Initialization Template

# 1. ENVIRONMENT VALIDATION
validate_environment() {
    echo "=== STINKSTER PROJECT INITIALIZATION ==="

    # Check required tools
    command -v python3 >/dev/null 2>&1 || { echo "python3 required"; exit 1; }
    command -v node >/dev/null 2>&1 || { echo "node.js required"; exit 1; }
    command -v docker >/dev/null 2>&1 || { echo "docker required"; exit 1; }

    # Check hardware
    lsusb | grep -i hackrf >/dev/null || echo "WARNING: HackRF not detected"
    iwconfig 2>/dev/null | grep -i monitor >/dev/null || echo "WARNING: No monitor mode interfaces"

    # Check permissions
    groups $USER | grep -q docker || echo "WARNING: User not in docker group"

    echo "Environment validation complete"
}

# 2. DIRECTORY STRUCTURE INITIALIZATION
init_directory_structure() {
    echo "=== CREATING DIRECTORY STRUCTURE ==="

    # Core directories
    mkdir -p {patterns,memory,tests,logs,tmp,backups}
    mkdir -p {config,scripts,docs,reports}
    mkdir -p src/{hackrf,wigletotak,gpsmav,orchestration,nodejs}

    # Patterns subdirectories
    mkdir -p patterns/{generation,bug_fixes,refactoring,architecture}

    # Memory system
    mkdir -p memory

    # Service-specific directories
    mkdir -p data/kismet
    mkdir -p docker/config
    mkdir -p systemd

    echo "Directory structure created"
}

# 3. CONFIGURATION INITIALIZATION
init_configurations() {
    echo "=== INITIALIZING CONFIGURATIONS ==="

    # Docker Compose base
    if [ ! -f docker-compose.yml ]; then
        cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  openwebrx:
    image: jakestreambox/openwebrx:latest
    container_name: openwebrx
    ports:
      - "8073:8073"
    volumes:
      - ./docker/config:/var/lib/openwebrx
    environment:
      - OPENWEBRX_ADMIN_USER=admin
      - OPENWEBRX_ADMIN_PASSWORD=hackrf
    restart: unless-stopped
EOF
    fi

    # Base configuration
    if [ ! -f config.json ]; then
        cat > config.json << 'EOF'
{
    "sdr": {
        "frequency": 145000000,
        "sample_rate": 2400000,
        "gain": 35
    },
    "services": {
        "hackrf_port": 8092,
        "openwebrx_port": 8073,
        "wigletotak_port": 8000,
        "kismet_port": 2501,
        "gps_port": 2947
    },
    "interfaces": {
        "wifi_monitor": "wlan2",
        "gps_device": "/dev/ttyUSB0"
    }
}
EOF
    fi

    echo "Base configurations created"
}

# 4. VIRTUAL ENVIRONMENT SETUP
init_virtual_environments() {
    echo "=== SETTING UP VIRTUAL ENVIRONMENTS ==="

    # HackRF spectrum analyzer
    if [ ! -d src/hackrf/venv ]; then
        cd src/hackrf
        python3 -m venv venv
        source venv/bin/activate
        pip install flask flask-socketio numpy matplotlib scipy
        deactivate
        cd ../..
    fi

    # GPS MAV bridge
    if [ ! -d src/gpsmav/venv ]; then
        cd src/gpsmav
        python3 -m venv venv
        source venv/bin/activate
        pip install pymavlink pyserial
        deactivate
        cd ../..
    fi

    # WigleToTAK
    if [ ! -d src/wigletotak/venv ]; then
        cd src/wigletotak
        python3 -m venv venv
        source venv/bin/activate
        pip install flask requests
        deactivate
        cd ../..
    fi

    echo "Virtual environments created"
}

# 5. NODE.JS SERVICES SETUP
init_nodejs_services() {
    echo "=== SETTING UP NODE.JS SERVICES ==="

    # Main package.json
    if [ ! -f package.json ]; then
        cat > package.json << 'EOF'
{
  "name": "stinkster",
  "version": "1.0.0",
  "description": "SDR + WiFi + GPS + TAK Integration Platform",
  "main": "src/nodejs/app.js",
  "scripts": {
    "start": "node src/nodejs/app.js",
    "dev": "nodemon src/nodejs/app.js",
    "test": "jest",
    "lint": "eslint src/nodejs/"
  },
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.45.0"
  }
}
EOF
        npm install
    fi

    echo "Node.js services initialized"
}

# 6. SYSTEMD SERVICE TEMPLATES
init_systemd_services() {
    echo "=== CREATING SYSTEMD SERVICE TEMPLATES ==="

    # Spectrum analyzer service
    cat > systemd/spectrum-analyzer.service << 'EOF'
[Unit]
Description=HackRF Spectrum Analyzer
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/projects/stinkster_malone/stinkster/src/hackrf
ExecStart=/home/pi/projects/stinkster_malone/stinkster/src/hackrf/venv/bin/python spectrum_analyzer.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # WigleToTAK service
    cat > systemd/wigle-to-tak.service << 'EOF'
[Unit]
Description=WigleToTAK Converter
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/projects/stinkster_malone/stinkster/src/wigletotak
ExecStart=/home/pi/projects/stinkster_malone/stinkster/src/wigletotak/venv/bin/python WigleToTak2.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    echo "Systemd service templates created"
}
```

### Service Initialization Templates

#### Flask App Template

```python
# Flask App Generator Template
def generate_flask_app(app_name, port, features=None):
    """Generate Flask application with stinkster-specific features"""

    features = features or []

    app_template = f"""
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import json
import logging
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'stinkster-{app_name}-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load configuration
def load_config():
    config_path = os.path.join(os.path.dirname(__file__), '../../config.json')
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning("Config file not found, using defaults")
        return {{}}

config = load_config()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status')
def status():
    return jsonify({{
        'service': '{app_name}',
        'status': 'running',
        'port': {port},
        'features': {features}
    }})

@app.route('/api/config')
def get_config():
    return jsonify(config)

@socketio.on('connect')
def handle_connect():
    logger.info('Client connected to {app_name}')
    emit('status', {{'message': 'Connected to {app_name}'}})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected from {app_name}')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port={port}, debug=True)
"""

    return app_template
```

#### SDR Integration Template

```python
# SDR Service Integration Template
def generate_sdr_integration():
    """Generate SDR integration service"""

    return """
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal
import threading
import queue
import time

class SDRIntegration:
    def __init__(self, config):
        self.config = config
        self.data_queue = queue.Queue()
        self.is_running = False

    def start_capture(self):
        '''Start SDR data capture'''
        self.is_running = True
        capture_thread = threading.Thread(target=self._capture_loop)
        capture_thread.start()

    def _capture_loop(self):
        '''Main capture loop'''
        while self.is_running:
            # Simulate SDR data capture
            samples = np.random.complex128(1024)
            self.data_queue.put(samples)
            time.sleep(0.1)

    def get_spectrum_data(self):
        '''Get spectrum analysis data'''
        if not self.data_queue.empty():
            samples = self.data_queue.get()
            freqs, psd = signal.periodogram(samples, fs=self.config['sample_rate'])
            return freqs.tolist(), psd.tolist()
        return [], []
"""
```

## Validation Steps

### 1. Environment Validation

```bash
# System requirements check
python3 --version
node --version
docker --version
docker-compose --version

# Hardware detection
lsusb | grep -i hackrf
iwconfig 2>/dev/null | grep -i monitor
```

### 2. Directory Structure Validation

```bash
# Check required directories exist
test -d patterns/generation || echo "FAIL: patterns/generation missing"
test -d memory || echo "FAIL: memory directory missing"
test -d src/hackrf || echo "FAIL: hackrf source missing"
test -d src/nodejs || echo "FAIL: nodejs source missing"
```

### 3. Configuration Validation

```bash
# Validate JSON configurations
python3 -c "import json; json.load(open('config.json'))" || echo "FAIL: config.json invalid"
docker-compose config || echo "FAIL: docker-compose.yml invalid"
```

### 4. Service Validation

```bash
# Test virtual environments
source src/hackrf/venv/bin/activate && python -c "import flask" && deactivate
source src/gpsmav/venv/bin/activate && python -c "import pymavlink" && deactivate
cd src/nodejs && npm test
```

## Integration Points

### Memory System Integration

- Initialize SESSION_CONTINUITY.md
- Create memory/error_patterns.md
- Setup memory/learning_archive.md

### Pattern System Integration

- Load existing patterns from patterns/
- Validate pattern structure
- Initialize pattern application tracking

### Service Orchestration Integration

- Setup service dependency tracking
- Initialize process management
- Configure service health monitoring

## Pattern Application

### When to Apply

1. **Fresh Installation**: Complete project setup
2. **Environment Reset**: After major system changes
3. **Development Setup**: New developer onboarding
4. **System Recovery**: After corruption or failure

### Application Process

1. Run environment validation
2. Create directory structure
3. Initialize configurations
4. Setup virtual environments
5. Initialize Node.js services
6. Create systemd services
7. Validate complete setup

### Success Criteria

- All required directories exist
- Configuration files are valid
- Virtual environments are functional
- Node.js services install successfully
- Systemd services are properly configured
- Basic functionality tests pass

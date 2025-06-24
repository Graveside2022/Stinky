#!/bin/bash
# HackRF Spectrum Analyzer Deployment Script
# Handles deployment, configuration, and service management

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="/opt/hackrf-spectrum"
SERVICE_NAME="hackrf-spectrum"
CONFIG_FILE="$DEPLOY_DIR/config.json"
LOG_DIR="/var/log/hackrf-spectrum"
OPENWEBRX_URL="ws://localhost:8073/ws/"

# Deployment parameters
DEPLOY_MODE="${1:-deploy}"  # deploy, configure, status, restart
CONFIG_ENV="${2:-production}"  # production, development, test

# Logging
LOG_FILE="$LOG_DIR/deploy.log"
mkdir -p "$LOG_DIR"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log "${RED}This script must be run as root${NC}"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "${RED}Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check OpenWebRX connection
    if ! curl -sf http://localhost:8073 > /dev/null 2>&1; then
        log "${YELLOW}Warning: OpenWebRX not responding on port 8073${NC}"
        log "HackRF spectrum analyzer will attempt to connect when OpenWebRX is available"
    fi
    
    # Check HackRF hardware
    if command -v hackrf_info &> /dev/null; then
        if hackrf_info > /dev/null 2>&1; then
            log "${GREEN}HackRF hardware detected${NC}"
        else
            log "${YELLOW}Warning: HackRF hardware not detected${NC}"
        fi
    fi
    
    log "${GREEN}Prerequisites check completed${NC}"
}

# Create configuration file
create_config() {
    local env="$1"
    log "${YELLOW}Creating configuration for environment: $env${NC}"
    
    mkdir -p "$DEPLOY_DIR"
    
    case "$env" in
        production)
            cat > "$CONFIG_FILE" <<EOF
{
  "spectrum": {
    "fft_size": 4096,
    "center_freq": 145000000,
    "samp_rate": 2400000,
    "signal_threshold": -70,
    "fft_compression": "none",
    "openwebrx_url": "$OPENWEBRX_URL"
  },
  "server": {
    "port": 8092,
    "host": "0.0.0.0",
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:3001", "http://localhost:8073"]
    }
  },
  "websocket": {
    "reconnect": true,
    "reconnectAttempts": 10,
    "reconnectDelay": 2000,
    "messageRateLimit": 30
  },
  "performance": {
    "maxBufferSize": 1000,
    "bufferCleanupThreshold": 500,
    "signalHistorySize": 100
  },
  "logging": {
    "level": "info",
    "file": "$LOG_DIR/spectrum-analyzer.log",
    "maxSize": "10m",
    "maxFiles": 5
  }
}
EOF
            ;;
        development)
            cat > "$CONFIG_FILE" <<EOF
{
  "spectrum": {
    "fft_size": 1024,
    "center_freq": 145000000,
    "samp_rate": 2400000,
    "signal_threshold": -70,
    "fft_compression": "none",
    "openwebrx_url": "$OPENWEBRX_URL"
  },
  "server": {
    "port": 8092,
    "host": "localhost",
    "cors": {
      "enabled": true,
      "origins": ["*"]
    }
  },
  "websocket": {
    "reconnect": true,
    "reconnectAttempts": 5,
    "reconnectDelay": 1000,
    "messageRateLimit": 60
  },
  "performance": {
    "maxBufferSize": 2000,
    "bufferCleanupThreshold": 1000,
    "signalHistorySize": 200
  },
  "logging": {
    "level": "debug",
    "file": "$LOG_DIR/spectrum-analyzer.log",
    "console": true
  }
}
EOF
            ;;
        test)
            cat > "$CONFIG_FILE" <<EOF
{
  "spectrum": {
    "fft_size": 256,
    "center_freq": 145000000,
    "samp_rate": 1000000,
    "signal_threshold": -60,
    "fft_compression": "none",
    "openwebrx_url": "ws://localhost:8073/ws/"
  },
  "server": {
    "port": 8093,
    "host": "localhost"
  },
  "websocket": {
    "reconnect": false,
    "messageRateLimit": 100
  },
  "performance": {
    "maxBufferSize": 100,
    "bufferCleanupThreshold": 50,
    "signalHistorySize": 10
  },
  "logging": {
    "level": "error",
    "console": true
  }
}
EOF
            ;;
    esac
    
    # Set permissions
    chmod 644 "$CONFIG_FILE"
    chown pi:pi "$CONFIG_FILE"
    
    log "${GREEN}Configuration created: $CONFIG_FILE${NC}"
}

# Create systemd service
create_service() {
    log "${YELLOW}Creating systemd service...${NC}"
    
    cat > "/etc/systemd/system/$SERVICE_NAME.service" <<EOF
[Unit]
Description=HackRF Spectrum Analyzer Service
Documentation=https://github.com/stinkster/hackrf-spectrum
After=network.target openwebrx.service
Wants=openwebrx.service

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=$PROJECT_ROOT
Environment="NODE_ENV=production"
Environment="CONFIG_FILE=$CONFIG_FILE"
ExecStart=/usr/bin/node $PROJECT_ROOT/hackrf-spectrum-server.js
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/spectrum.log
StandardError=append:$LOG_DIR/spectrum-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LOG_DIR $DEPLOY_DIR

# Resource limits
MemoryLimit=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log "${GREEN}Systemd service created and enabled${NC}"
}

# Deploy HackRF spectrum analyzer
deploy() {
    log "${BLUE}Deploying HackRF Spectrum Analyzer${NC}"
    
    check_prerequisites
    
    # Create directories
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$LOG_DIR"
    
    # Create configuration
    create_config "$CONFIG_ENV"
    
    # Create/update service
    create_service
    
    # Create server wrapper if needed
    if [ ! -f "$PROJECT_ROOT/hackrf-spectrum-server.js" ]; then
        log "${YELLOW}Creating server wrapper...${NC}"
        cat > "$PROJECT_ROOT/hackrf-spectrum-server.js" <<'EOF'
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const SpectrumAnalyzer = require('./lib/spectrumCore');
const fs = require('fs');
const path = require('path');

// Load configuration
const configFile = process.env.CONFIG_FILE || '/opt/hackrf-spectrum/config.json';
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

// Create Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Create spectrum analyzer instance
const analyzer = new SpectrumAnalyzer(config.spectrum);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS configuration
if (config.server.cors && config.server.cors.enabled) {
    const cors = require('cors');
    app.use(cors({
        origin: config.server.cors.origins || true,
        credentials: true
    }));
}

// API Routes
app.get('/api/hackrf/status', (req, res) => {
    res.json(analyzer.getStatus());
});

app.get('/api/hackrf/config', (req, res) => {
    res.json(analyzer.config);
});

app.post('/api/hackrf/config', (req, res) => {
    try {
        analyzer.updateConfig(req.body);
        res.json({ success: true, config: analyzer.config });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/hackrf/signals', (req, res) => {
    const threshold = req.query.threshold ? parseFloat(req.query.threshold) : null;
    const signals = analyzer.detectSignals(threshold);
    res.json({ signals, count: signals.length, timestamp: Date.now() });
});

app.get('/api/hackrf/stats', (req, res) => {
    res.json(analyzer.getSignalStats());
});

// WebSocket handling
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    
    // Send initial status
    ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        config: analyzer.config
    }));
    
    // Handle client messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.action) {
                case 'updateConfig':
                    analyzer.updateConfig(data.config);
                    break;
                case 'clearBuffer':
                    analyzer.clearBuffer();
                    break;
                case 'getStatus':
                    ws.send(JSON.stringify({
                        type: 'status',
                        data: analyzer.getStatus()
                    }));
                    break;
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// Forward analyzer events to WebSocket clients
let messageCounter = 0;
const messageInterval = 1000 / (config.websocket.messageRateLimit || 30);
let lastMessageTime = 0;

analyzer.on('fftData', (data) => {
    const now = Date.now();
    if (now - lastMessageTime >= messageInterval) {
        const message = JSON.stringify({
            type: 'fftData',
            data: data,
            sequence: messageCounter++
        });
        
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
        
        lastMessageTime = now;
    }
});

analyzer.on('signalsDetected', (data) => {
    const message = JSON.stringify({
        type: 'signalsDetected',
        data: data
    });
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

analyzer.on('connected', (data) => {
    console.log('Connected to OpenWebRX:', data);
});

analyzer.on('disconnected', (data) => {
    console.log('Disconnected from OpenWebRX:', data);
});

analyzer.on('error', (error) => {
    console.error('Analyzer error:', error);
});

// Start server
const port = config.server.port || 8092;
const host = config.server.host || 'localhost';

server.listen(port, host, () => {
    console.log(\`HackRF Spectrum Analyzer running on http://\${host}:\${port}\`);
    
    // Connect to OpenWebRX
    analyzer.connectToOpenWebRX(config.spectrum.openwebrx_url)
        .then(() => {
            console.log('Attempting to connect to OpenWebRX...');
        })
        .catch((error) => {
            console.error('Failed to connect to OpenWebRX:', error);
        });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    analyzer.disconnect();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
EOF
        chmod +x "$PROJECT_ROOT/hackrf-spectrum-server.js"
    fi
    
    # Set permissions
    chown -R pi:pi "$DEPLOY_DIR"
    chown -R pi:pi "$LOG_DIR"
    
    # Start service
    log "${YELLOW}Starting HackRF spectrum service...${NC}"
    systemctl start "$SERVICE_NAME"
    
    # Wait for startup
    sleep 3
    
    # Check status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "${GREEN}HackRF spectrum analyzer deployed successfully!${NC}"
        show_status
    else
        log "${RED}Service failed to start${NC}"
        journalctl -u "$SERVICE_NAME" -n 50 --no-pager
        exit 1
    fi
}

# Show service status
show_status() {
    log "${BLUE}HackRF Spectrum Analyzer Status${NC}"
    log "========================================"
    
    # Service status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "${GREEN}Service: Active${NC}"
    else
        log "${RED}Service: Inactive${NC}"
    fi
    
    # Configuration
    if [ -f "$CONFIG_FILE" ]; then
        log "\n${YELLOW}Configuration:${NC}"
        jq -r '.spectrum | to_entries[] | "  \(.key): \(.value)"' "$CONFIG_FILE"
    fi
    
    # API health check
    if curl -sf "http://localhost:8092/api/hackrf/status" > /dev/null 2>&1; then
        log "\n${GREEN}API: Responding${NC}"
        local status=$(curl -s "http://localhost:8092/api/hackrf/status")
        echo "$status" | jq -r '. | to_entries[] | "  \(.key): \(.value)"' 2>/dev/null || echo "$status"
    else
        log "\n${RED}API: Not responding${NC}"
    fi
    
    # Logs
    log "\n${YELLOW}Recent logs:${NC}"
    if [ -f "$LOG_DIR/spectrum.log" ]; then
        tail -n 10 "$LOG_DIR/spectrum.log"
    else
        journalctl -u "$SERVICE_NAME" -n 10 --no-pager
    fi
}

# Configure service
configure() {
    log "${YELLOW}Reconfiguring HackRF spectrum analyzer...${NC}"
    
    create_config "$CONFIG_ENV"
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "Restarting service with new configuration..."
        systemctl restart "$SERVICE_NAME"
        sleep 2
        show_status
    else
        log "Service not running, configuration updated"
    fi
}

# Restart service
restart_service() {
    log "${YELLOW}Restarting HackRF spectrum analyzer...${NC}"
    
    systemctl restart "$SERVICE_NAME"
    sleep 2
    show_status
}

# Main execution
case "$DEPLOY_MODE" in
    deploy)
        deploy
        ;;
    configure)
        configure
        ;;
    status)
        show_status
        ;;
    restart)
        restart_service
        ;;
    *)
        log "Usage: $0 {deploy|configure|status|restart} [production|development|test]"
        exit 1
        ;;
esac
#!/bin/bash

# Canary Deployment Script
# Deploys new services alongside existing ones for gradual rollout

set -euo pipefail

# Configuration
PROJECT_ROOT="/home/pi/projects/stinkster_christian/stinkster"
NODEJS_DIR="$PROJECT_ROOT/src/nodejs"
LOG_FILE="/var/log/stinkster-migration/canary-deployment.log"
PID_FILE="/var/run/stinkster-canary.pid"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
    log "SUCCESS: $1"
}

info() {
    echo -e "${BLUE}INFO: $1${NC}"
    log "INFO: $1"
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
    log "WARNING: $1"
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log "=== Starting Canary Deployment ==="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    warning "Running as root - switching to pi user for Node.js services"
    SUDO_USER="pi"
    RUN_AS="sudo -u pi"
else
    RUN_AS=""
fi

# Step 1: Verify legacy services are running
info "Verifying legacy services..."

# Check Python services
LEGACY_SERVICES=(
    "WigleToTak2.py:8000"
    "spectrum_analyzer.py:8092"
)

for service in "${LEGACY_SERVICES[@]}"; do
    process_name="${service%:*}"
    port="${service#*:}"
    
    if pgrep -f "$process_name" > /dev/null; then
        success "$process_name is running"
    else
        warning "$process_name is not running - legacy service may be down"
    fi
    
    if netstat -tuln | grep -q ":$port "; then
        success "Port $port is listening"
    else
        warning "Port $port is not listening"
    fi
done

# Step 2: Build Node.js services
info "Building Node.js services..."

cd "$NODEJS_DIR"

# Install dependencies
if [ -f "package.json" ]; then
    info "Installing dependencies..."
    $RUN_AS npm ci --production || error "Failed to install dependencies"
fi

# Build TypeScript if needed
if [ -f "tsconfig.json" ]; then
    info "Building TypeScript..."
    $RUN_AS npm run build || warning "TypeScript build failed - continuing with existing JS"
fi

# Step 3: Configure environment
info "Configuring environment..."

# Create canary environment file
cat > "$NODEJS_DIR/.env.canary" <<EOF
# Canary Deployment Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Service Ports (non-conflicting with legacy)
WIGLE_PORT=3002
HACKRF_PORT=3003
KISMET_OPS_PORT=3004

# External Services
KISMET_HOST=localhost
KISMET_PORT=2501
GPSD_HOST=localhost
GPSD_PORT=2947

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Canary Specific
DEPLOYMENT_TYPE=canary
DEPLOYMENT_ID=$(date +%s)
EOF

# Step 4: Start Node.js services
info "Starting Node.js services in canary mode..."

# Start main orchestrator service
cd "$NODEJS_DIR"
$RUN_AS NODE_ENV=production node app.js > /var/log/stinkster-canary.log 2>&1 &
MAIN_PID=$!
echo $MAIN_PID > "$PID_FILE"

sleep 5

# Verify service started
if kill -0 $MAIN_PID 2>/dev/null; then
    success "Main Node.js service started (PID: $MAIN_PID)"
else
    error "Failed to start main Node.js service"
fi

# Start sub-services
SERVICES=(
    "kismet-operations:3004"
    "wigle-to-tak:3002"
)

for service_spec in "${SERVICES[@]}"; do
    service_name="${service_spec%:*}"
    service_port="${service_spec#*:}"
    service_dir="$NODEJS_DIR/$service_name"
    
    if [ -d "$service_dir" ]; then
        info "Starting $service_name on port $service_port..."
        cd "$service_dir"
        $RUN_AS PORT=$service_port node index.js > "/var/log/stinkster-$service_name.log" 2>&1 &
        service_pid=$!
        echo "$service_pid" > "/var/run/stinkster-$service_name.pid"
        
        sleep 3
        
        if kill -0 $service_pid 2>/dev/null; then
            success "$service_name started (PID: $service_pid)"
        else
            warning "Failed to start $service_name"
        fi
    fi
done

# Step 5: Verify services are responding
info "Verifying service health..."

sleep 5

# Check main service
if curl -s -f http://localhost:3001/health > /dev/null; then
    success "Main service health check passed"
else
    warning "Main service health check failed"
fi

# Step 6: Configure monitoring
info "Setting up monitoring..."

# Create monitoring configuration
cat > "$PROJECT_ROOT/src/cutover/configs/monitoring-canary.json" <<EOF
{
  "services": [
    {
      "name": "nodejs-main",
      "port": 3001,
      "healthEndpoint": "/health",
      "type": "canary"
    },
    {
      "name": "legacy-wigle",
      "port": 8000,
      "healthEndpoint": "/",
      "type": "legacy"
    },
    {
      "name": "legacy-hackrf",
      "port": 8092,
      "healthEndpoint": "/",
      "type": "legacy"
    }
  ],
  "metrics": {
    "interval": 30,
    "retention": 86400
  }
}
EOF

# Step 7: Start monitoring daemon
info "Starting monitoring daemon..."

cat > /tmp/monitor-canary.sh <<'EOF'
#!/bin/bash
while true; do
    # Collect metrics
    timestamp=$(date +%s)
    
    # Check each service
    for port in 3001 8000 8092; do
        if curl -s -f -w "%{http_code},%{time_total}" -o /dev/null http://localhost:$port/health 2>/dev/null; then
            echo "$timestamp,$port,up,$?" >> /var/log/stinkster-monitoring.csv
        else
            echo "$timestamp,$port,down,$?" >> /var/log/stinkster-monitoring.csv
        fi
    done
    
    sleep 30
done
EOF

chmod +x /tmp/monitor-canary.sh
nohup /tmp/monitor-canary.sh > /var/log/stinkster-monitor.log 2>&1 &
MONITOR_PID=$!
echo $MONITOR_PID > /var/run/stinkster-monitor.pid

success "Monitoring daemon started (PID: $MONITOR_PID)"

# Step 8: Summary
echo ""
echo "========================================="
echo "Canary Deployment Complete"
echo "========================================="
echo ""
echo "Services Status:"
echo "---------------"
echo "Legacy Services:"
ps aux | grep -E "WigleToTak2|spectrum_analyzer" | grep -v grep || echo "  No legacy services found"
echo ""
echo "New Services:"
ps aux | grep -E "node.*js" | grep -v grep || echo "  No Node.js services found"
echo ""
echo "Ports:"
echo "------"
netstat -tuln | grep -E ":(3001|3002|3003|3004|8000|8092)" || echo "  No services listening"
echo ""
echo "Next Steps:"
echo "-----------"
echo "1. Configure traffic split: ./configure-traffic-split.sh 10"
echo "2. Monitor metrics: tail -f /var/log/stinkster-monitoring.csv"
echo "3. Check logs: tail -f /var/log/stinkster-*.log"
echo "4. View dashboard: http://localhost:3001/admin/monitoring"
echo ""

log "Canary deployment completed successfully"
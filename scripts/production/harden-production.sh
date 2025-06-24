#!/bin/bash

# Production Hardening Script for Stinkster Node.js Services
# This script applies security hardening for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check if in correct directory
check_directory() {
    if [[ ! -f "package.json" ]] || [[ ! -d "src/nodejs" ]]; then
        error "Please run this script from the Stinkster project root directory"
    fi
}

# Install production security dependencies
install_security_dependencies() {
    log "Installing production security dependencies..."
    
    local deps=(
        "express-rate-limit"
        "express-basic-auth" 
        "express-mongo-sanitize"
        "xss"
        "hpp"
        "express-validator"
    )
    
    cd src/nodejs/spectrum-analyzer
    for dep in "${deps[@]}"; do
        if ! npm list "$dep" >/dev/null 2>&1; then
            log "Installing $dep..."
            npm install "$dep"
        else
            log "$dep already installed"
        fi
    done
    
    success "Security dependencies installed"
}

# Create production environment file template
create_production_env() {
    log "Creating production environment template..."
    
    local env_file="production.env.template"
    
    cat > "$env_file" << 'EOF'
# Production Environment Configuration for Stinkster Node.js Services
# Copy to .env and configure for your environment

# Node Environment
NODE_ENV=production

# Security Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/stinkster
LOG_CONSOLE=false

# Service Ports (default values)
SPECTRUM_PORT=8092
WIGLE_TO_TAK_PORT=8000
GPS_BRIDGE_PORT=2947
HEALTH_CHECK_PORT=9000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
STRICT_RATE_LIMIT_MAX=10

# OpenWebRX Integration
OPENWEBRX_URL=http://localhost:8073
OPENWEBRX_WS_URL=ws://localhost:8073/ws/

# TAK Server Configuration
TAK_SERVER_IP=0.0.0.0
TAK_SERVER_PORT=6969
TAK_MULTICAST_GROUP=239.2.3.1

# GPS Configuration
MAVLINK_CONNECTION=tcp:localhost:14550
GPSD_DEVICE_PATH=mavlink

# Performance Configuration
MEMORY_LIMIT_MB=512
CPU_THRESHOLD=80
MONITOR_INTERVAL=30000

# SSL/TLS Configuration (when using reverse proxy)
ENABLE_HTTPS=false
SSL_CERT_PATH=/etc/ssl/certs/stinkster.crt
SSL_KEY_PATH=/etc/ssl/private/stinkster.key
EOF

    success "Created $env_file"
    warn "Please copy to .env and configure with your production values"
}

# Configure systemd service for production
configure_systemd_service() {
    log "Configuring systemd service for production..."
    
    local service_file="stinkster-nodejs.service"
    
    cat > "systemd/$service_file" << 'EOF'
[Unit]
Description=Stinkster Node.js Services
Documentation=https://github.com/your-username/stinkster
After=network.target docker.service gpsd.service
Wants=docker.service gpsd.service
RequiresMountsFor=/home/pi/projects/stinkster

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/projects/stinkster
Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin
EnvironmentFile=-/home/pi/projects/stinkster/.env
ExecStart=/usr/local/bin/node src/nodejs/app.js
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=stinkster-nodejs

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/pi/projects/stinkster/logs /home/pi/projects/stinkster/data
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

# Resource limits
LimitNOFILE=65535
MemoryMax=1G
CPUQuota=200%

# Capability restrictions
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

    success "Created systemd service file: systemd/$service_file"
    warn "To install: sudo cp systemd/$service_file /etc/systemd/system/ && sudo systemctl daemon-reload"
}

# Configure log rotation
configure_log_rotation() {
    log "Configuring log rotation..."
    
    local logrotate_config="stinkster-nodejs"
    
    cat > "config/$logrotate_config" << 'EOF'
/var/log/stinkster/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 pi pi
    postrotate
        systemctl reload stinkster-nodejs > /dev/null 2>&1 || true
    endscript
}
EOF

    success "Created logrotate configuration: config/$logrotate_config"
    warn "To install: sudo cp config/$logrotate_config /etc/logrotate.d/"
}

# Set up log directory with correct permissions
setup_log_directory() {
    log "Setting up log directory..."
    
    local log_dir="/var/log/stinkster"
    
    if [[ ! -d "$log_dir" ]]; then
        sudo mkdir -p "$log_dir"
        sudo chown pi:pi "$log_dir"
        sudo chmod 755 "$log_dir"
        success "Created log directory: $log_dir"
    else
        log "Log directory already exists: $log_dir"
    fi
}

# Configure firewall rules
configure_firewall() {
    log "Generating firewall configuration..."
    
    cat > "config/firewall-rules.sh" << 'EOF'
#!/bin/bash
# Firewall rules for Stinkster Node.js services
# Run as root: sudo ./firewall-rules.sh

# Allow SSH (adjust port if needed)
ufw allow 22/tcp

# Allow Stinkster services
ufw allow 8092/tcp comment 'Stinkster Spectrum Analyzer'
ufw allow 8000/tcp comment 'Stinkster WigleToTAK'
ufw allow 2947/tcp comment 'Stinkster GPS Bridge'
ufw allow 9000/tcp comment 'Stinkster Health Check'

# Allow OpenWebRX
ufw allow 8073/tcp comment 'OpenWebRX'

# Allow TAK multicast (if needed)
# ufw allow 6969/udp comment 'TAK Multicast'

# Enable firewall
ufw --force enable

echo "Firewall configured for Stinkster services"
ufw status verbose
EOF

    chmod +x "config/firewall-rules.sh"
    success "Created firewall configuration: config/firewall-rules.sh"
    warn "Run as root to apply: sudo ./config/firewall-rules.sh"
}

# Create health check script
create_health_check() {
    log "Creating health check script..."
    
    cat > "scripts/health-check.sh" << 'EOF'
#!/bin/bash
# Health check script for Stinkster Node.js services

# Service endpoints
SERVICES=(
    "http://localhost:8092/health:Spectrum Analyzer"
    "http://localhost:8000/health:WigleToTAK"
    "http://localhost:9000/health:Health Check"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

all_healthy=true

echo "=== Stinkster Node.js Services Health Check ==="
echo "Timestamp: $(date)"
echo

for service in "${SERVICES[@]}"; do
    IFS=':' read -r url name <<< "$service"
    
    if curl -s -f "$url" > /dev/null; then
        echo -e "${GREEN}✓${NC} $name: Healthy"
    else
        echo -e "${RED}✗${NC} $name: Unhealthy"
        all_healthy=false
    fi
done

echo

if $all_healthy; then
    echo -e "${GREEN}All services are healthy${NC}"
    exit 0
else
    echo -e "${RED}Some services are unhealthy${NC}"
    exit 1
fi
EOF

    chmod +x "scripts/health-check.sh"
    success "Created health check script: scripts/health-check.sh"
}

# Create monitoring script
create_monitoring_script() {
    log "Creating monitoring script..."
    
    cat > "scripts/monitor.sh" << 'EOF'
#!/bin/bash
# Monitoring script for Stinkster Node.js services

# Check service status
echo "=== Service Status ==="
systemctl status stinkster-nodejs --no-pager -l

echo -e "\n=== Resource Usage ==="
# Memory usage
echo "Memory usage:"
ps aux | grep node | grep -v grep | awk '{print $11 ": " $4 "% memory, " $6 "KB RSS"}'

# Disk usage
echo -e "\nDisk usage:"
df -h /var/log/stinkster /home/pi/projects/stinkster

# Port status
echo -e "\n=== Port Status ==="
netstat -tlnp | grep -E ':(8092|8000|2947|9000)'

# Recent logs
echo -e "\n=== Recent Logs (last 10 lines) ==="
journalctl -u stinkster-nodejs -n 10 --no-pager

# Health check
echo -e "\n=== Health Check ==="
/home/pi/projects/stinkster/scripts/health-check.sh
EOF

    chmod +x "scripts/monitor.sh"
    success "Created monitoring script: scripts/monitor.sh"
}

# Create backup script
create_backup_script() {
    log "Creating backup script..."
    
    cat > "scripts/backup.sh" << 'EOF'
#!/bin/bash
# Backup script for Stinkster configuration and logs

BACKUP_DIR="/home/pi/backups/stinkster"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/stinkster_backup_$DATE.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
tar -czf "$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='logs/*.log' \
    -C /home/pi/projects/stinkster \
    .env \
    config/ \
    src/nodejs/ \
    systemd/ \
    scripts/ \
    package.json

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/stinkster_backup_*.tar.gz | tail -n +11 | xargs -r rm

echo "Backup created: $BACKUP_FILE"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
EOF

    chmod +x "scripts/backup.sh"
    success "Created backup script: scripts/backup.sh"
}

# Create maintenance cron jobs
create_cron_jobs() {
    log "Creating maintenance cron job templates..."
    
    cat > "config/crontab.template" << 'EOF'
# Stinkster Node.js Services Maintenance Cron Jobs
# Add these to your crontab: crontab -e

# Health check every 5 minutes
*/5 * * * * /home/pi/projects/stinkster/scripts/health-check.sh > /dev/null 2>&1 || echo "Stinkster health check failed" | logger

# Daily backup at 2 AM
0 2 * * * /home/pi/projects/stinkster/scripts/backup.sh > /dev/null 2>&1

# Weekly log cleanup at 3 AM on Sundays
0 3 * * 0 find /var/log/stinkster -name "*.log" -mtime +7 -delete

# Monthly service restart for memory cleanup
0 4 1 * * systemctl restart stinkster-nodejs

# Monitor disk usage and alert if > 90%
0 */6 * * * df -h | awk '$5 > 90 {print "High disk usage: " $0}' | logger
EOF

    success "Created cron job template: config/crontab.template"
    warn "Add to crontab manually: crontab -e"
}

# Validate security configuration
validate_security() {
    log "Validating security configuration..."
    
    local issues=()
    
    # Check for .env file
    if [[ ! -f ".env" ]]; then
        issues+=("No .env file found")
    fi
    
    # Check file permissions
    if [[ -f ".env" ]] && [[ "$(stat -c %a .env)" != "600" ]]; then
        issues+=(".env file has incorrect permissions (should be 600)")
    fi
    
    # Check for default passwords
    if grep -q "your_secure_password_here" .env 2>/dev/null; then
        issues+=("Default password found in .env file")
    fi
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | sed 's/v//')
    if [[ "$(printf '%s\n' "14.0.0" "$node_version" | sort -V | head -n1)" != "14.0.0" ]]; then
        issues+=("Node.js version $node_version may be outdated (recommend 14+)")
    fi
    
    if [[ ${#issues[@]} -eq 0 ]]; then
        success "Security validation passed"
    else
        warn "Security issues found:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "  Stinkster Production Hardening Tool  "
    echo "========================================"
    echo
    
    check_root
    check_directory
    
    log "Starting production hardening process..."
    
    # Create directories
    mkdir -p config scripts systemd
    
    # Run hardening steps
    install_security_dependencies
    create_production_env
    configure_systemd_service
    configure_log_rotation
    setup_log_directory
    configure_firewall
    create_health_check
    create_monitoring_script
    create_backup_script
    create_cron_jobs
    
    # Validate configuration
    validate_security
    
    echo
    success "Production hardening completed!"
    echo
    echo "Next steps:"
    echo "1. Copy production.env.template to .env and configure"
    echo "2. Install systemd service: sudo cp systemd/stinkster-nodejs.service /etc/systemd/system/"
    echo "3. Install logrotate config: sudo cp config/stinkster-nodejs /etc/logrotate.d/"
    echo "4. Configure firewall: sudo ./config/firewall-rules.sh"
    echo "5. Add cron jobs: crontab -e (use config/crontab.template)"
    echo "6. Test services: ./scripts/health-check.sh"
    echo
    warn "Review and customize all configuration files before deployment!"
}

# Execute main function
main "$@"
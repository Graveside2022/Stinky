#!/bin/bash

# Traffic Split Configuration Script
# Usage: ./configure-traffic-split.sh <percentage>
# Example: ./configure-traffic-split.sh 10  # Routes 10% to new system

set -euo pipefail

# Configuration
NGINX_CONFIG="/etc/nginx/sites-available/stinkster-migration"
NGINX_UPSTREAM="/etc/nginx/conf.d/stinkster-upstream.conf"
LOG_FILE="/var/log/stinkster-migration/traffic-split.log"
LEGACY_PORT=8000
NEW_PORT=3001

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
    log "WARNING: $1"
}

# Validate input
if [ $# -ne 1 ]; then
    error "Usage: $0 <percentage>"
fi

PERCENTAGE=$1

# Validate percentage
if ! [[ "$PERCENTAGE" =~ ^[0-9]+$ ]] || [ "$PERCENTAGE" -gt 100 ] || [ "$PERCENTAGE" -lt 0 ]; then
    error "Percentage must be between 0 and 100"
fi

# Calculate weights
NEW_WEIGHT=$PERCENTAGE
LEGACY_WEIGHT=$((100 - PERCENTAGE))

log "Configuring traffic split: ${NEW_WEIGHT}% to new system, ${LEGACY_WEIGHT}% to legacy system"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Backup current configuration
BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$NGINX_CONFIG" "$BACKUP_DIR/" 2>/dev/null || true
cp "$NGINX_UPSTREAM" "$BACKUP_DIR/" 2>/dev/null || true

# Create upstream configuration
cat > "$NGINX_UPSTREAM" <<EOF
# Stinkster Traffic Split Configuration
# Generated: $(date)
# Split: ${NEW_WEIGHT}% new, ${LEGACY_WEIGHT}% legacy

upstream stinkster_backend {
    # Legacy Python system
    server 127.0.0.1:${LEGACY_PORT} weight=${LEGACY_WEIGHT} max_fails=3 fail_timeout=30s;
    
    # New Node.js system
    server 127.0.0.1:${NEW_PORT} weight=${NEW_WEIGHT} max_fails=3 fail_timeout=30s;
    
    # Health check parameters
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

# WebSocket upstream (no load balancing for persistent connections)
upstream stinkster_websocket {
    # Route WebSocket based on percentage using IP hash
    ip_hash;
    
    server 127.0.0.1:${LEGACY_PORT} weight=${LEGACY_WEIGHT};
    server 127.0.0.1:${NEW_PORT} weight=${NEW_WEIGHT};
}
EOF

# Create main nginx configuration
cat > "$NGINX_CONFIG" <<'EOF'
# Stinkster Migration Configuration
server {
    listen 80;
    server_name _;
    
    # Logging
    access_log /var/log/nginx/stinkster-access.log combined;
    error_log /var/log/nginx/stinkster-error.log;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Add traffic split header for monitoring
    add_header X-Traffic-Split "$upstream_addr" always;
    
    # Static files (serve from new system)
    location ~ ^/(css|js|images|public)/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_cache_valid 200 1h;
        proxy_cache_bypass $http_pragma;
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    # WebSocket endpoints
    location ~ ^/(ws|socket\.io)/ {
        proxy_pass http://stinkster_websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # API endpoints with load balancing
    location /api/ {
        proxy_pass http://stinkster_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Connection pooling
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Add backend identifier for monitoring
        add_header X-Backend-Server $upstream_addr always;
    }
    
    # Health check endpoint (always route to new system)
    location /health {
        proxy_pass http://127.0.0.1:3001;
        access_log off;
    }
    
    # Monitoring endpoint (always route to new system)
    location /admin/monitoring {
        proxy_pass http://127.0.0.1:3001;
        # Add basic auth for security
        # auth_basic "Admin Access";
        # auth_basic_user_file /etc/nginx/.htpasswd;
    }
    
    # Default location
    location / {
        proxy_pass http://stinkster_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Test nginx configuration
if nginx -t; then
    success "Nginx configuration is valid"
else
    error "Nginx configuration test failed"
fi

# Reload nginx
if systemctl reload nginx; then
    success "Nginx reloaded successfully"
else
    error "Failed to reload nginx"
fi

# Verify the configuration is active
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
    success "Health check passed"
else
    warning "Health check failed - services may not be running"
fi

# Log the configuration change
cat >> "$LOG_FILE" <<EOF
=== Traffic Split Configuration Applied ===
Time: $(date)
New System: ${NEW_WEIGHT}%
Legacy System: ${LEGACY_WEIGHT}%
Configuration: $NGINX_CONFIG
Upstream: $NGINX_UPSTREAM
===
EOF

# Display current status
echo ""
echo "Traffic Split Configuration:"
echo "============================"
echo "New Node.js System: ${NEW_WEIGHT}%"
echo "Legacy Python System: ${LEGACY_WEIGHT}%"
echo ""
echo "Monitor traffic distribution:"
echo "  tail -f /var/log/nginx/stinkster-access.log | grep X-Backend-Server"
echo ""
echo "View real-time metrics:"
echo "  http://localhost:3001/admin/monitoring"
echo ""

success "Traffic split configured to ${NEW_WEIGHT}% new / ${LEGACY_WEIGHT}% legacy"
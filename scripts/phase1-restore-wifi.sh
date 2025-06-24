#!/bin/bash
# Phase 1: Restore WiFi Scanning Functionality
# This script fixes Kismet WiFi scanning and data collection

set -e

echo "=== Phase 1: WiFi Scanning Restoration Script ==="
echo "Time: $(date)"
echo ""

# Function to check if a command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo "✓ $1"
    else
        echo "✗ $1 failed"
        exit 1
    fi
}

# 1. Check for WiFi adapters
echo "Checking for WiFi adapters..."
WIFI_ADAPTERS=$(iw dev | grep Interface | awk '{print $2}')
if [ -z "$WIFI_ADAPTERS" ]; then
    echo "✗ No WiFi adapters found"
    exit 1
else
    echo "✓ Found WiFi adapters:"
    echo "$WIFI_ADAPTERS"
fi

# Find the best adapter for monitoring (prefer external USB adapters)
MONITOR_ADAPTER=""
for adapter in $WIFI_ADAPTERS; do
    if [[ "$adapter" == "wlan2" ]] || [[ "$adapter" == "wlan1" ]]; then
        MONITOR_ADAPTER=$adapter
        break
    fi
done

if [ -z "$MONITOR_ADAPTER" ]; then
    MONITOR_ADAPTER=$(echo "$WIFI_ADAPTERS" | head -1)
fi

echo "Using adapter: $MONITOR_ADAPTER"

# 2. Configure adapter for monitor mode
echo ""
echo "Configuring $MONITOR_ADAPTER for monitor mode..."
sudo ip link set $MONITOR_ADAPTER down
check_status "Interface down"

sudo iw dev $MONITOR_ADAPTER set monitor none
check_status "Monitor mode set"

sudo ip link set $MONITOR_ADAPTER up
check_status "Interface up"

# Verify monitor mode
if iw dev $MONITOR_ADAPTER info | grep -q "type monitor"; then
    echo "✓ $MONITOR_ADAPTER is in monitor mode"
else
    echo "✗ Failed to set monitor mode"
    exit 1
fi

# 3. Stop existing Kismet instances
echo ""
echo "Stopping existing Kismet instances..."
pkill -f kismet 2>/dev/null || true
sleep 2

# 4. Create Kismet configuration
echo ""
echo "Creating Kismet configuration..."
mkdir -p /home/pi/.kismet

cat > /home/pi/.kismet/kismet_site.conf << EOF
# Stinkster Kismet Configuration
# GPS source from GPSD
gps=gpsd:host=localhost,port=2947,reconnect=true

# WiFi source
source=$MONITOR_ADAPTER:type=linuxwifi,hop=true,channels="1,2,3,4,5,6,7,8,9,10,11,12,13,14"

# Logging configuration
log_types=kismet,pcapng,wiglecsv
log_prefix=/home/pi/kismet_logs/
log_title=stinkster

# Enable REST API
httpd_bind_address=127.0.0.1
httpd_port=2501

# Disable authentication for local access
httpd_username=
httpd_password=

# Memory and performance
tracker_device_timeout=300
tracker_max_devices=10000

# WigleCSV specific settings
wiglecsv_log=true
wiglecsv_client_version=Stinkster-1.0
EOF
check_status "Kismet configuration created"

# 5. Create log directory
echo ""
echo "Creating log directories..."
mkdir -p /home/pi/kismet_logs
mkdir -p /home/pi/WigletoTAK/data
check_status "Log directories created"

# 6. Create systemd service for Kismet
echo ""
echo "Creating systemd service for Kismet..."
sudo tee /etc/systemd/system/stinkster-kismet.service > /dev/null << EOF
[Unit]
Description=Stinkster Kismet WiFi Scanner
After=network.target gpsd.service stinkster-gps-bridge.service
Wants=gpsd.service

[Service]
Type=simple
ExecStart=/usr/bin/kismet --no-ncurses-wrapper --systemlog /var/log/kismet/kismet.log
Restart=always
RestartSec=10
User=root
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable stinkster-kismet.service
check_status "Kismet service created"

# 7. Start Kismet
echo ""
echo "Starting Kismet service..."
sudo systemctl start stinkster-kismet.service
check_status "Kismet service started"

# Wait for Kismet to initialize
echo "Waiting for Kismet to initialize..."
sleep 10

# 8. Verify Kismet is running
echo ""
echo "=== Kismet Verification ==="
echo ""

# Check service
if systemctl is-active --quiet stinkster-kismet; then
    echo "✓ Kismet service is active"
else
    echo "✗ Kismet service is not active"
    echo "Check logs: sudo journalctl -u stinkster-kismet -n 50"
    exit 1
fi

# Check API
echo "Checking Kismet API..."
if curl -s http://localhost:2501/system/status.json | jq -r .kismet_state 2>/dev/null; then
    echo "✓ Kismet API is responding"
    
    # Get device count
    DEVICE_COUNT=$(curl -s http://localhost:2501/devices/summary.json | jq -r .device_count 2>/dev/null || echo "0")
    echo "  Devices detected: $DEVICE_COUNT"
else
    echo "⚠ Kismet API not responding yet"
fi

# Check for log files
echo ""
echo "Checking for log files..."
if ls /home/pi/kismet_logs/*.wiglecsv 2>/dev/null; then
    echo "✓ WigleCSV files are being created"
    echo "  Latest: $(ls -t /home/pi/kismet_logs/*.wiglecsv | head -1)"
else
    echo "⚠ No WigleCSV files yet (this is normal for first few minutes)"
fi

# 9. Create symlink for WigleToTAK
echo ""
echo "Creating symlink for WigleToTAK data..."
ln -sf /home/pi/kismet_logs /home/pi/WigletoTAK/data/kismet_logs 2>/dev/null || true
check_status "Symlink created"

echo ""
echo "=== Phase 1 WiFi Scanning Restoration Complete ==="
echo ""
echo "Status Summary:"
echo "- WiFi adapter $MONITOR_ADAPTER in monitor mode"
echo "- Kismet service running on port 2501"
echo "- Logs being written to /home/pi/kismet_logs/"
echo ""
echo "Next steps:"
echo "1. Monitor Kismet: watch 'curl -s http://localhost:2501/devices/summary.json | jq'"
echo "2. Check logs: tail -f /home/pi/kismet_logs/*.wiglecsv"
echo "3. Proceed to TAK integration: ./phase1-test-tak.sh"
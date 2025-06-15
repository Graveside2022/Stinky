#!/bin/bash

# Wrapper script to start Kismet in background properly
# This avoids the trap cleanup issue in start_kismet.sh

KISMET_OPS_DIR="${KISMET_DATA_DIR:-/home/pi/projects/stinkster/data/kismet}"
PID_FILE="$KISMET_OPS_DIR/kismet.pid"
LOG_FILE="${LOG_DIR:-/home/pi/projects/stinkster/logs}/kismet.log"

echo "Starting Kismet wrapper..." > "$LOG_FILE"

# Change to kismet ops directory
cd "$KISMET_OPS_DIR" || exit 1

# Setup Kismet configuration
mkdir -p ~/.kismet
cat > ~/.kismet/kismet_site.conf << EOF
httpd_username=admin
httpd_password=admin
httpd_autologin=true
httpd_bind_address=0.0.0.0
source=wlan2:name=wlan2,type=linuxwifi,hop=true,channel_hop_speed=5/sec
enable_datasource=wlan2
allowed_interfaces=wlan2,wlan2mon
dot11_process_phy=false
gps=gpsd:host=localhost,port=2947,reconnect=true
gps_quit_on_error=false
EOF

# Kill any existing Kismet
pkill -f "kismet" 2>/dev/null
sleep 1

# Start Kismet directly
echo "Starting Kismet..." >> "$LOG_FILE"
kismet --source=wlan2:type=linuxwifi,hop=true,channel_hop_speed=5/sec,name=wlan2 \
       --no-daemonize \
       >> "$LOG_FILE" 2>&1 &

KISMET_PID=$!
echo $KISMET_PID > "$PID_FILE"
echo "Kismet started with PID: $KISMET_PID" >> "$LOG_FILE"

# Don't wait - just exit
exit 0 
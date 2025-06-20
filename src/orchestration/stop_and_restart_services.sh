#!/bin/bash
# Stop and restart services wrapper script
# This script stops the gps_kismet_wigle services and restarts them

LOG_FILE="/home/pi/tmp/stop_restart.log"
MAIN_SCRIPT="/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to stop all services
stop_services() {
    log "Stopping all services..."
    
    # Kill the orchestration script first
    pkill -f "gps_kismet_wigle.sh" || true
    
    # Kill processes by name (be specific to avoid killing Node.js backend)
    pkill -f "kismet_server" || true
    pkill -f "WigleToTak2" || true
    pkill -f "cgps" || true
    pkill -f "mavgps" || true
    
    # Stop gpsd
    sudo systemctl stop gpsd.socket || true
    sudo systemctl stop gpsd || true
    
    # Clean up PID files
    rm -f /home/pi/tmp/gps_kismet_wigle.pids
    rm -f /home/pi/tmp/kismet-operations-center.pid
    
    # Reset network interface
    log "Resetting WLAN2 interface..."
    sudo ip link set wlan2 down 2>/dev/null || true
    sleep 2
    sudo ip link set wlan2 up 2>/dev/null || true
    
    # Wait for interface to get IP
    log "Waiting for network to be ready..."
    for i in {1..30}; do
        if ip addr show wlan2 | grep -q "inet "; then
            log "Network interface wlan2 is ready"
            break
        fi
        sleep 1
    done
    
    # Wait a bit to ensure all processes are dead
    sleep 2
    
    # Verify processes are stopped
    if pgrep -f "gps_kismet_wigle.sh" > /dev/null; then
        log "Warning: gps_kismet_wigle.sh still running, force killing..."
        pkill -9 -f "gps_kismet_wigle.sh" || true
    fi
    
    log "Services stopped"
}

# Function to restart services
restart_services() {
    log "Restarting services..."
    
    # Start gpsd
    sudo systemctl start gpsd.socket
    sudo systemctl start gpsd
    sleep 2
    
    # Skip Node.js service restart - it should remain running
    # The web interface (Node.js backend) should not be restarted when starting/stopping Kismet services
    log "Keeping Node.js services running (not restarting web interface)"
    
    # Reconnect Tailscale
    log "Reconnecting Tailscale..."
    sudo tailscale up --accept-dns --accept-routes --advertise-routes=10.42.0.0/24 || true
    sudo systemctl restart tailscale-monitor
    
    # Start the main orchestration script
    log "Starting GPS/Kismet/Wigle orchestration..."
    nohup "$MAIN_SCRIPT" >> "$LOG_FILE" 2>&1 &
    SCRIPT_PID=$!
    
    # Wait a bit and check if it's still running
    sleep 3
    if kill -0 $SCRIPT_PID 2>/dev/null; then
        log "GPS/Kismet/Wigle orchestration started successfully (PID: $SCRIPT_PID)"
    else
        log "ERROR: GPS/Kismet/Wigle orchestration failed to start!"
        return 1
    fi
    
    log "All services restarted"
}

# Main execution
case "${1:-restart}" in
    stop)
        stop_services
        ;;
    start)
        restart_services
        ;;
    restart)
        stop_services
        sleep 3
        restart_services
        ;;
    *)
        echo "Usage: $0 {stop|start|restart}"
        exit 1
        ;;
esac
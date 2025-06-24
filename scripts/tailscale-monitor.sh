#!/bin/bash

# Tailscale Connection Monitor
# This script monitors Tailscale connectivity and automatically reconnects if disconnected

LOG_FILE="/home/pi/tmp/tailscale-monitor.log"
CHECK_INTERVAL=10  # Check every 10 seconds
RECONNECT_ATTEMPTS=3
RECONNECT_DELAY=10

# Function to log messages
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check Tailscale status
check_tailscale() {
    if tailscale status --json 2>/dev/null | grep -q '"BackendState":"Running"'; then
        return 0
    else
        return 1
    fi
}

# Function to check network connectivity
check_network() {
    # Check if we can reach a known host (Google DNS)
    ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1
    return $?
}

# Function to reconnect Tailscale
reconnect_tailscale() {
    log "Attempting to reconnect Tailscale..."
    
    # First, ensure network interface is up
    if ! ip link show wlan2 | grep -q "UP"; then
        log "wlan2 is down, bringing it up..."
        sudo ip link set wlan2 up
        sleep 5
    fi
    
    # Try to bring Tailscale up with all required flags
    if sudo tailscale up --accept-dns=false --accept-routes --advertise-routes=10.42.0.0/24 2>&1 | tee -a "$LOG_FILE"; then
        log "Tailscale reconnect command executed"
        sleep 5
        
        # Verify connection
        if check_tailscale; then
            log "Tailscale reconnected successfully"
            return 0
        else
            log "Tailscale reconnect command executed but connection not established"
            return 1
        fi
    else
        log "Failed to execute Tailscale reconnect command"
        return 1
    fi
}

# Function to restart network services if needed
restart_network() {
    log "Restarting network services..."
    sudo systemctl restart networking
    sleep 10
    
    # Also restart wpa_supplicant if it exists
    if systemctl is-active --quiet wpa_supplicant; then
        sudo systemctl restart wpa_supplicant
        sleep 5
    fi
}

# Main monitoring loop
main() {
    log "Starting Tailscale connection monitor"
    
    while true; do
        if ! check_tailscale; then
            log "WARNING: Tailscale is not connected"
            
            # Check if network is available
            if ! check_network; then
                log "Network connectivity issue detected"
                restart_network
            fi
            
            # Try to reconnect
            attempts=0
            while [ $attempts -lt $RECONNECT_ATTEMPTS ]; do
                attempts=$((attempts + 1))
                log "Reconnection attempt $attempts of $RECONNECT_ATTEMPTS"
                
                if reconnect_tailscale; then
                    log "Tailscale reconnected on attempt $attempts"
                    break
                else
                    if [ $attempts -lt $RECONNECT_ATTEMPTS ]; then
                        log "Reconnection failed, waiting $RECONNECT_DELAY seconds before retry..."
                        sleep $RECONNECT_DELAY
                    else
                        log "ERROR: Failed to reconnect Tailscale after $RECONNECT_ATTEMPTS attempts"
                        
                        # As a last resort, restart the Tailscale service
                        log "Attempting to restart Tailscale service..."
                        sudo systemctl restart tailscaled
                        sleep 10
                        
                        if reconnect_tailscale; then
                            log "Tailscale reconnected after service restart"
                        else
                            log "ERROR: Unable to restore Tailscale connection"
                        fi
                    fi
                fi
            done
        fi
        
        # Wait before next check
        sleep $CHECK_INTERVAL
    done
}

# Create log directory if it doesn't exist
mkdir -p /home/pi/tmp

# Handle script termination
trap 'log "Tailscale monitor stopped"; exit 0' INT TERM EXIT

# Run the main function
main
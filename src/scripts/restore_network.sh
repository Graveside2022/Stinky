#!/bin/bash
# Network restoration script - ensures connectivity after Kismet stops
# This script restores managed mode and reconnects to network/Tailscale

set -e

# Configuration
WIRELESS_INTERFACE="${WIRELESS_INTERFACE:-wlan2}"
LOG_FILE="/tmp/restore_network.log"
MAX_RETRY=3
RETRY_DELAY=5

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to restore interface to managed mode
restore_managed_mode() {
    log "Restoring $WIRELESS_INTERFACE to managed mode..."
    
    # Kill any monitoring processes
    pkill -f "airmon-ng.*$WIRELESS_INTERFACE" 2>/dev/null || true
    
    # Stop monitor mode interface if it exists
    if ip link show "${WIRELESS_INTERFACE}mon" >/dev/null 2>&1; then
        log "Stopping monitor interface ${WIRELESS_INTERFACE}mon"
        ip link set "${WIRELESS_INTERFACE}mon" down 2>/dev/null || true
        iw dev "${WIRELESS_INTERFACE}mon" del 2>/dev/null || true
    fi
    
    # Set interface to managed mode
    ip link set "$WIRELESS_INTERFACE" down 2>/dev/null || true
    iw dev "$WIRELESS_INTERFACE" set type managed 2>/dev/null || true
    ip link set "$WIRELESS_INTERFACE" up 2>/dev/null || true
    
    # Verify mode change
    MODE=$(iw dev "$WIRELESS_INTERFACE" info 2>/dev/null | grep -o "type [a-z]*" | cut -d' ' -f2)
    log "Interface mode: $MODE"
    
    if [ "$MODE" != "managed" ]; then
        log "WARNING: Failed to verify managed mode"
        return 1
    fi
    
    return 0
}

# Function to restart network services
restart_network_services() {
    log "Restarting network services..."
    
    # Check if NetworkManager is being used
    if systemctl is-active NetworkManager >/dev/null 2>&1; then
        log "Restarting NetworkManager..."
        sudo systemctl restart NetworkManager
        sleep 3
        
        # Wait for NetworkManager to settle
        for i in $(seq 1 $MAX_RETRY); do
            if nmcli device status | grep -q "$WIRELESS_INTERFACE.*connected"; then
                log "NetworkManager connected on $WIRELESS_INTERFACE"
                return 0
            fi
            log "Waiting for NetworkManager to connect (attempt $i/$MAX_RETRY)..."
            sleep $RETRY_DELAY
        done
    fi
    
    # Fallback to wpa_supplicant/dhclient
    log "Starting wpa_supplicant and dhclient..."
    
    # Kill existing processes
    pkill -f "wpa_supplicant.*$WIRELESS_INTERFACE" 2>/dev/null || true
    pkill -f "dhclient.*$WIRELESS_INTERFACE" 2>/dev/null || true
    sleep 1
    
    # Start wpa_supplicant if config exists
    if [ -f "/etc/wpa_supplicant/wpa_supplicant.conf" ]; then
        log "Starting wpa_supplicant..."
        wpa_supplicant -B -i "$WIRELESS_INTERFACE" -c /etc/wpa_supplicant/wpa_supplicant.conf 2>&1 | tee -a "$LOG_FILE"
        sleep 2
    fi
    
    # Get DHCP lease
    log "Obtaining DHCP lease..."
    dhclient "$WIRELESS_INTERFACE" 2>&1 | tee -a "$LOG_FILE"
    
    return 0
}

# Function to verify connectivity
verify_connectivity() {
    log "Verifying network connectivity..."
    
    # Check if we have an IP address
    IP_ADDR=$(ip addr show "$WIRELESS_INTERFACE" | grep "inet " | awk '{print $2}' | cut -d/ -f1)
    if [ -z "$IP_ADDR" ]; then
        log "ERROR: No IP address assigned to $WIRELESS_INTERFACE"
        return 1
    fi
    
    log "IP address: $IP_ADDR"
    
    # Test connectivity
    if ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
        log "Internet connectivity verified"
        return 0
    else
        log "WARNING: No internet connectivity"
        return 1
    fi
}

# Function to restart Tailscale
restart_tailscale() {
    log "Checking Tailscale status..."
    
    if ! systemctl is-active tailscaled >/dev/null 2>&1; then
        log "Tailscale daemon not running, starting..."
        sudo systemctl start tailscaled
        sleep 2
    fi
    
    # Check if Tailscale is up
    if tailscale status >/dev/null 2>&1; then
        log "Tailscale is already connected"
        return 0
    fi
    
    log "Bringing up Tailscale..."
    tailscale up 2>&1 | tee -a "$LOG_FILE"
    
    # Wait for Tailscale to connect
    for i in $(seq 1 $MAX_RETRY); do
        if tailscale status | grep -q "100\.[0-9]"; then
            TAILSCALE_IP=$(tailscale ip -4 2>/dev/null)
            log "Tailscale connected: $TAILSCALE_IP"
            return 0
        fi
        log "Waiting for Tailscale connection (attempt $i/$MAX_RETRY)..."
        sleep $RETRY_DELAY
    done
    
    log "WARNING: Tailscale connection timeout"
    return 1
}

# Main execution
main() {
    log "=== Starting network restoration ==="
    
    # Step 1: Restore managed mode
    if ! restore_managed_mode; then
        log "ERROR: Failed to restore managed mode"
        exit 1
    fi
    
    # Step 2: Restart network services
    if ! restart_network_services; then
        log "WARNING: Network services restart had issues"
    fi
    
    # Step 3: Verify connectivity
    if ! verify_connectivity; then
        log "WARNING: Network connectivity verification failed"
        # Continue anyway - Tailscale might still work
    fi
    
    # Step 4: Restart Tailscale
    if ! restart_tailscale; then
        log "WARNING: Tailscale restart failed"
        # Log current network state for debugging
        log "Current network state:"
        ip addr show "$WIRELESS_INTERFACE" 2>&1 | tee -a "$LOG_FILE"
        ip route show 2>&1 | tee -a "$LOG_FILE"
    fi
    
    log "=== Network restoration complete ==="
    
    # Final connectivity report
    log "Final status:"
    log "- Interface: $(iw dev $WIRELESS_INTERFACE info 2>/dev/null | grep Interface | awk '{print $2}')"
    log "- Mode: $(iw dev $WIRELESS_INTERFACE info 2>/dev/null | grep type | awk '{print $2}')"
    log "- IP: $(ip addr show $WIRELESS_INTERFACE | grep 'inet ' | awk '{print $2}')"
    log "- Tailscale: $(tailscale ip -4 2>/dev/null || echo 'Not connected')"
}

# Run main function
main

exit 0
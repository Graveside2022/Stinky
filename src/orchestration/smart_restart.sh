#!/bin/bash
# Smart restart script that checks service state before action

LOG_FILE="/home/pi/tmp/smart_restart.log"
RESTART_SCRIPT="/home/pi/projects/stinkster_malone/stinkster/src/orchestration/stop_and_restart_services.sh"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check if services are running
check_services() {
    local kismet_running=false
    local wigle_running=false
    local gps_running=false
    
    pgrep -f "kismet" > /dev/null && kismet_running=true
    pgrep -f "WigleToTak2" > /dev/null && wigle_running=true
    pgrep -f "gps_kismet_wigle.sh" > /dev/null && gps_running=true
    
    if $kismet_running && $wigle_running && $gps_running; then
        echo "running"
    elif $kismet_running || $wigle_running || $gps_running; then
        echo "partial"
    else
        echo "stopped"
    fi
}

# Main logic
case "$1" in
    start)
        status=$(check_services)
        if [ "$status" = "running" ]; then
            log "Services already running - no action needed"
            exit 0
        elif [ "$status" = "partial" ]; then
            log "Some services running - performing full restart"
            exec "$RESTART_SCRIPT" restart
        else
            log "Services stopped - starting"
            exec "$RESTART_SCRIPT" start
        fi
        ;;
    stop)
        log "Stopping services"
        exec "$RESTART_SCRIPT" stop
        ;;
    restart)
        log "Restarting services"
        exec "$RESTART_SCRIPT" restart
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac
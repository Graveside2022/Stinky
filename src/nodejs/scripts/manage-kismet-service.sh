#!/bin/bash

# This script manages the kismet orchestration service
# It uses systemctl --user or polkit rules to avoid sudo requirements

ACTION=$1

case "$ACTION" in
    start)
        # Try to start the service
        if systemctl --user start kismet-orchestration 2>/dev/null; then
            echo "Service started successfully"
            exit 0
        else
            # Fall back to using systemctl directly if user service doesn't work
            systemctl start kismet-orchestration 2>&1
            exit $?
        fi
        ;;
    stop)
        # Try to stop the service
        if systemctl --user stop kismet-orchestration 2>/dev/null; then
            echo "Service stopped successfully"
            exit 0
        else
            # Fall back to using systemctl directly
            systemctl stop kismet-orchestration 2>&1
            exit $?
        fi
        ;;
    status)
        # Check service status
        if systemctl --user is-active kismet-orchestration >/dev/null 2>&1; then
            echo "active"
        elif systemctl is-active kismet-orchestration >/dev/null 2>&1; then
            echo "active"
        else
            echo "inactive"
        fi
        exit 0
        ;;
    *)
        echo "Usage: $0 {start|stop|status}"
        exit 1
        ;;
esac
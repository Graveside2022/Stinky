#!/bin/bash
# Interactive log viewer

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/dev/logs"

if [ $# -eq 0 ]; then
    echo "Available logs:"
    ls -1 "${LOG_DIR}"/*.log 2>/dev/null | sed 's|.*/||' | sed 's|\.log$||' || echo "No logs found"
    echo
    echo "Usage: $0 <component>"
    exit 1
fi

COMPONENT="$1"
LOG_FILE="${LOG_DIR}/${COMPONENT}.log"

if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
else
    echo "Log file not found: $LOG_FILE"
    exit 1
fi

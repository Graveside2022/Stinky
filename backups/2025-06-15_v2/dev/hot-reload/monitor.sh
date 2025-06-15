#!/bin/bash
# Hot reload monitor for Python components

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_DIR="${PROJECT_ROOT}/src"
PID_DIR="${PROJECT_ROOT}/dev/pids"

echo "Starting hot reload monitor..."
echo "Watching: $SRC_DIR"

# Function to restart component
restart_component() {
    local component="$1"
    local pid_file="${PID_DIR}/${component}.pid"
    
    echo "File change detected, restarting $component..."
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            sleep 2
        fi
    fi
    
    # Restart component
    bash "${PROJECT_ROOT}/dev/components/${component}.sh" > "${PROJECT_ROOT}/dev/logs/${component}.log" 2>&1 &
    echo $! > "$pid_file"
    
    echo "$component restarted"
}

# Monitor file changes
if command -v inotifywait >/dev/null 2>&1; then
    inotifywait -m -r -e modify,create,delete --format '%w%f %e' "$SRC_DIR" | while read file event; do
        if [[ "$file" == *.py ]]; then
            echo "Python file changed: $file"
            
            # Determine which component to restart based on path
            if [[ "$file" == *"/gpsmav/"* ]]; then
                restart_component "gpsmav"
            elif [[ "$file" == *"/hackrf/"* ]]; then
                restart_component "hackrf"
            elif [[ "$file" == *"/wigletotak/"* ]]; then
                restart_component "wigletotak"
            fi
        fi
    done
else
    echo "inotifywait not found, hot reload unavailable"
    echo "Install with: sudo apt-get install inotify-tools"
    sleep infinity
fi

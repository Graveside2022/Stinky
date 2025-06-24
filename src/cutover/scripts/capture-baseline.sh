#!/bin/bash

# Baseline Capture Script
# Captures current system metrics before migration

set -euo pipefail

# Configuration
BASELINE_DIR="/home/pi/projects/stinkster_christian/stinkster/src/cutover/baseline"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BASELINE_FILE="$BASELINE_DIR/baseline-$TIMESTAMP.json"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
info() {
    echo -e "${BLUE}INFO: $1${NC}"
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# Create baseline directory
mkdir -p "$BASELINE_DIR"

info "Capturing system baseline..."

# Initialize baseline JSON
cat > "$BASELINE_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "system": {
EOF

# Capture system info
info "Capturing system information..."

# CPU info
cpu_count=$(nproc)
cpu_model=$(cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2 | xargs)
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d% -f1)

# Memory info
mem_total=$(free -b | grep Mem | awk '{print $2}')
mem_used=$(free -b | grep Mem | awk '{print $3}')
mem_free=$(free -b | grep Mem | awk '{print $4}')

# Disk info
disk_total=$(df -B1 / | tail -1 | awk '{print $2}')
disk_used=$(df -B1 / | tail -1 | awk '{print $3}')
disk_free=$(df -B1 / | tail -1 | awk '{print $4}')

cat >> "$BASELINE_FILE" <<EOF
    "cpu": {
      "count": $cpu_count,
      "model": "$cpu_model",
      "usage": $cpu_usage
    },
    "memory": {
      "total": $mem_total,
      "used": $mem_used,
      "free": $mem_free
    },
    "disk": {
      "total": $disk_total,
      "used": $disk_used,
      "free": $disk_free
    },
    "uptime": $(cat /proc/uptime | cut -d. -f1)
  },
  "services": {
EOF

info "Capturing service states..."

# Check legacy services
SERVICES_TO_CHECK=(
    "WigleToTak2.py:8000:wigle_to_tak"
    "spectrum_analyzer.py:8092:spectrum_analyzer"
    "kismet:2501:kismet"
    "gpsd:2947:gpsd"
)

first=true
for service_spec in "${SERVICES_TO_CHECK[@]}"; do
    process="${service_spec%%:*}"
    port="${service_spec#*:}"
    port="${port%%:*}"
    name="${service_spec##*:}"
    
    [ "$first" = true ] && first=false || echo "," >> "$BASELINE_FILE"
    
    # Check if process is running
    if pgrep -f "$process" > /dev/null; then
        pid=$(pgrep -f "$process" | head -1)
        cpu=$(ps -p $pid -o %cpu= 2>/dev/null || echo "0")
        mem=$(ps -p $pid -o %mem= 2>/dev/null || echo "0")
        rss=$(ps -p $pid -o rss= 2>/dev/null || echo "0")
        status="running"
    else
        pid=0
        cpu=0
        mem=0
        rss=0
        status="stopped"
    fi
    
    # Check port
    if netstat -tuln | grep -q ":$port "; then
        port_status="listening"
    else
        port_status="closed"
    fi
    
    # Test endpoint response time
    response_time=0
    if [ "$port_status" = "listening" ]; then
        start_time=$(date +%s%N)
        curl -s -o /dev/null "http://localhost:$port/" 2>/dev/null || true
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 ))
    fi
    
    cat >> "$BASELINE_FILE" <<EOF
    "$name": {
      "status": "$status",
      "pid": $pid,
      "cpu_percent": $cpu,
      "memory_percent": $mem,
      "memory_rss": $rss,
      "port": $port,
      "port_status": "$port_status",
      "response_time_ms": $response_time
    }
EOF
done

cat >> "$BASELINE_FILE" <<EOF

  },
  "network": {
EOF

info "Capturing network statistics..."

# Network interfaces
interfaces=$(ip -j link show | jq -r '.[].ifname' | grep -E "^(eth|wlan)" | tr '\n' ' ')
first=true

for iface in $interfaces; do
    [ "$first" = true ] && first=false || echo "," >> "$BASELINE_FILE"
    
    rx_bytes=$(cat /sys/class/net/$iface/statistics/rx_bytes 2>/dev/null || echo 0)
    tx_bytes=$(cat /sys/class/net/$iface/statistics/tx_bytes 2>/dev/null || echo 0)
    
    cat >> "$BASELINE_FILE" <<EOF
    "$iface": {
      "rx_bytes": $rx_bytes,
      "tx_bytes": $tx_bytes
    }
EOF
done

cat >> "$BASELINE_FILE" <<EOF

  },
  "performance_tests": {
EOF

info "Running performance tests..."

# Test 1: Local HTTP response time
http_times=()
for i in {1..10}; do
    if time=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:8000/ 2>/dev/null); then
        http_times+=($time)
    fi
done

if [ ${#http_times[@]} -gt 0 ]; then
    avg_time=$(echo "${http_times[@]}" | awk '{s+=$1} END {print s/NR * 1000}')
else
    avg_time=0
fi

# Test 2: Process count
process_count=$(ps aux | wc -l)

# Test 3: Open files
open_files=$(lsof 2>/dev/null | wc -l)

cat >> "$BASELINE_FILE" <<EOF
    "http_response_avg_ms": $avg_time,
    "process_count": $process_count,
    "open_files": $open_files
  }
}
EOF

# Create human-readable summary
info "Creating baseline summary..."

SUMMARY_FILE="$BASELINE_DIR/baseline-$TIMESTAMP-summary.txt"
cat > "$SUMMARY_FILE" <<EOF
SYSTEM BASELINE CAPTURE
======================
Date: $(date)
File: $BASELINE_FILE

SYSTEM RESOURCES
----------------
CPU Usage: ${cpu_usage}%
Memory: $(( mem_used / 1024 / 1024 ))MB / $(( mem_total / 1024 / 1024 ))MB
Disk: $(( disk_used / 1024 / 1024 / 1024 ))GB / $(( disk_total / 1024 / 1024 / 1024 ))GB

SERVICE STATUS
--------------
EOF

for service_spec in "${SERVICES_TO_CHECK[@]}"; do
    name="${service_spec##*:}"
    port="${service_spec#*:}"
    port="${port%%:*}"
    
    if pgrep -f "${service_spec%%:*}" > /dev/null; then
        echo "$name: Running on port $port" >> "$SUMMARY_FILE"
    else
        echo "$name: Not running" >> "$SUMMARY_FILE"
    fi
done

cat >> "$SUMMARY_FILE" <<EOF

PERFORMANCE BASELINE
-------------------
Average HTTP Response: ${avg_time}ms
Process Count: $process_count
Open Files: $open_files

This baseline will be used to compare system performance after migration.
EOF

# Display summary
cat "$SUMMARY_FILE"

echo ""
success "Baseline captured successfully"
echo ""
echo "Baseline file: $BASELINE_FILE"
echo "Summary file: $SUMMARY_FILE"
echo ""
echo "Use this baseline to compare system metrics after migration."
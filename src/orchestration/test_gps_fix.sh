#!/bin/bash
# Test GPS components manually
# This script tests each GPS component independently

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

print_status "========================================" "$YELLOW"
print_status "GPS Components Test Script" "$YELLOW"
print_status "========================================" "$YELLOW"
echo ""

# 1. Test GPSD service status
print_status "1. Checking GPSD service status..." "$YELLOW"
if systemctl is-active --quiet gpsd; then
    print_status "✓ GPSD service is active" "$GREEN"
else
    print_status "✗ GPSD service is not active" "$RED"
    print_status "  Starting GPSD..." "$YELLOW"
    sudo systemctl stop gpsd.socket
    sudo systemctl stop gpsd
    sleep 1
    sudo systemctl start gpsd.socket
    sudo systemctl start gpsd
    sleep 2
fi

# 2. Check GPSD socket
print_status "\n2. Checking GPSD socket..." "$YELLOW"
if systemctl is-active --quiet gpsd.socket; then
    print_status "✓ GPSD socket is active" "$GREEN"
else
    print_status "✗ GPSD socket is not active" "$RED"
fi

# 3. Test GPSD connectivity
print_status "\n3. Testing GPSD connectivity on port 2947..." "$YELLOW"
if timeout 2 bash -c "echo '' | nc -w 1 localhost 2947" 2>/dev/null; then
    print_status "✓ GPSD is responding on port 2947" "$GREEN"
else
    print_status "✗ GPSD is not responding on port 2947" "$RED"
fi

# 4. Check for GPS devices
print_status "\n4. Checking for GPS devices..." "$YELLOW"
DEVICES=$(ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true)
if [ -n "$DEVICES" ]; then
    print_status "Found potential GPS devices:" "$GREEN"
    for device in $DEVICES; do
        echo "  - $device"
    done
else
    print_status "✗ No USB serial devices found" "$RED"
fi

# 5. Check GPSD configuration
print_status "\n5. Checking GPSD configuration..." "$YELLOW"
if [ -f /etc/default/gpsd ]; then
    print_status "GPSD configuration (/etc/default/gpsd):" "$YELLOW"
    grep -E "^(DEVICES|GPSD_OPTIONS|START_DAEMON|USBAUTO)" /etc/default/gpsd | sed 's/^/  /'
else
    print_status "✗ GPSD configuration file not found" "$RED"
fi

# 6. Test GPS data with gpspipe
print_status "\n6. Testing GPS data with gpspipe..." "$YELLOW"
print_status "Attempting to read GPS data (5 second timeout)..." "$YELLOW"
GPS_DATA=$(timeout 5 gpspipe -w -n 5 2>&1 || true)
if [ -n "$GPS_DATA" ]; then
    if echo "$GPS_DATA" | grep -q '"class"'; then
        print_status "✓ GPS data received:" "$GREEN"
        echo "$GPS_DATA" | head -3 | sed 's/^/  /'
        
        # Check for GPS fix
        if echo "$GPS_DATA" | grep -q '"mode":[23]'; then
            print_status "✓ GPS has fix (2D or 3D)" "$GREEN"
        else
            print_status "✗ GPS does not have fix yet" "$RED"
        fi
    else
        print_status "✗ No valid GPS data received" "$RED"
        echo "$GPS_DATA" | head -5 | sed 's/^/  /'
    fi
else
    print_status "✗ No GPS data received" "$RED"
fi

# 7. Test with cgps
print_status "\n7. Testing with cgps (interactive GPS monitor)..." "$YELLOW"
print_status "Press Ctrl+C to exit cgps" "$YELLOW"
print_status "Starting cgps in 3 seconds..." "$YELLOW"
sleep 3
timeout 10 cgps 2>&1 || true

# 8. Check if mavgps.py exists
print_status "\n8. Checking for mavgps.py..." "$YELLOW"
MAVGPS_PATH="/home/pi/gpsmav/GPSmav/mavgps.py"
if [ -f "$MAVGPS_PATH" ]; then
    print_status "✓ Found mavgps.py at $MAVGPS_PATH" "$GREEN"
    
    # Check if virtual environment exists
    VENV_PATH="/home/pi/gpsmav/GPSmav/venv"
    if [ -d "$VENV_PATH" ]; then
        print_status "✓ Virtual environment exists" "$GREEN"
    else
        print_status "✗ Virtual environment not found at $VENV_PATH" "$RED"
    fi
else
    print_status "✗ mavgps.py not found at expected location" "$RED"
fi

# 9. Test MAVLink GPS manually
print_status "\n9. Testing MAVLink GPS (if applicable)..." "$YELLOW"
if [ -f "$MAVGPS_PATH" ] && [ -d "$VENV_PATH" ]; then
    print_status "To test MAVLink GPS manually, run:" "$YELLOW"
    echo "  cd /home/pi/gpsmav/GPSmav"
    echo "  source venv/bin/activate"
    echo "  ./mavgps.py"
    echo "  # Then check GPSD: gpspipe -w -n 5"
else
    print_status "MAVLink GPS components not found" "$YELLOW"
fi

# 10. Summary
print_status "\n========================================" "$YELLOW"
print_status "Summary" "$YELLOW"
print_status "========================================" "$YELLOW"

# Check overall GPS status
GPS_WORKING=false
if timeout 2 gpspipe -w -n 1 2>/dev/null | grep -q '"class"'; then
    GPS_WORKING=true
fi

if [ "$GPS_WORKING" = true ]; then
    print_status "✓ GPS system is operational" "$GREEN"
    print_status "  GPSD is running and receiving data" "$GREEN"
else
    print_status "✗ GPS system needs attention" "$RED"
    print_status "\nTroubleshooting steps:" "$YELLOW"
    echo "  1. Check USB connections"
    echo "  2. Verify GPS device is plugged in"
    echo "  3. Run: sudo systemctl restart gpsd"
    echo "  4. Check /var/log/syslog for gpsd errors"
    echo "  5. Try manually configuring GPSD:"
    echo "     sudo gpsd -N -D 5 /dev/ttyUSB0"
fi

print_status "\n========================================" "$YELLOW"
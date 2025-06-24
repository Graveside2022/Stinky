#!/bin/bash
# Phase 1: Restore GPS Functionality
# This script fixes the GPS data pipeline from MAVLink to GPSD to Kismet

set -e

echo "=== Phase 1: GPS Restoration Script ==="
echo "Time: $(date)"
echo ""

# Function to check if a command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo "✓ $1"
    else
        echo "✗ $1 failed"
        exit 1
    fi
}

# 1. Stop any existing GPS services
echo "Stopping existing GPS services..."
sudo systemctl stop gpsd 2>/dev/null || true
pkill -f mavgps.py 2>/dev/null || true
sleep 2

# 2. Check USB device
echo ""
echo "Checking for GPS USB device..."
if ls /dev/ttyUSB0 2>/dev/null; then
    echo "✓ Found GPS device at /dev/ttyUSB0"
    
    # Test device communication
    echo "Testing GPS device communication..."
    if timeout 2 cat /dev/ttyUSB0 | head -1 | grep -q '$'; then
        echo "✓ GPS device is sending data"
    else
        echo "⚠ GPS device not sending data, checking baud rate..."
        sudo stty -F /dev/ttyUSB0 4800
        check_status "Set baud rate to 4800"
    fi
else
    echo "✗ No GPS device found at /dev/ttyUSB0"
    echo "Please check USB connections"
    exit 1
fi

# 3. Configure GPSD
echo ""
echo "Configuring GPSD..."
sudo tee /etc/default/gpsd > /dev/null << EOF
# Default settings for the gpsd init script and the hotplug wrapper.
START_DAEMON="true"
USBAUTO="false"
DEVICES="/dev/ttyUSB0"
GPSD_OPTIONS="-n"
EOF
check_status "GPSD configuration updated"

# 4. Start GPSD
echo ""
echo "Starting GPSD service..."
sudo systemctl daemon-reload
sudo systemctl enable gpsd
sudo systemctl start gpsd
check_status "GPSD service started"

# Wait for GPSD to initialize
sleep 3

# 5. Test GPSD
echo ""
echo "Testing GPSD connection..."
if gpspipe -w -n 1 2>/dev/null | grep -q '"class"'; then
    echo "✓ GPSD is receiving data"
    
    # Try to get GPS fix
    echo "Checking for GPS fix..."
    if gpspipe -w -n 5 2>/dev/null | grep -q "TPV"; then
        echo "✓ GPS has a fix!"
        gpspipe -w -n 1 | grep TPV | jq '{lat: .lat, lon: .lon, time: .time}' 2>/dev/null || true
    else
        echo "⚠ No GPS fix yet (this is normal indoors)"
    fi
else
    echo "⚠ GPSD not receiving data, trying MAVLink bridge..."
fi

# 6. Start MAVLink bridge if needed
echo ""
echo "Setting up MAVLink to GPSD bridge..."
cd /home/pi/gpsmav/GPSmav

# Activate virtual environment
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    check_status "Virtual environment activated"
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install pymavlink pyserial
    check_status "Virtual environment created"
fi

# Create systemd service for MAVLink bridge
echo ""
echo "Creating systemd service for GPS bridge..."
sudo tee /etc/systemd/system/stinkster-gps-bridge.service > /dev/null << EOF
[Unit]
Description=Stinkster GPS MAVLink to GPSD Bridge
After=network.target gpsd.service
Wants=gpsd.service

[Service]
Type=simple
ExecStart=/home/pi/gpsmav/GPSmav/venv/bin/python /home/pi/gpsmav/GPSmav/mavgps.py
WorkingDirectory=/home/pi/gpsmav/GPSmav
Restart=always
RestartSec=10
User=pi
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable stinkster-gps-bridge.service
check_status "GPS bridge service created"

# 7. Start the bridge
echo ""
echo "Starting GPS bridge..."
sudo systemctl start stinkster-gps-bridge.service
check_status "GPS bridge started"

# Wait for bridge to initialize
sleep 5

# 8. Final verification
echo ""
echo "=== Final Verification ==="
echo ""

# Check services
echo "Service Status:"
systemctl is-active gpsd && echo "✓ GPSD active" || echo "✗ GPSD inactive"
systemctl is-active stinkster-gps-bridge && echo "✓ GPS Bridge active" || echo "✗ GPS Bridge inactive"

# Check GPS data
echo ""
echo "GPS Data Check:"
if gpspipe -w -n 1 2>/dev/null | grep -q "TPV"; then
    echo "✓ GPS data is flowing!"
    echo ""
    echo "Current GPS coordinates:"
    gpspipe -w -n 1 | grep TPV | jq '{lat: .lat, lon: .lon, alt: .alt, speed: .speed}' 2>/dev/null || true
else
    echo "⚠ No GPS fix yet"
    echo "  - This is normal if you're indoors"
    echo "  - Move the GPS antenna outside for better reception"
    echo "  - Check 'sudo journalctl -u stinkster-gps-bridge -f' for errors"
fi

echo ""
echo "=== Phase 1 GPS Restoration Complete ==="
echo ""
echo "Next steps:"
echo "1. If GPS has no fix, move antenna outside"
echo "2. Monitor GPS: watch 'gpspipe -w'"
echo "3. Check logs: journalctl -u gpsd -u stinkster-gps-bridge -f"
echo "4. Proceed to Phase 1 WiFi scanning: ./phase1-restore-wifi.sh"
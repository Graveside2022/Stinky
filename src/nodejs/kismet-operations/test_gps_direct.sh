#!/bin/bash

# Direct GPS test script
# Tests GPS device at /dev/ttyUSB0

echo "GPS Direct Test - Reading from /dev/ttyUSB0"
echo "==========================================="
echo

# Check if device exists
if [ ! -e /dev/ttyUSB0 ]; then
    echo "ERROR: /dev/ttyUSB0 not found!"
    exit 1
fi

echo "Device info:"
ls -l /dev/ttyUSB0
echo

# Set baud rate to 4800 (confirmed working)
echo "Setting baud rate to 4800..."
sudo stty -F /dev/ttyUSB0 4800
echo

echo "GPS Output (Ctrl+C to stop):"
echo "----------------------------"

# Read and display GPS data with filtering
sudo cat /dev/ttyUSB0 | while read line; do
    # Filter to show only standard NMEA sentences
    if [[ $line =~ ^\$G[NP][A-Z]{3} ]]; then
        # Color code different sentence types
        case "$line" in
            \$GNGGA*)
                # GGA - Fix data (position, time, quality)
                echo -e "\033[32m$line\033[0m"  # Green
                ;;
            \$GNRMC*)
                # RMC - Recommended minimum data
                echo -e "\033[34m$line\033[0m"  # Blue
                ;;
            \$GNGSA*)
                # GSA - DOP and active satellites
                echo -e "\033[36m$line\033[0m"  # Cyan
                ;;
            \$GPGSV*)
                # GSV - Satellites in view
                echo -e "\033[35m$line\033[0m"  # Magenta
                ;;
            *)
                echo "$line"
                ;;
        esac
    elif [[ $line =~ ^\$PAIR ]]; then
        # Show PAIR messages in yellow (proprietary)
        echo -e "\033[33m$line\033[0m"
    fi
done
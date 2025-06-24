#!/bin/bash

# Test if HackRF is actively receiving in OpenWebRX

echo "=== HackRF Active Reception Test ==="
echo "Testing if HackRF is actively receiving signals..."
echo

# Check if OpenWebRX container is running
if ! docker ps | grep -q openwebrx; then
    echo "ERROR: OpenWebRX container is not running"
    echo "Start it with: docker-compose up -d"
    exit 1
fi

# Check if HackRF is detected by the host
echo "1. Checking HackRF on host system..."
if lsusb | grep -q "1d50:6089"; then
    echo "   ✓ HackRF detected on USB bus"
else
    echo "   ✗ HackRF not detected on USB bus"
    exit 1
fi

# Check if HackRF is accessible in container
echo
echo "2. Checking HackRF in container..."
if docker exec openwebrx lsusb | grep -q "1d50:6089"; then
    echo "   ✓ HackRF visible in container"
else
    echo "   ✗ HackRF not visible in container"
    exit 1
fi

# Test if HackRF is in use (will fail if OpenWebRX is using it)
echo
echo "3. Checking if HackRF is in use..."
if ! docker exec openwebrx timeout 1 hackrf_info >/dev/null 2>&1; then
    echo "   ✓ HackRF is in use (likely by OpenWebRX)"
else
    echo "   ✗ HackRF is not in use"
    echo "   OpenWebRX may not have activated the device"
fi

# Check OpenWebRX web interface
echo
echo "4. Checking OpenWebRX web interface..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8073)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "   ✓ OpenWebRX web interface is responding (HTTP $HTTP_CODE)"
else
    echo "   ✗ OpenWebRX web interface not responding (HTTP $HTTP_CODE)"
fi

# Check for audio streaming activity
echo
echo "5. Checking for streaming activity..."
if docker exec openwebrx ps aux | grep -q "[a]udio"; then
    echo "   ✓ Audio streaming processes detected"
else
    echo "   ⚠ No audio streaming processes detected"
    echo "   (This is normal if no client is connected)"
fi

# Check OpenWebRX logs for HackRF activity
echo
echo "6. Recent OpenWebRX logs mentioning HackRF:"
docker logs openwebrx 2>&1 | grep -i hackrf | tail -5

# Instructions for manual verification
echo
echo "=== Manual Verification Steps ==="
echo "1. Open web browser to: http://localhost:8073"
echo "2. Login with: admin / hackrf"
echo "3. You should see:"
echo "   - Waterfall display showing signal activity"
echo "   - 'HackRF' shown as the active SDR"
echo "   - '2m Amateur Band' as the selected profile"
echo "   - Audio controls and demodulator options"
echo
echo "4. To test reception:"
echo "   - Click on a signal in the waterfall"
echo "   - Adjust squelch if needed"
echo "   - You should hear audio if a signal is present"
echo
echo "5. To verify auto-start worked:"
echo "   - The receiver should already be active"
echo "   - No need to manually select SDR or profile"

# Create a simple Python script to check WebSocket status
echo
echo "=== Creating WebSocket test script ==="
cat > /tmp/test_ws.py << 'EOF'
#!/usr/bin/env python3
import websocket
import json
import sys
import time

def test_websocket():
    ws_url = "ws://localhost:8073/ws/"
    
    try:
        ws = websocket.create_connection(ws_url, timeout=5)
        print("✓ WebSocket connection established")
        
        # Check if we receive any data
        ws.settimeout(2)
        try:
            data = ws.recv()
            if data:
                print("✓ Receiving data from OpenWebRX")
                print(f"  Sample data: {data[:100]}...")
            ws.close()
            return True
        except:
            print("⚠ No data received (normal if HackRF not activated)")
            ws.close()
            return False
            
    except Exception as e:
        print(f"✗ WebSocket connection failed: {e}")
        return False

if __name__ == "__main__":
    sys.exit(0 if test_websocket() else 1)
EOF

# Run WebSocket test if Python is available
if command -v python3 >/dev/null && python3 -c "import websocket" 2>/dev/null; then
    echo
    echo "7. Testing WebSocket connection..."
    python3 /tmp/test_ws.py
else
    echo
    echo "7. WebSocket test skipped (websocket-client not installed)"
fi

echo
echo "=== Test Complete ==="
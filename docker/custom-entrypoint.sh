#!/bin/bash

# Custom entrypoint for OpenWebRX with automatic HackRF activation
# This script starts OpenWebRX and automatically activates the HackRF device

echo "Starting OpenWebRX with automatic HackRF activation..."

# Start the original OpenWebRX service in the background
/init &
OPENWEBRX_PID=$!

# Wait for OpenWebRX to fully initialize
echo "Waiting for OpenWebRX to initialize..."
sleep 10

# Function to check if OpenWebRX is ready
wait_for_openwebrx() {
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:8073 | grep -q "200\|401"; then
            echo "OpenWebRX is ready!"
            return 0
        fi
        echo "Waiting for OpenWebRX to be ready... (attempt $((attempt+1))/$max_attempts)"
        sleep 2
        attempt=$((attempt+1))
    done
    
    echo "ERROR: OpenWebRX failed to start properly"
    return 1
}

# Wait for OpenWebRX to be ready
if ! wait_for_openwebrx; then
    echo "Exiting due to OpenWebRX startup failure"
    exit 1
fi

# Now we need to activate the HackRF device
# This is done by simulating the user clicking on the profile
echo "Activating HackRF device..."

# Create a Python script to interact with OpenWebRX's internal state
cat > /tmp/activate_hackrf.py << 'EOF'
#!/usr/bin/env python3
import requests
import json
import time
import websocket
import threading

def activate_hackrf():
    """Activate HackRF by connecting to OpenWebRX WebSocket and sending commands"""
    
    # OpenWebRX WebSocket URL
    ws_url = "ws://localhost:8073/ws/"
    
    def on_message(ws, message):
        print(f"Received: {message[:100]}...")
    
    def on_error(ws, error):
        print(f"WebSocket error: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print("WebSocket closed")
    
    def on_open(ws):
        print("WebSocket connection opened")
        
        # Send commands to activate the HackRF
        # First, select the SDR
        ws.send(json.dumps({
            "type": "sdrselect",
            "params": {"sdr": "hackrf"}
        }))
        time.sleep(1)
        
        # Then select the profile (2m band)
        ws.send(json.dumps({
            "type": "selectprofile", 
            "params": {"profile": "2m"}
        }))
        time.sleep(1)
        
        # Start the receiver
        ws.send(json.dumps({
            "type": "start"
        }))
        time.sleep(1)
        
        # Set squelch to minimum to hear everything
        ws.send(json.dumps({
            "type": "squelch",
            "params": {"level": -150}
        }))
        
        print("HackRF activation commands sent")
        time.sleep(2)
        ws.close()
    
    try:
        # Create WebSocket connection
        ws = websocket.WebSocketApp(ws_url,
                                  on_open=on_open,
                                  on_message=on_message,
                                  on_error=on_error,
                                  on_close=on_close)
        
        # Run the WebSocket connection
        ws.run_forever()
        print("HackRF activation completed")
        
    except Exception as e:
        print(f"Error activating HackRF: {e}")
        # Try alternative method using REST API if available
        try:
            # Some versions of OpenWebRX have REST endpoints
            response = requests.post("http://localhost:8073/api/sdr/hackrf/start",
                                   json={"profile": "2m"},
                                   timeout=5)
            if response.status_code == 200:
                print("HackRF activated via REST API")
            else:
                print(f"REST API activation failed: {response.status_code}")
        except:
            print("REST API method also failed")

if __name__ == "__main__":
    # Wait a bit more to ensure everything is ready
    time.sleep(5)
    activate_hackrf()
EOF

# Install websocket-client if not present
if ! python3 -c "import websocket" 2>/dev/null; then
    echo "Installing websocket-client..."
    pip3 install websocket-client || true
fi

# Run the activation script
python3 /tmp/activate_hackrf.py

# Alternative method: Use OpenWebRX's command line tools if available
if command -v openwebrx-admin >/dev/null 2>&1; then
    echo "Trying openwebrx-admin activation..."
    openwebrx-admin --activate-sdr hackrf --profile 2m || true
fi

# Log the status
echo "HackRF activation sequence completed"
echo "OpenWebRX should now be receiving on the 2m band"

# Keep the container running by waiting for the OpenWebRX process
wait $OPENWEBRX_PID
#!/bin/bash

# Test Backend API Endpoints

BASE_URL="http://localhost:8001"

echo "Testing Backend API on port 8001..."
echo "================================="

# Test health endpoint
echo -e "\n1. Testing /health endpoint:"
curl -s "$BASE_URL/health" | jq .

# Test devices endpoints
echo -e "\n2. Testing /api/devices endpoint:"
curl -s "$BASE_URL/api/devices" | jq .

echo -e "\n3. Testing /api/devices/:mac endpoint (should 404):"
curl -s "$BASE_URL/api/devices/00:11:22:33:44:55" | jq .

# Test TAK endpoints
echo -e "\n4. Testing /api/tak/status endpoint:"
curl -s "$BASE_URL/api/tak/status" | jq .

echo -e "\n5. Testing /api/tak/config endpoint:"
curl -s "$BASE_URL/api/tak/config" | jq .

# Test stats endpoint
echo -e "\n6. Testing /api/stats endpoint:"
curl -s "$BASE_URL/api/stats" | jq .

# Test antenna endpoint
echo -e "\n7. Testing /api/antenna endpoint:"
curl -s "$BASE_URL/api/antenna" | jq .

# Test scan endpoints
echo -e "\n8. Testing /api/scan/status endpoint:"
curl -s "$BASE_URL/api/scan/status" | jq .

# Test WebSocket info
echo -e "\n9. Testing WebSocket endpoints:"
echo "WebSocket endpoints are available at:"
echo "- Main WebSocket: ws://localhost:8001/socket.io/"
echo "- Device updates: socket.emit('device:subscribe')"
echo "- TAK updates: socket.emit('tak:subscribe')"

# Check CORS headers
echo -e "\n10. Checking CORS headers:"
curl -I -s "$BASE_URL/api/devices" | grep -i "access-control"

echo -e "\n================================="
echo "API test complete!"
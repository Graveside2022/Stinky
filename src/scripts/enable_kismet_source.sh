#!/bin/bash
# Script to auto-enable Kismet data source after startup

# Wait for Kismet to fully start
echo "Waiting for Kismet to start..."
for i in {1..30}; do
    if curl -s -u admin:admin http://localhost:2501/system/status.json >/dev/null 2>&1; then
        echo "Kismet is running"
        break
    fi
    sleep 1
done

# Wait a bit more for the web interface to be ready
sleep 5

# First, let's check what sources exist
echo "Checking existing datasources..."
SOURCES=$(curl -s -u admin:admin http://localhost:2501/datasource/all_sources.json 2>/dev/null)
echo "Current sources: $SOURCES"

# Count existing sources
SOURCE_COUNT=$(echo "$SOURCES" | jq '.datasources | length' 2>/dev/null || echo "0")
echo "Number of sources found: $SOURCE_COUNT"

if [ "$SOURCE_COUNT" = "0" ] || [ -z "$SOURCE_COUNT" ]; then
    echo "No datasource found, adding wlan2..."
    
    # Add the source using the correct API endpoint
    # Using form data which is what Kismet expects
    RESPONSE=$(curl -s -u admin:admin \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "json=%7B%22definition%22%3A%22wlan2%3Aname%3Dwlan2%2Ctype%3Dlinuxwifi%2Chop%3Dtrue%2Cchannel_hop_speed%3D5%2Fsec%22%7D" \
        http://localhost:2501/datasource/add_source.cmd 2>&1)
    
    echo "Add source response: $RESPONSE"
    
    # Wait for source to be created
    sleep 5
    
    # Get sources again
    SOURCES=$(curl -s -u admin:admin http://localhost:2501/datasource/all_sources.json 2>/dev/null)
fi

# Get the source UUID
SOURCE_UUID=$(echo "$SOURCES" | jq -r '.datasources[0].kismet_datasource_uuid' 2>/dev/null)

if [ ! -z "$SOURCE_UUID" ] && [ "$SOURCE_UUID" != "null" ]; then
    echo "Found datasource UUID: $SOURCE_UUID"
    
    # Check if it's already running
    IS_RUNNING=$(echo "$SOURCES" | jq -r '.datasources[0].kismet_datasource_running' 2>/dev/null)
    
    if [ "$IS_RUNNING" = "true" ]; then
        echo "Source is already running"
    else
        echo "Enabling datasource..."
        
        # Try different enable methods
        # Method 1: Direct enable
        ENABLE_RESPONSE=$(curl -s -u admin:admin \
            -X POST \
            http://localhost:2501/datasource/by-uuid/${SOURCE_UUID}/enable_source.json 2>&1)
        
        echo "Enable response: $ENABLE_RESPONSE"
        
        # Method 2: If that fails, try the open command
        if [[ "$ENABLE_RESPONSE" == *"error"* ]]; then
            echo "Trying open_source command..."
            curl -s -u admin:admin \
                -X POST \
                http://localhost:2501/datasource/by-uuid/${SOURCE_UUID}/open_source.json
        fi
    fi
else
    echo "Failed to find datasource UUID"
    echo "Full source data: $SOURCES"
fi

# Check final status
echo "Final datasource status:"
sleep 3
curl -s -u admin:admin http://localhost:2501/datasource/all_sources.json 2>/dev/null | \
    jq '.datasources[] | {name: .kismet_datasource_name, uuid: .kismet_datasource_uuid, running: .kismet_datasource_running, error: .kismet_datasource_error}' 2>/dev/null || echo "No sources found"
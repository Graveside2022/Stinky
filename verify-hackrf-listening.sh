#!/bin/bash

# verify-hackrf-listening.sh - Verify HackRF is actively listening in OpenWebRX
# This script checks multiple indicators to confirm auto-listening is working

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OPENWEBRX_URL="http://localhost:8073"
CONTAINER_NAME="openwebrx"
CHECK_INTERVAL=2
AUDIO_CHECK_DURATION=5

# Auto-detect container name if default doesn't exist
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    # Try to find OpenWebRX container with different name
    DETECTED_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i openwebrx | head -1)
    if [ -n "$DETECTED_CONTAINER" ]; then
        CONTAINER_NAME="$DETECTED_CONTAINER"
        echo -e "${YELLOW}Note: Using detected container name: $CONTAINER_NAME${NC}"
    fi
fi

# Auto-detect port if default doesn't work
if ! curl -s -o /dev/null "$OPENWEBRX_URL" 2>/dev/null; then
    # Try common OpenWebRX ports
    for port in 8074 8080 8000; do
        if curl -s -o /dev/null "http://localhost:$port" 2>/dev/null; then
            OPENWEBRX_URL="http://localhost:$port"
            echo -e "${YELLOW}Note: Using detected port: $port${NC}"
            break
        fi
    done
fi

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Verify that HackRF is actively listening and demodulating in OpenWebRX"
    echo
    echo "OPTIONS:"
    echo "  -h, --help          Show this help message"
    echo "  -m, --monitor       Start real-time monitoring immediately"
    echo "  -c, --container     Specify container name (default: openwebrx)"
    echo "  -u, --url           Specify OpenWebRX URL (default: http://localhost:8073)"
    echo "  -q, --quiet         Reduce output verbosity"
    echo
    echo "EXAMPLES:"
    echo "  $0                  Run basic verification checks"
    echo "  $0 -m               Run checks and start monitoring"
    echo "  $0 -c my_openwebrx  Use custom container name"
    echo "  $0 -u http://localhost:8080  Use custom URL"
    echo
}

# Parse command line arguments
MONITOR_MODE=false
QUIET_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -m|--monitor)
            MONITOR_MODE=true
            shift
            ;;
        -c|--container)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -u|--url)
            OPENWEBRX_URL="$2"
            shift 2
            ;;
        -q|--quiet)
            QUIET_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

if [ "$QUIET_MODE" = false ]; then
    echo -e "${BLUE}=== HackRF Auto-Listening Verification ===${NC}"
    echo "Checking if HackRF is actively receiving and demodulating signals..."
    echo "Container: $CONTAINER_NAME"
    echo "URL: $OPENWEBRX_URL"
    echo
fi

# Function to check if container is running
check_container() {
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${GREEN}✓ OpenWebRX container is running${NC}"
        return 0
    else
        echo -e "${RED}✗ OpenWebRX container is not running${NC}"
        return 1
    fi
}

# Function to check HackRF device status
check_hackrf_device() {
    echo -e "\n${BLUE}Checking HackRF device status...${NC}"
    
    # Check on host
    if hackrf_info >/dev/null 2>&1; then
        echo -e "${GREEN}✓ HackRF detected on host${NC}"
    else
        echo -e "${RED}✗ HackRF not detected on host${NC}"
        return 1
    fi
    
    # Check in container
    if docker exec "$CONTAINER_NAME" hackrf_info >/dev/null 2>&1; then
        echo -e "${GREEN}✓ HackRF accessible in container${NC}"
    else
        echo -e "${RED}✗ HackRF not accessible in container${NC}"
        return 1
    fi
}

# Function to check CPU usage for DSP activity
check_cpu_usage() {
    echo -e "\n${BLUE}Checking CPU usage for DSP activity...${NC}"
    
    # Get container CPU usage
    local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" "$CONTAINER_NAME" 2>/dev/null | sed 's/%//') || cpu_usage="0"
    
    echo "Container CPU usage: ${cpu_usage}%"
    
    # Check if CPU usage indicates active processing (using bash arithmetic)
    if [ -n "$cpu_usage" ] && [ "$cpu_usage" != "0.00" ]; then
        # Convert to integer for comparison (remove decimal)
        local cpu_int=$(echo "$cpu_usage" | cut -d'.' -f1)
        if [ "$cpu_int" -gt 5 ] 2>/dev/null; then
            echo -e "${GREEN}✓ DSP appears to be actively processing (CPU > 5%)${NC}"
        else
            echo -e "${YELLOW}⚠ Low CPU usage - may indicate no active demodulation${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Unable to determine CPU usage${NC}"
    fi
    
    # Check for DSP processes
    local dsp_procs=$(docker exec "$CONTAINER_NAME" ps aux 2>/dev/null | grep -E "(csdr|nmux|hackrf_transfer|rx_sdr)" | grep -v grep | wc -l)
    if [ "$dsp_procs" -gt 0 ]; then
        echo -e "${GREEN}✓ Found $dsp_procs DSP processes running${NC}"
        # Show process details
        echo "DSP processes:"
        docker exec "$CONTAINER_NAME" ps aux 2>/dev/null | grep -E "(csdr|nmux|hackrf_transfer|rx_sdr)" | grep -v grep | while read line; do
            echo "  - $(echo $line | awk '{print $11 " " $12 " " $13}')"
        done
    else
        echo -e "${RED}✗ No DSP processes found${NC}"
    fi
}

# Function to check OpenWebRX logs for activity
check_logs() {
    echo -e "\n${BLUE}Checking OpenWebRX logs for demodulation activity...${NC}"
    
    # Get recent logs
    local recent_logs=$(docker logs --tail 50 "$CONTAINER_NAME" 2>&1)
    
    # Check for client connections
    if echo "$recent_logs" | grep -q "client connected"; then
        echo -e "${GREEN}✓ Found recent client connections${NC}"
    fi
    
    # Check for demodulator activity
    if echo "$recent_logs" | grep -q "started demodulator"; then
        echo -e "${GREEN}✓ Demodulator has been started${NC}"
    fi
    
    # Check for errors
    if echo "$recent_logs" | grep -q "ERROR"; then
        echo -e "${RED}✗ Found errors in logs:${NC}"
        echo "$recent_logs" | grep "ERROR" | tail -5
    fi
    
    # Show last few log lines
    echo -e "\n${BLUE}Last 5 log entries:${NC}"
    docker logs --tail 5 "$CONTAINER_NAME" 2>&1
}

# Function to check web interface availability
check_web_interface() {
    echo -e "\n${BLUE}Checking web interface...${NC}"
    
    # Check if web interface is accessible
    if curl -s -o /dev/null -w "%{http_code}" "$OPENWEBRX_URL" | grep -q "200"; then
        echo -e "${GREEN}✓ Web interface is accessible at $OPENWEBRX_URL${NC}"
    else
        echo -e "${RED}✗ Web interface is not accessible${NC}"
        return 1
    fi
    
    # Check WebSocket status
    local ws_check=$(curl -s -H "Upgrade: websocket" -H "Connection: Upgrade" "$OPENWEBRX_URL/ws/" -w "%{http_code}" 2>/dev/null || true)
    if [[ "$ws_check" == *"101"* ]] || [[ "$ws_check" == *"400"* ]]; then
        echo -e "${GREEN}✓ WebSocket endpoint is responding${NC}"
    else
        echo -e "${YELLOW}⚠ WebSocket endpoint may not be working properly${NC}"
    fi
}

# Function to check audio stream
check_audio_stream() {
    echo -e "\n${BLUE}Checking audio stream endpoint...${NC}"
    
    # Try to access audio stream endpoint
    local audio_url="$OPENWEBRX_URL/api/audio"
    
    # Check if audio endpoint exists (this will vary based on OpenWebRX version)
    echo "Testing audio stream availability..."
    
    # Use timeout to prevent hanging
    if timeout 2 curl -s "$audio_url" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Audio endpoint is responsive${NC}"
    else
        echo -e "${YELLOW}⚠ Audio endpoint not directly accessible (may require WebSocket)${NC}"
    fi
}

# Function to check real-time spectrum data
check_spectrum_data() {
    echo -e "\n${BLUE}Checking for real-time spectrum data...${NC}"
    
    # Check if waterfall data is being generated
    local waterfall_procs=$(docker exec "$CONTAINER_NAME" ps aux | grep -E "(fft|waterfall)" | grep -v grep | wc -l)
    if [ "$waterfall_procs" -gt 0 ]; then
        echo -e "${GREEN}✓ Waterfall/FFT processes are running${NC}"
    else
        echo -e "${YELLOW}⚠ No waterfall/FFT processes detected${NC}"
    fi
}

# Function to check HackRF-specific configuration
check_hackrf_config() {
    echo -e "\n${BLUE}Checking HackRF configuration...${NC}"
    
    # Check SDR configuration
    local config_content=$(docker exec "$CONTAINER_NAME" cat /var/lib/openwebrx/sdrs.json 2>/dev/null || echo "{}")
    
    if echo "$config_content" | grep -q '"type": "hackrf"'; then
        echo -e "${GREEN}✓ Native HackRF driver is configured${NC}"
    elif echo "$config_content" | grep -q '"type": "soapy"'; then
        echo -e "${YELLOW}⚠ SoapySDR driver detected - may have compatibility issues${NC}"
        echo "  Consider switching to native HackRF driver"
    else
        echo -e "${RED}✗ Could not determine SDR driver type${NC}"
    fi
    
    # Check for profiles
    local profile_count=$(echo "$config_content" | grep -o '"profiles"' | wc -l)
    if [ "$profile_count" -gt 0 ]; then
        echo -e "${GREEN}✓ SDR profiles are configured${NC}"
        
        # List available profiles (simplified approach)
        echo "Available profiles:"
        docker exec "$CONTAINER_NAME" sh -c 'cat /var/lib/openwebrx/sdrs.json | grep -A 20 "profiles" | grep -oE "\"[a-zA-Z0-9_]+\":" | head -5 | sed "s/[\":]//g"' 2>/dev/null | while read profile; do
            [ -n "$profile" ] && echo "  - $profile"
        done
    else
        echo -e "${YELLOW}⚠ No SDR profiles found${NC}"
    fi
    
    # Check for auto-start configuration
    if echo "$config_content" | grep -q '"start_freq"'; then
        echo -e "${GREEN}✓ Auto-start frequency configured${NC}"
    else
        echo -e "${YELLOW}⚠ No auto-start frequency - manual tuning required${NC}"
    fi
}

# Function to monitor real-time status
monitor_realtime() {
    echo -e "\n${BLUE}Real-time monitoring (${CHECK_INTERVAL}s intervals)...${NC}"
    echo "Press Ctrl+C to stop monitoring"
    echo
    
    local iteration=0
    while true; do
        iteration=$((iteration + 1))
        echo -e "${YELLOW}--- Update #$iteration - $(date) ---${NC}"
        
        # Get CPU usage
        local cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" "$CONTAINER_NAME" 2>/dev/null || echo "N/A")
        echo "CPU: $cpu"
        
        # Get memory usage
        local mem=$(docker stats --no-stream --format "{{.MemUsage}}" "$CONTAINER_NAME" 2>/dev/null || echo "N/A")
        echo "Memory: $mem"
        
        # Check for active DSP processes
        local dsp_count=$(docker exec "$CONTAINER_NAME" ps aux 2>/dev/null | grep -E "(csdr|nmux)" | grep -v grep | wc -l || echo "0")
        echo "Active DSP processes: $dsp_count"
        
        # Check for recent log activity
        local recent_activity=$(docker logs --since "${CHECK_INTERVAL}s" "$CONTAINER_NAME" 2>&1 | wc -l || echo "0")
        echo "Log entries in last ${CHECK_INTERVAL}s: $recent_activity"
        
        # Check if specific profile is active
        local active_profile=$(docker logs --tail 20 "$CONTAINER_NAME" 2>&1 | grep -o "activating profile: [^\"]*" | tail -1 | cut -d' ' -f3 || echo "unknown")
        if [ -n "$active_profile" ] && [ "$active_profile" != "unknown" ]; then
            echo -e "${GREEN}Active profile: $active_profile${NC}"
        fi
        
        echo
        sleep "$CHECK_INTERVAL"
    done
}

# Function to provide summary and recommendations
provide_summary() {
    echo -e "\n${BLUE}=== Summary ===${NC}"
    
    if docker exec "$CONTAINER_NAME" ps aux | grep -E "(csdr|nmux)" | grep -v grep >/dev/null 2>&1; then
        echo -e "${GREEN}✓ HackRF appears to be actively listening and demodulating${NC}"
        echo "  - DSP processes are running"
        echo "  - Container is consuming CPU resources"
        echo "  - Web interface is accessible"
    else
        echo -e "${YELLOW}⚠ HackRF may not be actively demodulating${NC}"
        echo
        echo "To enable auto-listening:"
        echo "1. Access the web interface at $OPENWEBRX_URL"
        echo "2. Click on a frequency in the waterfall"
        echo "3. Select a demodulation mode (NFM, AM, etc.)"
        echo "4. Audio should start streaming automatically"
        echo
        echo "Or use the profile auto-activation configuration in the docker-compose.yml"
    fi
}

# Main execution
main() {
    # Basic checks
    if ! check_container; then
        echo -e "${RED}Please start the OpenWebRX container first:${NC}"
        echo "docker-compose up -d"
        exit 1
    fi
    
    check_hackrf_device
    check_hackrf_config
    check_web_interface
    check_cpu_usage
    check_logs
    check_audio_stream
    check_spectrum_data
    
    provide_summary
    
    # Start monitoring if requested via command line
    if [ "$MONITOR_MODE" = true ]; then
        monitor_realtime
    else
        # Ask if user wants real-time monitoring
        echo
        read -p "Would you like to start real-time monitoring? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            monitor_realtime
        fi
    fi
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${BLUE}Monitoring stopped${NC}"; exit 0' INT

# Run main function
main
#!/bin/bash
# Final verification that all frequency profiles are available and functional

echo "🎯 Final OpenWebRX Profile Verification"
echo "========================================"

# Check 1: Container status
echo -e "\n1️⃣ Container Status:"
if docker ps | grep -q "openwebrx-hackrf"; then
    echo "✅ OpenWebRX container is running"
    CONTAINER_STATUS=true
else
    echo "❌ OpenWebRX container is not running"
    CONTAINER_STATUS=false
fi

# Check 2: Web interface accessibility
echo -e "\n2️⃣ Web Interface:"
if curl -s --max-time 5 http://localhost:8073/ > /dev/null; then
    echo "✅ Web interface accessible at http://localhost:8073"
    WEB_STATUS=true
else
    echo "❌ Web interface not accessible"
    WEB_STATUS=false
fi

# Check 3: Configuration verification
echo -e "\n3️⃣ Profile Configuration:"
if docker exec openwebrx-hackrf test -f /var/lib/openwebrx/sdrs.json; then
    echo "✅ SDR configuration file exists"
    
    # Count profiles
    PROFILE_COUNT=$(docker exec openwebrx-hackrf jq '.sdrs.hackrf.profiles | length' /var/lib/openwebrx/sdrs.json 2>/dev/null)
    if [ "$PROFILE_COUNT" -gt 0 ]; then
        echo "✅ Found $PROFILE_COUNT frequency profiles"
        
        # List each profile with key details
        echo -e "\n📻 Available Profiles:"
        docker exec openwebrx-hackrf jq -r '
            .sdrs.hackrf.profiles | 
            to_entries[] | 
            "  • \(.key | ascii_upcase): \(.value.name) (\(.value.center_freq / 1000000)MHz, \(.value.start_mod | ascii_upcase))"
        ' /var/lib/openwebrx/sdrs.json 2>/dev/null
        
        CONFIG_STATUS=true
    else
        echo "❌ No profiles found in configuration"
        CONFIG_STATUS=false
    fi
else
    echo "❌ SDR configuration file not found"
    CONFIG_STATUS=false
fi

# Check 4: HackRF hardware
echo -e "\n4️⃣ HackRF Hardware:"
if lsusb | grep -q "1d50:6089"; then
    echo "✅ HackRF One detected on host"
    if docker exec openwebrx-hackrf ls /dev/bus/usb/001/ | grep -q "005"; then
        echo "✅ HackRF accessible in container"
        HACKRF_STATUS=true
    else
        echo "❌ HackRF not accessible in container"
        HACKRF_STATUS=false
    fi
else
    echo "❌ HackRF One not detected"
    HACKRF_STATUS=false
fi

# Check 5: Required profiles verification
echo -e "\n5️⃣ Required Profiles Check:"
REQUIRED_PROFILES=("2m" "70cm" "fm_broadcast" "airband")
MISSING_PROFILES=()

for profile in "${REQUIRED_PROFILES[@]}"; do
    if docker exec openwebrx-hackrf jq -e ".sdrs.hackrf.profiles.${profile}" /var/lib/openwebrx/sdrs.json >/dev/null 2>&1; then
        echo "✅ $profile profile configured"
    else
        echo "❌ $profile profile missing"
        MISSING_PROFILES+=("$profile")
    fi
done

if [ ${#MISSING_PROFILES[@]} -eq 0 ]; then
    PROFILES_COMPLETE=true
else
    PROFILES_COMPLETE=false
fi

# Summary
echo -e "\n" "="*50
echo "📊 VERIFICATION SUMMARY"
echo "="*50

CHECKS=(
    "Container Running:$CONTAINER_STATUS"
    "Web Interface:$WEB_STATUS"
    "Configuration:$CONFIG_STATUS"
    "HackRF Hardware:$HACKRF_STATUS"
    "All Profiles:$PROFILES_COMPLETE"
)

ALL_PASSED=true
for check in "${CHECKS[@]}"; do
    name="${check%:*}"
    status="${check#*:}"
    if [ "$status" = "true" ]; then
        echo "✅ $name"
    else
        echo "❌ $name"
        ALL_PASSED=false
    fi
done

echo -e "\n" "="*50

if [ "$ALL_PASSED" = "true" ]; then
    echo "🎉 ALL CHECKS PASSED!"
    echo ""
    echo "Multiple frequency profiles are properly configured and available:"
    echo "• 2M Amateur Band (145 MHz, NFM)"
    echo "• 70CM Amateur Band (433 MHz, NFM)"  
    echo "• FM Broadcast Band (100 MHz, WFM)"
    echo "• Airband (120 MHz, AM)"
    echo ""
    echo "🌐 Access OpenWebRX: http://localhost:8073"
    echo "🔑 Login: admin / hackrf"
    echo "🎛️ Profiles selectable from dropdown in web interface"
    echo ""
    echo "✨ The system is ready for multi-band SDR operations!"
else
    echo "⚠️  SOME CHECKS FAILED"
    echo ""
    echo "Issues detected that need attention:"
    [ "$CONTAINER_STATUS" = "false" ] && echo "• Start OpenWebRX container"
    [ "$WEB_STATUS" = "false" ] && echo "• Check network connectivity"
    [ "$CONFIG_STATUS" = "false" ] && echo "• Verify SDR configuration"
    [ "$HACKRF_STATUS" = "false" ] && echo "• Check HackRF connection"
    [ "$PROFILES_COMPLETE" = "false" ] && echo "• Add missing profiles: ${MISSING_PROFILES[*]}"
fi

echo ""
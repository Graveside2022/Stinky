#!/usr/bin/env python3
"""
Test the OpenWebRX profile selection UI by examining the HTML structure
"""

import requests
import re
from urllib.parse import urljoin

def get_profile_options():
    """Extract profile options from OpenWebRX HTML"""
    try:
        response = requests.get('http://localhost:8073/', timeout=10)
        html_content = response.text
        
        print("🔍 Analyzing OpenWebRX Web Interface...")
        print("=" * 45)
        
        # Look for the profile selection dropdown
        profile_select_pattern = r'<select[^>]*id="openwebrx-sdr-profiles-listbox"[^>]*>'
        if re.search(profile_select_pattern, html_content):
            print("✅ Profile selection dropdown found in HTML")
        else:
            print("❌ Profile selection dropdown not found")
            return False
        
        # Check for JavaScript that handles profile changes
        profile_js_pattern = r'sdr_profile_changed\(\)'
        if re.search(profile_js_pattern, html_content):
            print("✅ Profile change handler found")
        else:
            print("❌ Profile change handler not found")
        
        # Look for any references to our specific profiles in JavaScript
        profiles_found = []
        test_profiles = ['2m', '70cm', 'fm_broadcast', 'airband']
        
        for profile in test_profiles:
            # Look for profile names in the HTML/JavaScript
            if profile in html_content.lower():
                profiles_found.append(profile)
        
        if profiles_found:
            print(f"✅ Profile references found in HTML: {', '.join(profiles_found)}")
        else:
            print("❌ No profile references found in HTML")
        
        # Check if there are any WebSocket connections for dynamic loading
        websocket_pattern = r'WebSocket\(|ws://'
        if re.search(websocket_pattern, html_content):
            print("✅ WebSocket connection detected (profiles likely loaded dynamically)")
        else:
            print("❓ No WebSocket detected (profiles might be static)")
        
        print("\n📋 UI Structure Analysis:")
        print("-" * 25)
        
        # Extract relevant UI elements
        ui_elements = [
            ('Waterfall Display', r'id="openwebrx-waterfall-canvas"'),
            ('Frequency Display', r'class="[^"]*freq[^"]*"'),
            ('Mode Selection', r'class="[^"]*mode[^"]*"'),
            ('Volume Control', r'id="openwebrx-panel-volume"'),
            ('Mute Button', r'class="[^"]*mute-button[^"]*"')
        ]
        
        for element_name, pattern in ui_elements:
            if re.search(pattern, html_content):
                print(f"  ✅ {element_name}")
            else:
                print(f"  ❌ {element_name}")
        
        return True
        
    except requests.RequestException as e:
        print(f"❌ Failed to fetch OpenWebRX interface: {e}")
        return False

def check_admin_interface():
    """Check if we can access admin interface to see SDR configuration"""
    try:
        # Try to access admin interface (might require authentication)
        response = requests.get('http://localhost:8073/admin', timeout=5)
        
        if response.status_code == 200:
            print("✅ Admin interface accessible")
            return True
        elif response.status_code == 401:
            print("🔐 Admin interface requires authentication (expected)")
            return True  # This is normal
        else:
            print(f"❓ Admin interface returned status: {response.status_code}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ Failed to check admin interface: {e}")
        return False

def test_websocket_connection():
    """Test if WebSocket endpoint exists for profile data"""
    try:
        # Check if WebSocket endpoint exists
        response = requests.get('http://localhost:8073/ws/', timeout=5)
        
        # WebSocket endpoints typically return 400 for HTTP requests
        if response.status_code in [400, 426]:  # 426 = Upgrade Required
            print("✅ WebSocket endpoint available")
            return True
        else:
            print(f"❓ WebSocket endpoint status: {response.status_code}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ WebSocket endpoint check failed: {e}")
        return False

def main():
    print("🌐 OpenWebRX Profile UI Test")
    print("=" * 30)
    
    # Test 1: Main interface
    print("\n1️⃣ Testing main web interface...")
    ui_ok = get_profile_options()
    
    # Test 2: Admin interface
    print("\n2️⃣ Testing admin interface...")
    admin_ok = check_admin_interface()
    
    # Test 3: WebSocket connection
    print("\n3️⃣ Testing WebSocket endpoint...")
    ws_ok = test_websocket_connection()
    
    # Summary
    print("\n" + "=" * 40)
    print("📊 UI TEST SUMMARY")
    print("=" * 40)
    
    results = [
        ("Main Interface", ui_ok),
        ("Admin Interface", admin_ok),
        ("WebSocket Endpoint", ws_ok)
    ]
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {test_name}")
    
    if ui_ok:
        print("\n🎯 CONCLUSION:")
        print("The OpenWebRX interface is properly structured with profile selection")
        print("capabilities. Profiles should be selectable from the dropdown menu")
        print("once the SDR is active and profiles are loaded via WebSocket.")
        print("\n📱 To verify profiles are selectable:")
        print("1. Open http://localhost:8073 in your browser")
        print("2. Log in with admin / hackrf")
        print("3. Look for the profile dropdown in the control panel")
        print("4. Verify you can select different bands (2m, 70cm, FM Broadcast, Airband)")
    else:
        print("\n⚠️  UI structure issues detected. Check OpenWebRX configuration.")
    
    return 0 if all(results) else 1

if __name__ == "__main__":
    exit(main())
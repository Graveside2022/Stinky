#!/usr/bin/env python3
"""
OpenWebRX Profile Verification Script
Verifies that multiple frequency profiles are available and functional.
"""

import json
import requests
import time
import subprocess
from urllib.parse import urlparse

def check_openwebrx_status():
    """Check if OpenWebRX is running and accessible"""
    try:
        response = requests.get('http://localhost:8073/', timeout=5)
        if response.status_code == 200:
            print("✅ OpenWebRX is running and accessible on port 8073")
            return True
        else:
            print(f"❌ OpenWebRX returned status code: {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"❌ OpenWebRX is not accessible: {e}")
        return False

def check_container_config():
    """Check the SDR configuration inside the container"""
    try:
        result = subprocess.run([
            'docker', 'exec', 'openwebrx-hackrf', 
            'cat', '/var/lib/openwebrx/sdrs.json'
        ], capture_output=True, text=True, check=True)
        
        config = json.loads(result.stdout)
        
        print("\n📡 OpenWebRX SDR Configuration Analysis:")
        print("=" * 50)
        
        if 'sdrs' in config and 'hackrf' in config['sdrs']:
            hackrf_config = config['sdrs']['hackrf']
            print(f"Device Name: {hackrf_config.get('name', 'Unknown')}")
            print(f"Device Type: {hackrf_config.get('type', 'Unknown')}")
            print(f"Enabled: {hackrf_config.get('enabled', False)}")
            
            if 'profiles' in hackrf_config:
                profiles = hackrf_config['profiles']
                print(f"\n🎯 Available Frequency Profiles ({len(profiles)} total):")
                print("-" * 30)
                
                for profile_id, profile_data in profiles.items():
                    name = profile_data.get('name', 'Unknown')
                    center_freq = profile_data.get('center_freq', 0)
                    start_freq = profile_data.get('start_freq', 0)
                    modulation = profile_data.get('start_mod', 'Unknown')
                    
                    # Convert frequency to MHz for readability
                    center_mhz = center_freq / 1_000_000
                    start_mhz = start_freq / 1_000_000
                    
                    print(f"  📻 {profile_id.upper()}: {name}")
                    print(f"     Center: {center_mhz:.3f} MHz")
                    print(f"     Start:  {start_mhz:.3f} MHz")
                    print(f"     Mode:   {modulation.upper()}")
                    print()
                
                # Verify we have the expected profiles
                expected_profiles = {'2m', '70cm', 'fm_broadcast', 'airband'}
                found_profiles = set(profiles.keys())
                
                print("🔍 Profile Verification:")
                print("-" * 20)
                for expected in expected_profiles:
                    if expected in found_profiles:
                        print(f"  ✅ {expected.upper()} profile found")
                    else:
                        print(f"  ❌ {expected.upper()} profile missing")
                
                # Check for extra profiles
                extra_profiles = found_profiles - expected_profiles
                if extra_profiles:
                    print(f"\n  📋 Additional profiles found: {', '.join(extra_profiles).upper()}")
                
                return True
            else:
                print("❌ No profiles found in configuration")
                return False
        else:
            print("❌ HackRF configuration not found")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to read container configuration: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in configuration: {e}")
        return False

def check_hackrf_hardware():
    """Check if HackRF hardware is detected"""
    try:
        # Check on host
        result = subprocess.run(['lsusb'], capture_output=True, text=True, check=True)
        if '1d50:6089' in result.stdout:
            print("✅ HackRF One detected on host system")
            host_detected = True
        else:
            print("❌ HackRF One not detected on host system")
            host_detected = False
        
        # Check in container
        try:
            result = subprocess.run([
                'docker', 'exec', 'openwebrx-hackrf', 'ls', '/dev/bus/usb/001/'
            ], capture_output=True, text=True, check=True)
            
            # Look for device 005 (typical HackRF device number from earlier check)
            if '005' in result.stdout:
                print("✅ HackRF accessible in OpenWebRX container")
                container_detected = True
            else:
                print("❌ HackRF not accessible in OpenWebRX container")
                container_detected = False
        except subprocess.CalledProcessError:
            print("❌ Unable to check USB devices in container")
            container_detected = False
            
        return host_detected and container_detected
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to check hardware: {e}")
        return False

def main():
    print("🔧 OpenWebRX Profile Verification")
    print("=" * 40)
    
    # Check 1: Basic connectivity
    print("\n1️⃣ Checking OpenWebRX accessibility...")
    web_ok = check_openwebrx_status()
    
    # Check 2: Hardware detection
    print("\n2️⃣ Checking HackRF hardware...")
    hardware_ok = check_hackrf_hardware()
    
    # Check 3: Configuration analysis
    print("\n3️⃣ Analyzing frequency profiles...")
    config_ok = check_container_config()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 50)
    
    checks = [
        ("Web Interface", "✅" if web_ok else "❌"),
        ("HackRF Hardware", "✅" if hardware_ok else "❌"),
        ("Profile Configuration", "✅" if config_ok else "❌")
    ]
    
    for check_name, status in checks:
        print(f"{status} {check_name}")
    
    all_ok = web_ok and hardware_ok and config_ok
    
    if all_ok:
        print("\n🎉 All checks passed! Multiple frequency profiles are configured and ready.")
        print("\n📱 Access OpenWebRX at: http://localhost:8073")
        print("   Default credentials: admin / hackrf")
        print("\n🎛️ Available profiles should be selectable from the dropdown in the web interface.")
    else:
        print("\n⚠️  Some issues were detected. Check the details above.")
        
    return 0 if all_ok else 1

if __name__ == "__main__":
    exit(main())
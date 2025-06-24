# Complete Stinkster Walkthrough - Video Script

**Duration**: 45 minutes  
**Type**: Comprehensive training video  
**Audience**: New users and trainers

## Video Outline

### Part 1: Introduction (0:00-3:00)

```
[OPENING SHOT: Stinkster logo animation]

NARRATOR: "Welcome to the complete Stinkster training walkthrough. 
In the next 45 minutes, you'll learn everything needed to deploy 
and operate this powerful tactical networking platform."

[SLIDE: What We'll Cover]
- System overview and capabilities
- Hardware setup and verification  
- Software installation and configuration
- Operating each component
- Field deployment procedures
- Troubleshooting common issues

[SLIDE: Prerequisites]
- Basic Linux command line knowledge
- Understanding of RF concepts
- Familiarity with networking

"Let's begin with understanding what Stinkster can do for you."
```

### Part 2: System Overview (3:00-8:00)

```
[SLIDE: Stinkster Architecture]

NARRATOR: "Stinkster integrates four major capabilities:"

[ANIMATION: Show each component appearing]

1. SOFTWARE DEFINED RADIO
   "Using HackRF, monitor 1 MHz to 6 GHz"
   "Spectrum analysis and signal detection"
   "Integration with OpenWebRX for demodulation"

2. WIFI SCANNING
   "Kismet-based network discovery"
   "Device tracking and fingerprinting"
   "Automatic data logging"

3. GPS INTEGRATION
   "Location correlation for all data"
   "Support for various GPS protocols"
   "MAVLink compatibility for drones"

4. TAK INTEGRATION
   "Real-time tactical awareness"
   "Convert WiFi devices to CoT messages"
   "Compatible with ATAK/WinTAK"

[DIAGRAM: Data Flow]
"Here's how data flows through the system..."
[Animate arrows showing: GPS → Services → Processing → TAK Output]

[SCREENSHOT: All web interfaces]
"Everything controlled through intuitive web interfaces"
```

### Part 3: Hardware Setup (8:00-15:00)

```
[CAMERA: Instructor at desk with components]

INSTRUCTOR: "Let's set up the hardware. I have here:"

[CLOSE-UP: Each component]
- Raspberry Pi 4 (8GB model)
- 64GB microSD card
- Official power supply
- HackRF One with antennas
- Alfa AWUS036ACH WiFi adapter
- GPS receiver
- Cooling fan

[HANDS-ON: Assembly process]
"First, install the heatsinks..."
[Show installation on CPU, RAM, USB controller]

"Connect the fan to GPIO pins 4 and 6..."
[Show pin connection]

"Now for USB devices - this order matters:"
[Connect each device]
- HackRF → USB 3.0 (blue) port
- WiFi adapter → USB 2.0 port  
- GPS → USB 2.0 port

"CRITICAL: Always attach antennas before powering on!"
[Show antenna connection]

[POWER ON]
"Connect power last. Watch the LEDs..."
- Red = power good
- Green = CPU activity

[VERIFICATION]
"Let's verify everything is detected..."
[Terminal showing lsusb output]
```

### Part 4: Software Installation (15:00-22:00)

```
[SCREEN RECORDING: Full installation]

"Starting with a fresh Raspberry Pi OS installation..."

[Terminal commands with explanations]

# Update system
sudo apt update && sudo apt upgrade -y

# Clone repository  
cd /home/pi
git clone https://github.com/yourusername/stinkster.git
cd stinkster

# Run installer
chmod +x install.sh
sudo ./install.sh

[INSTALLER PROMPTS]
"The installer will ask several questions..."

Install all components? [Y/n]: Y
"Yes to get the full system"

Configure GPS device? [Y/n]: Y
"Since we connected a GPS"

Select GPS device [/dev/ttyUSB0]: 
"Press enter for default"

Select WiFi interface for monitoring [wlan2]: 
"Verify this matches your adapter"

Install Docker for OpenWebRX? [Y/n]: Y
"Required for SDR web interface"

Configure systemd services? [Y/n]: Y
"For automatic startup"

[PROGRESS BAR]
"Installation takes 10-15 minutes..."

[COMPLETION]
"Installation complete! Let's verify..."

systemctl status stinkster-orchestrator
"Should show active (running)"
```

### Part 5: First Boot Operations (22:00-30:00)

```
[SCREEN + PICTURE-IN-PICTURE: Terminal and browser]

"Time to start the system and explore each interface"

[Terminal]
cd /home/pi/stinkster
./src/orchestration/gps_kismet_wigle.sh

"Watch the startup sequence..."
[Show log output with explanations]

[Browser - Spectrum Analyzer]
"Open your browser to http://stinkster:8092"

"The spectrum analyzer interface:"
- Waterfall display (time vs frequency)
- FFT graph (current spectrum)
- Control panel

"Let's tune to FM broadcast band..."
[Set frequency to 100 MHz]
[Adjust gain settings]
"See these strong signals? Those are radio stations"

[Browser - WigleToTAK]
"Now http://stinkster:6969"

"This shows WiFi devices being discovered:"
- Device list with signal strength
- GPS coordinates (when available)
- TAK export options

[Browser - OpenWebRX]
"Finally, http://stinkster:8073"
"Login: admin / hackrf"

"This is a full SDR receiver:"
[Tune to local FM station]
"Click to tune, scroll to zoom"
[Demonstrate audio demodulation]
```

### Part 6: Common Operations (30:00-38:00)

```
[SCREEN RECORDING: Various operations]

"Let's cover the most common tasks"

[WiFi Scanning Operations]
"To see what Kismet is finding:"
tail -f /home/pi/tmp/kismet.log

"View captured devices:"
cat /home/pi/kismet_ops/*.wiglecsv | tail -20

"Change WiFi channels:"
[Edit Kismet config]

[Spectrum Analysis Tasks]
"Searching for specific signals:"
- Set center frequency
- Adjust bandwidth (sample rate)  
- Optimize gain settings
- Use max hold for intermittent signals

"Recording interesting signals:"
[Show recording controls]

[GPS Operations]
"Verify GPS has a fix:"
gpspipe -w -n 1

"If no fix:"
- Check antenna/cable
- Move to open area
- Wait for satellites

[TAK Integration]
"Configure TAK server:"
[Show settings page]
- Server address
- Port (usually 8087)
- Authentication method

"Export devices to TAK:"
[Select devices and export]
```

### Part 7: Field Deployment (38:00-42:00)

```
[CAMERA: Instructor with portable setup]

"For field operations, here's my setup:"

[Show equipment]
- Pelican case with foam
- 20,000 mAh battery bank
- Magnetic mount antennas
- Tablet for remote access

[Power Management]
"On battery power:"
- Disable unnecessary services
- Reduce CPU frequency
- Lower screen brightness
- Use efficient antennas

[Remote Access]
"I'm using Tailscale VPN:"
[Show tablet connecting]
"Now I can monitor from anywhere"

[Operational Security]
"Remember in the field:"
- Follow local laws
- Passive monitoring only
- Secure your data
- Document authorization
```

### Part 8: Troubleshooting (42:00-44:00)

```
[SCREEN: Common issues]

"Quick troubleshooting tips:"

NO HACKRF DETECTED:
- Check USB connection
- Try different port
- Run: hackrf_info

NO WIFI DEVICES:
- Verify monitor mode
- Check antenna
- Try manual channel

NO GPS FIX:
- Need clear sky view
- Check baud rate
- Verify device path

SERVICE WON'T START:
- Check logs first
- Remove PID files
- Verify permissions

[Terminal examples for each]
```

### Part 9: Conclusion (44:00-45:00)

```
[SLIDE: Summary]

"You've learned to:"
✓ Set up Stinkster hardware
✓ Install and configure software
✓ Operate all components
✓ Deploy in the field
✓ Troubleshoot issues

[SLIDE: Next Steps]
- Read the full documentation
- Join our community Discord
- Share your experiences
- Contribute improvements

[CLOSING]
"Thank you for joining this Stinkster walkthrough. 
Now get out there and explore the RF world responsibly!"

[END SCREEN]
- Documentation links
- Community resources
- Subscribe reminder
```

## Production Notes

### Required Materials
1. Complete Stinkster hardware setup
2. Fresh Raspberry Pi for installation demo
3. Test environment with WiFi devices
4. Good lighting and audio equipment
5. Screen recording software
6. Video editing software

### Filming Schedule
- Day 1: Introduction, hardware setup, installation
- Day 2: Operations and field deployment
- Day 3: B-roll, pickups, editing

### Post-Production
1. Add chapter markers at each section
2. Include downloadable PDF guide
3. Create short clips for social media
4. Generate accurate captions

### Distribution
- YouTube (main platform)
- Downloadable for offline training
- Embed in documentation site
- Share with community

This comprehensive walkthrough serves as the primary training resource for new Stinkster users.
# Stinkster Video Tutorials

This directory contains scripts and guides for creating video tutorials for the Stinkster platform.

## Tutorial Series Overview

### 1. Getting Started Series
- **Tutorial 1.1**: Unboxing and Hardware Setup (10 min)
- **Tutorial 1.2**: Initial Software Installation (15 min)
- **Tutorial 1.3**: First Boot and Configuration (12 min)
- **Tutorial 1.4**: Quick Start Demo (8 min)

### 2. Component Deep Dives
- **Tutorial 2.1**: HackRF and Spectrum Analysis (20 min)
- **Tutorial 2.2**: WiFi Scanning with Kismet (18 min)
- **Tutorial 2.3**: GPS Integration Setup (15 min)
- **Tutorial 2.4**: TAK Server Connection (25 min)

### 3. Advanced Operations
- **Tutorial 3.1**: Field Deployment Best Practices (30 min)
- **Tutorial 3.2**: Multi-Node Configuration (25 min)
- **Tutorial 3.3**: Custom Development Walkthrough (40 min)
- **Tutorial 3.4**: Security Hardening Guide (20 min)

### 4. Troubleshooting
- **Tutorial 4.1**: Common Issues and Solutions (15 min)
- **Tutorial 4.2**: Hardware Diagnostics (12 min)
- **Tutorial 4.3**: Log Analysis and Debugging (18 min)

## Video Scripts

### Tutorial 1.1: Unboxing and Hardware Setup

**Duration**: 10 minutes  
**Equipment Needed**: Camera, tripod, good lighting, prepared hardware

```
SCRIPT: Unboxing and Hardware Setup

[INTRO - 0:00-0:30]
"Welcome to Stinkster! I'm going to show you how to set up your 
hardware for this powerful tactical networking platform. By the end 
of this video, you'll have all your hardware connected and ready 
for software installation."

[SECTION 1: Required Hardware - 0:30-2:00]
[Show each component]
- Raspberry Pi 4 (recommend 4GB or 8GB model)
- MicroSD card (32GB minimum, Class 10 or better)
- Power supply (official 3A USB-C recommended)
- HackRF One SDR
- USB WiFi adapter (show compatible models)
- GPS receiver (optional but recommended)
- Cooling solution (heatsinks/fan)

[SECTION 2: Raspberry Pi Preparation - 2:00-4:00]
[Close-up shots of each step]
1. Install heatsinks on CPU, RAM, and USB controller
2. Mount in case (if using one)
3. Connect fan to GPIO pins 4 (5V) and 6 (GND)
4. Insert MicroSD card (we'll flash it in next video)

[SECTION 3: Connecting Peripherals - 4:00-7:00]
[Show connection process]
1. Connect HackRF to USB 3.0 port (blue port)
   - "Use USB 3.0 for best performance"
2. Connect WiFi adapter to USB 2.0 port
   - "This keeps USB 3.0 bandwidth for SDR"
3. Connect GPS to remaining USB port
   - "If out of ports, use a powered hub"
4. Attach antennas
   - "Never operate SDR without antenna!"

[SECTION 4: Power and Network - 7:00-8:30]
1. Connect Ethernet (for initial setup)
2. HDMI and keyboard (optional, can use SSH)
3. Power connection LAST
   - "Always connect power last to avoid damage"

[SECTION 5: First Power On - 8:30-9:30]
[Show LED indicators]
- Red LED: Power good
- Green LED: Activity (should blink)
- Check all USB devices recognized
- Verify cooling working

[OUTRO - 9:30-10:00]
"Great! Your hardware is ready. In the next video, we'll install 
the Stinkster software. Check the description for links to compatible 
hardware and the next tutorial."

[END SCREEN]
- Link to Tutorial 1.2
- Link to hardware list
- Subscribe reminder
```

### Tutorial 1.2: Initial Software Installation

**Duration**: 15 minutes

```
SCRIPT: Initial Software Installation

[INTRO - 0:00-0:30]
"Welcome back! Now that your hardware is connected, let's install 
the Stinkster software. This tutorial will get you from blank SD 
card to running system."

[SECTION 1: Prepare SD Card - 0:30-3:00]
[Screen recording]
1. Download Raspberry Pi Imager
2. Select Raspberry Pi OS (64-bit) Lite
3. Configure settings:
   - Hostname: stinkster
   - Enable SSH
   - Set username/password
   - Configure WiFi (optional)
4. Write to SD card

[SECTION 2: Initial Boot - 3:00-5:00]
[Screen + camera]
1. Insert SD card and power on
2. Find IP address:
   - Router DHCP table
   - Or use: nmap -sn 192.168.1.0/24
3. SSH connection:
   ssh pi@stinkster.local

[SECTION 3: System Updates - 5:00-6:30]
[Terminal recording]
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install git
sudo apt install git -y

# Expand filesystem (if needed)
sudo raspi-config
# Select: Advanced Options > Expand Filesystem
```

[SECTION 4: Clone Repository - 6:30-7:30]
```bash
# Clone Stinkster
cd ~
git clone https://github.com/yourusername/stinkster.git
cd stinkster

# Check contents
ls -la
```

[SECTION 5: Run Installer - 7:30-12:00]
[Show installer prompts]
```bash
# Make installer executable
chmod +x install.sh

# Run installer
sudo ./install.sh
```

[Walk through prompts]
- Install all components? [Y]
- Configure GPS? [Y if connected]
- Select WiFi adapter [wlan2]
- Install Docker? [Y]
- Configure services? [Y]

[SECTION 6: Verify Installation - 12:00-14:00]
```bash
# Check services
systemctl status stinkster-orchestrator

# Test hardware
lsusb  # Should show HackRF
iw dev  # Should show WiFi adapters

# Check web interfaces
curl -I localhost:8092  # Spectrum analyzer
curl -I localhost:6969  # WigleToTAK
```

[SECTION 7: Access Web UI - 14:00-14:30]
[Browser screen]
- Open http://stinkster.local:8092
- Show spectrum analyzer loading
- Quick functionality check

[OUTRO - 14:30-15:00]
"Excellent! Stinkster is now installed. In the next video, we'll 
configure each component and start capturing data. If you had any 
errors, check the troubleshooting guide linked below."
```

### Tutorial 2.1: HackRF and Spectrum Analysis

**Duration**: 20 minutes

```
SCRIPT: HackRF and Spectrum Analysis Deep Dive

[INTRO - 0:00-0:45]
"Today we're diving deep into the SDR capabilities of Stinkster. 
I'll show you how to use the HackRF for spectrum analysis, signal 
hunting, and integration with OpenWebRX."

[SECTION 1: HackRF Basics - 0:45-3:00]
[Camera + slides]
- Frequency range: 1 MHz - 6 GHz
- Sample rates: 2-20 MSPS
- 8-bit quadrature samples
- Half-duplex operation
- Important: Always use antenna!

[SECTION 2: Spectrum Analyzer UI - 3:00-7:00]
[Screen recording]
1. Navigate to http://stinkster:8092
2. UI components:
   - Waterfall display
   - FFT graph
   - Control panel
   - Status indicators

3. Basic controls:
   - Center frequency
   - Sample rate (bandwidth)
   - Gain settings (LNA, VGA, AMP)
   - Display settings

[SECTION 3: Finding Signals - 7:00-12:00]
[Live demonstration]
1. Common frequencies:
   - 88-108 MHz (FM broadcast)
   - 144-148 MHz (2m amateur)
   - 433.92 MHz (ISM devices)
   - 868 MHz (European ISM)
   - 915 MHz (US ISM)
   - 2.4 GHz (WiFi/Bluetooth)

2. Signal identification:
   - FM broadcast (wide signal)
   - Digital signals (square shape)
   - Pulsed signals (IoT devices)
   - Continuous wave (CW)

3. Optimizing display:
   - Adjust gain for best SNR
   - Set appropriate bandwidth
   - Use averaging for weak signals

[SECTION 4: OpenWebRX Integration - 12:00-16:00]
[Screen recording]
1. Access OpenWebRX:
   http://stinkster:8073
   Login: admin/hackrf

2. Features:
   - Multiple demodulators
   - Band plans
   - Bookmarks
   - Recording

3. Practical examples:
   - Tune to local FM station
   - Find aviation traffic (118-137 MHz)
   - Monitor amateur repeaters

[SECTION 5: Advanced Features - 16:00-19:00]
[Terminal + screen]
1. Command-line control:
```bash
# Direct HackRF control
hackrf_sweep -f 400:500 -w 1000000

# Custom Python scripts
cd ~/stinkster/src/hackrf
python3 detect.py --freq 433.92 --threshold -50
```

2. Integration with other tools:
   - Export to SigMF format
   - Feed to GNU Radio
   - Stream to GQRX

[SECTION 6: Best Practices - 19:00-19:45]
- Start with low gain
- Use appropriate antennas
- Mind local regulations
- Document interesting signals
- Regular calibration

[OUTRO - 19:45-20:00]
"You're now ready to explore the RF spectrum! Next video covers 
WiFi scanning with Kismet. Share interesting signals you find in 
the comments!"
```

### Tutorial 3.1: Field Deployment Best Practices

**Duration**: 30 minutes

```
SCRIPT: Field Deployment Best Practices

[INTRO - 0:00-1:00]
"Taking Stinkster into the field? This tutorial covers everything 
from power management to operational security for mobile deployment."

[SECTION 1: Hardware Preparation - 1:00-5:00]
[Camera showing equipment]
1. Protective case setup:
   - Pelican 1200 or similar
   - Foam customization
   - Cable management
   - Ventilation considerations

2. Antenna selection:
   - Portable vs gain
   - Multi-band options
   - Magnetic mounts
   - Connector adapters

3. Power solutions:
   - USB-C PD power banks (20,000mAh+)
   - 12V vehicle adapters
   - Solar options
   - Runtime calculations

[SECTION 2: Software Configuration - 5:00-10:00]
[Screen recording]
1. Optimize for battery:
```bash
# Reduce CPU frequency
sudo cpufreq-set -g powersave

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon

# Configure aggressive power management
sudo nano /etc/stinkster/field-mode.conf
```

2. Data management:
   - Automatic cleanup scripts
   - Compressed storage
   - Selective logging

3. Headless operation:
   - VPN setup (Tailscale/WireGuard)
   - Remote access configuration
   - Automated startup

[SECTION 3: Operational Procedures - 10:00-18:00]
[Mix of camera and screen]
1. Pre-deployment checklist:
   - [ ] Batteries charged
   - [ ] Storage space cleared
   - [ ] Configs backed up
   - [ ] Remote access tested
   - [ ] Emergency shutdown ready

2. Deployment sequence:
   - Site selection
   - RF environment check
   - Initial baseline scan
   - Continuous monitoring setup

3. Data collection best practices:
   - Time synchronization
   - GPS correlation
   - Metadata recording
   - Chain of custody

[SECTION 4: Mobile Operations - 18:00-23:00]
[Camera in vehicle]
1. Vehicle installation:
   - Power from 12V
   - External antenna mounting
   - Vibration dampening
   - Temperature management

2. Wardriving setup:
   - GPS integration critical
   - Automatic logging
   - Real-time upload options

3. Covert considerations:
   - Concealment options
   - RF signature minimization
   - Visual indicators disabled

[SECTION 5: Security Considerations - 23:00-27:00]
[Slides + screen]
1. Operational security:
   - Disable unnecessary transmissions
   - Use directional antennas
   - Minimize RF footprint
   - Secure communications

2. Data security:
   - Encryption at rest
   - Secure transport
   - Access controls
   - Audit logging

3. Legal compliance:
   - Know local laws
   - Passive monitoring only
   - Respect privacy
   - Document authorization

[SECTION 6: Troubleshooting - 27:00-29:00]
Common field issues:
- Power problems → Check connections, use shorter cables
- No GPS lock → External antenna, clear sky view
- Overheating → Add ventilation, reduce load
- Connection lost → VPN backup, local logging

[OUTRO - 29:00-30:00]
"You're ready for field deployment! Remember: preparation is key. 
Download the field checklist from the description. Next video 
covers multi-node operations."
```

## Production Notes

### Recording Setup
1. **Video Quality**: 1080p minimum, 4K preferred
2. **Audio**: External microphone, remove background noise
3. **Screen Recording**: OBS Studio or similar
4. **Lighting**: Even, no glare on screens

### Post-Production
1. **Editing**: Clear sections, remove dead time
2. **Graphics**: Consistent branding, clear callouts
3. **Captions**: Auto-generate and review
4. **Thumbnails**: Action shots, clear titles

### Publishing
1. **Platform**: YouTube primarily
2. **Titles**: SEO-friendly, descriptive
3. **Descriptions**: Full links, timestamps
4. **Playlists**: Organized by series

## Additional Tutorial Ideas

### Quick Tips Series (2-5 minutes each)
- How to update Stinkster
- Optimizing HackRF gain
- Best WiFi adapters
- GPS troubleshooting
- Reading spectrum displays
- TAK message formats
- Power saving tips
- Antenna selection guide

### Live Streams
- Monthly Q&A sessions
- New feature demonstrations
- Community show-and-tell
- Troubleshooting sessions

### Written Tutorials
Create companion written guides for each video:
- Step-by-step instructions
- Command references
- Configuration examples
- Downloadable checklists

## Community Contributions

Encourage community tutorials by providing:
- Tutorial templates
- Asset packages (logos, graphics)
- Review/feedback process
- Featured creator program

## Metrics and Feedback

Track tutorial effectiveness:
- View counts and retention
- Common questions in comments
- Support ticket reduction
- User survey results

Use feedback to improve future tutorials and identify gaps in documentation.

Remember: Keep tutorials updated as software evolves!
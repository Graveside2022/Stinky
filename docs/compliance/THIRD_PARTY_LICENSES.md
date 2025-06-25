# THIRD-PARTY LICENSES AND ACKNOWLEDGMENTS

This document provides comprehensive licensing information for all third-party components, libraries, and dependencies used in the Stinkster Project. This documentation ensures legal compliance and proper attribution.

**Generated:** 2025-06-15  
**Project:** Stinkster - SDR/WiFi/GPS Tracking System  
**Maintainer:** Christian  

## CRITICAL LICENSING NOTICE

⚠️ **MIXED LICENSE WARNING**: This project contains components under different licenses with varying requirements. Please read all sections carefully.

### License Compatibility Summary

- **Main Project**: MIT License (permissive)
- **WigleToTAK Component**: AGPL v3 (copyleft - network service requirement)
- **Impact**: The AGPL component creates additional obligations for derivative works

## PRIMARY THIRD-PARTY COMPONENTS

### 1. WigleToTAK Component
- **Location**: `src/wigletotak/WigleToTAK/`
- **License**: GNU Affero General Public License v3 (AGPL v3)
- **Source**: Third-party component adapted for this project
- **Impact**: ⚠️ **COPYLEFT LICENSE** - Requires source code disclosure for network services
- **Requirements**:
  - Source code must be made available to users accessing the service over a network
  - Any modifications must be released under AGPL v3
  - Network service provision triggers source disclosure requirements

### 2. OpenWebRX (Docker Container)
- **Location**: Docker image built from official OpenWebRX
- **License**: GNU Affero General Public License v3 (AGPL v3)
- **Version**: 1.2.2
- **Source**: https://github.com/jketterl/openwebrx
- **Requirements**:
  - Source code disclosure for network services
  - Modifications must be under AGPL v3
  - Contains additional copyleft dependencies

### 3. Kismet WiFi Scanner
- **Installation**: System package (`apt install kismet`)
- **License**: GNU General Public License v2 (GPL v2)
- **Source**: https://www.kismetwireless.net/
- **Requirements**:
  - Source code must be available
  - Modifications must be under GPL v2

### 4. HackRF Tools and Libraries
- **Installation**: System packages (`hackrf`, `libhackrf-dev`)
- **License**: GNU General Public License v2 (GPL v2)
- **Source**: https://github.com/mossmann/hackrf
- **Requirements**:
  - Source code must be available
  - Hardware interfacing libraries included

## PYTHON DEPENDENCIES

### Core Framework Dependencies
All Python packages are installed via pip and have compatible permissive licenses:

#### Flask Ecosystem (MIT License)
- **Flask** 3.0.2 - Web framework
- **Flask-SocketIO** ≥5.5.1 - WebSocket support
- **Flask-CORS** ≥6.0.1 - Cross-origin resource sharing
- **Werkzeug** - WSGI utility library (BSD License)
- **Jinja2** - Template engine (BSD License)
- **Click** - Command line interface creation (BSD License)
- **ItsDangerous** - Cryptographic signing (BSD License)
- **MarkupSafe** - String handling for HTML/XML (BSD License)
- **Blinker** - Signal/event system (MIT License)

#### Scientific Computing (BSD/MIT Licenses)
- **NumPy** ≥2.3.0 - Numerical computing (BSD License)
- **SciPy** ≥1.14.1 - Scientific computing (BSD License)
- **Matplotlib** ≥3.10.0 - Plotting library (License based on PSF License)

#### Communication Libraries (Mixed Permissive Licenses)
- **PyMAVLink** ≥2.4.33 - MAVLink protocol (LGPL v3 - library use permitted)
- **PySerial** ≥3.5 - Serial communication (BSD License)
- **Requests** ≥2.32.3 - HTTP library (Apache 2.0)
- **WebSockets** ≥15.0.1 - WebSocket library (BSD License)
- **PSUtil** ≥7.0.0 - System monitoring (BSD License)

#### Utility Libraries (MIT/BSD Licenses)
- **python-dotenv** ≥1.0.0 - Environment management (BSD License)

### Docker Dependencies

#### Base System (Debian Bookworm)
- **Debian Linux**: Debian Free Software Guidelines (DFSG) - Free licenses
- **System packages**: Various free/open source licenses

#### SDR Tools and Libraries
- **SoapySDR**: Boost Software License (permissive)
- **SoapyHackRF**: Boost Software License (permissive)
- **RTL-SDR**: GNU General Public License v2

## SYSTEM DEPENDENCIES

### Linux System Components
- **GPSD**: BSD-style license
- **USB tools**: GNU General Public License v2
- **Network tools**: Mixed GPL/BSD licenses
- **Build tools**: GNU General Public License v3

### Hardware Drivers
- **libusb**: GNU Lesser General Public License v2.1
- **HackRF drivers**: GNU General Public License v2
- **USB serial drivers**: Linux kernel licenses (GPL v2)

## LICENSING OBLIGATIONS AND COMPLIANCE

### For MIT Licensed Components (Main Project)
✅ **Requirements Met**:
- Copyright notice included in LICENSE file
- Permission notice included in LICENSE file
- No additional obligations for binary distribution

### For AGPL v3 Components (WigleToTAK, OpenWebRX)
⚠️ **Critical Requirements**:

1. **Source Code Availability**:
   - Source code must be provided to users accessing the service over a network
   - This includes the entire system when WigleToTAK service is running
   - Source must be available via direct download or network access

2. **License Notices**:
   - AGPL v3 license text must be provided
   - Copyright notices must be preserved
   - License information must be accessible to users

3. **Modification Disclosure**:
   - Any modifications to AGPL components must be disclosed
   - Modified versions must carry prominent modification notices
   - Changes must be documented with relevant dates

### For GPL v2 Components (System Tools)
✅ **Requirements Met**:
- Distributed as system packages with source available through distribution
- No redistribution of modified GPL components
- Using standard interfaces and APIs

### For LGPL Components (PyMAVLink, libusb)
✅ **Requirements Met**:
- Used as libraries without modification
- Dynamic linking preserves LGPL requirements
- No static linking or modification of LGPL code

## COMPLIANCE RECOMMENDATIONS

### For Deployment
1. **Provide Source Access**: Ensure source code is available via Git repository
2. **License Documentation**: Include all license files and this document
3. **Attribution**: Maintain all copyright notices and attributions
4. **Network Service Disclosure**: For AGPL components, provide source access method

### For Distribution
1. **Include Full License Text**: Provide complete license files for all components
2. **Third-Party Notices**: Include this document with any distribution
3. **Build Instructions**: Provide complete build and deployment instructions
4. **Dependency Lists**: Maintain current dependency manifests

### For Modification
1. **Document Changes**: Keep detailed change logs for AGPL components
2. **License Compatibility**: Ensure new dependencies are license-compatible
3. **Attribution Requirements**: Preserve all existing attribution requirements
4. **Network Service Updates**: Update source access when modifying AGPL components

## REGULATORY COMPLIANCE

### Radio Frequency (RF) Equipment
- **Jurisdiction Compliance**: Users responsible for RF regulation compliance
- **Licensing Requirements**: Amateur radio or appropriate RF licenses may be required
- **Equipment Approval**: Ensure SDR equipment meets local type approval requirements
- **Transmission Restrictions**: Respect frequency allocations and power limits

### WiFi Scanning and Monitoring
- **Legal Framework**: Comply with local computer crime and communications laws
- **Network Privacy**: Respect privacy laws regarding network monitoring
- **Consent Requirements**: Obtain necessary permissions for network scanning
- **Data Protection**: Follow applicable data protection regulations

### GPS and Location Services
- **Privacy Compliance**: Respect location privacy requirements
- **Data Handling**: Follow applicable location data protection laws
- **Export Controls**: Some GPS/location technologies may have export restrictions

## DISCLAIMER AND LIMITATIONS

### Legal Disclaimer
This licensing documentation is provided for informational purposes and does not constitute legal advice. Users should:

1. **Consult Legal Counsel**: For specific legal questions regarding licensing obligations
2. **Verify Current Information**: Check for license updates in upstream projects
3. **Understand Local Law**: Ensure compliance with applicable local laws and regulations
4. **Monitor Changes**: Track licensing changes in dependencies and components

### Limitation of Liability
The Stinkster Project maintainers are not responsible for:
- License compliance by users or redistributors
- Legal consequences of improper use
- Changes in third-party licensing terms
- Regulatory violations by end users

## ACKNOWLEDGMENTS

### Third-Party Projects
The Stinkster Project builds upon excellent open source work:

- **OpenWebRX Team**: Jakob Ketterl and contributors for SDR web interface
- **Kismet Team**: Mike Kershaw and contributors for WiFi scanning framework
- **HackRF Team**: Michael Ossmann and Great Scott Gadgets for SDR hardware and software
- **WigleToTAK**: Original developers for WiFi-to-TAK conversion concept
- **Flask Team**: Armin Ronacher and contributors for web framework
- **PyMAVLink Team**: ArduPilot team for MAVLink protocol implementation
- **Linux Ecosystem**: Countless contributors to the underlying Linux tools and libraries

### Hardware Acknowledgments
- **HackRF One**: Great Scott Gadgets for open source SDR hardware
- **Raspberry Pi Foundation**: For accessible computing platform
- **USB Consortium**: For universal hardware connectivity standards

## VERSION HISTORY

### Version 1.0 (2025-06-15)
- Initial comprehensive licensing documentation
- AGPL v3 conflict identification and resolution
- Complete third-party component cataloging
- Regulatory compliance framework
- Attribution and acknowledgment system

---

**End of Third-Party Licenses Documentation**

For questions regarding licensing or compliance, please consult with qualified legal counsel and refer to the original license texts of the respective components.
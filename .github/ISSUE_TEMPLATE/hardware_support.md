---
name: Hardware Support Request
about: Request support for new hardware or report hardware compatibility issues
title: '[HARDWARE] '
labels: 'hardware-support'
assignees: ''
---

## Hardware Information

**Device Category:**

- [ ] SDR Device (Software Defined Radio)
- [ ] WiFi Adapter
- [ ] GPS Receiver
- [ ] Single Board Computer
- [ ] Other: [Specify]

**Device Details:**

- **Manufacturer**: [e.g., Great Scott Gadgets, Alfa Network]
- **Model**: [e.g., HackRF One, AWUS036ACS]
- **Chipset**: [e.g., MAX2837, RTL8812AU]
- **Firmware Version**: [if applicable]
- **Purchase Link**: [Link to product page]

## Request Type

**Support Request:**

- [ ] New hardware support
- [ ] Existing hardware compatibility issue
- [ ] Performance optimization
- [ ] Driver/firmware update needed

## Current Status

**Testing Performed:**

- [ ] Device detected by system: `lsusb` output
- [ ] Driver installation attempted
- [ ] Basic functionality tested
- [ ] Integration with Stinkster attempted

**System Recognition:**

```bash
# Include output of relevant commands:
lsusb
lsmod
dmesg | tail -20
```

## Hardware Specifications

**Technical Specifications:**

- **Interface**: [USB 2.0/3.0, SPI, I2C, etc.]
- **Power Requirements**: [Voltage, current draw]
- **Operating Frequency**: [For RF devices]
- **Bandwidth**: [For RF/networking devices]
- **Antenna Connector**: [SMA, RP-SMA, integrated, etc.]

**RF-Specific (for SDR/WiFi devices):**

- **Frequency Range**: [e.g., 1 MHz - 6 GHz]
- **Sample Rate**: [e.g., up to 20 MSPS]
- **Resolution**: [e.g., 8-bit, 12-bit]
- **TX Power**: [Maximum transmission power]
- **RX Sensitivity**: [Minimum receivable signal]

## Compatibility Requirements

**Operating System:**

- **Raspberry Pi OS Version**: [e.g., Bullseye 64-bit]
- **Kernel Version**: `uname -r`
- **Architecture**: [arm64, armhf]

**Stinkster Integration:**

- **Component**: [Which Stinkster component needs this hardware]
- **Use Case**: [How you plan to use this hardware]
- **Required Features**: [Specific functionality needed]

## Current Workarounds

**Existing Solutions:** If you've found any workarounds or partial solutions, please describe them:

```bash
# Include any commands or configurations that work
```

## Driver and Software Information

**Driver Status:**

- [ ] Official driver available
- [ ] Third-party driver available
- [ ] Generic driver works
- [ ] No driver available
- [ ] Driver compilation required

**Software Dependencies:**

- **Required Packages**: [List any special packages needed]
- **Kernel Modules**: [Any specific kernel modules]
- **Firmware**: [Firmware files required]

## Testing and Validation

**Testing Environment:**

- **Hardware Platform**: [Raspberry Pi model and configuration]
- **Power Supply**: [Power supply specifications]
- **USB Hub**: [If using USB hub, include model]
- **Cooling**: [Any cooling solutions in use]

**Test Cases:** Please describe what tests you'd like to perform or have performed:

1. **Basic Connectivity:**

   - Device detection and enumeration
   - Driver loading and initialization

2. **Functional Testing:**

   - Basic device operations
   - Performance benchmarks
   - Integration with Stinkster components

3. **Stability Testing:**
   - Long-running operations
   - Thermal stability
   - Power cycling

## Documentation and References

**Manufacturer Resources:**

- **Datasheet**: [Link to technical specifications]
- **User Manual**: [Link to user documentation]
- **Driver Downloads**: [Official driver sources]
- **API Documentation**: [Programming interfaces]

**Community Resources:**

- **Forums**: [Links to relevant discussions]
- **GitHub Projects**: [Related open-source projects]
- **Wiki Pages**: [Community documentation]

## Legal and Regulatory Considerations

**RF Compliance:**

- [ ] FCC Part 15 certified
- [ ] CE marked
- [ ] IC certified
- [ ] Amateur radio suitable
- [ ] Requires license for operation

**Export Controls:**

- [ ] Subject to export control regulations
- [ ] ITAR restricted
- [ ] Dual-use technology
- [ ] No export restrictions

**Frequency Allocations:**

- **Supported Bands**: [List frequency bands]
- **License Requirements**: [Amateur, commercial, unlicensed]
- **Regional Restrictions**: [Any geographic limitations]

## Implementation Priority

**Priority Level:**

- [ ] Critical - Required for core functionality
- [ ] High - Significant user benefit
- [ ] Medium - Nice to have
- [ ] Low - Future consideration

**User Impact:**

- **Number of Users**: [Estimated users who would benefit]
- **Cost Savings**: [Hardware cost benefits]
- **Performance Gains**: [Expected performance improvements]

## Development Considerations

**Implementation Complexity:**

- [ ] Simple configuration change
- [ ] Driver modification required
- [ ] New component development
- [ ] Extensive integration work

**Maintenance Requirements:**

- **Update Frequency**: [How often does this hardware change]
- **Support Burden**: [Ongoing maintenance requirements]
- **Testing Needs**: [Specialized testing requirements]

## Additional Information

**Sample Code:** If you have working code or configuration snippets, please include them:

```python
# Include any relevant code
```

**Error Messages:** Include any error messages or unexpected behavior:

```
Error logs here
```

**Images:** If helpful, include photos of the hardware setup or screenshots of issues.

## Community Support

**Collaboration:**

- [ ] I can provide hardware for testing
- [ ] I can assist with driver development
- [ ] I can help with documentation
- [ ] I can perform testing and validation

**Contact Information:**

- **Preferred Contact Method**: [Email, GitHub, etc.]
- **Availability**: [Time zones, availability for collaboration]

## Checklist

- [ ] I have searched for existing hardware support requests
- [ ] I have included complete hardware specifications
- [ ] I have tested basic hardware detection
- [ ] I have considered legal and regulatory implications
- [ ] I have provided relevant documentation links
- [ ] I understand this may require hardware for development/testing

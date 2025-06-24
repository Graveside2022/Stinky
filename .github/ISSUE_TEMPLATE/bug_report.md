---
name: Bug Report
about: Create a report to help us improve Stinkster
title: '[BUG] '
labels: 'bug'
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## System Information

**Hardware Configuration:**

- Raspberry Pi Model: [e.g., Pi 4 Model B 8GB]
- OS Version: [e.g., Raspberry Pi OS Bullseye 64-bit]
- SDR Device: [e.g., HackRF One, firmware version]
- WiFi Adapter: [e.g., Alfa AWUS036ACS]
- GPS Device: [e.g., u-blox NEO-8M, /dev/ttyUSB0]

**Software Versions:**

- Stinkster Version/Commit: [e.g., v1.2.3 or commit hash]
- Python Version: [e.g., 3.9.2]
- Docker Version: [e.g., 20.10.17]
- Kismet Version: [e.g., 2022-08-R1]

## Steps to Reproduce

Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

A clear and concise description of what actually happened.

## Error Messages and Logs

Please include relevant error messages and log outputs:

```
Paste error messages here
```

**Log Files:**

- [ ] Included relevant logs from `/home/pi/logs/`
- [ ] Included service logs: `journalctl -u [service-name]`
- [ ] Included Docker logs: `docker logs [container-name]`

## Configuration

**Environment Variables (.env):**

```
# Include relevant configuration (remove sensitive information)
HACKRF_ENABLED=true
WIFI_INTERFACE=wlan1
# etc.
```

**Hardware Status:**

- [ ] HackRF detected: `hackrf_info` output
- [ ] WiFi adapter in monitor mode: `iwconfig` output
- [ ] GPS device responding: `cat /dev/ttyUSB0` output
- [ ] Docker containers running: `docker ps` output

## Screenshots

If applicable, add screenshots to help explain your problem.

## Frequency/Severity

- **Frequency**: [Always / Sometimes / Rarely / Once]
- **Severity**: [Critical / High / Medium / Low]
- **Impact**: [System unusable / Feature broken / Minor issue]

## Workarounds

If you've found any temporary workarounds, please describe them here.

## Regulatory Context

**Important**: For RF-related issues, please confirm:

- [ ] Operating within licensed frequency bands
- [ ] Appropriate amateur radio license (if applicable)
- [ ] Compliance with local RF regulations
- [ ] No interference with licensed services

## Additional Context

Add any other context about the problem here, including:

- Recent changes to system configuration
- Network topology or special setup requirements
- Related issues or error patterns
- Environmental factors (temperature, power, interference)

## Checklist

- [ ] I have searched for existing issues that describe this problem
- [ ] I have included all relevant system information
- [ ] I have included complete error messages and logs
- [ ] I have confirmed regulatory compliance for RF operations
- [ ] I have tested with the latest version of Stinkster
- [ ] I have included steps to reproduce the issue

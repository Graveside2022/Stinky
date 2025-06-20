# Kismet Operations Center - Iframe and Sudo Fixes

## Summary of Changes

### 1. Fixed Iframe Stability Issues

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/views/hi.html`

**Changes**:
- Changed from proxy path (`/kismet`) to direct port access (`http://hostname:2501`)
- Added retry logic with up to 3 attempts if iframe fails to load
- Added 1-second delay after confirming Kismet is running before loading iframe
- Clear iframe src to `about:blank` before setting new URL to force reload
- Keep iframe display as `block` instead of hiding during reload
- Added periodic status check every 5 seconds that only reloads if Kismet comes online
- Improved visibility handling to maintain iframe state

**Key improvements**:
- More stable iframe loading using direct port access
- Automatic retry mechanism
- Better state management during service transitions
- Prevents unnecessary reloads when service is already running

### 2. Removed Sudo Requirements

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh`

**Changes**:
- Removed sudo fallback from airmon-ng commands
- Removed sudo from network interface configuration
- Added error messages directing users to run setup_permissions.sh if permissions fail
- Changed `kismet` command to use `exec` to ensure proper process management

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/server.js`

**Changes**:
- Already configured to try user systemd service first
- Falls back to system systemd, then direct execution
- Passes `NO_SUDO=1` environment variable to scripts

**New File**: `/home/pi/projects/stinkster_malone/stinkster/scripts/setup_permissions.sh`

**Purpose**: One-time setup script to enable non-root operation
- Adds user to required groups (netdev, plugdev, dialout, wireshark)
- Sets capabilities on kismet, iw, and ip binaries
- Creates udev rules for network interface access
- Sets up systemd user service
- Configures kismet for non-root operation

## Usage Instructions

### One-time Setup (Optional but Recommended)

```bash
# Run the setup script once with sudo
sudo /home/pi/projects/stinkster_malone/stinkster/scripts/setup_permissions.sh

# Logout and login again for group membership to take effect
```

### Verify Setup

After logging back in:
```bash
# Check group membership
groups

# Check binary capabilities
getcap $(which kismet)
getcap $(which iw)
getcap $(which ip)

# Test non-root operation
systemctl --user start kismet
```

### Expected Behavior After Fixes

1. **Iframe**: 
   - Should load reliably when Kismet is running
   - Will retry up to 3 times if initial load fails
   - Won't flicker or disappear during normal operation
   - Shows offline screen when Kismet is not running

2. **Non-root Operation**:
   - Scripts will attempt to run without sudo
   - If permissions are insufficient, helpful error messages guide setup
   - After running setup_permissions.sh and re-login, full functionality without root

## Troubleshooting

If iframe still has issues:
1. Check browser console for errors
2. Verify Kismet is accessible at http://localhost:2501
3. Check for CORS or authentication issues

If permissions fail:
1. Run the setup_permissions.sh script
2. Ensure you logout and login again
3. Verify group membership with `groups` command
4. Check that capabilities are set with `getcap` commands

## Security Notes

- Running without root is more secure
- The setup script sets minimal required capabilities
- Network interface access is restricted to netdev group members
- Kismet logs are written to user-accessible location
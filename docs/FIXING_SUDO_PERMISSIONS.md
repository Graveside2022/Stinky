# Fixing Sudo Permissions for Kismet Operations Center

## Problem
The Node.js Kismet Operations Center service runs with `NoNewPrivileges=true` in systemd, which prevents it from using `sudo`. This causes the start/stop buttons to fail when trying to execute the orchestration scripts that require root permissions.

## Solution Options

### Option 1: Install Sudoers Configuration (Recommended)

This allows the `pi` user to run specific commands without a password:

```bash
# Install the sudoers configuration
sudo /home/pi/projects/stinkster_malone/stinkster/scripts/setup-sudo-permissions.sh

# Or with systemd service support
sudo /home/pi/projects/stinkster_malone/stinkster/scripts/setup-sudo-permissions.sh --with-systemd
```

### Option 2: Use Systemd Service

Install the orchestration script as a systemd service:

```bash
# Copy the service file
sudo cp /home/pi/projects/stinkster_malone/stinkster/systemd/kismet-orchestration.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable the service (optional - for auto-start on boot)
sudo systemctl enable kismet-orchestration

# Now the Node.js app can control it via systemctl
sudo systemctl start kismet-orchestration
sudo systemctl stop kismet-orchestration
```

### Option 3: Modify Systemd Service (Not Recommended)

Remove `NoNewPrivileges=true` from the Node.js service:

```bash
# Edit the service file
sudo nano /etc/systemd/system/kismet-operations-center.service

# Remove or comment out the line:
# NoNewPrivileges=true

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart kismet-operations-center
```

**Warning**: This reduces security by allowing privilege escalation.

## Testing

After applying one of the solutions:

1. Test script execution:
```bash
node /home/pi/projects/stinkster_malone/stinkster/scripts/test-script-execution.js
```

2. Test via the web interface:
   - Navigate to http://<pi-ip>:8002
   - Click the "Start Kismet" button
   - Check logs: `sudo journalctl -u kismet-operations-center -f`

## Script Paths

The updated server now uses these script paths:
- Main orchestration: `/home/pi/stinky/gps_kismet_wigle.sh`
- Kismet start: `/home/pi/Scripts/start_kismet.sh`

## Troubleshooting

1. **Check sudoers configuration**:
   ```bash
   sudo -l | grep kismet
   ```

2. **Check service logs**:
   ```bash
   sudo journalctl -u kismet-operations-center -n 50
   ```

3. **Test manual execution**:
   ```bash
   sudo /home/pi/stinky/gps_kismet_wigle.sh
   ```

4. **Verify file permissions**:
   ```bash
   ls -la /home/pi/stinky/gps_kismet_wigle.sh
   ls -la /etc/sudoers.d/kismet-operations
   ```

## Security Notes

- The sudoers configuration only allows specific commands needed for Kismet operations
- All commands are limited to the `pi` user
- No password is required for these specific commands only
- The configuration is stored in `/etc/sudoers.d/kismet-operations`

## Implementation Details

The Node.js server now implements a fallback strategy:
1. First tries to use systemctl to start the service
2. Falls back to sudo if systemctl fails
3. Finally tries direct execution (which may fail for privileged operations)

This ensures maximum compatibility across different configurations.
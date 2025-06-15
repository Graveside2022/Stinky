# OpenWebRX Restore Guide

This guide explains how to restore the OpenWebRX Docker container using the provided restore script.

## Quick Start

The restore script provides two methods for restoring OpenWebRX:

```bash
# Method 1: Restore from a backup image
./restore-openwebrx.sh --image

# Method 2: Rebuild from Dockerfile/Docker Hub
./restore-openwebrx.sh --build

# Interactive mode (choose method interactively)
./restore-openwebrx.sh
```

## Prerequisites

1. **Docker must be installed and running:**
   ```bash
   # Check Docker status
   docker --version
   sudo systemctl status docker
   
   # If not installed:
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # Log out and back in for group changes to take effect
   ```

2. **For image restoration:** Backup files must exist in `/home/pi/openwebrx-backups/`

## Restoration Methods

### Method 1: Restore from Backup Image

This method uses a previously saved Docker image backup:

1. **Run the restore command:**
   ```bash
   ./restore-openwebrx.sh --image
   ```

2. **Select a backup:**
   - The script will list all available backups
   - Choose the desired backup by number
   - Backups are named with timestamps (e.g., `openwebrx-20250615-120000.tar`)

3. **Wait for restoration:**
   - The script loads the Docker image
   - Restores any saved configuration
   - Starts the container automatically

### Method 2: Rebuild from Dockerfile

This method rebuilds OpenWebRX from scratch:

1. **Run the rebuild command:**
   ```bash
   ./restore-openwebrx.sh --build
   ```

2. **The script will:**
   - Check for existing OpenWebRX directory
   - Clone the repository if needed
   - Create a default docker-compose.yml if missing
   - Pull or build the Docker image
   - Start the container

3. **Configuration:**
   - Default admin password: `hackrf`
   - Port: 8073
   - You'll need to reconfigure SDR settings after rebuild

## Post-Restoration Steps

### 1. Verify Container Status

```bash
# Check if container is running
docker ps | grep openwebrx

# View container logs
docker logs -f openwebrx

# Check container health
docker inspect openwebrx | grep -A 5 "Health"
```

### 2. Access OpenWebRX

- URL: `http://localhost:8073` or `http://[your-pi-ip]:8073`
- Default credentials: `admin` / `hackrf`

### 3. Restore HackRF Configuration

If you rebuilt from scratch, restore the HackRF configuration:

```bash
# Copy the working HackRF config
docker cp /home/pi/openwebrx-hackrf-config.json openwebrx:/var/lib/openwebrx/sdrs.json

# Restart the container
docker restart openwebrx
```

### 4. Verify HackRF Detection

```bash
# Check if HackRF is detected
docker exec openwebrx SoapySDRUtil --find

# Should show:
# Found device 0
#   driver = hackrf
```

## Troubleshooting

### Container Won't Start

1. **Check for port conflicts:**
   ```bash
   sudo netstat -tlnp | grep 8073
   ```

2. **Check USB device access:**
   ```bash
   ls -l /dev/bus/usb/*/*
   lsusb | grep HackRF
   ```

3. **View detailed logs:**
   ```bash
   docker logs --tail 50 openwebrx
   ```

### HackRF Not Detected

1. **Ensure HackRF is connected:**
   ```bash
   hackrf_info
   ```

2. **Check USB permissions:**
   ```bash
   # Add udev rules if needed
   echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="1d50", ATTR{idProduct}=="6089", MODE="0666"' | \
   sudo tee /etc/udev/rules.d/52-hackrf.rules
   sudo udevadm control --reload-rules
   ```

3. **Restart container with device access:**
   ```bash
   docker restart openwebrx
   ```

### Configuration Lost

If your SDR configuration was lost during restoration:

1. **Use the backup config:**
   ```bash
   docker cp /home/pi/openwebrx-hackrf-config.json openwebrx:/var/lib/openwebrx/sdrs.json
   ```

2. **Or reconfigure manually:**
   - Access http://localhost:8073
   - Login as admin
   - Go to Settings → SDR Devices
   - Add HackRF with native driver

## Backup Recommendations

To ensure smooth restoration in the future:

1. **Regular backups:**
   ```bash
   # Create a backup before making changes
   ./backup-openwebrx.sh
   ```

2. **Keep multiple versions:**
   - The backup script automatically timestamps backups
   - Keep at least the last 3 working backups

3. **Test restoration:**
   - Periodically test restoration on a test system
   - Verify all configurations work after restoration

## Environment Variables

The restore script supports these environment variables:

```bash
# Set custom backup directory
export BACKUP_DIR=/path/to/backups
./restore-openwebrx.sh --image

# Example:
BACKUP_DIR=/mnt/usb/openwebrx-backups ./restore-openwebrx.sh --image
```

## Log Files

Restoration logs are saved to:
- `/home/pi/tmp/openwebrx-restore.log`

View the latest log:
```bash
tail -f /home/pi/tmp/openwebrx-restore.log
```

## Related Scripts

- `backup-openwebrx.sh` - Create backups of OpenWebRX
- `test-restore-script.sh` - Test the restore script functionality
- `manage-openwebrx.sh` - General management script (if available)

## Support

If you encounter issues:

1. Check the restoration log file
2. Verify Docker is running properly
3. Ensure HackRF is connected and detected
4. Check file permissions in backup directory
5. Verify sufficient disk space for Docker images
# Script Execution Patterns and Dependencies

## Script Hierarchy

### 1. Primary Orchestration Scripts

#### `/home/pi/stinky/gps_kismet_wigle.sh`
- **Executed by**: webhook.py via subprocess.Popen with sudo
- **Execution pattern**: 
  ```python
  subprocess.Popen(['sudo', '-u', 'pi', script_path], 
                   stdout=subprocess.PIPE, 
                   stderr=subprocess.PIPE,
                   start_new_session=True)
  ```
- **Key responsibilities**:
  - Environment setup (DISPLAY, PATH, etc.)
  - Service initialization and verification
  - Process monitoring loop
  - Signal handling and cleanup

#### `/home/pi/Scripts/start_kismet.sh`
- **Executed by**: gps_kismet_wigle.sh via nohup
- **Execution pattern**:
  ```bash
  nohup /home/pi/Scripts/start_kismet.sh > /home/pi/tmp/kismet.log 2>&1 &
  ```
- **Key responsibilities**:
  - Interface mode switching
  - Kismet configuration generation
  - Resource limit setting
  - Kismet daemon launch

### 2. Shell Command Patterns

#### System Service Control
```bash
# Stop services
sudo systemctl stop gpsd.socket
sudo systemctl stop gpsd
sudo killall gpsd gpsdctl

# Start services
sudo systemctl start gpsd.socket
sudo systemctl start gpsd
sudo systemctl restart gpsd

# Check service status
systemctl is-active --quiet gpsd
```

#### Network Interface Management
```bash
# Monitor mode (manual method)
sudo ip link set wlan2 down
sudo iw dev wlan2 set monitor none
sudo ip link set wlan2 up

# Monitor mode (airmon-ng method)
sudo airmon-ng stop wlan2mon
sudo airmon-ng start wlan2

# Reset to managed mode
sudo ip link set wlan2 down
sudo iw dev wlan2 set type managed
sudo ip link set wlan2 up

# Interface checks
ip link show wlan2
iw dev wlan2 info
iw list | grep -q "monitor"
```

#### Process Management
```bash
# Find processes by pattern
pgrep -f "kismet"
pgrep -x "cgps"

# Kill processes
pkill -f "kismet"
kill -TERM $PID
kill -KILL $PID

# Check process existence
ps -p $PID > /dev/null
kill -0 $PID 2>/dev/null
```

#### GPS Device Operations
```bash
# Test GPS data
gpspipe -w -n 1
gpspipe -w -n 10

# Device detection
sudo stty -F /dev/ttyUSB0 4800
timeout 2 cat /dev/ttyUSB0 | grep '^\$G[PNLR][A-Z]\{3\}'

# Device listing
ls -l /dev/ttyUSB* /dev/ttyACM*
```

### 3. Python Process Execution

#### WigleToTAK Launch Pattern
```bash
cd /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK
source venv/bin/activate
nohup python3 WigleToTak2.py > /home/pi/tmp/wigletotak.log 2>&1 &
deactivate
```

#### Virtual Environment Management
```bash
# Create venv if missing
python3 -m venv venv

# Activate and install dependencies
. venv/bin/activate
pip install -r requirements.txt
deactivate
```

### 4. Background Process Patterns

#### Nohup Usage
- Used for: Kismet, WigleToTAK
- Pattern: `nohup command > logfile 2>&1 &`
- Purpose: Detach from terminal, redirect output

#### PID Capture Methods
```bash
# Method 1: Direct capture
command &
PID=$!
echo $PID > pidfile

# Method 2: Script-generated PID
# Script writes its own PID to file
# Parent waits and reads PID file

# Method 3: Process search
pgrep -f "pattern" > pidfile
```

### 5. File System Operations

#### Directory Creation
```bash
mkdir -p /home/pi/tmp
mkdir -p /home/pi/kismet_ops
mkdir -p ~/.kismet
```

#### Configuration File Generation
```bash
cat > ~/.kismet/kismet_site.conf << EOF
httpd_username=admin
httpd_password=admin
source=wlan2:name=wlan2,type=linuxwifi
EOF
chmod 600 ~/.kismet/kismet_site.conf
```

#### Log Rotation (implicit)
- New logs overwrite old ones on each start
- No explicit rotation mechanism
- Logs grow until manually cleared

### 6. Error Handling Patterns

#### Retry with Exponential Backoff
```bash
MAX_RETRIES=3
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    command
    if [ $? -eq 0 ]; then
        break
    fi
    RETRY=$((RETRY + 1))
    sleep $((RETRY * 2))
done
```

#### Graceful Degradation
```bash
if ! command; then
    log "WARNING: Command failed, continuing anyway"
    # Continue with reduced functionality
fi
```

#### Cleanup on Error
```bash
trap cleanup EXIT INT TERM

cleanup() {
    # Kill processes
    # Remove PID files
    # Reset interfaces
}
```

## Node.js Implementation Considerations

### 1. Child Process Spawning
```javascript
const { spawn, exec } = require('child_process');

// For long-running processes
const proc = spawn('sudo', ['-u', 'pi', scriptPath], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
});

// For quick commands
exec('sudo systemctl restart gpsd', (error, stdout, stderr) => {
    // Handle result
});
```

### 2. PID File Management
```javascript
// Atomic write
const fs = require('fs').promises;
const path = require('path');

async function writePidFile(pid, filepath) {
    const tmpFile = `${filepath}.tmp`;
    await fs.writeFile(tmpFile, pid.toString());
    await fs.rename(tmpFile, filepath);
}
```

### 3. Process Monitoring
```javascript
// Check if process exists
function isProcessRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}
```

### 4. Virtual Environment Activation
```javascript
// Activate Python venv
const venvPath = '/path/to/venv';
const pythonPath = path.join(venvPath, 'bin', 'python');
const proc = spawn(pythonPath, ['script.py'], {
    cwd: '/working/directory'
});
```

### 5. Signal Handling
```javascript
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function cleanup() {
    // Stop all child processes
    // Clean up resources
    // Remove PID files
}
```

## Critical Dependencies

1. **Sudo Access**: Required for most operations
2. **System Commands**: ip, iw, systemctl, airmon-ng
3. **Python Environment**: python3, venv module
4. **System Services**: gpsd, gpsd.socket
5. **Device Files**: /dev/ttyUSB*, /dev/ttyACM*
6. **Network Interfaces**: wlan2 must exist
7. **File Permissions**: Write access to /home/pi/tmp, /var/log

## Testing Script Execution

```bash
# Test sudo access
sudo -u pi echo "Test"

# Test interface commands
sudo ip link show wlan2

# Test service commands
sudo systemctl status gpsd

# Test GPS commands
which gpspipe

# Test Python environment
python3 -m venv test_venv
```
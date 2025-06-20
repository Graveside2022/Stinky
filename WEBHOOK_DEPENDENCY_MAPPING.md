# Flask to Node.js Webhook Dependency Mapping

## Overview
This document provides a comprehensive mapping of Python/Flask dependencies to their Node.js equivalents for the webhook implementation migration. It covers libraries, patterns, and paradigms specific to the webhook functionality.

## Core Framework Dependencies

### Web Framework
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `Flask==3.0.2` | `express@^4.18.2` | Direct replacement with Express.js - both provide similar routing and middleware capabilities |
| `flask.Flask` | `express()` | Initialize Express app instead of Flask app |
| `@app.route()` | `app.get()`, `app.post()` | Use Express routing methods with same paths |
| `flask.jsonify()` | `res.json()` | Express has built-in JSON response method |
| `flask.request` | `req` object | Request data available on req parameter |

### CORS Support
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `flask_cors.CORS` | `cors@^2.8.5` | Direct replacement - similar configuration options |
| `CORS(app)` | `app.use(cors())` | Apply as Express middleware |

## System & Process Management

### Process Management
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `subprocess.Popen()` | `child_process.spawn()` | Both spawn child processes with similar options |
| `subprocess.run()` | `child_process.execSync()` | For synchronous command execution |
| `psutil` | `ps-list@^8.1.1` + native Node | Combination of ps-list for process listing and native process methods |
| `psutil.Process()` | `process` object | Use Node's process API for current process |
| `psutil.pid_exists()` | `process.kill(pid, 0)` | Check if process exists by sending signal 0 |
| `psutil.process_iter()` | `ps-list` | Returns array of running processes |
| `os.kill()` | `process.kill()` | Direct equivalent for sending signals |
| `signal` module | Native Node signals | Node.js has built-in signal handling |

### File System Operations
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `os.path` | `path` module | Node's path module provides similar functionality |
| `os.makedirs()` | `fs.mkdirSync()` | Create directories (with recursive option) |
| `os.path.exists()` | `fs.existsSync()` | Check file/directory existence |
| `open()` with context | `fs.readFileSync()` / `fs.writeFileSync()` | File I/O operations |
| `glob.glob()` | `glob@^11.0.3` | Direct replacement for file pattern matching |

## GPS and External Services

### GPS Integration
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `gps` module | `node-gpsd@^0.3.4` | Direct replacement for GPSD integration |
| Direct gpspipe calls | Keep subprocess calls | Some operations may still require subprocess |

### HTTP Requests
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `requests` | `axios@^1.6.0` | Modern HTTP client with similar API |
| `requests.get()` | `axios.get()` | Direct method mapping |
| `requests.auth` | `axios auth option` | Built-in auth support |
| `response.status_code` | `response.status` | Property name change |
| `response.json()` | `response.data` | Axios auto-parses JSON |

## Data Handling

### JSON Processing
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `json.loads()` | `JSON.parse()` | Built-in JSON parsing |
| `json.dumps()` | `JSON.stringify()` | Built-in JSON serialization |
| `json.JSONDecodeError` | `try/catch` on parse | Standard error handling |

### CSV Processing
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `csv.DictReader` | `csv-parse` or manual | Parse CSV to objects - consider lightweight implementation |
| Built-in csv module | String splitting | For simple CSV, use `.split(',')` |

### Date/Time Handling
| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `datetime` | `Date` object + `moment@^2.29.4` | Native Date for basics, moment for complex operations |
| `datetime.now()` | `new Date()` | Direct equivalent |
| `datetime.fromtimestamp()` | `new Date(timestamp * 1000)` | Note: JS uses milliseconds |
| `timedelta` | `moment.duration()` | Use moment for time deltas |

## Logging

| Python/Flask | Node.js Equivalent | Migration Strategy |
|-------------|-------------------|-------------------|
| `logging` module | `winston@^3.11.0` | Comprehensive logging library |
| `logger.info()` | `logger.info()` | Same method names |
| `logger.error()` | `logger.error()` | Direct mapping |
| File + console logging | Winston transports | Configure multiple transports |

## Async Patterns

### Python Synchronous vs JavaScript Async
| Python Pattern | Node.js Pattern | Migration Strategy |
|---------|----------------|-------------------|
| Synchronous by default | Async by default | Add `async/await` to functions |
| `time.sleep()` | `await new Promise(resolve => setTimeout(resolve, ms))` | Non-blocking delay |
| Blocking I/O | Non-blocking I/O | Use promises/callbacks |
| Sequential execution | Promise.all() for parallel | Leverage JS concurrency |

### Error Handling
| Python Pattern | Node.js Pattern | Migration Strategy |
|---------|----------------|-------------------|
| `try/except` | `try/catch` | Similar syntax, different keywords |
| Multiple except blocks | Single catch with conditionals | Check error type in catch |
| `finally` | `finally` | Direct equivalent |
| Custom exceptions | Error subclasses | Extend Error class |

## Specific Webhook Patterns

### PID File Management
```python
# Python
with open(PID_FILE, 'w') as f:
    f.write(str(proc.pid))
```
```javascript
// Node.js
fs.writeFileSync(PID_FILE, proc.pid.toString());
```

### Process Killing with Tree
```python
# Python with psutil
parent = psutil.Process(pid)
children = parent.children(recursive=True)
for child in children:
    child.kill()
```
```javascript
// Node.js with tree-kill
const treeKill = require('tree-kill');
treeKill(pid, 'SIGKILL');
```

### Service Status Checking
```python
# Python
for proc in psutil.process_iter(['pid', 'name']):
    if 'kismet' in proc.info['name'].lower():
        kismet_running = True
```
```javascript
// Node.js
const psList = await import('ps-list');
const processes = await psList();
const kismetRunning = processes.some(p => p.name.toLowerCase().includes('kismet'));
```

### Subprocess with Timeout
```python
# Python
process = subprocess.Popen(['gpspipe', '-w', '-n', '10'], 
                          stdout=subprocess.PIPE, 
                          stderr=subprocess.PIPE)
stdout, stderr = process.communicate(timeout=10)
```
```javascript
// Node.js
const { spawn } = require('child_process');
const proc = spawn('gpspipe', ['-w', '-n', '10']);
let stdout = '';
proc.stdout.on('data', data => stdout += data);
setTimeout(() => proc.kill(), 10000);
```

## Configuration and Constants

### File Paths and Constants
| Python | Node.js | Notes |
|--------|---------|-------|
| String paths | Use path.join() | Platform-independent paths |
| Global constants | module.exports constants | Export from separate file |
| `__name__ == '__main__'` | `require.main === module` | Check if run directly |

## Testing Considerations

| Python Testing | Node.js Testing | Migration Strategy |
|---------------|-----------------|-------------------|
| unittest/pytest | Jest (`jest@^29.7.0`) | Comprehensive test framework |
| Mock subprocess | Mock child_process | Similar mocking patterns |
| Test Flask routes | Supertest (`supertest@^6.3.3`) | HTTP endpoint testing |

## Performance Optimization

### Key Differences
1. **Event Loop**: Node.js is single-threaded with event loop - avoid blocking operations
2. **Streams**: Use Node.js streams for large data processing
3. **Clustering**: Use cluster module for multi-core utilization
4. **Memory**: Be aware of V8 heap limits (~1.5GB default)

## Migration Checklist

- [ ] Replace Flask app initialization with Express
- [ ] Convert all routes to Express syntax
- [ ] Replace psutil with ps-list + native Node APIs
- [ ] Convert subprocess calls to child_process
- [ ] Implement async/await for all I/O operations
- [ ] Replace requests with axios
- [ ] Set up Winston logging
- [ ] Handle GPS data with node-gpsd
- [ ] Implement error handling with try/catch
- [ ] Add input validation with Joi
- [ ] Set up process management with PM2 (production)
- [ ] Write comprehensive tests with Jest
- [ ] Document API changes

## Security Considerations

1. **Input Validation**: Use Joi for request validation (already in dependencies)
2. **Helmet**: Security headers middleware (already included)
3. **Rate Limiting**: Consider adding express-rate-limit
4. **Process Spawning**: Sanitize all inputs to child_process
5. **File Access**: Validate all file paths

## Example Migration

### Flask Route
```python
@app.route('/script-status', methods=['GET'])
def script_status():
    logger.info("Checking script status")
    script_running = is_script_running()
    return jsonify({
        'running': script_running,
        'message': "Script is running" if script_running else "Script is stopped"
    })
```

### Express Route
```javascript
app.get('/script-status', async (req, res) => {
    logger.info('Checking script status');
    try {
        const scriptRunning = await isScriptRunning();
        res.json({
            running: scriptRunning,
            message: scriptRunning ? 'Script is running' : 'Script is stopped'
        });
    } catch (error) {
        logger.error('Error checking script status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

## New Dependencies to Install

```bash
# GPS communication (choose one)
npm install node-gpsd
# OR
npm install gpsd-client

# System information (optional, if more than pidusage is needed)
npm install systeminformation

# File globbing
npm install glob

# Additional utility packages that might be useful
npm install ps-list  # List running processes
npm install tree-kill  # Kill process trees
```

## File Locations

### Python Files to Migrate
- **Primary**: `/home/pi/web/webhook.py` - Main webhook service
- **Alternative**: `/home/pi/web/v2webhook.py` - Updated version with different PID management
- **Web UI**: `/home/pi/web/homepage.html` - Web interface that calls the webhook API

## Shell Scripts and External Commands

### Scripts Executed by webhook.py
1. **Primary Script**: `/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh`
   - Starts GPS, Kismet, and WigleToTAK services
   - Manages PIDs in `/home/pi/tmp/gps_kismet_wigle.pids`
   - Logs to `/home/pi/tmp/gps_kismet_wigle.log`

2. **Kismet Script**: `/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh`
   - Called by gps_kismet_wigle.sh
   - Manages Kismet with monitor mode setup
   - PID file: `/home/pi/kismet_ops/kismet.pid`

### System Commands Used
- `sudo systemctl restart gpsd` - Restart GPS daemon
- `sudo ip link set wlan2 down/up` - Network interface control
- `sudo iw dev wlan2 set type managed` - WiFi mode control
- `gpspipe -w -n 1` - Test GPS data
- `pkill -f "kismet"` - Kill processes by pattern

## File Paths and Directories

### Configuration Files
- `~/.kismet/kismet_site.conf` - Kismet configuration

### PID Files
- `/tmp/kismet_pids.txt` - General Kismet PIDs
- `/tmp/kismet_script.pid` - Main script PID
- `/home/pi/tmp/wigletotak.specific.pid` - WigleToTAK PID
- `/home/pi/kismet_ops/kismet.pid` - Kismet process PID

### Log Files
- `/var/log/webhook.log` - Webhook service log
- `/home/pi/tmp/gps_kismet_wigle.log` - Main script log
- `/home/pi/tmp/kismet.log` - Kismet output log
- `/home/pi/tmp/wigletotak.log` - WigleToTAK log
- `/home/pi/tmp/cgps.log` - GPS display log
- `/home/pi/kismet_ops/kismet_debug.log` - Kismet debug log

### Data Files
- `/home/pi/kismet_ops/*.csv` - Kismet scan results
- `/home/pi/tmp/` - Temporary files directory

### Required Directories
```bash
mkdir -p /home/pi/tmp
mkdir -p /home/pi/kismet_ops
mkdir -p ~/.kismet
```

## External Service Connections

### GPSD (GPS Daemon)
- **Host**: localhost
- **Port**: 2947
- **Protocol**: JSON over TCP
- **Connection**: Use gpspipe or direct socket connection

### Kismet API
- **URL**: `http://10.42.0.1:2501`
- **Auth**: Basic Auth (admin:admin)
- **Endpoints**:
  - `/system/status.json` - System status
  - `/devices/views/all_devices.json` - Device list

### Flask Server (webhook.py)
- **Port**: 5000
- **Bind**: 0.0.0.0 (all interfaces)

## System Dependencies

### Required System Services
- `gpsd` - GPS daemon service
- `gpsd.socket` - GPS daemon socket

### Required System Packages
```bash
# Already required by Python version
sudo apt-get install gpsd gpsd-clients
sudo apt-get install wireless-tools
sudo apt-get install aircrack-ng  # For airmon-ng
```

### Network Interface Requirements
- `wlan2` - WiFi interface for monitoring
- Must support monitor mode
- May create `wlan2mon` when in monitor mode

## Migration Checklist

### Pre-Migration Setup
- [ ] Install Node.js dependencies: `npm install node-gpsd glob ps-list tree-kill`
- [ ] Ensure all directories exist
- [ ] Verify system services are installed (gpsd, etc.)
- [ ] Test GPS device connectivity
- [ ] Verify wlan2 interface exists

### Code Migration Tasks
- [ ] Create Express routes matching Flask endpoints
- [ ] Implement process management with child_process
- [ ] Port GPS communication to node-gpsd
- [ ] Implement PID file management
- [ ] Port subprocess execution for scripts
- [ ] Implement systemctl commands via child_process
- [ ] Add CORS middleware
- [ ] Setup Winston logging
- [ ] Implement graceful shutdown
- [ ] Add error handling for all external commands

### Testing Requirements
- [ ] Test GPS data retrieval
- [ ] Test Kismet process management
- [ ] Test script execution and monitoring
- [ ] Test network interface control
- [ ] Test API compatibility with existing clients
- [ ] Test concurrent request handling
- [ ] Test error scenarios

### Deployment Considerations
- [ ] Update systemd service files if needed
- [ ] Ensure proper permissions for sudo commands
- [ ] Configure Node.js process manager (PM2 recommended)
- [ ] Set up log rotation for Node.js logs
- [ ] Update documentation for new service

## API Endpoints to Implement

### Web Interface Files
- **Main UI**: `/home/pi/web/hi.html` - Control panel with start/stop buttons
- **Homepage**: `/home/pi/web/homepage.html` - Landing page with navigation

### API Endpoints (called by hi.html)

1. **POST /run-script**
   - Start the main orchestration script
   - Check for existing processes
   - Handle cleanup of stale processes
   - Response format: `{ "status": "success|error", "message": "string" }`

2. **POST /stop-script**
   - Stop all running processes
   - Clean up PID files
   - Reset network interfaces
   - Restart gpsd service
   - Response format: `{ "status": "success|error", "message": "string" }`

3. **GET /info**
   - Get GPS coordinates and status
   - Get Kismet status
   - Get WigleToTAK status
   - Return user IP
   - Response format:
     ```json
     {
       "gps": {
         "lat": number|null,
         "lon": number|null,
         "alt": number|null,
         "mode": number,
         "time": string|null,
         "speed": number|null,
         "track": number|null,
         "status": "3D Fix|2D Fix|No Fix"
       },
       "kismet": "Running|Not Running",
       "wigle": "Running|Not Running",
       "ip": "string"
     }
     ```

4. **GET /script-status**
   - Check if main script is running
   - Check individual service status
   - Return detailed status information
   - Response format:
     ```json
     {
       "running": boolean,
       "message": "string",
       "kismet_running": boolean,
       "kismet_api_responding": boolean,
       "wigle_running": boolean
     }
     ```

5. **GET /kismet-data**
   - Read latest Kismet CSV file
   - Parse device information
   - Return device counts and recent devices
   - Fallback to Kismet API if CSV unavailable
   - Response format:
     ```json
     {
       "devices_count": number,
       "networks_count": number,
       "recent_devices": [
         {
           "name": "string",
           "type": "string",
           "channel": "string"
         }
       ],
       "feed_items": [
         {
           "type": "Device",
           "message": "string"
         }
       ],
       "last_update": "HH:MM:SS",
       "error": "string|undefined"
     }
     ```

### Client-Side Polling Intervals (from hi.html)
- Kismet data: Every 5 seconds
- System status: Every 5 seconds  
- Script status: Every 5 seconds

## Performance Considerations

### Python vs Node.js
- Child process spawning may be slightly different in performance
- File I/O should be done asynchronously in Node.js
- Use streams for CSV parsing to handle large files
- Implement connection pooling for external services

### Memory Management
- Monitor memory usage with existing tools
- Implement graceful degradation for low memory
- Use streaming for large file operations
- Clean up event listeners to prevent memory leaks

### Concurrency
- Node.js is single-threaded but handles I/O concurrently
- Use Promise.all() for parallel operations
- Consider worker threads for CPU-intensive tasks
- Implement rate limiting for API endpoints

## Security Considerations

- Validate all inputs before executing shell commands
- Use parameterized commands to prevent injection
- Implement authentication if not already present
- Sanitize file paths to prevent directory traversal
- Run with minimal required permissions
- Consider using sudo with specific command allowlists

## Summary

This comprehensive mapping document provides a complete guide for migrating the webhook implementation from Python/Flask to Node.js/Express. The migration leverages JavaScript's async capabilities while maintaining full API compatibility.

### Key Advantages of Node.js Migration

1. **Non-blocking I/O**: Better handling of concurrent requests and long-running operations
2. **Unified Language**: JavaScript across the entire stack (frontend and backend)
3. **NPM Ecosystem**: Access to extensive package ecosystem
4. **Performance**: Event-driven architecture well-suited for I/O-heavy operations
5. **WebSocket Support**: Native support for real-time communications

### Critical Migration Points

1. **Async Everything**: Convert all I/O operations to async/await
2. **Process Management**: Use tree-kill for proper process cleanup
3. **Error Handling**: Wrap all async operations in try/catch blocks
4. **Logging**: Implement structured logging with Winston
5. **Testing**: Comprehensive test coverage with Jest and Supertest

### Compatibility Requirements

- Maintain exact API response formats
- Keep same endpoint paths and methods
- Preserve error codes and messages
- Ensure web UI works without modification

---

This mapping provides everything needed for a successful migration while improving performance and maintainability through JavaScript's modern async capabilities.
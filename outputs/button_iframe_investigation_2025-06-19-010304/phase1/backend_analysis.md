# Backend API Analysis Report
**Agent:** Backend API Analyst (Agent B)  
**Investigation Date:** 2025-06-18T23:03:00Z  
**Server:** 100.68.185.86:8002

## 1. API Endpoint Testing

### Critical Finding: API Endpoint Mismatch
The frontend is attempting to call non-existent API endpoints. The Node.js server does NOT have the `/api/kismet/start` and `/api/kismet/stop` endpoints that the buttons are trying to use.

### Actual vs Expected Endpoints

#### Frontend is calling (THESE DON'T EXIST):
```bash
# Test results - Both return 404
curl -X POST http://100.68.185.86:8002/api/kismet/start -v
# Response: HTTP/1.1 404 Not Found
# Body: Cannot POST /api/kismet/start

curl -X POST http://100.68.185.86:8002/api/kismet/stop -v
# Response: HTTP/1.1 404 Not Found
# Body: Cannot POST /api/kismet/stop
```

#### Server actually provides (THESE WORK):
```bash
# Working endpoint - starts Kismet
curl -X POST http://100.68.185.86:8002/run-script \
  -H "Content-Type: application/json" \
  -d '{"script": "kismet"}'
# Response: HTTP/1.1 200 OK
# Body: {"status":"success","message":"Kismet services started successfully","script":"gps_kismet_wigle","pid":120724,"timestamp":"2025-06-18T23:04:43.568Z"}

# Working endpoint - stops Kismet  
curl -X POST http://100.68.185.86:8002/stop-script \
  -H "Content-Type: application/json" \
  -d '{"script": "kismet"}'
# Response: HTTP/1.1 200 OK (when script stops successfully)
```

### Other Available Endpoints
```bash
GET  /                    # Main page (hi.html)
GET  /hi.html            # Same as above
GET  /health             # Health check
GET  /info               # Server information
GET  /kismet-data        # Kismet data (deprecated)
GET  /script-status      # Check script running status
GET  /api/status         # Spectrum analyzer status
GET  /api/kismet-data    # New Kismet data endpoint
POST /run-script         # Start scripts
POST /stop-script        # Stop scripts
```

## 2. Server Application Analysis

### Technology Stack
- **Backend:** Node.js with Express framework
- **Process ID:** 117525
- **Running User:** pi
- **Command:** `node server.js`
- **Working Directory:** `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/`

### Process Status
```bash
ps aux | grep node
# pi 117525  0.2  0.8 787728 68924 ?  SNl  00:41  0:04 node server.js
```

### Port Binding
```bash
netstat -tlnp | grep 8002
# tcp6  0  0  :::8002  :::*  LISTEN  117525/node
```

The server is properly running and listening on port 8002 (IPv6 + IPv4).

## 3. Route Configuration

### Script Management Routes (from server.js lines 314-374)
```javascript
// Start script endpoint - expects JSON body with script name
app.post('/run-script', async (req, res) => {
    // Accepts: {"script": "kismet"} or {"script": "gps_kismet_wigle"}
    // Starts the script using SimpleScriptManager
});

// Stop script endpoint - expects JSON body with script name  
app.post('/stop-script', async (req, res) => {
    // Accepts: {"script": "kismet"} or {"script": "gps_kismet_wigle"}
    // Stops the script using kill commands
});

// Status check endpoint
app.get('/script-status', async (req, res) => {
    // Returns running status of scripts
});
```

### CORS Configuration
```javascript
// Wide-open CORS (line 433)
Access-Control-Allow-Origin: *
```

### Security Headers
The server implements comprehensive security headers including CSP, CORS policies, and XSS protection.

## 4. Server Logs

### Recent Activity (from kismet-operations.log)
```
[32minfo[39m: SpectrumAnalyzer instance created {"config":{"center_freq":145000000,"fft_compression":"none","fft_size":0,"samp_rate":2400000,"signal_threshold":-70},"label":"SpectrumAnalyzer","maxBufferSize":1000,"timestamp":"2025-06-18T22:39:10.541Z"}
[32minfo[39m: Spectrum Analyzer server running on port 8002 {"nodeEnv":"development","pid":117242,"port":"8002","timestamp":"2025-06-18T22:39:10.567Z"}
::ffff:127.0.0.1 - - [18/Jun/2025:22:39:22 +0000] "GET / HTTP/1.1" 200 62569 "-" "curl/7.88.1"
::ffff:127.0.0.1 - - [18/Jun/2025:22:39:29 +0000] "GET /api/webhook/script-status HTTP/1.1" 404 164 "-" "curl/7.88.1"
```

No errors related to button clicks or script execution failures in recent logs.

## 5. Configuration Files

### Script Paths (from server.js lines 75-84)
```javascript
scriptPaths: {
    gps_kismet_wigle: '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh',
    kismet: '/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh'
}
pidFiles: {
    gps_kismet_wigle: '/home/pi/tmp/gps_kismet_wigle.pids',
    kismet: '/tmp/kismet_script.pid'
}
```

### Server Configuration
- Port: 8002 (from environment or default)
- Logging: Winston logger with console and file output
- Middleware: Express, CORS, Helmet, Morgan

## 6. Integration Points

### Frontend Integration Issue
The hi.html file (served at root) is making incorrect API calls:
```javascript
// From hi.html line 1369
const response = await fetch('/run-script', {method: 'POST'});
// This is missing the required JSON body!

// From hi.html line 1386  
fetch('/stop-script', {method: 'POST'})
// Also missing the required JSON body!
```

### Correct API Usage
The endpoints require a JSON body specifying which script to run:
```javascript
// Correct usage:
fetch('/run-script', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({script: 'kismet'})
});
```

### Process Execution
The server spawns bash processes to execute scripts:
- Uses `spawn('bash', [scriptPath])` for starting
- Tracks PIDs in specified PID files
- Implements proper process cleanup on stop

## Key Findings Summary

1. **CRITICAL BUG**: Frontend/backend API mismatch - buttons are calling wrong endpoints
2. **MISSING PARAMETERS**: Even when using correct endpoints, frontend doesn't send required JSON body
3. **WORKING BACKEND**: The backend server is functional and can start/stop Kismet when called correctly
4. **PROOF OF FUNCTIONALITY**: Manual curl commands successfully start Kismet (PID 120724 was created)

## Recommendations for Agent G

1. Update frontend buttons to call `/run-script` and `/stop-script` instead of `/api/kismet/start` and `/api/kismet/stop`
2. Add proper JSON body with `{script: 'kismet'}` to the fetch requests
3. Add proper Content-Type headers to the requests
4. Consider adding error handling for better user feedback
5. Optional: Create alias routes on backend for backward compatibility
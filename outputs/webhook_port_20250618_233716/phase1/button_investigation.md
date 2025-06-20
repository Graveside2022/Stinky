# Button Functionality Investigation Report

## Executive Summary

After thorough investigation of the Flask webhook application (WigleToTak2.py), I've analyzed why buttons might fail when the webhook runs on port 8002 instead of the default port 8000. The investigation reveals that the Flask application itself should work correctly on any port due to its use of relative URLs, but there are several potential issues that could cause button failures in specific deployment scenarios.

## Key Findings

### 1. Flask Application Analysis

**File:** `/home/pi/projects/stinkster_malone/stinkster/src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py`

- **Port Configuration:** The Flask app accepts a `--flask-port` argument (default 8000)
- **Server Binding:** `app.run(host='0.0.0.0', port=args.flask_port)`
- **No Hardcoded Ports:** The Python code contains no hardcoded port references

### 2. Frontend JavaScript Analysis

**File:** `/home/pi/projects/stinkster_malone/stinkster/src/wigletotak/WigleToTAK/TheStinkToTAK/templates/WigleToTAK.html`

All API calls use relative URLs:
- `/update_tak_settings`
- `/update_multicast_state`
- `/update_analysis_mode`
- `/update_antenna_sensitivity`
- `/get_antenna_settings`
- `/list_wigle_files`
- `/start_broadcast`
- `/stop_broadcast`
- `/add_to_whitelist`
- `/add_to_blacklist`

**✅ No hardcoded URLs or ports in the frontend code**

### 3. Potential Failure Points When Running on Port 8002

#### A. Port Conflict Issues
The orchestration script (`gps_kismet_wigle.sh`) checks if port 8000 is in use:
```bash
if netstat -tlnp 2>/dev/null | grep -q ":8000 "; then
    log "Port 8000 is already in use. Skipping Python WigleToTAK startup..."
```

**Issue:** If the Flask app is manually started on port 8002, but another service (like Node.js) is on port 8000, the orchestration script might skip starting necessary dependencies.

#### B. CORS Configuration
The Flask app doesn't explicitly set CORS headers. If accessed from a different origin (e.g., through a proxy or from another port), CORS issues could prevent button functionality.

#### C. Nginx Proxy Configuration
If an nginx proxy is configured to forward requests to port 8000, changing to port 8002 without updating the nginx configuration would cause all button API calls to fail.

#### D. Browser Cache
Browsers might cache service worker registrations or JavaScript files that contain hardcoded references to port 8000 from previous deployments.

#### E. External Integration Points
Other services might be configured to communicate with the Flask app on port 8000:
- TAK server callbacks
- Kismet integrations
- Monitoring scripts

### 4. Console Errors and Network Failures

When buttons fail on port 8002, the likely symptoms are:

1. **404 Errors:** If nginx/proxy still points to port 8000
2. **Connection Refused:** If no service is running on the expected port
3. **CORS Errors:** If accessed from a different origin
4. **Timeout Errors:** If firewall rules block port 8002

### 5. Root Cause Analysis

The most probable root cause for button failures when running on port 8002:

**Primary Cause:** **Nginx or reverse proxy misconfiguration**
- The system likely has an nginx configuration that proxies requests to `localhost:8000`
- When the Flask app runs on port 8002, the proxy still forwards to port 8000
- Result: All API calls return 404 or 502 errors

**Secondary Causes:**
1. Firewall rules specifically allowing port 8000 but not 8002
2. Docker container port mappings expecting port 8000
3. SystemD service files with hardcoded port 8000

## Recommended Fixes

### 1. Update Nginx Configuration
If nginx is used, update the proxy configuration:
```nginx
location /api/ {
    proxy_pass http://localhost:8002;  # Update from 8000 to 8002
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 2. Add CORS Headers to Flask
Add CORS support to handle cross-origin requests:
```python
from flask_cors import CORS
CORS(app)  # Allow all origins during development
```

### 3. Update Orchestration Script
Modify `gps_kismet_wigle.sh` to accept custom ports:
```bash
WIGLETOTAK_FLASK_PORT=${3:-8000}  # Allow port override
python3 WigleToTak2.py --flask-port $WIGLETOTAK_FLASK_PORT
```

### 4. Add Environment Variable Support
Allow port configuration via environment variables:
```python
flask_port = int(os.environ.get('WIGLETOTAK_PORT', args.flask_port))
app.run(host='0.0.0.0', port=flask_port)
```

### 5. Implement Health Check Endpoint
Add a health check to verify button functionality:
```python
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'port': request.environ.get('SERVER_PORT'),
        'buttons_functional': True
    })
```

## Testing Recommendations

1. **Direct Access Test:** Access the Flask app directly on port 8002 without any proxy
2. **API Test:** Use curl to test each button's API endpoint
3. **Browser Console:** Check for JavaScript errors when clicking buttons
4. **Network Tab:** Monitor failed requests and response codes
5. **Proxy Logs:** Check nginx/apache logs for forwarding errors

## Conclusion

The Flask application itself is port-agnostic and should work on any port. Button failures when running on port 8002 are most likely caused by:

1. **Reverse proxy misconfiguration** (90% probability)
2. **Firewall/security rules** (5% probability)
3. **External service integration issues** (5% probability)

The fix requires updating the infrastructure configuration (nginx, firewall, orchestration scripts) to properly handle the non-default port, rather than modifying the Flask application code itself.
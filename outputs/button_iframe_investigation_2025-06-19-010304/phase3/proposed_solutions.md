# Proposed Solutions - Button & Iframe Investigation

**Agent:** G - Solution Architect  
**Date:** 2025-06-19  
**Based On:** Root Cause Analysis from Phase 2

## Solutions Overview

**Total fixes proposed:** 6 primary solutions with alternatives  
**Implementation complexity:** Low to Medium  
**Total estimated time:** 2-3 hours for all fixes  
**Critical path:** Solutions #1 and #2 must be implemented together

### Implementation Dependencies
1. Fix #1 (API endpoints) → Fix #2 (JSON parameters) → Test functionality
2. Fix #4 (localhost URLs) → Fix #3 (iframe) → Full integration
3. Fix #5 (CORS) and Fix #6 (Auth) can be done in parallel

## Fix Specifications

---

## Solution #1: Fix Frontend/Backend API Endpoint Mismatch

**Addresses Root Cause**: #1 - Frontend/Backend API Endpoint Mismatch  
**Priority**: CRITICAL  
**Complexity**: Low  
**Estimated Time**: 15 minutes

### Quick Fix (Immediate)

Update the frontend JavaScript to use the correct API endpoints:

```javascript
// In /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations-center/public/hi.html
// Update lines 1368-1383 (startKismet function)

async function startKismet() {
    console.log('Starting Kismet...');
    const button = document.getElementById('startKismetBtn');
    button.disabled = true;
    button.textContent = 'Starting...';
    
    try {
        const response = await fetch('/run-script', {  // CORRECT endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({script: 'kismet'})  // Add required body
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Kismet start response:', data);
        updateStatus('Kismet started successfully', 'success');
        button.textContent = 'Stop Kismet';
        button.onclick = stopKismet;
    } catch (error) {
        console.error('Error starting Kismet:', error);
        updateStatus('Failed to start Kismet: ' + error.message, 'error');
        button.textContent = 'Start Kismet';
    } finally {
        button.disabled = false;
    }
}

// Update lines 1385-1400 (stopKismet function)
async function stopKismet() {
    console.log('Stopping Kismet...');
    const button = document.getElementById('startKismetBtn');
    button.disabled = true;
    button.textContent = 'Stopping...';
    
    try {
        const response = await fetch('/stop-script', {  // CORRECT endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({script: 'kismet'})  // Add required body
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Kismet stop response:', data);
        updateStatus('Kismet stopped successfully', 'success');
        button.textContent = 'Start Kismet';
        button.onclick = startKismet;
    } catch (error) {
        console.error('Error stopping Kismet:', error);
        updateStatus('Failed to stop Kismet: ' + error.message, 'error');
        button.textContent = 'Stop Kismet';
    } finally {
        button.disabled = false;
    }
}
```

### Permanent Solution

Same as quick fix - the frontend code needs to match the backend API design.

### Implementation Steps

1. Open the hi.html file:
   ```bash
   nano /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations-center/public/hi.html
   ```

2. Navigate to line 1368 (startKismet function)

3. Replace the fetch call with the corrected version above

4. Navigate to line 1385 (stopKismet function)

5. Replace the fetch call with the corrected version above

6. Save the file (Ctrl+X, Y, Enter)

### Testing Steps

1. Clear browser cache (Ctrl+Shift+R)
2. Open http://100.68.185.86:8002
3. Open browser console (F12)
4. Click "Start Kismet" button
5. Verify in console: No 404 errors, successful response logged
6. Check if Kismet actually started: `pgrep -f kismet`
7. Click "Stop Kismet" button (button text should have changed)
8. Verify Kismet stopped: `pgrep -f kismet` (should return nothing)

### Rollback Plan
```bash
# Backup current file first
cp /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations-center/public/hi.html \
   /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations-center/public/hi.html.backup

# To rollback if needed
cp /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations-center/public/hi.html.backup \
   /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations-center/public/hi.html
```

---

## Solution #2: Add Missing JSON Body Parameters

**Addresses Root Cause**: #2 - Missing JSON Body Parameters  
**Priority**: CRITICAL  
**Complexity**: Low  
**Estimated Time**: 10 minutes

### Quick Fix

This is already included in Solution #1 above. The `body: JSON.stringify({script: 'kismet'})` addition fixes this issue.

### Permanent Solution

Ensure all API calls include proper headers and body content:

```javascript
// Create a utility function for API calls
function makeAPICall(endpoint, scriptName) {
    return fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            script: scriptName
        })
    });
}

// Then use it in functions:
// const response = await makeAPICall('/run-script', 'kismet');
```

### Testing Steps

Same as Solution #1 - both fixes work together.

---

## Solution #3: Implement Kismet Iframe

**Addresses Root Cause**: #3 - Missing Iframe Implementation  
**Priority**: CRITICAL  
**Complexity**: Medium  
**Estimated Time**: 30 minutes

### Quick Fix (Basic Iframe)

Add iframe to the Kismet tab content:

```html
<!-- In hi.html, find the Kismet tab content div (around line 1282) -->
<!-- Replace the existing empty div with: -->
<div id="kismet" class="tab-content">
    <h2>Kismet Network Monitor</h2>
    <div class="iframe-container">
        <iframe id="kismetFrame" 
                src="" 
                style="width: 100%; height: 600px; border: 1px solid #ddd;">
        </iframe>
    </div>
    <div class="iframe-controls">
        <button onclick="loadKismetInterface()">Load Kismet Interface</button>
        <button onclick="refreshKismetInterface()">Refresh</button>
        <span id="kismetIframeStatus"></span>
    </div>
</div>
```

Add JavaScript to manage the iframe:

```javascript
// Add after line 1400 in hi.html
function loadKismetInterface() {
    const iframe = document.getElementById('kismetFrame');
    const statusSpan = document.getElementById('kismetIframeStatus');
    
    // Use the server's IP address instead of localhost
    const kismetUrl = `http://${window.location.hostname}:2501`;
    
    statusSpan.textContent = 'Loading Kismet interface...';
    iframe.src = kismetUrl;
    
    iframe.onload = function() {
        statusSpan.textContent = 'Kismet interface loaded';
        statusSpan.style.color = 'green';
    };
    
    iframe.onerror = function() {
        statusSpan.textContent = 'Failed to load Kismet interface';
        statusSpan.style.color = 'red';
    };
}

function refreshKismetInterface() {
    const iframe = document.getElementById('kismetFrame');
    iframe.src = iframe.src; // Reload the current URL
}

// Auto-load when tab is selected
document.addEventListener('DOMContentLoaded', function() {
    const kismetTab = document.querySelector('[onclick*="kismet"]');
    if (kismetTab) {
        const originalOnclick = kismetTab.onclick;
        kismetTab.onclick = function(event) {
            originalOnclick.call(this, event);
            // Load iframe if not already loaded
            const iframe = document.getElementById('kismetFrame');
            if (!iframe.src) {
                loadKismetInterface();
            }
        };
    }
});
```

### Permanent Solution (Advanced Iframe with Proxy)

For better integration and to handle CORS issues, implement a proxy:

```javascript
// In the Node.js server (/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations-center/server.js)
// Add after line 30:

const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy for Kismet to handle CORS
app.use('/kismet-proxy', createProxyMiddleware({
    target: 'http://localhost:2501',
    changeOrigin: true,
    pathRewrite: {
        '^/kismet-proxy': '' // Remove the proxy prefix
    },
    onProxyRes: function(proxyRes, req, res) {
        // Add CORS headers
        proxyRes.headers['X-Frame-Options'] = 'SAMEORIGIN';
        proxyRes.headers['Content-Security-Policy'] = "frame-ancestors 'self' http://100.68.185.86:*";
    },
    onError: function(err, req, res) {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error');
    }
}));
```

Then update the iframe to use the proxy:

```javascript
// In loadKismetInterface() function
const kismetUrl = '/kismet-proxy/';  // Use proxy instead of direct URL
```

### Implementation Steps

1. Backup the current file
2. Edit hi.html to add the iframe HTML
3. Add the JavaScript functions
4. Optionally implement the proxy in server.js
5. Install proxy middleware if needed: `npm install http-proxy-middleware`

### Testing Steps

1. Refresh the page
2. Click on the Kismet tab
3. Verify iframe container appears
4. Click "Load Kismet Interface" button
5. Wait for Kismet UI to load in iframe
6. Test navigation within the iframe
7. Test the Refresh button

### CSS Styling (Optional Enhancement)

```css
/* Add to the <style> section in hi.html */
.iframe-container {
    margin: 20px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border-radius: 4px;
    overflow: hidden;
}

.iframe-controls {
    margin: 10px 0;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
}

.iframe-controls button {
    margin-right: 10px;
}

#kismetIframeStatus {
    margin-left: 20px;
    font-weight: bold;
}
```

---

## Solution #4: Fix Hardcoded Localhost URLs

**Addresses Root Cause**: #4 - Hardcoded Localhost URLs  
**Priority**: CRITICAL  
**Complexity**: Low  
**Estimated Time**: 10 minutes

### Quick Fix

Replace hardcoded localhost URLs with dynamic host detection:

```html
<!-- In hi.html, find the external link buttons (around lines 99-100) -->
<!-- Replace the existing buttons with: -->

<button class="nav-button" onclick="openExternalKismet()">Open Kismet Web UI</button>
<button class="nav-button" onclick="openExternalWigleToTAK()">Open WigletoTAK</button>
```

Add JavaScript functions:

```javascript
// Add these functions after line 1400
function openExternalKismet() {
    const kismetUrl = `http://${window.location.hostname}:2501`;
    window.open(kismetUrl, '_blank');
}

function openExternalWigleToTAK() {
    const wigleUrl = `http://${window.location.hostname}:8000`;
    window.open(wigleUrl, '_blank');
}
```

### Permanent Solution

Create a configuration object for all external URLs:

```javascript
// Add at the top of the script section
const serviceConfig = {
    getKismetUrl: function() {
        return `http://${window.location.hostname}:2501`;
    },
    getWigleToTAKUrl: function() {
        return `http://${window.location.hostname}:8000`;
    },
    getHackRFUrl: function() {
        return `http://${window.location.hostname}:8073`;
    }
};

// Use throughout the application
// Example: window.open(serviceConfig.getKismetUrl(), '_blank');
```

### Alternative Solution (Environment-based)

For production deployments, use environment configuration:

```javascript
// In server.js, pass configuration to frontend
app.get('/api/config', (req, res) => {
    res.json({
        kismetUrl: process.env.KISMET_URL || `http://${req.hostname}:2501`,
        wigleToTakUrl: process.env.WIGLE_URL || `http://${req.hostname}:8000`,
        hackrfUrl: process.env.HACKRF_URL || `http://${req.hostname}:8073`
    });
});

// In frontend, fetch and use configuration
let serviceUrls = {};
fetch('/api/config')
    .then(res => res.json())
    .then(config => {
        serviceUrls = config;
    });
```

### Testing Steps

1. Access the application from a remote machine (not localhost)
2. Click "Open Kismet Web UI" button
3. Verify it opens Kismet at the correct IP (not localhost)
4. Click "Open WigletoTAK" button
5. Verify it opens WigletoTAK at the correct IP
6. Test from different client machines

---

## Solution #5: Add CORS Headers to Backend Services

**Addresses Root Cause**: #5 - Missing CORS Headers  
**Priority**: HIGH  
**Complexity**: Medium  
**Estimated Time**: 30 minutes

### Option A: Configure Services Directly

#### For WigletoTAK (Flask application):

```python
# In /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/WigleToTak2.py
# Add after Flask app initialization (around line 30):

from flask_cors import CORS

# Enable CORS for all routes
CORS(app, origins=['http://100.68.185.86:8002', 'http://localhost:8002'])

# Or if flask_cors not installed, add manually:
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://100.68.185.86:8002')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
```

Install flask-cors if needed:
```bash
cd /home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK
source venv/bin/activate
pip install flask-cors
```

#### For Kismet:

Kismet doesn't support CORS configuration directly. Use the proxy solution in Option B.

### Option B: Use Node.js Proxy (Recommended)

This is the most reliable solution that handles both CORS and authentication:

```javascript
// In /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations-center/server.js
// Add after line 30:

const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy for Kismet API
app.use('/api/kismet', createProxyMiddleware({
    target: 'http://localhost:2501',
    changeOrigin: true,
    auth: 'admin:admin',  // Add authentication
    pathRewrite: {
        '^/api/kismet': '/api'  // Rewrite path
    },
    onProxyRes: function(proxyRes, req, res) {
        // Add CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
}));

// Proxy for WigletoTAK API
app.use('/api/wigle', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
        '^/api/wigle': '/api'
    }
}));

// Handle preflight requests
app.options('/api/*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});
```

### Frontend API Usage with Proxy:

```javascript
// Example: Fetch Kismet devices through proxy
async function fetchKismetDevices() {
    try {
        const response = await fetch('/api/kismet/devices/summary/devices.json');
        const devices = await response.json();
        console.log('Kismet devices:', devices);
        return devices;
    } catch (error) {
        console.error('Error fetching devices:', error);
    }
}
```

### Testing Steps

1. Implement the proxy solution
2. Restart the Node.js server
3. Open browser console
4. Test API call: `fetch('/api/kismet/system/status.json').then(r => r.json()).then(console.log)`
5. Verify no CORS errors
6. Check response data in console

---

## Solution #6: Handle Kismet Authentication

**Addresses Root Cause**: #6 - Kismet API Authentication Requirement  
**Priority**: HIGH  
**Complexity**: Low  
**Estimated Time**: 15 minutes

### Quick Fix

The proxy solution in #5 already includes authentication. The `auth: 'admin:admin'` parameter handles this automatically.

### Direct API Calls (If Not Using Proxy)

For direct API calls, include Basic Authentication:

```javascript
// Utility function for authenticated Kismet API calls
function fetchKismetAPI(endpoint) {
    const auth = btoa('admin:admin'); // Base64 encode credentials
    
    return fetch(`http://${window.location.hostname}:2501${endpoint}`, {
        headers: {
            'Authorization': `Basic ${auth}`
        }
    });
}

// Usage example
async function getKismetStatus() {
    try {
        const response = await fetchKismetAPI('/api/system/status.json');
        const status = await response.json();
        console.log('Kismet status:', status);
    } catch (error) {
        console.error('Error fetching Kismet status:', error);
    }
}
```

### Secure Alternative (Production)

Store credentials securely on the server:

```javascript
// In server.js, create an authenticated proxy endpoint
app.get('/api/kismet-status', async (req, res) => {
    try {
        const response = await fetch('http://localhost:2501/api/system/status.json', {
            headers: {
                'Authorization': 'Basic ' + Buffer.from('admin:admin').toString('base64')
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Kismet status' });
    }
});
```

### Testing Steps

1. Implement authentication in proxy or direct calls
2. Test API endpoint that requires auth
3. Verify successful response (no 401 errors)
4. Check that data is returned properly

---

## Implementation Order

### Phase 1: Critical Button Fixes (30 minutes)
1. **Fix #1** - Update API endpoints in hi.html
2. **Fix #2** - Add JSON body parameters (included in #1)
3. Test Start/Stop Kismet functionality

### Phase 2: URL and Access Fixes (20 minutes)
4. **Fix #4** - Replace localhost URLs with dynamic host
5. Test remote access to external links

### Phase 3: Integration Features (1 hour)
6. **Fix #5** - Implement Node.js proxy for CORS and auth
7. **Fix #6** - Authentication handled by proxy
8. **Fix #3** - Add Kismet iframe using proxy URL
9. Test complete integration

### Parallel Implementation Options
- Fixes #1, #2, and #4 can be done simultaneously (different code sections)
- Fix #5 (proxy setup) can be done while testing other fixes
- Fix #3 (iframe) should be done after #4 and #5 for best results

## Risk Assessment

### Low Risk Changes
- **Fixes #1, #2, #4**: Simple JavaScript changes, easy to revert
- **Fix #6**: If using proxy, no risk; credentials stay server-side

### Medium Risk Changes
- **Fix #3**: Iframe might have display issues, but won't break existing functionality
- **Fix #5**: Proxy setup requires new dependency, but isolated to server

### Mitigation Strategies
1. **Backup all files before changes**
2. **Test each fix independently**
3. **Keep original button functionality until new version verified**
4. **Use feature flags for gradual rollout**

### Performance Impacts
- **Proxy overhead**: Minimal, adds ~10-50ms latency
- **Iframe loading**: Initial load time for Kismet UI
- **No impact on existing features**

## Alternative Solutions

### Alternative for Fix #1 & #2: Modify Backend
Instead of changing frontend, modify backend to accept current frontend calls:

```javascript
// In server.js, add compatibility routes
app.post('/api/kismet/start', (req, res) => {
    // Forward to existing endpoint
    req.body = { script: 'kismet' };
    runScript(req, res);
});

app.post('/api/kismet/stop', (req, res) => {
    req.body = { script: 'kismet' };
    stopScript(req, res);
});
```

**Trade-off**: Less changes but creates technical debt

### Alternative for Fix #3: Modal Window
Instead of iframe, use a modal with embedded content:

```javascript
function openKismetModal() {
    const modal = document.createElement('div');
    modal.className = 'kismet-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <iframe src="http://${window.location.hostname}:2501" 
                    style="width: 100%; height: 90vh;"></iframe>
        </div>
    `;
    document.body.appendChild(modal);
}
```

**Trade-off**: Better for occasional use, not persistent monitoring

### Alternative for Fix #5: JSONP
For read-only data, use JSONP to bypass CORS:

```javascript
function loadKismetData(callback) {
    const script = document.createElement('script');
    script.src = `http://${window.location.hostname}:2501/api/devices?callback=${callback}`;
    document.head.appendChild(script);
}
```

**Trade-off**: Only works for GET requests, requires backend support

## Validation Checklist

Before considering implementation complete:

- [ ] Start Kismet button successfully starts the service
- [ ] Stop Kismet button successfully stops the service
- [ ] Status messages appear for user feedback
- [ ] External link buttons work from remote clients
- [ ] Kismet iframe loads and displays (if implemented)
- [ ] No CORS errors in browser console
- [ ] No 401 authentication errors
- [ ] All changes have backup copies
- [ ] Error handling provides useful feedback
- [ ] Code follows existing style patterns

## Next Steps

1. Agent H will validate these solutions for correctness
2. Implementation can begin with Phase 1 (critical fixes)
3. Each fix should be tested independently before moving to the next
4. Full integration testing after all fixes are applied
5. Document any issues encountered during implementation
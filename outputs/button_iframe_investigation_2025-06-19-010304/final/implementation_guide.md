# Button & Iframe Investigation - Implementation Guide

## Executive Summary

The investigation identified 6 root causes for the non-functional buttons and missing iframe on the Kismet Operations Center (100.68.185.86:8002). All issues are frontend/integration related - the backend services are fully operational.

### Issues Found:
1. **Frontend calling wrong API endpoints** (Critical)
2. **Missing JSON body parameters in API calls** (Critical) 
3. **No iframe element in HTML** (Critical)
4. **Hardcoded localhost URLs** (Critical)
5. **Missing CORS headers on backend services** (High)
6. **Kismet requires authentication** (High)

### Overall Implementation Time: ~2 hours
- Phase 1 (Critical fixes): 30 minutes
- Phase 2 (Access fixes): 20 minutes  
- Phase 3 (Integration features): 1 hour

## Phase 1: Critical Button Fixes (30 minutes)

### Fix #1: Update API Endpoints and Add JSON Bodies

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/public/hi.html`

**Replace** (around lines 130-145):
```javascript
function startKismet() {
    updateStatus('Starting Kismet...', 'info');
    
    fetch('/api/kismet/start', {
        method: 'POST'
    })
```

**With**:
```javascript
function startKismet() {
    updateStatus('Starting Kismet...', 'info');
    
    fetch('/run-script', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ script: 'kismet' })
    })
```

**And replace**:
```javascript
function stopKismet() {
    updateStatus('Stopping Kismet...', 'info');
    
    fetch('/api/kismet/stop', {
        method: 'POST'
    })
```

**With**:
```javascript
function stopKismet() {
    updateStatus('Stopping Kismet...', 'info');
    
    fetch('/stop-script', {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ script: 'kismet' })
    })
```

### Testing Phase 1:
1. Reload the page at http://100.68.185.86:8002
2. Click "Start Kismet" - should show success message
3. Verify Kismet is running: `ps aux | grep kismet`
4. Click "Stop Kismet" - should show success message
5. Verify Kismet stopped: `ps aux | grep kismet`

## Phase 2: Fix Remote Access (20 minutes)

### Fix #2: Replace Hardcoded localhost URLs

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/public/hi.html`

**Replace** (around line 92):
```javascript
onclick="window.open('http://localhost:2501', '_blank')"
```

**With**:
```javascript
onclick="window.open('http://' + window.location.hostname + ':2501', '_blank')"
```

**And replace** (around line 100):
```javascript
onclick="window.open('http://localhost:8000', '_blank')"
```

**With**:
```javascript
onclick="window.open('http://' + window.location.hostname + ':8000', '_blank')"
```

### Testing Phase 2:
1. Access from a remote machine (not localhost)
2. Click "Open Kismet Web UI" - should open Kismet interface
3. Click "Open WigletoTAK" - should open WigletoTAK interface

## Phase 3: Add Integration Features (1 hour)

### Fix #3: Add Kismet Iframe

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/public/hi.html`

**Add after** the tab content div (around line 112):
```html
<!-- Kismet Iframe Section -->
<div class="card mb-4">
    <div class="card-header">
        <h5 class="mb-0">Kismet Live View</h5>
    </div>
    <div class="card-body p-0">
        <iframe id="kismetFrame" 
                style="width: 100%; height: 600px; border: none;"
                sandbox="allow-scripts allow-same-origin allow-forms"
                onload="this.style.opacity = '1'"
                onerror="handleIframeError()">
        </iframe>
    </div>
</div>

<script>
// Dynamic iframe URL handling
document.addEventListener('DOMContentLoaded', function() {
    const iframe = document.getElementById('kismetFrame');
    const kismetUrl = 'http://' + window.location.hostname + ':2501';
    
    // Set iframe source with error handling
    iframe.src = kismetUrl;
});

function handleIframeError() {
    const iframe = document.getElementById('kismetFrame');
    iframe.style.display = 'none';
    iframe.parentElement.innerHTML = '<div class="alert alert-warning m-3">Unable to load Kismet interface. Please ensure Kismet is running and try refreshing the page.</div>';
}
</script>
```

### Fix #4: Add Proxy for CORS and Authentication (Optional but Recommended)

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/server.js`

**Add** after existing requires (around line 5):
```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');
```

**Add** before existing routes (around line 50):
```javascript
// Proxy for Kismet API with CORS and auth
app.use('/api/kismet', createProxyMiddleware({
    target: 'http://localhost:2501',
    changeOrigin: true,
    auth: 'admin:admin',
    pathRewrite: {
        '^/api/kismet': ''
    },
    onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
    }
}));

// Proxy for WigletoTAK API with CORS
app.use('/api/wigle', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
        '^/api/wigle': ''
    },
    onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['access-control-allow-origin'] = '*';
    }
}));
```

**Install dependency**:
```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs
npm install http-proxy-middleware
```

**Restart the server**:
```bash
pm2 restart kismet-operations-center
```

### Testing Phase 3:
1. Verify iframe loads Kismet interface
2. Test proxy endpoints: `curl http://100.68.185.86:8002/api/kismet/system/status.json`
3. Verify CORS headers in response
4. Check authentication is handled automatically

## Testing Checklist

- [ ] Start/Stop Kismet buttons work correctly
- [ ] Status messages display properly
- [ ] External link buttons open correct URLs from remote machines
- [ ] Kismet iframe displays (if implemented)
- [ ] No console errors in browser
- [ ] API calls succeed with proper responses
- [ ] Services remain stable after changes

## Rollback Procedures

If issues occur, restore original files:
```bash
# Backup current files first
cp /home/pi/projects/stinkster_malone/stinkster/src/nodejs/public/hi.html /home/pi/projects/stinkster_malone/stinkster/src/nodejs/public/hi.html.fixed
cp /home/pi/projects/stinkster_malone/stinkster/src/nodejs/server.js /home/pi/projects/stinkster_malone/stinkster/src/nodejs/server.js.fixed

# If rollback needed
git checkout /home/pi/projects/stinkster_malone/stinkster/src/nodejs/public/hi.html
git checkout /home/pi/projects/stinkster_malone/stinkster/src/nodejs/server.js
pm2 restart kismet-operations-center
```

## Notes

- All backend services (Kismet, WigletoTAK) are functioning correctly
- The fixes only modify frontend code and integration points
- No changes to core service configurations required
- Solutions maintain backward compatibility
- Authentication credentials for Kismet: admin/admin

## Support

For issues during implementation:
1. Check browser console for JavaScript errors
2. Verify services are running: `ps aux | grep -E "(kismet|wigle|node)"`
3. Check server logs: `pm2 logs kismet-operations-center`
4. Ensure firewall allows ports: 2501, 8000, 8002
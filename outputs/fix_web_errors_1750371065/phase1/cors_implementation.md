# CORS Solutions Expert Report - Agent 2

## CORS Issue Analysis

### Problem Identified
CORS errors occur when loading Kismet iframe from port 2501 into the page on port 8002 because:
1. Kismet server (port 2501) doesn't send proper CORS headers
2. Browser's same-origin policy blocks cross-origin iframe content
3. The Node.js server has CORS enabled but can't control Kismet's headers

### Current Setup
- Node.js server (port 8002): Has `app.use(cors())` enabled
- Kismet server (port 2501): Doesn't allow cross-origin iframe embedding
- Proxy exists at `/api/kismet` but iframe loads directly from port 2501

## Solution Implementation

### Solution 1: Proxy-Based Iframe (Recommended)
Instead of loading Kismet directly, use the existing proxy endpoint.

**Changes in hi.html:**

1. **Update iframe source (line 1223-1235):**
```javascript
// Replace the direct Kismet URL
document.addEventListener('DOMContentLoaded', function() {
    const iframe = document.getElementById('kismetFrame');
    // Use a proxy page instead of direct Kismet URL
    const kismetUrl = '/kismet-proxy';
    
    console.log('Setting Kismet iframe URL to proxy:', kismetUrl);
    
    // Clear any existing src first
    iframe.src = '';
    
    // Set iframe source with a small delay
    setTimeout(function() {
        console.log('Now setting iframe src to:', kismetUrl);
        iframe.src = kismetUrl;
    }, 100);
});
```

2. **Add proxy route in server.js:**
```javascript
// Add after line 499 in server.js
app.get('/kismet-proxy', (req, res) => {
    // Create a proxy page that embeds Kismet
    const proxyHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        iframe { width: 100%; height: 100vh; border: none; }
    </style>
</head>
<body>
    <iframe src="http://localhost:2501" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
    </iframe>
</body>
</html>`;
    res.send(proxyHtml);
});
```

### Solution 2: Enhanced CORS Headers
Add middleware to inject CORS headers for all responses.

**Add to server.js (after line 370):**
```javascript
// Enhanced CORS middleware for iframe support
app.use((req, res, next) => {
    // Allow iframe embedding from same origin
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Allow specific origins for CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
});
```

### Solution 3: Reverse Proxy with iframe-resizer
Use http-proxy-middleware to create a full reverse proxy.

**Add to server.js:**
```javascript
// Full Kismet reverse proxy for iframe embedding
app.use('/kismet-embed', createProxyMiddleware({
    target: 'http://localhost:2501',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    auth: 'admin:admin',
    onProxyRes: (proxyRes, req, res) => {
        // Remove X-Frame-Options to allow iframe embedding
        delete proxyRes.headers['x-frame-options'];
        // Add CORS headers
        proxyRes.headers['access-control-allow-origin'] = '*';
    }
}));
```

**Update hi.html to use the proxy:**
```javascript
const kismetUrl = '/kismet-embed';
```

### Solution 4: PostMessage Communication
If iframe restrictions persist, use postMessage for cross-origin communication.

**Add to hi.html:**
```javascript
// Listen for messages from Kismet iframe
window.addEventListener('message', function(event) {
    // Verify origin
    if (event.origin !== 'http://localhost:2501') return;
    
    // Handle Kismet data
    console.log('Received from Kismet:', event.data);
    
    // Update UI based on Kismet messages
    if (event.data.type === 'status') {
        updateKismetStatus(event.data.status);
    }
});
```

## Recommended Implementation

**Use Solution 1 (Proxy-Based Iframe)** combined with **Solution 3 (Reverse Proxy)** for best results:

1. Proxy provides a same-origin context for the iframe
2. Reverse proxy handles all Kismet resources (CSS, JS, images)
3. WebSocket support ensures real-time updates work
4. No changes needed to Kismet configuration

### Security Considerations
- Keep proxy restricted to localhost for security
- Consider adding authentication to proxy endpoints
- Monitor proxy usage to prevent abuse
- Use HTTPS in production environments

### Testing Steps
1. Implement the proxy route
2. Update iframe source to use proxy
3. Test iframe loading without CORS errors
4. Verify Kismet functionality works through proxy
5. Check WebSocket connections for real-time updates
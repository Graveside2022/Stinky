# Frontend URL Mapping Guide

## Overview

This document provides a comprehensive mapping between frontend requests and backend API endpoints for the Spectrum Analyzer service. It identifies hardcoded values, configuration requirements, and necessary updates for production deployment.

## Current Frontend Implementation Analysis

### Hardcoded Values in Frontend

Based on analysis of the frontend code, the following values are currently hardcoded:

| Location | Hardcoded Value | Purpose | Recommended Fix |
|----------|----------------|---------|-----------------|
| `spectrum.html:196` | Socket.IO auto-detection | WebSocket connection | Use environment variable |
| `spectrum.html:243` | `/api/status` | Status endpoint | Configurable base URL |
| `spectrum.html:284` | `/api/scan/` | Scan endpoint | Configurable base URL |
| `spectrum.html:426` | `/api/profiles` | Profiles endpoint | Configurable base URL |
| `spectrum.js:78` | `/api/status` | Status endpoint | Use config object |
| `spectrum.js:130` | `/api/signals` | Signals endpoint | Use config object |
| `spectrum.js:149` | `/api/connect` | Connection endpoint | Use config object |

### Current URL Structure

```javascript
// Frontend expects these endpoints:
const API_ENDPOINTS = {
  // REST API
  status: '/api/status',
  profiles: '/api/profiles',
  scan: '/api/scan/{profileId}',
  signals: '/api/signals',
  connect: '/api/connect',
  disconnect: '/api/disconnect',
  config: '/api/config',
  health: '/health',
  
  // WebSocket
  websocket: '/' // Socket.IO auto-handles the path
};
```

## Required Frontend Updates

### 1. Environment-Based Configuration

Create a configuration module for the frontend:

```javascript
// public/js/config.js
const SpectrumConfig = (function() {
  // Default configuration
  const defaults = {
    apiBaseUrl: '',  // Empty string uses same origin
    wsUrl: null,      // Null lets Socket.IO auto-detect
    refreshInterval: 5000,
    logBufferSize: 100,
    enableDebugLogging: false
  };
  
  // Override with environment-specific values
  const config = {
    ...defaults,
    ...(window.SPECTRUM_CONFIG || {})
  };
  
  // Build full URLs
  const buildUrl = (path) => {
    return config.apiBaseUrl + path;
  };
  
  return {
    // API endpoints
    api: {
      status: buildUrl('/api/status'),
      profiles: buildUrl('/api/profiles'),
      scan: (profileId) => buildUrl(`/api/scan/${profileId}`),
      signals: buildUrl('/api/signals'),
      connect: buildUrl('/api/connect'),
      disconnect: buildUrl('/api/disconnect'),
      config: buildUrl('/api/config'),
      fft: {
        latest: buildUrl('/api/fft/latest'),
        clear: buildUrl('/api/fft/clear')
      },
      health: buildUrl('/health')
    },
    
    // WebSocket configuration
    websocket: {
      url: config.wsUrl,
      options: {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      }
    },
    
    // UI configuration
    ui: {
      refreshInterval: config.refreshInterval,
      logBufferSize: config.logBufferSize,
      enableDebugLogging: config.enableDebugLogging
    },
    
    // Utility functions
    setApiBaseUrl: (url) => {
      config.apiBaseUrl = url;
    },
    
    setWebSocketUrl: (url) => {
      config.wsUrl = url;
    }
  };
})();
```

### 2. Environment Injection in HTML

Update the HTML to inject configuration:

```html
<!-- In spectrum.html, before other scripts -->
<script>
  // This will be replaced by server-side templating or build process
  window.SPECTRUM_CONFIG = {
    apiBaseUrl: '<!-- INJECT:API_BASE_URL -->',
    wsUrl: '<!-- INJECT:WS_URL -->',
    refreshInterval: <!-- INJECT:REFRESH_INTERVAL -->,
    enableDebugLogging: <!-- INJECT:ENABLE_DEBUG -->
  };
</script>
<script src="/js/config.js"></script>
<script src="/js/spectrum.js"></script>
```

### 3. Updated Frontend Implementation

```javascript
// Updated spectrum.js using configuration
class SpectrumAnalyzer {
    constructor() {
        this.config = SpectrumConfig;
        this.socket = io(this.config.websocket.url, this.config.websocket.options);
        this.currentProfile = 'vhf';
        this.isScanning = false;
        this.isConnected = false;
        
        this.initializeEventHandlers();
        this.initializeSocketEvents();
    }
    
    async refreshStatus() {
        try {
            const response = await fetch(this.config.api.status);
            const status = await response.json();
            this.updateStatusDisplay(status);
        } catch (error) {
            this.addLog(`❌ Status error: ${error.message}`);
        }
    }
    
    async startScan() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        const scanBtn = document.getElementById('scan-btn');
        const loadingDiv = document.getElementById('loading');
        
        scanBtn.disabled = true;
        loadingDiv.style.display = 'block';
        
        this.addLog(`🔍 Starting scan with profile: ${this.currentProfile}`);
        
        try {
            const response = await fetch(this.config.api.scan(this.currentProfile));
            const result = await response.json();
            
            this.displaySignals(result.signals || [], result.real_data || false);
            this.addLog(`✅ Scan complete: Found ${(result.signals || []).length} signals`);
            
        } catch (error) {
            this.addLog(`❌ Scan error: ${error.message}`);
            document.getElementById('signals-container').innerHTML = '<div class="error">Scan failed</div>';
        } finally {
            this.isScanning = false;
            scanBtn.disabled = false;
            loadingDiv.style.display = 'none';
        }
    }
    
    async connectToOpenWebRX() {
        try {
            const response = await fetch(this.config.api.connect, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: 'ws://localhost:8073/ws'
                }),
            });
            
            const result = await response.json();
            this.addLog(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
        } catch (error) {
            this.addLog(`❌ Connection error: ${error.message}`);
        }
    }
}
```

### 4. Build-Time Configuration

For production builds, use a build script to inject values:

```javascript
// build-config.js
const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    API_BASE_URL: 'http://localhost:8092',
    WS_URL: 'http://localhost:8092',
    REFRESH_INTERVAL: 5000,
    ENABLE_DEBUG: true
  },
  production: {
    API_BASE_URL: 'https://spectrum.yourdomain.com',
    WS_URL: 'https://spectrum.yourdomain.com',
    REFRESH_INTERVAL: 10000,
    ENABLE_DEBUG: false
  }
};

function injectConfig(environment) {
  const config = environments[environment] || environments.production;
  const htmlPath = path.join(__dirname, 'public', 'spectrum.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Replace placeholders
  Object.keys(config).forEach(key => {
    const placeholder = `<!-- INJECT:${key} -->`;
    html = html.replace(placeholder, config[key]);
  });
  
  // Write to dist directory
  const distPath = path.join(__dirname, 'dist', 'spectrum.html');
  fs.writeFileSync(distPath, html);
}

// Run with: node build-config.js production
injectConfig(process.argv[2] || 'production');
```

## API Endpoint Mapping

### REST Endpoints

| Frontend Request | Backend Endpoint | Method | Purpose |
|-----------------|------------------|--------|---------|
| `/api/status` | `/api/status` | GET | System status |
| `/api/profiles` | `/api/profiles` | GET | Scan profiles |
| `/api/scan/{id}` | `/api/scan/{id}` | GET | Frequency scan |
| `/api/signals` | `/api/signals` | GET | Signal detection |
| `/api/connect` | `/api/connect` | POST | OpenWebRX connection |
| `/api/disconnect` | `/api/disconnect` | POST | Disconnect |
| `/api/config` | `/api/config` | GET/POST | Configuration |
| `/api/fft/latest` | `/api/fft/latest` | GET | Latest FFT data |
| `/api/fft/clear` | `/api/fft/clear` | POST | Clear buffer |
| `/health` | `/health` | GET | Health check |

### WebSocket Events

| Frontend Event | Backend Handler | Direction | Purpose |
|---------------|-----------------|-----------|---------|
| `connect` | Connection established | Server→Client | Connection success |
| `disconnect` | Connection lost | Server→Client | Disconnection |
| `status` | System status | Server→Client | Status update |
| `fftData` | FFT data stream | Server→Client | Real-time FFT |
| `signalsDetected` | Signal detection | Server→Client | New signals |
| `requestStatus` | Status request | Client→Server | Request status |
| `requestSignals` | Signal request | Client→Server | Request signals |
| `requestLatestFFT` | FFT request | Client→Server | Request FFT |

## Proxy Configuration for Development

### Using Webpack Dev Server

```javascript
// webpack.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8092',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:8092',
        ws: true,
        changeOrigin: true
      }
    }
  }
};
```

### Using Create React App

```json
// package.json
{
  "proxy": "http://localhost:8092"
}
```

### Using Nginx

```nginx
# nginx.conf
server {
    listen 80;
    server_name spectrum.local;
    
    location / {
        root /var/www/spectrum;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8092;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://localhost:8092;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Error Handling for URL Issues

### Frontend Error Handler

```javascript
class APIClient {
    constructor(config) {
        this.config = config;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }
    
    async request(endpoint, options = {}) {
        let lastError;
        
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                const response = await fetch(endpoint, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                lastError = error;
                
                // Log detailed error information
                console.error(`API request failed (attempt ${attempt + 1}):`, {
                    endpoint,
                    error: error.message,
                    stack: error.stack
                });
                
                // Check for specific error types
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    // Network error - likely CORS or connection issue
                    this.handleNetworkError(endpoint, error);
                }
                
                // Wait before retry
                if (attempt < this.retryAttempts - 1) {
                    await this.delay(this.retryDelay * (attempt + 1));
                }
            }
        }
        
        throw lastError;
    }
    
    handleNetworkError(endpoint, error) {
        const url = new URL(endpoint, window.location.origin);
        
        // Check if it's a CORS issue
        if (url.origin !== window.location.origin) {
            console.error('Possible CORS issue detected:', {
                requestOrigin: window.location.origin,
                targetOrigin: url.origin
            });
        }
        
        // Provide helpful error messages
        this.showUserError('Connection failed. Please check if the service is running.');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    showUserError(message) {
        // Update UI with user-friendly error message
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
}
```

## Testing URL Mappings

### Automated URL Testing

```javascript
// test-urls.js
const endpoints = [
    { path: '/api/status', method: 'GET' },
    { path: '/api/profiles', method: 'GET' },
    { path: '/api/scan/vhf', method: 'GET' },
    { path: '/api/signals', method: 'GET' },
    { path: '/api/connect', method: 'POST', body: { url: 'ws://localhost:8073/ws' } },
    { path: '/health', method: 'GET' }
];

async function testEndpoints(baseUrl) {
    console.log(`Testing endpoints at ${baseUrl}`);
    
    for (const endpoint of endpoints) {
        try {
            const options = {
                method: endpoint.method,
                headers: { 'Content-Type': 'application/json' }
            };
            
            if (endpoint.body) {
                options.body = JSON.stringify(endpoint.body);
            }
            
            const response = await fetch(baseUrl + endpoint.path, options);
            console.log(`✅ ${endpoint.method} ${endpoint.path}: ${response.status}`);
        } catch (error) {
            console.error(`❌ ${endpoint.method} ${endpoint.path}: ${error.message}`);
        }
    }
}

// Run tests
testEndpoints('http://localhost:8092');
```

### Browser Console Testing

```javascript
// Paste in browser console to test endpoints
(async function testAPI() {
    const baseUrl = window.location.origin;
    const tests = [
        { name: 'Status', url: '/api/status' },
        { name: 'Profiles', url: '/api/profiles' },
        { name: 'Health', url: '/health' }
    ];
    
    for (const test of tests) {
        try {
            const response = await fetch(baseUrl + test.url);
            const data = await response.json();
            console.log(`✅ ${test.name}:`, data);
        } catch (error) {
            console.error(`❌ ${test.name}:`, error.message);
        }
    }
    
    // Test WebSocket
    const socket = io(baseUrl);
    socket.on('connect', () => console.log('✅ WebSocket connected'));
    socket.on('error', (error) => console.error('❌ WebSocket error:', error));
})();
```

## Migration Checklist

When migrating or updating URL mappings:

- [ ] Update frontend configuration module
- [ ] Test all REST endpoints
- [ ] Test WebSocket connection
- [ ] Verify CORS headers
- [ ] Check error handling
- [ ] Update proxy configuration
- [ ] Test in different environments
- [ ] Update documentation
- [ ] Test with authentication (if applicable)
- [ ] Verify rate limiting works correctly

---

**Document Version**: 1.0  
**Last Updated**: 2025-06-16  
**Applies To**: Spectrum Analyzer Frontend v2.0.0
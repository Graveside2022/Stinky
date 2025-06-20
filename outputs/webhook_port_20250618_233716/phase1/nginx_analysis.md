# Nginx Configuration Analysis for Webhook Service

## Executive Summary

Based on the analysis of the Stinkster project, the webhook service operates on **port 8002** as configured in the Node.js Kismet Operations Center server (`/src/nodejs/kismet-operations/server.js`). Currently, the system operates **without nginx** in the existing deployment, with Node.js services directly exposed. This analysis documents the nginx requirements for production deployment.

## Current Configuration Analysis

### Direct Service Exposure
The webhook service (Kismet Operations Center) currently runs directly on port 8002:

```javascript
// From server.js
const PORT = process.env.PORT || 8002;
```

### No Existing Nginx Configuration
- No nginx configuration files found in the codebase
- Services run directly without reverse proxy
- Current deployment model uses direct port exposure

### Service Architecture
The webhook service is part of the Kismet Operations Center which provides:
- **Service orchestration endpoints** (`/run-script`, `/stop-script`, `/script-status`)
- **WebSocket support** via Socket.IO
- **Static file serving** for the web interface
- **Integration with external services** (Kismet on port 2501)

## Nginx Requirements for Webhook Service

### 1. Basic Reverse Proxy Configuration

```nginx
# Upstream definition for webhook service
upstream webhook_service {
    server localhost:8002;
    keepalive 64;
}

server {
    listen 80;
    server_name stinkster.local;
    
    # Webhook service location
    location /webhook/ {
        proxy_pass http://webhook_service/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Important for POST requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### 2. WebSocket Support Requirements

The webhook service uses Socket.IO which requires WebSocket upgrade support:

```nginx
# WebSocket support for Socket.IO
location /webhook/socket.io/ {
    proxy_pass http://webhook_service/socket.io/;
    proxy_http_version 1.1;
    
    # WebSocket upgrade headers - CRITICAL
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Socket.IO specific settings
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_cache_bypass $http_upgrade;
    
    # Long timeout for persistent connections
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    keepalive_timeout 86400s;
}
```

### 3. Button and Interactive Element Handling

For the START/STOP operations buttons in the interface:

```nginx
# Script execution endpoints
location ~ ^/webhook/(run-script|stop-script|script-status)$ {
    proxy_pass http://webhook_service;
    proxy_http_version 1.1;
    
    # Headers for button POST requests
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Content-Type $http_content_type;
    
    # Allow larger payloads for script operations
    client_max_body_size 10M;
    
    # Longer timeout for script execution
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
    
    # Ensure POST body is passed correctly
    proxy_request_buffering off;
}
```

### 4. CORS and Security Headers

Based on the Node.js configuration, these headers should be preserved:

```nginx
# Security headers (matching Node.js Helmet configuration)
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;

# CORS headers for API access
location /webhook/api/ {
    # CORS preflight handling
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    # Add CORS headers to responses
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    
    proxy_pass http://webhook_service/api/;
    # ... other proxy settings
}
```

### 5. Static File Optimization

For serving the web interface efficiently:

```nginx
# Static files location
location /webhook/static/ {
    alias /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/public/;
    expires 1h;
    add_header Cache-Control "public";
    
    # Gzip compression for static assets
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    gzip_vary on;
}

# Serve the main interface
location = /webhook/ {
    proxy_pass http://webhook_service/;
    proxy_set_header Host $host;
    
    # Cache the main page briefly
    proxy_cache_valid 200 5m;
}
```

## Potential Issues and Considerations

### 1. WebSocket Connection Issues
- **Problem**: Socket.IO connections may fail if upgrade headers are missing
- **Solution**: Ensure `proxy_set_header Upgrade` and `Connection "upgrade"` are properly set
- **Testing**: Monitor WebSocket upgrade responses (101 status codes)

### 2. POST Request Body Issues
- **Problem**: Button clicks sending POST data may fail with proxy buffering
- **Solution**: Use `proxy_request_buffering off` for interactive endpoints
- **Testing**: Verify POST body is correctly forwarded to Node.js

### 3. Path Rewriting Complexity
- **Problem**: Application expects to run at root path but nginx serves at `/webhook/`
- **Solution**: May need to configure Node.js with a base path:
  ```javascript
  app.use('/webhook', routes);
  io.path('/webhook/socket.io');
  ```

### 4. Service Discovery for Iframe
- **Problem**: Kismet iframe points to `http://localhost:2501`
- **Solution**: May need to proxy Kismet through nginx as well:
  ```nginx
  location /kismet/ {
      proxy_pass http://localhost:2501/;
      # Iframe-specific headers
      proxy_hide_header X-Frame-Options;
  }
  ```

### 5. Session and State Management
- **Problem**: Socket.IO uses sessions for real-time updates
- **Solution**: Enable sticky sessions if scaling to multiple Node.js instances:
  ```nginx
  upstream webhook_service {
      ip_hash;  # Sticky sessions
      server localhost:8002;
      server localhost:8003;
  }
  ```

## Recommended Production Configuration

### Complete Nginx Configuration for Webhook Service

```nginx
# /etc/nginx/sites-available/stinkster-webhook
upstream webhook_service {
    server localhost:8002;
    keepalive 64;
}

upstream kismet_service {
    server localhost:2501;
    keepalive 32;
}

server {
    listen 80;
    server_name stinkster.local;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name stinkster.local;
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/stinkster.crt;
    ssl_certificate_key /etc/ssl/private/stinkster.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Rate limiting for webhook endpoints
    limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=10r/s;
    
    # Main webhook interface
    location /webhook/ {
        limit_req zone=webhook_limit burst=20 nodelay;
        
        proxy_pass http://webhook_service/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for main location
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
    
    # WebSocket specific location
    location /webhook/socket.io/ {
        proxy_pass http://webhook_service/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Disable buffering for WebSocket
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Long timeouts for persistent connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # Script control endpoints
    location ~ ^/webhook/(run-script|stop-script|script-status)$ {
        limit_req zone=webhook_limit burst=5 nodelay;
        
        proxy_pass http://webhook_service;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeout for script operations
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        
        # Disable request buffering for real-time response
        proxy_request_buffering off;
        
        # Allow larger payloads
        client_max_body_size 10M;
    }
    
    # Kismet iframe proxy (remove frame restrictions)
    location /kismet/ {
        proxy_pass http://kismet_service/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Allow iframe embedding
        proxy_hide_header X-Frame-Options;
        add_header X-Frame-Options "SAMEORIGIN" always;
    }
    
    # Static assets with caching
    location /webhook/static/ {
        alias /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/public/;
        expires 1h;
        add_header Cache-Control "public";
        gzip on;
        gzip_types text/css application/javascript;
    }
}

# WebSocket connection upgrade map
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```

## Node.js Application Adjustments

To work properly behind nginx with path prefix, the Node.js application may need:

```javascript
// Trust proxy headers
app.set('trust proxy', 'loopback');

// Configure Socket.IO path
const io = socketIo(server, {
    path: '/webhook/socket.io/',
    cors: {
        origin: true,
        methods: ["GET", "POST"]
    }
});

// Adjust static file serving
app.use('/webhook/static', express.static(path.join(__dirname, 'public')));

// Update base path for routes
const router = express.Router();
// ... define routes
app.use('/webhook', router);
```

## Testing and Validation

### 1. WebSocket Connection Test
```bash
# Test WebSocket upgrade
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
     https://stinkster.local/webhook/socket.io/
```

### 2. Button Functionality Test
```bash
# Test script execution endpoint
curl -X POST https://stinkster.local/webhook/run-script \
     -H "Content-Type: application/json" \
     -d '{"script": "gps_kismet_wigle"}'
```

### 3. Static File Test
```bash
# Verify static file serving
curl -I https://stinkster.local/webhook/static/css/style.css
```

### 4. CORS Test
```bash
# Test CORS headers
curl -I -X OPTIONS https://stinkster.local/webhook/api/status \
     -H "Origin: http://example.com" \
     -H "Access-Control-Request-Method: GET"
```

## Summary

The webhook service on port 8002 requires careful nginx configuration to maintain full functionality:

1. **WebSocket support** is critical for Socket.IO real-time updates
2. **Proper header forwarding** ensures the Node.js app receives correct client information
3. **Request buffering** must be disabled for interactive endpoints
4. **Path rewriting** may require application adjustments
5. **Security headers** should be consistent with the Node.js Helmet configuration
6. **Rate limiting** protects script execution endpoints from abuse

The recommended configuration provides a production-ready setup that preserves all webhook functionality while adding nginx benefits like SSL termination, caching, and enhanced security.
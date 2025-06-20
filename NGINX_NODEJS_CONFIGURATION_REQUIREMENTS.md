# Nginx Configuration Requirements for Node.js Webhook Services

## Executive Summary

This document outlines the nginx configuration requirements for the Stinkster Node.js webhook services. Based on the analysis of the current architecture, the system operates without nginx in the current deployment, but production deployment would benefit from nginx as a reverse proxy for enhanced security, performance, and scalability.

## Current Architecture

### Node.js Services (Direct Exposure)
- **Spectrum Analyzer**: Port 8092 (Express + Socket.IO)
- **WigleToTAK**: Port 8000 (Express)
- **GPS Bridge**: Port 2947 (TCP/GPSD Protocol)
- **Kismet Operations Center**: Embedded in Spectrum Analyzer

### Current Security Implementation
- Helmet.js for security headers
- CORS configuration
- Input validation with Joi
- No SSL/TLS termination
- No rate limiting at proxy level

## Recommended Nginx Configuration

### 1. Basic Reverse Proxy Configuration

```nginx
# /etc/nginx/sites-available/stinkster
upstream spectrum_analyzer {
    server localhost:8092;
    keepalive 64;
}

upstream wigle_to_tak {
    server localhost:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name stinkster.local;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name stinkster.local;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/stinkster.crt;
    ssl_certificate_key /etc/ssl/private/stinkster.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Spectrum Analyzer
    location /spectrum/ {
        proxy_pass http://spectrum_analyzer/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # WigleToTAK
    location /wigle/ {
        proxy_pass http://wigle_to_tak/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. WebSocket Configuration

```nginx
# WebSocket support for Socket.IO
location /socket.io/ {
    proxy_pass http://spectrum_analyzer/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Socket.IO specific settings
    proxy_buffering off;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    keepalive_timeout 86400s;
    
    # Handle Socket.IO polling fallback
    proxy_set_header X-NginX-Proxy true;
    proxy_redirect off;
}
```

### 3. Rate Limiting Configuration

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=websocket_limit:10m rate=5r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# API rate limiting
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_conn conn_limit 10;
    
    proxy_pass http://spectrum_analyzer/api/;
    # ... other proxy settings
}

# WebSocket rate limiting
location /socket.io/ {
    limit_req zone=websocket_limit burst=10 nodelay;
    limit_conn conn_limit 5;
    
    # ... WebSocket proxy settings
}
```

### 4. Load Balancing (Multiple Instances)

```nginx
# Load balancing configuration
upstream spectrum_analyzer_cluster {
    least_conn;
    server localhost:8092 weight=3;
    server localhost:8093 weight=2;
    server localhost:8094 weight=1;
    keepalive 64;
}

# Health check endpoint
location /health {
    access_log off;
    proxy_pass http://spectrum_analyzer_cluster/health;
    proxy_connect_timeout 1s;
    proxy_read_timeout 1s;
}
```

### 5. Static File Serving

```nginx
# Serve static files directly from nginx
location /static/ {
    alias /home/pi/projects/stinkster/src/nodejs/public/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    
    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    gzip_vary on;
}

# Serve web interface files
location / {
    root /home/pi/projects/stinkster/src/nodejs/kismet-operations/views;
    try_files $uri $uri/ /hi.html;
}
```

### 6. Security Enhancements

```nginx
# Additional security configurations
server {
    # ... previous settings
    
    # Request size limits
    client_max_body_size 10M;
    client_body_buffer_size 128k;
    
    # Timeout settings
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;
    
    # Hide nginx version
    server_tokens off;
    
    # Prevent clickjacking
    add_header X-Frame-Options "DENY" always;
    
    # Enable HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 7. Logging Configuration

```nginx
# Custom log format for monitoring
log_format stinkster '$remote_addr - $remote_user [$time_local] '
                     '"$request" $status $body_bytes_sent '
                     '"$http_referer" "$http_user_agent" '
                     'rt=$request_time uct="$upstream_connect_time" '
                     'uht="$upstream_header_time" urt="$upstream_response_time"';

# Access logs with rotation
access_log /var/log/nginx/stinkster_access.log stinkster;
error_log /var/log/nginx/stinkster_error.log warn;

# Conditional logging
map $request_uri $loggable {
    ~^/health 0;
    ~^/metrics 0;
    default 1;
}

access_log /var/log/nginx/stinkster_access.log stinkster if=$loggable;
```

### 8. Caching Configuration

```nginx
# Cache configuration
proxy_cache_path /var/cache/nginx/stinkster levels=1:2 keys_zone=stinkster_cache:10m max_size=100m inactive=60m;

# Cache static API responses
location /api/config {
    proxy_cache stinkster_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    
    proxy_pass http://spectrum_analyzer/api/config;
    # ... other proxy settings
}
```

## Integration with Node.js Services

### 1. Required Node.js Configuration Changes

```javascript
// Trust proxy headers in Express
app.set('trust proxy', 'loopback');

// Update CORS for proxy
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://stinkster.local'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

// Socket.IO configuration for proxy
const io = new Server(server, {
    cors: corsOptions,
    path: '/spectrum/socket.io/',
    transports: ['websocket', 'polling']
});
```

### 2. Environment Variables

```bash
# .env configuration for nginx proxy
NODE_ENV=production
TRUST_PROXY=true
BASE_PATH=/spectrum
WEBSOCKET_PATH=/spectrum/socket.io
ALLOWED_ORIGINS=https://stinkster.local
```

## Deployment Checklist

### Pre-deployment
- [ ] Generate SSL certificates
- [ ] Test nginx configuration: `nginx -t`
- [ ] Backup current configuration
- [ ] Update Node.js services for proxy support
- [ ] Configure firewall rules

### Deployment Steps
1. Install nginx: `sudo apt-get install nginx`
2. Create SSL certificates
3. Copy configuration to `/etc/nginx/sites-available/stinkster`
4. Enable site: `sudo ln -s /etc/nginx/sites-available/stinkster /etc/nginx/sites-enabled/`
5. Remove default site: `sudo rm /etc/nginx/sites-enabled/default`
6. Reload nginx: `sudo nginx -s reload`
7. Update DNS/hosts file
8. Test all endpoints

### Post-deployment
- [ ] Verify SSL/TLS configuration
- [ ] Test WebSocket connections
- [ ] Monitor nginx error logs
- [ ] Check rate limiting effectiveness
- [ ] Validate security headers

## Monitoring and Maintenance

### Key Metrics to Monitor
- Request rate and response times
- WebSocket connection count
- Error rates (4xx, 5xx)
- Cache hit ratio
- SSL certificate expiration

### Log Analysis
```bash
# Top IPs by request count
awk '{print $1}' /var/log/nginx/stinkster_access.log | sort | uniq -c | sort -rn | head -20

# Response time analysis
awk '{print $NF}' /var/log/nginx/stinkster_access.log | sort -n | awk '{s+=$1; n++} END {print "Average:", s/n}'

# Error analysis
grep -E "(error|alert|crit)" /var/log/nginx/stinkster_error.log | tail -50
```

## Security Considerations

### Best Practices
1. Regular SSL certificate renewal
2. Keep nginx updated
3. Monitor for suspicious patterns
4. Implement fail2ban for brute force protection
5. Regular security audits

### Hardening Recommendations
- Disable unnecessary nginx modules
- Implement ModSecurity WAF
- Use GeoIP blocking if needed
- Configure DDoS protection
- Enable request logging for forensics

## Performance Optimization

### Recommended Tuning
```nginx
# Worker processes
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;
}
```

## Conclusion

While the current Node.js services operate without nginx, implementing nginx as a reverse proxy provides:
- SSL/TLS termination
- Rate limiting and DDoS protection
- Load balancing capabilities
- Static file serving optimization
- Enhanced security headers
- Request/response caching
- Centralized logging and monitoring

The configuration templates provided ensure compatibility with the existing Node.js webhook services while adding production-grade features for security, performance, and scalability.
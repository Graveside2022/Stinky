# CORS and Security Configuration Analysis - Kismet Operations Center

## Executive Summary

This analysis identifies critical CORS and security configuration issues in the Kismet Operations Center Node.js application. The application has several security vulnerabilities that need immediate attention, particularly around CORS configuration, iframe integration, and authentication headers.

## 1. Current CORS Configuration Issues

### 1.1 Overly Permissive CORS in Development Mode
**File:** `/src/nodejs/kismet-operations/lib/corsConfig.js`

**Issue:** In development mode, the CORS configuration allows ANY origin:
```javascript
if (process.env.NODE_ENV === 'development') {
    logger.warn('CORS request from unlisted origin:', origin);
    callback(null, true);  // ALLOWS ANY ORIGIN IN DEV!
}
```

**Risk:** HIGH - This allows any website to make requests to the API in development mode.

**Recommendation:**
```javascript
if (process.env.NODE_ENV === 'development') {
    logger.warn('CORS request from unlisted origin:', origin);
    // Still check against a development whitelist
    const devOrigins = ['http://localhost:3000', 'http://localhost:8080'];
    if (devOrigins.includes(origin)) {
        callback(null, true);
    } else {
        callback(new Error('Not allowed by CORS'));
    }
}
```

### 1.2 Duplicate CORS Headers in Proxy Responses
**File:** `/src/nodejs/kismet-operations/server.js` (lines 457-460, 497)

**Issue:** CORS headers are being set both by the cors middleware AND manually in proxy responses:
```javascript
onProxyRes: (proxyRes, req, res) => {
    // These duplicate the cors middleware headers
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
}
```

**Risk:** MEDIUM - Can cause header conflicts and override more restrictive CORS policies.

**Recommendation:** Remove manual CORS headers from proxy responses and rely on the cors middleware.

## 2. Kismet Iframe Integration Security Issues

### 2.1 Missing X-Frame-Options Header
**File:** `/src/nodejs/kismet-operations/server.js`

**Issue:** The application disables most helmet security features, including frame options:
```javascript
app.use(helmet({
    contentSecurityPolicy: false, // Disabled!
    crossOriginOpenerPolicy: false, // Disabled!
    crossOriginResourcePolicy: false, // Disabled!
}));
```

**Risk:** HIGH - The Kismet iframe can be embedded in any website, enabling clickjacking attacks.

**Recommendation:**
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            frameSrc: ["'self'", "http://localhost:2501"], // Allow Kismet iframe
            scriptSrc: ["'self'", "'unsafe-inline'"], // For inline scripts
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "ws://localhost:*", "http://localhost:*"]
        }
    },
    crossOriginEmbedderPolicy: false, // Allow embedding Kismet
}));
```

### 2.2 No Authentication for Kismet Iframe
**File:** `/src/nodejs/kismet-operations/views/hi.html` (line 1224)

**Issue:** The Kismet iframe URL is constructed without any authentication:
```javascript
const kismetUrl = 'http://' + window.location.hostname + ':2501';
iframe.src = kismetUrl;
```

**Risk:** MEDIUM - Anyone can access Kismet if they know the port.

**Recommendation:** Implement iframe authentication:
```javascript
// Add authentication token to iframe URL
const authToken = await getAuthToken();
const kismetUrl = `http://${window.location.hostname}:2501?auth=${authToken}`;
```

## 3. WebSocket Security Configuration

### 3.1 WebSocket CORS Configuration
**File:** `/src/nodejs/kismet-operations/server.js` (lines 60-75)

**Issue:** WebSocket CORS allows credentials but has permissive origin checking:
```javascript
cors: {
    origin: function (origin, callback) {
        if (!origin || corsOptions.origin === '*') {
            return callback(null, true);
        }
        corsOptions.origin(origin, callback);
    },
    credentials: true  // Allows cookies/auth headers
}
```

**Risk:** MEDIUM - Credentials are allowed from any origin when origin is not provided.

**Recommendation:**
```javascript
cors: {
    origin: function (origin, callback) {
        // Always validate origin, even if not provided
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || allowedOrigins;
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('WebSocket origin not allowed'));
        }
    },
    credentials: true
}
```

## 4. Authentication and Authorization Issues

### 4.1 Hardcoded Credentials
**File:** `/src/nodejs/kismet-operations/server.js` (line 442)

**Issue:** Kismet proxy uses hardcoded credentials:
```javascript
auth: 'admin:admin', // Hardcoded credentials!
```

**Risk:** CRITICAL - Default credentials are a major security vulnerability.

**Recommendation:**
```javascript
auth: `${process.env.KISMET_USER}:${process.env.KISMET_PASS}`,
```

### 4.2 No Authentication on API Endpoints
**Files:** Various endpoints in `server.js`

**Issue:** Most API endpoints have no authentication:
- `/api/config` - Can change system configuration
- `/api/start-script` - Can execute system scripts
- `/api/stop-script` - Can stop services

**Risk:** CRITICAL - Anyone can control the system.

**Recommendation:** Implement authentication middleware:
```javascript
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !validateToken(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

app.post('/api/start-script', authMiddleware, async (req, res) => {
    // ... existing code
});
```

## 5. Mixed Content Issues

### 5.1 HTTP Resources in Production
**File:** `/src/nodejs/kismet-operations/views/hi.html`

**Issue:** All resources use HTTP:
```javascript
const kismetUrl = 'http://' + window.location.hostname + ':2501';
window.open('http://' + window.location.hostname + ':2501', '_blank');
```

**Risk:** MEDIUM - Prevents HTTPS deployment, enables MITM attacks.

**Recommendation:** Use protocol-relative URLs:
```javascript
const protocol = window.location.protocol;
const kismetUrl = `${protocol}//${window.location.hostname}:2501`;
```

## 6. Missing Security Headers

### 6.1 No Rate Limiting
**Issue:** No rate limiting on critical endpoints like `/api/start-script`.

**Risk:** HIGH - Enables DoS attacks.

**Recommendation:**
```javascript
const rateLimit = require('express-rate-limit');

const scriptLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many script execution attempts'
});

app.post('/api/start-script', scriptLimiter, async (req, res) => {
    // ... existing code
});
```

## 7. Nginx Proxy Configuration

### 7.1 Missing CORS Headers in Nginx
**File:** Example nginx configuration

**Issue:** Nginx configuration doesn't include CORS headers.

**Recommendation:** Add CORS headers to nginx:
```nginx
location /webhook/ {
    # CORS headers
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    
    # Handle preflight
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    proxy_pass http://webhook_backend/webhook/;
    # ... rest of config
}
```

## Priority Fixes (In Order)

1. **CRITICAL - Add Authentication**
   - Implement JWT or session-based auth
   - Protect all API endpoints
   - Remove hardcoded credentials

2. **HIGH - Fix CORS Configuration**
   - Remove permissive development CORS
   - Fix duplicate CORS headers
   - Properly configure WebSocket CORS

3. **HIGH - Enable Security Headers**
   - Configure CSP properly
   - Add X-Frame-Options
   - Enable other helmet protections

4. **MEDIUM - Secure Iframe Integration**
   - Add authentication to Kismet iframe
   - Implement frame-ancestors CSP
   - Use HTTPS for all resources

5. **MEDIUM - Add Rate Limiting**
   - Protect script execution endpoints
   - Limit API request rates
   - Implement WebSocket connection limits

## Code Snippets for Immediate Implementation

### 1. Secure CORS Configuration
```javascript
// corsConfig.js
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:8002',
            'http://localhost:2501',
            'http://localhost:8000'
        ];
        
        if (!origin) {
            // Allow requests with no origin (like mobile apps)
            return callback(null, true);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 86400
};
```

### 2. Authentication Middleware
```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Apply to routes
app.use('/api/config', authMiddleware);
app.use('/api/start-script', authMiddleware);
app.use('/api/stop-script', authMiddleware);
```

### 3. Secure Helmet Configuration
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*", "http://localhost:*"],
            frameSrc: ["'self'", "http://localhost:2501"],
            frameAncestors: ["'self'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

## Testing Recommendations

1. **CORS Testing**
   ```bash
   # Test CORS preflight
   curl -X OPTIONS http://localhost:8002/api/config \
     -H "Origin: http://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type"
   ```

2. **Authentication Testing**
   ```bash
   # Test without auth (should fail)
   curl -X POST http://localhost:8002/api/start-script
   
   # Test with auth
   curl -X POST http://localhost:8002/api/start-script \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Security Headers Testing**
   ```bash
   # Check security headers
   curl -I http://localhost:8002
   ```

## Conclusion

The Kismet Operations Center has significant security vulnerabilities that need immediate attention. The most critical issues are:

1. No authentication on system control endpoints
2. Overly permissive CORS configuration
3. Disabled security headers
4. Hardcoded credentials

Implementing the recommended fixes will significantly improve the security posture of the application. Start with authentication implementation as it poses the highest risk.
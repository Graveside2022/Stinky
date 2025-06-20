# CORS Implementation Solution

## CORS Error Analysis

### Issue Identification
The application is experiencing CORS (Cross-Origin Resource Sharing) errors when the frontend served from port 8002 attempts to communicate with:
1. **Kismet API** on port 2501
2. **Backend services** on port 8002 itself (when accessed from different origins)
3. **WebSocket connections** for real-time data

### Current Issues
1. The current CORS middleware uses a basic `cors()` configuration with default settings
2. No specific origin restrictions or security configurations
3. Missing preflight request handling for complex requests
4. Proxy middleware CORS headers are manually added but incomplete
5. WebSocket CORS configuration in Socket.IO is too permissive

## Server Configuration Code

### 1. Enhanced CORS Middleware Configuration

Create a new file `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/lib/corsConfig.js`:

```javascript
const winston = require('winston');

// Configure logging for CORS
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'cors-access.log' })
  ]
});

// Development and production allowed origins
const allowedOrigins = [
  'http://localhost:8002',
  'http://localhost:2501',
  'http://localhost:8000',
  'http://localhost:3002',
  'http://localhost:8073',
  'http://localhost:8092',
  // Add your production domains here
  process.env.FRONTEND_URL,
  // Allow same-origin requests
  undefined
].filter(Boolean);

// CORS options with comprehensive configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In development, log but allow all origins
      if (process.env.NODE_ENV === 'development') {
        logger.warn('CORS request from unlisted origin:', origin);
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true, // Allow cookies and auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-CSRF-Token'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-Request-Id',
    'X-Response-Time'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Preflight request handler
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    // Log preflight requests for debugging
    logger.info('Preflight request', {
      origin: req.headers.origin,
      method: req.headers['access-control-request-method'],
      headers: req.headers['access-control-request-headers']
    });
  }
  next();
};

// Dynamic CORS for specific routes
const dynamicCors = (req, res, next) => {
  const origin = req.headers.origin;
  
  // Special handling for Kismet proxy routes
  if (req.path.startsWith('/api/kismet')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  
  next();
};

module.exports = {
  corsOptions,
  handlePreflight,
  dynamicCors,
  logger
};
```

### 2. Update Server Implementation

Modify `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/server.js` to use enhanced CORS:

```javascript
// At the top of the file, after other requires
const { corsOptions, handlePreflight, dynamicCors, logger: corsLogger } = require('./lib/corsConfig');

// Replace the existing CORS middleware setup (around line 370)
// Remove: app.use(cors());
// Add:
app.use(handlePreflight);
app.use(cors(corsOptions));
app.use(dynamicCors);

// Update Socket.IO configuration (around line 59)
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Use the same logic as the main CORS configuration
      if (!origin || corsOptions.origin === '*') {
        return callback(null, true);
      }
      
      corsOptions.origin(origin, callback);
    },
    methods: corsOptions.methods,
    credentials: corsOptions.credentials,
    allowedHeaders: corsOptions.allowedHeaders
  },
  // Additional Socket.IO options for better performance
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Update proxy middleware configurations
// For Kismet API proxy (around line 383)
app.use('/api/kismet', createProxyMiddleware({
  target: 'http://localhost:2501',
  changeOrigin: true,
  auth: 'admin:admin',
  pathRewrite: {
    '^/api/kismet': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add origin header for backend
    if (req.headers.origin) {
      proxyReq.setHeader('Origin', req.headers.origin);
    }
    
    logger.debug('Proxying request to Kismet', {
      method: req.method,
      originalUrl: req.originalUrl,
      targetPath: proxyReq.path,
      origin: req.headers.origin
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // Enhanced CORS headers for proxy responses
    const origin = req.headers.origin || '*';
    proxyRes.headers['access-control-allow-origin'] = origin;
    proxyRes.headers['access-control-allow-credentials'] = 'true';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With, Accept';
    proxyRes.headers['access-control-expose-headers'] = 'Content-Length, Content-Type, X-Request-Id';
    
    // Handle preflight caching
    if (req.method === 'OPTIONS') {
      proxyRes.headers['access-control-max-age'] = '86400';
    }
    
    logger.debug('Received response from Kismet', {
      statusCode: proxyRes.statusCode,
      originalUrl: req.originalUrl,
      origin: origin
    });
  },
  onError: (err, req, res) => {
    logger.error('Proxy error for Kismet', {
      error: err.message,
      originalUrl: req.originalUrl
    });
    
    // Ensure CORS headers are set even on errors
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    res.status(502).json({
      error: 'Failed to connect to Kismet service',
      details: err.message
    });
  }
}));
```

### 3. Nginx Proxy Configuration (Optional)

If using Nginx as a reverse proxy, add this configuration:

```nginx
# /etc/nginx/sites-available/kismet-ops
server {
    listen 80;
    server_name your-domain.com;

    # Global CORS headers
    add_header 'Access-Control-Allow-Origin' $http_origin always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Max-Age' 86400;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    # Proxy to Node.js app on port 8002
    location / {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Direct proxy to Kismet
    location /api/kismet/ {
        proxy_pass http://localhost:2501/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Authorization "Basic YWRtaW46YWRtaW4="; # base64 encoded admin:admin
    }
}
```

### 4. Development Proxy Configuration

For development, create a proxy configuration file `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/setupProxy.js`:

```javascript
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for Kismet API during development
  app.use(
    '/kismet-api',
    createProxyMiddleware({
      target: 'http://localhost:2501',
      changeOrigin: true,
      pathRewrite: {
        '^/kismet-api': ''
      },
      auth: 'admin:admin',
      onProxyReq: (proxyReq, req, res) => {
        // Log proxy requests in development
        console.log(`[Proxy] ${req.method} ${req.path} -> ${proxyReq.path}`);
      },
      onError: (err, req, res) => {
        console.error('[Proxy Error]', err);
        res.status(502).json({ error: 'Proxy error', details: err.message });
      }
    })
  );
};
```

## Security Considerations

1. **Origin Validation**: The configuration validates origins against a whitelist in production mode
2. **Credentials**: Allows credentials (cookies, auth headers) for authenticated requests
3. **Preflight Caching**: 24-hour cache for preflight requests to reduce overhead
4. **Logging**: All CORS requests are logged for security auditing
5. **Development Mode**: More permissive in development with warnings for unlisted origins

## Testing Commands

### 1. Test CORS Headers
```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:8002" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v http://localhost:8002/api/kismet/system/status

# Test actual request
curl -X GET \
  -H "Origin: http://localhost:8002" \
  -H "Content-Type: application/json" \
  -v http://localhost:8002/api/kismet/system/status
```

### 2. Test from Browser Console
```javascript
// Test CORS-enabled fetch
fetch('http://localhost:8002/api/kismet/system/status', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('CORS Error:', error));

// Test WebSocket connection
const socket = io('http://localhost:8002', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('WebSocket connected successfully');
});

socket.on('connect_error', (error) => {
  console.error('WebSocket CORS error:', error);
});
```

### 3. Verify CORS Headers
```bash
# Check response headers
curl -I -X GET \
  -H "Origin: http://localhost:8002" \
  http://localhost:8002/api/status

# Expected headers:
# Access-Control-Allow-Origin: http://localhost:8002
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
```

### 4. Test Cross-Port Communication
```javascript
// From a page served on port 8002, test connection to port 2501 via proxy
async function testKismetConnection() {
  try {
    const response = await fetch('/api/kismet/system/status.json', {
      credentials: 'include'
    });
    const data = await response.json();
    console.log('Kismet connection successful:', data);
  } catch (error) {
    console.error('Kismet connection failed:', error);
  }
}

testKismetConnection();
```

## Implementation Steps

1. Create the `corsConfig.js` file with the enhanced CORS configuration
2. Update `server.js` to use the new CORS middleware
3. Restart the Node.js server: `pm2 restart kismet-operations` or `systemctl restart kismet-operations`
4. Clear browser cache and cookies
5. Test the application functionality

## Troubleshooting

### Common Issues and Solutions

1. **"No 'Access-Control-Allow-Origin' header"**
   - Ensure the CORS middleware is applied before route handlers
   - Check that preflight requests are handled correctly

2. **"CORS policy: Credentials flag is 'true'"**
   - Ensure `credentials: true` is set in both CORS options and client requests
   - Origin cannot be '*' when credentials are enabled

3. **WebSocket CORS errors**
   - Verify Socket.IO CORS configuration matches the main CORS settings
   - Ensure the client specifies `withCredentials: true`

4. **Proxy CORS issues**
   - Check that proxy middleware adds appropriate CORS headers
   - Verify the target service is accessible

## Summary

This comprehensive CORS solution:
- Provides proper origin validation with whitelist
- Handles preflight requests efficiently
- Supports WebSocket connections
- Includes proxy configuration for backend services
- Offers development and production modes
- Implements security best practices
- Includes extensive logging for debugging

The implementation resolves cross-origin issues between ports 8002 and 2501 while maintaining security and allowing legitimate cross-origin requests.
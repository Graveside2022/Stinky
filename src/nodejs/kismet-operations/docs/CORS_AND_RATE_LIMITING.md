# CORS and Rate Limiting Configuration

## Table of Contents
1. [CORS Configuration](#cors-configuration)
2. [Rate Limiting Configuration](#rate-limiting-configuration)
3. [Implementation Examples](#implementation-examples)
4. [Security Best Practices](#security-best-practices)
5. [Monitoring and Alerts](#monitoring-and-alerts)

---

## CORS Configuration

### Current Development Configuration

The service currently uses a permissive CORS configuration suitable for development:

```javascript
// Current development settings in server.js
app.use(cors()); // Allows all origins

// Socket.IO CORS configuration
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
```

### Recommended Production Configuration

#### Express CORS Configuration
```javascript
const cors = require('cors');

// Define allowed origins
const allowedOrigins = [
  'https://spectrum.yourdomain.com',
  'https://app.yourdomain.com',
  'https://admin.yourdomain.com'
];

// CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

#### Socket.IO CORS Configuration
```javascript
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
    credentials: true
  }
});
```

### Environment-Based Configuration

```javascript
// config/cors.js
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const corsConfig = {
  development: {
    origin: true, // Allow all origins in development
    credentials: true
  },
  production: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://spectrum.yourdomain.com'],
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400
  }
};

module.exports = corsConfig[process.env.NODE_ENV] || corsConfig.production;
```

### Dynamic CORS Configuration

```javascript
// For cases where origins need to be validated dynamically
const dynamicCorsOptions = {
  origin: async (origin, callback) => {
    try {
      // Check origin against database or external service
      const isAllowed = await checkOriginInDatabase(origin);
      callback(null, isAllowed);
    } catch (error) {
      callback(error);
    }
  },
  credentials: true
};
```

---

## Rate Limiting Configuration

### Basic Rate Limiting with express-rate-limit

```javascript
const rateLimit = require('express-rate-limit');

// Create different limiters for different endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Apply to all API routes
app.use('/api/', apiLimiter);

// Stricter limits for specific endpoints
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Only 10 scans per minute
  skipSuccessfulRequests: false
});

app.use('/api/scan/:profileId', scanLimiter);
```

### Advanced Rate Limiting with Redis

```javascript
const redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

// Create Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  enable_offline_queue: false
});

// Configure rate limiters
const rateLimiterAPI = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:api',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 1 minute
});

const rateLimiterWebSocket = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:ws',
  points: 10, // Number of connections
  duration: 60, // Per 60 seconds
  blockDuration: 300, // Block for 5 minutes
});

// Middleware function
const rateLimitMiddleware = (limiter) => async (req, res, next) => {
  try {
    await limiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.set({
      'X-RateLimit-Limit': limiter.points,
      'X-RateLimit-Remaining': rejRes.remainingPoints || 0,
      'X-RateLimit-Reset': rejRes.msBeforeNext ? new Date(Date.now() + rejRes.msBeforeNext).toISOString() : undefined,
      'Retry-After': rejRes.msBeforeNext ? Math.round(rejRes.msBeforeNext / 1000) : 60
    });
    
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      limit: limiter.points,
      remaining: rejRes.remainingPoints || 0,
      retryAfter: rejRes.msBeforeNext || 60000
    });
  }
};

// Apply to routes
app.use('/api/', rateLimitMiddleware(rateLimiterAPI));
```

### WebSocket Rate Limiting

```javascript
// Socket.IO rate limiting
const socketRateLimiter = new Map();

io.use(async (socket, next) => {
  const clientIP = socket.handshake.address;
  
  try {
    await rateLimiterWebSocket.consume(clientIP);
    next();
  } catch (rejRes) {
    next(new Error('Too many connections'));
  }
});

// Rate limit individual socket events
socket.use(async ([event, ...args], next) => {
  const key = `${socket.id}:${event}`;
  const now = Date.now();
  const lastRequest = socketRateLimiter.get(key) || 0;
  
  // Different limits for different events
  const limits = {
    'requestStatus': 1000,      // Once per second
    'requestSignals': 500,      // Twice per second
    'requestLatestFFT': 100     // 10 times per second
  };
  
  const limit = limits[event] || 1000;
  
  if (now - lastRequest < limit) {
    socket.emit('error', {
      code: 'RATE_LIMIT',
      message: `Event ${event} rate limited`,
      retryAfter: limit - (now - lastRequest)
    });
    return;
  }
  
  socketRateLimiter.set(key, now);
  next();
});

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of socketRateLimiter) {
    if (now - timestamp > 60000) { // Remove entries older than 1 minute
      socketRateLimiter.delete(key);
    }
  }
}, 60000);
```

### User-Based Rate Limiting

```javascript
// Rate limit by authenticated user instead of IP
const userRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:user',
  points: 1000, // More generous limit for authenticated users
  duration: 3600, // Per hour
});

const authenticatedRateLimitMiddleware = async (req, res, next) => {
  if (!req.user) {
    return next(); // Fall back to IP-based limiting
  }
  
  try {
    await userRateLimiter.consume(req.user.id);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'USER_RATE_LIMIT_EXCEEDED',
      message: 'User rate limit exceeded',
      limit: userRateLimiter.points,
      remaining: rejRes.remainingPoints || 0,
      retryAfter: rejRes.msBeforeNext || 3600000
    });
  }
};
```

---

## Implementation Examples

### Complete Server Configuration

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://spectrum.yourdomain.com'] 
    : true,
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
};

app.use(cors(corsOptions));

// Rate limiting with Redis store
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  }),
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Specific endpoint limits
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skipFailedRequests: true
});

app.use('/api/scan/:profileId', strictLimiter);
app.use('/api/connect', strictLimiter);
```

### Client-Side CORS Handling

```javascript
// Handling CORS in the frontend
class SpectrumAnalyzerClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }
  
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        },
        credentials: 'include', // Include cookies for CORS requests
      });
      
      // Check rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');
      
      if (remaining !== null && parseInt(remaining) < 10) {
        console.warn(`Rate limit warning: ${remaining} requests remaining`);
      }
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.message.includes('CORS')) {
        console.error('CORS error: Check server configuration');
      }
      throw error;
    }
  }
}
```

### Environment Variables Configuration

```bash
# .env.example
NODE_ENV=production
PORT=8092

# CORS Settings
ALLOWED_ORIGINS=https://spectrum.yourdomain.com,https://app.yourdomain.com
CORS_MAX_AGE=86400

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
API_KEY_HEADER=X-API-Key
ENABLE_API_KEY_AUTH=true
```

---

## Security Best Practices

### 1. Whitelist Specific Origins

Never use wildcard (*) origins in production:

```javascript
// Bad
cors({ origin: '*' })

// Good
cors({ origin: ['https://app.example.com', 'https://admin.example.com'] })
```

### 2. Validate Origin Dynamically

```javascript
const isValidOrigin = (origin) => {
  // Check against allowed patterns
  const allowedPatterns = [
    /^https:\/\/.*\.yourdomain\.com$/,
    /^https:\/\/localhost:\d+$/
  ];
  
  return allowedPatterns.some(pattern => pattern.test(origin));
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || isValidOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
```

### 3. Implement Preflight Caching

```javascript
const corsOptions = {
  // ... other options
  maxAge: 86400, // Cache preflight response for 24 hours
  optionsSuccessStatus: 204 // Some legacy browsers choke on 204
};
```

### 4. Rate Limit by User Context

```javascript
const contextualRateLimiter = async (req, res, next) => {
  let key = req.ip; // Default to IP
  let limiter = rateLimiterAPI;
  
  if (req.user) {
    // Authenticated users get higher limits
    key = `user:${req.user.id}`;
    limiter = rateLimiterAuthenticated;
  } else if (req.headers['x-api-key']) {
    // API key users get specific limits
    key = `api:${req.headers['x-api-key']}`;
    limiter = rateLimiterAPIKey;
  }
  
  try {
    await limiter.consume(key);
    next();
  } catch (rejRes) {
    // Handle rate limit exceeded
  }
};
```

### 5. Implement Gradual Backoff

```javascript
const adaptiveRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:adaptive',
  points: 100,
  duration: 60,
  blockDuration: 0, // Don't auto-block
  execEvenly: true, // Spread requests evenly
});

// Track violations
const violations = new Map();

const adaptiveMiddleware = async (req, res, next) => {
  const key = req.ip;
  const violationCount = violations.get(key) || 0;
  
  // Reduce allowed points based on violations
  const points = Math.max(10, 100 - (violationCount * 20));
  
  try {
    await adaptiveRateLimiter.consume(key, 1);
    violations.delete(key); // Reset on successful request
    next();
  } catch (rejRes) {
    violations.set(key, violationCount + 1);
    
    // Exponential backoff
    const backoffMs = Math.min(300000, 1000 * Math.pow(2, violationCount));
    
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded with penalties',
      retryAfter: backoffMs
    });
  }
};
```

---

## Monitoring and Alerts

### 1. Rate Limit Metrics

```javascript
const prometheus = require('prom-client');

// Create metrics
const rateLimitCounter = new prometheus.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'type']
});

const rateLimitHistogram = new prometheus.Histogram({
  name: 'rate_limit_remaining_ratio',
  help: 'Ratio of remaining rate limit',
  buckets: [0.1, 0.25, 0.5, 0.75, 0.9, 1]
});

// Track metrics in middleware
const metricsMiddleware = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Track rate limit metrics
    const remaining = res.get('X-RateLimit-Remaining');
    const limit = res.get('X-RateLimit-Limit');
    
    if (remaining && limit) {
      rateLimitHistogram.observe(remaining / limit);
    }
    
    if (res.statusCode === 429) {
      rateLimitCounter.inc({
        endpoint: req.path,
        type: req.user ? 'authenticated' : 'anonymous'
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### 2. CORS Violation Logging

```javascript
const corsViolationLogger = (err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    logger.warn('CORS violation', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Send alert if violations exceed threshold
    trackCORSViolation(req.headers.origin);
    
    res.status(403).json({
      error: 'CORS_VIOLATION',
      message: 'Origin not allowed'
    });
  } else {
    next(err);
  }
};

app.use(corsViolationLogger);
```

### 3. Real-time Monitoring Dashboard

```javascript
// WebSocket endpoint for monitoring
io.of('/admin').use(requireAdminAuth).on('connection', (socket) => {
  // Send current metrics
  const metrics = {
    rateLimits: getRateLimitStats(),
    corsViolations: getCORSViolationStats(),
    activeConnections: io.engine.clientsCount
  };
  
  socket.emit('metrics', metrics);
  
  // Send updates every 5 seconds
  const interval = setInterval(() => {
    socket.emit('metrics', getUpdatedMetrics());
  }, 5000);
  
  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});
```

### 4. Alerting Rules

```javascript
const alertManager = {
  checkRateLimitHealth: async () => {
    const stats = await getRateLimitStats();
    
    // Alert if any IP hits 80% of limit
    for (const [ip, usage] of stats) {
      if (usage.ratio > 0.8) {
        await sendAlert({
          type: 'RATE_LIMIT_WARNING',
          message: `IP ${ip} at ${usage.ratio * 100}% of rate limit`,
          severity: 'warning'
        });
      }
    }
    
    // Alert if total 429 responses exceed threshold
    if (stats.total429s > 100) {
      await sendAlert({
        type: 'RATE_LIMIT_CRITICAL',
        message: `High rate limit violations: ${stats.total429s} in last hour`,
        severity: 'critical'
      });
    }
  },
  
  checkCORSHealth: async () => {
    const violations = await getCORSViolationStats();
    
    if (violations.uniqueOrigins > 10) {
      await sendAlert({
        type: 'CORS_SCAN_DETECTED',
        message: `Possible CORS scan: ${violations.uniqueOrigins} unique origins`,
        severity: 'warning'
      });
    }
  }
};

// Run health checks every minute
setInterval(async () => {
  await alertManager.checkRateLimitHealth();
  await alertManager.checkCORSHealth();
}, 60000);
```

---

## Testing Configuration

### 1. CORS Testing

```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:8092/api/status \
  -H "Origin: https://test.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Test actual request
curl -X GET http://localhost:8092/api/status \
  -H "Origin: https://test.example.com" \
  -v
```

### 2. Rate Limit Testing

```bash
# Test rate limiting with siege
siege -c 10 -r 20 http://localhost:8092/api/status

# Test with custom script
for i in {1..150}; do
  curl -X GET http://localhost:8092/api/status \
    -H "X-Forwarded-For: 192.168.1.$((i % 10))" \
    -w "Status: %{http_code}, Remaining: %header{x-ratelimit-remaining}\n" \
    -o /dev/null -s
done
```

### 3. Automated Tests

```javascript
const request = require('supertest');
const app = require('../server');

describe('CORS Configuration', () => {
  it('should allow requests from whitelisted origin', async () => {
    const response = await request(app)
      .get('/api/status')
      .set('Origin', 'https://spectrum.yourdomain.com')
      .expect(200);
    
    expect(response.headers['access-control-allow-origin'])
      .toBe('https://spectrum.yourdomain.com');
  });
  
  it('should reject requests from non-whitelisted origin', async () => {
    const response = await request(app)
      .get('/api/status')
      .set('Origin', 'https://evil.com')
      .expect(403);
  });
});

describe('Rate Limiting', () => {
  it('should rate limit after threshold', async () => {
    // Make requests up to limit
    for (let i = 0; i < 100; i++) {
      await request(app)
        .get('/api/status')
        .expect(200);
    }
    
    // Next request should be rate limited
    const response = await request(app)
      .get('/api/status')
      .expect(429);
    
    expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
  });
});
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-06-16  
**Applies To**: Spectrum Analyzer Service v2.0.0
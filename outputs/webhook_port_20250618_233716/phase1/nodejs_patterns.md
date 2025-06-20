# Node.js Framework Patterns Analysis - Stinkster Project

## Framework Usage

### Primary Framework: Express.js v4.18.2
The project uses **Express.js** as its core web framework for all Node.js services:
- RESTful API endpoints
- WebSocket integration via Socket.io
- Static file serving
- Middleware-based architecture

### Service Architecture Pattern
```javascript
// Service-oriented architecture with modular design
class StinksterApplication {
    constructor() {
        this.services = new Map();
        this.setupCommandLine();
        this.setupSignalHandlers();
    }
}
```

Key services:
1. **Spectrum Analyzer** (port 8092)
2. **WigleToTAK** (port 8000)
3. **GPS Bridge** (port 2947)
4. **Kismet Operations** (includes webhook on port 8002)

## Routing Patterns

### Express Router Pattern
```javascript
// Modular route definition with validation
const router = express.Router();

router.post('/run-script',
    [
        body('script').isIn(['kismet', 'gps', 'both']),
        body('options.interface').optional().isString()
    ],
    validateRequest,
    asyncHandler(async (req, res) => {
        // Route handler logic
    })
);
```

### Route Structure
- Base path mounting: `/api/webhook`
- RESTful conventions
- Input validation using express-validator
- Async error handling wrapper

## Middleware Usage

### Security Middleware Stack
```javascript
app.use(require('helmet')());         // Security headers
app.use(require('cors')());           // CORS handling
app.use(require('compression')());    // Response compression
app.use(express.json({ limit: '1mb' }));
```

### Custom Middleware Patterns

1. **Rate Limiting**
```javascript
createRateLimiter() {
    const requestCounts = new Map();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;
    
    return (req, res, next) => {
        // Rate limiting logic
    };
}
```

2. **Error Handling**
```javascript
function createErrorHandler(logger) {
    return (error, req, res, next) => {
        if (res.headersSent) {
            return next(error);
        }
        // Structured error response
    };
}
```

## Error Handling Patterns

### Custom Error Classes
```javascript
class StinksterError extends Error {
    constructor(message, code, statusCode, context) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}
```

Error hierarchy:
- ValidationError (400)
- ConnectionError (502)
- ServiceError (500)
- FileNotFoundError (404)

### Async Handler Pattern
```javascript
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
```

## Logging Mechanisms

### Winston Logger Integration
```javascript
const { createServiceLogger } = require('../shared/logger');
this.logger = createServiceLogger('spectrum-analyzer');

// Usage
this.logger.info('Service started', { port, environment });
this.logger.error('Failed to start', error);
```

## State Management

### Service-Level State
```javascript
class SpectrumAnalyzerService {
    constructor() {
        this.isRunning = false;
        this.connectedClients = new Map();
        this.fftBuffer = [];
        this.runningScripts = new Map();
    }
}
```

### Caching Strategy
```javascript
// In-memory cache with TTL
this.cache = new Map();

// Cache usage
const cacheKey = `status:${script || 'all'}`;
const cached = cache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < 5000) {
    return res.json(cached.data);
}
```

## WebSocket Integration

### Socket.io Pattern
```javascript
this.io = socketIo(this.server, {
    cors: {
        origin: this.config.websocket?.cors_origin || '*',
        methods: ['GET', 'POST']
    },
    pingInterval: 25000,
    pingTimeout: 5000
});

// Namespace usage
const webhookNamespace = this.io.of('/webhook');
```

### Event Broadcasting
```javascript
this.io.emit('script_output', {
    script: scriptName,
    type: 'stdout',
    data: data.toString(),
    timestamp: Date.now()
});
```

## Button/UI Interaction Patterns

### Frontend Button Handlers
```javascript
// Button click handlers in kismet-operations.js
async function startKismet() {
    showNotification('Starting Kismet services...', 'info');
    try {
        const response = await fetch('/run-script', {method: 'POST'});
        const data = await response.json();
        
        if(data.status === 'success') {
            showNotification('Kismet services started!', 'success');
            startStatusUpdates();
        }
    } catch (error) {
        showNotification('Failed to start', 'error');
    }
}

// Global function registration for onclick handlers
window.startKismet = startKismet;
window.stopKismet = stopKismet;
```

### API Endpoints for Button Actions
- `POST /run-script` - Start services
- `POST /stop-script` - Stop services
- `GET /script-status` - Check status
- `GET /kismet-data` - Get real-time data

## Port Configuration

### Dynamic Port Configuration
```javascript
// From app.js
.option('-p, --port <port>', 'Override default ports (format: spectrum:8092,wigle:8000,gps:2947)')

// Port parsing
parsePortOverrides() {
    const overrides = {};
    const portPairs = this.options.port.split(',');
    
    for (const pair of portPairs) {
        const [service, port] = pair.split(':');
        if (service && port) {
            overrides[service] = parseInt(port, 10);
        }
    }
    return overrides;
}
```

### Default Port Allocation
- Spectrum Analyzer: 8092
- WigleToTAK: 8000
- GPS Bridge: 2947
- **Webhook Service: Part of Spectrum Analyzer on 8092**

## Project Structure & Conventions

### Directory Structure
```
src/nodejs/
├── app.js                    # Main entry point
├── config/                   # Configuration management
├── shared/                   # Shared utilities
│   ├── logger.js
│   ├── errors.js
│   └── middleware/
├── kismet-operations/        # Main service with webhook
│   ├── index.js
│   ├── lib/
│   │   └── webhook/         # Webhook implementation
│   │       ├── index.js
│   │       ├── routes.js
│   │       └── scriptManager.js
│   └── public/
│       └── js/
│           └── kismet-operations.js
├── spectrum-analyzer/
├── wigle-to-tak/
└── gps-bridge/
```

### Module Pattern
```javascript
// Export pattern
module.exports = SpectrumAnalyzerService;

// Standalone execution support
if (require.main === module) {
    const service = new SpectrumAnalyzerService();
    service.start().catch(error => {
        console.error('Failed to start:', error);
        process.exit(1);
    });
}
```

## Existing Webhook Implementation

The webhook functionality is **already implemented** as part of the Kismet Operations service:

### WebhookService Class
```javascript
class WebhookService {
    constructor(app, io, config = {}) {
        this.scriptManager = new ScriptManager(config, logger);
        this.kismetClient = new KismetClient(config, logger);
        this.setupRoutes();
        this.setupWebSocket();
    }
}
```

### Webhook Routes
- Mounted at `/api/webhook/*`
- Includes rate limiting
- Full error handling
- WebSocket integration

## Recommendations for Integration

### 1. Port 8002 Implementation
The webhook is currently part of the Spectrum Analyzer service on port 8092. To implement on port 8002:

```javascript
// Option 1: Add to existing app.js
const webhookPort = portOverrides.webhook || 8002;
const webhookService = new WebhookService({
    port: webhookPort,
    // ... config
});

// Option 2: Standalone service
class WebhookStandaloneService extends SpectrumAnalyzerService {
    constructor(options) {
        super({ ...options, port: 8002 });
    }
}
```

### 2. Reuse Existing Patterns
- Use the established `asyncHandler` wrapper
- Leverage `StinksterError` classes
- Follow the service class pattern
- Reuse validation middleware

### 3. Button Handler Integration
The project already has button click patterns in place:
- Frontend: Fetch API with JSON responses
- Backend: Express routes with validation
- Status updates via polling or WebSocket
- Notification system for user feedback

### 4. State Management
Follow the existing patterns:
- Service-level state in class properties
- Cache for performance optimization
- WebSocket for real-time updates
- PID tracking for script management

## Conclusion

The Stinkster project follows modern Node.js best practices with:
- Express.js for REST APIs
- Socket.io for real-time communication
- Modular service architecture
- Comprehensive error handling
- Security middleware stack
- Clear separation of concerns

The webhook functionality is already implemented and could be easily adapted to run on port 8002 by either:
1. Modifying the existing service configuration
2. Creating a standalone instance of the webhook service
3. Adding port configuration to the main application

All patterns and conventions are in place for seamless integration.
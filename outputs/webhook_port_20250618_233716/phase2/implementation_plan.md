# Comprehensive Implementation Plan: Webhook Port 8002 Integration

## Executive Summary

Based on Phase 1 analysis, the webhook functionality already exists in the Node.js Kismet Operations Center but runs on port 8092 (part of the spectrum analyzer service). The button failures on port 8002 are due to nginx proxy misconfiguration and port binding conflicts. This implementation plan provides a definitive solution to establish webhook services on port 8002 while maintaining all existing functionality.

## Architecture Overview

### Current State
```
┌─────────────────────────────────────────────────────────────┐
│                    Current Architecture                       │
├─────────────────────────────────────────────────────────────┤
│  Flask webhook.py (Port 5000) ─────┐                        │
│                                    ├─► Service Orchestration │
│  Node.js Kismet Ops (Port 8092) ──┘   - Start/Stop         │
│     └─> Contains webhook routes        - Status Monitoring  │
│                                       - Data Retrieval      │
│  WigleToTak2.py (Port 8000) ────────► TAK Integration      │
│                                                             │
│  Buttons fail on 8002 due to nginx expecting Flask on 8000 │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Target Architecture                        │
├─────────────────────────────────────────────────────────────┤
│  Node.js Webhook Service (Port 8002) ──┐                    │
│     └─> Dedicated webhook instance      │                    │
│                                        ├─► Unified Service   │
│  Node.js Kismet Ops (Port 8092) ──────┤   Orchestration    │
│     └─> Spectrum analyzer only         │                    │
│                                        │                    │
│  Node.js WigleToTAK (Port 8000) ──────┘                    │
│     └─> Migrated from Python                                │
│                                                             │
│  Nginx Proxy ──► Proper routing to all services            │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Approach

### Decision: Create Dedicated Webhook Service on Port 8002

**Rationale:**
1. Clean separation of concerns
2. Independent scaling and deployment
3. Avoids modifying existing working services
4. Matches original Flask architecture intent
5. Solves button functionality issues definitively

## Module Structure

### New Service Directory Structure
```
src/nodejs/webhook-service/
├── index.js                    # Service entry point
├── package.json               # Dependencies
├── config/
│   └── default.json          # Default configuration
├── lib/
│   ├── orchestrator.js       # Service orchestration logic
│   ├── processManager.js     # Process management utilities
│   ├── gpsHandler.js         # GPS data integration
│   ├── kismetClient.js       # Kismet API client
│   └── routes/
│       ├── index.js          # Route aggregator
│       ├── scripts.js        # Start/stop script routes
│       ├── status.js         # Status and info routes
│       └── data.js           # Data retrieval routes
├── middleware/
│   ├── validation.js         # Request validation
│   ├── errorHandler.js       # Error handling
│   └── logging.js            # Request logging
└── public/
    └── health.html           # Health check page
```

### Shared Utilities Enhancement
```
src/nodejs/shared/
├── processUtils.js           # NEW: Shared process management
├── kismetAPI.js             # NEW: Shared Kismet client
└── systemInfo.js            # NEW: System information utilities
```

## Implementation Phases

### Phase 1: Extract and Refactor Webhook Components (Day 1-2)
1. **Extract webhook functionality from kismet-operations**
   - Copy webhook routes, scriptManager, and related components
   - Create standalone service structure
   - Remove webhook routes from kismet-operations

2. **Create dedicated webhook service**
   ```javascript
   // src/nodejs/webhook-service/index.js
   class WebhookService {
       constructor(options = {}) {
           this.port = options.port || 8002;
           this.config = this.loadConfiguration(options);
           this.setupExpress();
           this.setupMiddleware();
           this.setupRoutes();
           this.setupErrorHandling();
       }
   }
   ```

3. **Implement process orchestration**
   - Port subprocess logic from Python
   - Handle PID file management
   - Implement health checking

### Phase 2: Implement Missing Flask Endpoints (Day 3-4)
1. **GPS Integration** (`/info` endpoint)
   ```javascript
   async getGPSData() {
       const gpspipe = spawn('gpspipe', ['-w', '-n', '10']);
       // Parse TPV objects from JSON stream
       return this.parseGPSStream(gpspipe.stdout);
   }
   ```

2. **Enhanced Kismet Data** (`/kismet-data` endpoint)
   - CSV file parsing capability
   - Fallback to REST API
   - Data transformation for compatibility

3. **Network Interface Management**
   - Port wlan2 configuration logic
   - Implement safe mode switching

### Phase 3: Button Functionality Fix (Day 5)
1. **Frontend Integration**
   ```javascript
   // Update button handlers to use port 8002
   async function startKismet() {
       const response = await fetch('http://localhost:8002/webhook/run-script', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ script: 'both' })
       });
       // Handle response
   }
   ```

2. **CORS Configuration**
   ```javascript
   app.use(cors({
       origin: ['http://localhost:8092', 'http://localhost:8000'],
       credentials: true
   }));
   ```

3. **WebSocket Support**
   - Implement Socket.IO for real-time updates
   - Broadcast service status changes
   - Stream output from running scripts

### Phase 4: Nginx Configuration (Day 6)
1. **Create nginx configuration**
   ```nginx
   # /etc/nginx/sites-available/stinkster-webhook
   upstream webhook_backend {
       server localhost:8002;
       keepalive 32;
   }

   location /webhook/ {
       proxy_pass http://webhook_backend/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection $connection_upgrade;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       
       # Disable buffering for real-time responses
       proxy_buffering off;
       proxy_request_buffering off;
   }
   ```

2. **WebSocket mapping**
   ```nginx
   map $http_upgrade $connection_upgrade {
       default upgrade;
       '' close;
   }
   ```

### Phase 5: Testing and Validation (Day 7-8)
1. **Unit Tests**
   ```javascript
   // tests/webhook-service.test.js
   describe('Webhook Service', () => {
       test('should start services successfully', async () => {
           const response = await request(app)
               .post('/webhook/run-script')
               .send({ script: 'both' });
           expect(response.status).toBe(200);
           expect(response.body.success).toBe(true);
       });
   });
   ```

2. **Integration Tests**
   - Test all button functionality
   - Verify process management
   - Validate data retrieval

3. **Load Testing**
   - Concurrent button clicks
   - WebSocket connection limits
   - Memory usage under load

### Phase 6: Migration and Deployment (Day 9-10)
1. **Deployment Strategy**
   - Deploy webhook service alongside existing services
   - Update systemd service files
   - Configure auto-start on boot

2. **Rollback Plan**
   - Keep Flask webhook.py as backup
   - Nginx configuration switching
   - Quick revert procedure

## Integration Points

### 1. Process Management Integration
```javascript
// Shared process management utilities
class ProcessManager {
    constructor() {
        this.pidFiles = {
            main: '/tmp/kismet_script.pid',
            kismet: '/tmp/kismet_pids.txt',
            wigletotak: '/home/pi/tmp/wigletotak.specific.pid'
        };
    }

    async startMainScript() {
        const script = spawn('sudo', ['-u', 'pi', '/home/pi/stinky/gps_kismet_wigle.sh'], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        // Store PID and monitor
    }
}
```

### 2. Configuration Management
```json
{
    "webhook": {
        "port": 8002,
        "host": "0.0.0.0",
        "cors": {
            "origins": ["*"],
            "credentials": true
        },
        "paths": {
            "mainScript": "/home/pi/stinky/gps_kismet_wigle.sh",
            "kismetOps": "/home/pi/kismet_ops/"
        },
        "timeouts": {
            "scriptStart": 30000,
            "kismetRetry": 5000,
            "processCheck": 1000
        }
    }
}
```

### 3. Error Handling Strategy
```javascript
class WebhookError extends Error {
    constructor(message, code, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

// Specific error types
class ProcessNotFoundError extends WebhookError {
    constructor(process) {
        super(`Process ${process} not found`, 'PROCESS_NOT_FOUND', 404);
    }
}

class ServiceStartError extends WebhookError {
    constructor(service, details) {
        super(`Failed to start ${service}`, 'SERVICE_START_FAILED', 500);
        this.details = details;
    }
}
```

## Risk Mitigation

### 1. Process Management Risks
**Risk**: Node.js process management differs from Python subprocess
**Mitigation**: 
- Use battle-tested libraries (execa, tree-kill)
- Implement comprehensive PID tracking
- Add process health monitoring

### 2. Data Consistency Risks
**Risk**: Response format differences between Flask and Node.js
**Mitigation**:
- Create response transformers
- Implement compatibility mode
- Comprehensive API testing

### 3. Performance Risks
**Risk**: Long-running synchronous operations blocking event loop
**Mitigation**:
- Use Worker Threads for CPU-intensive tasks
- Implement proper async patterns
- Add operation timeouts

### 4. Security Risks
**Risk**: Command injection through script parameters
**Mitigation**:
- Input validation on all endpoints
- Whitelist allowed commands
- Use parameterized command execution

## Testing Strategy

### 1. Unit Test Coverage
- Process management functions
- Route handlers
- Data parsing utilities
- Error handling

### 2. Integration Tests
```javascript
// Button functionality test
describe('Button Operations', () => {
    test('Start button should initiate all services', async () => {
        // Click start button
        const startResponse = await clickStartButton();
        expect(startResponse.success).toBe(true);
        
        // Verify services running
        const statusResponse = await checkStatus();
        expect(statusResponse.kismet_running).toBe(true);
        expect(statusResponse.wigle_running).toBe(true);
    });
});
```

### 3. End-to-End Tests
- Full user workflow simulation
- Multi-service interaction
- Error recovery scenarios

### 4. Performance Tests
- Concurrent request handling
- Memory usage monitoring
- Response time benchmarks

## Monitoring and Observability

### 1. Logging Strategy
```javascript
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: '/var/log/webhook.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});
```

### 2. Metrics Collection
- Request/response times
- Process lifecycle events
- Error rates and types
- Resource utilization

### 3. Health Checks
```javascript
app.get('/webhook/health', (req, res) => {
    const health = {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
            kismet: kismetClient.isConnected(),
            gps: gpsHandler.hasValidFix()
        }
    };
    res.json(health);
});
```

## Success Criteria

1. **Functional Requirements**
   - ✓ All buttons work correctly on port 8002
   - ✓ Complete feature parity with Flask implementation
   - ✓ WebSocket support for real-time updates
   - ✓ Proper nginx proxy configuration

2. **Performance Requirements**
   - Response time < 100ms for status checks
   - Support 100+ concurrent WebSocket connections
   - Memory usage < 256MB under normal load

3. **Reliability Requirements**
   - 99.9% uptime for webhook service
   - Graceful error handling
   - Automatic recovery from crashes

4. **Security Requirements**
   - Input validation on all endpoints
   - No command injection vulnerabilities
   - Proper CORS configuration

## Timeline Summary

- **Day 1-2**: Extract and create webhook service
- **Day 3-4**: Implement missing endpoints
- **Day 5**: Fix button functionality
- **Day 6**: Configure nginx
- **Day 7-8**: Testing and validation
- **Day 9-10**: Migration and deployment

Total estimated time: 10 working days

## Conclusion

This implementation plan provides a clear path to establishing webhook services on port 8002 with full functionality. By creating a dedicated service rather than modifying existing components, we ensure clean architecture and minimize risk. The plan addresses all identified issues from Phase 1 analysis and provides a robust solution for button functionality and service orchestration.
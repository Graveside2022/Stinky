# Complete Integrated Solution - Fix Web Errors

## Executive Summary

This integrated solution combines four critical fixes identified in Phase 1:

1. **MGRS Module Loading Error**: Fix the ES6 module export error by using the browser-compatible version
2. **CORS Configuration**: Implement comprehensive CORS handling for cross-origin requests
3. **Frontend Start Button**: Add a functional UI button for script execution
4. **Backend API Endpoint**: Create secure API endpoint for script execution

All components work together to enable script execution from the web interface with proper error handling, security, and user feedback.

## Implementation Order

Follow this specific order to ensure dependencies are met:

1. Fix MGRS module error (quick fix)
2. Create CORS configuration module
3. Update backend server with API endpoint and CORS
4. Add frontend button to the interface
5. Test the complete integration

## File-by-File Implementation Guide

### 1. Fix MGRS Module Error

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/views/hi.html`  
**Line**: 1217

**Current Code**:
```html
<script src="https://unpkg.com/mgrs@1.0.0/mgrs.js"></script>
```

**Replace With**:
```html
<script src="https://unpkg.com/mgrs@1.0.0/dist/mgrs.min.js"></script>
```

**Verification**: After this change, refresh the page and check browser console - the "export declarations may only appear at top level" error should be gone.

### 2. Create CORS Configuration Module

**New File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/lib/corsConfig.js`

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
  process.env.FRONTEND_URL,
  undefined
].filter(Boolean);

// CORS options with comprehensive configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('CORS request from unlisted origin:', origin);
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
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
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Preflight request handler
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
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

### 3. Update Backend Server

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/server.js`

#### Part A: Add CORS Configuration (at the top after other requires)
```javascript
const { corsOptions, handlePreflight, dynamicCors, logger: corsLogger } = require('./lib/corsConfig');
```

#### Part B: Replace CORS Middleware (around line 370)
**Find and Remove**:
```javascript
app.use(cors());
```

**Replace With**:
```javascript
app.use(handlePreflight);
app.use(cors(corsOptions));
app.use(dynamicCors);
```

#### Part C: Update Socket.IO Configuration (around line 59)
```javascript
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || corsOptions.origin === '*') {
        return callback(null, true);
      }
      corsOptions.origin(origin, callback);
    },
    methods: corsOptions.methods,
    credentials: corsOptions.credentials,
    allowedHeaders: corsOptions.allowedHeaders
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});
```

#### Part D: Add Script Execution API (add before error handlers)
```javascript
// Process tracking
let activeProcess = null;
let isExecuting = false;

// Script execution endpoint
app.post('/api/start-script', async (req, res) => {
    if (isExecuting) {
        return res.status(409).json({
            success: false,
            error: 'Script is already running',
            message: 'A script execution is already in progress'
        });
    }

    const { scriptName } = req.body;
    
    if (!scriptName) {
        return res.status(400).json({
            success: false,
            error: 'Missing script name',
            message: 'Script name is required in request body'
        });
    }

    const allowedScripts = [
        'gps_kismet_wigle.sh',
        'start_kismet.sh',
        'smart_restart.sh',
        'stop_and_restart_services.sh'
    ];

    if (!allowedScripts.includes(scriptName)) {
        return res.status(403).json({
            success: false,
            error: 'Script not allowed',
            message: 'The requested script is not in the allowed list'
        });
    }

    const scriptPaths = {
        'gps_kismet_wigle.sh': '/home/pi/stinky/gps_kismet_wigle.sh',
        'start_kismet.sh': '/home/pi/Scripts/start_kismet.sh',
        'smart_restart.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/smart_restart.sh',
        'stop_and_restart_services.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/stop_and_restart_services.sh'
    };

    const scriptPath = scriptPaths[scriptName];

    try {
        await fs.access(scriptPath, fs.constants.F_OK | fs.constants.X_OK);
    } catch (error) {
        console.error(`Script access check failed: ${scriptPath}`, error);
        return res.status(404).json({
            success: false,
            error: 'Script not found or not executable',
            message: `Unable to access script: ${scriptName}`
        });
    }

    isExecuting = true;

    try {
        console.log(`Starting script: ${scriptPath}`);
        
        activeProcess = spawn('bash', [scriptPath], {
            cwd: path.dirname(scriptPath),
            env: { ...process.env, PATH: process.env.PATH },
            detached: false
        });

        const processId = activeProcess.pid;

        activeProcess.stdout.on('data', (data) => {
            console.log(`[${scriptName}] stdout: ${data.toString()}`);
        });

        activeProcess.stderr.on('data', (data) => {
            console.error(`[${scriptName}] stderr: ${data.toString()}`);
        });

        activeProcess.on('exit', (code, signal) => {
            console.log(`[${scriptName}] Process exited with code ${code} and signal ${signal}`);
            isExecuting = false;
            activeProcess = null;
        });

        activeProcess.on('error', (error) => {
            console.error(`[${scriptName}] Process error:`, error);
            isExecuting = false;
            activeProcess = null;
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (activeProcess && !activeProcess.killed) {
            res.status(200).json({
                success: true,
                message: `Script ${scriptName} started successfully`,
                processId: processId,
                scriptPath: scriptPath,
                startTime: new Date().toISOString()
            });
        } else {
            throw new Error('Process terminated immediately after start');
        }

    } catch (error) {
        console.error(`Failed to start script ${scriptName}:`, error);
        isExecuting = false;
        activeProcess = null;
        
        res.status(500).json({
            success: false,
            error: 'Script execution failed',
            message: error.message,
            scriptName: scriptName
        });
    }
});

// Check script status endpoint
app.get('/api/script-status', (req, res) => {
    res.status(200).json({
        success: true,
        isRunning: isExecuting,
        activeProcess: activeProcess ? {
            pid: activeProcess.pid,
            killed: activeProcess.killed
        } : null
    });
});
```

#### Part E: Add Required Imports (at top of file if not present)
```javascript
const { spawn } = require('child_process');
const fs = require('fs').promises;
```

### 4. Add Frontend Button

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/views/hi.html`

#### Part A: Add CSS Styles (in `<style>` section)
```css
/* Start Button Styles */
.start-button-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 20px;
    margin: 20px 0;
}

.start-button {
    position: relative;
    padding: 12px 32px;
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    background-color: #28a745;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.start-button:hover:not(:disabled) {
    background-color: #218838;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.start-button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
    opacity: 0.7;
}

.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.status-message {
    font-size: 14px;
    padding: 8px 16px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.3s ease;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.status-message.show {
    opacity: 1;
}

.status-message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status-message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.status-message.info {
    background-color: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}
```

#### Part B: Add HTML Button (find a suitable location in the body, perhaps after the header)
```html
<!-- Start Script Button -->
<div class="start-button-container">
    <button id="startScriptBtn" class="start-button">
        <span class="button-text">Start GPS/Kismet/Wigle</span>
        <span class="loading-spinner" style="display: none;"></span>
    </button>
    <div class="status-message" id="statusMessage"></div>
</div>
```

#### Part C: Add JavaScript (before closing `</body>` tag)
```javascript
<script>
// Start Script Button Implementation
(function() {
    const startButton = document.getElementById('startScriptBtn');
    const statusMessage = document.getElementById('statusMessage');
    const buttonText = startButton.querySelector('.button-text');
    const loadingSpinner = startButton.querySelector('.loading-spinner');

    let isScriptRunning = false;
    let disableTimeout = null;

    async function handleStartClick() {
        if (isScriptRunning || startButton.disabled) {
            return;
        }

        try {
            // Show starting state
            isScriptRunning = true;
            startButton.disabled = true;
            buttonText.textContent = 'Starting...';
            loadingSpinner.style.display = 'inline-block';
            showStatusMessage('Starting GPS/Kismet/Wigle services...', 'info');
            
            // Make API call
            const response = await fetch('/api/start-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scriptName: 'gps_kismet_wigle.sh',
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            // Handle successful start
            buttonText.textContent = 'Started';
            loadingSpinner.style.display = 'none';
            showStatusMessage('Services started successfully', 'success');
            disableButtonFor60Seconds();
            
        } catch (error) {
            console.error('Failed to start script:', error);
            buttonText.textContent = 'Start GPS/Kismet/Wigle';
            loadingSpinner.style.display = 'none';
            startButton.disabled = false;
            isScriptRunning = false;
            showStatusMessage(error.message || 'Failed to start services', 'error');
        }
    }

    function disableButtonFor60Seconds() {
        let remainingSeconds = 60;
        
        const updateCountdown = () => {
            if (remainingSeconds > 0) {
                buttonText.textContent = `Disabled (${remainingSeconds}s)`;
                remainingSeconds--;
            } else {
                clearInterval(countdownInterval);
                resetButtonState();
            }
        };
        
        const countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
        
        disableTimeout = setTimeout(() => {
            clearInterval(countdownInterval);
            resetButtonState();
        }, 60000);
    }

    function resetButtonState() {
        startButton.disabled = false;
        buttonText.textContent = 'Start GPS/Kismet/Wigle';
        loadingSpinner.style.display = 'none';
        isScriptRunning = false;
        
        if (disableTimeout) {
            clearTimeout(disableTimeout);
            disableTimeout = null;
        }
    }

    function showStatusMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message show ${type}`;
        
        if (type !== 'error') {
            setTimeout(() => {
                statusMessage.classList.remove('show');
            }, 5000);
        }
    }

    // Initialize button
    startButton.addEventListener('click', handleStartClick);
})();
</script>
```

## Testing Procedures

### 1. Test MGRS Fix
```bash
# Clear browser cache and reload page
# Open browser console (F12)
# Check for absence of "export declarations" error
# Verify MGRS coordinates display in System Status box
```

### 2. Test CORS Configuration
```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:8002" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v http://localhost:8002/api/start-script

# Verify response includes proper CORS headers
```

### 3. Test API Endpoint
```bash
# Test script start
curl -X POST http://localhost:8002/api/start-script \
  -H "Content-Type: application/json" \
  -d '{"scriptName": "gps_kismet_wigle.sh"}'

# Check script status
curl -X GET http://localhost:8002/api/script-status
```

### 4. Test Complete Integration
1. Open the web interface at http://localhost:8002
2. Click the "Start GPS/Kismet/Wigle" button
3. Observe:
   - Button shows "Starting..." with spinner
   - Status message appears
   - Button changes to "Started" on success
   - 60-second countdown begins
   - No console errors

### 5. Verify Services Running
```bash
# Check if processes are running
pgrep -f "kismet"
pgrep -f "WigleToTak2"
cat /home/pi/tmp/gps_kismet_wigle.pids
```

## Rollback Instructions

If any issues occur:

### 1. Revert MGRS Change
```bash
# In hi.html, change line 1217 back to:
<script src="https://unpkg.com/mgrs@1.0.0/mgrs.js"></script>
```

### 2. Remove CORS Configuration
```bash
# Delete the corsConfig.js file
rm /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/lib/corsConfig.js

# In server.js, revert to simple CORS:
app.use(cors());
```

### 3. Remove API Endpoints
```bash
# Remove the /api/start-script and /api/script-status routes from server.js
```

### 4. Remove Frontend Button
```bash
# Remove the button HTML, CSS, and JavaScript from hi.html
```

### 5. Restart Services
```bash
# Restart the Node.js server
pm2 restart kismet-operations
# or
systemctl restart kismet-operations-center
```

## Implementation Checklist

- [ ] Fix MGRS module error in hi.html (line 1217)
- [ ] Create corsConfig.js module
- [ ] Update server.js with CORS configuration
- [ ] Add script execution API endpoints
- [ ] Add frontend button HTML structure
- [ ] Add button CSS styles
- [ ] Add button JavaScript functionality
- [ ] Test MGRS fix (no console errors)
- [ ] Test CORS headers with curl
- [ ] Test API endpoint directly
- [ ] Test complete button functionality
- [ ] Verify services start correctly
- [ ] Document any issues encountered

## Summary

This integrated solution provides:

1. **Immediate Error Fix**: The MGRS module error is resolved with a simple one-line change
2. **Robust CORS Handling**: Comprehensive CORS configuration handles all cross-origin scenarios
3. **User-Friendly Interface**: Professional start button with loading states and feedback
4. **Secure Backend**: Whitelisted script execution with proper validation and error handling
5. **Complete Integration**: All components work together seamlessly

The implementation is designed to be:
- **Secure**: Script whitelist prevents arbitrary command execution
- **Reliable**: Error handling at every level
- **User-Friendly**: Clear visual feedback and status messages
- **Maintainable**: Clean code structure with separation of concerns

Follow the implementation order and use the testing procedures to ensure everything works correctly before considering the implementation complete.
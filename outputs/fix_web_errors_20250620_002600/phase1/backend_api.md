# Backend API Implementation - /api/start-script Endpoint

## Express.js Route Implementation

```javascript
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Process tracking
let activeProcess = null;
let isExecuting = false;

// Script execution endpoint
app.post('/api/start-script', async (req, res) => {
    // Prevent multiple simultaneous executions
    if (isExecuting) {
        return res.status(409).json({
            success: false,
            error: 'Script is already running',
            message: 'A script execution is already in progress'
        });
    }

    // Get script name from request body (with validation)
    const { scriptName } = req.body;
    
    if (!scriptName) {
        return res.status(400).json({
            success: false,
            error: 'Missing script name',
            message: 'Script name is required in request body'
        });
    }

    // Whitelist of allowed scripts (security measure)
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

    // Define script paths
    const scriptPaths = {
        'gps_kismet_wigle.sh': '/home/pi/stinky/gps_kismet_wigle.sh',
        'start_kismet.sh': '/home/pi/Scripts/start_kismet.sh',
        'smart_restart.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/smart_restart.sh',
        'stop_and_restart_services.sh': '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/stop_and_restart_services.sh'
    };

    const scriptPath = scriptPaths[scriptName];

    try {
        // Verify script exists and is executable
        await fs.access(scriptPath, fs.constants.F_OK | fs.constants.X_OK);
    } catch (error) {
        console.error(`Script access check failed: ${scriptPath}`, error);
        return res.status(404).json({
            success: false,
            error: 'Script not found or not executable',
            message: `Unable to access script: ${scriptName}`
        });
    }

    // Set execution flag
    isExecuting = true;

    try {
        // Execute the script
        console.log(`Starting script: ${scriptPath}`);
        
        activeProcess = spawn('bash', [scriptPath], {
            cwd: path.dirname(scriptPath),
            env: { ...process.env, PATH: process.env.PATH },
            detached: false
        });

        const processId = activeProcess.pid;

        // Handle stdout
        activeProcess.stdout.on('data', (data) => {
            console.log(`[${scriptName}] stdout: ${data.toString()}`);
        });

        // Handle stderr
        activeProcess.stderr.on('data', (data) => {
            console.error(`[${scriptName}] stderr: ${data.toString()}`);
        });

        // Handle process exit
        activeProcess.on('exit', (code, signal) => {
            console.log(`[${scriptName}] Process exited with code ${code} and signal ${signal}`);
            isExecuting = false;
            activeProcess = null;
        });

        // Handle process error
        activeProcess.on('error', (error) => {
            console.error(`[${scriptName}] Process error:`, error);
            isExecuting = false;
            activeProcess = null;
        });

        // Wait a short time to confirm process started
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if process is still running
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

// Stop script endpoint (bonus implementation)
app.post('/api/stop-script', (req, res) => {
    if (!activeProcess || !isExecuting) {
        return res.status(404).json({
            success: false,
            error: 'No active script',
            message: 'No script is currently running'
        });
    }

    try {
        // Send SIGTERM to gracefully stop the process
        activeProcess.kill('SIGTERM');
        
        // Force kill after timeout if needed
        setTimeout(() => {
            if (activeProcess && !activeProcess.killed) {
                activeProcess.kill('SIGKILL');
            }
        }, 5000);

        res.status(200).json({
            success: true,
            message: 'Stop signal sent to script',
            processId: activeProcess.pid
        });
    } catch (error) {
        console.error('Failed to stop script:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop script',
            message: error.message
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

## Error Handling Logic

```javascript
// Global error handler middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    // Handle specific error types
    if (error.code === 'ENOENT') {
        return res.status(404).json({
            success: false,
            error: 'Resource not found',
            message: 'The requested resource does not exist'
        });
    }
    
    if (error.code === 'EACCES') {
        return res.status(403).json({
            success: false,
            error: 'Permission denied',
            message: 'Insufficient permissions to perform this action'
        });
    }
    
    // Default error response
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
});
```

## Response Format Specification

### Success Response
```json
{
    "success": true,
    "message": "Script gps_kismet_wigle.sh started successfully",
    "processId": 12345,
    "scriptPath": "/home/pi/stinky/gps_kismet_wigle.sh",
    "startTime": "2025-01-20T00:26:00.000Z"
}
```

### Error Response
```json
{
    "success": false,
    "error": "Script execution failed",
    "message": "Detailed error message here",
    "scriptName": "gps_kismet_wigle.sh"
}
```

### Status Response
```json
{
    "success": true,
    "isRunning": true,
    "activeProcess": {
        "pid": 12345,
        "killed": false
    }
}
```

## Security Measures

1. **Script Whitelist**: Only allowed scripts can be executed
```javascript
const allowedScripts = [
    'gps_kismet_wigle.sh',
    'start_kismet.sh',
    'smart_restart.sh',
    'stop_and_restart_services.sh'
];
```

2. **Path Validation**: Scripts must use absolute paths from predefined mapping
```javascript
const scriptPaths = {
    'gps_kismet_wigle.sh': '/home/pi/stinky/gps_kismet_wigle.sh',
    // ... other scripts
};
```

3. **Execution Lock**: Prevents multiple simultaneous executions
```javascript
if (isExecuting) {
    return res.status(409).json({
        success: false,
        error: 'Script is already running'
    });
}
```

4. **Input Validation**: Required parameters are validated
```javascript
if (!scriptName) {
    return res.status(400).json({
        success: false,
        error: 'Missing script name'
    });
}
```

5. **File Access Check**: Verifies script exists and is executable
```javascript
await fs.access(scriptPath, fs.constants.F_OK | fs.constants.X_OK);
```

## Testing Curl Commands

### Start Script
```bash
# Start gps_kismet_wigle.sh
curl -X POST http://localhost:3000/api/start-script \
  -H "Content-Type: application/json" \
  -d '{"scriptName": "gps_kismet_wigle.sh"}'

# Start start_kismet.sh
curl -X POST http://localhost:3000/api/start-script \
  -H "Content-Type: application/json" \
  -d '{"scriptName": "start_kismet.sh"}'

# Test with invalid script (should fail)
curl -X POST http://localhost:3000/api/start-script \
  -H "Content-Type: application/json" \
  -d '{"scriptName": "malicious.sh"}'

# Test without script name (should fail)
curl -X POST http://localhost:3000/api/start-script \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Check Script Status
```bash
curl -X GET http://localhost:3000/api/script-status
```

### Stop Script
```bash
curl -X POST http://localhost:3000/api/stop-script
```

## Integration Example

```javascript
// Example integration in server.js
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Include the script execution routes
// [Insert the route implementations above]

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
```

## Process Monitoring

The implementation includes process monitoring through:

1. **PID Tracking**: Stores the process ID for monitoring
2. **Event Handlers**: Monitors stdout, stderr, exit, and error events
3. **Status Endpoint**: Provides real-time status of running scripts
4. **Graceful Shutdown**: Handles SIGTERM before SIGKILL
5. **Execution Lock**: Ensures single instance execution

This backend API provides a secure, robust solution for executing scripts from the frontend with proper error handling, validation, and monitoring capabilities.
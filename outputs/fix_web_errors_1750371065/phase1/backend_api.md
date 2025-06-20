# Backend API Developer Report - Agent 4

## Script Execution Endpoint Analysis

### Current Implementation Review
The `/run-script` endpoint already exists in server.js (lines 637-699) with proper functionality:
- Accepts POST requests with script_name and args
- Handles smart_restart script for starting services
- Returns appropriate success/error responses
- Uses async execution with child_process

### Existing Endpoint Details
```javascript
app.post('/run-script', async (req, res) => {
    // Current implementation at line 637
    // Already handles:
    // - smart_restart with 'start' argument
    // - stop_restart_services with 'stop' argument
    // - Default orchestration script execution
});
```

## Enhancement Recommendations

Since the endpoint already exists and works correctly, I'll provide enhancements for better async handling and monitoring.

### 1. Enhanced Async Script Execution
Add process monitoring capability to the existing ScriptManager class:

**Add after line 100 in SimpleScriptManager class:**
```javascript
async startScriptWithMonitoring(scriptName, onProgress) {
    const scriptPath = this.scriptPaths[scriptName];
    if (!scriptPath) {
        throw new Error(`Unknown script: ${scriptName}`);
    }

    // Check if already running
    const isRunning = await this.isScriptRunning(scriptName);
    if (isRunning) {
        throw new Error(`Script ${scriptName} is already running`);
    }

    // Start the script with progress monitoring
    const scriptProcess = spawn('bash', [scriptPath], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    // Store process reference
    this.processes.set(scriptName, scriptProcess.pid);

    // Monitor stdout for progress
    if (onProgress && scriptProcess.stdout) {
        scriptProcess.stdout.on('data', (data) => {
            const output = data.toString();
            onProgress({
                type: 'stdout',
                data: output,
                timestamp: new Date().toISOString()
            });
        });
    }

    // Monitor stderr for errors
    if (onProgress && scriptProcess.stderr) {
        scriptProcess.stderr.on('data', (data) => {
            const error = data.toString();
            onProgress({
                type: 'stderr',
                data: error,
                timestamp: new Date().toISOString()
            });
        });
    }

    // Unref to allow parent to exit
    scriptProcess.unref();

    return {
        script: scriptName,
        pid: scriptProcess.pid,
        started: new Date().toISOString()
    };
}
```

### 2. WebSocket Support for Real-time Progress
Add WebSocket event emission to the existing endpoint:

**Modify the /run-script endpoint (enhance line 677):**
```javascript
// Inside the existing /run-script handler, after line 676
else {
    // Default behavior - start the orchestration script with progress
    const result = await scriptManager.startScriptWithMonitoring(
        scriptToRun,
        (progress) => {
            // Emit progress via WebSocket
            io.emit('script-progress', {
                script: scriptToRun,
                ...progress
            });
        }
    );
    
    // Emit start event
    io.emit('script-started', {
        script: scriptToRun,
        pid: result.pid,
        timestamp: result.started
    });
    
    res.json({
        status: 'success',
        message: 'Script started successfully',
        script: scriptToRun,
        pid: result.pid,
        timestamp: new Date().toISOString()
    });
}
```

### 3. Script Execution Status Endpoint
Add a new endpoint for detailed execution status:

**Add after the /script-status endpoint (after line 800):**
```javascript
/**
 * GET /script-execution/:scriptName - Get detailed execution info
 */
app.get('/script-execution/:scriptName', async (req, res) => {
    try {
        const { scriptName } = req.params;
        const isRunning = await scriptManager.isScriptRunning(scriptName);
        const pid = scriptManager.processes.get(scriptName);
        
        // Get process info if running
        let processInfo = null;
        if (isRunning && pid) {
            try {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                
                // Get process details
                const { stdout } = await execAsync(`ps -p ${pid} -o pid,ppid,user,pcpu,pmem,etime,cmd`);
                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                    const headers = lines[0].trim().split(/\s+/);
                    const values = lines[1].trim().split(/\s+/);
                    processInfo = {};
                    headers.forEach((header, index) => {
                        processInfo[header.toLowerCase()] = values[index];
                    });
                }
            } catch (error) {
                logger.error('Failed to get process info', { error: error.message });
            }
        }
        
        res.json({
            script: scriptName,
            running: isRunning,
            pid: pid || null,
            processInfo,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Failed to get script execution status', { error: error.message });
        res.status(500).json({
            error: 'Failed to get execution status',
            details: error.message
        });
    }
});
```

### 4. Graceful Shutdown Handler
Add signal handling for clean script termination:

**Add after server startup (after line that starts server):**
```javascript
// Graceful shutdown handling
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    // Stop all running scripts
    for (const [scriptName, pid] of scriptManager.processes) {
        try {
            await scriptManager.stopScript(scriptName);
            logger.info(`Stopped script ${scriptName} (PID: ${pid})`);
        } catch (error) {
            logger.error(`Failed to stop script ${scriptName}:`, error);
        }
    }
    
    // Close server
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});
```

### 5. Enhanced Logging for Script Execution
Add detailed logging configuration:

**Add to the scriptManager methods:**
```javascript
// Enhanced logging for script operations
logScriptOperation(operation, scriptName, details = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        operation,
        script: scriptName,
        ...details
    };
    
    // Log to file for audit trail
    const logFile = `/var/log/kismet-operations/script-execution.log`;
    fs.appendFile(logFile, JSON.stringify(logEntry) + '\n', (err) => {
        if (err) logger.error('Failed to write to script log', { error: err.message });
    });
    
    // Also log via Winston
    logger.info('Script operation', logEntry);
}
```

## Integration with CORS Solution

The backend API works seamlessly with Agent 2's CORS solutions:
- All endpoints already have CORS enabled via `app.use(cors())`
- WebSocket connections have CORS configured in Socket.IO initialization
- Proxy endpoints can call these APIs without CORS issues

## Error Handling Best Practices

1. **Timeout Handling**: Already implemented in stop-script (25-second timeout)
2. **Process Validation**: Check if process exists before operations
3. **Graceful Degradation**: Return partial data if some checks fail
4. **Detailed Error Messages**: Include context in error responses

## Testing the Enhanced Implementation

```bash
# Test script start
curl -X POST http://localhost:8002/run-script \
  -H "Content-Type: application/json" \
  -d '{"script_name": "smart_restart", "args": ["start"]}'

# Check execution status
curl http://localhost:8002/script-execution/smart_restart

# Monitor WebSocket events
# Use Socket.IO client to listen for 'script-progress' events
```

## Summary

The backend API is already well-implemented. The enhancements provide:
- Real-time progress monitoring via WebSocket
- Detailed process information endpoint
- Better logging and audit trail
- Graceful shutdown handling
- Full compatibility with frontend requirements
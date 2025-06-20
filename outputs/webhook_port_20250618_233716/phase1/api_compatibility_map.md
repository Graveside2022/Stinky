# Flask to Node.js API Compatibility Mapping

## Overview
This document maps all Flask routes from webhook.py and WigleToTak2.py to their Node.js/Express equivalents, identifying conversion requirements and compatibility challenges.

## Route Mapping Table

### webhook.py Routes

| Flask Route | Method | Node.js Equivalent | Request Format | Response Format | Conversion Notes |
|------------|--------|-------------------|----------------|-----------------|------------------|
| `/run-script` | POST | `app.post('/run-script')` | Empty body | JSON: `{status, message}` | - Replace `subprocess.Popen` with `child_process.spawn`<br>- Replace `psutil` with `node-ps` or `pidusage`<br>- File operations use Node.js `fs` module<br>- Complex process management logic |
| `/stop-script` | POST | `app.post('/stop-script')` | Empty body | JSON: `{status, message}` | - Process killing requires `process.kill()` or `tree-kill`<br>- System commands via `child_process.exec`<br>- PID file management with `fs` |
| `/info` | GET | `app.get('/info')` | None | JSON: `{gps, kismet, wigle, ip}` | - GPS data via `gpspipe` command<br>- Process checking with `ps-node`<br>- HTTP requests with `axios` or `node-fetch` |
| `/script-status` | GET | `app.get('/script-status')` | None | JSON: `{running, message, kismet_running, kismet_api_responding, wigle_running}` | - Multiple process status checks<br>- API connectivity tests<br>- File-based status checking |
| `/kismet-data` | GET | `app.get('/kismet-data')` | None | JSON: `{devices_count, networks_count, recent_devices, feed_items, last_update}` | - CSV file parsing with `csv-parser`<br>- Kismet API integration<br>- Fallback logic between CSV and API |

### WigleToTak2.py Routes

| Flask Route | Method | Node.js Equivalent | Request Format | Response Format | Conversion Notes |
|------------|--------|-------------------|----------------|-----------------|------------------|
| `/` | GET | `app.get('/')` | None | HTML template | - Replace Flask `render_template` with template engine (EJS, Pug, etc.)<br>- Pass template variables |
| `/update_tak_settings` | POST | `app.post('/update_tak_settings')` | JSON: `{tak_server, tak_port, cot_uid, cot_stale}` | JSON: `{status, message}` | - Validate input data<br>- Update global settings object |
| `/update_multicast_state` | POST | `app.post('/update_multicast_state')` | JSON: `{enabled}` | JSON: `{status, message}` | - Boolean state management<br>- Affect TAK broadcasting logic |
| `/update_analysis_mode` | POST | `app.post('/update_analysis_mode')` | JSON: `{enabled}` | JSON: `{status, message}` | - Toggle analysis features<br>- Update processing behavior |
| `/update_antenna_sensitivity` | POST | `app.post('/update_antenna_sensitivity')` | JSON: `{sensitivity_mode, custom_dbm}` | JSON: `{status, message}` | - Validate sensitivity values<br>- Apply to signal processing |
| `/get_antenna_settings` | GET | `app.get('/get_antenna_settings')` | None | JSON: `{sensitivity_mode, custom_dbm, descriptions}` | - Return current antenna configuration |
| `/list_wigle_files` | GET | `app.get('/list_wigle_files')` | None | JSON: Array of file info | - Directory listing with `fs.readdir`<br>- File stats with `fs.stat` |
| `/stop_broadcast` | POST | `app.post('/stop_broadcast')` | Empty body | JSON: `{status, message}` | - Stop TAK broadcasting thread<br>- Clean up resources |
| `/start_broadcast` | POST | `app.post('/start_broadcast')` | JSON: `{file}` | JSON: `{status, message}` | - Start TAK broadcasting<br>- File validation<br>- Thread/worker management |
| `/add_to_whitelist` | POST | `app.post('/add_to_whitelist')` | JSON: `{mac}` | JSON: `{status, message}` | - MAC address validation<br>- List management |
| `/remove_from_whitelist` | POST | `app.post('/remove_from_whitelist')` | JSON: `{mac}` | JSON: `{status, message}` | - MAC address removal<br>- List updates |
| `/add_to_blacklist` | POST | `app.post('/add_to_blacklist')` | JSON: `{mac}` | JSON: `{status, message}` | - MAC address validation<br>- List management |
| `/remove_from_blacklist` | POST | `app.post('/remove_from_blacklist')` | JSON: `{mac}` | JSON: `{status, message}` | - MAC address removal<br>- List updates |

## Flask to Express Middleware Mapping

| Flask Feature | Express/Node.js Equivalent | Implementation Notes |
|--------------|---------------------------|---------------------|
| `@app.route()` | `app.get()`, `app.post()`, etc. | Direct mapping |
| `request.json` | `req.body` (with `express.json()` middleware) | Requires body parser |
| `request.remote_addr` | `req.ip` or `req.connection.remoteAddress` | May need proxy trust settings |
| `jsonify()` | `res.json()` | Built into Express |
| `render_template()` | `res.render()` | Requires template engine setup |
| `CORS(app)` | `cors` middleware | `npm install cors` |
| Global variables | Module-level variables or config object | Consider using a config module |

## Python to Node.js Library Mapping

| Python Library | Node.js Equivalent | Notes |
|----------------|-------------------|--------|
| `subprocess` | `child_process` | Built-in Node.js module |
| `psutil` | `pidusage`, `ps-node`, or `systeminformation` | Multiple options available |
| `gps` | Command line via `child_process` | Use `gpspipe` command |
| `flask_cors` | `cors` | Express middleware |
| `logging` | `winston` or `bunyan` | Popular logging libraries |
| `requests` | `axios` or `node-fetch` | HTTP client libraries |
| `csv` | `csv-parser` or `csv-parse` | CSV parsing libraries |
| `glob` | `glob` or built-in `fs` methods | File pattern matching |
| `signal` | `process` signals | Built-in Node.js |
| `os.path` | `path` | Built-in Node.js module |

## Special Handling Requirements

### 1. Process Management
- **Challenge**: Python's `psutil` provides cross-platform process management
- **Solution**: Use combination of:
  - `child_process` for spawning/killing processes
  - `tree-kill` for killing process trees
  - `pidusage` for process monitoring
  - Platform-specific commands via `exec`

### 2. File Operations
- **Challenge**: Synchronous vs asynchronous file operations
- **Solution**: 
  - Use `fs.promises` for async operations
  - Maintain same file paths and PID file structure
  - Implement proper error handling for file operations

### 3. GPS Integration
- **Challenge**: Python `gps` library direct integration
- **Solution**: 
  - Execute `gpspipe` command via `child_process`
  - Parse JSON output from gpspipe
  - Implement timeout handling

### 4. Long-Running Operations
- **Challenge**: Flask's threading model vs Node.js event loop
- **Solution**:
  - Use Worker Threads for CPU-intensive operations
  - Implement proper async/await patterns
  - Consider using job queues for long operations

### 5. State Management
- **Challenge**: Global variables and state persistence
- **Solution**:
  - Create a state management module
  - Use singleton pattern for configuration
  - Consider Redis for distributed state if scaling

### 6. Error Handling
- **Challenge**: Different error handling paradigms
- **Solution**:
  - Implement Express error middleware
  - Use try-catch with async/await
  - Maintain same error response format

## WebSocket Considerations
- Neither webhook.py nor WigleToTak2.py currently use WebSockets
- If real-time updates are needed, consider adding Socket.IO support
- Potential use cases:
  - Real-time GPS updates
  - Live Kismet data streaming
  - TAK broadcast status updates

## Session Management
- Current Flask implementation doesn't use sessions
- If needed in Node.js, use `express-session`
- Consider stateless design for better scalability

## Security Considerations
1. **Authentication**: No auth in current implementation
2. **CORS**: Enabled for all origins - consider restricting
3. **Input Validation**: Implement comprehensive validation
4. **Process Execution**: Sanitize all command inputs
5. **File Access**: Validate file paths to prevent traversal

## Testing Strategy
1. Unit test each route handler
2. Integration test process management
3. Test error scenarios
4. Validate response formats match exactly
5. Performance test long-running operations

## Migration Priority
1. **High Priority**: 
   - `/run-script` - Core functionality
   - `/stop-script` - Core functionality
   - `/script-status` - Monitoring
   
2. **Medium Priority**:
   - `/info` - Status information
   - `/kismet-data` - Data retrieval
   - TAK settings endpoints
   
3. **Low Priority**:
   - List management endpoints
   - Antenna settings (if not actively used)

## Implementation Recommendations
1. Start with a direct port maintaining exact API compatibility
2. Implement comprehensive logging from the start
3. Add request validation middleware
4. Create abstraction layers for process management
5. Implement health check endpoints
6. Add API documentation (consider Swagger/OpenAPI)
7. Plan for graceful shutdown handling
8. Consider implementing circuit breakers for external service calls
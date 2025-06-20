# Integration Architect Analysis - Kismet Operations Center Fix

**Agent**: E - Integration Architect  
**Date**: 2025-06-20  
**Focus**: System-wide integration issues and unified fix approach

## Executive Summary

The Kismet Operations Center at port 8002 has multiple integration issues preventing proper functionality:

1. **API Endpoint Mismatch**: Frontend calls `/api/start-script` but backend expects `/run-script`
2. **Request Body Mismatch**: Frontend sends wrong parameter names in JSON body
3. **Service Startup Timing**: 60+ second startup sequence with complex dependencies
4. **Missing CORS/Auth Handling**: Iframe integration for Kismet UI needs proxy setup
5. **GPS Dependency Chain**: GPS → GPSD → Kismet → WigleToTAK sequential startup

## Critical Integration Issues Identified

### 1. Frontend/Backend API Mismatch

**Root Cause**: The frontend (hi.html) is making incorrect API calls:
- Frontend calls: `POST /api/start-script` with `{scriptName: 'gps_kismet_wigle.sh'}`
- Backend expects: `POST /run-script` with `{script: 'kismet'}`

**Files Affected**:
- `/src/nodejs/kismet-operations/views/hi.html` (lines 1673, 1812)
- `/src/nodejs/kismet-operations/server.js` (lines 695, 774)

### 2. Service Orchestration Flow

The current service startup follows this dependency chain:

```
1. GPS Device Detection (3-5s)
   ↓
2. GPSD Service Start (5s)
   ↓
3. GPS Fix Acquisition (30s timeout, configurable)
   ↓
4. Kismet Interface Setup (10s)
   ↓
5. Kismet Server Start (15s initialization)
   ↓
6. WigleToTAK Service Start (5s)
   ↓
Total: 60-70 seconds typical startup time
```

**Critical Path Issues**:
- GPS fix blocks all subsequent services
- No parallel startup possible due to dependencies
- Error in any step cascades to failure

### 3. Integration Points Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Kismet Operations Center                 │
│                    (Port 8002)                          │
├─────────────────────────────────────────────────────────┤
│  Frontend (hi.html)          │   Backend (server.js)    │
│  - Start/Stop buttons        │   - SimpleScriptManager  │
│  - Status displays           │   - Process control      │
│  - Kismet iframe            │   - Status monitoring    │
└──────────────┬──────────────┴────────────┬─────────────┘
               │                           │
               │ API Calls                 │ Spawns
               │                           │
               ▼                           ▼
        ┌──────────────┐          ┌────────────────────┐
        │ Webhook API  │          │ Orchestration      │
        │ /run-script  │          │ gps_kismet_wigle.sh│
        │ /stop-script │          └──────┬─────────────┘
        └──────────────┘                 │
                                        │ Controls
                                        ▼
                            ┌──────────────────────┐
                            │   Service Chain      │
                            ├──────────────────────┤
                            │ 1. GPSD (2947)       │
                            │ 2. Kismet (2501)     │
                            │ 3. WigleToTAK (6969) │
                            └──────────────────────┘
```

### 4. Service Dependencies Matrix

| Service | Depends On | Port | Startup Time | Critical |
|---------|-----------|------|--------------|----------|
| GPSD | GPS Device | 2947 | 5s | Yes |
| Kismet | GPSD, wlan2 | 2501 | 15s | Yes |
| WigleToTAK | Kismet | 6969/8000 | 5s | Yes |
| Operations Center | All above | 8002 | Immediate | No |

### 5. Error Propagation Analysis

Current error handling creates cascading failures:
1. GPS device not found → Script exits completely
2. GPSD fails to start → Script continues with warnings
3. Kismet fails → Script exits
4. WigleToTAK fails → Script exits

## Bottlenecks Identified

### 1. Sequential GPS Fix Wait
- **Issue**: 30-second blocking wait for GPS fix
- **Impact**: Delays all services even if GPS not critical
- **Solution**: Make GPS fix non-blocking with async status updates

### 2. No Service Health Checks
- **Issue**: Services assumed ready after spawn
- **Impact**: API calls fail during initialization
- **Solution**: Implement proper readiness probes

### 3. Monolithic Orchestration Script
- **Issue**: Single bash script manages all services
- **Impact**: No granular control or partial restarts
- **Solution**: Individual service management with dependency tracking

## Unified Fix Strategy

### Phase 1: Immediate Fixes (30 minutes)
1. **Fix API Endpoints** (CRITICAL)
   ```javascript
   // In hi.html, line 1673:
   - const response = await fetch('/api/start-script', {
   + const response = await fetch('/run-script', {
   
   // In hi.html, line 1678:
   - body: JSON.stringify({ scriptName: 'gps_kismet_wigle.sh' })
   + body: JSON.stringify({ script: 'kismet' })
   
   // In hi.html, line 1812:
   - fetch('/api/stop-script', {
   + fetch('/stop-script', {
   
   // In hi.html, line 1817:
   - body: JSON.stringify({ script: 'gps_kismet_wigle' })
   + body: JSON.stringify({ script: 'kismet' })
   ```

2. **Add CORS Support for Iframe**
   ```javascript
   // In server.js, add proxy for Kismet:
   app.use('/kismet', createProxyMiddleware({
     target: 'http://localhost:2501',
     changeOrigin: true,
     pathRewrite: { '^/kismet': '' },
     auth: 'admin:admin'
   }));
   ```

### Phase 2: Service Improvements (1 hour)
1. **Implement Service Readiness Checks**
   ```javascript
   // Add to SimpleScriptManager
   async waitForServiceReady(service, timeout = 30000) {
     const startTime = Date.now();
     while (Date.now() - startTime < timeout) {
       if (await this.checkServiceHealth(service)) {
         return true;
       }
       await new Promise(resolve => setTimeout(resolve, 1000));
     }
     return false;
   }
   ```

2. **Add Non-Blocking GPS Mode**
   ```bash
   # In gps_kismet_wigle.sh, add:
   GPS_BLOCKING=${GPS_BLOCKING:-false}
   if [ "$GPS_BLOCKING" = "false" ]; then
     # Start GPS check in background
     check_gps_fix &
     GPS_CHECK_PID=$!
   fi
   ```

### Phase 3: Architecture Improvements (2 hours)
1. **Service Manager Refactor**
   - Individual service control endpoints
   - Dependency-aware startup/shutdown
   - Health check integration
   - WebSocket status streaming

2. **Configuration Management**
   - Environment-based service configs
   - Runtime parameter updates
   - Service-specific timeouts

## Implementation Priority

1. **CRITICAL** - Fix API endpoint mismatches (5 minutes)
2. **HIGH** - Add request body validation and error messages (15 minutes)
3. **HIGH** - Implement Kismet proxy for iframe (20 minutes)
4. **MEDIUM** - Add service readiness checks (30 minutes)
5. **LOW** - Refactor to microservice architecture (2 hours)

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API changes break UI | High | Certain (current) | Fix immediately |
| Service startup timeout | Medium | High | Add configurable timeouts |
| GPS blocking startup | Medium | Medium | Non-blocking mode |
| Network disruption | Low | Low | Retry mechanisms |

## Testing Requirements

1. **API Endpoint Tests**
   ```bash
   # Test start endpoint
   curl -X POST http://localhost:8002/run-script \
     -H "Content-Type: application/json" \
     -d '{"script":"kismet"}'
   
   # Test stop endpoint
   curl -X POST http://localhost:8002/stop-script \
     -H "Content-Type: application/json" \
     -d '{"script":"kismet"}'
   ```

2. **Service Chain Tests**
   - Verify 60-second startup completes
   - Test partial service failures
   - Validate status reporting accuracy

3. **Integration Tests**
   - Frontend button functionality
   - Iframe loading and auth
   - Real-time status updates

## Conclusion

The Kismet Operations Center has a simple but critical bug: API endpoint mismatches. The broader architecture has room for improvement in service orchestration and dependency management. The immediate fix will restore functionality, while the proposed improvements will enhance reliability and maintainability.

**Immediate Action Required**:
1. Fix the 4 API endpoint calls in hi.html
2. Test button functionality
3. Deploy the fix

**Estimated Time to Full Functionality**: 30 minutes
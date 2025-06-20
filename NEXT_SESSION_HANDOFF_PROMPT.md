# NEXT SESSION HANDOFF PROMPT

Previous session with Christian reached a critical milestone - Flask to Node.js migration is COMPLETE but webhook service migration is PENDING.

## IMMEDIATE STARTUP ACTIONS

1. Read CLAUDE.md for rules and memory system
2. Read TODO.md for current task list (14 webhook migration tasks)
3. Read HANDOFF_SUMMARY.md for complete context
4. Check SESSION_CONTINUITY.md for detailed history

User: Christian
Project: Stinkster Malone - SDR/WiFi/GPS/TAK Integration System
Critical Work: Webhook service migration (final component for full functionality)

## QUICK STATUS CHECK

```bash
# Check Node.js services status
pgrep -f "node.*spectrum" && echo "✅ Spectrum Analyzer: Running" || echo "❌ Spectrum Analyzer: Stopped"
pgrep -f "node.*wigle" && echo "✅ WigleToTAK: Running" || echo "❌ WigleToTAK: Stopped"

# Test service endpoints
curl -s http://localhost:8092/api/status | jq '.mode' 2>/dev/null || echo "Spectrum API not responding"
curl -s http://localhost:8000/ | grep -q "WigleToTAK" && echo "✅ WigleToTAK: OK" || echo "WigleToTAK: Not responding"

# Check for webhook service (should NOT exist yet)
curl -s http://localhost:8092/run-script 2>/dev/null && echo "⚠️ Webhook endpoints exist" || echo "✅ Webhook endpoints not yet implemented"
```

## CRITICAL CONTEXT

### What's Working
- **Spectrum Analyzer**: Port 8092, 34.5% performance improvement, Kismet UI integrated
- **WigleToTAK**: Port 8000, 100% API compatibility maintained
- **Pattern Library**: 13 production-validated patterns ready for use
- **Memory System**: Complete knowledge capture with 82% pattern reuse rate

### What's Missing (CRITICAL)
- **Webhook Service**: System orchestration unavailable without this
- **Web UI Control**: hi.html cannot control services without webhook endpoints
- **GPS Integration**: node-gpsd not yet integrated
- **Process Management**: Orchestration script control not implemented

## PRIMARY OBJECTIVE: Complete Webhook Migration

### Task 1: Install Dependencies (5 min)
```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/spectrum-analyzer
npm install joi node-gpsd glob ps-list tree-kill
```

### Task 2: Fix Config Validation (30 min)
- Add joi to dependencies
- Fix signal_processing field in validation schema

### Task 3: Implement Webhook Endpoints (6.5 hrs)
Priority order:
1. `/run-script` - Start orchestration
2. `/stop-script` - Stop services
3. `/info` - GPS and status data
4. `/script-status` - Process checking
5. `/kismet-data` - Device scan data

### Critical Files to Reference
- **Python Original**: `/home/pi/web/webhook.py`
- **Web UI**: `/home/pi/web/hi.html`
- **Dependency Map**: `WEBHOOK_DEPENDENCY_MAPPING.md`
- **Main Script**: `/home/pi/stinky/gps_kismet_wigle.sh`

## PATTERN APPLICATION OPPORTUNITIES

### Applicable Patterns for Webhook Migration
1. **Python to Node.js Hardware Migration** - For GPS integration
2. **API Compatibility Preservation** - Maintain exact response formats
3. **Real-time WebSocket Migration** - For potential real-time updates
4. **Complex System Documentation** - For comprehensive testing

### Time Savings Estimate
- Without patterns: 24-28 hours
- With patterns: 16-19 hours
- Savings: 8-9 hours (33% efficiency gain)

## SUCCESS CRITERIA

### Endpoint Validation
- hi.html must work without ANY modifications
- All 5 webhook endpoints must match Python responses exactly
- Process management must handle PIDs correctly
- GPS data must be retrieved successfully

### Performance Targets
- Response time: <50ms for status endpoints
- Process startup: <2s for orchestration script
- Memory usage: <50MB for webhook service
- Concurrent requests: Handle 10+ simultaneous

## RISK MITIGATION

### High-Risk Areas
1. **Child Process Management**: Complex PID handling required
2. **GPS Communication**: Untested node-gpsd integration
3. **File System Operations**: Multiple PID files to manage
4. **System Commands**: sudo operations need careful handling

### Mitigation Strategies
- Test each endpoint individually before integration
- Preserve Python webhook for rollback
- Use patterns for proven solutions
- Document all decisions in SESSION_CONTINUITY.md

## TESTING APPROACH

### Unit Testing (Per Endpoint)
```bash
# Test /run-script
curl -X POST http://localhost:8092/run-script

# Test /info
curl http://localhost:8092/info

# Test /script-status  
curl http://localhost:8092/script-status

# Test /kismet-data
curl http://localhost:8092/kismet-data
```

### Integration Testing
- Start services via hi.html interface
- Verify all status displays update
- Check GPS coordinates display
- Validate Kismet data feed

## DOCUMENTATION REQUIREMENTS

### Update These Files
1. **SESSION_CONTINUITY.md** - After each major step
2. **TODO.md** - Mark tasks complete as finished
3. **API Documentation** - Add webhook endpoints
4. **Operational Runbook** - Include webhook service

## EMERGENCY CONTACTS

### If Issues Arise
1. Check `WEBHOOK_DEPENDENCY_MAPPING.md` for detailed guidance
2. Reference patterns in `patterns/` directory
3. Python webhook at `/home/pi/web/webhook.py` for comparison
4. Rollback procedure documented in migration patterns

## FINAL NOTES

This is the LAST major component needed for full system functionality. Once webhook migration is complete:
- Full web UI control will be restored
- System orchestration will be available
- 24-hour production monitoring can begin
- Migration will be 100% complete

**Apply patterns aggressively** - We have 13 validated patterns that can save 8-9 hours on this migration.

**Document everything** - This is the final piece of a major migration success story.

---

Continue with: **Task 1 - Install webhook dependencies**
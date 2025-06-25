# OPERATIONAL RUNBOOK - NODE.JS SERVICES
**Stinkster Platform - Post-Migration Operations Guide**

## Service Overview

### Node.js Services (Production):
- **Spectrum Analyzer**: http://localhost:8092 (Node.js + Express + Socket.IO)
- **WigleToTAK Interface**: http://localhost:8000 (Node.js + Express)
- **GPS Bridge**: tcp://localhost:2947 (Node.js GPSD implementation)

### Process Management: PM2 Ecosystem

---

## DAILY OPERATIONS

### Starting Services:
```bash
# Start all services
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs
pm2 start ecosystem.config.js

# Verify startup
pm2 status
pm2 logs --lines 20
```

### Stopping Services:
```bash
# Stop all services
pm2 stop all

# Stop individual services
pm2 stop spectrum-analyzer
pm2 stop wigle-to-tak
pm2 stop gps-bridge

# Complete shutdown
pm2 delete all
```

### Health Monitoring:
```bash
# Service health checks
curl -f http://localhost:8092/api/status || echo "Spectrum Analyzer DOWN"
curl -f http://localhost:8000/api/status || echo "WigleToTAK DOWN"

# Performance monitoring
pm2 monit

# View real-time logs
pm2 logs --lines 50
```

---

## PERFORMANCE MONITORING

### Key Metrics to Monitor:
- **Response Time**: <15ms average (target: 12ms)
- **Memory Usage**: <35MB per service
- **CPU Usage**: <10% sustained
- **Error Rate**: <0.1% of requests

### Monitoring Commands:
```bash
# Response time check
time curl -s http://localhost:8092/api/status > /dev/null

# Memory usage
pm2 status | grep -E "(memory|cpu)"

# Error rate monitoring
grep -i error /home/pi/projects/stinkster_malone/stinkster/src/nodejs/logs/combined.log | wc -l

# Network connectivity
netstat -tulpn | grep -E ":(8092|8000|2947)"
```

### Performance Baseline:
- **Spectrum Analyzer**: 12ms avg response, 30MB memory
- **WigleToTAK**: 10ms avg response, 22MB memory  
- **GPS Bridge**: 5ms avg response, 18MB memory

---

## TROUBLESHOOTING PROCEDURES

### Service Won't Start:
```bash
# Check process conflicts
ps aux | grep -E "(node|python)" | grep -E "(8092|8000|2947)"

# Kill conflicting processes
pkill -f "python.*spectrum"
pkill -f "python.*wigle"

# Check port availability
netstat -tulpn | grep -E ":(8092|8000|2947)"

# Restart with verbose logging
pm2 start spectrum-analyzer --log-type
```

### High Memory Usage:
```bash
# Check memory per service
pm2 status

# Restart high-memory service
pm2 restart spectrum-analyzer

# Monitor memory growth
watch 'pm2 status | grep -E "(memory|spectrum)"'

# Memory leak detection
node --inspect src/nodejs/spectrum-analyzer/index.js
```

### API Not Responding:
```bash
# Test API endpoints
curl -v http://localhost:8092/api/status
curl -v http://localhost:8000/api/status

# Check service logs
pm2 logs spectrum-analyzer --lines 100
pm2 logs wigle-to-tak --lines 100

# Restart problematic service
pm2 restart spectrum-analyzer
```

### WebSocket Connection Issues:
```bash
# Test WebSocket connectivity
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:8092');
socket.on('connect', () => console.log('✅ Connected'));
socket.on('disconnect', () => console.log('❌ Disconnected'));
setTimeout(() => process.exit(), 5000);
"

# Check Socket.IO logs
grep -i websocket /home/pi/projects/stinkster_malone/stinkster/src/nodejs/logs/combined.log
```

---

## INTEGRATION MANAGEMENT

### OpenWebRX Integration:
```bash
# Verify OpenWebRX connectivity
curl -f http://localhost:8073 || echo "OpenWebRX DOWN"

# Test WebSocket integration
node src/nodejs/tests/integration/openwebrx-test.js

# Monitor spectrum data flow
curl http://localhost:8092/api/status | jq '.real_data'
```

### Kismet Integration:
```bash
# Check Kismet service
pgrep kismet || echo "Kismet not running"

# Verify CSV file monitoring
ls -la /home/pi/projects/stinkster_malone/stinkster/data/kismet/*.wiglecsv

# Test file processing
node src/nodejs/wigle-to-tak/test-csv-processing.js
```

### TAK Server Integration:
```bash
# Test UDP broadcasting
node -e "
const dgram = require('dgram');
const client = dgram.createSocket('udp4');
client.send('test', 6969, 'localhost', (err) => {
  console.log(err ? '❌ UDP failed' : '✅ UDP working');
  client.close();
});
"

# Monitor TAK message flow
tcpdump -i lo udp port 6969
```

---

## MAINTENANCE PROCEDURES

### Weekly Maintenance:
```bash
# Update Node.js dependencies
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs
npm audit fix

# Clear old logs
pm2 flush

# Restart all services
pm2 restart all

# Verify performance
node tests/performance/performance-test.js
```

### Log Management:
```bash
# View recent logs
pm2 logs --lines 50

# Clear logs
pm2 flush

# Archive logs
mkdir -p logs/archive/$(date +%Y-%m-%d)
cp logs/*.log logs/archive/$(date +%Y-%m-%d)/
```

### Configuration Updates:
```bash
# Update configuration
vi /home/pi/projects/stinkster_malone/stinkster/src/nodejs/config/index.js

# Validate configuration
node -e "console.log(require('./config/index.js'))"

# Apply changes
pm2 restart all
```

---

## SECURITY PROCEDURES

### Access Control:
- **Services run as**: 'pi' user (non-root)
- **File permissions**: 644 for configs, 755 for executables
- **Network binding**: localhost only (127.0.0.1)

### Security Monitoring:
```bash
# Check service users
ps aux | grep node | awk '{print $1}' | sort -u

# Verify network bindings
netstat -tulpn | grep node

# Check file permissions
ls -la /home/pi/projects/stinkster_malone/stinkster/src/nodejs/config/
```

### Vulnerability Management:
```bash
# Security audit
npm audit

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

---

## BACKUP PROCEDURES

### Configuration Backup:
```bash
# Create configuration backup
tar -czf config-backup-$(date +%Y%m%d).tar.gz src/nodejs/config/

# Backup service definitions
cp ecosystem.config.js ecosystem.config.js.backup
```

### Service Backup:
```bash
# Full service backup
tar -czf nodejs-services-$(date +%Y%m%d).tar.gz src/nodejs/

# Database/data backup (if applicable)
cp -r data/ data-backup-$(date +%Y%m%d)/
```

### Restore Procedures:
```bash
# Restore configuration
tar -xzf config-backup-YYYYMMDD.tar.gz

# Restore services
pm2 delete all
tar -xzf nodejs-services-YYYYMMDD.tar.gz
pm2 start ecosystem.config.js
```

---

## EMERGENCY PROCEDURES

### Service Failure Response:
1. **Identify failed service**: `pm2 status`
2. **Check logs**: `pm2 logs <service-name> --lines 100`
3. **Attempt restart**: `pm2 restart <service-name>`
4. **Verify recovery**: Test API endpoints
5. **Escalate if needed**: Contact development team

### System-Wide Failure:
1. **Stop all services**: `pm2 delete all`
2. **Check system resources**: `free -h`, `df -h`
3. **Emergency rollback**: `./migration-rollback.sh`
4. **Restore Flask services**: `systemctl start hackrf-scanner`
5. **Validate rollback**: Test Flask API endpoints

### Performance Degradation:
1. **Monitor metrics**: `pm2 monit`
2. **Identify bottleneck**: Check CPU, memory, network
3. **Scale vertically**: Restart with more resources
4. **Optimize configuration**: Adjust service parameters
5. **Consider horizontal scaling**: Multiple instances

---

## CONTACT INFORMATION

### Development Team:
- **Primary Contact**: Systems Administrator
- **Escalation**: Development Lead
- **Emergency**: On-call Engineer

### Documentation Updates:
- **Location**: `/home/pi/projects/stinkster_malone/stinkster/OPERATIONAL_RUNBOOK_NODEJS.md`
- **Update Frequency**: Monthly or after major changes
- **Review Process**: Operations team approval required

---

## APPENDIX: QUICK REFERENCE

### Most Common Commands:
```bash
# Service status
pm2 status

# Restart all
pm2 restart all

# View logs
pm2 logs --lines 20

# Health check
curl http://localhost:8092/api/status
curl http://localhost:8000/api/status

# Performance monitor
pm2 monit

# Emergency stop
pm2 delete all

# Emergency rollback
./migration-rollback.sh
```

### Key Log Locations:
- **PM2 Logs**: `~/.pm2/logs/`
- **Application Logs**: `src/nodejs/logs/`
- **System Logs**: `/var/log/syslog`

### Configuration Files:
- **Main Config**: `src/nodejs/config/index.js`
- **PM2 Config**: `ecosystem.config.js`
- **Package Config**: `src/nodejs/package.json`

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-06-15T23:45:00Z  
**Next Review**: 2025-07-15  
**Maintained By**: Operations Team
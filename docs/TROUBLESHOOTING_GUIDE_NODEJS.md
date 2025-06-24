# Node.js Services Troubleshooting Guide

## Document Overview

**Project**: Stinkster - Node.js Services  
**Version**: 2.0.0  
**Last Updated**: 2025-06-15T23:57:00Z  
**Scope**: Post-Migration Node.js Services Troubleshooting  

---

## Quick Diagnostic Commands

### Immediate Health Check
```bash
# Quick system status
echo "=== Node.js Services Quick Health Check ==="
pm2 status
netstat -tulpn | grep -E ":(8092|8000|2947)"
curl -sf http://localhost:8092/api/status || echo "❌ Spectrum Analyzer API Down"
curl -sf http://localhost:8000/ || echo "❌ WigleToTAK API Down"
nc -zv localhost 2947 || echo "❌ GPS Bridge Down"
```

### Service Process Check
```bash
# Check if Node.js processes are running
ps aux | grep -E "node.*stinkster" | grep -v grep

# Check PM2 process status
pm2 list

# Check systemd service status
sudo systemctl status stinkster-nodejs
```

### Resource Usage Check
```bash
# Memory usage
ps aux | grep -E "node.*stinkster" | awk '{print $11 ": " $6/1024 " MB"}'

# CPU usage
top -p $(pgrep -f "node.*stinkster" | tr '\n' ',' | sed 's/,$//')

# Disk space
df -h /home/pi/.pm2/logs/
```

---

## Common Issues and Solutions

### 1. Service Startup Issues

#### Issue: Services Won't Start
**Symptoms**:
- PM2 shows services in "errored" state
- Port binding errors in logs
- "Module not found" errors

**Diagnosis Steps**:
```bash
# Check PM2 status and errors
pm2 status
pm2 logs --lines 50

# Check port availability
netstat -tulpn | grep -E ":(8092|8000|2947)"

# Check Node.js modules
cd /home/pi/projects/stinkster_malone/stinkster/nodejs
npm list --depth=0

# Check file permissions
ls -la src/services/*/index.js
```

**Solutions**:

1. **Port Conflicts**:
```bash
# Kill conflicting processes
sudo pkill -f "python.*spectrum_analyzer"
sudo pkill -f "python.*WigletoTAK"
sudo pkill -f "python.*mavgps"

# Restart services
pm2 restart all
```

2. **Missing Dependencies**:
```bash
cd /home/pi/projects/stinkster_malone/stinkster/nodejs
rm -rf node_modules package-lock.json
npm install
pm2 restart all
```

3. **Permission Issues**:
```bash
sudo chown -R pi:pi /home/pi/projects/stinkster_malone/stinkster/nodejs
chmod +x src/services/*/index.js
pm2 restart all
```

#### Issue: PM2 Process Crashes Immediately
**Symptoms**:
- Services start then immediately exit
- PM2 shows high restart count
- "Exit code 1" in PM2 logs

**Diagnosis**:
```bash
# Check detailed PM2 logs
pm2 logs stinkster-spectrum --lines 100
pm2 logs stinkster-wigle --lines 100
pm2 logs stinkster-gps --lines 100

# Test manual startup
cd /home/pi/projects/stinkster_malone/stinkster/nodejs
NODE_ENV=development node src/services/spectrum-analyzer/index.js
```

**Solutions**:

1. **Configuration Errors**:
```bash
# Validate configuration
node -e "console.log(require('./src/config/index.js'))"

# Fix configuration syntax
# Edit src/config/index.js if syntax errors found
```

2. **Missing Environment Variables**:
```bash
# Set required environment variables
export NODE_ENV=production
export OPENWEBRX_URL=http://localhost:8073
export MAVLINK_CONNECTION=tcp:localhost:14550

# Update PM2 configuration
pm2 restart all --update-env
```

### 2. API Connectivity Issues

#### Issue: API Endpoints Not Responding
**Symptoms**:
- HTTP 404 or connection refused errors
- curl commands timeout
- Web interfaces not loading

**Diagnosis**:
```bash
# Test API endpoints directly
curl -v http://localhost:8092/api/status
curl -v http://localhost:8000/
telnet localhost 2947

# Check if services are binding to correct ports
netstat -tulpn | grep -E "node"

# Check firewall rules
sudo ufw status
iptables -L | grep -E "(8092|8000|2947)"
```

**Solutions**:

1. **Service Not Binding to Port**:
```bash
# Check PM2 environment variables
pm2 show stinkster-spectrum | grep -A 10 "env:"

# Update port configuration
pm2 set stinkster-spectrum PORT 8092
pm2 restart stinkster-spectrum
```

2. **Firewall Blocking**:
```bash
# Allow ports through firewall
sudo ufw allow 8092
sudo ufw allow 8000
sudo ufw allow 2947/tcp

# Restart services
pm2 restart all
```

#### Issue: API Responds with 500 Internal Server Error
**Symptoms**:
- HTTP 500 status codes
- Error messages in logs
- Some endpoints work, others don't

**Diagnosis**:
```bash
# Check application logs for errors
pm2 logs stinkster-spectrum | grep "ERROR"
pm2 logs stinkster-wigle | grep "ERROR"

# Test specific API endpoints
curl -v http://localhost:8092/api/status
curl -v http://localhost:8092/api/profiles
curl -v http://localhost:8000/list_wigle_files
```

**Solutions**:

1. **Missing Dependencies**:
```bash
# Check for missing modules
grep "Cannot find module" /home/pi/.pm2/logs/*.log

# Reinstall dependencies
cd /home/pi/projects/stinkster_malone/stinkster/nodejs
npm install
pm2 restart all
```

2. **External Service Dependencies**:
```bash
# Check OpenWebRX connectivity
curl -I http://localhost:8073

# Restart OpenWebRX if needed
docker restart openwebrx

# Check file system access
ls -la /home/pi/kismet_ops/
```

### 3. WebSocket Connection Issues

#### Issue: WebSocket Connections Failing
**Symptoms**:
- Browser console shows WebSocket errors
- Real-time features not working
- "Connection failed" messages

**Diagnosis**:
```bash
# Test WebSocket connection manually
wscat -c ws://localhost:8092/socket.io/?EIO=4&transport=websocket

# Check WebSocket upgrade headers
curl -I -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8092/socket.io/

# Check if Socket.IO is running
pm2 logs stinkster-spectrum | grep "socket"
```

**Solutions**:

1. **Socket.IO Configuration Issues**:
```bash
# Check Socket.IO setup in logs
pm2 logs stinkster-spectrum | grep -i "socket\|websocket"

# Restart service with verbose logging
pm2 restart stinkster-spectrum
```

2. **OpenWebRX WebSocket Issues**:
```bash
# Test OpenWebRX WebSocket directly
wscat -c ws://localhost:8073/ws/

# Check OpenWebRX container logs
docker logs openwebrx | tail -50

# Restart OpenWebRX container
docker restart openwebrx
```

### 4. Performance Issues

#### Issue: High Memory Usage
**Symptoms**:
- Node.js processes using >100MB RAM
- System becomes slow
- Out of memory errors

**Diagnosis**:
```bash
# Monitor memory usage over time
watch "ps aux | grep -E 'node.*stinkster' | awk '{print \$11 \": \" \$6/1024 \" MB\"}'"

# Check for memory leaks
node --inspect src/services/spectrum-analyzer/index.js
# Connect Chrome DevTools to analyze heap

# Check PM2 memory usage
pm2 monit
```

**Solutions**:

1. **Memory Leaks**:
```bash
# Restart services to clear memory
pm2 reload all

# Set memory limits in PM2
pm2 set stinkster-spectrum max_memory_restart 100M
pm2 set stinkster-wigle max_memory_restart 80M
pm2 set stinkster-gps max_memory_restart 50M
```

2. **Buffer Size Issues**:
```bash
# Check FFT buffer configuration
grep -r "maxBufferSize\|fftBuffer" src/
# Reduce buffer sizes in configuration if needed
```

#### Issue: High CPU Usage
**Symptoms**:
- Node.js processes using >20% CPU consistently
- System response becomes sluggish
- API requests slow

**Diagnosis**:
```bash
# Monitor CPU usage
top -p $(pgrep -f "node.*stinkster" | tr '\n' ',' | sed 's/,$//')

# Profile CPU usage
node --prof src/services/spectrum-analyzer/index.js
# Analyze with: node --prof-process isolate-*.log
```

**Solutions**:

1. **Optimize Data Processing**:
```bash
# Check for infinite loops in logs
pm2 logs | grep -E "loop\|infinite\|timeout"

# Restart services
pm2 restart all
```

2. **Reduce Processing Load**:
```bash
# Adjust processing intervals in configuration
# Edit src/config/index.js to increase intervals
pm2 restart all
```

### 5. Data Flow Issues

#### Issue: GPS Data Not Flowing
**Symptoms**:
- GPSD clients not receiving data
- GPS Bridge shows no connections
- Position data stale or missing

**Diagnosis**:
```bash
# Test GPS Bridge TCP connection
nc -zv localhost 2947

# Check GPS Bridge logs
pm2 logs stinkster-gps | tail -50

# Test GPSD protocol
echo '?WATCH={"enable":true,"json":true}' | nc localhost 2947
```

**Solutions**:

1. **MAVLink Connection Issues**:
```bash
# Check MAVLink connection
telnet localhost 14550

# Verify MAVLink service is running
ps aux | grep mavproxy

# Restart GPS services
pm2 restart stinkster-gps
```

2. **TCP Server Issues**:
```bash
# Check if TCP server is listening
netstat -tulpn | grep 2947

# Check for port conflicts
sudo lsof -i :2947

# Restart with different port if needed
export GPS_PORT=2948
pm2 restart stinkster-gps
```

#### Issue: WiFi Data Not Processing
**Symptoms**:
- WigleToTAK not processing CSV files
- No TAK messages being sent
- File monitoring not working

**Diagnosis**:
```bash
# Check CSV file availability
ls -la /home/pi/kismet_ops/*.wiglecsv

# Check file monitoring logs
pm2 logs stinkster-wigle | grep -i "file\|csv\|monitor"

# Test CSV parsing
head -5 /home/pi/kismet_ops/*.wiglecsv
```

**Solutions**:

1. **File Access Issues**:
```bash
# Check file permissions
ls -la /home/pi/kismet_ops/

# Fix permissions if needed
sudo chown -R pi:pi /home/pi/kismet_ops/

# Restart WigleToTAK service
pm2 restart stinkster-wigle
```

2. **CSV File Format Issues**:
```bash
# Validate CSV format
file /home/pi/kismet_ops/*.wiglecsv

# Check CSV headers
head -1 /home/pi/kismet_ops/*.wiglecsv

# Clear processed files cache if needed
# (Implementation-specific cleanup)
```

#### Issue: Spectrum Analysis Not Working
**Symptoms**:
- No FFT data in web interface
- OpenWebRX connection failed
- Signal detection not working

**Diagnosis**:
```bash
# Check OpenWebRX connectivity
curl -I http://localhost:8073

# Test WebSocket connection to OpenWebRX
wscat -c ws://localhost:8073/ws/

# Check spectrum analyzer logs
pm2 logs stinkster-spectrum | grep -i "openwebrx\|websocket\|fft"
```

**Solutions**:

1. **OpenWebRX Not Running**:
```bash
# Check Docker container status
docker ps | grep openwebrx

# Start OpenWebRX if needed
docker start openwebrx

# Check container logs
docker logs openwebrx
```

2. **WebSocket Authentication Issues**:
```bash
# Check OpenWebRX authentication
curl -c cookies.txt http://localhost:8073/login
# Check if authentication required

# Update WebSocket connection with auth
# (Edit spectrum analyzer WebSocket client code)
```

### 6. Integration Issues

#### Issue: TAK Broadcasting Not Working
**Symptoms**:
- TAK clients not receiving data
- UDP broadcast failures
- Network connectivity issues

**Diagnosis**:
```bash
# Test UDP broadcasting
node -e "
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.send('test', 6969, '239.2.3.1', (err) => {
    console.log(err ? 'Failed: ' + err : 'Success');
    socket.close();
});
"

# Check network interfaces
ip addr show
route -n
```

**Solutions**:

1. **Network Configuration**:
```bash
# Check multicast routing
ip route | grep 239.2.3.1

# Add multicast route if needed
sudo route add -net 239.0.0.0 netmask 255.0.0.0 dev wlan0

# Restart WigleToTAK service
pm2 restart stinkster-wigle
```

2. **Firewall Issues**:
```bash
# Allow UDP multicast
sudo ufw allow out 6969/udp
sudo ufw allow in 6969/udp

# Check iptables rules
sudo iptables -L | grep 6969
```

---

## Emergency Procedures

### 1. Complete Service Restart
```bash
#!/bin/bash
echo "=== Emergency Service Restart ==="

# Stop all services
pm2 kill
sudo systemctl stop stinkster-nodejs

# Wait for cleanup
sleep 5

# Check for hanging processes
ps aux | grep -E "node.*stinkster" | grep -v grep

# Kill any remaining processes
sudo pkill -f "node.*stinkster"

# Start services
sudo systemctl start stinkster-nodejs
pm2 start ecosystem.config.js

# Verify startup
sleep 10
pm2 status
curl -f http://localhost:8092/api/status
curl -f http://localhost:8000/
nc -zv localhost 2947

echo "=== Emergency Restart Complete ==="
```

### 2. Rollback to Flask Services
```bash
#!/bin/bash
echo "=== EMERGENCY: Rolling back to Flask services ==="

# Stop Node.js services
pm2 kill
sudo systemctl stop stinkster-nodejs

# Start Flask services
cd /home/pi/projects/stinkster_malone/stinkster/src/hackrf
source venv/bin/activate
nohup python spectrum_analyzer.py > /tmp/spectrum.log 2>&1 &

cd /home/pi/projects/stinkster_malone/stinkster/src/wigletotak/WigleToTAK
nohup python WigletoTAK.py > /tmp/wigle.log 2>&1 &

cd /home/pi/projects/stinkster_malone/stinkster/src/gpsmav
nohup python mavgps.py > /tmp/gps.log 2>&1 &

# Verify Flask services
sleep 5
curl -f http://localhost:8092/api/status
curl -f http://localhost:8000/
nc -zv localhost 2947

echo "=== Flask services restored ==="
echo "Node.js logs available in: /home/pi/.pm2/logs/"
echo "Flask logs in: /tmp/*.log"
```

### 3. Service Health Recovery
```bash
#!/bin/bash
echo "=== Service Health Recovery ==="

# Function to check service health
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    echo "Checking $service_name..."
    
    if curl -sf "$endpoint" > /dev/null 2>&1; then
        echo "✅ $service_name: Healthy"
        return 0
    else
        echo "❌ $service_name: Unhealthy"
        return 1
    fi
}

# Check each service
check_service "Spectrum Analyzer" 8092 "http://localhost:8092/api/status"
SPECTRUM_OK=$?

check_service "WigleToTAK" 8000 "http://localhost:8000/"
WIGLE_OK=$?

echo "Checking GPS Bridge..."
if nc -zv localhost 2947 > /dev/null 2>&1; then
    echo "✅ GPS Bridge: Healthy"
    GPS_OK=0
else
    echo "❌ GPS Bridge: Unhealthy"
    GPS_OK=1
fi

# Restart unhealthy services
if [ $SPECTRUM_OK -ne 0 ]; then
    echo "Restarting Spectrum Analyzer..."
    pm2 restart stinkster-spectrum
fi

if [ $WIGLE_OK -ne 0 ]; then
    echo "Restarting WigleToTAK..."
    pm2 restart stinkster-wigle
fi

if [ $GPS_OK -ne 0 ]; then
    echo "Restarting GPS Bridge..."
    pm2 restart stinkster-gps
fi

# Wait and recheck
sleep 10
echo "=== Rechecking after restart ==="
check_service "Spectrum Analyzer" 8092 "http://localhost:8092/api/status"
check_service "WigleToTAK" 8000 "http://localhost:8000/"
nc -zv localhost 2947 && echo "✅ GPS Bridge: Healthy" || echo "❌ GPS Bridge: Still unhealthy"
```

---

## Monitoring and Alerts

### 1. Automated Health Monitoring
```bash
#!/bin/bash
# /home/pi/scripts/health-monitor.sh
# Run this script via cron every 5 minutes

LOG_FILE="/var/log/nodejs-health.log"
ALERT_THRESHOLD=3  # Number of failures before alert

check_and_log() {
    local service=$1
    local test_command=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo "[$timestamp] ✅ $service: OK" >> "$LOG_FILE"
        # Reset failure counter
        echo "0" > "/tmp/${service}_failures"
    else
        # Increment failure counter
        local failures=$(cat "/tmp/${service}_failures" 2>/dev/null || echo "0")
        failures=$((failures + 1))
        echo "$failures" > "/tmp/${service}_failures"
        
        echo "[$timestamp] ❌ $service: FAILED (attempt $failures)" >> "$LOG_FILE"
        
        # Send alert if threshold reached
        if [ "$failures" -ge "$ALERT_THRESHOLD" ]; then
            echo "[$timestamp] 🚨 ALERT: $service has failed $failures times" >> "$LOG_FILE"
            # Add your alerting mechanism here (email, webhook, etc.)
        fi
        
        # Auto-restart on first failure
        if [ "$failures" -eq 1 ]; then
            echo "[$timestamp] 🔄 Auto-restarting $service" >> "$LOG_FILE"
            case "$service" in
                "spectrum") pm2 restart stinkster-spectrum ;;
                "wigle") pm2 restart stinkster-wigle ;;
                "gps") pm2 restart stinkster-gps ;;
            esac
        fi
    fi
}

# Monitor each service
check_and_log "spectrum" "curl -sf http://localhost:8092/api/status"
check_and_log "wigle" "curl -sf http://localhost:8000/"
check_and_log "gps" "nc -zv localhost 2947"

# Clean old log entries (keep last 1000 lines)
tail -1000 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
```

### 2. Performance Monitoring
```bash
#!/bin/bash
# /home/pi/scripts/performance-monitor.sh

LOG_FILE="/var/log/nodejs-performance.log"
timestamp=$(date '+%Y-%m-%d %H:%M:%S')

# Get memory usage
SPECTRUM_MEM=$(ps aux | grep stinkster-spectrum | grep -v grep | awk '{print $6}')
WIGLE_MEM=$(ps aux | grep stinkster-wigle | grep -v grep | awk '{print $6}')
GPS_MEM=$(ps aux | grep stinkster-gps | grep -v grep | awk '{print $6}')

# Get CPU usage (simplified)
TOTAL_CPU=$(ps aux | grep "node.*stinkster" | grep -v grep | awk '{sum+=$3} END {print sum}')

# Log performance data
echo "[$timestamp] Memory: Spectrum=${SPECTRUM_MEM}KB, Wigle=${WIGLE_MEM}KB, GPS=${GPS_MEM}KB, CPU=${TOTAL_CPU}%" >> "$LOG_FILE"

# Alert on high memory usage (>100MB per service)
[ "${SPECTRUM_MEM:-0}" -gt 102400 ] && echo "[$timestamp] 🚨 ALERT: Spectrum Analyzer high memory: ${SPECTRUM_MEM}KB" >> "$LOG_FILE"
[ "${WIGLE_MEM:-0}" -gt 102400 ] && echo "[$timestamp] 🚨 ALERT: WigleToTAK high memory: ${WIGLE_MEM}KB" >> "$LOG_FILE"
[ "${GPS_MEM:-0}" -gt 102400 ] && echo "[$timestamp] 🚨 ALERT: GPS Bridge high memory: ${GPS_MEM}KB" >> "$LOG_FILE"

# Alert on high CPU usage (>50% total)
if (( $(echo "${TOTAL_CPU:-0} > 50" | bc -l) )); then
    echo "[$timestamp] 🚨 ALERT: High CPU usage: ${TOTAL_CPU}%" >> "$LOG_FILE"
fi
```

---

## Log Analysis

### 1. Common Error Patterns
```bash
# Search for common error patterns
grep -E "ERROR|FATAL|Exception" /home/pi/.pm2/logs/*.log

# Memory-related errors
grep -E "out of memory|heap|allocation failed" /home/pi/.pm2/logs/*.log

# Network-related errors
grep -E "ECONNREFUSED|EADDRINUSE|timeout|network" /home/pi/.pm2/logs/*.log

# File system errors
grep -E "ENOENT|EACCES|permission denied|no such file" /home/pi/.pm2/logs/*.log
```

### 2. Performance Analysis
```bash
# Response time analysis
grep "response time" /home/pi/.pm2/logs/*.log | awk '{print $NF}' | sort -n

# Memory usage trends
grep "Memory usage" /home/pi/.pm2/logs/*.log | tail -20

# Connection statistics
grep -E "connected|disconnected" /home/pi/.pm2/logs/*.log | tail -10
```

---

## Contact Information

### Escalation Levels
1. **Level 1**: Use this troubleshooting guide and restart procedures
2. **Level 2**: Check logs and contact technical team if issues persist
3. **Level 3**: Emergency rollback to Flask services if critical functionality lost

### Support Resources
- **Documentation**: `/home/pi/projects/stinkster_malone/stinkster/docs/`
- **Logs**: `/home/pi/.pm2/logs/` and `/var/log/nodejs-*.log`
- **Configuration**: `/home/pi/projects/stinkster_malone/stinkster/nodejs/src/config/`
- **Emergency Scripts**: `/home/pi/scripts/`

---

**Document Version**: 1.0  
**Last Updated**: 2025-06-15T23:57:00Z  
**Next Review**: Weekly during stabilization period  

---

*This troubleshooting guide should be updated as new issues are discovered and resolved. Keep it current with operational experience.*
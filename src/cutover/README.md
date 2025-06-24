# Stinkster System Cutover & Monitoring

This directory contains all the tools and procedures for migrating from the legacy Python-based system to the new Node.js-based Stinkster system.

## Quick Start

### 1. Capture Baseline (Before Migration)
```bash
./scripts/capture-baseline.sh
```

### 2. Start Canary Deployment (10% Traffic)
```bash
sudo ./scripts/deploy-canary.sh
./scripts/configure-traffic-split.sh 10
```

### 3. Monitor Performance
```bash
# Start monitoring dashboard
cd monitoring
npm install
node performance-monitor.js

# Access dashboard at http://localhost:3005
```

### 4. Gradual Traffic Increase
```bash
# After successful canary phase
./scripts/configure-traffic-split.sh 50  # 50% traffic
./scripts/configure-traffic-split.sh 100 # Full migration
```

### 5. Post-Deployment Validation
```bash
./scripts/post-deployment-validation.sh
```

## Directory Structure

```
cutover/
├── docs/
│   └── CUTOVER_PLAN.md          # Comprehensive migration plan
├── scripts/
│   ├── capture-baseline.sh      # Capture system metrics before migration
│   ├── deploy-canary.sh         # Deploy new services alongside old
│   ├── configure-traffic-split.sh # Control traffic distribution
│   ├── disable-legacy-services.sh # Stop old Python services
│   ├── quick-rollback.sh        # Emergency rollback (<1 minute)
│   ├── full-rollback.sh         # Complete system rollback (<5 minutes)
│   └── post-deployment-validation.sh # Validate migration success
├── monitoring/
│   ├── performance-monitor.js   # Real-time monitoring server
│   └── dashboard.html          # Web-based monitoring dashboard
├── configs/
│   └── monitoring-canary.json  # Monitoring configuration
└── baseline/                   # Baseline metrics storage
```

## Migration Phases

### Phase 1: Canary Deployment (2 hours)
- Deploy new services on alternate ports
- Route 10% of traffic to new system
- Monitor for critical issues

### Phase 2: Expanded Rollout (4 hours)
- Increase traffic to 50%
- Run load tests
- Verify all integrations

### Phase 3: Full Deployment (2 hours)
- Route 100% traffic to new system
- Disable legacy services
- Final validation

### Phase 4: Stabilization (24 hours)
- Continuous monitoring
- Performance optimization
- User feedback collection

## Rollback Procedures

### Quick Rollback (Emergency)
Use when immediate reversion is needed:
```bash
sudo ./scripts/quick-rollback.sh
```
- Reverts traffic to legacy system
- Stops new services
- Execution time: < 1 minute

### Full Rollback (Complete)
Use for comprehensive system restoration:
```bash
sudo ./scripts/full-rollback.sh
```
- Performs quick rollback first
- Restores all configurations
- Re-enables legacy services
- Execution time: < 5 minutes

## Monitoring

### Real-time Dashboard
The monitoring dashboard provides:
- Traffic distribution visualization
- Service health status
- System resource usage
- Response time graphs
- Alert notifications

Access at: `http://localhost:3005`

### Key Metrics
- **Response Time**: Target < 200ms (p95)
- **Error Rate**: Target < 0.1%
- **Memory Usage**: Target < 200MB per service
- **CPU Usage**: Target < 50% during peak

## Success Criteria

Migration is considered successful when:
1. All services pass health checks
2. Error rate remains below 0.1%
3. Response times meet targets
4. No memory leaks detected
5. All integrations functional
6. User acceptance confirmed

## Troubleshooting

### Service Won't Start
```bash
# Check logs
tail -f /var/log/stinkster-migration/*.log

# Verify ports are free
netstat -tuln | grep -E ":(3001|3002|3003|3004)"
```

### High Error Rate
```bash
# Check nginx logs
tail -f /var/log/nginx/stinkster-error.log

# Review application logs
tail -f /var/log/stinkster/*.log
```

### Performance Issues
```bash
# Check resource usage
htop

# Review monitoring dashboard
http://localhost:3005
```

## Post-Migration

After successful migration:
1. Archive migration logs
2. Update documentation
3. Remove legacy code (after 30 days)
4. Optimize based on metrics
5. Plan feature enhancements

## Support

For issues during migration:
1. Check logs in `/var/log/stinkster-migration/`
2. Review monitoring dashboard
3. Consult rollback reports
4. Contact: Christian

---

**Important**: Always capture a baseline before starting migration and ensure backups are current.
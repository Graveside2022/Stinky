# Stinkster System Cutover Plan

## Executive Summary
This document outlines the phased cutover plan for migrating from the legacy Python-based system to the new Node.js-based Stinkster system. The plan includes a gradual rollout strategy, monitoring procedures, and rollback capabilities to ensure minimal downtime and service disruption.

## Migration Overview

### Systems Being Migrated
1. **HackRF Spectrum Analyzer**: Python → Node.js
2. **WigleToTAK**: Python Flask → Node.js Express
3. **Kismet Operations**: Legacy scripts → Integrated Node.js service
4. **GPS Services**: Direct integration → Unified API

### Migration Timeline
- **Phase 1**: Canary deployment (10% traffic) - 2 hours
- **Phase 2**: Expanded rollout (50% traffic) - 4 hours
- **Phase 3**: Full deployment (100% traffic) - 2 hours
- **Stabilization Period**: 24 hours monitoring

## Phase 1: Pre-Cutover Preparation

### Prerequisites
- [ ] All Node.js services tested and validated
- [ ] Backup of current system completed
- [ ] Monitoring infrastructure ready
- [ ] Rollback scripts tested
- [ ] Team briefed on procedures

### System Health Baseline
Capture current system metrics for comparison:
```bash
# Run baseline capture script
/home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/capture-baseline.sh
```

### Service Dependencies
1. **Kismet**: Must be running on port 2501
2. **GPSD**: Must be active on port 2947
3. **HackRF**: Device must be connected and accessible
4. **Network**: Stable connection required

## Phase 2: Canary Deployment (10% Traffic)

### Duration: 2 hours

### Steps:
1. **Deploy new services alongside existing**
   ```bash
   sudo /home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/deploy-canary.sh
   ```

2. **Configure load balancer for 10% traffic split**
   ```bash
   sudo /home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/configure-traffic-split.sh 10
   ```

3. **Monitor key metrics**
   - Response times
   - Error rates
   - Resource usage
   - WebSocket stability

### Success Criteria:
- Error rate < 0.1%
- Response time < 200ms (p95)
- Memory usage stable
- No WebSocket disconnections

### Rollback Trigger:
- Error rate > 1%
- Response time > 500ms
- Service crashes
- Data corruption detected

## Phase 3: Expanded Rollout (50% Traffic)

### Duration: 4 hours

### Steps:
1. **Increase traffic to new system**
   ```bash
   sudo /home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/configure-traffic-split.sh 50
   ```

2. **Scale monitoring**
   - Enable detailed logging
   - Increase metric collection frequency
   - Activate alert thresholds

3. **Performance validation**
   - Run load tests
   - Verify data accuracy
   - Check integration points

### Success Criteria:
- All Phase 2 criteria maintained
- Load test passed (100 concurrent users)
- All integrations functional
- No memory leaks detected

## Phase 4: Full Deployment (100% Traffic)

### Duration: 2 hours

### Steps:
1. **Complete traffic migration**
   ```bash
   sudo /home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/configure-traffic-split.sh 100
   ```

2. **Disable legacy services**
   ```bash
   sudo /home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/disable-legacy-services.sh
   ```

3. **Final validation**
   - All endpoints responsive
   - WebSocket connections stable
   - Data flow verified
   - User acceptance confirmed

### Success Criteria:
- 100% feature parity achieved
- Performance meets or exceeds baseline
- Zero data loss
- All users successfully migrated

## Phase 5: Stabilization Period

### Duration: 24 hours

### Monitoring Focus:
1. **System Stability**
   - Service uptime
   - Memory/CPU trends
   - Disk usage
   - Network performance

2. **Application Metrics**
   - Request success rate
   - Response times
   - WebSocket connections
   - Data processing accuracy

3. **User Experience**
   - Page load times
   - Feature functionality
   - Error messages
   - Performance perception

## Monitoring Procedures

### Real-time Dashboard
Access the monitoring dashboard:
```
http://localhost:3001/admin/monitoring
```

### Key Metrics to Track:
1. **Service Health**
   - Uptime percentage
   - Health check status
   - Process status
   - Port availability

2. **Performance Metrics**
   - Request latency (p50, p95, p99)
   - Throughput (requests/second)
   - Error rate
   - Resource utilization

3. **Business Metrics**
   - Active connections
   - Data processing rate
   - Feature usage
   - User sessions

### Alert Thresholds:
- **Critical**: Service down, error rate > 5%
- **Warning**: Response time > 300ms, memory > 80%
- **Info**: Traffic spike, new deployment

## Rollback Procedures

### Automatic Rollback Triggers:
1. Service crash with no recovery in 60 seconds
2. Error rate exceeds 5% for 5 minutes
3. Response time > 1000ms for 10 minutes
4. Health checks fail 3 times consecutively

### Manual Rollback Process:

#### Quick Rollback (< 1 minute):
```bash
sudo /home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/quick-rollback.sh
```

#### Full Rollback (< 5 minutes):
```bash
sudo /home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/full-rollback.sh
```

### Rollback Verification:
1. Legacy services restored
2. Traffic routing reverted
3. Data integrity confirmed
4. User access verified

## Post-Deployment Checklist

### Immediate (First Hour):
- [ ] All services running
- [ ] Health checks passing
- [ ] No critical alerts
- [ ] User access confirmed
- [ ] Data flow verified

### Short-term (First Day):
- [ ] Performance baseline met
- [ ] Error rate acceptable
- [ ] Resource usage stable
- [ ] Backup systems decommissioned
- [ ] Documentation updated

### Long-term (First Week):
- [ ] Performance optimization completed
- [ ] User feedback addressed
- [ ] Monitoring refined
- [ ] Runbooks updated
- [ ] Team training completed

## Communication Plan

### Stakeholder Notifications:
1. **Pre-cutover**: 24 hours notice
2. **Cutover start**: Immediate notification
3. **Phase completion**: Status updates
4. **Issues**: Real-time alerts
5. **Completion**: Final report

### Communication Channels:
- Email: Team distribution list
- Slack: #stinkster-migration
- Dashboard: Live status page
- Logs: Centralized logging system

## Risk Mitigation

### Identified Risks:
1. **Data Loss**
   - Mitigation: Real-time replication, verified backups
   
2. **Service Disruption**
   - Mitigation: Phased rollout, quick rollback capability
   
3. **Performance Degradation**
   - Mitigation: Load testing, resource monitoring
   
4. **Integration Failures**
   - Mitigation: Comprehensive testing, fallback modes

### Contingency Plans:
1. **Complete System Failure**: Revert to backup hardware
2. **Data Corruption**: Restore from latest backup
3. **Network Issues**: Local operation mode
4. **Resource Exhaustion**: Emergency scaling procedures

## Success Metrics

### Technical Success:
- Zero data loss
- < 5 minutes total downtime
- All features functional
- Performance improved by 20%

### Business Success:
- User satisfaction maintained
- No operational disruption
- Cost reduction achieved
- Maintenance simplified

## Appendices

### A. Script Locations
All scripts located in: `/home/pi/projects/stinkster_christian/stinkster/src/cutover/scripts/`

### B. Configuration Files
Configurations in: `/home/pi/projects/stinkster_christian/stinkster/src/cutover/configs/`

### C. Log Locations
- Migration logs: `/var/log/stinkster-migration/`
- Service logs: `/var/log/stinkster/`
- Monitoring logs: `/var/log/stinkster-monitoring/`

### D. Contact Information
- Migration Lead: Christian
- Emergency Contact: System Admin
- Support Channel: #stinkster-support

---

**Document Version**: 1.0  
**Last Updated**: December 23, 2025  
**Next Review**: Post-migration + 30 days
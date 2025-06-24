# Webhook Converter Orchestrator Commands

## Overview

This file contains orchestrator commands for managing the Python-to-Node.js webhook converter
migration workflow. It defines the execution phases, agent coordination, validation checkpoints, and
file management procedures.

## Pre-requisites

### Required Files

- `/home/pi/projects/stinkster_malone/stinkster/WEBHOOK_DEPENDENCY_MAPPING.md` - Dependencies and
  integration points
- `/home/pi/projects/stinkster_malone/stinkster/WEBHOOK_TESTING_STRATEGY.md` - Testing approach and
  validation criteria
- `/home/pi/projects/stinkster_malone/stinkster/WEBHOOK_ACCEPTANCE_CRITERIA.md` - Success metrics
  and requirements
- `/home/pi/projects/stinkster_malone/stinkster/WEBHOOK_ROLLBACK_PROCEDURES.md` - Recovery and
  rollback steps

### System Requirements

- Node.js v18+ installed
- Python 3.8+ for compatibility testing
- Access to test TAK server endpoints
- Kismet instance for integration testing
- Git repository initialized for version control

### Initial Setup

```bash
# Verify Node.js installation
node --version

# Check Python environment
python3 --version

# Ensure test directories exist
mkdir -p /home/pi/projects/stinkster_malone/stinkster/tests/webhook
mkdir -p /home/pi/projects/stinkster_malone/stinkster/src/nodejs/webhook

# Initialize package.json if not exists
cd /home/pi/projects/stinkster_malone/stinkster
[ ! -f package.json ] && npm init -y
```

## Phase 1: Analysis and Architecture

### Agent 1: Dependency Analysis

```yaml
task: 'Analyze Python webhook implementation and map dependencies'
inputs:
  - /home/pi/projects/stinkster_malone/stinkster/src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py
  - /home/pi/projects/stinkster_malone/stinkster/WEBHOOK_DEPENDENCY_MAPPING.md
outputs:
  - AGENT1_DEPENDENCY_ANALYSIS.json
  - AGENT1_ARCHITECTURE_MAPPING.md
validation:
  - All Python dependencies identified
  - Node.js equivalents mapped
  - Integration points documented
```

### Agent 2: Interface Design

```yaml
task: 'Design Node.js webhook interface maintaining API compatibility'
inputs:
  - AGENT1_DEPENDENCY_ANALYSIS.json
  - /home/pi/projects/stinkster_malone/stinkster/WEBHOOK_ACCEPTANCE_CRITERIA.md
outputs:
  - AGENT2_INTERFACE_DESIGN.md
  - AGENT2_API_SPECIFICATION.json
validation:
  - API endpoints match Python implementation
  - Request/response formats preserved
  - Authentication methods compatible
```

### Phase 1 Consolidation

```yaml
checkpoint: 'Architecture Validation'
inputs:
  - AGENT1_ARCHITECTURE_MAPPING.md
  - AGENT2_INTERFACE_DESIGN.md
outputs:
  - PHASE1_ARCHITECTURE_APPROVED.md
criteria:
  - All dependencies have Node.js solutions
  - API design maintains backward compatibility
  - No blocking issues identified
action_on_failure: 'Review and adjust architecture before proceeding'
```

## Phase 2: Implementation

### Agent 3: Core Webhook Implementation

```yaml
task: 'Implement Node.js webhook receiver with Kismet integration'
inputs:
  - PHASE1_ARCHITECTURE_APPROVED.md
  - AGENT2_API_SPECIFICATION.json
outputs:
  - src/nodejs/webhook/webhookReceiver.js
  - src/nodejs/webhook/kismetClient.js
  - AGENT3_IMPLEMENTATION_NOTES.md
validation:
  - Code follows Node.js best practices
  - Error handling implemented
  - Logging configured
```

### Agent 4: TAK Integration

```yaml
task: 'Implement TAK message formatting and transmission'
inputs:
  - AGENT3_IMPLEMENTATION_NOTES.md
  - /home/pi/projects/stinkster_malone/stinkster/WEBHOOK_DEPENDENCY_MAPPING.md
outputs:
  - src/nodejs/webhook/takFormatter.js
  - src/nodejs/webhook/takTransmitter.js
  - AGENT4_TAK_INTEGRATION.md
validation:
  - TAK message format matches Python output
  - UDP/TCP transmission working
  - Error recovery implemented
```

### Agent 5: Configuration Management

```yaml
task: 'Create configuration system matching Python behavior'
inputs:
  - AGENT3_IMPLEMENTATION_NOTES.md
  - AGENT4_TAK_INTEGRATION.md
outputs:
  - src/nodejs/webhook/config.js
  - config/webhook-settings.json
  - AGENT5_CONFIG_MAPPING.md
validation:
  - All Python config options supported
  - Environment variable support
  - Config validation implemented
```

### Phase 2 Consolidation

```yaml
checkpoint: 'Implementation Review'
inputs:
  - src/nodejs/webhook/*.js
  - AGENT[3-5]_*.md
outputs:
  - PHASE2_IMPLEMENTATION_COMPLETE.md
  - PHASE2_CODE_REVIEW.json
criteria:
  - All core functionality implemented
  - Code passes linting
  - Unit tests written for critical paths
action_on_failure: 'Fix implementation issues before testing'
```

## Phase 3: Testing and Validation

### Agent 6: Unit Testing

```yaml
task: 'Create comprehensive unit test suite'
inputs:
  - PHASE2_IMPLEMENTATION_COMPLETE.md
  - /home/pi/projects/stinkster_malone/stinkster/WEBHOOK_TESTING_STRATEGY.md
outputs:
  - tests/webhook/webhookReceiver.test.js
  - tests/webhook/takFormatter.test.js
  - AGENT6_UNIT_TEST_REPORT.md
validation:
  - 80%+ code coverage
  - All edge cases tested
  - Mocking strategy implemented
```

### Agent 7: Integration Testing

```yaml
task: 'Test webhook integration with Kismet and TAK'
inputs:
  - AGENT6_UNIT_TEST_REPORT.md
  - /home/pi/projects/stinkster_malone/stinkster/WEBHOOK_TESTING_STRATEGY.md
outputs:
  - tests/webhook/integration.test.js
  - AGENT7_INTEGRATION_REPORT.md
  - test-results/webhook-integration.json
validation:
  - Kismet webhook delivery confirmed
  - TAK message reception verified
  - End-to-end flow tested
```

### Agent 8: Compatibility Testing

```yaml
task: 'Verify Python-Node.js compatibility'
inputs:
  - AGENT7_INTEGRATION_REPORT.md
  - /home/pi/projects/stinkster_malone/stinkster/WEBHOOK_ACCEPTANCE_CRITERIA.md
outputs:
  - tests/webhook/compatibility.test.js
  - AGENT8_COMPATIBILITY_MATRIX.md
  - test-results/compatibility-report.json
validation:
  - API responses identical
  - Message formats match
  - Performance within 10% of Python
```

### Phase 3 Consolidation

```yaml
checkpoint: 'Testing Validation'
inputs:
  - AGENT[6-8]_*.md
  - test-results/*.json
outputs:
  - PHASE3_TESTING_COMPLETE.md
  - PHASE3_TEST_SUMMARY.json
criteria:
  - All tests passing
  - Coverage >80%
  - Performance acceptable
  - No compatibility issues
action_on_failure: 'Fix failing tests and re-run validation'
```

## Phase 4: Migration and Deployment

### Agent 9: Migration Script

```yaml
task: 'Create migration script for seamless transition'
inputs:
  - PHASE3_TESTING_COMPLETE.md
  - /home/pi/projects/stinkster_malone/stinkster/WEBHOOK_ROLLBACK_PROCEDURES.md
outputs:
  - scripts/migrate-webhook-to-nodejs.sh
  - scripts/rollback-webhook.sh
  - AGENT9_MIGRATION_GUIDE.md
validation:
  - Backup procedures included
  - Rollback tested
  - Zero-downtime migration possible
```

### Agent 10: Documentation

```yaml
task: 'Create comprehensive documentation'
inputs:
  - PHASE3_TESTING_COMPLETE.md
  - All previous agent outputs
outputs:
  - docs/webhook-nodejs-api.md
  - docs/webhook-migration-guide.md
  - AGENT10_DOCUMENTATION_COMPLETE.md
validation:
  - API documentation complete
  - Migration steps clear
  - Troubleshooting guide included
```

### Phase 4 Final Consolidation

```yaml
checkpoint: 'Deployment Readiness'
inputs:
  - AGENT[9-10]_*.md
  - All implementation files
  - All test results
outputs:
  - WEBHOOK_MIGRATION_COMPLETE.md
  - FINAL_DEPLOYMENT_CHECKLIST.md
criteria:
  - All acceptance criteria met
  - Documentation complete
  - Rollback procedures tested
  - Performance validated
action_on_failure: 'Do not proceed with deployment'
```

## Error Handling Procedures

### Phase Failure Protocol

```yaml
on_phase_failure:
  1. Generate failure report with specific issues 2. Create remediation plan 3. Re-run failed agents
  with fixes 4. Validate fixes before proceeding 5. Update rollback procedures if needed
```

### Agent Failure Recovery

```yaml
on_agent_failure:
  1. Capture error details in AGENT#_ERROR.log 2. Analyze dependencies and inputs 3. Attempt
  automatic recovery if possible 4. Escalate to phase consolidation if unrecoverable 5. Document
  failure pattern for future prevention
```

### Critical Error Handling

```yaml
critical_errors:
  - Kismet connection failure: Check service status, verify endpoints
  - TAK transmission failure: Validate network, check firewall rules
  - Data corruption: Restore from backup, investigate root cause
  - Performance degradation: Profile code, optimize bottlenecks
```

## File Management

### Output File Organization

```
/home/pi/projects/stinkster_malone/stinkster/
├── .claude/
│   └── webhook-migration/
│       ├── phase1/
│       │   ├── AGENT1_*.{md,json}
│       │   ├── AGENT2_*.{md,json}
│       │   └── PHASE1_ARCHITECTURE_APPROVED.md
│       ├── phase2/
│       │   ├── AGENT[3-5]_*.md
│       │   └── PHASE2_IMPLEMENTATION_COMPLETE.md
│       ├── phase3/
│       │   ├── AGENT[6-8]_*.md
│       │   ├── test-results/
│       │   └── PHASE3_TESTING_COMPLETE.md
│       └── phase4/
│           ├── AGENT[9-10]_*.md
│           └── WEBHOOK_MIGRATION_COMPLETE.md
```

### Artifact Preservation

```yaml
preserve_always:
  - All AGENT*_*.md files
  - All PHASE*_*.md files
  - Test results and reports
  - Error logs and remediation plans

archive_after_success:
  - Intermediate JSON files
  - Debug logs
  - Temporary test data

cleanup_after_validation:
  - Build artifacts
  - Test coverage reports
  - Performance profiling data
```

## Execution Commands

### Start Full Migration

```bash
# Initialize migration environment
./claude orchestrate webhook-migration --phase all

# Or execute specific phase
./claude orchestrate webhook-migration --phase 1
./claude orchestrate webhook-migration --phase 2 --continue
```

### Validation Commands

```bash
# Run phase validation
./claude validate webhook-migration --phase 3

# Check overall progress
./claude status webhook-migration

# Generate progress report
./claude report webhook-migration --format markdown > migration-status.md
```

### Rollback Commands

```bash
# Rollback to Python implementation
./scripts/rollback-webhook.sh

# Partial rollback (keeps Node.js code)
./scripts/rollback-webhook.sh --preserve-code

# Emergency rollback
./scripts/rollback-webhook.sh --emergency --skip-backup
```

## Success Criteria Summary

### Phase 1 Success

- All dependencies mapped to Node.js equivalents
- API design maintains 100% compatibility
- Architecture approved by validation checkpoint

### Phase 2 Success

- Core implementation complete and functional
- All integration points connected
- Code review passed with no blockers

### Phase 3 Success

- Unit test coverage >80%
- Integration tests passing
- Performance within acceptable range
- Zero compatibility issues

### Phase 4 Success

- Migration script tested and working
- Documentation comprehensive
- Rollback procedures validated
- All acceptance criteria met

## Notes for Orchestrator

1. Each agent must complete successfully before next agent starts within a phase
2. Phase consolidation is mandatory - cannot skip to next phase
3. All output files must be validated for format and completeness
4. Error logs must be preserved even on success for audit trail
5. Performance metrics should be collected throughout for comparison
6. Backup current Python implementation before any migration steps
7. Test in isolated environment before production deployment

---

Generated: 2025-01-18 Framework: Claude Enhancement Framework v1.0.0 Purpose: Webhook Python to
Node.js Migration Orchestration

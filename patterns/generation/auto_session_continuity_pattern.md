# Auto Session Continuity Pattern

## Trigger Conditions

- Start of new session
- Boot context activation
- Session state recovery
- Memory persistence requirements
- Cross-session task handoff

## Template Structure

### Session Continuity Data Model

```json
{
  "session_id": "timestamp-based-id",
  "project_context": "stinkster",
  "last_updated": "ISO-8601-timestamp",
  "active_tasks": [
    {
      "id": "task-uuid",
      "status": "pending|in_progress|completed",
      "type": "sdr|wifi|gps|tak|orchestration",
      "priority": "high|medium|low",
      "description": "task description",
      "dependencies": ["task-uuid-list"],
      "created": "timestamp",
      "updated": "timestamp"
    }
  ],
  "system_state": {
    "services": {
      "kismet": { "status": "running|stopped", "pid": "12345" },
      "hackrf": { "status": "running|stopped", "port": "8092" },
      "openwebrx": { "status": "running|stopped", "port": "8073" },
      "wigletotak": { "status": "running|stopped", "port": "8000" },
      "gps_bridge": { "status": "running|stopped", "port": "2947" }
    },
    "last_known_configs": {
      "sdr_frequency": "145000000",
      "kismet_interfaces": ["wlan2"],
      "tak_server": "broadcast:6969"
    }
  },
  "patterns_applied": [
    {
      "pattern": "flask_app_generation",
      "timestamp": "ISO-8601",
      "success": true,
      "notes": "pattern application notes"
    }
  ],
  "memory_context": {
    "error_patterns": ["recent-error-patterns"],
    "learning_archive": ["recent-learning-entries"],
    "side_effects": ["recent-side-effects"]
  }
}
```

### Auto-Generation Template

```python
def generate_session_continuity():
    """Auto-generate session continuity file"""

    # 1. Detect current project state
    project_state = detect_project_state()

    # 2. Scan for active services
    active_services = scan_system_services()

    # 3. Load previous session if exists
    previous_session = load_previous_session()

    # 4. Merge and update state
    current_session = merge_session_state(
        project_state,
        active_services,
        previous_session
    )

    # 5. Generate continuity file
    write_session_continuity(current_session)

    return current_session

def detect_project_state():
    """Detect current stinkster project state"""
    return {
        "docker_containers": check_docker_status(),
        "python_venvs": check_virtual_envs(),
        "nodejs_services": check_nodejs_services(),
        "systemd_services": check_systemd_services(),
        "config_files": validate_config_files()
    }

def scan_system_services():
    """Scan for stinkster-specific services"""
    services = {}

    # Check standard ports
    port_checks = {
        "kismet": 2501,
        "hackrf": 8092,
        "openwebrx": 8073,
        "wigletotak": 8000,
        "gps_bridge": 2947
    }

    for service, port in port_checks.items():
        services[service] = {
            "status": "running" if check_port(port) else "stopped",
            "port": port,
            "pid": get_pid_for_port(port)
        }

    return services
```

## Validation Steps

### 1. Session File Validation

- Verify JSON structure validity
- Check timestamp format (ISO-8601)
- Validate service status consistency
- Ensure task dependencies are valid

### 2. State Consistency Checks

```bash
# Check service states match reality
systemctl status kismet || echo "kismet not systemd managed"
pgrep -f "spectrum_analyzer" || echo "hackrf not running"
docker ps | grep openwebrx || echo "openwebrx not running"
netstat -tulpn | grep :8000 || echo "wigletotak not running"

# Validate configuration files
test -f /home/pi/projects/stinkster_malone/stinkster/config.json
test -f /home/pi/projects/stinkster_malone/stinkster/docker-compose.yml
```

### 3. Recovery Validation

- Test session recovery from continuity file
- Verify service restart capability
- Check configuration restore functionality
- Validate task queue restoration

## Integration Points

### Flask App Generation

- Include Flask app state in session continuity
- Track Flask service ports and status
- Monitor Flask app configuration changes

### SDR Integration

- Track HackRF device state
- Monitor spectrum analyzer status
- Include SDR configuration in continuity

### Service Orchestration

- Track orchestration script states
- Monitor service dependencies
- Include process management state

## Pattern Application

### When to Apply

1. **Boot Context**: Always apply during boot initialization
2. **Task Handoff**: Apply when transferring between sessions
3. **Error Recovery**: Apply after system errors or crashes
4. **Configuration Changes**: Apply after major config updates

### Application Process

1. Load existing SESSION_CONTINUITY.md
2. Compare with current system state
3. Identify discrepancies and conflicts
4. Update continuity file with current state
5. Validate updated continuity file
6. Save with timestamp backup

### Success Criteria

- Session continuity file exists and is valid JSON
- All active services are properly tracked
- Task queue is preserved across sessions
- Configuration state is accurately captured
- Recovery procedures are validated

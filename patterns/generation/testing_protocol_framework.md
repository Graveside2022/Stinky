# Testing Protocol Framework

## Trigger Conditions

- Before any code implementation
- Complexity assessment > 5
- TDD requirements (complexity >= 7)
- Integration testing needs
- Production deployment validation

## 7-Step Testing Decision Protocol

### Step 1: Quick Utility Assessment

```python
def assess_quick_utility(task_description):
    """Determine if task is quick utility/learning/throwaway"""

    quick_indicators = [
        "test", "debug", "check", "validate", "verify",
        "quick", "temp", "throwaway", "learn", "explore"
    ]

    throwaway_patterns = [
        r"just.*check",
        r"quickly.*test",
        r"temp.*file",
        r"debug.*issue"
    ]

    # Check for quick utility indicators
    task_lower = task_description.lower()

    for indicator in quick_indicators:
        if indicator in task_lower:
            return True

    for pattern in throwaway_patterns:
        if re.search(pattern, task_lower):
            return True

    return False

# If quick utility -> Skip to Step 6 (Direct Implementation)
```

### Step 2: Complexity Assessment

```python
def assess_complexity(task_description, code_structure=None):
    """Assess task complexity on scale of 1-10"""

    complexity_factors = {
        # Integration complexity
        "multiple_services": 3,
        "database_operations": 2,
        "api_endpoints": 2,
        "websocket_handling": 2,
        "file_operations": 1,

        # SDR specific complexity
        "signal_processing": 4,
        "real_time_data": 3,
        "hardware_integration": 3,

        # Service orchestration complexity
        "process_management": 3,
        "service_coordination": 2,
        "configuration_management": 2,

        # Flask app complexity
        "template_rendering": 1,
        "form_handling": 1,
        "session_management": 2,
        "authentication": 3,

        # Testing complexity
        "mock_hardware": 2,
        "integration_tests": 2,
        "performance_tests": 3
    }

    base_complexity = 1
    task_lower = task_description.lower()

    for factor, weight in complexity_factors.items():
        if factor.replace("_", " ") in task_lower:
            base_complexity += weight

    # Code structure analysis
    if code_structure:
        if code_structure.get("classes", 0) > 2:
            base_complexity += 2
        if code_structure.get("functions", 0) > 5:
            base_complexity += 1
        if code_structure.get("dependencies", 0) > 3:
            base_complexity += 1

    return min(base_complexity, 10)

# If complexity >= 7 -> TDD REQUIRED (Step 3)
```

### Step 3: TDD Requirements Check

```python
def requires_tdd(complexity, reusability, public_api):
    """Determine if TDD is required"""

    tdd_required = (
        complexity >= 7 or
        reusability == "high" or
        public_api == True
    )

    return tdd_required

# TDD Template for Stinkster
def generate_tdd_structure(component_name, component_type):
    """Generate TDD test structure"""

    if component_type == "flask_app":
        return flask_tdd_template(component_name)
    elif component_type == "sdr_integration":
        return sdr_tdd_template(component_name)
    elif component_type == "service_orchestration":
        return orchestration_tdd_template(component_name)
    elif component_type == "nodejs_service":
        return nodejs_tdd_template(component_name)

def flask_tdd_template(app_name):
    return f"""
import pytest
import json
from {app_name} import app, socketio

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def socketio_client():
    return socketio.test_client(app)

class Test{app_name.title()}:
    def test_app_initialization(self, client):
        '''Test app starts correctly'''
        response = client.get('/api/status')
        assert response.status_code == 200

    def test_config_endpoint(self, client):
        '''Test configuration endpoint'''
        response = client.get('/api/config')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, dict)

    def test_websocket_connection(self, socketio_client):
        '''Test WebSocket connection'''
        received = socketio_client.get_received()
        assert len(received) > 0
        assert received[0]['name'] == 'status'
"""
```

### Step 4: AI-Generated Review

```python
def ai_review_checklist():
    """AI-generated code review checklist"""

    return {
        "over_engineering_check": [
            "Are we adding unnecessary abstractions?",
            "Is the solution simpler than the problem?",
            "Are we following YAGNI (You Aren't Gonna Need It)?",
            "Is this the minimal viable solution?"
        ],

        "stinkster_specific_check": [
            "Does it integrate with existing SDR pipeline?",
            "Is it compatible with Flask/Node.js architecture?",
            "Does it follow service orchestration patterns?",
            "Are hardware dependencies properly handled?"
        ],

        "security_check": [
            "Are inputs properly validated?",
            "Is authentication/authorization handled?",
            "Are secrets properly managed?",
            "Is the API surface minimal?"
        ],

        "performance_check": [
            "Will this handle real-time SDR data?",
            "Are memory leaks prevented?",
            "Is database access optimized?",
            "Are network resources properly managed?"
        ]
    }
```

### Step 5: Complexity-Based Testing Decision

```python
def testing_decision(complexity):
    """Make testing decision based on complexity"""

    if complexity <= 2:
        return "manual_testing_only"
    elif complexity <= 4:
        return "basic_unit_tests"
    elif complexity <= 6:
        return "unit_and_integration_tests"
    else:
        return "full_test_suite_required"

def generate_test_suite(testing_level, component_type):
    """Generate appropriate test suite"""

    test_templates = {
        "manual_testing_only": generate_manual_test_checklist,
        "basic_unit_tests": generate_basic_unit_tests,
        "unit_and_integration_tests": generate_comprehensive_tests,
        "full_test_suite_required": generate_full_test_suite
    }

    return test_templates[testing_level](component_type)
```

### Step 6: Direct Implementation

```python
def direct_implementation_with_testing():
    """Direct implementation with manual testing validation"""

    manual_test_checklist = [
        "Code compiles/runs without errors",
        "Basic functionality works as expected",
        "Integration points are functional",
        "No obvious performance issues",
        "Error handling works for common cases"
    ]

    return {
        "implementation": "proceed_with_direct_coding",
        "validation": manual_test_checklist,
        "documentation": "minimal_inline_comments"
    }
```

### Step 7: Final Validation

```python
def final_validation_protocol():
    """Final validation regardless of testing approach"""

    return {
        "code_execution": "ALL CODE MUST RUN",
        "integration_check": "verify_with_existing_services",
        "configuration_validation": "check_config_compatibility",
        "service_health": "ensure_no_service_disruption",
        "rollback_plan": "have_rollback_procedure_ready"
    }
```

## Testing Templates

### Flask App Testing Template

```python
# Flask App Test Suite Template
import pytest
import json
import threading
import time
from unittest.mock import patch, MagicMock

class TestFlaskApp:
    @pytest.fixture
    def app_config(self):
        return {
            "sdr": {"frequency": 145000000, "sample_rate": 2400000},
            "services": {"hackrf_port": 8092}
        }

    @pytest.fixture
    def mock_sdr_data(self):
        return {
            "spectrum": [1, 2, 3, 4, 5],
            "waterfall": [[1, 2], [3, 4]],
            "frequency": 145000000
        }

    def test_spectrum_endpoint(self, client, mock_sdr_data):
        with patch('spectrum_analyzer.get_spectrum_data') as mock_spectrum:
            mock_spectrum.return_value = mock_sdr_data
            response = client.get('/api/spectrum')
            assert response.status_code == 200
            data = json.loads(response.data)
            assert 'spectrum' in data

    def test_websocket_spectrum_updates(self, socketio_client, mock_sdr_data):
        with patch('spectrum_analyzer.get_spectrum_data') as mock_spectrum:
            mock_spectrum.return_value = mock_sdr_data
            # Trigger spectrum update
            socketio_client.emit('request_spectrum')
            received = socketio_client.get_received()
            assert any(msg['name'] == 'spectrum_update' for msg in received)
```

### SDR Integration Testing Template

```python
# SDR Integration Test Suite Template
import pytest
import numpy as np
from unittest.mock import patch, MagicMock

class TestSDRIntegration:
    @pytest.fixture
    def mock_hackrf_device(self):
        mock_device = MagicMock()
        mock_device.sample_rate = 2400000
        mock_device.center_freq = 145000000
        mock_device.read_samples.return_value = np.random.complex128(1024)
        return mock_device

    def test_device_initialization(self, mock_hackrf_device):
        with patch('hackrf.HackRF') as mock_hackrf:
            mock_hackrf.return_value = mock_hackrf_device
            sdr = SDRIntegration()
            sdr.initialize_device()
            assert sdr.device is not None

    def test_spectrum_analysis(self, mock_hackrf_device):
        sdr = SDRIntegration()
        sdr.device = mock_hackrf_device

        freqs, psd = sdr.get_spectrum_data()
        assert len(freqs) > 0
        assert len(psd) > 0
        assert len(freqs) == len(psd)

    def test_real_time_processing(self, mock_hackrf_device):
        sdr = SDRIntegration()
        sdr.device = mock_hackrf_device

        # Test continuous data processing
        sdr.start_continuous_capture()
        time.sleep(1)  # Let it run for a second
        data = sdr.get_latest_data()
        sdr.stop_continuous_capture()

        assert data is not None
        assert 'timestamp' in data
```

### Service Orchestration Testing Template

```python
# Service Orchestration Test Suite Template
import pytest
import subprocess
import time
from unittest.mock import patch, MagicMock

class TestServiceOrchestration:
    @pytest.fixture
    def service_config(self):
        return {
            "services": {
                "kismet": {"command": "kismet", "port": 2501},
                "hackrf": {"command": "python spectrum_analyzer.py", "port": 8092},
                "wigletotak": {"command": "python WigleToTak2.py", "port": 8000}
            }
        }

    def test_service_health_check(self, service_config):
        orchestrator = ServiceOrchestrator(service_config)

        with patch('subprocess.run') as mock_run:
            mock_run.return_value.returncode = 0
            status = orchestrator.check_service_health("kismet")
            assert status == "healthy"

    def test_service_restart(self, service_config):
        orchestrator = ServiceOrchestrator(service_config)

        with patch.object(orchestrator, 'stop_service') as mock_stop, \
             patch.object(orchestrator, 'start_service') as mock_start:
            orchestrator.restart_service("hackrf")
            mock_stop.assert_called_once_with("hackrf")
            mock_start.assert_called_once_with("hackrf")

    def test_dependency_management(self, service_config):
        orchestrator = ServiceOrchestrator(service_config)

        # Test that GPS starts before Kismet
        with patch.object(orchestrator, 'start_service') as mock_start:
            orchestrator.start_all_services()
            # Verify GPS started before Kismet
            calls = [call[0][0] for call in mock_start.call_args_list]
            assert calls.index("gps") < calls.index("kismet")
```

## Validation Steps

### 1. Test Suite Validation

```bash
# Python tests
cd src/hackrf && python -m pytest tests/ -v
cd src/gpsmav && python -m pytest tests/ -v
cd src/wigletotak && python -m pytest tests/ -v

# Node.js tests
cd src/nodejs && npm test
cd src/nodejs/kismet-operations && npm test
cd src/nodejs/wigle-to-tak && npm test
```

### 2. Integration Test Validation

```bash
# Service integration tests
./tests/run-integration-tests.sh

# Hardware integration tests (requires hardware)
./tests/run-hardware-tests.sh --mock-hardware

# End-to-end tests
./tests/run-e2e-tests.sh
```

### 3. Performance Test Validation

```bash
# Load testing
cd tests && node performance/load-test.js

# Memory leak detection
cd tests && python performance/memory-test.py

# Real-time performance
cd tests && python performance/realtime-test.py
```

## Integration Points

### Flask App Integration

- WebSocket testing for real-time updates
- API endpoint validation
- Template rendering tests
- Configuration loading tests

### SDR Integration

- Hardware mock testing
- Signal processing validation
- Real-time data flow tests
- Frequency scanning tests

### Service Orchestration Integration

- Process management tests
- Service dependency tests
- Health monitoring validation
- Recovery procedure tests

## Pattern Application

### When to Apply

1. **Before Implementation**: Always run 7-step decision
2. **Code Review**: Apply validation checklist
3. **Integration**: Run integration test suite
4. **Deployment**: Execute full validation protocol

### Application Process

1. Assess if quick utility (Step 1)
2. Calculate complexity score (Step 2)
3. Determine TDD requirements (Step 3)
4. Run AI review checklist (Step 4)
5. Generate appropriate tests (Step 5)
6. Implement with validation (Step 6)
7. Execute final validation (Step 7)

### Success Criteria

- Appropriate testing level applied based on complexity
- All generated tests pass
- Integration points validated
- Performance requirements met
- Code review checklist completed
- Final validation protocol passes

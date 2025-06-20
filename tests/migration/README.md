# Migration Testing Framework

This directory contains the comprehensive testing framework for the Flask to Node.js migration of Stinkster services.

## Structure

```
tests/migration/
├── README.md                 # This file
├── unit/                     # Unit tests for individual components
│   ├── spectrum-analyzer/    # Spectrum analyzer unit tests
│   ├── wigle-to-tak/         # WigleToTAK unit tests
│   └── shared/               # Shared utilities unit tests
├── integration/              # Cross-service integration tests
│   ├── api-compatibility/    # API endpoint compatibility tests
│   ├── websocket/           # WebSocket functionality tests
│   └── external-systems/    # External system integration tests
├── performance/             # Performance benchmarking and load tests
│   ├── benchmarks/          # Performance baseline measurements
│   ├── load-tests/          # Load testing configurations
│   └── memory-monitoring/   # Memory usage monitoring tools
├── validation/              # Migration validation checklists and procedures
│   ├── pre-migration/       # Pre-migration validation
│   ├── post-migration/      # Post-migration validation
│   └── functional/          # Functional test suites
└── rollback/                # Rollback testing and procedures
    ├── scripts/             # Rollback automation scripts
    ├── validation/          # Rollback validation tests
    └── recovery/            # Recovery procedure tests
```

## Test Categories

### 1. Unit Tests
- Individual component functionality
- Core logic validation
- Error handling verification
- Mock service testing

### 2. Integration Tests
- API endpoint compatibility
- Cross-service communication
- External system integration
- End-to-end workflows

### 3. Performance Tests
- Baseline performance measurement
- Load testing under expected traffic
- Memory usage monitoring
- Response time analysis

### 4. Validation Tests
- Pre-migration system state validation
- Post-migration functionality verification
- Data integrity checks
- Security audit validation

### 5. Rollback Tests
- Rollback procedure validation
- Recovery time measurement
- Data preservation verification
- Service restoration testing

## Usage

### Running All Tests
```bash
npm run test:migration
```

### Running Specific Test Categories
```bash
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:validation
```

### Migration Workflow Testing
```bash
# Pre-migration validation
npm run test:pre-migration

# Post-migration validation
npm run test:post-migration

# Rollback testing
npm run test:rollback
```

## Test Data

Test data and fixtures are located in:
- `tests/fixtures/` - Mock data for testing
- `tests/samples/` - Sample CSV files and configurations
- `tests/mocks/` - Mock services and external system simulators

## Continuous Integration

Tests are configured to run automatically:
- On code commits
- Before deployment
- During migration phases
- After rollback procedures

## Reporting

Test results are generated in multiple formats:
- Console output for immediate feedback
- JUnit XML for CI/CD integration
- HTML reports for detailed analysis
- JSON data for custom processing
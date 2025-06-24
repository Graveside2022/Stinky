# Kismet Operations Test Suite

Comprehensive testing suite for Kismet Operations components including unit tests, integration tests, component tests, and performance benchmarks.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:component  
npm run test:integration
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   └── kismetClient.test.js # KismetClient class tests
├── component/               # Component-level tests
│   └── globe-3d.test.js    # 3D Globe visualization tests
├── integration/             # API integration tests
│   └── kismet-api.test.js  # Full API endpoint testing
├── performance/             # Load and performance tests
│   └── kismet-load.test.js # Performance benchmarks
├── fixtures/                # Test data and mocks
├── setup.js                 # Global test setup
├── package.json            # Test dependencies
└── run-all-tests.js        # Test runner script
```

## Test Categories

### Unit Tests
- Test individual functions and classes in isolation
- Mock all external dependencies
- Focus on edge cases and error handling
- Run quickly (<1s per test)

### Component Tests  
- Test UI components and their interactions
- Test 3D globe rendering and marker management
- Mock WebSocket connections
- Verify visual elements and user interactions

### Integration Tests
- Test full API request/response cycles
- Verify middleware and error handling
- Test WebSocket event flows
- Check CORS and security headers

### Performance Tests
- Load testing with concurrent users
- Response time benchmarks
- Memory usage monitoring
- 3D globe performance with many markers
- WebSocket connection limits

## Key Test Features

### Real-time Update Testing
Tests verify that:
- WebSocket connections handle reconnection
- Device updates are processed efficiently
- 3D globe updates smoothly with many markers
- Memory usage remains stable over time

### Performance Benchmarks
- API response times under load
- 3D globe rendering with 1000+ markers
- WebSocket message throughput
- CSV export performance

### Security Testing
- Input validation
- Rate limiting
- CORS configuration
- Error message sanitization

## Running Tests in CI/CD

```bash
# Run tests suitable for CI environment
npm run test:ci

# With custom configuration
NODE_ENV=production TEST_URL=https://api.example.com npm test
```

## Test Configuration

Environment variables:
- `TEST_URL`: Base URL for integration tests (default: http://localhost:8002)
- `WS_URL`: WebSocket URL (default: ws://localhost:8002/webhook)
- `SHOW_LOGS`: Show console output during tests (default: false)
- `TEST_TYPE`: Set to 'integration' for longer timeouts

## Writing New Tests

### Unit Test Example
```javascript
describe('KismetClient', () => {
    test('should parse device data correctly', () => {
        const device = testUtils.generateMockDevice();
        const parsed = kismetClient.parseDevice(device);
        expect(parsed.mac).toBe(device.mac);
    });
});
```

### Integration Test Example
```javascript
test('should return Kismet data via API', async () => {
    const response = await request(app)
        .get('/api/webhook/kismet-data')
        .expect(200);
    
    expect(response.body).toHaveProperty('devices');
});
```

### Performance Test Example
```javascript
test('should handle 1000 concurrent requests', async () => {
    const metrics = await runLoadTest('basic', 1000, 30000);
    expect(metrics.errorRate).toBeLessThan(0.01);
    expect(metrics.responseTimes.p95).toBeLessThan(1000);
});
```

## Test Reports

After running tests, reports are generated:
- `test-report-[timestamp].json` - Detailed JSON report
- `test-report.html` - Visual HTML report
- `coverage/` - Code coverage reports

## Troubleshooting

### Tests timing out
- Increase timeout in jest.config.js
- Check if services are running
- Verify network connectivity

### WebSocket tests failing
- Ensure port 8002 is available
- Check WebSocket mock configuration
- Verify event handler setup

### Performance tests slow
- Run performance tests separately
- Reduce concurrent user count
- Check system resources

## Contributing

When adding new features:
1. Write unit tests first (TDD)
2. Add integration tests for API changes
3. Include performance tests for data-heavy features
4. Update this README with new test examples
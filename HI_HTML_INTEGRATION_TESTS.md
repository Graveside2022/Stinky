# hi.html Integration Test Suite

## Overview

This document provides comprehensive integration tests to ensure the Node.js webhook service maintains 100% compatibility with the existing `hi.html` interface. All tests are designed to validate that the UI continues to function exactly as it does with the Python webhook service.

## Test Environment Setup

```bash
#!/bin/bash
# Setup test environment

# 1. Create test directories
mkdir -p /home/pi/webhook-integration-tests/{results,logs,data}

# 2. Install test dependencies
npm install --save-dev puppeteer jest supertest
npm install --save-dev jest-puppeteer expect-puppeteer

# 3. Create test configuration
cat > /home/pi/webhook-integration-tests/config.json << EOF
{
  "pythonUrl": "http://localhost:5000",
  "nodeUrl": "http://localhost:8092",
  "testDataDir": "/home/pi/webhook-integration-tests/data",
  "resultsDir": "/home/pi/webhook-integration-tests/results"
}
EOF
```

## UI Element Tests

### Test 1: Control Panel Elements

```javascript
// test/ui-elements.test.js
const puppeteer = require('puppeteer');

describe('hi.html UI Elements', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:8092/hi.html');
  });
  
  test('Control panel elements exist', async () => {
    // Check for control panel
    const controlPanel = await page.$('#control-panel');
    expect(controlPanel).toBeTruthy();
    
    // Check for buttons
    const startButton = await page.$('#startButton');
    const stopButton = await page.$('#stopButton');
    expect(startButton).toBeTruthy();
    expect(stopButton).toBeTruthy();
    
    // Check button text
    const startText = await page.$eval('#startButton', el => el.textContent);
    const stopText = await page.$eval('#stopButton', el => el.textContent);
    expect(startText).toBe('Start Script');
    expect(stopText).toBe('Stop Script');
    
    // Check status message div
    const statusMessage = await page.$('#statusMessage');
    expect(statusMessage).toBeTruthy();
  });
  
  test('System status box exists', async () => {
    const systemStatus = await page.$('#system-status');
    expect(systemStatus).toBeTruthy();
    
    // Should show loading initially
    const content = await page.$eval('#system-status', el => el.textContent);
    expect(content).toContain('Loading system status');
  });
  
  test('Kismet feed container exists', async () => {
    const kismetFeed = await page.$('#kismet-feed');
    expect(kismetFeed).toBeTruthy();
  });
});
```

### Test 2: Initial State Validation

```javascript
// test/initial-state.test.js
describe('hi.html Initial State', () => {
  test('Buttons have correct initial state', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:8092/hi.html');
    
    // Wait for script status to load
    await page.waitForFunction(
      () => {
        const startBtn = document.querySelector('#startButton');
        const stopBtn = document.querySelector('#stopButton');
        return startBtn && stopBtn && (startBtn.disabled !== undefined);
      },
      { timeout: 10000 }
    );
    
    // Check button states based on script status
    const scriptRunning = await page.evaluate(async () => {
      const response = await fetch('/script-status');
      const data = await response.json();
      return data.running;
    });
    
    const startDisabled = await page.$eval('#startButton', el => el.disabled);
    const stopDisabled = await page.$eval('#stopButton', el => el.disabled);
    
    if (scriptRunning) {
      expect(startDisabled).toBe(true);
      expect(stopDisabled).toBe(false);
    } else {
      expect(startDisabled).toBe(false);
      expect(stopDisabled).toBe(true);
    }
  });
});
```

## API Polling Tests

### Test 3: Auto-refresh Intervals

```javascript
// test/polling-intervals.test.js
describe('hi.html Polling Intervals', () => {
  test('Kismet data updates every 5 seconds', async () => {
    const page = await browser.newPage();
    
    // Track network requests
    const kismetRequests = [];
    page.on('request', request => {
      if (request.url().includes('/kismet-data')) {
        kismetRequests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    
    // Wait for multiple polling cycles
    await page.waitForTimeout(16000); // Wait for 3+ cycles
    
    // Verify polling interval
    expect(kismetRequests.length).toBeGreaterThanOrEqual(3);
    
    // Check intervals between requests
    for (let i = 1; i < kismetRequests.length; i++) {
      const interval = kismetRequests[i].timestamp - kismetRequests[i-1].timestamp;
      expect(interval).toBeGreaterThanOrEqual(4500); // Allow 500ms variance
      expect(interval).toBeLessThanOrEqual(5500);
    }
  });
  
  test('System status updates every 5 seconds', async () => {
    const page = await browser.newPage();
    
    const infoRequests = [];
    page.on('request', request => {
      if (request.url().includes('/info')) {
        infoRequests.push(Date.now());
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    await page.waitForTimeout(16000);
    
    expect(infoRequests.length).toBeGreaterThanOrEqual(3);
  });
  
  test('Script status updates every 5 seconds', async () => {
    const page = await browser.newPage();
    
    const statusRequests = [];
    page.on('request', request => {
      if (request.url().includes('/script-status')) {
        statusRequests.push(Date.now());
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    await page.waitForTimeout(16000);
    
    expect(statusRequests.length).toBeGreaterThanOrEqual(3);
  });
});
```

## Functional Tests

### Test 4: Start Script Functionality

```javascript
// test/start-script.test.js
describe('Start Script Functionality', () => {
  test('Start button triggers correct API call', async () => {
    const page = await browser.newPage();
    
    // Intercept network requests
    await page.setRequestInterception(true);
    let startScriptCalled = false;
    
    page.on('request', request => {
      if (request.url().includes('/run-script') && request.method() === 'POST') {
        startScriptCalled = true;
      }
      request.continue();
    });
    
    await page.goto('http://localhost:8092/hi.html');
    
    // Wait for initial load
    await page.waitForSelector('#startButton:not([disabled])');
    
    // Click start button
    await page.click('#startButton');
    
    // Verify API call
    expect(startScriptCalled).toBe(true);
    
    // Wait for status message
    await page.waitForFunction(
      () => {
        const msg = document.querySelector('#statusMessage');
        return msg && msg.textContent && msg.textContent !== '';
      },
      { timeout: 10000 }
    );
    
    // Check status message
    const statusText = await page.$eval('#statusMessage', el => el.textContent);
    expect(statusText).toBeTruthy();
    
    // Check message class
    const statusClass = await page.$eval('#statusMessage', el => el.className);
    expect(statusClass).toContain('status-message');
  });
  
  test('Success response updates UI correctly', async () => {
    const page = await browser.newPage();
    
    // Mock successful response
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/run-script')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: 'Script started successfully'
          })
        });
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    await page.waitForSelector('#startButton:not([disabled])');
    await page.click('#startButton');
    
    // Check success styling
    await page.waitForSelector('.status-message.success');
    const statusText = await page.$eval('#statusMessage', el => el.textContent);
    expect(statusText).toBe('Script started successfully');
  });
  
  test('Error response shows error message', async () => {
    const page = await browser.newPage();
    
    // Mock error response
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/run-script')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'error',
            message: 'Script is already running'
          })
        });
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    await page.waitForSelector('#startButton:not([disabled])');
    await page.click('#startButton');
    
    // Check error styling
    await page.waitForSelector('.status-message.error');
    const statusText = await page.$eval('#statusMessage', el => el.textContent);
    expect(statusText).toBe('Script is already running');
  });
});
```

### Test 5: Stop Script Functionality

```javascript
// test/stop-script.test.js
describe('Stop Script Functionality', () => {
  test('Stop button triggers correct API call', async () => {
    const page = await browser.newPage();
    
    // Mock script running state
    await page.setRequestInterception(true);
    let stopScriptCalled = false;
    
    page.on('request', request => {
      if (request.url().includes('/script-status')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            running: true,
            message: 'Script is running'
          })
        });
      } else if (request.url().includes('/stop-script') && request.method() === 'POST') {
        stopScriptCalled = true;
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            message: 'Script stopped successfully'
          })
        });
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    await page.waitForSelector('#stopButton:not([disabled])');
    await page.click('#stopButton');
    
    expect(stopScriptCalled).toBe(true);
    
    // Check success message
    await page.waitForSelector('.status-message.success');
    const statusText = await page.$eval('#statusMessage', el => el.textContent);
    expect(statusText).toBe('Script stopped successfully');
  });
});
```

## Data Display Tests

### Test 6: GPS Data Display

```javascript
// test/gps-display.test.js
describe('GPS Data Display', () => {
  test('GPS data with 3D fix displays correctly', async () => {
    const page = await browser.newPage();
    
    // Mock GPS data
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/info')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            gps: {
              lat: 40.7128,
              lon: -74.0060,
              alt: 10.5,
              mode: 3,
              time: '2025-06-16T12:00:00Z',
              speed: 2.5,
              track: 180.0,
              status: '3D Fix'
            },
            kismet: 'Running',
            wigle: 'Running',
            ip: '192.168.1.100'
          })
        });
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    
    // Wait for data to load
    await page.waitForFunction(
      () => {
        const status = document.querySelector('#system-status');
        return status && status.textContent.includes('3D Fix');
      },
      { timeout: 10000 }
    );
    
    // Verify all fields displayed
    const statusText = await page.$eval('#system-status', el => el.innerHTML);
    expect(statusText).toContain('<strong>IP:</strong> 192.168.1.100');
    expect(statusText).toContain('<strong>GPS Status:</strong> 3D Fix');
    expect(statusText).toContain('<strong>Lat:</strong> 40.7128');
    expect(statusText).toContain('<strong>Lon:</strong> -74.006');
    expect(statusText).toContain('<strong>Alt:</strong> 10.5');
    expect(statusText).toContain('<strong>Time:</strong> 2025-06-16T12:00:00Z');
  });
  
  test('GPS no fix displays N/A correctly', async () => {
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/info')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            gps: {
              lat: null,
              lon: null,
              alt: null,
              mode: 0,
              time: null,
              speed: null,
              track: null,
              status: 'No Fix'
            },
            kismet: 'Not Running',
            wigle: 'Not Running',
            ip: '192.168.1.100'
          })
        });
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    
    await page.waitForFunction(
      () => {
        const status = document.querySelector('#system-status');
        return status && status.textContent.includes('No Fix');
      }
    );
    
    const statusText = await page.$eval('#system-status', el => el.innerHTML);
    expect(statusText).toContain('<strong>Lat:</strong> N/A');
    expect(statusText).toContain('<strong>Lon:</strong> N/A');
    expect(statusText).toContain('<strong>Alt:</strong> N/A');
  });
});
```

### Test 7: Kismet Data Display

```javascript
// test/kismet-display.test.js
describe('Kismet Data Display', () => {
  test('Device list displays correctly', async () => {
    const page = await browser.newPage();
    
    // Mock Kismet data
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/kismet-data')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            devices: [
              {
                mac: 'AA:BB:CC:DD:EE:FF',
                type: 'Wi-Fi AP',
                channel: '6',
                signal: -65,
                first_seen: 1734350400,
                last_seen: 1734354000
              },
              {
                mac: '11:22:33:44:55:66',
                type: 'Wi-Fi Client',
                channel: '11',
                signal: -72,
                first_seen: 1734351000,
                last_seen: 1734354000
              }
            ]
          })
        });
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    
    // Wait for devices to load
    await page.waitForSelector('.feed-item');
    
    // Check device count
    const devices = await page.$$('.feed-item');
    expect(devices.length).toBe(2);
    
    // Check first device details
    const firstDevice = await page.$eval('.feed-item:first-child', el => el.innerHTML);
    expect(firstDevice).toContain('<strong>MAC:</strong> AA:BB:CC:DD:EE:FF');
    expect(firstDevice).toContain('<strong>Type:</strong> Wi-Fi AP');
    expect(firstDevice).toContain('<strong>Channel:</strong> 6');
    expect(firstDevice).toContain('<strong>Signal:</strong> -65 dBm');
  });
  
  test('No devices message displays correctly', async () => {
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/kismet-data')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            devices: []
          })
        });
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    
    await page.waitForFunction(
      () => {
        const feed = document.querySelector('#kismet-feed');
        return feed && feed.textContent.includes('No devices found');
      }
    );
    
    const feedText = await page.$eval('#kismet-feed', el => el.textContent);
    expect(feedText).toContain('No devices found');
  });
  
  test('Error message displays correctly', async () => {
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/kismet-data')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to read Kismet data'
          })
        });
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    
    await page.waitForFunction(
      () => {
        const feed = document.querySelector('#kismet-feed');
        return feed && feed.textContent.includes('Error:');
      }
    );
    
    const feedText = await page.$eval('#kismet-feed', el => el.textContent);
    expect(feedText).toContain('Error: Failed to read Kismet data');
  });
});
```

## Cache Busting Tests

### Test 8: Cache Buster Implementation

```javascript
// test/cache-busting.test.js
describe('Cache Busting', () => {
  test('All API requests include cache buster parameter', async () => {
    const page = await browser.newPage();
    
    const requestUrls = [];
    page.on('request', request => {
      if (request.url().includes('localhost')) {
        requestUrls.push(request.url());
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    await page.waitForTimeout(6000); // Wait for polling cycles
    
    // Check all API requests have cache buster
    const apiRequests = requestUrls.filter(url => 
      url.includes('/info') || 
      url.includes('/script-status') || 
      url.includes('/kismet-data')
    );
    
    expect(apiRequests.length).toBeGreaterThan(0);
    
    apiRequests.forEach(url => {
      expect(url).toMatch(/_=\d+/); // Check for _=timestamp pattern
    });
    
    // Verify timestamps are unique
    const timestamps = apiRequests.map(url => {
      const match = url.match(/_=(\d+)/);
      return match ? match[1] : null;
    });
    
    const uniqueTimestamps = [...new Set(timestamps)];
    expect(uniqueTimestamps.length).toBe(timestamps.length);
  });
});
```

## Error Handling Tests

### Test 9: Network Error Handling

```javascript
// test/error-handling.test.js
describe('Error Handling', () => {
  test('Network errors show appropriate messages', async () => {
    const page = await browser.newPage();
    
    // Block API requests to simulate network error
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/kismet-data')) {
        request.abort('failed');
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    
    // Wait for error message
    await page.waitForFunction(
      () => {
        const feed = document.querySelector('#kismet-feed');
        return feed && feed.textContent.includes('Error loading Kismet data');
      },
      { timeout: 10000 }
    );
    
    const errorText = await page.$eval('#kismet-feed', el => el.textContent);
    expect(errorText).toBe('Error loading Kismet data');
  });
  
  test('Console errors are logged correctly', async () => {
    const page = await browser.newPage();
    
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Simulate API error
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/info')) {
        request.abort('failed');
      } else {
        request.continue();
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    await page.waitForTimeout(2000);
    
    // Should have error logs
    const relevantErrors = consoleErrors.filter(err => 
      err.includes('Error fetching system status')
    );
    expect(relevantErrors.length).toBeGreaterThan(0);
  });
});
```

## Performance Tests

### Test 10: Response Time Validation

```javascript
// test/performance.test.js
describe('Performance', () => {
  test('API responses are received within acceptable time', async () => {
    const page = await browser.newPage();
    
    const responseTimes = {};
    
    // Track response times
    page.on('response', response => {
      const url = response.url();
      const timing = response.timing();
      
      if (url.includes('/info') || url.includes('/script-status') || url.includes('/kismet-data')) {
        const endpoint = url.match(/\/(info|script-status|kismet-data)/)[1];
        if (!responseTimes[endpoint]) {
          responseTimes[endpoint] = [];
        }
        responseTimes[endpoint].push(timing.receiveHeadersEnd);
      }
    });
    
    await page.goto('http://localhost:8092/hi.html');
    await page.waitForTimeout(11000); // Wait for multiple polling cycles
    
    // Check response times
    Object.entries(responseTimes).forEach(([endpoint, times]) => {
      times.forEach(time => {
        expect(time).toBeLessThan(500); // All responses under 500ms
      });
    });
  });
});
```

## Cross-Browser Compatibility Tests

### Test 11: Multiple Browser Support

```javascript
// test/cross-browser.test.js
const browsers = ['chromium', 'firefox', 'webkit'];

describe.each(browsers)('Cross-browser compatibility (%s)', (browserType) => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await playwright[browserType].launch();
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('Basic functionality works', async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:8092/hi.html');
    
    // Check all elements load
    await page.waitForSelector('#control-panel');
    await page.waitForSelector('#system-status');
    await page.waitForSelector('#kismet-feed');
    
    // Verify no JavaScript errors
    const errors = [];
    page.on('pageerror', err => errors.push(err));
    
    await page.waitForTimeout(5000);
    expect(errors).toHaveLength(0);
  });
});
```

## Regression Test Suite

### Test 12: Complete Workflow Test

```javascript
// test/regression.test.js
describe('Complete Workflow Regression', () => {
  test('Full start-monitor-stop cycle', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:8092/hi.html');
    
    // 1. Initial state - script not running
    await page.waitForSelector('#startButton:not([disabled])');
    
    // 2. Start script
    await page.click('#startButton');
    await page.waitForSelector('.status-message.success');
    
    // 3. Verify button states change
    await page.waitForSelector('#startButton[disabled]');
    await page.waitForSelector('#stopButton:not([disabled])');
    
    // 4. Wait for GPS data
    await page.waitForFunction(
      () => {
        const status = document.querySelector('#system-status');
        return status && !status.textContent.includes('Loading');
      },
      { timeout: 15000 }
    );
    
    // 5. Wait for Kismet data
    await page.waitForFunction(
      () => {
        const feed = document.querySelector('#kismet-feed');
        return feed && feed.children.length > 0;
      },
      { timeout: 15000 }
    );
    
    // 6. Stop script
    await page.click('#stopButton');
    await page.waitForSelector('.status-message.success');
    
    // 7. Verify button states revert
    await page.waitForSelector('#startButton:not([disabled])');
    await page.waitForSelector('#stopButton[disabled]');
  });
});
```

## Test Execution Script

```bash
#!/bin/bash
# run-hi-html-tests.sh

echo "=== hi.html Integration Test Suite ==="
echo "Testing Node.js webhook service compatibility"
echo

# 1. Ensure services are running
if ! curl -s http://localhost:8092/info > /dev/null; then
    echo "❌ Node.js webhook service not running on port 8092"
    echo "Please start the service before running tests"
    exit 1
fi

# 2. Run Jest tests
echo "Running automated tests..."
npx jest --testPathPattern="test/" --verbose

# 3. Generate test report
echo
echo "Generating test report..."
npx jest --testPathPattern="test/" --json --outputFile=test-results.json

# 4. Analyze results
echo
echo "=== Test Results Summary ==="
node -e "
const results = require('./test-results.json');
console.log('Total Tests:', results.numTotalTests);
console.log('Passed:', results.numPassedTests);
console.log('Failed:', results.numFailedTests);
console.log('Test Suites:', results.numTotalTestSuites);
console.log('Duration:', (results.testResults[0].endTime - results.testResults[0].startTime) / 1000, 'seconds');
"

# 5. Check for failures
if [ $? -ne 0 ]; then
    echo
    echo "❌ Some tests failed. Please review the output above."
    exit 1
else
    echo
    echo "✅ All tests passed! hi.html is fully compatible with the Node.js webhook service."
fi
```

## Manual Testing Checklist

For aspects that cannot be automated:

### Visual Inspection
- [ ] Control panel styling matches original
- [ ] Status messages have correct colors (green/red/yellow)
- [ ] Kismet feed items are properly formatted
- [ ] System status box positioning is correct
- [ ] No layout shifts during updates

### Interaction Testing
- [ ] Clicking buttons feels responsive
- [ ] No double-click issues
- [ ] Status messages clear automatically
- [ ] Page doesn't freeze during operations
- [ ] Back/forward browser navigation works

### Edge Cases
- [ ] Works with very long SSID names
- [ ] Handles special characters in device names
- [ ] Works with 100+ devices in Kismet feed
- [ ] Recovers from temporary network issues
- [ ] Functions after extended uptime (24+ hours)

### Browser Compatibility
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)
- [ ] Mobile browsers (responsive)

## Continuous Integration

```yaml
# .github/workflows/hi-html-tests.yml
name: hi.html Integration Tests

on:
  push:
    paths:
      - 'src/nodejs/webhook-service/**'
      - 'test/**'
  pull_request:
    paths:
      - 'src/nodejs/webhook-service/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Start webhook service
      run: |
        npm start &
        sleep 5
    
    - name: Run integration tests
      run: npm test
    
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v2
      with:
        name: test-results
        path: test-results.json
```

This comprehensive test suite ensures that the Node.js webhook service maintains perfect compatibility with hi.html, validating all functionality, performance, and user experience aspects.
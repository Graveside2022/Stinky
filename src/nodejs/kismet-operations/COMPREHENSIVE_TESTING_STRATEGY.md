# Comprehensive Testing Strategy for Flask to Node.js Migration

## Executive Summary

This document outlines a complete testing strategy for validating the Flask to Node.js migration, covering:
- Unit testing for all service functions
- Integration testing for external services
- End-to-end testing for complete workflows
- Performance benchmarking and optimization
- Security and rollback testing
- Frontend integration validation

## Test Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Test Orchestration Layer                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐│
│  │   Unit    │  │Integration│  │    E2E    │  │ Performance  ││
│  │  Tests    │  │   Tests   │  │   Tests   │  │    Tests     ││
│  └───────────┘  └───────────┘  └───────────┘  └──────────────┘│
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐│
│  │  Mocking  │  │   Test    │  │   Test    │  │   Coverage   ││
│  │ Framework │  │   Data    │  │ Fixtures  │  │   Reports    ││
│  └───────────┘  └───────────┘  └───────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 1. Test Plan for Each Endpoint

### 1.1 Spectrum Analyzer Endpoints

#### GET /api/spectrum/status
```javascript
// Unit Test
describe('Spectrum Status Endpoint', () => {
  it('should return current analyzer status', async () => {
    const mockAnalyzer = {
      getStatus: jest.fn().mockReturnValue({
        connected: true,
        buffer_size: 100,
        config: { fft_size: 1024 }
      })
    };
    
    const response = await request(app)
      .get('/api/spectrum/status')
      .expect(200);
    
    expect(response.body).toHaveProperty('connected', true);
    expect(response.body).toHaveProperty('buffer_size', 100);
  });
  
  it('should handle analyzer not initialized', async () => {
    // Test when analyzer is null
    const response = await request(app)
      .get('/api/spectrum/status')
      .expect(200);
    
    expect(response.body).toHaveProperty('connected', false);
    expect(response.body).toHaveProperty('error');
  });
});
```

#### GET /api/spectrum/config
```javascript
// Integration Test
describe('Spectrum Config Endpoint', () => {
  let app;
  let mockOpenWebRX;
  
  beforeEach(() => {
    mockOpenWebRX = new MockOpenWebRX();
    app = createApp({ openwebrx: mockOpenWebRX });
  });
  
  it('should return current configuration', async () => {
    const response = await request(app)
      .get('/api/spectrum/config')
      .expect(200);
    
    expect(response.body).toMatchObject({
      fft_size: expect.any(Number),
      center_freq: expect.any(Number),
      samp_rate: expect.any(Number)
    });
  });
  
  it('should validate configuration values', async () => {
    const response = await request(app)
      .get('/api/spectrum/config')
      .expect(200);
    
    expect(response.body.fft_size).toBeGreaterThan(0);
    expect(response.body.center_freq).toBeGreaterThan(0);
  });
});
```

#### POST /api/spectrum/config
```javascript
// E2E Test
describe('Spectrum Config Update', () => {
  it('should update configuration and apply to analyzer', async () => {
    const newConfig = {
      center_freq: 145000000,
      samp_rate: 2400000,
      signal_threshold: -65
    };
    
    const response = await request(app)
      .post('/api/spectrum/config')
      .send(newConfig)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    
    // Verify configuration was applied
    const status = await request(app)
      .get('/api/spectrum/status')
      .expect(200);
    
    expect(status.body.config).toMatchObject(newConfig);
  });
  
  it('should reject invalid configuration', async () => {
    const invalidConfig = {
      center_freq: -1,
      samp_rate: 'invalid'
    };
    
    const response = await request(app)
      .post('/api/spectrum/config')
      .send(invalidConfig)
      .expect(400);
    
    expect(response.body.error).toBeDefined();
  });
});
```

### 1.2 WigleToTAK Endpoints

#### POST /upload_file
```javascript
// Unit Test with File Upload
describe('WigleToTAK File Upload', () => {
  it('should accept valid Wigle CSV file', async () => {
    const mockFile = Buffer.from(
      'MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,Latitude,Longitude\n' +
      'AA:BB:CC:DD:EE:FF,TestNetwork,WPA2,2024-01-01,6,-70,40.7128,-74.0060\n'
    );
    
    const response = await request(app)
      .post('/upload_file')
      .attach('file', mockFile, 'test.wiglecsv')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.file_path).toContain('.wiglecsv');
  });
  
  it('should reject non-CSV files', async () => {
    const mockFile = Buffer.from('not a csv file');
    
    const response = await request(app)
      .post('/upload_file')
      .attach('file', mockFile, 'test.txt')
      .expect(400);
    
    expect(response.body.error).toContain('Invalid file type');
  });
});
```

#### POST /process_file
```javascript
// Integration Test with TAK Broadcasting
describe('WigleToTAK Processing', () => {
  let mockUdpSocket;
  
  beforeEach(() => {
    mockUdpSocket = createMockUdpSocket();
  });
  
  it('should process CSV and broadcast TAK messages', async () => {
    const testData = {
      file_path: '/test/test.wiglecsv',
      port: 6969,
      multicast_group: '239.2.3.1'
    };
    
    const response = await request(app)
      .post('/process_file')
      .send(testData)
      .expect(200);
    
    expect(response.body.devices_processed).toBe(5);
    expect(mockUdpSocket.sentMessages).toHaveLength(5);
    
    // Verify TAK message format
    const takMessage = mockUdpSocket.sentMessages[0];
    expect(takMessage).toContain('<event');
    expect(takMessage).toContain('type="a-f-G-U-C"');
  });
});
```

### 1.3 GPS Bridge Endpoints

#### GET /api/gps/status
```javascript
// Mock GPSD Connection Test
describe('GPS Status Endpoint', () => {
  let mockGpsd;
  
  beforeEach(() => {
    mockGpsd = new MockGPSDClient();
  });
  
  it('should return GPS fix status', async () => {
    mockGpsd.setFix({
      mode: 3,
      lat: 40.7128,
      lon: -74.0060,
      alt: 10.5
    });
    
    const response = await request(app)
      .get('/api/gps/status')
      .expect(200);
    
    expect(response.body).toMatchObject({
      fix: true,
      mode: 3,
      latitude: 40.7128,
      longitude: -74.0060
    });
  });
  
  it('should handle no GPS fix', async () => {
    mockGpsd.setFix({ mode: 0 });
    
    const response = await request(app)
      .get('/api/gps/status')
      .expect(200);
    
    expect(response.body.fix).toBe(false);
  });
});
```

## 2. Mock Strategies

### 2.1 GPSD Connection Mock

```javascript
// mocks/MockGPSDClient.js
class MockGPSDClient extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    this.fix = null;
    this.satellites = [];
  }
  
  connect(host = 'localhost', port = 2947) {
    return new Promise((resolve) => {
      this.connected = true;
      setTimeout(() => {
        this.emit('connected');
        resolve();
      }, 10);
    });
  }
  
  setFix(fixData) {
    this.fix = fixData;
    this.emit('TPV', fixData);
  }
  
  setSatellites(satData) {
    this.satellites = satData;
    this.emit('SKY', { satellites: satData });
  }
  
  watch(options = {}) {
    // Simulate watch mode
    if (options.class === 'WATCH') {
      setInterval(() => {
        if (this.fix) {
          this.emit('TPV', this.fix);
        }
      }, 1000);
    }
  }
  
  disconnect() {
    this.connected = false;
    this.emit('disconnected');
  }
}

module.exports = MockGPSDClient;
```

### 2.2 Kismet API Mock

```javascript
// mocks/MockKismetAPI.js
class MockKismetAPI {
  constructor() {
    this.devices = new Map();
    this.alerts = [];
    this.status = {
      devices_total: 0,
      packets_total: 0
    };
  }
  
  async getDevices(filters = {}) {
    const devices = Array.from(this.devices.values());
    
    // Apply filters
    let filtered = devices;
    if (filters.last_time) {
      filtered = filtered.filter(d => d.last_time > filters.last_time);
    }
    
    return {
      devices: filtered,
      total: filtered.length
    };
  }
  
  async getStatus() {
    return this.status;
  }
  
  addMockDevice(device) {
    this.devices.set(device.mac, {
      mac: device.mac,
      ssid: device.ssid || '',
      channel: device.channel || 1,
      rssi: device.rssi || -70,
      last_time: Date.now(),
      gps: device.gps || null,
      ...device
    });
    
    this.status.devices_total = this.devices.size;
  }
  
  clearDevices() {
    this.devices.clear();
    this.status.devices_total = 0;
  }
}

module.exports = MockKismetAPI;
```

### 2.3 Shell Script Execution Mock

```javascript
// mocks/MockShellExecutor.js
class MockShellExecutor {
  constructor() {
    this.scripts = new Map();
    this.executionLog = [];
  }
  
  registerScript(scriptPath, handler) {
    this.scripts.set(scriptPath, handler);
  }
  
  async execute(command, args = []) {
    const execution = {
      command,
      args,
      timestamp: Date.now(),
      stdout: '',
      stderr: '',
      exitCode: 0
    };
    
    // Check if we have a handler for this script
    const handler = this.scripts.get(command);
    if (handler) {
      const result = await handler(args);
      execution.stdout = result.stdout || '';
      execution.stderr = result.stderr || '';
      execution.exitCode = result.exitCode || 0;
    } else {
      // Default mock behavior
      execution.stdout = `Mock output for: ${command} ${args.join(' ')}`;
    }
    
    this.executionLog.push(execution);
    
    if (execution.exitCode !== 0) {
      throw new Error(execution.stderr || 'Command failed');
    }
    
    return execution;
  }
  
  getExecutionHistory() {
    return this.executionLog;
  }
  
  clearHistory() {
    this.executionLog = [];
  }
}

// Example usage in tests
const mockShell = new MockShellExecutor();

// Register script behavior
mockShell.registerScript('/home/pi/stinky/start_kismet.sh', async (args) => {
  return {
    stdout: 'Kismet started successfully\nPID: 12345',
    exitCode: 0
  };
});

module.exports = MockShellExecutor;
```

## 3. Performance Testing Plan

### 3.1 Response Time Benchmarks

```javascript
// performance/response-time-benchmark.js
const autocannon = require('autocannon');

async function runResponseTimeBenchmark() {
  const results = await autocannon({
    url: 'http://localhost:8092',
    connections: 10,
    duration: 30,
    requests: [
      {
        method: 'GET',
        path: '/api/spectrum/status'
      },
      {
        method: 'GET',
        path: '/api/spectrum/config'
      },
      {
        method: 'GET',
        path: '/api/spectrum/signals'
      }
    ]
  });
  
  console.log('Response Time Benchmark Results:');
  console.log(`Average latency: ${results.latency.mean}ms`);
  console.log(`95th percentile: ${results.latency.p95}ms`);
  console.log(`99th percentile: ${results.latency.p99}ms`);
  console.log(`Requests/sec: ${results.requests.mean}`);
  
  // Assert performance targets
  assert(results.latency.mean < 15, 'Average latency should be under 15ms');
  assert(results.latency.p95 < 50, '95th percentile should be under 50ms');
  
  return results;
}
```

### 3.2 Memory Usage Targets

```javascript
// performance/memory-monitoring.js
class MemoryMonitor {
  constructor() {
    this.samples = [];
    this.interval = null;
  }
  
  start(sampleInterval = 1000) {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      this.samples.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external
      });
    }, sampleInterval);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  getReport() {
    if (this.samples.length === 0) return null;
    
    const heapUsedValues = this.samples.map(s => s.heapUsed);
    const rssValues = this.samples.map(s => s.rss);
    
    return {
      duration: this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp,
      samples: this.samples.length,
      heapUsed: {
        min: Math.min(...heapUsedValues) / 1024 / 1024,
        max: Math.max(...heapUsedValues) / 1024 / 1024,
        avg: heapUsedValues.reduce((a, b) => a + b) / heapUsedValues.length / 1024 / 1024
      },
      rss: {
        min: Math.min(...rssValues) / 1024 / 1024,
        max: Math.max(...rssValues) / 1024 / 1024,
        avg: rssValues.reduce((a, b) => a + b) / rssValues.length / 1024 / 1024
      }
    };
  }
}

// Usage in tests
describe('Memory Usage Tests', () => {
  let monitor;
  let app;
  
  beforeAll(() => {
    monitor = new MemoryMonitor();
    monitor.start();
    app = createApp();
  });
  
  afterAll(() => {
    monitor.stop();
    const report = monitor.getReport();
    
    console.log('Memory Usage Report:');
    console.log(`Average Heap: ${report.heapUsed.avg.toFixed(2)}MB`);
    console.log(`Average RSS: ${report.rss.avg.toFixed(2)}MB`);
    
    // Assert memory targets
    expect(report.heapUsed.avg).toBeLessThan(35); // Target: <35MB heap
    expect(report.rss.avg).toBeLessThan(50); // Target: <50MB total
  });
  
  // Run actual tests...
});
```

### 3.3 Concurrent Request Handling

```javascript
// performance/concurrent-load-test.js
async function testConcurrentRequests() {
  const concurrentUsers = [10, 50, 100, 200];
  const results = {};
  
  for (const users of concurrentUsers) {
    console.log(`Testing with ${users} concurrent users...`);
    
    const promises = [];
    const startTime = Date.now();
    
    // Simulate concurrent users
    for (let i = 0; i < users; i++) {
      promises.push(simulateUser());
    }
    
    const responses = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    const successCount = responses.filter(r => r.success).length;
    const errorCount = responses.filter(r => !r.success).length;
    
    results[users] = {
      duration,
      successRate: (successCount / users) * 100,
      errorCount,
      avgResponseTime: duration / users
    };
  }
  
  return results;
}

async function simulateUser() {
  try {
    // Simulate typical user workflow
    await axios.get('/api/spectrum/status');
    await axios.get('/api/spectrum/config');
    await axios.get('/api/spectrum/signals');
    
    // Simulate WebSocket connection
    const ws = new WebSocket('ws://localhost:8092');
    await new Promise((resolve) => {
      ws.on('open', resolve);
    });
    
    // Listen for some data
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
    
    ws.close();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## 4. Test Data Fixtures

### 4.1 Sample Wigle CSV Files

```javascript
// fixtures/wigle-test-data.js
const VALID_WIGLE_CSV = `MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
AA:BB:CC:DD:EE:FF,TestNetwork1,WPA2,2024-01-01 12:00:00,6,-70,40.7128,-74.0060,10.5,5,WIFI
11:22:33:44:55:66,TestNetwork2,Open,2024-01-01 12:01:00,11,-65,40.7130,-74.0062,10.5,5,WIFI
77:88:99:AA:BB:CC,HiddenNetwork,[WPS],2024-01-01 12:02:00,1,-80,40.7132,-74.0064,10.5,5,WIFI`;

const LARGE_WIGLE_CSV = generateLargeWigleCSV(1000); // 1000 devices

const MALFORMED_WIGLE_CSV = `MAC,SSID,Wrong,Headers
AA:BB:CC:DD:EE:FF,TestNetwork1,Missing,Data`;

function generateLargeWigleCSV(deviceCount) {
  const header = 'MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type';
  const rows = [header];
  
  for (let i = 0; i < deviceCount; i++) {
    const mac = generateRandomMAC();
    const ssid = `Network_${i}`;
    const channel = Math.floor(Math.random() * 11) + 1;
    const rssi = -50 - Math.floor(Math.random() * 40);
    const lat = 40.7128 + (Math.random() - 0.5) * 0.1;
    const lon = -74.0060 + (Math.random() - 0.5) * 0.1;
    
    rows.push(`${mac},${ssid},WPA2,2024-01-01 12:00:00,${channel},${rssi},${lat},${lon},10.5,5,WIFI`);
  }
  
  return rows.join('\n');
}

function generateRandomMAC() {
  return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () => 
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  );
}

module.exports = {
  VALID_WIGLE_CSV,
  LARGE_WIGLE_CSV,
  MALFORMED_WIGLE_CSV,
  generateLargeWigleCSV
};
```

### 4.2 Mock GPS Data

```javascript
// fixtures/gps-test-data.js
const GPS_FIX_3D = {
  class: 'TPV',
  device: '/dev/ttyUSB0',
  mode: 3,
  time: '2024-01-01T12:00:00.000Z',
  lat: 40.7128,
  lon: -74.0060,
  alt: 10.5,
  speed: 5.2,
  track: 45.0,
  climb: 0.1,
  eps: 10.0,
  epv: 15.0
};

const GPS_NO_FIX = {
  class: 'TPV',
  device: '/dev/ttyUSB0',
  mode: 0,
  time: '2024-01-01T12:00:00.000Z'
};

const GPS_SATELLITES = {
  class: 'SKY',
  device: '/dev/ttyUSB0',
  satellites: [
    { PRN: 1, el: 45, az: 180, ss: 40, used: true },
    { PRN: 2, el: 30, az: 90, ss: 35, used: true },
    { PRN: 3, el: 60, az: 270, ss: 38, used: true },
    { PRN: 4, el: 15, az: 45, ss: 25, used: false }
  ]
};

module.exports = {
  GPS_FIX_3D,
  GPS_NO_FIX,
  GPS_SATELLITES
};
```

### 4.3 Mock FFT Data

```javascript
// fixtures/fft-test-data.js
function generateFFTData(size = 1024, centerFreq = 145000000, sampRate = 2400000) {
  const data = new Float32Array(size);
  const noiseFloor = -90;
  
  // Generate noise floor
  for (let i = 0; i < size; i++) {
    data[i] = noiseFloor + (Math.random() - 0.5) * 5;
  }
  
  // Add some signals
  addSignal(data, size / 4, -60, 10); // Signal 1
  addSignal(data, size / 2, -55, 15); // Signal 2
  addSignal(data, 3 * size / 4, -65, 8); // Signal 3
  
  return {
    timestamp: Date.now(),
    data: Array.from(data),
    center_freq: centerFreq,
    samp_rate: sampRate,
    fft_size: size
  };
}

function addSignal(data, position, power, width) {
  for (let i = -width; i <= width; i++) {
    const index = Math.floor(position + i);
    if (index >= 0 && index < data.length) {
      const attenuation = Math.abs(i) / width * 20;
      data[index] = power - attenuation;
    }
  }
}

module.exports = {
  generateFFTData
};
```

## 5. Frontend Integration Tests

### 5.1 WebSocket Connection Tests

```javascript
// tests/frontend/websocket-integration.test.js
describe('WebSocket Integration', () => {
  let server;
  let wsClient;
  
  beforeEach((done) => {
    server = createTestServer();
    server.listen(8092, () => {
      wsClient = new WebSocket('ws://localhost:8092');
      wsClient.on('open', done);
    });
  });
  
  afterEach((done) => {
    wsClient.close();
    server.close(done);
  });
  
  it('should receive real-time FFT data', (done) => {
    const receivedData = [];
    
    wsClient.on('message', (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'fftData') {
        receivedData.push(message);
        
        if (receivedData.length >= 5) {
          // Verify FFT data structure
          expect(message).toHaveProperty('data');
          expect(message).toHaveProperty('timestamp');
          expect(message.data).toBeInstanceOf(Array);
          expect(message.data.length).toBeGreaterThan(0);
          done();
        }
      }
    });
    
    // Trigger FFT data generation
    wsClient.send(JSON.stringify({ action: 'startStream' }));
  });
  
  it('should handle reconnection gracefully', async () => {
    // Close connection
    wsClient.close();
    
    // Wait for close
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reconnect
    const newClient = new WebSocket('ws://localhost:8092');
    
    await new Promise((resolve, reject) => {
      newClient.on('open', resolve);
      newClient.on('error', reject);
    });
    
    expect(newClient.readyState).toBe(WebSocket.OPEN);
    newClient.close();
  });
});
```

### 5.2 UI Component Tests

```javascript
// tests/frontend/spectrum-ui.test.js
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpectrumAnalyzer from '../../public/js/components/SpectrumAnalyzer';

describe('Spectrum Analyzer UI', () => {
  it('should display connection status', async () => {
    render(<SpectrumAnalyzer />);
    
    // Initially disconnected
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    
    // Wait for connection
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });
  
  it('should update frequency when config changes', async () => {
    render(<SpectrumAnalyzer />);
    
    const freqInput = screen.getByLabelText(/Center Frequency/i);
    await userEvent.clear(freqInput);
    await userEvent.type(freqInput, '146000000');
    
    const updateButton = screen.getByText(/Update Config/i);
    await userEvent.click(updateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/146.000 MHz/i)).toBeInTheDocument();
    });
  });
  
  it('should display detected signals', async () => {
    render(<SpectrumAnalyzer />);
    
    // Wait for signals to be detected
    await waitFor(() => {
      const signalElements = screen.getAllByTestId('signal-marker');
      expect(signalElements.length).toBeGreaterThan(0);
    });
    
    // Verify signal information is displayed
    const firstSignal = screen.getAllByTestId('signal-info')[0];
    expect(firstSignal).toHaveTextContent(/Frequency:/);
    expect(firstSignal).toHaveTextContent(/Power:/);
  });
});
```

## 6. Rollback Testing Plan

### 6.1 Rollback Procedure Test

```javascript
// tests/rollback/rollback-procedure.test.js
describe('Rollback Procedures', () => {
  let backupManager;
  
  beforeEach(() => {
    backupManager = new BackupManager();
  });
  
  it('should create backup before migration', async () => {
    const backupId = await backupManager.createBackup('pre-migration');
    
    expect(backupId).toBeTruthy();
    
    const backupInfo = await backupManager.getBackupInfo(backupId);
    expect(backupInfo).toMatchObject({
      id: backupId,
      type: 'pre-migration',
      services: ['spectrum-analyzer', 'wigle-to-tak'],
      timestamp: expect.any(Number)
    });
  });
  
  it('should restore Flask services from backup', async () => {
    const backupId = 'test-backup-123';
    
    // Simulate rollback
    const result = await backupManager.rollback(backupId);
    
    expect(result.success).toBe(true);
    expect(result.restoredServices).toContain('spectrum-analyzer-flask');
    expect(result.restoredServices).toContain('wigle-to-tak-flask');
    
    // Verify Flask services are running
    const flaskStatus = await checkFlaskServices();
    expect(flaskStatus.spectrumAnalyzer).toBe('running');
    expect(flaskStatus.wigleToTak).toBe('running');
  });
  
  it('should preserve data during rollback', async () => {
    // Create test data
    const testData = {
      configs: await saveTestConfigs(),
      uploads: await createTestUploads(),
      logs: await generateTestLogs()
    };
    
    // Perform rollback
    await backupManager.rollback('test-backup');
    
    // Verify data preservation
    const restoredData = {
      configs: await loadConfigs(),
      uploads: await listUploads(),
      logs: await readLogs()
    };
    
    expect(restoredData.configs).toEqual(testData.configs);
    expect(restoredData.uploads).toEqual(testData.uploads);
    expect(restoredData.logs).toContain(testData.logs);
  });
});
```

### 6.2 Service Health Verification

```javascript
// tests/rollback/health-verification.test.js
class ServiceHealthChecker {
  async checkNodeServices() {
    const services = {
      spectrumAnalyzer: await this.checkService('http://localhost:8092/health'),
      wigleToTak: await this.checkService('http://localhost:8000/health'),
      gpsbridge: await this.checkService('http://localhost:3001/health')
    };
    
    return {
      healthy: Object.values(services).every(s => s.status === 'healthy'),
      services
    };
  }
  
  async checkFlaskServices() {
    const services = {
      spectrumAnalyzer: await this.checkService('http://localhost:8092/health'),
      wigleToTak: await this.checkService('http://localhost:8000/health')
    };
    
    return {
      healthy: Object.values(services).every(s => s.status === 'healthy'),
      services
    };
  }
  
  async checkService(url) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      return {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'N/A',
        version: response.data.version || 'unknown'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}
```

## 7. Test Automation Scripts

### 7.1 Pre-Migration Test Suite

```bash
#!/bin/bash
# scripts/run-pre-migration-tests.sh

echo "Running Pre-Migration Test Suite..."

# 1. Backup current state
echo "Creating pre-migration backup..."
npm run backup:create -- --type pre-migration

# 2. Test Flask services
echo "Testing Flask services..."
npm run test:flask-services

# 3. Record performance baseline
echo "Recording performance baseline..."
npm run test:performance:baseline

# 4. Verify data integrity
echo "Verifying data integrity..."
npm run test:data:integrity

# 5. Test external integrations
echo "Testing external integrations..."
npm run test:integrations

# Generate report
npm run test:report:pre-migration

echo "Pre-migration tests complete. Check reports/pre-migration-test-report.html"
```

### 7.2 Post-Migration Validation

```bash
#!/bin/bash
# scripts/run-post-migration-tests.sh

echo "Running Post-Migration Validation Suite..."

# 1. Test all Node.js services
echo "Testing Node.js services..."
npm run test:node-services

# 2. Verify API compatibility
echo "Verifying API compatibility..."
npm run test:api:compatibility

# 3. Compare performance metrics
echo "Comparing performance metrics..."
npm run test:performance:compare

# 4. Test rollback capability
echo "Testing rollback capability..."
npm run test:rollback:dry-run

# 5. Validate data migration
echo "Validating data migration..."
npm run test:data:validation

# Generate comprehensive report
npm run test:report:post-migration

echo "Post-migration validation complete. Check reports/post-migration-test-report.html"
```

### 7.3 Continuous Testing Pipeline

```yaml
# .github/workflows/migration-tests.yml
name: Migration Test Pipeline

on:
  push:
    branches: [migration-*, main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Setup test environment
        run: |
          npm ci
          npm run test:setup
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Store test artifacts
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: test-results/

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Compare with baseline
        run: npm run test:performance:compare
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./performance-results.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: `Performance Test Results:\n${results.summary}`
            });
```

## 8. Test Execution Plan

### Phase 1: Unit Testing (Week 1)
- [ ] Core service logic tests
- [ ] Mock implementation
- [ ] Error handling validation
- [ ] Code coverage >90%

### Phase 2: Integration Testing (Week 2)
- [ ] External service mocks
- [ ] API compatibility verification
- [ ] WebSocket functionality
- [ ] Data flow validation

### Phase 3: Performance Testing (Week 3)
- [ ] Baseline measurements
- [ ] Load testing
- [ ] Memory profiling
- [ ] Optimization validation

### Phase 4: Migration Testing (Week 4)
- [ ] Pre-migration validation
- [ ] Migration execution
- [ ] Post-migration verification
- [ ] Rollback testing

### Phase 5: Production Validation (Week 5)
- [ ] Staging deployment
- [ ] 24-hour soak test
- [ ] Production deployment
- [ ] Post-deployment monitoring

## Summary

This comprehensive testing strategy ensures:
1. **Complete code coverage** through unit and integration tests
2. **Performance validation** meeting or exceeding Flask benchmarks
3. **Safe rollback capability** with data preservation
4. **Frontend compatibility** with existing interfaces
5. **Production readiness** through extensive validation

The strategy emphasizes automation, continuous testing, and clear success metrics to ensure a smooth and reliable migration from Flask to Node.js.
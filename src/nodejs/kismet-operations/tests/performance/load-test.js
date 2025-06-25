/**
 * Performance and Load Testing Suite
 * Validates Node.js migration meets or exceeds Flask performance
 */

const autocannon = require('autocannon');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class PerformanceTestSuite {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:8092';
    this.wsUrl = options.wsUrl || 'ws://localhost:8092';
    this.results = {
      responseTimes: [],
      memoryUsage: [],
      cpuUsage: [],
      websocketMetrics: [],
      errors: []
    };
    this.testDuration = options.duration || 30; // seconds
  }

  /**
   * Run complete performance test suite
   */
  async runAllTests() {
    console.log('Starting Performance Test Suite...\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: await this.getEnvironmentInfo(),
      tests: {}
    };

    // 1. Response Time Benchmarks
    console.log('1. Running Response Time Benchmarks...');
    results.tests.responseTime = await this.testResponseTimes();
    
    // 2. Memory Usage Tests
    console.log('\n2. Running Memory Usage Tests...');
    results.tests.memory = await this.testMemoryUsage();
    
    // 3. Concurrent Request Handling
    console.log('\n3. Running Concurrent Request Tests...');
    results.tests.concurrent = await this.testConcurrentRequests();
    
    // 4. WebSocket Performance
    console.log('\n4. Running WebSocket Performance Tests...');
    results.tests.websocket = await this.testWebSocketPerformance();
    
    // 5. Data Processing Tests
    console.log('\n5. Running Data Processing Tests...');
    results.tests.dataProcessing = await this.testDataProcessing();
    
    // 6. Stress Testing
    console.log('\n6. Running Stress Tests...');
    results.tests.stress = await this.testStressScenarios();
    
    // Generate report
    await this.generateReport(results);
    
    return results;
  }

  /**
   * Test API endpoint response times
   */
  async testResponseTimes() {
    const endpoints = [
      { method: 'GET', path: '/api/spectrum/status' },
      { method: 'GET', path: '/api/spectrum/config' },
      { method: 'GET', path: '/api/spectrum/signals' },
      { method: 'POST', path: '/api/spectrum/config', body: JSON.stringify({ signal_threshold: -70 }) }
    ];

    const results = {};

    for (const endpoint of endpoints) {
      console.log(`  Testing ${endpoint.method} ${endpoint.path}...`);
      
      const testConfig = {
        url: this.baseUrl,
        connections: 10,
        duration: 10,
        requests: [{
          method: endpoint.method,
          path: endpoint.path,
          headers: endpoint.body ? { 'Content-Type': 'application/json' } : {},
          body: endpoint.body
        }]
      };

      const result = await autocannon(testConfig);
      
      results[`${endpoint.method} ${endpoint.path}`] = {
        latency: {
          mean: result.latency.mean,
          p50: result.latency.p50,
          p95: result.latency.p95,
          p99: result.latency.p99,
          max: result.latency.max
        },
        throughput: {
          mean: result.throughput.mean,
          total: result.throughput.total
        },
        requests: {
          mean: result.requests.mean,
          total: result.requests.total
        },
        errors: result.errors,
        timeouts: result.timeouts
      };

      // Check performance targets
      if (result.latency.mean > 15) {
        console.warn(`  ⚠️  Average latency ${result.latency.mean}ms exceeds 15ms target`);
      } else {
        console.log(`  ✓  Average latency: ${result.latency.mean}ms`);
      }
    }

    return results;
  }

  /**
   * Test memory usage under load
   */
  async testMemoryUsage() {
    const monitor = new MemoryMonitor();
    monitor.start();

    // Generate load
    const loadPromises = [];
    for (let i = 0; i < 50; i++) {
      loadPromises.push(this.simulateUserActivity());
    }

    await Promise.all(loadPromises);
    
    // Continue monitoring for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    monitor.stop();
    const report = monitor.getReport();

    // Check memory targets
    const passed = report.heapUsed.avg < 35 && report.rss.avg < 50;
    
    console.log(`  Heap Used: ${report.heapUsed.avg.toFixed(2)}MB (target: <35MB) ${report.heapUsed.avg < 35 ? '✓' : '✗'}`);
    console.log(`  RSS: ${report.rss.avg.toFixed(2)}MB (target: <50MB) ${report.rss.avg < 50 ? '✓' : '✗'}`);

    return {
      ...report,
      targetsMet: passed
    };
  }

  /**
   * Test concurrent request handling
   */
  async testConcurrentRequests() {
    const concurrentLevels = [10, 50, 100, 200];
    const results = {};

    for (const level of concurrentLevels) {
      console.log(`  Testing ${level} concurrent users...`);
      
      const startTime = performance.now();
      const promises = [];
      const errors = [];

      for (let i = 0; i < level; i++) {
        promises.push(
          this.simulateUserActivity().catch(err => {
            errors.push(err.message);
            return { error: true };
          })
        );
      }

      const responses = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      const successCount = responses.filter(r => !r.error).length;
      const errorCount = errors.length;

      results[level] = {
        duration: Math.round(duration),
        successRate: (successCount / level * 100).toFixed(2) + '%',
        errorCount,
        avgResponseTime: Math.round(duration / level),
        errors: errors.slice(0, 5) // First 5 errors
      };

      console.log(`    Success rate: ${results[level].successRate}`);
      console.log(`    Avg response: ${results[level].avgResponseTime}ms`);
    }

    return results;
  }

  /**
   * Test WebSocket performance
   */
  async testWebSocketPerformance() {
    const metrics = {
      connectionTime: [],
      messageLatency: [],
      messagesReceived: 0,
      errors: 0
    };

    const numClients = 20;
    const testDuration = 10000; // 10 seconds
    const clients = [];

    // Create multiple WebSocket clients
    for (let i = 0; i < numClients; i++) {
      const client = await this.createWebSocketClient(metrics);
      clients.push(client);
    }

    // Let them run for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration));

    // Close all clients
    clients.forEach(client => client.close());

    // Calculate results
    const avgConnectionTime = metrics.connectionTime.reduce((a, b) => a + b, 0) / metrics.connectionTime.length;
    const avgMessageLatency = metrics.messageLatency.length > 0 ? 
      metrics.messageLatency.reduce((a, b) => a + b, 0) / metrics.messageLatency.length : 0;

    console.log(`  Avg connection time: ${avgConnectionTime.toFixed(2)}ms`);
    console.log(`  Avg message latency: ${avgMessageLatency.toFixed(2)}ms`);
    console.log(`  Messages received: ${metrics.messagesReceived}`);
    console.log(`  Errors: ${metrics.errors}`);

    return {
      avgConnectionTime,
      avgMessageLatency,
      totalMessages: metrics.messagesReceived,
      messagesPerSecond: metrics.messagesReceived / (testDuration / 1000),
      errors: metrics.errors,
      clientCount: numClients
    };
  }

  /**
   * Test data processing performance
   */
  async testDataProcessing() {
    const fetch = (await import('node-fetch')).default;
    const FormData = (await import('form-data')).default;
    
    // Test file upload and processing
    const testSizes = [
      { name: 'Small', lines: 100 },
      { name: 'Medium', lines: 1000 },
      { name: 'Large', lines: 10000 }
    ];

    const results = {};

    for (const test of testSizes) {
      console.log(`  Testing ${test.name} file (${test.lines} devices)...`);
      
      // Generate test CSV
      const { generateLargeWigleCSV } = require('../fixtures/test-data');
      const csvData = generateLargeWigleCSV(test.lines);
      
      const form = new FormData();
      form.append('file', Buffer.from(csvData), {
        filename: 'test.wiglecsv',
        contentType: 'text/csv'
      });

      const startTime = performance.now();
      
      try {
        const response = await fetch(`${this.baseUrl}/upload_file`, {
          method: 'POST',
          body: form,
          headers: form.getHeaders()
        });

        const uploadTime = performance.now() - startTime;

        if (response.ok) {
          const data = await response.json();
          
          // Test processing
          const processStart = performance.now();
          const processResponse = await fetch(`${this.baseUrl}/process_file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_path: data.file_path,
              port: 6969
            })
          });

          const processTime = performance.now() - processStart;

          results[test.name] = {
            devices: test.lines,
            uploadTime: Math.round(uploadTime),
            processTime: Math.round(processTime),
            totalTime: Math.round(uploadTime + processTime),
            throughput: Math.round(test.lines / ((uploadTime + processTime) / 1000))
          };

          console.log(`    Upload: ${results[test.name].uploadTime}ms`);
          console.log(`    Process: ${results[test.name].processTime}ms`);
          console.log(`    Throughput: ${results[test.name].throughput} devices/sec`);
        }
      } catch (error) {
        results[test.name] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Stress test scenarios
   */
  async testStressScenarios() {
    const scenarios = [
      {
        name: 'Rapid Config Changes',
        test: async () => await this.stressConfigChanges()
      },
      {
        name: 'WebSocket Flood',
        test: async () => await this.stressWebSocketFlood()
      },
      {
        name: 'Memory Pressure',
        test: async () => await this.stressMemoryPressure()
      }
    ];

    const results = {};

    for (const scenario of scenarios) {
      console.log(`  Running ${scenario.name}...`);
      try {
        results[scenario.name] = await scenario.test();
        console.log(`    ✓ Completed`);
      } catch (error) {
        results[scenario.name] = { error: error.message };
        console.log(`    ✗ Failed: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Helper: Create WebSocket client for testing
   */
  async createWebSocketClient(metrics) {
    const connectionStart = performance.now();
    const ws = new WebSocket(this.wsUrl);

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        metrics.connectionTime.push(performance.now() - connectionStart);
        
        ws.on('message', (data) => {
          metrics.messagesReceived++;
          
          // Measure round-trip latency occasionally
          if (Math.random() < 0.1) {
            const pingStart = performance.now();
            ws.ping(() => {
              metrics.messageLatency.push(performance.now() - pingStart);
            });
          }
        });

        ws.on('error', () => {
          metrics.errors++;
        });

        resolve(ws);
      });

      ws.on('error', (err) => {
        metrics.errors++;
        reject(err);
      });
    });
  }

  /**
   * Helper: Simulate user activity
   */
  async simulateUserActivity() {
    const fetch = (await import('node-fetch')).default;
    
    // Typical user workflow
    const actions = [
      () => fetch(`${this.baseUrl}/api/spectrum/status`),
      () => fetch(`${this.baseUrl}/api/spectrum/config`),
      () => fetch(`${this.baseUrl}/api/spectrum/signals`),
      () => fetch(`${this.baseUrl}/api/spectrum/stats`)
    ];

    const results = [];
    for (const action of actions) {
      const start = performance.now();
      const response = await action();
      const duration = performance.now() - start;
      
      results.push({
        status: response.status,
        duration
      });
    }

    return results;
  }

  /**
   * Stress test: Rapid configuration changes
   */
  async stressConfigChanges() {
    const fetch = (await import('node-fetch')).default;
    const changes = 100;
    const results = {
      successful: 0,
      failed: 0,
      avgTime: 0
    };

    const times = [];

    for (let i = 0; i < changes; i++) {
      const config = {
        signal_threshold: -60 - (i % 20),
        center_freq: 145000000 + (i * 100000)
      };

      const start = performance.now();
      try {
        const response = await fetch(`${this.baseUrl}/api/spectrum/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });

        if (response.ok) {
          results.successful++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
      }
      
      times.push(performance.now() - start);
    }

    results.avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    return results;
  }

  /**
   * Stress test: WebSocket message flood
   */
  async stressWebSocketFlood() {
    const ws = new WebSocket(this.wsUrl);
    const messageCount = 1000;
    let sent = 0;
    let received = 0;
    let errors = 0;

    return new Promise((resolve) => {
      ws.on('open', () => {
        // Send messages rapidly
        const interval = setInterval(() => {
          if (sent < messageCount) {
            try {
              ws.send(JSON.stringify({ 
                action: 'ping', 
                timestamp: Date.now() 
              }));
              sent++;
            } catch (error) {
              errors++;
            }
          } else {
            clearInterval(interval);
            
            // Wait for responses
            setTimeout(() => {
              ws.close();
              resolve({
                sent,
                received,
                errors,
                lossRate: ((sent - received) / sent * 100).toFixed(2) + '%'
              });
            }, 2000);
          }
        }, 1);

        ws.on('message', () => {
          received++;
        });

        ws.on('error', () => {
          errors++;
        });
      });
    });
  }

  /**
   * Stress test: Memory pressure
   */
  async stressMemoryPressure() {
    const initialMemory = process.memoryUsage();
    const buffers = [];
    const results = {
      initialHeap: Math.round(initialMemory.heapUsed / 1024 / 1024),
      peakHeap: 0,
      finalHeap: 0,
      gcRuns: 0
    };

    // Monitor GC
    const gcStats = [];
    if (global.gc) {
      performance.on('gc', (info) => {
        gcStats.push(info);
        results.gcRuns++;
      });
    }

    // Create memory pressure
    for (let i = 0; i < 50; i++) {
      // Allocate 10MB buffers
      buffers.push(Buffer.alloc(10 * 1024 * 1024));
      
      const current = process.memoryUsage();
      const currentHeap = Math.round(current.heapUsed / 1024 / 1024);
      if (currentHeap > results.peakHeap) {
        results.peakHeap = currentHeap;
      }

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear buffers
    buffers.length = 0;

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalMemory = process.memoryUsage();
    results.finalHeap = Math.round(finalMemory.heapUsed / 1024 / 1024);
    results.recovered = results.peakHeap - results.finalHeap;
    results.recoveryRate = (results.recovered / (results.peakHeap - results.initialHeap) * 100).toFixed(2) + '%';

    return results;
  }

  /**
   * Get environment information
   */
  async getEnvironmentInfo() {
    const os = require('os');
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024) + 'MB',
      nodeVersion: process.version,
      pid: process.pid
    };
  }

  /**
   * Generate performance test report
   */
  async generateReport(results) {
    const reportPath = path.join(__dirname, `../../performance-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    
    console.log(`\n✓ Performance report saved to: ${reportPath}`);
    
    // Generate summary
    console.log('\n=== Performance Test Summary ===');
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`Node Version: ${results.environment.nodeVersion}`);
    
    // Response time summary
    const statusEndpoint = results.tests.responseTime['GET /api/spectrum/status'];
    if (statusEndpoint) {
      console.log(`\nResponse Times (GET /api/spectrum/status):`);
      console.log(`  Mean: ${statusEndpoint.latency.mean}ms`);
      console.log(`  P95: ${statusEndpoint.latency.p95}ms`);
      console.log(`  P99: ${statusEndpoint.latency.p99}ms`);
    }

    // Memory summary
    if (results.tests.memory) {
      console.log(`\nMemory Usage:`);
      console.log(`  Heap: ${results.tests.memory.heapUsed.avg.toFixed(2)}MB (target: <35MB)`);
      console.log(`  RSS: ${results.tests.memory.rss.avg.toFixed(2)}MB (target: <50MB)`);
      console.log(`  Targets Met: ${results.tests.memory.targetsMet ? '✓' : '✗'}`);
    }

    // WebSocket summary
    if (results.tests.websocket) {
      console.log(`\nWebSocket Performance:`);
      console.log(`  Avg Connection Time: ${results.tests.websocket.avgConnectionTime.toFixed(2)}ms`);
      console.log(`  Messages/sec: ${results.tests.websocket.messagesPerSecond.toFixed(2)}`);
    }

    // Overall assessment
    const passed = this.assessPerformance(results);
    console.log(`\nOverall Performance: ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  }

  /**
   * Assess if performance targets are met
   */
  assessPerformance(results) {
    const checks = [];

    // Check response times
    if (results.tests.responseTime) {
      const status = results.tests.responseTime['GET /api/spectrum/status'];
      checks.push(status && status.latency.mean < 15);
    }

    // Check memory usage
    if (results.tests.memory) {
      checks.push(results.tests.memory.targetsMet);
    }

    // Check concurrent handling
    if (results.tests.concurrent) {
      const success100 = parseFloat(results.tests.concurrent[100]?.successRate);
      checks.push(success100 > 95);
    }

    return checks.every(check => check === true);
  }
}

/**
 * Memory monitoring utility
 */
class MemoryMonitor {
  constructor() {
    this.samples = [];
    this.interval = null;
  }

  start(sampleInterval = 500) {
    this.interval = setInterval(() => {
      const usage = process.memoryUsage();
      this.samples.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers
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
        avg: heapUsedValues.reduce((a, b) => a + b, 0) / heapUsedValues.length / 1024 / 1024
      },
      rss: {
        min: Math.min(...rssValues) / 1024 / 1024,
        max: Math.max(...rssValues) / 1024 / 1024,
        avg: rssValues.reduce((a, b) => a + b, 0) / rssValues.length / 1024 / 1024
      }
    };
  }
}

// Export for use in other tests
module.exports = {
  PerformanceTestSuite,
  MemoryMonitor
};

// Run tests if executed directly
if (require.main === module) {
  const suite = new PerformanceTestSuite();
  suite.runAllTests().then(() => {
    console.log('\nPerformance tests completed.');
    process.exit(0);
  }).catch(error => {
    console.error('Performance tests failed:', error);
    process.exit(1);
  });
}
#!/usr/bin/env node
/**
 * API Compatibility Test Suite
 * Validates Node.js endpoints match Flask functionality exactly
 * 
 * Agent 5: API Compatibility Validation
 * User: Christian
 */

const http = require('http');
const axios = require('axios');
const chalk = require('chalk');
const { performance } = require('perf_hooks');

class APICompatibilityTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: []
    };
    
    // Configuration for test endpoints
    this.endpoints = {
      spectrum: {
        flask: 'http://localhost:8092',
        nodejs: 'http://localhost:3001'
      },
      wigletotak: {
        flask: 'http://localhost:8000', 
        nodejs: 'http://localhost:3002'
      }
    };
    
    this.timeout = 5000; // 5 second timeout
    this.performanceThresholds = {
      response_time_ms: 1000,
      memory_usage_mb: 100
    };
  }

  async runAllTests() {
    console.log(chalk.blue('🧪 Starting API Compatibility Test Suite'));
    console.log(chalk.gray('=' .repeat(60)));
    
    try {
      // Test Spectrum Analyzer APIs
      await this.testSpectrumAnalyzerAPIs();
      
      // Test WigleToTAK APIs  
      await this.testWigleToTAKAPIs();
      
      // Performance tests
      await this.runPerformanceTests();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error(chalk.red('❌ Test suite failed:'), error.message);
      process.exit(1);
    }
  }

  async testSpectrumAnalyzerAPIs() {
    console.log(chalk.yellow('\n📡 Testing Spectrum Analyzer APIs'));
    
    const tests = [
      {
        name: 'GET /',
        path: '/',
        method: 'GET',
        expectedStatus: 200,
        expectedType: 'text/html'
      },
      {
        name: 'GET /api/status',
        path: '/api/status',
        method: 'GET',
        expectedStatus: 200,
        expectedFields: ['connected', 'center_freq', 'samp_rate', 'fft_size'],
        expectedType: 'application/json'
      },
      {
        name: 'GET /api/config',
        path: '/api/config',
        method: 'GET',
        expectedStatus: 200,
        expectedFields: ['fft_size', 'center_freq', 'samp_rate', 'signal_threshold'],
        expectedType: 'application/json'
      },
      {
        name: 'GET /api/profiles',
        path: '/api/profiles',
        method: 'GET',
        expectedStatus: 200,
        expectedType: 'application/json'
      },
      {
        name: 'GET /api/scan/vhf',
        path: '/api/scan/vhf',
        method: 'GET',
        expectedStatus: 200,
        expectedFields: ['profile', 'scan_status', 'frequencies'],
        expectedType: 'application/json'
      }
    ];

    for (const test of tests) {
      await this.compareEndpoints('spectrum', test);
    }
  }

  async testWigleToTAKAPIs() {
    console.log(chalk.yellow('\n📶 Testing WigleToTAK APIs'));
    
    const tests = [
      {
        name: 'GET /',
        path: '/',
        method: 'GET',
        expectedStatus: 200,
        expectedType: 'text/html'
      },
      {
        name: 'GET /api/status',
        path: '/api/status',
        method: 'GET',
        expectedStatus: 200,
        expectedFields: ['broadcasting', 'tak_server_ip', 'tak_server_port'],
        expectedType: 'application/json'
      },
      {
        name: 'POST /update_tak_settings',
        path: '/update_tak_settings',
        method: 'POST',
        expectedStatus: 200,
        payload: { tak_server_ip: '127.0.0.1', tak_server_port: '6969' },
        expectedType: 'application/json'
      },
      {
        name: 'GET /get_antenna_settings',
        path: '/get_antenna_settings',
        method: 'GET',
        expectedStatus: 200,
        expectedFields: ['antenna_sensitivity', 'sensitivity_factors'],
        expectedType: 'application/json'
      },
      {
        name: 'POST /start_broadcast',
        path: '/start_broadcast',
        method: 'POST',
        expectedStatus: 200,
        expectedType: 'application/json'
      },
      {
        name: 'POST /stop_broadcast',
        path: '/stop_broadcast',
        method: 'POST',
        expectedStatus: 200,
        expectedType: 'application/json'
      }
    ];

    for (const test of tests) {
      await this.compareEndpoints('wigletotak', test);
    }
  }

  async compareEndpoints(service, test) {
    this.results.total++;
    const testResult = {
      service,
      test: test.name,
      passed: false,
      flask: null,
      nodejs: null,
      errors: [],
      performance: {}
    };

    try {
      console.log(chalk.gray(`  Testing: ${test.name}`));
      
      // Test Flask endpoint
      const flaskStart = performance.now();
      const flaskResponse = await this.makeRequest(
        this.endpoints[service].flask,
        test.path,
        test.method,
        test.payload
      );
      const flaskTime = performance.now() - flaskStart;
      
      // Test Node.js endpoint
      const nodejsStart = performance.now();
      const nodejsResponse = await this.makeRequest(
        this.endpoints[service].nodejs,
        test.path,
        test.method,
        test.payload
      );
      const nodejsTime = performance.now() - nodejsStart;

      testResult.flask = {
        status: flaskResponse.status,
        contentType: flaskResponse.headers['content-type'],
        data: flaskResponse.data,
        responseTime: flaskTime
      };

      testResult.nodejs = {
        status: nodejsResponse.status,
        contentType: nodejsResponse.headers['content-type'],
        data: nodejsResponse.data,
        responseTime: nodejsTime
      };

      testResult.performance.flask_ms = Math.round(flaskTime);
      testResult.performance.nodejs_ms = Math.round(nodejsTime);
      testResult.performance.difference_ms = Math.round(nodejsTime - flaskTime);

      // Validate responses match expected format
      await this.validateResponse(testResult, test);
      
      if (testResult.errors.length === 0) {
        testResult.passed = true;
        this.results.passed++;
        console.log(chalk.green(`    ✅ PASS - Flask: ${Math.round(flaskTime)}ms, Node.js: ${Math.round(nodejsTime)}ms`));
      } else {
        this.results.failed++;
        console.log(chalk.red(`    ❌ FAIL - ${testResult.errors.join(', ')}`));
      }

    } catch (error) {
      testResult.errors.push(`Request failed: ${error.message}`);
      this.results.failed++;
      console.log(chalk.red(`    ❌ ERROR - ${error.message}`));
    }

    this.results.tests.push(testResult);
  }

  async makeRequest(baseURL, path, method, payload = null) {
    const config = {
      method: method.toLowerCase(),
      url: `${baseURL}${path}`,
      timeout: this.timeout,
      validateStatus: () => true // Accept all status codes
    };

    if (payload && (method === 'POST' || method === 'PUT')) {
      config.data = payload;
      config.headers = { 'Content-Type': 'application/json' };
    }

    return await axios(config);
  }

  async validateResponse(testResult, test) {
    const { flask, nodejs } = testResult;

    // Status code comparison
    if (flask.status !== nodejs.status) {
      testResult.errors.push(`Status mismatch: Flask ${flask.status} vs Node.js ${nodejs.status}`);
    }

    // Content type comparison (basic check)
    if (test.expectedType) {
      const flaskType = flask.contentType?.split(';')[0];
      const nodejsType = nodejs.contentType?.split(';')[0];
      
      if (flaskType !== nodejsType) {
        testResult.errors.push(`Content-Type mismatch: Flask ${flaskType} vs Node.js ${nodejsType}`);
      }
    }

    // JSON structure comparison for API endpoints
    if (test.expectedFields && flask.status === 200 && nodejs.status === 200) {
      try {
        const flaskData = typeof flask.data === 'string' ? JSON.parse(flask.data) : flask.data;
        const nodejsData = typeof nodejs.data === 'string' ? JSON.parse(nodejs.data) : nodejs.data;

        for (const field of test.expectedFields) {
          if (!(field in flaskData)) {
            testResult.errors.push(`Flask missing field: ${field}`);
          }
          if (!(field in nodejsData)) {
            testResult.errors.push(`Node.js missing field: ${field}`);
          }
        }

        // Deep comparison of structure (not values, as they may vary)
        const flaskKeys = Object.keys(flaskData).sort();
        const nodejsKeys = Object.keys(nodejsData).sort();
        
        if (JSON.stringify(flaskKeys) !== JSON.stringify(nodejsKeys)) {
          testResult.errors.push(`JSON structure mismatch: Flask keys [${flaskKeys.join(', ')}] vs Node.js keys [${nodejsKeys.join(', ')}]`);
        }

      } catch (error) {
        testResult.errors.push(`JSON parsing error: ${error.message}`);
      }
    }
  }

  async runPerformanceTests() {
    console.log(chalk.yellow('\n⚡ Running Performance Tests'));
    
    const performanceTests = [
      {
        service: 'spectrum',
        path: '/api/status',
        requests: 10
      },
      {
        service: 'wigletotak',
        path: '/api/status',
        requests: 10
      }
    ];

    for (const perfTest of performanceTests) {
      await this.runConcurrentRequests(perfTest);
    }
  }

  async runConcurrentRequests(perfTest) {
    console.log(chalk.gray(`  Testing concurrent requests: ${perfTest.service}${perfTest.path}`));
    
    const promises = [];
    const startTime = performance.now();
    
    // Create concurrent requests
    for (let i = 0; i < perfTest.requests; i++) {
      const flaskPromise = this.makeRequest(
        this.endpoints[perfTest.service].flask,
        perfTest.path,
        'GET'
      );
      const nodejsPromise = this.makeRequest(
        this.endpoints[perfTest.service].nodejs,
        perfTest.path,
        'GET'
      );
      
      promises.push(flaskPromise, nodejsPromise);
    }

    try {
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const successCount = results.filter(r => r.status === 200).length;
      const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
      
      console.log(chalk.green(`    ✅ ${successCount}/${results.length} requests succeeded`));
      console.log(chalk.gray(`    📊 Total time: ${Math.round(totalTime)}ms, Avg response: ${Math.round(avgResponseTime)}ms`));
      
    } catch (error) {
      console.log(chalk.red(`    ❌ Concurrent test failed: ${error.message}`));
    }
  }

  generateReport() {
    console.log(chalk.blue('\n📋 API Compatibility Test Report'));
    console.log(chalk.gray('=' .repeat(60)));
    
    console.log(chalk.white(`Total Tests: ${this.results.total}`));
    console.log(chalk.green(`Passed: ${this.results.passed}`));
    console.log(chalk.red(`Failed: ${this.results.failed}`));
    console.log(chalk.yellow(`Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`));

    // Detailed failure report
    if (this.results.failed > 0) {
      console.log(chalk.red('\n❌ Failed Tests:'));
      this.results.tests
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(chalk.red(`  ${test.service}: ${test.test}`));
          test.errors.forEach(error => {
            console.log(chalk.gray(`    - ${error}`));
          });
        });
    }

    // Performance summary
    console.log(chalk.yellow('\n⚡ Performance Summary:'));
    const perfResults = this.results.tests.filter(t => t.performance.flask_ms && t.performance.nodejs_ms);
    
    if (perfResults.length > 0) {
      const avgFlask = perfResults.reduce((sum, t) => sum + t.performance.flask_ms, 0) / perfResults.length;
      const avgNodejs = perfResults.reduce((sum, t) => sum + t.performance.nodejs_ms, 0) / perfResults.length;
      
      console.log(chalk.gray(`  Average Flask Response: ${Math.round(avgFlask)}ms`));
      console.log(chalk.gray(`  Average Node.js Response: ${Math.round(avgNodejs)}ms`));
      console.log(chalk.gray(`  Performance Difference: ${Math.round(avgNodejs - avgFlask)}ms`));
    }

    // Export detailed results
    this.exportResults();
  }

  exportResults() {
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `api-compatibility-report-${timestamp}.json`;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        success_rate: Math.round((this.results.passed / this.results.total) * 100)
      },
      tests: this.results.tests,
      performance_thresholds: this.performanceThresholds
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(chalk.blue(`\n📄 Detailed report saved: ${filename}`));
  }
}

// Run the test suite
async function main() {
  const tester = new APICompatibilityTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = APICompatibilityTester;
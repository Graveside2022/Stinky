#!/usr/bin/env node
/**
 * Performance Testing Suite
 * Measures and compares Flask vs Node.js performance
 * 
 * Agent 5: API Compatibility Validation
 * User: Christian
 */

const axios = require('axios');
const chalk = require('chalk');
const { performance } = require('perf_hooks');
const os = require('os');

class PerformanceTester {
  constructor() {
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

    this.testConfig = {
      warmupRequests: 5,
      testRequests: 20,
      concurrentRequests: 10,
      timeout: 10000
    };

    this.results = {
      warmup: [],
      sequential: [],
      concurrent: [],
      memory: [],
      system: this.getSystemInfo()
    };
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
      freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
      nodeVersion: process.version
    };
  }

  async measureRequest(url, path, method = 'GET', payload = null) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    try {
      const config = {
        method: method.toLowerCase(),
        url: `${url}${path}`,
        timeout: this.testConfig.timeout,
        validateStatus: () => true
      };

      if (payload && (method === 'POST' || method === 'PUT')) {
        config.data = payload;
        config.headers = { 'Content-Type': 'application/json' };
      }

      const response = await axios(config);
      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      return {
        success: response.status >= 200 && response.status < 400,
        status: response.status,
        responseTime: endTime - startTime,
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        },
        contentLength: response.headers['content-length'] || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: performance.now() - startTime,
        memoryDelta: { rss: 0, heapUsed: 0, heapTotal: 0 },
        timestamp: new Date().toISOString()
      };
    }
  }

  async runWarmupTests() {
    console.log(chalk.yellow('🔥 Running warmup tests...'));
    
    const endpoints = [
      { service: 'spectrum', path: '/api/status' },
      { service: 'wigletotak', path: '/api/status' }
    ];

    for (const endpoint of endpoints) {
      const flaskURL = this.endpoints[endpoint.service].flask;
      const nodejsURL = this.endpoints[endpoint.service].nodejs;

      console.log(chalk.gray(`  Warming up: ${endpoint.service}${endpoint.path}`));

      // Warmup requests
      for (let i = 0; i < this.testConfig.warmupRequests; i++) {
        await Promise.all([
          this.measureRequest(flaskURL, endpoint.path),
          this.measureRequest(nodejsURL, endpoint.path)
        ]);
      }
    }

    console.log(chalk.green('✅ Warmup complete'));
  }

  async runSequentialTests() {
    console.log(chalk.yellow('\n⚡ Running sequential performance tests...'));

    const testCases = [
      { service: 'spectrum', path: '/api/status', method: 'GET' },
      { service: 'spectrum', path: '/api/config', method: 'GET' },
      { service: 'spectrum', path: '/api/profiles', method: 'GET' },
      { service: 'wigletotak', path: '/api/status', method: 'GET' },
      { service: 'wigletotak', path: '/get_antenna_settings', method: 'GET' }
    ];

    for (const testCase of testCases) {
      const results = await this.runSequentialTest(testCase);
      this.results.sequential.push(results);
    }
  }

  async runSequentialTest(testCase) {
    console.log(chalk.gray(`  Testing: ${testCase.service} ${testCase.path}`));

    const flaskURL = this.endpoints[testCase.service].flask;
    const nodejsURL = this.endpoints[testCase.service].nodejs;

    const flaskResults = [];
    const nodejsResults = [];

    // Run sequential requests
    for (let i = 0; i < this.testConfig.testRequests; i++) {
      const flaskResult = await this.measureRequest(flaskURL, testCase.path, testCase.method);
      const nodejsResult = await this.measureRequest(nodejsURL, testCase.path, testCase.method);

      flaskResults.push(flaskResult);
      nodejsResults.push(nodejsResult);
    }

    const analysis = this.analyzeResults(flaskResults, nodejsResults);
    
    console.log(chalk.gray(`    Flask avg: ${Math.round(analysis.flask.avgTime)}ms`));
    console.log(chalk.gray(`    Node.js avg: ${Math.round(analysis.nodejs.avgTime)}ms`));
    console.log(chalk.gray(`    Difference: ${Math.round(analysis.difference)}ms`));

    return {
      testCase,
      flask: flaskResults,
      nodejs: nodejsResults,
      analysis
    };
  }

  async runConcurrentTests() {
    console.log(chalk.yellow('\n🚀 Running concurrent performance tests...'));

    const testCases = [
      { service: 'spectrum', path: '/api/status' },
      { service: 'wigletotak', path: '/api/status' }
    ];

    for (const testCase of testCases) {
      const results = await this.runConcurrentTest(testCase);
      this.results.concurrent.push(results);
    }
  }

  async runConcurrentTest(testCase) {
    console.log(chalk.gray(`  Concurrent test: ${testCase.service} ${testCase.path}`));

    const flaskURL = this.endpoints[testCase.service].flask;
    const nodejsURL = this.endpoints[testCase.service].nodejs;

    // Create concurrent requests
    const flaskPromises = [];
    const nodejsPromises = [];

    const startTime = performance.now();

    for (let i = 0; i < this.testConfig.concurrentRequests; i++) {
      flaskPromises.push(this.measureRequest(flaskURL, testCase.path));
      nodejsPromises.push(this.measureRequest(nodejsURL, testCase.path));
    }

    const [flaskResults, nodejsResults] = await Promise.all([
      Promise.all(flaskPromises),
      Promise.all(nodejsPromises)
    ]);

    const totalTime = performance.now() - startTime;
    const analysis = this.analyzeResults(flaskResults, nodejsResults);

    console.log(chalk.gray(`    Total time: ${Math.round(totalTime)}ms`));
    console.log(chalk.gray(`    Flask success: ${flaskResults.filter(r => r.success).length}/${flaskResults.length}`));
    console.log(chalk.gray(`    Node.js success: ${nodejsResults.filter(r => r.success).length}/${nodejsResults.length}`));

    return {
      testCase,
      totalTime,
      flask: flaskResults,
      nodejs: nodejsResults,
      analysis
    };
  }

  analyzeResults(flaskResults, nodejsResults) {
    const flaskTimes = flaskResults.filter(r => r.success).map(r => r.responseTime);
    const nodejsTimes = nodejsResults.filter(r => r.success).map(r => r.responseTime);

    const flaskStats = this.calculateStats(flaskTimes);
    const nodejsStats = this.calculateStats(nodejsTimes);

    return {
      flask: {
        count: flaskResults.length,
        success: flaskResults.filter(r => r.success).length,
        avgTime: flaskStats.mean,
        minTime: flaskStats.min,
        maxTime: flaskStats.max,
        medianTime: flaskStats.median,
        stdDev: flaskStats.stdDev,
        p95: flaskStats.p95,
        p99: flaskStats.p99
      },
      nodejs: {
        count: nodejsResults.length,
        success: nodejsResults.filter(r => r.success).length,
        avgTime: nodejsStats.mean,
        minTime: nodejsStats.min,
        maxTime: nodejsStats.max,
        medianTime: nodejsStats.median,
        stdDev: nodejsStats.stdDev,
        p95: nodejsStats.p95,
        p99: nodejsStats.p99
      },
      difference: nodejsStats.mean - flaskStats.mean,
      improvement: ((flaskStats.mean - nodejsStats.mean) / flaskStats.mean) * 100
    };
  }

  calculateStats(values) {
    if (values.length === 0) return { mean: 0, min: 0, max: 0, median: 0, stdDev: 0, p95: 0, p99: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  async runFullPerformanceTest() {
    console.log(chalk.blue('⚡ Starting Performance Test Suite'));
    console.log(chalk.gray('=' .repeat(60)));

    console.log(chalk.white(`System Info:`));
    console.log(chalk.gray(`  Platform: ${this.results.system.platform} ${this.results.system.arch}`));
    console.log(chalk.gray(`  CPUs: ${this.results.system.cpus}`));
    console.log(chalk.gray(`  Memory: ${this.results.system.freeMemory}MB free / ${this.results.system.totalMemory}MB total`));
    console.log(chalk.gray(`  Node.js: ${this.results.system.nodeVersion}`));

    await this.runWarmupTests();
    await this.runSequentialTests();
    await this.runConcurrentTests();

    this.generatePerformanceReport();
  }

  generatePerformanceReport() {
    console.log(chalk.blue('\n📊 Performance Test Report'));
    console.log(chalk.gray('=' .repeat(60)));

    // Sequential test summary
    console.log(chalk.yellow('\n📈 Sequential Test Results'));
    this.results.sequential.forEach(result => {
      const { testCase, analysis } = result;
      const improvement = analysis.improvement > 0 ? 
        chalk.green(`+${Math.round(analysis.improvement)}% faster`) :
        chalk.red(`${Math.round(-analysis.improvement)}% slower`);

      console.log(chalk.white(`  ${testCase.service} ${testCase.path}:`));
      console.log(chalk.gray(`    Flask: ${Math.round(analysis.flask.avgTime)}ms (±${Math.round(analysis.flask.stdDev)}ms)`));
      console.log(chalk.gray(`    Node.js: ${Math.round(analysis.nodejs.avgTime)}ms (±${Math.round(analysis.nodejs.stdDev)}ms)`));
      console.log(chalk.gray(`    Node.js vs Flask: ${improvement}`));
    });

    // Concurrent test summary
    console.log(chalk.yellow('\n🚀 Concurrent Test Results'));
    this.results.concurrent.forEach(result => {
      const { testCase, analysis, totalTime } = result;
      console.log(chalk.white(`  ${testCase.service} ${testCase.path}:`));
      console.log(chalk.gray(`    Total time: ${Math.round(totalTime)}ms`));
      console.log(chalk.gray(`    Flask success rate: ${Math.round((analysis.flask.success / analysis.flask.count) * 100)}%`));
      console.log(chalk.gray(`    Node.js success rate: ${Math.round((analysis.nodejs.success / analysis.nodejs.count) * 100)}%`));
    });

    this.exportPerformanceResults();
  }

  exportPerformanceResults() {
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-test-${timestamp}.json`;

    const report = {
      timestamp: new Date().toISOString(),
      config: this.testConfig,
      system: this.results.system,
      results: {
        sequential: this.results.sequential,
        concurrent: this.results.concurrent
      }
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(chalk.blue(`\n📄 Performance report saved: ${filename}`));
  }
}

async function main() {
  const tester = new PerformanceTester();
  await tester.runFullPerformanceTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceTester;
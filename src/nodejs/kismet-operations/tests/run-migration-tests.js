#!/usr/bin/env node

/**
 * Migration Test Runner
 * Orchestrates the complete testing suite for Flask to Node.js migration
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const chalk = require('chalk');

class MigrationTestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, skipped: 0 },
      integration: { passed: 0, failed: 0, skipped: 0 },
      performance: { passed: false, metrics: {} },
      rollback: { passed: false, details: {} },
      overall: { passed: false, duration: 0 }
    };
    
    this.startTime = Date.now();
    this.reportDir = path.join(__dirname, '../test-reports');
  }

  async run() {
    console.log(chalk.bold.blue('\n🚀 Starting Migration Test Suite\n'));
    
    try {
      // Ensure report directory exists
      await fs.mkdir(this.reportDir, { recursive: true });

      // Phase 1: Pre-migration validation
      console.log(chalk.bold('\n📋 Phase 1: Pre-Migration Validation'));
      await this.runPreMigrationTests();

      // Phase 2: Unit tests
      console.log(chalk.bold('\n🧪 Phase 2: Unit Tests'));
      await this.runUnitTests();

      // Phase 3: Integration tests
      console.log(chalk.bold('\n🔗 Phase 3: Integration Tests'));
      await this.runIntegrationTests();

      // Phase 4: Performance tests
      console.log(chalk.bold('\n⚡ Phase 4: Performance Tests'));
      await this.runPerformanceTests();

      // Phase 5: Rollback tests
      console.log(chalk.bold('\n🔄 Phase 5: Rollback Tests'));
      await this.runRollbackTests();

      // Generate final report
      await this.generateFinalReport();

      // Display summary
      this.displaySummary();

    } catch (error) {
      console.error(chalk.red('\n❌ Test suite failed:'), error);
      process.exit(1);
    }
  }

  /**
   * Run pre-migration validation tests
   */
  async runPreMigrationTests() {
    const tests = [
      {
        name: 'Flask Services Health Check',
        command: 'curl',
        args: ['-f', 'http://localhost:8092/health'],
        optional: true
      },
      {
        name: 'System Dependencies',
        command: 'node',
        args: ['--version']
      },
      {
        name: 'Required Directories',
        command: 'ls',
        args: ['-la', '/home/pi/uploads', '/home/pi/config']
      }
    ];

    for (const test of tests) {
      const result = await this.runCommand(test.command, test.args, test.optional);
      console.log(`  ${result.success ? '✓' : '✗'} ${test.name}`);
    }
  }

  /**
   * Run unit tests
   */
  async runUnitTests() {
    console.log('  Running unit tests...');
    
    const jestConfig = {
      testMatch: ['**/tests/**/*.test.js'],
      testPathIgnorePatterns: ['/node_modules/', '/integration/', '/performance/'],
      collectCoverage: true,
      coverageDirectory: path.join(this.reportDir, 'coverage'),
      reporters: [
        'default',
        ['jest-junit', {
          outputDirectory: this.reportDir,
          outputName: 'junit-unit.xml'
        }]
      ]
    };

    const result = await this.runJest(jestConfig);
    this.results.unit = this.parseJestResults(result);
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('  Starting services for integration tests...');
    
    // Start test services
    const services = await this.startTestServices();
    
    try {
      const jestConfig = {
        testMatch: ['**/tests/integration/**/*.test.js'],
        collectCoverage: false,
        reporters: [
          'default',
          ['jest-junit', {
            outputDirectory: this.reportDir,
            outputName: 'junit-integration.xml'
          }]
        ]
      };

      const result = await this.runJest(jestConfig);
      this.results.integration = this.parseJestResults(result);
      
    } finally {
      // Stop test services
      await this.stopTestServices(services);
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    console.log('  Running performance benchmarks...');
    
    try {
      const { PerformanceTestSuite } = require('./performance/load-test');
      const suite = new PerformanceTestSuite();
      const results = await suite.runAllTests();
      
      // Check if performance targets are met
      this.results.performance.passed = this.assessPerformanceResults(results);
      this.results.performance.metrics = results;
      
      // Save detailed report
      await fs.writeFile(
        path.join(this.reportDir, 'performance-report.json'),
        JSON.stringify(results, null, 2)
      );
      
    } catch (error) {
      console.error(chalk.red('  Performance tests failed:'), error.message);
      this.results.performance.passed = false;
    }
  }

  /**
   * Run rollback tests
   */
  async runRollbackTests() {
    console.log('  Testing rollback procedures...');
    
    try {
      const RollbackTestSuite = require('./rollback/rollback-test');
      const suite = new RollbackTestSuite();
      const results = await suite.runAllTests();
      
      this.results.rollback.passed = results.summary?.rollbackSuccessful || false;
      this.results.rollback.details = results;
      
      // Save detailed report
      await fs.writeFile(
        path.join(this.reportDir, 'rollback-report.json'),
        JSON.stringify(results, null, 2)
      );
      
    } catch (error) {
      console.error(chalk.red('  Rollback tests failed:'), error.message);
      this.results.rollback.passed = false;
    }
  }

  /**
   * Run Jest with configuration
   */
  async runJest(config) {
    return new Promise((resolve) => {
      const jest = spawn('npx', ['jest', '--config', JSON.stringify(config)], {
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      jest.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      jest.stderr.on('data', (data) => {
        output += data.toString();
        process.stderr.write(data);
      });

      jest.on('close', (code) => {
        resolve({ code, output });
      });
    });
  }

  /**
   * Parse Jest results from output
   */
  parseJestResults(result) {
    const output = result.output;
    const passed = output.match(/(\d+) passed/);
    const failed = output.match(/(\d+) failed/);
    const skipped = output.match(/(\d+) skipped/);

    return {
      passed: passed ? parseInt(passed[1]) : 0,
      failed: failed ? parseInt(failed[1]) : 0,
      skipped: skipped ? parseInt(skipped[1]) : 0,
      exitCode: result.code
    };
  }

  /**
   * Run a shell command
   */
  async runCommand(command, args = [], optional = false) {
    return new Promise((resolve) => {
      const proc = spawn(command, args, { stdio: 'pipe' });
      
      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { output += data.toString(); });

      proc.on('close', (code) => {
        resolve({
          success: code === 0 || optional,
          code,
          output
        });
      });

      proc.on('error', (error) => {
        resolve({
          success: optional,
          error: error.message
        });
      });
    });
  }

  /**
   * Start test services
   */
  async startTestServices() {
    const services = [];
    
    // Start Node.js services in test mode
    const spectrumAnalyzer = spawn('node', [
      path.join(__dirname, '../../server.js'),
      '--test-mode'
    ], { detached: true });
    
    services.push({ name: 'spectrum-analyzer', process: spectrumAnalyzer });

    // Wait for services to be ready
    await this.waitForServices();
    
    return services;
  }

  /**
   * Stop test services
   */
  async stopTestServices(services) {
    for (const service of services) {
      try {
        process.kill(-service.process.pid);
      } catch (error) {
        console.warn(`  Warning: Could not stop ${service.name}:`, error.message);
      }
    }
  }

  /**
   * Wait for services to be ready
   */
  async waitForServices() {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const axios = require('axios');
        await axios.get('http://localhost:8092/api/spectrum/status');
        return;
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Services did not start in time');
  }

  /**
   * Assess performance results
   */
  assessPerformanceResults(results) {
    const checks = [];

    // Check response times
    if (results.tests?.responseTime) {
      const statusEndpoint = results.tests.responseTime['GET /api/spectrum/status'];
      checks.push(statusEndpoint?.latency?.mean < 15);
    }

    // Check memory usage
    if (results.tests?.memory) {
      checks.push(results.tests.memory.targetsMet);
    }

    // Check concurrent handling
    if (results.tests?.concurrent) {
      const success100 = parseFloat(results.tests.concurrent[100]?.successRate);
      checks.push(success100 > 95);
    }

    return checks.every(check => check === true);
  }

  /**
   * Generate final test report
   */
  async generateFinalReport() {
    const duration = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      results: this.results,
      summary: {
        unitTestsPassed: this.results.unit.failed === 0,
        integrationTestsPassed: this.results.integration.failed === 0,
        performanceTargetsMet: this.results.performance.passed,
        rollbackTestsPassed: this.results.rollback.passed,
        overallPassed: false
      }
    };

    // Determine overall pass/fail
    report.summary.overallPassed = Object.values(report.summary)
      .filter(v => typeof v === 'boolean')
      .every(v => v === true);

    this.results.overall.passed = report.summary.overallPassed;
    this.results.overall.duration = duration;

    // Save report
    const reportPath = path.join(this.reportDir, 'migration-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    await this.generateHTMLReport(report);

    console.log(chalk.green(`\n✓ Test report saved to: ${reportPath}`));
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Migration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .metric { font-weight: bold; }
    </style>
</head>
<body>
    <h1>Flask to Node.js Migration Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Date:</strong> ${report.timestamp}</p>
        <p><strong>Duration:</strong> ${(report.duration / 1000).toFixed(2)}s</p>
        <p><strong>Overall Result:</strong> 
            <span class="${report.summary.overallPassed ? 'passed' : 'failed'}">
                ${report.summary.overallPassed ? '✓ PASSED' : '✗ FAILED'}
            </span>
        </p>
    </div>

    <h2>Test Results</h2>
    <table>
        <tr>
            <th>Test Suite</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Status</th>
        </tr>
        <tr>
            <td>Unit Tests</td>
            <td>${report.results.unit.passed}</td>
            <td>${report.results.unit.failed}</td>
            <td class="${report.summary.unitTestsPassed ? 'passed' : 'failed'}">
                ${report.summary.unitTestsPassed ? '✓' : '✗'}
            </td>
        </tr>
        <tr>
            <td>Integration Tests</td>
            <td>${report.results.integration.passed}</td>
            <td>${report.results.integration.failed}</td>
            <td class="${report.summary.integrationTestsPassed ? 'passed' : 'failed'}">
                ${report.summary.integrationTestsPassed ? '✓' : '✗'}
            </td>
        </tr>
        <tr>
            <td>Performance Tests</td>
            <td colspan="2">See metrics below</td>
            <td class="${report.summary.performanceTargetsMet ? 'passed' : 'failed'}">
                ${report.summary.performanceTargetsMet ? '✓' : '✗'}
            </td>
        </tr>
        <tr>
            <td>Rollback Tests</td>
            <td colspan="2">See details below</td>
            <td class="${report.summary.rollbackTestsPassed ? 'passed' : 'failed'}">
                ${report.summary.rollbackTestsPassed ? '✓' : '✗'}
            </td>
        </tr>
    </table>

    <h2>Performance Metrics</h2>
    <p>Key performance indicators compared to Flask baseline:</p>
    <ul>
        <li>Response Time: <span class="metric">Target &lt; 15ms</span></li>
        <li>Memory Usage: <span class="metric">Target &lt; 35MB heap, &lt; 50MB RSS</span></li>
        <li>Concurrent Users: <span class="metric">Target &gt; 95% success rate at 100 users</span></li>
    </ul>

    <h2>Environment</h2>
    <ul>
        <li>Node Version: ${report.environment.node}</li>
        <li>Platform: ${report.environment.platform}</li>
        <li>Architecture: ${report.environment.arch}</li>
    </ul>
</body>
</html>
    `;

    const htmlPath = path.join(this.reportDir, 'migration-test-report.html');
    await fs.writeFile(htmlPath, html);
  }

  /**
   * Display test summary
   */
  displaySummary() {
    console.log(chalk.bold('\n📊 Test Summary\n'));

    const tests = [
      { name: 'Unit Tests', result: this.results.unit.failed === 0 },
      { name: 'Integration Tests', result: this.results.integration.failed === 0 },
      { name: 'Performance Tests', result: this.results.performance.passed },
      { name: 'Rollback Tests', result: this.results.rollback.passed }
    ];

    tests.forEach(test => {
      console.log(`  ${test.result ? chalk.green('✓') : chalk.red('✗')} ${test.name}`);
    });

    console.log(chalk.bold(`\n⏱️  Total Duration: ${(this.results.overall.duration / 1000).toFixed(2)}s`));
    
    if (this.results.overall.passed) {
      console.log(chalk.bold.green('\n✅ All tests PASSED! Migration is ready for deployment.\n'));
    } else {
      console.log(chalk.bold.red('\n❌ Some tests FAILED. Please review the reports.\n'));
      console.log(chalk.yellow(`Reports available at: ${this.reportDir}`));
    }
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new MigrationTestRunner();
  runner.run().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = MigrationTestRunner;
#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test categories
const testSuites = [
  {
    name: 'Unit Tests',
    pattern: 'unit/hackrf/*.test.js',
    description: 'Core functionality tests'
  },
  {
    name: 'Integration Tests',
    pattern: 'integration/hackrf/*.test.js',
    description: 'WebSocket and API integration'
  },
  {
    name: 'Performance Tests',
    pattern: 'performance/hackrf/*.test.js',
    description: 'Performance benchmarks',
    optional: true
  }
];

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  suites: []
};

// Run a test suite
function runTestSuite(suite) {
  return new Promise((resolve) => {
    console.log(`\n${colors.blue}Running ${suite.name}...${colors.reset}`);
    console.log(`${colors.yellow}${suite.description}${colors.reset}`);
    
    const testPath = path.join(__dirname, suite.pattern);
    const command = `npx jest ${testPath} --json --outputFile=/tmp/hackrf-test-results.json`;
    
    exec(command, (error, stdout, stderr) => {
      const suiteResult = {
        name: suite.name,
        passed: false,
        tests: 0,
        failures: 0,
        time: 0
      };
      
      try {
        // Read test results
        const resultsFile = '/tmp/hackrf-test-results.json';
        if (fs.existsSync(resultsFile)) {
          const testResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
          
          suiteResult.passed = testResults.success;
          suiteResult.tests = testResults.numTotalTests;
          suiteResult.failures = testResults.numFailedTests;
          suiteResult.time = (testResults.testResults.reduce((acc, t) => 
            acc + (t.perfStats?.runtime || 0), 0) / 1000).toFixed(2);
          
          if (testResults.success) {
            console.log(`${colors.green}✓ ${suite.name} passed (${suiteResult.tests} tests in ${suiteResult.time}s)${colors.reset}`);
            results.passed += suiteResult.tests - suiteResult.failures;
          } else {
            console.log(`${colors.red}✗ ${suite.name} failed (${suiteResult.failures}/${suiteResult.tests} tests failed)${colors.reset}`);
            results.failed += suiteResult.failures;
            results.passed += suiteResult.tests - suiteResult.failures;
            
            // Show failed test details
            testResults.testResults.forEach(file => {
              if (file.numFailedTests > 0) {
                console.log(`\n  ${colors.red}Failed in ${path.basename(file.name)}:${colors.reset}`);
                file.assertionResults
                  .filter(test => test.status === 'failed')
                  .forEach(test => {
                    console.log(`    - ${test.title}`);
                    if (test.failureMessages?.length > 0) {
                      console.log(`      ${test.failureMessages[0].split('\n')[0]}`);
                    }
                  });
              }
            });
          }
          
          // Clean up results file
          fs.unlinkSync(resultsFile);
        } else if (error && !suite.optional) {
          console.log(`${colors.red}✗ ${suite.name} failed to run${colors.reset}`);
          console.error(stderr);
          suiteResult.failures = 1;
          results.failed++;
        } else if (suite.optional) {
          console.log(`${colors.yellow}⚠ ${suite.name} skipped (optional)${colors.reset}`);
          results.skipped++;
        }
      } catch (parseError) {
        console.log(`${colors.red}✗ Failed to parse test results${colors.reset}`);
        console.error(parseError.message);
        suiteResult.failures = 1;
        results.failed++;
      }
      
      results.suites.push(suiteResult);
      resolve();
    });
  });
}

// Run code coverage
function runCoverage() {
  return new Promise((resolve) => {
    console.log(`\n${colors.blue}Running code coverage analysis...${colors.reset}`);
    
    const command = `npx jest tests/unit/hackrf/*.test.js tests/integration/hackrf/*.test.js --coverage --coverageDirectory=/tmp/hackrf-coverage --coverageReporters=json-summary`;
    
    exec(command, (error, stdout, stderr) => {
      if (!error) {
        try {
          const coverageFile = '/tmp/hackrf-coverage/coverage-summary.json';
          if (fs.existsSync(coverageFile)) {
            const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
            const total = coverage.total;
            
            console.log(`\n${colors.yellow}Code Coverage:${colors.reset}`);
            console.log(`  Lines:       ${total.lines.pct}%`);
            console.log(`  Statements:  ${total.statements.pct}%`);
            console.log(`  Functions:   ${total.functions.pct}%`);
            console.log(`  Branches:    ${total.branches.pct}%`);
            
            // Clean up
            exec('rm -rf /tmp/hackrf-coverage');
          }
        } catch (err) {
          console.log(`${colors.yellow}Could not generate coverage report${colors.reset}`);
        }
      }
      resolve();
    });
  });
}

// Generate test report
function generateReport() {
  const totalTests = results.passed + results.failed;
  const passRate = totalTests > 0 ? ((results.passed / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}HackRF Spectrum Analyzer Test Report${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);
  
  // Summary
  console.log(`${colors.yellow}Test Summary:${colors.reset}`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);
  console.log(`  Pass Rate: ${passRate}%`);
  
  // Suite breakdown
  console.log(`\n${colors.yellow}Suite Results:${colors.reset}`);
  results.suites.forEach(suite => {
    const status = suite.passed ? 
      `${colors.green}PASS${colors.reset}` : 
      `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${suite.name}: ${status} (${suite.tests} tests, ${suite.time}s)`);
  });
  
  // Exit code
  const exitCode = results.failed > 0 ? 1 : 0;
  
  if (exitCode === 0) {
    console.log(`\n${colors.green}All tests passed! 🎉${colors.reset}`);
  } else {
    console.log(`\n${colors.red}Some tests failed. Please fix the issues and try again.${colors.reset}`);
  }
  
  // Save report
  const reportFile = path.join(__dirname, 'hackrf-test-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      passRate: parseFloat(passRate)
    },
    suites: results.suites
  };
  
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: ${reportFile}`);
  
  return exitCode;
}

// Main execution
async function main() {
  console.log(`${colors.blue}HackRF Spectrum Analyzer Test Runner${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(40)}${colors.reset}`);
  
  // Check if jest is installed
  try {
    require.resolve('jest');
  } catch (e) {
    console.log(`${colors.red}Jest is not installed. Run 'npm install' first.${colors.reset}`);
    process.exit(1);
  }
  
  // Run all test suites
  for (const suite of testSuites) {
    await runTestSuite(suite);
  }
  
  // Run coverage analysis
  await runCoverage();
  
  // Generate and display report
  const exitCode = generateReport();
  
  process.exit(exitCode);
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Test runner failed:${colors.reset}`, error);
  process.exit(1);
});
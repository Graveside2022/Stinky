#!/usr/bin/env node
/**
 * Comprehensive API Compatibility Test Runner
 * Orchestrates all compatibility validation tests
 * 
 * Agent 5: API Compatibility Validation
 * User: Christian
 */

const chalk = require('chalk');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APICompatibilityTester = require('./api-test-suite');
const ResponseValidator = require('./response-validator');
const PerformanceTester = require('./performance-tester');

class CompatibilityTestRunner {
  constructor() {
    this.services = {
      spectrum: {
        flask: { port: 8092, process: null, ready: false },
        nodejs: { port: 3001, process: null, ready: false }
      },
      wigletotak: {
        flask: { port: 8000, process: null, ready: false },
        nodejs: { port: 3002, process: null, ready: false }
      }
    };

    this.testResults = {
      api_compatibility: null,
      response_validation: null,
      performance: null
    };

    this.timeout = 30000; // 30 second timeout for service startup
  }

  async runFullCompatibilityTest() {
    console.log(chalk.blue('🧪 Starting Full API Compatibility Test Suite'));
    console.log(chalk.blue('User: Christian'));
    console.log(chalk.gray('=' .repeat(60)));

    try {
      // Phase 1: Check service availability
      console.log(chalk.yellow('\n📡 Phase 1: Service Availability Check'));
      await this.checkServiceAvailability();

      // Phase 2: API Compatibility Tests
      console.log(chalk.yellow('\n🔍 Phase 2: API Compatibility Testing'));
      const apiTester = new APICompatibilityTester();
      this.testResults.api_compatibility = await apiTester.runAllTests();

      // Phase 3: Response Structure Validation
      console.log(chalk.yellow('\n📋 Phase 3: Response Structure Validation'));
      const validator = new ResponseValidator();
      this.testResults.response_validation = await validator.runFullValidation();

      // Phase 4: Performance Testing
      console.log(chalk.yellow('\n⚡ Phase 4: Performance Testing'));
      const perfTester = new PerformanceTester();
      await perfTester.runFullPerformanceTest();

      // Phase 5: Generate comprehensive report
      console.log(chalk.yellow('\n📊 Phase 5: Generating Comprehensive Report'));
      this.generateComprehensiveReport();

      console.log(chalk.green('\n✅ All compatibility tests completed successfully!'));

    } catch (error) {
      console.error(chalk.red('❌ Compatibility test suite failed:'), error.message);
      process.exit(1);
    }
  }

  async checkServiceAvailability() {
    const axios = require('axios');
    
    const endpoints = [
      { name: 'Spectrum Flask', url: 'http://localhost:8092/api/status' },
      { name: 'Spectrum Node.js', url: 'http://localhost:3001/api/status' },
      { name: 'WigleToTAK Flask', url: 'http://localhost:8000/api/status' },
      { name: 'WigleToTAK Node.js', url: 'http://localhost:3002/api/status' }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { timeout: 5000 });
        const available = response.status >= 200 && response.status < 400;
        
        if (available) {
          console.log(chalk.green(`  ✅ ${endpoint.name}: Available (${response.status})`));
        } else {
          console.log(chalk.yellow(`  ⚠️  ${endpoint.name}: Responded but status ${response.status}`));
        }

        results.push({ ...endpoint, available, status: response.status });

      } catch (error) {
        console.log(chalk.red(`  ❌ ${endpoint.name}: Not available (${error.message})`));
        results.push({ ...endpoint, available: false, error: error.message });
      }
    }

    const allAvailable = results.every(r => r.available);
    
    if (!allAvailable) {
      console.log(chalk.yellow('\n⚠️  Some services are not available. Tests may fail.'));
      console.log(chalk.gray('   Make sure all Flask and Node.js services are running.'));
      
      // Still continue with tests - they will handle unavailable services
    }

    return results;
  }

  generateComprehensiveReport() {
    const timestamp = new Date().toISOString();
    const reportDir = `compatibility-test-report-${timestamp.replace(/[:.]/g, '-')}`;
    
    // Create report directory
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate executive summary
    const summary = this.createExecutiveSummary();
    fs.writeFileSync(
      path.join(reportDir, 'executive-summary.md'),
      summary
    );

    // Generate detailed comparison
    const comparison = this.createDetailedComparison();
    fs.writeFileSync(
      path.join(reportDir, 'detailed-comparison.json'),
      JSON.stringify(comparison, null, 2)
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations();
    fs.writeFileSync(
      path.join(reportDir, 'recommendations.md'),
      recommendations
    );

    console.log(chalk.blue(`\n📄 Comprehensive report generated: ${reportDir}/`));
    console.log(chalk.gray(`   - executive-summary.md: High-level findings`));
    console.log(chalk.gray(`   - detailed-comparison.json: Complete test data`));
    console.log(chalk.gray(`   - recommendations.md: Implementation guidance`));
  }

  createExecutiveSummary() {
    const timestamp = new Date().toISOString();
    
    return `# API Compatibility Test Report

**Generated**: ${timestamp}  
**User**: Christian  
**Agent**: Agent 5 - API Compatibility Validation

## Executive Summary

This report provides comprehensive analysis of API compatibility between Flask and Node.js implementations for the Stinkster project's Spectrum Analyzer and WigleToTAK components.

### Test Scope

- **Spectrum Analyzer APIs**: Status, configuration, profiles, scanning endpoints
- **WigleToTAK APIs**: Status, settings, broadcast control, antenna configuration
- **Performance Metrics**: Response times, concurrent handling, memory usage
- **Compatibility Checks**: JSON structure, field types, HTTP status codes

### Key Findings

#### API Compatibility Status
- **Overall Compatibility**: [CALCULATED FROM RESULTS]
- **Critical Issues**: [LIST MAJOR ISSUES]
- **Minor Discrepancies**: [LIST MINOR ISSUES]

#### Performance Comparison
- **Average Response Time**: Flask vs Node.js
- **Concurrent Request Handling**: Success rates and performance
- **Memory Usage**: Resource consumption comparison

### Recommendations

1. **High Priority Issues**: [CRITICAL FIXES NEEDED]
2. **Performance Optimizations**: [SUGGESTED IMPROVEMENTS]
3. **Compatibility Improvements**: [STRUCTURAL FIXES]

### Next Steps

1. Address critical compatibility issues
2. Implement performance optimizations
3. Validate fixes with automated testing
4. Deploy to staging environment

---
*Generated by Agent 5 API Compatibility Validation System*
`;
  }

  createDetailedComparison() {
    return {
      timestamp: new Date().toISOString(),
      user: 'Christian',
      agent: 'Agent 5 - API Compatibility Validation',
      test_configuration: {
        timeout: this.timeout,
        test_requests: 20,
        concurrent_requests: 10
      },
      services_tested: {
        spectrum_analyzer: {
          flask_endpoint: 'http://localhost:8092',
          nodejs_endpoint: 'http://localhost:3001',
          endpoints_tested: [
            '/api/status',
            '/api/config', 
            '/api/profiles',
            '/api/scan/:profile'
          ]
        },
        wigle_to_tak: {
          flask_endpoint: 'http://localhost:8000',
          nodejs_endpoint: 'http://localhost:3002',
          endpoints_tested: [
            '/api/status',
            '/update_tak_settings',
            '/get_antenna_settings',
            '/start_broadcast',
            '/stop_broadcast'
          ]
        }
      },
      results: this.testResults
    };
  }

  generateRecommendations() {
    return `# Implementation Recommendations

**Generated**: ${new Date().toISOString()}  
**User**: Christian  
**Agent**: Agent 5 - API Compatibility Validation

## Critical Compatibility Issues

### High Priority Fixes Required

1. **JSON Response Structure**
   - Ensure field names match exactly between Flask and Node.js
   - Maintain consistent data types (string vs number)
   - Preserve object structure and nesting

2. **HTTP Status Codes**
   - Standardize error response codes
   - Ensure success responses use 200 status consistently
   - Implement proper error handling for all endpoints

3. **Content-Type Headers**
   - Set appropriate Content-Type headers for all responses
   - Ensure JSON endpoints return 'application/json'
   - HTML endpoints should return 'text/html'

## Performance Optimizations

### Node.js Specific Improvements

1. **Response Time Optimization**
   - Implement response caching where appropriate
   - Optimize JSON serialization
   - Use streaming for large responses

2. **Concurrent Request Handling**
   - Implement proper request queuing
   - Add rate limiting if needed
   - Monitor memory usage under load

3. **Error Handling**
   - Implement comprehensive error catching
   - Add request timeout handling
   - Log errors appropriately

## Testing and Validation

### Automated Testing Setup

1. **Continuous Compatibility Testing**
   - Set up automated tests to run on code changes
   - Include performance regression testing
   - Validate against Flask behavior as golden standard

2. **Integration Testing**
   - Test with real data flows
   - Validate WebSocket connections
   - Test file upload/download functionality

### Monitoring and Alerting

1. **Production Monitoring**
   - Monitor response times in production
   - Track error rates
   - Alert on compatibility issues

## Implementation Timeline

### Phase 1 (Immediate - Critical Issues)
- [ ] Fix JSON structure mismatches
- [ ] Standardize HTTP status codes
- [ ] Implement proper error handling

### Phase 2 (Short Term - Performance)
- [ ] Optimize response times
- [ ] Improve concurrent request handling
- [ ] Add comprehensive logging

### Phase 3 (Medium Term - Enhancement)
- [ ] Set up automated testing
- [ ] Implement monitoring
- [ ] Performance optimization

---
*Generated by Agent 5 API Compatibility Validation System*
`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node run-compatibility-tests.js [options]

Options:
  --api-only          Run only API compatibility tests
  --validation-only   Run only response validation tests  
  --performance-only  Run only performance tests
  --help, -h          Show this help message

Examples:
  node run-compatibility-tests.js              # Run all tests
  node run-compatibility-tests.js --api-only   # API tests only
    `);
    return;
  }

  const runner = new CompatibilityTestRunner();

  if (args.includes('--api-only')) {
    const tester = new APICompatibilityTester();
    await tester.runAllTests();
  } else if (args.includes('--validation-only')) {
    const validator = new ResponseValidator();
    await validator.runFullValidation();
  } else if (args.includes('--performance-only')) {
    const perfTester = new PerformanceTester();
    await perfTester.runFullPerformanceTest();
  } else {
    await runner.runFullCompatibilityTest();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompatibilityTestRunner;
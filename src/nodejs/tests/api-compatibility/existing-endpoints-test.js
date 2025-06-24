#!/usr/bin/env node
/**
 * Existing Endpoints Compatibility Test
 * Tests only the endpoints that exist in both Flask and Node.js implementations
 * 
 * Agent 5: API Compatibility Validation
 * User: Christian
 */

const http = require('http');
const { URL } = require('url');

class ExistingEndpointsTest {
  constructor() {
    // Only test endpoints that exist in BOTH implementations
    this.testCases = [
      {
        category: 'spectrum-analyzer',
        name: 'Status Endpoint',
        flask: 'http://localhost:8092/api/status',
        nodejs: 'http://localhost:3001/api/status',
        method: 'GET',
        commonFields: ['mode', 'openwebrx_connected', 'real_data', 'fft_buffer_size', 'last_fft_time']
      },
      {
        category: 'spectrum-analyzer', 
        name: 'Profiles Endpoint',
        flask: 'http://localhost:8092/api/profiles',
        nodejs: 'http://localhost:3001/api/profiles',
        method: 'GET',
        commonFields: [] // Structure varies, just test response format
      },
      {
        category: 'wigle-to-tak',
        name: 'Antenna Settings',
        flask: 'http://localhost:8000/get_antenna_settings',
        nodejs: 'http://localhost:3002/get_antenna_settings',
        method: 'GET',
        commonFields: ['antenna_sensitivity', 'sensitivity_factors']
      },
      {
        category: 'wigle-to-tak',
        name: 'Start Broadcast',
        flask: 'http://localhost:8000/start_broadcast',
        nodejs: 'http://localhost:3002/start_broadcast',
        method: 'POST',
        commonFields: [] // Response format may differ
      },
      {
        category: 'wigle-to-tak',
        name: 'Stop Broadcast',
        flask: 'http://localhost:8000/stop_broadcast',
        nodejs: 'http://localhost:3002/stop_broadcast',
        method: 'POST',
        commonFields: [] // Response format may differ
      }
    ];

    this.results = [];
  }

  async makeRequest(url, method = 'GET') {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: method,
        timeout: 5000,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            size: Buffer.byteLength(data)
          });
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (method === 'POST') {
        req.write('{}'); // Send empty JSON for POST requests
      }
      
      req.end();
    });
  }

  async testEndpointPair(testCase) {
    console.log(`\n📡 Testing: ${testCase.category} - ${testCase.name}`);
    console.log(`   Flask: ${testCase.flask}`);
    console.log(`   Node.js: ${testCase.nodejs}`);

    const result = {
      testCase: testCase.name,
      category: testCase.category,
      compatible: true,
      issues: [],
      flask: null,
      nodejs: null,
      performance: {}
    };

    try {
      // Test Flask endpoint
      const flaskStart = Date.now();
      const flaskResponse = await this.makeRequest(testCase.flask, testCase.method);
      const flaskTime = Date.now() - flaskStart;

      // Test Node.js endpoint  
      const nodejsStart = Date.now();
      const nodejsResponse = await this.makeRequest(testCase.nodejs, testCase.method);
      const nodejsTime = Date.now() - nodejsStart;

      result.flask = {
        status: flaskResponse.status,
        contentType: flaskResponse.headers['content-type'],
        responseTime: flaskTime,
        size: flaskResponse.size,
        data: flaskResponse.data
      };

      result.nodejs = {
        status: nodejsResponse.status,
        contentType: nodejsResponse.headers['content-type'],
        responseTime: nodejsTime,
        size: nodejsResponse.size,
        data: nodejsResponse.data
      };

      result.performance = {
        flask_ms: flaskTime,
        nodejs_ms: nodejsTime,
        difference_ms: nodejsTime - flaskTime,
        size_difference: nodejsResponse.size - flaskResponse.size
      };

      // Compatibility analysis
      this.analyzeCompatibility(result, testCase);

      // Report results
      if (result.issues.length === 0) {
        console.log(`   ✅ Compatible - Flask: ${flaskTime}ms, Node.js: ${nodejsTime}ms`);
      } else {
        result.compatible = false;
        console.log(`   ❌ Issues found:`);
        result.issues.forEach(issue => {
          console.log(`      - ${issue}`);
        });
      }

    } catch (error) {
      result.compatible = false;
      result.issues.push(`Test failed: ${error.message}`);
      console.log(`   ❌ Test failed: ${error.message}`);
    }

    return result;
  }

  analyzeCompatibility(result, testCase) {
    const { flask, nodejs } = result;

    // Status code comparison
    if (flask.status !== nodejs.status) {
      result.issues.push(`Status code mismatch: Flask ${flask.status} vs Node.js ${nodejs.status}`);
    }

    // Success status check
    const flaskSuccess = flask.status >= 200 && flask.status < 400;
    const nodejsSuccess = nodejs.status >= 200 && nodejs.status < 400;

    if (!flaskSuccess || !nodejsSuccess) {
      if (!flaskSuccess) result.issues.push(`Flask returned error status: ${flask.status}`);
      if (!nodejsSuccess) result.issues.push(`Node.js returned error status: ${nodejs.status}`);
      return; // Skip further analysis if either failed
    }

    // Content type comparison
    const flaskType = flask.contentType?.split(';')[0];
    const nodejsType = nodejs.contentType?.split(';')[0];
    
    if (flaskType !== nodejsType) {
      result.issues.push(`Content-Type mismatch: Flask '${flaskType}' vs Node.js '${nodejsType}'`);
    }

    // JSON structure analysis (if both are JSON)
    if (flaskType === 'application/json' && nodejsType === 'application/json') {
      try {
        const flaskData = JSON.parse(flask.data);
        const nodejsData = JSON.parse(nodejs.data);

        // Check for common fields
        if (testCase.commonFields && testCase.commonFields.length > 0) {
          for (const field of testCase.commonFields) {
            const flaskHas = field in flaskData;
            const nodejsHas = field in nodejsData;
            
            if (!flaskHas && !nodejsHas) {
              result.issues.push(`Both missing common field: '${field}'`);
            } else if (!flaskHas) {
              result.issues.push(`Flask missing field: '${field}'`);
            } else if (!nodejsHas) {
              result.issues.push(`Node.js missing field: '${field}'`);
            } else {
              // Check type compatibility
              const flaskType = typeof flaskData[field];
              const nodejsType = typeof nodejsData[field];
              if (flaskType !== nodejsType) {
                result.issues.push(`Field '${field}' type mismatch: Flask ${flaskType} vs Node.js ${nodejsType}`);
              }
            }
          }
        }

        // Overall structure comparison
        const flaskKeys = Object.keys(flaskData).sort();
        const nodejsKeys = Object.keys(nodejsData).sort();
        
        if (JSON.stringify(flaskKeys) !== JSON.stringify(nodejsKeys)) {
          const onlyFlask = flaskKeys.filter(k => !nodejsKeys.includes(k));
          const onlyNodejs = nodejsKeys.filter(k => !flaskKeys.includes(k));
          
          if (onlyFlask.length > 0) {
            result.issues.push(`Flask-only fields: [${onlyFlask.join(', ')}]`);
          }
          if (onlyNodejs.length > 0) {
            result.issues.push(`Node.js-only fields: [${onlyNodejs.join(', ')}]`);
          }
        }

        // Store parsed data for analysis
        result.flask.parsed = flaskData;
        result.nodejs.parsed = nodejsData;

      } catch (error) {
        result.issues.push(`JSON parsing error: ${error.message}`);
      }
    }

    // Performance analysis
    if (result.performance.difference_ms > 1000) {
      result.issues.push(`Significant performance difference: ${result.performance.difference_ms}ms`);
    }

    // Size analysis
    if (Math.abs(result.performance.size_difference) > 1000) {
      result.issues.push(`Significant response size difference: ${result.performance.size_difference} bytes`);
    }
  }

  async runCompatibilityTest() {
    console.log('🧪 Existing Endpoints Compatibility Test');
    console.log('User: Christian');
    console.log('Agent: Agent 5 - API Compatibility Validation');
    console.log('Testing only endpoints that exist in BOTH implementations');
    console.log('=' .repeat(70));

    for (const testCase of this.testCases) {
      const result = await this.testEndpointPair(testCase);
      this.results.push(result);
    }

    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 Compatibility Test Report');
    console.log('=' .repeat(70));

    const compatible = this.results.filter(r => r.compatible);
    const incompatible = this.results.filter(r => !r.compatible);

    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${this.results.length}`);
    console.log(`   Compatible: ${compatible.length}`);
    console.log(`   Incompatible: ${incompatible.length}`);
    console.log(`   Success Rate: ${Math.round((compatible.length / this.results.length) * 100)}%`);

    // Category breakdown
    const categories = [...new Set(this.results.map(r => r.category))];
    console.log(`\n📋 Results by Category:`);
    
    categories.forEach(category => {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryCompatible = categoryResults.filter(r => r.compatible).length;
      console.log(`   ${category}: ${categoryCompatible}/${categoryResults.length} compatible`);
    });

    // Performance summary
    console.log(`\n⚡ Performance Summary:`);
    const perfResults = this.results.filter(r => r.performance.flask_ms && r.performance.nodejs_ms);
    if (perfResults.length > 0) {
      const avgFlask = perfResults.reduce((sum, r) => sum + r.performance.flask_ms, 0) / perfResults.length;
      const avgNodejs = perfResults.reduce((sum, r) => sum + r.performance.nodejs_ms, 0) / perfResults.length;
      
      console.log(`   Average Flask Response: ${Math.round(avgFlask)}ms`);
      console.log(`   Average Node.js Response: ${Math.round(avgNodejs)}ms`);
      console.log(`   Performance Delta: ${Math.round(avgNodejs - avgFlask)}ms`);
    }

    // Critical issues
    if (incompatible.length > 0) {
      console.log(`\n❌ Critical Compatibility Issues:`);
      incompatible.forEach(result => {
        console.log(`   ${result.category} - ${result.testCase}:`);
        result.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      });
    }

    // Export results
    this.exportResults();
  }

  exportResults() {
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `existing-endpoints-compatibility-${timestamp}.json`;

    const report = {
      timestamp: new Date().toISOString(),
      user: 'Christian',
      agent: 'Agent 5 - API Compatibility Validation',
      test_scope: 'Endpoints existing in both Flask and Node.js implementations',
      summary: {
        total: this.results.length,
        compatible: this.results.filter(r => r.compatible).length,
        incompatible: this.results.filter(r => !r.compatible).length,
        success_rate: Math.round((this.results.filter(r => r.compatible).length / this.results.length) * 100)
      },
      results: this.results
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${filename}`);
  }
}

async function main() {
  const tester = new ExistingEndpointsTest();
  await tester.runCompatibilityTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ExistingEndpointsTest;
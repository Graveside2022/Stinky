#!/usr/bin/env node
/**
 * Quick Endpoint Compatibility Check
 * Basic validation without external dependencies
 * 
 * Agent 5: API Compatibility Validation
 * User: Christian
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class QuickEndpointChecker {
  constructor() {
    this.endpoints = [
      // Spectrum Analyzer endpoints
      { 
        name: 'Spectrum Status Flask', 
        url: 'http://localhost:8092/api/status',
        expected: { status: 200, type: 'json', fields: ['connected', 'center_freq'] }
      },
      { 
        name: 'Spectrum Status Node.js', 
        url: 'http://localhost:3001/api/status',
        expected: { status: 200, type: 'json', fields: ['connected', 'center_freq'] }
      },
      { 
        name: 'Spectrum Config Flask', 
        url: 'http://localhost:8092/api/config',
        expected: { status: 200, type: 'json', fields: ['fft_size'] }
      },
      { 
        name: 'Spectrum Config Node.js', 
        url: 'http://localhost:3001/api/config',
        expected: { status: 200, type: 'json', fields: ['fft_size'] }
      },
      
      // WigleToTAK endpoints - Flask doesn't have /api/status, only Node.js does
      { 
        name: 'WigleToTAK Root Flask', 
        url: 'http://localhost:8000/',
        expected: { status: 200, type: 'html', fields: [] }
      },
      { 
        name: 'WigleToTAK Status Node.js', 
        url: 'http://localhost:3002/api/status',
        expected: { status: 200, type: 'json', fields: ['broadcasting'] }
      }
    ];
    
    this.results = [];
  }

  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 5000
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
            data: data
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

      req.end();
    });
  }

  async checkEndpoint(endpoint) {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(endpoint.url);
      const responseTime = Date.now() - startTime;
      
      const result = {
        name: endpoint.name,
        url: endpoint.url,
        success: true,
        status: response.status,
        responseTime: responseTime,
        contentType: response.headers['content-type'] || 'unknown',
        data: response.data,
        issues: []
      };

      // Validate response
      if (response.status !== endpoint.expected.status) {
        result.issues.push(`Expected status ${endpoint.expected.status}, got ${response.status}`);
      }

      if (endpoint.expected.type === 'json') {
        try {
          const jsonData = JSON.parse(response.data);
          
          // Check for expected fields (skip if fields array is empty)
          if (endpoint.expected.fields && endpoint.expected.fields.length > 0) {
            for (const field of endpoint.expected.fields) {
              if (!(field in jsonData)) {
                result.issues.push(`Missing expected field: ${field}`);
              }
            }
          }
          
          result.parsedData = jsonData;
          
        } catch (e) {
          result.issues.push(`Invalid JSON response: ${e.message}`);
        }
      } else if (endpoint.expected.type === 'html') {
        // For HTML responses, just check if it looks like HTML
        if (!response.data.includes('<html') && !response.data.includes('<!DOCTYPE') && !response.data.includes('<!doctype')) {
          result.issues.push('Expected HTML response but got non-HTML content');
        }
      }

      return result;

    } catch (error) {
      return {
        name: endpoint.name,
        url: endpoint.url,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        issues: [`Request failed: ${error.message}`]
      };
    }
  }

  async runAllChecks() {
    console.log('🧪 Quick API Endpoint Compatibility Check');
    console.log('User: Christian');
    console.log('Agent: Agent 5 - API Compatibility Validation');
    console.log('=' .repeat(60));

    for (const endpoint of this.endpoints) {
      console.log(`\n📡 Testing: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      
      const result = await this.checkEndpoint(endpoint);
      this.results.push(result);

      if (result.success) {
        console.log(`   ✅ Status: ${result.status} (${result.responseTime}ms)`);
        console.log(`   📄 Content-Type: ${result.contentType}`);
        
        if (result.parsedData) {
          const fields = Object.keys(result.parsedData);
          console.log(`   🔑 JSON Fields: [${fields.join(', ')}]`);
        }
        
        if (result.issues.length > 0) {
          console.log(`   ⚠️  Issues:`);
          result.issues.forEach(issue => console.log(`      - ${issue}`));
        }
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    }

    this.generateCompatibilityReport();
  }

  generateCompatibilityReport() {
    console.log('\n📋 Compatibility Analysis');
    console.log('=' .repeat(60));

    // Group by service
    const spectrumResults = this.results.filter(r => r.name.includes('Spectrum'));
    const wigleResults = this.results.filter(r => r.name.includes('WigleToTAK'));

    this.compareServiceEndpoints('Spectrum Analyzer', spectrumResults);
    this.compareServiceEndpoints('WigleToTAK', wigleResults);

    // Overall summary
    const successCount = this.results.filter(r => r.success && r.issues.length === 0).length;
    const totalCount = this.results.length;
    
    console.log(`\n📊 Overall Compatibility Summary:`);
    console.log(`   Total Endpoints: ${totalCount}`);
    console.log(`   Successful: ${this.results.filter(r => r.success).length}`);
    console.log(`   Compatible: ${successCount}`);
    console.log(`   Success Rate: ${Math.round((successCount / totalCount) * 100)}%`);

    // Export results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `quick-compatibility-check-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      user: 'Christian',
      agent: 'Agent 5 - API Compatibility Validation',
      results: this.results,
      summary: {
        total: totalCount,
        successful: this.results.filter(r => r.success).length,
        compatible: successCount,
        success_rate: Math.round((successCount / totalCount) * 100)
      }
    }, null, 2));

    console.log(`\n📄 Detailed results saved: ${filename}`);
  }

  compareServiceEndpoints(serviceName, results) {
    console.log(`\n📡 ${serviceName} Compatibility:`);
    
    const flaskResults = results.filter(r => r.name.includes('Flask'));
    const nodejsResults = results.filter(r => r.name.includes('Node.js'));

    for (let i = 0; i < Math.min(flaskResults.length, nodejsResults.length); i++) {
      const flask = flaskResults[i];
      const nodejs = nodejsResults[i];
      
      const endpoint = flask.url.split('/').pop();
      console.log(`   ${endpoint}:`);
      
      // Status comparison
      if (flask.success && nodejs.success) {
        if (flask.status === nodejs.status) {
          console.log(`     ✅ Status: Both return ${flask.status}`);
        } else {
          console.log(`     ❌ Status: Flask ${flask.status} vs Node.js ${nodejs.status}`);
        }
        
        // Performance comparison
        const perfDiff = nodejs.responseTime - flask.responseTime;
        const symbol = perfDiff > 0 ? '🐌' : '⚡';
        console.log(`     ${symbol} Performance: Flask ${flask.responseTime}ms, Node.js ${nodejs.responseTime}ms (${perfDiff > 0 ? '+' : ''}${perfDiff}ms)`);
        
        // JSON structure comparison
        if (flask.parsedData && nodejs.parsedData) {
          const flaskKeys = Object.keys(flask.parsedData).sort();
          const nodejsKeys = Object.keys(nodejs.parsedData).sort();
          
          if (JSON.stringify(flaskKeys) === JSON.stringify(nodejsKeys)) {
            console.log(`     ✅ Structure: Identical fields [${flaskKeys.join(', ')}]`);
          } else {
            console.log(`     ❌ Structure: Flask [${flaskKeys.join(', ')}] vs Node.js [${nodejsKeys.join(', ')}]`);
          }
        }
        
      } else {
        if (!flask.success) console.log(`     ❌ Flask: ${flask.error}`);
        if (!nodejs.success) console.log(`     ❌ Node.js: ${nodejs.error}`);
      }
    }
  }
}

// Run the quick check
async function main() {
  const checker = new QuickEndpointChecker();
  await checker.runAllChecks();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = QuickEndpointChecker;
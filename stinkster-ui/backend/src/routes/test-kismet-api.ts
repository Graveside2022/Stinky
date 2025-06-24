#!/usr/bin/env node
/**
 * Integration test script for Kismet API endpoints
 * Run with: ts-node test-kismet-api.ts
 */

import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:8080/api/kismet';

interface TestResult {
  endpoint: string;
  method: string;
  success: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any,
  params?: any
): Promise<void> {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      params,
      timeout: 5000
    });
    
    results.push({
      endpoint,
      method,
      success: true,
      data: response.data
    });
    
    console.log(`✓ ${method} ${endpoint}`);
  } catch (error) {
    const errorMessage = axios.isAxiosError(error) 
      ? error.response?.data?.error || error.message 
      : 'Unknown error';
    
    results.push({
      endpoint,
      method,
      success: false,
      error: errorMessage
    });
    
    console.error(`✗ ${method} ${endpoint}: ${errorMessage}`);
  }
}

async function runTests() {
  console.log('Testing Kismet API Endpoints');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  // Service Management
  console.log('=== Service Management ===');
  await testEndpoint('GET', '/service/status');
  
  // Device Management
  console.log('\n=== Device Management ===');
  await testEndpoint('GET', '/devices', undefined, { page: 1, limit: 10 });
  await testEndpoint('GET', '/devices/stats', undefined, { groupBy: 'type' });
  await testEndpoint('POST', '/devices/search', { criteria: { text: 'test' } });
  await testEndpoint('GET', '/networks');
  await testEndpoint('GET', '/clients');
  
  // Script Management
  console.log('\n=== Script Management ===');
  await testEndpoint('GET', '/scripts');
  await testEndpoint('GET', '/scripts/history');
  
  // Configuration Management
  console.log('\n=== Configuration Management ===');
  await testEndpoint('GET', '/config');
  await testEndpoint('POST', '/config/validate', { 
    config: { 
      server_name: 'Test',
      log_types: 'pcap,kismet',
      log_prefix: 'test'
    } 
  });
  
  // System Monitoring
  console.log('\n=== System Monitoring ===');
  await testEndpoint('GET', '/status');
  await testEndpoint('GET', '/stats');
  await testEndpoint('GET', '/metrics');
  
  // Data Management
  console.log('\n=== Data Management ===');
  await testEndpoint('GET', '/datasources');
  await testEndpoint('GET', '/alerts');
  await testEndpoint('GET', '/gps/status');
  await testEndpoint('GET', '/channels/stats');
  
  // Summary
  console.log('\n=== Test Summary ===');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`- ${r.method} ${r.endpoint}: ${r.error}`);
      });
  }
  
  // Save detailed results
  const fs = await import('fs/promises');
  await fs.writeFile(
    'kismet-api-test-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('\nDetailed results saved to kismet-api-test-results.json');
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };
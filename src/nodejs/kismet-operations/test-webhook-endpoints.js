#!/usr/bin/env node

/**
 * Test script to verify webhook endpoints are mounted and working
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8002';

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testEndpoint(method, path, data = null, expectedStatus = 200) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n${colors.blue}Testing ${method} ${url}${colors.reset}`);
  
  try {
    const config = {
      method,
      url,
      data,
      validateStatus: () => true // Don't throw on any status
    };
    
    const response = await axios(config);
    
    if (response.status === expectedStatus) {
      console.log(`${colors.green}✓ Status: ${response.status} (Expected)${colors.reset}`);
      console.log(`Response:`, JSON.stringify(response.data, null, 2));
      return true;
    } else {
      console.log(`${colors.red}✗ Status: ${response.status} (Expected: ${expectedStatus})${colors.reset}`);
      console.log(`Response:`, JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response:`, JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function runTests() {
  console.log(`${colors.yellow}=== Webhook Endpoint Tests ===${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}`);
  
  let successCount = 0;
  let totalTests = 0;
  
  // Test 1: Configure webhook
  totalTests++;
  const webhookConfig = {
    url: 'https://example.com/webhook',
    events: ['device_detected', 'network_found'],
    enabled: true,
    headers: {
      'X-API-Key': 'test-key'
    }
  };
  
  if (await testEndpoint('POST', '/api/webhooks/configure', webhookConfig, 201)) {
    successCount++;
  }
  
  // Test 2: Get all webhooks
  totalTests++;
  if (await testEndpoint('GET', '/api/webhooks', null, 200)) {
    successCount++;
  }
  
  // Test 3: Configure another webhook
  totalTests++;
  const webhookConfig2 = {
    url: 'https://another-example.com/webhook',
    events: ['all'],
    enabled: false
  };
  
  let webhookId = null;
  const configResponse = await axios.post(`${BASE_URL}/api/webhooks/configure`, webhookConfig2);
  if (configResponse.status === 201 && configResponse.data.webhook) {
    webhookId = configResponse.data.webhook.id;
    console.log(`${colors.green}✓ Created webhook with ID: ${webhookId}${colors.reset}`);
    successCount++;
  }
  
  // Test 4: Get webhooks with filter
  totalTests++;
  if (await testEndpoint('GET', '/api/webhooks?enabled=false', null, 200)) {
    successCount++;
  }
  
  // Test 5: Delete webhook
  if (webhookId) {
    totalTests++;
    if (await testEndpoint('DELETE', `/api/webhooks/${webhookId}`, null, 200)) {
      successCount++;
    }
  }
  
  // Test 6: Try to delete non-existent webhook
  totalTests++;
  if (await testEndpoint('DELETE', '/api/webhooks/non-existent-id', null, 404)) {
    successCount++;
  }
  
  // Test 7: Invalid webhook configuration
  totalTests++;
  const invalidConfig = {
    url: 'not-a-valid-url',
    events: 'should-be-array'
  };
  if (await testEndpoint('POST', '/api/webhooks/configure', invalidConfig, 400)) {
    successCount++;
  }
  
  // Test 8: Test webhook health endpoint
  totalTests++;
  if (await testEndpoint('GET', '/api/webhook/health', null, 200)) {
    successCount++;
  }
  
  // Summary
  console.log(`\n${colors.yellow}=== Test Summary ===${colors.reset}`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${colors.green}${successCount}${colors.reset}`);
  console.log(`Failed: ${colors.red}${totalTests - successCount}${colors.reset}`);
  
  if (successCount === totalTests) {
    console.log(`\n${colors.green}All tests passed! ✓${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}Some tests failed ✗${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test runner error:${colors.reset}`, error);
  process.exit(1);
});
#!/usr/bin/env node

const http = require('http');
const https = require('https');

console.log('=== Kismet Network Connectivity Test ===\n');

// Test 1: Direct HTTP request
function testDirectAccess() {
    console.log('1. Testing direct HTTP access to Kismet...');
    
    const options = {
        hostname: 'localhost',
        port: 2501,
        path: '/',
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'text/html',
        }
    };
    
    const req = http.request(options, (res) => {
        console.log('   Status Code:', res.statusCode);
        console.log('   Headers:');
        Object.entries(res.headers).forEach(([key, value]) => {
            if (key.toLowerCase().includes('frame') || 
                key.toLowerCase().includes('security') ||
                key.toLowerCase().includes('cookie') ||
                key.toLowerCase().includes('auth')) {
                console.log(`   - ${key}: ${value}`);
            }
        });
        
        if (res.headers['set-cookie']) {
            console.log('\n   ✓ Kismet returned a session cookie (authentication may be working)');
        }
        
        console.log('\n');
        testWithAuthentication();
    });
    
    req.on('error', (e) => {
        console.error('   ✗ Error:', e.message);
        console.log('\n');
        testWithAuthentication();
    });
    
    req.end();
}

// Test 2: With Basic Authentication
function testWithAuthentication() {
    console.log('2. Testing with Basic Authentication...');
    
    const auth = Buffer.from('admin:admin').toString('base64');
    
    const options = {
        hostname: 'localhost',
        port: 2501,
        path: '/',
        method: 'GET',
        headers: {
            'Authorization': `Basic ${auth}`,
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'text/html',
        }
    };
    
    const req = http.request(options, (res) => {
        console.log('   Status Code:', res.statusCode);
        if (res.headers['set-cookie']) {
            console.log('   ✓ Received session cookie:', res.headers['set-cookie'][0].split(';')[0]);
        }
        console.log('\n');
        testCORS();
    });
    
    req.on('error', (e) => {
        console.error('   ✗ Error:', e.message);
        console.log('\n');
        testCORS();
    });
    
    req.end();
}

// Test 3: CORS Headers
function testCORS() {
    console.log('3. Testing CORS headers...');
    
    const options = {
        hostname: 'localhost',
        port: 2501,
        path: '/',
        method: 'OPTIONS',
        headers: {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
        }
    };
    
    const req = http.request(options, (res) => {
        console.log('   Status Code:', res.statusCode);
        
        const corsHeaders = [
            'access-control-allow-origin',
            'access-control-allow-methods',
            'access-control-allow-headers',
            'access-control-allow-credentials'
        ];
        
        corsHeaders.forEach(header => {
            if (res.headers[header]) {
                console.log(`   ✓ ${header}: ${res.headers[header]}`);
            } else {
                console.log(`   ✗ ${header}: Not present`);
            }
        });
        
        console.log('\n');
        testIframeHeaders();
    });
    
    req.on('error', (e) => {
        console.error('   ✗ Error:', e.message);
        console.log('\n');
        testIframeHeaders();
    });
    
    req.end();
}

// Test 4: Check iframe-blocking headers
function testIframeHeaders() {
    console.log('4. Testing iframe-blocking headers...');
    
    const options = {
        hostname: 'localhost',
        port: 2501,
        path: '/',
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'http://localhost:3000'
        }
    };
    
    const req = http.request(options, (res) => {
        console.log('   Status Code:', res.statusCode);
        
        const iframeHeaders = {
            'x-frame-options': res.headers['x-frame-options'],
            'content-security-policy': res.headers['content-security-policy']
        };
        
        let hasBlockingHeaders = false;
        
        Object.entries(iframeHeaders).forEach(([header, value]) => {
            if (value) {
                console.log(`   ⚠️  ${header}: ${value}`);
                if (header === 'x-frame-options' || 
                    (header === 'content-security-policy' && value.includes('frame-ancestors'))) {
                    hasBlockingHeaders = true;
                }
            } else {
                console.log(`   ✓ ${header}: Not set (good for iframes)`);
            }
        });
        
        if (!hasBlockingHeaders) {
            console.log('\n   ✓ No iframe-blocking headers detected');
        } else {
            console.log('\n   ✗ Iframe-blocking headers present');
        }
        
        console.log('\n');
        printSummary();
    });
    
    req.on('error', (e) => {
        console.error('   ✗ Error:', e.message);
        console.log('\n');
        printSummary();
    });
    
    req.end();
}

// Summary
function printSummary() {
    console.log('=== SUMMARY ===');
    console.log('\nKnown Issues:');
    console.log('1. Kismet requires authentication (session cookie needed)');
    console.log('2. No CORS headers are set by Kismet natively');
    console.log('3. The Node.js proxy at /api/kismet should handle authentication');
    console.log('\nRecommended Solutions:');
    console.log('1. Use the Node.js proxy endpoint: /api/kismet');
    console.log('2. Ensure proxy passes authentication headers');
    console.log('3. Consider using a session-based approach');
    console.log('4. Or embed Kismet with pre-authenticated session');
}

// Start tests
testDirectAccess();
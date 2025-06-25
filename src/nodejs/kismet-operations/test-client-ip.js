#!/usr/bin/env node

/**
 * Test script to verify client IP detection in webhook endpoints
 */

const http = require('http');

// Test the debug endpoint
function testDebugEndpoint() {
    const options = {
        hostname: 'localhost',
        port: 8002,
        path: '/api/debug/ip',
        method: 'GET',
        headers: {
            'X-Forwarded-For': '192.168.1.100',
            'X-Real-IP': '192.168.1.100'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Debug endpoint response:');
            const parsed = JSON.parse(data);
            console.log('- req.ip:', parsed.ipInfo['req.ip']);
            console.log('- x-forwarded-for:', parsed.ipInfo['x-forwarded-for']);
            console.log('- x-real-ip:', parsed.ipInfo['x-real-ip']);
            console.log('- recommended_ip:', parsed.ipInfo['recommended_ip']);
            console.log('');
        });
    });

    req.on('error', (e) => console.error('Debug endpoint error:', e));
    req.end();
}

// Test webhook endpoint to trigger rate limiter
function testWebhookEndpoint() {
    const options = {
        hostname: 'localhost',
        port: 8002,
        path: '/api/webhooks',
        method: 'GET',
        headers: {
            'X-Forwarded-For': '192.168.1.100',
            'X-Real-IP': '192.168.1.100'
        }
    };

    const req = http.request(options, (res) => {
        console.log('Webhook endpoint response:');
        console.log('- Status:', res.statusCode);
        console.log('- Headers:', res.headers);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    console.log('- Body:', JSON.stringify(parsed, null, 2));
                } catch (e) {
                    console.log('- Body:', data);
                }
            }
        });
    });

    req.on('error', (e) => console.error('Webhook endpoint error:', e));
    req.end();
}

console.log('Testing client IP detection...\n');
testDebugEndpoint();
setTimeout(() => testWebhookEndpoint(), 1000);
#!/usr/bin/env node

/**
 * Verification test for FIX-001: Correct Frontend API Endpoint
 * Tests that the system status endpoint responds correctly
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_PORT = process.env.PORT || 4000;
const TEST_TIMEOUT = 5000;

// Test results
const results = {
    fix_id: 'FIX-001',
    fix_title: 'Correct Frontend API Endpoint',
    timestamp: new Date().toISOString(),
    file_path: '/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/public/js/kismet-operations.js',
    line_number: 72,
    expected_change: {
        from: "const response = await fetch('/api/status', {",
        to: "const response = await fetch('/info', {"
    },
    verification: {
        file_check: {
            status: 'pending',
            details: null
        },
        endpoint_test: {
            status: 'pending',
            details: null
        },
        overall_status: 'pending'
    }
};

// Verify file change
console.log('🔍 Verifying file change...');
try {
    const filePath = results.file_path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Check line 72 (0-indexed as line 71)
    const targetLine = lines[71];
    
    if (targetLine && targetLine.includes("fetch('/info',")) {
        results.verification.file_check.status = 'success';
        results.verification.file_check.details = {
            actual_line: targetLine.trim(),
            contains_correct_endpoint: true,
            line_number: 72
        };
        console.log('✅ File change verified: Endpoint correctly set to /info');
    } else {
        results.verification.file_check.status = 'failed';
        results.verification.file_check.details = {
            actual_line: targetLine ? targetLine.trim() : 'Line not found',
            contains_correct_endpoint: false,
            line_number: 72,
            error: 'Expected endpoint /info not found'
        };
        console.log('❌ File change verification failed');
    }
} catch (error) {
    results.verification.file_check.status = 'error';
    results.verification.file_check.details = {
        error: error.message
    };
    console.error('❌ Error verifying file:', error.message);
}

// Test the /info endpoint
console.log('\n🧪 Testing /info endpoint...');
const testEndpoint = () => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: '/info',
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            timeout: TEST_TIMEOUT
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    results.verification.endpoint_test.status = 'success';
                    results.verification.endpoint_test.details = {
                        status_code: res.statusCode,
                        response_type: res.headers['content-type'],
                        has_system_info: !!jsonData.system,
                        has_server_info: !!jsonData.server,
                        response_sample: {
                            hostname: jsonData.system?.hostname,
                            uptime: jsonData.system?.uptime,
                            server_uptime: jsonData.server?.uptime
                        }
                    };
                    console.log(`✅ Endpoint test passed: ${res.statusCode} ${res.statusMessage}`);
                    resolve();
                } catch (parseError) {
                    results.verification.endpoint_test.status = 'failed';
                    results.verification.endpoint_test.details = {
                        status_code: res.statusCode,
                        error: 'Invalid JSON response',
                        raw_response: data.substring(0, 200)
                    };
                    console.log('❌ Endpoint returned invalid JSON');
                    resolve();
                }
            });
        });

        req.on('error', (error) => {
            results.verification.endpoint_test.status = 'error';
            results.verification.endpoint_test.details = {
                error: error.message,
                suggestion: 'Ensure Kismet Operations Center is running on port ' + SERVER_PORT
            };
            console.error('❌ Endpoint test error:', error.message);
            resolve();
        });

        req.on('timeout', () => {
            req.destroy();
            results.verification.endpoint_test.status = 'timeout';
            results.verification.endpoint_test.details = {
                error: 'Request timed out after ' + TEST_TIMEOUT + 'ms'
            };
            console.error('❌ Endpoint test timeout');
            resolve();
        });

        req.end();
    });
};

// Run the test
testEndpoint().then(() => {
    // Determine overall status
    if (results.verification.file_check.status === 'success' && 
        results.verification.endpoint_test.status === 'success') {
        results.verification.overall_status = 'success';
        console.log('\n✅ FIX-001 VERIFICATION SUCCESSFUL');
    } else if (results.verification.file_check.status === 'success') {
        results.verification.overall_status = 'partial';
        console.log('\n⚠️  FIX-001 PARTIALLY VERIFIED (file change applied, endpoint test failed)');
    } else {
        results.verification.overall_status = 'failed';
        console.log('\n❌ FIX-001 VERIFICATION FAILED');
    }

    // Save results
    const outputPath = path.join(
        '/home/pi/projects/stinkster_malone/stinkster/outputs/system_status_fix_20250620_203633/phase3/fixes',
        'fix_1.json'
    );
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${outputPath}`);
    
    // Exit with appropriate code
    process.exit(results.verification.overall_status === 'success' ? 0 : 1);
});
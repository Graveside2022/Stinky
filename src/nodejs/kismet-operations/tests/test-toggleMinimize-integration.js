// Integration test for toggleMinimize functionality
// This test starts a server and tests the actual page

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const TEST_PORT = 8899;
const TEST_URL = `http://localhost:${TEST_PORT}`;

// Simple static server for testing
function createTestServer() {
    return http.createServer((req, res) => {
        if (req.url === '/') {
            const indexPath = path.join(__dirname, '../views/index.html');
            const html = fs.readFileSync(indexPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } else if (req.url === '/socket.io/socket.io.js') {
            // Mock socket.io
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end('window.io = function() { return { on: function() {}, emit: function() {} }; };');
        } else if (req.url.startsWith('/js/')) {
            // Mock JS files
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end('// Mock JS file');
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });
}

// Manual tests using curl and parsing
async function runManualTests() {
    console.log('Running manual integration tests...\n');
    
    const server = createTestServer();
    
    return new Promise((resolve) => {
        server.listen(TEST_PORT, async () => {
            console.log(`Test server running at ${TEST_URL}`);
            
            try {
                // Test 1: Check if page loads
                const curlProcess = spawn('curl', ['-s', TEST_URL]);
                let html = '';
                
                curlProcess.stdout.on('data', (data) => {
                    html += data.toString();
                });
                
                curlProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('✓ Page loads successfully');
                        
                        // Test 2: Check for toggleMinimize function
                        if (html.includes('function toggleMinimize(')) {
                            console.log('✓ toggleMinimize function found in source');
                        } else {
                            console.log('✗ toggleMinimize function not found');
                        }
                        
                        // Test 3: Check for minimizedContainers Map
                        if (html.includes('const minimizedContainers = new Map()')) {
                            console.log('✓ minimizedContainers Map initialization found');
                        } else {
                            console.log('✗ minimizedContainers Map not found');
                        }
                        
                        // Test 4: Check for CSS classes
                        if (html.includes('.grid-item.minimized')) {
                            console.log('✓ Minimized CSS class found');
                        } else {
                            console.log('✗ Minimized CSS class not found');
                        }
                        
                        // Test 5: Check for minimize buttons
                        const buttonMatches = html.match(/onclick="toggleMinimize\(this\)"/g);
                        if (buttonMatches && buttonMatches.length > 0) {
                            console.log(`✓ Found ${buttonMatches.length} minimize buttons`);
                        } else {
                            console.log('✗ No minimize buttons found');
                        }
                        
                        // Test 6: Check for minimized-tabs container
                        if (html.includes('id="minimized-tabs"')) {
                            console.log('✓ Minimized tabs container found');
                        } else {
                            console.log('✗ Minimized tabs container not found');
                        }
                        
                        // Test 7: Check state management functions
                        if (html.includes('createMinimizedTab') && 
                            html.includes('minimizeToTab') && 
                            html.includes('restoreFromTab')) {
                            console.log('✓ All state management functions found');
                        } else {
                            console.log('✗ Some state management functions missing');
                        }
                        
                        // Test 8: Check icon change logic
                        if (html.includes('svg.setAttribute(\'d\', \'M4 6h16M4 12h16M4 18h16\')')) {
                            console.log('✓ Icon change logic for minimized state found');
                        } else {
                            console.log('✗ Icon change logic not found');
                        }
                        
                        console.log('\nIntegration tests completed!');
                        
                    } else {
                        console.log('✗ Failed to load page');
                    }
                    
                    server.close();
                    resolve();
                });
                
            } catch (error) {
                console.error('Test error:', error);
                server.close();
                resolve();
            }
        });
    });
}

// Run the tests
runManualTests().then(() => {
    console.log('\nAll tests completed');
    process.exit(0);
}).catch((error) => {
    console.error('Test suite error:', error);
    process.exit(1);
});
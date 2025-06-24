/**
 * Performance and Load Tests for Kismet Operations
 * Tests system performance under various load conditions
 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// Test configuration
const TEST_CONFIG = {
    baseUrl: process.env.TEST_URL || 'http://localhost:8002',
    wsUrl: process.env.WS_URL || 'ws://localhost:8002/webhook',
    concurrentUsers: [10, 50, 100, 200],
    testDuration: 30000, // 30 seconds
    warmupRequests: 10,
    thresholds: {
        p95ResponseTime: 1000, // 95th percentile should be under 1s
        p99ResponseTime: 2000, // 99th percentile should be under 2s
        errorRate: 0.01, // Less than 1% errors
        throughput: 100 // At least 100 requests per second
    }
};

class PerformanceMetrics {
    constructor() {
        this.reset();
    }

    reset() {
        this.responseTimes = [];
        this.errors = 0;
        this.success = 0;
        this.startTime = null;
        this.endTime = null;
    }

    start() {
        this.startTime = performance.now();
    }

    end() {
        this.endTime = performance.now();
    }

    recordRequest(duration, error = false) {
        if (error) {
            this.errors++;
        } else {
            this.success++;
            this.responseTimes.push(duration);
        }
    }

    getStats() {
        const sorted = [...this.responseTimes].sort((a, b) => a - b);
        const totalRequests = this.success + this.errors;
        const duration = (this.endTime - this.startTime) / 1000; // seconds

        return {
            totalRequests,
            successfulRequests: this.success,
            failedRequests: this.errors,
            errorRate: totalRequests > 0 ? this.errors / totalRequests : 0,
            duration,
            throughput: totalRequests / duration,
            responseTimes: {
                min: Math.min(...sorted) || 0,
                max: Math.max(...sorted) || 0,
                mean: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
                median: sorted[Math.floor(sorted.length / 2)] || 0,
                p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
                p99: sorted[Math.floor(sorted.length * 0.99)] || 0
            }
        };
    }
}

// Test scenarios
const testScenarios = {
    // Basic endpoint performance
    async basicEndpointTest(url, metrics) {
        const start = performance.now();
        try {
            const response = await axios.get(url, { timeout: 5000 });
            const duration = performance.now() - start;
            metrics.recordRequest(duration);
            return response.data;
        } catch (error) {
            const duration = performance.now() - start;
            metrics.recordRequest(duration, true);
            throw error;
        }
    },

    // Test with query parameters
    async filteredDataTest(baseUrl, metrics) {
        const endpoints = [
            '/api/webhook/kismet-data?type=devices&limit=50',
            '/api/webhook/kismet-data?type=networks&limit=100',
            '/api/webhook/kismet-data?type=alerts',
            '/api/webhook/kismet-devices?page=1&limit=20',
            '/api/webhook/kismet-networks?encryption=WPA2'
        ];

        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const start = performance.now();

        try {
            await axios.get(`${baseUrl}${endpoint}`, { timeout: 5000 });
            metrics.recordRequest(performance.now() - start);
        } catch (error) {
            metrics.recordRequest(performance.now() - start, true);
        }
    },

    // CSV download performance
    async csvDownloadTest(baseUrl, metrics) {
        const start = performance.now();
        try {
            const response = await axios.get(`${baseUrl}/api/webhook/kismet-data?format=csv`, {
                timeout: 10000,
                responseType: 'stream'
            });
            
            // Consume the stream
            let dataSize = 0;
            response.data.on('data', chunk => {
                dataSize += chunk.length;
            });

            await new Promise((resolve, reject) => {
                response.data.on('end', resolve);
                response.data.on('error', reject);
            });

            const duration = performance.now() - start;
            metrics.recordRequest(duration);
            
            return { duration, dataSize };
        } catch (error) {
            metrics.recordRequest(performance.now() - start, true);
            throw error;
        }
    },

    // WebSocket connection performance
    async websocketConnectionTest(wsUrl, metrics) {
        const start = performance.now();
        
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            
            ws.on('open', () => {
                const connectionTime = performance.now() - start;
                metrics.recordRequest(connectionTime);
                
                // Subscribe to kismet channel
                ws.send(JSON.stringify({
                    event: 'subscribe',
                    data: { channels: ['kismet'] }
                }));
                
                // Wait for subscription confirmation
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'subscribed') {
                        ws.close();
                        resolve(connectionTime);
                    }
                });
            });
            
            ws.on('error', (error) => {
                metrics.recordRequest(performance.now() - start, true);
                reject(error);
            });
            
            setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket connection timeout'));
            }, 5000);
        });
    },

    // Burst traffic test
    async burstTrafficTest(baseUrl, metrics, burstSize = 50) {
        const promises = [];
        
        for (let i = 0; i < burstSize; i++) {
            promises.push(
                testScenarios.basicEndpointTest(
                    `${baseUrl}/api/webhook/kismet-data`,
                    metrics
                ).catch(() => {}) // Handle errors silently
            );
        }
        
        await Promise.all(promises);
    },

    // Mixed workload test
    async mixedWorkloadTest(baseUrl, wsUrl, metrics) {
        const workloadMix = [
            () => testScenarios.basicEndpointTest(`${baseUrl}/api/webhook/kismet-data`, metrics),
            () => testScenarios.filteredDataTest(baseUrl, metrics),
            () => testScenarios.csvDownloadTest(baseUrl, metrics),
            () => testScenarios.websocketConnectionTest(wsUrl, metrics)
        ];

        const selectedWorkload = workloadMix[Math.floor(Math.random() * workloadMix.length)];
        await selectedWorkload().catch(() => {}); // Handle errors silently
    }
};

// Load test runner
async function runLoadTest(scenario, concurrentUsers, duration) {
    console.log(`\n🚀 Running ${scenario} with ${concurrentUsers} concurrent users for ${duration/1000}s...`);
    
    const metrics = new PerformanceMetrics();
    metrics.start();
    
    const endTime = Date.now() + duration;
    const workers = [];
    
    // Create worker functions
    for (let i = 0; i < concurrentUsers; i++) {
        const worker = async () => {
            while (Date.now() < endTime) {
                try {
                    switch (scenario) {
                        case 'basic':
                            await testScenarios.basicEndpointTest(
                                `${TEST_CONFIG.baseUrl}/api/webhook/kismet-data`,
                                metrics
                            );
                            break;
                        case 'filtered':
                            await testScenarios.filteredDataTest(TEST_CONFIG.baseUrl, metrics);
                            break;
                        case 'csv':
                            await testScenarios.csvDownloadTest(TEST_CONFIG.baseUrl, metrics);
                            break;
                        case 'websocket':
                            await testScenarios.websocketConnectionTest(TEST_CONFIG.wsUrl, metrics);
                            break;
                        case 'burst':
                            await testScenarios.burstTrafficTest(TEST_CONFIG.baseUrl, metrics);
                            break;
                        case 'mixed':
                            await testScenarios.mixedWorkloadTest(
                                TEST_CONFIG.baseUrl,
                                TEST_CONFIG.wsUrl,
                                metrics
                            );
                            break;
                    }
                    
                    // Small delay between requests
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                } catch (error) {
                    // Errors are already recorded in metrics
                }
            }
        };
        
        workers.push(worker());
    }
    
    // Wait for all workers to complete
    await Promise.all(workers);
    
    metrics.end();
    return metrics.getStats();
}

// 3D Globe performance test
async function test3DGlobePerformance() {
    console.log('\n🌍 Testing 3D Globe Performance with Many Markers...');
    
    const metrics = new PerformanceMetrics();
    const markerCounts = [100, 500, 1000, 5000];
    
    for (const count of markerCounts) {
        console.log(`\nTesting with ${count} markers...`);
        
        // Generate mock device data
        const devices = Array(count).fill(null).map((_, i) => ({
            mac: `AA:BB:CC:DD:${Math.floor(i/255).toString(16).padStart(2, '0')}:${(i%255).toString(16).padStart(2, '0')}`,
            manufacturer: ['Apple', 'Samsung', 'Google', 'Microsoft'][i % 4],
            type: ['Wi-Fi Client', 'Access Point', 'Bluetooth'][i % 3],
            signal: { last: -50 - Math.random() * 40 },
            location: {
                lat: -90 + Math.random() * 180,
                lon: -180 + Math.random() * 360
            }
        }));
        
        // Measure data processing time
        const processStart = performance.now();
        
        // Simulate data transformation for 3D globe
        const markers = devices.map(device => ({
            id: device.mac,
            position: {
                lat: device.location?.lat || 0,
                lon: device.location?.lon || 0,
                alt: 0
            },
            properties: {
                type: device.type,
                signal: device.signal.last,
                manufacturer: device.manufacturer
            }
        }));
        
        const processTime = performance.now() - processStart;
        
        console.log(`  Data processing time: ${processTime.toFixed(2)}ms`);
        console.log(`  Processing rate: ${(count / (processTime / 1000)).toFixed(0)} markers/second`);
        
        // Test rendering performance (simulated)
        const renderStart = performance.now();
        
        // Simulate render operations
        markers.forEach(marker => {
            // Simulate coordinate transformation
            const cartesian = {
                x: Math.cos(marker.position.lat) * Math.cos(marker.position.lon),
                y: Math.cos(marker.position.lat) * Math.sin(marker.position.lon),
                z: Math.sin(marker.position.lat)
            };
            
            // Simulate visibility check
            const visible = cartesian.z > 0;
            
            // Simulate LOD calculation
            const distance = Math.sqrt(cartesian.x ** 2 + cartesian.y ** 2 + cartesian.z ** 2);
            const lod = distance < 0.5 ? 'high' : distance < 0.8 ? 'medium' : 'low';
        });
        
        const renderTime = performance.now() - renderStart;
        
        console.log(`  Render calculation time: ${renderTime.toFixed(2)}ms`);
        console.log(`  Render rate: ${(count / (renderTime / 1000)).toFixed(0)} markers/second`);
        console.log(`  Total time: ${(processTime + renderTime).toFixed(2)}ms`);
        
        metrics.recordRequest(processTime + renderTime);
    }
    
    return metrics.getStats();
}

// Memory usage test
async function testMemoryUsage() {
    console.log('\n💾 Testing Memory Usage Under Load...');
    
    const initialMemory = process.memoryUsage();
    console.log('Initial memory usage:', {
        heapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(initialMemory.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`
    });
    
    // Run sustained load
    const metrics = new PerformanceMetrics();
    await runLoadTest('mixed', 50, 60000); // 1 minute with 50 users
    
    const finalMemory = process.memoryUsage();
    const memoryGrowth = {
        heapUsed: `${((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`,
        external: `${((finalMemory.external - initialMemory.external) / 1024 / 1024).toFixed(2)} MB`,
        rss: `${((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2)} MB`
    };
    
    console.log('Memory growth:', memoryGrowth);
    console.log('Final memory usage:', {
        heapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(finalMemory.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`
    });
    
    return { initialMemory, finalMemory, memoryGrowth };
}

// Main test runner
async function runAllTests() {
    console.log('🧪 Kismet Operations Performance Test Suite');
    console.log('==========================================');
    console.log(`Target: ${TEST_CONFIG.baseUrl}`);
    console.log(`Duration: ${TEST_CONFIG.testDuration/1000}s per test`);
    
    const results = {
        timestamp: new Date().toISOString(),
        config: TEST_CONFIG,
        tests: {}
    };
    
    try {
        // Warmup
        console.log('\n🔥 Warming up...');
        const warmupMetrics = new PerformanceMetrics();
        for (let i = 0; i < TEST_CONFIG.warmupRequests; i++) {
            await testScenarios.basicEndpointTest(
                `${TEST_CONFIG.baseUrl}/api/webhook/health`,
                warmupMetrics
            ).catch(() => {});
        }
        
        // Run performance tests
        const scenarios = ['basic', 'filtered', 'csv', 'websocket', 'burst', 'mixed'];
        
        for (const scenario of scenarios) {
            results.tests[scenario] = {};
            
            for (const users of TEST_CONFIG.concurrentUsers) {
                const stats = await runLoadTest(scenario, users, TEST_CONFIG.testDuration);
                results.tests[scenario][`${users}users`] = stats;
                
                // Print summary
                console.log(`\n📊 Results for ${scenario} with ${users} users:`);
                console.log(`  Total requests: ${stats.totalRequests}`);
                console.log(`  Success rate: ${((1 - stats.errorRate) * 100).toFixed(2)}%`);
                console.log(`  Throughput: ${stats.throughput.toFixed(2)} req/s`);
                console.log(`  Response times:`);
                console.log(`    Mean: ${stats.responseTimes.mean.toFixed(2)}ms`);
                console.log(`    P95: ${stats.responseTimes.p95.toFixed(2)}ms`);
                console.log(`    P99: ${stats.responseTimes.p99.toFixed(2)}ms`);
                
                // Check thresholds
                const passed = stats.responseTimes.p95 < TEST_CONFIG.thresholds.p95ResponseTime &&
                              stats.responseTimes.p99 < TEST_CONFIG.thresholds.p99ResponseTime &&
                              stats.errorRate < TEST_CONFIG.thresholds.errorRate &&
                              stats.throughput > TEST_CONFIG.thresholds.throughput;
                
                console.log(`  Threshold check: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
            }
        }
        
        // 3D Globe performance test
        results.tests['3dGlobe'] = await test3DGlobePerformance();
        
        // Memory usage test
        results.tests['memory'] = await testMemoryUsage();
        
    } catch (error) {
        console.error('❌ Test suite error:', error);
        results.error = error.message;
    }
    
    // Save results
    const fs = require('fs');
    const resultsFile = `/home/pi/projects/stinkster_christian/stinkster/src/nodejs/kismet-operations/tests/performance/results-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${resultsFile}`);
    
    return results;
}

// Export for use as module
module.exports = {
    runLoadTest,
    test3DGlobePerformance,
    testMemoryUsage,
    runAllTests,
    PerformanceMetrics,
    testScenarios
};

// Run if called directly
if (require.main === module) {
    runAllTests()
        .then(() => {
            console.log('\n✅ Performance tests completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Performance tests failed:', error);
            process.exit(1);
        });
}
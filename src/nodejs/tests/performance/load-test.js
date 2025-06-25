/**
 * Load Testing Suite for Node.js Services
 * 
 * Comprehensive performance testing and benchmarking
 */

const axios = require('axios');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

class LoadTestSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            system: {
                platform: os.platform(),
                cpus: os.cpus().length,
                memory: Math.round(os.totalmem() / 1024 / 1024),
                nodeVersion: process.version
            },
            tests: {}
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Load Testing Suite\n');
        
        // Test spectrum analyzer performance
        await this.testSpectrumAnalyzer();
        
        // Test WigleToTAK performance
        await this.testWigleToTAK();
        
        // Memory stress test
        await this.memoryStressTest();
        
        // Concurrent request test
        await this.concurrentRequestTest();
        
        // Generate report
        this.generateReport();
    }

    async testSpectrumAnalyzer() {
        console.log('📡 Testing Spectrum Analyzer Performance...');
        
        const testConfig = {
            baseURL: 'http://localhost:8092',
            endpoints: [
                { path: '/api/status', weight: 40 },
                { path: '/api/profiles', weight: 30 },
                { path: '/api/scan/vhf', weight: 20 },
                { path: '/api/scan/uhf', weight: 10 }
            ],
            duration: 30000, // 30 seconds
            concurrency: 5
        };

        try {
            const results = await this.runLoadTest('spectrum-analyzer', testConfig);
            this.results.tests['spectrum-analyzer'] = results;
            console.log(`  ✓ Completed: ${results.totalRequests} requests, ${results.avgResponseTime}ms avg`);
        } catch (error) {
            console.log(`  ⚠️ Spectrum analyzer not available: ${error.message}`);
            this.results.tests['spectrum-analyzer'] = { error: error.message, skipped: true };
        }
    }

    async testWigleToTAK() {
        console.log('📶 Testing WigleToTAK Performance...');
        
        const testConfig = {
            baseURL: 'http://localhost:8000',
            endpoints: [
                { path: '/api/status', weight: 60 },
                { path: '/', weight: 40 }
            ],
            duration: 30000,
            concurrency: 3
        };

        try {
            const results = await this.runLoadTest('wigle-to-tak', testConfig);
            this.results.tests['wigle-to-tak'] = results;
            console.log(`  ✓ Completed: ${results.totalRequests} requests, ${results.avgResponseTime}ms avg`);
        } catch (error) {
            console.log(`  ⚠️ WigleToTAK not available: ${error.message}`);
            this.results.tests['wigle-to-tak'] = { error: error.message, skipped: true };
        }
    }

    async runLoadTest(serviceName, config) {
        return new Promise((resolve, reject) => {
            if (isMainThread) {
                const workers = [];
                const workerResults = [];
                
                for (let i = 0; i < config.concurrency; i++) {
                    const worker = new Worker(__filename, {
                        workerData: {
                            isWorker: true,
                            workerId: i,
                            config: config,
                            duration: config.duration / config.concurrency // Split duration
                        }
                    });
                    
                    worker.on('message', (result) => {
                        workerResults.push(result);
                    });
                    
                    worker.on('error', reject);
                    worker.on('exit', (code) => {
                        if (code !== 0) {
                            reject(new Error(`Worker stopped with exit code ${code}`));
                        }
                    });
                    
                    workers.push(worker);
                }
                
                // Wait for all workers to complete
                Promise.all(workers.map(worker => 
                    new Promise(resolve => worker.on('exit', resolve))
                )).then(() => {
                    // Aggregate results
                    const aggregated = this.aggregateResults(workerResults);
                    resolve(aggregated);
                }).catch(reject);
            }
        });
    }

    aggregateResults(workerResults) {
        const totalRequests = workerResults.reduce((sum, r) => sum + r.requests, 0);
        const totalErrors = workerResults.reduce((sum, r) => sum + r.errors, 0);
        const allResponseTimes = workerResults.flatMap(r => r.responseTimes);
        
        const avgResponseTime = allResponseTimes.length > 0 
            ? allResponseTimes.reduce((sum, t) => sum + t, 0) / allResponseTimes.length
            : 0;
        
        const sortedTimes = allResponseTimes.sort((a, b) => a - b);
        const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
        const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
        
        return {
            totalRequests,
            totalErrors,
            errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
            avgResponseTime: Math.round(avgResponseTime),
            p95ResponseTime: p95,
            p99ResponseTime: p99,
            minResponseTime: Math.min(...allResponseTimes) || 0,
            maxResponseTime: Math.max(...allResponseTimes) || 0,
            requestsPerSecond: totalRequests / 30 // Assuming 30 second test
        };
    }

    async memoryStressTest() {
        console.log('🧠 Running Memory Stress Test...');
        
        const initialMemory = process.memoryUsage();
        const testData = [];
        
        // Allocate memory and measure
        const iterations = 1000;
        for (let i = 0; i < iterations; i++) {
            testData.push(new Array(1000).fill(Math.random()));
            
            if (i % 100 === 0) {
                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }
        }
        
        const peakMemory = process.memoryUsage();
        
        // Clean up
        testData.length = 0;
        if (global.gc) {
            global.gc();
        }
        
        const finalMemory = process.memoryUsage();
        
        this.results.tests['memory-stress'] = {
            initialRSS: Math.round(initialMemory.rss / 1024 / 1024),
            peakRSS: Math.round(peakMemory.rss / 1024 / 1024),
            finalRSS: Math.round(finalMemory.rss / 1024 / 1024),
            memoryLeakDetected: finalMemory.rss > initialMemory.rss * 1.5,
            iterations: iterations
        };
        
        console.log(`  ✓ Memory test: ${this.results.tests['memory-stress'].initialRSS}MB → ${this.results.tests['memory-stress'].peakRSS}MB → ${this.results.tests['memory-stress'].finalRSS}MB`);
    }

    async concurrentRequestTest() {
        console.log('⚡ Running Concurrent Request Test...');
        
        const concurrencyLevels = [1, 5, 10, 20];
        const results = {};
        
        for (const concurrency of concurrencyLevels) {
            try {
                const startTime = Date.now();
                const promises = [];
                
                for (let i = 0; i < concurrency; i++) {
                    promises.push(
                        axios.get('http://localhost:8092/api/status', { timeout: 5000 })
                            .catch(() => ({ status: 'error' }))
                    );
                }
                
                const responses = await Promise.all(promises);
                const endTime = Date.now();
                
                const successfulRequests = responses.filter(r => r.status === 200).length;
                
                results[`concurrency-${concurrency}`] = {
                    totalRequests: concurrency,
                    successfulRequests,
                    failedRequests: concurrency - successfulRequests,
                    totalTime: endTime - startTime,
                    avgTimePerRequest: (endTime - startTime) / concurrency
                };
                
                console.log(`  ✓ Concurrency ${concurrency}: ${successfulRequests}/${concurrency} successful, ${endTime - startTime}ms total`);
                
            } catch (error) {
                results[`concurrency-${concurrency}`] = { error: error.message };
                console.log(`  ⚠️ Concurrency ${concurrency} failed: ${error.message}`);
            }
        }
        
        this.results.tests['concurrent-requests'] = results;
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 LOAD TESTING REPORT');
        console.log('='.repeat(60));
        
        console.log(`\n🖥️  System Information:`);
        console.log(`   Platform: ${this.results.system.platform}`);
        console.log(`   CPUs: ${this.results.system.cpus}`);
        console.log(`   Memory: ${this.results.system.memory} MB`);
        console.log(`   Node.js: ${this.results.system.nodeVersion}`);
        
        for (const [testName, testResults] of Object.entries(this.results.tests)) {
            if (testResults.skipped) {
                console.log(`\n⏭️  ${testName.toUpperCase()}: SKIPPED`);
                console.log(`   Reason: ${testResults.error}`);
                continue;
            }
            
            console.log(`\n📈 ${testName.toUpperCase()}:`);
            
            if (testName.includes('memory')) {
                console.log(`   Initial Memory: ${testResults.initialRSS} MB`);
                console.log(`   Peak Memory: ${testResults.peakRSS} MB`);
                console.log(`   Final Memory: ${testResults.finalRSS} MB`);
                console.log(`   Memory Leak: ${testResults.memoryLeakDetected ? '❌ Detected' : '✅ None'}`);
            } else if (testName.includes('concurrent')) {
                for (const [level, result] of Object.entries(testResults)) {
                    if (result.error) {
                        console.log(`   ${level}: ❌ ${result.error}`);
                    } else {
                        console.log(`   ${level}: ${result.successfulRequests}/${result.totalRequests} (${result.totalTime}ms)`);
                    }
                }
            } else {
                console.log(`   Total Requests: ${testResults.totalRequests}`);
                console.log(`   Errors: ${testResults.totalErrors} (${testResults.errorRate.toFixed(2)}%)`);
                console.log(`   Avg Response Time: ${testResults.avgResponseTime}ms`);
                console.log(`   95th Percentile: ${testResults.p95ResponseTime}ms`);
                console.log(`   99th Percentile: ${testResults.p99ResponseTime}ms`);
                console.log(`   Requests/Second: ${testResults.requestsPerSecond.toFixed(1)}`);
            }
        }
        
        // Performance assessment
        console.log('\n🎯 PERFORMANCE ASSESSMENT:');
        this.assessPerformance();
        
        console.log('\n' + '='.repeat(60));
        
        // Save results to file
        const fs = require('fs');
        const path = require('path');
        const resultsPath = path.join(__dirname, `load-test-results-${Date.now()}.json`);
        fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Results saved to: ${resultsPath}`);
    }

    assessPerformance() {
        const scores = [];
        
        // Assess spectrum analyzer performance
        const spectrum = this.results.tests['spectrum-analyzer'];
        if (spectrum && !spectrum.skipped) {
            if (spectrum.avgResponseTime < 50) scores.push({ metric: 'Spectrum Response Time', score: 100 });
            else if (spectrum.avgResponseTime < 100) scores.push({ metric: 'Spectrum Response Time', score: 80 });
            else scores.push({ metric: 'Spectrum Response Time', score: 60 });
            
            if (spectrum.errorRate < 1) scores.push({ metric: 'Spectrum Error Rate', score: 100 });
            else if (spectrum.errorRate < 5) scores.push({ metric: 'Spectrum Error Rate', score: 80 });
            else scores.push({ metric: 'Spectrum Error Rate', score: 60 });
        }
        
        // Assess memory performance
        const memory = this.results.tests['memory-stress'];
        if (memory) {
            if (!memory.memoryLeakDetected) scores.push({ metric: 'Memory Management', score: 100 });
            else scores.push({ metric: 'Memory Management', score: 60 });
        }
        
        // Calculate overall score
        const avgScore = scores.length > 0 
            ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
            : 0;
        
        console.log(`   Overall Performance Score: ${avgScore.toFixed(1)}/100`);
        
        if (avgScore >= 90) console.log(`   Assessment: 🟢 EXCELLENT`);
        else if (avgScore >= 80) console.log(`   Assessment: 🟡 GOOD`);
        else if (avgScore >= 70) console.log(`   Assessment: 🟠 ACCEPTABLE`);
        else console.log(`   Assessment: 🔴 NEEDS IMPROVEMENT`);
        
        scores.forEach(score => {
            console.log(`   ${score.metric}: ${score.score}/100`);
        });
    }
}

// Worker thread implementation
if (!isMainThread && workerData?.isWorker) {
    async function runWorkerLoadTest() {
        const { config, duration, workerId } = workerData;
        const results = {
            workerId,
            requests: 0,
            errors: 0,
            responseTimes: []
        };
        
        const startTime = Date.now();
        const endTime = startTime + duration;
        
        while (Date.now() < endTime) {
            // Select random endpoint based on weight
            const endpoint = selectRandomEndpoint(config.endpoints);
            const requestStart = Date.now();
            
            try {
                await axios.get(`${config.baseURL}${endpoint.path}`, { timeout: 5000 });
                results.requests++;
                results.responseTimes.push(Date.now() - requestStart);
            } catch (error) {
                results.errors++;
            }
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        parentPort.postMessage(results);
    }
    
    function selectRandomEndpoint(endpoints) {
        const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const endpoint of endpoints) {
            random -= endpoint.weight;
            if (random <= 0) {
                return endpoint;
            }
        }
        
        return endpoints[0]; // Fallback
    }
    
    runWorkerLoadTest().catch(console.error);
}

// Main execution
if (require.main === module && isMainThread) {
    const loadTest = new LoadTestSuite();
    loadTest.runAllTests().catch(console.error);
}

module.exports = LoadTestSuite;
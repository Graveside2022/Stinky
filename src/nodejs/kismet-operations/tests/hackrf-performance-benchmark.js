/**
 * HackRF FFT Streaming Performance Benchmark
 * Tests various configurations and measures performance metrics
 */

const HackRFFftStreamer = require('../lib/hackrf-fft-streamer');
const SpectrumAnalyzer = require('../lib/spectrumCore');
const EventEmitter = require('events');
const { performance } = require('perf_hooks');

// Mock WebSocket for testing
class MockSocket extends EventEmitter {
    constructor(id) {
        super();
        this.id = id;
        this.messages = [];
        this.bytesReceived = 0;
    }
    
    emit(event, data) {
        this.messages.push({ event, data, timestamp: Date.now() });
        if (data && typeof data === 'object') {
            this.bytesReceived += JSON.stringify(data).length;
        }
        super.emit(event, data);
    }
}

// Benchmark suite
class HackRFBenchmark {
    constructor() {
        this.results = [];
        this.spectrum = null;
        this.streamer = null;
    }
    
    /**
     * Run all benchmarks
     */
    async runAll() {
        console.log('Starting HackRF FFT Streaming Performance Benchmarks...\n');
        
        // Test different configurations
        const configurations = [
            { 
                name: 'Performance Mode', 
                config: { performanceMode: 'performance', demoMode: true }
            },
            { 
                name: 'Balanced Mode', 
                config: { performanceMode: 'balanced', demoMode: true }
            },
            { 
                name: 'Quality Mode', 
                config: { performanceMode: 'quality', demoMode: true }
            },
            { 
                name: 'High Rate Streaming', 
                config: { streamingRate: 60, performanceMode: 'balanced', demoMode: true }
            },
            { 
                name: 'Low Rate Streaming', 
                config: { streamingRate: 15, performanceMode: 'balanced', demoMode: true }
            },
            { 
                name: 'Compression Enabled', 
                config: { compression: true, performanceMode: 'balanced', demoMode: true }
            },
            { 
                name: 'Compression Disabled', 
                config: { compression: false, performanceMode: 'balanced', demoMode: true }
            }
        ];
        
        for (const config of configurations) {
            await this.runBenchmark(config.name, config.config);
        }
        
        // Run stress tests
        await this.runStressTest('Multiple Clients', 50);
        await this.runStressTest('High Load', 100);
        
        // Print results
        this.printResults();
    }
    
    /**
     * Run a single benchmark configuration
     */
    async runBenchmark(name, config) {
        console.log(`Running benchmark: ${name}`);
        
        // Create spectrum analyzer and streamer
        this.spectrum = new SpectrumAnalyzer();
        this.streamer = new HackRFFftStreamer(this.spectrum, config);
        
        // Create mock clients
        const numClients = 10;
        const clients = [];
        const metrics = {
            name,
            config,
            startTime: performance.now(),
            messagesProcessed: 0,
            bytesTransmitted: 0,
            latencies: [],
            cpuUsage: [],
            memoryUsage: []
        };
        
        // Add clients
        for (let i = 0; i < numClients; i++) {
            const client = new MockSocket(`client-${i}`);
            clients.push(client);
            this.streamer.addClient(client.id, client);
            
            // Track messages
            client.on('fftBatch', () => {
                metrics.messagesProcessed++;
            });
        }
        
        // Run for 10 seconds
        const duration = 10000;
        const startMemory = process.memoryUsage();
        const startCpu = process.cpuUsage();
        
        // Collect metrics periodically
        const metricsInterval = setInterval(() => {
            const stats = this.streamer.getStats();
            metrics.cpuUsage.push(stats.cpuUsage);
            metrics.memoryUsage.push(stats.memoryUsage);
            metrics.latencies.push(stats.averageLatency);
        }, 1000);
        
        // Wait for test duration
        await new Promise(resolve => setTimeout(resolve, duration));
        
        // Stop collection
        clearInterval(metricsInterval);
        
        // Calculate final metrics
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage();
        
        metrics.duration = endTime - metrics.startTime;
        metrics.bytesTransmitted = clients.reduce((sum, c) => sum + c.bytesReceived, 0);
        metrics.averageLatency = this.average(metrics.latencies);
        metrics.averageCpu = this.average(metrics.cpuUsage);
        metrics.averageMemory = this.average(metrics.memoryUsage);
        metrics.messagesPerSecond = metrics.messagesProcessed / (metrics.duration / 1000);
        metrics.dataRate = metrics.bytesTransmitted / (metrics.duration / 1000);
        
        // CPU usage percentage
        const cpuDiff = {
            user: endCpu.user - startCpu.user,
            system: endCpu.system - startCpu.system
        };
        metrics.cpuPercent = ((cpuDiff.user + cpuDiff.system) / (metrics.duration * 1000)) * 100;
        
        // Memory usage
        metrics.memoryDelta = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
        
        // Cleanup
        clients.forEach(client => {
            this.streamer.removeClient(client.id);
        });
        this.streamer.destroy();
        
        this.results.push(metrics);
        console.log(`✓ Completed: ${metrics.messagesPerSecond.toFixed(2)} msg/s, ${(metrics.dataRate/1024).toFixed(2)} KB/s\n`);
    }
    
    /**
     * Run stress test with many clients
     */
    async runStressTest(name, numClients) {
        console.log(`Running stress test: ${name} (${numClients} clients)`);
        
        this.spectrum = new SpectrumAnalyzer();
        this.streamer = new HackRFFftStreamer(this.spectrum, {
            performanceMode: 'performance',
            demoMode: true
        });
        
        const metrics = {
            name: `Stress Test: ${name}`,
            numClients,
            startTime: performance.now(),
            connectTime: 0,
            disconnectTime: 0,
            maxMemory: 0,
            errors: 0
        };
        
        const clients = [];
        
        // Measure connection time
        const connectStart = performance.now();
        
        try {
            // Add all clients
            for (let i = 0; i < numClients; i++) {
                const client = new MockSocket(`stress-client-${i}`);
                clients.push(client);
                this.streamer.addClient(client.id, client);
                
                // Track errors
                client.on('error', () => {
                    metrics.errors++;
                });
            }
            
            metrics.connectTime = performance.now() - connectStart;
            
            // Run for 5 seconds under load
            const interval = setInterval(() => {
                const mem = process.memoryUsage();
                metrics.maxMemory = Math.max(metrics.maxMemory, mem.heapUsed / 1024 / 1024);
            }, 100);
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            clearInterval(interval);
            
            // Measure disconnection time
            const disconnectStart = performance.now();
            
            clients.forEach(client => {
                this.streamer.removeClient(client.id);
            });
            
            metrics.disconnectTime = performance.now() - disconnectStart;
            
        } catch (error) {
            console.error(`Stress test failed: ${error.message}`);
            metrics.errors++;
        }
        
        metrics.duration = performance.now() - metrics.startTime;
        
        // Cleanup
        this.streamer.destroy();
        
        this.results.push(metrics);
        console.log(`✓ Completed: ${metrics.connectTime.toFixed(2)}ms connect, ${metrics.disconnectTime.toFixed(2)}ms disconnect\n`);
    }
    
    /**
     * Calculate average of array
     */
    average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }
    
    /**
     * Print benchmark results
     */
    printResults() {
        console.log('\n════════════════════════════════════════════════════════');
        console.log(' HackRF FFT Streaming Performance Benchmark Results');
        console.log('════════════════════════════════════════════════════════\n');
        
        // Sort by messages per second
        const sorted = this.results
            .filter(r => r.messagesPerSecond)
            .sort((a, b) => b.messagesPerSecond - a.messagesPerSecond);
        
        console.log('Performance Rankings:');
        console.log('─────────────────────────────────────────────────────────');
        console.log('Configuration               | Msg/s  | KB/s   | Latency | CPU %');
        console.log('─────────────────────────────────────────────────────────');
        
        sorted.forEach(result => {
            const name = result.name.padEnd(27);
            const msgRate = result.messagesPerSecond.toFixed(1).padStart(6);
            const dataRate = (result.dataRate / 1024).toFixed(1).padStart(6);
            const latency = result.averageLatency.toFixed(1).padStart(7);
            const cpu = result.cpuPercent.toFixed(1).padStart(5);
            
            console.log(`${name} | ${msgRate} | ${dataRate} | ${latency} | ${cpu}`);
        });
        
        console.log('\nStress Test Results:');
        console.log('─────────────────────────────────────────────────────────');
        
        const stressTests = this.results.filter(r => r.name.includes('Stress Test'));
        stressTests.forEach(result => {
            console.log(`${result.name}:`);
            console.log(`  Clients: ${result.numClients}`);
            console.log(`  Connect Time: ${result.connectTime.toFixed(2)}ms`);
            console.log(`  Disconnect Time: ${result.disconnectTime.toFixed(2)}ms`);
            console.log(`  Max Memory: ${result.maxMemory.toFixed(2)} MB`);
            console.log(`  Errors: ${result.errors}`);
            console.log('');
        });
        
        // Summary statistics
        console.log('\nSummary:');
        console.log('─────────────────────────────────────────────────────────');
        
        const bestPerf = sorted[0];
        const bestEfficiency = sorted.reduce((best, curr) => 
            (curr.cpuPercent < best.cpuPercent) ? curr : best
        );
        
        console.log(`Best Performance: ${bestPerf.name} (${bestPerf.messagesPerSecond.toFixed(1)} msg/s)`);
        console.log(`Best Efficiency: ${bestEfficiency.name} (${bestEfficiency.cpuPercent.toFixed(1)}% CPU)`);
        console.log(`Average Latency Range: ${Math.min(...sorted.map(r => r.averageLatency)).toFixed(1)} - ${Math.max(...sorted.map(r => r.averageLatency)).toFixed(1)} ms`);
        
        // Recommendations
        console.log('\nRecommendations:');
        console.log('─────────────────────────────────────────────────────────');
        console.log('• For maximum throughput: Use Performance mode');
        console.log('• For best balance: Use Balanced mode with 30Hz streaming');
        console.log('• For low-power devices: Use Performance mode with compression');
        console.log('• For many clients: Enable adaptive sampling and compression');
        
        console.log('\n════════════════════════════════════════════════════════\n');
    }
}

// Run benchmarks if executed directly
if (require.main === module) {
    const benchmark = new HackRFBenchmark();
    benchmark.runAll()
        .then(() => {
            console.log('Benchmarks completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Benchmark failed:', error);
            process.exit(1);
        });
}

module.exports = HackRFBenchmark;
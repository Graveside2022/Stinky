/**
 * Performance Test Suite for Kismet Operations Center
 * Tests optimization effectiveness with simulated load
 */

const axios = require('axios');
const io = require('socket.io-client');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:8003';
const WS_URL = 'ws://localhost:8003';

class PerformanceTest {
    constructor(config = {}) {
        this.config = {
            numDevices: config.numDevices || 1000,
            updateInterval: config.updateInterval || 100,
            testDuration: config.testDuration || 60000, // 1 minute
            concurrentConnections: config.concurrentConnections || 10,
            ...config
        };
        
        this.metrics = {
            requests: [],
            websocketMessages: [],
            memoryUsage: [],
            errors: []
        };
        
        this.sockets = [];
        this.devices = [];
    }

    /**
     * Generate fake device data
     */
    generateDevice(index) {
        return {
            mac: `00:11:22:33:44:${index.toString(16).padStart(2, '0')}`,
            ssid: `TestNetwork${index}`,
            rssi: -50 - Math.floor(Math.random() * 50),
            lat: 40.7128 + (Math.random() - 0.5) * 0.1,
            lon: -74.0060 + (Math.random() - 0.5) * 0.1,
            type: 'wifi',
            channel: Math.floor(Math.random() * 11) + 1,
            encryption: ['WPA2', 'WPA3', 'Open'][Math.floor(Math.random() * 3)]
        };
    }

    /**
     * Initialize test devices
     */
    initializeDevices() {
        console.log(`Generating ${this.config.numDevices} test devices...`);
        
        for (let i = 0; i < this.config.numDevices; i++) {
            this.devices.push(this.generateDevice(i));
        }
        
        console.log('Test devices generated');
    }

    /**
     * Test HTTP API performance
     */
    async testHTTPPerformance() {
        console.log('\n--- Testing HTTP API Performance ---');
        
        const endpoints = [
            '/info',
            '/api/devices',
            '/api/performance'
        ];
        
        for (const endpoint of endpoints) {
            const results = await this.measureEndpoint(endpoint, 100);
            this.reportEndpointMetrics(endpoint, results);
        }
    }

    /**
     * Measure endpoint performance
     */
    async measureEndpoint(endpoint, numRequests) {
        const results = [];
        
        for (let i = 0; i < numRequests; i++) {
            const start = performance.now();
            
            try {
                const response = await axios.get(`${BASE_URL}${endpoint}`);
                const duration = performance.now() - start;
                
                results.push({
                    duration,
                    status: response.status,
                    size: JSON.stringify(response.data).length
                });
            } catch (error) {
                const duration = performance.now() - start;
                results.push({
                    duration,
                    error: error.message,
                    status: error.response?.status || 0
                });
                this.metrics.errors.push({
                    endpoint,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
            
            // Small delay between requests
            await this.sleep(10);
        }
        
        return results;
    }

    /**
     * Test WebSocket performance
     */
    async testWebSocketPerformance() {
        console.log('\n--- Testing WebSocket Performance ---');
        
        // Create multiple WebSocket connections
        console.log(`Creating ${this.config.concurrentConnections} WebSocket connections...`);
        
        for (let i = 0; i < this.config.concurrentConnections; i++) {
            const socket = io(WS_URL, {
                transports: ['websocket'],
                reconnection: false
            });
            
            this.setupSocketHandlers(socket, i);
            this.sockets.push(socket);
        }
        
        // Wait for connections to establish
        await this.sleep(1000);
        
        // Start sending device updates
        console.log('Starting device update simulation...');
        const updatePromises = [];
        
        for (let i = 0; i < this.config.concurrentConnections; i++) {
            updatePromises.push(this.simulateDeviceUpdates(this.sockets[i], i));
        }
        
        // Run for test duration
        await Promise.race([
            Promise.all(updatePromises),
            this.sleep(this.config.testDuration)
        ]);
        
        // Report WebSocket metrics
        this.reportWebSocketMetrics();
    }

    /**
     * Setup WebSocket event handlers
     */
    setupSocketHandlers(socket, index) {
        const socketMetrics = {
            connected: false,
            messagesReceived: 0,
            batchesReceived: 0,
            latencies: []
        };
        
        socket.on('connect', () => {
            socketMetrics.connected = true;
            console.log(`Socket ${index} connected`);
        });
        
        socket.on('batch-update', (data) => {
            socketMetrics.batchesReceived++;
            
            if (data.batches) {
                data.batches.forEach(batch => {
                    socketMetrics.messagesReceived += batch.messages.length;
                });
            }
        });
        
        socket.on('performance-update', (data) => {
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                ...data.memory
            });
        });
        
        socket.on('error', (error) => {
            this.metrics.errors.push({
                type: 'websocket',
                socket: index,
                error: error.message,
                timestamp: Date.now()
            });
        });
        
        socket.metrics = socketMetrics;
    }

    /**
     * Simulate device updates
     */
    async simulateDeviceUpdates(socket, socketIndex) {
        const devicesPerSocket = Math.floor(this.devices.length / this.config.concurrentConnections);
        const startIndex = socketIndex * devicesPerSocket;
        const endIndex = Math.min(startIndex + devicesPerSocket, this.devices.length);
        
        const assignedDevices = this.devices.slice(startIndex, endIndex);
        
        while (socket.connected) {
            for (const device of assignedDevices) {
                // Update device data
                device.rssi = -50 - Math.floor(Math.random() * 50);
                device.lat += (Math.random() - 0.5) * 0.0001;
                device.lon += (Math.random() - 0.5) * 0.0001;
                
                const start = performance.now();
                
                socket.emit('device-update', {
                    deviceId: device.mac,
                    ...device,
                    timestamp: Date.now()
                });
                
                const latency = performance.now() - start;
                socket.metrics.latencies.push(latency);
            }
            
            await this.sleep(this.config.updateInterval);
        }
    }

    /**
     * Test memory management
     */
    async testMemoryManagement() {
        console.log('\n--- Testing Memory Management ---');
        
        // Get initial memory state
        const initialResponse = await axios.get(`${BASE_URL}/api/devices`);
        console.log('Initial device count:', initialResponse.data.devices.length);
        console.log('Initial memory stats:', initialResponse.data.stats);
        
        // Flood with devices to test cleanup
        console.log('Flooding with device updates...');
        
        const socket = io(WS_URL, {
            transports: ['websocket']
        });
        
        for (let i = 0; i < 2000; i++) {
            const device = this.generateDevice(i + 1000);
            socket.emit('device-update', {
                deviceId: device.mac,
                ...device
            });
            
            if (i % 100 === 0) {
                await this.sleep(10);
            }
        }
        
        // Wait for processing
        await this.sleep(2000);
        
        // Check memory state after flood
        const finalResponse = await axios.get(`${BASE_URL}/api/devices`);
        console.log('Final device count:', finalResponse.data.devices.length);
        console.log('Final memory stats:', finalResponse.data.stats);
        
        socket.close();
    }

    /**
     * Test 3D globe performance
     */
    async test3DGlobePerformance() {
        console.log('\n--- Testing 3D Globe Performance ---');
        
        // This would require a headless browser like Puppeteer
        // For now, we'll just measure the API performance
        
        console.log('Note: 3D globe performance testing requires browser automation');
        console.log('Run manual tests in browser with DevTools Performance tab');
    }

    /**
     * Report endpoint metrics
     */
    reportEndpointMetrics(endpoint, results) {
        const successfulRequests = results.filter(r => !r.error);
        const failedRequests = results.filter(r => r.error);
        
        const durations = successfulRequests.map(r => r.duration);
        const sizes = successfulRequests.map(r => r.size);
        
        console.log(`\nEndpoint: ${endpoint}`);
        console.log(`  Requests: ${results.length}`);
        console.log(`  Success: ${successfulRequests.length}`);
        console.log(`  Failed: ${failedRequests.length}`);
        
        if (durations.length > 0) {
            console.log(`  Avg Response Time: ${this.average(durations).toFixed(2)}ms`);
            console.log(`  Min Response Time: ${Math.min(...durations).toFixed(2)}ms`);
            console.log(`  Max Response Time: ${Math.max(...durations).toFixed(2)}ms`);
            console.log(`  P95 Response Time: ${this.percentile(durations, 95).toFixed(2)}ms`);
            console.log(`  Avg Response Size: ${this.average(sizes).toFixed(0)} bytes`);
        }
    }

    /**
     * Report WebSocket metrics
     */
    reportWebSocketMetrics() {
        console.log('\n--- WebSocket Performance Summary ---');
        
        let totalMessages = 0;
        let totalBatches = 0;
        let allLatencies = [];
        
        this.sockets.forEach((socket, index) => {
            if (socket.metrics) {
                totalMessages += socket.metrics.messagesReceived;
                totalBatches += socket.metrics.batchesReceived;
                allLatencies = allLatencies.concat(socket.metrics.latencies);
                
                console.log(`\nSocket ${index}:`);
                console.log(`  Connected: ${socket.metrics.connected}`);
                console.log(`  Messages Received: ${socket.metrics.messagesReceived}`);
                console.log(`  Batches Received: ${socket.metrics.batchesReceived}`);
            }
        });
        
        console.log('\nOverall WebSocket Stats:');
        console.log(`  Total Messages: ${totalMessages}`);
        console.log(`  Total Batches: ${totalBatches}`);
        console.log(`  Avg Messages per Batch: ${(totalMessages / totalBatches).toFixed(2)}`);
        
        if (allLatencies.length > 0) {
            console.log(`  Avg Send Latency: ${this.average(allLatencies).toFixed(2)}ms`);
            console.log(`  P95 Send Latency: ${this.percentile(allLatencies, 95).toFixed(2)}ms`);
        }
    }

    /**
     * Generate final report
     */
    generateReport() {
        console.log('\n========== PERFORMANCE TEST REPORT ==========');
        console.log(`Test Duration: ${this.config.testDuration / 1000} seconds`);
        console.log(`Devices Simulated: ${this.config.numDevices}`);
        console.log(`Concurrent Connections: ${this.config.concurrentConnections}`);
        console.log(`Update Interval: ${this.config.updateInterval}ms`);
        
        if (this.metrics.errors.length > 0) {
            console.log(`\nErrors Encountered: ${this.metrics.errors.length}`);
            this.metrics.errors.slice(0, 5).forEach(error => {
                console.log(`  - ${error.type || 'http'}: ${error.error}`);
            });
        }
        
        if (this.metrics.memoryUsage.length > 0) {
            const lastMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
            console.log('\nMemory Usage:');
            console.log(`  Heap Used: ${lastMemory.heapUsed || 'N/A'}`);
            console.log(`  Heap Total: ${lastMemory.heapTotal || 'N/A'}`);
        }
        
        console.log('\n============================================');
    }

    /**
     * Utility functions
     */
    average(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    percentile(arr, p) {
        const sorted = arr.slice().sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[index];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.sockets.forEach(socket => {
            if (socket.connected) {
                socket.close();
            }
        });
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        try {
            console.log('Starting Kismet Operations Center Performance Tests...\n');
            
            this.initializeDevices();
            
            await this.testHTTPPerformance();
            await this.testWebSocketPerformance();
            await this.testMemoryManagement();
            await this.test3DGlobePerformance();
            
            this.generateReport();
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            this.cleanup();
        }
    }
}

// Run tests if executed directly
if (require.main === module) {
    const test = new PerformanceTest({
        numDevices: 500,
        updateInterval: 100,
        testDuration: 30000, // 30 seconds
        concurrentConnections: 5
    });
    
    test.runAllTests().then(() => {
        console.log('\nTests completed');
        process.exit(0);
    }).catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });
}

module.exports = PerformanceTest;
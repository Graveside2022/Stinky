/**
 * Performance and Load Tests
 * Tests system behavior under high load and stress conditions
 */

const request = require('supertest');
const { io: ioClient } = require('socket.io-client');
const WebhookService = require('../../../phase3/webhook_implementation/webhook');
const ProcessManager = require('../../../phase3/webhook_implementation/services/processManager');
const GpsService = require('../../../phase3/webhook_implementation/services/gpsService');
const KismetService = require('../../../phase3/webhook_implementation/services/kismetService');

// Mock services
jest.mock('../../../phase3/webhook_implementation/services/processManager');
jest.mock('../../../phase3/webhook_implementation/services/gpsService');
jest.mock('../../../phase3/webhook_implementation/services/kismetService');

// Increase test timeout for performance tests
jest.setTimeout(300000); // 5 minutes

describe('Performance and Load Tests', () => {
    let app;
    let server;
    let webhookService;
    let serverUrl;
    let mockProcessManager;
    let mockGpsService;
    let mockKismetService;

    beforeAll(async () => {
        // Prevent actual server startup
        process.env.NODE_ENV = 'test';
        process.env.WEBHOOK_PORT = '0'; // Use random port
        
        // Create mock instances
        mockProcessManager = {
            startMainScript: jest.fn(),
            stopAll: jest.fn(),
            getStatus: jest.fn(),
            isMainScriptRunning: jest.fn(),
            isKismetRunning: jest.fn(),
            isWigleToTakRunning: jest.fn(),
            cleanup: jest.fn(),
            on: jest.fn(),
            emit: jest.fn()
        };
        
        mockGpsService = {
            getGpsData: jest.fn()
        };
        
        mockKismetService = {
            isApiResponding: jest.fn(),
            getDataFromCsv: jest.fn(),
            getDataFromApi: jest.fn()
        };
        
        // Mock constructors
        ProcessManager.mockImplementation(() => mockProcessManager);
        GpsService.mockImplementation(() => mockGpsService);
        KismetService.mockImplementation(() => mockKismetService);
        
        // Create service instance
        webhookService = new WebhookService();
        await webhookService.start();
        
        app = webhookService.app;
        server = webhookService.server;
        const address = server.address();
        serverUrl = `http://localhost:${address.port}`;
    });

    afterAll(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupDefaultMocks();
    });

    function setupDefaultMocks() {
        mockProcessManager.getStatus.mockResolvedValue({
            main_running: true,
            kismet_running: true,
            wigle_running: true,
            has_unhealthy: false
        });
        mockProcessManager.isMainScriptRunning.mockResolvedValue(true);
        mockProcessManager.isKismetRunning.mockResolvedValue(true);
        mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);
        mockGpsService.getGpsData.mockResolvedValue({
            lat: 40.7128,
            lon: -74.0060,
            alt: 100.5,
            mode: 3,
            status: '3D Fix'
        });
        mockKismetService.isApiResponding.mockResolvedValue(true);
        mockKismetService.getDataFromCsv.mockResolvedValue({
            devices_count: 10,
            networks_count: 5,
            recent_devices: [],
            feed_items: [],
            last_update: '10:30:00 AM'
        });
    }

    describe('Concurrent Request Handling', () => {
        it('should handle 100 concurrent health check requests', async () => {
            const concurrentRequests = 100;
            const requests = [];

            const startTime = Date.now();

            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(
                    request(app).get('/health')
                );
            }

            const responses = await Promise.all(requests);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.status).toBe('healthy');
            });

            // Should complete reasonably quickly
            expect(totalTime).toBeLessThan(5000); // 5 seconds for 100 requests
            
            console.log(`Handled ${concurrentRequests} requests in ${totalTime}ms`);
        });

        it('should handle mixed endpoint concurrent requests', async () => {
            const requestsPerEndpoint = 20;
            const requests = [];

            const endpoints = [
                { method: 'get', path: '/health' },
                { method: 'get', path: '/webhook/info' },
                { method: 'get', path: '/webhook/script-status' },
                { method: 'get', path: '/webhook/kismet-data' },
                { method: 'post', path: '/webhook/run-script', data: { script: 'both' } }
            ];

            const startTime = Date.now();

            endpoints.forEach(endpoint => {
                for (let i = 0; i < requestsPerEndpoint; i++) {
                    const req = request(app)[endpoint.method](endpoint.path);
                    if (endpoint.data) {
                        req.send(endpoint.data);
                    }
                    requests.push(req);
                }
            });

            const responses = await Promise.all(requests);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // All requests should complete successfully
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBe(requests.length);

            console.log(`Handled ${requests.length} mixed requests in ${totalTime}ms`);
        });
    });

    describe('WebSocket Load Testing', () => {
        it('should handle 50 concurrent WebSocket connections', async () => {
            const connectionCount = 50;
            const clients = [];
            const connectionPromises = [];

            const startTime = Date.now();

            for (let i = 0; i < connectionCount; i++) {
                const client = ioClient(serverUrl, {
                    transports: ['websocket']
                });
                clients.push(client);

                const promise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error(`Client ${i} connection timeout`));
                    }, 10000);

                    client.on('connect', () => {
                        clearTimeout(timeout);
                        resolve(client.id);
                    });

                    client.on('connect_error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });
                connectionPromises.push(promise);
            }

            const clientIds = await Promise.all(connectionPromises);
            const endTime = Date.now();
            const connectionTime = endTime - startTime;

            // All clients should connect successfully
            expect(clientIds.length).toBe(connectionCount);
            expect(new Set(clientIds).size).toBe(connectionCount); // All unique IDs

            console.log(`Connected ${connectionCount} WebSocket clients in ${connectionTime}ms`);

            // Clean up
            clients.forEach(client => client.disconnect());
        });

        it('should handle high-frequency WebSocket events', async () => {
            const eventCount = 1000;
            const clientCount = 10;
            const clients = [];

            // Create and connect clients
            for (let i = 0; i < clientCount; i++) {
                const client = ioClient(serverUrl, {
                    transports: ['websocket']
                });
                await new Promise(resolve => client.on('connect', resolve));
                client.emit('subscribe:output', {});
                clients.push(client);
            }

            // Track received events
            const receivedEvents = new Map();
            clients.forEach((client, index) => {
                receivedEvents.set(index, []);
                client.on('script_output', (data) => {
                    receivedEvents.get(index).push(data);
                });
            });

            // Wait for subscriptions to process
            await new Promise(resolve => setTimeout(resolve, 100));

            const startTime = Date.now();

            // Emit many events rapidly
            for (let i = 0; i < eventCount; i++) {
                webhookService.io.to('output').emit('script_output', {
                    index: i,
                    timestamp: Date.now(),
                    data: `Event ${i}`
                });
            }

            // Wait for events to be received
            await new Promise(resolve => setTimeout(resolve, 2000));

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Each client should receive all events
            clients.forEach((client, index) => {
                const received = receivedEvents.get(index).length;
                expect(received).toBe(eventCount);
            });

            console.log(`Broadcast ${eventCount} events to ${clientCount} clients in ${totalTime}ms`);

            // Clean up
            clients.forEach(client => client.disconnect());
        });
    });

    describe('Memory and Resource Usage', () => {
        it('should not leak memory during sustained load', async () => {
            const iterations = 100;
            const requestsPerIteration = 10;
            
            // Get initial memory usage
            const initialMemory = process.memoryUsage();

            for (let i = 0; i < iterations; i++) {
                const requests = [];
                
                for (let j = 0; j < requestsPerIteration; j++) {
                    requests.push(
                        request(app).get('/webhook/script-status')
                    );
                }

                await Promise.all(requests);

                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            // Get final memory usage
            const finalMemory = process.memoryUsage();

            // Memory growth should be reasonable
            const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
            const heapGrowthMB = heapGrowth / 1024 / 1024;

            console.log(`Memory growth after ${iterations * requestsPerIteration} requests: ${heapGrowthMB.toFixed(2)}MB`);

            // Should not grow more than 50MB
            expect(heapGrowthMB).toBeLessThan(50);
        });

        it('should maintain cache efficiency under load', async () => {
            const requests = 200;
            const responses = [];

            // First, make many requests to populate cache
            for (let i = 0; i < requests; i++) {
                const response = await request(app).get('/webhook/script-status');
                responses.push(response);
            }

            // Count cache hits vs misses
            const mockCallCount = mockProcessManager.isMainScriptRunning.mock.calls.length;
            
            // Should use cache effectively (far fewer service calls than requests)
            expect(mockCallCount).toBeLessThan(requests / 10);
            
            console.log(`Cache efficiency: ${mockCallCount} service calls for ${requests} requests`);
        });
    });

    describe('Stress Testing', () => {
        it('should handle rapid start/stop cycles', async () => {
            const cycles = 20;
            const results = [];

            mockProcessManager.getStatus.mockImplementation(async () => ({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            }));
            mockProcessManager.startMainScript.mockResolvedValue({ success: true });
            mockProcessManager.stopAll.mockResolvedValue({ 
                success: true, 
                message: 'Stopped' 
            });

            const startTime = Date.now();

            for (let i = 0; i < cycles; i++) {
                // Start
                const startResponse = await request(app)
                    .post('/webhook/run-script')
                    .send({ script: 'both' });
                
                // Stop
                const stopResponse = await request(app)
                    .post('/webhook/stop-script');

                results.push({
                    cycle: i,
                    start: startResponse.body,
                    stop: stopResponse.body
                });
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // All cycles should complete successfully
            results.forEach(result => {
                expect(['success', 'warning']).toContain(result.start.status);
                expect(['success', 'warning']).toContain(result.stop.status);
            });

            console.log(`Completed ${cycles} start/stop cycles in ${totalTime}ms`);
        });

        it('should handle request timeouts gracefully', async () => {
            // Mock slow operations
            mockKismetService.getDataFromCsv.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
                return null;
            });
            mockKismetService.getDataFromApi.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
                return { devices_count: 0 };
            });

            const startTime = Date.now();

            // Make multiple concurrent slow requests
            const requests = [];
            for (let i = 0; i < 5; i++) {
                requests.push(
                    request(app)
                        .get('/webhook/kismet-data')
                        .timeout(2000) // 2 second timeout
                        .catch(err => ({ error: err.message }))
                );
            }

            const results = await Promise.all(requests);
            const endTime = Date.now();

            // Should handle timeouts without crashing
            results.forEach(result => {
                expect(result.error).toContain('Timeout');
            });

            console.log(`Handled ${requests.length} timeout scenarios in ${endTime - startTime}ms`);
        });
    });

    describe('Button Performance Under Load', () => {
        it('should maintain button responsiveness under system load', async () => {
            // Simulate background load
            const backgroundLoad = setInterval(() => {
                // Create some CPU load
                for (let i = 0; i < 1000000; i++) {
                    Math.sqrt(i);
                }
            }, 10);

            try {
                // Test button operations under load
                const buttonTests = [];
                
                for (let i = 0; i < 10; i++) {
                    const startTime = Date.now();
                    
                    const response = await request(app)
                        .post('/webhook/run-script')
                        .send({ script: 'both' });
                    
                    const responseTime = Date.now() - startTime;
                    
                    buttonTests.push({
                        iteration: i,
                        responseTime,
                        status: response.body.status
                    });
                }

                // Button should remain responsive
                const avgResponseTime = buttonTests.reduce((sum, test) => sum + test.responseTime, 0) / buttonTests.length;
                const maxResponseTime = Math.max(...buttonTests.map(t => t.responseTime));

                console.log(`Button response times under load: avg=${avgResponseTime}ms, max=${maxResponseTime}ms`);

                // Should maintain reasonable response times even under load
                expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
                expect(maxResponseTime).toBeLessThan(2000); // Max under 2 seconds
                
            } finally {
                clearInterval(backgroundLoad);
            }
        });

        it('should handle button spam under WebSocket load', async () => {
            // Create WebSocket load
            const wsClients = [];
            for (let i = 0; i < 20; i++) {
                const client = ioClient(serverUrl, {
                    transports: ['websocket']
                });
                await new Promise(resolve => client.on('connect', resolve));
                client.emit('subscribe:output', {});
                client.emit('subscribe:status', {});
                wsClients.push(client);
            }

            // Generate WebSocket traffic
            const wsInterval = setInterval(() => {
                webhookService.io.emit('script_output', {
                    data: 'Background noise',
                    timestamp: Date.now()
                });
            }, 50);

            try {
                // Spam buttons while WebSocket traffic is high
                const buttonRequests = [];
                for (let i = 0; i < 50; i++) {
                    buttonRequests.push(
                        request(app)
                            .post('/webhook/run-script')
                            .send({ script: 'both' })
                            .catch(err => ({ error: err.message }))
                    );
                }

                const results = await Promise.all(buttonRequests);
                const successCount = results.filter(r => !r.error && r.body?.status).length;

                // Should handle most requests successfully
                expect(successCount).toBeGreaterThan(45); // At least 90% success rate

                console.log(`Button spam test: ${successCount}/${buttonRequests.length} successful`);

            } finally {
                clearInterval(wsInterval);
                wsClients.forEach(client => client.disconnect());
            }
        });
    });

    describe('Service Recovery Under Load', () => {
        it('should recover from service failures during high load', async () => {
            const concurrentUsers = 25;
            let failureCount = 0;

            // Simulate intermittent failures
            mockProcessManager.isKismetRunning.mockImplementation(async () => {
                failureCount++;
                if (failureCount % 5 === 0) {
                    throw new Error('Service check failed');
                }
                return true;
            });

            const requests = [];
            for (let i = 0; i < concurrentUsers; i++) {
                requests.push(
                    request(app)
                        .get('/webhook/script-status')
                        .catch(err => ({ error: true }))
                );
            }

            const results = await Promise.all(requests);
            const successCount = results.filter(r => !r.error && r.status === 200).length;

            // Should handle failures gracefully
            expect(successCount).toBeGreaterThan(concurrentUsers * 0.7); // At least 70% success

            console.log(`Service recovery test: ${successCount}/${concurrentUsers} successful despite failures`);
        });
    });
});
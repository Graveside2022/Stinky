/**
 * Integration Tests for WebSocket Functionality
 * Tests real-time event handling and connection management
 */

const { io: ioClient } = require('socket.io-client');
const WebhookService = require('../../../phase3/webhook_implementation/webhook');
const ProcessManager = require('../../../phase3/webhook_implementation/services/processManager');
const GpsService = require('../../../phase3/webhook_implementation/services/gpsService');
const KismetService = require('../../../phase3/webhook_implementation/services/kismetService');

// Mock services
jest.mock('../../../phase3/webhook_implementation/services/processManager');
jest.mock('../../../phase3/webhook_implementation/services/gpsService');
jest.mock('../../../phase3/webhook_implementation/services/kismetService');

describe('WebSocket Integration Tests', () => {
    let webhookService;
    let server;
    let serverUrl;
    let client;
    let mockProcessManager;

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
            emit: jest.fn(),
            removeAllListeners: jest.fn()
        };
        
        const mockGpsService = {
            getGpsData: jest.fn()
        };
        
        const mockKismetService = {
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
    });

    afterEach(() => {
        if (client) {
            client.disconnect();
            client = null;
        }
    });

    describe('Connection management', () => {
        it('should establish WebSocket connection', (done) => {
            client = ioClient(serverUrl, {
                transports: ['websocket']
            });

            client.on('connect', () => {
                expect(client.connected).toBe(true);
                done();
            });
        });

        it('should handle multiple simultaneous connections', async () => {
            const clients = [];
            const connectionPromises = [];

            for (let i = 0; i < 5; i++) {
                const client = ioClient(serverUrl, {
                    transports: ['websocket']
                });
                clients.push(client);

                const promise = new Promise((resolve) => {
                    client.on('connect', () => {
                        resolve(client.id);
                    });
                });
                connectionPromises.push(promise);
            }

            const clientIds = await Promise.all(connectionPromises);
            
            // All clients should have unique IDs
            expect(new Set(clientIds).size).toBe(5);
            
            // Clean up
            clients.forEach(client => client.disconnect());
        });

        it('should handle reconnection', (done) => {
            client = ioClient(serverUrl, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 3,
                reconnectionDelay: 100
            });

            let connectCount = 0;
            client.on('connect', () => {
                connectCount++;
                if (connectCount === 1) {
                    // Force disconnect
                    client.disconnect();
                    // Reconnect
                    client.connect();
                } else if (connectCount === 2) {
                    expect(client.connected).toBe(true);
                    done();
                }
            });
        });

        it('should handle disconnect gracefully', (done) => {
            client = ioClient(serverUrl, {
                transports: ['websocket']
            });

            client.on('connect', () => {
                client.on('disconnect', () => {
                    expect(client.connected).toBe(false);
                    done();
                });
                client.disconnect();
            });
        });
    });

    describe('Event subscriptions', () => {
        beforeEach((done) => {
            client = ioClient(serverUrl, {
                transports: ['websocket']
            });
            client.on('connect', done);
        });

        it('should subscribe to output events', (done) => {
            client.emit('subscribe:output', {});
            
            // Verify subscription worked by emitting from server
            setTimeout(() => {
                webhookService.io.to('output').emit('script_output', {
                    script: 'test',
                    type: 'stdout',
                    data: 'Test output',
                    timestamp: Date.now()
                });
            }, 100);

            client.on('script_output', (data) => {
                expect(data).toMatchObject({
                    script: 'test',
                    type: 'stdout',
                    data: 'Test output',
                    timestamp: expect.any(Number)
                });
                done();
            });
        });

        it('should subscribe to status events', (done) => {
            client.emit('subscribe:status', {});
            
            // Verify subscription worked by emitting from server
            setTimeout(() => {
                webhookService.io.to('status').emit('status_update', {
                    type: 'services_started',
                    kismet: true,
                    wigle: true,
                    timestamp: new Date().toISOString()
                });
            }, 100);

            client.on('status_update', (data) => {
                expect(data).toMatchObject({
                    type: 'services_started',
                    kismet: true,
                    wigle: true,
                    timestamp: expect.any(String)
                });
                done();
            });
        });

        it('should handle multiple subscriptions', (done) => {
            let outputReceived = false;
            let statusReceived = false;

            client.emit('subscribe:output', {});
            client.emit('subscribe:status', {});

            client.on('script_output', (data) => {
                outputReceived = true;
                checkComplete();
            });

            client.on('status_update', (data) => {
                statusReceived = true;
                checkComplete();
            });

            const checkComplete = () => {
                if (outputReceived && statusReceived) {
                    done();
                }
            };

            // Emit both events
            setTimeout(() => {
                webhookService.io.to('output').emit('script_output', { test: 'output' });
                webhookService.io.to('status').emit('status_update', { test: 'status' });
            }, 100);
        });
    });

    describe('Process output events', () => {
        beforeEach((done) => {
            client = ioClient(serverUrl, {
                transports: ['websocket']
            });
            client.on('connect', () => {
                client.emit('subscribe:output', {});
                done();
            });
        });

        it('should relay process manager output events', (done) => {
            // Get the event handler that was registered
            const outputHandler = mockProcessManager.on.mock.calls.find(
                call => call[0] === 'output'
            )?.[1];
            
            expect(outputHandler).toBeDefined();

            client.on('script_output', (data) => {
                expect(data).toMatchObject({
                    script: 'kismet',
                    type: 'stdout',
                    data: 'Kismet started successfully',
                    timestamp: expect.any(Number)
                });
                done();
            });

            // Simulate process output
            outputHandler({
                script: 'kismet',
                type: 'stdout',
                data: 'Kismet started successfully',
                timestamp: Date.now()
            });
        });

        it('should handle stderr output', (done) => {
            const outputHandler = mockProcessManager.on.mock.calls.find(
                call => call[0] === 'output'
            )?.[1];

            client.on('script_output', (data) => {
                expect(data.type).toBe('stderr');
                expect(data.data).toContain('Warning');
                done();
            });

            outputHandler({
                script: 'main',
                type: 'stderr',
                data: 'Warning: Configuration not found',
                timestamp: Date.now()
            });
        });
    });

    describe('Status change events', () => {
        beforeEach((done) => {
            client = ioClient(serverUrl, {
                transports: ['websocket']
            });
            client.on('connect', () => {
                client.emit('subscribe:status', {});
                done();
            });
        });

        it('should relay process status changes', (done) => {
            // Get the event handler that was registered
            const statusHandler = mockProcessManager.on.mock.calls.find(
                call => call[0] === 'status_changed'
            )?.[1];
            
            expect(statusHandler).toBeDefined();

            client.on('status_update', (data) => {
                expect(data).toMatchObject({
                    script: 'main',
                    status: 'stopped',
                    code: 0
                });
                done();
            });

            // Simulate status change
            statusHandler({
                script: 'main',
                status: 'stopped',
                code: 0
            });
        });
    });

    describe('Broadcast scenarios', () => {
        it('should broadcast to multiple clients in same room', async () => {
            const clients = [];
            const receivedMessages = [];

            // Create multiple clients and subscribe to output
            for (let i = 0; i < 3; i++) {
                const client = ioClient(serverUrl, {
                    transports: ['websocket']
                });
                
                await new Promise((resolve) => {
                    client.on('connect', () => {
                        client.emit('subscribe:output', {});
                        resolve();
                    });
                });

                client.on('script_output', (data) => {
                    receivedMessages.push({ clientId: client.id, data });
                });

                clients.push(client);
            }

            // Wait for subscriptions to be processed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Broadcast message
            webhookService.io.to('output').emit('script_output', {
                test: 'broadcast'
            });

            // Wait for messages to be received
            await new Promise(resolve => setTimeout(resolve, 100));

            // All clients should receive the message
            expect(receivedMessages).toHaveLength(3);
            expect(new Set(receivedMessages.map(m => m.clientId)).size).toBe(3);

            // Clean up
            clients.forEach(client => client.disconnect());
        });

        it('should not send events to unsubscribed clients', async () => {
            const subscribedClient = ioClient(serverUrl, {
                transports: ['websocket']
            });
            const unsubscribedClient = ioClient(serverUrl, {
                transports: ['websocket']
            });

            await Promise.all([
                new Promise(resolve => subscribedClient.on('connect', resolve)),
                new Promise(resolve => unsubscribedClient.on('connect', resolve))
            ]);

            // Only subscribe one client
            subscribedClient.emit('subscribe:output', {});

            let subscribedReceived = false;
            let unsubscribedReceived = false;

            subscribedClient.on('script_output', () => {
                subscribedReceived = true;
            });

            unsubscribedClient.on('script_output', () => {
                unsubscribedReceived = true;
            });

            // Wait for subscription
            await new Promise(resolve => setTimeout(resolve, 100));

            // Broadcast to output room
            webhookService.io.to('output').emit('script_output', {
                test: 'selective'
            });

            // Wait for potential messages
            await new Promise(resolve => setTimeout(resolve, 200));

            expect(subscribedReceived).toBe(true);
            expect(unsubscribedReceived).toBe(false);

            // Clean up
            subscribedClient.disconnect();
            unsubscribedClient.disconnect();
        });
    });

    describe('Error scenarios', () => {
        it('should handle invalid event names gracefully', (done) => {
            client = ioClient(serverUrl, {
                transports: ['websocket']
            });

            client.on('connect', () => {
                // Send invalid event
                client.emit('invalid:event', { data: 'test' });
                
                // Should not crash server, client should remain connected
                setTimeout(() => {
                    expect(client.connected).toBe(true);
                    done();
                }, 100);
            });
        });

        it('should handle malformed event data', (done) => {
            client = ioClient(serverUrl, {
                transports: ['websocket']
            });

            client.on('connect', () => {
                // Send circular reference (can't be JSON stringified)
                const circularData = { a: 1 };
                circularData.self = circularData;
                
                client.emit('subscribe:output', circularData);
                
                // Should not crash
                setTimeout(() => {
                    expect(client.connected).toBe(true);
                    done();
                }, 100);
            });
        });
    });

    describe('Performance', () => {
        it('should handle rapid event emission', async () => {
            client = ioClient(serverUrl, {
                transports: ['websocket']
            });

            await new Promise(resolve => client.on('connect', resolve));
            
            client.emit('subscribe:output', {});
            
            const receivedEvents = [];
            client.on('script_output', (data) => {
                receivedEvents.push(data);
            });

            // Wait for subscription
            await new Promise(resolve => setTimeout(resolve, 100));

            // Emit many events rapidly
            const eventCount = 100;
            for (let i = 0; i < eventCount; i++) {
                webhookService.io.to('output').emit('script_output', {
                    index: i,
                    timestamp: Date.now()
                });
            }

            // Wait for events to be processed
            await new Promise(resolve => setTimeout(resolve, 500));

            // Should receive all events
            expect(receivedEvents).toHaveLength(eventCount);
            expect(receivedEvents[0].index).toBe(0);
            expect(receivedEvents[eventCount - 1].index).toBe(eventCount - 1);
        });
    });

    describe('Connection options', () => {
        it('should respect ping interval settings', async () => {
            // Set custom ping interval
            process.env.WS_PING_INTERVAL = '1000';
            process.env.WS_PING_TIMEOUT = '500';
            
            const customService = new WebhookService();
            const customServer = customService.server;
            
            // Verify socket.io was configured with custom settings
            expect(customService.io.opts.pingInterval).toBe(1000);
            expect(customService.io.opts.pingTimeout).toBe(500);
            
            // Clean up
            delete process.env.WS_PING_INTERVAL;
            delete process.env.WS_PING_TIMEOUT;
        });
    });
});
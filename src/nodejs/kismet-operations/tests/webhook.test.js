/**
 * Webhook Service Integration Tests
 * 
 * Comprehensive test suite for webhook endpoints, error handling,
 * and WebSocket functionality
 */

const request = require('supertest');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

// Mock dependencies
jest.mock('../../shared/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }),
    getExpressMiddleware: () => (req, res, next) => next()
}));

jest.mock('child_process', () => ({
    spawn: jest.fn(),
    exec: jest.fn()
}));

const SpectrumAnalyzerService = require('../index');

describe('Webhook Service Tests', () => {
    let service;
    let app;
    let server;
    const testPort = 0; // Use random port

    beforeAll(async () => {
        service = new SpectrumAnalyzerService({ port: testPort });
        await service.start();
        app = service.app;
        server = service.server;
    });

    afterAll(async () => {
        await service.stop();
    });

    describe('REST API Endpoints', () => {
        describe('POST /api/webhook/run-script', () => {
            test('should start a valid script', async () => {
                const response = await request(app)
                    .post('/api/webhook/run-script')
                    .send({
                        script: 'kismet',
                        options: {
                            interface: 'wlan0'
                        }
                    });

                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({
                    success: true,
                    message: 'Script started successfully',
                    script: 'kismet'
                });
                expect(response.body.pid).toBeDefined();
            });

            test('should reject invalid script name', async () => {
                const response = await request(app)
                    .post('/api/webhook/run-script')
                    .send({
                        script: 'invalid_script'
                    });

                expect(response.status).toBe(400);
                expect(response.body).toMatchObject({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: expect.stringContaining('Invalid')
                    }
                });
            });

            test('should handle already running script', async () => {
                // First start
                await request(app)
                    .post('/api/webhook/run-script')
                    .send({ script: 'gps' });

                // Try to start again
                const response = await request(app)
                    .post('/api/webhook/run-script')
                    .send({ script: 'gps' });

                expect(response.status).toBe(409);
                expect(response.body).toMatchObject({
                    success: false,
                    error: 'ALREADY_RUNNING'
                });
            });
        });

        describe('POST /api/webhook/stop-script', () => {
            test('should stop a running script', async () => {
                // Start script first
                await request(app)
                    .post('/api/webhook/run-script')
                    .send({ script: 'kismet' });

                // Stop it
                const response = await request(app)
                    .post('/api/webhook/stop-script')
                    .send({ script: 'kismet' });

                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({
                    success: true,
                    message: 'Script stopped successfully',
                    script: 'kismet'
                });
            });

            test('should handle stopping non-running script', async () => {
                const response = await request(app)
                    .post('/api/webhook/stop-script')
                    .send({ script: 'gps' });

                expect(response.status).toBe(404);
                expect(response.body).toMatchObject({
                    success: false,
                    error: 'NOT_RUNNING'
                });
            });

            test('should support force stop', async () => {
                // Start script
                await request(app)
                    .post('/api/webhook/run-script')
                    .send({ script: 'both' });

                // Force stop
                const response = await request(app)
                    .post('/api/webhook/stop-script')
                    .send({ 
                        script: 'both',
                        force: true
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        describe('GET /api/webhook/script-status', () => {
            test('should return status for all scripts', async () => {
                const response = await request(app)
                    .get('/api/webhook/script-status');

                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({
                    success: true,
                    status: {
                        kismet: expect.any(Object),
                        gps: expect.any(Object)
                    }
                });
            });

            test('should filter by specific script', async () => {
                const response = await request(app)
                    .get('/api/webhook/script-status?script=kismet');

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.status).toHaveProperty('running');
            });
        });

        describe('GET /api/webhook/info', () => {
            test('should return system information', async () => {
                const response = await request(app)
                    .get('/api/webhook/info');

                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({
                    success: true,
                    system: {
                        hostname: expect.any(String),
                        platform: expect.any(String),
                        arch: expect.any(String),
                        uptime: expect.any(Number),
                        loadAverage: expect.any(Array),
                        memory: expect.any(Object),
                        disk: expect.any(Object)
                    },
                    services: expect.any(Object),
                    network: {
                        interfaces: expect.any(Array)
                    }
                });
            });
        });

        describe('GET /api/webhook/kismet-data', () => {
            test('should handle Kismet not running', async () => {
                const response = await request(app)
                    .get('/api/webhook/kismet-data');

                expect(response.status).toBe(503);
                expect(response.body).toMatchObject({
                    success: false,
                    error: 'KISMET_UNAVAILABLE'
                });
            });

            test('should validate query parameters', async () => {
                const response = await request(app)
                    .get('/api/webhook/kismet-data?type=invalid&limit=5000');

                expect(response.status).toBe(400);
            });

            test('should support CSV format', async () => {
                // This would need Kismet running
                const response = await request(app)
                    .get('/api/webhook/kismet-data?format=csv');

                if (response.status === 200) {
                    expect(response.type).toBe('text/csv');
                }
            });
        });

        describe('GET /api/webhook/health', () => {
            test('should return health status', async () => {
                const response = await request(app)
                    .get('/api/webhook/health');

                expect(response.status).toBe(200);
                expect(response.body).toMatchObject({
                    success: true,
                    service: 'webhook',
                    status: 'healthy',
                    checks: {
                        scriptManager: true,
                        kismetClient: expect.any(Boolean),
                        cache: true
                    }
                });
            });
        });

        describe('Rate Limiting', () => {
            test('should rate limit excessive requests', async () => {
                // Make many requests quickly
                const promises = [];
                for (let i = 0; i < 150; i++) {
                    promises.push(
                        request(app).get('/api/webhook/script-status')
                    );
                }

                const responses = await Promise.all(promises);
                const rateLimited = responses.some(r => r.status === 429);

                expect(rateLimited).toBe(true);
            });
        });
    });

    describe('WebSocket Events', () => {
        let wsClient;
        const wsUrl = `ws://localhost:${server.address().port}/webhook`;

        beforeEach((done) => {
            wsClient = new WebSocket(wsUrl);
            wsClient.on('open', done);
        });

        afterEach(() => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.close();
            }
        });

        test('should handle connection and send welcome message', (done) => {
            wsClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'connected') {
                    expect(message).toMatchObject({
                        clientId: expect.any(String),
                        timestamp: expect.any(String),
                        availableChannels: ['status', 'devices', 'alerts']
                    });
                    done();
                }
            });
        });

        test('should handle subscription to channels', (done) => {
            wsClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'subscribed') {
                    expect(message.channels).toContain('status');
                    done();
                }
            });

            wsClient.send(JSON.stringify({
                event: 'subscribe',
                data: { channels: ['status'] }
            }));
        });

        test('should receive status updates', (done) => {
            let subscribed = false;

            wsClient.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'subscribed') {
                    subscribed = true;
                } else if (subscribed && message.type === 'statusUpdate') {
                    expect(message).toMatchObject({
                        status: expect.any(Object),
                        timestamp: expect.any(String)
                    });
                    done();
                }
            });

            wsClient.send(JSON.stringify({
                event: 'subscribe',
                data: { channels: ['status'] }
            }));

            // Request immediate status
            setTimeout(() => {
                wsClient.send(JSON.stringify({
                    event: 'requestStatus',
                    data: {}
                }));
            }, 100);
        });

        test('should handle unsubscribe', (done) => {
            wsClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'unsubscribed') {
                    expect(message.channels).toContain('devices');
                    done();
                }
            });

            // First subscribe
            wsClient.send(JSON.stringify({
                event: 'subscribe',
                data: { channels: ['devices'] }
            }));

            // Then unsubscribe
            setTimeout(() => {
                wsClient.send(JSON.stringify({
                    event: 'unsubscribe',
                    data: { channels: ['devices'] }
                }));
            }, 100);
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed JSON', async () => {
            const response = await request(app)
                .post('/api/webhook/run-script')
                .set('Content-Type', 'application/json')
                .send('{"invalid json');

            expect(response.status).toBe(400);
        });

        test('should handle missing required fields', async () => {
            const response = await request(app)
                .post('/api/webhook/run-script')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        test('should handle server errors gracefully', async () => {
            // Simulate error by mocking internal method
            jest.spyOn(service.webhookService.scriptManager, 'startScript')
                .mockRejectedValueOnce(new Error('Internal error'));

            const response = await request(app)
                .post('/api/webhook/run-script')
                .send({ script: 'kismet' });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Security', () => {
        test('should sanitize file paths', async () => {
            const response = await request(app)
                .post('/api/webhook/run-script')
                .send({
                    script: '../../../etc/passwd'
                });

            expect(response.status).toBe(400);
        });

        test('should limit request body size', async () => {
            const largePayload = {
                script: 'kismet',
                options: {
                    data: 'x'.repeat(2 * 1024 * 1024) // 2MB
                }
            };

            const response = await request(app)
                .post('/api/webhook/run-script')
                .send(largePayload);

            expect(response.status).toBe(413); // Payload too large
        });
    });
});

describe('Performance Tests', () => {
    let service;

    beforeAll(async () => {
        service = new SpectrumAnalyzerService({ port: 0 });
        await service.start();
    });

    afterAll(async () => {
        await service.stop();
    });

    test('should handle concurrent requests efficiently', async () => {
        const startTime = Date.now();
        const concurrentRequests = 50;
        
        const promises = Array(concurrentRequests).fill().map(() =>
            request(service.app).get('/api/webhook/script-status')
        );

        const responses = await Promise.all(promises);
        const duration = Date.now() - startTime;

        // All should succeed
        expect(responses.every(r => r.status === 200)).toBe(true);
        
        // Should complete within reasonable time (2 seconds for 50 requests)
        expect(duration).toBeLessThan(2000);
    });

    test('should cache responses appropriately', async () => {
        // First request
        const start1 = Date.now();
        await request(service.app).get('/api/webhook/info');
        const duration1 = Date.now() - start1;

        // Second request (should be cached)
        const start2 = Date.now();
        await request(service.app).get('/api/webhook/info');
        const duration2 = Date.now() - start2;

        // Cached request should be significantly faster
        expect(duration2).toBeLessThan(duration1 / 2);
    });
});
/**
 * Integration Tests for Webhook API
 * Tests all REST API endpoints with real HTTP requests
 */

const request = require('supertest');
const WebhookService = require('../../../phase3/webhook_implementation/webhook');
const ProcessManager = require('../../../phase3/webhook_implementation/services/processManager');
const GpsService = require('../../../phase3/webhook_implementation/services/gpsService');
const KismetService = require('../../../phase3/webhook_implementation/services/kismetService');

// Mock services
jest.mock('../../../phase3/webhook_implementation/services/processManager');
jest.mock('../../../phase3/webhook_implementation/services/gpsService');
jest.mock('../../../phase3/webhook_implementation/services/kismetService');

describe('Webhook API Integration Tests', () => {
    let app;
    let server;
    let webhookService;
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
    });

    afterAll(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'healthy',
                uptime: expect.any(Number),
                memory: expect.any(Object),
                timestamp: expect.any(String)
            });
        });
    });

    describe('POST /webhook/run-script', () => {
        it('should start services successfully', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            mockProcessManager.startMainScript.mockResolvedValue({ success: true, pid: 12345 });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'success',
                message: expect.stringContaining('Script started successfully')
            });
            expect(mockProcessManager.startMainScript).toHaveBeenCalled();
        });

        it('should handle default script parameter', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            mockProcessManager.startMainScript.mockResolvedValue({ success: true });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const response = await request(app)
                .post('/webhook/run-script')
                .send({}) // No script parameter
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(mockProcessManager.startMainScript).toHaveBeenCalled();
        });

        it('should return warning if services already running', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: true,
                kismet_running: true,
                wigle_running: true,
                has_unhealthy: false
            });

            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'warning',
                message: 'Services are already running'
            });
            expect(mockProcessManager.startMainScript).not.toHaveBeenCalled();
        });

        it('should clean up unhealthy processes before starting', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: true
            });
            mockProcessManager.cleanup.mockResolvedValue();
            mockProcessManager.startMainScript.mockResolvedValue({ success: true });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(mockProcessManager.cleanup).toHaveBeenCalled();
            expect(mockProcessManager.startMainScript).toHaveBeenCalled();
        });

        it('should handle script start failures', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            mockProcessManager.startMainScript.mockRejectedValue(new Error('Failed to start'));

            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'error',
                message: expect.stringContaining('Failed to start services')
            });
        });

        it('should validate script parameter', async () => {
            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'invalid' })
                .expect(400);

            expect(response.body).toMatchObject({
                status: 'error',
                message: 'Invalid request parameters',
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        path: 'script',
                        msg: 'Invalid script type'
                    })
                ])
            });
        });

        it('should report partial service startup', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            mockProcessManager.startMainScript.mockResolvedValue({ success: true });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(false); // WigleToTAK fails

            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(response.body.message).toContain('Kismet is running');
            expect(response.body.message).toContain('WigleToTAK is not running yet');
        });
    });

    describe('POST /webhook/stop-script', () => {
        it('should stop all services successfully', async () => {
            mockProcessManager.stopAll.mockResolvedValue({
                success: true,
                message: 'All services stopped successfully'
            });

            const response = await request(app)
                .post('/webhook/stop-script')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'success',
                message: 'All services stopped successfully'
            });
            expect(mockProcessManager.stopAll).toHaveBeenCalled();
        });

        it('should handle stop failures', async () => {
            mockProcessManager.stopAll.mockRejectedValue(new Error('Failed to stop'));

            const response = await request(app)
                .post('/webhook/stop-script')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'error',
                message: expect.stringContaining('Failed to stop services')
            });
        });

        it('should return warning for partial stop', async () => {
            mockProcessManager.stopAll.mockResolvedValue({
                success: false,
                message: 'Some services could not be stopped'
            });

            const response = await request(app)
                .post('/webhook/stop-script')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'warning',
                message: 'Some services could not be stopped'
            });
        });
    });

    describe('GET /webhook/info', () => {
        it('should return system information with GPS data', async () => {
            const mockGpsData = {
                lat: 40.7128,
                lon: -74.0060,
                alt: 100.5,
                mode: 3,
                status: '3D Fix'
            };
            
            mockGpsService.getGpsData.mockResolvedValue(mockGpsData);
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockKismetService.isApiResponding.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const response = await request(app)
                .get('/webhook/info')
                .expect(200);

            expect(response.body).toMatchObject({
                gps: mockGpsData,
                kismet: 'Running',
                wigle: 'Running',
                ip: expect.any(String)
            });
        });

        it('should handle service check failures', async () => {
            mockGpsService.getGpsData.mockRejectedValue(new Error('GPS error'));
            mockProcessManager.isKismetRunning.mockResolvedValue(false);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(false);

            const response = await request(app)
                .get('/webhook/info')
                .expect(500);

            expect(response.body).toMatchObject({
                status: 'error',
                message: 'Failed to retrieve system information'
            });
        });
    });

    describe('GET /webhook/script-status', () => {
        it('should return detailed service status', async () => {
            mockProcessManager.isMainScriptRunning.mockResolvedValue(true);
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockKismetService.isApiResponding.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const response = await request(app)
                .get('/webhook/script-status')
                .expect(200);

            expect(response.body).toMatchObject({
                running: true,
                message: expect.stringContaining('Main script is running'),
                kismet_running: true,
                kismet_api_responding: true,
                wigle_running: true
            });
        });

        it('should cache status responses', async () => {
            mockProcessManager.isMainScriptRunning.mockResolvedValue(true);
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockKismetService.isApiResponding.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            // First request
            await request(app)
                .get('/webhook/script-status')
                .expect(200);

            // Clear mocks
            jest.clearAllMocks();

            // Second request within cache timeout
            await request(app)
                .get('/webhook/script-status')
                .expect(200);

            // Should not call service methods again
            expect(mockProcessManager.isMainScriptRunning).not.toHaveBeenCalled();
            expect(mockProcessManager.isKismetRunning).not.toHaveBeenCalled();
        });

        it('should build correct status message', async () => {
            mockProcessManager.isMainScriptRunning.mockResolvedValue(false);
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockKismetService.isApiResponding.mockResolvedValue(false);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(false);

            const response = await request(app)
                .get('/webhook/script-status')
                .expect(200);

            expect(response.body.message).toContain('Kismet is running');
            expect(response.body.message).toContain('API is not responding');
            expect(response.body.message).toContain('WigleToTAK is not running');
            expect(response.body.message).not.toContain('Main script is running');
        });

        it('should handle status check errors', async () => {
            mockProcessManager.isMainScriptRunning.mockRejectedValue(new Error('Check failed'));

            const response = await request(app)
                .get('/webhook/script-status')
                .expect(500);

            expect(response.body).toMatchObject({
                status: 'error',
                message: 'Failed to retrieve service status'
            });
        });
    });

    describe('GET /webhook/kismet-data', () => {
        const mockCsvData = {
            devices_count: 10,
            networks_count: 5,
            recent_devices: [
                { name: 'Device1', type: 'AP', channel: '6' }
            ],
            feed_items: [
                { type: 'Device', message: 'Test device found' }
            ],
            last_update: '10:30:00 AM'
        };

        const mockApiData = {
            devices_count: 15,
            networks_count: 8,
            recent_devices: [
                { name: 'Device2', type: 'Client', channel: '11' }
            ],
            feed_items: [
                { type: 'Device', message: 'API device found' }
            ],
            last_update: '10:35:00 AM'
        };

        it('should return CSV data when available', async () => {
            mockKismetService.getDataFromCsv.mockResolvedValue(mockCsvData);
            mockKismetService.getDataFromApi.mockResolvedValue(mockApiData);

            const response = await request(app)
                .get('/webhook/kismet-data')
                .expect(200);

            expect(response.body).toEqual(mockCsvData);
            expect(mockKismetService.getDataFromCsv).toHaveBeenCalled();
            expect(mockKismetService.getDataFromApi).not.toHaveBeenCalled();
        });

        it('should fallback to API when CSV not available', async () => {
            mockKismetService.getDataFromCsv.mockResolvedValue(null);
            mockKismetService.getDataFromApi.mockResolvedValue(mockApiData);

            const response = await request(app)
                .get('/webhook/kismet-data')
                .expect(200);

            expect(response.body).toEqual(mockApiData);
            expect(mockKismetService.getDataFromCsv).toHaveBeenCalled();
            expect(mockKismetService.getDataFromApi).toHaveBeenCalled();
        });

        it('should return error response when both sources fail', async () => {
            mockKismetService.getDataFromCsv.mockResolvedValue(null);
            mockKismetService.getDataFromApi.mockRejectedValue(new Error('API failed'));

            const response = await request(app)
                .get('/webhook/kismet-data')
                .expect(200);

            expect(response.body).toMatchObject({
                devices_count: 0,
                networks_count: 0,
                recent_devices: [],
                feed_items: [],
                last_update: expect.any(String),
                error: 'API failed'
            });
        });
    });

    describe('Error handling', () => {
        it('should return 404 for unknown endpoints', async () => {
            const response = await request(app)
                .get('/webhook/unknown-endpoint')
                .expect(404);

            expect(response.body).toMatchObject({
                error: 'NOT_FOUND',
                message: 'The requested endpoint does not exist',
                path: '/webhook/unknown-endpoint'
            });
        });

        it('should handle JSON parsing errors', async () => {
            const response = await request(app)
                .post('/webhook/run-script')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);

            expect(response.body).toMatchObject({
                status: 'error',
                message: expect.any(String)
            });
        });

        it('should handle request size limits', async () => {
            const largePayload = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB

            const response = await request(app)
                .post('/webhook/run-script')
                .send(largePayload)
                .expect(413);

            expect(response.body).toBeDefined();
        });
    });

    describe('CORS and security headers', () => {
        it('should include CORS headers', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        it('should include security headers', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.headers['x-dns-prefetch-control']).toBe('off');
            expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
        });

        it('should handle CORS preflight requests', async () => {
            const response = await request(app)
                .options('/webhook/run-script')
                .set('Origin', 'http://example.com')
                .set('Access-Control-Request-Method', 'POST')
                .expect(204);

            expect(response.headers['access-control-allow-methods']).toBeDefined();
        });
    });
});
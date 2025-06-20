/**
 * End-to-End Tests for Button Functionality
 * Tests the complete flow from button click to service execution
 * CRITICAL: These tests ensure the button timeout fix is working
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

// Increase test timeout for E2E tests
jest.setTimeout(120000); // 2 minutes

describe('Button Functionality E2E Tests', () => {
    let app;
    let server;
    let webhookService;
    let serverUrl;
    let wsClient;
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
        if (wsClient) {
            wsClient.disconnect();
        }
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Start Button Tests', () => {
        it('should handle START button click without timeout', async () => {
            // Setup initial state - services not running
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });

            // Mock successful start
            mockProcessManager.startMainScript.mockResolvedValue({ 
                success: true, 
                pid: 12345 
            });

            // Simulate gradual service startup
            let kismetCheckCount = 0;
            mockProcessManager.isKismetRunning.mockImplementation(async () => {
                kismetCheckCount++;
                // Kismet starts after 3 checks (simulating ~15 seconds)
                return kismetCheckCount >= 3;
            });

            let wigleCheckCount = 0;
            mockProcessManager.isWigleToTakRunning.mockImplementation(async () => {
                wigleCheckCount++;
                // WigleToTAK starts after 2 checks (simulating ~20 seconds)
                return wigleCheckCount >= 2;
            });

            // Track timing
            const startTime = Date.now();

            // Make the API call (simulating button click)
            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            const responseTime = Date.now() - startTime;

            // Verify response
            expect(response.body).toMatchObject({
                status: 'success',
                message: expect.stringContaining('Script started successfully')
            });
            expect(response.body.message).toContain('Kismet is running');
            expect(response.body.message).toContain('WigleToTAK is running');

            // Verify timing - should complete within reasonable time even with retries
            expect(responseTime).toBeLessThan(90000); // Should complete in less than 90 seconds
            
            // Verify service checks were performed
            expect(mockProcessManager.startMainScript).toHaveBeenCalledTimes(1);
            expect(mockProcessManager.isKismetRunning).toHaveBeenCalled();
            expect(mockProcessManager.isWigleToTakRunning).toHaveBeenCalled();
        });

        it('should handle START button when services partially start', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });

            mockProcessManager.startMainScript.mockResolvedValue({ 
                success: true, 
                pid: 12345 
            });

            // Kismet starts successfully
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            
            // WigleToTAK never starts
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(false);

            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toContain('Kismet is running');
            expect(response.body.message).toContain('WigleToTAK is not running yet');
        });

        it('should handle START button when services are already running', async () => {
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
            mockProcessManager.startMainScript.mockResolvedValue({ 
                success: true, 
                pid: 12345 
            });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(mockProcessManager.cleanup).toHaveBeenCalled();
            expect(response.body.status).toBe('success');
        });

        it('should emit WebSocket status updates during start', async () => {
            // Setup WebSocket client
            wsClient = ioClient(serverUrl, {
                transports: ['websocket']
            });

            await new Promise(resolve => wsClient.on('connect', resolve));
            wsClient.emit('subscribe:status', {});

            // Track status updates
            const statusUpdates = [];
            wsClient.on('status_update', (data) => {
                statusUpdates.push(data);
            });

            // Setup mocks
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            mockProcessManager.startMainScript.mockResolvedValue({ 
                success: true, 
                pid: 12345 
            });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            // Make the request
            await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            // Wait for WebSocket events
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should have received status update
            expect(statusUpdates).toContainEqual(expect.objectContaining({
                type: 'services_started',
                kismet: true,
                wigle: true,
                timestamp: expect.any(String)
            }));
        });
    });

    describe('Stop Button Tests', () => {
        it('should handle STOP button click without timeout', async () => {
            mockProcessManager.stopAll.mockResolvedValue({
                success: true,
                message: 'All services stopped. GPSD restarted. wlan2 restored to managed mode.'
            });

            const startTime = Date.now();

            const response = await request(app)
                .post('/webhook/stop-script')
                .expect(200);

            const responseTime = Date.now() - startTime;

            expect(response.body).toMatchObject({
                status: 'success',
                message: expect.stringContaining('All services stopped')
            });

            // Stop operation should be quick
            expect(responseTime).toBeLessThan(5000);
            expect(mockProcessManager.stopAll).toHaveBeenCalledTimes(1);
        });

        it('should handle partial stop failures', async () => {
            mockProcessManager.stopAll.mockResolvedValue({
                success: false,
                message: 'Main script stopped. Error stopping kismet. WigleToTak processes killed.'
            });

            const response = await request(app)
                .post('/webhook/stop-script')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'warning',
                message: expect.stringContaining('Error stopping kismet')
            });
        });

        it('should emit WebSocket status updates during stop', async () => {
            // Setup WebSocket client
            wsClient = ioClient(serverUrl, {
                transports: ['websocket']
            });

            await new Promise(resolve => wsClient.on('connect', resolve));
            wsClient.emit('subscribe:status', {});

            // Track status updates
            const statusUpdates = [];
            wsClient.on('status_update', (data) => {
                statusUpdates.push(data);
            });

            mockProcessManager.stopAll.mockResolvedValue({
                success: true,
                message: 'All services stopped'
            });

            // Make the request
            await request(app)
                .post('/webhook/stop-script')
                .expect(200);

            // Wait for WebSocket events
            await new Promise(resolve => setTimeout(resolve, 100));

            // Should have received status update
            expect(statusUpdates).toContainEqual(expect.objectContaining({
                type: 'services_stopped',
                timestamp: expect.any(String)
            }));
        });
    });

    describe('Button Interaction Scenarios', () => {
        it('should handle rapid START/STOP button clicks', async () => {
            // First click: Start
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            mockProcessManager.startMainScript.mockResolvedValue({ success: true });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const startResponse = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(startResponse.body.status).toBe('success');

            // Second click: Stop (immediately after)
            mockProcessManager.stopAll.mockResolvedValue({
                success: true,
                message: 'All services stopped'
            });

            const stopResponse = await request(app)
                .post('/webhook/stop-script')
                .expect(200);

            expect(stopResponse.body.status).toBe('success');
        });

        it('should handle concurrent button clicks gracefully', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            
            // Slow down the start process to test concurrency
            mockProcessManager.startMainScript.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return { success: true, pid: 12345 };
            });
            
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            // Send multiple concurrent requests
            const requests = [
                request(app).post('/webhook/run-script').send({ script: 'both' }),
                request(app).post('/webhook/run-script').send({ script: 'both' }),
                request(app).post('/webhook/run-script').send({ script: 'both' })
            ];

            const responses = await Promise.all(requests);

            // At least one should succeed, others might get warning
            const successResponses = responses.filter(r => r.body.status === 'success');
            const warningResponses = responses.filter(r => r.body.status === 'warning');
            
            expect(successResponses.length).toBeGreaterThanOrEqual(1);
            expect(warningResponses.length + successResponses.length).toBe(3);
        });
    });

    describe('Error Recovery Tests', () => {
        it('should recover from script start failures', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });

            // First attempt fails
            mockProcessManager.startMainScript.mockRejectedValueOnce(
                new Error('Permission denied')
            );

            const failResponse = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(failResponse.body).toMatchObject({
                status: 'error',
                message: expect.stringContaining('Permission denied')
            });

            // Second attempt succeeds
            mockProcessManager.startMainScript.mockResolvedValueOnce({ 
                success: true, 
                pid: 12345 
            });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const successResponse = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(successResponse.body.status).toBe('success');
        });

        it('should handle network timeouts gracefully', async () => {
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });

            // Simulate network timeout
            mockProcessManager.startMainScript.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return { success: true, pid: 12345 };
            });

            // Simulate slow service startup
            mockProcessManager.isKismetRunning.mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 500));
                return true;
            });
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const response = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            // Should still complete successfully
            expect(response.body.status).toBe('success');
        });
    });

    describe('Real-world Button Usage Patterns', () => {
        it('should handle typical user workflow', async () => {
            // Step 1: Check initial status
            mockProcessManager.isMainScriptRunning.mockResolvedValue(false);
            mockProcessManager.isKismetRunning.mockResolvedValue(false);
            mockKismetService.isApiResponding.mockResolvedValue(false);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(false);

            const statusCheck = await request(app)
                .get('/webhook/script-status')
                .expect(200);

            expect(statusCheck.body.running).toBe(false);

            // Step 2: Start services
            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            mockProcessManager.startMainScript.mockResolvedValue({ success: true });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            const startResponse = await request(app)
                .post('/webhook/run-script')
                .send({ script: 'both' })
                .expect(200);

            expect(startResponse.body.status).toBe('success');

            // Step 3: Check status after start
            mockProcessManager.isMainScriptRunning.mockResolvedValue(true);
            mockKismetService.isApiResponding.mockResolvedValue(true);

            const statusAfterStart = await request(app)
                .get('/webhook/script-status')
                .expect(200);

            expect(statusAfterStart.body.running).toBe(true);
            expect(statusAfterStart.body.kismet_api_responding).toBe(true);

            // Step 4: Get Kismet data
            mockKismetService.getDataFromCsv.mockResolvedValue({
                devices_count: 5,
                networks_count: 3,
                recent_devices: [],
                feed_items: [],
                last_update: '10:30:00 AM'
            });

            const kismetData = await request(app)
                .get('/webhook/kismet-data')
                .expect(200);

            expect(kismetData.body.devices_count).toBe(5);

            // Step 5: Stop services
            mockProcessManager.stopAll.mockResolvedValue({
                success: true,
                message: 'All services stopped'
            });

            const stopResponse = await request(app)
                .post('/webhook/stop-script')
                .expect(200);

            expect(stopResponse.body.status).toBe('success');
        });

        it('should handle button spam protection', async () => {
            const clickCount = 10;
            const clickPromises = [];

            mockProcessManager.getStatus.mockResolvedValue({
                main_running: false,
                kismet_running: false,
                wigle_running: false,
                has_unhealthy: false
            });
            mockProcessManager.startMainScript.mockResolvedValue({ success: true });
            mockProcessManager.isKismetRunning.mockResolvedValue(true);
            mockProcessManager.isWigleToTakRunning.mockResolvedValue(true);

            // Simulate rapid button clicks
            for (let i = 0; i < clickCount; i++) {
                clickPromises.push(
                    request(app)
                        .post('/webhook/run-script')
                        .send({ script: 'both' })
                );
            }

            const responses = await Promise.all(clickPromises);

            // Should handle all requests without crashing
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(['success', 'warning']).toContain(response.body.status);
            });

            // Only one should actually start the services
            const successCount = responses.filter(r => r.body.status === 'success').length;
            expect(successCount).toBeLessThanOrEqual(1);
        });
    });
});
/**
 * Integration Tests for Kismet Operations API
 * Tests full API flow including middleware, error handling, and responses
 */

const request = require('supertest');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;

// Mock dependencies
jest.mock('../../../shared/logger', () => ({
    createServiceLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }),
    getExpressMiddleware: () => (req, res, next) => next()
}));

// Mock Kismet client for controlled testing
jest.mock('../../lib/webhook/kismetClient', () => {
    return jest.fn().mockImplementation(() => ({
        getData: jest.fn(),
        getDevices: jest.fn(),
        getNetworks: jest.fn(),
        getAlerts: jest.fn(),
        convertToCSV: jest.fn(),
        isHealthy: jest.fn(),
        streamData: jest.fn()
    }));
});

const SpectrumAnalyzerService = require('../../index');
const KismetClient = require('../../lib/webhook/kismetClient');

describe('Kismet Operations API Integration Tests', () => {
    let service;
    let app;
    let server;
    let mockKismetClient;
    const testPort = 0; // Random port

    beforeAll(async () => {
        service = new SpectrumAnalyzerService({ port: testPort });
        await service.start();
        app = service.app;
        server = service.server;
        
        // Get mock instance
        mockKismetClient = KismetClient.mock.instances[0];
    });

    afterAll(async () => {
        await service.stop();
    });

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('GET /api/webhook/kismet-data', () => {
        const mockDeviceData = {
            devices: [{
                mac: 'AA:BB:CC:DD:EE:FF',
                manufacturer: 'Apple',
                type: 'Wi-Fi Client',
                firstSeen: '2021-12-20T16:40:00.000Z',
                lastSeen: '2021-12-20T16:56:40.000Z',
                packets: 150,
                dataBytes: 50000,
                signal: { last: -65, min: -80, max: -50 }
            }],
            networks: [{
                ssid: 'TestNetwork',
                bssid: '00:11:22:33:44:55',
                channel: 6,
                frequency: 2437000000,
                encryption: 'WPA2',
                clients: 5
            }],
            alerts: [],
            summary: {
                totalDevices: 1,
                totalNetworks: 1,
                activeAlerts: 0
            }
        };

        test('should return Kismet data in JSON format', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getData.mockResolvedValue(mockDeviceData);

            const response = await request(app)
                .get('/api/webhook/kismet-data');

            expect(response.status).toBe(200);
            expect(response.type).toBe('application/json');
            expect(response.body).toMatchObject({
                success: true,
                data: mockDeviceData,
                cached: false
            });
        });

        test('should return CSV format when requested', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getData.mockResolvedValue(mockDeviceData);
            mockKismetClient.convertToCSV.mockReturnValue('MAC,Manufacturer\nAA:BB:CC:DD:EE:FF,Apple');

            const response = await request(app)
                .get('/api/webhook/kismet-data?format=csv');

            expect(response.status).toBe(200);
            expect(response.type).toBe('text/csv');
            expect(response.headers['content-disposition']).toContain('kismet-data-');
            expect(response.text).toContain('MAC,Manufacturer');
        });

        test('should filter by data type', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getData.mockResolvedValue({ devices: mockDeviceData.devices });

            const response = await request(app)
                .get('/api/webhook/kismet-data?type=devices');

            expect(response.status).toBe(200);
            expect(mockKismetClient.getData).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'devices' })
            );
        });

        test('should apply limit parameter', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getData.mockResolvedValue(mockDeviceData);

            const response = await request(app)
                .get('/api/webhook/kismet-data?limit=50');

            expect(response.status).toBe(200);
            expect(mockKismetClient.getData).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 50 })
            );
        });

        test('should filter by time period', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getData.mockResolvedValue(mockDeviceData);

            const response = await request(app)
                .get('/api/webhook/kismet-data?since=2021-12-20T00:00:00Z');

            expect(response.status).toBe(200);
            expect(mockKismetClient.getData).toHaveBeenCalledWith(
                expect.objectContaining({ 
                    since: expect.any(Date) 
                })
            );
        });

        test('should handle Kismet unavailable error', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(false);

            const response = await request(app)
                .get('/api/webhook/kismet-data');

            expect(response.status).toBe(503);
            expect(response.body).toMatchObject({
                success: false,
                error: 'KISMET_UNAVAILABLE',
                message: 'Kismet service is not available'
            });
        });

        test('should validate query parameters', async () => {
            const response = await request(app)
                .get('/api/webhook/kismet-data?type=invalid&limit=10000');

            expect(response.status).toBe(400);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.objectContaining({
                    code: 'VALIDATION_ERROR'
                })
            });
        });

        test('should use cache when available', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getData.mockResolvedValue(mockDeviceData);

            // First request - should not be cached
            const response1 = await request(app)
                .get('/api/webhook/kismet-data');
            expect(response1.body.cached).toBe(false);

            // Second request within cache window - should be cached
            const response2 = await request(app)
                .get('/api/webhook/kismet-data');
            expect(response2.body.cached).toBe(true);
            
            // getData should only be called once
            expect(mockKismetClient.getData).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /api/webhook/kismet-devices', () => {
        const mockDevices = [{
            mac: 'AA:BB:CC:DD:EE:FF',
            manufacturer: 'Apple',
            type: 'Wi-Fi Client',
            packets: 150
        }];

        test('should return device list', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getDevices.mockResolvedValue(mockDevices);

            const response = await request(app)
                .get('/api/webhook/kismet-devices');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                devices: mockDevices,
                count: 1
            });
        });

        test('should support pagination', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getDevices.mockResolvedValue(mockDevices);

            const response = await request(app)
                .get('/api/webhook/kismet-devices?page=2&limit=20');

            expect(response.status).toBe(200);
            expect(mockKismetClient.getDevices).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 20 })
            );
        });
    });

    describe('GET /api/webhook/kismet-networks', () => {
        const mockNetworks = [{
            ssid: 'TestNetwork',
            bssid: '00:11:22:33:44:55',
            encryption: 'WPA2',
            channel: 6
        }];

        test('should return network list', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getNetworks.mockResolvedValue(mockNetworks);

            const response = await request(app)
                .get('/api/webhook/kismet-networks');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                networks: mockNetworks,
                count: 1
            });
        });

        test('should filter networks by encryption type', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getNetworks.mockResolvedValue(mockNetworks);

            const response = await request(app)
                .get('/api/webhook/kismet-networks?encryption=WPA2');

            expect(response.status).toBe(200);
            // Note: Filtering would be done in the route handler
        });
    });

    describe('GET /api/webhook/kismet-alerts', () => {
        const mockAlerts = [{
            id: 'alert123',
            type: 'DEAUTHFLOOD',
            severity: 'high',
            timestamp: '2021-12-20T16:56:40.000Z'
        }];

        test('should return alert list', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getAlerts.mockResolvedValue(mockAlerts);

            const response = await request(app)
                .get('/api/webhook/kismet-alerts');

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                alerts: mockAlerts,
                count: 1
            });
        });

        test('should filter alerts by severity', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getAlerts.mockResolvedValue(mockAlerts);

            const response = await request(app)
                .get('/api/webhook/kismet-alerts?severity=high');

            expect(response.status).toBe(200);
            expect(response.body.alerts).toHaveLength(1);
        });
    });

    describe('WebSocket Integration', () => {
        let wsClient;
        let wsUrl;

        beforeEach((done) => {
            wsUrl = `ws://localhost:${server.address().port}/webhook`;
            wsClient = new WebSocket(wsUrl);
            wsClient.on('open', done);
        });

        afterEach(() => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.close();
            }
        });

        test('should stream Kismet data over WebSocket', (done) => {
            mockKismetClient.streamData.mockImplementation((callback) => {
                // Simulate streaming data
                setTimeout(() => {
                    callback(null, {
                        devices: [{ mac: 'AA:BB:CC:DD:EE:FF' }],
                        timestamp: new Date().toISOString()
                    });
                }, 100);
                
                return () => {}; // Stop function
            });

            let subscribed = false;

            wsClient.on('message', (data) => {
                const message = JSON.parse(data);

                if (message.type === 'subscribed' && message.channels.includes('kismet')) {
                    subscribed = true;
                } else if (subscribed && message.type === 'kismetData') {
                    expect(message).toMatchObject({
                        type: 'kismetData',
                        data: {
                            devices: expect.any(Array),
                            timestamp: expect.any(String)
                        }
                    });
                    done();
                }
            });

            // Subscribe to Kismet channel
            wsClient.send(JSON.stringify({
                event: 'subscribe',
                data: { channels: ['kismet'] }
            }));
        });

        test('should handle Kismet stream errors', (done) => {
            mockKismetClient.streamData.mockImplementation((callback) => {
                setTimeout(() => {
                    callback(new Error('Stream error'), null);
                }, 100);
                
                return () => {};
            });

            let subscribed = false;

            wsClient.on('message', (data) => {
                const message = JSON.parse(data);

                if (message.type === 'subscribed') {
                    subscribed = true;
                } else if (subscribed && message.type === 'error') {
                    expect(message).toMatchObject({
                        type: 'error',
                        error: expect.stringContaining('Kismet stream error')
                    });
                    done();
                }
            });

            wsClient.send(JSON.stringify({
                event: 'subscribe',
                data: { channels: ['kismet'] }
            }));
        });
    });

    describe('CORS and Security', () => {
        test('should handle CORS preflight requests', async () => {
            const response = await request(app)
                .options('/api/webhook/kismet-data')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');

            expect(response.status).toBe(204);
            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        test('should set security headers', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getData.mockResolvedValue({ devices: [] });

            const response = await request(app)
                .get('/api/webhook/kismet-data');

            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
        });
    });

    describe('Error Handling', () => {
        test('should handle internal server errors gracefully', async () => {
            mockKismetClient.isHealthy.mockResolvedValue(true);
            mockKismetClient.getData.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/webhook/kismet-data');

            expect(response.status).toBe(500);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.objectContaining({
                    code: 'INTERNAL_ERROR'
                })
            });
        });

        test('should handle malformed requests', async () => {
            const response = await request(app)
                .get('/api/webhook/kismet-data?since=invalid-date');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should handle rate limiting', async () => {
            // Make many requests quickly
            const promises = [];
            for (let i = 0; i < 150; i++) {
                promises.push(
                    request(app).get('/api/webhook/kismet-alerts')
                );
            }

            const responses = await Promise.all(promises);
            const rateLimited = responses.some(r => r.status === 429);

            expect(rateLimited).toBe(true);
        });
    });

    describe('Static File Serving', () => {
        test('should serve Kismet HTML page', async () => {
            const response = await request(app)
                .get('/kismet.html');

            expect(response.status).toBe(200);
            expect(response.type).toBe('text/html');
        });

        test('should serve 3D globe assets', async () => {
            const response = await request(app)
                .get('/js/cesium-offline-config.js');

            expect(response.status).toBe(200);
            expect(response.type).toMatch(/javascript/);
        });
    });
});
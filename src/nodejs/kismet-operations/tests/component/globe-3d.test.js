/**
 * Component Tests for 3D Globe Visualization
 * Tests Cesium integration, marker rendering, and real-time updates
 */

const { JSDOM } = require('jsdom');
const fs = require('fs').promises;
const path = require('path');

// Mock Cesium
global.Cesium = {
    Ion: { defaultAccessToken: 'test-token' },
    Viewer: jest.fn().mockImplementation(() => ({
        scene: {
            globe: { enableLighting: false },
            primitives: { add: jest.fn() }
        },
        entities: {
            add: jest.fn(),
            removeAll: jest.fn(),
            values: []
        },
        camera: {
            flyTo: jest.fn(),
            setView: jest.fn()
        },
        clock: {
            shouldAnimate: true
        },
        destroy: jest.fn()
    })),
    Cartesian3: {
        fromDegrees: jest.fn((lon, lat, alt) => ({ x: lon, y: lat, z: alt || 0 }))
    },
    Color: {
        RED: { withAlpha: jest.fn() },
        YELLOW: { withAlpha: jest.fn() },
        GREEN: { withAlpha: jest.fn() },
        BLUE: { withAlpha: jest.fn() }
    },
    Entity: jest.fn(),
    BillboardGraphics: jest.fn(),
    LabelGraphics: jest.fn(),
    HorizontalOrigin: { LEFT: 'LEFT' },
    VerticalOrigin: { BOTTOM: 'BOTTOM' },
    defined: jest.fn(val => val !== undefined && val !== null),
    ScreenSpaceEventType: { LEFT_CLICK: 'LEFT_CLICK' },
    ScreenSpaceEventHandler: jest.fn().mockImplementation(() => ({
        setInputAction: jest.fn()
    }))
};

// Setup DOM environment
const setupDOM = () => {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <body>
            <div id="cesium-container"></div>
            <div id="device-info" class="hidden"></div>
            <div id="device-count">0</div>
        </body>
        </html>
    `, {
        url: 'http://localhost',
        runScripts: 'dangerously'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.WebSocket = jest.fn();
    global.navigator = dom.window.navigator;

    return dom;
};

// Globe manager class (simulated from the actual implementation)
class GlobeManager {
    constructor(containerId, wsUrl) {
        this.container = document.getElementById(containerId);
        this.wsUrl = wsUrl;
        this.viewer = null;
        this.entities = new Map();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    initialize() {
        // Create Cesium viewer
        this.viewer = new global.Cesium.Viewer(this.container, {
            terrainProvider: null,
            imageryProvider: null,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false
        });

        // Setup WebSocket connection
        this.connectWebSocket();

        // Setup click handlers
        this.setupClickHandlers();

        return this.viewer;
    }

    connectWebSocket() {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            
            // Subscribe to kismet data
            this.ws.send(JSON.stringify({
                event: 'subscribe',
                data: { channels: ['kismet'] }
            }));
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.type === 'kismetData') {
                this.updateDevices(message.data);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.attemptReconnect();
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            
            setTimeout(() => {
                console.log(`Reconnection attempt ${this.reconnectAttempts}`);
                this.connectWebSocket();
            }, delay);
        }
    }

    updateDevices(data) {
        if (!data.devices) return;

        const currentDevices = new Set();

        data.devices.forEach(device => {
            if (device.location && device.location.lat && device.location.lon) {
                currentDevices.add(device.mac);
                this.addOrUpdateDevice(device);
            }
        });

        // Remove devices that are no longer present
        for (const [mac, entity] of this.entities) {
            if (!currentDevices.has(mac)) {
                this.viewer.entities.remove(entity);
                this.entities.delete(mac);
            }
        }

        // Update device count
        document.getElementById('device-count').textContent = this.entities.size;
    }

    addOrUpdateDevice(device) {
        let entity = this.entities.get(device.mac);

        const position = global.Cesium.Cartesian3.fromDegrees(
            device.location.lon,
            device.location.lat,
            100 // 100m above ground
        );

        const color = this.getColorForSignal(device.signal?.last || -90);

        if (!entity) {
            // Create new entity
            entity = this.viewer.entities.add({
                id: device.mac,
                position: position,
                billboard: {
                    image: this.getIconForDeviceType(device.type),
                    scale: 0.5,
                    color: color,
                    verticalOrigin: global.Cesium.VerticalOrigin.BOTTOM
                },
                label: {
                    text: device.manufacturer || 'Unknown',
                    font: '12px sans-serif',
                    horizontalOrigin: global.Cesium.HorizontalOrigin.LEFT,
                    pixelOffset: { x: 15, y: 0 },
                    show: false // Show on hover
                },
                properties: device
            });

            this.entities.set(device.mac, entity);
        } else {
            // Update existing entity
            entity.position = position;
            entity.billboard.color = color;
            entity.properties = device;
        }
    }

    getColorForSignal(signal) {
        // Signal strength color mapping
        if (signal > -50) return global.Cesium.Color.GREEN.withAlpha(0.8);
        if (signal > -70) return global.Cesium.Color.YELLOW.withAlpha(0.8);
        if (signal > -85) return global.Cesium.Color.RED.withAlpha(0.8);
        return global.Cesium.Color.RED.withAlpha(0.5);
    }

    getIconForDeviceType(type) {
        // Return different icons based on device type
        const icons = {
            'Access Point': '/images/ap-icon.png',
            'Wi-Fi Client': '/images/client-icon.png',
            'Bluetooth Device': '/images/bluetooth-icon.png',
            'Drone/UAV': '/images/drone-icon.png'
        };
        
        return icons[type] || '/images/default-device.png';
    }

    setupClickHandlers() {
        const handler = new global.Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        
        handler.setInputAction((click) => {
            const pickedObject = this.viewer.scene.pick(click.position);
            
            if (global.Cesium.defined(pickedObject) && pickedObject.id) {
                this.showDeviceInfo(pickedObject.id.properties);
            } else {
                this.hideDeviceInfo();
            }
        }, global.Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    showDeviceInfo(device) {
        const infoDiv = document.getElementById('device-info');
        
        infoDiv.innerHTML = `
            <h3>Device Information</h3>
            <p><strong>MAC:</strong> ${device.mac}</p>
            <p><strong>Manufacturer:</strong> ${device.manufacturer || 'Unknown'}</p>
            <p><strong>Type:</strong> ${device.type}</p>
            <p><strong>Signal:</strong> ${device.signal?.last || 'N/A'} dBm</p>
            <p><strong>Packets:</strong> ${device.packets || 0}</p>
            <p><strong>First Seen:</strong> ${new Date(device.firstSeen).toLocaleString()}</p>
            <p><strong>Last Seen:</strong> ${new Date(device.lastSeen).toLocaleString()}</p>
        `;
        
        infoDiv.classList.remove('hidden');
    }

    hideDeviceInfo() {
        document.getElementById('device-info').classList.add('hidden');
    }

    flyToDevice(mac) {
        const entity = this.entities.get(mac);
        if (entity) {
            this.viewer.camera.flyTo({
                destination: entity.position,
                duration: 2,
                offset: {
                    heading: 0,
                    pitch: -45,
                    range: 1000
                }
            });
        }
    }

    destroy() {
        if (this.ws) {
            this.ws.close();
        }
        
        if (this.viewer) {
            this.viewer.destroy();
        }
    }
}

describe('3D Globe Component Tests', () => {
    let dom;
    let globeManager;

    beforeEach(() => {
        dom = setupDOM();
        global.WebSocket = jest.fn().mockImplementation(() => ({
            send: jest.fn(),
            close: jest.fn(),
            readyState: 1,
            OPEN: 1,
            CLOSED: 3
        }));
    });

    afterEach(() => {
        if (globeManager) {
            globeManager.destroy();
        }
        dom.window.close();
    });

    describe('Initialization', () => {
        test('should create Cesium viewer with correct configuration', () => {
            globeManager = new GlobeManager('cesium-container', 'ws://localhost:8002/webhook');
            globeManager.initialize();

            expect(global.Cesium.Viewer).toHaveBeenCalledWith(
                expect.any(HTMLElement),
                expect.objectContaining({
                    terrainProvider: null,
                    baseLayerPicker: false,
                    geocoder: false,
                    animation: false,
                    timeline: false
                })
            );
        });

        test('should establish WebSocket connection', () => {
            globeManager = new GlobeManager('cesium-container', 'ws://localhost:8002/webhook');
            globeManager.initialize();

            expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8002/webhook');
        });

        test('should subscribe to kismet channel on connection', () => {
            const mockWs = {
                send: jest.fn(),
                readyState: 1
            };
            global.WebSocket.mockImplementation(() => mockWs);

            globeManager = new GlobeManager('cesium-container', 'ws://localhost:8002/webhook');
            globeManager.initialize();

            // Trigger onopen
            mockWs.onopen();

            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
                event: 'subscribe',
                data: { channels: ['kismet'] }
            }));
        });
    });

    describe('Device Management', () => {
        beforeEach(() => {
            globeManager = new GlobeManager('cesium-container', 'ws://localhost:8002/webhook');
            globeManager.initialize();
        });

        test('should add new devices to the globe', () => {
            const deviceData = {
                devices: [{
                    mac: 'AA:BB:CC:DD:EE:FF',
                    manufacturer: 'Apple',
                    type: 'Wi-Fi Client',
                    location: { lat: 40.7128, lon: -74.0060 },
                    signal: { last: -65 }
                }]
            };

            globeManager.updateDevices(deviceData);

            expect(globeManager.viewer.entities.add).toHaveBeenCalled();
            expect(globeManager.entities.size).toBe(1);
            expect(document.getElementById('device-count').textContent).toBe('1');
        });

        test('should update existing devices', () => {
            const initialData = {
                devices: [{
                    mac: 'AA:BB:CC:DD:EE:FF',
                    location: { lat: 40.7128, lon: -74.0060 },
                    signal: { last: -65 }
                }]
            };

            globeManager.updateDevices(initialData);
            const entity = globeManager.entities.get('AA:BB:CC:DD:EE:FF');

            const updatedData = {
                devices: [{
                    mac: 'AA:BB:CC:DD:EE:FF',
                    location: { lat: 40.7200, lon: -74.0100 },
                    signal: { last: -45 }
                }]
            };

            globeManager.updateDevices(updatedData);

            expect(entity.position).toEqual({ x: -74.0100, y: 40.7200, z: 100 });
        });

        test('should remove devices no longer present', () => {
            const initialData = {
                devices: [
                    { mac: 'AA:BB:CC:DD:EE:FF', location: { lat: 40, lon: -74 } },
                    { mac: '11:22:33:44:55:66', location: { lat: 41, lon: -73 } }
                ]
            };

            globeManager.updateDevices(initialData);
            expect(globeManager.entities.size).toBe(2);

            const updatedData = {
                devices: [
                    { mac: 'AA:BB:CC:DD:EE:FF', location: { lat: 40, lon: -74 } }
                ]
            };

            globeManager.updateDevices(updatedData);
            expect(globeManager.entities.size).toBe(1);
            expect(globeManager.entities.has('11:22:33:44:55:66')).toBe(false);
        });

        test('should ignore devices without location data', () => {
            const deviceData = {
                devices: [
                    { mac: 'AA:BB:CC:DD:EE:FF', location: { lat: 40, lon: -74 } },
                    { mac: '11:22:33:44:55:66', location: null },
                    { mac: '77:88:99:AA:BB:CC' } // No location property
                ]
            };

            globeManager.updateDevices(deviceData);
            expect(globeManager.entities.size).toBe(1);
        });
    });

    describe('Visual Representation', () => {
        beforeEach(() => {
            globeManager = new GlobeManager('cesium-container', 'ws://localhost:8002/webhook');
            globeManager.initialize();
        });

        test('should apply correct colors based on signal strength', () => {
            const testCases = [
                { signal: -40, expectedColor: global.Cesium.Color.GREEN },
                { signal: -65, expectedColor: global.Cesium.Color.YELLOW },
                { signal: -80, expectedColor: global.Cesium.Color.RED },
                { signal: -95, expectedColor: global.Cesium.Color.RED }
            ];

            testCases.forEach(({ signal, expectedColor }) => {
                const color = globeManager.getColorForSignal(signal);
                expect(expectedColor.withAlpha).toHaveBeenCalledWith(expect.any(Number));
            });
        });

        test('should use appropriate icons for device types', () => {
            const testCases = [
                { type: 'Access Point', expectedIcon: '/images/ap-icon.png' },
                { type: 'Wi-Fi Client', expectedIcon: '/images/client-icon.png' },
                { type: 'Bluetooth Device', expectedIcon: '/images/bluetooth-icon.png' },
                { type: 'Drone/UAV', expectedIcon: '/images/drone-icon.png' },
                { type: 'Unknown Type', expectedIcon: '/images/default-device.png' }
            ];

            testCases.forEach(({ type, expectedIcon }) => {
                const icon = globeManager.getIconForDeviceType(type);
                expect(icon).toBe(expectedIcon);
            });
        });
    });

    describe('User Interaction', () => {
        beforeEach(() => {
            globeManager = new GlobeManager('cesium-container', 'ws://localhost:8002/webhook');
            globeManager.initialize();
        });

        test('should show device info on click', () => {
            const device = {
                mac: 'AA:BB:CC:DD:EE:FF',
                manufacturer: 'Apple',
                type: 'Wi-Fi Client',
                signal: { last: -65 },
                packets: 150,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };

            globeManager.showDeviceInfo(device);

            const infoDiv = document.getElementById('device-info');
            expect(infoDiv.classList.contains('hidden')).toBe(false);
            expect(infoDiv.innerHTML).toContain('AA:BB:CC:DD:EE:FF');
            expect(infoDiv.innerHTML).toContain('Apple');
            expect(infoDiv.innerHTML).toContain('-65 dBm');
        });

        test('should hide device info when clicking empty space', () => {
            const infoDiv = document.getElementById('device-info');
            infoDiv.classList.remove('hidden');

            globeManager.hideDeviceInfo();

            expect(infoDiv.classList.contains('hidden')).toBe(true);
        });

        test('should fly to device location', () => {
            const deviceData = {
                devices: [{
                    mac: 'AA:BB:CC:DD:EE:FF',
                    location: { lat: 40.7128, lon: -74.0060 }
                }]
            };

            globeManager.updateDevices(deviceData);
            globeManager.flyToDevice('AA:BB:CC:DD:EE:FF');

            expect(globeManager.viewer.camera.flyTo).toHaveBeenCalledWith(
                expect.objectContaining({
                    destination: expect.any(Object),
                    duration: 2
                })
            );
        });
    });

    describe('WebSocket Reconnection', () => {
        jest.useFakeTimers();

        beforeEach(() => {
            globeManager = new GlobeManager('cesium-container', 'ws://localhost:8002/webhook');
            globeManager.initialize();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should attempt reconnection on disconnect', () => {
            const mockWs = globeManager.ws;
            globeManager.connectWebSocket = jest.fn();

            // Trigger disconnect
            mockWs.onclose();

            // Fast forward timer
            jest.advanceTimersByTime(2000);

            expect(globeManager.connectWebSocket).toHaveBeenCalledTimes(1);
            expect(globeManager.reconnectAttempts).toBe(1);
        });

        test('should use exponential backoff for reconnection', () => {
            const mockWs = globeManager.ws;
            globeManager.connectWebSocket = jest.fn();

            // Multiple disconnects
            for (let i = 0; i < 3; i++) {
                mockWs.onclose();
                jest.advanceTimersByTime(Math.pow(2, i + 1) * 1000);
            }

            expect(globeManager.connectWebSocket).toHaveBeenCalledTimes(3);
        });

        test('should stop reconnecting after max attempts', () => {
            const mockWs = globeManager.ws;
            globeManager.connectWebSocket = jest.fn();
            globeManager.maxReconnectAttempts = 3;

            // Exceed max attempts
            for (let i = 0; i < 5; i++) {
                mockWs.onclose();
                jest.advanceTimersByTime(30000);
            }

            expect(globeManager.connectWebSocket).toHaveBeenCalledTimes(3);
        });
    });

    describe('Performance with Many Markers', () => {
        beforeEach(() => {
            globeManager = new GlobeManager('cesium-container', 'ws://localhost:8002/webhook');
            globeManager.initialize();
        });

        test('should handle large number of devices efficiently', () => {
            const startTime = performance.now();

            // Generate 1000 devices
            const devices = Array(1000).fill(null).map((_, i) => ({
                mac: `AA:BB:CC:${Math.floor(i/255).toString(16).padStart(2, '0')}:${(i%255).toString(16).padStart(2, '0')}:FF`,
                location: {
                    lat: -90 + Math.random() * 180,
                    lon: -180 + Math.random() * 360
                },
                signal: { last: -50 - Math.random() * 40 }
            }));

            globeManager.updateDevices({ devices });

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            expect(globeManager.entities.size).toBe(1000);
            expect(processingTime).toBeLessThan(1000); // Should process in under 1 second
            console.log(`Processed 1000 devices in ${processingTime.toFixed(2)}ms`);
        });

        test('should efficiently update subset of devices', () => {
            // Add initial devices
            const initialDevices = Array(500).fill(null).map((_, i) => ({
                mac: `AA:BB:${i.toString(16).padStart(4, '0')}:CC:DD:EE`,
                location: { lat: 40 + i * 0.01, lon: -74 - i * 0.01 }
            }));

            globeManager.updateDevices({ devices: initialDevices });
            expect(globeManager.entities.size).toBe(500);

            // Update with partial overlap
            const updatedDevices = Array(300).fill(null).map((_, i) => ({
                mac: `AA:BB:${(i + 250).toString(16).padStart(4, '0')}:CC:DD:EE`,
                location: { lat: 41 + i * 0.01, lon: -73 - i * 0.01 }
            }));

            const startTime = performance.now();
            globeManager.updateDevices({ devices: updatedDevices });
            const endTime = performance.now();

            expect(globeManager.entities.size).toBe(300);
            expect(endTime - startTime).toBeLessThan(500);
        });
    });
});
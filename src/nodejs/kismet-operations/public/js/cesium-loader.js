/**
 * Cesium Lazy Loader
 * Loads Cesium on demand to improve initial page load performance
 */

class CesiumLoader {
    constructor() {
        this.cesiumLoaded = false;
        this.loadingPromise = null;
        this.viewer = null;
        this.deviceEntities = new Map();
    }

    /**
     * Load Cesium library dynamically
     * @returns {Promise<void>}
     */
    async loadCesium() {
        if (this.cesiumLoaded) {
            return Promise.resolve();
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = new Promise((resolve, reject) => {
            // Load Cesium CSS
            const cesiumCSS = document.createElement('link');
            cesiumCSS.rel = 'stylesheet';
            cesiumCSS.href = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Widgets/widgets.css';
            document.head.appendChild(cesiumCSS);

            // Load Cesium JS
            const cesiumScript = document.createElement('script');
            cesiumScript.src = 'https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Cesium.js';
            cesiumScript.async = true;
            
            cesiumScript.onload = () => {
                this.cesiumLoaded = true;
                console.log('Cesium loaded successfully');
                resolve();
            };
            
            cesiumScript.onerror = (error) => {
                console.error('Failed to load Cesium:', error);
                reject(error);
            };
            
            document.head.appendChild(cesiumScript);
        });

        return this.loadingPromise;
    }

    /**
     * Initialize Cesium viewer with optimized settings
     * @param {string} containerId - ID of the container element
     * @returns {Promise<Object>} Cesium viewer instance
     */
    async initializeViewer(containerId) {
        // Ensure Cesium is loaded
        await this.loadCesium();

        // Check for existing viewer
        if (this.viewer) {
            return this.viewer;
        }

        // Set default access token
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzAiLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk';

        // Check for offline tiles
        const useOffline = window.CesiumOfflineConfig && 
                          await window.CesiumOfflineConfig.checkOfflineTiles();

        // Create viewer with performance-optimized settings
        this.viewer = new Cesium.Viewer(containerId, {
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            vrButton: false,
            selectionIndicator: false,
            infoBox: false,
            scene3DOnly: true,
            imageryProvider: false, // We'll add it manually
            sceneMode: Cesium.SceneMode.SCENE3D,
            // Performance optimizations
            requestRenderMode: true, // Only render when needed
            maximumRenderTimeChange: Infinity,
            targetFrameRate: 30,
            showRenderLoopErrors: false,
            useBrowserRecommendedResolution: true
        });

        // Configure scene for performance
        const scene = this.viewer.scene;
        scene.globe.enableLighting = false;
        scene.fog.enabled = false;
        scene.globe.showGroundAtmosphere = false;
        scene.skyBox.show = false;
        scene.sun.show = false;
        scene.moon.show = false;
        scene.skyAtmosphere.show = false;

        // Add imagery provider
        let imageryProvider;
        if (useOffline && window.CesiumOfflineConfig) {
            imageryProvider = window.CesiumOfflineConfig.createOfflineImageryProvider();
        } else {
            // Use simple, fast online provider
            imageryProvider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                minimumLevel: 0,
                maximumLevel: 5 // Limit detail for performance
            });
        }
        
        this.viewer.imageryLayers.addImageryProvider(imageryProvider);

        // Set initial view
        this.viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(0, 0, 15000000),
            orientation: {
                heading: 0,
                pitch: -Cesium.Math.PI_OVER_TWO,
                roll: 0
            }
        });

        return this.viewer;
    }

    /**
     * Add or update a device entity on the globe
     * @param {Object} device - Device data
     */
    addOrUpdateDevice(device) {
        if (!this.viewer || !device.lat || !device.lon) {
            return;
        }

        const entityId = device.mac || device.id;
        let entity = this.deviceEntities.get(entityId);

        const position = Cesium.Cartesian3.fromDegrees(
            parseFloat(device.lon),
            parseFloat(device.lat),
            100
        );

        if (entity) {
            // Update existing entity
            entity.position = position;
            entity.label.text = device.ssid || device.name || 'Unknown';
        } else {
            // Create new entity
            entity = this.viewer.entities.add({
                id: entityId,
                position: position,
                point: {
                    pixelSize: 8,
                    color: this.getDeviceColor(device),
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                label: {
                    text: device.ssid || device.name || 'Unknown',
                    font: '14px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    pixelOffset: new Cesium.Cartesian2(0, -20),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    show: false // Show on hover only
                }
            });

            this.deviceEntities.set(entityId, entity);
        }

        // Request render update
        this.viewer.scene.requestRender();
    }

    /**
     * Get device color based on signal strength or type
     * @param {Object} device - Device data
     * @returns {Cesium.Color} Color for the device
     */
    getDeviceColor(device) {
        const rssi = device.rssi || device.signal || -100;
        
        if (rssi > -50) {
            return Cesium.Color.GREEN;
        } else if (rssi > -70) {
            return Cesium.Color.YELLOW;
        } else if (rssi > -85) {
            return Cesium.Color.ORANGE;
        } else {
            return Cesium.Color.RED;
        }
    }

    /**
     * Batch update multiple devices
     * @param {Array} devices - Array of device data
     */
    batchUpdateDevices(devices) {
        if (!this.viewer || !Array.isArray(devices)) {
            return;
        }

        // Suspend rendering during batch update
        this.viewer.entities.suspendEvents();

        devices.forEach(device => {
            this.addOrUpdateDevice(device);
        });

        // Resume rendering
        this.viewer.entities.resumeEvents();
        this.viewer.scene.requestRender();
    }

    /**
     * Clear all device entities
     */
    clearDevices() {
        if (!this.viewer) {
            return;
        }

        this.viewer.entities.removeAll();
        this.deviceEntities.clear();
        this.viewer.scene.requestRender();
    }

    /**
     * Destroy the viewer and clean up resources
     */
    destroy() {
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }
        this.deviceEntities.clear();
        this.cesiumLoaded = false;
        this.loadingPromise = null;
    }
}

// Export as global for use in other scripts
window.CesiumLoader = CesiumLoader;
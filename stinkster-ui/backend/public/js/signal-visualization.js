/**
 * Signal Visualization Module for Cesium
 * Optimized for rendering multiple signal entities with performance monitoring
 */

(function() {
    'use strict';

    // Configuration constants
    const CONFIG = {
        MAX_VISIBLE_ENTITIES: 500,
        CLUSTER_PIXEL_RANGE: 50,
        CLUSTER_MINIMUM_SIZE: 2,
        LOD_DISTANCE_THRESHOLD: 10000, // meters
        WEAK_SIGNAL_THRESHOLD: -80, // dBm
        UPDATE_BATCH_SIZE: 50,
        FPS_UPDATE_INTERVAL: 1000, // ms
        ENTITY_FADE_DURATION: 2000, // ms
        BILLBOARD_SCALE_BY_DISTANCE: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5)
    };

    // Signal visualization state
    let viewer = null;
    let signalEntities = new Map();
    let pointPrimitiveCollection = null;
    let billboardCollection = null;
    let labelCollection = null;
    let dataSource = null;
    let updateQueue = [];
    let isProcessingQueue = false;
    let lastCameraPosition = null;
    let fpsMonitor = null;
    let performanceStats = {
        frameCount: 0,
        lastTime: Date.now(),
        fps: 0,
        visibleEntities: 0,
        totalEntities: 0
    };

    // Signal strength to color mapping
    function getSignalColor(signalStrength) {
        if (signalStrength <= -90) return Cesium.Color.DARKBLUE;
        if (signalStrength <= -70) return Cesium.Color.BLUE;
        if (signalStrength <= -50) return Cesium.Color.YELLOW;
        if (signalStrength <= -30) return Cesium.Color.ORANGE;
        return Cesium.Color.RED;
    }

    /**
     * Initialize signal visualization
     * @param {Cesium.Viewer} cesiumViewer - The Cesium viewer instance
     */
    function initialize(cesiumViewer) {
        try {
            viewer = cesiumViewer;
            
            // Create custom data source for signals
            dataSource = new Cesium.CustomDataSource('signals');
            viewer.dataSources.add(dataSource);
            
            // Initialize primitive collections for efficient rendering
            pointPrimitiveCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
            billboardCollection = viewer.scene.primitives.add(new Cesium.BillboardCollection());
            labelCollection = viewer.scene.primitives.add(new Cesium.LabelCollection());
            
            // Enable entity clustering
            dataSource.clustering.enabled = true;
            dataSource.clustering.pixelRange = CONFIG.CLUSTER_PIXEL_RANGE;
            dataSource.clustering.minimumClusterSize = CONFIG.CLUSTER_MINIMUM_SIZE;
            
            // Custom cluster styling
            dataSource.clustering.clusterEvent.addEventListener(function(clusteredEntities, cluster) {
                cluster.label.show = true;
                cluster.billboard.show = true;
                cluster.billboard.image = createClusterImage(clusteredEntities.length);
                cluster.billboard.scale = 1.0;
                cluster.label.text = clusteredEntities.length.toString();
                cluster.label.font = '14px sans-serif';
                cluster.label.fillColor = Cesium.Color.WHITE;
                cluster.label.outlineColor = Cesium.Color.BLACK;
                cluster.label.outlineWidth = 2;
                cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
                cluster.label.pixelOffset = new Cesium.Cartesian2(0, -20);
            });
            
            // Setup camera change detection for LOD
            viewer.camera.changed.addEventListener(onCameraChanged);
            
            // Initialize FPS monitoring - disabled by default
            // initializeFPSMonitor();
            
            // Start update loop
            startUpdateLoop();
        } catch (error) {
            console.error('Failed to initialize signal visualization:', error);
            throw error;
        }
    }

    /**
     * Create cluster image dynamically
     */
    function createClusterImage(count) {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        
        // Draw circle
        ctx.fillStyle = 'rgba(0, 210, 255, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(24, 24, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        return canvas;
    }

    /**
     * Add or update a signal entity
     * @param {Object} signalData - Signal data object
     */
    function addSignal(signalData) {
        // Queue update for batch processing
        updateQueue.push({
            type: 'add',
            data: signalData
        });
    }

    /**
     * Remove a signal entity
     * @param {string} signalId - Signal identifier
     */
    function removeSignal(signalId) {
        updateQueue.push({
            type: 'remove',
            id: signalId
        });
    }

    /**
     * Process queued updates in batches
     */
    function processUpdateQueue() {
        if (isProcessingQueue || updateQueue.length === 0) return;
        
        isProcessingQueue = true;
        const batch = updateQueue.splice(0, CONFIG.UPDATE_BATCH_SIZE);
        
        requestAnimationFrame(() => {
            batch.forEach(update => {
                if (update.type === 'add') {
                    processAddSignal(update.data);
                } else if (update.type === 'remove') {
                    processRemoveSignal(update.id);
                }
            });
            
            isProcessingQueue = false;
            
            // Continue processing if more updates
            if (updateQueue.length > 0) {
                setTimeout(processUpdateQueue, 16); // ~60fps
            }
        });
    }

    /**
     * Process adding a signal
     */
    function processAddSignal(signalData) {
        const { id, latitude, longitude, altitude, strength, type, name } = signalData;
        
        // Skip weak signals if too many entities
        if (performanceStats.totalEntities > CONFIG.MAX_VISIBLE_ENTITIES && 
            strength < CONFIG.WEAK_SIGNAL_THRESHOLD) {
            return;
        }
        
        let entity = signalEntities.get(id);
        
        if (!entity) {
            // Create new entity with optimized billboard
            entity = dataSource.entities.add({
                id: id,
                position: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude || 0),
                billboard: {
                    image: createSignalSprite(type, strength),
                    scaleByDistance: CONFIG.BILLBOARD_SCALE_BY_DISTANCE,
                    translucencyByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.1),
                    pixelOffset: new Cesium.Cartesian2(0, -10),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                label: {
                    text: name || `Signal ${id}`,
                    font: '12px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -30),
                    scaleByDistance: CONFIG.BILLBOARD_SCALE_BY_DISTANCE,
                    translucencyByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.0),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                properties: {
                    strength: strength,
                    type: type,
                    lastUpdate: Date.now()
                }
            });
            
            signalEntities.set(id, entity);
            performanceStats.totalEntities++;
        } else {
            // Update existing entity
            entity.position = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude || 0);
            entity.properties.strength = strength;
            entity.properties.lastUpdate = Date.now();
            
            // Update billboard if signal strength changed significantly
            if (Math.abs(entity.properties.strength - strength) > 10) {
                entity.billboard.image = createSignalSprite(type, strength);
            }
        }
    }

    /**
     * Process removing a signal
     */
    function processRemoveSignal(signalId) {
        const entity = signalEntities.get(signalId);
        if (entity) {
            dataSource.entities.remove(entity);
            signalEntities.delete(signalId);
            performanceStats.totalEntities--;
        }
    }

    /**
     * Create signal sprite based on type and strength
     */
    function createSignalSprite(type, strength) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Get color based on signal strength
        const color = getSignalColor(strength);
        
        // Draw signal icon based on type
        ctx.save();
        ctx.translate(16, 16);
        
        switch(type) {
            case 'wifi':
                drawWifiIcon(ctx, color);
                break;
            case 'cellular':
                drawCellularIcon(ctx, color);
                break;
            case 'bluetooth':
                drawBluetoothIcon(ctx, color);
                break;
            default:
                drawGenericSignalIcon(ctx, color);
        }
        
        ctx.restore();
        return canvas;
    }

    /**
     * Draw WiFi icon
     */
    function drawWifiIcon(ctx, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        // Draw WiFi waves
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 5, (i + 1) * 4, -Math.PI * 0.75, -Math.PI * 0.25);
            ctx.stroke();
        }
        
        // Draw center dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 5, 2, 0, 2 * Math.PI);
        ctx.fill();
    }

    /**
     * Draw cellular icon
     */
    function drawCellularIcon(ctx, color) {
        ctx.fillStyle = color;
        
        // Draw signal bars
        const barWidth = 4;
        const barSpacing = 2;
        const heights = [4, 8, 12, 16];
        
        heights.forEach((height, i) => {
            const x = -8 + i * (barWidth + barSpacing);
            ctx.fillRect(x, -height/2, barWidth, height);
        });
    }

    /**
     * Draw Bluetooth icon
     */
    function drawBluetoothIcon(ctx, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        // Simplified Bluetooth symbol
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, -2);
        ctx.lineTo(0, 4);
        ctx.lineTo(0, -8);
        ctx.lineTo(-6, -2);
        ctx.moveTo(0, 4);
        ctx.lineTo(-6, 10);
        ctx.moveTo(6, -2);
        ctx.lineTo(-6, 10);
        ctx.stroke();
    }

    /**
     * Draw generic signal icon
     */
    function drawGenericSignalIcon(ctx, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add pulse effect
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, 2 * Math.PI);
        ctx.stroke();
    }

    /**
     * Get color based on signal strength
     */
    function getSignalColor(strength) {
        if (strength >= -40) return '#00ff88';
        if (strength >= -60) return '#ffff00';
        if (strength >= -80) return '#ff8800';
        return '#ff4444';
    }

    /**
     * Handle camera changes for LOD
     */
    function onCameraChanged() {
        const camera = viewer.camera;
        const cameraHeight = camera.positionCartographic.height;
        
        // Update entity visibility based on camera distance
        updateEntityVisibility(cameraHeight);
        
        // Store camera position for visibility culling
        lastCameraPosition = camera.position.clone();
    }

    /**
     * Update entity visibility based on LOD
     */
    function updateEntityVisibility(cameraHeight) {
        let visibleCount = 0;
        const maxVisible = CONFIG.MAX_VISIBLE_ENTITIES;
        
        // Sort entities by signal strength if we have too many
        if (signalEntities.size > maxVisible) {
            const sortedEntities = Array.from(signalEntities.entries())
                .sort((a, b) => b[1].properties.strength - a[1].properties.strength);
            
            sortedEntities.forEach(([id, entity], index) => {
                const shouldShow = index < maxVisible && 
                                 entity.properties.strength > CONFIG.WEAK_SIGNAL_THRESHOLD;
                entity.show = shouldShow;
                if (shouldShow) visibleCount++;
            });
        } else {
            signalEntities.forEach(entity => {
                entity.show = true;
                visibleCount++;
            });
        }
        
        performanceStats.visibleEntities = visibleCount;
    }

    /**
     * Initialize FPS monitoring
     */
    function initializeFPSMonitor() {
        // Create FPS display element
        const fpsDisplay = document.createElement('div');
        fpsDisplay.id = 'fps-monitor';
        fpsDisplay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff00;
            padding: 5px 10px;
            font-family: monospace;
            font-size: 12px;
            border: 1px solid #00ff00;
            border-radius: 3px;
            z-index: 1000;
        `;
        document.body.appendChild(fpsDisplay);
        fpsMonitor = fpsDisplay;
        
        // Update FPS counter
        setInterval(updateFPSDisplay, CONFIG.FPS_UPDATE_INTERVAL);
    }

    /**
     * Update FPS display
     */
    function updateFPSDisplay() {
        const now = Date.now();
        const delta = now - performanceStats.lastTime;
        performanceStats.fps = Math.round((performanceStats.frameCount * 1000) / delta);
        performanceStats.frameCount = 0;
        performanceStats.lastTime = now;
        
        if (fpsMonitor) {
            fpsMonitor.innerHTML = `
                FPS: ${performanceStats.fps}<br>
                Visible: ${performanceStats.visibleEntities}/${performanceStats.totalEntities}
            `;
        }
    }

    /**
     * Start the update loop
     */
    function startUpdateLoop() {
        // Process update queue
        setInterval(processUpdateQueue, 100);
        
        // Update frame counter
        viewer.scene.postRender.addEventListener(() => {
            performanceStats.frameCount++;
        });
        
        // Cleanup old entities periodically
        setInterval(cleanupOldEntities, 30000); // Every 30 seconds
    }

    /**
     * Cleanup entities that haven't been updated recently
     */
    function cleanupOldEntities() {
        const now = Date.now();
        const maxAge = 300000; // 5 minutes
        
        signalEntities.forEach((entity, id) => {
            if (now - entity.properties.lastUpdate > maxAge) {
                removeSignal(id);
            }
        });
    }

    /**
     * Clear all signal entities
     */
    function clearAllSignals() {
        dataSource.entities.removeAll();
        signalEntities.clear();
        performanceStats.totalEntities = 0;
        performanceStats.visibleEntities = 0;
    }

    /**
     * Get performance statistics
     */
    function getPerformanceStats() {
        return { ...performanceStats };
    }

    /**
     * Batch update multiple signals
     */
    function batchUpdateSignals(signals) {
        signals.forEach(signal => addSignal(signal));
    }

    /**
     * SignalHistory class for persistent storage with IndexedDB
     * Stores up to 10,000 signals with FIFO behavior
     */
    class SignalHistory {
        constructor() {
            this.dbName = 'SignalHistoryDB';
            this.dbVersion = 1;
            this.storeName = 'signals';
            this.maxSignals = 10000;
            this.db = null;
            this.isInitialized = false;
            this.initPromise = this.initialize();
        }

        /**
         * Initialize IndexedDB
         */
        async initialize() {
            try {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                request.onerror = () => {
                    console.error('Failed to open IndexedDB:', request.error);
                    throw new Error('Failed to open SignalHistory database');
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this.isInitialized = true;
                    console.log('SignalHistory database initialized');
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create object store if it doesn't exist
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const objectStore = db.createObjectStore(this.storeName, { 
                            keyPath: 'id',
                            autoIncrement: false 
                        });
                        
                        // Create indexes for efficient querying
                        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                        objectStore.createIndex('lat', 'lat', { unique: false });
                        objectStore.createIndex('lon', 'lon', { unique: false });
                        objectStore.createIndex('source', 'source', { unique: false });
                        objectStore.createIndex('frequency', 'frequency', { unique: false });
                        
                        // Compound index for spatial queries
                        objectStore.createIndex('lat_lon', ['lat', 'lon'], { unique: false });
                        
                        console.log('SignalHistory object store created with indexes');
                    }
                };

                return new Promise((resolve, reject) => {
                    request.onsuccess = (event) => {
                        this.db = event.target.result;
                        this.isInitialized = true;
                        console.log('SignalHistory database initialized');
                        resolve();
                    };
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            } catch (error) {
                console.error('Error initializing SignalHistory:', error);
                throw error;
            }
        }

        /**
         * Ensure database is initialized
         */
        async ensureInitialized() {
            if (!this.isInitialized) {
                await this.initPromise;
            }
        }

        /**
         * Add a signal to the history
         * @param {Object} signal - Signal object with properties
         */
        async addSignal(signal) {
            await this.ensureInitialized();
            
            try {
                // Ensure required fields
                const signalData = {
                    id: signal.id || `${signal.source}_${signal.mac || signal.name}_${Date.now()}`,
                    timestamp: signal.timestamp || Date.now(),
                    lat: signal.lat || signal.latitude,
                    lon: signal.lon || signal.longitude,
                    source: signal.source || 'unknown',
                    frequency: signal.frequency || 0,
                    strength: signal.strength || signal.signal_dbm || -100,
                    name: signal.name || signal.ssid || 'Unknown',
                    mac: signal.mac || signal.mac_addr || '',
                    type: signal.type || 'unknown',
                    data: signal // Store original data
                };

                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                
                // Add the signal
                await this.promisifyRequest(objectStore.put(signalData));
                
                // Check if we need to cleanup old signals
                const count = await this.getSignalCount();
                if (count > this.maxSignals) {
                    await this.clearOldSignals(count - this.maxSignals);
                }
                
                return signalData;
            } catch (error) {
                console.error('Error adding signal to history:', error);
                throw error;
            }
        }

        /**
         * Get signals within a geographical area
         * @param {number} minLat - Minimum latitude
         * @param {number} maxLat - Maximum latitude
         * @param {number} minLon - Minimum longitude
         * @param {number} maxLon - Maximum longitude
         * @param {number} limit - Maximum number of results
         */
        async getSignalsInArea(minLat, maxLat, minLon, maxLon, limit = 1000) {
            await this.ensureInitialized();
            
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const signals = [];
                
                // Use cursor to iterate through all signals
                // IndexedDB doesn't support compound range queries efficiently
                const request = objectStore.openCursor();
                
                return new Promise((resolve, reject) => {
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && signals.length < limit) {
                            const signal = cursor.value;
                            // Check if signal is within bounds
                            if (signal.lat >= minLat && signal.lat <= maxLat &&
                                signal.lon >= minLon && signal.lon <= maxLon) {
                                signals.push(signal);
                            }
                            cursor.continue();
                        } else {
                            resolve(signals);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Error getting signals in area:', error);
                throw error;
            }
        }

        /**
         * Get recent signals
         * @param {number} count - Number of recent signals to retrieve
         * @param {string} source - Optional source filter
         */
        async getRecentSignals(count = 100, source = null) {
            await this.ensureInitialized();
            
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const signals = [];
                
                // Use timestamp index for efficient retrieval
                const index = objectStore.index('timestamp');
                const request = index.openCursor(null, 'prev'); // Reverse order (newest first)
                
                return new Promise((resolve, reject) => {
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && signals.length < count) {
                            const signal = cursor.value;
                            // Apply source filter if specified
                            if (!source || signal.source === source) {
                                signals.push(signal);
                            }
                            cursor.continue();
                        } else {
                            resolve(signals);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Error getting recent signals:', error);
                throw error;
            }
        }

        /**
         * Clear old signals (FIFO behavior)
         * @param {number} count - Number of oldest signals to remove
         */
        async clearOldSignals(count) {
            await this.ensureInitialized();
            
            try {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const index = objectStore.index('timestamp');
                
                let deleted = 0;
                const request = index.openCursor(); // Oldest first
                
                return new Promise((resolve, reject) => {
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && deleted < count) {
                            cursor.delete();
                            deleted++;
                            cursor.continue();
                        } else {
                            console.log(`Cleared ${deleted} old signals from history`);
                            resolve(deleted);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Error clearing old signals:', error);
                throw error;
            }
        }

        /**
         * Get total signal count
         */
        async getSignalCount() {
            await this.ensureInitialized();
            
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.count();
                
                return this.promisifyRequest(request);
            } catch (error) {
                console.error('Error getting signal count:', error);
                throw error;
            }
        }

        /**
         * Get signals by source
         * @param {string} source - Source name (e.g., 'kismet', 'hackrf')
         * @param {number} limit - Maximum number of results
         */
        async getSignalsBySource(source, limit = 1000) {
            await this.ensureInitialized();
            
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const index = objectStore.index('source');
                const signals = [];
                
                const request = index.openCursor(IDBKeyRange.only(source));
                
                return new Promise((resolve, reject) => {
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && signals.length < limit) {
                            signals.push(cursor.value);
                            cursor.continue();
                        } else {
                            resolve(signals);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Error getting signals by source:', error);
                throw error;
            }
        }

        /**
         * Get signals by frequency range
         * @param {number} minFreq - Minimum frequency
         * @param {number} maxFreq - Maximum frequency
         * @param {number} limit - Maximum number of results
         */
        async getSignalsByFrequency(minFreq, maxFreq, limit = 1000) {
            await this.ensureInitialized();
            
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const index = objectStore.index('frequency');
                const signals = [];
                
                const range = IDBKeyRange.bound(minFreq, maxFreq);
                const request = index.openCursor(range);
                
                return new Promise((resolve, reject) => {
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && signals.length < limit) {
                            signals.push(cursor.value);
                            cursor.continue();
                        } else {
                            resolve(signals);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            } catch (error) {
                console.error('Error getting signals by frequency:', error);
                throw error;
            }
        }

        /**
         * Clear all signals
         */
        async clearAll() {
            await this.ensureInitialized();
            
            try {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.clear();
                
                await this.promisifyRequest(request);
                console.log('All signals cleared from history');
            } catch (error) {
                console.error('Error clearing all signals:', error);
                throw error;
            }
        }

        /**
         * Export signals to JSON
         * @param {Object} filters - Optional filters
         */
        async exportToJSON(filters = {}) {
            await this.ensureInitialized();
            
            try {
                let signals;
                
                if (filters.area) {
                    const { minLat, maxLat, minLon, maxLon } = filters.area;
                    signals = await this.getSignalsInArea(minLat, maxLat, minLon, maxLon, filters.limit);
                } else if (filters.source) {
                    signals = await this.getSignalsBySource(filters.source, filters.limit);
                } else if (filters.frequency) {
                    const { min, max } = filters.frequency;
                    signals = await this.getSignalsByFrequency(min, max, filters.limit);
                } else {
                    signals = await this.getRecentSignals(filters.limit || 10000);
                }
                
                return JSON.stringify(signals, null, 2);
            } catch (error) {
                console.error('Error exporting signals:', error);
                throw error;
            }
        }

        /**
         * Helper to promisify IndexedDB requests
         */
        promisifyRequest(request) {
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        /**
         * Get database statistics
         */
        async getStats() {
            await this.ensureInitialized();
            
            try {
                const count = await this.getSignalCount();
                const recentSignals = await this.getRecentSignals(1);
                const oldestSignals = await this.getRecentSignals(1);
                
                // Get oldest signal
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const index = objectStore.index('timestamp');
                const oldestRequest = index.openCursor();
                
                const oldest = await new Promise((resolve, reject) => {
                    oldestRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        resolve(cursor ? cursor.value : null);
                    };
                    oldestRequest.onerror = () => reject(oldestRequest.error);
                });
                
                return {
                    totalSignals: count,
                    maxSignals: this.maxSignals,
                    percentFull: (count / this.maxSignals * 100).toFixed(2) + '%',
                    newestSignal: recentSignals[0] || null,
                    oldestSignal: oldest || null,
                    dbName: this.dbName,
                    storeName: this.storeName
                };
            } catch (error) {
                console.error('Error getting database stats:', error);
                throw error;
            }
        }
    }

    // Create singleton instance
    const signalHistory = new SignalHistory();

    // Public API
    window.SignalVisualization = {
        initialize,
        addSignal,
        removeSignal,
        clearAllSignals,
        getPerformanceStats,
        batchUpdateSignals,
        SignalHistory,
        signalHistory // Expose singleton instance
    };

})();
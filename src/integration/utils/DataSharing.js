/**
 * Data Sharing Utilities
 * Facilitates data exchange between Stinkster applications
 */

class DataSharing {
    constructor(messageBus) {
        this.messageBus = messageBus;
        this.dataStore = new Map();
        this.subscriptions = new Map();
        this.syncHandlers = new Map();
        
        // Setup data sync handlers
        this.setupSyncHandlers();
    }

    // Setup sync handlers for cross-app data
    setupSyncHandlers() {
        // Handle data update requests
        this.messageBus.subscribe('data:update', (data, meta) => {
            this.handleDataUpdate(data, meta);
        });

        // Handle data requests
        this.messageBus.respond('data:request', async (data) => {
            return this.handleDataRequest(data);
        });

        // Handle data sync
        this.messageBus.subscribe('data:sync', (data, meta) => {
            this.handleDataSync(data, meta);
        });
    }

    // Register data source
    registerDataSource(key, config = {}) {
        const source = {
            key,
            type: config.type || 'local',
            schema: config.schema || {},
            transform: config.transform || (data => data),
            validate: config.validate || (() => true),
            syncInterval: config.syncInterval || null,
            lastSync: null
        };

        this.dataStore.set(key, {
            source,
            data: config.initialData || null,
            subscribers: new Set()
        });

        // Setup auto-sync if interval provided
        if (source.syncInterval) {
            this.setupAutoSync(key, source.syncInterval);
        }

        return this;
    }

    // Share data with other apps
    shareData(key, data, options = {}) {
        const store = this.dataStore.get(key);
        if (!store) {
            console.error(`Data source not registered: ${key}`);
            return false;
        }

        // Validate data
        if (!store.source.validate(data)) {
            console.error(`Invalid data for source: ${key}`);
            return false;
        }

        // Transform data
        const transformedData = store.source.transform(data);

        // Update local store
        store.data = transformedData;
        store.source.lastSync = Date.now();

        // Notify local subscribers
        this.notifySubscribers(key, transformedData);

        // Broadcast to other apps
        if (options.broadcast !== false) {
            this.messageBus.publish('data:update', {
                key,
                data: transformedData,
                timestamp: Date.now(),
                source: window.location.pathname
            });
        }

        return true;
    }

    // Get shared data
    getData(key, options = {}) {
        const store = this.dataStore.get(key);
        
        if (!store || !store.data) {
            // Try to request from other apps
            if (options.request) {
                return this.requestData(key, options.timeout);
            }
            return null;
        }

        return store.data;
    }

    // Request data from other apps
    async requestData(key, timeout = 5000) {
        try {
            const response = await this.messageBus.request('data:request', {
                key,
                requester: window.location.pathname
            }, timeout);

            if (response.data) {
                // Cache the received data
                this.handleDataUpdate({
                    key,
                    data: response.data
                });
                return response.data;
            }
            
            return null;
        } catch (error) {
            console.error(`Failed to request data for key: ${key}`, error);
            return null;
        }
    }

    // Subscribe to data changes
    subscribe(key, callback, options = {}) {
        let store = this.dataStore.get(key);
        
        // Create store if doesn't exist
        if (!store) {
            this.registerDataSource(key);
            store = this.dataStore.get(key);
        }

        const subscription = {
            id: Math.random().toString(36).substr(2, 9),
            callback,
            filter: options.filter
        };

        store.subscribers.add(subscription);

        // Call immediately with current data if exists
        if (store.data && options.immediate !== false) {
            callback(store.data, { initial: true });
        }

        // Return unsubscribe function
        return () => {
            store.subscribers.delete(subscription);
        };
    }

    // Handle incoming data updates
    handleDataUpdate(data, meta) {
        const { key, data: newData } = data;
        const store = this.dataStore.get(key);

        if (store) {
            // Update data
            store.data = newData;
            store.source.lastSync = Date.now();

            // Notify subscribers
            this.notifySubscribers(key, newData, meta);
        }

        // Call sync handlers
        const handlers = this.syncHandlers.get(key);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(newData, meta);
                } catch (error) {
                    console.error('Sync handler error:', error);
                }
            });
        }
    }

    // Handle data requests
    async handleDataRequest(request) {
        const { key } = request;
        const store = this.dataStore.get(key);

        if (store && store.data) {
            return {
                key,
                data: store.data,
                timestamp: store.source.lastSync,
                source: window.location.pathname
            };
        }

        return {
            key,
            data: null,
            error: 'Data not found'
        };
    }

    // Handle data sync
    handleDataSync(data, meta) {
        Object.entries(data).forEach(([key, value]) => {
            this.handleDataUpdate({ key, data: value }, meta);
        });
    }

    // Notify subscribers of data changes
    notifySubscribers(key, data, meta = {}) {
        const store = this.dataStore.get(key);
        if (!store) return;

        store.subscribers.forEach(sub => {
            // Apply filter if provided
            if (sub.filter && !sub.filter(data, meta)) {
                return;
            }

            try {
                sub.callback(data, meta);
            } catch (error) {
                console.error('Subscriber error:', error);
            }
        });
    }

    // Setup auto-sync for a data source
    setupAutoSync(key, interval) {
        setInterval(() => {
            const store = this.dataStore.get(key);
            if (store && store.data) {
                this.shareData(key, store.data);
            }
        }, interval);
    }

    // Add sync handler for external updates
    onSync(key, handler) {
        if (!this.syncHandlers.has(key)) {
            this.syncHandlers.set(key, new Set());
        }
        
        this.syncHandlers.get(key).add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.syncHandlers.get(key);
            if (handlers) {
                handlers.delete(handler);
            }
        };
    }

    // Batch update multiple data sources
    batchUpdate(updates, options = {}) {
        const results = {};
        
        Object.entries(updates).forEach(([key, data]) => {
            results[key] = this.shareData(key, data, {
                broadcast: false // Don't broadcast individually
            });
        });

        // Broadcast all at once
        if (options.broadcast !== false) {
            this.messageBus.publish('data:sync', updates);
        }

        return results;
    }

    // Get all data for export/debugging
    getAllData() {
        const data = {};
        
        this.dataStore.forEach((store, key) => {
            if (store.data) {
                data[key] = {
                    data: store.data,
                    lastSync: store.source.lastSync,
                    type: store.source.type
                };
            }
        });

        return data;
    }

    // Clear all data
    clear() {
        this.dataStore.clear();
        this.subscriptions.clear();
        this.syncHandlers.clear();
    }
}

// Common data keys used across apps
const DATA_KEYS = {
    // Device data
    WIFI_DEVICES: 'wifi-devices',
    GPS_LOCATION: 'gps-location',
    
    // Spectrum data
    SPECTRUM_DATA: 'spectrum-data',
    SIGNAL_PEAKS: 'signal-peaks',
    FREQUENCY_CONFIG: 'frequency-config',
    
    // TAK data
    TAK_MARKERS: 'tak-markers',
    TAK_CONFIG: 'tak-config',
    
    // System status
    SYSTEM_STATUS: 'system-status',
    SERVICE_HEALTH: 'service-health',
    
    // User preferences
    USER_SETTINGS: 'user-settings',
    APP_CONFIG: 'app-config'
};

// Data transformers
const transformers = {
    // Transform Kismet device to common format
    kismetDevice: (device) => ({
        id: device.device_key,
        type: 'wifi',
        name: device.device_name || 'Unknown',
        mac: device.device_mac,
        signal: device.signal?.last_signal || 0,
        location: device.location || null,
        lastSeen: device.last_seen || Date.now(),
        metadata: {
            manufacturer: device.device_manufacturer,
            channel: device.channel,
            encryption: device.encryption
        }
    }),

    // Transform spectrum data to common format
    spectrumData: (data) => ({
        frequency: data.center_freq,
        bandwidth: data.sample_rate,
        power: data.power_spectrum,
        timestamp: data.timestamp || Date.now(),
        peaks: data.detected_signals || []
    }),

    // Transform GPS data to common format
    gpsLocation: (data) => ({
        latitude: data.lat,
        longitude: data.lon,
        altitude: data.alt || 0,
        accuracy: data.accuracy || 0,
        speed: data.speed || 0,
        heading: data.heading || 0,
        timestamp: data.timestamp || Date.now()
    })
};

// Validators
const validators = {
    // Validate GPS coordinates
    gpsLocation: (data) => {
        return data &&
            typeof data.latitude === 'number' &&
            typeof data.longitude === 'number' &&
            data.latitude >= -90 && data.latitude <= 90 &&
            data.longitude >= -180 && data.longitude <= 180;
    },

    // Validate device data
    device: (data) => {
        return data &&
            data.id &&
            data.type &&
            typeof data.signal === 'number';
    },

    // Validate spectrum data
    spectrum: (data) => {
        return data &&
            typeof data.frequency === 'number' &&
            Array.isArray(data.power);
    }
};

// Export utilities
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DataSharing,
        DATA_KEYS,
        transformers,
        validators
    };
} else {
    window.DataSharing = DataSharing;
    window.DATA_KEYS = DATA_KEYS;
    window.dataTransformers = transformers;
    window.dataValidators = validators;
}
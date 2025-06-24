/**
 * Device Memory Manager
 * Manages device history with automatic cleanup and memory limits
 */

class DeviceMemoryManager {
    constructor(options = {}) {
        // Configuration
        this.maxDevices = options.maxDevices || 1000;
        this.maxHistoryPerDevice = options.maxHistoryPerDevice || 100;
        this.historyTTL = options.historyTTL || 3600000; // 1 hour default
        this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes
        this.memoryWarningThreshold = options.memoryWarningThreshold || 0.8; // 80% of max
        
        // Storage
        this.devices = new Map();
        this.deviceHistory = new Map();
        this.lastSeen = new Map();
        
        // Stats
        this.stats = {
            totalDevices: 0,
            activeDevices: 0,
            historyEntries: 0,
            cleanupRuns: 0,
            devicesRemoved: 0,
            memoryWarnings: 0
        };
        
        // Start cleanup timer
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
        
        // Monitor memory usage
        this.monitorMemory();
    }

    /**
     * Add or update a device
     * @param {string} deviceId - Unique device identifier
     * @param {Object} deviceData - Device information
     */
    addDevice(deviceId, deviceData) {
        const now = Date.now();
        
        // Check if we need to make room
        if (this.devices.size >= this.maxDevices && !this.devices.has(deviceId)) {
            this.evictOldestDevice();
        }
        
        // Update device
        this.devices.set(deviceId, {
            ...deviceData,
            lastUpdated: now
        });
        
        this.lastSeen.set(deviceId, now);
        
        // Add to history
        this.addToHistory(deviceId, deviceData);
        
        this.updateStats();
    }

    /**
     * Add device data to history
     * @param {string} deviceId - Device identifier
     * @param {Object} data - Data to add to history
     */
    addToHistory(deviceId, data) {
        if (!this.deviceHistory.has(deviceId)) {
            this.deviceHistory.set(deviceId, []);
        }
        
        const history = this.deviceHistory.get(deviceId);
        
        // Add new entry with timestamp
        history.push({
            ...data,
            timestamp: Date.now()
        });
        
        // Trim history if too long
        if (history.length > this.maxHistoryPerDevice) {
            history.splice(0, history.length - this.maxHistoryPerDevice);
        }
        
        this.stats.historyEntries = this.getTotalHistoryEntries();
    }

    /**
     * Get device by ID
     * @param {string} deviceId - Device identifier
     * @returns {Object|null} Device data or null
     */
    getDevice(deviceId) {
        return this.devices.get(deviceId) || null;
    }

    /**
     * Get device history
     * @param {string} deviceId - Device identifier
     * @param {number} limit - Maximum entries to return
     * @returns {Array} History entries
     */
    getDeviceHistory(deviceId, limit = 50) {
        const history = this.deviceHistory.get(deviceId) || [];
        return limit ? history.slice(-limit) : history;
    }

    /**
     * Get all active devices
     * @param {Object} filter - Filter criteria
     * @returns {Array} Array of devices
     */
    getActiveDevices(filter = {}) {
        const now = Date.now();
        const maxAge = filter.maxAge || 300000; // 5 minutes default
        
        const activeDevices = [];
        
        for (const [deviceId, device] of this.devices.entries()) {
            const lastSeen = this.lastSeen.get(deviceId) || 0;
            
            if (now - lastSeen <= maxAge) {
                activeDevices.push({
                    id: deviceId,
                    ...device,
                    age: now - lastSeen
                });
            }
        }
        
        // Apply additional filters
        return this.applyFilters(activeDevices, filter);
    }

    /**
     * Apply filters to device list
     * @param {Array} devices - Device array
     * @param {Object} filter - Filter criteria
     * @returns {Array} Filtered devices
     */
    applyFilters(devices, filter) {
        let filtered = devices;
        
        if (filter.minRssi) {
            filtered = filtered.filter(d => (d.rssi || -100) >= filter.minRssi);
        }
        
        if (filter.type) {
            filtered = filtered.filter(d => d.type === filter.type);
        }
        
        if (filter.ssid) {
            filtered = filtered.filter(d => 
                d.ssid && d.ssid.toLowerCase().includes(filter.ssid.toLowerCase())
            );
        }
        
        return filtered;
    }

    /**
     * Evict the oldest device to make room
     */
    evictOldestDevice() {
        let oldestId = null;
        let oldestTime = Date.now();
        
        for (const [deviceId, lastSeen] of this.lastSeen.entries()) {
            if (lastSeen < oldestTime) {
                oldestTime = lastSeen;
                oldestId = deviceId;
            }
        }
        
        if (oldestId) {
            this.removeDevice(oldestId);
            this.stats.devicesRemoved++;
        }
    }

    /**
     * Remove a device and its history
     * @param {string} deviceId - Device identifier
     */
    removeDevice(deviceId) {
        this.devices.delete(deviceId);
        this.deviceHistory.delete(deviceId);
        this.lastSeen.delete(deviceId);
    }

    /**
     * Clean up old devices and history
     */
    cleanup() {
        const now = Date.now();
        const devicesToRemove = [];
        
        // Find devices to remove
        for (const [deviceId, lastSeen] of this.lastSeen.entries()) {
            if (now - lastSeen > this.historyTTL) {
                devicesToRemove.push(deviceId);
            }
        }
        
        // Remove old devices
        devicesToRemove.forEach(deviceId => {
            this.removeDevice(deviceId);
            this.stats.devicesRemoved++;
        });
        
        // Clean up old history entries
        for (const [deviceId, history] of this.deviceHistory.entries()) {
            const filteredHistory = history.filter(entry => 
                now - entry.timestamp <= this.historyTTL
            );
            
            if (filteredHistory.length === 0) {
                this.deviceHistory.delete(deviceId);
            } else if (filteredHistory.length < history.length) {
                this.deviceHistory.set(deviceId, filteredHistory);
            }
        }
        
        this.stats.cleanupRuns++;
        this.updateStats();
        
        // Check memory usage
        this.checkMemoryUsage();
    }

    /**
     * Monitor memory usage
     */
    monitorMemory() {
        if (global.gc) {
            // Force garbage collection if available (requires --expose-gc flag)
            setInterval(() => {
                const before = process.memoryUsage().heapUsed;
                global.gc();
                const after = process.memoryUsage().heapUsed;
                
                if (before - after > 10 * 1024 * 1024) { // More than 10MB freed
                    console.log(`GC freed ${Math.round((before - after) / 1024 / 1024)}MB`);
                }
            }, 60000); // Every minute
        }
    }

    /**
     * Check current memory usage
     */
    checkMemoryUsage() {
        const usage = this.devices.size / this.maxDevices;
        
        if (usage > this.memoryWarningThreshold) {
            this.stats.memoryWarnings++;
            console.warn(`Device memory usage at ${Math.round(usage * 100)}%`);
            
            // Aggressive cleanup if near limit
            if (usage > 0.95) {
                this.aggressiveCleanup();
            }
        }
    }

    /**
     * Perform aggressive cleanup when memory is critical
     */
    aggressiveCleanup() {
        const now = Date.now();
        const targetSize = Math.floor(this.maxDevices * 0.7); // Reduce to 70%
        
        // Sort devices by last seen time
        const sortedDevices = Array.from(this.lastSeen.entries())
            .sort((a, b) => a[1] - b[1]);
        
        // Remove oldest devices until we reach target
        let removed = 0;
        while (this.devices.size > targetSize && sortedDevices.length > 0) {
            const [deviceId] = sortedDevices.shift();
            this.removeDevice(deviceId);
            removed++;
        }
        
        console.log(`Aggressive cleanup removed ${removed} devices`);
        this.stats.devicesRemoved += removed;
    }

    /**
     * Update statistics
     */
    updateStats() {
        this.stats.totalDevices = this.devices.size;
        this.stats.activeDevices = this.getActiveDevices().length;
        this.stats.historyEntries = this.getTotalHistoryEntries();
    }

    /**
     * Get total number of history entries
     * @returns {number} Total history entries
     */
    getTotalHistoryEntries() {
        let total = 0;
        for (const history of this.deviceHistory.values()) {
            total += history.length;
        }
        return total;
    }

    /**
     * Get memory usage statistics
     * @returns {Object} Memory stats
     */
    getMemoryStats() {
        const memUsage = process.memoryUsage();
        
        return {
            ...this.stats,
            memoryUsage: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
                external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
                deviceCapacity: `${this.devices.size}/${this.maxDevices}`,
                utilizationPercent: Math.round((this.devices.size / this.maxDevices) * 100)
            }
        };
    }

    /**
     * Clear all data
     */
    clear() {
        this.devices.clear();
        this.deviceHistory.clear();
        this.lastSeen.clear();
        this.updateStats();
    }

    /**
     * Destroy the manager
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
    }
}

module.exports = DeviceMemoryManager;
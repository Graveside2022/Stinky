/**
 * Kismet Operations Center - Optimized Main JavaScript
 * Implements lazy loading, batching, and performance optimizations
 */

// Global state with performance optimizations
const AppState = {
    servicesStarting: false,
    startupBeginTime: null,
    rapidUpdateInterval: null,
    cesiumLoader: null,
    deviceManager: null,
    performanceMonitor: null,
    updateQueue: [],
    batchUpdateTimer: null,
    isGlobeVisible: false
};

// Performance configuration
const PerformanceConfig = {
    updateBatchInterval: 100, // ms
    maxUpdateQueueSize: 100,
    deviceUpdateThrottle: 250, // ms
    globeLazyLoadDelay: 2000, // ms
    enableRequestAnimationFrame: true
};

// Initialize performance monitoring
class ClientPerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: [],
            updateTimes: [],
            renderTimes: [],
            memoryUsage: []
        };
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
    }

    startMonitoring() {
        // Monitor FPS
        if (PerformanceConfig.enableRequestAnimationFrame) {
            this.monitorFPS();
        }

        // Monitor memory if available
        if (performance.memory) {
            setInterval(() => {
                this.metrics.memoryUsage.push({
                    timestamp: Date.now(),
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize
                });
                
                // Keep only last 100 entries
                if (this.metrics.memoryUsage.length > 100) {
                    this.metrics.memoryUsage.shift();
                }
            }, 5000);
        }
    }

    monitorFPS() {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        
        if (delta >= 1000) {
            const fps = (this.frameCount * 1000) / delta;
            this.metrics.fps.push({
                timestamp: Date.now(),
                fps: Math.round(fps)
            });
            
            // Keep only last 60 entries
            if (this.metrics.fps.length > 60) {
                this.metrics.fps.shift();
            }
            
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
        
        this.frameCount++;
        requestAnimationFrame(() => this.monitorFPS());
    }

    measureUpdate(name, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        this.metrics.updateTimes.push({
            name,
            duration,
            timestamp: Date.now()
        });
        
        // Keep only last 100 entries
        if (this.metrics.updateTimes.length > 100) {
            this.metrics.updateTimes.shift();
        }
        
        return result;
    }

    getAverageMetric(metricArray, field) {
        if (metricArray.length === 0) return 0;
        const sum = metricArray.reduce((acc, item) => acc + item[field], 0);
        return sum / metricArray.length;
    }

    getSummary() {
        return {
            averageFPS: this.getAverageMetric(this.metrics.fps, 'fps'),
            averageUpdateTime: this.getAverageMetric(this.metrics.updateTimes, 'duration'),
            memoryUsage: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || {},
            updateCount: this.metrics.updateTimes.length
        };
    }
}

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Initialize the application with lazy loading
 */
function initializeApplication() {
    console.log('Initializing Kismet Operations Center (Optimized)...');
    
    // Initialize performance monitor
    AppState.performanceMonitor = new ClientPerformanceMonitor();
    AppState.performanceMonitor.startMonitoring();
    
    // Initialize core components
    initializeGrid();
    initializeBatchUpdates();
    initializePeriodicUpdates();
    initializeStatusUpdates();
    
    // Lazy load heavy components
    setTimeout(() => {
        initializeWebSockets();
    }, 500);
    
    // Lazy load 3D globe only when needed
    initializeGlobeLazyLoading();
    
    // Initialize device manager
    initializeDeviceManager();
    
    // Add resize handlers with throttling
    initializeResizeHandlers();
    
    console.log('Kismet Operations Center initialized (optimized mode)');
}

/**
 * Initialize batch update system
 */
function initializeBatchUpdates() {
    // Process update queue periodically
    AppState.batchUpdateTimer = setInterval(() => {
        if (AppState.updateQueue.length > 0) {
            processBatchUpdates();
        }
    }, PerformanceConfig.updateBatchInterval);
}

/**
 * Process batch updates
 */
function processBatchUpdates() {
    const updates = AppState.updateQueue.splice(0, PerformanceConfig.maxUpdateQueueSize);
    
    // Group updates by type
    const groupedUpdates = updates.reduce((acc, update) => {
        if (!acc[update.type]) {
            acc[update.type] = [];
        }
        acc[update.type].push(update);
        return acc;
    }, {});
    
    // Process each type of update
    Object.entries(groupedUpdates).forEach(([type, typeUpdates]) => {
        switch(type) {
            case 'device':
                batchUpdateDevices(typeUpdates);
                break;
            case 'status':
                batchUpdateStatus(typeUpdates);
                break;
            case 'signal':
                batchUpdateSignals(typeUpdates);
                break;
        }
    });
}

/**
 * Batch update devices
 */
function batchUpdateDevices(updates) {
    // Update UI in one go
    const fragment = document.createDocumentFragment();
    const deviceList = document.getElementById('device-list');
    
    updates.forEach(update => {
        const device = update.data;
        updateDeviceInList(device, fragment);
    });
    
    // Append all at once
    if (fragment.children.length > 0) {
        deviceList.appendChild(fragment);
    }
    
    // Update globe if visible
    if (AppState.isGlobeVisible && AppState.cesiumLoader && AppState.cesiumLoader.viewer) {
        const devices = updates.map(u => u.data);
        AppState.cesiumLoader.batchUpdateDevices(devices);
    }
}

/**
 * Initialize lazy loading for 3D globe
 */
function initializeGlobeLazyLoading() {
    const globeTab = document.querySelector('[data-tab="globe"]');
    const globeContainer = document.getElementById('cesium-container');
    
    if (!globeTab || !globeContainer) {
        return;
    }
    
    // Create intersection observer for globe visibility
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !AppState.cesiumLoader) {
                loadGlobe();
            }
            AppState.isGlobeVisible = entry.isIntersecting;
        });
    }, {
        threshold: 0.1
    });
    
    // Also handle tab clicks
    globeTab.addEventListener('click', () => {
        setTimeout(() => {
            if (!AppState.cesiumLoader) {
                loadGlobe();
            }
            AppState.isGlobeVisible = true;
        }, 100);
    });
    
    // Observe the container
    observer.observe(globeContainer);
}

/**
 * Load 3D globe on demand
 */
async function loadGlobe() {
    console.log('Loading 3D globe...');
    
    try {
        // Dynamically import the Cesium loader
        if (!window.CesiumLoader) {
            const script = document.createElement('script');
            script.src = '/js/cesium-loader.js';
            script.async = true;
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Initialize Cesium
        AppState.cesiumLoader = new window.CesiumLoader();
        await AppState.cesiumLoader.initializeViewer('cesium-container');
        
        // Add existing devices to globe
        if (AppState.deviceManager) {
            const devices = AppState.deviceManager.getAllDevices();
            AppState.cesiumLoader.batchUpdateDevices(devices);
        }
        
        console.log('3D globe loaded successfully');
    } catch (error) {
        console.error('Failed to load 3D globe:', error);
    }
}

/**
 * Initialize device manager for memory management
 */
function initializeDeviceManager() {
    // Simple device manager for client-side
    AppState.deviceManager = {
        devices: new Map(),
        maxDevices: 500,
        
        addDevice(device) {
            // Evict old devices if needed
            if (this.devices.size >= this.maxDevices) {
                const oldestKey = this.devices.keys().next().value;
                this.devices.delete(oldestKey);
            }
            
            this.devices.set(device.mac || device.id, {
                ...device,
                lastSeen: Date.now()
            });
        },
        
        getAllDevices() {
            return Array.from(this.devices.values());
        },
        
        getActiveDevices(maxAge = 300000) {
            const now = Date.now();
            return this.getAllDevices().filter(device => 
                now - device.lastSeen < maxAge
            );
        },
        
        clear() {
            this.devices.clear();
        }
    };
}

/**
 * Initialize WebSocket connections with batching
 */
function initializeWebSockets() {
    // Initialize signal WebSocket
    initializeSignalWebSocket();
    
    // Initialize Kismet WebSocket
    initializeKismetWebSocket();
}

/**
 * Throttled update functions
 */
const throttledDeviceUpdate = throttle((device) => {
    AppState.updateQueue.push({
        type: 'device',
        data: device,
        timestamp: Date.now()
    });
}, PerformanceConfig.deviceUpdateThrottle);

const throttledStatusUpdate = throttle((status) => {
    AppState.updateQueue.push({
        type: 'status',
        data: status,
        timestamp: Date.now()
    });
}, 1000);

/**
 * Initialize resize handlers with performance optimization
 */
function initializeResizeHandlers() {
    // Throttled resize handler
    const handleResize = throttle(() => {
        // Update grid layout
        updateGridLayout();
        
        // Update globe if loaded
        if (AppState.cesiumLoader && AppState.cesiumLoader.viewer) {
            AppState.cesiumLoader.viewer.resize();
        }
    }, 250);
    
    window.addEventListener('resize', handleResize);
    
    // Add resize handles to boxes
    const boxes = document.querySelectorAll('.grid-item');
    boxes.forEach(box => {
        createResizeHandles(box);
    });
}

/**
 * Update device in list with performance optimization
 */
function updateDeviceInList(device, fragment) {
    const existingElement = document.querySelector(`[data-device-id="${device.mac}"]`);
    
    if (existingElement) {
        // Update existing element
        updateDeviceElement(existingElement, device);
    } else {
        // Create new element
        const newElement = createDeviceElement(device);
        fragment.appendChild(newElement);
    }
    
    // Update device manager
    if (AppState.deviceManager) {
        AppState.deviceManager.addDevice(device);
    }
}

/**
 * Create device element
 */
function createDeviceElement(device) {
    const div = document.createElement('div');
    div.className = 'device-item';
    div.setAttribute('data-device-id', device.mac);
    
    div.innerHTML = `
        <div class="device-icon">${getDeviceIcon(device)}</div>
        <div class="device-info">
            <div class="device-name">${device.ssid || device.name || 'Unknown'}</div>
            <div class="device-details">
                <span class="device-mac">${device.mac}</span>
                <span class="device-rssi">${device.rssi || -100}dBm</span>
            </div>
        </div>
        <div class="device-status ${getSignalStrengthClass(device.rssi)}"></div>
    `;
    
    return div;
}

/**
 * Update existing device element
 */
function updateDeviceElement(element, device) {
    // Only update changed values for performance
    const rssiElement = element.querySelector('.device-rssi');
    if (rssiElement && rssiElement.textContent !== `${device.rssi}dBm`) {
        rssiElement.textContent = `${device.rssi || -100}dBm`;
    }
    
    const statusElement = element.querySelector('.device-status');
    if (statusElement) {
        const newClass = getSignalStrengthClass(device.rssi);
        if (!statusElement.classList.contains(newClass)) {
            statusElement.className = `device-status ${newClass}`;
        }
    }
}

/**
 * Get device icon based on type
 */
function getDeviceIcon(device) {
    const type = device.type || 'unknown';
    const icons = {
        'wifi': '📶',
        'bluetooth': '🔵',
        'cellular': '📱',
        'unknown': '❓'
    };
    return icons[type] || icons.unknown;
}

/**
 * Get signal strength class
 */
function getSignalStrengthClass(rssi) {
    if (rssi > -50) return 'signal-excellent';
    if (rssi > -70) return 'signal-good';
    if (rssi > -85) return 'signal-fair';
    return 'signal-poor';
}

/**
 * Clean up on page unload
 */
window.addEventListener('beforeunload', () => {
    // Clear timers
    if (AppState.batchUpdateTimer) {
        clearInterval(AppState.batchUpdateTimer);
    }
    
    // Destroy Cesium if loaded
    if (AppState.cesiumLoader) {
        AppState.cesiumLoader.destroy();
    }
    
    // Clear device manager
    if (AppState.deviceManager) {
        AppState.deviceManager.clear();
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    initializeApplication();
}
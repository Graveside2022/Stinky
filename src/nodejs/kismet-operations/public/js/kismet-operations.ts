/**
 * Kismet Operations Center - Main JavaScript
 * Content Security Policy Compliant - No inline scripts
 */

// Global state
let servicesStarting = false;
let startupBeginTime = null;
let rapidUpdateInterval = null;

// Signal detection data structure
const signalDetections = new Map(); // Map of signal ID to signal object
let signalWebSocket = null;
let signalReconnectTimeout = null;
const signalEventEmitter = new EventTarget(); // Event emitter for signal updates

const messages = [
    "Calibrating Chroniton Emitters...",
    "Quantum Field Sync: 99.97%",
    "Reality Matrix Stabilized.",
    "Interface Online. Welcome, Commander."
];
let messageIndex = 0;

// DOM elements
let planetaryMessageElement = null;
let systemMessageElement = null;
let dynamicTextElements = null;
let statusUpdateInterval = null;

/**
 * Initialize the application when DOM is loaded
 */
/**
 * @returns {Promise<boolean>}
 */
function initializeApplication
}

/**
 * Initialize WebSocket connection for signal data
 */
function initializeSignalWebSocket() {
    if (signalWebSocket && signalWebSocket.readyState === WebSocket.OPEN) {
        console.log('Signal WebSocket already connected');
        return;
    }
    
    // Clear any existing reconnect timeout
    if (signalReconnectTimeout) {
        clearTimeout(signalReconnectTimeout);
        signalReconnectTimeout = null;
    }
    
    try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname;
        const wsPort = window.location.port || '8003';
        const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/signal-stream`;
        
        console.log('Connecting to signal WebSocket:', wsUrl);
        signalWebSocket = new WebSocket(wsUrl);
        
        signalWebSocket.onopen = function(event) {
            console.log('Signal WebSocket connected');
            showNotification('Connected to signal stream', 'success');
            
            // Send initial subscription message
            signalWebSocket.send(JSON.stringify({
                type: 'subscribe',
                sources: ['kismet', 'hackrf']
            }));
        };
        
        signalWebSocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                handleSignalMessage(data);
            } catch (error) {
                console.error('Error parsing signal WebSocket message:', error);
            }
        };
        
        signalWebSocket.onerror = function(error) {
            console.error('Signal WebSocket error:', error);
            showNotification('Signal stream error', 'error');
        };
        
        signalWebSocket.onclose = function(event) {
            console.log('Signal WebSocket closed:', event.code, event.reason);
            signalWebSocket = null;
            
            // Attempt to reconnect after 5 seconds
            if (!signalReconnectTimeout) {
                signalReconnectTimeout = setTimeout(() => {
                    console.log('Attempting to reconnect signal WebSocket...');
                    initializeSignalWebSocket();
                }, 5000);
            }
        };
        
    } catch (error) {
        console.error('Error initializing signal WebSocket:', error);
        showNotification('Failed to connect to signal stream', 'error');
    }
}

/**
 * Handle incoming signal WebSocket messages
 * @param {Object} message - WebSocket message data
 */
function handleSignalMessage(message) {
    if (!message || !message.type) {
        console.error('Invalid signal message:', message);
        return;
    }
    
    switch (message.type) {
        case 'signal':
            if (validateSignalData(message.data)) {
                const signal = createSignalDetection(message.data);
                addSignalDetection(signal);
            }
            break;
            
        case 'batch':
            if (Array.isArray(message.data)) {
                message.data.forEach(data => {
                    if (validateSignalData(data)) {
                        const signal = createSignalDetection(data);
                        addSignalDetection(signal);
                    }
                });
            }
            break;
            
        case 'heartbeat':
            console.log('Signal WebSocket heartbeat received');
            break;
            
        case 'error':
            console.error('Signal stream error:', message.error);
            showNotification(`Signal stream error: ${message.error}`, 'error');
            break;
            
        default:
            console.warn('Unknown signal message type:', message.type);
    }
}

/**
 * Add a new signal detection
 * @param {SignalDetection} signal - Signal detection to add
 */
function addSignalDetection(signal) {
    // Store in map
    signalDetections.set(signal.id, signal);
    
    // Emit event for new detection
    const event = new CustomEvent('signalDetected', { 
        detail: signal 
    });
    signalEventEmitter.dispatchEvent(event);
    
    // Log detection
    console.log(`New ${signal.source} detection:`, signal);
    
    // Update UI if needed
    updateSignalDisplay(signal);
    
    // Clean up old detections (keep last 1000)
    if (signalDetections.size > 1000) {
        const sortedSignals = Array.from(signalDetections.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest 100 signals
        for (let i = 0; i < 100; i++) {
            signalDetections.delete(sortedSignals[i][0]);
        }
    }
}

/**
 * Update signal display in UI
 * @param {SignalDetection} signal - Signal to display
 */
function updateSignalDisplay(signal) {
    // This function can be extended to update specific UI elements
    // For now, we'll just log to console
    const displayInfo = {
        source: signal.source.toUpperCase(),
        coords: `${signal.lat.toFixed(6)}, ${signal.lon.toFixed(6)}`,
        strength: `${signal.signal_strength} dBm`,
        time: new Date(signal.timestamp).toLocaleTimeString()
    };
    
    if (signal.frequency) {
        displayInfo.frequency = `${(signal.frequency / 1e6).toFixed(3)} MHz`;
    }
    
    console.log('Signal Detection:', displayInfo);
}

/**
 * Get all signal detections
 * @param {Object} filters - Optional filters
 * @returns {Array<SignalDetection>} Array of signal detections
 */
function getSignalDetections(filters = {}: Record<string, any>) {
    let signals = Array.from(signalDetections.values());
    
    // Apply filters
    if (filters.source) {
        signals = signals.filter(s => s.source === filters.source);
    }
    
    if (filters.minStrength) {
        signals = signals.filter(s => s.signal_strength >= filters.minStrength);
    }
    
    if (filters.maxAge) {
        const minTime = Date.now() - filters.maxAge;
        signals = signals.filter(s => s.timestamp >= minTime);
    }
    
    if (filters.bounds) {
        const { north, south, east, west } = filters.bounds;
        signals = signals.filter(s => 
            s.lat >= south && s.lat <= north &&
            s.lon >= west && s.lon <= east
        );
    }
    
    return signals;
}

/**
 * Subscribe to signal detection events
 * @param {string} eventType - Event type ('signalDetected')
 * @param {Function} callback - Callback function
 */
function subscribeToSignalEvents(eventType, callback) {
    signalEventEmitter.addEventListener(eventType, callback);
}

/**
 * Unsubscribe from signal detection events
 * @param {string} eventType - Event type
 * @param {Function} callback - Callback function
 */
function unsubscribeFromSignalEvents(eventType, callback) {
    signalEventEmitter.removeEventListener(eventType, callback);
}

/**
 * Send message to signal WebSocket
 * @param {Object} message - Message to send
 */
function sendSignalMessage(message) {
    if (signalWebSocket && signalWebSocket.readyState === WebSocket.OPEN) {
        signalWebSocket.send(JSON.stringify(message));
    } else {
        console.error('Signal WebSocket not connected');
    }
}

/**
 * Make functions available globally for onclick handlers
 */
window.toggleMinimize = toggleMinimize;
window.restoreBox = restoreBox;
window.startKismet = startKismet;
window.stopKismet = stopKismet;
window.addLoadProfile = addLoadProfile;
window.hackRFSweep = hackRFSweep;

// Export signal-related functions for external use
window.signalDetections = signalDetections;
window.signalEventEmitter = signalEventEmitter;
window.getSignalDetections = getSignalDetections;
window.subscribeToSignalEvents = subscribeToSignalEvents;
window.unsubscribeFromSignalEvents = unsubscribeFromSignalEvents;
window.sendSignalMessage = sendSignalMessage;
window.initializeSignalWebSocket = initializeSignalWebSocket;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApplication);
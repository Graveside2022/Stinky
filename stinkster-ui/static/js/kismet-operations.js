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
function initializeApplication() {
    // Cache DOM elements
    planetaryMessageElement = document.getElementById('planetary-message');
    systemMessageElement = document.getElementById('system-message');
    dynamicTextElements = document.querySelectorAll('.dynamic-text');
    
    // Initialize components
    initializeGrid();
    initializePeriodicUpdates();
    initializeStatusUpdates();
    initializeSignalWebSocket();
    
    // Start message rotation
    if (messages.length > 0) {
        updateSystemMessage();
        setInterval(updateSystemMessage, 7000); // Change message every 7 seconds
    }
    
    // Add resize handles to all boxes
    const boxes = document.querySelectorAll('.grid-item');
    boxes.forEach(box => {
        createResizeHandles(box);
    });
    
    console.log('Kismet Operations Center initialized');
}

/**
 * Update system message rotation
 */
function updateSystemMessage() {
    if (planetaryMessageElement) {
        planetaryMessageElement.style.opacity = 0;
        setTimeout(() => {
            planetaryMessageElement.textContent = messages[messageIndex];
            planetaryMessageElement.style.opacity = 1;
            messageIndex = (messageIndex + 1) % messages.length;
        }, 500);
    }
}

/**
 * Update system status information
 */
function updateSystemStatus() {
    fetch('/info', {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            const gps = data.gps;
            document.getElementById('ip-address').textContent = data.ip;
            document.getElementById('gps-status').textContent = gps.status;
            document.getElementById('gps-lat').textContent = gps.lat ?? 'N/A';
            document.getElementById('gps-lon').textContent = gps.lon ?? 'N/A';
            document.getElementById('gps-alt').textContent = gps.alt ?? 'N/A';
            document.getElementById('gps-time').textContent = gps.time ?? 'N/A';
            document.getElementById('gps-mgrs').textContent = gps.mgrs ?? '--';
        })
        .catch(error => {
            console.error('Error updating system status:', error);
            if (systemMessageElement) {
                systemMessageElement.textContent = 'Error loading system status';
            }
        });
}

/**
 * Update Kismet data feed
 */
function updateKismetData() {
    fetch('/kismet-data', {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Kismet data received:', data);
            
            // Update device counts
            const devicesCountEl = document.getElementById('devices-count');
            const networksCountEl = document.getElementById('networks-count');
            const lastUpdateEl = document.getElementById('last-update');
            
            if (devicesCountEl) devicesCountEl.textContent = data.devices_count || '0';
            if (networksCountEl) networksCountEl.textContent = data.networks_count || '0';
            if (lastUpdateEl) lastUpdateEl.textContent = new Date().toLocaleTimeString();
            
            // Update recent devices
            const recentDevicesList = document.getElementById('devices-list');
            if (recentDevicesList) {
                recentDevicesList.innerHTML = '';
                
                if (data.recent_devices && data.recent_devices.length > 0) {
                    data.recent_devices.forEach(device => {
                        const deviceElement = document.createElement('div');
                        deviceElement.className = 'feed-item';
                        deviceElement.innerHTML = `
                            <strong>${escapeHtml(device.name || 'Unknown Device')}</strong><br>
                            Type: ${escapeHtml(device.type || 'Unknown')}<br>
                            Channel: ${escapeHtml(device.channel || 'Unknown')}<br>
                            Signal: ${escapeHtml(device.signal || 'Unknown')} dBm
                        `;
                        recentDevicesList.appendChild(deviceElement);
                    });
                } else {
                    recentDevicesList.innerHTML = '<div class="feed-item">No devices detected</div>';
                }
            }
            
            // Update feed
            const feedContainer = document.getElementById('kismet-feed');
            if (feedContainer) {
                feedContainer.innerHTML = ''; // Clear existing feed items
                
                if (data.feed_items && data.feed_items.length > 0) {
                    data.feed_items.forEach(item => {
                        const feedItem = document.createElement('div');
                        feedItem.className = 'feed-item';
                        feedItem.innerHTML = `
                            <strong>${escapeHtml(item.type || 'Activity')}</strong>: ${escapeHtml(item.message || 'Unknown activity')}
                        `;
                        feedContainer.appendChild(feedItem);
                        
                        // Add highlight effect for new items
                        feedItem.classList.add('feed-item-blink');
                        setTimeout(() => feedItem.classList.remove('feed-item-blink'), 2000);
                    });
                    
                    // Keep only last 10 items
                    while (feedContainer.children.length > 10) {
                        feedContainer.removeChild(feedContainer.firstChild);
                    }
                    
                    // Scroll to bottom
                    feedContainer.scrollTop = feedContainer.scrollHeight;
                } else {
                    feedContainer.innerHTML = '<div class="feed-item">Waiting for activity...</div>';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching Kismet data:', error);
            const devicesCountEl = document.getElementById('devices-count');
            const networksCountEl = document.getElementById('networks-count');
            const lastUpdateEl = document.getElementById('last-update');
            const devicesListEl = document.getElementById('devices-list');
            const feedEl = document.getElementById('kismet-feed');
            
            if (devicesCountEl) devicesCountEl.textContent = '0';
            if (networksCountEl) networksCountEl.textContent = '0';
            if (lastUpdateEl) lastUpdateEl.textContent = 'Error';
            if (devicesListEl) devicesListEl.innerHTML = '<div class="feed-item">Failed to get data from Kismet</div>';
            if (feedEl) feedEl.innerHTML = '<div class="feed-item">Failed to get data from Kismet</div>';
        });
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = 'notification show ' + type;
        
        // Hide notification after 5 seconds
        setTimeout(() => {
            notification.className = 'notification';
        }, 5000);
    }
}

/**
 * Update Kismet service status indicators
 */
function updateKismetStatus() {
    fetch('/script-status')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Kismet status response:', data);
            const kismetStatus = document.getElementById('kismet-status');
            const wigleStatus = document.getElementById('wigle-status');
            
            // Check if we're in startup phase (within 60 seconds of clicking start)
            const isStartingUp = servicesStarting && startupBeginTime && 
                               (Date.now() - startupBeginTime < 60000);
            
            // Update Kismet status
            if (kismetStatus) {
                if (data && data.kismet_running === true && !servicesStarting) {
                    // Only show green if service is running AND we're not in startup mode
                    console.log('Setting Kismet status to running');
                    kismetStatus.style.background = '#44ff44';
                    kismetStatus.style.boxShadow = '0 0 10px #44ff44';
                } else if (isStartingUp) {
                    console.log('Setting Kismet status to starting');
                    kismetStatus.style.background = '#ffaa00';
                    kismetStatus.style.boxShadow = '0 0 10px #ffaa00';
                } else {
                    console.log('Setting Kismet status to not running');
                    kismetStatus.style.background = '#ff4444';
                    kismetStatus.style.boxShadow = 'none';
                }
            }

            // Update WigletoTak status
            if (wigleStatus) {
                if (data && data.wigle_running === true && !servicesStarting) {
                    // Only show green if service is running AND we're not in startup mode
                    wigleStatus.style.background = '#44ff44';
                    wigleStatus.style.boxShadow = '0 0 10px #44ff44';
                } else if (isStartingUp) {
                    wigleStatus.style.background = '#ffaa00';
                    wigleStatus.style.boxShadow = '0 0 10px #ffaa00';
                } else {
                    wigleStatus.style.background = '#ff4444';
                    wigleStatus.style.boxShadow = 'none';
                }
            }
            
            // Clear starting state only if both services are running
            // This ensures yellow stays until services are confirmed running
            if (data && data.kismet_running === true && data.wigle_running === true && servicesStarting) {
                console.log('Both services confirmed running, clearing startup state');
                servicesStarting = false;
                startupBeginTime = null;
            }
        })
        .catch(error => {
            console.error('Error checking Kismet status:', error);
            // Set both indicators to error state (unless we're starting up)
            const kismetStatus = document.getElementById('kismet-status');
            const wigleStatus = document.getElementById('wigle-status');
            const isStartingUp = servicesStarting && startupBeginTime && 
                               (Date.now() - startupBeginTime < 60000);
            
            if (kismetStatus) {
                if (isStartingUp) {
                    kismetStatus.style.background = '#ffaa00';
                    kismetStatus.style.boxShadow = '0 0 10px #ffaa00';
                } else {
                    kismetStatus.style.background = '#ff4444';
                    kismetStatus.style.boxShadow = 'none';
                }
            }
            if (wigleStatus) {
                if (isStartingUp) {
                    wigleStatus.style.background = '#ffaa00';
                    wigleStatus.style.boxShadow = '0 0 10px #ffaa00';
                } else {
                    wigleStatus.style.background = '#ff4444';
                    wigleStatus.style.boxShadow = 'none';
                }
            }
        });
}

/**
 * Start frequent status updates (used when starting/stopping services)
 */
function startStatusUpdates() {
    // Clear any existing interval
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    // Update immediately
    updateKismetStatus();
    // Then update every second for 30 seconds
    statusUpdateInterval = setInterval(updateKismetStatus, 1000);
    // Stop after 30 seconds
    setTimeout(() => {
        clearInterval(statusUpdateInterval);
        // Return to normal update interval
        setInterval(updateKismetStatus, 5000);
    }, 30000);
}

/**
 * Start Kismet services
 */
async function startKismet() {
    console.log('startKismet function called');
    showNotification('Starting Kismet services...', 'info');
    
    // Immediately set status indicators to yellow (starting)
    const kismetStatus = document.getElementById('kismet-status');
    const wigleStatus = document.getElementById('wigle-status');
    if (kismetStatus) {
        kismetStatus.style.background = '#ffaa00';
        kismetStatus.style.boxShadow = '0 0 10px #ffaa00';
    }
    if (wigleStatus) {
        wigleStatus.style.background = '#ffaa00';
        wigleStatus.style.boxShadow = '0 0 10px #ffaa00';
    }
    
    try {
        console.log('Attempting to call /api/start-script endpoint');
        const response = await fetch('/api/start-script', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ scriptName: 'gps_kismet_wigle.sh' })
        });
        
        console.log('Response received:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response not OK:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if(data.success === true) {
            showNotification('Kismet services started successfully!', 'success');
            console.log('Starting status updates...');
            // Set startup state
            servicesStarting = true;
            startupBeginTime = Date.now();
            startStatusUpdates(); // Start frequent status updates
        } else {
            throw new Error(data.message || 'Failed to start Kismet');
        }
    } catch (error) {
        console.error('Error in startKismet:', error);
        showNotification(`Failed to start Kismet services: ${error.message}`, 'error');
    }
}

/**
 * Stop Kismet services
 */
async function stopKismet() {
    showNotification('Stopping Kismet services...', 'info');
    try {
        const response = await fetch('/stop-script', {method: 'POST'});
        const data = await response.json();
        
        if(data.status === 'success') {
            showNotification('Kismet services stopped successfully!', 'success');
            updateKismetStatus();
        } else {
            showNotification('Error stopping Kismet services: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to stop Kismet services. Please try again.', 'error');
    }
}

/**
 * Toggle minimize state of a grid item
 */
function toggleMinimize(button) {
    const gridItem = button.closest('.grid-item');
    const isMinimized = gridItem.classList.toggle('minimized');
    
    if (isMinimized) {
        // Add to minimized tabs
        const tab = document.createElement('div');
        tab.className = 'minimized-tab';
        const title = gridItem.querySelector('h2').textContent.replace('▼', '').replace('▲', '');
        tab.innerHTML = `
            ${escapeHtml(title)}
            <button class="restore-button" onclick="restoreBox('${gridItem.id}')">▲</button>
        `;
        document.getElementById('minimized-tabs').appendChild(tab);

        // Enable resizing for other boxes
        const otherBoxes = document.querySelectorAll('.grid-item:not(.minimized)');
        otherBoxes.forEach(box => {
            box.style.minWidth = '200px';
            box.style.minHeight = '150px';
        });
    } else {
        // Remove from minimized tabs
        const tabs = document.querySelectorAll('.minimized-tab');
        const title = gridItem.querySelector('h2').textContent.replace('▼', '').replace('▲', '');
        tabs.forEach(tab => {
            if (tab.textContent.includes(title)) {
                tab.remove();
            }
        });

        // Disable resizing if no boxes are minimized
        const minimizedBoxes = document.querySelectorAll('.grid-item.minimized');
        if (minimizedBoxes.length === 0) {
            const allBoxes = document.querySelectorAll('.grid-item');
            allBoxes.forEach(box => {
                box.style.minWidth = '';
                box.style.minHeight = '';
                // Reset to original position and size
                resetBoxPosition(box);
            });
        }
    }
}

/**
 * Reset box to original position
 */
function resetBoxPosition(box) {
    switch(box.id) {
        case 'hackrf-one':
            box.style.top = '8px';
            box.style.left = '8px';
            box.style.width = `calc(4 * (100vw / 12) - 16px)`;
            box.style.height = `calc((100vh - 140px) / 2 - 12px)`;
            break;
        case 'instructions':
            box.style.top = `calc((100vh - 140px) / 2 + 4px)`;
            box.style.left = '8px';
            box.style.width = `calc(4 * (100vw / 12) - 16px)`;
            box.style.height = `calc((100vh - 140px) / 2 - 4px)`;
            break;
        case 'kismet-data-feed':
            box.style.top = '8px';
            box.style.left = `calc(4 * (100vw / 12) + 8px)`;
            box.style.width = `calc(4 * (100vw / 12) - 16px)`;
            box.style.height = `calc(100vh - 140px - 8px)`;
            break;
        case 'start-menu':
            box.style.top = '8px';
            box.style.right = '8px';
            box.style.width = `calc(4 * (100vw / 12) - 16px)`;
            box.style.height = `calc((100vh - 140px) / 2 - 12px)`;
            break;
        case 'system-status':
            box.style.top = `calc((100vh - 140px) / 2 + 4px)`;
            box.style.right = '8px';
            box.style.width = `calc(4 * (100vw / 12) - 16px)`;
            box.style.height = `calc((100vh - 140px) / 2 - 4px)`;
            break;
        case 'kismet-container':
            // Position at bottom half of the page when maximized
            box.style.top = '50%';
            box.style.left = '0';
            box.style.width = '100%';
            box.style.height = '50%';
            box.style.position = 'fixed';
            box.style.zIndex = '1000';
            break;
    }
}

/**
 * Restore minimized box
 */
function restoreBox(boxId) {
    const box = document.getElementById(boxId);
    if (box) {
        box.classList.remove('minimized');
        
        // Remove from minimized tabs
        const tabs = document.querySelectorAll('.minimized-tab');
        const title = box.querySelector('h2').textContent.replace('▼', '').replace('▲', '');
        tabs.forEach(tab => {
            if (tab.textContent.includes(title)) {
                tab.remove();
            }
        });

        // Disable resizing if no boxes are minimized
        const minimizedBoxes = document.querySelectorAll('.grid-item.minimized');
        if (minimizedBoxes.length === 0) {
            const allBoxes = document.querySelectorAll('.grid-item');
            allBoxes.forEach(box => {
                box.style.minWidth = '';
                box.style.minHeight = '';
                // Reset to original position and size
                resetBoxPosition(box);
            });
        }
    }
}

/**
 * Initialize draggable grid functionality
 */
function initializeGrid() {
    const gridItems = document.querySelectorAll('.grid-item');
    gridItems.forEach(item => {
        const header = item.querySelector('.box-header');
        if (header) {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('control-button-small')) {
                    e.stopPropagation();
                }
            });

            // Make box draggable
            header.addEventListener('mousedown', function(e) {
                if (e.target.classList.contains('control-button-small')) return;
                
                const box = this.closest('.grid-item');
                const startX = e.clientX;
                const startY = e.clientY;
                const startLeft = box.offsetLeft;
                const startTop = box.offsetTop;
                
                function onMouseMove(e) {
                    const newLeft = startLeft + (e.clientX - startX);
                    const newTop = startTop + (e.clientY - startY);
                    
                    box.style.left = `${newLeft}px`;
                    box.style.top = `${newTop}px`;
                }
                
                function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }
    });
}

/**
 * Create resize handles for a box
 */
function createResizeHandles(box) {
    const positions = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        handle.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            initResize(e, this);
        });
        box.appendChild(handle);
    });
}

/**
 * Initialize resize functionality
 */
function initResize(e, handle) {
    e.preventDefault();
    const box = handle.closest('.grid-item');
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = box.offsetWidth;
    const startHeight = box.offsetHeight;
    const startLeft = box.offsetLeft;
    const startTop = box.offsetTop;

    function doResize(e) {
        const pos = handle.className.split(' ')[1];
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (pos.includes('right')) {
            newWidth = startWidth + (e.clientX - startX);
        }
        if (pos.includes('left')) {
            newWidth = startWidth - (e.clientX - startX);
            newLeft = startLeft + (e.clientX - startX);
        }
        if (pos.includes('bottom')) {
            newHeight = startHeight + (e.clientY - startY);
        }
        if (pos.includes('top')) {
            newHeight = startHeight - (e.clientY - startY);
            newTop = startTop + (e.clientY - startY);
        }

        // Apply minimum size constraints
        newWidth = Math.max(200, newWidth);
        newHeight = Math.max(150, newHeight);

        box.style.width = `${newWidth}px`;
        box.style.height = `${newHeight}px`;
        box.style.left = `${newLeft}px`;
        box.style.top = `${newTop}px`;
    }

    function stopResize() {
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
    }

    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
}

/**
 * Initialize periodic updates
 */
function initializePeriodicUpdates() {
    // Start periodic updates
    setInterval(updateSystemStatus, 5000);
    setInterval(updateKismetData, 2000);

    // Initial updates
    updateSystemStatus();
    updateKismetData();
}

/**
 * Initialize status updates
 */
function initializeStatusUpdates() {
    // Start periodic status updates
    setInterval(updateKismetStatus, 5000);
    
    // Initial status update
    updateKismetStatus();
}

/**
 * Placeholder functions for HackRF controls
 */
function addLoadProfile() {
    showNotification('Add Load Profile functionality not yet implemented', 'info');
}

function hackRFSweep() {
    showNotification('HackRF Sweep functionality not yet implemented', 'info');
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Signal Detection Structure
 * @typedef {Object} SignalDetection
 * @property {string} id - Unique identifier for the signal
 * @property {number} lat - Latitude coordinate
 * @property {number} lon - Longitude coordinate
 * @property {number} signal_strength - Signal strength in dBm
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {'kismet'|'hackrf'} source - Source of the detection
 * @property {number|null} frequency - Frequency in Hz (for HackRF detections)
 * @property {Object} metadata - Additional source-specific data
 */

/**
 * Create a new signal detection object
 * @param {Object} data - Raw signal data from WebSocket
 * @returns {SignalDetection} Formatted signal detection
 */
function createSignalDetection(data) {
    return {
        id: data.id || `${data.source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lat: parseFloat(data.lat) || 0,
        lon: parseFloat(data.lon) || 0,
        signal_strength: parseFloat(data.signal_strength) || 0,
        timestamp: data.timestamp || Date.now(),
        source: data.source || 'unknown',
        frequency: data.frequency ? parseFloat(data.frequency) : null,
        metadata: data.metadata || {}
    };
}

/**
 * Validate signal detection data
 * @param {Object} data - Signal data to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateSignalData(data) {
    if (!data || typeof data !== 'object') {
        console.error('Invalid signal data: not an object', data);
        return false;
    }
    
    // Required fields
    if (!data.source || !['kismet', 'hackrf'].includes(data.source)) {
        console.error('Invalid signal source:', data.source);
        return false;
    }
    
    // Validate coordinates
    const lat = parseFloat(data.lat);
    const lon = parseFloat(data.lon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.error('Invalid coordinates:', data.lat, data.lon);
        return false;
    }
    
    // Validate signal strength
    const signalStrength = parseFloat(data.signal_strength);
    if (isNaN(signalStrength) || signalStrength > 0 || signalStrength < -200) {
        console.error('Invalid signal strength:', data.signal_strength);
        return false;
    }
    
    // Validate frequency for HackRF
    if (data.source === 'hackrf' && data.frequency) {
        const freq = parseFloat(data.frequency);
        if (isNaN(freq) || freq <= 0) {
            console.error('Invalid frequency for HackRF:', data.frequency);
            return false;
        }
    }
    
    return true;
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
        const wsPort = window.location.port || '8002';
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
function getSignalDetections(filters = {}) {
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
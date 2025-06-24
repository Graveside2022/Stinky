/**
 * Kismet Operations Integration Adapter
 * Adds integration capabilities to the existing Kismet Operations app
 */

// Wait for DOM and existing app to be ready
function initializeKismetIntegration() {
    // Load integration library
    const script = document.createElement('script');
    script.src = '/integration/index.js';
    script.onload = async () => {
        console.log('Integration library loaded, initializing Kismet adapter...');
        
        // Create integration instance
        const integration = await createStinksterIntegration({
            app: 'kismet',
            onInit: setupKismetIntegration
        });
        
        // Expose to global scope for existing code
        window.stinksterIntegration = integration;
    };
    document.head.appendChild(script);
}

// Setup Kismet-specific integration
async function setupKismetIntegration(integration) {
    console.log('Setting up Kismet integration...');
    
    // Hook into existing Kismet websocket
    if (window.kismetWebSocket) {
        integrateWebSocket(integration);
    }
    
    // Hook into existing device updates
    if (window.updateDeviceDisplay) {
        const originalUpdate = window.updateDeviceDisplay;
        window.updateDeviceDisplay = function(devices) {
            // Call original function
            originalUpdate.apply(this, arguments);
            
            // Share device data
            if (devices && devices.length > 0) {
                integration.shareData(DATA_KEYS.WIFI_DEVICES, devices);
            }
        };
    }
    
    // Add cross-app data handlers
    setupDataHandlers(integration);
    
    // Add message handlers
    setupMessageHandlers(integration);
    
    // Enhance existing UI
    enhanceUI(integration);
}

// Integrate with existing WebSocket
function integrateWebSocket(integration) {
    const originalOnMessage = window.kismetWebSocket.onmessage;
    
    window.kismetWebSocket.onmessage = function(event) {
        // Call original handler
        if (originalOnMessage) {
            originalOnMessage.call(this, event);
        }
        
        // Parse and share relevant data
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'device_update') {
                integration.shareData(DATA_KEYS.WIFI_DEVICES, data.devices);
            }
            
            if (data.type === 'gps_update') {
                integration.shareData(DATA_KEYS.GPS_LOCATION, {
                    latitude: data.lat,
                    longitude: data.lon,
                    altitude: data.alt,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to parse WebSocket data:', error);
        }
    };
}

// Setup data handlers
function setupDataHandlers(integration) {
    // Subscribe to spectrum data from HackRF
    integration.onDataChange(DATA_KEYS.SPECTRUM_DATA, (data) => {
        // Update spectrum display if it exists
        if (window.updateSpectrumDisplay) {
            window.updateSpectrumDisplay(data);
        }
        
        // Show notification
        showNotification('Spectrum data received from HackRF', 'info');
    });
    
    // Subscribe to TAK markers from WigleToTAK
    integration.onDataChange(DATA_KEYS.TAK_MARKERS, (markers) => {
        // Update map if it exists
        if (window.cesiumViewer && markers) {
            markers.forEach(marker => {
                addTAKMarkerToMap(marker);
            });
        }
    });
}

// Setup message handlers
function setupMessageHandlers(integration) {
    // Handle device export requests
    integration.messageBus.respond('kismet:export:devices', async () => {
        const devices = getActiveDevices();
        return {
            devices: devices,
            count: devices.length,
            timestamp: Date.now()
        };
    });
    
    // Handle scan control messages
    integration.onMessage('kismet:scan:control', (data) => {
        switch (data.action) {
            case 'start':
                if (window.startScan) window.startScan();
                break;
            case 'stop':
                if (window.stopScan) window.stopScan();
                break;
            case 'clear':
                if (window.clearDevices) window.clearDevices();
                break;
        }
    });
    
    // Handle notifications from other apps
    integration.onMessage(messageBus.TOPICS.NOTIFY_INFO, showNotification);
    integration.onMessage(messageBus.TOPICS.NOTIFY_WARNING, showNotification);
    integration.onMessage(messageBus.TOPICS.NOTIFY_ERROR, showNotification);
}

// Enhance existing UI with integration features
function enhanceUI(integration) {
    // Add integration status indicator
    addIntegrationStatus(integration);
    
    // Add cross-app action buttons
    addCrossAppActions(integration);
    
    // Enhance device cards with export options
    enhanceDeviceCards(integration);
}

// Add integration status to UI
function addIntegrationStatus(integration) {
    const statusBar = document.querySelector('.status-bar');
    if (!statusBar) return;
    
    const integrationStatus = document.createElement('div');
    integrationStatus.className = 'integration-status';
    integrationStatus.innerHTML = `
        <span class="status-icon">🔗</span>
        <span class="status-text">Connected</span>
    `;
    
    statusBar.appendChild(integrationStatus);
    
    // Update status based on message bus connection
    integration.messageBus.subscribe('system:heartbeat', () => {
        integrationStatus.querySelector('.status-text').textContent = 'Connected';
        integrationStatus.style.color = '#00ff00';
    });
}

// Add cross-app action buttons
function addCrossAppActions(integration) {
    const actionsContainer = document.querySelector('.quick-actions');
    if (!actionsContainer) return;
    
    const crossAppActions = document.createElement('div');
    crossAppActions.className = 'cross-app-actions';
    crossAppActions.innerHTML = `
        <button class="action-btn" onclick="exportToWigle()">
            <span>🗺️</span> Send to TAK
        </button>
        <button class="action-btn" onclick="viewInSpectrum()">
            <span>📊</span> View Spectrum
        </button>
        <button class="action-btn" onclick="shareSelection()">
            <span>📤</span> Share Selection
        </button>
    `;
    
    actionsContainer.appendChild(crossAppActions);
    
    // Define action handlers
    window.exportToWigle = () => {
        const selected = getSelectedDevices();
        if (selected.length === 0) {
            showNotification('Please select devices to export', 'warning');
            return;
        }
        
        integration.sendMessage('wigle:import:devices', {
            devices: selected,
            source: 'kismet'
        });
        
        showNotification(`Sent ${selected.length} devices to WigleToTAK`, 'success');
    };
    
    window.viewInSpectrum = () => {
        const device = getSelectedDevices()[0];
        if (!device) {
            showNotification('Please select a device', 'warning');
            return;
        }
        
        // Calculate frequency from channel
        const frequency = channelToFrequency(device.channel);
        
        integration.sendMessage('hackrf:tune:frequency', {
            frequency: frequency,
            source: 'kismet',
            reason: `Analyzing ${device.device_name || 'Unknown Device'}`
        });
        
        // Navigate to HackRF
        integration.nav.navigateToApp('hackrf');
    };
    
    window.shareSelection = () => {
        const selected = getSelectedDevices();
        if (selected.length === 0) {
            showNotification('Please select devices to share', 'warning');
            return;
        }
        
        integration.shareData('kismet:selected:devices', selected);
        showNotification(`Shared ${selected.length} devices`, 'info');
    };
}

// Enhance device cards
function enhanceDeviceCards(integration) {
    // Override device card creation to add integration features
    if (window.createDeviceCard) {
        const originalCreateCard = window.createDeviceCard;
        
        window.createDeviceCard = function(device) {
            const card = originalCreateCard.apply(this, arguments);
            
            // Add integration actions
            const actions = document.createElement('div');
            actions.className = 'device-integration-actions';
            actions.innerHTML = `
                <button class="mini-action" title="Send to TAK" 
                        onclick="sendDeviceToTAK('${device.device_key}')">🗺️</button>
                <button class="mini-action" title="View spectrum" 
                        onclick="viewDeviceSpectrum('${device.device_key}')">📊</button>
            `;
            
            card.querySelector('.device-actions').appendChild(actions);
            
            return card;
        };
    }
}

// Helper functions
function getActiveDevices() {
    // Get devices from existing app state
    if (window.devices) {
        return Array.from(window.devices.values());
    }
    return [];
}

function getSelectedDevices() {
    // Get selected devices from UI
    const selected = [];
    document.querySelectorAll('.device-card.selected').forEach(card => {
        const deviceId = card.dataset.deviceId;
        const device = window.devices?.get(deviceId);
        if (device) selected.push(device);
    });
    return selected;
}

function channelToFrequency(channel) {
    // Convert WiFi channel to frequency (2.4GHz band)
    if (channel >= 1 && channel <= 14) {
        return 2412 + (channel - 1) * 5;
    }
    // 5GHz band
    if (channel >= 36 && channel <= 165) {
        return 5180 + (channel - 36) * 5;
    }
    return 2437; // Default to channel 6
}

function addTAKMarkerToMap(marker) {
    // Add TAK marker to Cesium map
    if (!window.cesiumViewer) return;
    
    window.cesiumViewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(marker.lon, marker.lat),
        point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString(marker.color || '#ffcc00'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
        },
        label: {
            text: marker.callsign || marker.name,
            font: '14px sans-serif',
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -15)
        },
        description: `TAK Marker: ${marker.type || 'Unknown'}`
    });
}

function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback to simple notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = typeof message === 'string' ? message : message.message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeKismetIntegration);
} else {
    initializeKismetIntegration();
}

// Add minimal styles
const style = document.createElement('style');
style.textContent = `
    .integration-status {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        font-size: 12px;
        color: #00ff00;
    }
    
    .cross-app-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .action-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
        transform: translateY(-1px);
    }
    
    .device-integration-actions {
        display: flex;
        gap: 5px;
        margin-left: auto;
    }
    
    .mini-action {
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .mini-action:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.1);
    }
    
    .notification {
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background: rgba(20, 20, 20, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    }
    
    .notification-info {
        border-color: #00d2ff;
        color: #00d2ff;
    }
    
    .notification-success {
        border-color: #00ff00;
        color: #00ff00;
    }
    
    .notification-warning {
        border-color: #ffcc00;
        color: #ffcc00;
    }
    
    .notification-error {
        border-color: #ff4444;
        color: #ff4444;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
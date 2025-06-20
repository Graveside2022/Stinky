// Kismet Control JavaScript
// Handles interactive functionality for the Kismet control page

// Configuration
const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
    start: '/run-script',
    stop: '/stop-script',
    status: '/status'
};

// Status update interval (5 seconds)
const STATUS_UPDATE_INTERVAL = 5000;

// Global variables
let statusInterval = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Kismet Control initialized');
    
    // Start status updates
    updateStatus();
    statusInterval = setInterval(updateStatus, STATUS_UPDATE_INTERVAL);
    
    // Add event listeners for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
});

// Handle page visibility changes
function handleVisibilityChange() {
    if (document.hidden) {
        // Stop updates when page is hidden
        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
        }
    } else {
        // Resume updates when page is visible
        updateStatus();
        statusInterval = setInterval(updateStatus, STATUS_UPDATE_INTERVAL);
    }
}

// Start Kismet
async function startKismet() {
    const button = event.target;
    const originalText = button.textContent;
    
    try {
        // Update button state
        button.disabled = true;
        button.textContent = 'Starting...';
        button.classList.add('loading');
        
        // Make API call
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.start}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Show success message
        showNotification('Kismet started successfully', 'success');
        
        // Update status immediately
        updateStatus();
        
    } catch (error) {
        console.error('Error starting Kismet:', error);
        showNotification('Failed to start Kismet: ' + error.message, 'error');
    } finally {
        // Restore button state
        button.disabled = false;
        button.textContent = originalText;
        button.classList.remove('loading');
    }
}

// Stop Kismet
async function stopKismet() {
    const button = event.target;
    const originalText = button.textContent;
    
    try {
        // Update button state
        button.disabled = true;
        button.textContent = 'Stopping...';
        button.classList.add('loading');
        
        // Make API call
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.stop}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Show success message
        showNotification('Kismet stopped successfully', 'success');
        
        // Update status immediately
        updateStatus();
        
    } catch (error) {
        console.error('Error stopping Kismet:', error);
        showNotification('Failed to stop Kismet: ' + error.message, 'error');
    } finally {
        // Restore button state
        button.disabled = false;
        button.textContent = originalText;
        button.classList.remove('loading');
    }
}

// Update status
async function updateStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.status}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update UI based on status
        updateStatusUI(data);
        
    } catch (error) {
        console.error('Error updating status:', error);
        updateStatusUI({ error: true, message: error.message });
    }
}

// Update status UI elements
function updateStatusUI(statusData) {
    // Update Kismet status
    const kismetStatus = document.getElementById('kismet-status');
    const kismetDot = document.getElementById('kismet-status-dot');
    
    if (kismetStatus && kismetDot) {
        if (statusData.error) {
            kismetStatus.textContent = 'Error';
            kismetDot.className = 'status-dot unknown';
        } else if (statusData.kismet_running) {
            kismetStatus.textContent = 'Running';
            kismetDot.className = 'status-dot active';
        } else {
            kismetStatus.textContent = 'Stopped';
            kismetDot.className = 'status-dot inactive';
        }
    }
    
    // Update WigleToTak status
    const wigleStatus = document.getElementById('wigle-status');
    const wigleDot = document.getElementById('wigle-status-dot');
    
    if (wigleStatus && wigleDot) {
        if (statusData.error) {
            wigleStatus.textContent = 'Error';
            wigleDot.className = 'status-dot unknown';
        } else if (statusData.wigle_running) {
            wigleStatus.textContent = 'Running';
            wigleDot.className = 'status-dot active';
        } else {
            wigleStatus.textContent = 'Stopped';
            wigleDot.className = 'status-dot inactive';
        }
    }
    
    // Update last update time
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
        const now = new Date();
        lastUpdate.textContent = now.toLocaleTimeString();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Set colors based on type
    switch(type) {
        case 'success':
            notification.style.backgroundColor = 'rgba(0, 255, 136, 0.9)';
            notification.style.color = '#030610';
            break;
        case 'error':
            notification.style.backgroundColor = 'rgba(255, 68, 68, 0.9)';
            notification.style.color = '#ffffff';
            break;
        default:
            notification.style.backgroundColor = 'rgba(0, 210, 255, 0.9)';
            notification.style.color = '#030610';
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
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
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .control-button.loading {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Export functions for global use
window.startKismet = startKismet;
window.stopKismet = stopKismet;
window.updateStatus = updateStatus;
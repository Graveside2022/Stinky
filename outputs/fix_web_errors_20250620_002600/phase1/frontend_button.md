# Frontend Start Button Implementation

## HTML Structure

```html
<!-- Start Button Container -->
<div class="start-button-container">
    <button id="startScriptBtn" class="start-button">
        <span class="button-text">Start Script</span>
        <span class="loading-spinner" style="display: none;"></span>
    </button>
    <div class="status-message" id="statusMessage"></div>
</div>
```

## CSS Styling

```css
/* Button Container */
.start-button-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 20px;
}

/* Start Button */
.start-button {
    position: relative;
    padding: 12px 32px;
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    background-color: #28a745;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.start-button:hover:not(:disabled) {
    background-color: #218838;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.start-button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.start-button:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
    opacity: 0.7;
}

/* Loading Spinner */
.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Status Messages */
.status-message {
    font-size: 14px;
    padding: 8px 16px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.3s ease;
    text-align: center;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.status-message.show {
    opacity: 1;
}

.status-message.info {
    background-color: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.status-message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status-message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}
```

## JavaScript Implementation

```javascript
// Button and message element references
const startButton = document.getElementById('startScriptBtn');
const statusMessage = document.getElementById('statusMessage');
const buttonText = startButton.querySelector('.button-text');
const loadingSpinner = startButton.querySelector('.loading-spinner');

// State management
let isScriptRunning = false;
let disableTimeout = null;

// API endpoint configuration
const API_ENDPOINT = '/api/start-script'; // Update with actual endpoint

// Initialize button state
function initializeButton() {
    startButton.addEventListener('click', handleStartClick);
    resetButtonState();
}

// Handle button click
async function handleStartClick() {
    if (isScriptRunning || startButton.disabled) {
        return;
    }

    try {
        // Show starting state
        showStartingState();
        
        // Make API call
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle successful start
        handleSuccess(data);
        
    } catch (error) {
        // Handle errors
        handleError(error);
    }
}

// Show starting state
function showStartingState() {
    isScriptRunning = true;
    startButton.disabled = true;
    buttonText.textContent = 'Starting...';
    loadingSpinner.style.display = 'inline-block';
    
    showStatusMessage('Script starting...', 'info');
}

// Handle successful script start
function handleSuccess(data) {
    buttonText.textContent = 'Started';
    loadingSpinner.style.display = 'none';
    
    showStatusMessage('Script started successfully', 'success');
    
    // Disable button for 60 seconds
    disableButtonFor60Seconds();
}

// Handle errors
function handleError(error) {
    console.error('Failed to start script:', error);
    
    buttonText.textContent = 'Start Script';
    loadingSpinner.style.display = 'none';
    startButton.disabled = false;
    isScriptRunning = false;
    
    const errorMessage = error.message || 'Failed to start script. Please try again.';
    showStatusMessage(errorMessage, 'error');
}

// Disable button for 60 seconds
function disableButtonFor60Seconds() {
    let remainingSeconds = 60;
    
    // Update button text with countdown
    const updateCountdown = () => {
        if (remainingSeconds > 0) {
            buttonText.textContent = `Disabled (${remainingSeconds}s)`;
            remainingSeconds--;
        } else {
            // Re-enable button
            clearInterval(countdownInterval);
            resetButtonState();
        }
    };
    
    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call
    
    // Store timeout reference for cleanup
    disableTimeout = setTimeout(() => {
        clearInterval(countdownInterval);
        resetButtonState();
    }, 60000);
}

// Reset button to initial state
function resetButtonState() {
    startButton.disabled = false;
    buttonText.textContent = 'Start Script';
    loadingSpinner.style.display = 'none';
    isScriptRunning = false;
    
    if (disableTimeout) {
        clearTimeout(disableTimeout);
        disableTimeout = null;
    }
}

// Show status message
function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 5000);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeButton);
} else {
    initializeButton();
}
```

## Integration Points

### Backend API Requirements

The backend endpoint `/api/start-script` should:

1. Accept POST requests with JSON body
2. Return appropriate HTTP status codes:
   - 200: Success
   - 400: Bad request
   - 500: Server error
3. Return JSON response format:
   ```json
   {
       "success": true,
       "message": "Script started successfully",
       "processId": "12345",
       "timestamp": "2025-06-20T00:26:00Z"
   }
   ```

### Error Response Format

```json
{
    "success": false,
    "error": "Failed to start script",
    "details": "Process already running"
}
```

### Integration Example

```javascript
// Example of integrating with existing application
class ScriptManager {
    constructor() {
        this.apiBase = window.API_BASE_URL || '';
    }
    
    async startScript() {
        const endpoint = `${this.apiBase}/api/start-script`;
        return fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.getCSRFToken() // If CSRF protection is needed
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString()
            })
        });
    }
    
    getCSRFToken() {
        // Implementation depends on your CSRF strategy
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }
}
```

## Error Handling States

### Network Errors
- Show user-friendly message: "Network error. Please check your connection."
- Log detailed error to console
- Allow retry after error

### Server Errors (5xx)
- Show message: "Server error. Please try again later."
- Log error details
- Enable retry after 5 seconds

### Client Errors (4xx)
- Show specific error message from server response
- Do not auto-retry
- Log error for debugging

### Timeout Handling
```javascript
// Add timeout to fetch request
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

try {
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        // ... other options
    });
    clearTimeout(timeoutId);
    // ... handle response
} catch (error) {
    if (error.name === 'AbortError') {
        handleError(new Error('Request timeout. Please try again.'));
    } else {
        handleError(error);
    }
}
```

## Testing Considerations

1. **Unit Tests**: Test button state changes, message displays, and timer functionality
2. **Integration Tests**: Test API communication and error scenarios
3. **Manual Testing Checklist**:
   - Button click triggers API call
   - Loading state displays correctly
   - Success message appears and auto-hides
   - 60-second disable period works with countdown
   - Error messages display appropriately
   - Button re-enables after errors
   - Multiple rapid clicks are prevented

## Browser Compatibility

This implementation is compatible with:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

For older browser support, consider adding polyfills for:
- `fetch` API
- `Promise`
- Arrow functions
- Template literals
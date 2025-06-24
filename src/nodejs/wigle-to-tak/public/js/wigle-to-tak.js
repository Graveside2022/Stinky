/**
 * WigleToTAK JavaScript Client
 * Node.js API Integration
 */

class WigleToTAKInterface {
    constructor() {
        this.broadcasting = false;
        this.analysisMode = 'realtime';
        this.selectedFile = null;
        this.currentDirectory = '';
        this.socket = null;
        
        this.initializeSocket();
        this.initializeEventHandlers();
        this.loadInitialState();
    }

    initializeSocket() {
        // Initialize Socket.IO connection
        this.socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        
        // Socket event handlers
        this.socket.on('connect', () => {
            console.log('Connected to WigleToTAK WebSocket');
            this.addLog('✅ Connected to WebSocket');
            // Request initial status
            this.socket.emit('requestStatus');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from WigleToTAK WebSocket');
            this.addLog('❌ Disconnected from WebSocket');
        });
        
        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.addLog(`❌ WebSocket error: ${error.message || error}`);
        });
        
        // Status updates
        this.socket.on('status', (data) => {
            console.log('Received status update:', data);
            this.updateStatusDisplay(data);
            this.broadcasting = data.broadcasting;
        });
        
        // Configuration updates
        this.socket.on('configUpdated', (data) => {
            console.log('Configuration updated:', data);
            this.addLog(`✅ ${data.message}`);
            // Request new status
            this.socket.emit('requestStatus');
        });
        
        this.socket.on('configError', (data) => {
            console.error('Configuration error:', data);
            this.addLog(`❌ ${data.message}`);
        });
        
        // Broadcast events
        this.socket.on('broadcastStarted', (data) => {
            console.log('Broadcast started:', data);
            this.addLog(`✅ ${data.message || 'Broadcast started'}`);
            this.broadcasting = true;
            this.updateBroadcastButtons();
        });
        
        this.socket.on('broadcastStopped', (data) => {
            console.log('Broadcast stopped:', data);
            this.addLog(`✅ ${data.message || 'Broadcast stopped'}`);
            this.broadcasting = false;
            this.updateBroadcastButtons();
        });
        
        this.socket.on('broadcastError', (data) => {
            console.error('Broadcast error:', data);
            this.addLog(`❌ ${data.message}`);
        });
        
        // Message sent events for real-time monitoring
        this.socket.on('messageSent', (data) => {
            console.log('TAK message sent:', data);
            // Update UI to show message was sent
            this.updateMessageCounter(data);
        });
    }

    initializeEventHandlers() {
        // TAK Settings handlers
        document.getElementById('update-tak-settings').addEventListener('click', () => this.updateTakSettings());

        // Antenna Sensitivity handlers
        const antennaTypeSelect = document.getElementById('antenna-type');
        const customSensitivityContainer = document.getElementById('custom-sensitivity-container');
        
        antennaTypeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customSensitivityContainer.classList.remove('hidden');
            } else {
                customSensitivityContainer.classList.add('hidden');
            }
        });

        document.getElementById('update-antenna-settings').addEventListener('click', () => this.updateAntennaSettings());

        // Analysis Mode toggle
        document.getElementById('update-analysis-mode').addEventListener('click', () => this.toggleAnalysisMode());

        // File handling
        document.getElementById('list-files').addEventListener('click', () => this.listFiles());
        document.getElementById('start-broadcast').addEventListener('click', () => this.startBroadcast());
        document.getElementById('stop-broadcast').addEventListener('click', () => this.stopBroadcast());

        // Whitelist/Blacklist handlers
        document.getElementById('add-whitelist').addEventListener('click', () => this.addToWhitelist());
        document.getElementById('remove-whitelist').addEventListener('click', () => this.removeFromWhitelist());
        document.getElementById('add-blacklist').addEventListener('click', () => this.addToBlacklist());
        document.getElementById('remove-blacklist').addEventListener('click', () => this.removeFromBlacklist());

        // File upload handler
        document.getElementById('file-upload').addEventListener('change', (e) => this.handleFileUpload(e));

        // Auto-refresh status
        setInterval(() => this.refreshStatus(), 5000);
    }

    async loadInitialState() {
        await this.refreshStatus();
        await this.loadAntennaSettings();
        await this.loadFilterSettings();
    }

    async refreshStatus() {
        try {
            // Use WebSocket if connected, fallback to REST API
            if (this.socket && this.socket.connected) {
                this.socket.emit('requestStatus');
            } else {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                this.updateStatusDisplay(data);
                this.broadcasting = data.broadcasting;
            }
            
        } catch (error) {
            this.addLog(`❌ Status error: ${error.message}`);
            document.getElementById('status-info').innerHTML = 
                `<span class="error">Service unavailable: ${error.message}</span>`;
        }
    }

    updateStatusDisplay(data) {
        // Update status info
        document.getElementById('status-info').innerHTML = 
            `<span class="success">Service is running</span>`;
        
        // Update configuration display
        document.getElementById('tak-server').textContent = 
            `${data.takServerIp}:${data.takServerPort}`;
        
        document.getElementById('analysis-mode').textContent = data.analysisMode;
        document.getElementById('antenna-sensitivity').textContent = data.antennaSensitivity;
        
        // Update broadcasting status
        const broadcastingElement = document.getElementById('broadcasting-status');
        if (data.broadcasting) {
            broadcastingElement.innerHTML = '<span class="success">Active</span>';
            broadcastingElement.className = 'status-item active';
        } else {
            broadcastingElement.innerHTML = '<span class="warning">Inactive</span>';
            broadcastingElement.className = 'status-item inactive';
        }

        // Update form fields with current values
        document.getElementById('tak-server-ip').value = data.takServerIp || '0.0.0.0';
        document.getElementById('tak-server-port').value = data.takServerPort || '6969';
        document.getElementById('tak-multicast').checked = data.takMulticastState !== false;
    }

    async updateTakSettings() {
        const takServerIp = document.getElementById('tak-server-ip').value;
        const takServerPort = document.getElementById('tak-server-port').value;
        const takMulticast = document.getElementById('tak-multicast').checked;
        
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    takServerIp: takServerIp,
                    takServerPort: parseInt(takServerPort),
                    takMulticastState: takMulticast
                }),
            });

            const data = await response.json();
            this.showMessage(data.message || 'TAK settings updated successfully');
            this.addLog(`✅ TAK settings updated: ${takServerIp}:${takServerPort}`);
            
        } catch (error) {
            this.showMessage(`Error updating TAK settings: ${error.message}`, 'error');
            this.addLog(`❌ TAK settings error: ${error.message}`);
        }
    }

    async loadAntennaSettings() {
        try {
            const response = await fetch('/api/antenna-settings');
            const data = await response.json();
            
            document.getElementById('antenna-type').value = data.currentSensitivity || 'standard';
            document.getElementById('custom-sensitivity').value = data.customFactor || '1.0';
            
            // Show/hide custom container based on current setting
            if (data.currentSensitivity === 'custom') {
                document.getElementById('custom-sensitivity-container').classList.remove('hidden');
            }
            
        } catch (error) {
            this.addLog(`⚠️ Could not load antenna settings: ${error.message}`);
        }
    }

    async updateAntennaSettings() {
        const antennaType = document.getElementById('antenna-type').value;
        const data = {
            antennaSensitivity: antennaType
        };
        
        if (antennaType === 'custom') {
            data.customFactor = parseFloat(document.getElementById('custom-sensitivity').value);
        }
        
        try {
            const response = await fetch('/api/antenna-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            this.showMessage(result.message || 'Antenna settings updated successfully');
            this.addLog(`✅ Antenna sensitivity set to: ${antennaType}`);
            
        } catch (error) {
            this.showMessage(`Error updating antenna settings: ${error.message}`, 'error');
            this.addLog(`❌ Antenna settings error: ${error.message}`);
        }
    }

    toggleAnalysisMode() {
        this.analysisMode = this.analysisMode === 'realtime' ? 'postcollection' : 'realtime';
        const button = document.getElementById('update-analysis-mode');
        button.textContent = this.analysisMode === 'realtime' ? 'Real-time' : 'Post-collection';
        
        // Update server
        fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                analysisMode: this.analysisMode
            }),
        })
        .then(response => response.json())
        .then(data => {
            this.addLog(`🔄 Analysis mode changed to: ${this.analysisMode}`);
        })
        .catch(error => {
            this.addLog(`❌ Analysis mode error: ${error.message}`);
        });
    }

    async listFiles() {
        const directory = document.getElementById('directory').value;
        if (!directory) {
            this.showMessage('Please enter a directory path', 'warning');
            return;
        }

        this.currentDirectory = directory;
        
        try {
            const response = await fetch(`/api/list-files?directory=${encodeURIComponent(directory)}`);
            const data = await response.json();
            
            const fileSelector = document.getElementById('file-selector');
            fileSelector.innerHTML = '';
            
            if (data.files && data.files.length > 0) {
                data.files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = file;
                    option.textContent = file;
                    fileSelector.appendChild(option);
                });
                document.getElementById('start-broadcast').disabled = false;
                this.addLog(`📁 Found ${data.files.length} .wiglecsv files`);
            } else {
                fileSelector.innerHTML = '<option>No .wiglecsv files found</option>';
                document.getElementById('start-broadcast').disabled = true;
                this.addLog(`⚠️ No .wiglecsv files found in ${directory}`);
            }
            
        } catch (error) {
            this.showMessage(`Error listing files: ${error.message}`, 'error');
            this.addLog(`❌ File listing error: ${error.message}`);
        }
    }

    async startBroadcast() {
        this.selectedFile = document.getElementById('file-selector').value;
        if (!this.selectedFile) {
            this.showMessage('Please select a file', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    directory: this.currentDirectory,
                    filename: this.selectedFile
                }),
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('Broadcasting started successfully');
                document.getElementById('stop-broadcast').disabled = false;
                document.getElementById('start-broadcast').disabled = true;
                this.addLog(`🚀 Started broadcasting: ${this.selectedFile}`);
            } else {
                this.showMessage(data.message || 'Failed to start broadcasting', 'error');
                this.addLog(`❌ Broadcast start failed: ${data.message}`);
            }
            
        } catch (error) {
            this.showMessage(`Error starting broadcast: ${error.message}`, 'error');
            this.addLog(`❌ Broadcast start error: ${error.message}`);
        }
    }

    async stopBroadcast() {
        try {
            const response = await fetch('/api/stop', {
                method: 'POST',
            });

            const data = await response.json();
            this.showMessage('Broadcasting stopped');
            document.getElementById('start-broadcast').disabled = false;
            document.getElementById('stop-broadcast').disabled = true;
            this.addLog(`⏹️ Broadcasting stopped`);
            
        } catch (error) {
            this.showMessage(`Error stopping broadcast: ${error.message}`, 'error');
            this.addLog(`❌ Broadcast stop error: ${error.message}`);
        }
    }

    async addToWhitelist() {
        const ssid = document.getElementById('whitelist-ssid').value;
        const mac = document.getElementById('whitelist-mac').value;
        
        if (!ssid && !mac) {
            this.showMessage('Please enter an SSID or MAC address', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ssid: ssid || null, mac: mac || null })
            });

            const data = await response.json();
            this.showMessage(data.message || 'Added to whitelist');
            document.getElementById('whitelist-ssid').value = '';
            document.getElementById('whitelist-mac').value = '';
            this.addLog(`✅ Whitelist added: ${ssid || mac}`);
            
        } catch (error) {
            this.showMessage(`Error adding to whitelist: ${error.message}`, 'error');
            this.addLog(`❌ Whitelist error: ${error.message}`);
        }
    }

    async removeFromWhitelist() {
        const selected = document.getElementById('whitelist-items').value;
        if (!selected) {
            this.showMessage('Please select an item to remove', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/whitelist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: selected })
            });

            const data = await response.json();
            this.showMessage(data.message || 'Removed from whitelist');
            this.loadFilterSettings(); // Refresh the list
            this.addLog(`✅ Whitelist removed: ${selected}`);
            
        } catch (error) {
            this.showMessage(`Error removing from whitelist: ${error.message}`, 'error');
            this.addLog(`❌ Whitelist removal error: ${error.message}`);
        }
    }

    async addToBlacklist() {
        const ssid = document.getElementById('blacklist-ssid').value;
        const mac = document.getElementById('blacklist-mac').value;
        const argb = document.getElementById('blacklist-color').value;
        
        if ((!ssid && !mac) || !argb) {
            this.showMessage('Please enter an SSID or MAC address and an ARGB value', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ssid: ssid || null, 
                    mac: mac || null,
                    argbValue: argb
                })
            });

            const data = await response.json();
            this.showMessage(data.message || 'Added to blacklist');
            document.getElementById('blacklist-ssid').value = '';
            document.getElementById('blacklist-mac').value = '';
            document.getElementById('blacklist-color').value = '';
            this.addLog(`✅ Blacklist added: ${ssid || mac} (color: ${argb})`);
            
        } catch (error) {
            this.showMessage(`Error adding to blacklist: ${error.message}`, 'error');
            this.addLog(`❌ Blacklist error: ${error.message}`);
        }
    }

    async removeFromBlacklist() {
        const selected = document.getElementById('blacklist-items').value;
        if (!selected) {
            this.showMessage('Please select an item to remove', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/blacklist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: selected })
            });

            const data = await response.json();
            this.showMessage(data.message || 'Removed from blacklist');
            this.loadFilterSettings(); // Refresh the list
            this.addLog(`✅ Blacklist removed: ${selected}`);
            
        } catch (error) {
            this.showMessage(`Error removing from blacklist: ${error.message}`, 'error');
            this.addLog(`❌ Blacklist removal error: ${error.message}`);
        }
    }

    async loadFilterSettings() {
        try {
            const response = await fetch('/api/filters');
            const data = await response.json();
            
            // Update whitelist dropdown
            const whitelistSelect = document.getElementById('whitelist-items');
            whitelistSelect.innerHTML = '';
            if (data.whitelist && data.whitelist.length > 0) {
                data.whitelist.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    option.textContent = item;
                    whitelistSelect.appendChild(option);
                });
            }
            
            // Update blacklist dropdown
            const blacklistSelect = document.getElementById('blacklist-items');
            blacklistSelect.innerHTML = '';
            if (data.blacklist && data.blacklist.length > 0) {
                data.blacklist.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    option.textContent = item;
                    blacklistSelect.appendChild(option);
                });
            }
            
        } catch (error) {
            this.addLog(`⚠️ Could not load filter settings: ${error.message}`);
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.wiglecsv')) {
            this.showMessage('Please select a .wiglecsv file', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showMessage('File uploaded successfully');
                this.addLog(`📁 File uploaded: ${file.name}`);
                // Refresh file list if we have a directory set
                if (this.currentDirectory) {
                    this.listFiles();
                }
            } else {
                this.showMessage(data.message || 'File upload failed', 'error');
            }
        })
        .catch(error => {
            this.showMessage(`Upload error: ${error.message}`, 'error');
            this.addLog(`❌ Upload error: ${error.message}`);
        });
    }

    showMessage(message, type = 'success') {
        // Create a temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            max-width: 300px;
            ${type === 'error' ? 'background-color: #f44336; color: white;' : 
              type === 'warning' ? 'background-color: #ff9800; color: white;' : 
              'background-color: #4CAF50; color: white;'}
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    updateBroadcastButtons() {
        const startBtn = document.getElementById('start-broadcast');
        const stopBtn = document.getElementById('stop-broadcast');
        
        if (this.broadcasting) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            startBtn.classList.add('disabled');
            stopBtn.classList.remove('disabled');
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            startBtn.classList.remove('disabled');
            stopBtn.classList.add('disabled');
        }
    }
    
    updateMessageCounter(data) {
        // Update a counter or display to show TAK messages being sent
        const counterElement = document.getElementById('message-counter');
        if (counterElement) {
            const currentCount = parseInt(counterElement.textContent) || 0;
            counterElement.textContent = currentCount + 1;
        }
        
        // Also add to log if not too frequent
        const now = Date.now();
        if (!this.lastMessageLogTime || now - this.lastMessageLogTime > 1000) {
            this.addLog(`📡 TAK message sent: ${data.mac || 'unknown'}`);
            this.lastMessageLogTime = now;
        }
    }

    addLog(message) {
        const logOutput = document.getElementById('log-output');
        if (!logOutput) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;

        // Keep log size manageable
        const logEntries = logOutput.children;
        if (logEntries.length > 100) {
            logOutput.removeChild(logEntries[0]);
        }
    }
}

// Initialize the WigleToTAK interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.wigleToTakInterface = new WigleToTAKInterface();
});
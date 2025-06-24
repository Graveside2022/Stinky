/**
 * HackRF Control Interface Components
 * Provides advanced controls for HackRF spectrum analyzer
 */

class HackRFControls {
    constructor() {
        this.socket = null;
        this.currentConfig = {
            center_freq: 145000000, // 145 MHz default
            samp_rate: 2400000, // 2.4 MHz default
            fft_size: 1024,
            gain: {
                vga: 30,
                lna: 40,
                amp: 0
            }
        };
        this.isRecording = false;
        this.scanMode = 'single';
        this.scanProfiles = {
            'vhf': { start: 136000000, stop: 174000000, name: 'VHF Band' },
            'uhf': { start: 400000000, stop: 470000000, name: 'UHF Band' },
            'cellular': { start: 850000000, stop: 950000000, name: 'Cellular' },
            'ism_2_4': { start: 2400000000, stop: 2500000000, name: '2.4 GHz ISM' },
            'custom': { start: 0, stop: 0, name: 'Custom Range' }
        };
        this.currentProfile = 'vhf';
    }

    initialize(socket) {
        this.socket = socket;
        this.createUI();
        this.setupEventHandlers();
        this.initializeSocketEvents();
        this.requestCurrentConfig();
    }

    createUI() {
        const container = document.createElement('div');
        container.id = 'hackrf-controls';
        container.className = 'hackrf-control-panel';
        container.innerHTML = `
            <!-- Frequency Controls -->
            <div class="control-section" id="frequency-controls">
                <h3>Frequency Control</h3>
                <div class="frequency-display">
                    <span id="current-frequency">145.000</span> MHz
                </div>
                <div class="frequency-input-group">
                    <input type="range" id="freq-slider" min="1" max="6000" step="0.1" value="145">
                    <div class="frequency-buttons">
                        <button class="freq-step" data-step="-10">-10</button>
                        <button class="freq-step" data-step="-1">-1</button>
                        <button class="freq-step" data-step="-0.1">-0.1</button>
                        <button class="freq-step" data-step="0.1">+0.1</button>
                        <button class="freq-step" data-step="1">+1</button>
                        <button class="freq-step" data-step="10">+10</button>
                    </div>
                    <div class="direct-entry">
                        <input type="number" id="freq-direct" placeholder="Enter frequency (MHz)" step="0.001">
                        <button id="freq-set">Set</button>
                    </div>
                </div>
            </div>

            <!-- Gain Controls -->
            <div class="control-section" id="gain-controls">
                <h3>Gain Settings</h3>
                <div class="gain-control">
                    <label>VGA Gain: <span id="vga-value">30</span> dB</label>
                    <input type="range" id="vga-gain" min="0" max="62" step="2" value="30">
                </div>
                <div class="gain-control">
                    <label>LNA Gain: <span id="lna-value">40</span> dB</label>
                    <input type="range" id="lna-gain" min="0" max="40" step="8" value="40">
                </div>
                <div class="gain-control">
                    <label>AMP Enable:</label>
                    <input type="checkbox" id="amp-enable" class="toggle-switch">
                </div>
                <button id="auto-gain" class="control-btn">Auto Gain</button>
            </div>

            <!-- Scan Mode Selector -->
            <div class="control-section" id="scan-mode-selector">
                <h3>Scan Mode</h3>
                <div class="scan-mode-buttons">
                    <button class="scan-mode-btn active" data-mode="single">Single</button>
                    <button class="scan-mode-btn" data-mode="continuous">Continuous</button>
                    <button class="scan-mode-btn" data-mode="sweep">Frequency Sweep</button>
                    <button class="scan-mode-btn" data-mode="hop">Frequency Hop</button>
                </div>
                <div id="scan-settings" class="scan-settings">
                    <!-- Dynamic scan settings based on mode -->
                </div>
            </div>

            <!-- Recording Controls -->
            <div class="control-section" id="recording-controls">
                <h3>Recording</h3>
                <div class="recording-status">
                    <span id="record-status" class="status-indicator">● Not Recording</span>
                    <span id="record-time">00:00:00</span>
                </div>
                <div class="recording-buttons">
                    <button id="record-start" class="control-btn record-btn">
                        <span class="record-icon">●</span> Start Recording
                    </button>
                    <button id="record-stop" class="control-btn" disabled>Stop</button>
                    <button id="record-pause" class="control-btn" disabled>Pause</button>
                </div>
                <div class="recording-options">
                    <label>
                        <input type="checkbox" id="record-waterfall"> Include Waterfall
                    </label>
                    <label>
                        <input type="checkbox" id="record-metadata" checked> Include Metadata
                    </label>
                </div>
                <div class="recording-format">
                    <label>Format:</label>
                    <select id="record-format">
                        <option value="iq">IQ Data (.iq)</option>
                        <option value="wav">WAV Audio (.wav)</option>
                        <option value="complex">Complex Float32 (.cf32)</option>
                    </select>
                </div>
            </div>

            <!-- Device Status -->
            <div class="control-section" id="device-status">
                <h3>Device Status</h3>
                <div class="status-grid">
                    <div class="status-item">
                        <span class="status-label">Connection:</span>
                        <span id="connection-status" class="status-value">Disconnected</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Sample Rate:</span>
                        <span id="sample-rate-status" class="status-value">2.4 MHz</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">FFT Size:</span>
                        <span id="fft-size-status" class="status-value">1024</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Buffer:</span>
                        <span id="buffer-status" class="status-value">0</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Temperature:</span>
                        <span id="temp-status" class="status-value">N/A</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">USB Speed:</span>
                        <span id="usb-status" class="status-value">USB 2.0</span>
                    </div>
                </div>
            </div>

            <!-- Advanced Settings -->
            <div class="control-section collapsed" id="advanced-settings">
                <h3 class="expandable" onclick="hackrfControls.toggleAdvanced()">
                    Advanced Settings <span class="expand-icon">▼</span>
                </h3>
                <div class="advanced-content" style="display: none;">
                    <div class="advanced-control">
                        <label>Sample Rate:</label>
                        <select id="sample-rate">
                            <option value="2000000">2 MHz</option>
                            <option value="2400000" selected>2.4 MHz</option>
                            <option value="5000000">5 MHz</option>
                            <option value="10000000">10 MHz</option>
                            <option value="20000000">20 MHz</option>
                        </select>
                    </div>
                    <div class="advanced-control">
                        <label>FFT Size:</label>
                        <select id="fft-size">
                            <option value="256">256</option>
                            <option value="512">512</option>
                            <option value="1024" selected>1024</option>
                            <option value="2048">2048</option>
                            <option value="4096">4096</option>
                        </select>
                    </div>
                    <div class="advanced-control">
                        <label>Window Function:</label>
                        <select id="window-function">
                            <option value="hamming">Hamming</option>
                            <option value="hanning">Hanning</option>
                            <option value="blackman">Blackman</option>
                            <option value="rectangular">Rectangular</option>
                        </select>
                    </div>
                    <div class="advanced-control">
                        <label>Averaging:</label>
                        <input type="number" id="averaging" min="1" max="100" value="1">
                    </div>
                    <div class="advanced-control">
                        <label>
                            <input type="checkbox" id="bias-tee"> Enable Bias-T
                        </label>
                    </div>
                    <button id="apply-advanced" class="control-btn">Apply Settings</button>
                </div>
            </div>
        `;

        // Find appropriate container or create one
        const targetContainer = document.getElementById('hackrf-control-container') || 
                              document.querySelector('.hackrf-controls') ||
                              document.body;
        
        targetContainer.appendChild(container);
    }

    setupEventHandlers() {
        // Frequency controls
        document.getElementById('freq-slider').addEventListener('input', (e) => {
            this.updateFrequency(parseFloat(e.target.value));
        });

        document.querySelectorAll('.freq-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const step = parseFloat(e.target.dataset.step);
                this.stepFrequency(step);
            });
        });

        document.getElementById('freq-set').addEventListener('click', () => {
            const input = document.getElementById('freq-direct');
            const freq = parseFloat(input.value);
            if (!isNaN(freq) && freq > 0) {
                this.updateFrequency(freq);
                input.value = '';
            }
        });

        // Gain controls
        document.getElementById('vga-gain').addEventListener('input', (e) => {
            this.updateGain('vga', parseInt(e.target.value));
        });

        document.getElementById('lna-gain').addEventListener('input', (e) => {
            this.updateGain('lna', parseInt(e.target.value));
        });

        document.getElementById('amp-enable').addEventListener('change', (e) => {
            this.updateGain('amp', e.target.checked ? 14 : 0);
        });

        document.getElementById('auto-gain').addEventListener('click', () => {
            this.autoGain();
        });

        // Scan mode controls
        document.querySelectorAll('.scan-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setScanMode(e.target.dataset.mode);
            });
        });

        // Recording controls
        document.getElementById('record-start').addEventListener('click', () => {
            this.startRecording();
        });

        document.getElementById('record-stop').addEventListener('click', () => {
            this.stopRecording();
        });

        document.getElementById('record-pause').addEventListener('click', () => {
            this.pauseRecording();
        });

        // Advanced settings
        document.getElementById('apply-advanced').addEventListener('click', () => {
            this.applyAdvancedSettings();
        });
    }

    initializeSocketEvents() {
        if (!this.socket) return;

        this.socket.on('config_update', (config) => {
            this.handleConfigUpdate(config);
        });

        this.socket.on('device_status', (status) => {
            this.updateDeviceStatus(status);
        });

        this.socket.on('recording_status', (status) => {
            this.updateRecordingStatus(status);
        });

        this.socket.on('gain_optimized', (gains) => {
            this.handleAutoGain(gains);
        });
    }

    updateFrequency(freqMHz) {
        const freqHz = freqMHz * 1e6;
        this.currentConfig.center_freq = freqHz;
        
        document.getElementById('current-frequency').textContent = freqMHz.toFixed(3);
        document.getElementById('freq-slider').value = freqMHz;
        
        if (this.socket) {
            this.socket.emit('set_frequency', { frequency: freqHz });
        }
    }

    stepFrequency(step) {
        const currentMHz = this.currentConfig.center_freq / 1e6;
        this.updateFrequency(currentMHz + step);
    }

    updateGain(type, value) {
        this.currentConfig.gain[type] = value;
        
        if (type === 'vga') {
            document.getElementById('vga-value').textContent = value;
        } else if (type === 'lna') {
            document.getElementById('lna-value').textContent = value;
        }
        
        if (this.socket) {
            this.socket.emit('set_gain', this.currentConfig.gain);
        }
    }

    autoGain() {
        if (this.socket) {
            this.socket.emit('auto_gain', {
                center_freq: this.currentConfig.center_freq,
                bandwidth: this.currentConfig.samp_rate
            });
        }
    }

    setScanMode(mode) {
        this.scanMode = mode;
        
        // Update UI
        document.querySelectorAll('.scan-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Update scan settings panel
        this.updateScanSettings(mode);
        
        if (this.socket) {
            this.socket.emit('set_scan_mode', { mode });
        }
    }

    updateScanSettings(mode) {
        const settingsDiv = document.getElementById('scan-settings');
        
        switch(mode) {
            case 'sweep':
                settingsDiv.innerHTML = `
                    <div class="scan-setting">
                        <label>Start Frequency (MHz):</label>
                        <input type="number" id="sweep-start" value="136" step="0.1">
                    </div>
                    <div class="scan-setting">
                        <label>Stop Frequency (MHz):</label>
                        <input type="number" id="sweep-stop" value="174" step="0.1">
                    </div>
                    <div class="scan-setting">
                        <label>Step Size (MHz):</label>
                        <input type="number" id="sweep-step" value="0.1" step="0.01">
                    </div>
                    <div class="scan-setting">
                        <label>Dwell Time (ms):</label>
                        <input type="number" id="sweep-dwell" value="100" step="10">
                    </div>
                `;
                break;
                
            case 'hop':
                settingsDiv.innerHTML = `
                    <div class="scan-setting">
                        <label>Frequency List (MHz, comma-separated):</label>
                        <textarea id="hop-frequencies" rows="3">145.0, 146.52, 147.0, 162.5</textarea>
                    </div>
                    <div class="scan-setting">
                        <label>Hop Interval (ms):</label>
                        <input type="number" id="hop-interval" value="500" step="50">
                    </div>
                `;
                break;
                
            case 'continuous':
                settingsDiv.innerHTML = `
                    <div class="scan-setting">
                        <label>Update Rate (Hz):</label>
                        <input type="number" id="update-rate" value="10" min="1" max="100">
                    </div>
                `;
                break;
                
            default:
                settingsDiv.innerHTML = '';
        }
    }

    startRecording() {
        const format = document.getElementById('record-format').value;
        const includeWaterfall = document.getElementById('record-waterfall').checked;
        const includeMetadata = document.getElementById('record-metadata').checked;
        
        if (this.socket) {
            this.socket.emit('start_recording', {
                format,
                includeWaterfall,
                includeMetadata,
                frequency: this.currentConfig.center_freq,
                sampleRate: this.currentConfig.samp_rate
            });
        }
        
        this.isRecording = true;
        this.updateRecordingUI(true);
        this.startRecordingTimer();
    }

    stopRecording() {
        if (this.socket) {
            this.socket.emit('stop_recording');
        }
        
        this.isRecording = false;
        this.updateRecordingUI(false);
        this.stopRecordingTimer();
    }

    pauseRecording() {
        if (this.socket) {
            this.socket.emit('pause_recording');
        }
    }

    updateRecordingUI(isRecording) {
        const startBtn = document.getElementById('record-start');
        const stopBtn = document.getElementById('record-stop');
        const pauseBtn = document.getElementById('record-pause');
        const status = document.getElementById('record-status');
        
        if (isRecording) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            pauseBtn.disabled = false;
            status.textContent = '● Recording';
            status.style.color = '#ff0000';
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            pauseBtn.disabled = true;
            status.textContent = '● Not Recording';
            status.style.color = '#666';
        }
    }

    startRecordingTimer() {
        let seconds = 0;
        this.recordingTimer = setInterval(() => {
            seconds++;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            const timeStr = [hours, minutes, secs]
                .map(n => n.toString().padStart(2, '0'))
                .join(':');
            
            document.getElementById('record-time').textContent = timeStr;
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
            document.getElementById('record-time').textContent = '00:00:00';
        }
    }

    updateDeviceStatus(status) {
        document.getElementById('connection-status').textContent = 
            status.connected ? 'Connected' : 'Disconnected';
        document.getElementById('connection-status').style.color = 
            status.connected ? '#00ff00' : '#ff0000';
        
        if (status.sample_rate) {
            document.getElementById('sample-rate-status').textContent = 
                `${(status.sample_rate / 1e6).toFixed(1)} MHz`;
        }
        
        if (status.fft_size) {
            document.getElementById('fft-size-status').textContent = status.fft_size;
        }
        
        if (status.buffer_size !== undefined) {
            document.getElementById('buffer-status').textContent = status.buffer_size;
        }
        
        if (status.temperature) {
            document.getElementById('temp-status').textContent = `${status.temperature.toFixed(1)}°C`;
        }
        
        if (status.usb_speed) {
            document.getElementById('usb-status').textContent = status.usb_speed;
        }
    }

    handleConfigUpdate(config) {
        if (config.center_freq) {
            this.currentConfig.center_freq = config.center_freq;
            const freqMHz = config.center_freq / 1e6;
            document.getElementById('current-frequency').textContent = freqMHz.toFixed(3);
            document.getElementById('freq-slider').value = freqMHz;
        }
        
        if (config.gain) {
            this.currentConfig.gain = config.gain;
            if (config.gain.vga !== undefined) {
                document.getElementById('vga-gain').value = config.gain.vga;
                document.getElementById('vga-value').textContent = config.gain.vga;
            }
            if (config.gain.lna !== undefined) {
                document.getElementById('lna-gain').value = config.gain.lna;
                document.getElementById('lna-value').textContent = config.gain.lna;
            }
            if (config.gain.amp !== undefined) {
                document.getElementById('amp-enable').checked = config.gain.amp > 0;
            }
        }
    }

    handleAutoGain(gains) {
        this.currentConfig.gain = gains;
        this.handleConfigUpdate({ gain: gains });
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'gain-notification';
        notification.textContent = `Auto gain set: VGA=${gains.vga}, LNA=${gains.lna}, AMP=${gains.amp}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    toggleAdvanced() {
        const section = document.getElementById('advanced-settings');
        const content = section.querySelector('.advanced-content');
        const icon = section.querySelector('.expand-icon');
        
        section.classList.toggle('collapsed');
        content.style.display = section.classList.contains('collapsed') ? 'none' : 'block';
        icon.textContent = section.classList.contains('collapsed') ? '▼' : '▲';
    }

    applyAdvancedSettings() {
        const settings = {
            samp_rate: parseInt(document.getElementById('sample-rate').value),
            fft_size: parseInt(document.getElementById('fft-size').value),
            window_function: document.getElementById('window-function').value,
            averaging: parseInt(document.getElementById('averaging').value),
            bias_tee: document.getElementById('bias-tee').checked
        };
        
        if (this.socket) {
            this.socket.emit('update_advanced_settings', settings);
        }
        
        // Update local config
        Object.assign(this.currentConfig, settings);
    }

    requestCurrentConfig() {
        if (this.socket) {
            this.socket.emit('get_config');
        }
    }
}

// Create global instance
window.hackrfControls = new HackRFControls();
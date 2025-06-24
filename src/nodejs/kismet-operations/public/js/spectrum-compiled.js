var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * HackRF Spectrum Analyzer TypeScript Client
 * Node.js Socket.IO Integration
 */
class SpectrumAnalyzer {
    constructor() {
        this.socket = io();
        this.currentProfile = 'vhf';
        this.isScanning = false;
        this.isConnected = false;
        this.initializeEventHandlers();
        this.initializeSocketEvents();
    }
    initializeEventHandlers() {
        // Profile button handlers
        document.querySelectorAll('.profile-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const profile = target.dataset.profile;
                if (profile) {
                    this.selectProfile(profile, target);
                }
            });
        });
        // Control button handlers
        const scanBtn = document.getElementById('scan-btn');
        const refreshBtn = document.getElementById('refresh-status');
        const connectBtn = document.getElementById('connect-openwebrx');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.startScan());
        }
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshStatus());
        }
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectToOpenWebRX());
        }
        // Set default profile
        const defaultProfile = document.querySelector('[data-profile="vhf"]');
        if (defaultProfile) {
            defaultProfile.classList.add('active');
        }
        // Initialize on DOM load
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeSpectrumPlot();
            this.refreshStatus();
            // Start periodic status updates
            setInterval(() => this.refreshStatus(), 5000);
        });
    }
    initializeSocketEvents() {
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.addLog('✅ Connected to spectrum analyzer server');
            this.refreshStatus();
        });
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.addLog('❌ Disconnected from spectrum analyzer server');
        });
        this.socket.on('fftData', (data) => {
            this.addLog(`📡 FFT data received: ${data.data.length} bins @ ${(data.center_freq / 1e6).toFixed(3)} MHz`);
            this.updateSpectrumPlot(data);
        });
        this.socket.on('status', (data) => {
            this.addLog(`📊 Status update: OpenWebRX=${data.connected ? 'Connected' : 'Disconnected'}`);
            this.updateStatusDisplay(data);
        });
        this.socket.on('error', (error) => {
            this.addLog(`❌ Socket error: ${error.message}`);
        });
    }
    selectProfile(profile, buttonElement) {
        this.currentProfile = profile;
        document.querySelectorAll('.profile-btn').forEach((b) => b.classList.remove('active'));
        buttonElement.classList.add('active');
        this.addLog(`🎯 Selected profile: ${buttonElement.textContent}`);
    }
    refreshStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/status');
                const status = yield response.json();
                this.updateStatusDisplay(status);
            }
            catch (error) {
                this.addLog(`❌ Status error: ${error.message}`);
            }
        });
    }
    updateStatusDisplay(status) {
        const modeIndicator = document.getElementById('mode-indicator');
        const openWebRXStatus = document.getElementById('openwebrx-status');
        const fftBuffer = document.getElementById('fft-buffer');
        const centerFreq = document.getElementById('center-freq');
        const sampleRate = document.getElementById('sample-rate');
        // Update mode indicator
        if (modeIndicator) {
            if (status.connected && status.buffer_size > 0) {
                modeIndicator.textContent = 'REAL DATA MODE - Live HackRF Data';
                modeIndicator.className = 'mode-indicator real-data-mode';
            }
            else {
                modeIndicator.textContent = 'DEMO MODE - No real data';
                modeIndicator.className = 'mode-indicator demo-mode';
            }
        }
        // Update status details
        if (openWebRXStatus) {
            openWebRXStatus.textContent = status.connected ? 'Connected ✅' : 'Disconnected ❌';
            openWebRXStatus.style.color = status.connected ? '#0f0' : '#f44';
        }
        if (fftBuffer) {
            fftBuffer.textContent = String(status.buffer_size || 0);
        }
        if (status.config && status.config.center_freq) {
            if (centerFreq) {
                centerFreq.textContent = `${(status.config.center_freq / 1e6).toFixed(3)} MHz`;
            }
            if (sampleRate) {
                sampleRate.textContent = `${(status.config.samp_rate / 1e6).toFixed(3)} MHz`;
            }
        }
        else {
            if (centerFreq)
                centerFreq.textContent = 'N/A';
            if (sampleRate)
                sampleRate.textContent = 'N/A';
        }
    }
    startScan() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isScanning)
                return;
            this.isScanning = true;
            const scanBtn = document.getElementById('scan-btn');
            const loadingDiv = document.getElementById('loading');
            if (scanBtn)
                scanBtn.disabled = true;
            if (loadingDiv)
                loadingDiv.style.display = 'block';
            this.addLog(`🔍 Starting scan with profile: ${this.currentProfile}`);
            try {
                const response = yield fetch(`/api/signals?profile=${this.currentProfile}`);
                const result = yield response.json();
                this.displaySignals(result.signals || [], result.real_data || false);
                this.addLog(`✅ Scan complete: Found ${(result.signals || []).length} signals (${result.real_data ? 'REAL' : 'DEMO'} data)`);
            }
            catch (error) {
                this.addLog(`❌ Scan error: ${error.message}`);
                const container = document.getElementById('signals-container');
                if (container) {
                    container.innerHTML = '<div class="error">Scan failed</div>';
                }
            }
            finally {
                this.isScanning = false;
                if (scanBtn)
                    scanBtn.disabled = false;
                if (loadingDiv)
                    loadingDiv.style.display = 'none';
            }
        });
    }
    connectToOpenWebRX() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/connect', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: `ws://${window.location.hostname}:8073/ws`,
                    }),
                });
                const result = yield response.json();
                this.addLog(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
            }
            catch (error) {
                this.addLog(`❌ Connection error: ${error.message}`);
            }
        });
    }
    displaySignals(signals, realData) {
        const container = document.getElementById('signals-container');
        if (!container)
            return;
        if (signals.length === 0) {
            container.innerHTML = '<p>No signals detected in current frequency range</p>';
            return;
        }
        let html = '';
        signals.forEach((signal) => {
            const isDemo = signal.type === 'demo' || !realData;
            html += `
        <div class="signal-item ${isDemo ? 'demo' : 'real'}">
          <div>
            <div class="frequency">${signal.frequency} MHz ${isDemo ? '(DEMO)' : '(REAL)'}</div>
            <div class="signal-details">
              Signal Strength: ${signal.power || signal.strength} dB | 
              Bin: ${signal.bin || 'N/A'} | 
              Confidence: ${((signal.confidence || 0.8) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      `;
        });
        container.innerHTML = html;
    }
    initializeSpectrumPlot() {
        const layout = {
            title: 'Real-time Spectrum',
            xaxis: { title: 'Frequency (MHz)', color: '#0f0' },
            yaxis: { title: 'Power (dB)', color: '#0f0' },
            paper_bgcolor: '#000',
            plot_bgcolor: '#111',
            font: { color: '#0f0' },
            margin: { t: 50, r: 30, b: 50, l: 50 },
        };
        const data = [
            {
                x: [],
                y: [],
                type: 'scatter',
                mode: 'lines',
                line: { color: '#0f0', width: 2 },
                name: 'Spectrum',
            },
        ];
        Plotly.newPlot('spectrum-plot', data, layout, { responsive: true });
    }
    updateSpectrumPlot(fftData) {
        if (!fftData.data || fftData.data.length === 0)
            return;
        const centerFreq = fftData.center_freq / 1e6; // MHz
        const sampleRate = fftData.samp_rate / 1e6; // MHz
        const numBins = fftData.data.length;
        const freqs = [];
        const powers = fftData.data;
        for (let i = 0; i < numBins; i++) {
            const freq = centerFreq - sampleRate / 2 + (i * sampleRate) / numBins;
            freqs.push(freq);
        }
        const update = {
            x: [freqs],
            y: [powers],
        };
        Plotly.restyle('spectrum-plot', update, 0);
    }
    addLog(message) {
        const logOutput = document.getElementById('log-output');
        if (!logOutput)
            return;
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
// Initialize the spectrum analyzer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.spectrumAnalyzer = new SpectrumAnalyzer();
});

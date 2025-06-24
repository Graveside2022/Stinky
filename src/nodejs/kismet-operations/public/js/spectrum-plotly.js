/**
 * Spectrum Visualization using Plotly.js
 * High-performance real-time FFT visualization with WebSocket integration
 */

class SpectrumPlotly {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.socket = null;
        
        // Configuration
        this.config = {
            width: options.width || this.container.clientWidth,
            height: options.height || 400,
            updateRate: options.updateRate || 30, // FPS
            colorScale: options.colorScale || 'Viridis',
            showWaterfall: options.showWaterfall || true,
            waterfallHeight: options.waterfallHeight || 200,
            showPeaks: options.showPeaks || true,
            peakHoldTime: options.peakHoldTime || 3000, // ms
            gridColor: options.gridColor || '#333',
            backgroundColor: options.backgroundColor || '#1a1a1a',
            lineColor: options.lineColor || '#00ff00',
            peakColor: options.peakColor || '#ff0000',
            ...options
        };
        
        // State
        this.isConnected = false;
        this.isStreaming = false;
        this.currentData = null;
        this.peakData = null;
        this.peakTimestamps = null;
        this.waterfallData = [];
        this.maxWaterfallRows = 100;
        
        // Performance optimization
        this.frameSkip = 0;
        this.maxFrameSkip = Math.floor(60 / this.config.updateRate);
        this.lastUpdateTime = 0;
        this.updateThrottle = 1000 / this.config.updateRate;
        
        // Statistics
        this.stats = {
            framesReceived: 0,
            framesRendered: 0,
            averageFPS: 0,
            latency: 0
        };
        
        // Initialize plots
        this.initializePlots();
        
        // Bind methods
        this.handleFFTBatch = this.handleFFTBatch.bind(this);
        this.updatePlots = this.updatePlots.bind(this);
        this.animate = this.animate.bind(this);
    }
    
    /**
     * Initialize Plotly plots
     */
    initializePlots() {
        // Create container structure
        this.container.innerHTML = `
            <div id="${this.container.id}-spectrum" style="width: 100%; height: ${this.config.height}px;"></div>
            ${this.config.showWaterfall ? `<div id="${this.container.id}-waterfall" style="width: 100%; height: ${this.config.waterfallHeight}px;"></div>` : ''}
            <div id="${this.container.id}-stats" class="spectrum-stats"></div>
        `;
        
        this.spectrumDiv = document.getElementById(`${this.container.id}-spectrum`);
        this.waterfallDiv = this.config.showWaterfall ? document.getElementById(`${this.container.id}-waterfall`) : null;
        this.statsDiv = document.getElementById(`${this.container.id}-stats`);
        
        // Initialize spectrum plot
        this.initializeSpectrumPlot();
        
        // Initialize waterfall plot if enabled
        if (this.config.showWaterfall) {
            this.initializeWaterfallPlot();
        }
        
        // Start animation loop
        this.animate();
    }
    
    /**
     * Initialize spectrum line plot
     */
    initializeSpectrumPlot() {
        const data = [
            {
                x: [],
                y: [],
                type: 'scatter',
                mode: 'lines',
                name: 'Spectrum',
                line: {
                    color: this.config.lineColor,
                    width: 2
                }
            }
        ];
        
        // Add peak hold trace if enabled
        if (this.config.showPeaks) {
            data.push({
                x: [],
                y: [],
                type: 'scatter',
                mode: 'lines',
                name: 'Peak Hold',
                line: {
                    color: this.config.peakColor,
                    width: 1,
                    dash: 'dot'
                }
            });
        }
        
        const layout = {
            title: {
                text: 'Spectrum Analyzer',
                font: { color: '#fff' }
            },
            xaxis: {
                title: 'Frequency (MHz)',
                color: '#fff',
                gridcolor: this.config.gridColor,
                zerolinecolor: this.config.gridColor
            },
            yaxis: {
                title: 'Power (dBm)',
                color: '#fff',
                gridcolor: this.config.gridColor,
                zerolinecolor: this.config.gridColor,
                range: [-120, -20]
            },
            paper_bgcolor: this.config.backgroundColor,
            plot_bgcolor: this.config.backgroundColor,
            margin: { t: 40, r: 20, b: 40, l: 60 },
            showlegend: false
        };
        
        const config = {
            responsive: true,
            displayModeBar: false,
            staticPlot: false
        };
        
        Plotly.newPlot(this.spectrumDiv, data, layout, config);
    }
    
    /**
     * Initialize waterfall plot
     */
    initializeWaterfallPlot() {
        const data = [{
            z: [[]],
            type: 'heatmap',
            colorscale: this.config.colorScale,
            showscale: false,
            hoverinfo: 'skip'
        }];
        
        const layout = {
            xaxis: {
                title: 'Frequency (MHz)',
                color: '#fff',
                gridcolor: this.config.gridColor
            },
            yaxis: {
                title: 'Time',
                color: '#fff',
                gridcolor: this.config.gridColor,
                showticklabels: false
            },
            paper_bgcolor: this.config.backgroundColor,
            plot_bgcolor: this.config.backgroundColor,
            margin: { t: 10, r: 20, b: 40, l: 60 }
        };
        
        const config = {
            responsive: true,
            displayModeBar: false,
            staticPlot: true
        };
        
        Plotly.newPlot(this.waterfallDiv, data, layout, config);
    }
    
    /**
     * Connect to WebSocket server
     */
    connect(url = '') {
        if (this.socket && this.socket.connected) {
            return;
        }
        
        this.socket = io(url);
        
        // Socket event handlers
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.onConnect();
        });
        
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.onDisconnect();
        });
        
        this.socket.on('fftBatch', this.handleFFTBatch);
        
        this.socket.on('fftConfig', (config) => {
            this.onConfigUpdate(config);
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }
    
    /**
     * Handle connection established
     */
    onConnect() {
        console.log('Connected to spectrum server');
        this.isStreaming = true;
        
        // Subscribe to FFT data
        this.socket.emit('subscribe', {
            channels: ['fft']
        });
    }
    
    /**
     * Handle disconnection
     */
    onDisconnect() {
        console.log('Disconnected from spectrum server');
        this.isStreaming = false;
    }
    
    /**
     * Handle FFT batch data
     */
    handleFFTBatch(batch) {
        this.stats.framesReceived++;
        
        // Process batched FFT data
        if (batch.batches && batch.batches.length > 0) {
            batch.batches.forEach(b => {
                if (b.type === 'fft' && b.messages) {
                    // Use the latest message in the batch
                    const latestMessage = b.messages[b.messages.length - 1];
                    this.processFFTData(latestMessage.data);
                }
            });
        }
    }
    
    /**
     * Process FFT data
     */
    processFFTData(data) {
        if (!data || !data.data || data.data.length === 0) {
            return;
        }
        
        // Store current data
        this.currentData = data;
        
        // Update peak hold
        if (this.config.showPeaks) {
            this.updatePeakHold(data);
        }
        
        // Update waterfall
        if (this.config.showWaterfall) {
            this.updateWaterfall(data);
        }
        
        // Calculate latency
        if (data.timestamp) {
            this.stats.latency = Date.now() - data.timestamp;
        }
    }
    
    /**
     * Update peak hold data
     */
    updatePeakHold(data) {
        const now = Date.now();
        
        if (!this.peakData || this.peakData.length !== data.data.length) {
            this.peakData = [...data.data];
            this.peakTimestamps = new Array(data.data.length).fill(now);
            return;
        }
        
        // Update peaks
        for (let i = 0; i < data.data.length; i++) {
            if (data.data[i] > this.peakData[i]) {
                this.peakData[i] = data.data[i];
                this.peakTimestamps[i] = now;
            } else if (now - this.peakTimestamps[i] > this.config.peakHoldTime) {
                // Decay old peaks
                this.peakData[i] = data.data[i];
                this.peakTimestamps[i] = now;
            }
        }
    }
    
    /**
     * Update waterfall data
     */
    updateWaterfall(data) {
        // Add new row
        this.waterfallData.unshift(data.data);
        
        // Limit waterfall size
        if (this.waterfallData.length > this.maxWaterfallRows) {
            this.waterfallData = this.waterfallData.slice(0, this.maxWaterfallRows);
        }
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate);
        
        // Throttle updates
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateThrottle) {
            return;
        }
        
        // Skip frames if needed
        this.frameSkip++;
        if (this.frameSkip < this.maxFrameSkip) {
            return;
        }
        
        this.frameSkip = 0;
        this.lastUpdateTime = now;
        
        // Update plots
        this.updatePlots();
        
        // Update stats
        this.updateStats();
    }
    
    /**
     * Update plots with current data
     */
    updatePlots() {
        if (!this.currentData || !this.isStreaming) {
            return;
        }
        
        const data = this.currentData;
        
        // Generate frequency axis
        const freqs = this.generateFrequencyAxis(data);
        
        // Update spectrum plot
        const update = {
            x: [freqs],
            y: [data.data]
        };
        
        const traceIndices = [0];
        
        // Add peak data if enabled
        if (this.config.showPeaks && this.peakData) {
            update.x.push(freqs);
            update.y.push(this.peakData);
            traceIndices.push(1);
        }
        
        Plotly.update(this.spectrumDiv, update, {}, traceIndices);
        
        // Update waterfall if enabled
        if (this.config.showWaterfall && this.waterfallData.length > 0) {
            Plotly.update(this.waterfallDiv, {
                z: [this.waterfallData],
                x: [freqs]
            }, {}, [0]);
        }
        
        this.stats.framesRendered++;
    }
    
    /**
     * Generate frequency axis
     */
    generateFrequencyAxis(data) {
        if (!data.centerFreq || !data.sampleRate || !data.data) {
            return [];
        }
        
        const numBins = data.data.length;
        const binWidth = data.sampleRate / numBins;
        const startFreq = data.centerFreq - data.sampleRate / 2;
        
        const freqs = new Array(numBins);
        for (let i = 0; i < numBins; i++) {
            freqs[i] = (startFreq + i * binWidth) / 1e6; // Convert to MHz
        }
        
        return freqs;
    }
    
    /**
     * Update statistics display
     */
    updateStats() {
        // Calculate FPS
        const fps = this.stats.framesRendered / (Date.now() / 1000);
        this.stats.averageFPS = Math.round(fps);
        
        // Update stats display
        if (this.statsDiv) {
            this.statsDiv.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">FPS:</span>
                    <span class="stat-value">${this.stats.averageFPS}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Latency:</span>
                    <span class="stat-value">${this.stats.latency}ms</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mode:</span>
                    <span class="stat-value">${this.currentData?.mode || 'N/A'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Frames:</span>
                    <span class="stat-value">${this.stats.framesReceived}</span>
                </div>
            `;
        }
    }
    
    /**
     * Handle configuration updates
     */
    onConfigUpdate(config) {
        console.log('Configuration updated:', config);
        
        // Update local config if needed
        if (config.streamingRate) {
            this.config.updateRate = config.streamingRate;
            this.updateThrottle = 1000 / this.config.updateRate;
            this.maxFrameSkip = Math.floor(60 / this.config.updateRate);
        }
    }
    
    /**
     * Set performance mode
     */
    setPerformanceMode(mode) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('updateConfig', {
                performanceMode: mode
            });
        }
    }
    
    /**
     * Toggle demo mode
     */
    toggleDemoMode(enabled) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('updateConfig', {
                demoMode: enabled
            });
        }
    }
    
    /**
     * Clear displays
     */
    clear() {
        this.currentData = null;
        this.peakData = null;
        this.waterfallData = [];
        
        // Clear plots
        Plotly.purge(this.spectrumDiv);
        if (this.waterfallDiv) {
            Plotly.purge(this.waterfallDiv);
        }
        
        // Reinitialize
        this.initializePlots();
    }
    
    /**
     * Destroy the visualization
     */
    destroy() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        Plotly.purge(this.spectrumDiv);
        if (this.waterfallDiv) {
            Plotly.purge(this.waterfallDiv);
        }
        
        this.container.innerHTML = '';
    }
    
    /**
     * Export current plot as image
     */
    async exportImage(format = 'png') {
        return await Plotly.toImage(this.spectrumDiv, {
            format: format,
            width: this.config.width,
            height: this.config.height
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpectrumPlotly;
}
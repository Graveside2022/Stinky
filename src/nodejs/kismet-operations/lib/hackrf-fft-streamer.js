/**
 * HackRF FFT Data Streaming Service
 * High-performance real-time FFT data streaming with demo mode support
 */

const EventEmitter = require('events');
const WebSocketBatcher = require('./websocket-batcher');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: 'HackRF-FFT-Streamer' }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

class HackRFFftStreamer extends EventEmitter {
    constructor(spectrumAnalyzer, options = {}) {
        super();
        
        this.spectrum = spectrumAnalyzer;
        this.logger = logger;
        
        // Configuration
        this.config = {
            streamingRate: options.streamingRate || 30, // Hz (30 FPS default)
            maxClients: options.maxClients || 100,
            bufferSize: options.bufferSize || 60, // Keep last 60 frames
            demoMode: options.demoMode || false,
            compression: options.compression || true,
            adaptiveSampling: options.adaptiveSampling || true,
            performanceMode: options.performanceMode || 'balanced', // 'performance', 'balanced', 'quality'
            ...options
        };
        
        // Performance settings based on mode
        this.performanceProfiles = {
            performance: {
                decimation: 4,
                streamingRate: 15,
                compression: true,
                batchSize: 10
            },
            balanced: {
                decimation: 2,
                streamingRate: 30,
                compression: true,
                batchSize: 5
            },
            quality: {
                decimation: 1,
                streamingRate: 60,
                compression: false,
                batchSize: 1
            }
        };
        
        // Apply performance profile
        this.applyPerformanceProfile(this.config.performanceMode);
        
        // WebSocket batcher for optimized data transmission
        this.batcher = new WebSocketBatcher({
            batchSize: this.config.batchSize || 5,
            batchInterval: 1000 / this.config.streamingRate,
            maxQueueSize: 500,
            compressionThreshold: 512
        });
        
        // Client management
        this.clients = new Map();
        this.streamingInterval = null;
        
        // Performance monitoring
        this.stats = {
            framesStreamed: 0,
            bytesTransmitted: 0,
            clientsConnected: 0,
            droppedFrames: 0,
            averageLatency: 0,
            cpuUsage: 0,
            memoryUsage: 0
        };
        
        // Demo mode data generator
        this.demoDataGenerator = new DemoDataGenerator();
        
        // Initialize event handlers
        this.initializeHandlers();
        
        this.logger.info('HackRF FFT Streamer initialized', {
            config: this.config,
            performanceMode: this.config.performanceMode
        });
    }
    
    /**
     * Apply performance profile settings
     */
    applyPerformanceProfile(mode) {
        const profile = this.performanceProfiles[mode];
        if (profile) {
            Object.assign(this.config, profile);
            this.logger.info('Applied performance profile', { mode, profile });
        }
    }
    
    /**
     * Initialize event handlers
     */
    initializeHandlers() {
        // Handle spectrum analyzer events
        if (this.spectrum) {
            this.spectrum.on('fftData', (data) => {
                if (!this.config.demoMode) {
                    this.handleFFTData(data);
                }
            });
            
            this.spectrum.on('signalsDetected', (data) => {
                this.emit('signalsDetected', data);
            });
        }
        
        // Handle batcher events
        this.batcher.on('batch', (batch) => {
            this.broadcastBatch(batch);
        });
        
        this.batcher.on('backpressure', (info) => {
            this.logger.warn('Backpressure detected', info);
            this.handleBackpressure();
        });
    }
    
    /**
     * Start streaming FFT data
     */
    startStreaming() {
        if (this.streamingInterval) {
            return;
        }
        
        const interval = 1000 / this.config.streamingRate;
        
        this.streamingInterval = setInterval(() => {
            if (this.config.demoMode) {
                // Generate and stream demo data
                const demoData = this.demoDataGenerator.generateFFTData();
                this.handleFFTData(demoData);
            }
            
            // Update performance stats
            this.updatePerformanceStats();
            
        }, interval);
        
        this.logger.info('FFT streaming started', {
            rate: this.config.streamingRate,
            mode: this.config.demoMode ? 'demo' : 'real'
        });
    }
    
    /**
     * Stop streaming FFT data
     */
    stopStreaming() {
        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
            this.streamingInterval = null;
            this.logger.info('FFT streaming stopped');
        }
    }
    
    /**
     * Handle incoming FFT data
     */
    handleFFTData(fftData) {
        // Apply decimation for performance
        const processedData = this.processFFTData(fftData);
        
        // Add to batcher
        this.batcher.addMessage('fft', processedData, {
            priority: this.calculatePriority(processedData)
        });
        
        // Update stats
        this.stats.framesStreamed++;
        
        // Emit for local processing
        this.emit('fftProcessed', processedData);
    }
    
    /**
     * Process FFT data for optimal transmission
     */
    processFFTData(fftData) {
        const decimation = this.config.decimation || 1;
        
        // Decimate data if needed
        let processedData = fftData.data;
        if (decimation > 1 && processedData.length > 512) {
            processedData = this.decimateArray(processedData, decimation);
        }
        
        // Calculate statistics for adaptive streaming
        const stats = this.calculateFFTStats(processedData);
        
        return {
            timestamp: fftData.timestamp,
            centerFreq: fftData.center_freq,
            sampleRate: fftData.samp_rate,
            data: processedData,
            stats: stats,
            decimation: decimation,
            mode: this.config.demoMode ? 'demo' : 'real'
        };
    }
    
    /**
     * Decimate array for performance
     */
    decimateArray(arr, factor) {
        const result = [];
        for (let i = 0; i < arr.length; i += factor) {
            // Take maximum value in window (peak-hold decimation)
            let max = arr[i];
            for (let j = 1; j < factor && i + j < arr.length; j++) {
                max = Math.max(max, arr[i + j]);
            }
            result.push(max);
        }
        return result;
    }
    
    /**
     * Calculate FFT statistics
     */
    calculateFFTStats(data) {
        if (!data || data.length === 0) {
            return { min: 0, max: 0, mean: 0, peak: 0 };
        }
        
        let min = data[0];
        let max = data[0];
        let sum = 0;
        let peakIndex = 0;
        
        for (let i = 0; i < data.length; i++) {
            const val = data[i];
            sum += val;
            if (val < min) min = val;
            if (val > max) {
                max = val;
                peakIndex = i;
            }
        }
        
        return {
            min: min,
            max: max,
            mean: sum / data.length,
            peak: max,
            peakIndex: peakIndex
        };
    }
    
    /**
     * Calculate message priority
     */
    calculatePriority(data) {
        // Higher priority for frames with strong signals
        if (data.stats && data.stats.peak > -50) {
            return 5;
        }
        return 0;
    }
    
    /**
     * Handle backpressure by reducing data rate
     */
    handleBackpressure() {
        // Temporarily increase decimation
        this.config.decimation = Math.min(this.config.decimation * 2, 8);
        
        // Schedule recovery
        setTimeout(() => {
            const profile = this.performanceProfiles[this.config.performanceMode];
            this.config.decimation = profile.decimation;
        }, 5000);
    }
    
    /**
     * Add WebSocket client
     */
    addClient(clientId, socket) {
        this.clients.set(clientId, {
            id: clientId,
            socket: socket,
            connectedAt: Date.now(),
            preferences: {
                decimation: 1,
                compression: true
            }
        });
        
        this.stats.clientsConnected = this.clients.size;
        
        // Start streaming if first client
        if (this.clients.size === 1) {
            this.startStreaming();
        }
        
        // Send initial configuration
        socket.emit('fftConfig', {
            streamingRate: this.config.streamingRate,
            decimation: this.config.decimation,
            mode: this.config.demoMode ? 'demo' : 'real',
            performanceMode: this.config.performanceMode
        });
        
        this.logger.info('Client connected', {
            clientId,
            totalClients: this.clients.size
        });
    }
    
    /**
     * Remove WebSocket client
     */
    removeClient(clientId) {
        this.clients.delete(clientId);
        this.stats.clientsConnected = this.clients.size;
        
        // Stop streaming if no clients
        if (this.clients.size === 0) {
            this.stopStreaming();
        }
        
        this.logger.info('Client disconnected', {
            clientId,
            totalClients: this.clients.size
        });
    }
    
    /**
     * Broadcast batch to all clients
     */
    broadcastBatch(batch) {
        const message = {
            type: 'fftBatch',
            ...batch
        };
        
        this.clients.forEach((client) => {
            try {
                client.socket.emit('fftBatch', message);
                this.stats.bytesTransmitted += batch.data.length;
            } catch (error) {
                this.logger.error('Failed to send to client', {
                    clientId: client.id,
                    error: error.message
                });
            }
        });
    }
    
    /**
     * Update performance statistics
     */
    updatePerformanceStats() {
        // Simple performance metrics
        const usage = process.cpuUsage();
        const mem = process.memoryUsage();
        
        this.stats.cpuUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
        this.stats.memoryUsage = mem.heapUsed / 1024 / 1024; // Convert to MB
        
        // Calculate average latency (simplified)
        this.stats.averageLatency = this.batcher.getQueueSize() * (1000 / this.config.streamingRate);
    }
    
    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            ...this.batcher.getStats(),
            config: {
                streamingRate: this.config.streamingRate,
                performanceMode: this.config.performanceMode,
                decimation: this.config.decimation,
                demoMode: this.config.demoMode
            }
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        
        // Update config
        Object.assign(this.config, newConfig);
        
        // Apply performance profile if changed
        if (newConfig.performanceMode && newConfig.performanceMode !== oldConfig.performanceMode) {
            this.applyPerformanceProfile(newConfig.performanceMode);
        }
        
        // Restart streaming if rate changed
        if (newConfig.streamingRate && newConfig.streamingRate !== oldConfig.streamingRate) {
            this.stopStreaming();
            this.startStreaming();
        }
        
        // Notify clients of config change
        this.clients.forEach((client) => {
            client.socket.emit('configUpdate', this.config);
        });
        
        this.logger.info('Configuration updated', { oldConfig, newConfig: this.config });
    }
    
    /**
     * Destroy the streamer
     */
    destroy() {
        this.stopStreaming();
        this.batcher.destroy();
        this.clients.clear();
        this.removeAllListeners();
        this.logger.info('FFT Streamer destroyed');
    }
}

/**
 * Demo Data Generator for testing
 */
class DemoDataGenerator {
    constructor() {
        this.time = 0;
        this.signalFreqs = [
            { freq: 0.1, amp: -60, width: 0.02 },
            { freq: 0.3, amp: -55, width: 0.03 },
            { freq: 0.7, amp: -65, width: 0.025 },
            { freq: 0.85, amp: -58, width: 0.04 }
        ];
    }
    
    generateFFTData() {
        const fftSize = 1024;
        const data = new Array(fftSize);
        const noiseFloor = -90;
        
        // Generate noise floor
        for (let i = 0; i < fftSize; i++) {
            data[i] = noiseFloor + (Math.random() - 0.5) * 5;
        }
        
        // Add signals with movement
        this.signalFreqs.forEach((signal, idx) => {
            // Animate frequency slightly
            const freqOffset = Math.sin(this.time * 0.1 + idx) * 0.02;
            const centerBin = Math.floor((signal.freq + freqOffset) * fftSize);
            const width = Math.floor(signal.width * fftSize);
            
            // Add Gaussian-shaped signal
            for (let i = -width; i <= width; i++) {
                const bin = centerBin + i;
                if (bin >= 0 && bin < fftSize) {
                    const gaussian = Math.exp(-(i * i) / (width * width / 4));
                    data[bin] = Math.max(data[bin], signal.amp * gaussian);
                }
            }
        });
        
        this.time += 0.1;
        
        return {
            timestamp: Date.now(),
            center_freq: 145000000,
            samp_rate: 2400000,
            data: data,
            buffer_length: fftSize * 4
        };
    }
}

module.exports = HackRFFftStreamer;
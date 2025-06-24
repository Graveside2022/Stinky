/**
 * HackRF Integration Module
 * Integrates HackRF FFT streaming into the main server
 */

const HackRFWebSocketHandler = require('./hackrf-websocket-handler');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: 'HackRF-Integration' }),
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

/**
 * Initialize HackRF integration
 * @param {Object} app - Express app instance
 * @param {Object} io - Socket.IO instance
 * @param {Object} spectrumAnalyzer - SpectrumAnalyzer instance
 * @returns {Object} Integration handler
 */
function initializeHackRFIntegration(app, io, spectrumAnalyzer) {
    logger.info('Initializing HackRF integration...');
    
    // Create WebSocket handler
    const hackrfHandler = new HackRFWebSocketHandler(io, spectrumAnalyzer, {
        namespace: '/hackrf',
        maxClientsPerRoom: 50,
        rooms: ['spectrum', 'signals', 'waterfall']
    });
    
    // Add HTTP routes for HackRF
    setupRoutes(app, hackrfHandler, spectrumAnalyzer);
    
    // Add middleware for HackRF pages
    app.use('/hackrf', (req, res, next) => {
        res.locals.hackrfEnabled = true;
        res.locals.hackrfStatus = hackrfHandler.getStatus();
        next();
    });
    
    logger.info('HackRF integration initialized successfully');
    
    return {
        handler: hackrfHandler,
        
        /**
         * Get current status
         */
        getStatus: () => hackrfHandler.getStatus(),
        
        /**
         * Update configuration
         */
        updateConfig: (config) => {
            hackrfHandler.fftStreamer.updateConfig(config);
        },
        
        /**
         * Connect to OpenWebRX
         */
        connectToOpenWebRX: async (url) => {
            if (spectrumAnalyzer) {
                await spectrumAnalyzer.connectToOpenWebRX(url);
            }
        },
        
        /**
         * Shutdown integration
         */
        shutdown: () => {
            logger.info('Shutting down HackRF integration...');
            hackrfHandler.shutdown();
        }
    };
}

/**
 * Setup HTTP routes for HackRF
 */
function setupRoutes(app, handler, spectrumAnalyzer) {
    // Get HackRF status
    app.get('/api/hackrf/status', (req, res) => {
        try {
            const status = handler.getStatus();
            res.json({
                success: true,
                ...status,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error getting HackRF status:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // Update HackRF configuration
    app.post('/api/hackrf/config', (req, res) => {
        try {
            const { 
                performanceMode, 
                streamingRate, 
                decimation,
                compression,
                demoMode 
            } = req.body;
            
            const updates = {};
            
            // Validate inputs
            if (performanceMode && ['performance', 'balanced', 'quality'].includes(performanceMode)) {
                updates.performanceMode = performanceMode;
            }
            
            if (streamingRate && streamingRate >= 1 && streamingRate <= 120) {
                updates.streamingRate = streamingRate;
            }
            
            if (decimation !== undefined && decimation >= 1 && decimation <= 8) {
                updates.decimation = decimation;
            }
            
            if (compression !== undefined) {
                updates.compression = Boolean(compression);
            }
            
            if (demoMode !== undefined) {
                updates.demoMode = Boolean(demoMode);
            }
            
            // Apply updates
            handler.fftStreamer.updateConfig(updates);
            
            res.json({
                success: true,
                updates,
                currentConfig: handler.fftStreamer.config
            });
            
        } catch (error) {
            logger.error('Error updating HackRF config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // Connect to OpenWebRX
    app.post('/api/hackrf/connect', async (req, res) => {
        try {
            const { url = 'ws://localhost:8073/ws/' } = req.body;
            
            if (!spectrumAnalyzer) {
                return res.status(400).json({
                    success: false,
                    error: 'Spectrum analyzer not initialized'
                });
            }
            
            await spectrumAnalyzer.connectToOpenWebRX(url);
            
            res.json({
                success: true,
                message: 'Connecting to OpenWebRX...',
                url
            });
            
        } catch (error) {
            logger.error('Error connecting to OpenWebRX:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // Get performance metrics
    app.get('/api/hackrf/metrics', (req, res) => {
        try {
            const metrics = handler.fftStreamer.getStats();
            
            res.json({
                success: true,
                metrics,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            logger.error('Error getting HackRF metrics:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // Serve HackRF demo pages
    app.get('/hackrf/spectrum', (req, res) => {
        res.sendFile('spectrum-plotly-demo.html', { 
            root: app.get('views') || 'public' 
        });
    });
    
    // API documentation endpoint
    app.get('/api/hackrf/docs', (req, res) => {
        res.json({
            endpoints: {
                'GET /api/hackrf/status': 'Get current HackRF status and configuration',
                'POST /api/hackrf/config': 'Update HackRF streaming configuration',
                'POST /api/hackrf/connect': 'Connect to OpenWebRX server',
                'GET /api/hackrf/metrics': 'Get performance metrics',
                'WS /hackrf': 'WebSocket namespace for real-time FFT streaming'
            },
            websocketEvents: {
                client: {
                    'join': 'Join a room (spectrum, signals, waterfall)',
                    'leave': 'Leave a room',
                    'subscribe': 'Subscribe to FFT data streaming',
                    'unsubscribe': 'Unsubscribe from FFT data',
                    'updateConfig': 'Update streaming configuration',
                    'requestStatus': 'Request current status',
                    'setPerformanceMode': 'Set performance mode'
                },
                server: {
                    'welcome': 'Initial connection message with config',
                    'fftBatch': 'Batched FFT data',
                    'signalsDetected': 'Detected signals above threshold',
                    'status': 'Status update',
                    'configUpdated': 'Configuration change notification',
                    'modeChange': 'Demo/Real mode change',
                    'error': 'Error message'
                }
            },
            configuration: {
                performanceModes: ['performance', 'balanced', 'quality'],
                streamingRate: '1-120 Hz',
                decimation: '1-8',
                compression: 'boolean',
                demoMode: 'boolean'
            }
        });
    });
    
    logger.info('HackRF routes configured');
}

module.exports = {
    initializeHackRFIntegration
};
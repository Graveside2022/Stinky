/**
 * Webhook Routes
 * 
 * Implements all webhook API endpoints with Flask compatibility
 */

const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid request parameters',
            errors: errors.array()
        });
    }
    next();
};

module.exports = (router, context) => {
    const { processManager, gpsService, kismetService, logger, cache, io } = context;
    
    /**
     * POST /webhook/run-script
     * Start services (kismet, gps, or both)
     */
    router.post('/run-script',
        [
            body('script').optional().isIn(['kismet', 'gps', 'both']).withMessage('Invalid script type')
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            // Default to 'both' for Flask compatibility
            const script = req.body.script || 'both';
            
            logger.info('Run script request', { script, ip: req.ip });
            
            try {
                // Check if already running
                const status = await processManager.getStatus();
                if (status.main_running && script === 'both') {
                    return res.json({
                        status: 'warning',
                        message: 'Services are already running'
                    });
                }
                
                // Clean up any unhealthy processes
                if (status.has_unhealthy) {
                    logger.info('Cleaning up unhealthy processes');
                    await processManager.cleanup();
                }
                
                // Start the main script
                const result = await processManager.startMainScript();
                
                // Wait for initial startup
                await new Promise(resolve => setTimeout(resolve, 30000));
                
                // Verify Kismet is running
                let kismetRunning = false;
                const kismetRetries = parseInt(process.env.KISMET_RETRY_COUNT || '12');
                const kismetRetryInterval = parseInt(process.env.KISMET_RETRY_INTERVAL || '5000');
                
                for (let i = 0; i < kismetRetries; i++) {
                    if (await processManager.isKismetRunning()) {
                        kismetRunning = true;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, kismetRetryInterval));
                }
                
                // Verify WigleToTAK is running
                let wigleRunning = false;
                const wigleRetries = parseInt(process.env.WIGLE_RETRY_COUNT || '5');
                const wigleRetryInterval = parseInt(process.env.WIGLE_RETRY_INTERVAL || '10000');
                
                for (let i = 0; i < wigleRetries; i++) {
                    if (await processManager.isWigleToTakRunning()) {
                        wigleRunning = true;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, wigleRetryInterval));
                }
                
                // Broadcast status update
                io.to('status').emit('status_update', {
                    type: 'services_started',
                    kismet: kismetRunning,
                    wigle: wigleRunning,
                    timestamp: new Date().toISOString()
                });
                
                // Build response message
                let message = 'Script started successfully.';
                if (kismetRunning) {
                    message += ' Kismet is running.';
                } else {
                    message += ' Kismet failed to start.';
                }
                if (wigleRunning) {
                    message += ' WigleToTAK is running.';
                } else {
                    message += ' WigleToTAK is not running yet.';
                }
                
                res.json({
                    status: 'success',
                    message: message
                });
                
            } catch (error) {
                logger.error('Failed to start services', error);
                res.json({
                    status: 'error',
                    message: `Failed to start services: ${error.message}`
                });
            }
        })
    );
    
    /**
     * POST /webhook/stop-script
     * Stop all services and cleanup
     */
    router.post('/stop-script',
        asyncHandler(async (req, res) => {
            logger.info('Stop script request', { ip: req.ip });
            
            try {
                const result = await processManager.stopAll();
                
                // Broadcast status update
                io.to('status').emit('status_update', {
                    type: 'services_stopped',
                    timestamp: new Date().toISOString()
                });
                
                res.json({
                    status: result.success ? 'success' : 'warning',
                    message: result.message
                });
                
            } catch (error) {
                logger.error('Failed to stop services', error);
                res.json({
                    status: 'error',
                    message: `Failed to stop services: ${error.message}`
                });
            }
        })
    );
    
    /**
     * GET /webhook/info
     * Get system information including GPS data
     */
    router.get('/info',
        asyncHandler(async (req, res) => {
            logger.info('Info request', { ip: req.ip });
            
            try {
                // Get GPS data
                const gpsData = await gpsService.getGpsData();
                
                // Check Kismet status
                const kismetRunning = await processManager.isKismetRunning();
                const kismetApiUp = await kismetService.isApiResponding();
                
                // Check WigleToTAK status
                const wigleRunning = await processManager.isWigleToTakRunning();
                
                res.json({
                    gps: gpsData,
                    kismet: kismetRunning ? 'Running' : 'Not Running',
                    wigle: wigleRunning ? 'Running' : 'Not Running',
                    ip: req.ip || req.connection.remoteAddress || 'unknown'
                });
                
            } catch (error) {
                logger.error('Failed to get info', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to retrieve system information'
                });
            }
        })
    );
    
    /**
     * GET /webhook/script-status
     * Quick status check of all services
     */
    router.get('/script-status',
        asyncHandler(async (req, res) => {
            // Check cache first
            const cacheKey = 'script-status';
            const cached = cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 5000) {
                return res.json(cached.data);
            }
            
            try {
                const mainRunning = await processManager.isMainScriptRunning();
                const kismetRunning = await processManager.isKismetRunning();
                const kismetApiResponding = await kismetService.isApiResponding();
                const wigleRunning = await processManager.isWigleToTakRunning();
                
                let message = '';
                if (mainRunning) {
                    message = 'Main script is running. ';
                }
                if (kismetRunning) {
                    message += 'Kismet is running. ';
                    if (kismetApiResponding) {
                        message += 'API is responding. ';
                    } else {
                        message += 'API is not responding. ';
                    }
                } else {
                    message += 'Kismet is not running. ';
                }
                if (wigleRunning) {
                    message += 'WigleToTAK is running.';
                } else {
                    message += 'WigleToTAK is not running.';
                }
                
                const response = {
                    running: mainRunning,
                    message: message.trim(),
                    kismet_running: kismetRunning,
                    kismet_api_responding: kismetApiResponding,
                    wigle_running: wigleRunning
                };
                
                // Cache the response
                cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
                
                res.json(response);
                
            } catch (error) {
                logger.error('Failed to get status', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to retrieve service status'
                });
            }
        })
    );
    
    /**
     * GET /webhook/kismet-data
     * Get Kismet scan data from CSV or API
     */
    router.get('/kismet-data',
        asyncHandler(async (req, res) => {
            try {
                // Try to get data from CSV first
                const csvData = await kismetService.getDataFromCsv();
                if (csvData) {
                    return res.json(csvData);
                }
                
                // Fallback to API
                const apiData = await kismetService.getDataFromApi();
                res.json(apiData);
                
            } catch (error) {
                logger.error('Failed to get Kismet data', error);
                res.json({
                    devices_count: 0,
                    networks_count: 0,
                    recent_devices: [],
                    feed_items: [],
                    last_update: new Date().toLocaleTimeString(),
                    error: error.message
                });
            }
        })
    );
    
    return router;
};
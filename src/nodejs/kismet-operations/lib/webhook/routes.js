/**
 * Webhook Routes - Express Route Definitions
 * 
 * Implements all webhook API endpoints with comprehensive validation and error handling
 */

const { body, query, param, validationResult } = require('express-validator');
const { ValidationError, asyncHandler } = require('../shared/errors');

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const err = new ValidationError('Invalid request parameters', {
            errors: errors.array()
        });
        err.details = { errors: errors.array() };
        throw err;
    }
    next();
};

// Route definitions
module.exports = (router, context) => {
    const { scriptManager, kismetClient, logger, cache, config, wsHandler } = context;

    /**
     * POST /api/webhook/run-script
     * Start Kismet and/or GPS services
     */
    router.post('/run-script',
        [
            body('script').isIn(['kismet', 'gps', 'both']).withMessage('Invalid script type'),
            body('options.interface').optional().isString(),
            body('options.config').optional().isString()
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            const { script, options = {} } = req.body;
            
            logger.info('Run script request', { script, options });
            
            try {
                // Check if already running
                const status = await scriptManager.getStatus(script);
                if (status && status.running) {
                    return res.status(409).json({
                        success: false,
                        error: 'ALREADY_RUNNING',
                        message: `Script ${script} is already running`,
                        details: `PID: ${status.pid}`,
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Start the script
                const result = await scriptManager.startScript(script, options);
                
                // Notify WebSocket clients
                wsHandler.broadcastStatus(script, 'started', result);
                
                res.json({
                    success: true,
                    message: 'Script started successfully',
                    script,
                    pid: result.pid,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('Failed to start script', { script, error: error.message });
                
                return res.status(500).json({
                    success: false,
                    error: 'EXECUTION_FAILED',
                    message: 'Failed to start script',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        })
    );

    /**
     * POST /api/webhook/stop-script
     * Stop running Kismet and/or GPS services
     */
    router.post('/stop-script',
        [
            body('script').isIn(['kismet', 'gps', 'both']).withMessage('Invalid script type'),
            body('force').optional().isBoolean()
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            const { script, force = false } = req.body;
            
            logger.info('Stop script request', { script, force });
            
            try {
                // Check if running
                const status = await scriptManager.getStatus(script);
                if (!status || !status.running) {
                    return res.status(404).json({
                        success: false,
                        error: 'NOT_RUNNING',
                        message: `Script ${script} is not running`,
                        details: 'No PID file found',
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Stop the script
                const result = await scriptManager.stopScript(script, force);
                
                // Notify WebSocket clients
                wsHandler.broadcastStatus(script, 'stopped', result);
                
                res.json({
                    success: true,
                    message: 'Script stopped successfully',
                    script,
                    pid: result.pid,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('Failed to stop script', { script, error: error.message });
                
                return res.status(500).json({
                    success: false,
                    error: 'STOP_FAILED',
                    message: 'Failed to stop script',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        })
    );

    /**
     * GET /api/webhook/script-status
     * Get current status of services
     */
    router.get('/script-status',
        [
            query('script').optional().isIn(['kismet', 'gps', 'both'])
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            const { script } = req.query;
            
            // Check cache first
            const cacheKey = `status:${script || 'all'}`;
            const cached = cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 5000) {
                return res.json(cached.data);
            }
            
            try {
                const status = await scriptManager.getStatus(script);
                
                const response = {
                    success: true,
                    status,
                    timestamp: new Date().toISOString()
                };
                
                // Cache the response
                cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
                
                res.json(response);
                
            } catch (error) {
                logger.error('Failed to get script status', { script, error: error.message });
                throw error;
            }
        })
    );

    /**
     * GET /api/webhook/info
     * Get system information and service configuration
     */
    router.get('/info',
        asyncHandler(async (req, res) => {
            // Check cache first
            const cacheKey = 'system:info';
            const cached = cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 60000) {
                return res.json(cached.data);
            }
            
            try {
                const info = await scriptManager.getSystemInfo();
                
                const response = {
                    success: true,
                    ...info,
                    timestamp: new Date().toISOString()
                };
                
                // Cache the response
                cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
                
                res.json(response);
                
            } catch (error) {
                logger.error('Failed to get system info', { error: error.message });
                throw error;
            }
        })
    );

    /**
     * GET /api/webhook/kismet-data
     * Get data from Kismet service
     */
    router.get('/kismet-data',
        [
            query('type').optional().isIn(['devices', 'networks', 'alerts', 'all']),
            query('limit').optional().isInt({ min: 1, max: 1000 }),
            query('since').optional().isISO8601(),
            query('format').optional().isIn(['json', 'csv'])
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            const { 
                type = 'all', 
                limit = 100, 
                since = null,
                format = 'json'
            } = req.query;
            
            try {
                // Check if Kismet is running
                const kismetStatus = await scriptManager.getStatus('kismet');
                if (!kismetStatus || !kismetStatus.running) {
                    return res.status(503).json({
                        success: false,
                        error: 'KISMET_UNAVAILABLE',
                        message: 'Kismet service is not running or not responding',
                        details: 'Start Kismet using /api/webhook/run-script',
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Check cache for recent data
                const cacheKey = `kismet:${type}:${limit}:${since || 'latest'}`;
                const cached = cache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < config.cacheTimeout) {
                    if (format === 'csv') {
                        return res.type('text/csv').send(cached.csv);
                    }
                    return res.json(cached.data);
                }
                
                // Fetch data from Kismet
                const data = await kismetClient.getData({
                    type,
                    limit: parseInt(limit),
                    since: since ? new Date(since) : null
                });
                
                const response = {
                    success: true,
                    data,
                    timestamp: new Date().toISOString()
                };
                
                // Cache the response
                cache.set(cacheKey, {
                    data: response,
                    csv: format === 'csv' ? kismetClient.convertToCSV(data) : null,
                    timestamp: Date.now()
                });
                
                if (format === 'csv') {
                    res.type('text/csv').send(kismetClient.convertToCSV(data));
                } else {
                    res.json(response);
                }
                
            } catch (error) {
                logger.error('Failed to get Kismet data', { type, error: error.message });
                
                if (error.code === 'ECONNREFUSED') {
                    return res.status(503).json({
                        success: false,
                        error: 'KISMET_UNAVAILABLE',
                        message: 'Cannot connect to Kismet service',
                        details: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
                
                throw error;
            }
        })
    );

    /**
     * GET /api/webhook/health
     * Health check endpoint
     */
    router.get('/health',
        asyncHandler(async (req, res) => {
            const health = {
                success: true,
                service: 'webhook',
                status: 'healthy',
                checks: {
                    scriptManager: scriptManager.isHealthy(),
                    kismetClient: await kismetClient.isHealthy(),
                    cache: cache.size < 1000 // Prevent memory leak
                },
                timestamp: new Date().toISOString()
            };
            
            const isHealthy = Object.values(health.checks).every(check => check === true);
            
            res.status(isHealthy ? 200 : 503).json(health);
        })
    );

    /**
     * POST /api/webhook/cache/clear
     * Clear cache (admin endpoint)
     */
    router.post('/cache/clear',
        [
            body('key').optional().isString()
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            const { key } = req.body;
            
            if (key) {
                cache.delete(key);
                logger.info('Cache key cleared', { key });
            } else {
                cache.clear();
                logger.info('Cache fully cleared');
            }
            
            res.json({
                success: true,
                message: key ? `Cache key '${key}' cleared` : 'Cache fully cleared',
                timestamp: new Date().toISOString()
            });
        })
    );

    /**
     * POST /api/webhooks/configure
     * Configure webhook settings
     */
    router.post('/configure',
        [
            body('url').isURL().withMessage('Invalid webhook URL'),
            body('events').optional().isArray().withMessage('Events must be an array'),
            body('events.*').optional().isString().withMessage('Event names must be strings'),
            body('enabled').optional().isBoolean().withMessage('Enabled must be boolean'),
            body('headers').optional().isObject().withMessage('Headers must be an object')
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            const { url, events = ['all'], enabled = true, headers = {} } = req.body;
            
            logger.info('Configure webhook request', { url, events, enabled });
            
            try {
                // Generate unique webhook ID
                const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                
                // Store webhook configuration (in-memory for now)
                if (!context.webhooks) {
                    context.webhooks = new Map();
                }
                
                const webhookConfig = {
                    id: webhookId,
                    url,
                    events,
                    enabled,
                    headers,
                    createdAt: new Date().toISOString(),
                    lastTriggered: null,
                    triggerCount: 0
                };
                
                context.webhooks.set(webhookId, webhookConfig);
                
                // Notify WebSocket clients
                if (wsHandler.broadcastWebhookUpdate) {
                    wsHandler.broadcastWebhookUpdate('configured', webhookConfig);
                }
                
                res.status(201).json({
                    success: true,
                    message: 'Webhook configured successfully',
                    webhook: webhookConfig,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('Failed to configure webhook', { error: error.message });
                
                return res.status(500).json({
                    success: false,
                    error: 'CONFIGURATION_FAILED',
                    message: 'Failed to configure webhook',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        })
    );

    /**
     * GET /api/webhooks
     * Get all configured webhooks
     */
    router.get('/',
        [
            query('enabled').optional().isBoolean(),
            query('event').optional().isString()
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            const { enabled, event } = req.query;
            
            try {
                // Initialize webhooks map if not exists
                if (!context.webhooks) {
                    context.webhooks = new Map();
                }
                
                let webhooks = Array.from(context.webhooks.values());
                
                // Filter by enabled status if specified
                if (enabled !== undefined) {
                    webhooks = webhooks.filter(w => w.enabled === (enabled === 'true'));
                }
                
                // Filter by event if specified
                if (event) {
                    webhooks = webhooks.filter(w => 
                        w.events.includes('all') || w.events.includes(event)
                    );
                }
                
                res.json({
                    success: true,
                    webhooks,
                    total: webhooks.length,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('Failed to get webhooks', { error: error.message });
                
                return res.status(500).json({
                    success: false,
                    error: 'FETCH_FAILED',
                    message: 'Failed to retrieve webhooks',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        })
    );

    /**
     * DELETE /api/webhooks/:id
     * Delete a specific webhook
     */
    router.delete('/:id',
        [
            param('id').isString().withMessage('Invalid webhook ID')
        ],
        validateRequest,
        asyncHandler(async (req, res) => {
            const { id } = req.params;
            
            logger.info('Delete webhook request', { id });
            
            try {
                // Initialize webhooks map if not exists
                if (!context.webhooks) {
                    context.webhooks = new Map();
                }
                
                // Check if webhook exists
                if (!context.webhooks.has(id)) {
                    return res.status(404).json({
                        success: false,
                        error: 'NOT_FOUND',
                        message: 'Webhook not found',
                        details: `No webhook with ID: ${id}`,
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Get webhook details before deletion
                const webhook = context.webhooks.get(id);
                
                // Delete the webhook
                context.webhooks.delete(id);
                
                // Notify WebSocket clients
                if (wsHandler.broadcastWebhookUpdate) {
                    wsHandler.broadcastWebhookUpdate('deleted', { id, url: webhook.url });
                }
                
                res.json({
                    success: true,
                    message: 'Webhook deleted successfully',
                    webhook: { id, url: webhook.url },
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error('Failed to delete webhook', { id, error: error.message });
                
                return res.status(500).json({
                    success: false,
                    error: 'DELETE_FAILED',
                    message: 'Failed to delete webhook',
                    details: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        })
    );

    // Log route registration
    logger.info('Webhook routes registered', {
        endpoints: [
            'POST /run-script',
            'POST /stop-script',
            'GET /script-status',
            'GET /info',
            'GET /kismet-data',
            'GET /health',
            'POST /cache/clear',
            'POST /configure',
            'GET /',
            'DELETE /:id'
        ]
    });
};
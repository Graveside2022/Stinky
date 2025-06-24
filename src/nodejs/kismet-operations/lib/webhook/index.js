/**
 * Webhook Service - Main Entry Point
 * 
 * Provides REST API endpoints for managing Kismet and GPS operations
 * Includes comprehensive error handling and validation
 */

const express = require('express');
const { createServiceLogger } = require('../shared/logger');
const { asyncHandler, createErrorHandler } = require('../shared/errors');
const ScriptManager = require('./scriptManager');
const KismetClient = require('./kismetClient');
const routes = require('./routes');
const WebSocketHandler = require('./websocket');

class WebhookService {
    constructor(app, io, config = {}) {
        this.logger = createServiceLogger('webhook-service');
        this.config = {
            kismetUrl: 'http://localhost:2501',
            pidDir: '/tmp/kismet-operations',
            cacheTimeout: 10000, // 10 seconds
            maxConcurrentScripts: 5,
            ...config
        };
        
        this.app = app;
        this.io = io;
        
        // Initialize services
        this.scriptManager = new ScriptManager(this.config, this.logger);
        this.kismetClient = new KismetClient(this.config, this.logger);
        this.wsHandler = new WebSocketHandler(this.io, this.scriptManager, this.kismetClient, this.logger);
        
        // Cache for performance
        this.cache = new Map();
        
        this.setupRoutes();
        this.setupWebSocket();
        
        this.logger.info('Webhook service initialized', {
            kismetUrl: this.config.kismetUrl,
            pidDir: this.config.pidDir
        });
    }

    setupRoutes() {
        // Create router with context
        const router = express.Router();
        
        // Apply rate limiting middleware
        router.use(this.createRateLimiter());
        
        // Setup routes with context
        routes(router, {
            scriptManager: this.scriptManager,
            kismetClient: this.kismetClient,
            logger: this.logger,
            cache: this.cache,
            config: this.config,
            wsHandler: this.wsHandler
        });
        
        // Mount webhook routes at both locations for compatibility
        this.app.use('/api/webhook', router);
        this.app.use('/api/webhooks', router);
        
        this.logger.info('Webhook routes mounted at /api/webhook and /api/webhooks');
    }

    setupWebSocket() {
        // WebSocket namespace for webhook events
        const webhookNamespace = this.io.of('/webhook');
        this.wsHandler.initialize(webhookNamespace);
        
        this.logger.info('WebSocket namespace /webhook initialized');
    }

    createRateLimiter() {
        const requestCounts = new Map();
        const windowMs = 60000; // 1 minute
        const maxRequests = 100;

        return (req, res, next) => {
            // With trust proxy enabled, req.ip will contain the real client IP
            // Fallback chain: req.ip -> x-forwarded-for -> x-real-ip -> socket address
            const clientId = req.ip || 
                           req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                           req.headers['x-real-ip'] || 
                           req.socket?.remoteAddress || 
                           'unknown';
            const now = Date.now();
            
            // Clean up old entries
            for (const [id, data] of requestCounts.entries()) {
                if (now - data.windowStart > windowMs) {
                    requestCounts.delete(id);
                }
            }
            
            // Check current client
            const clientData = requestCounts.get(clientId) || { count: 0, windowStart: now };
            
            if (now - clientData.windowStart > windowMs) {
                // New window
                clientData.count = 1;
                clientData.windowStart = now;
            } else {
                clientData.count++;
            }
            
            requestCounts.set(clientId, clientData);
            
            if (clientData.count > maxRequests) {
                return res.status(429).json({
                    success: false,
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests, please try again later',
                    retryAfter: Math.ceil((clientData.windowStart + windowMs - now) / 1000)
                });
            }
            
            next();
        };
    }

    // Utility method to clear cache
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
        this.logger.debug('Cache cleared', { key });
    }

    // Graceful shutdown
    async shutdown() {
        this.logger.info('Shutting down webhook service...');
        
        try {
            // Stop all running scripts
            await this.scriptManager.stopAll();
            
            // Close WebSocket connections
            this.wsHandler.shutdown();
            
            // Clear cache
            this.clearCache();
            
            this.logger.info('Webhook service shutdown complete');
        } catch (error) {
            this.logger.error('Error during webhook service shutdown:', error);
            throw error;
        }
    }
}

module.exports = WebhookService;
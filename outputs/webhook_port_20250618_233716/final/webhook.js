/**
 * Stinkster Webhook Service
 * 
 * Standalone webhook service for system orchestration on port 8002
 * Provides API endpoints for service control, status monitoring, and data retrieval
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createLogger } = require('./config');
const { createErrorHandler } = require('./middleware/errorHandler');
const webhookRoutes = require('./routes/webhook');
const ProcessManager = require('./services/processManager');
const GpsService = require('./services/gpsService');
const KismetService = require('./services/kismetService');

class WebhookService {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: (process.env.CORS_ORIGINS || '*').split(','),
                methods: ['GET', 'POST']
            },
            pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
            pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000')
        });
        
        this.port = parseInt(process.env.WEBHOOK_PORT || '8002');
        this.host = process.env.WEBHOOK_HOST || '0.0.0.0';
        this.logger = createLogger('webhook-service');
        
        // Initialize services
        this.processManager = new ProcessManager(this.logger);
        this.gpsService = new GpsService(this.logger);
        this.kismetService = new KismetService(this.logger);
        
        // Cache for performance
        this.cache = new Map();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
        this.setupGracefulShutdown();
    }
    
    setupMiddleware() {
        // Security headers
        this.app.use(helmet({
            contentSecurityPolicy: false
        }));
        
        // CORS
        this.app.use(cors({
            origin: (process.env.CORS_ORIGINS || '*').split(','),
            credentials: true
        }));
        
        // Compression
        this.app.use(compression());
        
        // Body parsing
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
        
        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info('Request received', {
                method: req.method,
                path: req.path,
                ip: req.ip || req.connection.remoteAddress
            });
            next();
        });
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            const health = {
                status: 'healthy',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };
            res.json(health);
        });
        
        // Mount webhook routes
        const router = express.Router();
        webhookRoutes(router, {
            processManager: this.processManager,
            gpsService: this.gpsService,
            kismetService: this.kismetService,
            logger: this.logger,
            cache: this.cache,
            io: this.io
        });
        this.app.use('/webhook', router);
        
        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'NOT_FOUND',
                message: 'The requested endpoint does not exist',
                path: req.path
            });
        });
    }
    
    setupWebSocket() {
        this.io.on('connection', (socket) => {
            this.logger.info('WebSocket client connected', { id: socket.id });
            
            socket.on('disconnect', () => {
                this.logger.info('WebSocket client disconnected', { id: socket.id });
            });
            
            // Subscribe to process output
            socket.on('subscribe:output', (data) => {
                socket.join('output');
                this.logger.debug('Client subscribed to output', { id: socket.id });
            });
            
            // Subscribe to status updates
            socket.on('subscribe:status', (data) => {
                socket.join('status');
                this.logger.debug('Client subscribed to status', { id: socket.id });
            });
        });
        
        // Emit process output events
        this.processManager.on('output', (data) => {
            this.io.to('output').emit('script_output', data);
        });
        
        // Emit status change events
        this.processManager.on('status_changed', (data) => {
            this.io.to('status').emit('status_update', data);
        });
    }
    
    setupErrorHandling() {
        this.app.use(createErrorHandler(this.logger));
    }
    
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            this.logger.info(`Received ${signal}, starting graceful shutdown`);
            
            try {
                // Stop accepting new connections
                this.server.close();
                
                // Close WebSocket connections
                this.io.close();
                
                // Stop running processes
                await this.processManager.stopAll();
                
                // Exit
                process.exit(0);
            } catch (error) {
                this.logger.error('Error during shutdown', error);
                process.exit(1);
            }
        };
        
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    
    async start() {
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, this.host, (err) => {
                if (err) {
                    this.logger.error('Failed to start webhook service', err);
                    reject(err);
                } else {
                    this.logger.info('Webhook service started', {
                        port: this.port,
                        host: this.host,
                        environment: process.env.NODE_ENV || 'development'
                    });
                    resolve();
                }
            });
        });
    }
}

// Start service if run directly
if (require.main === module) {
    const service = new WebhookService();
    service.start().catch(error => {
        console.error('Failed to start webhook service:', error);
        process.exit(1);
    });
}

module.exports = WebhookService;
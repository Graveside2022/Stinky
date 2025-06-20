/**
 * Production Security Configuration for Stinkster Node.js Services
 * 
 * This file provides enhanced security configurations for production deployment.
 * Apply these configurations to harden the Node.js services for production use.
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

/**
 * Production Security Middleware Configuration
 */
class ProductionSecurityConfig {
    
    /**
     * Enhanced Rate Limiting Configuration
     */
    static getRateLimitConfig() {
        return {
            // General API rate limiting
            general: rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // limit each IP to 100 requests per windowMs
                message: {
                    error: 'Too many requests from this IP, please try again later.',
                    code: 'RATE_LIMIT_EXCEEDED',
                    timestamp: new Date().toISOString()
                },
                standardHeaders: true, // Return rate limit info in headers
                legacyHeaders: false,
                // Skip rate limiting for health checks
                skip: (req) => req.path === '/health'
            }),

            // Strict rate limiting for sensitive endpoints
            strict: rateLimit({
                windowMs: 5 * 60 * 1000, // 5 minutes
                max: 10, // limit each IP to 10 requests per windowMs
                message: {
                    error: 'Too many requests to sensitive endpoint, please try again later.',
                    code: 'STRICT_RATE_LIMIT_EXCEEDED',
                    timestamp: new Date().toISOString()
                }
            }),

            // WebSocket connection rate limiting
            websocket: rateLimit({
                windowMs: 60 * 1000, // 1 minute
                max: 5, // limit each IP to 5 WebSocket connections per minute
                message: {
                    error: 'Too many WebSocket connections, please try again later.',
                    code: 'WEBSOCKET_RATE_LIMIT_EXCEEDED',
                    timestamp: new Date().toISOString()
                }
            })
        };
    }

    /**
     * Production-Ready Content Security Policy Configuration
     * Zero 'unsafe-inline' directives for maximum security
     */
    static getHelmetConfig() {
        return helmet({
            // Content Security Policy - Strict, Production-Ready
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: [
                        "'self'",
                        // CDN resources with integrity hashes (recommended)
                        "https://cdn.socket.io",
                        "https://cdnjs.cloudflare.com",
                        "https://cdn.plot.ly"
                    ],
                    styleSrc: [
                        "'self'",
                        // Google Fonts CSS
                        "https://fonts.googleapis.com"
                    ],
                    fontSrc: [
                        "'self'",
                        // Google Fonts
                        "https://fonts.gstatic.com"
                    ],
                    imgSrc: [
                        "'self'",
                        "data:", // Data URLs for SVG backgrounds
                        "https:" // HTTPS images only
                    ],
                    connectSrc: [
                        "'self'",
                        // WebSocket connections for real-time data
                        "ws://localhost:*",
                        "wss://localhost:*",
                        // Allow connections to Kismet API
                        "http://localhost:2501",
                        "https://localhost:2501"
                    ],
                    frameSrc: [
                        "'self'",
                        // Kismet iframe integration
                        "http://localhost:2501",
                        "https://localhost:2501"
                    ],
                    workerSrc: ["'self'", "blob:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    frameAncestors: ["'none'"],
                    manifestSrc: ["'self'"],
                    upgradeInsecureRequests: true
                },
                reportOnly: false // Set to true for testing, false for enforcement
            },

            // HTTP Strict Transport Security
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true
            },

            // Disable X-Powered-By header
            hidePoweredBy: true,

            // X-Frame-Options - Allow same origin for iframe integration
            frameguard: {
                action: 'sameorigin'
            },

            // X-Content-Type-Options
            noSniff: true,

            // X-XSS-Protection
            xssFilter: true,

            // Referrer Policy
            referrerPolicy: {
                policy: ['no-referrer', 'strict-origin-when-cross-origin']
            },

            // Permissions Policy
            permissionsPolicy: {
                features: {
                    camera: [],
                    microphone: [],
                    geolocation: ["'self'"], // GPS functionality
                    notifications: [],
                    payment: [],
                    usb: [] // SDR device access handled at OS level
                }
            }
        });
    }

    /**
     * Production CORS Configuration
     */
    static getCorsConfig() {
        const allowedOrigins = process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:3000', 'https://localhost:3000'];

        return cors({
            origin: function (origin, callback) {
                // Allow requests with no origin (mobile apps, etc.)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            optionsSuccessStatus: 200, // For legacy browser support
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: [
                'Origin',
                'X-Requested-With',
                'Content-Type',
                'Accept',
                'Authorization',
                'X-API-Key'
            ],
            exposedHeaders: [
                'X-RateLimit-Limit',
                'X-RateLimit-Remaining',
                'X-RateLimit-Reset'
            ]
        });
    }

    /**
     * Basic Authentication Configuration
     */
    static getBasicAuthConfig() {
        if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
            console.warn('⚠️  WARNING: Admin credentials not configured. Basic auth disabled.');
            return null;
        }

        const basicAuth = require('express-basic-auth');
        
        return basicAuth({
            users: {
                [process.env.ADMIN_USERNAME]: process.env.ADMIN_PASSWORD
            },
            challenge: true,
            realm: 'Stinkster Admin Access',
            unauthorizedResponse: (req) => {
                return {
                    error: 'Unauthorized access',
                    code: 'UNAUTHORIZED',
                    timestamp: new Date().toISOString()
                };
            }
        });
    }

    /**
     * Request ID Middleware
     */
    static getRequestIdMiddleware() {
        const { v4: uuidv4 } = require('uuid');
        
        return (req, res, next) => {
            req.id = req.get('X-Request-ID') || uuidv4();
            res.set('X-Request-ID', req.id);
            next();
        };
    }

    /**
     * Security Headers Middleware
     */
    static getSecurityHeadersMiddleware() {
        return (req, res, next) => {
            // Additional security headers
            res.set({
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Server': 'Stinkster' // Hide actual server info
            });
            next();
        };
    }

    /**
     * Input Sanitization Middleware
     */
    static getInputSanitizationMiddleware() {
        const mongoSanitize = require('express-mongo-sanitize');
        const xss = require('xss');
        
        return [
            // Prevent NoSQL injection attacks
            mongoSanitize(),
            
            // XSS protection
            (req, res, next) => {
                if (req.body) {
                    Object.keys(req.body).forEach(key => {
                        if (typeof req.body[key] === 'string') {
                            req.body[key] = xss(req.body[key]);
                        }
                    });
                }
                next();
            }
        ];
    }

    /**
     * Request Size Limiting
     */
    static getRequestSizeLimits() {
        return {
            json: { limit: '1mb' },
            urlencoded: { 
                limit: '1mb', 
                extended: true,
                parameterLimit: 20 // Limit number of parameters
            }
        };
    }

    /**
     * Enhanced Logging Middleware
     */
    static getSecurityLoggingMiddleware(logger) {
        return (req, res, next) => {
            const start = Date.now();
            
            // Log security-relevant events
            if (req.headers['user-agent'] && 
                req.headers['user-agent'].includes('bot')) {
                logger.security('Bot detected', {
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    url: req.originalUrl
                });
            }

            // Log failed authentication attempts
            res.on('finish', () => {
                const duration = Date.now() - start;
                
                if (res.statusCode === 401) {
                    logger.security('Authentication failed', {
                        ip: req.ip,
                        url: req.originalUrl,
                        method: req.method,
                        userAgent: req.headers['user-agent']
                    });
                }

                // Log slow requests (potential DoS)
                if (duration > 5000) {
                    logger.security('Slow request detected', {
                        ip: req.ip,
                        url: req.originalUrl,
                        duration,
                        method: req.method
                    });
                }
            });
            
            next();
        };
    }

    /**
     * Complete Security Configuration
     */
    static applyProductionSecurity(app, logger) {
        const rateLimits = this.getRateLimitConfig();
        const basicAuth = this.getBasicAuthConfig();
        const requestSizeLimits = this.getRequestSizeLimits();

        // Apply security middleware in order
        app.use(this.getRequestIdMiddleware());
        app.use(this.getSecurityHeadersMiddleware());
        app.use(this.getHelmetConfig());
        app.use(this.getCorsConfig());
        
        // Rate limiting
        app.use('/api/', rateLimits.general);
        app.use('/api/admin/', rateLimits.strict);
        
        // Request size limits
        app.use(require('express').json(requestSizeLimits.json));
        app.use(require('express').urlencoded(requestSizeLimits.urlencoded));
        
        // Input sanitization
        // app.use(this.getInputSanitizationMiddleware()); // Requires additional packages
        
        // Basic authentication for admin endpoints
        if (basicAuth) {
            app.use('/api/admin/', basicAuth);
        }
        
        // Security logging
        app.use(this.getSecurityLoggingMiddleware(logger));

        logger.info('Production security configuration applied', {
            rateLimiting: true,
            cors: true,
            helmet: true,
            basicAuth: !!basicAuth,
            requestSizeLimits: true
        });
    }
}

/**
 * WebSocket Security Configuration
 */
class WebSocketSecurityConfig {
    static getSecureSocketIOConfig() {
        return {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
                methods: ["GET", "POST"],
                credentials: true
            },
            // Connection rate limiting
            pingInterval: 25000,
            pingTimeout: 5000,
            maxHttpBufferSize: 1e6, // 1MB
            allowEIO3: false, // Disable legacy protocol
            transports: ['websocket'], // Only allow WebSocket transport
            
            // Custom middleware for connection validation
            middleware: [
                (socket, next) => {
                    // Validate origin
                    const origin = socket.handshake.headers.origin;
                    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
                    
                    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
                        return next(new Error('Origin not allowed'));
                    }
                    
                    // Log connection
                    console.log(`WebSocket connection from ${socket.handshake.address} (${origin})`);
                    next();
                }
            ]
        };
    }
}

/**
 * Environment Configuration Validation
 */
class EnvironmentValidator {
    static validateProductionConfig() {
        const required = [
            'NODE_ENV',
            'ALLOWED_ORIGINS'
        ];

        const recommended = [
            'ADMIN_USERNAME',
            'ADMIN_PASSWORD',
            'LOG_LEVEL'
        ];

        const missing = required.filter(env => !process.env[env]);
        const missingRecommended = recommended.filter(env => !process.env[env]);

        if (missing.length > 0) {
            console.error('❌ Missing required environment variables:', missing);
            process.exit(1);
        }

        if (missingRecommended.length > 0) {
            console.warn('⚠️  Missing recommended environment variables:', missingRecommended);
        }

        if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️  NODE_ENV is not set to "production"');
        }

        console.log('✅ Environment configuration validated');
    }
}

module.exports = {
    ProductionSecurityConfig,
    WebSocketSecurityConfig,
    EnvironmentValidator
};
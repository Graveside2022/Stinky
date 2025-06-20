/**
 * Configuration Management
 * 
 * Centralizes configuration with environment variable support
 */

const winston = require('winston');
const path = require('path');

/**
 * Load and validate configuration
 */
const loadConfig = () => {
    return {
        // Server configuration
        server: {
            port: parseInt(process.env.WEBHOOK_PORT || '8002'),
            host: process.env.WEBHOOK_HOST || '0.0.0.0'
        },
        
        // Logging configuration
        logging: {
            level: process.env.LOG_LEVEL || 'info',
            file: process.env.LOG_FILE || '/var/log/webhook.log'
        },
        
        // Service paths
        paths: {
            mainScript: process.env.MAIN_SCRIPT || '/home/pi/stinky/gps_kismet_wigle.sh',
            kismetOps: process.env.KISMET_OPS_PATH || '/home/pi/kismet_ops/',
            kismetLog: process.env.KISMET_LOG_PATH || '/var/log/kismet/kismet.log'
        },
        
        // PID files
        pidFiles: {
            main: process.env.SCRIPT_PID_FILE || '/tmp/kismet_script.pid',
            kismet: process.env.PID_FILE || '/tmp/kismet_pids.txt',
            wigletotak: process.env.WIGLETOTAK_PID_FILE || '/home/pi/tmp/wigletotak.specific.pid'
        },
        
        // Kismet configuration
        kismet: {
            apiUrl: process.env.KISMET_API_URL || 'http://10.42.0.1:2501',
            auth: {
                username: process.env.KISMET_AUTH_USER || 'admin',
                password: process.env.KISMET_AUTH_PASS || 'admin'
            }
        },
        
        // CORS configuration
        cors: {
            origins: (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim())
        },
        
        // Process management timeouts
        timeouts: {
            scriptStart: parseInt(process.env.SCRIPT_START_TIMEOUT || '30000'),
            kismetRetryCount: parseInt(process.env.KISMET_RETRY_COUNT || '12'),
            kismetRetryInterval: parseInt(process.env.KISMET_RETRY_INTERVAL || '5000'),
            wigleRetryCount: parseInt(process.env.WIGLE_RETRY_COUNT || '5'),
            wigleRetryInterval: parseInt(process.env.WIGLE_RETRY_INTERVAL || '10000')
        },
        
        // WebSocket configuration
        websocket: {
            pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
            pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000')
        },
        
        // Rate limiting
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
        }
    };
};

/**
 * Create Winston logger instance
 */
const createLogger = (service) => {
    const config = loadConfig();
    
    const logger = winston.createLogger({
        level: config.logging.level,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        defaultMeta: { service },
        transports: [
            // Console transport
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ]
    });
    
    // Add file transport if log file is specified
    if (config.logging.file && config.logging.file !== 'false') {
        try {
            logger.add(new winston.transports.File({
                filename: config.logging.file,
                maxsize: 10485760, // 10MB
                maxFiles: 5
            }));
        } catch (error) {
            console.error('Failed to add file transport:', error);
        }
    }
    
    return logger;
};

/**
 * Validate configuration
 */
const validateConfig = (config) => {
    const required = [
        'server.port',
        'paths.mainScript',
        'pidFiles.main'
    ];
    
    for (const key of required) {
        const value = key.split('.').reduce((obj, k) => obj?.[k], config);
        if (!value) {
            throw new Error(`Missing required configuration: ${key}`);
        }
    }
    
    // Validate port range
    if (config.server.port < 1 || config.server.port > 65535) {
        throw new Error('Invalid port number');
    }
    
    return true;
};

// Load and validate config on module load
const config = loadConfig();
validateConfig(config);

module.exports = {
    config,
    createLogger,
    loadConfig,
    validateConfig
};
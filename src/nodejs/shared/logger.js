/**
 * Centralized Logging System for Stinkster Node.js
 * 
 * Provides consistent logging across all services with:
 * - Configurable log levels
 * - File and console output
 * - Log rotation
 * - Structured logging
 * - Performance metrics
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

class StinksterLogger {
    constructor() {
        this.logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
        this.ensureLogDirectory();
        this.logger = this.createLogger();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    createLogger() {
        const logLevel = process.env.LOG_LEVEL || 'info';
        const environment = process.env.NODE_ENV || 'production';

        // Custom format for structured logging
        const customFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                const logEntry = {
                    timestamp,
                    level: level.toUpperCase(),
                    service: service || 'stinkster',
                    message,
                    ...meta
                };

                // Add process information
                logEntry.pid = process.pid;
                
                // Add memory usage for error and warn levels
                if (level === 'error' || level === 'warn') {
                    const memUsage = process.memoryUsage();
                    logEntry.memory = {
                        rss: Math.round(memUsage.rss / 1024 / 1024),
                        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
                    };
                }

                return JSON.stringify(logEntry);
            })
        );

        // Console format for development
        const consoleFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'HH:mm:ss.SSS'
            }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                const serviceName = service ? `[${service}]` : '[stinkster]';
                const metaStr = Object.keys(meta).length > 0 ? 
                    ' ' + JSON.stringify(meta, null, 0) : '';
                return `${timestamp} ${level} ${serviceName} ${message}${metaStr}`;
            })
        );

        const transports = [];

        // Console transport (enabled in development or when explicitly requested)
        if (environment === 'development' || process.env.LOG_CONSOLE === 'true') {
            transports.push(new winston.transports.Console({
                level: logLevel,
                format: consoleFormat,
                handleExceptions: true,
                handleRejections: true
            }));
        }

        // File transports for production
        if (environment === 'production' || process.env.LOG_FILE === 'true') {
            // Combined log (all levels)
            transports.push(new winston.transports.File({
                filename: path.join(this.logDir, 'combined.log'),
                level: logLevel,
                format: customFormat,
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
                tailable: true,
                handleExceptions: true,
                handleRejections: true
            }));

            // Error log (error level only)
            transports.push(new winston.transports.File({
                filename: path.join(this.logDir, 'error.log'),
                level: 'error',
                format: customFormat,
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 3,
                tailable: true
            }));

            // Service-specific logs
            transports.push(new winston.transports.File({
                filename: path.join(this.logDir, 'spectrum-analyzer.log'),
                level: logLevel,
                format: customFormat,
                maxsize: 5 * 1024 * 1024, // 5MB
                maxFiles: 3,
                tailable: true,
                filter: (info) => info.service === 'spectrum-analyzer'
            }));

            transports.push(new winston.transports.File({
                filename: path.join(this.logDir, 'wigle-to-tak.log'),
                level: logLevel,
                format: customFormat,
                maxsize: 5 * 1024 * 1024, // 5MB
                maxFiles: 3,
                tailable: true,
                filter: (info) => info.service === 'wigle-to-tak'
            }));

            transports.push(new winston.transports.File({
                filename: path.join(this.logDir, 'gps-bridge.log'),
                level: logLevel,
                format: customFormat,
                maxsize: 5 * 1024 * 1024, // 5MB
                maxFiles: 3,
                tailable: true,
                filter: (info) => info.service === 'gps-bridge'
            }));
        }

        return winston.createLogger({
            level: logLevel,
            format: customFormat,
            transports,
            exitOnError: false
        });
    }

    // Create service-specific logger
    createServiceLogger(serviceName) {
        return {
            error: (message, meta = {}) => this.logger.error(message, { service: serviceName, ...meta }),
            warn: (message, meta = {}) => this.logger.warn(message, { service: serviceName, ...meta }),
            info: (message, meta = {}) => this.logger.info(message, { service: serviceName, ...meta }),
            debug: (message, meta = {}) => this.logger.debug(message, { service: serviceName, ...meta }),
            verbose: (message, meta = {}) => this.logger.verbose(message, { service: serviceName, ...meta }),

            // Performance logging helpers
            timing: (operation, duration, meta = {}) => {
                this.logger.info(`Performance: ${operation}`, {
                    service: serviceName,
                    operation,
                    duration_ms: duration,
                    ...meta
                });
            },

            api: (method, endpoint, statusCode, duration, meta = {}) => {
                const level = statusCode >= 400 ? 'warn' : 'info';
                this.logger[level](`API ${method} ${endpoint}`, {
                    service: serviceName,
                    type: 'api',
                    method,
                    endpoint,
                    status_code: statusCode,
                    duration_ms: duration,
                    ...meta
                });
            },

            connection: (type, status, meta = {}) => {
                const level = status === 'connected' ? 'info' : 'warn';
                this.logger[level](`Connection ${type} ${status}`, {
                    service: serviceName,
                    type: 'connection',
                    connection_type: type,
                    status,
                    ...meta
                });
            },

            websocket: (event, data = {}) => {
                this.logger.debug(`WebSocket ${event}`, {
                    service: serviceName,
                    type: 'websocket',
                    event,
                    ...data
                });
            },

            security: (event, details = {}) => {
                this.logger.warn(`Security event: ${event}`, {
                    service: serviceName,
                    type: 'security',
                    event,
                    ...details
                });
            }
        };
    }

    // Main logger methods
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    verbose(message, meta = {}) {
        this.logger.verbose(message, meta);
    }

    // Log system metrics
    logSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        this.logger.info('System Metrics', {
            type: 'system_metrics',
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heap_used: Math.round(memUsage.heapUsed / 1024 / 1024),
                heap_total: Math.round(memUsage.heapTotal / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: Math.round(process.uptime()),
            pid: process.pid
        });
    }

    // Performance measurement helper
    startTimer(label) {
        const start = process.hrtime.bigint();
        return {
            end: (meta = {}) => {
                const end = process.hrtime.bigint();
                const duration = Number(end - start) / 1000000; // Convert to milliseconds
                this.timing(label, duration, meta);
                return duration;
            }
        };
    }

    // Log rotation and cleanup
    cleanupLogs(maxAgeDays = 7) {
        const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
        const now = Date.now();

        try {
            const files = fs.readdirSync(this.logDir);
            
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    this.logger.info(`Cleaned up old log file: ${file}`);
                }
            });
        } catch (error) {
            this.logger.error('Error cleaning up log files:', error);
        }
    }

    // Express.js middleware
    getExpressMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                const level = res.statusCode >= 400 ? 'warn' : 'info';
                
                this.logger[level](`${req.method} ${req.originalUrl}`, {
                    type: 'http_request',
                    method: req.method,
                    url: req.originalUrl,
                    status_code: res.statusCode,
                    duration_ms: duration,
                    user_agent: req.get('User-Agent'),
                    ip: req.ip || req.connection.remoteAddress,
                    content_length: res.get('Content-Length')
                });
            });
            
            next();
        };
    }
}

// Create singleton instance
const stinksterLogger = new StinksterLogger();

// Export main logger and service logger factory
module.exports = stinksterLogger;
module.exports.createServiceLogger = (serviceName) => stinksterLogger.createServiceLogger(serviceName);
module.exports.getExpressMiddleware = () => stinksterLogger.getExpressMiddleware();
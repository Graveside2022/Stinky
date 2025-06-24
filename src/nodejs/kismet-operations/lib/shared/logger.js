/**
 * Shared logger utilities
 * Simple wrapper around winston for webhook service
 */

const winston = require('winston');

const createServiceLogger = (serviceName) => {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        defaultMeta: { service: serviceName },
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }),
            new winston.transports.File({ 
                filename: `logs/${serviceName}.log`,
                maxsize: 5242880, // 5MB
                maxFiles: 5
            })
        ]
    });
};

module.exports = {
    createServiceLogger
};
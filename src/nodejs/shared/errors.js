/**
 * Custom Error Classes for Stinkster Node.js
 * 
 * Provides structured error handling with context and error codes
 */

const { ERROR_CODES, HTTP_STATUS } = require('./constants');

/**
 * Base error class for all Stinkster errors
 */
class StinksterError extends Error {
    constructor(message, code = ERROR_CODES.UNKNOWN_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, context = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.timestamp = new Date().toISOString();
        
        // Ensure the stack trace is captured
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    toUserResponse() {
        return {
            error: {
                code: this.code,
                message: this.message,
                timestamp: this.timestamp
            }
        };
    }
}

/**
 * Configuration related errors
 */
class ConfigurationError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.CONFIGURATION_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, context);
    }
}

/**
 * Validation related errors
 */
class ValidationError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, context);
    }
}

/**
 * Connection related errors
 */
class ConnectionError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.CONNECTION_ERROR, HTTP_STATUS.BAD_GATEWAY, context);
    }
}

class ConnectionTimeoutError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.CONNECTION_TIMEOUT, HTTP_STATUS.GATEWAY_TIMEOUT, context);
    }
}

class ConnectionRefusedError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.CONNECTION_REFUSED, HTTP_STATUS.BAD_GATEWAY, context);
    }
}

/**
 * File system related errors
 */
class FileNotFoundError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.FILE_NOT_FOUND, HTTP_STATUS.NOT_FOUND, context);
    }
}

class FileAccessError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.FILE_ACCESS_ERROR, HTTP_STATUS.FORBIDDEN, context);
    }
}

class FileWriteError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.FILE_WRITE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, context);
    }
}

/**
 * Service related errors
 */
class ServiceNotAvailableError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.SERVICE_NOT_AVAILABLE, HTTP_STATUS.SERVICE_UNAVAILABLE, context);
    }
}

class ServiceTimeoutError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.SERVICE_TIMEOUT, HTTP_STATUS.GATEWAY_TIMEOUT, context);
    }
}

class ServiceError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.SERVICE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, context);
    }
}

/**
 * Protocol related errors
 */
class ProtocolError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.PROTOCOL_ERROR, HTTP_STATUS.BAD_REQUEST, context);
    }
}

class InvalidMessageError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.INVALID_MESSAGE, HTTP_STATUS.BAD_REQUEST, context);
    }
}

class UnsupportedOperationError extends StinksterError {
    constructor(message, context = {}) {
        super(message, ERROR_CODES.UNSUPPORTED_OPERATION, HTTP_STATUS.METHOD_NOT_ALLOWED, context);
    }
}

/**
 * Error factory for creating errors from different sources
 */
class ErrorFactory {
    static fromNodeError(nodeError, context = {}) {
        const message = nodeError.message || 'Unknown error occurred';
        
        switch (nodeError.code) {
            case 'ENOENT':
                return new FileNotFoundError(message, { ...context, originalError: nodeError });
            case 'EACCES':
                return new FileAccessError(message, { ...context, originalError: nodeError });
            case 'ECONNREFUSED':
                return new ConnectionRefusedError(message, { ...context, originalError: nodeError });
            case 'ETIMEDOUT':
                return new ConnectionTimeoutError(message, { ...context, originalError: nodeError });
            case 'ENOTFOUND':
                return new ConnectionError(message, { ...context, originalError: nodeError });
            default:
                return new StinksterError(message, ERROR_CODES.UNKNOWN_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, { 
                    ...context, 
                    originalError: nodeError 
                });
        }
    }

    static fromHTTPError(statusCode, message, context = {}) {
        switch (statusCode) {
            case 400:
                return new ValidationError(message, context);
            case 401:
                return new StinksterError(message, ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED, context);
            case 403:
                return new FileAccessError(message, context);
            case 404:
                return new FileNotFoundError(message, context);
            case 405:
                return new UnsupportedOperationError(message, context);
            case 500:
                return new ServiceError(message, context);
            case 502:
                return new ConnectionError(message, context);
            case 503:
                return new ServiceNotAvailableError(message, context);
            case 504:
                return new ServiceTimeoutError(message, context);
            default:
                return new StinksterError(message, ERROR_CODES.UNKNOWN_ERROR, statusCode, context);
        }
    }
}

/**
 * Error handler middleware for Express.js
 */
function createErrorHandler(logger) {
    return (error, req, res, next) => {
        // If response has already been sent, delegate to default Express error handler
        if (res.headersSent) {
            return next(error);
        }

        // Convert non-Stinkster errors to Stinkster errors
        let stinksterError;
        if (error instanceof StinksterError) {
            stinksterError = error;
        } else {
            stinksterError = ErrorFactory.fromNodeError(error, {
                url: req.originalUrl,
                method: req.method,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });
        }

        // Log the error
        logger.error('Request error occurred', {
            error: stinksterError.toJSON(),
            request: {
                method: req.method,
                url: req.originalUrl,
                headers: req.headers,
                body: req.body
            }
        });

        // Send error response
        res.status(stinksterError.statusCode).json(stinksterError.toUserResponse());
    };
}

/**
 * Async error wrapper for Express routes
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Error aggregator for collecting multiple errors
 */
class ErrorAggregator {
    constructor() {
        this.errors = [];
    }

    add(error) {
        if (error instanceof StinksterError) {
            this.errors.push(error);
        } else {
            this.errors.push(ErrorFactory.fromNodeError(error));
        }
        return this;
    }

    addValidation(field, message) {
        this.errors.push(new ValidationError(`${field}: ${message}`, { field }));
        return this;
    }

    hasErrors() {
        return this.errors.length > 0;
    }

    getErrors() {
        return this.errors;
    }

    throwIfErrors() {
        if (this.hasErrors()) {
            const messages = this.errors.map(e => e.message).join('; ');
            throw new ValidationError(`Multiple validation errors: ${messages}`, {
                errors: this.errors.map(e => e.toJSON())
            });
        }
    }

    clear() {
        this.errors = [];
        return this;
    }
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(operation, maxAttempts = 3, baseDelay = 1000, maxDelay = 10000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts) {
                break;
            }
            
            // Calculate delay with exponential backoff and jitter
            const delay = Math.min(
                baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
                maxDelay
            );
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Timeout wrapper
 */
function withTimeout(promise, timeoutMs, message = 'Operation timed out') {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new ServiceTimeoutError(message, { timeoutMs })), timeoutMs)
        )
    ]);
}

module.exports = {
    // Error classes
    StinksterError,
    ConfigurationError,
    ValidationError,
    ConnectionError,
    ConnectionTimeoutError,
    ConnectionRefusedError,
    FileNotFoundError,
    FileAccessError,
    FileWriteError,
    ServiceNotAvailableError,
    ServiceTimeoutError,
    ServiceError,
    ProtocolError,
    InvalidMessageError,
    UnsupportedOperationError,
    
    // Utilities
    ErrorFactory,
    ErrorAggregator,
    createErrorHandler,
    asyncHandler,
    withRetry,
    withTimeout
};
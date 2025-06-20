/**
 * Error Handler Middleware
 * 
 * Provides centralized error handling and async handler wrapper
 */

// Custom error classes
class WebhookError extends Error {
    constructor(message, code, statusCode = 500, context = {}) {
        super(message);
        this.name = 'WebhookError';
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

class ValidationError extends WebhookError {
    constructor(message, context) {
        super(message, 'VALIDATION_ERROR', 400, context);
        this.name = 'ValidationError';
    }
}

class ServiceError extends WebhookError {
    constructor(message, context) {
        super(message, 'SERVICE_ERROR', 500, context);
        this.name = 'ServiceError';
    }
}

class ProcessNotFoundError extends WebhookError {
    constructor(process) {
        super(`Process ${process} not found`, 'PROCESS_NOT_FOUND', 404);
        this.name = 'ProcessNotFoundError';
    }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Create error handler middleware
 */
const createErrorHandler = (logger) => {
    return (error, req, res, next) => {
        // Don't log client disconnection errors
        if (error.code === 'ECONNABORTED') {
            return;
        }
        
        // Log error details
        logger.error('Request error', {
            error: error.message,
            code: error.code,
            stack: error.stack,
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        
        // If response already sent, delegate to default handler
        if (res.headersSent) {
            return next(error);
        }
        
        // Determine status code
        const statusCode = error.statusCode || error.status || 500;
        
        // Build error response
        const errorResponse = {
            status: 'error',
            message: error.message || 'Internal server error',
            code: error.code || 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        };
        
        // Include additional context in development
        if (process.env.NODE_ENV === 'development') {
            errorResponse.stack = error.stack;
            errorResponse.context = error.context;
        }
        
        // Send error response
        res.status(statusCode).json(errorResponse);
    };
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        code: 'NOT_FOUND',
        path: req.path,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    WebhookError,
    ValidationError,
    ServiceError,
    ProcessNotFoundError,
    asyncHandler,
    createErrorHandler,
    notFoundHandler
};
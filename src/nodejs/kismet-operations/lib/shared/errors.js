/**
 * Shared error handling utilities
 * Minimal implementation for webhook functionality
 */

class ValidationError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
        this.statusCode = 400;
    }
}

// Async handler wrapper to catch errors in async routes
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Basic error handler middleware
const createErrorHandler = () => {
    return (err, req, res, next) => {
        const statusCode = err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        
        res.status(statusCode).json({
            success: false,
            error: err.name || 'Error',
            message,
            details: err.details || {},
            timestamp: new Date().toISOString()
        });
    };
};

module.exports = {
    ValidationError,
    asyncHandler,
    createErrorHandler
};
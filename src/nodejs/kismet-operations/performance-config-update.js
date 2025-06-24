// Add to spectrum analyzer server.js for performance optimization
const PerformanceMiddleware = require('../shared/middleware/performance-middleware');

// Configure for WebSocket and API optimization
const performanceMiddleware = new PerformanceMiddleware({
    cache: {
        maxSize: 50,
        defaultTTL: 15000 // Shorter TTL for real-time data
    },
    compression: {
        level: 4, // Faster compression for real-time data
        threshold: 512
    },
    connection: {
        keepAliveTimeout: 10000, // Longer for WebSocket connections
        headersTimeout: 11000
    }
});
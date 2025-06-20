// Add to the top of server.js, after other requires
const PerformanceMiddleware = require('../shared/middleware/performance-middleware');

// Add after app initialization
const performanceMiddleware = new PerformanceMiddleware({
    cache: {
        maxSize: 100,
        defaultTTL: 30000
    },
    compression: {
        level: 6,
        threshold: 1024
    },
    connection: {
        keepAliveTimeout: 5000,
        headersTimeout: 6000
    }
});

// Apply middleware stack
app.use(...performanceMiddleware.createMiddlewareStack());

// Optimize server (add after server creation)
performanceMiddleware.optimizeServer(server);

// Add performance monitoring endpoint
app.get('/performance/stats', (req, res) => {
    res.json(performanceMiddleware.getPerformanceStats());
});
/**
 * Performance Optimization Middleware Stack
 * Combines all optimizations into a single middleware suite
 */

const ApiCacheMiddleware = require('./api-cache');
const CompressionMiddleware = require('./compression');
const JsonOptimizer = require('../utils/json-optimizer');
const ConnectionOptimizer = require('../utils/connection-optimizer');

class PerformanceMiddleware {
    constructor(options = {}) {
        this.apiCache = new ApiCacheMiddleware(options.cache);
        this.compression = new CompressionMiddleware(options.compression);
        this.jsonOptimizer = new JsonOptimizer();
        this.connectionOptimizer = new ConnectionOptimizer(options.connection);
        
        this.stats = {
            requestCount: 0,
            totalResponseTime: 0,
            cacheStats: null,
            compressionStats: null
        };
    }

    createMiddlewareStack() {
        return [
            // 1. Connection optimization
            this.connectionOptimizer.createMiddleware(),
            
            // 2. Request timing
            this.timingMiddleware(),
            
            // 3. JSON optimization
            this.jsonOptimizer.createMiddleware(),
            
            // 4. API caching
            this.apiCache.middleware(),
            
            // 5. Response compression
            this.compression.middleware(),
            
            // 6. Performance statistics
            this.statsMiddleware()
        ];
    }

    timingMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                this.stats.requestCount++;
                this.stats.totalResponseTime += duration;
                
                res.set('X-Response-Time', duration + 'ms');
            });
            
            next();
        };
    }

    statsMiddleware() {
        return (req, res, next) => {
            // Add stats endpoint
            if (req.path === '/performance/stats' && req.method === 'GET') {
                return res.json(this.getPerformanceStats());
            }
            
            next();
        };
    }

    getPerformanceStats() {
        const avgResponseTime = this.stats.requestCount > 0 
            ? Math.round(this.stats.totalResponseTime / this.stats.requestCount * 100) / 100
            : 0;

        return {
            overview: {
                totalRequests: this.stats.requestCount,
                averageResponseTime: avgResponseTime + 'ms',
                targetResponseTime: '12ms',
                targetMet: avgResponseTime <= 12
            },
            cache: this.apiCache.getStats(),
            compression: this.compression.getStats(),
            timestamp: new Date().toISOString()
        };
    }

    optimizeServer(server) {
        return this.connectionOptimizer.optimizeServer(server);
    }

    resetStats() {
        this.stats = {
            requestCount: 0,
            totalResponseTime: 0
        };
        this.apiCache.clearCache();
    }
}

module.exports = PerformanceMiddleware;
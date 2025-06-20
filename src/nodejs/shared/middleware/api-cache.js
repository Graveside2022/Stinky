/**
 * API Response Caching Middleware
 * Implements intelligent caching with TTL for improved response times
 */

const { MemoryEfficientCache } = require('./memory-cache');

class ApiCacheMiddleware {
    constructor(options = {}) {
        this.cache = new MemoryEfficientCache({
            maxSize: options.maxSize || 100,
            defaultTTL: options.defaultTTL || 30000
        });
        
        this.cacheConfig = {
            '/api/status': 10000,        // 10 seconds
            '/list_wigle_files': 30000,  // 30 seconds  
            '/api/config': 60000,        // 1 minute
            '/get_antenna_settings': 60000,
            '/api/profiles': 120000      // 2 minutes
        };
        
        this.stats = {
            hits: 0,
            misses: 0,
            bypassed: 0
        };
    }

    middleware() {
        return (req, res, next) => {
            // Only cache GET requests
            if (req.method !== 'GET') {
                this.stats.bypassed++;
                return next();
            }

            const cacheKey = this.generateCacheKey(req);
            const ttl = this.getCacheTTL(req.path);
            
            if (ttl === 0) {
                this.stats.bypassed++;
                return next();
            }

            // Try to get from cache
            const cachedResponse = this.cache.get(cacheKey);
            if (cachedResponse) {
                this.stats.hits++;
                res.set('X-Cache-Status', 'HIT');
                res.set('X-Cache-TTL', ttl);
                return res.json(cachedResponse);
            }

            // Cache miss - intercept response
            this.stats.misses++;
            const originalJson = res.json;
            
            res.json = (data) => {
                // Store in cache if response is successful
                if (res.statusCode < 400 && data) {
                    this.cache.set(cacheKey, data, ttl);
                }
                
                res.set('X-Cache-Status', 'MISS');
                res.set('X-Cache-TTL', ttl);
                return originalJson.call(res, data);
            };

            next();
        };
    }

    generateCacheKey(req) {
        const query = Object.keys(req.query).length > 0 
            ? JSON.stringify(req.query) 
            : '';
        return `${req.path}:${query}`;
    }

    getCacheTTL(path) {
        // Exact match first
        if (this.cacheConfig[path]) {
            return this.cacheConfig[path];
        }
        
        // Pattern matching
        for (const pattern in this.cacheConfig) {
            if (path.includes(pattern)) {
                return this.cacheConfig[pattern];
            }
        }
        
        return 0; // Don't cache
    }

    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;
        
        return {
            ...this.stats,
            hitRate: hitRate + '%',
            cacheStats: this.cache.getStats()
        };
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = ApiCacheMiddleware;
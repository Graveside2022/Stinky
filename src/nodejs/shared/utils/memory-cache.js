/**
 * Memory-Efficient Caching Strategies
 * Implements TTL-based caching with memory management
 */

class MemoryEfficientCache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 100;
        this.defaultTTL = options.defaultTTL || 60000; // 1 minute
        this.checkInterval = options.checkInterval || 30000; // 30 seconds
        
        this.cache = new Map();
        this.timers = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0
        };
        
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.checkInterval);
    }

    set(key, value, ttl = this.defaultTTL) {
        // Remove existing entry if it exists
        if (this.cache.has(key)) {
            this.delete(key);
        }
        
        // Check size limit
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        
        // Set value with metadata
        const entry = {
            value,
            timestamp: Date.now(),
            ttl,
            accessed: Date.now(),
            hits: 0
        };
        
        this.cache.set(key, entry);
        this.stats.size = this.cache.size;
        
        // Set expiration timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl);
        
        this.timers.set(key, timer);
        
        return true;
    }

    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return undefined;
        }
        
        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.delete(key);
            this.stats.misses++;
            return undefined;
        }
        
        // Update access info
        entry.accessed = Date.now();
        entry.hits++;
        this.stats.hits++;
        
        return entry.value;
    }

    has(key) {
        return this.cache.has(key) && this.get(key) !== undefined;
    }

    delete(key) {
        const had = this.cache.has(key);
        this.cache.delete(key);
        
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
        
        this.stats.size = this.cache.size;
        return had;
    }

    clear() {
        this.cache.clear();
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.stats.size = 0;
    }

    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.accessed < oldestTime) {
                oldestTime = entry.accessed;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    cleanup() {
        const now = Date.now();
        const toDelete = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                toDelete.push(key);
            }
        }
        
        toDelete.forEach(key => this.delete(key));
    }

    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100)
            : 0;
            
        return {
            ...this.stats,
            hitRate: hitRate + '%',
            maxSize: this.maxSize,
            utilizationPercent: Math.round((this.stats.size / this.maxSize) * 100) + '%'
        };
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

// Pre-configured caches for common use cases
const apiResponseCache = new MemoryEfficientCache({
    maxSize: 50,
    defaultTTL: 30000 // 30 seconds
});

const fileListCache = new MemoryEfficientCache({
    maxSize: 20,
    defaultTTL: 60000 // 1 minute
});

const configCache = new MemoryEfficientCache({
    maxSize: 10,
    defaultTTL: 300000 // 5 minutes
});

module.exports = {
    MemoryEfficientCache,
    apiResponseCache,
    fileListCache,
    configCache
};
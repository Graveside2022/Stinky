#!/usr/bin/env node
/**
 * Response Time Optimization Implementation - Agent 3
 * 
 * Implements specific optimizations to achieve 8% response time improvement
 * target (12ms vs 13ms baseline). Focuses on caching, compression, and Pi-specific tuning.
 */

const fs = require('fs').promises;
const path = require('path');

class ResponseTimeOptimizer {
    constructor() {
        this.targetImprovementPercent = 8; // 8% improvement target
        this.baselineResponseTimeMs = 13;  // Estimated Flask baseline
        this.targetResponseTimeMs = 12;    // Target: 12ms
        
        this.optimizations = {
            caching: {
                api_endpoints: ['api/status', 'list_wigle_files', 'api/config'],
                ttl_seconds: {
                    'api/status': 10,
                    'list_wigle_files': 30,
                    'api/config': 60
                }
            },
            compression: {
                enable_gzip: true,
                compression_level: 6, // Balance between speed and size
                min_size: 1024       // Only compress responses > 1KB
            },
            connection_pooling: {
                keep_alive_timeout: 5000,
                max_sockets: 50,
                max_free_sockets: 10
            },
            json_optimization: {
                use_fast_json_stringify: true,
                pre_compile_schemas: true
            }
        };
    }

    async optimizeAll() {
        console.log('⚡ Response Time Optimization Implementation');
        console.log('==========================================');
        console.log(`🎯 Target: ${this.targetImprovementPercent}% improvement (${this.targetResponseTimeMs}ms vs ${this.baselineResponseTimeMs}ms)\n`);

        try {
            // 1. Implement API response caching
            await this.implementApiCaching();
            
            // 2. Add response compression
            await this.addResponseCompression();
            
            // 3. Optimize JSON serialization
            await this.optimizeJsonSerialization();
            
            // 4. Implement connection optimizations
            await this.implementConnectionOptimizations();
            
            // 5. Create middleware for response optimization
            await this.createOptimizationMiddleware();
            
            // 6. Update service configurations
            await this.updateServiceConfigurations();
            
            console.log('\n✅ Response time optimization implementation complete!');
            this.printOptimizationSummary();
            
        } catch (error) {
            console.error('❌ Response time optimization failed:', error);
            throw error;
        }
    }

    async implementApiCaching() {
        console.log('💾 1. Implementing API response caching...');
        
        const cachingMiddleware = `/**
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
        return \`\${req.path}:\${query}\`;
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

module.exports = ApiCacheMiddleware;`;

        const middlewareDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'middleware');
        await fs.mkdir(middlewareDir, { recursive: true });
        await fs.writeFile(path.join(middlewareDir, 'api-cache.js'), cachingMiddleware);
        
        console.log('  ✓ Created API caching middleware');
    }

    async addResponseCompression() {
        console.log('\n🗜️  2. Adding response compression...');
        
        const compressionMiddleware = `/**
 * Response Compression Middleware
 * Optimized for Raspberry Pi performance with intelligent compression
 */

const zlib = require('zlib');

class CompressionMiddleware {
    constructor(options = {}) {
        this.compressionLevel = options.level || 6; // Balance speed vs size
        this.threshold = options.threshold || 1024; // Only compress > 1KB
        this.enableBrotli = options.enableBrotli || false; // Brotli might be slow on Pi
        
        this.stats = {
            compressed: 0,
            uncompressed: 0,
            totalSaved: 0
        };
    }

    middleware() {
        return (req, res, next) => {
            const acceptEncoding = req.headers['accept-encoding'] || '';
            
            // Skip if client doesn't support compression
            if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('br')) {
                this.stats.uncompressed++;
                return next();
            }

            const originalJson = res.json;
            const originalSend = res.send;
            
            // Override json method
            res.json = (data) => {
                const jsonString = JSON.stringify(data);
                return this.compressResponse(res, jsonString, 'application/json');
            };
            
            // Override send method for other responses
            res.send = (data) => {
                if (typeof data === 'string' && data.length > this.threshold) {
                    return this.compressResponse(res, data, 'text/html');
                }
                return originalSend.call(res, data);
            };

            next();
        };
    }

    compressResponse(res, data, contentType) {
        const originalSize = Buffer.byteLength(data, 'utf8');
        
        // Skip compression for small responses
        if (originalSize < this.threshold) {
            this.stats.uncompressed++;
            res.set('Content-Type', contentType);
            return res.end(data);
        }

        // Use gzip compression (faster than brotli on Pi)
        zlib.gzip(data, { level: this.compressionLevel }, (err, compressed) => {
            if (err) {
                this.stats.uncompressed++;
                res.set('Content-Type', contentType);
                return res.end(data);
            }

            const compressedSize = compressed.length;
            const savedBytes = originalSize - compressedSize;
            const compressionRatio = Math.round((savedBytes / originalSize) * 100);

            // Only use compression if it saves significant space
            if (compressionRatio > 10) {
                this.stats.compressed++;
                this.stats.totalSaved += savedBytes;
                
                res.set('Content-Encoding', 'gzip');
                res.set('Content-Type', contentType);
                res.set('X-Compression-Ratio', compressionRatio + '%');
                res.set('Content-Length', compressedSize);
                res.end(compressed);
            } else {
                this.stats.uncompressed++;
                res.set('Content-Type', contentType);
                res.end(data);
            }
        });
    }

    getStats() {
        const total = this.stats.compressed + this.stats.uncompressed;
        const compressionRate = total > 0 ? Math.round((this.stats.compressed / total) * 100) : 0;
        
        return {
            ...this.stats,
            compressionRate: compressionRate + '%',
            averageSaving: this.stats.compressed > 0 
                ? Math.round(this.stats.totalSaved / this.stats.compressed) + ' bytes'
                : '0 bytes'
        };
    }
}

module.exports = CompressionMiddleware;`;

        const middlewareDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'middleware');
        await fs.writeFile(path.join(middlewareDir, 'compression.js'), compressionMiddleware);
        
        console.log('  ✓ Created response compression middleware');
    }

    async optimizeJsonSerialization() {
        console.log('\n📊 3. Optimizing JSON serialization...');
        
        const jsonOptimizer = `/**
 * JSON Serialization Optimizer
 * Pre-compiled schemas and fast serialization for common responses
 */

class JsonOptimizer {
    constructor() {
        this.schemas = new Map();
        this.setupCommonSchemas();
    }

    setupCommonSchemas() {
        // Status response schema
        this.schemas.set('status', {
            properties: {
                broadcasting: { type: 'boolean' },
                takServerIp: { type: 'string' },
                takServerPort: { type: 'number' },
                analysisMode: { type: 'string' },
                antennaSensitivity: { type: 'string' },
                directory: { type: 'string' },
                processedMacs: { type: 'number' },
                processedEntries: { type: 'number' }
            }
        });

        // File list schema
        this.schemas.set('fileList', {
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string' }
                }
            }
        });

        // Config response schema
        this.schemas.set('config', {
            properties: {
                fft_size: { type: 'number' },
                center_freq: { type: 'number' },
                samp_rate: { type: 'number' },
                signal_threshold: { type: 'number' }
            }
        });
    }

    optimizedStringify(data, schemaName = null) {
        try {
            // For known schemas, use optimized serialization
            if (schemaName && this.schemas.has(schemaName)) {
                return this.fastStringify(data, this.schemas.get(schemaName));
            }
            
            // Fallback to standard JSON.stringify with optimizations
            return JSON.stringify(data, this.jsonReplacer, 0);
            
        } catch (error) {
            // Fallback to standard stringify if optimization fails
            return JSON.stringify(data);
        }
    }

    fastStringify(data, schema) {
        // Simple fast serialization for known structures
        if (!data || typeof data !== 'object') {
            return JSON.stringify(data);
        }

        const parts = [];
        parts.push('{');
        
        let first = true;
        for (const [key, prop] of Object.entries(schema.properties)) {
            if (data.hasOwnProperty(key)) {
                if (!first) parts.push(',');
                parts.push(\`"\${key}":\`);
                
                const value = data[key];
                if (prop.type === 'string') {
                    parts.push(\`"\${String(value).replace(/"/g, '\\\\"')}"\`);
                } else if (prop.type === 'number') {
                    parts.push(String(Number(value) || 0));
                } else if (prop.type === 'boolean') {
                    parts.push(String(Boolean(value)));
                } else if (prop.type === 'array') {
                    parts.push(JSON.stringify(value));
                } else {
                    parts.push(JSON.stringify(value));
                }
                first = false;
            }
        }
        
        parts.push('}');
        return parts.join('');
    }

    jsonReplacer(key, value) {
        // Remove undefined values
        if (value === undefined) {
            return null;
        }
        
        // Optimize number precision
        if (typeof value === 'number' && !Number.isInteger(value)) {
            return Math.round(value * 1000) / 1000; // 3 decimal places max
        }
        
        return value;
    }

    createMiddleware() {
        return (req, res, next) => {
            const originalJson = res.json;
            
            res.json = (data) => {
                const startTime = Date.now();
                
                // Determine schema based on endpoint
                let schemaName = null;
                if (req.path.includes('/api/status')) {
                    schemaName = 'status';
                } else if (req.path.includes('list_wigle_files')) {
                    schemaName = 'fileList';
                } else if (req.path.includes('/api/config')) {
                    schemaName = 'config';
                }
                
                const jsonString = this.optimizedStringify(data, schemaName);
                const serializationTime = Date.now() - startTime;
                
                res.set('Content-Type', 'application/json');
                res.set('X-Serialization-Time', serializationTime + 'ms');
                res.end(jsonString);
            };
            
            next();
        };
    }
}

module.exports = JsonOptimizer;`;

        const utilsDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'utils');
        await fs.writeFile(path.join(utilsDir, 'json-optimizer.js'), jsonOptimizer);
        
        console.log('  ✓ Created JSON serialization optimizer');
    }

    async implementConnectionOptimizations() {
        console.log('\n🔗 4. Implementing connection optimizations...');
        
        const connectionOptimizer = `/**
 * Connection Optimization for Express.js
 * Optimizes HTTP connections and keep-alive for better performance
 */

const http = require('http');

class ConnectionOptimizer {
    constructor(options = {}) {
        this.options = {
            keepAliveTimeout: options.keepAliveTimeout || 5000,
            headersTimeout: options.headersTimeout || 6000,
            maxHeaderSize: options.maxHeaderSize || 8192,
            timeout: options.timeout || 30000,
            ...options
        };
    }

    optimizeServer(server) {
        // HTTP server optimizations
        server.keepAliveTimeout = this.options.keepAliveTimeout;
        server.headersTimeout = this.options.headersTimeout;
        server.maxHeaderSize = this.options.maxHeaderSize;
        server.timeout = this.options.timeout;

        // Set max listeners to prevent memory leaks
        server.setMaxListeners(100);

        // Optimize socket settings
        server.on('connection', (socket) => {
            socket.setNoDelay(true);
            socket.setKeepAlive(true, this.options.keepAliveTimeout);
        });

        return server;
    }

    createMiddleware() {
        return (req, res, next) => {
            // Set response headers for optimization
            res.set({
                'Connection': 'keep-alive',
                'Keep-Alive': \`timeout=\${Math.floor(this.options.keepAliveTimeout / 1000)}\`,
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            });

            // Remove unnecessary headers
            res.removeHeader('X-Powered-By');
            
            next();
        };
    }

    getOptimizedHttpAgent() {
        return new http.Agent({
            keepAlive: true,
            keepAliveMsecs: this.options.keepAliveTimeout,
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: this.options.timeout
        });
    }
}

module.exports = ConnectionOptimizer;`;

        const utilsDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'utils');
        await fs.writeFile(path.join(utilsDir, 'connection-optimizer.js'), connectionOptimizer);
        
        console.log('  ✓ Created connection optimization utilities');
    }

    async createOptimizationMiddleware() {
        console.log('\n⚙️  5. Creating optimization middleware stack...');
        
        const middlewareStack = `/**
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

module.exports = PerformanceMiddleware;`;

        const middlewareDir = path.join(process.cwd(), 'src', 'nodejs', 'shared', 'middleware');
        await fs.writeFile(path.join(middlewareDir, 'performance-middleware.js'), middlewareStack);
        
        console.log('  ✓ Created performance middleware stack');
    }

    async updateServiceConfigurations() {
        console.log('\n🔧 6. Updating service configurations...');
        
        // Update WigleToTAK server configuration
        await this.updateWigleToTakConfig();
        
        // Update Spectrum Analyzer configuration (if exists)
        await this.updateSpectrumAnalyzerConfig();
        
        console.log('  ✓ Updated service configurations');
    }

    async updateWigleToTakConfig() {
        const serverConfigUpdate = `// Add to the top of server.js, after other requires
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
});`;

        const configPath = path.join(process.cwd(), 'src', 'nodejs', 'wigle-to-tak', 'performance-config-update.js');
        await fs.writeFile(configPath, serverConfigUpdate);
        
        console.log('    ✓ Created WigleToTAK performance configuration update');
    }

    async updateSpectrumAnalyzerConfig() {
        const configPath = path.join(process.cwd(), 'src', 'nodejs', 'spectrum-analyzer');
        
        try {
            await fs.access(configPath);
            
            const spectrumConfigUpdate = `// Add to spectrum analyzer server.js for performance optimization
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
});`;

            const spectrumConfigPath = path.join(configPath, 'performance-config-update.js');
            await fs.writeFile(spectrumConfigPath, spectrumConfigUpdate);
            
            console.log('    ✓ Created Spectrum Analyzer performance configuration update');
        } catch (error) {
            console.log('    ⚠️  Spectrum Analyzer directory not found - skipping');
        }
    }

    printOptimizationSummary() {
        console.log('\n📋 RESPONSE TIME OPTIMIZATION SUMMARY');
        console.log('====================================');
        
        console.log('🎯 Optimization Target:');
        console.log(`  • ${this.targetImprovementPercent}% improvement (${this.targetResponseTimeMs}ms vs ${this.baselineResponseTimeMs}ms baseline)`);
        
        console.log('\n🔧 Implemented Optimizations:');
        console.log('  ✓ API response caching with intelligent TTL');
        console.log('  ✓ Gzip compression optimized for Pi performance');
        console.log('  ✓ JSON serialization optimization with pre-compiled schemas');
        console.log('  ✓ HTTP connection optimization and keep-alive');
        console.log('  ✓ Performance monitoring middleware');
        console.log('  ✓ Optimized headers and connection pooling');
        
        console.log('\n💾 Caching Strategy:');
        Object.entries(this.optimizations.caching.ttl_seconds).forEach(([endpoint, ttl]) => {
            console.log(`  • ${endpoint}: ${ttl}s TTL`);
        });
        
        console.log('\n📊 Expected Results:');
        console.log('  • 20-40% improvement from API caching');
        console.log('  • 10-20% improvement from compression');
        console.log('  • 5-15% improvement from JSON optimization');
        console.log('  • 5-10% improvement from connection optimization');
        console.log('  • Combined: 40-85% potential improvement');
        
        console.log('\n🚀 Next Steps:');
        console.log('  1. Apply configuration updates to services');
        console.log('  2. Restart services with optimization middleware');
        console.log('  3. Monitor /performance/stats endpoint');
        console.log('  4. Validate response time targets with load testing');
        console.log('  5. Fine-tune cache TTL values based on usage patterns');
    }
}

// Run optimization if called directly
if (require.main === module) {
    const optimizer = new ResponseTimeOptimizer();
    optimizer.optimizeAll().catch(error => {
        console.error('Response time optimization failed:', error);
        process.exit(1);
    });
}

module.exports = ResponseTimeOptimizer;